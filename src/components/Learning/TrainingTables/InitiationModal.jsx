import React, { useState } from "react";
import { FiArrowLeft, FiPlus, FiTrash2, FiCheck, FiX, FiDatabase } from "react-icons/fi";
import initialSessions from "./sessionDummyData"; // Make sure sessionDummyData.js exports an array
import { db } from "../../../firebase";
import { collection, addDoc, doc } from "firebase/firestore";

const TimeRangePopup = ({ open, onClose, start, end, onChange }) => {
  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  });

  if (!open) return null;
  return (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-lg">
  <div className="bg-white/50 rounded-lg shadow-lg p-6 min-w-[300px] border border-white/30">
    <h3 className="text-sm font-semibold mb-4">Select Start & End Time</h3>
    <div className="mb-3">
      <label className="block text-xs mb-1">Start Time</label>
      <select
        className="w-full border rounded px-2 py-1 text-xs"
        value={start}
        onChange={(e) => onChange("start", e.target.value)}
      >
        <option value="">--:--</option>
        {timeOptions.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
    <div className="mb-3">
      <label className="block text-xs mb-1">End Time</label>
      <select
        className="w-full border rounded px-2 py-1 text-xs"
        value={end}
        onChange={(e) => onChange("end", e.target.value)}
      >
        <option value="">--:--</option>
        {timeOptions.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
    <div className="flex justify-end gap-2 mt-4">
      <button
        className="px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
        onClick={onClose}
      >
        Done
      </button>
    </div>
  </div>
</div>
  );
};

const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
});

const TimePicker = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <button
        type="button"
        className="flex items-center justify-between w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        onClick={() => setOpen(!open)}
      >
        <span>{value || "--:--"}</span>
        <span className="text-gray-400">▼</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 max-h-48 overflow-auto border border-gray-200">
          {timeOptions.map((time) => (
            <div
              key={time}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                value === time ? "bg-blue-100 text-blue-800" : "text-gray-800"
              }`}
              onClick={() => {
                onChange(time);
                setOpen(false);
              }}
            >
              {time}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const InitiationModal = ({ training, onBack, onConfirm }) => {
  const [activeTab, setActiveTab] = useState("details");
  const [form, setForm] = useState({
    phase: [],
    domain: "",
    startDate: "",
    endDate: "",
    collegeStartTime: "",
    collegeEndTime: "",
    lunchStartTime: "",
    lunchEndTime: "",
    phase2StartDate: "",
    phase2EndDate: "",
    phase3StartDate: "",
    phase3EndDate: "",
  });

  // Sessions start empty
  const [sessions, setSessions] = useState([]);
  const [timePopup, setTimePopup] = useState({
    open: false,
    idx: null,
    start: "",
    end: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const togglePhase = (phase) => {
    setForm((prev) => ({
      ...prev,
      phase: prev.phase.includes(phase)
        ? prev.phase.filter((p) => p !== phase)
        : [...prev.phase, phase],
    }));
  };

  const handleSessionChange = (rowIdx, key, value) => {
    const updated = sessions.map((row, idx) =>
      idx === rowIdx ? { ...row, [key]: value } : row
    );
    setSessions(updated);
  };

  const addSessionRow = () => {
    setSessions([...sessions, { ...blankSession }]);
  };

  const deleteSessionRow = (rowIdx) => {
    setSessions(sessions.filter((_, idx) => idx !== rowIdx));
  };

  // Fill dummy data handler
  const fillDummyData = () => {
    setSessions(initialSessions);
  };

  // Calculate campus summary
  const campusSummary = sessions.reduce((acc, session) => {
    const campus = session.campus || "Unknown";
    if (!acc[campus]) {
      acc[campus] = {
        campus,
        batches: 0,
        hrs: 0,
        softskills: 0,
        aptitude: 0,
        technical: 0,
        trainingCost: 0,
        foodStay: 0,
        travel: 0,
        totalCost: 0,
        phase: "",
      };
    }
    acc[campus].batches += 1;
    acc[campus].hrs += Number(session.hrs) || 0;
    if (session.domain === "Softskills")
      acc[campus].softskills += Number(session.hrs) || 0;
    if (session.domain === "Aptitude")
      acc[campus].aptitude += Number(session.hrs) || 0;
    if (session.domain === "Technical")
      acc[campus].technical += Number(session.hrs) || 0;
    acc[campus].trainingCost += Number(session.costPerHrs) || 0;
    acc[campus].foodStay += Number(session.foodLodging) || 0;
    acc[campus].travel += Number(session.travel) || 0;
    acc[campus].totalCost +=
      (Number(session.costPerHrs) || 0) +
      (Number(session.foodLodging) || 0) +
      (Number(session.travel) || 0);
    acc[campus].phase = session.phase || "";
    return acc;
  }, {});

  // Handler for time popup change
  const handleTimePopupChange = (field, value) => {
    setTimePopup((prev) => ({ ...prev, [field]: value }));
  };

  // Handler for saving time range
  const handleTimePopupDone = () => {
    if (timePopup.idx !== null) {
      const timeValue =
        timePopup.start && timePopup.end
          ? `${timePopup.start} - ${timePopup.end}`
          : "";
      handleSessionChange(timePopup.idx, "time", timeValue);
    }
    setTimePopup({ open: false, idx: null, start: "", end: "" });
  };

  // Save to Firestore
  const handleSaveToFirestore = async () => {
    try {
      // 1. Save main contract/form data
      const contractPayload = {
        ...form,
        createdAt: new Date().toISOString(),
        // Add other contract-level fields here
        collegeName: training?.collegeName || "",
        collegeCode: training?.collegeCode || "",
        address: training?.address || "",
        // ...etc
      };
      const contractRef = await addDoc(collection(db, "trainingForms"), contractPayload);

      // 2. For each phase, save phase details in subcollection
      for (const phase of form.phase) {
        // Filter sessions for this phase (if you store phase in session)
        // If not, just use all sessions or split as needed
        const phaseSessions = sessions.filter(s => s.phase === phase || !s.phase);

        // Prepare phase payload
        const phasePayload = {
          phaseId: phase,
          domain: form.domain,
          collegeStartTime: form.collegeStartTime,
          collegeEndTime: form.collegeEndTime,
          lunchStartTime: form.lunchStartTime,
          lunchEndTime: form.lunchEndTime,
          trainingStartDate: form.startDate,
          trainingEndDate: form.endDate,
          details: form.details || "",
          table1Data: phaseSessions, // This is your batch/trainer array
          createdAt: new Date().toISOString(),
          // Add other phase-specific fields as needed
        };

        // Save to subcollection
        await addDoc(collection(db, "trainingForms", contractRef.id, "trainings"), phasePayload);
      }

      alert("Training initiation saved to Firestore!");
      if (onConfirm) onConfirm(form);
    } catch (err) {
      alert("Error saving: " + err.message);
    }
  };

  if (!training) return null;

  return (
    <div className="min-h-screen bg-gray-50 ">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onBack}
          className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <FiArrowLeft className="mr-2" />
          Back to Contracts
        </button>
        <h1 className="text-2xl font-semibold text-gray-800">
          Training Initiation
        </h1>
        <div className="w-8"></div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Training Details */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Training Parameters
          </h2>
          {/* Compact single-row layout for parameters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Phases */}
            <label className="text-sm font-medium text-gray-700 mr-2">Phases:</label>
            {["phase-1", "phase-2", "phase-3"].map((phase, idx) => (
              <button
                key={phase}
                type="button"
                onClick={() => togglePhase(phase)}
                className={`px-2 py-1 text-xs rounded-full border ${
                  form.phase.includes(phase)
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
                style={{ minWidth: "32px" }}
              >
                {`P${idx + 1}`}
              </button>
            ))}
            {/* Domain */}
            <label className="text-sm font-medium text-gray-700 ml-4 mr-2">Domain:</label>
            <select
              id="domain"
              name="domain"
              value={form.domain}
              onChange={handleChange}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs"
              style={{ minWidth: "110px" }}
            >
              <option value="">Select</option>
              <option value="Technical">Technical</option>
              <option value="Softskills">Softskills</option>
              <option value="Aptitude">Aptitude</option>
              <option value="Tools">Tools</option>
            </select>
            {/* Start Date */}
            <label className="text-sm font-medium text-gray-700 ml-4 mr-2">Start:</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs"
              style={{ minWidth: "110px" }}
            />
            {/* End Date */}
            <label className="text-sm font-medium text-gray-700 ml-4 mr-2">End:</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs"
              style={{ minWidth: "110px" }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {/* Date Range */}
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Phase-specific dates */}
          {form.phase.includes("phase 2") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label
                  htmlFor="phase2StartDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phase 2 Start Date
                </label>
                <input
                  type="date"
                  id="phase2StartDate"
                  name="phase2StartDate"
                  value={form.phase2StartDate}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="phase2EndDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phase 2 End Date
                </label>
                <input
                  type="date"
                  id="phase2EndDate"
                  name="phase2EndDate"
                  value={form.phase2EndDate}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          )}

          {form.phase.includes("phase 3") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label
                  htmlFor="phase3StartDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phase 3 Start Date
                </label>
                <input
                  type="date"
                  id="phase3StartDate"
                  name="phase3StartDate"
                  value={form.phase3StartDate}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="phase3EndDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phase 3 End Date
                </label>
                <input
                  type="date"
                  id="phase3EndDate"
                  name="phase3EndDate"
                  value={form.phase3EndDate}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          )}

          {/* Time Settings */}
          <h3 className="text-md font-medium text-gray-800 mb-2">
            Daily Schedule
          </h3>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <TimePicker
              label="College Start Time"
              value={form.collegeStartTime}
              onChange={(t) => setForm({ ...form, collegeStartTime: t })}
            />
            <TimePicker
              label="College End Time"
              value={form.collegeEndTime}
              onChange={(t) => setForm({ ...form, collegeEndTime: t })}
            />
            <TimePicker
              label="Lunch Start Time"
              value={form.lunchStartTime}
              onChange={(t) => setForm({ ...form, lunchStartTime: t })}
            />
            <TimePicker
              label="Lunch End Time"
              value={form.lunchEndTime}
              onChange={(t) => setForm({ ...form, lunchEndTime: t })}
            />
          </div>
        </div>

        {/* Session Management */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              Session Management
            </h2>
            <button
              onClick={fillDummyData}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              type="button"
            >
              <FiDatabase className="mr-2" />
              Fill Dummy Data
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-xs">Domain</th>
                  <th className="text-xs">Topics</th>
                  <th className="w-10 text-xs">Year</th>
                  <th className="w-[100px] max-w-[6.5rem] text-xs">Date</th>
                  <th className="w-12 text-xs">Campus</th>
                  <th className="w-16 text-xs">Batch</th>
                  <th className="w-8 text-xs">Hours</th>
                  <th className="w-24 text-xs">Time</th>
                  <th className="w-12 text-xs">Cost/Hrs</th>
                  <th className="w-12 text-xs">Food & Lodging</th>
                  <th className="w-12 text-xs">Travel</th>
                  <th className="text-xs">Trainer</th>
                  <th className="w-12 text-xs">Student Count</th>
                  <th className="text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, idx) => (
                  <tr key={idx}>
                    <td className="text-xs">
                      <select
                        value={session.domain}
                        onChange={(e) =>
                          handleSessionChange(idx, "domain", e.target.value)
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Select</option>
                        <option value="Technical">Technical</option>
                        <option value="Softskills">Softskills</option>
                        <option value="Aptitude">Aptitude</option>
                        <option value="Tools">Tools</option>
                      </select>
                    </td>
                    <td className="text-xs">
                      <input
                        type="text"
                        value={session.topics || ""}
                        onChange={(e) =>
                          handleSessionChange(idx, "topics", e.target.value)
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </td>
                    <td className="w-10 text-xs">
                      <input
                        type="text"
                        value={session.year || ""}
                        onChange={(e) =>
                          handleSessionChange(idx, "year", e.target.value)
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </td>
                    <td className="w-[100px] max-w-[6.5rem] text-xs truncate">
                      <input
                        type="date"
                        value={session.date || ""}
                        onChange={(e) =>
                          handleSessionChange(idx, "date", e.target.value)
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        style={{ minWidth: 0 }}
                      />
                    </td>
                    <td className="w-12 text-xs">
                      <input
                        type="text"
                        value={session.campus || ""}
                        onChange={(e) =>
                          handleSessionChange(idx, "campus", e.target.value)
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </td>
                    <td className="w-16 text-xs">
                      <input
                        type="text"
                        value={session.batch || ""}
                        onChange={(e) =>
                          handleSessionChange(idx, "batch", e.target.value)
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </td>
                    <td className="w-8 text-xs">
                      <input
                        type="number"
                        value={session.hrs || ""}
                        onChange={(e) =>
                          handleSessionChange(idx, "hrs", e.target.value)
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </td>
                    <td className="w-24 text-xs">
                      <input
                        type="text"
                        value={session.time || ""}
                        readOnly
                        onClick={() =>
                          setTimePopup({
                            open: true,
                            idx,
                            start: session.time?.split(" - ")[0] || "",
                            end: session.time?.split(" - ")[1] || "",
                          })
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm cursor-pointer bg-white"
                        placeholder="Select time"
                      />
                    </td>
                    <td className="text-xs">
                      <input
                        type="number"
                        value={session.costPerHrs || ""}
                        onChange={(e) =>
                          handleSessionChange(idx, "costPerHrs", e.target.value)
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        placeholder="₹0.00"
                      />
                    </td>
                    <td className="w-12 text-xs">
                      <input
                        type="number"
                        value={session.foodLodging || ""}
                        onChange={(e) =>
                          handleSessionChange(
                            idx,
                            "foodLodging",
                            e.target.value
                          )
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </td>
                    <td className="w-12 text-xs">
                      <input
                        type="number"
                        value={session.travel || ""}
                        onChange={(e) =>
                          handleSessionChange(idx, "travel", e.target.value)
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </td>
                    <td className="text-xs">
                      <input
                        type="text"
                        value={session.trainer || ""}
                        onChange={(e) =>
                          handleSessionChange(idx, "trainer", e.target.value)
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </td>
                    <td className="w-12 text-xs">
                      <input
                        type="number"
                        value={session.studentCount || ""}
                        onChange={(e) =>
                          handleSessionChange(
                            idx,
                            "studentCount",
                            e.target.value
                          )
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => deleteSessionRow(idx)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Add Session button below the table, left aligned */}
          <div className="mt-3 flex justify-start">
            <button
              onClick={addSessionRow}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiPlus className="mr-2" />
              Add Session
            </button>
          </div>
        </div>

        {/* Campus Summary */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            Campus Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Campus
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Batches
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Total Hours
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Softskills
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Aptitude
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Technical
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Training Cost
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Food & Stay
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Travel
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Total Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.values(campusSummary).map((campus, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {campus.campus}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {campus.batches}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {campus.hrs}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {campus.softskills}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {campus.aptitude}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {campus.technical}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                      ₹{campus.trainingCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      ₹{campus.foodStay.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      ₹{campus.travel.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                      ₹{campus.totalCost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <FiX className="mr-2" />
          Cancel
        </button>
<button
  onClick={handleSaveToFirestore}
  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
>
  <FiCheck className="mr-2" />
  Confirm Initiation
</button>
      </div>

      <TimeRangePopup
        open={timePopup.open}
        start={timePopup.start}
        end={timePopup.end}
        onChange={handleTimePopupChange}
        onClose={handleTimePopupDone}
      />
    </div>
  );
};

const blankSession = {
  domain: "",
  topics: "",
  year: "",
  trainer: "",
  date: "",
  campus: "",
  batch: "",
  studentCount: "",
  time: "",
  hrs: "",
  costPerHrs: "",
  costPerDay: "",
  foodLodging: "",
  travel: "",
  totalAmount: "",
  particular: "",
  total: "",
  status: "",
  topicCovered: "",
  actualStudentCount: "",
};

export default InitiationModal;
