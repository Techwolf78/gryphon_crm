// Sales.jsx
import React, { useState, useEffect, useRef } from "react";
import { FaEnvelope, FaEllipsisV } from "react-icons/fa";
import { ref, onValue, update } from "firebase/database";
import { realtimeDb } from "../firebase";
import AddCollegeModal from "../components/Sales/AddCollege";
import FollowUp from "../components/Sales/Followup";

const tabLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  renewal: "Renewal",
};

const tabColorMap = {
  hot: {
    active: "bg-red-600 text-white shadow-md",
    inactive: "bg-red-100 text-red-600 hover:bg-red-200",
  },
  warm: {
    active: "bg-yellow-500 text-white shadow-md",
    inactive: "bg-yellow-100 text-yellow-600 hover:bg-yellow-200",
  },
  cold: {
    active: "bg-green-600 text-white shadow-md",
    inactive: "bg-green-100 text-green-600 hover:bg-green-200",
  },
  renewal: {
    active: "bg-blue-600 text-white shadow-md",
    inactive: "bg-blue-100 text-blue-600 hover:bg-blue-200",
  },
};

const headerColorMap = {
  hot: "bg-red-100 text-red-800",
  warm: "bg-yellow-100 text-yellow-800",
  cold: "bg-green-100 text-green-800",
  renewal: "bg-blue-100 text-blue-800",
};

const ClosureFormModal = ({ show, onClose, lead }) => {
  if (!show || !lead) return null;
  return (
    <div className="fixed inset-0 z-[999999] bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Closure Form</h2>
        <div className="space-y-3 text-sm">
          <div>
            <strong>Business:</strong> {lead.businessName}
          </div>
          <div>
            <strong>City:</strong> {lead.city}
          </div>
          <div>
            <strong>Phone:</strong> {lead.phoneNo}
          </div>
          <div>
            <strong>Email:</strong> {lead.email}
          </div>
          <div>
            <strong>POC:</strong> {lead.pocName}
          </div>
          <div>
            <strong>State:</strong> {lead.state}
          </div>
          <div>
            <strong>Address:</strong> {lead.address}
          </div>
        </div>
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

function Sales() {
  const [activeTab, setActiveTab] = useState("hot");
  const [dropdownOpenId, setDropdownOpenId] = useState(null);
  const [dropdownDirection, setDropdownDirection] = useState("down"); // 'down' or 'up'
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
        setDropdownDirection("down");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (id, e) => {
    e.stopPropagation(); // Prevent event bubbling

    if (dropdownOpenId === id) {
      setDropdownOpenId(null);
      setDropdownDirection("down");
    } else {
      setDropdownOpenId(id);

      // Check space below to decide dropdown direction
      const buttonRect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const dropdownHeight = 160; // approx dropdown height in px, adjust if your dropdown height differs

      if (spaceBelow < dropdownHeight) {
        setDropdownDirection("up");
      } else {
        setDropdownDirection("down");
      }
    }
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
  const entries = Object.entries(followData).sort((a, b) => a[1].timestamp - b[1].timestamp);
  if (entries.length === 0) return "-";
  const latest = entries[entries.length - 1][1];
  return `${latest.date || "-"} ${latest.time || ""} - ${latest.remarks || ""}`;
};


  const filteredLeads = Object.entries(leads).filter(
    ([, lead]) => (lead.phase || "hot") === activeTab
  );

  return (
    <div className="bg-gray-50 min-h-screen font-sans relative">
      <div className="mx-auto">
        <div className="flex justify-between items-center mb-8 pt-2">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Leads
          </h2>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition"
          >
            Add College
          </button>
        </div>

        <div className="flex gap-4 mb-8">
          {Object.keys(tabLabels).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-3 rounded-full text-sm font-semibold transition duration-300 ease-in-out ${
                activeTab === key
                  ? tabColorMap[key].active
                  : tabColorMap[key].inactive
              }`}
            >
              {tabLabels[key]}
            </button>
          ))}
        </div>


            {[
              "Business Name",
              "Address",
              "City",
              "State",
              "Contact Person",
              "Phone",
              "Email",
              "Created At",
              "Actions",
            ].map((title) => (
              <div key={title} className="whitespace-normal break-words">
                {title}
              </div>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div className="text-center text-gray-500 py-10 col-span-9">
              Loading leads...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center text-gray-400 italic py-10 col-span-9">
              No records found.
            </div>
          ) : (
            filteredLeads.map(([id, lead]) => (
              <div key={id} className="relative">
                <div
                  className={`grid grid-cols-9 gap-4 p-4 rounded-lg shadow-sm bg-white border-l-4 ${
                    activeTab === "hot"
                      ? "border-red-500"
                      : activeTab === "warm"
                      ? "border-yellow-400"
                      : activeTab === "cold"
                      ? "border-green-500"
                      : "border-blue-500"
                  }`}
                >
                  {[
                    "businessName",
                    "address",
                    "city",
                    "state",
                    "pocName",
                    "phoneNo",
                    "email",
                    "createdAt",
                  ].map((field, i) => (
                    <div
                      key={i}
                      className="whitespace-normal break-words text-sm"
                    >
                      {field === "createdAt"
                        ? formatDate(lead[field])
                        : lead[field] || "-"}
                    </div>
                  ))}

                  <div className="text-center">
                    <button
                      onClick={(e) => toggleDropdown(id, e)}
                      className="text-gray-500 hover:text-gray-700 focus:outline-none transition"
                    >
                      <FaEllipsisV size={18} />
                    </button>
                  </div>
                </div>

                {/* Dropdown Actions */}
                {dropdownOpenId === id && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-[99999] bg-white/30 backdrop-blur-md border border-white/20 rounded-xl shadow-xl w-40 p-2"
                    style={{
                      right: "8px",
                      top:
                        dropdownDirection === "down"
                          ? "calc(100% + 8px)"
                          : "auto",
                      bottom:
                        dropdownDirection === "up"
                          ? "calc(100% + 8px)"
                          : "auto",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ul className="divide-y divide-white/20">
                      <li>
                        <a
                          href={`tel:${leads[dropdownOpenId].phoneNo}`}
                          className="block px-4 py-2 text-sm hover:bg-white/40 rounded"
                        >
                          Call
                        </a>
                      </li>
                      <li
                        className="px-4 py-2 hover:bg-white/40 text-sm cursor-pointer rounded"
                        onClick={() => {
                          alert("Follow Up clicked");
                          setDropdownOpenId(null);
                        }}
                      >
                        Follow Up
                      </li>
                      {["hot", "warm", "cold", "renewal"]
                        .filter((phase) => phase !== activeTab)
                        .map((phase) => (
                          <li
                            key={phase}
                            className="px-4 py-2 hover:bg-white/40 text-sm cursor-pointer rounded capitalize"
                            onClick={async () => {
                              await updateLeadPhase(dropdownOpenId, phase);
                              setDropdownOpenId(null);
                            }}
                          >
                            Move to {tabLabels[phase]}
                          </li>
                        ))}
                      <li
                        className="px-4 py-2 hover:bg-white/40 text-sm cursor-pointer rounded"
                        onClick={() => {
                          handleClosureClick(leads[dropdownOpenId]);
                          setDropdownOpenId(null);
                        }}
                      >
                        Closure
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <AddCollegeModal show={showModal} onClose={() => setShowModal(false)} />
      <ClosureFormModal show={showClosureModal} onClose={() => setShowClosureModal(false)} lead={selectedLead} />
      {showFollowUpModal && selectedLead && (
        <FollowUp onClose={() => setShowFollowUpModal(false)} lead={selectedLead} />
      )}
    </div>
  );
}

export default Sales;
