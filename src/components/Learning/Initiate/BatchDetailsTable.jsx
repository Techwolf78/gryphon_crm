import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
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
  FiEye,
  FiAlertTriangle,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";

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
    removeTrainer,
    openSwapModal,
    isTrainerAvailable,
    isDuplicate = false,
    removeDailyDate,
    openDailySchedule,
    setOpenDailySchedule,
    updateTrainerLocal,
    excludeDays,
  }) => {
    // ✅ ADD: Calculate unique key for this trainer
    const trainerKey = `${rowIndex}-${batchIndex}-${trainerIdx}`;
    const showDailyHours = openDailySchedule === trainerKey;

    // Portal positioning for daily schedule outside table
    const viewBtnRef = useRef(null);
    const panelRef = useRef(null);
    const [schedulePos, setSchedulePos] = useState({
      top: 0,
      left: 0,
      width: 320,
      arrowOffset: 0,
    });

    // Local UI state to allow adding new topics per trainer
    const [addedTopics, setAddedTopics] = useState([]);
    const [newTopicInput, setNewTopicInput] = useState("");

    // ✅ If trainer has no topics selected but the selected trainer document
    // provides specializations, default-select those topics once.
    useEffect(() => {
      try {
        const hasTopics =
          Array.isArray(trainer.topics) && trainer.topics.length > 0;
        if (
          !hasTopics &&
          trainer.trainerId &&
          Array.isArray(trainers) &&
          trainers.length > 0
        ) {
          const trDoc = trainers.find(
            (t) =>
              t.id === trainer.trainerId || t.trainerId === trainer.trainerId
          );
          if (trDoc) {
            const s1 = Array.isArray(trDoc.specialization)
              ? trDoc.specialization
              : [];
            const s2 = Array.isArray(trDoc.otherSpecialization)
              ? trDoc.otherSpecialization
              : [];
            const base = [...s1, ...s2];
            const allTopics = Array.from(
              new Set([...base, ...addedTopics])
            ).filter(Boolean);
            if (allTopics.length > 0) {
              handleTrainerField(
                rowIndex,
                batchIndex,
                trainerIdx,
                "topics",
                allTopics
              );
            }
          }
        }
      } catch {
        // swallow - non-critical UI defaulting
      }
    }, [
      trainer.trainerId,
      trainers,
      rowIndex,
      batchIndex,
      trainerIdx,
      handleTrainerField,
      trainer.topics,
      addedTopics,
    ]);

    // ✅ ADD: Toggle function for daily schedule
    const toggleDailySchedule = () => {
      if (showDailyHours) {
        setOpenDailySchedule(null);
      } else {
        // Compute button position to place panel
        if (viewBtnRef.current) {
          const rect = viewBtnRef.current.getBoundingClientRect();
          // Default below the button; adjust if near right edge
          const panelWidth = 340;
          // Attach to left side horizontally centered to button using arrow
          let left = rect.left + window.scrollX - panelWidth - 12; // include space for arrow
          if (left < 8) left = 8; // clamp
          const buttonCenterOffset = rect.height / 2; // vertical center of button
          const top = rect.top + window.scrollY - 12; // slight shift up so arrow overlaps button edge
          const arrowOffset = buttonCenterOffset + 12; // distance from panel top to arrow center
          setSchedulePos({ top, left, width: panelWidth, arrowOffset });
        }
        setOpenDailySchedule(trainerKey);
      }
    };

    // Close on outside click
    useEffect(() => {
      if (!showDailyHours) return;
      const handler = (e) => {
        if (
          panelRef.current &&
          !panelRef.current.contains(e.target) &&
          !viewBtnRef.current?.contains(e.target)
        ) {
          setOpenDailySchedule(null);
        }
      };
      window.addEventListener("mousedown", handler);
      return () => window.removeEventListener("mousedown", handler);
    }, [showDailyHours, setOpenDailySchedule]);

    // Reposition on resize
    useEffect(() => {
      if (!showDailyHours) return;
      const handleResize = () => {
        if (viewBtnRef.current) {
          const rect = viewBtnRef.current.getBoundingClientRect();
          const panelWidth = schedulePos.width || 340;
          let left = rect.left + window.scrollX - panelWidth - 12;
          if (left < 8) left = 8;
          const top = rect.top + window.scrollY - 12;
          const arrowOffset = rect.height / 2 + 12;
          setSchedulePos((p) => ({ ...p, top, left, arrowOffset }));
        }
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, [showDailyHours, schedulePos.width]);

    // ✅ ADD: Handle daily hours input change
    const handleDailyHourChange = (dayIndex, value) => {
      const updated = [...(trainer.dailyHours || [])];
      updated[dayIndex] = Number(value) || 0;
      // Call the parent handler to update the trainer data; parent will recalc assignedHours
      handleTrainerField(
        rowIndex,
        batchIndex,
        trainerIdx,
        "dailyHours",
        updated
      );
    };

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
            <select
              value={trainer.trainerId || ""}
              onChange={(e) =>
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
              {trainers.map((tr) => {
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
                  } else if (
                    excludeDays === "Both" &&
                    (dayOfWeek === 0 || dayOfWeek === 6)
                  ) {
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

          {/* ✅ UPDATED: Daily Hours with View Button */}
          <td className="px-2 py-1 relative">
            <div className="flex items-center space-x-1">
              <span className="text-xs">
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
              {trainer.dailyHours && trainer.dailyHours.length > 0 && (
                <button
                  type="button"
                  onClick={toggleDailySchedule}
                  className="inline-flex items-center justify-center h-4 w-4 rounded-md bg-blue-500/90 hover:bg-blue-600 text-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-300 transition text-[10px]"
                  title="View Daily Schedule"
                  aria-label="View daily schedule"
                  ref={viewBtnRef}
                >
                  <FiEye className="w-2 h-2" />
                </button>
              )}
            </div>
            {/* ✅ Daily Hours Breakdown rendered via Portal outside table bounds */}
            {showDailyHours &&
              trainer.dailyHours &&
              trainer.activeDates &&
              createPortal(
                <div
                  ref={panelRef}
                  style={{
                    top: schedulePos.top,
                    left: schedulePos.left,
                    width: schedulePos.width,
                    maxWidth: "100%",
                    position: "absolute",
                  }}
                  className="fixed z-[1000] bg-white border border-gray-200 rounded-lg shadow-xl p-3"
                >
                  {/* Arrow */}
                  <span
                    className="absolute -right-2 top-0 h-full pointer-events-none flex"
                    style={{ top: schedulePos.arrowOffset - 8 }}
                  >
                    <span
                      className="relative w-0 h-0"
                      style={{
                        borderTop: "8px solid transparent",
                        borderBottom: "8px solid transparent",
                        borderLeft: "8px solid white",
                        filter: "drop-shadow(0 0 1px rgba(0,0,0,0.15))",
                      }}
                    />
                  </span>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-medium text-gray-700">
                      Daily Schedule
                    </h4>
                    <button
                      type="button"
                      onClick={toggleDailySchedule}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Close daily schedule"
                    >
                      ×
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="px-2 py-1 text-left font-medium">
                            Date
                          </th>
                          <th className="px-2 py-1 text-left font-medium">
                            Day
                          </th>
                          <th className="px-2 py-1 text-left font-medium">
                            Hours
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {trainer.activeDates
                          .filter((date) => {
                            const dateObj = new Date(date);
                            return !isNaN(dateObj.getTime());
                          })
                          .map((date, dayIndex) => {
                            const dateObj = new Date(date);
                            const dayName = dateObj.toLocaleDateString(
                              "en-US",
                              { weekday: "short" }
                            );
                            const formattedDate = dateObj.toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            );
                            return (
                              <tr
                                key={dayIndex}
                                className="border-b border-gray-100 last:border-0"
                              >
                                <td className="px-2 py-1 whitespace-nowrap">
                                  {formattedDate}
                                </td>
                                <td className="px-2 py-1 text-gray-600">
                                  {dayName}
                                </td>
                                <td className="px-2 py-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <input
                                        type="number"
                                        value={
                                          trainer.dailyHours[dayIndex] || ""
                                        }
                                        onChange={(e) =>
                                          handleDailyHourChange(
                                            dayIndex,
                                            e.target.value
                                          )
                                        }
                                        className="w-14 rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-0.5 px-1"
                                        min="0"
                                        step="0.5"
                                        placeholder="0"
                                      />
                                      <span className="ml-1 text-[10px] text-gray-500">
                                        h
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeDailyDate &&
                                        removeDailyDate(
                                          rowIndex,
                                          batchIndex,
                                          trainerIdx,
                                          dayIndex
                                        )
                                      }
                                      className="ml-3 text-rose-500 hover:text-rose-600 p-0.5 rounded"
                                      title="Remove date"
                                      aria-label="Remove date"
                                    >
                                      <FiTrash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 font-medium text-gray-700">
                          <td className="px-2 py-1" colSpan={2}>
                            Total:
                          </td>
                          <td className="px-2 py-1">
                            {trainer.dailyHours
                              .reduce((s, h) => s + Number(h || 0), 0)
                              .toFixed(2)}
                            h
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>,
                document.body
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
              {/* Small card inputs */}
              {/** Conveyance */}
              <div className="flex flex-col bg-white/70 border border-gray-100 rounded-md p-0.5 sm:col-span-1 lg:col-span-2">
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
              </div>
              {/** Food */}
              <div className="flex flex-col bg-white/70 border border-gray-100 rounded-md p-0.5 sm:col-span-1 lg:col-span-2">
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
              </div>
              {/** Lodging */}
              <div className="flex flex-col bg-white/70 border border-gray-100 rounded-md p-0.5 sm:col-span-1 lg:col-span-2">
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
              </div>
              {/* Cost + Topics inline wrapper spans remaining 8 cols */}
              <div className="sm:col-span-2 lg:col-span-6 flex flex-col md:flex-row gap-2 items-stretch">
                {(() => {
                  const trainerCost =
                    (Number(trainer.assignedHours) || 0) *
                      (Number(trainer.perHourCost) || 0) || 0;
                  const miscCost =
                    (Number(trainer.conveyance) || 0) +
                      (Number(trainer.food) || 0) +
                      (Number(trainer.lodging) || 0) || 0;
                  const totalCost = trainerCost + miscCost;
                  const boxBase =
                    "flex items-center gap-1 bg-white/70 border border-gray-100 rounded-md px-2 py-1";
                  const valueCls = "text-xs font-semibold";
                  return (
                    <div className="flex flex-wrap md:flex-nowrap gap-1 md:w-auto">
                      <div className={`${boxBase} text-indigo-700`}>
                        <span className="text-[10px] font-medium">
                          Trainer:
                        </span>
                        <span className={`${valueCls} text-indigo-900`}>
                          ₹{trainerCost.toFixed(2)}
                        </span>
                      </div>
                      <div className={`${boxBase} text-amber-700`}>
                        <span className="text-[10px] font-medium">Misc:</span>
                        <span className={`${valueCls} text-amber-900`}>
                          ₹{miscCost.toFixed(2)}
                        </span>
                      </div>
                      <div className={`${boxBase} text-emerald-700`}>
                        <span className="text-[10px] font-medium">Total:</span>
                        <span className={`${valueCls} text-emerald-900`}>
                          ₹{totalCost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                {/** Topics area */}
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-[10px] font-semibold text-slate-700">
                      Topics
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      Select or add
                    </span>
                  </div>
                  <div className="bg-white rounded-md border border-gray-100 p-1 shadow-sm">
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
                      const allTopics = Array.from(
                        new Set([...base, ...addedTopics])
                      )
                        .filter(Boolean)
                        .sort();
                      const selected = Array.isArray(trainer.topics)
                        ? trainer.topics
                        : trainer.topics
                        ? [trainer.topics]
                        : [];

                      // Auto-select all existing topics (from Firestore) if none selected yet
                      // Moved to useEffect to prevent setState during render

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
                        <div className="space-y-1.5">
                          <div
                            role="group"
                            aria-label="Topics"
                            className="min-h-[22px] max-h-24 overflow-auto rounded border border-dashed border-gray-200 p-0.5 bg-gray-50"
                          >
                            {allTopics.length === 0 ? (
                              <div className="text-[10px] text-slate-400 py-2 text-center">
                                No topics yet. Add below.
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
                                          ? "bg-indigo-600 text-white border-indigo-600 shadow"
                                          : "bg-white text-slate-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
                                      }`}
                                      title={topic}
                                    >
                                      {topic}
                                      {active && (
                                        <span className="ml-1">✓</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
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
                                  if (trainer.trainerId) {
                                    (async () => {
                                      try {
                                        const trainerDocRef = doc(
                                          db,
                                          "trainers",
                                          String(trainer.trainerId)
                                        );
                                        await updateDoc(trainerDocRef, {
                                          otherSpecialization: arrayUnion(t),
                                        });
                                        updateTrainerLocal?.(
                                          trainer.trainerId,
                                          t
                                        );
                                      } catch (err) {
                                        console.error(
                                          "Failed to persist new topic:",
                                          err
                                        );
                                      }
                                    })();
                                  }
                                  setNewTopicInput("");
                                }
                              }}
                              placeholder="Add topic & Enter"
                              className="flex-1 rounded border border-gray-200 px-2 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-200"
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
                                if (trainer.trainerId) {
                                  (async () => {
                                    try {
                                      const trainerDocRef = doc(
                                        db,
                                        "trainers",
                                        String(trainer.trainerId)
                                      );
                                      await updateDoc(trainerDocRef, {
                                        otherSpecialization: arrayUnion(t),
                                      });
                                      updateTrainerLocal?.(
                                        trainer.trainerId,
                                        t
                                      );
                                    } catch (err) {
                                      console.error(
                                        "Failed to persist new topic:",
                                        err
                                      );
                                    }
                                  })();
                                }
                                setNewTopicInput("");
                              }}
                              className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-300"
                            >
                              <FiPlus size={10} />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>{" "}
                  {/* end topics card */}
                </div>{" "}
                {/* end topics container */}
              </div>{" "}
              {/* end cost+topics wrapper */}
            </div>{" "}
            {/* end grid */}
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
    removeTrainer,
    openSwapModal,
    isTrainerAvailable,
    duplicates = [],
    openDailySchedule, // Add this prop
    setOpenDailySchedule, // Add this prop
    removeDailyDate,
    refetchTrainers,
    updateTrainerLocal,
    excludeDays,
  }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);

    const handleAddTrainerClick = () => {
      if (
        !batch.batchPerStdCount ||
        batch.batchPerStdCount === 0 ||
        batch.batchPerStdCount === ""
      ) {
        // Show tooltip instead of alert
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setTooltipPosition({
            top: rect.top - 10,
            left: rect.left + rect.width / 2,
          });
          setShowTooltip(true);
          // Auto-hide tooltip after 3 seconds
          setTimeout(() => setShowTooltip(false), 3000);
        }
        return;
      }
      addTrainer(rowIndex, batchIndex);
    };

    // Hide tooltip when clicking elsewhere
    useEffect(() => {
      if (!showTooltip) return;
      const handleClickOutside = (e) => {
        if (buttonRef.current && !buttonRef.current.contains(e.target)) {
          setShowTooltip(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [showTooltip]);

    return (
      <div>
        <div className="flex justify-between items-center mb-2 ">
          <h5 className="text-sm font-medium text-gray-700">Trainers</h5>
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={handleAddTrainerClick}
              className={`text-xs flex items-center font-medium ${
                !batch.batchPerStdCount ||
                batch.batchPerStdCount === 0 ||
                batch.batchPerStdCount === ""
                  ? "text-gray-400 cursor-pointer"
                  : "text-indigo-600 hover:text-indigo-800"
              }`}
              type="button"
              title={
                !batch.batchPerStdCount ||
                batch.batchPerStdCount === 0 ||
                batch.batchPerStdCount === ""
                  ? "Please enter student count first"
                  : "Add Trainer"
              }
            >
              {(!batch.batchPerStdCount ||
                batch.batchPerStdCount === 0 ||
                batch.batchPerStdCount === "") ? (
                <FiAlertTriangle className="mr-1 text-red-500" size={12} />
              ) : (
                <FiPlus className="mr-1" size={12} />
              )}
              Add Trainer
            </button>

            {/* Tooltip */}
            {showTooltip &&
              createPortal(
                <div
                  className="fixed z-[1000] bg-red-600 text-white text-xs px-4 py-2 rounded-lg shadow-lg max-w-md"
                  style={{
                    top: tooltipPosition.top,
                    left: tooltipPosition.left,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <div className="flex flex-col items-center">
                    Please enter student count first.
                  </div>
                  {/* Arrow pointing down */}
                  <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
                    style={{
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderTop: "6px solid #dc2626",
                    }}
                  />
                </div>,
                document.body
              )}
          </div>
        </div>

        {trainers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left">Trainer</th>
                  <th className="px-2 py-1 text-left">Duration</th>
                  <th className="px-2 py-1 text-left">Start Date</th>
                  <th className="px-2 py-1 text-left">End Date</th>
                  <th className="px-2 py-1 text-left">No. of Days</th>
                  <th className="px-2 py-1 text-left">Total Hours</th>
                  <th className="px-2 py-1 text-left">Per Hour Cost</th>
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
                      removeTrainer={removeTrainer}
                      openSwapModal={openSwapModal}
                      isTrainerAvailable={isTrainerAvailable}
                      isDuplicate={isDuplicate}
                      openDailySchedule={openDailySchedule} // Add this prop
                      setOpenDailySchedule={setOpenDailySchedule} // Add this prop
                      removeDailyDate={removeDailyDate}
                      refetchTrainers={refetchTrainers}
                      updateTrainerLocal={updateTrainerLocal}
                      excludeDays={excludeDays}
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
    removeTrainer,
    openSwapModal,
    isTrainerAvailable,
    duplicates = [],
    openDailySchedule, // Add this prop
    setOpenDailySchedule, // Add this prop
    removeDailyDate,
    refetchTrainers,
    updateTrainerLocal,
    excludeDays,
  }) => {
    return (
      <div
        className={`bg-white rounded-lg border ${
          memoizedGetColorsForBatch(row.batch).border
        } shadow-xs overflow-hidden`}
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

          {/* Progress Bar */}
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
                    width: `${Math.min(
                      100,
                      (batch.trainers.reduce(
                        (sum, t) => sum + Number(t.assignedHours || 0),
                        0
                      ) /
                        (batch.assignedHours || 1)) *
                        100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          )}

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
            removeTrainer={removeTrainer}
            openSwapModal={openSwapModal}
            isTrainerAvailable={isTrainerAvailable}
            duplicates={duplicates}
            openDailySchedule={openDailySchedule}
            setOpenDailySchedule={setOpenDailySchedule}
            removeDailyDate={removeDailyDate}
            refetchTrainers={refetchTrainers}
            updateTrainerLocal={updateTrainerLocal}
            excludeDays={excludeDays}
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
  excludeDays = "None",
}) => {
  const [mergeModal, setMergeModal] = useState({
    open: false,
    sourceRowIndex: null,
    targetRowIndex: null,
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
  const [openDailySchedule, setOpenDailySchedule] = useState(null);

  // ✅ 4. Memoize filtered trainers to prevent unnecessary re-filtering
  const filteredTrainers = useMemo(() => {
    return trainers.filter(
      (tr) =>
        tr.domain &&
        typeof tr.domain === "string" &&
        tr.domain.toLowerCase().trim() === selectedDomain.toLowerCase().trim()
    );
  }, [trainers, selectedDomain]);

  // ✅ 5. Memoize batch statistics to prevent recalculation on every render
  const batchStatistics = useMemo(() => {
    return table1Data.map((row, rowIndex) => {
      const totalAssignedStudents = row.batches.reduce(
        (sum, b) => sum + Number(b.batchPerStdCount || 0),
        0
      );
      const totalAssignedHours =
        row.batches.length > 0 ? Number(row.batches[0].assignedHours || 0) : 0;

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
        const list = getDateList(assignment.startDate, assignment.endDate);
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
      console.error("Error fetching trainers:", error);
    }
  }, []);

  useEffect(() => {
    refetchTrainers();
  }, [refetchTrainers]);

  // Update a trainer in the local `trainers` state to avoid a full refetch
  const updateTrainerLocal = useCallback((trainerId, newTopic) => {
    if (!trainerId || !newTopic) return;
    setTrainers((prev) =>
      prev.map((t) => {
        if (!t || (!t.id && !t.trainerId)) return t;
        const id = t.id || t.trainerId;
        if (id !== trainerId) return t;
        const existing = Array.isArray(t.otherSpecialization)
          ? t.otherSpecialization
          : [];
        const merged = Array.from(new Set([...existing, newTopic]));
        return { ...t, otherSpecialization: merged };
      })
    );
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
    const updatedData = [...table1Data];
    const sourceRow = updatedData[sourceRowIndex];
    const targetRow = updatedData[targetRowIndex];

    if (!sourceRow || !targetRow) {
      return;
    }

    // Combine students; keep target hrs as authoritative
    const combinedStudents =
      Number(sourceRow.stdCount || 0) + Number(targetRow.stdCount || 0);
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

    // Persist if config provided
    if (
      typeof mergeFirestoreConfig === "object" &&
      mergeFirestoreConfig?.collectionPath
    ) {
      try {
        const { collectionPath, docIdField } = mergeFirestoreConfig;
        if (docIdField && targetRow[docIdField]) {
          const targetDocRef = doc(
            db,
            collectionPath,
            String(targetRow[docIdField])
          );
          await updateDoc(targetDocRef, mergedRow);
        } else {
          await addDoc(collection(db, collectionPath), mergedRow);
        }
      } catch {
        // Error persisting merged batch
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

  // Remove a single date from trainer's activeDates and dailyHours
  const removeDailyDate = (rowIndex, batchIndex, trainerIdx, dayIndex) => {
    const updated = [...table1Data];
    const trainer = updated[rowIndex].batches[batchIndex].trainers[trainerIdx];
    if (!trainer) return;

    // Remove the date and the corresponding hours
    if (trainer.activeDates && trainer.activeDates.length > dayIndex) {
      trainer.activeDates = trainer.activeDates.filter(
        (_, idx) => idx !== dayIndex
      );
    }
    if (trainer.dailyHours && trainer.dailyHours.length > dayIndex) {
      trainer.dailyHours = trainer.dailyHours.filter(
        (_, idx) => idx !== dayIndex
      );
    }

    // Recalculate assignedHours
    trainer.assignedHours = trainer.dailyHours
      ? trainer.dailyHours.reduce((sum, h) => sum + Number(h || 0), 0)
      : 0;

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

      const dateList = getDateList(trainer.startDate, trainer.endDate);
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

  const getDateList = (start, end) => {
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
      } else if (
        excludeDays === "Both" &&
        (dayOfWeek === 0 || dayOfWeek === 6)
      ) {
        shouldInclude = false;
      }
      // If excludeDays === "None", include all days

      if (shouldInclude) {
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
      console.log(
        "✅ [SWAP] Calling onSwapTrainer with cross-batch swap data:"
      );

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
        console.error("❌ [SWAP] Error during cross-batch swap:", error);
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
      console.warn(
        "[BatchDetailsTable] undoMerge: no originalData on merged row",
        mergedRowIndex
      );
      return;
    }

    // avoid unused-var eslint by prefixing unused locals with leading underscore
    const {
      source,
      target,
      sourceIndex,
      targetIndex: _targetIndex,
    } = mergedRow.originalData;

    // Restore shallow copies
    const restoredTarget = { ...target };
    const restoredSource = { ...source };

    // Replace merged row position with restoredTarget
    updated[mergedRowIndex] = restoredTarget;

    // Insert source back. Prefer original sourceIndex if valid, else insert after restoredTarget
    const insertIdx =
      typeof sourceIndex === "number" &&
      sourceIndex >= 0 &&
      sourceIndex <= updated.length
        ? sourceIndex
        : mergedRowIndex + 1;

    updated.splice(insertIdx, 0, restoredSource);

    setTable1Data(updated);
    console.log("[BatchDetailsTable] undoMerge completed", {
      mergedRowIndex,
      insertIdx,
    });

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
        console.error(
          "[BatchDetailsTable] Error while undoing persisted merge:",
          err
        );
      }
    }
  };

  // Monitor for duplicate trainers whenever table1Data changes
  useEffect(() => {
    if (!table1Data || table1Data.length === 0) {
      setDuplicateTrainers([]);
      if (onValidationChange) {
        onValidationChange(selectedDomain, {
          hasErrors: false,
          errors: [],
          duplicates: [],
        });
      }
      return;
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
            const generated = getDateList(trainer.startDate, trainer.endDate);
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
                console.debug(
                  "[BatchDetailsTable] duplicate detected (local)",
                  {
                    trainerKey,
                    existingKey,
                    trainerId: trainer.trainerId,
                    dateISO,
                    trainerDayDuration: trainer.dayDuration,
                    existingDayDuration: existing.dayDuration,
                  }
                );
              }
            } else {
              trainerMap.set(keyBase, {
                trainerKey,
                dayDuration: trainer.dayDuration,
              });
            }

            // Check global assignments (normalize their date too)
            for (let assignment of globalTrainerAssignments) {
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
                  const message = `${
                    trainer.trainerName || trainer.trainerId
                  } (${
                    trainer.trainerId
                  }) conflicts with an external assignment on ${dateISO}`;
                  errors.push({ message });
                  console.debug(
                    "[BatchDetailsTable] duplicate detected (global)",
                    {
                      trainerKey,
                      trainerId: trainer.trainerId,
                      dateISO,
                      trainerDayDuration: trainer.dayDuration,
                      assignmentDayDuration: assignment.dayDuration,
                      assignmentSourceTrainingId: assignment.sourceTrainingId,
                    }
                  );
                }
              }
            }
          });
        });
      });
    });

    const duplicates = Array.from(duplicatesSet);
    setDuplicateTrainers(duplicates);

    // Remove duplicate error messages
    const uniqueErrors = Array.from(
      new Map(errors.map((e) => [e.message, e])).values()
    );

    // Notify parent component about validation status using the shape expected by InitiationModal
    if (onValidationChange) {
      onValidationChange(selectedDomain, {
        hasErrors: duplicates.length > 0,
        errors: uniqueErrors,
        duplicates: duplicates,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table1Data, selectedDomain, globalTrainerAssignments]);

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
                    const val =
                      e.target.value === "" ? null : Number(e.target.value);
                    console.log("[BatchDetailsTable] merge select changed", {
                      selectedValue: val,
                      sourceRowIndex: mergeModal.sourceRowIndex,
                    });
                    if (val !== null && table1Data && table1Data[val]) {
                      console.log(
                        "[BatchDetailsTable] selected target spec:",
                        table1Data[val]
                      );
                    }
                    setMergeModal((prev) => ({
                      ...prev,
                      targetRowIndex: val,
                    }));
                  }}
                >
                  <option value="">Select specialization</option>
                  {getAvailableSpecializations(mergeModal.sourceRowIndex).map(
                    (specObj) => (
                      <option key={specObj.idx} value={specObj.idx}>
                        {specObj.specialization} — {specObj.stdCount} students —{" "}
                        {specObj.hrs} hrs
                      </option>
                    )
                  )}
                </select>
              </div>
              {/* Confirmation summary */}
              {mergeModal.targetRowIndex !== null &&
                mergeModal.sourceRowIndex !== null &&
                (() => {
                  const src = table1Data[mergeModal.sourceRowIndex];
                  const tgt = table1Data[mergeModal.targetRowIndex];
                  const combined =
                    Number(src.stdCount || 0) + Number(tgt.stdCount || 0);
                  const hrs = tgt.hrs;
                  return (
                    <div className="rounded border border-gray-100 p-3 bg-gray-50 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Summary</div>
                          <div className="text-xs text-gray-600">
                            {src.batch} + {tgt.batch}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            Combined students
                          </div>
                          <div className="font-medium">{combined}</div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xs text-gray-500">
                            Resulting hrs
                          </div>
                          <div className="font-medium">{hrs}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
      {swapModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
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
                    className={`px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
                      isExpanded ? "bg-gray-50" : ""
                    }`}
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
                          console.log(
                            "[BatchDetailsTable] open merge modal for row",
                            {
                              rowIndex,
                              batchName: row.batch,
                              stdCount: row.stdCount,
                              hrs: row.hrs,
                            }
                          );
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
                            console.log(
                              "[BatchDetailsTable] undo merge clicked",
                              { rowIndex, batch: row.batch }
                            );
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
                          removeTrainer={removeTrainer}
                          openSwapModal={openSwapModal}
                          isTrainerAvailable={isTrainerAvailable}
                          duplicates={duplicateTrainers}
                          openDailySchedule={openDailySchedule} // Add this line
                          setOpenDailySchedule={setOpenDailySchedule} // Add this line
                          removeDailyDate={removeDailyDate}
                          refetchTrainers={refetchTrainers}
                          updateTrainerLocal={updateTrainerLocal}
                          excludeDays={excludeDays}
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
