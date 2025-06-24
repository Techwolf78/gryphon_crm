import React from "react";
import { FaEllipsisV, FaTimes } from "react-icons/fa";
import DropdownActions from "./DropdownAction";
import ClosedLeads from "./ClosedLeads";

const borderColorMap = {
  hot: "border-l-4 border-red-500",
  warm: "border-l-4 border-amber-400",
  cold: "border-l-4 border-cyan-400",
  closed: "border-l-4 border-green-500",
};

const headerColorMap = {
  hot: "bg-red-50 text-red-800 border-b border-red-200",
  warm: "bg-amber-50 text-amber-800 border-b border-amber-200",
  cold: "bg-cyan-50 text-cyan-800 border-b border-cyan-200",
  closed: "bg-green-50 text-green-800 border-b border-green-200",
};

// 🔧 Helpers
function formatDate(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString();
}

function getLatestFollowup(lead) {
  if (!lead.followups || lead.followups.length === 0) return "-";
  return lead.followups[lead.followups.length - 1].note || "-";
}

// 🧩 Component
export default function LeadsTable({
  loading,
  activeTab,
  filteredLeads,
  leads,
  users,
  dropdownOpenId,
  setDropdownOpenId,
  toggleDropdown,
  setSelectedLead,
  setShowFollowUpModal,
  setShowDetailsModal,
  setShowClosureModal,
  updateLeadPhase,
  dropdownRef,
  setShowExpectedDateModal,
  setPendingPhaseChange,
  setLeadBeingUpdated,
  setShowModal,
  viewMyLeadsOnly,
  currentUser,
}) {
  const gridColumns = "grid grid-cols-11 gap-4"; // Define default layout

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (activeTab === "closed") {
    return (
      <ClosedLeads
        leads={leads}
        users={users}
        viewMyLeadsOnly={viewMyLeadsOnly}
        currentUser={currentUser}
      />
    );
  }

  if (filteredLeads.length === 0) {
    return (
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

        <h3 className="mt-4 text-lg font-medium text-gray-900">No leads found</h3>
        <p className="mt-1 text-gray-500">Get started by adding a new college</p>
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Add College
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto md:overflow-visible">
      <div className="w-auto space-y-3">
        {/* Header */}
        <div
          className={`${gridColumns} ${headerColorMap[activeTab]} text-sm font-medium px-5 py-4 rounded-xl mb-3`}
        >
          <div>College Name</div>
          <div>City</div>
          <div>Contact Name</div>
          <div>Phone No.</div>
          <div>Email ID</div>
          <div>TCV</div>
          <div>Opened Date</div>
          <div>Expected Closure</div>
          <div>Follow-Ups</div>
          <div>Assigned To</div>
          <div className="text-center">Actions</div>
        </div>

        {/* Rows */}
        <div className="space-y-3">
          {filteredLeads.map(([id, lead]) => (
            <div key={id} className="relative group cursor-pointer">
              <div
                className={`${gridColumns} gap-4 p-5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-300 ${borderColorMap[activeTab]}`}
              >
                {[
                  "businessName",
                  "city",
                  "pocName",
                  "phoneNo",
                  "email",
                  "tcv",
                  "createdAt",
                  "expectedClosureDate",
                ].map((field, i) => (
                  <div key={i} className="text-sm text-gray-700">
                    {(field === "createdAt" || field === "expectedClosureDate") && lead[field]
                      ? formatDate(lead[field])
                      : lead[field] || "-"}
                  </div>
                ))}

                <div className="text-sm text-gray-700 break-words whitespace-normal min-w-0">
                  {getLatestFollowup(lead)}
                </div>

                <div className="text-sm text-gray-700 break-words whitespace-normal min-w-0">
                  {lead.assignedTo?.uid && users[lead.assignedTo.uid]?.name
                    ? users[lead.assignedTo.uid].name
                    : lead.assignedTo?.name || "-"}
                </div>

                <div className="flex justify-center items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDropdown(id, e);
                    }}
                    className={`text-gray-500 hover:text-gray-700 focus:outline-none transition p-2 rounded-full hover:bg-gray-100 ${
                      dropdownOpenId === id ? "bg-gray-200 text-gray-900 shadow-inner" : ""
                    }`}
                    aria-expanded={dropdownOpenId === id}
                    aria-haspopup="true"
                    aria-label={dropdownOpenId === id ? "Close actions menu" : "Open actions menu"}
                  >
                    {dropdownOpenId === id ? <FaTimes size={16} /> : <FaEllipsisV size={16} />}
                  </button>
                </div>
              </div>

              {/* Dropdown Actions */}
              {dropdownOpenId === id && (
                <DropdownActions
                  leadId={id}
                  leadData={lead}
                  closeDropdown={() => setDropdownOpenId(null)}
                  setSelectedLead={setSelectedLead}
                  setShowFollowUpModal={setShowFollowUpModal}
                  setShowDetailsModal={setShowDetailsModal}
                  setShowClosureModal={setShowClosureModal}
                  updateLeadPhase={updateLeadPhase}
                  activeTab={activeTab}
                  dropdownRef={dropdownRef}
                  users={users}
                  setShowExpectedDateModal={setShowExpectedDateModal}
                  setPendingPhaseChange={setPendingPhaseChange}
                  setLeadBeingUpdated={setLeadBeingUpdated}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
