// Sales.jsx
import React, { useState, useEffect } from "react";
import { FaEnvelope, FaEllipsisV } from "react-icons/fa";
import { ref, onValue, update } from "firebase/database";
import { realtimeDb } from "../firebase";
import AddCollegeModal from "../components/Sales/AddCollege";

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

const rowColorMap = {
  hot: "bg-red-50",
  warm: "bg-yellow-50",
  cold: "bg-green-50",
  renewal: "bg-blue-50",
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
          <div><strong>Business:</strong> {lead.businessName}</div>
          <div><strong>City:</strong> {lead.city}</div>
          <div><strong>Phone:</strong> {lead.phoneNo}</div>
          <div><strong>Email:</strong> {lead.email}</div>
          <div><strong>POC:</strong> {lead.pocName}</div>
          <div><strong>State:</strong> {lead.state}</div>
          <div><strong>Address:</strong> {lead.address}</div>
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showModal, setShowModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leads, setLeads] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const leadsRef = ref(realtimeDb, "leads");
    const unsubscribe = onValue(
      leadsRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        setLeads(data);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to fetch leads:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const toggleDropdown = (id, e) => {
    if (dropdownOpenId === id) {
      setDropdownOpenId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.right - 160,
      });
      setDropdownOpenId(id);
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

  const handleClosureClick = (lead) => {
    setSelectedLead(lead);
    setShowClosureModal(true);
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

  return (
    <div className="bg-gray-50 min-h-screen font-sans relative">
      <div className="mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Leads</h2>
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
                activeTab === key ? tabColorMap[key].active : tabColorMap[key].inactive
              }`}
            >
              {tabLabels[key]}
            </button>
          ))}
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-x-auto border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: "fixed" }}>
            <thead className={`text-sm font-semibold ${headerColorMap[activeTab]}`}>
              <tr>
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
                  <th key={title} className="px-4 py-4 text-left whitespace-normal break-words">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-800 divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8">
                    Loading leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-400 italic">
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredLeads.map(([id, lead]) => (
                  <tr
                    key={id}
                    className={`${rowColorMap[activeTab]} hover:bg-gray-100 transition-colors duration-200`}
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
                      <td key={i} className="px-4 py-4 whitespace-normal break-words">
                        {field === "createdAt"
                          ? formatDate(lead[field])
                          : lead[field] || "-"}
                      </td>
                    ))}
                    <td className="px-4 py-4 text-center relative">
                      <button
                        onClick={(e) => toggleDropdown(id, e)}
                        className="text-gray-500 hover:text-gray-700 focus:outline-none transition"
                      >
                        <FaEllipsisV size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dropdown Actions */}
      {dropdownOpenId && leads[dropdownOpenId] && (
        <div
          className="fixed top-0 left-0 w-screen h-screen z-[99999]"
          onClick={() => setDropdownOpenId(null)}
        >
          <div
            className="absolute bg-white/30 backdrop-blur-md border border-white/20 rounded-xl shadow-xl w-40 p-2"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
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
        </div>
      )}

      {/* Modals */}
      <AddCollegeModal show={showModal} onClose={() => setShowModal(false)} />
      <ClosureFormModal
        show={showClosureModal}
        onClose={() => setShowClosureModal(false)}
        lead={selectedLead}
      />
    </div>
  );
}

export default Sales;
