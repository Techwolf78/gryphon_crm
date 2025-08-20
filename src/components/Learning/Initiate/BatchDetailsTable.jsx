import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, doc, updateDoc } from "firebase/firestore";
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
  onSwapTrainer, // <-- add this
  mergeFirestoreConfig, // optional config for persisting merges
  courses,
}) => {
  const [mergeModal, setMergeModal] = useState({
    open: false,
    sourceRowIndex: null,
    targetRowIndex: null,
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

  // color helpers (colors constant removed because not used)
  const isTrainerAvailable = (
    trainerId,
    date,
    dayDuration,
    excludeTrainerKey = null,
    currentBatchKey = null
  ) => {
    // Check if this trainer is already assigned to any batch (including current batch)
    for (let rowIdx = 0; rowIdx < table1Data.length; rowIdx++) {
      const row = table1Data[rowIdx];
      for (let batchIdx = 0; batchIdx < row.batches.length; batchIdx++) {
        const batch = row.batches[batchIdx];
        const batchKey = `${rowIdx}-${batchIdx}`;

        // Skip checking same batch if currentBatchKey is provided
        if (currentBatchKey && batchKey === currentBatchKey) continue;

        for (
          let trainerIdx = 0;
          trainerIdx < batch.trainers.length;
          trainerIdx++
        ) {
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

  // Optional prop: mergeFirestoreConfig = { collectionPath: 'trainings', docIdField: 'id' }
  const handleMergeBatch = async (sourceRowIndex, targetRowIndex) => {
    console.log("[BatchDetailsTable] handleMergeBatch called", { sourceRowIndex, targetRowIndex });
    const updatedData = [...table1Data];
    const sourceRow = updatedData[sourceRowIndex];
    const targetRow = updatedData[targetRowIndex];

    if (!sourceRow || !targetRow) {
      console.warn("[BatchDetailsTable] handleMergeBatch: invalid source/target", { sourceRow, targetRow });
      return;
    }

    // Combine students; keep target hrs as authoritative
    const combinedStudents = Number(sourceRow.stdCount || 0) + Number(targetRow.stdCount || 0);
    const domainHours = targetRow.hrs; // Keep hours as per domain

    const mergedBatchCode = `${sourceRow.batch}-${targetRow.batch}-1`;

    // Save shallow copies of originals for undo
    const originalSourceCopy = JSON.parse(JSON.stringify(sourceRow));
    const originalTargetCopy = JSON.parse(JSON.stringify(targetRow));

    const mergedRow = {
      ...targetRow,
      batch: `${sourceRow.batch}+${targetRow.batch}`,
      stdCount: combinedStudents,
      hrs: domainHours,
      assignedHours: domainHours,
      isMerged: true,
      originalData: {
        source: originalSourceCopy,
        target: originalTargetCopy,
        sourceIndex: sourceRowIndex,
        targetIndex: targetRowIndex,
      },
      batches: [
        {
          batchPerStdCount: combinedStudents,
          batchCode: mergedBatchCode,
          isMerged: true,
          mergedFrom: `${sourceRow.batch}+${targetRow.batch}`,
          assignedHours: domainHours,
          trainers: [],
        },
      ],
    };

    // Replace target with mergedRow and remove source
    updatedData[targetRowIndex] = mergedRow;
    // If sourceIndex < targetIndex and we removed earlier element, indexes shift; handle by removing the correct index
    if (sourceRowIndex > targetRowIndex) {
      updatedData.splice(sourceRowIndex, 1);
    } else {
      // sourceRowIndex < targetRowIndex => after replacing target, removing source at its index (original)
      updatedData.splice(sourceRowIndex, 1);
    }

    setTable1Data(updatedData);
    console.log("[BatchDetailsTable] merged rows updated locally", { mergedRow });

    // Persist if config provided
    if (typeof mergeFirestoreConfig === "object" && mergeFirestoreConfig?.collectionPath) {
      try {
        const { collectionPath, docIdField } = mergeFirestoreConfig;
        if (docIdField && targetRow[docIdField]) {
          const targetDocRef = doc(db, collectionPath, String(targetRow[docIdField]));
          await updateDoc(targetDocRef, mergedRow);
          console.log("[BatchDetailsTable] merged row updated in Firestore", { collectionPath, docId: targetRow[docIdField] });
        } else {
          const added = await addDoc(collection(db, collectionPath), mergedRow);
          console.log("[BatchDetailsTable] merged row added to Firestore", { collectionPath, docId: added.id });
        }
      } catch (err) {
        console.error("[BatchDetailsTable] Error persisting merged batch:", err);
      }
    }

    setMergeModal({
      open: false,
      sourceRowIndex: null,
      targetRowIndex: null,
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

    const newTrainerIndex = batch.trainers.length;
    batch.trainers.push({
      trainerId: "",
      trainerName: "",
      assignedHours: "",
      dayDuration: "",
      startDate: "",
      endDate: "",
      dailyHours: [],
    });

    // Optional: Auto-expand only the newly added trainer
    const trainerKey = `${rowIndex}-${batchIndex}-${newTrainerIndex}`;
    setExpandedTrainer(prev => ({
      ...prev,
      [trainerKey]: false // Keep new trainers collapsed too
    }));

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


  // 1) getAvailableSpecializations (replace existing)
  const getAvailableSpecializations = (sourceRowIndex) => {
    console.log("[BatchDetailsTable] getAvailableSpecializations called", {
      sourceRowIndex,
      table1DataLength: table1Data?.length ?? 0,
      selectedDomain,
    });

    if (!table1Data || table1Data.length === 0) {
      console.warn("[BatchDetailsTable] table1Data empty or undefined");
      return [];
    }
    const sourceRow = table1Data[sourceRowIndex];
    if (!sourceRow) {
      console.warn("[BatchDetailsTable] sourceRow not found for index", sourceRowIndex);
      return [];
    }

    const result = table1Data
      .map((row, idx) => ({ row, idx }))
      .filter(({ idx }) => idx !== sourceRowIndex)
      .filter(({ row }) => {
        // Domain match: if row.domain exists, require match; if missing, assume it's same domain (per table prop)
        const domainMatch = !selectedDomain
          ? true
          : row.domain && typeof row.domain === "string"
          ? row.domain.toLowerCase().trim() === selectedDomain.toLowerCase().trim()
          : true;

        // Hours match: if both sides provide hrs, compare numerically; if missing, allow (be permissive)
        const hrsMatch =
          (row.hrs !== undefined && sourceRow.hrs !== undefined)
            ? Number(row.hrs) === Number(sourceRow.hrs)
            : true;

        return domainMatch && hrsMatch;
      })
      .map(({ row, idx }) => ({
        specialization: row.batch || row.specialization || "",
        idx,
        stdCount: row.stdCount || 0,
        hrs: row.hrs || 0,
      }));

    console.log("[BatchDetailsTable] available specializations for merge", {
      sourceIndex: sourceRowIndex,
      sourceBatch: sourceRow.batch,
      result,
    });

    if (result.length === 0) {
      console.info("[BatchDetailsTable] no available specializations found for merge. Check row.domain / row.hrs values", {
        sourceRow,
        selectedDomain,
        table1DataSample: table1Data.slice(0, 5),
      });
    }

    return result;
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
    // Only auto-expand ONCE (on first load) - REMOVE the auto-expansion for existing trainers
    if (!didAutoExpand.current && table1Data && table1Data.length > 0) {
      // Remove auto-expansion logic - keep trainers collapsed by default
      const expanded = {}; // Start with empty - no auto-expansion
      
      // Only auto-expand if it's a completely new trainer being added
      // (This part can be handled in addTrainer function if needed)
      
      setExpandedTrainer(expanded);
      didAutoExpand.current = true;
    }
  }, [table1Data]);

  // use canMergeBatches so eslint doesn't mark it unused (keeps intent visible)
  useEffect(() => {
    console.log("[BatchDetailsTable] canMergeBatches:", canMergeBatches);
  }, [canMergeBatches]);

  const undoMerge = async (mergedRowIndex) => {
    console.log("[BatchDetailsTable] undoMerge called", { mergedRowIndex });
    const updated = [...table1Data];
    const mergedRow = updated[mergedRowIndex];
    if (!mergedRow || !mergedRow.originalData) {
      console.warn("[BatchDetailsTable] undoMerge: no originalData on merged row", mergedRowIndex);
      return;
    }

    // avoid unused-var eslint by prefixing unused locals with underscore
    const { source, target, sourceIndex, targetIndex: _targetIndex } = mergedRow.originalData;

    // Restore shallow copies
    const restoredTarget = { ...target };
    const restoredSource = { ...source };

    // Replace merged row position with restoredTarget
    updated[mergedRowIndex] = restoredTarget;

    // Insert source back. Prefer original sourceIndex if valid, else insert after restoredTarget
    const insertIdx =
      typeof sourceIndex === "number" && sourceIndex >= 0 && sourceIndex <= updated.length
        ? sourceIndex
        : mergedRowIndex + 1;

    updated.splice(insertIdx, 0, restoredSource);

    setTable1Data(updated);
    console.log("[BatchDetailsTable] undoMerge completed", { mergedRowIndex, insertIdx });

    // Optional: revert persisted merge in Firestore if mergeFirestoreConfig provided
    if (typeof mergeFirestoreConfig === "object" && mergeFirestoreConfig?.collectionPath) {
      try {
        // rename unused destructured names with leading underscore to satisfy eslint
        const { collectionPath: _collectionPath, docIdField: _docIdField } = mergeFirestoreConfig;
        // Implement revert logic here if needed. _collectionPath/_docIdField are preserved for future use.
      } catch (err) {
        console.error("[BatchDetailsTable] Error while undoing persisted merge:", err);
      }
    }
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
                  value={mergeModal.targetRowIndex ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : Number(e.target.value);
                    console.log("[BatchDetailsTable] merge select changed", {
                      selectedValue: val,
                      sourceRowIndex: mergeModal.sourceRowIndex,
                    });
                    if (val !== null && table1Data && table1Data[val]) {
                      console.log("[BatchDetailsTable] selected target spec:", table1Data[val]);
                    } else if (val === null) {
                      console.log("[BatchDetailsTable] merge target cleared");
                    }
                    setMergeModal((prev) => ({
                      ...prev,
                      targetRowIndex: val,
                    }))
                  }}
                >
                  <option value="">Select specialization</option>
                  {getAvailableSpecializations(mergeModal.sourceRowIndex).map(
                    (specObj) => (
                      <option key={specObj.idx} value={specObj.idx}>
                        {specObj.specialization} — {specObj.stdCount} students — {specObj.hrs} hrs
                      </option>
                    )
                  )}
                </select>
              </div>
              {/* Confirmation summary */}
              {mergeModal.targetRowIndex !== null && mergeModal.sourceRowIndex !== null && (
                (() => {
                  const src = table1Data[mergeModal.sourceRowIndex];
                  const tgt = table1Data[mergeModal.targetRowIndex];
                  const combined = Number(src.stdCount || 0) + Number(tgt.stdCount || 0);
                  const hrs = tgt.hrs;
                  return (
                    <div className="rounded border border-gray-100 p-3 bg-gray-50 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Summary</div>
                          <div className="text-xs text-gray-600">{src.batch} + {tgt.batch}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Combined students</div>
                          <div className="font-medium">{combined}</div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xs text-gray-500">Resulting hrs</div>
                          <div className="font-medium">{hrs}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() =>
                    setMergeModal({
                      open: false,
                      sourceRowIndex: null,
                      targetRowIndex: null,
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
                      mergeModal.targetRowIndex
                    )
                  }
                  disabled={mergeModal.targetRowIndex === null}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                    mergeModal.targetRowIndex !== null
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
                const totalAssignedHours =
                  row.batches.length > 0 ? Number(row.batches[0].assignedHours || 0) : 0;
                const isExpanded = expandedBatch[rowIndex];

                // Show message if no hours for this specialization
                if (row.hrs === 0) {
                  return (
                    <div
                      key={rowIndex}
                      className="px-4 py-4 border-b border-gray-100 bg-yellow-50 rounded flex items-center space-x-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-yellow-200 text-yellow-800 flex items-center justify-center text-xs font-bold">
                        {rowIndex + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-yellow-800">
                          {row.batch}
                        </div>
                        <div className="text-xs text-yellow-700 mt-1">
                          No hours configured for this specialization. Please set hours in the training domain setup.
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={rowIndex} className="transition-all duration-200">
                    {/* Batch Header */}
                    <div
                      className={`px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
                        isExpanded ? "bg-gray-50" : ""
                      }`}
                      onClick={() => toggleBatchExpansion(rowIndex)}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            getColorsForBatch(row.batch).accent
                          } text-xs`}
                        >
                          {rowIndex + 1}
                        </div>
                        <div>
                          <h4
                            className={`font-medium text-xs ${
                              getColorsForBatch(row.batch).text
                            }`}
                          >
                            {row.batch}
                          </h4>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-0.5">
                            <span className="flex items-center">
                              <FiUser className="mr-1" /> {row.stdCount} students
                            </span>
                            <span className="flex items-center">
                              <FiClock className="mr-1" /> {row.hrs} hours
                            </span>
                          </div>
                        </div>
                      </div>
                        <div className="flex items-center space-x-2">
                          <div
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              getColorsForBatch(row.batch).badge
                            }`}
                          >
                            {totalAssignedStudents}/{row.stdCount} students
                          </div>
                          <div
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              getColorsForBatch(row.batch).badge
                            }`}
                          >
                            {totalAssignedHours}/{row.hrs} hours
                          </div>

                          {/* Merge button - always visible */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log("[BatchDetailsTable] open merge modal for row", {
                                rowIndex,
                                batchName: row.batch,
                                stdCount: row.stdCount,
                                hrs: row.hrs,
                              });
                              setMergeModal({
                                open: true,
                                sourceRowIndex: rowIndex,
                                targetRowIndex: null,
                              });
                            }}
                            className="p-1 rounded hover:bg-indigo-50 text-indigo-600 transition-colors text-xs"
                            title="Merge Specialization"
                            type="button"
                          >
                            <FiLayers size={14} />
                          </button>

                          {/* Undo button shown when this row is a merged row */}
                          {row.isMerged && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log("[BatchDetailsTable] undo merge clicked", { rowIndex, batch: row.batch });
                                undoMerge(rowIndex);
                              }}
                              className="ml-2 p-1 rounded bg-yellow-50 text-yellow-700 text-xs hover:bg-yellow-100 transition-colors"
                              title="Undo Merge"
                              type="button"
                            >
                              Undo
                            </button>
                          )}
                        </div>
                      <div className="flex items-center space-x-2">
                        {/* Dropdown icon for expand/collapse */}
                        {isExpanded ? (
                          <FiChevronUp className="text-gray-500" size={18} />
                        ) : (
                          <FiChevronDown className="text-gray-500" size={18} />
                        )}
                        {/* ...status badges and buttons... */}
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

                            <div className="p-3 space-y-2">
                              {/* Batch Details */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                                    Students
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2"
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
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                                    Batch Code
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2"
                                    value={batch.batchCode || ""}
                                    onChange={(e) =>
                                      handleBatchChange(
                                        rowIndex,
                                        batchIndex,
                                        "batchCode",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                                    Assigned Hours
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className={`w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2 ${
                                      batchIndex !== 0 ? "bg-gray-100 cursor-not-allowed" : ""
                                    }`}
                                    value={
                                      batch.assignedHours === undefined ||
                                      batch.assignedHours === null
                                        ? ""
                                        : batch.assignedHours
                                    }
                                    onChange={(e) => {
                                      if (batchIndex === 0) {
                                        let val = e.target.value.replace(/\D/g, "");
                                        handleBatchChange(
                                          rowIndex,
                                          batchIndex,
                                          "assignedHours",
                                          val
                                        );
                                      }
                                    }}
                                    min="0"
                                    placeholder="0"
                                    disabled={batchIndex !== 0}
                                  />
                                </div>
                              </div>

                              {/* Assigned Hours Progress Bar */}
                              {batch.assignedHours > 0 && (
                                <div className="mb-2">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-gray-600 font-medium">
                                      Assigned Trainer Hours:{" "}
                                      {batch.trainers.reduce(
                                        (sum, t) => sum + Number(t.assignedHours || 0),
                                        0
                                      )}{" "}
                                      / {batch.assignedHours}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {batch.assignedHours -
                                        batch.trainers.reduce(
                                          (sum, t) => sum + Number(t.assignedHours || 0),
                                          0
                                        )}{" "}
                                      hours left
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded h-2">
                                    <div
                                      className="bg-indigo-500 h-2 rounded"
                                      style={{
                                        width: `${
                                          Math.min(
                                            100,
                                            (batch.trainers.reduce(
                                              (sum, t) => sum + Number(t.assignedHours || 0),
                                              0
                                            ) /
                                              (batch.assignedHours || 1)) *
                                              100
                                          )
                                        }%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              )}

                              {/* Trainers Section */}
                              <div>
                                <div className="flex justify-between items-center mb-2 ">
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

                                {(batch.trainers || []).length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs border border-gray-200 rounded">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-2 py-1 text-left">Trainer</th>
                                          <th className="px-2 py-1 text-left">Duration</th>
                                          <th className="px-2 py-1 text-left">Start Date</th>
                                          <th className="px-2 py-1 text-left">End Date</th>
                                          <th className="px-2 py-1 text-left">Per Hour Cost</th>
                                          <th className="px-2 py-1 text-left">Total Cost</th>
                                          <th className="px-2 py-1 text-left">Total Hours</th>
                                          <th className="px-2 py-1 text-left">Daily Hours</th> {/* <-- Add this */}
                                          <th className="px-2 py-1 text-left">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(batch.trainers || []).map((trainer, trainerIdx) => (
                                          <React.Fragment key={trainerIdx}>
                                            <tr className="border-b last:border-0">
                                              {/* Trainer Name/Select */}
                                              <td className="px-2 py-1">
                                                <select
                                                  value={trainer.trainerId || ""}
                                                  onChange={e =>
                                                    handleTrainerField(
                                                      rowIndex,
                                                      batchIndex,
                                                      trainerIdx,
                                                      "trainerId",
                                                      e.target.value
                                                    )
                                                  }
                                                  className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2"
                                                >
                                                  <option value="">Select Trainer</option>
                                                  {trainers
                                                    .filter(
                                                      (tr) =>
                                                        tr.domain &&
                                                        typeof tr.domain === "string" &&
                                                        tr.domain.toLowerCase().trim() ===
                                                          selectedDomain.toLowerCase().trim()
                                                    )
                                                    .map((tr) => {
                                                      const isAvailable = isTrainerAvailable(
                                                        tr.trainerId,
                                                        trainer.startDate,
                                                        trainer.dayDuration,
                                                        `${rowIndex}-${batchIndex}-${trainerIdx}`
                                                      );
                                                      return (
                                                        <option
                                                          key={tr.trainerId}
                                                          value={tr.trainerId}
                                                          disabled={!isAvailable}
                                                          className={!isAvailable ? "text-gray-400" : ""}
                                                        >
                                                          {tr.name} ({tr.trainerId})
                                                          {!isAvailable && " (Already booked)"}
                                                        </option>
                                                      );
                                                    })}
                                                </select>
                                              </td>
                                              {/* Duration */}
                                              <td className="px-2 py-1">
                                                <select
                                                  value={trainer.dayDuration || ""}
                                                  onChange={e =>
                                                    handleTrainerField(
                                                      rowIndex,
                                                      batchIndex,
                                                      trainerIdx,
                                                      "dayDuration",
                                                      e.target.value
                                                    )
                                                  }
                                                  className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2"
                                                >
                                                  <option value="">Select</option>
                                                  {DAY_DURATION_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>
                                                      {opt}
                                                    </option>
                                                  ))}
                                                </select>
                                              </td>
                                              {/* Start Date */}
                                              <td className="px-2 py-1">
                                                <input
                                                  type="date"
                                                  value={trainer.startDate || ""}
                                                  onChange={e =>
                                                    handleTrainerField(
                                                      rowIndex,
                                                      batchIndex,
                                                      trainerIdx,
                                                      "startDate",
                                                      e.target.value
                                                    )
                                                  }
                                                  className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2"
                                                />
                                              </td>
                                              {/* End Date */}
                                              <td className="px-2 py-1">
                                                <input
                                                  type="date"
                                                  value={trainer.endDate || ""}
                                                  onChange={e =>
                                                    handleTrainerField(
                                                      rowIndex,
                                                      batchIndex,
                                                      trainerIdx,
                                                      "endDate",
                                                      e.target.value
                                                    )
                                                  }
                                                  className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2"
                                                />
                                              </td>
                                              {/* Per Hour Cost */}
                                              <td className="px-2 py-1">
                                                <input
                                                  type="text"
                                                  value={trainer.perHourCost || ""}
                                                  disabled
                                                  className="w-full rounded border-gray-300 bg-gray-100 text-xs py-1 px-2"
                                                />
                                              </td>
                                              {/* Total Cost */}
                                              <td className="px-2 py-1">
                                                <input
                                                  type="text"
                                                  value={
                                                    trainer.perHourCost && trainer.assignedHours
                                                      ? Number(trainer.perHourCost) * Number(trainer.assignedHours)
                                                      : ""
                                                  }
                                                  disabled
                                                  className="w-full rounded border-gray-300 bg-gray-100 text-xs py-1 px-2"
                                                />
                                              </td>
                                              {/* Total Hours */}
                                              <td className="px-2 py-1">
                                                <input
                                                  type="text"
                                                  inputMode="numeric"
                                                  pattern="[0-9]*"
                                                  value={trainer.assignedHours || ""}
                                                  onChange={e =>
                                                    handleTotalHoursChange(
                                                      rowIndex,
                                                      batchIndex,
                                                      trainerIdx,
                                                      e.target.value.replace(/\D/g, "")
                                                    )
                                                  }
                                                  className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2"
                                                  min="0"
                                                  max={batch.assignedHours}
                                                />
                                              </td>
                                              {/* Daily Hours Breakdown */}
                                              <td className="px-2 py-1">
                                                {Array.isArray(trainer.dailyHours) && trainer.dailyHours.length > 0 ? (
                                                  <button
                                                    type="button"
                                                    className="text-xs text-indigo-600 underline"
                                                    onClick={() =>
                                                      toggleTrainerExpansion(`${rowIndex}-${batchIndex}-${trainerIdx}`)
                                                    }
                                                  >
                                                    View
                                                  </button>
                                                ) : (
                                                  "-"
                                                )}
                                              </td>
                                              {/* Actions */}
                                              <td className="px-2 py-1">
                                                <button
                                                  onClick={() => removeTrainer(rowIndex, batchIndex, trainerIdx)}
                                                  className="text-xs flex items-center text-rose-600 hover:text-rose-800 font-medium"
                                                  type="button"
                                                  title="Remove Trainer"
                                                >
                                                  <FiTrash2 className="mr-1" size={12} /> Remove
                                                </button>
                                                {trainer.dayDuration === "AM" && (
                                                  <button
                                                    type="button"
                                                    className="ml-2 px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
                                                    onClick={() => openSwapModal(rowIndex, batchIndex, trainerIdx)}
                                                    title="Swap Trainer"
                                                  >
                                                    Swap
                                                  </button>
                                                )}
                                              </td>
                                            </tr>
                                            {/* Daily Hours Table (shown when expanded) */}
                                            {expandedTrainer[`${rowIndex}-${batchIndex}-${trainerIdx}`] &&
                                              Array.isArray(trainer.dailyHours) &&
                                              trainer.dailyHours.length > 0 && (
                                                <tr>
                                                  <td colSpan={9} className="px-2 py-2">
                                                    <div className="overflow-x-auto">
                                                      <table className="min-w-max text-xs border border-gray-200 rounded bg-gray-50">
                                                        <thead>
                                                          <tr>
                                                            <th className="px-2 py-1 text-left">Day</th>
                                                            <th className="px-2 py-1 text-left">Date</th>
                                                            <th className="px-2 py-1 text-left">Hours</th>
                                                            <th className="px-2 py-1 text-left">Action</th>
                                                          </tr>
                                                        </thead>
                                                        <tbody>
                                                          {trainer.dailyHours.map((hours, idx) => (
                                                            <tr key={idx}>
                                                              <td className="px-2 py-1">{idx + 1}</td>
                                                              <td className="px-2 py-1">
                                                                {trainer.activeDates && trainer.activeDates[idx]
                                                                  ? new Date(trainer.activeDates[idx]).toLocaleDateString()
                                                                  : "-"}
                                                              </td>
                                                              <td className="px-2 py-1">{hours}</td>
                                                              <td className="px-2 py-1">
                                                                <button
                                                                  type="button"
                                                                  className="text-xs text-rose-600 hover:text-rose-800 px-2 py-0.5 rounded"
                                                                  title="Remove this day"
                                                                  onClick={() => {
                                                                    // Remove this day from dailyHours and activeDates
                                                                    const updated = [...table1Data];
                                                                    const t = updated[rowIndex].batches[batchIndex].trainers[trainerIdx];
                                                                    t.dailyHours.splice(idx, 1);
                                                                    if (t.activeDates) t.activeDates.splice(idx, 1);
                                                                    // Update assignedHours
                                                                    t.assignedHours = t.dailyHours.reduce((a, b) => a + Number(b || 0), 0);
                                                                    setTable1Data(updated);
                                                                  }}
                                                                >
                                                                  Delete
                                                                </button>
                                                              </td>
                                                            </tr>
                                                          ))}
                                                        </tbody>
                                                      </table>
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                          </React.Fragment>
                                        ))}
                                      </tbody>
                                    </table>
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
                        {/* --- Add Batch Button at the bottom --- */}
                        <div className="flex justify-end mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addBatch(rowIndex);
                            }}
                            className={`flex items-center px-2 py-1 rounded border border-indigo-500 bg-indigo-50 text-indigo-700 text-xs font-medium shadow-sm hover:bg-indigo-100 hover:border-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                              getColorsForBatch(row.batch).text
                            }`}
                            title={`Add Batch to ${row.batch}`}
                            aria-label={`Add Batch to ${row.batch}`}
                            data-testid={`add-batch-bottom-${row.batch}`}
                            type="button"
                          >
                            <FiPlus className="mr-1" size={12} /> Add Batch
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto h-10 w-10 text-gray-300">
                  {/* ...icon... */}
                </div>
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
    
  );
};

export default BatchDetailsTable;
