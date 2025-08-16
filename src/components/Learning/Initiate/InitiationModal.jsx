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
import BatchDetailsTable from "./BatchDetailsTable";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const PHASE_OPTIONS = ["phase-1", "phase-2", "phase-3"];
const DOMAIN_OPTIONS = ["Technical", "Soft skills", "Aptitude", "Tools"];

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
  const [canMergeBatches, setCanMergeBatches] = useState(false);

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

  const getRemainingHours = (phase) => {
    const phaseOrder = ["phase-1", "phase-2", "phase-3"];
    const idx = phaseOrder.indexOf(phase);
    let used = 0;
    for (let i = 0; i < idx; i++) {
      used += Number(phaseHours[phaseOrder[i]] || 0);
    }
    return Math.max(0, totalTrainingHours - used);
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
    if (
      selectedDomain &&
      courses.length > 0 &&
      table1Data.length === 0 // Only generate if not already filled
    ) {
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
  }, [selectedDomain, courses, topics, customPhaseHours, getDomainHours, getMainPhase, table1Data.length]);

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
    setError(null);
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

  useEffect(() => {
    console.log("Updated trainingStartDate in state:", commonFields.trainingStartDate);
    console.log("Updated trainingEndDate in state:", commonFields.trainingEndDate);
  }, [commonFields.trainingStartDate, commonFields.trainingEndDate]);

  useEffect(() => {
    // Only run if training and currentPhase are set
    if (!training?.id || !currentPhase) return;

    const fetchPhaseData = async () => {
      const docRef = doc(db, "trainingForms", training.id, "trainings", currentPhase);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Auto-select domain if present and not already selected
        if (data.domain && !selectedDomain) setSelectedDomain(data.domain);
        // Pre-fill batch/trainer table if present and not already filled
        if (data.table1Data && data.table1Data.length > 0 && table1Data.length === 0) {
          // Deep convert all activeDates to Date objects
          const converted = data.table1Data.map(row => ({
            ...row,
            batches: row.batches.map(batch => ({
              ...batch,
              trainers: (batch.trainers || []).map(trainer => ({
                ...trainer,
                activeDates: (trainer.activeDates || []).map(d =>
                  typeof d === "string" ? new Date(d) : d
                ),
              })),
            })),
          }));
          setTable1Data(converted);
        }
      }
    };
    fetchPhaseData();
    // Only run when training, currentPhase, selectedDomain, or table1Data change
    // (prevents overwriting user changes)
    // eslint-disable-next-line
  }, [training?.id, currentPhase]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Page Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex justify-between items-start">
              <div>
                <button
                  onClick={onClose}
                  className="mb-1 flex items-center text-blue-600 hover:text-blue-800 transition-colors text-xs"
                  disabled={loading}
                >
                  <FiChevronLeft className="w-3 h-3 mr-1" />
                  Back to Training List
                </button>
                <h1 className="text-lg font-bold text-gray-900">
                  Initiate Training
                </h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  {training?.collegeName} • {training?.collegeCode}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto py-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Page Content */}
            <div className="p-3">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Phase Selection */}
                <div className="space-y-3">
                  <div className="pb-2 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">
                      Select Training Phases
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Choose which phases you want to initiate for this training program.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {/* Left: Phase Selection */}
                    <div>
                      <div className="flex flex-row space-x-2">
                        {PHASE_OPTIONS.map((phase) => (
                          <div
                            key={phase}
                            onClick={() => handlePhaseChange(phase)}
                            className={`flex items-center px-2 py-1.5 rounded border cursor-pointer text-xs font-medium transition-all
                              ${selectedPhases.includes(phase)
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-200 bg-white hover:border-gray-300"}
                            `}
                            style={{ maxWidth: 120 }}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-2
                                ${selectedPhases.includes(phase)
                                  ? "bg-blue-500 border-blue-500"
                                  : "bg-white border-gray-300"}
                            `}
                            >
                              {selectedPhases.includes(phase) && (
                                <FiCheck className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="capitalize">{phase.replace("-", " ")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Right: Start/End Date */}
                    <div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">
                            Start Date
                          </label>
                          <DatePicker
                            selected={
                              commonFields.trainingStartDate
                                ? new Date(commonFields.trainingStartDate + "T00:00:00")
                                : null
                            }
                            onChange={(date) => {
                              setCommonFields({
                                ...commonFields,
                                trainingStartDate: date
                                  ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                  : "",
                              });
                            }}
                            dateFormat="yyyy-MM-dd"
                            placeholderText="Select date"
                            className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">
                            End Date
                          </label>
                          <DatePicker
                            selected={
                              commonFields.trainingEndDate
                                ? new Date(commonFields.trainingEndDate + "T00:00:00")
                                : null
                            }
                            onChange={(date) => {
                              setCommonFields({
                                ...commonFields,
                                trainingEndDate: date
                                  ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                  : "",
                              });
                            }}
                            dateFormat="yyyy-MM-dd"
                            placeholderText="Select date"
                            className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Training Configuration */}
                <div className="space-y-3">
                  <div className="pb-2 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">
                      Training Configuration
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Set up the basic timing and schedule configuration for the training.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        College Start Time
                      </label>
                      <DatePicker
                        selected={
                          commonFields.collegeStartTime
                            ? new Date(`1970-01-01T${commonFields.collegeStartTime}`)
                            : null
                        }
                        onChange={(date) =>
                          setCommonFields({
                            ...commonFields,
                            collegeStartTime: date ? date.toTimeString().slice(0, 5) : "",
                          })
                        }
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="Select time"
                        className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        College End Time
                      </label>
                      <DatePicker
                        selected={
                          commonFields.collegeEndTime
                            ? new Date(`1970-01-01T${commonFields.collegeEndTime}`)
                            : null
                        }
                        onChange={(date) =>
                          setCommonFields({
                            ...commonFields,
                            collegeEndTime: date ? date.toTimeString().slice(0, 5) : "",
                          })
                        }
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="Select time"
                        className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Lunch Start Time
                      </label>
                      <DatePicker
                        selected={
                          commonFields.lunchStartTime
                            ? new Date(`1970-01-01T${commonFields.lunchStartTime}`)
                            : null
                        }
                        onChange={(date) =>
                          setCommonFields({
                            ...commonFields,
                            lunchStartTime: date ? date.toTimeString().slice(0, 5) : "",
                          })
                        }
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="Select time"
                        className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Lunch End Time
                      </label>
                      <DatePicker
                        selected={
                          commonFields.lunchEndTime
                            ? new Date(`1970-01-01T${commonFields.lunchEndTime}`)
                            : null
                        }
                        onChange={(date) =>
                          setCommonFields({
                            ...commonFields,
                            lunchEndTime: date ? date.toTimeString().slice(0, 5) : "",
                          })
                        }
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="Select time"
                        className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                      />
                    </div>
                  </div>

                  {/* Phase 2 Dates */}
                  {selectedPhases.includes("phase-2") &&
                    selectedPhases.length > 1 &&
                    getMainPhase() !== "phase-2" && (
                      <div className="space-y-2 pt-2 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900">
                          Phase 2 Dates
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                              className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                              className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Phase 3 Dates */}
                  {selectedPhases.includes("phase-3") &&
                    selectedPhases.length > 1 &&
                    getMainPhase() !== "phase-3" && (
                      <div className="space-y-2 pt-2 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900">
                          Phase 3 Dates
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                              className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                              className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
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
                    <div className="space-y-3">
                      <div className="pb-2 border-b border-gray-200">
                        <h2 className="text-base font-semibold text-gray-900">
                          Training Domain
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Select the domain for this training program.
                        </p>
                      </div>
                      <div className="max-w-xs">
                        <select
                          value={selectedDomain}
                          onChange={(e) => {
                            const domain = e.target.value;
                            setSelectedDomain(domain);
                            if (!domain) {
                              setTable1Data([]);
                            }
                          }}
                          className="w-full px-2 py-1 text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
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
                    <div className="space-y-3">
                      <div className="pb-2 border-b border-gray-200">
                        <h2 className="text-base font-semibold text-gray-900">
                          Batch & Trainer Assignment
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500">
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
                  <div className="rounded bg-red-50 border border-red-200 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <FiAlertCircle className="h-4 w-4 text-red-400" />
                      </div>
                      <div className="ml-2">
                        <h3 className="text-xs font-medium text-red-800">
                          {error}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="rounded bg-green-50 border border-green-200 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <FiCheck className="h-4 w-4 text-green-400" />
                      </div>
                      <div className="ml-2">
                        <h3 className="text-xs font-medium text-green-800">
                          {success}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Page Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 rounded-b-lg">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !canProceedToNextStep()}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
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
