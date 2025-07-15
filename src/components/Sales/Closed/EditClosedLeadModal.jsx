import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { db } from "../../../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import PropTypes from "prop-types";

const EditClosedLeadModal = ({ lead, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    city: "",
    collegeCode: "",
    collegeName: "",
    contractEndDate: "",
    contractStartDate: "",
    course: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Initialize form with lead data
  useEffect(() => {
    if (lead) {
      setFormData({
        city: lead.city || "",
        collegeCode: lead.collegeCode || "",
        collegeName: lead.collegeName || "",
        contractEndDate: lead.contractEndDate || "",
        contractStartDate: lead.contractStartDate || "",
        course: lead.course || ""
      });
    }
  }, [lead]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Get the document ID from projectCode
      const docId = lead.projectCode.replace(/\//g, "-");
      const leadRef = doc(db, "trainingForms", docId);

      // Prepare update data
      const updateData = {
        ...formData,
        updatedAt: serverTimestamp()
      };

      await updateDoc(leadRef, updateData);
      
      setSuccess(true);
      setTimeout(() => {
        onSave();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error updating lead:", err);
      setError("Failed to update lead. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">
            Edit Lead Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={isLoading}
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 text-green-600 rounded-md text-sm">
                Lead updated successfully!
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                College Code
              </label>
              <input
                type="text"
                name="collegeCode"
                value={formData.collegeCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                College Name
              </label>
              <input
                type="text"
                name="collegeName"
                value={formData.collegeName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Start Date
              </label>
              <input
                type="date"
                name="contractStartDate"
                value={formData.contractStartDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract End Date
              </label>
              <input
                type="date"
                name="contractEndDate"
                value={formData.contractEndDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course
              </label>
              <select
                name="course"
                value={formData.course}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Course</option>
                <option value="Engineering">Engineering</option>
                <option value="MBA">MBA</option>
                <option value="MCA">MCA</option>
                <option value="BSc">BSc</option>
                <option value="BCom">BCom</option>
                <option value="BA">BA</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-3 flex justify-end border-t">
            <button
              type="button"
              className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                isLoading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EditClosedLeadModal.propTypes = {
  lead: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

export default EditClosedLeadModal;