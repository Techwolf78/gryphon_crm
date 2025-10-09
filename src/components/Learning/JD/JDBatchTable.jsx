import React, { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import {
  FiPlus,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import Select from 'react-select';

const DAY_DURATION_OPTIONS = ["AM", "PM", "AM & PM"];

const JDBatchTable = ({
  table1Data,
  setTable1Data,
  commonFields,
  globalTrainerAssignments = [],
  excludeDays = "None",
  onValidationChange,
  selectedDomain,
}) => {
  const [trainers, setTrainers] = useState([]);

  // Fetch trainers
  const refetchTrainers = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "trainers"));
      const trainerList = [];
      querySnapshot.forEach((d) => {
        trainerList.push({ id: d.id, ...d.data() });
      });
      setTrainers(trainerList);
    } catch (error) {

    }
  }, []);

  useEffect(() => {
    refetchTrainers();
  }, [refetchTrainers]);

  // Calculate training hours per day
  const getTrainingHoursPerDay = useCallback(() => {
    if (
      !commonFields.collegeStartTime ||
      !commonFields.collegeEndTime ||
      !commonFields.lunchStartTime ||
      !commonFields.lunchEndTime
    )
      return 8; // Default for JD

    const toMinutes = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + (m || 0);
    };
    const collegeStart = toMinutes(commonFields.collegeStartTime);
    const collegeEnd = toMinutes(commonFields.collegeEndTime);
    const lunchStart = toMinutes(commonFields.lunchStartTime);
    const lunchEnd = toMinutes(commonFields.lunchEndTime);

    let total = collegeEnd - collegeStart - (lunchEnd - lunchStart);
    return total > 0 ? +(total / 60).toFixed(2) : 8;
  }, [commonFields]);

  // Generate date list excluding specified days
  const getDateList = useCallback((start, end, excludeDays, excludedDates = []) => {
    if (!start || !end) return [];
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
    if (startDate > endDate) return [];

    const dates = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      let shouldInclude = true;

      if (excludeDays === "Saturday" && dayOfWeek === 6) shouldInclude = false;
      else if (excludeDays === "Sunday" && dayOfWeek === 0) shouldInclude = false;
      else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) shouldInclude = false;

      if (shouldInclude) {
        const dateStr = current.toISOString().slice(0, 10);
        if (!excludedDates.includes(dateStr)) {
          dates.push(new Date(current));
        }
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, []);

  // Memoize validation result to prevent unnecessary re-renders
  const validationResult = useMemo(() => {
    if (!table1Data || table1Data.length === 0) {
      return {
        hasErrors: false,
        errors: [],
        duplicates: [],
      };
    }

    const duplicatesSet = new Set();
    const errors = [];
    const trainerScheduleMap = new Map(); // trainerId -> Map<dateISO, {dayDuration, trainerKey}>

    // Helper function to get all dates for a trainer
    const getTrainerDates = (trainer) => {
      const dates = [];
      if (!trainer.startDate || !trainer.endDate || !trainer.dayDuration) {
        return dates; // Skip incomplete trainers
      }

      try {
        const startDate = new Date(trainer.startDate);
        const endDate = new Date(trainer.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
          return dates;
        }

        let current = new Date(startDate);
        while (current <= endDate) {
          const dayOfWeek = current.getDay();
          let shouldInclude = true;

          if (excludeDays === "Saturday" && dayOfWeek === 6) shouldInclude = false;
          else if (excludeDays === "Sunday" && dayOfWeek === 0) shouldInclude = false;
          else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) shouldInclude = false;

          if (shouldInclude) {
            dates.push(current.toISOString().slice(0, 10));
          }
          current.setDate(current.getDate() + 1);
        }
      } catch (error) {

      }

      return dates;
    };

    // First pass: collect all trainer schedules
    table1Data.forEach((row, rowIndex) => {
      row.batches?.forEach((batch, batchIndex) => {
        batch.trainers?.forEach((trainer, trainerIdx) => {
          if (!trainer.trainerId) return;

          const trainerKey = `${rowIndex}-${batchIndex}-${trainerIdx}`;
          const dates = getTrainerDates(trainer);

          if (dates.length === 0) return; // Skip trainers with no valid dates

          dates.forEach((dateISO) => {
            if (!trainerScheduleMap.has(trainer.trainerId)) {
              trainerScheduleMap.set(trainer.trainerId, new Map());
            }

            const trainerDates = trainerScheduleMap.get(trainer.trainerId);

            if (trainerDates.has(dateISO)) {
              const existing = trainerDates.get(dateISO);
              // Check for time slot conflict
              const hasConflict =
                trainer.dayDuration === "AM & PM" ||
                existing.dayDuration === "AM & PM" ||
                (trainer.dayDuration === "AM" && existing.dayDuration === "AM") ||
                (trainer.dayDuration === "PM" && existing.dayDuration === "PM");

              if (hasConflict) {
                duplicatesSet.add(existing.trainerKey);
                duplicatesSet.add(trainerKey);

                const message = `${trainer.trainerName || trainer.trainerId} (${trainer.trainerId}) has conflicting assignment on ${dateISO} (${trainer.dayDuration})`;
                errors.push({ message });
              }
            } else {
              trainerDates.set(dateISO, {
                dayDuration: trainer.dayDuration,
                trainerKey: trainerKey,
              });
            }
          });
        });
      });
    });

    // Second pass: check against global assignments
    table1Data.forEach((row, rowIndex) => {
      row.batches?.forEach((batch, batchIndex) => {
        batch.trainers?.forEach((trainer, trainerIdx) => {
          if (!trainer.trainerId) return;

          const trainerKey = `${rowIndex}-${batchIndex}-${trainerIdx}`;
          const dates = getTrainerDates(trainer);

          if (dates.length === 0) return;

          dates.forEach((dateISO) => {
            // Check global assignments
            for (let assignment of globalTrainerAssignments) {
              if (assignment.trainerId !== trainer.trainerId) continue;

              let assignDates = [];
              if (assignment.date) {
                assignDates = [assignment.date];
              } else if (assignment.startDate && assignment.endDate) {
                try {
                  const startDate = new Date(assignment.startDate);
                  const endDate = new Date(assignment.endDate);

                  if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                    let current = new Date(startDate);
                    while (current <= endDate) {
                      assignDates.push(current.toISOString().slice(0, 10));
                      current.setDate(current.getDate() + 1);
                    }
                  }
                } catch (error) {

                }
              }

              if (assignDates.includes(dateISO)) {
                const hasConflict =
                  assignment.dayDuration === "AM & PM" ||
                  trainer.dayDuration === "AM & PM" ||
                  (assignment.dayDuration === "AM" && trainer.dayDuration === "AM") ||
                  (assignment.dayDuration === "PM" && trainer.dayDuration === "PM");

                if (hasConflict) {
                  duplicatesSet.add(trainerKey);
                  
                  // Enhanced conflict message with detailed information
                  const conflictDetails = [];
                  
                  // Add current assignment details with clear project code label
                  conflictDetails.push(`🔄 Conflicting Project Code: ${assignment.sourceTrainingId || 'Unknown Project'}`);
                  conflictDetails.push(`📚 College: ${assignment.collegeName || 'Not specified'}`);
                  conflictDetails.push(`👥 Batch: ${assignment.batchCode || 'Not specified'}`);
                  conflictDetails.push(`🎯 Domain: ${assignment.domain || 'Not specified'}`);
                  conflictDetails.push(`⏰ Duration: ${assignment.dayDuration || 'Not specified'}`);
                  conflictDetails.push(`📅 Date: ${dateISO}`);
                  
                  // Add trainer name if available
                  if (assignment.trainerName) {
                    conflictDetails.push(`👤 Trainer: ${assignment.trainerName}`);
                  }
                  
                  // Add new assignment attempt details
                  conflictDetails.push(`\n🆕 Trying to Assign to Current Project:`);
                  conflictDetails.push(`⏰ Duration: ${trainer.dayDuration}`);
                  conflictDetails.push(`📅 Date: ${dateISO}`);
                  
                  const message = `${
                    trainer.trainerName || trainer.trainerId
                  } (${
                    trainer.trainerId
                  }) conflicts with existing assignment:\n\n${conflictDetails.join('\n')}`;
                  
                  errors.push({ message });
                }
              }
            }
          });
        });
      });
    });

    const duplicates = Array.from(duplicatesSet);

    // Remove duplicate error messages
    const uniqueErrors = Array.from(
      new Map(errors.map((e) => [e.message, e])).values()
    );

    return {
      hasErrors: duplicates.length > 0,
      errors: uniqueErrors,
      duplicates: duplicates,
    };
  }, [table1Data, globalTrainerAssignments, excludeDays]);

  // Update duplicate trainers and notify parent when validation result changes
  useEffect(() => {
    if (onValidationChange && selectedDomain) {
      onValidationChange(selectedDomain, validationResult);
    }
  }, [validationResult, selectedDomain, onValidationChange]);

  // Check trainer availability
  const isTrainerAvailable = useCallback((
    trainerId,
    date,
    dayDuration,
    excludeTrainerKey = null,
    currentBatchKey = null
  ) => {
    // Check current table
    for (let rowIdx = 0; rowIdx < table1Data.length; rowIdx++) {
      const row = table1Data[rowIdx];
      for (let batchIdx = 0; batchIdx < row.batches.length; batchIdx++) {
        const batch = row.batches[batchIdx];
        const batchKey = `${rowIdx}-${batchIdx}`;
        if (currentBatchKey && batchKey === currentBatchKey) continue;

        for (let trainerIdx = 0; trainerIdx < batch.trainers.length; trainerIdx++) {
          const trainer = batch.trainers[trainerIdx];
          const currentKey = `${rowIdx}-${batchIdx}-${trainerIdx}`;
          if (excludeTrainerKey === currentKey) continue;

          if (trainer.trainerId === trainerId && trainer.startDate && trainer.endDate) {
            const startDateObj = new Date(trainer.startDate);
            const endDateObj = new Date(trainer.endDate);
            const dateObj = new Date(date);

            if (!isNaN(dateObj.getTime()) &&
                !isNaN(startDateObj.getTime()) &&
                !isNaN(endDateObj.getTime()) &&
                dateObj >= startDateObj &&
                dateObj <= endDateObj) {

              if (trainer.dayDuration === "AM & PM" ||
                  dayDuration === "AM & PM" ||
                  (trainer.dayDuration === "AM" && dayDuration === "AM") ||
                  (trainer.dayDuration === "PM" && dayDuration === "PM")) {
                return false;
              }
            }
          }
        }
      }
    }

    // Check global assignments
    const normalizeDate = (d) => {
      if (!d) return null;
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return null;
      return dt.toISOString().slice(0, 10);
    };

    for (let assignment of globalTrainerAssignments) {
      if (assignment.trainerId !== trainerId) continue;

      let assignDates = [];
      if (assignment.date) {
        const d = normalizeDate(assignment.date);
        if (d) assignDates.push(d);
      } else if (assignment.startDate && assignment.endDate) {
        const list = getDateList(assignment.startDate, assignment.endDate);
        assignDates = list.map((dd) => normalizeDate(dd)).filter(Boolean);
      }

      const dateNorm = normalizeDate(date);
      if (!dateNorm) continue;

      if (assignDates.includes(dateNorm)) {
        const ad = assignment.dayDuration;
        if (ad === "AM & PM" || dayDuration === "AM & PM" ||
            (ad === "AM" && dayDuration === "AM") ||
            (ad === "PM" && dayDuration === "PM")) {
          return false;
        }
      }
    }
    return true;
  }, [table1Data, globalTrainerAssignments, getDateList]);

  // Handle trainer field changes
  const handleTrainerField = useCallback((
    rowIndex,
    batchIndex,
    trainerIdx,
    field,
    value
  ) => {
    const updated = [...table1Data];
    const batch = updated[rowIndex].batches[batchIndex];
    const trainer = batch.trainers[trainerIdx];

    if (field === "dailyHours") {
      trainer.dailyHours = value;
      trainer.assignedHours = value.reduce((sum, hours) => sum + Number(hours || 0), 0);
      setTable1Data(updated);
      return;
    }

    const tempTrainer = { ...trainer, [field]: value };

    if (["dayDuration", "startDate", "endDate"].includes(field)) {
      if (!tempTrainer.dayDuration || !tempTrainer.startDate || !tempTrainer.endDate) {
        trainer[field] = value;
        setTable1Data(updated);
        return;
      }

      const normalizeDate = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().slice(0, 10);
      };

      const newTrainerDates = getDateList(tempTrainer.startDate, tempTrainer.endDate);
      const newTrainerDatesNormalized = newTrainerDates.map(normalizeDate).filter(Boolean);

      const hasConflict = batch.trainers.some((t, idx) => {
        if (idx === trainerIdx) return false;
        if (t.dayDuration !== tempTrainer.dayDuration) return false;

        const existingDates = t.activeDates || getDateList(t.startDate, t.endDate);
        const existingDatesNormalized = existingDates.map(normalizeDate).filter(Boolean);

        return newTrainerDatesNormalized.some(date => existingDatesNormalized.includes(date));
      });

      if (hasConflict) {
        alert(`This batch already has a trainer for ${tempTrainer.dayDuration} slot on overlapping dates.`);
        return;
      }

      trainer[field] = value;

      const perDay = getTrainingHoursPerDay();
      let perDayHours = 0;
      if (trainer.dayDuration === "AM & PM") perDayHours = perDay;
      else if (trainer.dayDuration === "AM" || trainer.dayDuration === "PM")
        perDayHours = +(perDay / 2).toFixed(2);

      const dateList = getDateList(trainer.startDate, trainer.endDate);
      trainer.activeDates = dateList;
      trainer.dailyHours = dateList.map(() => perDayHours);
      trainer.assignedHours = trainer.dailyHours.reduce((a, b) => a + Number(b || 0), 0);
    }

    if (field === "trainerId") {
      const tr = trainers.find((t) => t.trainerId === value);
      trainer.trainerName = tr?.name || tr?.trainerName || tr?.displayName || "";
      trainer.perHourCost = tr?.paymentType === "Per Hour" ? tr?.charges : 0;
      trainer.topics = [];
      trainer.trainerId = value;
    }

    if (field === "assignedHours") {
      trainer.assignedHours = Number(value) || 0;
    }

    if (!["dailyHours", "dayDuration", "startDate", "endDate", "trainerId", "assignedHours"].includes(field)) {
      trainer[field] = value;
    }

    setTable1Data(updated);
  }, [table1Data, setTable1Data, getDateList, getTrainingHoursPerDay, trainers]);

  // Handle total hours change
  const handleTotalHoursChange = useCallback((rowIndex, batchIndex, trainerIdx, value) => {
    const updated = [...table1Data];
    const trainer = updated[rowIndex].batches[batchIndex].trainers[trainerIdx];

    trainer.assignedHours = Number(value) || 0;

    if (trainer.dailyHours && trainer.dailyHours.length > 0) {
      const totalHours = Number(value) || 0;
      const days = trainer.dailyHours.length;
      const hoursPerDay = days > 0 ? totalHours / days : 0;
      trainer.dailyHours = trainer.dailyHours.map(() => hoursPerDay);
    }

    setTable1Data(updated);
  }, [table1Data, setTable1Data]);

  // Handle daily hours change
  const handleDailyHoursChange = useCallback((rowIndex, batchIndex, trainerIdx, dayIndex, value) => {
    const updated = [...table1Data];
    const trainer = updated[rowIndex].batches[batchIndex].trainers[trainerIdx];

    if (!trainer.dailyHours) trainer.dailyHours = [];
    trainer.dailyHours[dayIndex] = parseFloat(value) || 0;

    trainer.assignedHours = trainer.dailyHours.reduce((sum, hours) => sum + Number(hours || 0), 0);
    setTable1Data(updated);
  }, [table1Data, setTable1Data]);

  // Add trainer
  const addTrainer = useCallback((rowIndex, batchIndex) => {
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
      conveyance: "",
      food: "",
      lodging: "",
      topics: [],
    });

    setTable1Data(updated);
  }, [table1Data, setTable1Data]);

  // Remove trainer
  const removeTrainer = useCallback((rowIndex, batchIndex, trainerIdx) => {
    const updated = [...table1Data];
    const batch = updated[rowIndex].batches[batchIndex];
    if (!batch.trainers) batch.trainers = [];
    batch.trainers.splice(trainerIdx, 1);
    setTable1Data(updated);
  }, [table1Data, setTable1Data]);

  // Handle batch change
  const handleBatchChange = useCallback((rowIndex, batchIndex, field, value) => {
    const updatedData = [...table1Data];
    const currentRow = updatedData[rowIndex];

    if (field === "batchPerStdCount") {
      const inputValue = Number(value);
      const otherBatchTotal = currentRow.batches.reduce((acc, batch, idx) => {
        return idx === batchIndex ? acc : acc + Number(batch.batchPerStdCount || 0);
      }, 0);
      const maxAllowed = currentRow.stdCount - otherBatchTotal;
      const finalValue = inputValue > maxAllowed ? maxAllowed : inputValue;
      currentRow.batches[batchIndex][field] = finalValue;
    } else {
      currentRow.batches[batchIndex][field] = value;
    }

    setTable1Data(updatedData);
  }, [table1Data, setTable1Data]);

  // Format Indian number
  const formatIndianNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    const numStr = num.toString();
    const [integerPart, decimalPart] = numStr.split('.');

    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const formattedInteger = otherNumbers !== ''
      ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
      : lastThree;

    return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  };

  // Calculate training days
  const getTrainingDays = useCallback((startDate, endDate, excludeDays) => {
    const dates = getDateList(startDate, endDate, excludeDays);
    return dates.length;
  }, [getDateList]);

  return (
    <div className="space-y-4">
      {/* Duplicate prompt banner inside the table component */}
      {validationResult.duplicates && validationResult.duplicates.length > 0 && (
        <div className="rounded bg-red-50 border border-red-200 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-red-800">
              Duplicate trainer assignments detected. Rows with conflicts are
              highlighted in the table below.
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  // Expand rows containing duplicates and scroll to first duplicate
                  if (!validationResult.duplicates || validationResult.duplicates.length === 0)
                    return;
                  const first = validationResult.duplicates[0];
                  const parts = first.split("-");
                  const rowIdx = Number(parts[0]);
                  if (!isNaN(rowIdx)) {
                    // For JD table, we don't have expandable rows, so just scroll to the element
                    setTimeout(() => {
                      const el = document.getElementById(`trainer-${first}`);
                      if (el && el.scrollIntoView)
                        el.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                    }, 120);
                  }
                }}
                className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Show duplicates
              </button>
            </div>
          </div>
        </div>
      )}

      {table1Data.map((row, rowIndex) => (
        <div key={rowIndex} className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">
              {row.batch} - {row.stdCount} Students
            </h4>
            <div className="text-sm text-gray-600">
              {row.hrs} hours total
            </div>
          </div>

          <div className="space-y-4">
            {row.batches.map((batch, batchIndex) => (
              <div key={batchIndex} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">
                    Batch {batchIndex + 1} - {batch.batchCode}
                  </h5>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm">
                      <span className="text-gray-600">Students:</span>
                      <input
                        type="number"
                        min="0"
                        value={batch.batchPerStdCount || ""}
                        onChange={(e) => handleBatchChange(rowIndex, batchIndex, "batchPerStdCount", e.target.value)}
                        className="ml-2 w-16 rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                        placeholder="0"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      Hours: {batch.trainers.reduce((sum, t) => sum + Number(t.assignedHours || 0), 0)}
                    </div>
                  </div>
                </div>

                {/* Trainers Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h6 className="text-sm font-medium text-gray-700">Trainers</h6>
                    <button
                      onClick={() => addTrainer(rowIndex, batchIndex)}
                      disabled={!batch.batchPerStdCount || Number(batch.batchPerStdCount) <= 0}
                      className={`text-xs flex items-center font-medium transition-colors ${
                        (!batch.batchPerStdCount || Number(batch.batchPerStdCount) <= 0)
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-blue-600 hover:text-blue-800 cursor-pointer"
                      }`}
                      type="button"
                    >
                      <FiPlus className="mr-1" size={12} />
                      Add Trainer
                    </button>
                  </div>

                  {batch.trainers.length === 0 ? (
                    <div className="text-center py-4 bg-gray-100 rounded text-sm text-gray-500">
                      No trainers assigned
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {batch.trainers.map((trainer, trainerIdx) => {
                        const trainerOptions = trainers.map((tr) => ({
                          value: tr.trainerId,
                          label: `${tr.name || tr.trainerName || tr.displayName || tr.trainerId} (${tr.trainerId})`,
                          isDisabled: !isTrainerAvailable(
                            tr.trainerId,
                            trainer.startDate,
                            trainer.dayDuration,
                            `${rowIndex}-${batchIndex}-${trainerIdx}`
                          ),
                        }));

                        const duplicateKey = `${rowIndex}-${batchIndex}-${trainerIdx}`;
                        const isDuplicate = validationResult.duplicates.includes(duplicateKey);

                        return (
                          <div key={trainerIdx} className={`border rounded p-3 ${isDuplicate ? "bg-red-50 border-red-200" : "bg-white"}`} id={`trainer-${duplicateKey}`}>
                            {isDuplicate && (
                              <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800 flex items-center">
                                <FiAlertCircle className="mr-1" size={12} />
                                Duplicate assignment detected
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                              {/* Trainer Selection */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Trainer
                                </label>
                                <Select
                                  value={trainerOptions.find(option => option.value === trainer.trainerId) || null}
                                  onChange={(selectedOption) =>
                                    handleTrainerField(rowIndex, batchIndex, trainerIdx, "trainerId", selectedOption?.value || "")
                                  }
                                  options={trainerOptions}
                                  placeholder="Select Trainer"
                                  isSearchable={true}
                                  className="text-xs"
                                  styles={{
                                    control: (provided) => ({
                                      ...provided,
                                      minHeight: '28px',
                                      fontSize: '11px',
                                    }),
                                    option: (provided) => ({
                                      ...provided,
                                      fontSize: '11px',
                                      padding: '4px 8px',
                                    }),
                                  }}
                                />
                              </div>

                              {/* Duration */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Duration
                                </label>
                                <select
                                  value={trainer.dayDuration || ""}
                                  onChange={(e) => handleTrainerField(rowIndex, batchIndex, trainerIdx, "dayDuration", e.target.value)}
                                  className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                                >
                                  <option value="">Select Duration</option>
                                  {DAY_DURATION_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Start Date */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Start Date
                                </label>
                                <input
                                  type="date"
                                  value={trainer.startDate || ""}
                                  onChange={(e) => handleTrainerField(rowIndex, batchIndex, trainerIdx, "startDate", e.target.value)}
                                  className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                                />
                              </div>

                              {/* End Date */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  End Date
                                </label>
                                <input
                                  type="date"
                                  value={trainer.endDate || ""}
                                  onChange={(e) => handleTrainerField(rowIndex, batchIndex, trainerIdx, "endDate", e.target.value)}
                                  className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                                />
                              </div>
                            </div>

                            {/* Hours and Cost */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Total Hours
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={trainer.assignedHours || ""}
                                  onChange={(e) => handleTotalHoursChange(rowIndex, batchIndex, trainerIdx, e.target.value)}
                                  className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                                  placeholder="0"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Per Hour Cost (₹)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={trainer.perHourCost || ""}
                                  onChange={(e) => handleTrainerField(rowIndex, batchIndex, trainerIdx, "perHourCost", parseFloat(e.target.value) || 0)}
                                  className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                                  placeholder="0"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Total Cost (₹)
                                </label>
                                <div className="w-full rounded border border-gray-200 bg-gray-50 text-xs py-1 px-2 text-gray-700 font-medium">
                                  {formatIndianNumber(Math.round((Number(trainer.assignedHours) || 0) * (Number(trainer.perHourCost) || 0)))}
                                </div>
                              </div>
                            </div>

                            {/* Daily Hours Toggle */}
                            {trainer.assignedHours && Number(trainer.assignedHours) > 0 && (
                              <div className="mb-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentShow = trainer.showDailyHours;
                                    handleTrainerField(rowIndex, batchIndex, trainerIdx, "showDailyHours", !currentShow);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                  {trainer.showDailyHours ? <FiEyeOff className="mr-1" size={12} /> : <FiEye className="mr-1" size={12} />}
                                  {trainer.showDailyHours ? "Hide" : "Show"} Daily Breakdown
                                </button>

                                {trainer.showDailyHours && trainer.dailyHours && trainer.dailyHours.length > 0 && (
                                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                                      {getDateList(trainer.startDate, trainer.endDate, excludeDays, trainer.excludedDates || []).map((date, dayIndex) => (
                                        <div key={dayIndex} className="flex items-center justify-between bg-white p-1 rounded">
                                          <span className="text-gray-600">
                                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                          </span>
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={trainer.dailyHours[dayIndex] || ""}
                                            onChange={(e) => handleDailyHoursChange(rowIndex, batchIndex, trainerIdx, dayIndex, e.target.value)}
                                            className="w-12 text-xs border border-gray-200 rounded px-1"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Expenses */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Conveyance (₹)
                                </label>
                                <div className="relative">
                                  <FaRupeeSign className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={trainer.conveyance || ""}
                                    onChange={(e) => handleTrainerField(rowIndex, batchIndex, trainerIdx, "conveyance", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-full pl-6 rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                                    placeholder="0"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Food/Day (₹)
                                </label>
                                <div className="relative">
                                  <FaRupeeSign className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={trainer.food || ""}
                                    onChange={(e) => handleTrainerField(rowIndex, batchIndex, trainerIdx, "food", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-full pl-6 rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                                    placeholder="0"
                                  />
                                </div>
                                {trainer.food && getTrainingDays(trainer.startDate, trainer.endDate, excludeDays) > 0 && (
                                  <div className="text-[9px] text-gray-500 mt-1">
                                    {formatIndianNumber(trainer.food)} × {getTrainingDays(trainer.startDate, trainer.endDate, excludeDays)} = {formatIndianNumber((Number(trainer.food) || 0) * getTrainingDays(trainer.startDate, trainer.endDate, excludeDays))}
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Lodging/Day (₹)
                                </label>
                                <div className="relative">
                                  <FaRupeeSign className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={trainer.lodging || ""}
                                    onChange={(e) => handleTrainerField(rowIndex, batchIndex, trainerIdx, "lodging", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-full pl-6 rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                                    placeholder="0"
                                  />
                                </div>
                                {trainer.lodging && getTrainingDays(trainer.startDate, trainer.endDate, excludeDays) > 0 && (
                                  <div className="text-[9px] text-gray-500 mt-1">
                                    {formatIndianNumber(trainer.lodging)} × {getTrainingDays(trainer.startDate, trainer.endDate, excludeDays)} = {formatIndianNumber((Number(trainer.lodging) || 0) * getTrainingDays(trainer.startDate, trainer.endDate, excludeDays))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Total Cost Summary */}
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                              <span className="font-medium text-gray-700">Total Expenses:</span>
                              <span className="font-semibold text-green-600">
                                ₹{formatIndianNumber(Math.round(
                                  (Number(trainer.assignedHours) || 0) * (Number(trainer.perHourCost) || 0) +
                                  (Number(trainer.conveyance) || 0) +
                                  (Number(trainer.food) || 0) * getTrainingDays(trainer.startDate, trainer.endDate, excludeDays) +
                                  (Number(trainer.lodging) || 0) * getTrainingDays(trainer.startDate, trainer.endDate, excludeDays)
                                ))}
                              </span>
                            </div>

                            {/* Remove Trainer */}
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeTrainer(rowIndex, batchIndex, trainerIdx)}
                                className="text-xs text-red-600 hover:text-red-800 flex items-center"
                              >
                                <FiTrash2 className="mr-1" size={12} />
                                Remove Trainer
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default JDBatchTable;
