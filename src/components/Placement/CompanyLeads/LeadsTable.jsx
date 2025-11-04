import React, { useState, useEffect, useCallback } from "react";
import { FaEllipsisV } from "react-icons/fa";

const statusColorMap = {
  hot: "text-red-600 hover:bg-red-50",
  warm: "text-orange-600 hover:bg-orange-50",
  cold: "text-blue-600 hover:bg-blue-50",
  onboarded: "text-green-600 hover:bg-green-50",
};

function LeadsTable({
  leads,
  onLeadClick,
  onStatusChange,
  onEditLead,
  onScheduleMeeting,
  onDeleteLead,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100; // Show 100 items per page for better performance

  const handleActionClick = (leadId, e) => {
    e.stopPropagation();
    setDropdownOpen(dropdownOpen === leadId ? null : leadId);
  };

  const closeDropdown = useCallback(() => {
    setDropdownOpen(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownOpen && !e.target.closest('.dropdown-container')) {
        closeDropdown();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen, closeDropdown]);

  // Calculate pagination
  const totalPages = Math.ceil(leads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = leads.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setDropdownOpen(null); // Close any open dropdowns
  };

  if (leads.length === 0) {
    return (
      <div className="mt-2">
        <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H3V7zm0 4h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No companies found
          </h3>
          <p className="mt-1 text-gray-500">Get started by adding a new lead</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {/* Table */}
      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-linear-to-r from-blue-500 via-indigo-600 to-indigo-700 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 min-w-[150px]">
                Company Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 min-w-[120px]">
                Contact Person
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 min-w-[120px]">
                Designation
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 min-w-[120px]">
                Contact Details
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 min-w-[150px]">
                email ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 min-w-[120px]">
                LinkedIn Profile
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentLeads.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onLeadClick(lead)}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[150px]">
                  {lead.companyWebsite ? (
                    <a
                      href={lead.companyWebsite.startsWith('http') ? lead.companyWebsite : `https://${lead.companyWebsite}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lead.companyName || "N/A"}
                    </a>
                  ) : (
                    lead.companyName || "N/A"
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                  {lead.pocName || "N/A"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                  {lead.pocDesignation || "N/A"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                  {lead.pocPhone || "N/A"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[150px]">
                  {lead.pocMail || "N/A"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                  {lead.pocLinkedin ? (
                    <a
                      href={lead.pocLinkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      LinkedIn
                    </a>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 relative border border-gray-300">
                  <div className="relative inline-block" data-dropdown-container>
                    <button
                      onClick={(e) => handleActionClick(lead.id, e)}
                      className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 rounded-full hover:bg-gray-100 transition-colors"
                      aria-expanded={dropdownOpen === lead.id}
                      aria-haspopup="true"
                      data-lead-id={lead.id}
                    >
                      <FaEllipsisV size={16} />
                    </button>

                    {/* Dropdown positioned relative to the button */}
                    {dropdownOpen === lead.id && (
                      <div
                        className="absolute right-0 top-full z-10 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                        style={{
                          boxShadow: '0px 20px 40px -10px rgba(0, 0, 0, 0.1), 0px 10px 20px -5px rgba(0, 0, 0, 0.05)'
                        }}
                        data-dropdown-container
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onScheduleMeeting(lead);
                              closeDropdown();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                          >
                            Meetings
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditLead(lead);
                              closeDropdown();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onLeadClick(lead);
                              closeDropdown();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                          >
                            View Details
                          </button>

                          {["hot", "warm", "cold", "onboarded"]
                            .filter((status) => status !== lead.status)
                            .map((status) => (
                              <button
                                key={status}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStatusChange(lead.id, status);
                                  closeDropdown();
                                }}
                                className={`block w-full text-left px-4 py-2 text-sm transition ${statusColorMap[status]}`}
                              >
                                Mark as {status}
                              </button>
                            ))}

                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLead(lead.id);
                              closeDropdown();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-4 py-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1}-{Math.min(endIndex, leads.length)} of {leads.length} companies
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadsTable;