import React, { useState, useMemo, useEffect, useRef } from 'react';
import { doc, getDoc, writeBatch, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { logPlacementActivity, AUDIT_ACTIONS } from '../../../utils/placementAuditLogger';
import { INDUSTRY_OPTIONS } from '../../../utils/constants';

const BulkAssignModal = ({ show, onClose, availableLeads = [], allUsers, onAssign, currentUser, onRefresh, showToast }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: [], status: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;
  const [isAssignMode, setIsAssignMode] = useState(true);
  const cancelRef = useRef(false);
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [bulkSortOrder, setBulkSortOrder] = useState('desc'); // 'asc' or 'desc'

  // Filter users to managers, assistant managers, executives
  const assignableUsers = useMemo(() => {
    return Object.values(allUsers).filter(user =>
      ['Manager', 'Assistant Manager', 'Executive'].includes(user.role) &&
      user.departments?.includes('Placement')
    );
  }, [allUsers]);

  // Filter leads based on mode and search
  const filteredLeads = useMemo(() => {
    let baseLeads = availableLeads;
    if (isAssignMode) {
      baseLeads = availableLeads.filter(lead => !lead.assignedTo);
    } else {
      baseLeads = selectedUser 
        ? availableLeads.filter(lead => lead.assignedTo === selectedUser)
        : [];
    }
    
    // Filter by industry if selected
    if (selectedIndustry) {
      baseLeads = baseLeads.filter(lead => 
        String(lead.industry || '').trim().toLowerCase() === selectedIndustry.trim().toLowerCase()
      );
    }
    
    if (!searchTerm.trim()) {
      // Sort even if no search term, using the new sort order
      return [...baseLeads].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return bulkSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
    }

    const lowerSearch = searchTerm.toLowerCase();
    const result = baseLeads.filter(lead =>
      (lead.companyName || '').toLowerCase().includes(lowerSearch) ||
      (lead.pocName || '').toLowerCase().includes(lowerSearch) ||
      String(lead.pocPhone || '').toLowerCase().includes(lowerSearch) ||
      (lead.pocMail || '').toLowerCase().includes(lowerSearch)
    );

    // Sort filtered results
    return result.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return bulkSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [availableLeads, searchTerm, isAssignMode, selectedUser, selectedIndustry, bulkSortOrder]);

  // Paginated leads
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredLeads.slice(start, end);
  }, [filteredLeads, currentPage, pageSize]);

  const areAllFilteredSelected = useMemo(() => {
    if (filteredLeads.length === 0) return false;
    const selectedSet = new Set(selectedLeads);
    return filteredLeads.every(lead => selectedSet.has(lead.id));
  }, [filteredLeads, selectedLeads]);

  const areAllViewSelected = useMemo(() => {
    if (paginatedLeads.length === 0) return false;
    const selectedSet = new Set(selectedLeads);
    return paginatedLeads.every(lead => selectedSet.has(lead.id));
  }, [paginatedLeads, selectedLeads]);

  // Reset progress when modal closes
  useEffect(() => {
    if (!show) {
      setProgress({ current: 0, total: 0, errors: [], status: '' });
    }
  }, [show]);

  const totalPages = useMemo(() => Math.ceil(filteredLeads.length / pageSize), [filteredLeads.length, pageSize]);

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      // Reset selections and pagination after refresh
      setSelectedUser(null);
      setSelectedLeads([]);
      setCurrentPage(1);
      setSearchTerm('');
    } catch (error) {
      console.error('Error refreshing leads:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUserToggle = (userId) => {
    setSelectedUser(selectedUser === userId ? null : userId);
  };

  const handleLeadToggle = (leadId) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAllView = () => {
    const allCurrentPageIds = paginatedLeads.map(lead => lead.id);
    if (areAllViewSelected) {
      setSelectedLeads(prev => prev.filter(id => !allCurrentPageIds.includes(id)));
    } else {
      setSelectedLeads(prev => [...new Set([...prev, ...allCurrentPageIds])]);
    }
  };

  const handleSelectAllTotal = () => {
    const allFilteredIds = filteredLeads.map(lead => lead.id);
    if (areAllFilteredSelected) {
      setSelectedLeads(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedLeads(prev => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  const handleOversizedBatch = async (batchRef, batchData, batchGroups) => {
    const batchId = batchRef.id;
    const isCompaniesArray = Array.isArray(batchData.companies);
    const companies = isCompaniesArray ? (batchData.companies || []) : Object.values(batchData.companies || {});
    
    console.log(`Handling oversized batch ${batchId} with ${companies.length} companies`);
    
    // For oversized batches, process assignments individually to avoid size limits
    const currentBatchGroup = batchGroups[batchId] || [];
    
    for (const { leadId, userId } of currentBatchGroup) {
      try {
        // Get fresh document data
        const freshDocSnap = await getDoc(batchRef);
        if (!freshDocSnap.exists()) {
          console.error(`Batch ${batchId} no longer exists`);
          continue;
        }
        
        const freshBatchData = freshDocSnap.data();
        const isFreshCompaniesArray = Array.isArray(freshBatchData.companies);
        let encodedCompanies;
        if (isFreshCompaniesArray) {
          encodedCompanies = [...(freshBatchData.companies || [])];
        } else {
          encodedCompanies = { ...(freshBatchData.companies || {}) };
        }
        const companyIndex = parseInt(leadId.split('_').pop());
        
        let isValidIndex;
        if (isFreshCompaniesArray) {
          isValidIndex = companyIndex >= 0 && companyIndex < encodedCompanies.length;
        } else {
          isValidIndex = encodedCompanies[companyIndex.toString()] !== undefined;
        }
        
        if (isValidIndex) {
          // Get current encoded
          let currentEncoded;
          if (isFreshCompaniesArray) {
            currentEncoded = encodedCompanies[companyIndex];
          } else {
            currentEncoded = encodedCompanies[companyIndex.toString()];
          }
          
          // Decode and update single company
          const uriDecoded = atob(currentEncoded);
          const jsonString = decodeURIComponent(uriDecoded);
          const decodedCompany = JSON.parse(jsonString);

          const updatedCompany = {
            ...decodedCompany,
            assignedTo: userId,
            assignedBy: currentUser.uid,
            assignedAt: new Date(assignmentDate).toISOString(),
            dateField: new Date(assignmentDate).toISOString(),
          };
          
          // Encode back
          const updatedJsonString = JSON.stringify(updatedCompany);
          const updatedUriEncoded = encodeURIComponent(updatedJsonString);
          const updatedEncoded = btoa(updatedUriEncoded);
          
          // Update in encodedCompanies
          if (isFreshCompaniesArray) {
            encodedCompanies[companyIndex] = updatedEncoded;
          } else {
            encodedCompanies[companyIndex.toString()] = updatedEncoded;
          }
          
          // Update single document
          await setDoc(batchRef, { ...freshBatchData, companies: encodedCompanies });
          
          console.log(`Successfully assigned lead ${leadId} individually`);
        }
      } catch (individualError) {
        console.error(`Failed to assign lead ${leadId} individually:`, individualError);
        // Continue with other leads
      }
    }
    
    console.log(`Completed individual processing for oversized batch ${batchId}`);
  };

  const handleAssign = async () => {
    if (selectedLeads.length === 0 || !selectedUser) {
      showToast('Please select leads and a team member to assign.', 'error');
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: selectedLeads.length, errors: [], status: 'Assigning...' });
    cancelRef.current = false;

    console.log('Starting bulk assign with:', { selectedUser, assignmentDate, selectedLeadsCount: selectedLeads.length });

    try {
      // Assign all leads to the single selected user
      const assignments = [];
      selectedLeads.forEach((leadId) => {
        assignments.push({ leadId, userId: isAssignMode ? selectedUser : null });
      });

      console.log('Created assignments array:', assignments.length);

      let errorList = [];

      // Process assignments in batches to avoid overloading
      const batchSize = 50; // Process in larger batches for speed
      console.log('Starting batch processing, batchSize:', batchSize);
      for (let i = 0; i < assignments.length; i += batchSize) {
        if (cancelRef.current) {
          console.log('Processing cancelled by user');
          break;
        }
        const batchAssignments = assignments.slice(i, i + batchSize);

        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}, assignments:`, batchAssignments.length);

        // Group assignments by batchId
        const batchGroups = {};
        batchAssignments.forEach(({ leadId, userId }) => {
          const lead = availableLeads.find(l => l.id === leadId);
          if (!lead || !lead.batchId) {
            errorList.push(`Lead ${leadId}: Invalid lead data`);
            return;
          }
          if (!batchGroups[lead.batchId]) {
            batchGroups[lead.batchId] = [];
          }
          batchGroups[lead.batchId].push({ leadId, userId, lead });
        });

        console.log('Batch groups created:', Object.keys(batchGroups).length);

        // Fetch and update each batch document
        const updates = [];
        for (const batchId of Object.keys(batchGroups)) {
          console.log(`Processing batch ${batchId} with ${batchGroups[batchId].length} leads`);
          try {
            const batchDocRef = doc(db, "companyleads", batchId);
            const batchDocSnap = await getDoc(batchDocRef);

            console.log(`Fetched batch ${batchId}, exists:`, batchDocSnap.exists());

            if (!batchDocSnap.exists()) {
              batchGroups[batchId].forEach(({ leadId }) => {
                errorList.push(`Lead ${leadId}: Batch document not found`);
              });
              continue;
            }

            const batchData = batchDocSnap.data();
            const isCompaniesArray = Array.isArray(batchData.companies);
            let encodedCompanies;
            if (isCompaniesArray) {
              encodedCompanies = [...(batchData.companies || [])];
            } else {
              encodedCompanies = { ...(batchData.companies || {}) };
            }

            // Update each lead in this batch
            batchGroups[batchId].forEach(({ leadId, userId }) => {
              const companyIndex = parseInt(leadId.split('_').pop());
              let isValidIndex;
              if (isCompaniesArray) {
                isValidIndex = companyIndex >= 0 && companyIndex < encodedCompanies.length;
              } else {
                isValidIndex = encodedCompanies[companyIndex.toString()] !== undefined;
              }
              if (!isValidIndex) {
                errorList.push(`Lead ${leadId}: Invalid company index`);
                return;
              }

              // Decode and update
              let currentEncoded;
              if (isCompaniesArray) {
                currentEncoded = encodedCompanies[companyIndex];
              } else {
                currentEncoded = encodedCompanies[companyIndex.toString()];
              }
              const uriDecoded = atob(currentEncoded);
              const jsonString = decodeURIComponent(uriDecoded);
              const decodedCompany = JSON.parse(jsonString);

              const assignedAtValue = new Date(assignmentDate).toISOString();
              console.log(`Updating lead ${leadId} for user ${userId}, assignedAt:`, assignedAtValue);

              const updatedCompany = {
                ...decodedCompany,
                assignedTo: isAssignMode ? userId : null,
                assignedBy: isAssignMode ? currentUser.uid : null,
                assignedAt: isAssignMode ? assignedAtValue : null,
                dateField: isAssignMode ? assignedAtValue : null,
              };
              
              // Encode back
              const updatedJsonString = JSON.stringify(updatedCompany);
              const updatedUriEncoded = encodeURIComponent(updatedJsonString);
              const updatedEncoded = btoa(updatedUriEncoded);
              
              // Update encodedCompanies
              if (isCompaniesArray) {
                encodedCompanies[companyIndex] = updatedEncoded;
              } else {
                encodedCompanies[companyIndex.toString()] = updatedEncoded;
              }
            });

            // Update the batch document
            updates.push({ ref: batchDocRef, data: { ...batchData, companies: encodedCompanies } });
          } catch (error) {
            console.error(`Error processing batch ${batchId}:`, error);
            batchGroups[batchId].forEach(({ leadId }) => {
              errorList.push(`Lead ${leadId}: ${error.message}`);
            });
          }
        }

        console.log('Updates prepared:', updates.length);

        // Use writeBatch to commit all updates
        if (updates.length > 0) {
          try {
            const batch = writeBatch(db);
            updates.forEach(({ ref, data }) => {
              batch.set(ref, data);
            });
            await batch.commit();
            console.log('Batch committed successfully');
          } catch (batchError) {
            // Handle Firestore document size limit error
            if (batchError.message && batchError.message.includes('exceeds the maximum allowed size')) {
              console.warn('Document size limit exceeded, implementing smart batch splitting...');
              
              // Process updates one by one with size management
              for (const update of updates) {
                try {
                  await setDoc(update.ref, update.data);
                  console.log('Individual update committed for', update.ref.id);
                } catch (docError) {
                  if (docError.message && docError.message.includes('exceeds the maximum allowed size')) {
                    // Document is too large, need to split it
                    await handleOversizedBatch(update.ref, update.data, batchGroups);
                    console.log('Handled oversized batch for', update.ref.id);
                  } else {
                    console.error('Doc error:', docError);
                    throw docError;
                  }
                }
              }
            } else {
              console.error('Batch commit error:', batchError);
              throw batchError;
            }
          }
        }

        // Log activities for successful assignments
        const successfulAssignments = batchAssignments.filter(({ leadId }) => !errorList.some(e => e.includes(leadId)));
        console.log('Successful assignments in this batch:', successfulAssignments.length);
        const assignmentsByUser = {};
        successfulAssignments.forEach(({ userId }) => {
          if (!assignmentsByUser[userId]) {
            assignmentsByUser[userId] = [];
          }
          assignmentsByUser[userId].push(userId);
        });

        Object.keys(assignmentsByUser).forEach(userId => {
          const count = assignmentsByUser[userId].length;
          const assignee = Object.values(allUsers).find(u => (u.uid || u.id) === userId);
          const assigneeName = assignee?.displayName || assignee?.name || 'Unknown User';

          logPlacementActivity({
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.name || 'Unknown User',
            action: isAssignMode ? AUDIT_ACTIONS.ASSIGN_LEAD : 'UNASSIGN_LEAD',
            companyId: null, // No specific company for bulk
            companyName: null,
            details: isAssignMode 
              ? `Bulk assigned ${count} leads to ${assigneeName} for ${assignmentDate}`
              : `Bulk unassigned ${count} leads from ${assigneeName}`,
            changes: isAssignMode 
              ? { assignedTo: userId, assignedAt: assignmentDate, leadCount: count }
              : { assignedTo: null, leadCount: count },
            sessionId: sessionStorage.getItem('sessionId') || 'unknown'
          });
        });

        console.log('Logged activities for batch');

        setProgress(prev => ({ ...prev, current: Math.min(prev.total, i + batchAssignments.length), errors: [...prev.errors, ...errorList] }));

        // Take a break after each batch except the last
        if (i + batchSize < assignments.length) {
          setProgress(prev => ({ ...prev, status: 'Taking a short break...' }));
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second break
          setProgress(prev => ({ ...prev, status: 'Assigning...' }));
          console.log('Took break after batch');
        }
      }

      // Consolidated logging after all batches
      const allSuccessfulAssignments = assignments.filter(a => !errorList.some(e => e.includes(a.leadId)));
      console.log('Total successful assignments:', allSuccessfulAssignments.length);
      const totalAssignmentsByUser = {};
      allSuccessfulAssignments.forEach(({ userId }) => {
        if (!totalAssignmentsByUser[userId]) {
          totalAssignmentsByUser[userId] = 0;
        }
        totalAssignmentsByUser[userId]++;
      });

      Object.keys(totalAssignmentsByUser).forEach(userId => {
        const count = totalAssignmentsByUser[userId];
        const assignee = Object.values(allUsers).find(u => (u.uid || u.id) === userId);
        const assigneeName = assignee?.displayName || assignee?.name || 'Unknown User';

        logPlacementActivity({
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.name || 'Unknown User',
          action: isAssignMode ? AUDIT_ACTIONS.ASSIGN_LEAD : 'UNASSIGN_LEAD',
          companyId: null,
          companyName: null,
          details: isAssignMode 
            ? `Bulk assigned ${count} leads to ${assigneeName} for ${assignmentDate}`
            : `Bulk unassigned ${count} leads from ${assigneeName}`,
          changes: isAssignMode 
            ? { assignedTo: userId, assignedAt: assignmentDate, leadCount: count }
            : { assignedTo: null, leadCount: count },
          sessionId: sessionStorage.getItem('sessionId') || 'unknown'
        });
      });

      // Update local state via callback
      const successfulAssignments = assignments.filter(a => !errorList.some(e => e.includes(a.leadId)));
      onAssign(successfulAssignments, assignmentDate);

      console.log('Bulk assign completed, updating local state');

      // Show results
      setProgress(prev => ({ ...prev, errors: errorList }));

      if (errorList.length === 0) {
        showToast(`${selectedLeads.length}/${selectedLeads.length} Successfully ${isAssignMode ? 'assigned' : 'unassigned'}!`, 'success');
        // Reset and close
        setSelectedUser(null);
        setSelectedLeads([]);
        setSearchTerm('');
        setCurrentPage(1);
        onClose();
      } else {
        showToast(`${successfulAssignments.length}/${selectedLeads.length} successful, ${errorList.length} failed. Check the modal for details.`, 'warning');
      }
    } catch (error) {
      console.error('Bulk assign error:', error);
      showToast('Failed to assign leads. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-54 p-4">
      <div className={`${isAssignMode ? 'bg-white' : 'bg-red-50'} rounded-2xl shadow-xl border ${isAssignMode ? 'border-gray-200' : 'border-red-200'} max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`${isAssignMode ? 'bg-white' : 'bg-red-50'} border-b border-gray-200 px-4 py-3`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">Bulk Lead Assignment</h2>
              {/* Toggle */}
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-medium ${isAssignMode ? 'text-blue-600' : 'text-gray-500'}`}>Assign</span>
                <button
                  onClick={() => setIsAssignMode(!isAssignMode)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isAssignMode ? 'bg-blue-600' : 'bg-red-500'}`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isAssignMode ? 'translate-x-5' : 'translate-x-1'}`}
                  />
                </button>
                <span className={`text-xs font-medium ${!isAssignMode ? 'text-red-600' : 'text-gray-500'}`}>Unassign</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh unassigned leads"
              >
                {refreshing ? '⟳' : '↻'}
              </button>
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-all text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4">
            {/* Compact Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {/* Users Selection */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                <h3 className="font-medium text-gray-900 mb-2 text-sm flex items-center">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                  Select Team Member
                </h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                {assignableUsers.map(user => (
                  <label key={user.uid || user.id} className="flex items-center p-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                    <input
                      type="radio"
                      name="selectedUser"
                      checked={selectedUser === (user.uid || user.id)}
                      onChange={() => handleUserToggle(user.uid || user.id)}
                      className="w-3 h-3 text-blue-600 bg-white border-gray-300 focus:ring-blue-500 focus:ring-1"
                    />
                    <span className="ml-2 text-xs font-medium text-gray-900 group-hover:text-gray-700 truncate">
                      {user.displayName || user.name}
                    </span>
                    <span className="ml-auto text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-md border">
                      {user.role}
                    </span>
                  </label>
                ))}
                </div>
              </div>

              {/* Date Selection */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                <h3 className="font-medium text-gray-900 mb-2 text-sm flex items-center">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                  Assignment Date
                </h3>
                <input
                  type="date"
                  value={assignmentDate}
                  onChange={(e) => setAssignmentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>

              {/* Search */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                <h3 className="font-medium text-gray-900 mb-2 text-sm flex items-center">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                  Search Leads
                </h3>
                <input
                  type="text"
                  placeholder="Company, contact, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm mb-2"
                />
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="">All Industries</option>
                  {(INDUSTRY_OPTIONS || []).map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Compact Leads Selection */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900 text-sm flex items-center">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></div>
                  {isAssignMode ? 'Available Leads' : 'Assigned Leads'} ({filteredLeads.length} total)
                </h3>
                <div className="flex items-center space-x-2">
                  {selectedLeads.length > 0 && (
                    <span className="px-2 py-1 bg-white/80 backdrop-blur-md text-blue-700 text-xs font-medium rounded-full border border-blue-200/50 shadow-sm">
                      {selectedLeads.length} selected
                    </span>
                  )}
                  <button
                    onClick={handleSelectAllView}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium shadow-sm"
                  >
                    {areAllViewSelected ? 'Deselect View' : 'Select View'}
                  </button>
                  <button
                    onClick={handleSelectAllTotal}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium shadow-sm"
                  >
                    {areAllFilteredSelected ? 'Deselect Total' : `Select All (${filteredLeads.length})`}
                  </button>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing || loading}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh leads list"
                  >
                    {refreshing ? '⟳ Refreshing...' : '↻ Refresh'}
                  </button>

                  <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button
                      onClick={() => setBulkSortOrder('desc')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-200 ${
                        bulkSortOrder === 'desc'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Latest
                    </button>
                    <button
                      onClick={() => setBulkSortOrder('asc')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-200 ${
                        bulkSortOrder === 'asc'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Oldest
                    </button>
                  </div>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {paginatedLeads.map(lead => (
                  <label key={lead.id} className="flex items-center p-2 bg-gray-50 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer border border-transparent hover:border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => handleLeadToggle(lead.id)}
                      className="w-3 h-3 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-1"
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{lead.companyName || 'N/A'}</div>
                      <div className="text-xs text-gray-600 truncate">
                        {lead.pocName || 'N/A'} • {lead.pocPhone || 'N/A'} {lead.industry ? `• ${lead.industry}` : ''}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {/* Compact Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-3 space-x-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 bg-white rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                  >
                    ‹ Previous
                  </button>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200">
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 bg-white rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                  >
                    Next ›
                  </button>
                </div>
              )}
            </div>

            {/* Compact Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900 text-sm">Assignment Summary</h3>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className="px-2 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-xs font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh all data"
                >
                  {refreshing ? '⟳' : '↻'}
                </button>
              </div>
              <div className="flex justify-between items-center text-center">
                <div className="flex-1 bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <div className="text-lg font-bold text-blue-600">{selectedUser ? 1 : 0}</div>
                  <div className="text-xs text-blue-700 font-medium">Member</div>
                </div>
                <div className="flex-1 bg-green-50 rounded-lg p-2 border border-green-200 mx-2">
                  <div className="text-lg font-bold text-green-600">{selectedLeads.length}</div>
                  <div className="text-xs text-green-700 font-medium">Leads</div>
                </div>
                <div className="flex-1 bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <div className="text-lg font-bold text-blue-600">
                    {selectedUser ? selectedLeads.length : 0}
                  </div>
                  <div className="text-xs text-blue-700 font-medium">To Member</div>
                </div>
              </div>
            </div>

            {/* Compact Progress */}
            {loading && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 mb-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-yellow-800 text-sm">{progress.status}</span>
                  <span className="text-xs text-yellow-700 font-medium">{progress.current}/{progress.total}</span>
                </div>
                <div className="w-full bg-yellow-200 rounded-full h-1.5 shadow-inner">
                  <div
                    className="bg-yellow-500 h-1.5 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
                {progress.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-red-700 font-medium text-xs">Errors Encountered ({progress.errors.length}):</p>
                    <div className="max-h-16 overflow-y-auto mt-1 space-y-1">
                      {progress.errors.map((error, index) => (
                        <p key={index} className="text-xs text-red-700 bg-red-50 p-1.5 rounded border border-red-200">{error}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className={`shrink-0 ${isAssignMode ? 'bg-white' : 'bg-red-50'} border-t border-gray-200 px-4 py-3`}>
          <div className="flex justify-end space-x-2">
            <button
              onClick={loading ? () => { cancelRef.current = true; setProgress(prev => ({ ...prev, status: 'Cancelling...' })); } : onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm border border-gray-300 shadow-sm"
            >
              {loading ? 'Stop' : 'Cancel'}
            </button>
            <button
              onClick={handleAssign}
              className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm ${isAssignMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
              disabled={loading || selectedLeads.length === 0 || !selectedUser}
            >
              {loading ? 'Processing...' : isAssignMode ? 'Assign Leads' : 'Unassign Leads'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAssignModal;
