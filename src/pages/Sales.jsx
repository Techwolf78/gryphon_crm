import React, { useState, useEffect } from "react";
import { FaEnvelope, FaEllipsisV } from "react-icons/fa";
import { ref, onValue } from "firebase/database";
import { realtimeDb } from "../firebase";
import AddCollegeModal from "../components/Sales/AddCollege";

const tabLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  renewal: "Renewal",
};

  // Fixed column widths in pixels
  const columnWidths = {
    businessName: 200,
    address: 180,
    city: 120,
    state: 120,
    pocName: 150,
    phoneNo: 120,
    email: 180,
    createdAt: 120,
    actions: 80,
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

function Sales() {
  const [activeTab, setActiveTab] = useState("hot");
  const [dropdownOpenId, setDropdownOpenId] = useState(null);
  const [showModal, setShowModal] = useState(false);
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

  const toggleDropdown = (id) => {
    setDropdownOpenId(dropdownOpenId === id ? null : id);
  };

  const formatDate = (ms) =>
    new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const filteredLeads = Object.entries(leads).filter(
    ([id, lead]) => (lead.phase || "hot") === activeTab
  );



  return (
    <div className="bg-gray-50 min-h-screen font-sans relative">
      <div className="mx-auto ">
        <div className="flex justify-between items-center mb-8">
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

        {/* Tabs */}
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

        {/* Table Container with Horizontal Scroll */}
        <div className="bg-white shadow-lg rounded-lg overflow-x-auto border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead
              className={`text-sm font-semibold ${headerColorMap[activeTab]}`}
            >
              <tr>
                <th className="px-4 py-4 text-left whitespace-normal break-words">
                  Business Name
                </th>
                <th className="px-4 py-4 text-left whitespace-normal break-words">
                  Address
                </th>
                <th className="px-4 py-4 text-left whitespace-normal break-words">
                  City
                </th>
                <th className="px-4 py-4 text-left whitespace-normal break-words">
                  State
                </th>
                <th className="px-4 py-4 text-left whitespace-normal break-words">
                  Contact Person
                </th>
                <th className="px-4 py-4 text-left whitespace-normal break-words">
                  Phone
                </th>
                <th className="px-4 py-4 text-left whitespace-normal break-words">
                  Email
                </th>
                <th className="px-4 py-4 text-left whitespace-normal break-words">
                  Created At
                </th>
                <th className="px-4 py-4 text-center whitespace-normal break-words">
                  Actions
                </th>
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
                  <td
                    colSpan="9"
                    className="text-center py-8 text-gray-400 italic"
                  >
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredLeads.map(([id, lead]) => (
                  <tr
                    key={id}
                    className={`${rowColorMap[activeTab]} hover:bg-gray-100 transition-colors duration-200`}
                  >
                    <td
                      className="px-4 py-4 whitespace-normal break-words"
                      title={lead.businessName}
                    >
                      {lead.businessName}
                    </td>
                    <td
                      className="px-4 py-4 whitespace-normal break-words"
                      title={lead.address}
                    >
                      {lead.address}
                    </td>
                    <td
                      className="px-4 py-4 whitespace-normal break-words"
                      title={lead.city}
                    >
                      {lead.city}
                    </td>
                    <td
                      className="px-4 py-4 whitespace-normal break-words"
                      title={lead.state}
                    >
                      {lead.state}
                    </td>
                    <td
                      className="px-4 py-4 whitespace-normal break-words"
                      title={lead.pocName}
                    >
                      {lead.pocName}
                    </td>
                    <td
                      className="px-4 py-4 whitespace-normal break-words"
                      title={lead.phoneNo}
                    >
                      {lead.phoneNo}
                    </td>
                    <td
                      className="px-4 py-4 whitespace-normal break-words"
                      title={lead.email}
                    >
                      {lead.email || "-"}
                    </td>
                    <td
                      className="px-4 py-4 whitespace-normal break-words"
                      title={formatDate(lead.createdAt)}
                    >
                      {formatDate(lead.createdAt)}
                    </td>
                    <td
                      className="px-4 py-4 text-center relative"
                      style={{ width: columnWidths.actions }}
                    >
                      <button
                        onClick={() => toggleDropdown(id)}
                        className="text-gray-500 hover:text-gray-700 focus:outline-none transition"
                        aria-label="Actions menu"
                      >
                        <FaEllipsisV size={18} />
                      </button>

                      {dropdownOpenId === id && (
                        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-300 rounded-lg shadow-xl z-50 ring-1 ring-black ring-opacity-5">
                          <ul className="divide-y divide-gray-100">
                            {[
                              "Call",
                              "Follow Up",
                              "Cold",
                              "Warm",
                              "Hot",
                              "Closure",
                            ].map((action) => (
                              <li
                                key={action}
                                className="px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer text-sm font-medium"
                                onClick={() => setDropdownOpenId(null)}
                              >
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddCollegeModal show={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}

export default Sales;
