import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import {
  FiPlus,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiUser,
  FiClock,
  FiLayers,
} from "react-icons/fi";

const DAY_DURATION_OPTIONS = ["AM", "PM", "AM & PM"];
// Color palette options (can be expanded)

const BatchDetailsTable = ({
  table1Data,
  setTable1Data,
  selectedDomain,
  commonFields,
  canMergeBatches,
  maxAssignableHours, // <-- add this
  onAssignedHoursChange, // <-- add this
  onSwapTrainer, // <-- add this
  courses,
}) => {
  const [mergeModal, setMergeModal] = useState({
    open: false,
    sourceRowIndex: null,
    targetSpecialization: "",
  });
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
    // Add more color options as needed
  ];

  // Default color scheme
  const DEFAULT_COLORS = {
    primary: "bg-gray-600 text-white",
    accent: "bg-gray-50 text-gray-700",
    border: "border-gray-200",
    text: "text-gray-600",
    badge: "bg-gray-100 text-gray-800",
  };

  // Helper function to generate consistent colors for specializations
  const getSpecializationColors = (specialization, courses) => {
    if (!courses || !specialization) return DEFAULT_COLORS;

    // Find the course index to assign consistent color
    const courseIndex = courses.findIndex(
      (c) => c.specialization === specialization
    );

    return COLOR_PALETTE[courseIndex % COLOR_PALETTE.length] || DEFAULT_COLORS;
  };
  const getColorsForBatch = (batchName) => {
    return getSpecializationColors(batchName, courses);
  };

  const [trainers, setTrainers] = useState([]);
  const [expandedTrainer, setExpandedTrainer] = useState({});
  const didAutoExpand = useRef(false);

  const [expandedBatch, setExpandedBatch] = useState({});
  const [swapModal, setSwapModal] = useState({ open: false, source: null });

  // Color palette
  const colors = {
    primary: "bg-indigo-600 text-white",
    secondary: "bg-gray-100 text-gray-700",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-rose-100 text-rose-800",
    info: "bg-blue-100 text-blue-800",
    accent: "bg-indigo-50 text-indigo-700",
  };
const isTrainerAvailable = (trainerId, date, dayDuration, excludeTrainerKey = null, currentBatchKey = null) => {
  // Check if this trainer is already assigned to any batch (including current batch)
  for (let rowIdx = 0; rowIdx < table1Data.length; rowIdx++) {
    const row = table1Data[rowIdx];
    for (let batchIdx = 0; batchIdx < row.batches.length; batchIdx++) {
      const batch = row.batches[batchIdx];
      const batchKey = `${rowIdx}-${batchIdx}`;
      
      // Skip checking same batch if currentBatchKey is provided
      if (currentBatchKey && batchKey === currentBatchKey) continue;
      
      for (let trainerIdx = 0; trainerIdx < batch.trainers.length; trainerIdx++) {
        const trainer = batch.trainers[trainerIdx];
        const currentKey = `${rowIdx}-${batchIdx}-${trainerIdx}`;
        
        if (excludeTrainerKey === currentKey) continue;
        
        if (
          trainer.trainerId === trainerId &&
          trainer.dayDuration === dayDuration &&
          trainer.startDate &&
          trainer.endDate &&
          new Date(date) >= new Date(trainer.startDate) &&
          new Date(date) <= new Date(trainer.endDate)
        ) {
          return false; // Trainer is already booked
        }
      }
    }
  }
  return true;
};
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

  const generateBatchCode = (specialization, index) => {
    return `${specialization}${index}`;
  };

  // When adding a batch, assignedHours for new batches should match batch 1's assignedHours
  const addBatch = (rowIndex) => {
    const updatedData = [...table1Data];
    const batches = updatedData[rowIndex].batches;
    const batch1AssignedHours =
      batches.length > 0 ? batches[0].assignedHours : 0;
    const newBatchIndex = batches.length;
    updatedData[rowIndex].batches.push({
      batchPerStdCount: "",
      batchCode: generateBatchCode(
        updatedData[rowIndex].batch,
        newBatchIndex + 1
      ),
      assignedHours: batch1AssignedHours, // always match batch 1's assigned hours
      trainers: [],
    });
    setTable1Data(updatedData);
  };

  const removeBatch = (rowIndex, batchIndex) => {
    if (table1Data[rowIndex].batches.length <= 1) return;

    const updatedData = [...table1Data];
    updatedData[rowIndex].batches.splice(batchIndex, 1);

    updatedData[rowIndex].batches = updatedData[rowIndex].batches.map(
      (batch, idx) => ({
        ...batch,
        batchCode: generateBatchCode(updatedData[rowIndex].batch, idx + 1),
      })
    );

    setTable1Data(updatedData);
  };

  const handleMergeBatch = (sourceRowIndex, targetSpecialization) => {
    const updatedData = [...table1Data];
    const sourceRow = updatedData[sourceRowIndex];
    const targetRowIndex = updatedData.findIndex(
      (row) => row.batch === targetSpecialization
    );

    if (targetRowIndex === -1) return;

    const targetRow = updatedData[targetRowIndex];

    // Only add students, keep hours same as domain
    const combinedStudents = sourceRow.stdCount + targetRow.stdCount;
    const domainHours = targetRow.hrs; // Keep hours as per domain

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
  // When changing assignedHours for a batch, never allow sum to exceed row.hrs
  const handleBatchChange = (rowIndex, batchIndex, field, value) => {
    const updatedData = [...table1Data];
    const currentRow = updatedData[rowIndex];

    if (field === "batchPerStdCount") {
      const inputValue = Number(value);
      const otherBatchTotal = currentRow.batches.reduce((acc, batch, idx) => {
        return idx === batchIndex
          ? acc
          : acc + Number(batch.batchPerStdCount || 0);
      }, 0);
      const maxAllowed = currentRow.stdCount - otherBatchTotal;
      const finalValue = inputValue > maxAllowed ? maxAllowed : inputValue;
      currentRow.batches[batchIndex][field] = finalValue;
    } else if (field === "assignedHours") {
      let val = Number(value);
      if (val > currentRow.hrs) val = currentRow.hrs;
      currentRow.batches[batchIndex][field] = val;
      // If batch 1, update all other batches to match
      if (batchIndex === 0) {
        currentRow.batches.forEach((batch, idx) => {
          if (idx !== 0) batch.assignedHours = val;
        });
      }
    } else {
      currentRow.batches[batchIndex][field] = value;
    }

    setTable1Data(updatedData);
  };

const addTrainer = (rowIndex, batchIndex) => {
  const updated = [...table1Data];
  const batch = updated[rowIndex].batches[batchIndex];
  if (!batch.trainers) batch.trainers = [];
  
  batch.trainers.push({
    trainerId: "",
    trainerName: "",
    assignedHours: "",
    dayDuration: "",
    startDate: "",
    endDate: "",
    dailyHours: [],
  });
  setTable1Data(updated);
};
  const removeTrainer = (rowIndex, batchIndex, trainerIdx) => {
    const updated = [...table1Data];
    const batch = updated[rowIndex].batches[batchIndex];
    if (!batch.trainers) batch.trainers = [];
    batch.trainers.splice(trainerIdx, 1);
    setTable1Data(updated);
  };

  const getTrainingHoursPerDay = (commonFields) => {
    if (
      !commonFields.collegeStartTime ||
      !commonFields.collegeEndTime ||
      !commonFields.lunchStartTime ||
      !commonFields.lunchEndTime
    )
      return 0;

    const toMinutes = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + (m || 0);
    };
    const collegeStart = toMinutes(commonFields.collegeStartTime);
    const collegeEnd = toMinutes(commonFields.collegeEndTime);
    const lunchStart = toMinutes(commonFields.lunchStartTime);
    const lunchEnd = toMinutes(commonFields.lunchEndTime);

    let total = collegeEnd - collegeStart - (lunchEnd - lunchStart);
    return total > 0 ? +(total / 60).toFixed(2) : 0;
  };

const handleTrainerField = (rowIndex, batchIndex, trainerIdx, field, value) => {
  const updated = [...table1Data];
  const batch = updated[rowIndex].batches[batchIndex];
  const trainer = batch.trainers[trainerIdx];

  // Create tempTrainer with new value
  const tempTrainer = { ...trainer, [field]: value };

  if (["dayDuration", "startDate", "endDate"].includes(field)) {
    if (!tempTrainer.dayDuration || !tempTrainer.startDate || !tempTrainer.endDate) {
      // Not enough data yet to check conflict
      trainer[field] = value;
      setTable1Data(updated);
      return;
    }

    // Prepare dates
    const normalizeDate = (dateStr) => new Date(dateStr).toISOString().slice(0,10);
    const newTrainerDates = getDateListExcludingSundays(tempTrainer.startDate, tempTrainer.endDate);
    const newTrainerDatesNormalized = newTrainerDates.map(normalizeDate);

    const hasConflict = batch.trainers.some((t, idx) => {
      if (idx === trainerIdx) return false;
      if (t.dayDuration !== tempTrainer.dayDuration) return false;

      const existingDates = t.activeDates || getDateListExcludingSundays(t.startDate, t.endDate);
      const existingDatesNormalized = existingDates.map(normalizeDate);

      return newTrainerDatesNormalized.some(date => existingDatesNormalized.includes(date));
    });

    if (hasConflict) {
      alert(`This batch already has a trainer for ${tempTrainer.dayDuration} slot on overlapping dates.`);
      return;
    }
  }

  // No conflict, update the field
  trainer[field] = value;

  // Then update derived fields if needed
  if (["dayDuration", "startDate", "endDate"].includes(field)) {
    const perDay = getTrainingHoursPerDay(commonFields);
    let perDayHours = 0;
    if (trainer.dayDuration === "AM & PM") perDayHours = perDay;
    else if (trainer.dayDuration === "AM" || trainer.dayDuration === "PM")
      perDayHours = +(perDay / 2).toFixed(2);

    const dateList = getDateListExcludingSundays(trainer.startDate, trainer.endDate);
    trainer.activeDates = dateList;
    trainer.dailyHours = dateList.map(() => perDayHours);
    trainer.assignedHours = trainer.dailyHours.reduce((a, b) => a + Number(b || 0), 0);
  }

  if (field === "trainerId") {
    const tr = trainers.find((t) => t.trainerId === value);
    trainer.trainerName = tr?.name || "";
    trainer.perHourCost = tr?.paymentType === "Per Hour" ? tr?.charges : 0;
  }

  setTable1Data(updated);
};


  const getAvailableSpecializations = (sourceRowIndex) => {
    return table1Data
      .filter((_, idx) => idx !== sourceRowIndex)
      .map((row) => row.batch);
  };

  const getDateListExcludingSundays = (start, end) => {
    if (!start || !end) return [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dates = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      if (current.getDay() !== 0) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const toggleBatchExpansion = (rowIndex) => {
    setExpandedBatch((prev) => ({
      ...prev,
      [rowIndex]: !prev[rowIndex],
    }));
  };

  const toggleTrainerExpansion = (trainerKey) => {
    setExpandedTrainer((prev) => ({
      ...prev,
      [trainerKey]: !prev[trainerKey],
    }));
  };

  const handleTotalHoursChange = (rowIndex, batchIndex, trainerIdx, value) => {
    const updated = [...table1Data];
    const t = updated[rowIndex].batches[batchIndex].trainers[trainerIdx];
    const days = t.dailyHours ? t.dailyHours.length : 0;
    let total = Number(value);

    if (days > 0) {
      const equal = Math.floor(total / days);
      const remainder = total - equal * days;
      t.dailyHours = Array(days).fill(equal);
      t.dailyHours[days - 1] += remainder;
      t.assignedHours = t.dailyHours.reduce((a, b) => a + Number(b || 0), 0);
    } else {
      t.assignedHours = total;
    }
    setTable1Data(updated);
  };

  const openSwapModal = (rowIdx, batchIdx, trainerIdx) => {
    setSwapModal({ open: true, source: { rowIdx, batchIdx, trainerIdx } });
  };

  const closeSwapModal = () => setSwapModal({ open: false, source: null });

  const handleSwap = (target) => {
    if (!swapModal.source || !target) return;

    const source = swapModal.source;
    const sourceTrainer =
      table1Data[source.rowIdx].batches[source.batchIdx].trainers[
        source.trainerIdx
      ];
    const targetTrainer =
      table1Data[target.rowIdx].batches[target.batchIdx].trainers[
        target.trainerIdx
      ];

    // Check if target trainer is available in source's time slot
    const isTargetAvailable = isTrainerAvailable(
      targetTrainer.trainerId,
      sourceTrainer.startDate,
      sourceTrainer.dayDuration,
      `${target.rowIdx}-${target.batchIdx}-${target.trainerIdx}`
    );

    // Check if source trainer is available in target's time slot
    const isSourceAvailable = isTrainerAvailable(
      sourceTrainer.trainerId,
      targetTrainer.startDate,
      targetTrainer.dayDuration,
      `${source.rowIdx}-${source.batchIdx}-${source.trainerIdx}`
    );

    if (!isTargetAvailable || !isSourceAvailable) {
      alert(
        "One or both trainers are not available for the swap due to scheduling conflicts"
      );
      return;
    }

    if (onSwapTrainer) {
      onSwapTrainer(swapModal.source, target);
    }
    closeSwapModal();
  };

  // Find all AM trainers except the source
  const getAMTrainers = () => {
    const list = [];
    table1Data.forEach((row, rowIdx) => {
      row.batches.forEach((batch, batchIdx) => {
        batch.trainers.forEach((trainer, trainerIdx) => {
          // Exclude trainers who are already busy in PM slot on same date
          const isBusyInPM = batch.trainers.some(
            (t, idx) =>
              t.trainerId === trainer.trainerId &&
              t.dayDuration === "PM" &&
              idx !== trainerIdx
          );
          if (
            trainer.dayDuration === "AM" &&
            !isBusyInPM &&
            !(
              swapModal.source &&
              swapModal.source.rowIdx === rowIdx &&
              swapModal.source.batchIdx === batchIdx &&
              swapModal.source.trainerIdx === trainerIdx
            )
          ) {
            list.push({
              rowIdx,
              batchIdx,
              trainerIdx,
              batchCode: batch.batchCode,
              trainerName: trainer.trainerName,
            });
          }
        });
      });
    });
    return list;
  };

  useEffect(() => {
    // Convert all trainer.activeDates from string to Date objects if needed
    if (!table1Data || table1Data.length === 0) return;

    let changed = false;
    const updated = table1Data.map(row => ({
      ...row,
      batches: row.batches.map(batch => ({
        ...batch,
        trainers: (batch.trainers || []).map(trainer => {
          if (
            trainer.activeDates &&
            typeof trainer.activeDates[0] === "string"
          ) {
            changed = true;
            return {
              ...trainer,
              activeDates: trainer.activeDates.map(d => new Date(d)),
            };
          }
          return trainer;
        }),
      })),
    }));

    if (changed) setTable1Data(updated);
    // eslint-disable-next-line
  }, [table1Data]);

  useEffect(() => {
    // Only auto-expand ONCE (on first load)
    if (!didAutoExpand.current && table1Data && table1Data.length > 0) {
      const expanded = {};
      table1Data.forEach((row, rowIdx) => {
        row.batches.forEach((batch, batchIdx) => {
          (batch.trainers || []).forEach((trainer, trainerIdx) => {
            if (
              trainer &&
              (trainer.assignedHours > 0 ||
                (trainer.activeDates && trainer.activeDates.length > 0))
            ) {
              expanded[`${rowIdx}-${batchIdx}-${trainerIdx}`] = true;
            }
          });
        });
      });
      setExpandedTrainer(expanded);
      didAutoExpand.current = true;
    }
    // eslint-disable-next-line
  }, [table1Data]);


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

      {/* Swap Modal */}
      {/* Swap Modal */}
{swapModal.open && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl"> {/* Increased max width */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Select AM Trainer to Swap With
      </h3>
      <ul className="mb-4 max-h-96 overflow-y-auto">
        {getAMTrainers().map((t, idx) => {
          // Get the trainer's details
          const trainerDetails = table1Data[t.rowIdx].batches[t.batchIdx].trainers[t.trainerIdx];
          const startDate = trainerDetails.startDate ? new Date(trainerDetails.startDate).toLocaleDateString() : 'No start date';
          const endDate = trainerDetails.endDate ? new Date(trainerDetails.endDate).toLocaleDateString() : 'No end date';
          
          return (
            <li key={idx} className="flex justify-between items-center py-3 px-4 border-b hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <span className="font-medium truncate">
                    {t.trainerName} ({t.trainerId})
                  </span>
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                    {trainerDetails.dayDuration}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  <span className="block sm:inline">Batch: {t.batchCode}</span>
                  <span className="hidden sm:inline mx-2">•</span>
                  <span className="block sm:inline">
                    Dates: {startDate} to {endDate}
                  </span>
                </div>
              </div>
              <button
                className="ml-4 px-3 py-1 bg-indigo-600 text-white rounded text-sm whitespace-nowrap hover:bg-indigo-700 transition-colors"
                onClick={() => handleSwap(t)}
              >
                Swap
              </button>
            </li>
          );
        })}
        {getAMTrainers().length === 0 && (
          <li className="text-gray-400 py-4 text-center">
            No other AM trainers available for swapping.
          </li>
        )}
      </ul>
      <div className="flex justify-end">
        <button
          className="mt-2 px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          onClick={closeSwapModal}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

      {/* Main Batch Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Batch Management
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDomain
                  ? `${selectedDomain} domain`
                  : "Select a domain to configure batches"}
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {table1Data.length > 0 ? (
            table1Data.map((row, rowIndex) => {
              const totalAssignedStudents = row.batches.reduce(
                (sum, b) => sum + Number(b.batchPerStdCount || 0),
                0
              );
              const totalAssignedHours = row.batches.reduce(
                (sum, b) => sum + Number(b.assignedHours || 0),
                0
              );
              const isExpanded = expandedBatch[rowIndex];
              return (
                <div key={rowIndex} className="transition-all duration-200">
                  {/* Batch Header */}
                  <div
                    className={`px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
                      isExpanded ? "bg-gray-50" : ""
                    }`}
                    onClick={() => toggleBatchExpansion(rowIndex)}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          getColorsForBatch(row.batch).accent
                        }`}
                      >
                        {rowIndex + 1}
                      </div>
                      <div>
                        <h4
                          className={`font-medium ${
                            getColorsForBatch(row.batch).text
                          }`}
                        >
                          {row.batch}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center">
                            <FiUser className="mr-1.5" /> {row.stdCount}{" "}
                            students
                          </span>
                          <span className="flex items-center">
                            <FiClock className="mr-1.5" /> {row.hrs} hours
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          getColorsForBatch(row.batch).badge
                        }`}
                      >
                        {totalAssignedStudents}/{row.stdCount} students
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          getColorsForBatch(row.batch).badge
                        }`}
                      >
                        {totalAssignedHours}/{row.hrs} hours
                      </div>
                      {/* ... rest of buttons ... */}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          totalAssignedStudents === row.stdCount
                            ? colors.success
                            : totalAssignedStudents > row.stdCount
                            ? colors.danger
                            : colors.warning
                        }`}
                      >
                        {totalAssignedStudents}/{row.stdCount} students
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          totalAssignedHours === row.hrs
                            ? colors.success
                            : totalAssignedHours > row.hrs
                            ? colors.danger
                            : colors.warning
                        }`}
                      >
                        {totalAssignedHours}/{row.hrs} hours
                      </div>
                      {/* Add Batch Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addBatch(rowIndex);
                        }}
                        className={`p-1.5 rounded-lg hover:bg-gray-100 ${
                          getColorsForBatch(row.batch).text
                        } hover:text-indigo-600 transition-colors`}
                        title="Add Batch"
                        type="button"
                      >
                        <FiPlus />
                      </button>
                      {/* --- MERGE BUTTON --- */}
                      {canMergeBatches && table1Data.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMergeModal({
                              open: true,
                              sourceRowIndex: rowIndex,
                              targetSpecialization: "",
                            });
                          }}
                          className={`p-1.5 rounded-lg hover:bg-gray-100 ${
                            getColorsForBatch(row.batch).text
                          } hover:text-indigo-600 transition-colors`}
                          title="Merge with another specialization"
                          type="button"
                        >
                          <FiLayers />
                        </button>
                      )}
                      {isExpanded ? (
                        <FiChevronUp className="text-gray-400" />
                      ) : (
                        <FiChevronDown className="text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Batch Content */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-6">
                      {row.batches.map((batch, batchIndex) => (
                        <div
                          className={`bg-white rounded-lg border ${
                            getColorsForBatch(row.batch).border
                          } shadow-xs overflow-hidden`}
                        >
                          <div
                            className={`px-4 py-3 ${
                              getColorsForBatch(row.batch).accent
                            } border-b ${
                              getColorsForBatch(row.batch).border
                            } flex justify-between items-center`}
                          >
                            <span
                              className={`font-medium text-sm ${
                                getColorsForBatch(row.batch).text
                              }`}
                            >
                              Batch {batchIndex + 1}
                            </span>
                            <div className="flex space-x-2">
                              {row.batches.length > 1 && (
                                <button
                                  onClick={() =>
                                    removeBatch(rowIndex, batchIndex)
                                  }
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"
                                  title="Remove Batch"
                                  type="button"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="p-4 space-y-4">
                            {/* Batch Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                  Students
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                  value={batch.batchPerStdCount || ""}
                                  onChange={(e) =>
                                    handleBatchChange(
                                      rowIndex,
                                      batchIndex,
                                      "batchPerStdCount",
                                      e.target.value.replace(/\D/g, "")
                                    )
                                  }
                                  min="0"
                                  max={row.stdCount}
                                  placeholder="0"
                                  disabled={batch.isMerged}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                  Batch Code
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                  value={batch.batchCode || ""}
                                  onChange={(e) =>
                                    handleBatchChange(
                                      rowIndex,
                                      batchIndex,
                                      "batchCode",
                                      e.target.value
                                    )
                                  }
                                  disabled={batch.isMerged}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                  Assigned Hours
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                  value={
                                    batch.assignedHours === undefined ||
                                    batch.assignedHours === null
                                      ? ""
                                      : batch.assignedHours
                                  }
                                  onChange={(e) => {
                                    if (batchIndex === 0) {
                                      let val = e.target.value.replace(
                                        /\D/g,
                                        ""
                                      );
                                      handleBatchChange(
                                        rowIndex,
                                        batchIndex,
                                        "assignedHours",
                                        val
                                      );
                                      if (onAssignedHoursChange)
                                        onAssignedHoursChange(val);
                                    }
                                  }}
                                  min="0"
                                  max={maxAssignableHours}
                                  placeholder="0"
                                  disabled={batchIndex !== 0}
                                />
                              </div>
                            </div>

                            {/* Trainers Section */}
                            <div>
                              <div className="flex justify-between items-center mb-3 ">
                                <h5 className="text-sm font-medium text-gray-700">
                                  Trainers
                                </h5>
                                <button
                                  onClick={() =>
                                    addTrainer(rowIndex, batchIndex)
                                  }
                                  className="text-xs flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
                                  type="button"
                                >
                                  <FiPlus className="mr-1" size={12} /> Add
                                  Trainer
                                </button>
                              </div>

                              {batch.trainers && batch.trainers.length > 0 && (
                                <div className="mb-2">
                                  {(() => {
                                    const assigned = Number(
                                      batch.assignedHours || 0
                                    );
                                    const trainersTotal = (
                                      batch.trainers || []
                                    ).reduce(
                                      (sum, t) =>
                                        sum + Number(t.assignedHours || 0),
                                      0
                                    );
                                    const percent =
                                      assigned > 0
                                        ? Math.min(
                                            100,
                                            Math.round(
                                              (trainersTotal / assigned) * 100
                                            )
                                          )
                                        : 0;
                                    const remaining = assigned - trainersTotal;
                                    return (
                                      <div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                                          <div
                                            className={`h-2.5 rounded-full transition-all duration-300 ${
                                              percent === 100
                                                ? "bg-emerald-500"
                                                : percent > 100
                                                ? "bg-rose-500"
                                                : "bg-amber-500"
                                            }`}
                                            style={{ width: `${percent}%` }}
                                          />
                                        </div>
                                        <div
                                          className={`text-xs font-medium ${
                                            remaining > 0
                                              ? "text-amber-600"
                                              : remaining < 0
                                              ? "text-rose-600"
                                              : "text-emerald-700"
                                          }`}
                                        >
                                          {remaining > 0
                                            ? `${remaining} hrs remaining to assign to trainers`
                                            : remaining < 0
                                            ? `${-remaining} hrs extra assigned to trainers`
                                            : "All assigned hours distributed to trainers"}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}

                              {(batch.trainers || []).length > 0 ? (
                                <div className="space-y-3">
                                  {(batch.trainers || []).map(
                                    (trainer, trainerIdx) => {
                                      const trainerKey = `${rowIndex}-${batchIndex}-${trainerIdx}`;
                                      const isTrainerExpanded =
                                        expandedTrainer[trainerKey];
                                      const dateList =
                                        getDateListExcludingSundays(
                                          trainer.startDate,
                                          trainer.endDate
                                        );

                                      return (
                                        <div
                                          key={trainerIdx}
                                          className={`border border-gray-200 rounded-lg overflow-hidden ${
                                            getColorsForBatch(row.batch).border
                                          } rounded-lg overflow-hidden`}
                                        >
                                          <div
                                            className={`px-3 py-2 ${
                                              getColorsForBatch(row.batch)
                                                .accent
                                            } flex items-center justify-between`}
                                          >
                                            {" "}
                                            <div className="flex items-center space-x-2">
                                              <FiUser
                                                className="text-gray-500"
                                                size={14}
                                              />
                                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                <div>
                                                  <select
                                                    value={
                                                      trainer.trainerId || ""
                                                    }
                                                    onChange={(e) =>
                                                      handleTrainerField(
                                                        rowIndex,
                                                        batchIndex,
                                                        trainerIdx,
                                                        "trainerId",
                                                        e.target.value
                                                      )
                                                    }
                                                    className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                                  >
                                                    <option value="">
                                                      Select Trainer
                                                    </option>
                                                    {trainers
                                                      .filter(
                                                        (tr) =>
                                                          tr.domain &&
                                                          typeof tr.domain ===
                                                            "string" &&
                                                          tr.domain
                                                            .toLowerCase()
                                                            .trim() ===
                                                            selectedDomain
                                                              .toLowerCase()
                                                              .trim()
                                                      )
                                                      .map((tr) => {
                                                        const isAvailable =
                                                          isTrainerAvailable(
                                                            tr.trainerId,
                                                            trainer.startDate,
                                                            trainer.dayDuration,
                                                            `${rowIndex}-${batchIndex}-${trainerIdx}`
                                                          );

                                                        return (
                                                          <option
                                                            key={tr.trainerId}
                                                            value={tr.trainerId}
                                                            disabled={
                                                              !isAvailable
                                                            }
                                                            className={
                                                              !isAvailable
                                                                ? "text-gray-400"
                                                                : ""
                                                            }
                                                          >
                                                            {tr.name} (
                                                            {tr.trainerId})
                                                            {!isAvailable &&
                                                              " (Already booked)"}
                                                          </option>
                                                        );
                                                      })}
                                                  </select>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                                                {trainer.assignedHours || 0} hrs
                                              </span>
                                              {/* --- SWAP BUTTON --- */}
                                              {trainer.dayDuration === "AM" && (
                                                <button
                                                  type="button"
                                                  className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
                                                  onClick={() =>
                                                    openSwapModal(
                                                      rowIndex,
                                                      batchIndex,
                                                      trainerIdx
                                                    )
                                                  }
                                                  title="Swap Trainer"
                                                >
                                                  Swap Trainer
                                                </button>
                                              )}
                                              <button
                                                onClick={() =>
                                                  toggleTrainerExpansion(
                                                    trainerKey
                                                  )
                                                }
                                                className="p-1 text-gray-500 hover:text-gray-700"
                                                type="button"
                                              >
                                                {isTrainerExpanded ? (
                                                  <FiChevronUp size={16} />
                                                ) : (
                                                  <FiChevronDown size={16} />
                                                )}
                                              </button>
                                            </div>
                                          </div>

                                          {isTrainerExpanded && (
                                            <div className="p-3 bg-white space-y-3">
                                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                {trainer.trainerId &&
                                                  trainer.dayDuration &&
                                                  trainer.startDate &&
                                                  trainer.endDate &&
                                                  !isTrainerAvailable(
                                                    trainer.trainerId,
                                                    trainer.startDate,
                                                    trainer.dayDuration,
                                                    `${rowIndex}-${batchIndex}-${trainerIdx}`
                                                  ) && (
                                                    <div className="text-xs text-rose-600 mt-1 bg-rose-50 p-2 rounded border border-rose-200">
                                                      ⚠️ This trainer is already
                                                      booked for{" "}
                                                      {trainer.dayDuration} slot
                                                      between{" "}
                                                      {trainer.startDate} to{" "}
                                                      {trainer.endDate}
                                                    </div>
                                                  )}
                                                <div>
                                                  <label className="block text-xs text-gray-500 mb-1">
                                                    Duration
                                                  </label>
                                                  <select
                                                    value={
                                                      trainer.dayDuration || ""
                                                    }
                                                    onChange={(e) =>
                                                      handleTrainerField(
                                                        rowIndex,
                                                        batchIndex,
                                                        trainerIdx,
                                                        "dayDuration",
                                                        e.target.value
                                                      )
                                                    }
                                                    className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                                  >
                                                    <option value="">
                                                      Select
                                                    </option>
                                                    {DAY_DURATION_OPTIONS.map(
                                                      (opt) => (
                                                        <option
                                                          key={opt}
                                                          value={opt}
                                                        >
                                                          {opt}
                                                        </option>
                                                      )
                                                    )}
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="block text-xs text-gray-500 mb-1">
                                                    Start Date
                                                  </label>
                                                  <input
                                                    type="date"
                                                    value={
                                                      trainer.startDate || ""
                                                    }
                                                    onChange={(e) =>
                                                      handleTrainerField(
                                                        rowIndex,
                                                        batchIndex,
                                                        trainerIdx,
                                                        "startDate",
                                                        e.target.value
                                                      )
                                                    }
                                                    className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-xs text-gray-500 mb-1">
                                                    End Date
                                                  </label>
                                                  <input
                                                    type="date"
                                                    value={
                                                      trainer.endDate || ""
                                                    }
                                                    onChange={(e) =>
                                                      handleTrainerField(
                                                        rowIndex,
                                                        batchIndex,
                                                        trainerIdx,
                                                        "endDate",
                                                        e.target.value
                                                      )
                                                    }
                                                    className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                                  />
                                                </div>
                                                {/* Move Total Hours here, after all schedule fields */}
                                              </div>

                                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                <div>
                                                  <label className="block text-xs text-gray-500 mb-1">
                                                    Per Hour Cost
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={
                                                      trainer.perHourCost || ""
                                                    }
                                                    disabled
                                                    className="w-full rounded-lg border-gray-300 bg-gray-100 text-sm py-2 px-3"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-xs text-gray-500 mb-1">
                                                    Total Cost
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={
                                                      trainer.perHourCost &&
                                                      trainer.assignedHours
                                                        ? Number(
                                                            trainer.perHourCost
                                                          ) *
                                                          Number(
                                                            trainer.assignedHours
                                                          )
                                                        : ""
                                                    }
                                                    disabled
                                                    className="w-full rounded-lg border-gray-300 bg-gray-100 text-sm py-2 px-3"
                                                  />
                                                </div>
                                                <div>
                                                  <label className=" text-xs text-gray-500 mb-1">
                                                    Total Hours
                                                  </label>
                                                  <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={
                                                      trainer.assignedHours ||
                                                      ""
                                                    }
                                                    onChange={(e) =>
                                                      handleTotalHoursChange(
                                                        rowIndex,
                                                        batchIndex,
                                                        trainerIdx,
                                                        e.target.value.replace(
                                                          /\D/g,
                                                          ""
                                                        )
                                                      )
                                                    }
                                                    className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                                    min="0"
                                                    max={batch.assignedHours}
                                                  />
                                                </div>
                                              </div>

                                              {trainer.mergedBreakdown && (
                                                <table>
                                                  <thead>
                                                    <tr>
                                                      <th>Date</th>
                                                      <th>Day</th>
                                                      <th>Total Hours</th>
                                                      <th>Slots</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {trainer.mergedBreakdown.map(
                                                      (item, idx) => (
                                                        <tr key={idx}>
                                                          <td>
                                                            {item.date instanceof
                                                            Date
                                                              ? item.date.toLocaleDateString()
                                                              : item.date}
                                                          </td>
                                                          <td>
                                                            {item.date instanceof
                                                            Date
                                                              ? item.date.toLocaleDateString(
                                                                  undefined,
                                                                  {
                                                                    weekday:
                                                                      "short",
                                                                  }
                                                                )
                                                              : ""}
                                                          </td>
                                                          <td>{item.hours}</td>
                                                          <td>
                                                            {item.sources.join(
                                                              ", "
                                                            )}
                                                          </td>
                                                        </tr>
                                                      )
                                                    )}
                                                  </tbody>
                                                </table>
                                              )}

                                              {trainer.mergedBreakdown ? (
                                                <div className="mt-3">
                                                  <h6 className="text-xs font-medium text-gray-700 mb-2">
                                                    Daily Hours Breakdown
                                                    (Merged)
                                                  </h6>
                                                  <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                      <thead className="bg-gray-50">
                                                        <tr>
                                                          <th className="px-3 py-1 text-left">
                                                            Date
                                                          </th>
                                                          <th className="px-3 py-1 text-left">
                                                            Day
                                                          </th>
                                                          <th className="px-3 py-1 text-left">
                                                            Total Hours
                                                          </th>
                                                          <th className="px-3 py-1 text-left">
                                                            Slots
                                                          </th>
                                                        </tr>
                                                      </thead>
                                                      <tbody>
                                                        {trainer.mergedBreakdown.map(
                                                          (item, idx) => (
                                                            <tr
                                                              key={idx}
                                                              className="border-b border-gray-200 last:border-0"
                                                            >
                                                              <td className="px-3 py-2">
                                                                {item.date instanceof
                                                                Date
                                                                  ? item.date.toLocaleDateString()
                                                                  : item.date}
                                                              </td>
                                                              <td className="px-3 py-2">
                                                                {item.date instanceof
                                                                Date
                                                                  ? item.date.toLocaleDateString(
                                                                      undefined,
                                                                      {
                                                                        weekday:
                                                                          "short",
                                                                      }
                                                                    )
                                                                  : ""}
                                                              </td>
                                                              <td className="px-3 py-2">
                                                                {item.hours}
                                                              </td>
                                                              <td className="px-3 py-2">
                                                                {item.sources.join(
                                                                  ", "
                                                                )}
                                                              </td>
                                                            </tr>
                                                          )
                                                        )}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                </div>
                                              ) : (
                                                dateList.length > 0 && (
                                                  <div className="mt-3">
                                                    <h6 className="text-xs font-medium text-gray-700 mb-2">
                                                      Daily Hours Breakdown
                                                    </h6>
                                                    <div className="overflow-x-auto">
                                                      <table className="w-full text-xs">
                                                        <thead className="bg-gray-50">
                                                          <tr>
                                                            <th className="px-3 py-1 text-left">
                                                              Date
                                                            </th>
                                                            <th className="px-3 py-1 text-left">
                                                              Day
                                                            </th>
                                                            <th className="px-3 py-1 text-left">
                                                              Hours
                                                            </th>
                                                          </tr>
                                                        </thead>
                                                        <tbody>
                                                          {(
                                                            trainer.activeDates ||
                                                            []
                                                          ).map((date, idx) => (
                                                            <tr key={idx}>
                                                              <td>
                                                                {date.toLocaleDateString()}
                                                              </td>
                                                              <td>
                                                                {date.toLocaleDateString(
                                                                  undefined,
                                                                  {
                                                                    weekday:
                                                                      "short",
                                                                  }
                                                                )}
                                                              </td>
                                                              <td>
                                                                {trainer
                                                                  .dailyHours?.[
                                                                  idx
                                                                ] || ""}
                                                              </td>
                                                              <td>
                                                                {trainer
                                                                  .slotInfo?.[
                                                                  idx
                                                                ]?.slot ||
                                                                  trainer.dayDuration}
                                                              </td>
                                                              <td>
                                                                {trainer
                                                                  .slotInfo?.[
                                                                  idx
                                                                ]?.batchCode ||
                                                                  ""}
                                                              </td>
                                                            </tr>
                                                          ))}
                                                        </tbody>
                                                      </table>
                                                    </div>
                                                  </div>
                                                )
                                              )}

                                              <div className="flex justify-end">
                                                <button
                                                  onClick={() =>
                                                    removeTrainer(
                                                      rowIndex,
                                                      batchIndex,
                                                      trainerIdx
                                                    )
                                                  }
                                                  className="text-xs flex items-center text-rose-600 hover:text-rose-800 font-medium"
                                                  type="button"
                                                >
                                                  <FiTrash2
                                                    className="mr-1"
                                                    size={12}
                                                  />{" "}
                                                  Remove Trainer
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-6 bg-gray-50 rounded-lg">
                                  <FiUser
                                    className="mx-auto text-gray-400"
                                    size={20}
                                  />
                                  <p className="text-sm text-gray-500 mt-2">
                                    No trainers assigned
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-300">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-medium text-gray-900">
                No batches configured
              </h3>
              <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                Select a domain and add batches to begin assigning students and
                trainers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchDetailsTable;
