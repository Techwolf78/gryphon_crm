// DropdownActions.jsx
import React, { useState } from "react";
import {
  FaPhone,
  FaCalendarCheck,
  FaEdit,
  FaArrowRight,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";

const dummyUsers = [
  { id: "u1", name: "Ravi" },
  { id: "u2", name: "Anita" },
  { id: "u3", name: "John" },
];

export default function DropdownActions({
  leadId,
  leadData,
  closeDropdown,
  setSelectedLead,
  setShowFollowUpModal,
  setShowDetailsModal,
  setShowClosureModal,
  updateLeadPhase,
  activeTab,
  dropdownRef,
}) {
  const [assignHovered, setAssignHovered] = useState(false);

  return (
    <div 
     ref={dropdownRef} // 👈 Attach ref to the wrapper
    className="absolute z-50 bg-white rounded-xl shadow-xl w-48 overflow-visible -right-4 top-full mt-1 animate-fadeIn">
      <div className="py-1 relative">
        <a
          href={`tel:${leadData.phoneNo}`}
          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
        >
          <FaPhone className="text-blue-500 mr-3" />
          Call
        </a>
        <button
          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
          onClick={() => {
            setSelectedLead({ ...leadData, id: leadId });
            setShowFollowUpModal(true);
            closeDropdown();
          }}
        >
          <FaCalendarCheck className="text-purple-500 mr-3" />
          Follow Up
        </button>
        <button
          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLead({ ...leadData, id: leadId });
            setShowDetailsModal(true);
            closeDropdown();
          }}
        >
          <FaEdit className="text-indigo-500 mr-3" />
          Edit
        </button>

        {/* Assign hover menu */}
        <div
          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition relative group cursor-pointer"
          onMouseEnter={() => setAssignHovered(true)}
          onMouseLeave={() => setAssignHovered(false)}
        >
          <FaArrowRight className="text-indigo-500 mr-3" />
          Assign
          {assignHovered && (
            <div className="absolute right-full top-0 ml-2 w-40 bg-white border rounded-lg shadow-lg z-50 p-2 animate-fadeIn">
              {dummyUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    console.log("Assigned to:", user.name);
                    setAssignHovered(false);
                    closeDropdown();
                  }}
                  className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  {user.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Move to
        </div>
        {["hot", "warm", "cold", "renewal"]
          .filter((phase) => phase !== activeTab)
          .map((phase) => (
            <button
              key={phase}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
              onClick={async () => {
                await updateLeadPhase(leadId, phase);
                closeDropdown();
              }}
            >
              <FaArrowRight
                className={`${
                  phase === "hot"
                    ? "text-red-500"
                    : phase === "warm"
                    ? "text-amber-500"
                    : phase === "cold"
                    ? "text-emerald-500"
                    : "text-blue-500"
                } mr-3`}
              />
              {phase.charAt(0).toUpperCase() + phase.slice(1)}
            </button>
          ))}
        <button
          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100 mt-1 transition"
          onClick={() => {
            setSelectedLead(leadData);
            setShowClosureModal(true);
            closeDropdown();
          }}
        >
          <FaCheckCircle className="text-green-500 mr-3" />
          Closure
        </button>
      </div>
    </div>
  );
}
