import React, { useState } from "react";
import {
  FaTimes,
  FaCalendarAlt,
  FaClock,
  FaUserAlt,
  FaChalkboardTeacher,
  FaPlus,
  FaChevronDown,
} from "react-icons/fa";

const InitiationModal = ({ training, onClose, onConfirm }) => {
  const [formData, setFormData] = useState({
    phase: "phase1",
    domain: "technical",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    lunchTime: "",
    specializations: [],
    studentCount: "",
    trainingHours: "",
    batches: [{ name: "B1", count: "" }],
  });

  const [openDropdown, setOpenDropdown] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelect = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      specializations: checked
        ? [...prev.specializations, value]
        : prev.specializations.filter((item) => item !== value),
    }));
  };

  const toggleDropdown = (dropdownName) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  const handleBatchChange = (index, value) => {
    const newBatches = [...formData.batches];
    newBatches[index].count = value;
    setFormData((prev) => ({ ...prev, batches: newBatches }));
  };

  const addBatch = () => {
    const newBatchNumber = formData.batches.length + 1;
    setFormData((prev) => ({
      ...prev,
      batches: [...prev.batches, { name: `B${newBatchNumber}`, count: "" }],
    }));
  };

  const getRemainingCount = () => {
    const enteredTotal = formData.batches.reduce(
      (sum, b) => sum + Number(b.count || 0),
      0
    );
    return Number(formData.studentCount || 0) - enteredTotal;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      ...training,
      ...formData,
    });
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm  flex items-center justify-center z-500 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Sticky Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center">
            <h3 className="font-semibold text-lg mr-4">
              PROJECT CODE: {training.projectCode}
            </h3>
            <span className="bg-blue-500 text-xs px-2 py-1 rounded">
              {formData.phase.replace("phase", "Phase ")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-6">
            {/* Row 1: Phase & Domain */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phase Dropdown */}
              <div className="relative">
                <label className="block text-gray-700 mb-2 flex items-center">
                  <FaUserAlt className="mr-2 text-blue-500" /> Select Phase
                </label>
                <div
                  className="bg-gray-50 p-3 rounded-lg border border-gray-300 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleDropdown("phase")}
                >
                  <span className="capitalize">
                    {formData.phase.replace("phase", "Phase ")}
                  </span>
                  <FaChevronDown
                    className={`transition-transform ${
                      openDropdown === "phase" ? "transform rotate-180" : ""
                    }`}
                  />
                </div>
                {openDropdown === "phase" && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                    {["phase1", "phase2", "phase3"].map((ph) => (
                      <div
                        key={ph}
                        className={`p-3 hover:bg-blue-50 cursor-pointer ${
                          formData.phase === ph ? "bg-blue-100" : ""
                        }`}
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, phase: ph }));
                          setOpenDropdown(null);
                        }}
                      >
                        <span className="capitalize">
                          {ph.replace("phase", "Phase ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Domain Dropdown */}
              <div className="relative">
                <label className="block text-gray-700 mb-2 flex items-center">
                  <FaChalkboardTeacher className="mr-2 text-blue-500" /> Select Domain
                </label>
                <div
                  className="bg-gray-50 p-3 rounded-lg border border-gray-300 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleDropdown("domain")}
                >
                  <span className="capitalize">
                    {formData.domain === "splitSkills"
                      ? "Split Skills"
                      : formData.domain}
                  </span>
                  <FaChevronDown
                    className={`transition-transform ${
                      openDropdown === "domain" ? "transform rotate-180" : ""
                    }`}
                  />
                </div>
                {openDropdown === "domain" && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                    {["technical", "splitSkills", "aptitude", "tools"].map((domain) => (
                      <div
                        key={domain}
                        className={`p-3 hover:bg-blue-50 cursor-pointer ${
                          formData.domain === domain ? "bg-blue-100" : ""
                        }`}
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, domain }));
                          setOpenDropdown(null);
                        }}
                      >
                        <span className="capitalize">
                          {domain === "splitSkills" ? "Split Skills" : domain}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Dates & Times */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dates */}
              <div className="space-y-4">
                {["startDate", "endDate"].map((field, i) => (
                  <div key={field}>
                    <label className="block text-gray-700 mb-2 flex items-center">
                      <FaCalendarAlt className="mr-2 text-blue-500" />
                      {i === 0 ? "Training Start Date" : "Training End Date"}
                    </label>
                    <input
                      type="date"
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                ))}
              </div>

              {/* Times */}
              <div className="space-y-4">
                {["startTime", "endTime", "lunchTime"].map((field, i) => (
                  <div key={field}>
                    <label className="block text-gray-700 mb-2 flex items-center">
                      <FaClock className="mr-2 text-blue-500" />
                      {field === "startTime"
                        ? "College Start Time"
                        : field === "endTime"
                        ? "College End Time"
                        : "Lunch Time"}
                    </label>
                    <input
                      type="time"
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required={field !== "lunchTime"}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Row 3: Specializations & Counts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Specializations Dropdown */}
              <div className="relative">
                <label className="block text-gray-700 mb-2 flex items-center">
                  <FaChalkboardTeacher className="mr-2 text-blue-500" />
                  Specializations
                </label>
                <div
                  className="bg-gray-50 p-3 rounded-lg border border-gray-300 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleDropdown("specializations")}
                >
                  <span>
                    {formData.specializations.length > 0
                      ? formData.specializations.join(", ")
                      : "Select Specializations"}
                  </span>
                  <FaChevronDown
                    className={`transition-transform ${
                      openDropdown === "specializations" ? "transform rotate-180" : ""
                    }`}
                  />
                </div>
                {openDropdown === "specializations" && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-2">
                    {["CS", "AIDS", "AIDS-ML", "MECH", "CIVIL"].map((spec) => (
                      <div key={spec} className="flex items-center p-2 hover:bg-blue-50">
                        <input
                          type="checkbox"
                          id={spec}
                          name="specializations"
                          value={spec}
                          checked={formData.specializations.includes(spec)}
                          onChange={handleMultiSelect}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={spec} className="cursor-pointer">
                          {spec}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Counts & Batches */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Student Count
                    </label>
                    <input
                      type="number"
                      name="studentCount"
                      value={formData.studentCount}
                      onChange={handleChange}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Training Hours
                    </label>
                    <input
                      type="number"
                      name="trainingHours"
                      value={formData.trainingHours}
                      onChange={handleChange}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      required
                    />
                  </div>
                </div>

                {/* Batches */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-800 font-medium">Batch Breakdown</span>
                    <span
                      className={`text-sm font-medium ${
                        getRemainingCount() < 0
                          ? "text-red-500"
                          : getRemainingCount() > 0
                          ? "text-yellow-500"
                          : "text-green-500"
                      }`}
                    >
                      Remaining: {getRemainingCount()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {formData.batches.map((batch, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="w-10 font-medium text-gray-700">
                          {batch.name}:
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={batch.count}
                          onChange={(e) => handleBatchChange(index, e.target.value)}
                          className="flex-1 p-2 bg-white border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addBatch}
                    className="mt-3 px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-md flex items-center hover:bg-blue-200 transition-colors"
                  >
                    <FaPlus className="mr-1" /> Add Batch
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={getRemainingCount() !== 0}
            >
              Initiate Training
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InitiationModal;