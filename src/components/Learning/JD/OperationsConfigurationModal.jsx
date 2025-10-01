import React, { useState, useEffect } from "react";
import { FiX, FiChevronRight, FiUsers, FiLayers, FiChevronLeft } from "react-icons/fi";

const OperationsConfigurationModal = ({
  selectedColleges = [],
  onClose,
  onProceed,
  existingConfig = null,
  isEditing = false,
  onBack = null
}) => {
  const [collegeStudentCounts, setCollegeStudentCounts] = useState({});
  const [numBatches, setNumBatches] = useState(1);
  const [batchNames, setBatchNames] = useState({});
  const [errors, setErrors] = useState({});

  // Initialize student counts and batch names
  useEffect(() => {
    if (isEditing && existingConfig) {
      // Load existing configuration for editing
      setCollegeStudentCounts(existingConfig.collegeStudentCounts || {});
      setNumBatches(existingConfig.numBatches || 1);
      const batchNamesMap = {};
      (existingConfig.batches || []).forEach(batch => {
        batchNamesMap[batch.id] = batch.name;
      });
      setBatchNames(batchNamesMap);
    } else {
      // Initialize fresh form
      const initialCounts = {};
      const initialBatchNames = {};

      selectedColleges.forEach((college) => {
        initialCounts[college.id] = "";
      });

      // Initialize with default 1 batch
      initialBatchNames[`batch_1`] = `Batch 1`;

      setCollegeStudentCounts(initialCounts);
      setBatchNames(initialBatchNames);
    }
  }, [selectedColleges, isEditing, existingConfig]);

  const handleStudentCountChange = (collegeId, value) => {
    // Only allow positive numbers
    if (value === "" || /^\d+$/.test(value)) {
      setCollegeStudentCounts(prev => ({
        ...prev,
        [collegeId]: value
      }));
      // Clear error for this college
      if (errors[collegeId]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[collegeId];
          return newErrors;
        });
      }
    }
  };

  const handleBatchNameChange = (batchKey, value) => {
    setBatchNames(prev => ({
      ...prev,
      [batchKey]: value
    }));
  };

  const handleNumBatchesChange = (value) => {
    const newNum = parseInt(value) || 1;
    setNumBatches(newNum);

    // Update batch names
    const newBatchNames = {};
    for (let i = 1; i <= newNum; i++) {
      newBatchNames[`batch_${i}`] = batchNames[`batch_${i}`] || `Batch ${i}`;
    }
    setBatchNames(newBatchNames);
  };

  const validateForm = () => {
    const newErrors = {};
    let hasErrors = false;

    // Check if all colleges have student counts
    selectedColleges.forEach(college => {
      if (!collegeStudentCounts[college.id] || collegeStudentCounts[college.id] === "") {
        newErrors[college.id] = "Student count is required";
        hasErrors = true;
      } else if (parseInt(collegeStudentCounts[college.id]) <= 0) {
        newErrors[college.id] = "Student count must be greater than 0";
        hasErrors = true;
      }
    });

    // Check if batch names are provided
    Object.entries(batchNames).forEach(([key, name]) => {
      if (!name || name.trim() === "") {
        newErrors[key] = "Batch name is required";
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleProceed = () => {
    if (!validateForm()) return;

    // Calculate total students
    const totalStudents = selectedColleges.reduce((total, college) => {
      return total + parseInt(collegeStudentCounts[college.id] || 0);
    }, 0);

    // Prepare batch configuration
    const batches = Object.entries(batchNames).map(([key, name]) => ({
      id: key,
      name: name.trim(),
      code: name.trim().toLowerCase().replace(/\s+/g, '_')
    }));

    const configuration = {
      collegeStudentCounts,
      totalStudents,
      numBatches,
      batches
    };

    onProceed(configuration);
  };

  const totalStudents = selectedColleges.reduce((total, college) => {
    return total + parseInt(collegeStudentCounts[college.id] || 0);
  }, 0);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {isEditing ? "View/Edit Operations Configuration" : "Operations Configuration"}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {isEditing
                  ? "Review and modify the operations configuration for this merged training"
                  : "Configure student counts and batches for merged training"
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onBack}
                disabled={!onBack}
                className={`flex items-center px-3 py-1 rounded text-sm font-medium transition-colors ${
                  onBack 
                    ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' 
                    : 'text-gray-400 cursor-not-allowed'
                }`}
                title={onBack ? "Back to College Selection" : "Back button not available"}
              >
                <FiChevronLeft className="w-4 h-4 mr-1" />
                Back
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Selected Colleges Summary */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Selected Colleges for Merged Training
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedColleges.map((college) => (
                <span
                  key={college.id}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                >
                  {college.collegeName} ({college.projectCode})
                </span>
              ))}
            </div>
          </div>

          {/* Student Count Configuration */}
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <FiUsers className="w-4 h-4 text-gray-600 mr-2" />
              <h4 className="text-sm font-medium text-gray-900">
                Student Count per College
              </h4>
            </div>
            <div className="space-y-3">
              {selectedColleges.map((college) => (
                <div key={college.id} className="flex items-center space-x-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {college.collegeName}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={collegeStudentCounts[college.id] || ""}
                      onChange={(e) => handleStudentCountChange(college.id, e.target.value)}
                      placeholder="Enter student count"
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors[college.id] ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors[college.id] && (
                      <p className="text-xs text-red-600 mt-1">{errors[college.id]}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {totalStudents > 0 && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                Total Students: <strong>{totalStudents}</strong>
              </div>
            )}
          </div>

          {/* Batch Configuration */}
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <FiLayers className="w-4 h-4 text-gray-600 mr-2" />
              <h4 className="text-sm font-medium text-gray-900">
                Batch Configuration
              </h4>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Number of Batches
              </label>
              <select
                value={numBatches}
                onChange={(e) => handleNumBatchesChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>{num} Batch{num > 1 ? 'es' : ''}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Batch Names
              </label>
              {Object.entries(batchNames).map(([key, name]) => (
                <div key={key} className="flex items-center space-x-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleBatchNameChange(key, e.target.value)}
                      placeholder={`Enter batch name`}
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors[key] ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors[key] && (
                      <p className="text-xs text-red-600 mt-1">{errors[key]}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Division Explanation */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">
              💰 Cost Division Formula
            </h4>
            <p className="text-xs text-yellow-800 leading-relaxed">
              Trainer costs will be divided based on student count:<br/>
              <strong>Per Student Cost = Total Trainer Cost ÷ Total Students</strong><br/>
              <strong>College Cost = Per Student Cost × College Student Count</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleProceed}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium flex items-center"
            >
              Proceed to JD Configuration
              <FiChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsConfigurationModal;