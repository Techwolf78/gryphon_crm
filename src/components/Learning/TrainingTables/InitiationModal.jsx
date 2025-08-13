import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  getDocs,
  collection as fbCollection,
  collection,
} from "firebase/firestore";
import {
  FiChevronLeft,
  FiCheck,
  FiClock,
  FiAlertCircle,
} from "react-icons/fi";
import BatchDetailsTable from "./Initiate/BatchDetailsTable";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";


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

function InitiationModal({ training, onClose, onConfirm }) {
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [topics, setTopics] = useState([]);
  const [courses, setCourses] = useState([]);
  const [currentPhase, setCurrentPhase] = useState("");
  const [commonFields, setCommonFields] = useState({
    trainingStartDate: null,
    trainingEndDate: null,
    collegeStartTime: "",
    collegeEndTime: "",
    lunchStartTime: "",
    lunchEndTime: "",
  });
  const [phase2Dates, setPhase2Dates] = useState({
    startDate: null,
    endDate: null,
  });
  const [phase3Dates, setPhase3Dates] = useState({

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
  const [phaseHours, setPhaseHours] = useState({
    "phase-1": 0,
    "phase-2": 0,
    "phase-3": 0,
  });
  const [customPhaseHours, setCustomPhaseHours] = useState({
    "phase-1": "",
    "phase-2": "",
    "phase-3": "",
  });
  const [totalTrainingHours, setTotalTrainingHours] = useState(0);
  const [table1Data, setTable1Data] = useState([]);
  const [showReusePrompt, setShowReusePrompt] = useState(false);
  const [reuseBatchData, setReuseBatchData] = useState(null);
  const [canMergeBatches, setCanMergeBatches] = useState(false);
  const [hasRejectedReuse, setHasRejectedReuse] = useState(false);

  // Get domain hours - use custom hours if set, otherwise default from database
  const getDomainHours = useCallback((domain, phase = null) => {
    if (phase && customPhaseHours[phase] && customPhaseHours[phase] !== "") {
      return Number(customPhaseHours[phase]);
    }
    if (!domain) return 0;
    const topicMap = {
      Technical: "Domain Technical",
      NonTechnical: "Soft Skills",
      "Soft skills": "Soft Skills",
      Aptitude: "Aptitude",
      Tools: "Tools",
    };
    const topicName = topicMap[domain] || domain;
    const topicObj = topics?.find(
      (t) => t?.topic?.trim()?.toLowerCase() === topicName?.toLowerCase()
    );
    return topicObj?.hours || 0;
  }, [customPhaseHours, topics]);

  const getMainPhase = useCallback(() => {
    if (selectedPhases.includes("phase-1")) return "phase-1";
    if (selectedPhases.includes("phase-2")) return "phase-2";
    if (selectedPhases.includes("phase-3")) return "phase-3";
    return null;
  }, [selectedPhases]);


  const deleteSessionRow = (rowIdx) => {
    setSessions(sessions.filter((_, idx) => idx !== rowIdx));
  };

  useEffect(() => {
    const fetchTrainingDetails = async () => {
      if (!training?.id) return;
      const docRef = doc(db, "trainingForms", training.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setTopics(data.topics || []);
        setCourses(data.courses || []);
        setTotalTrainingHours(Number(data.totalTrainingHours || 0));
      }
    };
    fetchTrainingDetails();
  }, [training]);

  useEffect(() => {
    if (selectedDomain && courses.length > 0) {
      const mainPhase = getMainPhase();
      const domainHours = getDomainHours(selectedDomain, mainPhase);
      const rows = courses.map((course) => ({
        batch: course.specialization,
        stdCount: course.students,
        hrs: domainHours,
        assignedHours: 0,
        batches: [
          {
            batchPerStdCount: "",
            batchCode: `${course.specialization}1`,
            assignedHours: 0,
            trainers: [],
          },
        ],
      }));
      setTable1Data(rows);
      setPhaseHours((prev) => ({
        ...prev,
        [mainPhase]: 0,
      }));
    }
  }, [selectedDomain, courses, topics, customPhaseHours, getDomainHours, getMainPhase]);

  const handleAssignedHoursChange = (hours, phase) => {
    setPhaseHours((prev) => ({
      ...prev,
      [phase]: Number(hours),
    }));
  };

  const handlePhaseChange = (phase) => {
    setSelectedPhases((prev) => {
      const newPhases = prev.includes(phase) ? prev.filter((p) => p !== phase) : [...prev, phase];
      if (prev.includes(phase) && !newPhases.includes(phase)) {
        setCustomPhaseHours((prevHours) => ({
          ...prevHours,
          [phase]: "",
        }));
      }
      return newPhases;
    });
    if (phase === "phase-1" && !selectedPhases.includes(phase)) {
      setSelectedDomain("");

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

  // Update currentPhase when selectedPhases changes
  useEffect(() => {
    const mainPhase = getMainPhase();
    setCurrentPhase(mainPhase);
  }, [selectedPhases, getMainPhase]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);

    }
    setTimePopup({ open: false, idx: null, start: "", end: "" });
  };

  // Save to Firestore
  const handleSaveToFirestore = async () => {
    try {
      const serializeTable1Data = (data) => {
        return data.map((row) => ({
          ...row,
          batches: (row.batches || []).map((batch) => ({
            ...batch,
            trainers: (batch.trainers || []).map((trainer) => ({
              ...trainer,
              mergedBreakdown: trainer.mergedBreakdown || [],
              activeDates: (trainer.activeDates || []).map((date) =>
                typeof date === "string"
                  ? date
                  : date?.toISOString?.().slice(0, 10) || ""
              ),
            })),
          })),
        }));
      };
      const table1DataToSave = serializeTable1Data(table1Data);

      const mainPhase = getMainPhase();

      const batchPromises = selectedPhases.map(async (phase) => {
        let phaseData = {
          createdAt: serverTimestamp(),
          createdBy: training.createdBy || {},
          ...commonFields,
          phase: phase,
          customHours: customPhaseHours[phase] || "",
          assignedHours: phaseHours[phase] || 0,
        };

        if (phase === mainPhase) {
          phaseData = {
            ...phaseData,
            domain: selectedDomain,
            domainHours: getDomainHours(selectedDomain, mainPhase),
            table1Data: table1DataToSave,
            isMainPhase: true,
          };
        } else {
          phaseData.isMainPhase = false;
        }

        if (phase === "phase-2" && phase !== mainPhase) {
          phaseData.phase2Dates = phase2Dates;
        }
        if (phase === "phase-3" && phase !== mainPhase) {
          phaseData.phase3Dates = phase3Dates;
        }

        const phaseRef = doc(
          collection(db, "trainingForms", training.id, "trainings"),
          phase
        );
        return setDoc(phaseRef, phaseData, { merge: true });
      });

      await Promise.all(batchPromises);

      setSuccess("Training phases initiated successfully!");
      setLoading(false);

      setTimeout(() => {
        if (onConfirm)
          onConfirm({
            phases: selectedPhases,
            ...commonFields,
            domain: selectedDomain,
            table1Data,
            ...phase2Dates,
          });
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      console.error("Error saving phase data:", err);
      setError("Failed to save phase data. Please try again.");
      setLoading(false);
    }
  };

  const canProceedToNextStep = () => true;

  useEffect(() => {
    const checkForTechnicalBatch = async () => {
      if (
        selectedDomain === "Soft skills" &&
        training?.id &&
        !hasRejectedReuse
      ) {
        const techPhaseRef = doc(
          db,
          "trainingForms",
          training.id,
          "trainings",
          "phase-1"
        );
        const techSnap = await getDoc(techPhaseRef);
        if (techSnap.exists() && techSnap.data().domain === "Technical") {
          setReuseBatchData(techSnap.data().table1Data || []);
          setShowReusePrompt(true);
        }
      } else {
        setShowReusePrompt(false);
        setReuseBatchData(null);

      }

  const handleReuseDecision = (reuse) => {
    setShowReusePrompt(false);
    if (reuse && reuseBatchData) {
      const mainPhase = getMainPhase();
      const softSkillsHours = getDomainHours("Soft skills", mainPhase);
      const updated = reuseBatchData.map((row) => ({
        ...row,
        hrs: softSkillsHours,
        assignedHours: 0,
        batches: (row.batches || []).map((batch) => ({
          ...batch,
          assignedHours: 0,
          trainers: [],
        })),
      }));
      setTable1Data(updated);
      setHasRejectedReuse(false);
    } else {
      setTable1Data([]);
      setHasRejectedReuse(true);
      const prevDomain = selectedDomain;
      setSelectedDomain("");
      setTimeout(() => setSelectedDomain(prevDomain), 0);
    }
  };

  useEffect(() => {
    const checkTrainingsCollection = async () => {
      if (training?.id) {
        const trainingsSnap = await getDocs(
          fbCollection(db, "trainingForms", training.id, "trainings")
        );
        setCanMergeBatches(!trainingsSnap.empty);
      } else {
        setCanMergeBatches(false);
      }
    };
    checkTrainingsCollection();
  }, [training]);

  useEffect(() => {
    const prefillCommonFields = async () => {
      if (!training?.id) return;
      const phaseRefs = [
        doc(db, "trainingForms", training.id, "trainings", "phase-1"),
        doc(db, "trainingForms", training.id, "trainings", "phase-2"),
        doc(db, "trainingForms", training.id, "trainings", "phase-3"),
      ];
      for (const ref of phaseRefs) {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setCommonFields((prev) => ({
            ...prev,
            trainingStartDate: data.trainingStartDate || prev.trainingStartDate,
            trainingEndDate: data.trainingEndDate || prev.trainingEndDate,
            collegeStartTime: data.collegeStartTime || prev.collegeStartTime,
            collegeEndTime: data.collegeEndTime || prev.collegeEndTime,
            lunchStartTime: data.lunchStartTime || prev.lunchStartTime,
            lunchEndTime: data.lunchEndTime || prev.lunchEndTime,
          }));
          break;
        }
      }
    };
    prefillCommonFields();
  }, [training?.id]);

  useEffect(() => {
    if (!training?.id) return;
    const fetchPhaseDates = async () => {
      const phase2Ref = doc(
        db,
        "trainingForms",
        training.id,
        "trainings",
        "phase-2"
      );
      const phase2Snap = await getDoc(phase2Ref);
      if (phase2Snap.exists()) {
        const data = phase2Snap.data();
        if (data.phase2Dates) {
          setPhase2Dates({
            startDate: data.phase2Dates.startDate || "",
            endDate: data.phase2Dates.endDate || "",
          });
        } else {
          setPhase2Dates({
            startDate: data.trainingStartDate || "",
            endDate: data.trainingEndDate || "",
          });
        }
      }
      const phase3Ref = doc(
        db,
        "trainingForms",
        training.id,
        "trainings",
        "phase-3"
      );
      const phase3Snap = await getDoc(phase3Ref);
      if (phase3Snap.exists()) {
        const data = phase3Snap.data();
        if (data.phase3Dates) {
          setPhase3Dates({
            startDate: data.phase3Dates.startDate || "",
            endDate: data.phase3Dates.endDate || "",
          });
        } else {
          setPhase3Dates({
            startDate: data.trainingStartDate || "",
            endDate: data.trainingEndDate || "",
          });
        }
      }
    };
    fetchPhaseDates();
  }, [training?.id]);

  useEffect(() => {
    const fetchExistingPhases = async () => {
      if (!training?.id) return;
      const trainingsSnap = await getDocs(
        collection(db, "trainingForms", training.id, "trainings")
      );
      const phases = [];
      const existingCustomHours = {};
      trainingsSnap.forEach((docSnap) => {
        if (docSnap.exists()) {
          phases.push(docSnap.id);
          const data = docSnap.data();
          if (data.customHours) {
            existingCustomHours[docSnap.id] = data.customHours;
          }
        }
      });
      setSelectedPhases(phases);
      if (Object.keys(existingCustomHours).length > 0) {
        setCustomPhaseHours((prev) => ({
          ...prev,
          ...existingCustomHours,
        }));
      }
    };
    fetchExistingPhases();
  }, [training?.id]);


  const swapTrainers = (source, target) => {
    const newTable1Data = [...table1Data];
    const sourceTrainer = newTable1Data[source.rowIdx].batches[source.batchIdx].trainers[source.trainerIdx];
    const targetTrainer = newTable1Data[target.rowIdx].batches[target.batchIdx].trainers[target.trainerIdx];
    if (!sourceTrainer.slotInfo) sourceTrainer.slotInfo = (sourceTrainer.activeDates || []).map(() => ({
      slot: sourceTrainer.dayDuration,
      batchCode: newTable1Data[source.rowIdx].batches[source.batchIdx].batchCode
    }));
    if (!targetTrainer.slotInfo) targetTrainer.slotInfo = (targetTrainer.activeDates || []).map(() => ({
      slot: targetTrainer.dayDuration,
      batchCode: newTable1Data[target.rowIdx].batches[target.batchIdx].batchCode
    }));
    (targetTrainer.activeDates || []).forEach((date, idx) => {
      sourceTrainer.activeDates.push(date);
      sourceTrainer.dailyHours.push(targetTrainer.dailyHours?.[idx] || 0);
      sourceTrainer.slotInfo.push({
        slot: targetTrainer.dayDuration === "AM" ? "PM" : "AM",
        batchCode: newTable1Data[target.rowIdx].batches[target.batchIdx].batchCode
      });
    });
    (sourceTrainer.activeDates.slice(0, sourceTrainer.activeDates.length - (targetTrainer.activeDates?.length || 0)) || []).forEach((date, idx) => {
      targetTrainer.activeDates.push(date);
      targetTrainer.dailyHours.push(sourceTrainer.dailyHours?.[idx] || 0);
      targetTrainer.slotInfo.push({
        slot: sourceTrainer.dayDuration === "AM" ? "PM" : "AM",
        batchCode: newTable1Data[source.rowIdx].batches[source.batchIdx].batchCode
      });
    });
    setTable1Data(newTable1Data);
  };

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

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Page Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-start">
              <div>
                <button
                  onClick={onClose}
                  className="mb-2 flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm"
                  disabled={loading}
                >
                  <FiChevronLeft className="w-3 h-3 mr-1" />
                  Back to Training List
                </button>
                <h1 className="text-xl font-bold text-gray-900">
                  Initiate Training
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {training?.collegeName} • {training?.collegeCode}
                </p>
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

        {/* Main Content */}
        <div className=" mx-auto py-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Page Content */}
            <div className="p-4">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Phase Selection */}
                <div className="space-y-4">
                  <div className="pb-3 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Select Training Phases
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Choose which phases you want to initiate for this training program.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PHASE_OPTIONS.map((phase) => (
                      <div
                        key={phase}
                        onClick={() => handlePhaseChange(phase)}
                        className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md
                          ${
                            selectedPhases.includes(phase)
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100 shadow-sm"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }
                        `}
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4
                            ${
                              selectedPhases.includes(phase)
                                ? "bg-blue-500 border-blue-500"
                                : "bg-white border-gray-300"
                            }
                          `}
                          >
                            {selectedPhases.includes(phase) && (
                              <FiCheck className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <span className="text-lg font-medium text-gray-800 capitalize">
                            {phase.replace("-", " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Training Configuration */}
                <div className="space-y-6">
                  <div className="pb-3 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Training Configuration
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Set up the basic timing and schedule configuration for the training.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <DatePicker
                        selected={
                          commonFields.trainingStartDate
                            ? new Date(commonFields.trainingStartDate)
                            : null
                        }
                        onChange={(date) =>
                          setCommonFields({
                            ...commonFields,
                            trainingStartDate: date
                              ? date.toISOString().slice(0, 10)
                              : "",
                          })
                        }
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select date"
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <DatePicker
                        selected={
                          commonFields.trainingEndDate
                            ? new Date(commonFields.trainingEndDate)
                            : null
                        }
                        onChange={(date) =>
                          setCommonFields({
                            ...commonFields,
                            trainingEndDate: date
                              ? date.toISOString().slice(0, 10)
                              : "",
                          })
                        }
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select date"
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        College Start Time
                      </label>
                      <DatePicker
                        selected={
                          commonFields.collegeStartTime
                            ? new Date(
                                `1970-01-01T${commonFields.collegeStartTime}`
                              )
                            : null
                        }
                        onChange={(date) =>
                          setCommonFields({
                            ...commonFields,
                            collegeStartTime: date
                              ? date.toTimeString().slice(0, 5)
                              : "",
                          })
                        }
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="Select time"
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        College End Time
                      </label>
                      <DatePicker
                        selected={
                          commonFields.collegeEndTime
                            ? new Date(
                                `1970-01-01T${commonFields.collegeEndTime}`
                              )
                            : null
                        }
                        onChange={(date) =>
                          setCommonFields({
                            ...commonFields,
                            collegeEndTime: date
                              ? date.toTimeString().slice(0, 5)
                              : "",
                          })
                        }
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="Select time"
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lunch Start Time
                      </label>
                      <DatePicker
                        selected={
                          commonFields.lunchStartTime
                            ? new Date(
                                `1970-01-01T${commonFields.lunchStartTime}`
                              )
                            : null
                        }
                        onChange={(date) =>
                          setCommonFields({
                            ...commonFields,
                            lunchStartTime: date
                              ? date.toTimeString().slice(0, 5)
                              : "",
                          })
                        }
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="Select time"
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lunch End Time
                      </label>
                      <DatePicker
                        selected={
                          commonFields.lunchEndTime
                            ? new Date(
                                `1970-01-01T${commonFields.lunchEndTime}`
                              )
                            : null
                        }
                        onChange={(date) =>
                          setCommonFields({
                            ...commonFields,
                            lunchEndTime: date
                              ? date.toTimeString().slice(0, 5)
                              : "",
                          })
                        }
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="Select time"
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  {/* Phase 2 Dates */}
                  {selectedPhases.includes("phase-2") &&
                    selectedPhases.length > 1 &&
                    getMainPhase() !== "phase-2" && (
                      <div className="space-y-4 pt-4 border-t border-gray-200">
                        <h4 className="text-md font-medium text-gray-900">
                          Phase 2 Dates
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phase 2 Start Date
                            </label>
                            <input
                              type="date"
                              value={phase2Dates.startDate || ""}
                              onChange={(e) =>
                                setPhase2Dates({
                                  ...phase2Dates,
                                  startDate: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phase 2 End Date
                            </label>
                            <input
                              type="date"
                              value={phase2Dates.endDate || ""}
                              onChange={(e) =>
                                setPhase2Dates({
                                  ...phase2Dates,
                                  endDate: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Phase 3 Dates */}
                  {selectedPhases.includes("phase-3") &&
                    selectedPhases.length > 1 &&
                    getMainPhase() !== "phase-3" && (
                      <div className="space-y-4 pt-4 border-t border-gray-200">
                        <h4 className="text-md font-medium text-gray-900">
                          Phase 3 Dates
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phase 3 Start Date
                            </label>
                            <input
                              type="date"
                              value={phase3Dates?.startDate || ""}
                              onChange={(e) =>
                                setPhase3Dates({
                                  ...phase3Dates,
                                  startDate: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phase 3 End Date
                            </label>
                            <input
                              type="date"
                              value={phase3Dates?.endDate || ""}
                              onChange={(e) =>
                                setPhase3Dates({
                                  ...phase3Dates,
                                  endDate: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                {/* Training Domain + Batch Details */}
                {getMainPhase() && (
                  <>
                    {/* Domain Selection */}
                    <div className="space-y-4">
                      <div className="pb-3 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Training Domain
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                          Select the domain for this training program.
                        </p>
                      </div>
                      <div className="max-w-md">
                        <select
                          value={selectedDomain}
                          onChange={(e) => setSelectedDomain(e.target.value)}
                          className="w-full px-4 py-3 text-base rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                        >
                          <option value="">Select a domain</option>
                          {DOMAIN_OPTIONS.map((domain) => (
                            <option key={domain} value={domain}>
                              {domain}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Batch Details Table */}
                    <div className="space-y-4">
                      <div className="pb-3 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Batch & Trainer Assignment
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                          Configure batch details and assign trainers for the selected domain.
                        </p>
                      </div>
                      <BatchDetailsTable
                        table1Data={table1Data}
                        setTable1Data={setTable1Data}
                        selectedDomain={selectedDomain}
                        topics={topics}
                        courses={courses}
                        getDomainHours={(domain) => getDomainHours(domain, currentPhase)}
                        commonFields={commonFields}
                        canMergeBatches={canMergeBatches}
                        mainPhase={currentPhase}
                        maxAssignableHours={getRemainingHours(currentPhase)}
                        onAssignedHoursChange={(hours) => handleAssignedHoursChange(hours, currentPhase)}
                        onSwapTrainer={swapTrainers}
                        customHours={customPhaseHours[currentPhase]}
                      />
                    </div>
                  </>
                )}

                {/* Status Messages */}
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <FiAlertCircle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          {error}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <FiCheck className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          {success}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Page Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-lg">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !canProceedToNextStep()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <FiClock className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Processing...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </div>

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