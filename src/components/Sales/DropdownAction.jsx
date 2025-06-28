import React, { useState } from "react";
import {
  FaPhone,
  FaCalendarCheck,
  FaEdit,
  FaArrowRight,
  FaCheckCircle,
} from "react-icons/fa";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase"; // adjust path if needed

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
  users,
  currentUser,          // <-- Add this prop: current logged-in user object
  setShowExpectedDateModal,
  setPendingPhaseChange,
  setLeadBeingUpdated,
}) {
  const [assignHovered, setAssignHovered] = useState(false);

  // Helper: get filtered users based on currentUser role & hierarchy
  function getAssignableUsers(currentUser, users) {
    if (!currentUser) return [];

    const allUsers = Object.values(users).filter(u => u.department === "Sales");

    if (currentUser.role === "Manager") {
      // Manager ke under jitne Assistant Manager aur Executive hain
      return allUsers.filter(
        u =>
          u.managerId === currentUser.uid &&
          (u.role === "Executive" || u.role === "Assistant Manager")
      );
    }

    if (currentUser.role === "Executive" || currentUser.role === "Assistant Manager") {
      // Apna manager
      const manager = users[currentUser.managerId];

      // Apne manager ke executives
      const managersExecutives = allUsers.filter(
        u => u.managerId === currentUser.managerId && u.role === "Executive"
      );

      // Manager + manager ke executives (unique & non-null)
      return [manager, ...managersExecutives].filter(Boolean);
    }

    // Default empty list ya sab dikhana ho to adjust karo
    return [];
  }

  const assignableUsers = getAssignableUsers(currentUser, users);

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 bg-white rounded-xl shadow-xl w-48 overflow-visible -right-4 top-full mt-1 animate-fadeIn"
      onClick={(e) => e.stopPropagation()} // ✅ Prevent bubbling from anywhere inside
    >
      <div className="py-1 relative">
        {/* Follow Up */}
        <button
          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLead({ ...leadData, id: leadId });
            setShowFollowUpModal(true);
            closeDropdown();
          }}
        >
          <FaCalendarCheck className="text-purple-500 mr-3" />
          Meetings
        </button>

        {/* Edit */}
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

        {/* Assign Dropdown */}
        <div
          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition relative group cursor-pointer"
          onMouseEnter={() => setAssignHovered(true)}
          onMouseLeave={() => setAssignHovered(false)}
          onClick={(e) => e.stopPropagation()} // ✅ prevent row click
        >
          <FaArrowRight className="text-indigo-500 mr-3" />
          Assign
          {assignHovered && (
            <div className="absolute right-full top-0 ml-2 w-40 bg-white border rounded-lg shadow-lg z-50 p-2 animate-fadeIn max-h-60 overflow-y-auto">
              {assignableUsers.length === 0 ? (
                <div className="text-gray-500 px-3 py-1.5 text-sm">No users available</div>
              ) : (
                assignableUsers.map((user) => (
                  <button
                    key={user.uid}
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await updateDoc(doc(db, "leads", leadId), {
                          assignedTo: {
                            uid: user.uid,
                            name: user.name,
                            email: user.email,
                          },
                        });
                        console.log("Assigned to:", user.name);
                      } catch (error) {
                        console.error("Error assigning lead:", error);
                      }
                      setAssignHovered(false);
                      closeDropdown();
                    }}
                    className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    {user.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Phase Change Header */}
        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Move to
        </div>

        {/* Phase Change Buttons */}
        {["hot", "warm", "cold"]
          .filter((phase) => phase !== activeTab)
          .map((phase) => (
            <button
              key={phase}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
              onClick={async (e) => {
                e.stopPropagation();
                const isFromHotToWarmOrCold =
                  leadData.phase === "hot" &&
                  (phase === "warm" || phase === "cold");

                if (isFromHotToWarmOrCold) {
                  setLeadBeingUpdated({ ...leadData, id: leadId });
                  setPendingPhaseChange(phase);
                  setShowExpectedDateModal(true);
                } else {
                  await updateLeadPhase(leadId, phase);
                }

                closeDropdown();
              }}
            >
              <FaArrowRight
                className={`${
                  phase === "hot"
                    ? "text-red-500"
                    : phase === "warm"
                    ? "text-amber-500"
                    : "text-emerald-500"
                } mr-3`}
              />
              {phase.charAt(0).toUpperCase() + phase.slice(1)}
            </button>
          ))}

        {/* Closure Button */}
        {leadData.phase === "hot" && (
          <button
            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100 mt-1 transition"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLead({ ...leadData, id: leadId });
              setShowClosureModal(true);
              closeDropdown();
            }}
          >
            <FaCheckCircle className="text-green-500 mr-3" />
            Closure
          </button>
        )}
      </div>
    </div>
  );
}