import React, { useState, useEffect } from "react";
import {
  FaCalendarCheck,
  FaEdit,
  FaArrowRight,
  FaCheckCircle,
  FaTrash,
} from "react-icons/fa";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";

const DropdownActions = ({
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
  users, // Firestore users collection
  currentUser, // Firebase Auth user
  setShowExpectedDateModal,
  setPendingPhaseChange,
  setLeadBeingUpdated,
  isMyLead,
}) => {
  const [assignHovered, setAssignHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Debug logs
  // useEffect(() => {
  //   console.group("DropdownActions Debug");
  //   console.log("Firebase Auth User:", currentUser);
  //   console.log("Firestore Users Collection:", users);
  //   console.log("Current User Data:", currentUserData);
  //   console.log("Is Admin:", currentUserData?.department === "Admin");
  //   console.groupEnd();
  // }, [currentUser, users, currentUserData]);

  // Get complete user data from Firestore
  useEffect(() => {
    if (currentUser?.uid && users) {
      // Find user in Firestore collection
      const userDoc = Object.values(users).find(
        (user) => user.uid === currentUser.uid
      );

      if (userDoc) {
        setCurrentUserData(userDoc);
        // console.log("Found user document:", userDoc);
      } else {
        // console.warn("User document not found in Firestore");
        setCurrentUserData(null);
      }
    }
  }, [currentUser, users]);

  const handleDeleteLead = async () => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "leads", leadId));
      // console.log("Lead deleted successfully");
    } catch {
      // console.error("Error deleting lead");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      closeDropdown();
    }
  };

  const getAssignableUsers = () => {
    if (!currentUserData || !users) return [];

    const userList = Object.values(users);
    const allSalesUsers = userList.filter(
      (u) =>
        ["Sales", "Admin"].includes(u.department) && u.uid !== currentUser.uid
    );

    // console.log("Current user role:", currentUserData.role);

    if (["Director", "Head"].includes(currentUserData.role)) {
      return allSalesUsers;
    }

    if (currentUserData.role === "Manager") {
      // Get Assistant Managers, Executives, and Managers (excluding self)
      return allSalesUsers.filter(
        (u) =>
          (u.reportingManager === currentUserData.name &&
            ["Assistant Manager", "Executive"].includes(u.role)) ||
          (u.role === "Manager" && u.uid !== currentUser.uid)
      );
    }
    if (["Assistant Manager", "Executive"].includes(currentUserData.role)) {
      const manager = userList.find(
        (u) => u.name === currentUserData.reportingManager
      );
      const peers = allSalesUsers.filter(
        (u) =>
          u.reportingManager === currentUserData.reportingManager &&
          u.uid !== currentUser.uid
      );
      return [manager, ...peers].filter(Boolean);
    }

    return [];
  };

  const assignableUsers = getAssignableUsers();

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
        {isMyLead && (
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
        )}

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
                <div className="text-gray-500 px-3 py-1.5 text-sm">
                  No users available
                </div>
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
                      } catch (error) {
                        console.error("Error assigning lead:", error);
                      }
                      setAssignHovered(false);
                      closeDropdown();
                    }}
                    className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    {user.name}{" "}
                    <span className="text-xs text-gray-400">({user.role})</span>
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

        {/* Delete Button (only for Admin) */}
        {currentUserData?.department === "Admin" && (
          <>
            <div className="border-t border-gray-200 my-1"></div>
            <button
              className={`flex items-center w-full px-4 py-3 text-sm ${
                isDeleting ? "text-gray-500" : "text-red-600"
              } hover:bg-red-50 transition`}
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              disabled={isDeleting}
            >
              <FaTrash
                className={`mr-3 ${
                  isDeleting ? "text-gray-400" : "text-red-500"
                }`}
              />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </>
        )}
      </div>
      {showDeleteConfirm && (
        <div className="fixed inset-0 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-white bg-opacity-20 backdrop-blur-xl rounded-xl shadow-lg max-w-md w-full p-6 animate-fadeIn border border-white border-opacity-30">
            <div className="text-center">
              <FaTrash className="mx-auto text-red-500 text-4xl mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Delete Lead
              </h3>
              <p className="text-gray-500 mb-6">
                Are you sure you want to permanently delete this lead? This
                action cannot be undone.
              </p>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteLead}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    "Delete Permanently"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownActions;
