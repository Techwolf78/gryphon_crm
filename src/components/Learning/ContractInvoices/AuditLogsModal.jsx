import React from 'react';

const AuditLogsModal = ({
  showAuditModal,
  setShowAuditModal,
  auditLogs,
  auditLogsLoading,
  auditLogsError,
  auditLogsPagination,
  auditLogsFilters,
  setAuditLogsFilters,
  auditLogsSort,
  setAuditLogsSort,
  fetchAuditLogs,
  exportAuditLogsToCSV
}) => {
  if (!showAuditModal) return null;

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-lg bg-opacity-60 flex items-center justify-center z-54 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl min-h-[95vh] max-h-[95vh] overflow-hidden border border-gray-200/60">
        {/* Header */}
        <div className="bg-linear-to-r from-red-600 to-red-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Audit Logs</h2>
                <p className="text-red-100 text-xs">Invoice cancellation history</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-md font-medium">
                {auditLogsPagination.totalRecords || auditLogs.length} {auditLogsPagination.totalRecords === 1 ? 'entry' : 'entries'}
              </span>
              <button
                onClick={exportAuditLogsToCSV}
                disabled={auditLogsLoading || auditLogs.length === 0}
                className="w-6 h-6 bg-white/20 hover:bg-white/30 disabled:bg-white/10 rounded-md flex items-center justify-center transition-colors duration-200"
                title="Export to CSV"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                onClick={() => fetchAuditLogs(1)}
                disabled={auditLogsLoading}
                className="w-6 h-6 bg-white/20 hover:bg-white/30 disabled:bg-white/10 rounded-md flex items-center justify-center transition-colors duration-200"
                title="Refresh audit logs"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setShowAuditModal(false)}
                className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-md flex items-center justify-center transition-colors duration-200"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-80px)]">
          {auditLogsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-3"></div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Loading Audit Logs</h3>
              <p className="text-gray-500 text-sm text-center">Please wait while we fetch the audit logs...</p>
            </div>
          ) : auditLogsError ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Error Loading Audit Logs</h3>
              <p className="text-gray-500 text-sm text-center mb-4">{auditLogsError}</p>
              <button
                onClick={() => fetchAuditLogs(auditLogsPagination.currentPage)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No Audit Logs</h3>
              <p className="text-gray-500 text-sm text-center max-w-sm">
                Invoice cancellation actions will appear here
              </p>
            </div>
          ) : (
            <div className="p-4">
              {/* Filters */}
              <div className="mb-4">
                <button
                  onClick={() => setAuditLogsFilters(prev => ({ ...prev, showFilters: !prev.showFilters }))}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
                >
                  <svg className={`w-4 h-4 transition-transform ${auditLogsFilters.showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Filters & Search
                </button>

                {auditLogsFilters.showFilters && (
                  <div className="bg-gray-50 rounded-lg p-2 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Search (Invoice/User/Details)
                        </label>
                        <input
                          type="text"
                          value={auditLogsFilters.searchTerm}
                          onChange={(e) => setAuditLogsFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                          placeholder="Search logs..."
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          From Date
                        </label>
                        <input
                          type="date"
                          value={auditLogsFilters.startDate}
                          onChange={(e) => setAuditLogsFilters(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          To Date
                        </label>
                        <input
                          type="date"
                          value={auditLogsFilters.endDate}
                          onChange={(e) => setAuditLogsFilters(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchAuditLogs(1, auditLogsFilters)}
                        disabled={auditLogsLoading}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1.5 rounded-md text-xs font-medium"
                      >
                        Apply Filters
                      </button>
                      <button
                        onClick={() => {
                          setAuditLogsFilters({
                            searchTerm: '',
                            startDate: '',
                            endDate: '',
                            showFilters: true
                          });
                          fetchAuditLogs(1, {
                            searchTerm: '',
                            startDate: '',
                            endDate: '',
                            showFilters: true
                          });
                        }}
                        disabled={auditLogsLoading}
                        className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-3 py-1.5 rounded-md text-xs font-medium"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pagination Info */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-600">
                  Showing {((auditLogsPagination.currentPage - 1) * auditLogsPagination.pageSize) + 1} to {Math.min(auditLogsPagination.currentPage * auditLogsPagination.pageSize, auditLogsPagination.totalRecords)} of {auditLogsPagination.totalRecords} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchAuditLogs(auditLogsPagination.currentPage - 1, auditLogsFilters)}
                    disabled={auditLogsPagination.currentPage <= 1 || auditLogsLoading}
                    className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded border"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {auditLogsPagination.currentPage} of {auditLogsPagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchAuditLogs(auditLogsPagination.currentPage + 1, auditLogsFilters)}
                    disabled={auditLogsPagination.currentPage >= auditLogsPagination.totalPages || auditLogsLoading}
                    className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded border"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Table Header */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  <div className="col-span-1">#</div>
                  <div className="col-span-2">Action</div>
                  <div
                    className="col-span-3 cursor-pointer hover:text-gray-900 flex items-center gap-1"
                    onClick={() => {
                      const newDirection = auditLogsSort.field === 'invoiceNumber' && auditLogsSort.direction === 'asc' ? 'desc' : 'asc';
                      setAuditLogsSort({ field: 'invoiceNumber', direction: newDirection });
                      fetchAuditLogs(1, auditLogsFilters);
                    }}
                  >
                    Invoice
                    <svg className={`w-3 h-3 ${auditLogsSort.field === 'invoiceNumber' ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={auditLogsSort.field === 'invoiceNumber' && auditLogsSort.direction === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                    </svg>
                  </div>
                  <div
                    className="col-span-2 cursor-pointer hover:text-gray-900 flex items-center gap-1"
                    onClick={() => {
                      const newDirection = auditLogsSort.field === 'user' && auditLogsSort.direction === 'asc' ? 'desc' : 'asc';
                      setAuditLogsSort({ field: 'user', direction: newDirection });
                      fetchAuditLogs(1, auditLogsFilters);
                    }}
                  >
                    User
                    <svg className={`w-3 h-3 ${auditLogsSort.field === 'user' ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={auditLogsSort.field === 'user' && auditLogsSort.direction === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                    </svg>
                  </div>
                  <div
                    className="col-span-3 cursor-pointer hover:text-gray-900 flex items-center gap-1"
                    onClick={() => {
                      const newDirection = auditLogsSort.field === 'timestamp' && auditLogsSort.direction === 'asc' ? 'desc' : 'asc';
                      setAuditLogsSort({ field: 'timestamp', direction: newDirection });
                      fetchAuditLogs(1, auditLogsFilters);
                    }}
                  >
                    Timestamp
                    <svg className={`w-3 h-3 ${auditLogsSort.field === 'timestamp' ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={auditLogsSort.field === 'timestamp' && auditLogsSort.direction === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                    </svg>
                  </div>
                  <div className="col-span-1">Details</div>
                </div>
              </div>

              {/* Audit Logs List */}
              <div className="space-y-1">
                {auditLogs.map((log, index) => (
                  <div
                    key={log.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150"
                  >
                    <div className="grid grid-cols-12 gap-2 items-center text-sm">
                      {/* Entry Number */}
                      <div className="col-span-1">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                          {((auditLogsPagination.currentPage - 1) * auditLogsPagination.pageSize) + index + 1}
                        </span>
                      </div>

                      {/* Action */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-red-100 rounded-md flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900 truncate">
                            {log.action || 'Invoice Cancelled'}
                          </span>
                        </div>
                      </div>

                      {/* Invoice Info */}
                      <div className="col-span-3">
                        <div className="space-y-0.5">
                          <div className="font-mono text-xs text-gray-900">
                            {log.invoiceNumber || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            ID: {log.invoiceId || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* User */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                            <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <span className="text-xs text-gray-900 truncate">
                            {log.user || 'Unknown'}
                          </span>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="col-span-3">
                        <div className="text-xs text-gray-600">
                          {log.timestamp?.toDate
                            ? log.timestamp.toDate().toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : new Date(log.timestamp).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                          }
                        </div>
                      </div>

                      {/* Details */}
                      <div className="col-span-1">
                        {log.details ? (
                          <div className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-1 rounded border border-blue-200">
                            <div className="truncate" title={log.details}>
                              {log.details.length > 15 ? `${log.details.substring(0, 15)}...` : log.details}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </div>

                    {/* Full Details Expansion */}
                    {log.details && log.details.length > 50 && (
                      <div className="col-span-12 mt-2">
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                          <div className="text-xs font-medium text-blue-700 mb-1">Full Details:</div>
                          <div className="text-xs text-blue-800 leading-relaxed">
                            {log.details}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Pagination */}
              {auditLogsPagination.totalPages > 1 && (
                <div className="flex items-center justify-center mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchAuditLogs(1, auditLogsFilters)}
                      disabled={auditLogsPagination.currentPage <= 1 || auditLogsLoading}
                      className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded border"
                    >
                      First
                    </button>
                    <button
                      onClick={() => fetchAuditLogs(auditLogsPagination.currentPage - 1, auditLogsFilters)}
                      disabled={auditLogsPagination.currentPage <= 1 || auditLogsLoading}
                      className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded border"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700 px-2">
                      Page {auditLogsPagination.currentPage} of {auditLogsPagination.totalPages}
                    </span>
                    <button
                      onClick={() => fetchAuditLogs(auditLogsPagination.currentPage + 1, auditLogsFilters)}
                      disabled={auditLogsPagination.currentPage >= auditLogsPagination.totalPages || auditLogsLoading}
                      className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded border"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => fetchAuditLogs(auditLogsPagination.totalPages, auditLogsFilters)}
                      disabled={auditLogsPagination.currentPage >= auditLogsPagination.totalPages || auditLogsLoading}
                      className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded border"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogsModal;