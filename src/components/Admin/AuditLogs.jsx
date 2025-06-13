// src/components/Admin/AuditLogs.jsx
import React, { useState, useMemo } from "react";
import { format } from "date-fns";

const AuditLogs = ({ logs }) => {
  const logsPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
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

    if (currentPage <= 2) {
      pages.push(2, 3, '...');
    } else if (currentPage >= totalPages - 1) {
      pages.push('...', totalPages - 2, totalPages - 1);
    } else {
      pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...');
    }

    pages.push(totalPages);

    return pages.filter((val, i, arr) => arr.indexOf(val) === i);
  };

  const pageNumbers = getPageNumbers();

  return (
    <section>
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Audit Logs</h2>
      <div className="overflow-x-auto rounded-lg shadow border bg-white">
        <table className="w-full text-left text-sm divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th className="p-3 whitespace-normal break-words font-medium text-gray-700">Date</th>
              <th className="p-3 whitespace-normal break-words font-medium text-gray-700">Time</th>
              <th className="p-3 whitespace-normal break-words font-medium text-gray-700">User</th>
              <th className="p-3 whitespace-normal break-words font-medium text-gray-700">Action</th>
              <th className="p-3 whitespace-normal break-words font-medium text-gray-700">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentLogs.length > 0 ? (
              currentLogs.map((log) => {
                const dateObj = new Date(log.date);
                const dateFormatted = format(dateObj, "yyyy-MM-dd");
                const timeFormatted = format(dateObj, "HH:mm:ss");

                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="p-3 whitespace-normal break-words">{dateFormatted}</td>
                    <td className="p-3 whitespace-normal break-words">{timeFormatted}</td>
                    <td className="p-3 whitespace-normal break-words">{log.user}</td>
                    <td className="p-3 whitespace-normal break-words">{log.action}</td>
                    <td className="p-3 whitespace-normal break-words">{log.ip || "—"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  No audit logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center space-x-2 mt-4"
          aria-label="Pagination"
        >
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prev
          </button>

          {pageNumbers.map((num, idx) =>
            num === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-500 select-none">
                ...
              </span>
            ) : (
              <button
                key={num}
                onClick={() => handlePageChange(num)}
                aria-current={currentPage === num ? "page" : undefined}
                className={`px-3 py-1 rounded border ${
                  currentPage === num
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 hover:bg-gray-100"
                }`}
              >
                {num}
              </button>
            )
          )}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
};

export default AuditLogs;
