import React, { useState, useEffect } from "react";
import { FiX, FiInfo } from "react-icons/fi";

function LeadDetailsModal({ show, onClose, lead, onSave }) {
  const defaultLeadFields = {
    businessName: "",
    city: "",
    pocName: "",
    phoneNo: "",
    email: "",
    createdAt: "",
    phase: "",
    expectedClosureDate: "",
  };

  // Function to determine phase based on expectedClosureDate
  const getLeadPhase = (expectedDateInput) => {
    if (!expectedDateInput) return "hot";
    const now = new Date();
    const expectedDate = new Date(expectedDateInput);
    const diffInDays = Math.ceil((expectedDate - now) / (1000 * 60 * 60 * 24));
    if (diffInDays > 45) return "cold";
    if (diffInDays > 30) return "warm";
    return "hot";
  };

  const [formData, setFormData] = useState(defaultLeadFields);

  // When lead prop changes, update formData state
  useEffect(() => {
    if (lead) {
      setFormData({ ...defaultLeadFields, ...lead });
    }
  }, [lead]);

  if (!show || !lead) return null;

  // Labels for fields (can adjust for UI)
  const labels = {
    businessName: "College Name",
    city: "City",
    pocName: "Contact Name",
    phoneNo: "Phone No.",
    email: "Email ID",
    createdAt: "Opened Date",
    phase: "Phase",
    expectedClosureDate: "Expected Closure Date",
  };

  // Convert timestamp or string to yyyy-mm-dd for date input
  const formatDateForInput = (value) => {
    if (!value) return "";
    let timestamp = value;

    if (typeof value === "string" && !isNaN(Date.parse(value))) {
      timestamp = new Date(value).getTime();
    } else if (typeof value === "string") {
      timestamp = parseInt(value);
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // Handle input changes in form
  const handleChange = (key, value) => {
    let updatedData = { ...formData };

    if (key === "createdAt" || key === "expectedClosureDate") {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        updatedData[key] = date.getTime();

        // Update phase automatically when expectedClosureDate changes
        if (key === "expectedClosureDate") {
          updatedData.phase = getLeadPhase(date);
        }

        setFormData(updatedData);
        return;
      }
    }

    updatedData[key] = value;
    setFormData(updatedData);
  };

  // Save handler sends data with timestamps for dates
  const handleSave = () => {
    const updatedData = {
      ...formData,
      createdAt:
        typeof formData.createdAt === "string"
          ? new Date(formData.createdAt).getTime()
          : formData.createdAt,
      expectedClosureDate:
        typeof formData.expectedClosureDate === "string"
          ? new Date(formData.expectedClosureDate).getTime()
          : formData.expectedClosureDate,
    };

    onSave(updatedData);
  };

  // Keys we want editable in the modal
  const editableKeys = Object.keys(defaultLeadFields);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FiInfo className="text-white" />
              Edit Lead Details
            </h2>
            <p className="text-blue-100 text-sm mt-1 truncate">
              {formData.businessName || "Lead Information"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            aria-label="Close modal"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body/Form */}
        <div className="overflow-y-auto p-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editableKeys.map((key) => {
              const label = labels[key] || key;

              // Date inputs for createdAt and expectedClosureDate
              if (key === "createdAt" || key === "expectedClosureDate") {
                return (
                  <div
                    key={key}
                    className="border border-gray-100 rounded-lg p-4 hover:shadow transition-shadow"
                  >
                    <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                      {label}
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(formData[key])}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                );
              }

              // For all other text inputs
              return (
                <div
                  key={key}
                  className="border border-gray-100 rounded-lg p-4 hover:shadow transition-shadow"
                >
                  <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={formData[key] || ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-medium rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default LeadDetailsModal;
