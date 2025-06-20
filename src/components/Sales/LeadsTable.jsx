// components/Sales/LeadsTable.jsx
import React, { useRef } from "react";
import { FaEllipsisV, FaTimes } from "react-icons/fa";
import DropdownActions from "./DropdownAction";
import ClosedLeads from "./ClosedLeads";

const LeadsTable = ({
  activeTab,
  tabLabels,
  tabColorMap,
  headerColorMap,
  borderColorMap,
  leads,
  users,
  loading,
  currentUser,
  filteredLeads,
  formatDate,
  getLatestFollowup,
  dropdownOpenId,
  toggleDropdown,
  setDropdownOpenId,
  setShowDetailsModal,
  setShowFollowUpModal,
  setShowClosureModal,
  updateLeadPhase,
  setSelectedLead,
  setShowModal,
}) => {
  const gridColumns = "grid grid-cols-9 gap-4";
  const dropdownRef = useRef(null);

  return (
    <div className="overflow-x-auto md:overflow-visible">
      <div className="w-auto space-y-3">
        {/* Grid Header */}
        <div
          className={`${gridColumns} ${headerColorMap[activeTab]} text-sm font-medium px-5 py-4 rounded-xl mb-3`}
        >
          <div className="font-semibold">College Name</div>
          <div className="font-semibold">City</div>
          <div className="font-semibold">Contact Name</div>
          <div className="font-semibold">Phone No.</div>
          <div className="font-semibold">Email ID</div>
          <div className="font-semibold">Opened Date</div>
          <div className="font-semibold">Follow-Ups</div>
          <div className="font-semibold">Assigned To</div>
          <div className="font-semibold text-center">Actions</div>
        </div>

        {/* Grid Rows */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : activeTab === "closed" ? (
            <ClosedLeads leads={leads} users={users} />
          ) : filteredLeads.length === 0 ? (
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
          ) : (
            filteredLeads.map(([id, lead]) => (
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
                    "createdAt",
                  ].map((field, i) => (
                    <div
                      key={i}
                      className="break-words whitespace-normal text-sm text-gray-700 min-w-0"
                    >
                      {field === "createdAt"
                        ? formatDate(lead[field])
                        : lead[field] || "-"}
                    </div>
                  ))}
                  <div className="break-words whitespace-normal text-sm text-gray-700 min-w-0">
                    {getLatestFollowup(lead)}
                  </div>
                  <div className="break-words whitespace-normal text-sm text-gray-700 min-w-0">
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
                        <FaTimes
                          size={16}
                          className="text-gray-900 transition-transform"
                        />
                      ) : (
                        <FaEllipsisV
                          size={16}
                          className="text-gray-500 hover:text-gray-700 transition"
                        />
                      )}
                    </button>
                  </div>
                </div>
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
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadsTable;
