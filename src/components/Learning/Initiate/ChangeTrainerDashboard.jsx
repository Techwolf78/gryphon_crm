import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../../firebase";
import {
  FiX,
  FiCalendar,
  FiUser,
  FiClock,
  FiDollarSign,
  FiAlertTriangle,
  FiCheck,
  FiRefreshCw,
} from "react-icons/fi";

const ChangeTrainerDashboard = ({
  isOpen,
  onClose,
  selectedTraining: preSelectedTraining,
}) => {
  const [step, setStep] = useState(1); // 1: Select Training, 2: Select Trainer, 3: Change Details, 4: Confirmation
  const [loading, setLoading] = useState(false);
  const [trainings, setTrainings] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [selectedCurrentTrainer, setSelectedCurrentTrainer] = useState(null);
  const [selectedNewTrainer, setSelectedNewTrainer] = useState("");
  const [changeStartDate, setChangeStartDate] = useState("");
  const [changeEndDate, setChangeEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [newTrainerCost, setNewTrainerCost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [globalTrainerAssignments, setGlobalTrainerAssignments] = useState([]);

  // Debug log to check if modal is opening
  useEffect(() => {
    console.log("🔍 [CHANGE TRAINER MODAL] Modal state:", {
      isOpen,
      preSelectedTraining,
      step,
      selectedTraining,
    });
  }, [isOpen, preSelectedTraining, step, selectedTraining]);

  // Fetch all in-progress trainings
  const fetchInProgressTrainings = async () => {
    setLoading(true);
    try {
      console.log("🔄 [CHANGE TRAINER] Fetching in-progress trainings...");
      const formsSnap = await getDocs(collection(db, "trainingForms"));
      const inProgressTrainings = [];

      for (const formDoc of formsSnap.docs) {
        const formData = formDoc.data();
        const phasesSnap = await getDocs(
          collection(db, "trainingForms", formDoc.id, "trainings")
        );

        for (const phaseDoc of phasesSnap.docs) {
          const phaseData = phaseDoc.data();

          // Only include trainings that are in progress
          if (phaseData.trainingStartDate && phaseData.trainingEndDate) {
            const today = new Date();
            const startDate = new Date(phaseData.trainingStartDate);
            const endDate = new Date(phaseData.trainingEndDate);

            today.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            // Check if training is currently in progress
            if (today >= startDate && today <= endDate) {
              // Get domain data with trainers
              const domainsSnap = await getDocs(
                collection(
                  db,
                  "trainingForms",
                  formDoc.id,
                  "trainings",
                  phaseDoc.id,
                  "domains"
                )
              );

              const domainsWithTrainers = [];
              domainsSnap.forEach((domainDoc) => {
                const domainData = domainDoc.data();
                if (domainData.table1Data && domainData.table1Data.length > 0) {
                  domainsWithTrainers.push({
                    domainId: domainDoc.id,
                    domainName: domainData.domain || domainDoc.id,
                    table1Data: domainData.table1Data,
                  });
                }
              });

              if (domainsWithTrainers.length > 0) {
                inProgressTrainings.push({
                  id: `${formDoc.id}_${phaseDoc.id}`,
                  formId: formDoc.id,
                  phaseId: phaseDoc.id,
                  collegeName: formData.collegeName,
                  collegeCode: formData.collegeCode,
                  phaseData,
                  domains: domainsWithTrainers,
                });
              }
            }
          }
        }
      }

      console.log("✅ [CHANGE TRAINER] Found trainings:", inProgressTrainings);
      setTrainings(inProgressTrainings);
    } catch (error) {
      console.error("❌ [CHANGE TRAINER] Error fetching trainings:", error);
    }
    setLoading(false);
  };

  // Fetch available trainers
  const fetchTrainers = async () => {
    try {
      const trainersSnap = await getDocs(collection(db, "trainers"));
      const trainersList = [];
      trainersSnap.forEach((doc) => {
        trainersList.push({ id: doc.id, ...doc.data() });
      });
      setTrainers(trainersList);
    } catch (error) {
      console.error("Error fetching trainers:", error);
    }
  };

  // Fetch domains for a specific training
  const fetchTrainingDomains = async (formId, phaseId, training) => {
    setLoadingDomains(true);
    try {
      console.log("🔄 [FETCH DOMAINS] Fetching domains for:", {
        formId,
        phaseId,
      });

      const domainsSnap = await getDocs(
        collection(db, "trainingForms", formId, "trainings", phaseId, "domains")
      );

      console.log(
        "🔍 [FETCH DOMAINS] Domains snapshot size:",
        domainsSnap.size
      );

      const domainsWithTrainers = [];
      domainsSnap.forEach((domainDoc) => {
        const domainData = domainDoc.data();
        console.log(
          "🔍 [FETCH DOMAINS] Domain data:",
          domainDoc.id,
          domainData
        );

        if (domainData.table1Data && domainData.table1Data.length > 0) {
          console.log(
            "✅ [FETCH DOMAINS] Found table1Data for domain:",
            domainDoc.id
          );
          domainsWithTrainers.push({
            domainId: domainDoc.id,
            domainName: domainData.domain || domainDoc.id,
            table1Data: domainData.table1Data,
          });
        } else {
          console.log(
            "❌ [FETCH DOMAINS] No table1Data for domain:",
            domainDoc.id
          );
        }
      });

      console.log(
        "✅ [FETCH DOMAINS] Final domains with trainers:",
        domainsWithTrainers
      );

      const updatedTraining = { ...training, domains: domainsWithTrainers };
      setSelectedTraining(updatedTraining);

      console.log("✅ [FETCH DOMAINS] Updated training:", updatedTraining);
    } catch (error) {
      console.error(
        "❌ [FETCH DOMAINS] Error fetching training domains:",
        error
      );
    }
    setLoadingDomains(false);
  };

  useEffect(() => {
    if (isOpen) {
      // If a training is preselected from dashboard, use it directly
      if (preSelectedTraining) {
        // Convert dashboard training format to modal format
        const convertedTraining = {
          id: `${preSelectedTraining.trainingId}_${preSelectedTraining.phaseId}`,
          formId: preSelectedTraining.trainingId,
          phaseId: preSelectedTraining.phaseId,
          collegeName: preSelectedTraining.collegeName,
          collegeCode: preSelectedTraining.collegeCode,
          phaseData: {
            trainingStartDate: preSelectedTraining.trainingStartDate,
            trainingEndDate: preSelectedTraining.trainingEndDate,
            collegeStartTime: preSelectedTraining.collegeStartTime,
            collegeEndTime: preSelectedTraining.collegeEndTime,
            lunchStartTime: preSelectedTraining.lunchStartTime,
            lunchEndTime: preSelectedTraining.lunchEndTime,
          },
          domains: [], // Will be fetched
        };

        setSelectedTraining(convertedTraining);
        setStep(2); // Skip training selection step
        fetchTrainingDomains(
          preSelectedTraining.trainingId,
          preSelectedTraining.phaseId,
          convertedTraining
        );
      } else {
        // Fetch all in-progress trainings
        fetchInProgressTrainings();
      }

      fetchTrainers();
      // Set default change start/end date to tomorrow and tomorrow+1
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setChangeStartDate(tomorrow.toISOString().slice(0, 10));
      setChangeEndDate(tomorrow.toISOString().slice(0, 10));
    }
  }, [isOpen, preSelectedTraining]);

  // Listen to centralized trainerAssignments to detect external conflicts
  useEffect(() => {
    if (!isOpen) return;
    const col = collection(db, "trainerAssignments");
    const unsub = onSnapshot(col, (snap) => {
      const arr = [];
      snap.forEach((d) => {
        arr.push({ id: d.id, ...d.data() });
      });
      setGlobalTrainerAssignments(arr);
    });
    return () => unsub();
  }, [isOpen]);

  // Auto-populate new trainer cost when user selects a trainer (unless user overrides)
  useEffect(() => {
    if (!selectedNewTrainer) return;
    const info = trainers.find((t) => t.id === selectedNewTrainer);
    if (!info) return;
    // Only set if empty so user's manual override isn't overwritten
    if (!newTrainerCost) {
      setNewTrainerCost(info.charges ? String(info.charges) : "");
    }
  }, [selectedNewTrainer, trainers, newTrainerCost]);

  // Add debug logging to the getActiveTrainers function around line 185


  // Get all active trainers from selected training
  const getActiveTrainers = () => {
    if (!selectedTraining) {
      return [];
    }
    const activeTrainers = [];
    selectedTraining.domains.forEach((domain) => {
      domain.table1Data.forEach((row, rowIdx) => {
        row.batches?.forEach((batch, batchIdx) => {
          batch.trainers?.forEach((trainer, trainerIdx) => {
            if (
              !trainer.isReplaced &&
              trainer.trainerId &&
              trainer.trainerName
            ) {
              activeTrainers.push({
                ...trainer,
                domainName: domain.domainName,
                batchCode: batch.batchCode,
                specialization: row.batch,
                indices: {
                  domainId: domain.domainId,
                  rowIdx,
                  batchIdx,
                  trainerIdx,
                },
              });
            }
          });
        });
      });
    });
    return activeTrainers;
  };

  // Get all trainer IDs already booked (assigned and not replaced) in the selected training, overlapping with the replacement period
  const getBookedTrainerIds = () => {
    if (!selectedTraining || !changeStartDate || !changeEndDate) return [];
    const bookedIds = new Set();
    const changeStart = new Date(changeStartDate);
    const changeEnd = new Date(changeEndDate);
    selectedTraining.domains.forEach((domain) => {
      domain.table1Data.forEach((row) => {
        row.batches?.forEach((batch) => {
          batch.trainers?.forEach((trainer) => {
            if (!trainer.isReplaced && trainer.trainerId && trainer.trainerName) {
              // Check for date overlap
              const tStart = new Date(trainer.startDate);
              const tEnd = new Date(trainer.endDate);
              if (
                (tStart <= changeEnd && tEnd >= changeStart)
              ) {
                bookedIds.add(trainer.trainerId);
              }
            }
          });
        });
      });
    });
    return Array.from(bookedIds);
  };

  // Utility to remove undefined fields from an object (shallow)
  const removeUndefinedFields = (obj) => {
    const clean = {};
    Object.keys(obj).forEach((k) => {
      if (obj[k] !== undefined) clean[k] = obj[k];
    });
    return clean;
  };

  // Handle trainer change submission
  const handleChangeTrainer = async () => {
    if (
      !selectedCurrentTrainer ||
      !selectedNewTrainer ||
      !changeStartDate ||
      !changeEndDate ||
      !reason
    ) {
      alert("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const { domainId, rowIdx, batchIdx, trainerIdx } =
        selectedCurrentTrainer.indices;

      // Get the domain document
      const domainDocRef = doc(
        db,
        "trainingForms",
        selectedTraining.formId,
        "trainings",
        selectedTraining.phaseId,
        "domains",
        domainId
      );

      const domainDoc = await getDoc(domainDocRef);
      const domainData = domainDoc.data();
      const table1Data = [...domainData.table1Data];

      const currentTrainer =
        table1Data[rowIdx].batches[batchIdx].trainers[trainerIdx];

      // Dates
      const startDateObj = new Date(selectedCurrentTrainer.startDate);
      const endDateObj = new Date(selectedCurrentTrainer.endDate);
      const changeStartObj = new Date(changeStartDate);
      const changeEndObj = new Date(changeEndDate);

      // Helper for date string
      const toDateStr = (d) => d.toISOString().slice(0, 10);

      // Prepare new trainers array (remove current, add splits)
      let newTrainersArr = [];

      // Compute per-day hours for slot once and reuse
      const perDayHours = getTrainingHoursPerDay(selectedTraining.phaseData);
      const computePerDayHoursForSlot = (slot) => {
        if (slot === "AM & PM") return perDayHours;
        if (slot === "AM" || slot === "PM") return +(perDayHours / 2).toFixed(2);
        return 0;
      };
      const currentPerDayHours = computePerDayHoursForSlot(
        currentTrainer.dayDuration
      );

      // 1. Old trainer before replacement period
      if (changeStartObj > startDateObj) {
        const beforeEnd = new Date(changeStartObj);
        beforeEnd.setDate(beforeEnd.getDate() - 1);
        const beforeActiveDates = getDateListExcludingSundays(
          selectedCurrentTrainer.startDate,
          toDateStr(beforeEnd)
        );
        newTrainersArr.push(
          removeUndefinedFields({
            ...currentTrainer,
            endDate: toDateStr(beforeEnd),
            isReplaced: true,
            replacedOn: changeStartDate,
            replacedBy: selectedNewTrainer,
            replacementReason: reason,
            activeDates: beforeActiveDates,
            dailyHours: beforeActiveDates.map(() => currentPerDayHours),
            assignedHours: beforeActiveDates.length * currentPerDayHours,
          })
        );
      }

      // 2. New trainer for replacement period
      const newActiveDates = getDateListExcludingSundays(
        changeStartDate,
        changeEndDate
      );
      const newTrainerInfo = trainers.find((t) => t.id === selectedNewTrainer);

      newTrainersArr.push(
        removeUndefinedFields({
          trainerId: selectedNewTrainer,
          trainerName: newTrainerInfo?.name || newTrainerInfo?.displayName || "",
          dayDuration: currentTrainer.dayDuration,
          startDate: changeStartDate,
          endDate: changeEndDate,
          perHourCost:
            Number(newTrainerCost) || Number(newTrainerInfo?.charges) || Number(currentTrainer.perHourCost) || 0,
          activeDates: newActiveDates,
          dailyHours: newActiveDates.map(() => currentPerDayHours),
          assignedHours: newActiveDates.length * currentPerDayHours,
          isReplacement: true,
          replacesTrainer: currentTrainer.trainerId,
          replacementStartDate: changeStartDate,
          replacementReason: reason,
        })
      );

      // 3. Old trainer after replacement period
      if (changeEndObj < endDateObj) {
        const afterStart = new Date(changeEndObj);
        afterStart.setDate(afterStart.getDate() + 1);
        const afterActiveDates = getDateListExcludingSundays(
          toDateStr(afterStart),
          selectedCurrentTrainer.endDate
        );
        // Only include fields that are not undefined
        newTrainersArr.push(
          removeUndefinedFields({
            ...currentTrainer,
            startDate: toDateStr(afterStart),
            endDate: selectedCurrentTrainer.endDate,
            isReplaced: false,
            // Only add replacedOn, replacedBy, replacementReason if not undefined
            activeDates: afterActiveDates,
            dailyHours: afterActiveDates.map(() => currentPerDayHours),
            assignedHours: afterActiveDates.length * currentPerDayHours,
          })
        );
      }

      // Remove the original trainer entry and add the splits
      table1Data[rowIdx].batches[batchIdx].trainers.splice(trainerIdx, 1, ...newTrainersArr);

      // Update the document in Firestore
      await updateDoc(domainDocRef, {
        table1Data: table1Data,
      });

      alert("Trainer changed successfully!");
      handleClose();
    } catch (error) {
      console.error("Error changing trainer:", error);
      alert("Error changing trainer. Please try again.");
    }
    setSubmitting(false);
  };

  // Helper functions
  // Return list of ISO date strings (YYYY-MM-DD) excluding Sundays
  const getDateListExcludingSundays = (start, end) => {
    if (!start || !end) return [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
    if (startDate > endDate) return [];
    const dates = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      if (current.getDay() !== 0) {
        dates.push(current.toISOString().slice(0, 10));
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const getTrainingHoursPerDay = (phaseData) => {
    if (
      !phaseData.collegeStartTime ||
      !phaseData.collegeEndTime ||
      !phaseData.lunchStartTime ||
      !phaseData.lunchEndTime
    )
      return 0;

    const toMinutes = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + (m || 0);
    };
    const collegeStart = toMinutes(phaseData.collegeStartTime);
    const collegeEnd = toMinutes(phaseData.collegeEndTime);
    const lunchStart = toMinutes(phaseData.lunchStartTime);
    const lunchEnd = toMinutes(phaseData.lunchEndTime);

    let total = collegeEnd - collegeStart - (lunchEnd - lunchStart);
    return total > 0 ? +(total / 60).toFixed(2) : 0;
  };

  const handleClose = () => {
    // Reset to appropriate step based on whether training is preselected
    setStep(preSelectedTraining ? 2 : 1);
    if (!preSelectedTraining) {
      setSelectedTraining(null);
    }
    setSelectedCurrentTrainer(null);
    setSelectedNewTrainer("");
    setChangeStartDate("");
    setChangeEndDate("");
    setReason("");
    setNewTrainerCost("");
    onClose();
  };

  const validateChangeDateRange = () => {
    if (!selectedCurrentTrainer || !changeStartDate || !changeEndDate) return true;
    const changeStartObj = new Date(changeStartDate);
    const changeEndObj = new Date(changeEndDate);
    const trainerStartObj = new Date(selectedCurrentTrainer.startDate);
    const trainerEndObj = new Date(selectedCurrentTrainer.endDate);
    const trainingEndDate = new Date(selectedTraining.phaseData.trainingEndDate);

    // Start must be >= trainer start, end <= trainer end, start <= end, and both within training period
    return (
      changeStartObj >= trainerStartObj &&
      changeEndObj <= trainerEndObj &&
      changeStartObj <= changeEndObj &&
      changeEndObj <= trainingEndDate
    );
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-54 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Change Trainer
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              {/* Only show step 1 if no training is preselected */}
              {!preSelectedTraining && (
                <>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= 1
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    1
                  </div>
                  <div
                    className={`w-12 h-0.5 ${
                      step > 1 ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                </>
              )}

              {[2, 3, 4].map((stepNum, idx) => (
                <div key={stepNum} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= stepNum
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {preSelectedTraining ? stepNum - 1 : stepNum}
                  </div>
                  {idx < 2 && (
                    <div
                      className={`w-12 h-0.5 ${
                        step > stepNum ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Select Training - Only show if no training is preselected */}
          {step === 1 && !preSelectedTraining && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Select Training Program
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <FiRefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">
                    Loading trainings...
                  </span>
                </div>
              ) : trainings.length === 0 ? (
                <div className="text-center py-8">
                  <FiAlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No In-Progress Trainings Found
                  </h3>
                  <p className="text-gray-600">
                    There are no training programs currently in progress that
                    can have trainer changes.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trainings.map((training) => (
                    <div
                      key={training.id}
                      onClick={() => {
                        setSelectedTraining(training);
                        setStep(2);
                      }}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {training.collegeName} ({training.collegeCode})
                          </h4>
                          <p className="text-sm text-gray-600">
                            Phase {training.phaseId.replace("phase-", "")} •
                            {training.phaseData.trainingStartDate} to{" "}
                            {training.phaseData.trainingEndDate}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {training.domains.length} domain(s) • Active
                            trainers available
                          </p>
                        </div>
                        <FiCalendar className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Current Trainer */}
          {step === 2 && selectedTraining && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Select Current Trainer to Replace
                </h3>
                {!preSelectedTraining && (
                  <button
                    onClick={() => setStep(1)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    ← Back to Training Selection
                  </button>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-blue-900">
                  {selectedTraining.collegeName} ({selectedTraining.collegeCode}
                  )
                </h4>
                <p className="text-sm text-blue-700">
                  Phase {selectedTraining.phaseId.replace("phase-", "")} •
                  {selectedTraining.phaseData.trainingStartDate} to{" "}
                  {selectedTraining.phaseData.trainingEndDate}
                </p>
              </div>

              {loadingDomains ? (
                <div className="flex items-center justify-center py-8">
                  <FiRefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">
                    Loading trainers...
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {getActiveTrainers().length === 0 ? (
                    <div className="text-center py-8">
                      <FiAlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Active Trainers Found
                      </h3>
                      <p className="text-gray-600">
                        There are no active trainers for this training program
                        that can be changed.
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        This could mean:
                        <br />• No trainers have been assigned yet
                        <br />• All trainers are already replaced
                        <br />• Training dates don't match current period
                      </p>
                    </div>
                  ) : (
                    getActiveTrainers().map((trainer, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          console.log(
                            "🔄 [TRAINER SELECTION] Selected trainer:",
                            trainer
                          );
                          setSelectedCurrentTrainer(trainer);
                          setStep(3);
                        }}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {trainer.trainerName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {trainer.domainName} • {trainer.specialization} •{" "}
                              {trainer.batchCode}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {trainer.startDate} to {trainer.endDate} •{" "}
                              {trainer.dayDuration} • ₹{trainer.perHourCost}
                              /hour
                            </p>
                          </div>
                          <FiUser className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Change Details */}
          {step === 3 && selectedCurrentTrainer && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Change Trainer Details
                </h3>
                <button
                  onClick={() => setStep(2)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  ← Back to Trainer Selection
                </button>
              </div>

              {/* Current Trainer Info */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">
                  Current Trainer
                </h4>
                <div className="text-sm text-red-700">
                  <p>
                    <strong>Name:</strong> {selectedCurrentTrainer.trainerName}
                  </p>
                  <p>
                    <strong>Domain:</strong> {selectedCurrentTrainer.domainName}
                  </p>
                  <p>
                    <strong>Batch:</strong> {selectedCurrentTrainer.batchCode}
                  </p>
                  <p>
                    <strong>Period:</strong> {selectedCurrentTrainer.startDate}{" "}
                    to {selectedCurrentTrainer.endDate}
                  </p>
                  <p>
                    <strong>Duration:</strong>{" "}
                    {selectedCurrentTrainer.dayDuration}
                  </p>
                </div>
              </div>

              {/* Change Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiCalendar className="inline w-4 h-4 mr-1" />
                    Change Start Date *
                  </label>
                  <input
                    type="date"
                    value={changeStartDate}
                    onChange={(e) => setChangeStartDate(e.target.value)}
                    min={selectedCurrentTrainer.startDate}
                    max={selectedCurrentTrainer.endDate}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !validateChangeDateRange()
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Original trainer assignment will be split at this date. New
                    trainer will take over from {changeStartDate || "___"}
                  </p>
                  {!validateChangeDateRange() && (
                    <p className="text-xs text-red-600 mt-1">
                      Change start date must be on or after trainer's start date (
                      {selectedCurrentTrainer.startDate}) and end date must be on or before trainer's end date (
                      {selectedCurrentTrainer.endDate}). Start date must be before or equal to end date.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiCalendar className="inline w-4 h-4 mr-1" />
                    Change End Date *
                  </label>
                  <input
                    type="date"
                    value={changeEndDate}
                    onChange={(e) => setChangeEndDate(e.target.value)}
                    min={changeStartDate || selectedCurrentTrainer.startDate}
                    max={selectedCurrentTrainer.endDate}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !validateChangeDateRange()
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiUser className="inline w-4 h-4 mr-1" />
                    New Trainer *
                  </label>
                  <select
                    value={selectedNewTrainer}
                    onChange={(e) => setSelectedNewTrainer(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select new trainer</option>
                    {trainers
                      .filter((t) => {
                        if (t.id === selectedCurrentTrainer.trainerId) return false;
                        const bookedIds = getBookedTrainerIds();
                        if (bookedIds.includes(t.id)) return false;

                        // Check global assignments for overlap/conflict
                        // Build replacement date list (ISO strings)
                        if (!changeStartDate || !changeEndDate) return true;
                        const replacementDates = getDateListExcludingSundays(
                          changeStartDate,
                          changeEndDate
                        );

                        // If any global assignment for this trainer conflicts on any date and slot, exclude
                        for (const assign of globalTrainerAssignments) {
                          if (assign.trainerId !== t.id) continue;
                          // Normalize assignment date to ISO yyyy-mm-dd
                          const assignDate = new Date(assign.date);
                          if (isNaN(assignDate.getTime())) continue;
                          const assignISO = assignDate.toISOString().slice(0, 10);
                          if (replacementDates.includes(assignISO)) {
                            const assignSlot = assign.dayDuration || "AM & PM";
                            const curSlot = selectedCurrentTrainer.dayDuration || "AM & PM";
                            const conflict =
                              assignSlot === "AM & PM" ||
                              curSlot === "AM & PM" ||
                              (assignSlot === curSlot && (assignSlot === "AM" || assignSlot === "PM"));
                            if (conflict) return false;
                          }
                        }

                        return true;
                      })
                      .map((trainer) => {
                        const label = `${trainer.name} (${trainer.id})`;
                        return (
                          <option key={trainer.id} value={trainer.id}>
                            {label}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiDollarSign className="inline w-4 h-4 mr-1" />
                    New Trainer Cost (per hour)
                  </label>
                  <input
                    type="number"
                    value={newTrainerCost}
                    onChange={(e) => setNewTrainerCost(e.target.value)}
                    placeholder="Enter cost or leave empty for default"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiAlertTriangle className="inline w-4 h-4 mr-1" />
                    Reason for Change *
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Trainer sick, Personal emergency, etc."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={
                    !selectedNewTrainer ||
                    !changeStartDate ||
                    !changeEndDate ||
                    !reason ||
                    !validateChangeDateRange()
                  }
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Review Change
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirm Trainer Change
                </h3>
                <button
                  onClick={() => setStep(3)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  ← Back to Edit Details
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <FiAlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-yellow-800">
                      Please confirm this trainer change
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      This action will split the current trainer's assignment
                      and cannot be undone easily.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-3">
                    Current Trainer (Ending)
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Name:</strong>{" "}
                      {selectedCurrentTrainer.trainerName}
                    </p>
                    <p>
                      <strong>Replacement Period:</strong>{" "}
                      {changeStartDate} to {changeEndDate}
                    </p>
                    <p>
                      <strong>Reason:</strong> {reason}
                    </p>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-3">
                    New Trainer (Starting)
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Name:</strong>{" "}
                      {trainers.find((t) => t.id === selectedNewTrainer)?.name}
                    </p>
                    <p>
                      <strong>Start Date:</strong> {changeStartDate}
                    </p>
                    <p>
                      <strong>End Date:</strong> {changeEndDate}
                    </p>
                    <p>
                      <strong>Cost:</strong> ₹
                      {newTrainerCost ||
                        trainers.find((t) => t.id === selectedNewTrainer)
                          ?.charges ||
                        selectedCurrentTrainer.perHourCost}
                      /hour
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleChangeTrainer}
                  disabled={submitting}
                  className="px-6 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {submitting ? (
                    <>
                      <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Changing Trainer...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4 mr-2" />
                      Confirm Change
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangeTrainerDashboard;
