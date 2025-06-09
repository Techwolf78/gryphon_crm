import React, { useState } from "react";
import { FaEnvelope, FaEllipsisV } from "react-icons/fa";
import AddCollegeModal from "../components/Sales/AddCollege"; // Ensure correct relative path

const dummyData = {
  hot: [
    {
      id: 1,
      name: "Harvard University",
      city: "Cambridge",
      state: "MA",
      contact: "John Doe",
      phone: "123-456-7890",
    },
    {
      id: 2,
      name: "Stanford University",
      city: "Stanford",
      state: "CA",
      contact: "Jane Smith",
      phone: "987-654-3210",
    },
  ],
  warm: [
    {
      id: 3,
      name: "University of Chicago",
      city: "Chicago",
      state: "IL",
      contact: "Mike Ross",
      phone: "456-123-7890",
    },
  ],
  cold: [
    {
      id: 4,
      name: "Duke University",
      city: "Durham",
      state: "NC",
      contact: "Rachel Zane",
      phone: "321-654-9870",
    },
  ],
  renewal: [
    {
      id: 5,
      name: "MIT",
      city: "Cambridge",
      state: "MA",
      contact: "Eli Gold",
      phone: "111-222-3333",
    },
  ],
};

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

function Sales() {
  const [activeTab, setActiveTab] = useState("hot");
  const [dropdownOpenId, setDropdownOpenId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const toggleDropdown = (id) => {
    setDropdownOpenId(dropdownOpenId === id ? null : id);
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

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans relative">
      <div className="max-w-7xl mx-auto">
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

        {/* Table */}
        <div className="bg-white shadow-lg rounded-lg overflow-visible border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead
              className={`text-sm font-semibold ${headerColorMap[activeTab]}`}
            >
              <tr>
                {[
                  "College Name",
                  "City",
                  "State",
                  "Contact Person",
                  "Phone",
                  "Email",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-4 text-left select-none"
                    style={
                      header === "Actions" || header === "Email"
                        ? { textAlign: "center" }
                        : {}
                    }
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-800 divide-y divide-gray-100">
              {dummyData[activeTab].map((college) => (
                <tr
                  key={college.id}
                  className={`${rowColorMap[activeTab]} hover:bg-gray-100 transition-colors duration-200 cursor-pointer`}
                >
                  <td className="px-6 py-4 font-medium">{college.name}</td>
                  <td className="px-6 py-4">{college.city}</td>
                  <td className="px-6 py-4">{college.state}</td>
                  <td className="px-6 py-4">{college.contact}</td>
                  <td className="px-6 py-4">{college.phone}</td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-blue-600 hover:text-blue-800 transition">
                      <FaEnvelope size={18} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center relative">
                    <button
                      onClick={() => toggleDropdown(college.id)}
                      className="text-gray-500 hover:text-gray-700 focus:outline-none transition"
                      aria-label="Actions menu"
                    >
                      <FaEllipsisV size={18} />
                    </button>

                    {dropdownOpenId === college.id && (
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
              ))}
              {dummyData[activeTab].length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center py-8 text-gray-400 italic select-none"
                  >
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AddCollegeModal show={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}

export default Sales;
