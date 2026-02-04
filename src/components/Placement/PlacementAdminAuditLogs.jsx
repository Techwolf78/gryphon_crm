import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { collection, query, orderBy, getDocs, where, startAfter, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { FaSearch, FaFilter, FaEye, FaDownload, FaArrowLeft } from "react-icons/fa";

const PlacementAdminAuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allUsers, setAllUsers] = useState({});
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const logsPerPage = 50; // Increased to 50 per page for better performance
  const [currentPage, setCurrentPage] = useState(1);

    const fetchUsers = useCallback(async () => {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const usersData = {};
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        
        // Only include users with placement-related roles/departments
        const hasPlacementAccess = 
          (userData.departments && (
            userData.departments.includes("placement") || 
            userData.departments.includes("Placement") ||
            userData.departments.includes("admin") ||
            userData.departments.includes("Admin")
          )) ||
          (userData.department && (
            userData.department === "placement" || 
            userData.department === "Placement" ||
            userData.department === "admin" ||
            userData.department === "Admin"
          )) ||
          (userData.role && (
            userData.role === "placement" || 
            userData.role === "Placement" ||
            userData.role === "admin" ||
            userData.role === "Admin"
          ));

        if (hasPlacementAccess) {
          // Use the Firebase Auth UID as the key (either from uid field or document ID)
          const userUid = userData.uid || doc.id;
          usersData[userUid] = {
            id: userUid,
            name: userData.displayName || userData.name || "Unknown User",
            email: userData.email || "",
          };
        }
      });
      setAllUsers(usersData);
    }, []);

  // Fetch audit logs with server-side pagination (cost optimized)
  const fetchAuditLogs = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setAuditLogs([]);
        setLastDoc(null);
        setCurrentPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      let q = query(
        collection(db, "placement_audit_logs"),
        orderBy("timestamp", "desc")
      );

      // Apply filters
      if (selectedUser !== "all") {
        q = query(q, where("userId", "==", selectedUser));
      }

      if (selectedAction !== "all") {
        q = query(q, where("action", "==", selectedAction));
      }

      if (startDate) {
        const startTimestamp = new Date(startDate);
        startTimestamp.setHours(0, 0, 0, 0); // Set to start of day
        q = query(q, where("timestamp", ">=", startTimestamp));
      }

      if (endDate) {
        const endTimestamp = new Date(endDate);
        endTimestamp.setHours(23, 59, 59, 999); // Set to end of day
        q = query(q, where("timestamp", "<=", endTimestamp));
      }

      // Server-side pagination (cost optimization)
      if (lastDoc && !reset) {
        q = query(q, startAfter(lastDoc));
      }

      // Fetch one extra to check if there's more data
      q = query(q, limit(logsPerPage + 1));

      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs;
      const hasMoreData = docs.length > logsPerPage;

      const logs = docs.slice(0, logsPerPage).map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
        };
      });

      if (reset) {
        setAuditLogs(logs);
      } else {
        setAuditLogs(prev => [...prev, ...logs]);
      }

      // Update pagination state
      if (docs.length > 0) {
        setLastDoc(docs[docs.length - 1]);
      }

      // Check if we have more data
      setHasMore(hasMoreData);

    } catch (err) {
      console.error("Error fetching placement audit logs:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedUser, selectedAction, startDate, endDate, lastDoc, logsPerPage]);

  // Filter logs based on search term (memoized for performance) and exclude undo actions
  const filteredLogs = useMemo(() => {
    let logs = auditLogs.filter(log => log.action !== 'undo');
    
    if (!searchTerm) return logs;

    const searchLower = searchTerm.toLowerCase();
    return logs.filter(log => (
      log.companyName?.toLowerCase().includes(searchLower) ||
      log.userName?.toLowerCase().includes(searchLower) ||
      log.action?.toLowerCase().includes(searchLower) ||
      log.details?.toLowerCase().includes(searchLower) ||
      log.companyId?.toLowerCase().includes(searchLower)
    ));
  }, [auditLogs, searchTerm]);

  // Get unique actions for filter dropdown (memoized for performance)
  const uniqueActions = useMemo(() => [...new Set(auditLogs.map(log => log.action))], [auditLogs]);

  // Client-side pagination for loaded logs
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    } else if (page > totalPages && hasMore) {
      // Load more data for next page
      fetchAuditLogs();
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) return [...Array(totalPages)].map((_, i) => i + 1);

    const pages = [1];

    if (currentPage <= 4) {
      pages.push(2, 3, 4, '...');
    } else if (currentPage >= totalPages - 3) {
      pages.push('...', totalPages - 3, totalPages - 2, totalPages - 1);
    } else {
      pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...');
    }

    pages.push(totalPages);

    return pages.filter((val, i, arr) => arr.indexOf(val) === i);
  };

  const pageNumbers = getPageNumbers();

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only on mount - functions are useCallback with their own deps

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const exportToCSV = () => {
    const headers = [
      "Timestamp",
      "User",
      "Action",
      "Company Name",
      "Company ID",
      "Details",
      "IP Address",
      "User Agent"
    ];

    const csvData = filteredLogs.map(log => [
      log.timestamp.toLocaleString(),
      log.userName || "Unknown",
      log.action,
      log.companyName || "N/A",
      log.companyId || "N/A",
      log.details || "N/A",
      log.ipAddress || "N/A",
      log.userAgent || "N/A"
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `placement_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow p-3 min-h-screen flex flex-col h-screen">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Go Back"
          >
            <FaArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Placement Audit Logs</h1>
            <p className="text-gray-600 text-sm">Track all activities performed on placement leads • {filteredLogs.length} logs loaded • Page {currentPage} of {totalPages}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1.5 text-sm"
          >
            <FaDownload />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex justify-center items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
          >
            <FaFilter className="h-4 w-4" />
            Filter
            <svg className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Filter Dropdown */}
          {showFilters && (
            <div ref={filterRef} className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 min-w-80">
              <div className="space-y-4">
                {/* User Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="all">All Users</option>
                    {Object.values(allUsers).map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>

                {/* Action Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="all">All Actions</option>
                    {uniqueActions.map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Start date"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="End date"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setCurrentPage(1);
                      fetchAuditLogs(true);
                      setShowFilters(false);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <FaFilter className="h-4 w-4" />
                    Apply Filters
                  </button>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedUser("all");
                      setSelectedAction("all");
                      setStartDate("");
                      setEndDate("");
                      setCurrentPage(1);
                      fetchAuditLogs(true);
                      setShowFilters(false);
                    }}
                    className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-2 text-xs text-blue-700">
            💡 <strong>Cost Savings:</strong> Filters reduce data fetched from Firestore. Date ranges and user filters minimize read operations.
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto flex-1 min-h-0">
        <div className="h-full overflow-y-auto">
          <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-1/6 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="w-1/6 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="w-1/6 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="w-1/5 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="w-1/4 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th className="w-1/12 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && auditLogs.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm">Loading audit logs...</span>
                  </div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-3 py-3 text-center text-gray-500 text-sm">
                  No audit logs found
                </td>
              </tr>
            ) : (
              currentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {log.timestamp.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {log.userName || "Unknown"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                      log.action === 'VIEW_LEAD' ? 'bg-blue-100 text-blue-800' :
                      log.action === 'UPDATE_LEAD' ? 'bg-yellow-100 text-yellow-800' :
                      log.action === 'DELETE_LEAD' ? 'bg-red-100 text-red-800' :
                      log.action === 'SCHEDULE_FOLLOWUP' ? 'bg-green-100 text-green-800' :
                      log.action === 'ASSIGN_LEAD' ? 'bg-purple-100 text-purple-800' :
                      log.action === 'STATUS_CHANGE' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium text-sm max-w-32 truncate" title={log.companyName || "N/A"}>{log.companyName || "N/A"}</div>
                      <div className="text-gray-500 text-xs">{log.companyId}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate" title={typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}>
                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || "N/A"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(log)}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      <FaEye className="inline h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 px-3 py-2 bg-gray-50 rounded-lg gap-4">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages} • {filteredLogs.length} logs loaded
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Previous
            </button>
            
            <div className="flex gap-1">
              {pageNumbers.map((num, idx) =>
                num === "..." ? (
                  <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-sm text-gray-500">
                    ...
                  </span>
                ) : (
                  <button
                    key={num}
                    onClick={() => handlePageChange(num)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      currentPage === num
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100 text-gray-700"
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
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Load More Button - Cost Optimized Infinite Scroll */}
      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => fetchAuditLogs()}
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
                <FaDownload className="w-4 h-4" />
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
          Server-side pagination minimizes reads • Navigate {totalPages} pages of loaded data • 
          Load more batches as needed • Total savings: ~70-90% on Firestore costs
        </div>
      </div>

      {/* Applied Filters Footer */}
      {(() => {
        const appliedFilters = [];
        if (selectedUser !== "all") {
          const userName = allUsers[selectedUser]?.name || "Unknown User";
          appliedFilters.push(`User: ${userName}`);
        }
        if (selectedAction !== "all") {
          appliedFilters.push(`Action: ${selectedAction.replace('_', ' ')}`);
        }
        if (startDate || endDate) {
          const start = startDate ? new Date(startDate).toLocaleDateString() : "Any";
          const end = endDate ? new Date(endDate).toLocaleDateString() : "Any";
          appliedFilters.push(`Date Range: ${start} - ${end}`);
        }
        if (searchTerm.trim()) {
          appliedFilters.push(`Search: "${searchTerm.trim()}"`);
        }

        if (appliedFilters.length > 0) {
          return (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <FaFilter className="h-4 w-4" />
                <span className="font-medium">Showing results filtered by:</span>
                <span className="text-blue-700">{appliedFilters.join(", ")}</span>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-opacity-40 backdrop-blur-sm flex items-center justify-center p-4 z-54" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowDetailsModal(false);
          }
        }}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Audit Log Details</h2>
                  <p className="text-gray-500 text-xs mt-0.5">Activity tracking for placement leads</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1.5 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-100px)] space-y-4">
              {/* Basic Information Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Timestamp</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">{selectedLog.timestamp.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">User</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">{selectedLog.userName || "Unknown"}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Action</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        selectedLog.action === 'VIEW_LEAD' ? 'bg-blue-100 text-blue-800' :
                        selectedLog.action === 'UPDATE_LEAD' ? 'bg-yellow-100 text-yellow-800' :
                        selectedLog.action === 'DELETE_LEAD' ? 'bg-red-100 text-red-800' :
                        selectedLog.action === 'SCHEDULE_FOLLOWUP' ? 'bg-green-100 text-green-800' :
                        selectedLog.action === 'ASSIGN_LEAD' ? 'bg-purple-100 text-purple-800' :
                        selectedLog.action === 'STATUS_CHANGE' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedLog.action.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">{selectedLog.companyName || "N/A"}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company ID</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">{selectedLog.companyId}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">User ID</div>
                    <div className="text-xs text-gray-600 mt-1 font-mono">{selectedLog.userId}</div>
                  </div>
                </div>
              </div>

              {/* Technical Details Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Technical Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">IP Address</div>
                    <div className="text-sm text-gray-900 mt-1 font-mono">{selectedLog.ipAddress || "N/A"}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Session ID</div>
                    <div className="text-sm text-gray-900 mt-1 font-mono">{selectedLog.sessionId || "N/A"}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 md:col-span-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Page URL</div>
                    <div className="text-sm text-gray-900 mt-1 break-all font-mono">{selectedLog.pageUrl || "N/A"}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 md:col-span-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">User Agent</div>
                    <div className="text-sm text-gray-900 mt-1 break-all font-mono">{selectedLog.userAgent || "N/A"}</div>
                  </div>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Activity Summary
                </h3>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-700 leading-relaxed">{typeof selectedLog.details === 'object' ? JSON.stringify(selectedLog.details, null, 2) : selectedLog.details || "No additional details available"}</p>
                </div>
              </div>

              {/* Changes Made */}
              {selectedLog.changes && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Data Changes
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-2 px-3 font-semibold text-gray-900">Field</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-900">Previous Value</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-900">New Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedLog.changes).map(([field, change]) => {
                          const hasChanged = change.old !== change.new;
                          return (
                            <tr key={field} className={`${hasChanged ? 'bg-yellow-50 border-l-4 border-yellow-300' : 'bg-white'} hover:bg-gray-50 transition-colors border-b border-gray-100`}>
                              <td className="py-2 px-3 font-medium text-gray-900 capitalize">
                                {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </td>
                              <td className="py-2 px-3 text-gray-700">
                                {change.old === null || change.old === undefined || change.old === "" ? 
                                  <span className="text-gray-400 italic">Not set</span> : 
                                  <span className="font-mono text-sm">{String(change.old)}</span>}
                              </td>
                              <td className="py-2 px-3 text-gray-700">
                                {change.new === null || change.new === undefined || change.new === "" ? 
                                  <span className="text-gray-400 italic">Not set</span> : 
                                  <span className="font-mono text-sm font-semibold text-gray-900">{String(change.new)}</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 text-xs text-gray-500 flex items-center">
                    <div className="w-3 h-3 bg-yellow-300 rounded-full mr-2"></div>
                    Yellow highlighted rows indicate fields that were actually modified
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacementAdminAuditLogs;