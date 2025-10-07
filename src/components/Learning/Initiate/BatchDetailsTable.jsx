import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import {
  FiPlus,
  FiTrash2,
  FiLayers,
  FiChevronDown,
  FiChevronUp,
  FiUser,
  FiClock,
  FiAlertTriangle,
  FiEye,
  FiEyeOff,
  FiX,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import Select from 'react-select';

const DAY_DURATION_OPTIONS = ["AM", "PM", "AM & PM"];

// Color palette options (can be expanded)
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

// Helper function to format numbers in Indian numbering system
const formatIndianNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "0";
  const numStr = num.toString();
  const [integerPart, decimalPart] = numStr.split('.');
  
  // Format integer part in Indian system
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  const formattedInteger = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
    : lastThree;
  
  // Return with decimal part if it exists
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

// Helper function to round numbers to nearest whole number
const roundToNearestWhole = (num) => {
  return Math.round(num);
};

// ✅ 1. Memoized Trainer Row Component
const TrainerRow = React.memo(
  ({
    trainer,
    trainerIdx,
    rowIndex,
    batchIndex,
    trainers,
    handleTrainerField,
    handleTotalHoursChange,
    handleDailyHoursChange,
    removeTrainer,
    openSwapModal,
    isTrainerAvailable,
    isDuplicate = false,
    excludeDays,
    commonFields,
    getTrainingHoursPerDay,
  }) => {
    // ✅ ADD: Calculate unique key for this trainer
    const trainerKey = `${rowIndex}-${batchIndex}-${trainerIdx}`;

    // Local UI state to allow adding new topics per trainer
    const [addedTopics, setAddedTopics] = useState([]);
    const [newTopicInput, setNewTopicInput] = useState("");
    // ✅ ADD: State for daily hours dropdown
    const [showDailyHoursDropdown, setShowDailyHoursDropdown] = useState(false);
    // ✅ ADD: Ref to track previous dates
    const previousDatesRef = useRef({ startDate: null, endDate: null });

    // ✅ FIXED: Use useCallback for auto-select topics to prevent render-time state updates
    const autoSelectTopics = useCallback(() => {
      // Auto-selection disabled - topics must be selected manually
    }, []);

    // ✅ FIXED: Use useEffect to call the callback, preventing render-time state updates
    useEffect(() => {
      autoSelectTopics();
    }, [autoSelectTopics]);

    // ✅ ADD: Reset added topics when trainer changes
    useEffect(() => {
      setAddedTopics([]);
      setNewTopicInput("");
    }, [trainer.trainerId]);

    // ✅ ADD: Local function to generate date list with exclusions
    const getDateList = (start, end, excludeDays, excludedDates = []) => {
      if (!start || !end) return [];
      const startDate = new Date(start);
      const endDate = new Date(end);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
      if (startDate > endDate) return [];

      const dates = [];
      let current = new Date(startDate);
      while (current <= endDate) {
        const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
        let shouldInclude = true;
        
        if (excludeDays === "Saturday" && dayOfWeek === 6) {
          shouldInclude = false;
        } else if (excludeDays === "Sunday" && dayOfWeek === 0) {
          shouldInclude = false;
        } else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) {
          shouldInclude = false;
        }
        // If excludeDays === "None", include all days
        
        if (shouldInclude) {
          const dateStr = current.toISOString().slice(0, 10);
          if (!excludedDates.includes(dateStr)) {
            dates.push(new Date(current));
          }
        }
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    // ✅ ADD: Helper function to calculate training days
    const getTrainingDays = (startDate, endDate, excludeDays) => {
      const dates = getDateList(startDate, endDate, excludeDays, trainer.excludedDates || []);
      return dates.length;
    };

    // ✅ FIXED: Use useCallback for dailyHours initialization to prevent render-time state updates
    const initializeDailyHours = useCallback(() => {
      // Track previous dates to detect changes
      const previousStart = previousDatesRef.current.startDate;
      const previousEnd = previousDatesRef.current.endDate;

      // If date range changed, reset excludedDates
      if ((trainer.startDate !== previousStart || trainer.endDate !== previousEnd) && previousStart !== null) {
        handleTrainerField(rowIndex, batchIndex, trainerIdx, "excludedDates", []);
      }
      previousDatesRef.current = { startDate: trainer.startDate, endDate: trainer.endDate };

      if (
        trainer.startDate &&
        trainer.endDate &&
        trainer.dayDuration
      ) {
        // Calculate per day hours based on dayDuration
        const perDay = getTrainingHoursPerDay(commonFields);
        let perDayHours = 0;
        if (trainer.dayDuration === "AM & PM") perDayHours = perDay;
        else if (trainer.dayDuration === "AM" || trainer.dayDuration === "PM")
          perDayHours = +(perDay / 2).toFixed(2);

        // Generate date list and populate dailyHours
        const dateList = getDateList(trainer.startDate, trainer.endDate, excludeDays, trainer.excludedDates || []);
        const currentDailyHours = trainer.dailyHours || [];
        if (dateList.length !== currentDailyHours.length) {
          const dailyHoursArray = dateList.map(() => perDayHours);

          // Update the trainer data with the calculated dailyHours
          handleTrainerField(
            rowIndex,
            batchIndex,
            trainerIdx,
            "dailyHours",
            dailyHoursArray
          );
        }
      }
    }, [
      trainer.startDate,
      trainer.endDate,
      trainer.dayDuration,
      trainer.dailyHours,
      trainer.excludedDates,
      excludeDays,
      rowIndex,
      batchIndex,
      trainerIdx,
      handleTrainerField,
      commonFields,
      getTrainingHoursPerDay,
    ]);

    // ✅ FIXED: Use useEffect to call the callback, preventing render-time state updates
    useEffect(() => {
      initializeDailyHours();
    }, [initializeDailyHours]);

  const trainerOptions = useMemo(() => {
    return trainers.map((tr) => {
      const isAvailable = isTrainerAvailable(
        tr.trainerId,
        trainer.startDate,
        trainer.dayDuration,
        `${rowIndex}-${batchIndex}-${trainerIdx}`
      );
      return {
        value: tr.trainerId,
        label: `${tr.name || tr.trainerName || tr.displayName || tr.trainerId} (${tr.trainerId})${!isAvailable ? " (Already booked)" : ""}`,
        isDisabled: !isAvailable,
      };
    });
  }, [trainers, trainer.startDate, trainer.dayDuration, rowIndex, batchIndex, trainerIdx, isTrainerAvailable]);

  return (
    <>
      <tr
          id={`trainer-${trainerKey}`}
          className={`border-b last:border-0 ${
            isDuplicate ? "bg-red-50 border-red-200" : ""
          }`}
        >
          {/* Trainer Name/Select */}
          <td className="px-2 py-1 align-top min-w-[180px]">
            {isDuplicate && (
              <div className="text-xs text-red-600 font-medium mb-1 flex items-center">
                <svg
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Duplicate
              </div>
            )}
            <Select
              value={trainerOptions.find(option => option.value === trainer.trainerId) || null}
              onChange={(selectedOption) =>
                handleTrainerField(
                  rowIndex,
                  batchIndex,
                  trainerIdx,
                  "trainerId",
                  selectedOption ? selectedOption.value : ""
                )
              }
              options={trainerOptions}
              placeholder="Select Trainer"
              isSearchable={true}
              className="text-xs"
              styles={{
                control: (provided, state) => ({
                  ...provided,
                  minHeight: '24px',
                  height: '24px',
                  fontSize: '11px',
                  borderColor: state.isFocused ? '#6366f1' : '#d1d5db',
                  '&:hover': {
                    borderColor: '#6366f1',
                  },
                  boxShadow: state.isFocused ? '0 0 0 1px #6366f1' : provided.boxShadow,
                  padding: '0 2px',
                }),
                valueContainer: (provided) => ({
                  ...provided,
                  padding: '0 4px',
                  minHeight: '22px',
                }),
                input: (provided) => ({
                  ...provided,
                  fontSize: '11px',
                  margin: '0',
                  padding: '0',
                }),
                indicatorSeparator: (provided) => ({
                  ...provided,
                  display: 'none',
                }),
                dropdownIndicator: (provided) => ({
                  ...provided,
                  padding: '0 2px',
                }),
                option: (provided, state) => ({
                  ...provided,
                  fontSize: '11px',
                  padding: '4px 8px',
                  minHeight: '24px',
                  backgroundColor: state.isDisabled ? '#f9fafb' : state.isSelected ? '#6366f1' : state.isFocused ? '#eef2ff' : provided.backgroundColor,
                  color: state.isDisabled ? '#9ca3af' : state.isSelected ? 'white' : provided.color,
                  cursor: state.isDisabled ? 'not-allowed' : 'pointer',
                }),
                placeholder: (provided) => ({
                  ...provided,
                  fontSize: '11px',
                  color: '#6b7280',
                }),
                singleValue: (provided) => ({
                  ...provided,
                  fontSize: '11px',
                }),
                menu: (provided) => ({
                  ...provided,
                  fontSize: '11px',
                }),
              }}
            />
          </td>

          {/* Duration dropdown */}
          <td className="px-2 py-1">
            <select
              value={trainer.dayDuration || ""}
              onChange={(e) =>
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
              <option value="">Select Duration</option>
              {DAY_DURATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </td>

          {/* Start Date */}
          <td className="px-2 py-1">
            <input
              type="date"
              value={trainer.startDate || ""}
              onChange={(e) =>
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
              onChange={(e) =>
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

          {/* No. of Days (Excluding specified days) */}
          <td className="px-2 py-1 text-xs">
            {(() => {
              try {
                if (!trainer.startDate || !trainer.endDate) return "-";
                const start = new Date(trainer.startDate);
                const end = new Date(trainer.endDate);
                if (isNaN(start) || isNaN(end) || end < start) return "-";
                let days = 0;
                const cur = new Date(start);
                while (cur <= end) {
                  const dayOfWeek = cur.getDay(); // 0 = Sunday, 6 = Saturday
                  let shouldInclude = true;
                  
                  if (excludeDays === "Saturday" && dayOfWeek === 6) {
                    shouldInclude = false;
                  } else if (excludeDays === "Sunday" && dayOfWeek === 0) {
                    shouldInclude = false;
                  } else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) {
                    shouldInclude = false;
                  }
                  // If excludeDays === "None", include all days
                  
                  if (shouldInclude) days++;
                  cur.setDate(cur.getDate() + 1);
                }
                return days;
              } catch {
                return "-";
              }
            })()}
          </td>

          {/* Total Hours */}
          <td className="px-2 py-1">
            <input
              type="number"
              value={trainer.assignedHours || ""}
              onChange={(e) =>
                handleTotalHoursChange(
                  rowIndex,
                  batchIndex,
                  trainerIdx,
                  e.target.value
                )
              }
              className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2"
              placeholder="Hours"
            />
          </td>

          {/* Per Hour Cost */}
          <td className="px-2 py-1">
            <input
              type="number"
              value={trainer.perHourCost || ""}
              onChange={(e) =>
                handleTrainerField(
                  rowIndex,
                  batchIndex,
                  trainerIdx,
                  "perHourCost",
                  parseFloat(e.target.value) || 0
                )
              }
              className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2"
              placeholder="Cost"
            />
          </td>

          {/* Daily Hours */}
          <td className="px-2 py-1 relative bg-gradient-to-r from-gray-50 to-white rounded-md overflow-visible">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">
                {trainer.dailyHours && trainer.dailyHours.length > 0
                  ? (
                      trainer.dailyHours.reduce(
                        (sum, hours) => sum + Number(hours || 0),
                        0
                      ) / trainer.dailyHours.length
                    ).toFixed(2)
                  : trainer.assignedHours || 0}
                h/day
              </span>
              <button
                type="button"
                onClick={() => setShowDailyHoursDropdown(!showDailyHoursDropdown)}
                disabled={!trainer.assignedHours || Number(trainer.assignedHours) <= 0}
                className={`ml-2 p-1.5 rounded-md bg-white border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all duration-200 shadow-sm ${
                  (!trainer.assignedHours || Number(trainer.assignedHours) <= 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={(!trainer.assignedHours || Number(trainer.assignedHours) <= 0) ? "Enter total hours first to view daily breakdown." : (showDailyHoursDropdown ? "Hide daily breakdown" : "Show daily breakdown")}
                aria-expanded={showDailyHoursDropdown}
                aria-controls="daily-hours-dropdown"
              >
                {showDailyHoursDropdown ? (
                  <FiEyeOff className={`w-3.5 h-3.5 ${(!trainer.assignedHours || Number(trainer.assignedHours) <= 0) ? 'text-gray-300' : 'text-indigo-600'}`} />
                ) : (
                  <FiEye className={`w-3.5 h-3.5 ${(!trainer.assignedHours || Number(trainer.assignedHours) <= 0) ? 'text-gray-300' : 'text-gray-500 hover:text-indigo-600'} transition-colors`} />
                )}
              </button>
            </div>
            {/* Dropdown for daily hours breakdown */}
            {showDailyHoursDropdown && trainer.dailyHours && trainer.dailyHours.length > 0 && (
              <div
                id="daily-hours-dropdown"
                className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-60 min-w-[240px] max-w-[280px] max-h-48 overflow-y-auto"
                role="dialog"
                aria-labelledby="daily-hours-title"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 id="daily-hours-title" className="text-xs font-semibold text-gray-800">
                    Daily Hours Breakdown
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowDailyHoursDropdown(false)}
                    className="p-0.5 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors"
                    aria-label="Close daily hours breakdown"
                  >
                    <FiX className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="text-left py-1 px-0.5 font-medium text-gray-700 text-xs">Date</th>
                      <th className="text-left py-1 px-0.5 font-medium text-gray-700 text-xs">Day</th>
                      <th className="text-left py-1 px-0.5 font-medium text-gray-700 text-xs">Hours</th>
                      <th className="text-left py-1 px-0.5 font-medium text-gray-700 text-xs">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const dates = getDateList(trainer.startDate, trainer.endDate, excludeDays, trainer.excludedDates || []);
                      return (
                        <>
                          {dates.map((date, index) => {
                            const hours = trainer.dailyHours[index] || 0;
                            return (
                              <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="py-0.5 px-0.5 text-gray-600 text-xs">
                                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </td>
                                <td className="py-0.5 px-0.5 text-gray-600 text-xs">
                                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                </td>
                                <td className="py-0.5 px-0.5 font-medium text-indigo-600 text-xs">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={hours || ""}
                                    onChange={(e) =>
                                      handleDailyHoursChange(
                                        rowIndex,
                                        batchIndex,
                                        trainerIdx,
                                        index,
                                        e.target.value === "" ? 0 : parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-12 text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-center"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="py-0.5 px-0.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const dateStr = date.toISOString().slice(0, 10);
                                      const newExcluded = [...(trainer.excludedDates || []), dateStr];
                                      handleTrainerField(rowIndex, batchIndex, trainerIdx, "excludedDates", newExcluded);
                                      // Remove from dailyHours
                                      const updatedDailyHours = [...(trainer.dailyHours || [])];
                                      updatedDailyHours.splice(index, 1);
                                      handleTrainerField(rowIndex, batchIndex, trainerIdx, "dailyHours", updatedDailyHours);
                                      // Update assignedHours
                                      const newTotal = updatedDailyHours.reduce((sum, h) => sum + Number(h || 0), 0);
                                      handleTrainerField(rowIndex, batchIndex, trainerIdx, "assignedHours", newTotal);
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Delete this date"
                                  >
                                    <FiTrash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-indigo-50 border-t border-indigo-200 font-semibold">
                            <td className="py-0.5 px-0.5 text-indigo-800 text-xs" colSpan={2}>Total:</td>
                            <td className="py-0.5 px-0.5 text-indigo-800 text-xs">
                              {(trainer.dailyHours || []).reduce((sum, hours) => sum + Number(hours || 0), 0)}h
                            </td>
                            <td></td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </td>

          {/* Actions */}
          <td className="px-2 py-1">
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => removeTrainer(rowIndex, batchIndex, trainerIdx)}
                aria-label="Remove trainer"
                title="Remove Trainer"
                className="p-1 rounded-md text-rose-500 hover:text-rose-600 hover:bg-rose-100 focus:outline-none focus:ring-1 focus:ring-rose-300 transition"
              >
                <FiTrash2 className="w-3 h-3" />
              </button>
              {trainer.dayDuration === "AM" && (
                <button
                  type="button"
                  className="ml-1 px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-black/30"
                  onClick={() => {
                    openSwapModal(rowIndex, batchIndex, trainerIdx);
                  }}
                  title="Swap Trainer"
                >
                  Swap
                </button>
              )}
            </div>
          </td>
      </tr>
      {/* Extra info row for each trainer: conveyance, food, lodging, topics (modern SaaS style) */}
      <tr className="bg-transparent text-[11px]">
  <td colSpan={6} className="px-2 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-12 gap-1.5 items-start">
              {/* All three sections in one horizontal row */}
              <div className="sm:col-span-3 lg:col-span-9 flex flex-row gap-2 items-stretch">
                {/* Conveyance, Food, Lodging section */}
                <div className="flex flex-row gap-2 self-start">
                  {/* Conveyance */}
                  <div className="flex flex-col bg-white/70 border border-gray-100 rounded-md p-0.5 min-w-[90px]">
                    <label className="text-[10px] font-semibold text-slate-600 mb-0.5">
                      Conveyance
                    </label>
                    <div className="relative">
                      <FaRupeeSign className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-500 w-3 h-3" />
                      <input
                        aria-label={`Conveyance for trainer ${
                          trainer.trainerName || trainer.trainerId || trainerIdx
                        }`}
                        type="number"
                        min="0"
                        step="0.5"
                        value={trainer.conveyance ?? ""}
                        onChange={(e) =>
                          handleTrainerField(
                            rowIndex,
                            batchIndex,
                            trainerIdx,
                            "conveyance",
                            e.target.value === ""
                              ? ""
                              : parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full pl-6 rounded border border-gray-200 bg-white text-[10px] py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                        placeholder="0"
                      />
                    </div>
                    {(() => {
                      const perDay = Number(trainer.conveyance) || 0;
                      const total = perDay; // Conveyance is one-time, no multiplication
                      if (perDay > 0) {
                        return <div className="text-[9px] text-slate-500 mt-0.5">₹{formatIndianNumber(total)}</div>;
                      }
                      return null;
                    })()}
                  </div>

                  {/* Food */}
                  <div className="flex flex-col bg-white/70 border border-gray-100 rounded-md p-0.5 min-w-[90px]">
                    <label className="text-[10px] font-semibold text-slate-600 mb-0.5">
                      Food
                    </label>
                    <div className="relative">
                      <FaRupeeSign className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-500 w-3 h-3" />
                      <input
                        aria-label={`Food for trainer ${
                          trainer.trainerName || trainer.trainerId || trainerIdx
                        }`}
                        type="number"
                        min="0"
                        step="0.5"
                        value={trainer.food ?? ""}
                        onChange={(e) =>
                          handleTrainerField(
                            rowIndex,
                            batchIndex,
                            trainerIdx,
                            "food",
                            e.target.value === ""
                              ? ""
                              : parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full pl-6 rounded border border-gray-200 bg-white text-[10px] py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                        placeholder="0"
                      />
                    </div>
                    {(() => {
                      const days = getTrainingDays(trainer.startDate, trainer.endDate, excludeDays);
                      const perDay = Number(trainer.food) || 0;
                      const total = perDay * days;
                      if (days > 0 && perDay > 0) {
                        return <div className="text-[9px] text-slate-500 mt-0.5">{formatIndianNumber(perDay)}*{days} = {formatIndianNumber(total)}</div>;
                      }
                      return null;
                    })()}
                  </div>

                  {/* Lodging */}
                  <div className="flex flex-col bg-white/70 border border-gray-100 rounded-md p-0.5 min-w-[90px]">
                    <label className="text-[10px] font-semibold text-slate-600 mb-0.5">
                      Lodging
                    </label>
                    <div className="relative">
                      <FaRupeeSign className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-500 w-3 h-3" />
                      <input
                        aria-label={`Lodging for trainer ${
                          trainer.trainerName || trainer.trainerId || trainerIdx
                        }`}
                        type="number"
                        min="0"
                        step="0.5"
                        value={trainer.lodging ?? ""}
                        onChange={(e) =>
                          handleTrainerField(
                            rowIndex,
                            batchIndex,
                            trainerIdx,
                            "lodging",
                            e.target.value === ""
                              ? ""
                              : parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full pl-6 rounded border border-gray-200 bg-white text-[10px] py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                        placeholder="0"
                      />
                    </div>
                    {(() => {
                      const days = getTrainingDays(trainer.startDate, trainer.endDate, excludeDays);
                      const perDay = Number(trainer.lodging) || 0;
                      const total = perDay * days;
                      if (days > 0 && perDay > 0) {
                        return <div className="text-[9px] text-slate-500 mt-0.5">{formatIndianNumber(perDay)}*{days} = {formatIndianNumber(total)}</div>;
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Cost section */}
                <div className="flex flex-wrap md:flex-nowrap gap-1 md:w-auto self-start">
                  {(() => {
                    const trainerCost = roundToNearestWhole(((Number(trainer.assignedHours) || 0) * (Number(trainer.perHourCost) || 0)) || 0);
                    const perHourCost = Number(trainer.perHourCost) || 0;
                    const assignedHours = Number(trainer.assignedHours) || 0;
                    const days = getTrainingDays(trainer.startDate, trainer.endDate, excludeDays);
                    const conveyanceTotal = Number(trainer.conveyance) || 0;
                    const foodTotal = (Number(trainer.food) || 0) * days;
                    const lodgingTotal = (Number(trainer.lodging) || 0) * days;
                    const miscCost = roundToNearestWhole(conveyanceTotal + foodTotal + lodgingTotal);
                    const totalCost = roundToNearestWhole(trainerCost + miscCost);
                    const boxBase = "flex items-center gap-1 bg-white/70 border border-gray-100 rounded-md px-2 py-1";
                    const valueCls = "text-xs font-semibold";
                    return (
                      <>
                        <div className={`${boxBase} text-indigo-700 flex flex-col`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium">Trainer:</span>
                            <span className={`${valueCls} text-indigo-900`}>₹{formatIndianNumber(trainerCost)}</span>
                          </div>
                          {perHourCost > 0 && assignedHours > 0 && (
                            <div className="text-[9px] text-slate-500 mt-1 text-center border-t border-indigo-100 pt-1">
                              <span className="font-mono">{formatIndianNumber(perHourCost)} × {assignedHours} = {formatIndianNumber(trainerCost)}</span>
                            </div>
                          )}
                        </div>
                        <div className={`${boxBase} text-amber-700 flex flex-col`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium">Misc:</span>
                            <span className={`${valueCls} text-amber-900`}>₹{formatIndianNumber(miscCost)}</span>
                          </div>
                        </div>
                        <div className={`${boxBase} text-emerald-700 flex flex-col`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium">Total:</span>
                            <span className={`${valueCls} text-emerald-900`}>₹{formatIndianNumber(totalCost)}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Topics section */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center space-x-1">
                      <h4 className="text-[10px] font-semibold text-slate-700">
                        Topics
                      </h4>
                      <div className="relative group">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-600 text-[10px]"
                          title="How to use topics"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] rounded py-2 px-3 shadow-lg z-50 max-w-xs">
                          <div className="font-semibold mb-1">How to manage topics:</div>
                          <ul className="space-y-1">
                            <li>• Click topic buttons to select/deselect</li>
                            <li>• Type in the box below to add new topics</li>
                            <li>• Press Enter or click Add to save</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Click to select • Type to add
                    </span>
                  </div>
                  <div className="bg-white rounded-md border border-gray-100 p-2 shadow-sm">
                    {/* Simplified topics selection UI */}
                    {(() => {
                      const trainerDoc = trainers.find(
                        (t) => t.trainerId === trainer.trainerId
                      );
                      const base = [];
                      if (trainerDoc) {
                        if (Array.isArray(trainerDoc.specialization))
                          base.push(...trainerDoc.specialization);
                        if (Array.isArray(trainerDoc.otherSpecialization))
                          base.push(...trainerDoc.otherSpecialization);
                      }

                      // Include existing session-specific topics assigned to this trainer
                      const existingSessionTopics = Array.isArray(trainer.topics)
                        ? trainer.topics
                        : trainer.topics
                        ? [trainer.topics]
                        : [];

                      const allTopics = Array.from(
                        new Set([...base, ...existingSessionTopics, ...addedTopics])
                      )
                        .filter(Boolean)
                        .sort();
                      const selected = Array.isArray(trainer.topics)
                        ? trainer.topics
                        : trainer.topics
                        ? [trainer.topics]
                        : [];

                      const toggleTopic = (topic) => {
                        const isActive = selected.includes(topic);
                        const next = isActive
                          ? selected.filter((t) => t !== topic)
                          : [...selected, topic];
                        handleTrainerField(
                          rowIndex,
                          batchIndex,
                          trainerIdx,
                          "topics",
                          next
                        );
                      };

                      return (
                        <div className="space-y-1">
                          <div
                            role="group"
                            aria-label="Topics"
                            className="min-h-[20px] max-h-24 overflow-auto rounded border border-dashed border-gray-200 p-0.5 bg-gray-50"
                          >
                            {allTopics.length === 0 ? (
                              <div className="text-[9px] text-slate-400 py-1 text-center">
                                No topics available. Add one below.
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-0.5">
                                {allTopics.map((topic) => {
                                  const active = selected.includes(topic);
                                  return (
                                    <button
                                      key={topic}
                                      type="button"
                                      role="checkbox"
                                      aria-checked={active}
                                      onClick={() => toggleTopic(topic)}
                                      className={`text-[9px] px-1 py-0.5 rounded-full border transition-all focus:outline-none focus:ring-1 focus:ring-indigo-400 truncate ${
                                        active
                                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                          : "bg-white text-slate-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
                                      }`}
                                      title={`${active ? 'Deselect' : 'Select'} topic: ${topic}`}
                                    >
                                      {topic}
                                      {active && <span className="ml-0.5 text-[9px]">✓</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5">
                            <input
                              aria-label={`Add topic for trainer ${
                                trainer.trainerName ||
                                trainer.trainerId ||
                                trainerIdx
                              }`}
                              type="text"
                              value={newTopicInput}
                              onChange={(e) => setNewTopicInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const t = (newTopicInput || "").trim();
                                  if (!t) return;
                                  if (!addedTopics.includes(t))
                                    setAddedTopics((s) => [...s, t]);
                                  const next = Array.from(
                                    new Set([...selected, t])
                                  );
                                  handleTrainerField(
                                    rowIndex,
                                    batchIndex,
                                    trainerIdx,
                                    "topics",
                                    next
                                  );
                                  setNewTopicInput("");
                                }
                              }}
                              placeholder="Type new topic here and press Enter"
                              className="flex-1 rounded border border-gray-200 px-1 py-0.5 text-[9px] focus:outline-none focus:ring-1 focus:ring-indigo-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const t = (newTopicInput || "").trim();
                                if (!t) return;
                                if (!addedTopics.includes(t))
                                  setAddedTopics((s) => [...s, t]);
                                const next = Array.from(
                                  new Set([...selected, t])
                                );
                                handleTrainerField(
                                  rowIndex,
                                  batchIndex,
                                  trainerIdx,
                                  "topics",
                                  next
                                );
                                setNewTopicInput("");
                              }}
                              className="inline-flex items-center gap-0.5 bg-indigo-600 hover:bg-indigo-700 text-white px-1.5 py-0.5 rounded text-[9px] focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={!newTopicInput.trim()}
                            >
                              <FiPlus size={10} />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div> {/* end topics card */}
                </div> {/* end topics container */}
              </div> {/* end horizontal wrapper */}
            </div> {/* end grid */}
        </td>
      </tr>
    </>
  );
  }
);

TrainerRow.displayName = "TrainerRow";

// ✅ 2. Memoized Trainers Table Component
const TrainersTable = React.memo(
  ({
    trainers,
    rowIndex,
    batchIndex,
    batch,
    row,
    allTrainers,
    selectedDomain,
    addTrainer,
    handleTrainerField,
    handleTotalHoursChange,
    handleDailyHoursChange,
    removeTrainer,
    openSwapModal,
    isTrainerAvailable,
    duplicates = [],
    refetchTrainers,
    excludeDays,
    commonFields,
    getTrainingHoursPerDay,
  }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const buttonRef = useRef(null);
    const isStudentCountValid = batch.batchPerStdCount && Number(batch.batchPerStdCount) > 0;
    const handleAddTrainerClick = () => {
      if (!isStudentCountValid) {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 3000);
      } else {
        addTrainer(rowIndex, batchIndex);
      }
    };
    return (
      <div>
        <div className="flex justify-between items-center mb-2 ">
          <h5 className="text-sm font-medium text-gray-700">Trainers</h5>
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={handleAddTrainerClick}
              disabled={!isStudentCountValid}
              className={`text-xs flex items-center font-medium transition-colors ${
                isStudentCountValid
                  ? "text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  : "text-gray-400 cursor-not-allowed"
              }`}
              type="button"
              title={isStudentCountValid ? "Add Trainer" : "Student count required"}
            >
              {isStudentCountValid ? (
                <FiPlus className="mr-1" size={12} />
              ) : (
                <FiAlertTriangle className="mr-1" size={12} />
              )}
              Add Trainer
            </button>
            {showTooltip && (
              <div
                className="absolute top-full mt-1 left-0 z-10 bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-2 rounded shadow-lg max-w-xs"
                style={{
                  whiteSpace: "nowrap",
                  transform: "translateX(-50%)",
                  left: "50%",
                }}
              >
                <div className="flex items-center">
                  <FiAlertTriangle className="mr-1" size={10} />
                  Please enter a student count for this batch before adding trainers.
                </div>
              </div>
            )}
          </div>
        </div>

        {trainers.length > 0 ? (
          <div className="overflow-visible">
            <table className="min-w-full text-xs border border-gray-200 rounded overflow-visible">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left">Trainer</th>
                  <th className="px-2 py-1 text-left">Duration</th>
                  <th className="px-2 py-1 text-left">Start Date</th>
                  <th className="px-2 py-1 text-left">End Date</th>
                  <th className="px-2 py-1 text-left">No. of Days</th>
                  <th className="px-2 py-1 text-left">Total Hours</th>
                  <th className="px-2 py-1 text-left min-w-[100px]">Per Hour Cost</th>
                  <th className="px-2 py-1 text-left">Daily Hours</th>
                  <th className="px-2 py-1 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainers.map((trainer, trainerIdx) => {
                  const duplicateKey = `${rowIndex}-${batchIndex}-${trainerIdx}`;
                  const isDuplicate = duplicates.includes(duplicateKey);

                  return (
                    <TrainerRow
                      key={`trainer-${rowIndex}-${batchIndex}-${trainerIdx}`}
                      trainer={trainer}
                      trainerIdx={trainerIdx}
                      rowIndex={rowIndex}
                      batchIndex={batchIndex}
                      batch={batch}
                      row={row}
                      trainers={allTrainers}
                      selectedDomain={selectedDomain}
                      handleTrainerField={handleTrainerField}
                      handleTotalHoursChange={handleTotalHoursChange}
                      handleDailyHoursChange={handleDailyHoursChange}
                      removeTrainer={removeTrainer}
                      openSwapModal={openSwapModal}
                      isTrainerAvailable={isTrainerAvailable}
                      isDuplicate={isDuplicate}
                      refetchTrainers={refetchTrainers}
                      excludeDays={excludeDays}
                      commonFields={commonFields}
                      getTrainingHoursPerDay={getTrainingHoursPerDay}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <FiUser className="mx-auto text-gray-400" size={20} />
            <p className="text-sm text-gray-500 mt-2">No trainers assigned</p>
          </div>
        )}
      </div>
    );
  }
);

TrainersTable.displayName = "TrainersTable";

// ✅ 3. Memoized Batch Component
const BatchComponent = React.memo(
  ({
    batch,
    batchIndex,
    rowIndex,
    row,
    trainers,
    selectedDomain,
    memoizedGetColorsForBatch,
    handleBatchChange,
    removeBatch,
    addTrainer,
    handleTrainerField,
    handleTotalHoursChange,
    handleDailyHoursChange,
    removeTrainer,
    openSwapModal,
    isTrainerAvailable,
    duplicates = [],
    refetchTrainers,
    excludeDays,
    commonFields,
    getTrainingHoursPerDay,
  }) => {
    return (
      <div
        className={`bg-white rounded-lg border ${
          memoizedGetColorsForBatch(row.batch).border
        } shadow-xs overflow-visible`}
      >
        <div
          className={`px-4 py-3 ${
            memoizedGetColorsForBatch(row.batch).accent
          } border-b ${
            memoizedGetColorsForBatch(row.batch).border
          } flex justify-between items-center`}
        >
          <span
            className={`font-medium text-sm ${
              memoizedGetColorsForBatch(row.batch).text
            }`}
          >
            Batch {batchIndex + 1}
          </span>
          <div className="flex space-x-2">
            {row.batches.length > 1 && (
              <button
                onClick={() => removeBatch(rowIndex, batchIndex)}
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
              <div className="w-full rounded border-gray-300 bg-gray-50 text-xs py-1 px-2 text-gray-700 font-medium">
                {batch.trainers.reduce(
                  (sum, t) => sum + Number(t.assignedHours || 0),
                  0
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {(() => {
            const assignedHours = batch.trainers.reduce(
              (sum, t) => sum + Number(t.assignedHours || 0),
              0
            );
            return assignedHours > 0 ? (
              <div className="mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600 font-medium">
                    Assigned Hours: {assignedHours} / {assignedHours}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded"
                    style={{
                      width: "100%",
                    }}
                  ></div>
                </div>
              </div>
            ) : null;
          })()}

          {/* Trainers Table */}
          <TrainersTable
            trainers={batch.trainers || []}
            rowIndex={rowIndex}
            batchIndex={batchIndex}
            batch={batch}
            row={row}
            allTrainers={trainers}
            selectedDomain={selectedDomain}
            addTrainer={addTrainer}
            handleTrainerField={handleTrainerField}
            handleTotalHoursChange={handleTotalHoursChange}
            handleDailyHoursChange={handleDailyHoursChange}
            removeTrainer={removeTrainer}
            openSwapModal={openSwapModal}
            isTrainerAvailable={isTrainerAvailable}
            duplicates={duplicates}
            refetchTrainers={refetchTrainers}
            excludeDays={excludeDays}
            commonFields={commonFields}
            getTrainingHoursPerDay={getTrainingHoursPerDay}
          />
        </div>
      </div>
    );
  }
);

BatchComponent.displayName = "BatchComponent";

// Accept globalTrainerAssignments as a prop (array of {trainerId, date, dayDuration, ...})
const BatchDetailsTable = ({
  table1Data,
  setTable1Data,
  selectedDomain,
  commonFields,
  onSwapTrainer,
  mergeFirestoreConfig,
  courses,
  onValidationChange,
  globalTrainerAssignments = [], // <-- pass this from parent (InitiationModal)
  training,
  currentTrainingAssignments = [], // <-- assignments from other domains in current training
  excludeDays = "None",
}) => {
  const [mergeModal, setMergeModal] = useState({
    open: false,
    sourceRowIndex: null,
    targetRowIndices: [], // Changed from targetRowIndex to targetRowIndices
    mergeType: "whole-phase", // "whole-phase" or "specific-date"
    startDate: "",
    endDate: "",
  });

  // Helper function to generate consistent colors for specializations
  const getSpecializationColors = useCallback((specialization, courses) => {
    if (!courses || !specialization) return DEFAULT_COLORS;

    // Find the course index to assign consistent color
    const courseIndex = courses.findIndex(
      (c) => c.specialization === specialization
    );

    return COLOR_PALETTE[courseIndex % COLOR_PALETTE.length] || DEFAULT_COLORS;
  }, []);

  const [trainers, setTrainers] = useState([]);
  const didAutoExpand = useRef(false);

  const [expandedBatch, setExpandedBatch] = useState({});
  const [swapModal, setSwapModal] = useState({ open: false, source: null });
  const [duplicateTrainers, setDuplicateTrainers] = useState([]);

  // ✅ 4. Memoize filtered trainers to prevent unnecessary re-filtering
const filteredTrainers = useMemo(() => {
  return trainers;
}, [trainers]);  // ✅ 5. Memoize batch statistics to prevent recalculation on every render
  const batchStatistics = useMemo(() => {
    return table1Data.map((row, rowIndex) => {
      const totalAssignedStudents = row.batches.reduce(
        (sum, b) => sum + Number(b.batchPerStdCount || 0),
        0
      );
      const totalAssignedHours = row.batches.reduce(
        (sum, batch) =>
          sum +
          (batch.trainers || []).reduce(
            (bSum, trainer) => bSum + Number(trainer.assignedHours || 0),
            0
          ),
        0
      );

      return {
        rowIndex,
        totalAssignedStudents,
        totalAssignedHours,
        trainerCount: row.batches.reduce(
          (sum, batch) => sum + (batch.trainers?.length || 0),
          0
        ),
        totalTrainerHours: row.batches.reduce(
          (sum, batch) =>
            sum +
            (batch.trainers || []).reduce(
              (bSum, trainer) => bSum + Number(trainer.assignedHours || 0),
              0
            ),
          0
        ),
      };
    });
  }, [table1Data]);

  // ✅ 7. Memoize colors for batch to prevent recalculation
  const memoizedGetColorsForBatch = useCallback(
    (batchName) => {
      return getSpecializationColors(batchName, courses);
    },
    [courses, getSpecializationColors]
  );

  // GLOBAL TRAINER AVAILABILITY CHECK
  const isTrainerAvailable = (
    trainerId,
    date,
    dayDuration,
    excludeTrainerKey = null,
    currentBatchKey = null
  ) => {
    // 1. Check current table (local)
    for (let rowIdx = 0; rowIdx < table1Data.length; rowIdx++) {
      const row = table1Data[rowIdx];
      for (let batchIdx = 0; batchIdx < row.batches.length; batchIdx++) {
        const batch = row.batches[batchIdx];
        const batchKey = `${rowIdx}-${batchIdx}`;
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
            trainer.startDate &&
            trainer.endDate
          ) {
            const startDateObj = new Date(trainer.startDate);
            const endDateObj = new Date(trainer.endDate);
            const dateObj = new Date(date);
            if (
              !isNaN(dateObj.getTime()) &&
              !isNaN(startDateObj.getTime()) &&
              !isNaN(endDateObj.getTime()) &&
              dateObj >= startDateObj &&
              dateObj <= endDateObj
            ) {
              // Conflict logic
              if (
                trainer.dayDuration === "AM & PM" ||
                dayDuration === "AM & PM" ||
                (trainer.dayDuration === "AM" && dayDuration === "AM") ||
                (trainer.dayDuration === "PM" && dayDuration === "PM")
              ) {
                return false;
              }
            }
          }
        }
      }
    }
    // 2. Check global assignments
    const normalizeDate = (d) => {
      if (!d) return null;
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return null;
      return dt.toISOString().slice(0, 10);
    };

    for (let assignment of globalTrainerAssignments) {
      if (assignment.trainerId !== trainerId) continue;

      // Build list of dates for the assignment (supports single date or range)
      let assignDates = [];
      if (assignment.date) {
        const d = normalizeDate(assignment.date);
        if (d) assignDates.push(d);
      } else if (assignment.startDate && assignment.endDate) {
        const list = getDateList(
          assignment.startDate,
          assignment.endDate
        );
        assignDates = list.map((dd) => normalizeDate(dd)).filter(Boolean);
      }

      const dateNorm = normalizeDate(date);
      if (!dateNorm) continue;

      if (assignDates.includes(dateNorm)) {
        const ad = assignment.dayDuration;
        if (
          ad === "AM & PM" ||
          dayDuration === "AM & PM" ||
          (ad === "AM" && dayDuration === "AM") ||
          (ad === "PM" && dayDuration === "PM")
        ) {
          return false;
        }
      }
    }
    return true;
  };
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

  const generateBatchCode = (specialization, index) => {
    return `${specialization}${index}`;
  };

  // When adding a batch, assignedHours for new batches should match batch 1's assignedHours
  const addBatch = (rowIndex) => {
    const updatedData = [...table1Data];
    const batches = updatedData[rowIndex].batches;
    const newBatchIndex = batches.length;
    updatedData[rowIndex].batches.push({
      batchPerStdCount: "",
      batchCode: generateBatchCode(
        updatedData[rowIndex].batch,
        newBatchIndex + 1
      ),
      assignedHours: 0, // Start with 0, will be calculated from trainers
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
  const handleMergeBatch = async (
    sourceRowIndex,
    targetRowIndices,
    mergeType = "whole-phase",
    startDate = "",
    endDate = ""
  ) => {
    const updatedData = [...table1Data];
    const sourceRow = updatedData[sourceRowIndex];
    const targetRows = targetRowIndices.map(idx => updatedData[idx]).filter(Boolean);

    if (!sourceRow || targetRows.length === 0) {
      return;
    }

    // Combine students and hours from all targets
    const combinedStudents = targetRows.reduce((sum, tgt) => sum + Number(tgt.stdCount || 0), Number(sourceRow.stdCount || 0));
    const combinedHours = targetRows.reduce((sum, tgt) => sum + Number(tgt.hrs || 0), Number(sourceRow.hrs || 0));

    // Create merged batch name
    const allSpecializations = [sourceRow.batch, ...targetRows.map(t => t.batch)];
    const mergedBatchName = allSpecializations.join('+');

    // Save shallow copies of originals for undo
    const originalSourceCopy = JSON.parse(JSON.stringify(sourceRow));
    const originalTargetCopies = targetRowIndices.map(idx => ({
      ...JSON.parse(JSON.stringify(updatedData[idx])),
      originalIndex: idx
    }));

    if (mergeType === "whole-phase") {
      // Original whole-phase merge logic adapted for multiple targets
      const mergedRow = {
        ...sourceRow,
        batch: mergedBatchName,
        stdCount: combinedStudents,
        hrs: combinedHours,
        assignedHours: combinedHours,
        isMerged: true,
        originalData: {
          source: originalSourceCopy,
          targets: originalTargetCopies,
          sourceIndex: sourceRowIndex,
          targetIndices: targetRowIndices,
        },
        batches: [
          {
            batchPerStdCount: combinedStudents,
            batchCode: `${mergedBatchName}-1`,
            isMerged: true,
            mergedFrom: mergedBatchName,
            assignedHours: combinedHours,
            trainers: [],
          },
        ],
      };

      // Replace source with mergedRow and remove all targets
      updatedData[sourceRowIndex] = mergedRow;
      
      // Remove targets in reverse order to maintain indices
      targetRowIndices.sort((a, b) => b - a).forEach(idx => {
        if (idx > sourceRowIndex) {
          updatedData.splice(idx, 1);
        } else {
          updatedData.splice(idx, 1);
        }
      });
    } else if (mergeType === "specific-date") {
      // Specific-date merge logic adapted for multiple targets
      const mergeStartDate = new Date(startDate);
      const mergeEndDate = new Date(endDate);
      const mergeHours = combinedHours;

      // Validate date range
      if (isNaN(mergeStartDate.getTime()) || isNaN(mergeEndDate.getTime())) {
        alert("Invalid date range provided for merge");
        return;
      }

      if (mergeStartDate > mergeEndDate) {
        alert("Start date cannot be after end date");
        return;
      }

      // For specific-date merge, keep original specializations unchanged
      // Just create the merged batch with combined hours

      // Create merged batch as a new row
      const mergedRow = {
        ...sourceRow,
        batch: mergedBatchName,
        stdCount: combinedStudents,
        hrs: mergeHours,
        assignedHours: mergeHours,
        isMerged: true,
        originalData: {
          source: originalSourceCopy,
          targets: originalTargetCopies,
          sourceIndex: sourceRowIndex,
          targetIndices: targetRowIndices,
          mergeType: "specific-date",
          mergeStartDate: startDate,
          mergeEndDate: endDate,
          mergeHours: mergeHours,
        },
        batches: [
          {
            batchPerStdCount: combinedStudents,
            batchCode: `${mergedBatchName}-1`,
            isMerged: true,
            mergedFrom: mergedBatchName,
            assignedHours: mergeHours,
            startDate: startDate,
            endDate: endDate,
            trainers: [],
          },
        ],
      };

      // Insert merged row after the last target row
      const insertIndex = Math.max(sourceRowIndex, ...targetRowIndices) + 1;
      updatedData.splice(insertIndex, 0, mergedRow);
    }

    setTable1Data(updatedData);

    // Persist if config provided
    if (
      typeof mergeFirestoreConfig === "object" &&
      mergeFirestoreConfig?.collectionPath
    ) {
      try {
        const { collectionPath, docIdField } = mergeFirestoreConfig;
        if (docIdField && sourceRow[docIdField]) {
          const sourceDocRef = doc(
            db,
            collectionPath,
            String(sourceRow[docIdField])
          );
          await updateDoc(sourceDocRef, sourceRow);
        } else {
          await addDoc(collection(db, collectionPath), sourceRow);
        }
      } catch {
        // Error persisting merged batch
      }
    }

    setMergeModal({
      open: false,
      sourceRowIndex: null,
      targetRowIndices: [],
      mergeType: "whole-phase",
      startDate: "",
      endDate: "",
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
    } else {
      // assignedHours is now read-only and calculated from trainers
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

  // ✅ UPDATE: handleTrainerField function to handle dailyHours updates
  const handleTrainerField = (
    rowIndex,
    batchIndex,
    trainerIdx,
    field,
    value
  ) => {
    const updated = [...table1Data];
    const batch = updated[rowIndex].batches[batchIndex];
    const trainer = batch.trainers[trainerIdx];

    // ✅ ADD: Handle dailyHours field updates
    if (field === "dailyHours") {
      trainer.dailyHours = value;
      trainer.assignedHours = value.reduce(
        (sum, hours) => sum + Number(hours || 0),
        0
      );
      setTable1Data(updated);
      return;
    }

    // Create tempTrainer with new value
    const tempTrainer = { ...trainer, [field]: value };

    if (["dayDuration", "startDate", "endDate"].includes(field)) {
      if (
        !tempTrainer.dayDuration ||
        !tempTrainer.startDate ||
        !tempTrainer.endDate
      ) {
        // Not enough data yet to check conflict
        trainer[field] = value;
        setTable1Data(updated);
        return;
      }

      // Prepare dates
      const normalizeDate = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().slice(0, 10);
      };
      const newTrainerDates = getDateList(
        tempTrainer.startDate,
        tempTrainer.endDate
      );
      const newTrainerDatesNormalized = newTrainerDates
        .map(normalizeDate)
        .filter((date) => date !== null);

      const hasConflict = batch.trainers.some((t, idx) => {
        if (idx === trainerIdx) return false;
        if (t.dayDuration !== tempTrainer.dayDuration) return false;

        const existingDates =
          t.activeDates || getDateList(t.startDate, t.endDate);
        const existingDatesNormalized = existingDates
          .map(normalizeDate)
          .filter((date) => date !== null);

        return newTrainerDatesNormalized.some((date) =>
          existingDatesNormalized.includes(date)
        );
      });

      if (hasConflict) {
        alert(
          `This batch already has a trainer for ${tempTrainer.dayDuration} slot on overlapping dates.`
        );
        return;
      }

      // No conflict, update the field
      trainer[field] = value;

      // ✅ FIXED: Calculate and update assignedHours properly
      const perDay = getTrainingHoursPerDay(commonFields);
      let perDayHours = 0;
      if (trainer.dayDuration === "AM & PM") perDayHours = perDay;
      else if (trainer.dayDuration === "AM" || trainer.dayDuration === "PM")
        perDayHours = +(perDay / 2).toFixed(2);

      const dateList = getDateList(
        trainer.startDate,
        trainer.endDate
      );
      trainer.activeDates = dateList;
      trainer.dailyHours = dateList.map(() => perDayHours);

      // ✅ FIXED: Update assignedHours to match the sum of dailyHours
      trainer.assignedHours = trainer.dailyHours.reduce(
        (a, b) => a + Number(b || 0),
        0
      );
    }

    if (field === "trainerId") {
      const tr = trainers.find((t) => t.trainerId === value);

      // ✅ FIXED: Handle different possible field names for trainer name
      trainer.trainerName =
        tr?.name || tr?.trainerName || tr?.displayName || "";
      trainer.perHourCost = tr?.paymentType === "Per Hour" ? tr?.charges : 0;

      // ✅ ADDED: Reset topics when trainer changes
      trainer.topics = [];

      // ✅ ADDED: Set trainerId to ensure the dropdown shows the selection
      trainer.trainerId = value;
    }

    // ✅ FIXED: Ensure assignedHours is always a number
    if (field === "assignedHours") {
      trainer.assignedHours = Number(value) || 0;
    }

    // Persist other generic trainer fields (conveyance, food, lodging, topics, etc.)
    if (
      ![
        "dailyHours",
        "dayDuration",
        "startDate",
        "endDate",
        "trainerId",
        "assignedHours",
      ].includes(field)
    ) {
      trainer[field] = value;
    }

    setTable1Data(updated);

    // Duplicate detection will be handled automatically by useEffect when table1Data changes
  }; // ✅ ADDED: Missing closing brace for the function

  // 1) getAvailableSpecializations (replace existing)
  const getAvailableSpecializations = (sourceRowIndex) => {
    if (!table1Data || table1Data.length === 0) {
      return [];
    }
    const sourceRow = table1Data[sourceRowIndex];
    if (!sourceRow) {
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
          ? row.domain.toLowerCase().trim() ===
            selectedDomain.toLowerCase().trim()
          : true;

        // Hours match: if both sides provide hrs, compare numerically; if missing, allow (be permissive)
        const hrsMatch =
          row.hrs !== undefined && sourceRow.hrs !== undefined
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

    return result;
  };

  const getDateList = useCallback((start, end) => {
    if (!start || !end) return [];
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
    if (startDate > endDate) return [];

    const dates = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
      let shouldInclude = true;
      
      if (excludeDays === "Saturday" && dayOfWeek === 6) {
        shouldInclude = false;
      } else if (excludeDays === "Sunday" && dayOfWeek === 0) {
        shouldInclude = false;
      } else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) {
        shouldInclude = false;
      }
      // If excludeDays === "None", include all days
      
      if (shouldInclude) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [excludeDays]);

  const toggleBatchExpansion = (rowIndex) => {
    setExpandedBatch((prev) => ({
      ...prev,
      [rowIndex]: !prev[rowIndex],
    }));
  };

  const handleTotalHoursChange = (rowIndex, batchIndex, trainerIdx, value) => {
    const updated = [...table1Data];
    const trainer = updated[rowIndex].batches[batchIndex].trainers[trainerIdx];
    const days = trainer.dailyHours ? trainer.dailyHours.length : 0;
    let total = Number(value) || 0;

    // ✅ FIXED: Update assignedHours instead of totalHours
    trainer.assignedHours = total;

    if (days > 0) {
      const equal = Math.floor(total / days);
      const remainder = total - equal * days;
      trainer.dailyHours = Array(days).fill(equal);
      if (remainder > 0) {
        trainer.dailyHours[days - 1] += remainder;
      }
    } else {
      // If no daily breakdown, set a single value
      trainer.dailyHours = total > 0 ? [total] : [];
    }

    setTable1Data(updated);
  };

  const handleDailyHoursChange = (rowIndex, batchIndex, trainerIdx, dayIndex, value) => {
    const updated = [...table1Data];
    const trainer = updated[rowIndex].batches[batchIndex].trainers[trainerIdx];
    if (!trainer.dailyHours || trainer.dailyHours.length === 0) return;

    // Update the specific day's hours
    trainer.dailyHours[dayIndex] = Number(value) || 0;

    // Recalculate total assignedHours
    trainer.assignedHours = trainer.dailyHours.reduce((sum, hours) => sum + Number(hours || 0), 0);

    setTable1Data(updated);
  };

  const openSwapModal = (rowIdx, batchIdx, trainerIdx) => {
    setSwapModal({ open: true, source: { rowIdx, batchIdx, trainerIdx } });
  };

  const closeSwapModal = () => {
    setSwapModal({ open: false, source: null });
  };

  const handleSwap = (target) => {
    if (!swapModal.source || !target) {
      return;
    }

    const source = swapModal.source;

    // Get trainer data
    const sourceTrainerData =
      table1Data[source.rowIdx]?.batches[source.batchIdx]?.trainers[
        source.trainerIdx
      ];
    const targetTrainerData =
      table1Data[target.rowIdx]?.batches[target.batchIdx]?.trainers[
        target.trainerIdx
      ];

    if (!sourceTrainerData || !targetTrainerData) {
      alert("Error: Could not find trainer data for swap");
      return;
    }

    // Calculate duration compatibility
    const getDateDifference = (startDate, endDate) => {
      if (!startDate || !endDate) return 0;
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    };

    const sourceDuration = getDateDifference(
      sourceTrainerData.startDate,
      sourceTrainerData.endDate
    );
    const targetDuration = getDateDifference(
      targetTrainerData.startDate,
      targetTrainerData.endDate
    );

    // Check if durations match
    if (sourceDuration !== targetDuration) {
      alert(
        `Cannot swap trainers: Duration mismatch.\n` +
          `Source trainer: ${sourceDuration} days\n` +
          `Target trainer: ${targetDuration} days\n` +
          `Both trainers must have the same number of training days.`
      );
      return;
    }

    // FIXED: Swap batches AND time slots
    const getOppositeTimeSlot = (currentSlot) => {
      if (currentSlot === "AM") return "PM";
      if (currentSlot === "PM") return "AM";
      return currentSlot; // For "AM & PM", keep as is
    };

    const sourceNewTimeSlot = getOppositeTimeSlot(
      sourceTrainerData.dayDuration
    );
    const targetNewTimeSlot = getOppositeTimeSlot(
      targetTrainerData.dayDuration
    );

    // Check availability in the TARGET batches (cross-swap)
    // Check if source trainer can be added to TARGET batch in new time slot
    const sourceAvailableInTargetBatch = isTrainerAvailable(
      sourceTrainerData.trainerId,
      sourceTrainerData.startDate,
      sourceNewTimeSlot,
      `${source.rowIdx}-${source.batchIdx}-${source.trainerIdx}`,
      `${target.rowIdx}-${target.batchIdx}` // Check target batch
    );

    // Check if target trainer can be added to SOURCE batch in new time slot
    const targetAvailableInSourceBatch = isTrainerAvailable(
      targetTrainerData.trainerId,
      targetTrainerData.startDate,
      targetNewTimeSlot,
      `${target.rowIdx}-${target.batchIdx}-${target.trainerIdx}`,
      `${source.rowIdx}-${source.batchIdx}` // Check source batch
    );

    if (!sourceAvailableInTargetBatch || !targetAvailableInSourceBatch) {
      alert(
        `Cannot perform cross-batch swap due to scheduling conflicts:\n` +
          `${
            !sourceAvailableInTargetBatch
              ? `• ${
                  sourceTrainerData.trainerName
                } is not available for ${sourceNewTimeSlot} slot in ${
                  table1Data[target.rowIdx]?.batch
                } batch\n`
              : ""
          }` +
          `${
            !targetAvailableInSourceBatch
              ? `• ${
                  targetTrainerData.trainerName
                } is not available for ${targetNewTimeSlot} slot in ${
                  table1Data[source.rowIdx]?.batch
                } batch`
              : ""
          }`
      );
      return;
    }

    if (onSwapTrainer) {
      try {
        onSwapTrainer({
          domain: selectedDomain, // ✅ ADD: Pass current domain context
          source: {
            ...swapModal.source,
            trainerData: sourceTrainerData,
            newTimeSlot: sourceNewTimeSlot,
            targetBatch: {
              rowIdx: target.rowIdx,
              batchIdx: target.batchIdx,
              batchCode:
                table1Data[target.rowIdx]?.batches[target.batchIdx]?.batchCode,
              specialization: table1Data[target.rowIdx]?.batch,
            },
          },
          target: {
            ...target,
            trainerData: targetTrainerData,
            newTimeSlot: targetNewTimeSlot,
            targetBatch: {
              rowIdx: source.rowIdx,
              batchIdx: source.batchIdx,
              batchCode:
                table1Data[source.rowIdx]?.batches[source.batchIdx]?.batchCode,
              specialization: table1Data[source.rowIdx]?.batch,
            },
          },
        });
      } catch (error) {

        alert("Error occurred during swap: " + error.message);
        return;
      }
    } else {
      // Fallback: perform cross-batch swap locally

      const updatedData = [...table1Data];

      // Create new trainer objects for cross-batch placement
      const sourceNewTrainer = {
        ...sourceTrainerData,
        dayDuration: sourceNewTimeSlot,
      };

      const targetNewTrainer = {
        ...targetTrainerData,
        dayDuration: targetNewTimeSlot,
      };

      // CROSS-BATCH SWAP: Add source trainer to target batch, target trainer to source batch
      updatedData[target.rowIdx].batches[target.batchIdx].trainers.push(
        sourceNewTrainer
      );
      updatedData[source.rowIdx].batches[source.batchIdx].trainers.push(
        targetNewTrainer
      );

      setTable1Data(updatedData);
    }

    closeSwapModal();
  };

  // Update the getAMTrainers function to include duration information
  const getAMTrainers = () => {
    if (!swapModal.source) {
      return [];
    }

    const sourceTrainer =
      table1Data[swapModal.source.rowIdx]?.batches[swapModal.source.batchIdx]
        ?.trainers[swapModal.source.trainerIdx];

    if (!sourceTrainer) {
      return [];
    }

    // Calculate source trainer duration
    const getDateDifference = (startDate, endDate) => {
      if (!startDate || !endDate) return 0;
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const sourceDuration = getDateDifference(
      sourceTrainer.startDate,
      sourceTrainer.endDate
    );

    const list = [];
    table1Data.forEach((row, rowIdx) => {
      row.batches.forEach((batch, batchIdx) => {
        batch.trainers.forEach((trainer, trainerIdx) => {
          const isSourceTrainer =
            swapModal.source &&
            swapModal.source.rowIdx === rowIdx &&
            swapModal.source.batchIdx === batchIdx &&
            swapModal.source.trainerIdx === trainerIdx;

          if (isSourceTrainer) return; // Skip source trainer

          // Calculate this trainer's duration
          const trainerDuration = getDateDifference(
            trainer.startDate,
            trainer.endDate
          );

          // Only include trainers with matching duration and opposite time slot potential
          const canSwap =
            ((trainer.dayDuration === "AM" &&
              sourceTrainer.dayDuration === "AM") ||
              (trainer.dayDuration === "PM" &&
                sourceTrainer.dayDuration === "PM")) &&
            trainerDuration === sourceDuration;

          if (canSwap) {
            list.push({
              rowIdx,
              batchIdx,
              trainerIdx,
              batchCode: batch.batchCode,
              trainerName: trainer.trainerName,
              trainerId: trainer.trainerId,
              duration: trainerDuration,
              dateRange: `${trainer.startDate} to ${trainer.endDate}`,
              specialization: row.batch,
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
    const updated = table1Data.map((row) => ({
      ...row,
      batches: row.batches.map((batch) => ({
        ...batch,
        trainers: (batch.trainers || []).map((trainer) => {
          if (
            trainer.activeDates &&
            typeof trainer.activeDates[0] === "string"
          ) {
            changed = true;
            return {
              ...trainer,
              activeDates: trainer.activeDates
                .map((d) => new Date(d))
                .filter((date) => !isNaN(date.getTime())),
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
      // Only auto-expand if it's a completely new trainer being added
      // (This part can be handled in addTrainer function if needed)

      didAutoExpand.current = true;
    }
  }, [table1Data]);

  const undoMerge = async (mergedRowIndex) => {
    const updated = [...table1Data];
    const mergedRow = updated[mergedRowIndex];
    if (!mergedRow || !mergedRow.originalData) {
      return;
    }

    const {
      source,
      targets,
      sourceIndex,
      targetIndices,
      mergeType,
      mergeStartDate: _mergeStartDate,
      mergeEndDate: _mergeEndDate,
      mergeHours: _mergeHours,
    } = mergedRow.originalData;

    if (mergeType === "specific-date") {
      // For specific-date merge undo:
      // 1. Remove the merged row
      // 2. Restore original hours to source and target rows
      // 3. Remove merge-related properties

      // Find source and target rows by their original indices
      const sourceRow = updated[sourceIndex];
      const targetRows = targetIndices.map(idx => updated.find((row, i) => i === idx)).filter(Boolean);

      if (sourceRow && targetRows.length > 0) {
        // Restore original hours
        sourceRow.hrs = source.hrs;
        sourceRow.assignedHours = source.hrs;
        targetRows.forEach((tgt, idx) => {
          const originalTarget = targets[idx];
          if (originalTarget) {
            tgt.hrs = originalTarget.hrs;
            tgt.assignedHours = originalTarget.hrs;
          }
        });

        // Remove merge-related properties
        delete sourceRow.isMerged;
        delete sourceRow.originalData;
        targetRows.forEach(tgt => {
          delete tgt.isMerged;
          delete tgt.originalData;
        });

        // Restore original batch names (remove date range from target)
        targetRows.forEach(tgt => {
          if (tgt.batch.includes("(")) {
            tgt.batch = tgt.batch.split(" (")[0];
          }
        });
      }

      // Remove the merged row
      updated.splice(mergedRowIndex, 1);
    } else {
      // Original whole-phase merge undo logic adapted for multiple targets
      // Restore shallow copies
      const restoredSource = { ...source };
      const restoredTargets = targets.map(target => ({ ...target }));

      // Replace merged row position with restored source
      updated[mergedRowIndex] = restoredSource;

      // Insert targets back in their original positions
      targetIndices.forEach((originalIdx, i) => {
        const restoredTarget = restoredTargets[i];
        if (restoredTarget) {
          updated.splice(originalIdx, 0, restoredTarget);
        }
      });
    }

    setTable1Data(updated);

    // Optional: revert persisted merge in Firestore if mergeFirestoreConfig provided
    if (
      typeof mergeFirestoreConfig === "object" &&
      mergeFirestoreConfig?.collectionPath
    ) {
      try {
        // rename unused destructured names with leading underscore to satisfy eslint
        const { collectionPath: _collectionPath, docIdField: _docIdField } =
          mergeFirestoreConfig;
        // Implement revert logic here if needed. _collectionPath/_docIdField are preserved for future use.
      } catch (err) {
      }
    }
  };

  // Memoize validation result to prevent unnecessary re-renders
  const validationResult = useMemo(() => {
    if (!table1Data || table1Data.length === 0) {
      return {
        hasErrors: false,
        errors: [],
        duplicates: [],
      };
    }

    // Improved duplicate detection with normalized dates and readable errors
    const duplicatesSet = new Set();
    const trainerMap = new Map();
    const errors = [];

    const normalizeDate = (d) => {
      if (!d) return null;
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return null;
      return dateObj.toISOString().slice(0, 10);
    };

    table1Data.forEach((row, rowIndex) => {
      row.batches?.forEach((batch, batchIndex) => {
        batch.trainers?.forEach((trainer, trainerIdx) => {
          if (!trainer.trainerId) return;

          // Build list of normalized active dates for this trainer
          let dates = [];
          if (trainer.activeDates && trainer.activeDates.length > 0) {
            dates = trainer.activeDates
              .map((dd) => normalizeDate(dd))
              .filter(Boolean);
          } else if (trainer.startDate && trainer.endDate) {
            const generated = getDateList(
              trainer.startDate,
              trainer.endDate
            );
            dates = generated.map((dd) => normalizeDate(dd)).filter(Boolean);
          } else if (trainer.startDate) {
            const single = normalizeDate(trainer.startDate);
            if (single) dates = [single];
          }

          if (dates.length === 0) return; // nothing to compare

          const trainerKey = `${rowIndex}-${batchIndex}-${trainerIdx}`;

          dates.forEach((dateISO) => {
            const keyBase = `${trainer.trainerId}-${dateISO}`;

            if (trainerMap.has(keyBase)) {
              const existing = trainerMap.get(keyBase);
              const existingKey = existing.trainerKey;
              // If the existing entry is the same trainer instance (same key), skip
              if (existingKey === trainerKey) return;
              
              // Check time slot overlap
              const conflict =
                trainer.dayDuration === "AM & PM" ||
                existing.dayDuration === "AM & PM" ||
                (trainer.dayDuration === "AM" &&
                  existing.dayDuration === "AM") ||
                (trainer.dayDuration === "PM" && existing.dayDuration === "PM");

              if (conflict) {
                duplicatesSet.add(existingKey);
                duplicatesSet.add(trainerKey);

                // add a readable error for this conflict (grouped by trainer/date)
                const message = `${trainer.trainerName || trainer.trainerId} (${
                  trainer.trainerId
                }) has conflicting assignment on ${dateISO} for slot ${
                  trainer.dayDuration || existing.dayDuration
                }`;
                errors.push({ message });
                // Debug log to help track false positives
              }
            } else {
              trainerMap.set(keyBase, {
                trainerKey,
                dayDuration: trainer.dayDuration,
              });
            }

            // Check global assignments (normalize their date too)
            for (let assignment of globalTrainerAssignments) {
              // Skip assignments from the current training project
              if (assignment.sourceTrainingId === training?.projectCode) {
                continue;
              }
              
              const assignDate = normalizeDate(assignment.date);
              if (!assignDate) continue;
              if (
                assignment.trainerId === trainer.trainerId &&
                assignDate === dateISO
              ) {
                const globalConflict =
                  assignment.dayDuration === "AM & PM" ||
                  trainer.dayDuration === "AM & PM" ||
                  (assignment.dayDuration === "AM" &&
                    trainer.dayDuration === "AM") ||
                  (assignment.dayDuration === "PM" &&
                    trainer.dayDuration === "PM");
                if (globalConflict) {
                  duplicatesSet.add(trainerKey);

                  // Enhanced conflict message with detailed information
                  const conflictDetails = [];

                  // Add current assignment details with clear project code label
                  conflictDetails.push(`🔄 Conflicting Project Code: ${assignment.sourceTrainingId || 'Unknown Project'}`);
                  conflictDetails.push(`📚 College: ${assignment.collegeName || 'Not specified'}`);
                  conflictDetails.push(`👥 Batch: ${assignment.batchCode || 'Not specified'}`);
                  conflictDetails.push(`🎯 Domain: ${assignment.domain || 'Not specified'}`);
                  conflictDetails.push(`⏰ Duration: ${assignment.dayDuration || 'Not specified'}`);
                  conflictDetails.push(`📅 Date: ${assignDate}`);

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

            // Check current training assignments from other domains
            for (let assignment of currentTrainingAssignments) {
              const assignDate = normalizeDate(assignment.date || assignment.startDate);
              if (!assignDate) continue;
              if (
                assignment.trainerId === trainer.trainerId &&
                assignDate === dateISO
              ) {
                const currentTrainingConflict =
                  assignment.dayDuration === "AM & PM" ||
                  trainer.dayDuration === "AM & PM" ||
                  (assignment.dayDuration === "AM" &&
                    trainer.dayDuration === "AM") ||
                  (assignment.dayDuration === "PM" &&
                    trainer.dayDuration === "PM");
                if (currentTrainingConflict) {
                  duplicatesSet.add(trainerKey);

                  // Conflict message for current training cross-domain conflicts
                  const conflictDetails = [];

                  conflictDetails.push(`🔄 Conflicting Assignment in Current Training`);
                  conflictDetails.push(`👥 Batch: ${assignment.batchCode || 'Not specified'}`);
                  conflictDetails.push(`🎯 Domain: ${assignment.domain || 'Not specified'}`);
                  conflictDetails.push(`⏰ Duration: ${assignment.dayDuration || 'Not specified'}`);
                  conflictDetails.push(`📅 Date: ${assignDate}`);

                  // Add trainer name if available
                  if (assignment.trainerName) {
                    conflictDetails.push(`👤 Trainer: ${assignment.trainerName}`);
                  }

                  // Add new assignment attempt details
                  conflictDetails.push(`\n🆕 Trying to Assign to Current Domain:`);
                  conflictDetails.push(`⏰ Duration: ${trainer.dayDuration}`);
                  conflictDetails.push(`📅 Date: ${dateISO}`);

                  const message = `${
                    trainer.trainerName || trainer.trainerId
                  } (${
                    trainer.trainerId
                  }) conflicts with assignment in another domain of this training:\n\n${conflictDetails.join('\n')}`;

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
  }, [table1Data, globalTrainerAssignments, currentTrainingAssignments, getDateList, training]);

  // Update duplicate trainers and notify parent when validation result changes
  useEffect(() => {
    setDuplicateTrainers(validationResult.duplicates);

    // Notify parent component about validation status using the shape expected by InitiationModal
    if (onValidationChange) {
      onValidationChange(selectedDomain, validationResult);
    }
  }, [validationResult, selectedDomain, onValidationChange]);



  return (
    <div className="space-y-6">
      {/* Duplicate prompt banner inside the table component */}
      {duplicateTrainers && duplicateTrainers.length > 0 && (
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
                  if (!duplicateTrainers || duplicateTrainers.length === 0)
                    return;
                  const first = duplicateTrainers[0];
                  const parts = first.split("-");
                  const rowIdx = Number(parts[0]);
                  if (!isNaN(rowIdx)) {
                    setExpandedBatch((prev) => ({ ...prev, [rowIdx]: true }));
                  }
                  // Scroll into view if element exists
                  setTimeout(() => {
                    const el = document.getElementById(`trainer-${first}`);
                    if (el && el.scrollIntoView)
                      el.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                  }, 120);
                }}
                className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Show duplicates
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Merge Modal */}
      {mergeModal.open && (
        <div className="fixed inset-0 z-54 flex items-center justify-center bg-gray-900 bg-opacity-30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {mergeModal.mergeType === "specific-date" ? "Merge Batches for Date Range" : "Merge Batches"}
            </h3>
            <div className="space-y-4">
              {/* Merge Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Merge Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mergeType"
                      value="whole-phase"
                      checked={mergeModal.mergeType === "whole-phase"}
                      onChange={(e) => setMergeModal(prev => ({ ...prev, mergeType: e.target.value }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Merge for whole phase</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mergeType"
                      value="specific-date"
                      checked={mergeModal.mergeType === "specific-date"}
                      onChange={(e) => setMergeModal(prev => ({ ...prev, mergeType: e.target.value }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Merge for specific date range</span>
                  </label>
                </div>
              </div>

              {/* Target Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Merge with:
                </label>
                <Select
                  isMulti
                  value={mergeModal.targetRowIndices?.map(idx => 
                    getAvailableSpecializations(mergeModal.sourceRowIndex).find(spec => spec.idx === idx)
                  ).filter(Boolean).map(specObj => ({
                    value: specObj.idx,
                    label: `${specObj.specialization} — ${specObj.stdCount} students — ${specObj.hrs} hrs`,
                    specialization: specObj.specialization,
                    idx: specObj.idx
                  })) || []}
                  onChange={(selectedOptions) => {
                    const selectedIndices = selectedOptions ? selectedOptions.map(option => option.idx) : [];
                    setMergeModal((prev) => ({
                      ...prev,
                      targetRowIndices: selectedIndices,
                    }));
                  }}
                  options={getAvailableSpecializations(mergeModal.sourceRowIndex).map(specObj => ({
                    value: specObj.idx,
                    label: `${specObj.specialization} — ${specObj.stdCount} students — ${specObj.hrs} hrs`,
                    specialization: specObj.specialization,
                    idx: specObj.idx
                  }))}
                  formatOptionLabel={(option, { context }) => 
                    context === 'menu' ? option.label : option.specialization
                  }
                  placeholder="Select specializations"
                  className="text-sm"
                  styles={{
                    control: (provided, state) => ({
                      ...provided,
                      borderColor: state.isFocused ? '#6366f1' : '#d1d5db',
                      '&:hover': {
                        borderColor: '#6366f1',
                      },
                      boxShadow: state.isFocused ? '0 0 0 1px #6366f1' : provided.boxShadow,
                      minHeight: '38px',
                    }),
                    valueContainer: (provided) => ({
                      ...provided,
                      padding: '2px 8px',
                    }),
                    input: (provided) => ({
                      ...provided,
                      fontSize: '14px',
                      margin: '0',
                      padding: '0',
                    }),
                    placeholder: (provided) => ({
                      ...provided,
                      fontSize: '14px',
                      color: '#6b7280',
                    }),
                    multiValue: (provided) => ({
                      ...provided,
                      backgroundColor: '#eef2ff',
                      borderRadius: '4px',
                    }),
                    multiValueLabel: (provided) => ({
                      ...provided,
                      color: '#6366f1',
                      fontSize: '12px',
                    }),
                    multiValueRemove: (provided) => ({
                      ...provided,
                      color: '#6366f1',
                      ':hover': {
                        backgroundColor: '#c7d2fe',
                        color: '#4338ca',
                      },
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      fontSize: '14px',
                      padding: '8px 12px',
                      backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#eef2ff' : provided.backgroundColor,
                      color: state.isSelected ? 'white' : provided.color,
                      cursor: 'pointer',
                    }),
                    menu: (provided) => ({
                      ...provided,
                      fontSize: '14px',
                    }),
                  }}
                />
              </div>

              {/* Date Range Fields for Specific Date Merge */}
              {mergeModal.mergeType === "specific-date" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={mergeModal.startDate}
                        onChange={(e) => setMergeModal(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={mergeModal.endDate}
                        onChange={(e) => setMergeModal(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation summary */}
              {mergeModal.targetRowIndices && mergeModal.targetRowIndices.length > 0 &&
                mergeModal.sourceRowIndex !== null &&
                (() => {
                  const src = table1Data[mergeModal.sourceRowIndex];
                  const targets = mergeModal.targetRowIndices.map(idx => table1Data[idx]).filter(Boolean);
                  const totalCombinedStudents = targets.reduce((sum, tgt) => sum + Number(tgt.stdCount || 0), Number(src.stdCount || 0));

                  if (mergeModal.mergeType === "specific-date") {
                    const combinedHours = targets.reduce((sum, tgt) => sum + Number(tgt.hrs || 0), Number(src.hrs || 0));
                    return (
                      <div className="rounded border border-gray-100 p-3 bg-gray-50 text-sm">
                        <div className="mb-3">
                          <div className="font-medium">Summary</div>
                          <div className="text-xs text-gray-600">
                            {src.batch} + {targets.map(t => t.batch).join(', ')}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              Merged batch hours
                            </div>
                            <div className="font-medium">{combinedHours} hrs</div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              Total combined students
                            </div>
                            <div className="font-medium">{totalCombinedStudents}</div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // Whole-phase merge summary
                    return (
                      <div className="rounded border border-gray-100 p-3 bg-gray-50 text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Summary</div>
                            <div className="text-xs text-gray-600">
                              {src.batch} + {targets.map(t => t.batch).join(', ')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              Total combined students
                            </div>
                            <div className="font-medium">{totalCombinedStudents}</div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-xs text-gray-500">
                              Resulting hrs
                            </div>
                            <div className="font-medium">{src.hrs}</div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })()}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() =>
                    setMergeModal({
                      open: false,
                      sourceRowIndex: null,
                      targetRowIndices: [],
                      mergeType: "whole-phase",
                      startDate: "",
                      endDate: "",
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
                      mergeModal.targetRowIndices,
                      mergeModal.mergeType,
                      mergeModal.startDate,
                      mergeModal.endDate
                    )
                  }
                  disabled={
                    !mergeModal.targetRowIndices || mergeModal.targetRowIndices.length === 0 ||
                    (mergeModal.mergeType === "specific-date" && 
                     (!mergeModal.startDate || !mergeModal.endDate))
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                    (mergeModal.targetRowIndices && mergeModal.targetRowIndices.length > 0) &&
                    (mergeModal.mergeType === "whole-phase" || 
                     (mergeModal.startDate && mergeModal.endDate))
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-indigo-300 cursor-not-allowed"
                  } transition-colors`}
                >
                  {mergeModal.mergeType === "specific-date" ? "Merge for Dates" : "Merge Batches"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Swap Modal */}
      {swapModal.open && (
        <div className="fixed inset-0 z-54 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Select Trainer to Swap Batches With
            </h3>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>How Cross-Batch Swap Works:</strong>
                <br />• <strong>Darshan (AM in CS)</strong> will be added to{" "}
                <strong>PM slot in IT batch</strong>
                <br />• <strong>Arvind (AM in IT)</strong> will be added to{" "}
                <strong>PM slot in CS batch</strong>
                <br />
                Both trainers swap batches AND get opposite time slots. Only
                trainers with the same training duration can be swapped.
              </p>
            </div>
            <ul className="mb-4 max-h-96 overflow-y-auto">
              {getAMTrainers().map((t, idx) => {
                return (
                  <li
                    key={idx}
                    className="flex justify-between items-center py-3 px-4 border-b hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium truncate">
                          {t.trainerName} ({t.trainerId})
                        </span>
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                          {
                            table1Data[t.rowIdx].batches[t.batchIdx].trainers[
                              t.trainerIdx
                            ].dayDuration
                          }
                        </span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {t.duration} days
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="block sm:inline">
                          Batch: {t.batchCode} ({t.specialization})
                        </span>
                        <span className="hidden sm:inline mx-2">•</span>
                        <span className="block sm:inline">
                          Duration: {t.dateRange}
                        </span>
                      </div>
                    </div>
                    <button
                      className="ml-4 px-3 py-1 bg-indigo-600 text-white rounded text-sm whitespace-nowrap hover:bg-indigo-700 transition-colors"
                      onClick={() => handleSwap(t)}
                    >
                      Swap Time Slots
                    </button>
                  </li>
                );
              })}
              {getAMTrainers().length === 0 && (
                <li className="text-gray-400 py-4 text-center">
                  <div className="text-sm">
                    No compatible trainers available for swapping.
                  </div>
                  <div className="text-xs mt-1">
                    Trainers must have the same training duration and compatible
                    time slots.
                  </div>
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
        <div className="px-2 py-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
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
              const stats = batchStatistics[rowIndex];
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
                        No hours configured for this specialization. Please set
                        hours in the training domain setup.
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={rowIndex} className="transition-all duration-200">
                  {/* Batch Header */}
                  <div
                    className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleBatchExpansion(rowIndex)}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          memoizedGetColorsForBatch(row.batch).accent
                        } text-xs`}
                      >
                        {rowIndex + 1}
                      </div>
                      <div>
                        <h4
                          className={`font-medium text-xs ${
                            memoizedGetColorsForBatch(row.batch).text
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
                          memoizedGetColorsForBatch(row.batch).badge
                        }`}
                      >
                        {stats.totalAssignedStudents}/{row.stdCount} students
                      </div>
                      <div
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          memoizedGetColorsForBatch(row.batch).badge
                        }`}
                      >
                        {stats.totalAssignedHours}/{row.hrs} hours
                      </div>

                      {/* Merge button - always visible */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMergeModal({
                            open: true,
                            sourceRowIndex: rowIndex,
                            targetRowIndices: [],
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
                        <BatchComponent
                          key={`batch-${rowIndex}-${batchIndex}`}
                          batch={batch}
                          batchIndex={batchIndex}
                          rowIndex={rowIndex}
                          row={row}
                          trainers={filteredTrainers}
                          selectedDomain={selectedDomain}
                          memoizedGetColorsForBatch={memoizedGetColorsForBatch}
                          handleBatchChange={handleBatchChange}
                          removeBatch={removeBatch}
                          addTrainer={addTrainer}
                          handleTrainerField={handleTrainerField}
                          handleTotalHoursChange={handleTotalHoursChange}
                          handleDailyHoursChange={handleDailyHoursChange}
                          removeTrainer={removeTrainer}
                          openSwapModal={openSwapModal}
                          isTrainerAvailable={isTrainerAvailable}
                          duplicates={duplicateTrainers}
                          refetchTrainers={refetchTrainers}
                          excludeDays={excludeDays}
                          commonFields={commonFields}
                          getTrainingHoursPerDay={getTrainingHoursPerDay}
                        />
                      ))}
                      {/* Add Batch Button */}
                      <div className="flex justify-end mt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addBatch(rowIndex);
                          }}
                          className={`flex items-center px-2 py-1 rounded border border-indigo-500 bg-indigo-50 text-indigo-700 text-xs font-medium shadow-sm hover:bg-indigo-100 hover:border-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                            memoizedGetColorsForBatch(row.batch).text
                          }`}
                          title={`Add Batch to ${row.batch}`}
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

