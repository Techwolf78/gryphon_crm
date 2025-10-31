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
}) {
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, show: false, leadId: null });

  const handleActionClick = (leadId, e) => {
    e.stopPropagation();
    if (dropdownPosition.show && dropdownPosition.leadId === leadId) {
      closeDropdown();
      return;
    }
    const rect = e.target.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left - 176 + window.scrollX,
      show: true,
      leadId
    });
  };

  const closeDropdown = useCallback(() => {
    setDropdownPosition(prev => ({ ...prev, show: false }));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownPosition.show && !e.target.closest('.dropdown-button')) {
        closeDropdown();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownPosition.show, closeDropdown]);
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
        <thead className="bg-gradient-to-r from-blue-500 via-indigo-600 to-indigo-700 text-white">
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
          {leads.length > 0 ? (
            leads.map((lead) => (
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
                  <button
                    onClick={(e) => handleActionClick(lead.id, e)}
                    className="dropdown-button text-gray-500 hover:text-gray-700 focus:outline-none p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-expanded={dropdownPosition.show && dropdownPosition.leadId === lead.id}
                    aria-haspopup="true"
                  >
                    <FaEllipsisV size={16} />
                  </button>

                  {dropdownPosition.show && dropdownPosition.leadId === lead.id && (
                    <div
                      className="fixed w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
                      style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                    >
                      <div className="py-1">
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
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="7"
                className="px-6 py-4 text-center text-sm text-gray-500"
              >
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
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default LeadsTable;
