// Sales.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  FaEllipsisV,
  FaPhone,
  FaCalendarCheck,
  FaArrowRight,
  FaCheckCircle,
} from "react-icons/fa";
import { FaTimes } from "react-icons/fa";
import { ref, onValue, update } from "firebase/database";
import { realtimeDb } from "../firebase";
import AddCollegeModal from "../components/Sales/AddCollege";
import FollowUp from "../components/Sales/Followup";
import ClosureFormModal from "../components/Sales/ClosureFormModal"; // Import the closure modal

const tabLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  renewal: "Renewal",
};

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
    active:
      "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg",
    inactive:
      "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200",
  },
  renewal: {
    active: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg",
    inactive:
      "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200",
  },
};

const borderColorMap = {
  hot: "border-l-4 border-red-500",
  warm: "border-l-4 border-amber-400",
  cold: "border-l-4 border-emerald-500",
  renewal: "border-l-4 border-blue-500",
};

const headerColorMap = {
  hot: "bg-red-50 text-red-800 border-b border-red-200",
  warm: "bg-amber-50 text-amber-800 border-b border-amber-200",
  cold: "bg-emerald-50 text-emerald-800 border-b border-emerald-200",
  renewal: "bg-blue-50 text-blue-800 border-b border-blue-200",
};

function Sales() {
  const [activeTab, setActiveTab] = useState("hot");
  const [dropdownOpenId, setDropdownOpenId] = useState(null);
  const dropdownRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leads, setLeads] = useState({});
  const [followups, setFollowups] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const leadsRef = ref(realtimeDb, "leads");
    const unsubLeads = onValue(leadsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setLeads(data);
      setLoading(false);
    });

    const followRef = ref(realtimeDb, "Followup");
    const unsubF = onValue(followRef, (snapshot) => {
      setFollowups(snapshot.val() || {});
    });

    return () => {
      unsubLeads();
      unsubF();
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
    const leadRef = ref(realtimeDb, `leads/${id}`);
    try {
      await update(leadRef, { phase: newPhase });
    } catch (err) {
      console.error("Phase update failed", err);
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

  const filteredLeads = Object.entries(leads).filter(
    ([, lead]) => (lead.phase || "hot") === activeTab
  );

  // Define the grid columns based on the fields we want to display
  const gridColumns = "grid grid-cols-8 gap-4";

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
                    ? "ring-emerald-500"
                    : "ring-blue-500"
                  : ""
              }
`}
            >
              {tabLabels[key]}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="w-auto space-y-3">
            {/* Grid Header */}

            <div
              className={`${gridColumns} ${headerColorMap[activeTab]} text-sm font-medium px-5 py-4 rounded-xl mb-3`}
            >
              {/* header columns */}
              <div className="font-semibold">College Name</div>
              <div className="font-semibold">City</div>
              <div className="font-semibold">Contact Name</div>
              <div className="font-semibold">Phone No.</div>
              <div className="font-semibold">Email ID</div>
              <div className="font-semibold">Opened Date</div>
              <div className="font-semibold">Follow-Ups</div>
              <div className="font-semibold text-center">Actions</div>
            </div>

            {/* Grid Rows */}
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
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
                  <div key={id} className="relative group">
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

                      <div className="flex items-center text-sm text-gray-700">
                        {getLatestFollowup(lead)}
                      </div>

                      <div className="flex justify-center items-center">
                        <button
                          onClick={(e) => toggleDropdown(id, e)}
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

                    {/* Dropdown Actions */}
                    {dropdownOpenId === id && (
                      <div
                        ref={dropdownRef}
                        className="absolute z-50 bg-white rounded-xl shadow-xl w-48 overflow-hidden right-4 top-full mt-1 animate-fadeIn"
                      >
                        <div className="py-1">
                          <a
                            href={`tel:${leads[dropdownOpenId].phoneNo}`}
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                          >
                            <FaPhone className="text-blue-500 mr-3" />
                            Call
                          </a>
                          <button
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                            onClick={() => {
                              setSelectedLead({
                                ...leads[dropdownOpenId],
                                id: dropdownOpenId,
                              });
                              setShowFollowUpModal(true);
                              setDropdownOpenId(null);
                            }}
                          >
                            <FaCalendarCheck className="text-purple-500 mr-3" />
                            Follow Up
                          </button>
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
                                  await updateLeadPhase(dropdownOpenId, phase);
                                  setDropdownOpenId(null);
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
                                {tabLabels[phase]}
                              </button>
                            ))}
                          <button
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100 mt-1 transition"
                            onClick={() => {
                              setSelectedLead(leads[dropdownOpenId]);
                              setShowClosureModal(true);
                              setDropdownOpenId(null);
                            }}
                          >
                            <FaCheckCircle className="text-green-500 mr-3" />
                            Closure
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <AddCollegeModal show={showModal} onClose={() => setShowModal(false)} />
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
