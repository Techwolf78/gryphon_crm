import React, { useState } from "react";
import { FaTimes, FaCalendarAlt, FaClock, FaUserAlt, FaChalkboardTeacher } from "react-icons/fa";

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
    batch: ""
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? checked 
          ? [...prev.specializations, value]
          : prev.specializations.filter(item => item !== value)
        : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({ ...training, ...formData });
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-30 flex items-center justify-center z-54 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden border border-gray-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
          <h3 className="font-semibold text-lg">PROJECT CODE: {training.projectCode}</h3>
          <button 
            onClick={onClose} 
            className="text-white hover:text-blue-200 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Modal Body */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Phase Selection */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                  <FaUserAlt className="mr-2 text-blue-500" />
                  Select Phase
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="phase1" 
                      name="phase" 
                      value="phase1"
                      checked={formData.phase === "phase1"}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="phase1" className="text-gray-700">Phase 1</label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="phase2" 
                      name="phase2"
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="phase2" className="text-gray-700">Phase 2</label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="phase3" 
                      name="phase3"
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="phase3" className="text-gray-700">Phase 3</label>
                  </div>
                </div>
              </div>

              {/* Domain Selection */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-3">Select Domain</h4>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="technical" 
                      name="domain" 
                      value="technical"
                      checked={formData.domain === "technical"}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="technical" className="text-gray-700">Technical</label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="splitSkills" 
                      name="domain" 
                      value="splitSkills"
                      checked={formData.domain === "splitSkills"}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="splitSkills" className="text-gray-700">Split Skills</label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="aptitude" 
                      name="domain" 
                      value="aptitude"
                      checked={formData.domain === "aptitude"}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="aptitude" className="text-gray-700">Aptitude</label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="tools" 
                      name="domain" 
                      value="tools"
                      checked={formData.domain === "tools"}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="tools" className="text-gray-700">Tools</label>
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                    <FaCalendarAlt className="mr-2 text-blue-500" />
                    Training Start Date
                  </h4>
                  <input 
                    type="date" 
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                    <FaCalendarAlt className="mr-2 text-blue-500" />
                    Training End Date
                  </h4>
                  <input 
                    type="date" 
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Times Section */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                    <FaClock className="mr-2 text-blue-500" />
                    College Start Time
                  </h4>
                  <input 
                    type="time" 
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                    <FaClock className="mr-2 text-blue-500" />
                    College End Time
                  </h4>
                  <input 
                    type="time" 
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                    <FaClock className="mr-2 text-blue-500" />
                    Lunch Time
                  </h4>
                  <input 
                    type="time" 
                    name="lunchTime"
                    value={formData.lunchTime}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Specialization */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                  <FaChalkboardTeacher className="mr-2 text-blue-500" />
                  Specialization
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="cs" 
                      name="specializations"
                      value="CS"
                      checked={formData.specializations.includes("CS")}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="cs" className="text-gray-700">CS</label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="aids" 
                      name="specializations"
                      value="AIDS"
                      checked={formData.specializations.includes("AIDS")}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="aids" className="text-gray-700">AIDS</label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="aids-ml" 
                      name="specializations"
                      value="AIDS-ML"
                      checked={formData.specializations.includes("AIDS-ML")}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="aids-ml" className="text-gray-700">AIDS-ML</label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="mech" 
                      name="specializations"
                      value="MECH"
                      checked={formData.specializations.includes("MECH")}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="mech" className="text-gray-700">MECH</label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="civil" 
                      name="specializations"
                      value="CIVIL"
                      checked={formData.specializations.includes("CIVIL")}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="civil" className="text-gray-700">CIVIL</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Student Count and Training Info */}
          <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-gray-700 mb-2">Student Count</label>
              <input 
                type="number" 
                name="studentCount"
                value={formData.studentCount}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-gray-700 mb-2">Training Hours</label>
              <input 
                type="number" 
                name="trainingHours"
                value={formData.trainingHours}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-gray-700 mb-2">Batch</label>
              <input 
                type="text" 
                name="batch"
                value={formData.batch}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="bg-gray-100 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
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