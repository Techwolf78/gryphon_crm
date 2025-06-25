import React, { useState } from "react";
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

// Helpers
function formatDate(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString();
}

function getLatestFollowup(lead) {
  if (!lead.followups || lead.followups.length === 0) return "-";
  return lead.followups[lead.followups.length - 1].note || "-";
}

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
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState(null);

  const gridColumns = "grid grid-cols-11 gap-4";

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

        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No leads found
        </h3>
        <p className="mt-1 text-gray-500">
          Get started by adding a new college
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Add College
        </button>
      </div>
    );
  }

  const getLatestFollowup = (lead) => {
    const followData = lead.followup || {};
    const entries = Object.entries(followData).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );
    if (entries.length === 0) return "-";
    const latest = entries[entries.length - 1][1];
    return `${latest.date || "-"} ${latest.time || ""} - ${
      latest.remarks || ""
    }`;
  };

  const formatDate = (ms) =>
    new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <>
      <div className="overflow-x-auto md:overflow-visible">
        <div className="w-auto space-y-3">
          {/* Header */}
          <div
            className={`${gridColumns} ${headerColorMap[activeTab]} text-sm font-medium px-5 py-2 rounded-xl mb-3`}
          >
            <div className="break-words">
              College
              <br />
              Name
            </div>
            <div className="break-words">City</div>
            <div className="break-words">
              Contact
              <br />
              Name
            </div>
            <div className="break-words">
              Phone
              <br />
              No.
            </div>
            <div className="break-words">
              Email
              <br />
              ID
            </div>
            <div className="break-words">TCV</div>
            <div className="break-words">
              Opened
              <br />
              Date
            </div>
            <div className="break-words">
              Expected
              <br />
              Closure
            </div>
            <div className="break-words">
              Follow-
              <br />
              Ups
            </div>
            <div className="break-words">
              Assigned
              <br />
              To
            </div>
            <div className="text-center break-words">Actions</div>
          </div>

          {/* Rows */}
          <div className="space-y-3">
            {filteredLeads.map(([id, lead]) => (
              <div
                key={id}
                className="relative group cursor-pointer"
                onClick={() => setSelectedLeadForDetails(lead)}
              >
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
                    "openedDate",
                    "expectedClosureDate",
                  ].map((field, i) => (
                    <div
                      key={i}
                      className="text-sm text-gray-700 break-words whitespace-normal"
                    >
                      {(field === "openedDate" ||
                        field === "expectedClosureDate") &&
                      (lead[field] ||
                        (field === "openedDate" && lead.createdAt))
                        ? formatDate(
                            field === "openedDate"
                              ? lead.openedDate || lead.createdAt
                              : lead[field]
                          )
                        : lead[field] || "-"}
                    </div>
                  ))}

                  <div className="text-sm text-gray-700 break-words whitespace-normal">
                    {getLatestFollowup(lead)}
                  </div>

                  <div className="text-sm text-gray-700 break-words whitespace-normal">
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
                        dropdownOpenId === id
                          ? "bg-gray-200 text-gray-900 shadow-inner"
                          : ""
                      }`}
                      aria-expanded={dropdownOpenId === id}
                      aria-haspopup="true"
                      aria-label={
                        dropdownOpenId === id
                          ? "Close actions menu"
                          : "Open actions menu"
                      }
                    >
                      {dropdownOpenId === id ? (
                        <FaTimes size={16} />
                      ) : (
                        <FaEllipsisV size={16} />
                      )}
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

      {selectedLeadForDetails && (
        <div
          className="fixed inset-0 bg-opacity-50 backdrop-blur-md flex items-center justify-center z-54 transition-opacity duration-300"
          onClick={() => setSelectedLeadForDetails(null)}
        >
          <div
            className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 p-8 transform transition-transform duration-300 "
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-semibold mb-6 border-b border-gray-200 pb-2">
              Lead Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 mb-6">
              <div>
                <p className="font-medium">College Name:</p>
                <p className="mt-1">{selectedLeadForDetails.businessName}</p>
              </div>
              <div>
                <p className="font-medium">City:</p>
                <p className="mt-1">{selectedLeadForDetails.city}</p>
              </div>
              <div>
                <p className="font-medium">Contact:</p>
                <p className="mt-1">{selectedLeadForDetails.pocName}</p>
              </div>
              <div>
                <p className="font-medium">Phone:</p>
                <p className="mt-1">{selectedLeadForDetails.phoneNo}</p>
              </div>
              <div>
                <p className="font-medium">Email:</p>
                <p className="mt-1">{selectedLeadForDetails.email}</p>
              </div>
              <div>
                <p className="font-medium">TCV:</p>
                <p className="mt-1">{selectedLeadForDetails.tcv}</p>
              </div>
              <div>
                <p className="font-medium">Opened Date:</p>
                <p className="mt-1">
                  {formatDate(
                    selectedLeadForDetails.openedDate ||
                      selectedLeadForDetails.createdAt
                  )}
                </p>
              </div>
              <div>
                <p className="font-medium">Expected Closure:</p>
                <p className="mt-1">
                  {formatDate(selectedLeadForDetails.expectedClosureDate)}
                </p>
              </div>
              {/* Assigned To Section */}
              <div>
                <p className="font-medium mb-1">Assigned To:</p>
                <p className="mt-1">
                  {selectedLeadForDetails.assignedTo?.uid &&
                  users[selectedLeadForDetails.assignedTo.uid]
                    ? users[selectedLeadForDetails.assignedTo.uid].name
                    : selectedLeadForDetails.assignedTo?.name || "-"}
                </p>
              </div>
              {/* Latest Followup */}
              <div>
                <p className="font-medium mb-1">Latest Followup:</p>
                <p className="mt-1">
                  {getLatestFollowup(selectedLeadForDetails)}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded transition duration-200 shadow-md"
                onClick={() => setSelectedLeadForDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}