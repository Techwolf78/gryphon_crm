import React, { useState, useEffect } from "react";
import { FiX, FiInfo } from "react-icons/fi";

function LeadDetailsModal({ show, onClose, lead, onSave }) {
  // All expected lead fields with default values
  const defaultLeadFields = {
    businessName: "",
    city: "",
    pocName: "",
    phoneNo: "",
    email: "",
    createdAt: "",
    phase: "",
    assignedTo: "", // include more if needed
  };

  const [formData, setFormData] = useState(defaultLeadFields);

  useEffect(() => {
    if (lead) {
      setFormData({ ...defaultLeadFields, ...lead });
    }
  }, [lead]);

  if (!show || !lead) return null;

  // Optional display names for nicer labels
  const customLabels = {
    businessName: "College Name",
    city: "City",
    pocName: "Contact Name",
    phoneNo: "Phone No.",
    email: "Email ID",
    createdAt: "Opened Date",
    phase: "Phase",
    assignedTo: "Assigned To",
  };

  const formatDateForInput = (ms) => {
    if (!ms) return "";
    const timestamp = typeof ms === "string" ? parseInt(ms) : ms;
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error("Date formatting error:", e);
      return "";
    }
  };

  const handleChange = (key, value) => {
    if (key === "createdAt") {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setFormData((prev) => ({ ...prev, [key]: date.getTime() }));
        return;
      }
    }
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const updatedData = {
      ...formData,
      createdAt:
        typeof formData.createdAt === "string"
          ? new Date(formData.createdAt).getTime()
          : formData.createdAt,
    };
    onSave(updatedData);
  };

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
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editableKeys.map((key) => {
              const label =
                customLabels[key] ||
                key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

              if (key === "createdAt") {
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
            className="px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 font-medium rounded-lg transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-medium rounded-lg transition-colors"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default LeadDetailsModal;
