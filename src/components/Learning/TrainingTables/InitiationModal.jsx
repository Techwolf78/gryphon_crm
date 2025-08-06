import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../../firebase";
import {
  doc,
  collection,
  getDoc,
  setDoc,
  serverTimestamp,
  getDocs,
  collection as fbCollection,
} from "firebase/firestore";
import {
  FiX,
  FiChevronRight,
  FiChevronLeft,
  FiCheck,
  FiClock,
  FiAlertCircle,
} from "react-icons/fi";
import BatchDetailsTable from "./Initiate/BatchDetailsTable";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const PHASE_OPTIONS = ["phase-1", "phase-2", "phase-3"];
const DOMAIN_OPTIONS = ["Technical", "Soft skills", "Aptitude", "Tools"];

function InitiationModal({ training, onClose, onConfirm }) {
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [details] = useState("");
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
  });

  // --- Dynamic Hours Logic ---
  const [phaseHours, setPhaseHours] = useState({
    "phase-1": 0,
    "phase-2": 0,
    "phase-3": 0,
  });

  // Custom hours for each phase set by user in step 1
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
    // If phase is provided and custom hours are set for that phase, use custom hours
    if (phase && customPhaseHours[phase] && customPhaseHours[phase] !== "") {
      return Number(customPhaseHours[phase]);
    }
    
    // Otherwise use default database hours
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

  // --- Dynamic Remaining Hours Calculation ---
  const getMainPhase = useCallback(() => {
    if (selectedPhases.includes("phase-1")) return "phase-1";
    if (selectedPhases.includes("phase-2")) return "phase-2";
    if (selectedPhases.includes("phase-3")) return "phase-3";
    return null;
  }, [selectedPhases]);

  const getRemainingHours = (phase) => {
    const phaseOrder = ["phase-1", "phase-2", "phase-3"];
    const idx = phaseOrder.indexOf(phase);
    let used = 0;
    for (let i = 0; i < idx; i++) {
      used += Number(phaseHours[phaseOrder[i]] || 0);
    }
    return Math.max(0, totalTrainingHours - used);
  };

  // --- Fetch topics/courses and set totalTrainingHours ---
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

  // --- When domain changes, reset batch table and assigned hours for main phase ---
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
      // Set assigned hours for main phase
      setPhaseHours((prev) => ({
        ...prev,
        [mainPhase]: 0,
      }));
    }
  }, [selectedDomain, courses, topics, customPhaseHours, getDomainHours, getMainPhase]);

  // Update this function to accept phase as argument
  const handleAssignedHoursChange = (hours, phase) => {
    setPhaseHours((prev) => ({
      ...prev,
      [phase]: Number(hours),
    }));
  };

  const handlePhaseChange = (phase) => {
    setSelectedPhases((prev) => {
      const newPhases = prev.includes(phase) ? prev.filter((p) => p !== phase) : [...prev, phase];
      
      // Clear custom hours for deselected phases
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
    setError(null);
  };

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
  }, [success]);

  const validateForm = () => {
    if (selectedPhases.length === 0) {
      setError("Please select at least one phase");
      return false;
    }
    if (!selectedDomain) {
      setError("Please select a domain");
      return false;
    }
    if (!commonFields.trainingStartDate || !commonFields.trainingEndDate) {
      setError("Please select training start and end dates");
      return false;
    }
    if (!commonFields.collegeStartTime || !commonFields.collegeEndTime) {
      setError("Please enter college start and end times");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError(null);

    try {
      // Prepare batch/trainer data for Firestore
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
          details: details || "",
          createdAt: serverTimestamp(),
          createdBy: training.createdBy || {},
          ...commonFields,
          phase: phase,
          customHours: customPhaseHours[phase] || "",
          assignedHours: phaseHours[phase] || 0,
        };

        // Only save domain and batch assignment for the main phase
        if (phase === mainPhase) {
          phaseData = {
            ...phaseData,
            domain: selectedDomain,
            domainHours: getDomainHours(selectedDomain, mainPhase),
            table1Data: table1DataToSave,
            isMainPhase: true,
          };
        } else {
          // For non-main phases, mark as secondary
          phaseData.isMainPhase = false;
        }

        // Add phase-specific dates for non-main phases
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
            details,
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

  const canProceedToNextStep = () => {
    return true;
  };

  // When domain changes to Soft skills, check for Technical batch
  useEffect(() => {
    const checkForTechnicalBatch = async () => {
      if (
        selectedDomain === "Soft skills" &&
        training?.id &&
        !hasRejectedReuse
      ) {
        // Check Firestore for phase-1 with domain "Technical"
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
    };
    checkForTechnicalBatch();
  }, [selectedDomain, training, hasRejectedReuse]);

  // Handler for user response to reuse prompt
  const handleReuseDecision = (reuse) => {
    setShowReusePrompt(false);
    if (reuse && reuseBatchData) {
      // Only import batch assignments, set assigned hours to 0, and clear trainers
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

  // Fetch and prefill commonFields if any phase exists
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

  // Fetch and prefill phase2Dates and phase3Dates if they exist in backend
  useEffect(() => {
    if (!training?.id) return;
    const fetchPhaseDates = async () => {
      // Phase 2
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
      // Phase 3
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

  // Swap trainers between AM and PM slots for selected batches
 const swapTrainers = (source, target) => {
  const newTable1Data = [...table1Data];

  const sourceTrainer = newTable1Data[source.rowIdx].batches[source.batchIdx].trainers[source.trainerIdx];
  const targetTrainer = newTable1Data[target.rowIdx].batches[target.batchIdx].trainers[target.trainerIdx];

  // Ensure slotInfo exists as array of objects
  if (!sourceTrainer.slotInfo) sourceTrainer.slotInfo = (sourceTrainer.activeDates || []).map(() => ({
    slot: sourceTrainer.dayDuration,
    batchCode: newTable1Data[source.rowIdx].batches[source.batchIdx].batchCode
  }));
  if (!targetTrainer.slotInfo) targetTrainer.slotInfo = (targetTrainer.activeDates || []).map(() => ({
    slot: targetTrainer.dayDuration,
    batchCode: newTable1Data[target.rowIdx].batches[target.batchIdx].batchCode
  }));

  // Add target's slot details to sourceTrainer (swap slot)
  (targetTrainer.activeDates || []).forEach((date, idx) => {
    sourceTrainer.activeDates.push(date);
    sourceTrainer.dailyHours.push(targetTrainer.dailyHours?.[idx] || 0);
    sourceTrainer.slotInfo.push({
      slot: targetTrainer.dayDuration === "AM" ? "PM" : "AM",
      batchCode: newTable1Data[target.rowIdx].batches[target.batchIdx].batchCode
    });
  });

  // Add source's slot details to targetTrainer (swap slot)
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
    <>
      {/* Reuse Prompt Modal */}
      {showReusePrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900 bg-opacity-30">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Use Technical Batch Setup?
            </h3>
            <p className="mb-4 text-gray-700">
              A Technical batch setup already exists. Do you want to use it for
              Soft skills (hours will be updated)?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => handleReuseDecision(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                No, create new
              </button>
              <button
                onClick={() => handleReuseDecision(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Yes, use existing
              </button>
            </div>
          </div>
        </div>
      )}

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

                {/* Custom Hours for Selected Phases */}
                {selectedPhases.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Header with Summary */}
                    <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                            <FiClock className="mr-2 text-indigo-600" />
                            Phase Training Hours
                          </h2>
                          <p className="mt-1 text-sm text-gray-600">
                            Distribute training hours across selected phases
                          </p>
                        </div>
                        
                        {/* Total Hours Overview */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-indigo-600">
                            {totalTrainingHours}
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Total Hours
                          </div>
                        </div>
                      </div>
                      
                      {/* Hours Distribution Progress */}
                      <div className="mt-4">
                        {(() => {
                          // Calculate allocated hours for each phase
                          const totalAllocated = selectedPhases.reduce((sum, phase) => {
                            const phaseHours = Number(customPhaseHours[phase]) || getDomainHours("Technical", phase);
                            return sum + phaseHours;
                          }, 0);
                          
                          // Calculate remaining hours (Total - Allocated)
                          const remaining = totalTrainingHours - totalAllocated;
                          const progressPercent = totalTrainingHours > 0 ? Math.min(100, (totalAllocated / totalTrainingHours) * 100) : 0;
                          
                          return (
                            <div>
                              {/* Summary Stats */}
                              <div className="grid grid-cols-3 gap-4 mb-3">
                                <div className="text-center">
                                  <div className="text-lg font-bold text-gray-900">{totalTrainingHours}</div>
                                  <div className="text-xs text-gray-500">Total Hours</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-indigo-600">{totalAllocated}</div>
                                  <div className="text-xs text-gray-500">Allocated</div>
                                </div>
                                <div className="text-center">
                                  <div className={`text-lg font-bold ${
                                    remaining === 0 ? 'text-emerald-600' : 
                                    remaining < 0 ? 'text-red-600' : 'text-amber-600'
                                  }`}>
                                    {remaining}
                                  </div>
                                  <div className="text-xs text-gray-500">Remaining</div>
                                </div>
                              </div>
                              
                              {/* Calculation Display */}
                              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                <div className="text-xs text-gray-600 mb-1">Calculation:</div>
                                <div className="flex items-center justify-center text-sm font-mono">
                                  <span className="text-gray-900">{totalTrainingHours}</span>
                                  <span className="mx-2 text-gray-500">−</span>
                                  <span className="text-indigo-600">{totalAllocated}</span>
                                  <span className="mx-2 text-gray-500">=</span>
                                  <span className={`font-bold ${
                                    remaining === 0 ? 'text-emerald-600' : 
                                    remaining < 0 ? 'text-red-600' : 'text-amber-600'
                                  }`}>
                                    {remaining}
                                  </span>
                                  <span className="ml-1 text-gray-500">hrs</span>
                                </div>
                                <div className="text-xs text-gray-500 text-center mt-1">
                                  (Total Training Hours − Phase Hours = Remaining Hours)
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Hours Distribution</span>
                                <span className={`font-medium ${
                                  remaining === 0 ? 'text-emerald-600' : 
                                  remaining < 0 ? 'text-red-600' : 'text-amber-600'
                                }`}>
                                  {totalAllocated} / {totalTrainingHours} hrs
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                  className={`h-3 rounded-full transition-all duration-300 ${
                                    progressPercent === 100 ? 'bg-emerald-500' :
                                    progressPercent > 100 ? 'bg-red-500' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                                />
                              </div>
                              <div className={`text-xs mt-2 font-medium ${
                                remaining === 0 ? 'text-emerald-600' : 
                                remaining < 0 ? 'text-red-600' : 'text-amber-600'
                              }`}>
                                {remaining === 0 ? '✅ Perfect! All hours allocated' :
                                 remaining < 0 ? `⚠️ Over-allocated by ${Math.abs(remaining)} hours` :
                                 `📝 ${remaining} hours still available for allocation`}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Phase Hours Configuration */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {selectedPhases.map((phase) => {
                          const phaseOrder = ["phase-1", "phase-2", "phase-3"];
                          const phaseIndex = phaseOrder.indexOf(phase);
                          
                          // Calculate total allocated by previous phases
                          const previousPhasesTotal = phaseOrder.slice(0, phaseIndex).reduce((sum, prevPhase) => {
                            if (selectedPhases.includes(prevPhase)) {
                              return sum + (Number(customPhaseHours[prevPhase]) || getDomainHours("Technical", prevPhase));
                            }
                            return sum;
                          }, 0);
                          
                          // Available hours for this phase = Total - Previous phases
                          const availableForThisPhase = totalTrainingHours - previousPhasesTotal;
                          
                          const currentValue = customPhaseHours[phase] || "";
                          const defaultValue = getDomainHours("Technical", phase);
                          const actualValue = currentValue !== "" ? Number(currentValue) : defaultValue;
                          
                          // Remaining after this phase allocation
                          const remainingAfterThisPhase = availableForThisPhase - actualValue;
                          
                          return (
                            <div key={phase} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-indigo-300 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                    phaseIndex === 0 ? 'bg-blue-100 text-blue-700' :
                                    phaseIndex === 1 ? 'bg-purple-100 text-purple-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {phaseIndex + 1}
                                  </div>
                                  <div className="ml-3">
                                    <label className="block text-sm font-semibold text-gray-800">
                                      {phase.replace("-", " ").toUpperCase()}
                                    </label>
                                    <div className="text-xs text-gray-500">
                                      Default: {defaultValue} hrs
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-lg font-bold ${
                                    actualValue > availableForThisPhase ? 'text-red-600' : 'text-gray-700'
                                  }`}>
                                    {actualValue}
                                  </div>
                                  <div className="text-xs text-gray-500">hours</div>
                                </div>
                              </div>
                              
                              {/* Hours Calculation for this phase */}
                              <div className="bg-white rounded p-3 mb-3 border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">Available for this phase:</div>
                                <div className="flex items-center justify-center text-xs font-mono mb-2">
                                  <span className="text-gray-900">{totalTrainingHours}</span>
                                  <span className="mx-1 text-gray-500">−</span>
                                  <span className="text-gray-600">{previousPhasesTotal}</span>
                                  <span className="mx-1 text-gray-500">=</span>
                                  <span className="font-bold text-indigo-600">{availableForThisPhase}</span>
                                  <span className="ml-1 text-gray-500">hrs</span>
                                </div>
                                {previousPhasesTotal > 0 && (
                                  <div className="text-xs text-gray-500 text-center">
                                    (Total − Previous phases = Available)
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-3">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    max={availableForThisPhase}
                                    value={currentValue}
                                    onChange={(e) =>
                                      setCustomPhaseHours((prev) => ({
                                        ...prev,
                                        [phase]: e.target.value,
                                      }))
                                    }
                                    placeholder={`Default: ${defaultValue}`}
                                    className={`w-full px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                                      actualValue > availableForThisPhase 
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50' 
                                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white'
                                    }`}
                                  />
                                  <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">hrs</span>
                                </div>
                                
                                {/* Available vs Allocated */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500">Available for this phase:</span>
                                  <span className={`font-semibold ${
                                    availableForThisPhase < actualValue ? 'text-red-600' : 'text-emerald-600'
                                  }`}>
                                    {availableForThisPhase} hrs
                                  </span>
                                </div>
                                
                                {/* Remaining after this phase */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500">After this phase:</span>
                                  <span className={`font-semibold ${
                                    remainingAfterThisPhase < 0 ? 'text-red-600' : 'text-blue-600'
                                  }`}>
                                    {remainingAfterThisPhase} hrs remaining
                                  </span>
                                </div>
                                
                                {/* Warning if over-allocated */}
                                {actualValue > availableForThisPhase && (
                                  <div className="flex items-center text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                    <FiAlertCircle className="mr-1 flex-shrink-0" />
                                    <span>Exceeds available hours by {actualValue - availableForThisPhase}</span>
                                  </div>
                                )}
                                
                                {/* Quick Actions */}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setCustomPhaseHours((prev) => ({
                                      ...prev,
                                      [phase]: Math.min(defaultValue, availableForThisPhase).toString(),
                                    }))}
                                    className="flex-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
                                  >
                                    Use Default
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCustomPhaseHours((prev) => ({
                                      ...prev,
                                      [phase]: availableForThisPhase.toString(),
                                    }))}
                                    className="flex-1 px-2 py-1 text-xs bg-indigo-50 border border-indigo-200 rounded text-indigo-600 hover:bg-indigo-100 transition-colors"
                                  >
                                    Use All
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCustomPhaseHours((prev) => ({
                                      ...prev,
                                      [phase]: "",
                                    }))}
                                    className="flex-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Summary at bottom */}
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <FiCheck className="w-4 h-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-900">Quick Tips</h3>
                            <div className="mt-1 text-sm text-blue-700">
                              <ul className="list-disc list-inside space-y-1">
                                <li>Leave fields empty to use default database hours</li>
                                <li>Ensure total allocated hours don't exceed {totalTrainingHours} hours</li>
                                <li>Phase 2 and Phase 3 can be configured separately in later steps</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                    
                    {selectedPhases.length > 1 && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Phase to Configure
                          </label>
                          <div className="max-w-md">
                            <select
                              value={currentPhase}
                              onChange={(e) => setCurrentPhase(e.target.value)}
                              className="w-full px-4 py-3 text-base rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                            >
                              {selectedPhases.map((phase) => (
                                <option key={phase} value={phase}>
                                  {phase.replace("-", " ").toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                    
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
    </>
  );
}

export default InitiationModal;
