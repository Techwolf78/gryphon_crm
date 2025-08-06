import React, { useState, useEffect } from "react";
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
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [topics, setTopics] = useState([]);
  const [courses, setCourses] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
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

  const [totalTrainingHours, setTotalTrainingHours] = useState(0);

  const [table1Data, setTable1Data] = useState([]);
  const [showReusePrompt, setShowReusePrompt] = useState(false);
  const [reuseBatchData, setReuseBatchData] = useState(null);
  const [canMergeBatches, setCanMergeBatches] = useState(false);
  const [hasRejectedReuse, setHasRejectedReuse] = useState(false);

  // Helper function to calculate total assigned students
  const getTotalAssignedStudents = (row) => {
    if (!row?.batches) return 0;
    return row.batches.reduce((total, batch) => {
      return total + (Number(batch.batchPerStdCount) || 0);
    }, 0);
  };

  // Get domain hours
  const getDomainHours = (domain) => {
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
  };

  // --- Dynamic Remaining Hours Calculation ---
  const getMainPhase = () => {
    if (selectedPhases.includes("phase-1")) return "phase-1";
    if (selectedPhases.includes("phase-2")) return "phase-2";
    if (selectedPhases.includes("phase-3")) return "phase-3";
    return null;
  };

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
      const domainHours = getDomainHours(selectedDomain);
      const rows = courses.map((course) => ({
        batch: course.specialization,
        stdCount: course.students,
        hrs: domainHours,
        assignedHours: domainHours,
        batches: [
          {
            batchPerStdCount: "",
            batchCode: `${course.specialization}1`,
            assignedHours: domainHours,
            trainers: [],
          },
        ],
      }));
      setTable1Data(rows);
      // Set assigned hours for main phase
      setPhaseHours((prev) => ({
        ...prev,
        [getMainPhase()]: domainHours,
      }));
    }
  }, [selectedDomain, courses, topics]);

  // Update this function to accept phase as argument
  const handleAssignedHoursChange = (hours, phase) => {
    setPhaseHours((prev) => ({
      ...prev,
      [phase]: Number(hours),
    }));
  };

  const handlePhaseChange = (phase) => {
    setSelectedPhases((prev) =>
      prev.includes(phase) ? prev.filter((p) => p !== phase) : [...prev, phase]
    );
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
          details,
          createdAt: serverTimestamp(),
          createdBy: training.createdBy || {},
          ...commonFields,
        };

        // Only save domain and batch assignment for the main phase
        if (phase === mainPhase) {
          phaseData = {
            ...phaseData,
            domain: selectedDomain,
            domainHours: getDomainHours(selectedDomain),
            table1Data: table1DataToSave,
            assignedHours: phaseHours[mainPhase],
          };
        }

        // Save only dates for other phases
        if (phase === "phase-2" && phase !== mainPhase) {
          phaseData = {
            ...phaseData,
            phase2Dates,
            assignedHours: phaseHours["phase-2"],
          };
        }
        if (phase === "phase-3" && phase !== mainPhase) {
          phaseData = {
            ...phaseData,
            phase3Dates,
            assignedHours: phaseHours["phase-3"],
          };
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

  const getStepTitle = (step) => {
    switch (step) {
      case 1:
        return "Training Details";
      case 2:
        return "Batch & Trainer Assignment";
      default:
        return "Setup";
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
      // Only import batch assignments, set assigned hours to Soft Skills, and clear trainers
      const softSkillsHours = getDomainHours("Soft skills");
      const updated = reuseBatchData.map((row) => ({
        ...row,
        hrs: softSkillsHours,
        assignedHours: softSkillsHours,
        batches: (row.batches || []).map((batch) => ({
          ...batch,
          assignedHours: softSkillsHours,
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
      trainingsSnap.forEach((docSnap) => {
        if (docSnap.exists()) {
          phases.push(docSnap.id);
        }
      });
      setSelectedPhases(phases);
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

      <div className="w-full max-w-6xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden flex flex-col my-8">
        {/* Modal Header */}
        <div className="bg-white border-b border-gray-100 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Initiate Training
              </h2>
              <p className="text-gray-500 mt-1">
                {training?.collegeName} • {training?.collegeCode}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors p-1 -mr-1"
              disabled={loading}
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-8">
            <div className="flex items-center justify-between relative">
              {[1, 2].map((step) => (
                <div key={step} className="flex flex-col items-center z-10">
                  <button
                    type="button"
                    onClick={() => currentStep > step && setCurrentStep(step)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors
                      ${
                        currentStep > step
                          ? "bg-green-100 text-green-600"
                          : currentStep === step
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-400"
                      }
                    `}
                    disabled={currentStep <= step}
                  >
                    {currentStep > step ? <FiCheck /> : step}
                  </button>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      currentStep >= step ? "text-gray-700" : "text-gray-400"
                    }`}
                  >
                    {getStepTitle(step)}
                  </span>
                </div>
              ))}
              <div className="absolute top-5 left-10 right-10 h-1 bg-gray-200">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 ease-in-out"
                  style={{ width: `${(currentStep - 1) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Phase Selection + Common Details */}
            {currentStep === 1 && (
              <div className="space-y-8">
                {/* Phase Selection */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Select Training Phases
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PHASE_OPTIONS.map((phase) => (
                      <div
                        key={phase}
                        onClick={() => handlePhaseChange(phase)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all
                          ${
                            selectedPhases.includes(phase)
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                              : "border-gray-200 hover:border-gray-300"
                          }
                        `}
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3
                            ${
                              selectedPhases.includes(phase)
                                ? "bg-blue-500 border-blue-500"
                                : "bg-white border-gray-300"
                            }
                          `}
                          >
                            {selectedPhases.includes(phase) && (
                              <FiCheck className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="font-medium text-gray-800 capitalize">
                            {phase.replace("-", " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Common Details */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Training Configuration
                  </h3>
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
              </div>
            )}

            {/* Step 2: Training Domain + Batch Details */}
            {currentStep === 2 && (
              <>
                {getMainPhase() && (
                  <>
                    {/* Always show domain selection for main phase */}
                    <div className="mb-8">
                      <label className="block text-lg font-medium text-gray-900 mb-2">
                        Training Domain
                      </label>
                      <select
                        value={selectedDomain}
                        onChange={(e) => setSelectedDomain(e.target.value)}
                        className="w-full max-w-xs rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select a domain</option>
                        {DOMAIN_OPTIONS.map((domain) => (
                          <option key={domain} value={domain}>
                            {domain}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedPhases.length > 1 && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Phase to Configure
                        </label>
                        <select
                          value={currentPhase}
                          onChange={(e) => setCurrentPhase(e.target.value)}
                          className="w-full max-w-xs rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        >
                          {selectedPhases.map((phase) => (
                            <option key={phase} value={phase}>
                              {phase.replace("-", " ").toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <BatchDetailsTable
                      table1Data={table1Data}
                      setTable1Data={setTable1Data}
                      selectedDomain={selectedDomain}
                      topics={topics}
                      courses={courses}
                      getDomainHours={getDomainHours}
                      commonFields={commonFields}
                      canMergeBatches={canMergeBatches}
                      mainPhase={currentPhase}
                      maxAssignableHours={getRemainingHours(currentPhase)}
                      onAssignedHoursChange={(hours) => handleAssignedHoursChange(hours, currentPhase)}
                      onSwapTrainer={swapTrainers} // <-- Pass swap function
                    />
                  </>
                )}
              </>
            )}

            {/* Status Messages */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
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
              <div className="rounded-md bg-green-50 p-4">
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

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                currentStep > 1
                  ? setCurrentStep((prev) => prev - 1)
                  : onClose()
              }
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              {currentStep > 1 ? "Back" : "Cancel"}
            </button>
            <div className="flex items-center space-x-3">
              {currentStep < 2 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  disabled={!canProceedToNextStep() || loading}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    ${
                      !canProceedToNextStep()
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }
                  `}
                >
                  Next
                  <FiChevronRight className="ml-2 -mr-1 w-5 h-5" />
                </button>
              )}
              {currentStep === 2 && (
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !canProceedToNextStep()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
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
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default InitiationModal;
