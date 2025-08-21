import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
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

const ChangeTrainerDashboard = ({ isOpen, onClose, selectedTraining: preSelectedTraining }) => {
  const [step, setStep] = useState(1); // 1: Select Training, 2: Select Trainer, 3: Change Details, 4: Confirmation
  const [loading, setLoading] = useState(false);
  const [trainings, setTrainings] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [selectedCurrentTrainer, setSelectedCurrentTrainer] = useState(null);
  const [selectedNewTrainer, setSelectedNewTrainer] = useState("");
  const [changeDate, setChangeDate] = useState("");
  const [reason, setReason] = useState("");
  const [newTrainerCost, setNewTrainerCost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(false);

  // Debug log to check if modal is opening
  useEffect(() => {
    console.log("🔍 [CHANGE TRAINER MODAL] Modal state:", { 
      isOpen, 
      preSelectedTraining,
      step,
      selectedTraining 
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
    console.log("🔄 [FETCH DOMAINS] Fetching domains for:", { formId, phaseId });
    
    const domainsSnap = await getDocs(
      collection(db, "trainingForms", formId, "trainings", phaseId, "domains")
    );

    console.log("🔍 [FETCH DOMAINS] Domains snapshot size:", domainsSnap.size);

    const domainsWithTrainers = [];
    domainsSnap.forEach((domainDoc) => {
      const domainData = domainDoc.data();
      console.log("🔍 [FETCH DOMAINS] Domain data:", domainDoc.id, domainData);
      
      if (domainData.table1Data && domainData.table1Data.length > 0) {
        console.log("✅ [FETCH DOMAINS] Found table1Data for domain:", domainDoc.id);
        domainsWithTrainers.push({
          domainId: domainDoc.id,
          domainName: domainData.domain || domainDoc.id,
          table1Data: domainData.table1Data,
        });
      } else {
        console.log("❌ [FETCH DOMAINS] No table1Data for domain:", domainDoc.id);
      }
    });

    console.log("✅ [FETCH DOMAINS] Final domains with trainers:", domainsWithTrainers);

    const updatedTraining = { ...training, domains: domainsWithTrainers };
    setSelectedTraining(updatedTraining);
    
    console.log("✅ [FETCH DOMAINS] Updated training:", updatedTraining);
  } catch (error) {
    console.error("❌ [FETCH DOMAINS] Error fetching training domains:", error);
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
        fetchTrainingDomains(preSelectedTraining.trainingId, preSelectedTraining.phaseId, convertedTraining);
      } else {
        // Fetch all in-progress trainings
        fetchInProgressTrainings();
      }
      
      fetchTrainers();
      // Set default change date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setChangeDate(tomorrow.toISOString().slice(0, 10));
    }
  }, [isOpen, preSelectedTraining]);

// Add debug logging to the getActiveTrainers function around line 185

// Get all active trainers from selected training
const getActiveTrainers = () => {
  if (!selectedTraining) {
    console.log("❌ [GET ACTIVE TRAINERS] No selected training");
    return [];
  }
  
  console.log("🔍 [GET ACTIVE TRAINERS] Selected training:", selectedTraining);
  console.log("🔍 [GET ACTIVE TRAINERS] Domains:", selectedTraining.domains);
  
  const activeTrainers = [];
  selectedTraining.domains.forEach((domain) => {
    console.log("🔍 [GET ACTIVE TRAINERS] Processing domain:", domain);
    domain.table1Data.forEach((row, rowIdx) => {
      console.log("🔍 [GET ACTIVE TRAINERS] Processing row:", row);
      row.batches?.forEach((batch, batchIdx) => {
        console.log("🔍 [GET ACTIVE TRAINERS] Processing batch:", batch);
        batch.trainers?.forEach((trainer, trainerIdx) => {
          console.log("🔍 [GET ACTIVE TRAINERS] Processing trainer:", trainer);
          
          // Only include trainers who are not already replaced
          // Remove the date check since we want to show all trainers from the training period
          if (!trainer.isReplaced && trainer.trainerId && trainer.trainerName) {
            console.log("✅ [GET ACTIVE TRAINERS] Adding trainer:", trainer.trainerName);
            
            activeTrainers.push({
              ...trainer,
              domainName: domain.domainName,
              batchCode: batch.batchCode,
              specialization: row.batch,
              indices: { domainId: domain.domainId, rowIdx, batchIdx, trainerIdx },
            });
          } else {
            console.log("❌ [GET ACTIVE TRAINERS] Skipping trainer:", {
              name: trainer.trainerName,
              isReplaced: trainer.isReplaced,
              hasId: !!trainer.trainerId,
              hasName: !!trainer.trainerName
            });
          }
        });
      });
    });
  });
  
  console.log("✅ [GET ACTIVE TRAINERS] Found active trainers:", activeTrainers);
  return activeTrainers;
};

  // Handle trainer change submission
  const handleChangeTrainer = async () => {
    if (!selectedCurrentTrainer || !selectedNewTrainer || !changeDate || !reason) {
      alert("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const { domainId, rowIdx, batchIdx, trainerIdx } = selectedCurrentTrainer.indices;
      
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
      
      const currentTrainer = table1Data[rowIdx].batches[batchIdx].trainers[trainerIdx];
      
      // Calculate split dates
      const changeDateObj = new Date(changeDate);
      const previousDay = new Date(changeDateObj);
      previousDay.setDate(previousDay.getDate() - 1);
      
      const originalEndDate = currentTrainer.endDate;
      const splitDate = previousDay.toISOString().slice(0, 10);
      
      // Update current trainer (end their assignment early)
      const updatedCurrentTrainer = {
        ...currentTrainer,
        endDate: splitDate,
        isReplaced: true,
        replacedOn: changeDate,
        replacedBy: selectedNewTrainer,
        replacementReason: reason
      };
      
      // Recalculate current trainer's hours for the shortened period
      const currentActiveDates = getDateListExcludingSundays(currentTrainer.startDate, splitDate);
      const perDayHours = getTrainingHoursPerDay(selectedTraining.phaseData);
      let currentPerDayHours = 0;
      
      if (currentTrainer.dayDuration === "AM & PM") currentPerDayHours = perDayHours;
      else if (currentTrainer.dayDuration === "AM" || currentTrainer.dayDuration === "PM")
        currentPerDayHours = +(perDayHours / 2).toFixed(2);
      
      updatedCurrentTrainer.activeDates = currentActiveDates;
      updatedCurrentTrainer.dailyHours = currentActiveDates.map(() => currentPerDayHours);
      updatedCurrentTrainer.assignedHours = updatedCurrentTrainer.dailyHours.reduce((a, b) => a + Number(b || 0), 0);
      
      // Create new trainer for remaining period
      const newActiveDates = getDateListExcludingSundays(changeDate, originalEndDate);
      const newTrainerInfo = trainers.find(t => t.id === selectedNewTrainer);
      
      const newTrainer = {
        trainerId: selectedNewTrainer,
        trainerName: newTrainerInfo?.name || "",
        dayDuration: currentTrainer.dayDuration,
        startDate: changeDate,
        endDate: originalEndDate,
        perHourCost: newTrainerCost || newTrainerInfo?.charges || currentTrainer.perHourCost,
        activeDates: newActiveDates,
        dailyHours: newActiveDates.map(() => currentPerDayHours),
        assignedHours: newActiveDates.length * currentPerDayHours,
        isReplacement: true,
        replacesTrainer: currentTrainer.trainerId,
        replacementStartDate: changeDate,
        replacementReason: reason
      };
      
      // Update the trainers array
      table1Data[rowIdx].batches[batchIdx].trainers[trainerIdx] = updatedCurrentTrainer;
      table1Data[rowIdx].batches[batchIdx].trainers.push(newTrainer);
      
      // Update the document in Firestore
      await updateDoc(domainDocRef, {
        table1Data: table1Data
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
  const getDateListExcludingSundays = (start, end) => {
    if (!start || !end) return [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dates = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      if (current.getDay() !== 0) {
        dates.push(new Date(current));
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
    setChangeDate("");
    setReason("");
    setNewTrainerCost("");
    onClose();
  };

const validateChangeDate = () => {
  if (!selectedCurrentTrainer || !changeDate) return true;
  
  const changeDateObj = new Date(changeDate);
  const startDateObj = new Date(selectedCurrentTrainer.startDate);
  const endDateObj = new Date(selectedCurrentTrainer.endDate);
  const today = new Date();
  
  // Allow change date to be after the trainer's start date and before/equal to training end date
  // Remove the restriction that change date must be in the future
  const trainingEndDate = new Date(selectedTraining.phaseData.trainingEndDate);
  
  return changeDateObj > startDateObj && changeDateObj <= trainingEndDate;
};
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Change Trainer</h2>
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
                  <div className={`w-12 h-0.5 ${step > 1 ? "bg-blue-600" : "bg-gray-200"}`} />
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
                  <span className="ml-2 text-gray-600">Loading trainings...</span>
                </div>
              ) : trainings.length === 0 ? (
                <div className="text-center py-8">
                  <FiAlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No In-Progress Trainings Found
                  </h3>
                  <p className="text-gray-600">
                    There are no training programs currently in progress that can have trainer changes.
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
                            {training.phaseData.trainingStartDate} to {training.phaseData.trainingEndDate}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {training.domains.length} domain(s) • Active trainers available
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
        {selectedTraining.collegeName} ({selectedTraining.collegeCode})
      </h4>
      <p className="text-sm text-blue-700">
        Phase {selectedTraining.phaseId.replace("phase-", "")} • 
        {selectedTraining.phaseData.trainingStartDate} to {selectedTraining.phaseData.trainingEndDate}
      </p>
    </div>

    {loadingDomains ? (
      <div className="flex items-center justify-center py-8">
        <FiRefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading trainers...</span>
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
              There are no active trainers for this training program that can be changed.
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
                console.log("🔄 [TRAINER SELECTION] Selected trainer:", trainer);
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
                    {trainer.domainName} • {trainer.specialization} • {trainer.batchCode}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {trainer.startDate} to {trainer.endDate} • {trainer.dayDuration} • 
                    ₹{trainer.perHourCost}/hour
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
                <h4 className="font-medium text-red-900 mb-2">Current Trainer</h4>
                <div className="text-sm text-red-700">
                  <p><strong>Name:</strong> {selectedCurrentTrainer.trainerName}</p>
                  <p><strong>Domain:</strong> {selectedCurrentTrainer.domainName}</p>
                  <p><strong>Batch:</strong> {selectedCurrentTrainer.batchCode}</p>
                  <p><strong>Period:</strong> {selectedCurrentTrainer.startDate} to {selectedCurrentTrainer.endDate}</p>
                  <p><strong>Duration:</strong> {selectedCurrentTrainer.dayDuration}</p>
                </div>
              </div>

              {/* Change Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiCalendar className="inline w-4 h-4 mr-1" />
                    Change Date *
                  </label>
          <input
  type="date"
  value={changeDate}
  onChange={(e) => setChangeDate(e.target.value)}
  min={selectedCurrentTrainer.startDate}
  max={selectedTraining.phaseData.trainingEndDate}  // Use training end date instead of trainer end date
  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    !validateChangeDate() ? "border-red-300 bg-red-50" : "border-gray-300"
  }`}
/>
            <p className="text-xs text-gray-500 mt-1">
  Original trainer assignment will be split at this date. New trainer will take over from {changeDate || '___'}
</p>
{!validateChangeDate() && (
  <p className="text-xs text-red-600 mt-1">
    Change date must be after trainer's start date ({selectedCurrentTrainer.startDate}) and before training end date ({selectedTraining.phaseData.trainingEndDate})
  </p>
)}
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
                      .filter(t => t.id !== selectedCurrentTrainer.trainerId)
                      .map((trainer) => (
                        <option key={trainer.id} value={trainer.id}>
                          {trainer.name} ({trainer.id})
                        </option>
                      ))}
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
                  disabled={!selectedNewTrainer || !changeDate || !reason || !validateChangeDate()}
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
                      This action will split the current trainer's assignment and cannot be undone easily.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-3">Current Trainer (Ending)</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Name:</strong> {selectedCurrentTrainer.trainerName}</p>
                    <p><strong>New End Date:</strong> {changeDate ? 
                      new Date(new Date(changeDate).getTime() - 24*60*60*1000).toISOString().slice(0, 10) : 
                      '___'}</p>
                    <p><strong>Reason:</strong> {reason}</p>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-3">New Trainer (Starting)</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Name:</strong> {trainers.find(t => t.id === selectedNewTrainer)?.name}</p>
                    <p><strong>Start Date:</strong> {changeDate}</p>
                    <p><strong>End Date:</strong> {selectedCurrentTrainer.endDate}</p>
                    <p><strong>Cost:</strong> ₹{newTrainerCost || trainers.find(t => t.id === selectedNewTrainer)?.charges || selectedCurrentTrainer.perHourCost}/hour</p>
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
