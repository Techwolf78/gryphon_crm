import React, { useState, useEffect, useCallback } from "react";
import { FaEllipsisV } from "react-icons/fa";

const statusColorMap = {
  hot: "text-red-600 hover:bg-red-50",
  warm: "text-orange-600 hover:bg-orange-50",
  cold: "text-blue-600 hover:bg-blue-50",
  called: "text-purple-600 hover:bg-purple-50",
  onboarded: "text-green-600 hover:bg-green-50",
};

function LeadsTable({
  leads,
  onLeadClick,
  onStatusChange,
  onScheduleMeeting,
  onDeleteLead,
  currentUserId,
  currentUser,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100; // Show 100 items per page for better performance

  // Function to get initials from display name
  const getInitials = (assignedTo, currentUserId, currentUser) => {
    if (!assignedTo) return 'UN'; // Unassigned
    
    if (assignedTo === currentUserId) {
      // For current user, try to get initials from display name
      if (currentUser?.displayName) {
        const names = currentUser.displayName.trim().split(' ');
        if (names.length >= 2) {
          return (names[0][0] + names[names.length - 1][0]).toUpperCase();
        } else if (names.length === 1) {
          return names[0].substring(0, 2).toUpperCase();
        }
      }
      return 'ME'; // Fallback to ME if no display name
    }
    
    // For other users, show "OT" (Other) since we don't have their display names
    return 'OT';
  };

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
    <div className="mt-2 h-screen flex flex-col">
      {/* Table Container with Fixed Height */}
      <div className="flex-1 overflow-hidden border border-gray-300 rounded-lg">
        <div className="h-full overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-linear-to-r from-blue-500 via-indigo-600 to-indigo-700 text-white sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 min-w-[150px]">
                  Company Name
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 min-w-[120px]">
                  Contact Person
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 min-w-[120px]">
                  Designation
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 min-w-[120px]">
                  Contact Details
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 min-w-[150px]">
                  email ID
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-20">
                  LinkedIn Profile
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-12">
                  ASSGN
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-16">
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
                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[150px]">
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
                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                    {lead.pocName || "N/A"}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                    {lead.pocDesignation || "N/A"}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                    {lead.pocPhone || "N/A"}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[150px]">
                    {lead.pocMail || "N/A"}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate w-20">
                    {lead.pocLinkedin ? (
                      <a
                        href={lead.pocLinkedin.startsWith('http') ? lead.pocLinkedin : `https://${lead.pocLinkedin}`}
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
                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 text-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                      {getInitials(lead.assignedTo, currentUserId, currentUser)}
                    </span>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500 relative border border-gray-300">
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
                          className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl shadow-2xl backdrop-blur-xl bg-white/90 border border-white/20 overflow-hidden"
                          style={{
                            boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.15), 0px 0px 0px 1px rgba(255, 255, 255, 0.05), inset 0px 1px 0px rgba(255, 255, 255, 0.1)'
                          }}
                          data-dropdown-container
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="py-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onScheduleMeeting(lead);
                                closeDropdown();
                              }}
                              className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50/80 hover:text-blue-700 transition-all duration-200 group"
                            >
                              <svg className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Schedule Meeting
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLeadClick(lead);
                                closeDropdown();
                              }}
                              className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50/80 hover:text-purple-700 transition-all duration-200 group"
                            >
                              <svg className="w-4 h-4 mr-3 text-gray-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View/Edit
                            </button>

                            <div className="border-t border-gray-200/50 my-2 mx-2"></div>

                            <div className="px-2 py-1">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Change Status</p>
                              {["called", "hot", "warm", "cold", "onboarded"]
                                .filter((status) => status !== lead.status)
                                .map((status) => (
                                  <button
                                    key={status}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onStatusChange(lead.id, status);
                                      closeDropdown();
                                    }}
                                    className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-lg mb-1 transition-all duration-200 ${statusColorMap[status]} hover:shadow-sm`}
                                  >
                                    <div className={`w-2 h-2 rounded-full mr-3 ${
                                      status === 'hot' ? 'bg-red-500' :
                                      status === 'warm' ? 'bg-orange-500' :
                                      status === 'cold' ? 'bg-blue-500' :
                                      status === 'called' ? 'bg-purple-500' :
                                      'bg-green-500'
                                    }`}></div>
                                    Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </button>
                                ))}
                            </div>

                            <div className="border-t border-gray-200/50 my-2 mx-2"></div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteLead(lead.id);
                                closeDropdown();
                              }}
                              className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/80 hover:text-red-700 transition-all duration-200 group"
                            >
                              <svg className="w-4 h-4 mr-3 text-red-400 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete Lead
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
      </div>

      {/* Pagination Controls - Fixed at bottom */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-4 py-3 bg-gray-50 rounded-lg shrink-0">
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