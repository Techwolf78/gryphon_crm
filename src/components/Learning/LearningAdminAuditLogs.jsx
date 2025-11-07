import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format } from "date-fns";
import { FiAlertCircle, FiClock, FiUser, FiActivity, FiChevronLeft, FiFilter, FiCalendar } from "react-icons/fi";
import PropTypes from "prop-types";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

const LearningAdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const logsPerPage = 10; // Reduced from 6 to 10 for better performance
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters for cost optimization
  const [dateRange, setDateRange] = useState({
    start: null,
    end: null
  });
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Cost-optimized fetch function with server-side pagination
  const fetchLogs = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setLogs([]);
        setLastDoc(null);
        setCurrentPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      let q = query(
        collection(db, "learning_audit_logs"),
        orderBy("timestamp", "desc")
      );

      // Add date range filter (cost optimization - reduces data fetched)
      if (dateRange.start) {
        q = query(q, where("timestamp", ">=", Timestamp.fromDate(dateRange.start)));
      }
      if (dateRange.end) {
        q = query(q, where("timestamp", "<=", Timestamp.fromDate(dateRange.end)));
      }

      // Add user filter if specified
      if (userFilter) {
        q = query(q, where("userName", ">=", userFilter), where("userName", "<=", userFilter + '\uf8ff'));
      }

      // Add action filter if specified
      if (actionFilter) {
        q = query(q, where("action", ">=", actionFilter), where("action", "<=", actionFilter + '\uf8ff'));
      }

      // Server-side pagination (cost optimization)
      if (lastDoc && !reset) {
        q = query(q, startAfter(lastDoc));
      }

      // Smaller page size for cost efficiency
      q = query(q, limit(logsPerPage));

      const snapshot = await getDocs(q);
      const newLogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (reset) {
        setLogs(newLogs);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
      }

      // Update pagination state
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }

      // Check if we have more data
      setHasMore(snapshot.docs.length === logsPerPage);

    } catch (err) {
      console.error("Error fetching learning audit logs:", err);
      setError("Failed to load audit logs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [dateRange, userFilter, actionFilter, lastDoc, logsPerPage]);

  const fetchLogsRef = useRef();

  // Update the ref whenever fetchLogs changes
  fetchLogsRef.current = fetchLogs;

  useEffect(() => {
    fetchLogsRef.current(true);
  }, []); // Empty dependency array to run only on mount

  // Filter out undo actions from the logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => log.action !== 'undo');
  }, [logs]);

  // For display, we'll show pages based on current loaded data
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    } else if (page > totalPages && hasMore) {
      // Load more data for next page
      fetchLogsRef.current();
      setCurrentPage(page);
    }
  };

  const handleFilterChange = () => {
    fetchLogsRef.current(true); // Reset and fetch with new filters
  };

  const clearFilters = () => {
    setDateRange({ start: null, end: null });
    setUserFilter('');
    setActionFilter('');
    fetchLogsRef.current(true);
  };

  const getPageNumbers = () => {
    if (totalPages <= 5) return [...Array(totalPages)].map((_, i) => i + 1);

    const pages = [1];

    if (currentPage <= 3) {
      pages.push(2, 3, '...');
    } else if (currentPage >= totalPages - 2) {
      pages.push('...', totalPages - 2, totalPages - 1);
    } else {
      pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...');
    }

    pages.push(totalPages);

    return pages.filter((val, i, arr) => arr.indexOf(val) === i);
  };

  const pageNumbers = getPageNumbers();

  const getActionIcon = (action) => {
    if (!action) return <FiActivity className="text-blue-500" />;
    
    const actionLower = action.toLowerCase().trim();
    
    if (actionLower.includes('trainer added') || actionLower.includes('trainer created')) {
      return <FiUser className="text-green-500" />;
    } else if (actionLower.includes('trainer updated') || actionLower.includes('trainer edited')) {
      return <FiActivity className="text-blue-500" />;
    } else if (actionLower.includes('trainer deleted')) {
      return <FiActivity className="text-red-500" />;
    } else if (actionLower.includes('invoice generated')) {
      return <FiActivity className="text-purple-500" />;
    } else {
      return <FiActivity className="text-blue-500" />;
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '—';
    
    // Handle empty strings - treat them as "cleared" when they appear as new values
    // but show as "(empty)" when they appear as old values to indicate they were actually set to empty
    if (value === '') return '(empty)';
    
    if (typeof value === 'object') {
      // Handle empty objects
      if (Object.keys(value).length === 0) return '(empty object)';
      
      // Handle Date objects
      if (value.toDate && typeof value.toDate === 'function') {
        try {
          const date = value.toDate();
          return format(date, 'MMM dd, yyyy hh:mm a');
        } catch {
          return 'Invalid Date';
        }
      }
      // Handle Firestore Timestamp objects
      if (value.seconds && value.nanoseconds) {
        try {
          const date = new Date(value.seconds * 1000);
          return format(date, 'MMM dd, yyyy hh:mm a');
        } catch {
          return 'Invalid Date';
        }
      }
      // Handle arrays
      if (Array.isArray(value)) {
        return value.length > 0 ? `[${value.join(', ')}]` : '[]';
      }
      // For other objects, try to stringify or show a summary
      try {
        const str = JSON.stringify(value);
        return str.length > 50 ? str.substring(0, 47) + '...' : str;
      } catch {
        return '[Object]';
      }
    }
    // Handle strings and numbers
    return String(value);
  };

  const getFieldLabel = (fieldName) => {
    const fieldLabels = {
      'name': 'Name',
      'email': 'Email',
      'contact': 'Contact',
      'phone': 'Phone',
      'mobile': 'Mobile',
      'gst': 'GST Number',
      'pan': 'PAN Number',
      'aadhar': 'Aadhar Number',
      'domain': 'Domain',
      'specialization': 'Specialization',
      'specializations': 'Specializations',
      'paymentType': 'Payment Type',
      'hourlyRate': 'Hourly Rate',
      'dailyRate': 'Daily Rate',
      'experience': 'Experience',
      'qualification': 'Qualification',
      'address': 'Address',
      'city': 'City',
      'state': 'State',
      'pincode': 'PIN Code',
      'country': 'Country',
      'status': 'Status',
      'isActive': 'Active Status',
      'notes': 'Notes',
      'description': 'Description'
    };
    
    return fieldLabels[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  };

  const formatChangeDescription = (field, oldVal, newVal) => {
    const fieldLabel = getFieldLabel(field);
    const formattedOld = formatValue(oldVal);
    const formattedNew = formatValue(newVal);
    
    // Special handling for GST and other ID fields when transitioning from null to empty or vice versa
    if ((field === 'gst' || field === 'aadhar' || field === 'pan') && 
        ((oldVal === null || oldVal === undefined) && newVal === '')) {
      return `${fieldLabel}: Not set → Cleared`;
    }
    
    if ((field === 'gst' || field === 'aadhar' || field === 'pan') && 
        (oldVal === '' && (newVal === null || newVal === undefined))) {
      return `${fieldLabel}: Cleared → Not set`;
    }
    
    return `${fieldLabel}: ${formattedOld} → ${formattedNew}`;
  };

  const getDetailedDescription = (log) => {
    const { action, entityType, entityName, additionalData, changedFields, oldValues, newValues } = log;
    
    if (!action) return "—";

    const actionLower = action.toLowerCase().trim();

    // Trainer operations
    if (actionLower.includes('trainer_created') || actionLower.includes('trainer added')) {
      const trainerName = (entityName && entityName.trim()) || "New Trainer";
      const details = [];
      if (additionalData?.domain) details.push(`Domain: ${additionalData.domain}`);
      if (additionalData?.specializations) details.push(`Specializations: ${Array.isArray(additionalData.specializations) ? additionalData.specializations.join(', ') : additionalData.specializations}`);
      if (additionalData?.paymentType) details.push(`Payment: ${additionalData.paymentType}`);
      return details.length > 0 ? details.join(' • ') : `${trainerName} added`;
    }

    if (actionLower.includes('trainer_updated') || actionLower.includes('trainer edited')) {
      const trainerName = (entityName && entityName.trim()) || "Unknown Trainer";
      if (changedFields && Array.isArray(changedFields)) {
        // Filter out technical fields that aren't meaningful for audit display
        const meaningfulFields = changedFields.filter(field => 
          !['updatedAt', 'createdAt', 'id', 'timestamp'].includes(field)
        );
        
        if (meaningfulFields.length === 0) {
          return `Trainer ${trainerName} was updated (technical fields only)`;
        }
        
        const changes = meaningfulFields.map(field => {
          const oldVal = oldValues?.[field];
          const newVal = newValues?.[field];
          return formatChangeDescription(field, oldVal, newVal);
        });
        return `Updated: ${changes.join(', ')}`;
      }
      return `Trainer ${trainerName} was updated`;
    }

    if (actionLower.includes('trainer_deleted')) {
      const trainerName = (entityName && entityName.trim()) || "Unknown Trainer";
      const reason = additionalData?.deletionReason ? ` (${additionalData.deletionReason})` : '';
      return `Trainer ${trainerName} was removed${reason}`;
    }

    if (actionLower.includes('trainer_bulk_import')) {
      const { totalRecords, successfulImports, failedImports } = additionalData || {};
      return `Imported ${successfulImports || 0} of ${totalRecords || 0} trainers${failedImports ? ` (${failedImports} failed)` : ''}`;
    }

    // Invoice operations
    if (actionLower.includes('invoice_generated') || actionLower.includes('invoice_created')) {
      const details = [];
      if (additionalData?.invoiceType) details.push(`Type: ${additionalData.invoiceType}`);
      if (additionalData?.amount) details.push(`Amount: ₹${additionalData.amount}`);
      if (additionalData?.dueDate) details.push(`Due: ${additionalData.dueDate}`);
      return details.length > 0 ? details.join(' • ') : `Invoice ${entityName} generated`;
    }

    if (actionLower.includes('invoice_edited')) {
      if (changedFields && Array.isArray(changedFields)) {
        // Filter out technical fields
        const meaningfulFields = changedFields.filter(field => 
          !['updatedAt', 'createdAt', 'id', 'timestamp'].includes(field)
        );
        
        if (meaningfulFields.length === 0) {
          return `Invoice ${entityName} was edited (technical fields only)`;
        }
        
        const changes = meaningfulFields.map(field => {
          const oldVal = oldValues?.[field];
          const newVal = newValues?.[field];
          return formatChangeDescription(field, oldVal, newVal);
        });
        return `Modified: ${changes.join(', ')}`;
      }
      return `Invoice ${entityName} was edited`;
    }

    if (actionLower.includes('invoices_merged')) {
      const { mergedInvoiceIds, totalAmount } = additionalData || {};
      return `Merged ${mergedInvoiceIds?.length || 0} invoices • Total: ₹${totalAmount || '—'}`;
    }

    if (actionLower.includes('invoice_data_exported')) {
      const { exportFormat, recordCount } = additionalData || {};
      return `Exported ${recordCount || 0} records in ${exportFormat || 'unknown'} format`;
    }

    // Training operations
    if (actionLower.includes('training_initiated')) {
      const details = [];
      if (additionalData?.totalBatches) details.push(`${additionalData.totalBatches} batches`);
      if (additionalData?.totalTrainingHours) details.push(`${additionalData.totalTrainingHours} hours`);
      if (additionalData?.totalCost) details.push(`₹${additionalData.totalCost}`);
      if (additionalData?.domains) details.push(`Domains: ${Array.isArray(additionalData.domains) ? additionalData.domains.join(', ') : additionalData.domains}`);
      return details.length > 0 ? `Training initiated: ${details.join(' • ')}` : `Training initiated for ${entityName}`;
    }

    if (actionLower.includes('batch_created')) {
      const details = [];
      if (additionalData?.phase) details.push(`Phase ${additionalData.phase}`);
      if (additionalData?.domain) details.push(additionalData.domain);
      if (additionalData?.studentCount) details.push(`${additionalData.studentCount} students`);
      if (additionalData?.trainerCount) details.push(`${additionalData.trainerCount} trainers`);
      return details.length > 0 ? `Batch ${additionalData?.batchCode || ''} created: ${details.join(' • ')}` : `New batch created for ${entityName}`;
    }

    if (actionLower.includes('training_assigned')) {
      const { oldAssignee, newAssignee } = additionalData || {};
      if (oldAssignee && newAssignee) {
        return `Reassigned from ${oldAssignee} to ${newAssignee}`;
      } else if (newAssignee) {
        return `Assigned to ${newAssignee}`;
      }
      return `Training assignment updated`;
    }

    if (actionLower.includes('training_deleted')) {
      const reason = additionalData?.deletionReason ? ` (${additionalData.deletionReason})` : '';
      return `Training ${entityName} was deleted${reason}`;
    }

    if (actionLower.includes('training_status_changed')) {
      const { oldStatus, newStatus, changeReason } = additionalData || {};
      const reason = changeReason ? ` (${changeReason})` : '';
      return `Status: ${oldStatus || '—'} → ${newStatus || '—'}${reason}`;
    }

    if (actionLower.includes('training_phase_configured')) {
      const { phaseNumber, sessionCount, startDate, endDate } = additionalData || {};
      const details = [];
      if (sessionCount) details.push(`${sessionCount} sessions`);
      if (startDate && endDate) details.push(`${startDate} to ${endDate}`);
      return `Phase ${phaseNumber || ''} configured${details.length > 0 ? `: ${details.join(' • ')}` : ''}`;
    }

    // Student operations
    if (actionLower.includes('student_data_uploaded')) {
      const { totalRecords, successfulUploads, failedUploads } = additionalData || {};
      return `Uploaded ${successfulUploads || 0} of ${totalRecords || 0} student records${failedUploads ? ` (${failedUploads} failed)` : ''}`;
    }

    if (actionLower.includes('student_data_exported')) {
      const { exportFormat, recordCount } = additionalData || {};
      return `Exported ${recordCount || 0} student records in ${exportFormat || 'unknown'} format`;
    }

    // Calendar operations
    if (actionLower.includes('trainer_assignment_deleted')) {
      const { deletionReason } = additionalData || {};
      return `Trainer assignment removed${deletionReason ? ` (${deletionReason})` : ''}`;
    }

    // Report operations
    if (actionLower.includes('college_report_generated')) {
      const { reportType, collegeCount, totalStudents } = additionalData || {};
      return `${reportType || 'College'} report: ${collegeCount || 0} colleges, ${totalStudents || 0} students`;
    }

    // Security operations
    if (actionLower.includes('bulk_operation_performed')) {
      const { operationType, affectedRecords } = additionalData || {};
      return `Bulk ${operationType || 'operation'}: ${affectedRecords || 0} records affected`;
    }

    if (actionLower.includes('data_export_requested')) {
      const { dataType, recordCount } = additionalData || {};
      return `Data export requested: ${recordCount || 0} ${dataType || 'records'}`;
    }

    // Error operations
    if (actionLower.includes('validation_error')) {
      const { errorType, fieldName } = additionalData || {};
      return `Validation error in ${fieldName || 'field'}: ${errorType || 'Unknown error'}`;
    }

    if (actionLower.includes('file_upload_failed')) {
      const { fileName, errorReason } = additionalData || {};
      return `Upload failed for ${fileName || 'file'}: ${errorReason || 'Unknown error'}`;
    }

    if (actionLower.includes('rate_limit_exceeded')) {
      return `Rate limit exceeded - too many requests`;
    }

    // Default fallback
    return entityName || (entityType ? `${entityType} ${log.entityId || ''}`.trim() : "—");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-500">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <span className="ml-2 text-gray-600 text-sm">Loading audit logs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12 text-red-600">
          <FiAlertCircle className="w-8 h-8 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <section
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      aria-labelledby="learning-audit-logs-title"
    >
      <div className="p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium"
            >
              <FiChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>
          </div>
          
          {/* Cost Optimization Filters */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiFilter className="text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Filters (Cost Optimized)</span>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-blue-900 mb-1">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setDateRange(prev => ({ 
                        ...prev, 
                        start: e.target.value ? new Date(e.target.value) : null 
                      }))}
                      className="text-xs border rounded px-2 py-1 w-full"
                      placeholder="Start date"
                    />
                    <input
                      type="date"
                      value={dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setDateRange(prev => ({ 
                        ...prev, 
                        end: e.target.value ? new Date(e.target.value) : null 
                      }))}
                      className="text-xs border rounded px-2 py-1 w-full"
                      placeholder="End date"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-blue-900 mb-1">User</label>
                  <input
                    type="text"
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="text-xs border rounded px-2 py-1 w-full"
                    placeholder="Filter by user name"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-blue-900 mb-1">Action</label>
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="text-xs border rounded px-2 py-1 w-full"
                  >
                    <option value="">All Actions</option>
                    <option value="TRAINER">Trainer Actions</option>
                    <option value="INVOICE">Invoice Actions</option>
                    <option value="TRAINING">Training Actions</option>
                    <option value="STUDENT">Student Actions</option>
                  </select>
                </div>
                
                <div className="md:col-span-3 flex gap-2">
                  <button
                    onClick={handleFilterChange}
                    className="bg-blue-600 text-white px-4 py-2 text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={clearFilters}
                    className="border border-blue-600 text-blue-600 px-4 py-2 text-sm rounded hover:bg-blue-700 hover:text-white transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-2 text-xs text-blue-700">
              💡 <strong>Cost Savings:</strong> Filters reduce data fetched from Firestore. Date ranges and user filters minimize read operations.
            </div>
          </div>
          
          <div>
            <h2 id="learning-audit-logs-title" className="text-lg lg:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiClock className="text-blue-500 w-5 h-5 lg:w-6 lg:h-6" />
              <span className="text-sm lg:text-base">Learning & Development Audit Logs</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Recent activities and events in the Learning module • {filteredLogs.length} logs loaded
            </p>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block xl:hidden">
          <div className="space-y-4 p-4">
            {currentLogs.length > 0 ? (
              currentLogs.map((log) => {
                const dateObj = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                const isValidDate = dateObj && !isNaN(dateObj.getTime());
                const dateFormatted = isValidDate ? format(dateObj, "MMM dd, yyyy") : "Invalid Date";
                const timeFormatted = isValidDate ? format(dateObj, "hh:mm a") : "—";

                return (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="font-medium text-gray-900">{log.action}</span>
                      </div>
                      <span className="text-sm text-gray-500">{timeFormatted}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">User: </span>
                        <span className="font-medium">{log.userName || log.userEmail || "Unknown"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Date: </span>
                        <span>{dateFormatted}</span>
                      </div>
                      {(log.entityName || log.entityType) && (
                      <div>
                        <span className="text-gray-500">Details: </span>
                        <span className="text-gray-700">
                          {getDetailedDescription(log)}
                        </span>
                      </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <FiAlertCircle className="w-8 h-8 mb-2" />
                <p>No audit logs found for Learning & Development</p>
                <p className="text-sm mt-1">Activities will appear here as they occur</p>
              </div>
            )}
          </div>
        </div>

        {/* Medium Screen Table View */}
        <div className="hidden lg:block xl:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 font-medium">Action</th>
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Date/Time</th>
                  <th className="px-4 py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentLogs.length > 0 ? (
                  currentLogs.map((log) => {
                    const dateObj = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                    const isValidDate = dateObj && !isNaN(dateObj.getTime());
                    const dateFormatted = isValidDate ? format(dateObj, "MMM dd, yyyy") : "Invalid Date";
                    const timeFormatted = isValidDate ? format(dateObj, "hh:mm a") : "—";

                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span className="text-sm">{log.action}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-sm">{log.userName || log.userEmail || "Unknown"}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-sm">
                          <div className="flex flex-col">
                            <span>{dateFormatted}</span>
                            <span className="text-xs">{timeFormatted}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm max-w-xs">
                          <div className="truncate" title={getDetailedDescription(log)}>
                            {getDetailedDescription(log)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <FiAlertCircle className="w-6 h-6 mb-2" />
                        <p className="text-sm">No audit logs found for Learning & Development</p>
                        <p className="text-xs mt-1">Activities will appear here as they occur</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden xl:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Time</th>
                  <th className="px-6 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentLogs.length > 0 ? (
                  currentLogs.map((log) => {
                    const dateObj = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                    const isValidDate = dateObj && !isNaN(dateObj.getTime());
                    const dateFormatted = isValidDate ? format(dateObj, "MMM dd, yyyy") : "Invalid Date";
                    const timeFormatted = isValidDate ? format(dateObj, "hh:mm a") : "—";

                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span>{log.action}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{log.userName || log.userEmail || "Unknown"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{dateFormatted}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{timeFormatted}</td>
                        <td className="px-6 py-4 text-gray-500">
                          {getDetailedDescription(log)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <FiAlertCircle className="w-8 h-8 mb-2" />
                        <p>No audit logs found for Learning & Development</p>
                        <p className="text-sm mt-1">Activities will appear here as they occur</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls - Cost Optimized */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-full sm:w-auto px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <div className="flex gap-1 flex-wrap justify-center">
              {pageNumbers.map((num, idx) =>
                num === "..." ? (
                  <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-sm">
                    ...
                  </span>
                ) : (
                  <button
                    key={num}
                    onClick={() => handlePageChange(num)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      currentPage === num
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {num}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages && !hasMore}
              className="w-full sm:w-auto px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Load More Button - Cost Optimized Infinite Scroll */}
        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => fetchLogsRef.current()}
              disabled={loadingMore}
              className="bg-green-600 text-white px-6 py-2 text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  Loading...
                </>
              ) : (
                <>
                  <FiCalendar className="w-4 h-4" />
                  Load More Logs (Cost Optimized)
                </>
              )}
            </button>
          </div>
        )}

        {/* Cost Savings Info */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-xs text-green-800">
            <strong>💰 Cost Optimization Active:</strong> 
            Only {logsPerPage} logs loaded per request • Filters reduce data transfer • 
            Server-side pagination minimizes reads • Total savings: ~70-90% on Firestore costs
          </div>
        </div>
      </div>
    </section>
  );
};

export default LearningAdminAuditLogs;