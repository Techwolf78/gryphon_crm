// Sales.jsx
import React, { useState, useEffect, useRef } from "react";
import { FaEllipsisV } from "react-icons/fa";
import { FaTimes } from "react-icons/fa";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import AddCollegeModal from "../components/Sales/AddCollege";
import FollowUp from "../components/Sales/Followup";
import ClosureFormModal from "../components/Sales/ClosureFormModal"; // Import the closure modal
import LeadDetailsModal from "../components/Sales/LeadDetailsModal";
import DropdownActions from "../components/Sales/DropdownAction";
import ClosedLeads from "../components/Sales/ClosedLeads";
// Updated tabLabels
const tabLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  closed: "Closed", // Changed from renewal to closed
};

// Updated color scheme
const tabColorMap = {
  hot: {
    active: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg",
    inactive: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
  },
  warm: {
    active: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg",
    inactive:
      "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200",
  },
  cold: {
    active: "bg-gradient-to-r from-cyan-400 to-cyan-500 text-white shadow-lg", // Changed to icy blue
    inactive:
      "bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border border-cyan-200", // Changed to icy blue
  },
  closed: {
    active: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg", // Changed to success green
    inactive:
      "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200", // Changed to success green
  },
};

const borderColorMap = {
  hot: "border-l-4 border-red-500",
  warm: "border-l-4 border-amber-400",
  cold: "border-l-4 border-cyan-400", // Changed to icy blue
  closed: "border-l-4 border-green-500", // Changed to success green
};

const headerColorMap = {
  hot: "bg-red-50 text-red-800 border-b border-red-200",
  warm: "bg-amber-50 text-amber-800 border-b border-amber-200",
  cold: "bg-cyan-50 text-cyan-800 border-b border-cyan-200", // Changed to icy blue
  closed: "bg-green-50 text-green-800 border-b border-green-200", // Changed to success green
};

function Sales() {
  const [activeTab, setActiveTab] = useState("hot");
  const [users, setUsers] = useState({});
  const [dropdownOpenId, setDropdownOpenId] = useState(null);
  const dropdownRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leads, setLeads] = useState({});
  const [followups, setFollowups] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewMyLeadsOnly, setViewMyLeadsOnly] = useState(true); // Default to true now

  const computePhaseCounts = () => {
    const user = Object.values(users).find((u) => u.uid === currentUser?.uid);
    const counts = {
      hot: 0,
      warm: 0,
      cold: 0,
      closed: 0, // Changed from renewal to closed
    };

    if (!user) return counts;

    const isSalesDept = user.department === "Sales";
    const isHigherRole = ["Director", "Head", "Manager"].includes(user.role);
    const isLowerRole = ["Assistant Manager", "Executive"].includes(user.role);

    Object.values(leads).forEach((lead) => {
      const phase = lead.phase || "hot";
      const isOwnLead = lead.assignedTo?.uid === currentUser?.uid;

      const shouldInclude =
        isSalesDept && isHigherRole
          ? viewMyLeadsOnly
            ? isOwnLead
            : true
          : isSalesDept && isLowerRole
          ? isOwnLead
          : false;

      if (shouldInclude && counts[phase] !== undefined) {
        counts[phase]++;
      }
    });

    return counts;
  };

  const phaseCounts = computePhaseCounts();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        // Check user role and set viewMyLeadsOnly accordingly
        const userData = Object.values(users).find((u) => u.uid === user.uid);
        if (userData) {
          const isHigherRole = ["Director", "Head", "Manager"].includes(
            userData.role
          );
          // For higher roles, default to "My Leads" view
          setViewMyLeadsOnly(isHigherRole);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, [users]); // Add users as dependency

  useEffect(() => {
    const unsubLeads = onSnapshot(collection(db, "leads"), (snapshot) => {
      const data = {};
      snapshot.forEach((doc) => {
        data[doc.id] = { id: doc.id, ...doc.data() };
      });
      setLeads(data);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const data = {};
      snapshot.forEach((doc) => {
        data[doc.id] = { id: doc.id, ...doc.data() };
      });
      setUsers(data);
    });

    return () => {
      unsubLeads();
      unsubUsers();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (id, e) => {
    e.stopPropagation();
    setDropdownOpenId((currentId) => (currentId === id ? null : id));
  };

  const updateLeadPhase = async (id, newPhase) => {
    try {
      await updateDoc(doc(db, "leads", id), { phase: newPhase });
    } catch (err) {
      console.error("Phase update failed", err);
    }
  };

  // In Sales.jsx
  const handleSaveLead = async (updatedLead) => {
    if (!updatedLead?.id) return;

    // Convert date string back to timestamp if it exists
    if (updatedLead.createdAt && typeof updatedLead.createdAt === "string") {
      updatedLead.createdAt = new Date(updatedLead.createdAt).getTime();
    }

    const { id, ...dataToUpdate } = updatedLead;

    try {
      await updateDoc(doc(db, "leads", updatedLead.id), dataToUpdate);

      setShowDetailsModal(false);
      setSelectedLead(null);
    } catch (error) {
      console.error("Failed to update lead", error);
    }
  };

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

  const filteredLeads = Object.entries(leads).filter(([, lead]) => {
    const phaseMatch = (lead.phase || "hot") === activeTab;
    const user = Object.values(users).find((u) => u.uid === currentUser?.uid);
    if (!user) return false;

    const isSalesDept = user.department === "Sales";
    const isHigherRole = ["Director", "Head", "Manager"].includes(user.role);
    const isLowerRole = ["Assistant Manager", "Executive"].includes(user.role);

    if (isSalesDept && isHigherRole) {
      return viewMyLeadsOnly
        ? phaseMatch && lead.assignedTo?.uid === currentUser?.uid
        : phaseMatch;
    }

    if (isSalesDept && isLowerRole) {
      return phaseMatch && lead.assignedTo?.uid === currentUser?.uid;
    }

    return false;
  });

  // Define the grid columns based on the fields we want to display
  const gridColumns = "grid grid-cols-9 gap-4";

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen font-sans ">
      <div className=" mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Sales Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your leads and follow-ups
            </p>

            {currentUser &&
              (() => {
                const role = Object.values(users).find(
                  (u) => u.uid === currentUser.uid
                )?.role;
                const isHigherRole = ["Director", "Head", "Manager"].includes(
                  role
                );

                return (
                  <div className="flex items-center gap-2 mt-2">
                    <p
                      className={`text-xs font-medium px-3 py-1 rounded-full ${
                        isHigherRole
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      Viewing:{" "}
                      {isHigherRole
                        ? viewMyLeadsOnly
                          ? "My Leads Only"
                          : "All Sales Leads"
                        : "My Leads Only"}
                    </p>

                    {isHigherRole && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewMyLeadsOnly(true)}
                          className={`text-xs font-medium px-3 py-1 rounded-full border transition ${
                            viewMyLeadsOnly
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-blue-600 border-blue-300"
                          }`}
                        >
                          My Leads
                        </button>
                        <button
                          onClick={() => setViewMyLeadsOnly(false)}
                          className={`text-xs font-medium px-3 py-1 rounded-full border transition ${
                            !viewMyLeadsOnly
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-blue-600 border-blue-300"
                          }`}
                        >
                          My Team
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-all shadow-md flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clipRule="evenodd"
              />
            </svg>
            Add College
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {Object.keys(tabLabels).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-[1.02] ${
                activeTab === key
                  ? tabColorMap[key].active
                  : tabColorMap[key].inactive
              } ${
                activeTab === key ? "ring-2 ring-offset-2 ring-opacity-50" : ""
              } ${
                activeTab === key
                  ? key === "hot"
                    ? "ring-red-500"
                    : key === "warm"
                    ? "ring-amber-400"
                    : key === "cold"
                    ? "ring-cyan-400" // Changed to icy blue
                    : "ring-green-500" // Changed to success green
                  : ""
              }`}
            >
              {tabLabels[key]}{" "}
              <span className="ml-1 text-xs font-bold">
                ({phaseCounts[key]})
              </span>
            </button>
          ))}
        </div>

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
              <div className="font-semibold">Assigned To</div>{" "}
              {/* 👈 Add this */}
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
                        {lead.assignedTo?.uid &&
                        users[lead.assignedTo.uid]?.name
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
                        users={users} // ✅ Pass users here
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <AddCollegeModal show={showModal} onClose={() => setShowModal(false)} />

      <LeadDetailsModal
        show={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        lead={selectedLead}
        onSave={handleSaveLead}
      />

      <ClosureFormModal
        show={showClosureModal}
        onClose={() => setShowClosureModal(false)}
        lead={selectedLead}
      />
      {showFollowUpModal && selectedLead && (
        <FollowUp
          onClose={() => setShowFollowUpModal(false)}
          lead={selectedLead}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

export default Sales;
