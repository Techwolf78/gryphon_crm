import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { FiAlertCircle, FiClock, FiUser, FiActivity, FiGlobe } from "react-icons/fi";
import { motion } from "framer-motion";
import PropTypes from "prop-types";

const AuditLogs = ({ logs, className = "" }) => {
  const logsPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB - dateA;
    });
  }, [logs]);

  const totalPages = Math.ceil(sortedLogs.length / logsPerPage);

  const currentLogs = useMemo(() => {
    const start = (currentPage - 1) * logsPerPage;
    return sortedLogs.slice(start, start + logsPerPage);
  }, [currentPage, sortedLogs]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
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
    switch (action) {
      case 'Logged in':
        return <FiActivity className="text-green-500" />;
      case 'User created':
        return <FiUser className="text-blue-500" />;
      default:
        return <FiActivity className="text-blue-500" />;
    }
  };

  return (
    <motion.section
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-labelledby="audit-logs-title"
    >
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 id="audit-logs-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiClock className="text-blue-500" />
              Audit Logs
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Recent system activities and events
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Time</th>
                  <th className="px-6 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentLogs.length > 0 ? (
                  currentLogs.map((log) => {
                    const dateObj = log.date?.toDate ? log.date.toDate() : new Date(log.date);
                    const dateFormatted = format(dateObj, "MMM dd, yyyy");
                    const timeFormatted = format(dateObj, "hh:mm a");

                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span>{log.action}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{log.user}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{dateFormatted}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{timeFormatted}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-gray-500">
                            <FiGlobe className="w-4 h-4" />
                            {log.ip || "—"}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <FiAlertCircle className="w-8 h-8 mb-2" />
                        <p>No audit logs found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {pageNumbers.map((num, idx) =>
                num === "..." ? (
                  <span key={`ellipsis-${idx}`} className="w-10 h-10 flex items-center justify-center">
                    ...
                  </span>
                ) : (
                  <button
                    key={num}
                    onClick={() => handlePageChange(num)}
                    className={`w-10 h-10 text-sm rounded-lg ${
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
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </motion.section>
  );
};

AuditLogs.propTypes = {
  logs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      action: PropTypes.string.isRequired,
      user: PropTypes.string.isRequired,
      date: PropTypes.oneOfType([
        PropTypes.instanceOf(Date),
        PropTypes.object, // for Firestore Timestamp
        PropTypes.string
      ]),
      ip: PropTypes.string
    })
  ).isRequired,
  className: PropTypes.string
};

AuditLogs.defaultProps = {
  logs: [],
  className: ""
};

export default AuditLogs;