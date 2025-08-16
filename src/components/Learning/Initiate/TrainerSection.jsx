import React, { useState } from "react";
import { FiTrash2, FiPlus, FiChevronDown, FiChevronUp, FiUser } from "react-icons/fi";

const DAY_DURATION_OPTIONS = ["AM", "PM", "AM & PM"];

const TrainerSection = ({
  batch,
  batchIndex,
  row,
  rowIndex,
  removeBatch,
  setTable1Data,
  table1Data,
  selectedDomain,
  commonFields,
  maxAssignableHours,
  onAssignedHoursChange,
  courses,
  trainers,
  getColorsForBatch,
}) => {
  const [expandedTrainer, setExpandedTrainer] = useState({});

  // Add/Remove trainer logic
  const addTrainer = () => {
    const updated = [...table1Data];
    const batchObj = updated[rowIndex].batches[batchIndex];
    if (!batchObj.trainers) batchObj.trainers = [];
    batchObj.trainers.push({
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
  const removeTrainer = (trainerIdx) => {
    const updated = [...table1Data];
    const batchObj = updated[rowIndex].batches[batchIndex];
    if (!batchObj.trainers) batchObj.trainers = [];
    batchObj.trainers.splice(trainerIdx, 1);
    setTable1Data(updated);
  };

  // Handle trainer field changes
  const handleTrainerField = (trainerIdx, field, value) => {
    const updated = [...table1Data];
    const batchObj = updated[rowIndex].batches[batchIndex];
    const trainer = batchObj.trainers[trainerIdx];
    trainer[field] = value;
    setTable1Data(updated);
  };

  return (
    <div
      className={`bg-white rounded-lg border ${
        getColorsForBatch(row.batch, courses).border
      } shadow-xs overflow-hidden`}
    >
      <div
        className={`px-3 py-2 ${
          getColorsForBatch(row.batch, courses).accent
        } border-b ${
          getColorsForBatch(row.batch, courses).border
        } flex justify-between items-center`}
      >
        <span
          className={`font-medium text-xs ${
            getColorsForBatch(row.batch, courses).text
          }`}
        >
          Batch {batchIndex + 1}
        </span>
        <div className="flex space-x-1">
          {row.batches.length > 1 && (
            <button
              onClick={() => removeBatch(batchIndex)}
              className="p-1 rounded hover:bg-rose-50 text-rose-500 transition-colors text-xs"
              title="Remove Batch"
              type="button"
            >
              <FiTrash2 size={12} />
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
                handleTrainerField(
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
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
              Batch Code
            </label>
            <input
              type="text"
              className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2"
              value={batch.batchCode || ""}
              onChange={(e) =>
                handleTrainerField(batchIndex, "batchCode", e.target.value)
              }
              disabled={batch.isMerged}
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
              className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2"
              value={
                batch.assignedHours === undefined || batch.assignedHours === null
                  ? ""
                  : batch.assignedHours
              }
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, "");
                handleTrainerField(batchIndex, "assignedHours", val);
                if (onAssignedHoursChange) onAssignedHoursChange(val);
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
          <div className="flex justify-between items-center mb-2 ">
            <h5 className="text-sm font-medium text-gray-700">Trainers</h5>
            <button
              onClick={addTrainer}
              className="text-xs flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
              type="button"
            >
              <FiPlus className="mr-1" size={12} /> Add Trainer
            </button>
          </div>
          {(batch.trainers || []).length > 0 ? (
            <div className="space-y-3">
              {(batch.trainers || []).map((trainer, trainerIdx) => {
                const trainerKey = `${rowIndex}-${batchIndex}-${trainerIdx}`;
                const isTrainerExpanded = expandedTrainer[trainerKey];
                return (
                  <div
                    key={trainerIdx}
                    className={`border border-gray-200 rounded-lg overflow-hidden ${
                      getColorsForBatch(row.batch, courses).border
                    } rounded-lg overflow-hidden`}
                  >
                    <div
                      className={`px-3 py-2 ${
                        getColorsForBatch(row.batch, courses).accent
                      } flex items-center justify-between`}
                    >
                      <div className="flex items-center space-x-2">
                        <FiUser className="text-gray-500" size={14} />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <select
                              value={trainer.trainerId || ""}
                              onChange={(e) =>
                                handleTrainerField(
                                  trainerIdx,
                                  "trainerId",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                            >
                              <option value="">Select Trainer</option>
                              {trainers
                                .filter(
                                  (tr) =>
                                    tr.domain &&
                                    typeof tr.domain === "string" &&
                                    tr.domain
                                      .toLowerCase()
                                      .trim() ===
                                      selectedDomain.toLowerCase().trim()
                                )
                                .map((tr) => (
                                  <option key={tr.trainerId} value={tr.trainerId}>
                                    {tr.name} ({tr.trainerId})
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                          {trainer.assignedHours || 0} hrs
                        </span>
                        <button
                          onClick={() =>
                            setExpandedTrainer((prev) => ({
                              ...prev,
                              [trainerKey]: !prev[trainerKey],
                            }))
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
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Duration
                            </label>
                            <select
                              value={trainer.dayDuration || ""}
                              onChange={(e) =>
                                handleTrainerField(
                                  trainerIdx,
                                  "dayDuration",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                            >
                              <option value="">Select</option>
                              {DAY_DURATION_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={trainer.startDate || ""}
                              onChange={(e) =>
                                handleTrainerField(
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
                              value={trainer.endDate || ""}
                              onChange={(e) =>
                                handleTrainerField(
                                  trainerIdx,
                                  "endDate",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => removeTrainer(trainerIdx)}
                            className="text-xs flex items-center text-rose-600 hover:text-rose-800 font-medium"
                            type="button"
                          >
                            <FiTrash2 className="mr-1" size={12} /> Remove Trainer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <FiUser className="mx-auto text-gray-400" size={20} />
              <p className="text-sm text-gray-500 mt-2">
                No trainers assigned
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainerSection;