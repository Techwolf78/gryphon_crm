import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import BatchRow from "./BatchRow";

const COLOR_PALETTE = [
  {
    primary: "bg-blue-600 text-white",
    accent: "bg-blue-50 text-blue-700",
    border: "border-blue-200",
    text: "text-blue-600",
    badge: "bg-blue-100 text-blue-800",
  },
  {
    primary: "bg-green-600 text-white",
    accent: "bg-green-50 text-green-700",
    border: "border-green-200",
    text: "text-green-600",
    badge: "bg-green-100 text-green-800",
  },
  {
    primary: "bg-purple-600 text-white",
    accent: "bg-purple-50 text-purple-700",
    border: "border-purple-200",
    text: "text-purple-600",
    badge: "bg-purple-100 text-purple-800",
  },
];

const DEFAULT_COLORS = {
  primary: "bg-gray-600 text-white",
  accent: "bg-gray-50 text-gray-700",
  border: "border-gray-200",
  text: "text-gray-600",
  badge: "bg-gray-100 text-gray-800",
};

const getSpecializationColors = (specialization, courses) => {
  if (!courses || !specialization) return DEFAULT_COLORS;
  const courseIndex = courses.findIndex(
    (c) => c.specialization === specialization
  );
  return COLOR_PALETTE[courseIndex % COLOR_PALETTE.length] || DEFAULT_COLORS;
};
const getColorsForBatch = (batchName, courses) =>
  getSpecializationColors(batchName, courses);

const BatchDetailsTable = ({
  table1Data,
  setTable1Data,
  selectedDomain,
  commonFields,
  canMergeBatches,
  maxAssignableHours,
  onAssignedHoursChange,
  onSwapTrainer,
  courses,
}) => {
  const [mergeModal, setMergeModal] = useState({
    open: false,
    sourceRowIndex: null,
    targetSpecialization: "",
  });
  const [swapModal, setSwapModal] = useState({ open: false, source: null });
  const [expandedBatch, setExpandedBatch] = useState({});
  const [trainers, setTrainers] = useState([]);

  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "trainers"));
        const trainerList = [];
        querySnapshot.forEach((doc) => {
          trainerList.push({ id: doc.id, ...doc.data() });
        });
        setTrainers(trainerList);
      } catch (error) {
        console.error("Error fetching trainers:", error);
      }
    };
    fetchTrainers();
  }, []);

  const toggleBatchExpansion = (rowIndex) => {
    setExpandedBatch((prev) => ({
      ...prev,
      [rowIndex]: !prev[rowIndex],
    }));
  };

  const getAvailableSpecializations = (sourceRowIndex) => {
    return table1Data
      .filter((_, idx) => idx !== sourceRowIndex)
      .map((row) => row.batch);
  };

  // --- Merge Modal ---
  const handleMergeBatch = (sourceRowIndex, targetSpecialization) => {
    const updatedData = [...table1Data];
    const sourceRow = updatedData[sourceRowIndex];
    const targetRowIndex = updatedData.findIndex(
      (row) => row.batch === targetSpecialization
    );
    if (targetRowIndex === -1) return;
    const targetRow = updatedData[targetRowIndex];
    const combinedStudents = sourceRow.stdCount + targetRow.stdCount;
    const domainHours = targetRow.hrs;
    const mergedBatchCode = `${sourceRow.batch}-${targetRow.batch}-1`;
    const mergedRow = {
      ...targetRow,
      batch: `${sourceRow.batch}+${targetRow.batch}`,
      stdCount: combinedStudents,
      hrs: domainHours,
      assignedHours: domainHours,
      batches: [
        {
          batchPerStdCount: combinedStudents,
          batchCode: mergedBatchCode,
          isMerged: true,
          mergedFrom: `${sourceRow.batch}+${targetRow.batch}`,
          originalData: {
            source: sourceRow,
            target: targetRow,
          },
          assignedHours: domainHours,
          trainers: [],
        },
      ],
    };
    updatedData[targetRowIndex] = mergedRow;
    updatedData.splice(sourceRowIndex, 1);
    setTable1Data(updatedData);
    setMergeModal({
      open: false,
      sourceRowIndex: null,
      targetSpecialization: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Merge Modal */}
      {mergeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Merge Batches
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Merge with:
                </label>
                <select
                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                  value={mergeModal.targetSpecialization}
                  onChange={(e) =>
                    setMergeModal((prev) => ({
                      ...prev,
                      targetSpecialization: e.target.value,
                    }))
                  }
                >
                  <option value="">Select specialization</option>
                  {getAvailableSpecializations(mergeModal.sourceRowIndex).map(
                    (spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() =>
                    setMergeModal({
                      open: false,
                      sourceRowIndex: null,
                      targetSpecialization: "",
                    })
                  }
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleMergeBatch(
                      mergeModal.sourceRowIndex,
                      mergeModal.targetSpecialization
                    )
                  }
                  disabled={!mergeModal.targetSpecialization}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                    mergeModal.targetSpecialization
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-indigo-300 cursor-not-allowed"
                  } transition-colors`}
                >
                  Confirm Merge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Batch Management
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedDomain
                    ? `${selectedDomain} domain`
                    : "Select a domain to configure batches"}
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {table1Data.length > 0 ? (
              table1Data.map((row, rowIndex) => (
                <BatchRow
                  key={rowIndex}
                  row={row}
                  rowIndex={rowIndex}
                  expanded={!!expandedBatch[rowIndex]}
                  toggleBatchExpansion={toggleBatchExpansion}
                  setMergeModal={setMergeModal}
                  setTable1Data={setTable1Data}
                  table1Data={table1Data}
                  selectedDomain={selectedDomain}
                  commonFields={commonFields}
                  maxAssignableHours={maxAssignableHours}
                  onAssignedHoursChange={onAssignedHoursChange}
                  canMergeBatches={canMergeBatches}
                  courses={courses}
                  trainers={trainers}
                  getColorsForBatch={getColorsForBatch}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto h-10 w-10 text-gray-300"></div>
                <h3 className="mt-2 text-xs font-medium text-gray-900">
                  No batches configured
                </h3>
                <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
                  Select a domain and add batches to begin assigning students and
                  trainers.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchDetailsTable;
