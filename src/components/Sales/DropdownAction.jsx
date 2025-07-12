import React, { useState } from "react";
import {
  FaPhone,
  FaCalendarCheck,
  FaEdit,
  FaArrowRight,
  FaCheckCircle,
} from "react-icons/fa";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

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
  currentUser,
  setShowExpectedDateModal,
  setPendingPhaseChange,
  setLeadBeingUpdated,
}) {
  const [assignHovered, setAssignHovered] = useState(false);

  // Debug logs for props
  console.log("DropdownActions props:", { leadId, leadData, currentUser, users });

  // Dummy data for testing, comment this out when using real data
  /*
  const dummyUsers = {
    user1: { uid: "user1", name: "John Doe", role: "Manager", department: "Sales", reportingManager: "Director A" },
    user2: { uid: "user2", name: "Jane Smith", role: "Executive", department: "Sales", reportingManager: "John Doe" },
    user3: { uid: "user3", name: "Director A", role: "Director", department: "Sales" }
  };
  const dummyCurrentUser = { uid: "user1" };
  */
function getAssignableUsers(currentUser, users) {
  console.log("getAssignableUsers called with:", currentUser, users);

  if (!currentUser?.uid || !users || Object.keys(users).length === 0) {
    console.warn("currentUser or users data missing");
    return [];
  }

  const userList = Object.values(users);
  const allSalesUsers = userList.filter(u => u.department === "Sales");
  const currentUserData = userList.find(u => u.uid === currentUser.uid);

  if (!currentUserData) {
    console.warn("No currentUserData found for uid:", currentUser.uid);
    return [];
  }

  const role = currentUserData.role;
  console.log("Current user role:", role);

  // Director / Head can see all sales users
  if (["Director", "Head"].includes(role)) {
    return allSalesUsers;
  }

  // Manager can assign to Assistant Managers & Executives reporting to them
  if (role === "Manager") {
    return allSalesUsers.filter(
      u =>
        u.reportingManager === currentUserData.name &&
        ["Assistant Manager", "Executive"].includes(u.role)
    );
  }

  // Executive / Assistant Manager can assign to their manager and peers (same reportingManager)
  if (["Executive", "Assistant Manager"].includes(role)) {
    const manager = userList.find(u => u.name === currentUserData.reportingManager);
    
    // Peers with same reportingManager irrespective of Executive or Assistant Manager role (except self)
    const peers = allSalesUsers.filter(
      u =>
        u.reportingManager === currentUserData.reportingManager &&
        u.uid !== currentUser.uid // exclude self
    );

    // Return manager + all peers with same reportingManager
    return [manager, ...peers].filter(Boolean);
  }

  return [];
}


  // Use real data here:
  const assignableUsers = getAssignableUsers(currentUser, users);
  console.log("Assignable Users:", assignableUsers);

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 bg-white rounded-xl shadow-xl w-48 overflow-visible -right-4 top-full mt-1 animate-fadeIn"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1 relative">
        {/* Meetings */}
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
          onClick={(e) => e.stopPropagation()}
        >
          <FaArrowRight className="text-indigo-500 mr-3" />
          Assign
          {assignHovered && (
            <div className="absolute right-full top-0 ml-2 w-48 bg-white border rounded-lg shadow-lg z-50 p-2 animate-fadeIn max-h-60 overflow-y-auto">
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
                    {user.name} <span className="text-xs text-gray-400">({user.role})</span>
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
                  leadData.phase === "hot" && (phase === "warm" || phase === "cold");

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
