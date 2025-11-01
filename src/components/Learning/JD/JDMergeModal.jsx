import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { FiX, FiCheck, FiChevronRight } from "react-icons/fi";

function JDMergeModal({ onClose, onProceed, preSelectedColleges = [] }) {
  const [availableColleges, setAvailableColleges] = useState([]);
  const [selectedColleges, setSelectedColleges] = useState(preSelectedColleges);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [existingConfig, setExistingConfig] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

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
      } catch {

        setError("Failed to load available colleges");
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableColleges();
  }, []);

  // Check for existing merged configuration when colleges are selected
  const checkExistingMergedConfig = async (colleges) => {
    if (colleges.length < 2) {
      setExistingConfig(null);
      return;
    }

    try {
      setCheckingExisting(true);
      setError(null);

      // Sort colleges by ID for consistent comparison
      const sortedSelectedIds = colleges.map(c => c.id).sort();

      // Check each selected college for merged JD training
      for (const college of colleges) {
        try {
          const jdDocRef = doc(db, "trainingForms", college.id, "trainings", "JD");
          const jdDocSnap = await getDoc(jdDocRef);

          if (jdDocSnap.exists()) {
            const jdData = jdDocSnap.data();

            // Check if this is a merged training
            if (jdData.isMergedTraining && jdData.mergedColleges) {
              // Sort the merged college IDs for comparison
              const sortedMergedIds = jdData.mergedColleges.map(c => c.id).sort();

              // Check if the merged colleges match exactly with selected colleges
              if (sortedMergedIds.length === sortedSelectedIds.length &&
                  sortedMergedIds.every(id => sortedSelectedIds.includes(id))) {
                
                // Found matching merged configuration - now fetch domain data
                try {
                  const domainDocRef = doc(db, "trainingForms", college.id, "trainings", "JD", "domains", "JD");
                  const domainDocSnap = await getDoc(domainDocRef);
                  const domainData = domainDocSnap.exists() ? domainDocSnap.data() : {};

                  setExistingConfig({
                    operationsConfig: jdData.operationsConfig,
                    commonFields: {
                      trainingStartDate: jdData.trainingStartDate,
                      trainingEndDate: jdData.trainingEndDate,
                      collegeStartTime: jdData.collegeStartTime,
                      collegeEndTime: jdData.collegeEndTime,
                      lunchStartTime: jdData.lunchStartTime,
                      lunchEndTime: jdData.lunchEndTime,
                    },
                    customPhaseHours: { JD: jdData.customHours || "" },
                    table1DataByDomain: {
                      JD: domainData.table1Data || []
                    },
                    mergedColleges: jdData.mergedColleges
                  });
                  return;
                } catch (domainErr) {
                  console.warn(`Error fetching domain data for college ${college.id}:`, domainErr);
                  // Continue without domain data
                  setExistingConfig({
                    operationsConfig: jdData.operationsConfig,
                    commonFields: {
                      trainingStartDate: jdData.trainingStartDate,
                      trainingEndDate: jdData.trainingEndDate,
                      collegeStartTime: jdData.collegeStartTime,
                      collegeEndTime: jdData.collegeEndTime,
                      lunchStartTime: jdData.lunchStartTime,
                      lunchEndTime: jdData.lunchEndTime,
                    },
                    customPhaseHours: { JD: jdData.customHours || "" },
                    table1DataByDomain: {
                      JD: []
                    },
                    mergedColleges: jdData.mergedColleges
                  });
                  return;
                }
              }
            }
          }
        } catch (collegeErr) {
          // Continue checking other colleges
          console.warn(`Error checking college ${college.id}:`, collegeErr);
        }
      }

      // No matching merged configuration found
      setExistingConfig(null);
      } catch (err) {
      console.error("Error checking existing merged config:", err);
      setError("Failed to check for existing configurations");
    } finally {
      setCheckingExisting(false);
    }
  };

  // Effect to check for existing config when selection changes
  useEffect(() => {
    if (selectedColleges.length > 0 && !loading) {
      checkExistingMergedConfig(selectedColleges);
    } else {
      setExistingConfig(null);
    }
  }, [selectedColleges, loading]);

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

    onProceed(selectedColleges, existingConfig);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full  bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Select Colleges for JD Training
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Choose one or more colleges for JD training. {selectedColleges.length > 1 ? 'Trainer costs will be divided equally among selected colleges.' : 'Trainer costs will be assigned to the selected college.'}
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

          {existingConfig && !checkingExisting && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              <div className="flex items-center">
                <FiCheck className="w-4 h-4 mr-2" />
                <span className="font-medium">Existing Configuration Found!</span>
              </div>
              <p className="mt-1 text-xs">
                Previous JD training configuration for these colleges has been loaded and will be pre-filled in the next steps.
              </p>
            </div>
          )}

          {checkingExisting && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span>Checking for existing configurations...</span>
              </div>
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
                💰 Trainer costs will be {selectedColleges.length > 1 ? `divided equally among these ${selectedColleges.length} colleges` : 'assigned to this college'}
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
              disabled={selectedColleges.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {selectedColleges.length > 1 ? 'Merge and Next' : 'Next'}
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JDMergeModal;
