import React, { useState } from "react";
import {
  FiArrowLeft,
  FiUser,
  FiClock,
  FiBookOpen,
  FiLayers,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

const PHASE_LABELS = {
  "phase-1": "Phase 1",
  "phase-2": "Phase 2",
  "phase-3": "Phase 3",
};
function getTimingForSlot(slot, training) {
  if (!slot) return "-";
  const s = String(slot).toUpperCase();
  const { collegeStartTime, lunchStartTime, lunchEndTime, collegeEndTime } =
    training || {};

  if (s.includes("AM")) {
    if (collegeStartTime && lunchStartTime)
      return `${collegeStartTime} - ${lunchStartTime}`;
    return "AM";
  }
  if (s.includes("PM")) {
    if (lunchEndTime && collegeEndTime)
      return `${lunchEndTime} - ${collegeEndTime}`;
    return "PM";
  }
  // fallback: return slot text
  return slot;
}

function formatDate(d) {
  if (!d && d !== 0) return "";

  if (typeof d === "object" && d !== null && typeof d.toDate === "function") {
    d = d.toDate();
  }

  if (typeof d === "number") {
    d = new Date(d);
  }

  if (typeof d === "string") {
    const parsed = new Date(d);
    if (!isNaN(parsed)) d = parsed;
    else return d;
  }

  if (d instanceof Date && !isNaN(d)) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return String(d);
}

function InitiationTrainingDetails({ training, onBack }) {
  console.log(
    "📦 InitiationTrainingDetails props:",
    JSON.stringify(training, null, 2)
  );

  const [expanded, setExpanded] = useState({});

  // simpler: toggle by a single unique key
  const toggleExpand = (key) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!training) return null;


  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-200 p-6">

      <button
        className="mb-6 flex items-center text-blue-600 hover:underline"
        onClick={onBack}
      >
        <FiArrowLeft className="mr-2" /> Back to Dashboard
      </button>
      <div className="w-full mx-auto bg-white rounded-xl shadow border border-gray-200 p-8">

        <h2 className="text-2xl font-bold text-indigo-800 mb-2">
          {training.collegeName}{" "}
          <span className="text-gray-400">({training.collegeCode})</span>
        </h2>
        <div className="mb-4 text-gray-700">
          <span className="mr-4">
            <FiLayers className="inline mr-1" />
            {PHASE_LABELS[training.phaseId] || training.phaseId}
          </span>
          <span className="mr-4">
            <FiBookOpen className="inline mr-1" />
            {training.domain || "No Domain"}
          </span>
          <span className="mr-4">
            <FiClock className="inline mr-1" />
            {formatDate(training.trainingStartDate)} to{" "}
            {formatDate(training.trainingEndDate)}
          </span>
        </div>
        <div className="mb-8">
          {training.details && (
            <div className="text-gray-500 mb-2">{training.details}</div>
          )}
          {training.phase2Dates && (
            <div className="text-xs text-gray-500 mb-2">
              Phase 2: {formatDate(training.phase2Dates.startDate)} to{" "}
              {formatDate(training.phase2Dates.endDate)}
            </div>
          )}
        </div>

        <h3 className="font-semibold text-gray-800 mb-2">Batches & Trainers</h3>
        {Array.isArray(training.table1Data) &&
        training.table1Data.length > 0 ? (
          <div className="space-y-6">
            {training.table1Data.map((row, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-lg border border-gray-200 shadow p-4"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{row.batch}</div>
                    <div className="text-xs text-gray-500">
                      {row.stdCount} students • {row.hrs} hours
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {row.batches &&
                    row.batches.map((batch, bidx) => (
                      <div
                        key={bidx}
                        className="border rounded p-3 mb-2 bg-white"
                      >
                        <div className="flex flex-wrap gap-4 items-center mb-2">
                          <span className="text-xs font-semibold text-gray-700">
                            Batch Code: {batch.batchCode}
                          </span>
                          <span className="text-xs text-gray-600">
                            Students: {batch.batchPerStdCount || 0}
                          </span>
                          <span className="text-xs text-gray-600">
                            Assigned Hours: {batch.assignedHours || 0}
                          </span>
                          {batch.isMerged && (
                            <span className="text-xs text-rose-600 font-semibold">
                              Merged: {batch.mergedFrom}
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="font-semibold text-xs text-gray-700 mb-1">
                            Trainers:
                          </div>
                          {batch.trainers && batch.trainers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {batch.trainers.map((trainer, tidx) => {
                                const uniqueKey = `${batch.batchCode}_${
                                  trainer.trainerId || tidx
                                }`;
                                return (
                                  <div
                                    key={uniqueKey}
                                    className="bg-indigo-50 border rounded p-2"
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <FiUser className="text-indigo-500" />
                                      <span className="font-medium">
                                        {trainer.trainerName || "Unassigned"}
                                      </span>
                                      <span className="text-xs text-gray-500 ml-2">
                                        {trainer.trainerId}
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-600 mb-1">
                                      {trainer.dayDuration && (
                                        <span className="mr-2">
                                          Duration: {trainer.dayDuration}
                                        </span>
                                      )}
                                      {trainer.startDate && (
                                        <span className="mr-2">
                                          From: {formatDate(trainer.startDate)}
                                        </span>
                                      )}
                                      {trainer.endDate && (
                                        <span>
                                          To: {formatDate(trainer.endDate)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 mb-1">
                                      Assigned Hours:{" "}
                                      <span className="font-semibold">
                                        {trainer.assignedHours || 0}
                                      </span>
                                    </div>

                                    {trainer.dailyHours &&
                                      trainer.dailyHours.length > 0 && (
                                        <div>
                                          <button
                                            className="flex items-center text-xs text-indigo-600 hover:underline mt-1"
                                            onClick={() =>
                                              toggleExpand(uniqueKey)
                                            }
                                            type="button"
                                          >
                                            {expanded[uniqueKey] ? (
                                              <>
                                                <FiChevronUp className="mr-1" />{" "}
                                                Hide Daily Hours
                                              </>
                                            ) : (
                                              <>
                                                <FiChevronDown className="mr-1" />{" "}
                                                Show Daily Hours
                                              </>
                                            )}
                                          </button>

                                          {expanded[uniqueKey] && (
                                            <div className="mt-2">
                                              <div className="font-semibold text-xs text-gray-700 mb-1">
                                                Daily Hours Breakdown
                                                (Batch-wise):
                                              </div>
                                              <div className="overflow-x-auto">
                                                {(() => {
                                                  const breakdown = {};
                                                  (
                                                    trainer.activeDates || []
                                                  ).forEach((date, didx) => {
                                                    const batchCode =
                                                      trainer.slotInfo?.[didx]
                                                        ?.batchCode ||
                                                      batch.batchCode;
                                                    if (!breakdown[batchCode])
                                                      breakdown[batchCode] = [];
                                                    breakdown[batchCode].push({
                                                      date,
                                                      hours:
                                                        trainer.dailyHours?.[
                                                          didx
                                                        ] || 0,
                                                      slot:
                                                        trainer.slotInfo?.[didx]
                                                          ?.slot ||
                                                        trainer.dayDuration,
                                                    });
                                                  });
                                                  return Object.entries(
                                                    breakdown
                                                  ).map(([batchCode, rows]) => (
                                                    <div
                                                      key={batchCode}
                                                      className="mb-3"
                                                    >
                                                      <div className="font-semibold text-indigo-700 text-xs mb-1">
                                                        Batch: {batchCode}
                                                      </div>
                                                      <table className="w-full text-xs mb-2">
                                                        <thead className="bg-gray-50">
                                                          <tr>
                                                            <th className="px-2 py-1 text-left">
                                                              Date
                                                            </th>
                                                            <th className="px-2 py-1 text-left">
                                                              Hours
                                                            </th>
                                                            <th className="px-2 py-1 text-left">
                                                              Slot
                                                            </th>
                                                            <th className="px-2 py-1 text-left">
                                                              Timing
                                                            </th>
                                                            <th className="px-2 py-1 text-left">
                                                              Domain
                                                            </th>
                                                            <th className="px-2 py-1 text-left">
                                                              Cost
                                                            </th>
                                                          </tr>
                                                        </thead>
                                                        <tbody>
                                                          {rows.map(
                                                            (row, ridx) => {
                                                              // slot for this row (row.slot comes from breakdown push)
                                                              const slotVal =
                                                                row.slot ||
                                                                trainer
                                                                  .slotInfo?.[
                                                                  ridx
                                                                ]?.slot ||
                                                                trainer.dayDuration ||
                                                                "-";

                                                              // If slotInfo contains explicit from/to use that, otherwise derive from slot
                                                              const timingFromSlot =
                                                                trainer
                                                                  .slotInfo?.[
                                                                  ridx
                                                                ]?.from &&
                                                                trainer
                                                                  .slotInfo?.[
                                                                  ridx
                                                                ]?.to
                                                                  ? `${trainer.slotInfo[ridx].from} - ${trainer.slotInfo[ridx].to}`
                                                                  : getTimingForSlot(
                                                                      slotVal,
                                                                      training
                                                                    );

                                                              // domain: prefer slotInfo domain -> trainer.domain -> training.domain
                                                              // domain + specializations
                                                              const rawDomain =
                                                                trainer
                                                                  .slotInfo?.[
                                                                  ridx
                                                                ]?.domain ||
                                                                trainer.domain ||
                                                                training.domain ||
                                                                "-";

                                                              const specs =
                                                                trainer
                                                                  .slotInfo?.[
                                                                  ridx
                                                                ]
                                                                  ?.specializations ||
                                                                trainer.specializations ||
                                                                [];

                                                              let domainVal =
                                                                rawDomain;
                                                              if (
                                                                Array.isArray(
                                                                  specs
                                                                ) &&
                                                                specs.length > 0
                                                              ) {
                                                                domainVal +=
                                                                  " - " +
                                                                  specs.join(
                                                                    ", "
                                                                  );
                                                              } else if (
                                                                typeof specs ===
                                                                  "string" &&
                                                                specs.trim() !==
                                                                  ""
                                                              ) {
                                                                domainVal +=
                                                                  " - " + specs;
                                                              }

                                                              // cost: use trainer.perHourCost * row.hours (row.hours is numeric in your breakdown)
                                                              const perHour =
                                                                Number(
                                                                  trainer.perHourCost ||
                                                                    0
                                                                );
                                                              const rowHours =
                                                                Number(
                                                                  row.hours || 0
                                                                );
                                                              const costVal =
                                                                perHour *
                                                                rowHours;

                                                              return (
                                                                <tr key={ridx}>
                                                                  <td className="px-2 py-1">
                                                                    {formatDate(
                                                                      row.date
                                                                    )}
                                                                  </td>
                                                                  <td className="px-2 py-1">
                                                                    {row.hours}
                                                                  </td>
                                                                  <td className="px-2 py-1">
                                                                    {slotVal}
                                                                  </td>
                                                                  <td className="px-2 py-1">
                                                                    {
                                                                      timingFromSlot
                                                                    }
                                                                  </td>
                                                                  <td className="px-2 py-1">
                                                                    {domainVal}
                                                                    {trainer.specializations &&
                                                                      trainer
                                                                        .specializations
                                                                        .length >
                                                                        0 && (
                                                                        <>
                                                                          {" "}
                                                                          -{" "}
                                                                          {Array.isArray(
                                                                            trainer.specializations
                                                                          )
                                                                            ? trainer.specializations.join(
                                                                                ", "
                                                                              )
                                                                            : trainer.specializations}
                                                                        </>
                                                                      )}
                                                                  </td>

                                                                  <td className="px-2 py-1">
                                                                    {costVal
                                                                      ? `₹${costVal}`
                                                                      : "-"}
                                                                  </td>
                                                                </tr>
                                                              );
                                                            }
                                                          )}
                                                        </tbody>
                                                      </table>
                                                    </div>
                                                  ));
                                                })()}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">
                              No trainers assigned
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-sm">No batch data available.</div>
        )}
      </div>
    </div>
  );
}

export default InitiationTrainingDetails;
