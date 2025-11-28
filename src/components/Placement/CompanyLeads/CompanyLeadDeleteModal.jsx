import React, { useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { logPlacementActivity, AUDIT_ACTIONS } from '../../../utils/placementAuditLogger';

const CompanyLeadDeleteModal = ({ 
  isOpen, 
  onClose, 
  selectedLeads, 
  allLeads, 
  user, 
  onDeleteComplete 
}) => {
  const [progress, setProgress] = useState({ isDeleting: false, current: 0, total: 0, currentLead: null });
  const [messages, setMessages] = useState([]);

  const addMessage = useCallback((message, type = 'info') => {
    setMessages(prev => [...prev.slice(-9), { text: message, type, timestamp: new Date() }]);
  }, []);

  // Helper function to delete multiple leads from a batch at once
  const deleteBatchLeads = async (batchId, leadsToDelete) => {
    const batchDocRef = doc(db, "companyleads", batchId);
    const batchDocSnap = await getDoc(batchDocRef);

    if (!batchDocSnap.exists()) {
      throw new Error(`Batch document ${batchId} not found`);
    }

    const batchData = batchDocSnap.data();
    let encodedCompanies = batchData.companies || [];

    if (Array.isArray(encodedCompanies)) {
      // Create a set of company names to delete for fallback matching
      const namesToDelete = new Set(leadsToDelete.map(lead => lead.companyName || lead.name).filter(Boolean));
      const idsToDelete = new Set(leadsToDelete.map(lead => lead.id).filter(Boolean));

      // Filter out companies to delete
      const filteredCompanies = [];
      let deletedCount = 0;

      for (let i = 0; i < encodedCompanies.length; i++) {
        try {
          const uriDecoded = atob(encodedCompanies[i]);
          const jsonString = decodeURIComponent(uriDecoded);
          const decodedCompany = JSON.parse(jsonString);
          
          const compId = decodedCompany.id || `${batchId}_${i}`;
          const compName = decodedCompany.companyName || decodedCompany.name;
          
          // Check if this company should be deleted
          const shouldDelete = idsToDelete.has(compId) || 
                             (compName && namesToDelete.has(compName)) ||
                             idsToDelete.has(`${batchId}_${i}`); // fallback for original index
          
          if (!shouldDelete) {
            filteredCompanies.push(encodedCompanies[i]);
          } else {
            deletedCount++;
          }
        } catch {
          // If decoding fails, keep the entry (better safe than sorry)
          filteredCompanies.push(encodedCompanies[i]);
        }
      }

      // Update the batch document with filtered companies
      await setDoc(batchDocRef, { ...batchData, companies: filteredCompanies });
      
      return deletedCount;
    } else {
      throw new Error('Unexpected companies data structure');
    }
  };

  const handlePermanentDelete = useCallback(async (leadIds) => {
    setMessages([]);
    setProgress({ isDeleting: true, current: 0, total: leadIds.length, currentLead: null });

    let successCount = 0;
    let errorCount = 0;

    addMessage(`Starting deletion of ${leadIds.length} leads...`, 'info');

    // Group leads by batchId for efficient batch processing
    const leadsByBatch = {};
    for (const leadId of leadIds) {
      const lead = allLeads.find(l => l.id === leadId);
      if (lead && lead.batchId) {
        if (!leadsByBatch[lead.batchId]) {
          leadsByBatch[lead.batchId] = [];
        }
        leadsByBatch[lead.batchId].push(lead);
      }
    }

    // Process each batch
    let processedCount = 0;
    for (const batchId of Object.keys(leadsByBatch)) {
      const batchLeads = leadsByBatch[batchId];
      addMessage(`Processing batch ${batchId} with ${batchLeads.length} leads...`, 'info');

      setProgress(prev => ({ 
        ...prev, 
        current: processedCount + batchLeads.length, 
        currentLead: `Batch ${batchId} (${batchLeads.length} leads)` 
      }));

      try {
        const deletedCount = await deleteBatchLeads(batchId, batchLeads);
        successCount += deletedCount;
        processedCount += batchLeads.length;
        addMessage(`✅ Deleted ${deletedCount}/${batchLeads.length} leads from batch ${batchId}`, 'success');
      } catch (error) {
        console.error(`Error deleting batch ${batchId}:`, error);
        errorCount += batchLeads.length;
        processedCount += batchLeads.length;
        
        // Check if it's a Firebase overload error
        const isOverloadError = error?.code === 'resource-exhausted' || 
                               error?.message?.includes('resource-exhausted') ||
                               error?.message?.includes('Write stream exhausted');
        
        if (isOverloadError) {
          addMessage(`🔥 Backend overloaded! Waiting 60 seconds before continuing...`, 'warning');
          await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds for overload
        } else {
          addMessage(`❌ Failed to delete batch ${batchId} (${batchLeads.length} leads)`, 'error');
        }
      }

      // Wait 3 seconds between batches
      if (Object.keys(leadsByBatch).indexOf(batchId) < Object.keys(leadsByBatch).length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Final summary
    addMessage(`🎯 Deletion complete: ${successCount} deleted, ${errorCount} failed`, successCount === leadIds.length ? 'success' : 'warning');

    // Reset progress but keep modal open for user to review summary
    setProgress({ isDeleting: false, current: leadIds.length, total: leadIds.length, currentLead: null });

    // Log the permanent delete activity
    logPlacementActivity({
      userId: user?.uid,
      userName: user?.displayName || user?.name || "Unknown User",
      action: AUDIT_ACTIONS.DELETE_LEAD,
      companyId: null,
      companyName: null,
      details: `Permanent deletion attempt: ${successCount} successful, ${errorCount} failed out of ${leadIds.length} leads`,
      sessionId: sessionStorage.getItem('sessionId') || 'unknown'
    });

    // Notify parent component
    onDeleteComplete(successCount, errorCount, leadIds);
  }, [allLeads, user, addMessage, onDeleteComplete]);

  // Auto-start deletion when modal opens with selected leads
  React.useEffect(() => {
    if (isOpen && selectedLeads && selectedLeads.length > 0 && !progress.isDeleting) {
      handlePermanentDelete(selectedLeads);
    }
  }, [isOpen, selectedLeads, progress.isDeleting, handlePermanentDelete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-60">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-center flex-1">
            <div className="w-12 h-12 bg-red-100 rounded-full mx-auto mb-3 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Permanent Deletion {progress.isDeleting ? 'in Progress' : 'Complete'}
            </h3>
            <p className="text-sm text-gray-600">
              {progress.isDeleting 
                ? 'Please wait while leads are being deleted...' 
                : 'Review the summary below and close when ready.'
              }
            </p>
          </div>
          {!progress.isDeleting && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {progress.current}/{progress.total}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-red-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current Lead */}
        {progress.currentLead && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Currently processing:</span> {progress.currentLead}
            </p>
          </div>
        )}

        {/* Messages Log */}
        <div className="mb-4 max-h-48 overflow-y-auto">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Activity Log:</h4>
          <div className="space-y-1">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`text-xs p-2 rounded ${
                  message.type === 'success' ? 'bg-green-50 text-green-800' :
                  message.type === 'error' ? 'bg-red-50 text-red-800' :
                  message.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                  'bg-blue-50 text-blue-800'
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {progress.isDeleting 
              ? 'This process may take several minutes. Please do not close this window.'
              : 'You can now close this window. The deletion process is complete.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompanyLeadDeleteModal;
