import React from "react";
import { DotsVerticalIcon } from "@heroicons/react/outline";

const LeadsTable = ({
  leads,
  activeTab,
  searchTerm,
  onLeadClick,
  showActionMenu,
  onToggleActionMenu,
  onStatusChange
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Company</th>
            <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Contact</th>
            <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Location</th>
            <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Phone No</th>
            <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr>
              <td colSpan="5" className="py-4 text-center text-gray-500">
                {searchTerm ? "No matching companies found" : `No ${activeTab} companies found`}
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onLeadClick(lead)}
              >
                <td className="py-3 px-4 border-b">
                  <div className="font-medium">{lead.companyName || 'N/A'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {lead.contacts.length > 0
                      ? `${lead.contacts.length} additional contact${lead.contacts.length > 1 ? 's' : ''}`
                      : 'No additional contacts'}
                  </div>
                </td>
                <td className="py-3 px-4 border-b">
                  {lead.pocName || 'N/A'} <br />
                  <span className="text-sm text-gray-500">{lead.pocMail || 'No email'}</span>
                </td>
                <td className="py-3 px-4 border-b">
                  {lead.pocLocation || 'N/A'}
                </td>
                <td className="py-3 px-4 border-b">
                  {lead.pocPhone || 'N/A'}
                </td>
                <td className="py-3 px-4 border-b relative">
                  <button
                    onClick={(e) => onToggleActionMenu(lead.id, e)}
                    className={`p-1 rounded-full hover:bg-gray-200 focus:outline-none transition ${
                      showActionMenu === lead.id
                        ? "bg-gray-200 text-gray-900 shadow-inner"
                        : ""
                    }`}
                    aria-label="Actions"
                  >
                    <DotsVerticalIcon className="h-5 w-5 text-gray-500" />
                  </button>

                  {showActionMenu === lead.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 ring-1 ring-black ring-opacity-5">
                      <div className="py-1">
                        {["hot", "warm", "cold", "onboarded"]
                          .filter(status => status !== lead.status)
                          .map((status) => (
                            <button
                              key={status}
                              onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange(lead.id, status);
                              }}
                              className={`block w-full text-left px-4 py-2 text-sm ${
                                status === 'hot' ? 'text-red-600' :
                                status === 'warm' ? 'text-orange-600' :
                                status === 'cold' ? 'text-blue-600' :
                                'text-green-600'
                              } hover:bg-gray-100 transition`}
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
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LeadsTable;