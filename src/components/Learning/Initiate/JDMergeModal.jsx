import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { FiX, FiCheck, FiChevronRight } from "react-icons/fi";

function JDMergeModal({ onClose, onProceed }) {
  const [availableColleges, setAvailableColleges] = useState([]);
  const [selectedColleges, setSelectedColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all available colleges from trainingForms collection
  useEffect(() => {
    const fetchAvailableColleges = async () => {
      try {
        setLoading(true);
        const trainingFormsRef = collection(db, "trainingForms");
        const snapshot = await getDocs(trainingFormsRef);

        const colleges = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.collegeName && data.projectCode) {
            colleges.push({
              id: doc.id,
              collegeName: data.collegeName,
              projectCode: data.projectCode,
              collegeCode: data.collegeCode || "",
              status: data.status || "Unknown",
            });
          }
        });

        // Remove duplicates based on projectCode + collegeName
        const uniqueColleges = colleges.filter(
          (college, index, self) =>
            index ===
            self.findIndex(
              (c) =>
                c.projectCode === college.projectCode &&
                c.collegeName === college.collegeName
            )
        );

        setAvailableColleges(uniqueColleges);
      } catch (err) {
        console.error("Error fetching colleges:", err);
        setError("Failed to load available colleges");
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableColleges();
  }, []);

  const handleCollegeToggle = (college) => {
    setSelectedColleges((prev) => {
      const isSelected = prev.some((c) => c.id === college.id);
      if (isSelected) {
        return prev.filter((c) => c.id !== college.id);
      } else {
        return [...prev, college];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedColleges(availableColleges);
  };

  const handleDeselectAll = () => {
    setSelectedColleges([]);
  };

  const handleProceed = () => {
    if (selectedColleges.length === 0) {
      setError("Please select at least one college to proceed");
      return;
    }

    if (selectedColleges.length === 1) {
      setError("Please select at least two colleges for JD merge");
      return;
    }

    onProceed(selectedColleges);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Select Colleges for JD Training Merge
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Choose multiple colleges to merge for online JD training. Trainer costs will be divided equally among selected colleges.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedColleges.length} of {availableColleges.length} colleges selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1 text-xs bg-gray-50 text-gray-700 border border-gray-200 rounded hover:bg-gray-100"
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading colleges...</p>
              </div>
            ) : availableColleges.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No colleges found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {availableColleges.map((college) => {
                  const isSelected = selectedColleges.some((c) => c.id === college.id);
                  return (
                    <div
                      key={college.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-50" : ""
                      }`}
                      onClick={() => handleCollegeToggle(college)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? "bg-blue-600 border-blue-600"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <FiCheck className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {college.collegeName}
                            </div>
                            <div className="text-sm text-gray-600">
                              Project: {college.projectCode}
                              {college.collegeCode && ` | Code: ${college.collegeCode}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              college.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : college.status === "Completed"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {college.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedColleges.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Selected Colleges ({selectedColleges.length}):
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedColleges.map((college) => (
                  <span
                    key={college.id}
                    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {college.collegeName} ({college.projectCode})
                    <button
                      onClick={() => handleCollegeToggle(college)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 text-xs text-blue-700">
                💰 Trainer costs will be divided equally among these {selectedColleges.length} colleges
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProceed}
              disabled={selectedColleges.length < 2}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Merge and Next
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JDMergeModal;