import React from "react";
import { FaEllipsisV, FaTimes } from "react-icons/fa";

const statusColorMap = {
  hot: "text-red-600 hover:bg-red-50",
  warm: "text-orange-600 hover:bg-orange-50",
  cold: "text-blue-600 hover:bg-blue-50",
  onboarded: "text-green-600 hover:bg-green-50",
};

const borderColorMap = {
  hot: "border-l-4 border-red-500",
  warm: "border-l-4 border-orange-500",
  cold: "border-l-4 border-blue-500",
  onboarded: "border-l-4 border-green-600",
};

function LeadsTable({
  leads,
  activeTab,
  searchTerm,
  onLeadClick,
  showActionMenu,
  onToggleActionMenu,
  onStatusChange,
}) {
  return (
    <div className="mt-2 space-y-2 relative z-0">
      {leads.length > 0 ? (
        leads.map((lead) => (
          <div
            key={lead.id}
            className={`relative group cursor-pointer rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-300 ${borderColorMap[lead.status] || "border-l-4 border-gray-300"}`}
            onClick={() => onLeadClick(lead)}
          >
            {/* Row grid */}
            <div className="grid grid-cols-5 gap-4 p-4 items-center">
              <div className="text-sm text-gray-700 font-semibold truncate flex items-center">
                {lead.companyName || "N/A"}
              </div>

              <div className="text-sm text-gray-700 truncate flex flex-col justify-center">
                <span className="font-medium">{lead.pocName || "N/A"}</span>
                <span className="text-xs text-gray-500">
                  {lead.pocMail || "No email"}
                </span>
              </div>

              <div className="text-sm text-gray-700 truncate flex items-center">
                {lead.pocLocation || "N/A"}
              </div>

              <div className="text-sm text-gray-700 truncate flex items-center">
                {lead.pocPhone || "N/A"}
              </div>

              {/* Action Button + Dropdown wrapper */}
              <div className="flex justify-center items-center gap-1 relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleActionMenu(lead.id, e);
                  }}
                  className={`text-gray-500 hover:text-gray-700 focus:outline-none transition p-2 rounded-full hover:bg-gray-100 ${
                    showActionMenu === lead.id
                      ? "bg-gray-200 text-gray-900 shadow-inner"
                      : ""
                  }`}
                  aria-expanded={showActionMenu === lead.id}
                  aria-haspopup="true"
                >
                  {showActionMenu === lead.id ? (
                    <FaTimes size={16} />
                  ) : (
                    <FaEllipsisV size={16} />
                  )}
                </button>

                {/* ✅ Dropdown menu - positioned directly below the button */}
                {showActionMenu === lead.id && (
                  <div
                    className="absolute top-[110%] right-0 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[9999]"
                  >
                    <div className="py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLeadClick(lead);
                          onToggleActionMenu(null, e);
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
                            }}
                            className={`block w-full text-left px-4 py-2 text-sm transition ${statusColorMap[status]}`}
                          >
                            Mark as {status}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
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
      )}
    </div>
  );
}

export default LeadsTable;
