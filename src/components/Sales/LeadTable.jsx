import React, { useState, useMemo, useCallback } from "react";
import { FaEllipsisV, FaTimes } from "react-icons/fa";
import DropdownActions from "./DropdownAction";
import ClosedLeads from "../Sales/Closed/ClosedLeads";
import LeadDetailsModal from "./LeadDetailsModal";

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
  gridColumns,
  onClosedLeadsCountChange, // Add this prop
}) {
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState(null);
  const [visibleLeadsCount, setVisibleLeadsCount] = useState(10);

  const handleLoadMore = useCallback(() => {
    setVisibleLeadsCount((prev) => prev + 20);
  }, []);

  // Sort leads by openedDate (newest first)
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort(([, a], [, b]) => {
      const dateA = a.openedDate || a.createdAt;
      const dateB = b.openedDate || b.createdAt;
      return (dateB || 0) - (dateA || 0);
    });
  }, [filteredLeads]);

  // Get visible leads based on count
  const visibleLeads = useMemo(() => {
    return sortedLeads.slice(0, visibleLeadsCount);
  }, [sortedLeads, visibleLeadsCount]);

  // Memoized lead details modal
  const leadDetailsModal = useMemo(
    () =>
      selectedLeadForDetails && (
        <LeadDetailsModal
          selectedLead={selectedLeadForDetails}
          onClose={() => setSelectedLeadForDetails(null)}
          users={users}
          activeTab={activeTab}
        />
      ),
    [selectedLeadForDetails, users, activeTab]
  );

  const formatDate = useCallback((dateValue) => {
    // If it's a Firestore Timestamp object
    if (dateValue && typeof dateValue.toDate === "function") {
      return dateValue.toDate().toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    // If it's a milliseconds number
    if (dateValue && typeof dateValue === "number") {
      return new Date(dateValue).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    return "-";
  }, []);

  // Get latest followup memoized
  const getLatestFollowup = useCallback((lead) => {
    const followData = lead.followup || {};
    const entries = Object.entries(followData).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );
    if (entries.length === 0) return "-";
    const latest = entries[entries.length - 1][1];
    return `${latest.date || "-"} ${latest.time || ""} - ${
      latest.remarks || ""
    }`;
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Closed leads tab
  if (activeTab === "closed") {
    return (
      <ClosedLeads
        leads={leads}
        users={users}
        viewMyLeadsOnly={viewMyLeadsOnly}
        currentUser={currentUser}
        onCountChange={onClosedLeadsCountChange} // Pass the callback
      />
    );
  }

  // Empty state
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

  return (
    <>
      <div className="min-h-screen flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div
          className={`${gridColumns} ${headerColorMap[activeTab]} text-sm font-medium px-5 py-2`}
        >
          <div className="break-words">
            College
            <br />
            Name
          </div>
          <div className="break-words">
            Course/
            <br />
            Year
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
          <div className="break-words">Meetings</div>
          <div className="break-words">
            Assigned
            <br />
            To
          </div>
          <div className="text-center break-words">Actions</div>
        </div>

        {/* Scrollable Body */}
        <div
          className="overflow-y-auto min-h-screen"
          style={{ maxHeight: "calc(100vh - 310px)" }}
        >
          {visibleLeads.length === 0 ? (
            <div className="bg-white p-8 text-center border-t border-gray-200">
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
            <div className="space-y-3 p-2">
              {visibleLeads.map(([id, lead]) => (
                <div
                  key={id}
                  className="relative group"
                  onClick={() => setSelectedLeadForDetails(lead)}
                >
                  <div
                    className={`${gridColumns} gap-4 px-5 py-4 ${borderColorMap[activeTab]} bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer`}
                  >
                    <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                      {lead.businessName || "-"}
                    </div>

                    {/* Replace the email cell with course/year */}
                    <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                      {lead.courses?.[0]?.courseType || "-"}{" "}
                      {lead.courses?.[0]?.year
                        ? `(${lead.courses?.[0]?.year})`
                        : ""}
                    </div>

                    <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                      {lead.city || "-"}
                    </div>

                    <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                      {lead.pocName || "-"}
                    </div>

                    <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                      {lead.phoneNo || "-"}
                    </div>

                    <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                      {lead.tcv || "-"}
                    </div>

                    <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                      {formatDate(lead.openedDate || lead.createdAt)}
                    </div>

                    <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                      {lead.expectedClosureDate
                        ? formatDate(lead.expectedClosureDate)
                        : "-"}
                    </div>

                    <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                      {getLatestFollowup(lead)}
                    </div>

                    <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                      {lead.assignedTo?.uid && users[lead.assignedTo.uid]?.name
                        ? users[lead.assignedTo.uid].name
                        : lead.assignedTo?.name || "-"}
                    </div>

                    <div className="flex justify-center items-center gap-2">
                      {lead.contactMethod && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                          {lead.contactMethod.toLowerCase()}
                        </span>
                      )}
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
                        data-tour="lead-actions"
                      >
                        {dropdownOpenId === id ? (
                          <FaTimes size={16} />
                        ) : (
                          <FaEllipsisV size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {dropdownOpenId === id && (
                    <DropdownActions
                      leadId={id}
                      leadData={lead} // This is correct
                      closeDropdown={() => setDropdownOpenId(null)}
                      setSelectedLead={setSelectedLead}
                      setShowFollowUpModal={setShowFollowUpModal}
                      setShowDetailsModal={setShowDetailsModal}
                      setShowClosureModal={setShowClosureModal}
                      updateLeadPhase={updateLeadPhase}
                      activeTab={activeTab}
                      dropdownRef={dropdownRef}
                      users={users}
                      currentUser={currentUser}
                      setShowExpectedDateModal={setShowExpectedDateModal}
                      setPendingPhaseChange={setPendingPhaseChange}
                      setLeadBeingUpdated={setLeadBeingUpdated}
                      isMyLead={lead.assignedTo?.uid === currentUser?.uid} // Changed from leadData to lead
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {visibleLeads.length < sortedLeads.length && (
            <div className="sticky bottom-0 bg-gray-50  flex justify-center">
              <button
                onClick={handleLoadMore}
                className="
        flex items-center justify-center 
        px-5 py-2 
        text-sm font-medium 
        text-blue-600 
        border border-blue-200 
        rounded-md 
        hover:bg-blue-50 
        transition-colors duration-200
        min-w-[160px]
      "
              >
                <span className="flex items-center gap-2">
                  Show more
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {leadDetailsModal}
    </>
  );
}
