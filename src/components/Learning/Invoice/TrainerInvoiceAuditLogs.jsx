import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../firebase';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { FiSearch, FiFilter, FiDownload, FiEye, FiCalendar, FiUser, FiFileText, FiTrash2, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';

const AUDIT_ACTIONS = {
  GENERATE: 'generate',
  EDIT: 'edit',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  DOWNLOAD: 'download',
  VIEW: 'view',
  RESTORE: 'restore'
};

const ACTION_COLORS = {
  [AUDIT_ACTIONS.GENERATE]: 'bg-green-100 text-green-800 border-green-200',
  [AUDIT_ACTIONS.EDIT]: 'bg-blue-100 text-blue-800 border-blue-200',
  [AUDIT_ACTIONS.DELETE]: 'bg-red-100 text-red-800 border-red-200',
  [AUDIT_ACTIONS.APPROVE]: 'bg-purple-100 text-purple-800 border-purple-200',
  [AUDIT_ACTIONS.REJECT]: 'bg-orange-100 text-orange-800 border-orange-200',
  [AUDIT_ACTIONS.DOWNLOAD]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [AUDIT_ACTIONS.VIEW]: 'bg-gray-100 text-gray-800 border-gray-200',
  [AUDIT_ACTIONS.RESTORE]: 'bg-teal-100 text-teal-800 border-teal-200'
};

const ACTION_LABELS = {
  [AUDIT_ACTIONS.GENERATE]: 'Generated',
  [AUDIT_ACTIONS.EDIT]: 'Edited',
  [AUDIT_ACTIONS.DELETE]: 'Deleted',
  [AUDIT_ACTIONS.APPROVE]: 'Approved',
  [AUDIT_ACTIONS.REJECT]: 'Rejected',
  [AUDIT_ACTIONS.DOWNLOAD]: 'Downloaded',
  [AUDIT_ACTIONS.VIEW]: 'Viewed',
  [AUDIT_ACTIONS.RESTORE]: 'Restored'
};

function TrainerInvoiceAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [trainerFilter, setTrainerFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Refresh rate limiting
  const [refreshTimestamps, setRefreshTimestamps] = useState([]);
  const [isRefreshDisabled, setIsRefreshDisabled] = useState(false);
  const [refreshTimeoutId, setRefreshTimeoutId] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [showRateLimitWarning, setShowRateLimitWarning] = useState(false);

  const loadLogs = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      let q = query(
        collection(db, 'trainer_invoice_audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      if (!reset && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
      }));

      if (reset) {
        setLogs(newLogs);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 50);
    } catch {
      // console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [lastDoc]);

  // Load initial logs
  useEffect(() => {
    const loadInitialLogs = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'trainer_invoice_audit_logs'),
          orderBy('timestamp', 'desc'),
          limit(50)
        );

        const snapshot = await getDocs(q);
        const newLogs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
        }));

        setLogs(newLogs);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 50);
      } catch {
        // console.error('Error loading audit logs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialLogs();
  }, []); // Empty dependency array - only run once on mount

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutId) {
        clearTimeout(refreshTimeoutId);
      }
    };
  }, [refreshTimeoutId]);

  // Debounce search term to optimize performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtered logs based on search and filters
  const filteredLogs = useMemo(() => {
    // Pre-process search term for better performance
    const searchLower = debouncedSearchTerm.toLowerCase();

    return logs.filter(log => {
      // Optimize search matching
      const matchesSearch = !debouncedSearchTerm ||
        (log.trainerName?.toLowerCase().includes(searchLower) ||
         log.userName?.toLowerCase().includes(searchLower) ||
         log.billNumber?.toLowerCase().includes(searchLower) ||
         log.collegeName?.toLowerCase().includes(searchLower));

      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesUser = !userFilter || log.userName?.toLowerCase().includes(userFilter.toLowerCase());
      const matchesTrainer = !trainerFilter || log.trainerName?.toLowerCase().includes(trainerFilter.toLowerCase());

      const logDate = log.timestamp;
      const matchesDateRange = (!startDate || logDate >= new Date(startDate)) &&
                              (!endDate || logDate <= new Date(endDate + 'T23:59:59'));

      return matchesSearch && matchesAction && matchesUser && matchesTrainer && matchesDateRange;
    });
  }, [logs, debouncedSearchTerm, actionFilter, userFilter, trainerFilter, startDate, endDate]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Action', 'User', 'Trainer', 'College', 'Bill Number', 'Amount', 'Details'];
    const csvData = filteredLogs.map(log => [
      formatDate(log.timestamp),
      ACTION_LABELS[log.action] || log.action,
      log.userName || 'N/A',
      log.trainerName || 'N/A',
      log.collegeName || 'N/A',
      log.billNumber || 'N/A',
      log.netPayment ? formatCurrency(log.netPayment) : 'N/A',
      log.details?.editReason || log.details?.deleteReason || log.details?.approvalReason || 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trainer_invoice_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setActionFilter('');
    setUserFilter('');
    setTrainerFilter('');
    setStartDate('');
    setEndDate('');
  };

  // Rate-limited refresh function
  const handleRefresh = () => {
    if (isRefreshDisabled) return;

    const now = Date.now();
    const tenSecondsAgo = now - 10000; // 10 seconds in milliseconds

    // Clean up old timestamps and add current one
    const recentTimestamps = [...refreshTimestamps.filter(ts => ts > tenSecondsAgo), now];
    setRefreshTimestamps(recentTimestamps);

    // Check if more than 3 presses in 10 seconds
    if (recentTimestamps.length > 3) {
      setIsRefreshDisabled(true);
      setCountdown(10);
      setShowRateLimitWarning(true);

      // Hide warning after 3 seconds
      setTimeout(() => setShowRateLimitWarning(false), 3000);

      // Clear any existing timeout
      if (refreshTimeoutId) {
        clearTimeout(refreshTimeoutId);
      }

      // Start countdown timer
      const startTime = Date.now();
      const countdownInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = 10 - elapsed;
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          setCountdown(0);
        } else {
          setCountdown(remaining);
        }
      }, 100);

      // Set timeout for 10 seconds
      const timeoutId = setTimeout(() => {
        clearInterval(countdownInterval);
        setIsRefreshDisabled(false);
        setRefreshTimestamps([]); // Reset timestamps after timeout
        setCountdown(0);
        setRefreshTimeoutId(null);
      }, 10000);

      setRefreshTimeoutId(timeoutId);
      return; // Don't refresh if rate limited
    }

    // Perform the actual refresh
    loadLogs(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className=" mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Trainer Invoice Audit Logs</h1>
              <p className="text-gray-600 text-sm">Track all invoice-related activities and changes</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshDisabled}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                  isRefreshDisabled
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                title={isRefreshDisabled ? `Refresh disabled for ${countdown} seconds due to rate limiting` : 'Refresh audit logs'}
              >
                <FiRefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                {isRefreshDisabled ? `Wait ${countdown}s` : 'Refresh'}
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <FiDownload className="w-3 h-3" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="relative">
                  <FiSearch className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 ${searchTerm !== debouncedSearchTerm ? 'text-orange-400 animate-pulse' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    placeholder="Search by trainer, user, bill number, or college..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  {searchTerm !== debouncedSearchTerm && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-3 w-3 border border-orange-400 border-t-transparent"></div>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <FiFilter className="w-3 h-3" />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="w-full px-1 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  >
                    <option value="">All Actions</option>
                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">User</label>
                  <input
                    type="text"
                    placeholder="Filter by user"
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="w-full px-1 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Trainer</label>
                  <input
                    type="text"
                    placeholder="Filter by trainer"
                    value={trainerFilter}
                    onChange={(e) => setTrainerFilter(e.target.value)}
                    className="w-full px-1 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-1 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-1 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-1 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-xs"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rate Limit Warning */}
        {showRateLimitWarning && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <FiRefreshCw className="w-4 h-4 text-orange-600 mr-2" />
              <p className="text-sm text-orange-800">
                Too many refresh attempts! Refresh is disabled for 10 seconds to prevent server overload.
              </p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Logs</p>
                <p className="text-lg font-bold text-gray-900">{filteredLogs.length}</p>
              </div>
              <FiFileText className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Generates</p>
                <p className="text-lg font-bold text-green-600">
                  {filteredLogs.filter(log => log.action === AUDIT_ACTIONS.GENERATE).length}
                </p>
              </div>
              <FiCheckCircle className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Edits</p>
                <p className="text-lg font-bold text-blue-600">
                  {filteredLogs.filter(log => log.action === AUDIT_ACTIONS.EDIT).length}
                </p>
              </div>
              <FiRefreshCw className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Deletes</p>
                <p className="text-lg font-bold text-red-600">
                  {filteredLogs.filter(log => log.action === AUDIT_ACTIONS.DELETE).length}
                </p>
              </div>
              <FiTrash2 className="w-4 h-4 text-red-500" />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-1 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-1 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-1 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-1 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trainer</th>
                  <th className="px-1 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College</th>
                  <th className="px-1 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Number</th>
                  <th className="px-1 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-1 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-900">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-1 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-1 py-2 text-xs text-gray-900">
                      <div className="flex items-center">
                        <FiUser className="w-3 h-3 text-gray-400 mr-1" />
                        {log.userName || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-1 py-2 text-xs text-gray-900">
                      {log.trainerName || 'N/A'}
                      {log.trainerId && (
                        <div className="text-xs text-gray-500">ID: {log.trainerId}</div>
                      )}
                    </td>
                    <td className="px-1 py-2 text-xs text-gray-900">
                      {log.collegeName || 'N/A'}
                    </td>
                    <td className="px-1 py-2 text-xs text-gray-900 max-w-xs">
                      <div className="truncate" title={log.billNumber || 'N/A'}>
                        {log.billNumber && log.billNumber.length > 15 
                          ? `${log.billNumber.substring(0, 10)}....` 
                          : (log.billNumber || 'N/A')}
                      </div>
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-900">
                      {log.netPayment ? (
                        <div className="flex items-center">
                          <FaRupeeSign className="w-2.5 h-2.5 text-green-600 mr-1" />
                          {formatCurrency(log.netPayment)}
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td className="px-1 py-2 text-xs font-medium">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <FiEye className="w-3 h-3" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && !loading && (
            <div className="text-center py-8">
              <FiFileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No audit logs found</h3>
              <p className="text-gray-500 text-xs">Try adjusting your filters or check back later.</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Loading audit logs...</p>
            </div>
          )}

          {hasMore && !loading && (
            <div className="text-center py-4 border-t border-gray-200">
              <button
                onClick={() => loadLogs()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Load More
              </button>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-54 p-2">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="p-3">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-bold text-gray-900">Audit Log Details</h2>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiXCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Action</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${ACTION_COLORS[selectedLog.action] || 'bg-gray-100 text-gray-800'}`}>
                        {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(selectedLog.timestamp)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">User</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedLog.userName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{selectedLog.userEmail || ''}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Trainer</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedLog.trainerName || 'N/A'}</p>
                      {selectedLog.trainerId && (
                        <p className="text-xs text-gray-500">ID: {selectedLog.trainerId}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">College</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedLog.collegeName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Project</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedLog.projectCode || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bill Number</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedLog.billNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Amount</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {selectedLog.netPayment ? formatCurrency(selectedLog.netPayment) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {selectedLog.details && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Additional Details</label>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm">
                        <pre className="whitespace-pre-wrap text-gray-800">
                          {JSON.stringify(selectedLog.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrainerInvoiceAuditLogs;