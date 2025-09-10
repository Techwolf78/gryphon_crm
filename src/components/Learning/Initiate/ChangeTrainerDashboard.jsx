import React, { useState, useEffect, useCallback } from "react";
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
  const [step, setStep] = useState(1);
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
  const [autoTrainerBaseCost, setAutoTrainerBaseCost] = useState(null);
  const [manualCostEdited, setManualCostEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [globalTrainerAssignments, setGlobalTrainerAssignments] = useState([]);

  const fetchInProgressTrainings = useCallback(async () => {
    setLoading(true);
    try {
      const formsSnap = await getDocs(collection(db, "trainingForms"));
      const inProgressTrainings = [];

      for (const formDoc of formsSnap.docs) {
        const formData = formDoc.data();
        const phasesSnap = await getDocs(
          collection(db, "trainingForms", formDoc.id, "trainings")
        );

        for (const phaseDoc of phasesSnap.docs) {
          const phaseData = phaseDoc.data();

          if (phaseData.trainingStartDate && phaseData.trainingEndDate) {
            const today = new Date();
            const startDate = parseDate(phaseData.trainingStartDate);
            const endDate = parseDate(phaseData.trainingEndDate);

            today.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            if (today >= startDate && today <= endDate) {
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

      setTrainings(inProgressTrainings);
    } catch {
      // Error fetching trainings
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (preSelectedTraining) {
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
          domains: [],
        };

        setSelectedTraining(convertedTraining);
        setStep(2);
        fetchTrainingDomains(
          preSelectedTraining.trainingId,
          preSelectedTraining.phaseId,
          convertedTraining
        );
      } else {
        fetchInProgressTrainings();
      }

      fetchTrainers();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setChangeStartDate(tomorrow.toISOString().slice(0, 10));
      setChangeEndDate(tomorrow.toISOString().slice(0, 10));
    }
  }, [isOpen, preSelectedTraining, fetchInProgressTrainings]);

  const fetchTrainers = async () => {
    try {
      const trainersSnap = await getDocs(collection(db, "trainers"));
      const trainersList = [];
      trainersSnap.forEach((doc) => {
        trainersList.push({ id: doc.id, ...doc.data() });
      });
      setTrainers(trainersList);
    } catch {
      // Error fetching trainers
    }
  };

  const fetchTrainingDomains = async (formId, phaseId, training) => {
    setLoadingDomains(true);
    try {
      const domainsSnap = await getDocs(
        collection(db, "trainingForms", formId, "trainings", phaseId, "domains")
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

      const updatedTraining = { ...training, domains: domainsWithTrainers };
      setSelectedTraining(updatedTraining);
    } catch {
      // Error fetching training domains
    }
    setLoadingDomains(false);
  };

  useEffect(() => {
    if (isOpen) {
      if (preSelectedTraining) {
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
          domains: [],
        };

        setSelectedTraining(convertedTraining);
        setStep(2);
        fetchTrainingDomains(
          preSelectedTraining.trainingId,
          preSelectedTraining.phaseId,
          convertedTraining
        );
      } else {
        fetchInProgressTrainings();
      }

      fetchTrainers();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setChangeStartDate(tomorrow.toISOString().slice(0, 10));
      setChangeEndDate(tomorrow.toISOString().slice(0, 10));
    }
  }, [isOpen, preSelectedTraining, fetchInProgressTrainings]);

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

  useEffect(() => {
    if (!selectedNewTrainer) {
      setAutoTrainerBaseCost(null);
      if (!manualCostEdited) setNewTrainerCost("");
      return;
    }
    const info = trainers.find((t) => t.id === selectedNewTrainer);
    if (!info) return;
    const detected =
      info.charges ??
      info.perHourCost ??
      info.rate ??
      info.cost ??
      null;
    setAutoTrainerBaseCost(detected);
    if (!manualCostEdited) {
      setNewTrainerCost(
        detected !== null && detected !== undefined && detected !== ""
          ? String(detected)
          : ""
      );
    }
  }, [selectedNewTrainer, trainers, manualCostEdited]);

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

  const getBookedTrainerIds = () => {
    if (!selectedTraining || !changeStartDate || !changeEndDate) return [];
    const bookedIds = new Set();
    const changeStart = parseDate(changeStartDate);
    const changeEnd = parseDate(changeEndDate);
    selectedTraining.domains.forEach((domain) => {
      domain.table1Data.forEach((row) => {
        row.batches?.forEach((batch) => {
          batch.trainers?.forEach((trainer) => {
            if (!trainer.isReplaced && trainer.trainerId && trainer.trainerName) {
              const tStart = parseDate(trainer.startDate);
              const tEnd = parseDate(trainer.endDate);
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

  const removeUndefinedFields = (obj) => {
    const clean = {};
    Object.keys(obj).forEach((k) => {
      if (obj[k] !== undefined) clean[k] = obj[k];
    });
    return clean;
  };

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

      const startDateObj = parseDate(selectedCurrentTrainer.startDate);
      const endDateObj = parseDate(selectedCurrentTrainer.endDate);
      const changeStartObj = parseDate(changeStartDate);
      const changeEndObj = parseDate(changeEndDate);

      const toDateStr = (d) => d.toISOString().slice(0, 10);

      let newTrainersArr = [];

      const perDayHours = getTrainingHoursPerDay(selectedTraining.phaseData);
      const computePerDayHoursForSlot = (slot) => {
        if (slot === "AM & PM") return perDayHours;
        if (slot === "AM" || slot === "PM") return +(perDayHours / 2).toFixed(2);
        return 0;
      };
      const currentPerDayHours = computePerDayHoursForSlot(
        currentTrainer.dayDuration
      );

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

      if (changeEndObj < endDateObj) {
        const afterStart = new Date(changeEndObj);
        afterStart.setDate(afterStart.getDate() + 1);
        const afterActiveDates = getDateListExcludingSundays(
          toDateStr(afterStart),
          selectedCurrentTrainer.endDate
        );
        newTrainersArr.push(
          removeUndefinedFields({
            ...currentTrainer,
            startDate: toDateStr(afterStart),
            endDate: selectedCurrentTrainer.endDate,
            isReplaced: false,
            activeDates: afterActiveDates,
            dailyHours: afterActiveDates.map(() => currentPerDayHours),
            assignedHours: afterActiveDates.length * currentPerDayHours,
          })
        );
      }

      table1Data[rowIdx].batches[batchIdx].trainers.splice(trainerIdx, 1, ...newTrainersArr);

      await updateDoc(domainDocRef, {
        table1Data: table1Data,
      });

      alert("Trainer changed successfully!");
      handleClose();
    } catch {
      alert("Error changing trainer. Please try again.");
    }
    setSubmitting(false);
  };

  const getDateListExcludingSundays = (start, end) => {
    if (!start || !end) return [];
    const startDate = parseDate(start);
    const endDate = parseDate(end);
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

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateStr);
    }
    if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [day, month, year] = dateStr.split('-');
      return new Date(`${year}-${month}-${day}`);
    }
    return new Date(dateStr);
  };

  const getDateString = (dateStr) => {
    const d = parseDate(dateStr);
    if (!d || isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  const validateChangeDateRange = () => {
    if (!selectedCurrentTrainer || !changeStartDate || !changeEndDate) return true;
    const changeStartStr = getDateString(changeStartDate);
    const changeEndStr = getDateString(changeEndDate);
    const trainerStartStr = getDateString(selectedCurrentTrainer.startDate);
    const trainerEndStr = getDateString(selectedCurrentTrainer.endDate);
    const trainingEndStr = getDateString(selectedTraining.phaseData.trainingEndDate);

    return (
      changeStartStr >= trainerStartStr &&
      changeEndStr <= trainerEndStr &&
      changeStartStr <= changeEndStr &&
      changeEndStr <= trainingEndStr
    );
  };
  if (!isOpen) return null;

  return (
<div className="fixed inset-0 z-54 flex items-center justify-center 
    bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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

        <div className="p-6">
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
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

                        if (!changeStartDate || !changeEndDate) return true;
                        const replacementDates = getDateListExcludingSundays(
                          changeStartDate,
                          changeEndDate
                        );

                        for (const assign of globalTrainerAssignments) {
                          if (assign.trainerId !== t.id) continue;
                          const assignDate = parseDate(assign.date);
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
                  <div className="space-y-1">
                    <input
                      type="number"
                      value={newTrainerCost}
                      onChange={(e) => { setNewTrainerCost(e.target.value); setManualCostEdited(true); }}
                      placeholder="Auto from trainer doc or enter manually"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>
                        {autoTrainerBaseCost !== null && !manualCostEdited && "Loaded from Firestore"}
                        {autoTrainerBaseCost === null && selectedNewTrainer && !manualCostEdited && "No cost in doc - enter manually"}
                        {manualCostEdited && "Manual override"}
                      </span>
                      {autoTrainerBaseCost !== null && (
                        <button
                          type="button"
                          onClick={() => { setManualCostEdited(false); setNewTrainerCost(String(autoTrainerBaseCost ?? "")); }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
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
