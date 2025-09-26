import React, { useState, useEffect, useCallback } from "react";
import { doc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import {
  FiArrowLeft,
  FiUser,
  FiClock,
  FiBookOpen,
  FiLayers,
  FiLoader,
  FiMail,
  FiTrash2,
} from "react-icons/fi";
import SendSchedule from "../SendSchedule";
import CollegeSummaryReport from "../CollegeSummaryReport";

const PHASE_LABELS = {
  "phase-1": "Phase 1",
  "phase-2": "Phase 2",
  "phase-3": "Phase 3",
};

const DOMAIN_COLORS = {
  Technical: "bg-blue-100 border-blue-300 text-blue-800",
  "Soft skills": "bg-green-100 border-green-300 text-green-800",
  Aptitude: "bg-purple-100 border-purple-300 text-purple-800",
  Tools: "bg-yellow-100 border-yellow-300 text-yellow-800",
};

// Domain keywords mapping for compact display
const DOMAIN_KEYWORDS = {
  Technical: "Tech",
  "Soft skills": "Soft",
  Aptitude: "Apt",
  Tools: "Tools",
  "Tools (Excel - Power BI)": "Excel",
  "Tools (Looker Studio)": "Looker",
};

function getTimingForSlot(slot, training) {
  if (!slot) return "-";
  const s = String(slot).toUpperCase();
  const { collegeStartTime, lunchStartTime, lunchEndTime, collegeEndTime } =
    training || {};

  if (s.includes("AM & PM") || (s.includes("AM") && s.includes("PM"))) {
    if (collegeStartTime && collegeEndTime)
      return `${collegeStartTime} - ${collegeEndTime}`;
    return "AM & PM";
  }
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
  return slot;
}

function formatDate(input) {
  if (!input && input !== 0) return "";
  
  let date;
  
  // Handle Firestore Timestamp
  if (typeof input === "object" && input !== null && typeof input.toDate === "function") {
    date = input.toDate();
  } 
  // Handle timestamp (number)
  else if (typeof input === "number") {
    date = new Date(input);
  }
  // Handle string date
  else if (typeof input === "string") {
    date = new Date(input);
    if (isNaN(date.getTime())) return input; // Return original if invalid
  }
  // Handle Date object
  else if (input instanceof Date) {
    date = input;
  } else {
    return String(input);
  }
  
  // Validate date
  if (isNaN(date.getTime())) return String(input);
  
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

function formatCompactDate(input) {
  if (!input && input !== 0) return "";
  
  let date;
  
  // Handle Firestore Timestamp
  if (typeof input === "object" && input !== null && typeof input.toDate === "function") {
    date = input.toDate();
  } 
  // Handle timestamp (number)
  else if (typeof input === "number") {
    date = new Date(input);
  }
  // Handle string date
  else if (typeof input === "string") {
    date = new Date(input);
    if (isNaN(date.getTime())) return input; // Return original if invalid
  }
  // Handle Date object
  else if (input instanceof Date) {
    date = input;
  } else {
    return String(input);
  }
  
  // Validate date
  if (isNaN(date.getTime())) return String(input);
  
  const day = String(date.getDate()).padStart(2, "0");
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const month = monthNames[date.getMonth()];
  
  return `${day}/${month}`;
}

// Helper to calculate training days
function getTrainingDays(startDate, endDate, excludeDays = "None") {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  let days = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    let shouldInclude = true;
    if (excludeDays === "Saturday" && dayOfWeek === 6) shouldInclude = false;
    else if (excludeDays === "Sunday" && dayOfWeek === 0) shouldInclude = false;
    else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) shouldInclude = false;
    if (shouldInclude) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function InitiationTrainingDetails({ training, onBack }) {
  const [trainingData, setTrainingData] = useState(null);
  const [phaseData, setPhaseData] = useState(null);
  const [domainsData, setDomainsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSendSchedule, setShowSendSchedule] = useState(false);
  const [showSchedule, setShowSchedule] = useState({});

  const toggleSchedule = useCallback((key) => {
    setShowSchedule(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleDeleteBatch = async (domainId, rowIdx, batchIdx) => {
    if (!window.confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      
      // Get the current domain data
      const domainRef = doc(db, "trainingForms", training.id, "trainings", training.selectedPhase, "domains", domainId);
      const domainSnap = await getDoc(domainRef);
      
      if (!domainSnap.exists()) {
        throw new Error("Domain not found");
      }
      
      const domainData = domainSnap.data();
      const table1Data = domainData.table1Data || [];
      
      if (!table1Data[rowIdx] || !table1Data[rowIdx].batches || !table1Data[rowIdx].batches[batchIdx]) {
        throw new Error("Batch not found");
      }
      
      // Remove the batch from the row
      table1Data[rowIdx].batches.splice(batchIdx, 1);
      
      // If no batches left in the row, remove the entire row
      if (table1Data[rowIdx].batches.length === 0) {
        table1Data.splice(rowIdx, 1);
      }
      
      // Update Firestore
      await updateDoc(domainRef, {
        table1Data: table1Data
      });
      
      // Update local state
      setDomainsData(prev => prev.map(domain => {
        if (domain.id === domainId) {
          const updatedTable1Data = [...table1Data];
          return {
            ...domain,
            table1Data: updatedTable1Data
          };
        }
        return domain;
      }));
      
      setLoading(false);
    } catch (err) {
      console.error("Error deleting batch:", err);
      setError("Failed to delete batch. Please try again.");
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchTrainingData = async () => {
      if (!training?.id || !training?.selectedPhase) {
        setError("Missing training ID or phase information");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const trainingFormRef = doc(db, "trainingForms", training.id);
        const trainingFormSnap = await getDoc(trainingFormRef);
        
        if (!trainingFormSnap.exists()) {
          throw new Error("Training form not found");
        }
        
        const trainingFormData = trainingFormSnap.data();
        setTrainingData(trainingFormData);

        const phaseRef = doc(db, "trainingForms", training.id, "trainings", training.selectedPhase);
        const phaseSnap = await getDoc(phaseRef);
        
        if (!phaseSnap.exists()) {
          throw new Error("Phase not found");
        }
        
        const phaseDocData = phaseSnap.data();
        setPhaseData(phaseDocData);

        const domainsRef = collection(db, "trainingForms", training.id, "trainings", training.selectedPhase, "domains");
        const domainsSnap = await getDocs(domainsRef);
        
        const domains = [];
        for (const domainDoc of domainsSnap.docs) {
          const domainData = domainDoc.data();
          
          // Calculate maximum assigned hours from table1Data (instead of sum)
          let maxAssignedHours = 0;
          if (Array.isArray(domainData.table1Data)) {
            // For each specialization (row), find the max assigned hours from its batches
            const maxHoursPerSpecialization = domainData.table1Data.map(row => {
              if (row.batches && Array.isArray(row.batches)) {
                const batchHours = row.batches.map(batch => batch.assignedHours || 0);
                return batchHours.length > 0 ? Math.max(...batchHours) : 0;
              }
              return row.assignedHours || 0;
            });
            if (maxHoursPerSpecialization.length > 0) {
              maxAssignedHours = Math.max(...maxHoursPerSpecialization);
            }
          }

          // Calculate domain hours as the maximum from all specializations (batches)
          let maxDomainHours = 0;
          if (Array.isArray(domainData.table1Data)) {
            const hoursPerBatch = domainData.table1Data.map(batch => batch.domainHours || 0);
            if (hoursPerBatch.length > 0) {
              maxDomainHours = Math.max(...hoursPerBatch);
            }
          }
          
          domains.push({
            id: domainDoc.id,
            domain: domainData.domain || domainDoc.id,
            assignedHours: maxAssignedHours, // Use calculated max instead of sum
            domainHours: maxDomainHours, // Use calculated max instead of stored value
            ...domainData
          });
        }
        
        setDomainsData(domains);
        setLoading(false);

      } catch (err) {
        console.error("Error fetching training data:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchTrainingData();
  }, [training?.id, training?.selectedPhase]);

  if (!training) return null;

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-200">
        <button
          className="mb-2 flex items-center text-blue-600 hover:underline"
          onClick={onBack}
        >
          <FiArrowLeft className="mr-2" /> Back to Dashboard
        </button>
        <div className="w-full mx-auto bg-white rounded-xl shadow border border-gray-200 ">
          <div className="flex items-center justify-center py-12">
            <FiLoader className="animate-spin text-2xl text-gray-400 mr-3" />
            <span className="text-gray-600">Loading training details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-200 ">
        <button
          className="mb-2 flex items-center text-blue-600 hover:underline"
          onClick={onBack}
        >
          <FiArrowLeft className="mr-2" /> Back to Dashboard
        </button>
        <div className="w-full mx-auto bg-white rounded-xl shadow border border-gray-200 ">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">Error loading training details</div>
            <div className="text-gray-500">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-200 ">
      <button
        className="mb-4 flex items-center text-blue-600 hover:underline text-sm"
        onClick={onBack}
      >
        <FiArrowLeft className="mr-1" /> Back to Dashboard
      </button>
      
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">Training Details</h1>
        <div className="flex gap-2">
          <CollegeSummaryReport
            training={training}
            trainingData={trainingData}
            phaseData={phaseData}
            domainsData={domainsData}
          />
          <button
            onClick={() => setShowSendSchedule(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
          >
            <FiMail className="w-4 h-4" />
            Send Schedule
          </button>
        </div>
      </div>
      
      <div className="w-full mx-auto bg-white rounded-xl shadow border border-gray-200 p-4 mb-6">
        <h2 className="text-2xl font-bold text-indigo-800 mb-2">
          {trainingData?.collegeName}{" "}
          <span className="text-gray-400">({trainingData?.projectCode})</span>
        </h2>
        
        <div className="mb-4 text-gray-700">
          <span className="mr-4">
            <FiLayers className="inline mr-1" />
            {PHASE_LABELS[training.selectedPhase] || training.selectedPhase}
          </span>
          <span className="mr-4">
            <FiBookOpen className="inline mr-1" />
            {trainingData?.course} - {trainingData?.year}
          </span>
          <span className="mr-4">
            <FiClock className="inline mr-1" />
            {formatDate(phaseData?.trainingStartDate)} to{" "}
            {formatDate(phaseData?.trainingEndDate)}
          </span>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Phase Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Students:</span>
              <div className="font-medium">{(() => {
                // Calculate total students from all batches across all domains
                let totalStudents = 0;
                domainsData.forEach(domain => {
                  if (Array.isArray(domain.table1Data)) {
                    domain.table1Data.forEach(row => {
                      if (row.batches && Array.isArray(row.batches)) {
                        row.batches.forEach(batch => {
                          totalStudents += Number(batch.batchPerStdCount || 0);
                        });
                      }
                    });
                  }
                });
                return totalStudents;
              })()}</div>
            </div>
            <div>
              <span className="text-gray-500">Total Hours:</span>
              <div className="font-medium">{(() => {
                // Calculate total assigned hours from all trainers across all domains
                let totalAssignedHours = 0;
                domainsData.forEach(domain => {
                  if (Array.isArray(domain.table1Data)) {
                    domain.table1Data.forEach(row => {
                      if (row.batches && Array.isArray(row.batches)) {
                        row.batches.forEach(batch => {
                          if (batch.trainers && Array.isArray(batch.trainers)) {
                            batch.trainers.forEach(trainer => {
                              totalAssignedHours += Number(trainer.assignedHours || 0);
                            });
                          }
                        });
                      }
                    });
                  }
                });
                return totalAssignedHours;
              })()}</div>
            </div>
            <div>
              <span className="text-gray-500">College Timing:</span>
              <div className="font-medium">
                {phaseData?.collegeStartTime} - {phaseData?.collegeEndTime}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Domains:</span>
              <div className="font-medium">{domainsData.length}</div>
            </div>
          </div>
        </div>

        <h3 className="font-semibold text-gray-800 mb-4">Domain-wise Training Details</h3>
        
        {domainsData.length > 0 ? (
          <div className="space-y-6">
            {domainsData.map((domainInfo) => (
              <div
                key={domainInfo.id}
                className={`rounded-lg border-2 p-4 ${
                  DOMAIN_COLORS[domainInfo.domain] || "bg-gray-100 border-gray-300 text-gray-800"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold">{domainInfo.domain}</h4>
                    <div className="text-sm opacity-75">
                      Domain Hours: {domainInfo.domainHours || 0} | 
                      Assigned Hours: {(() => {
                        // Calculate total assigned hours from all trainers in this domain
                        let totalAssigned = 0;
                        if (Array.isArray(domainInfo.table1Data)) {
                          domainInfo.table1Data.forEach(row => {
                            if (row.batches && Array.isArray(row.batches)) {
                              row.batches.forEach(batch => {
                                if (batch.trainers && Array.isArray(batch.trainers)) {
                                  batch.trainers.forEach(trainer => {
                                    totalAssigned += Number(trainer.assignedHours || 0);
                                  });
                                }
                              });
                            }
                          });
                        }
                        return totalAssigned;
                      })()}
                    </div>
                  </div>
                  <div className="text-right text-sm mt-2 md:mt-0">
                    <div>Phase: {PHASE_LABELS[domainInfo.phase] || domainInfo.phase}</div>
                    {domainInfo.isMainPhase && (
                      <div className="text-xs font-semibold">Main Phase</div>
                    )}
                  </div>
                </div>

                {Array.isArray(domainInfo.table1Data) && domainInfo.table1Data.length > 0 ? (
                  <div className="space-y-4">
                    {domainInfo.table1Data.map((row, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
                      >
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{row.batch}</div>
                            <div className="text-xs text-gray-500">
                              {(() => {
                                // Calculate total students from all batches
                                if (row.batches && Array.isArray(row.batches)) {
                                  const totalStudents = row.batches.reduce((sum, batch) => sum + (batch.batchPerStdCount || 0), 0);
                                  return totalStudents;
                                }
                                return row.stdCount || 0;
                              })()} students • {(() => {
                                // Calculate max assigned hours from batches instead of sum
                                if (row.batches && Array.isArray(row.batches)) {
                                  const batchHours = row.batches.map(batch => batch.assignedHours || 0);
                                  return batchHours.length > 0 ? Math.max(...batchHours) : 0;
                                }
                                return row.assignedHours || 0;
                              })()} assigned hours
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {row.batches &&
                            row.batches.map((batch, bidx) => (
                              <div
                                key={bidx}
                                className="border rounded p-3 bg-gray-50"
                              >
                                <div className="flex flex-wrap gap-4 items-center justify-between mb-2">
                                  <div className="flex flex-wrap gap-4 items-center">
                                    <span className="text-sm font-semibold text-gray-700">
                                      {batch.batchCode}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      Students: {batch.batchPerStdCount || 0}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      Hours: {batch.assignedHours || 0}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteBatch(domainInfo.id, idx, bidx)}
                                    className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                                    title="Delete this batch"
                                    disabled={loading}
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                <div>
                                  <div className="font-semibold text-sm text-gray-700 mb-2">
                                    Trainers:
                                  </div>
                                  {batch.trainers && batch.trainers.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                      {batch.trainers.map((trainer, tidx) => {
                                        const uniqueKey = `${domainInfo.id}_${batch.batchCode}_${trainer.trainerId || 'trainer'}_${tidx}_${trainer.dayDuration || 'noslot'}_${trainer.startDate || 'nostart'}`;
                                        return (
                                          <div
                                            key={uniqueKey}
                                            className="bg-white border rounded-lg p-3 shadow-sm"
                                          >
                                            <div className="flex items-center gap-2 mb-2">
                                              <FiUser className="text-indigo-500" />
                                              <span className="font-medium">
                                                {trainer.trainerName || "Unassigned"}
                                              </span>
                                              <span className="text-xs text-gray-500 ml-auto">
                                                ID: {trainer.trainerId}
                                              </span>
                                            </div>
                                            
                                            <div className="text-sm text-gray-600 space-y-1">
                                              <div>Duration: {trainer.dayDuration || "-"}</div>
                                              <div>Hours: {trainer.assignedHours || 0}</div>
                                              <div>
                                                Period: {formatDate(trainer.startDate)} - {formatDate(trainer.endDate)}
                                              </div>
                                              {trainer.perHourCost && (
                                                <div>Rate: ₹{trainer.perHourCost.toLocaleString('en-IN')}/hour</div>
                                              )}
                                              {trainer.topics && trainer.topics.length > 0 && (
                                                <div>Topics: {Array.isArray(trainer.topics) ? trainer.topics.join(", ") : trainer.topics}</div>
                                              )}
                                            </div>
                                            
                                            {/* Cost Breakdown */}
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                              <div className="text-sm font-medium text-gray-700 mb-2">Cost Breakdown:</div>
                                              <div className="text-sm text-gray-600 space-y-1">
                                                {(() => {
                                                  const days = getTrainingDays(trainer.startDate, trainer.endDate, phaseData?.excludeDays || "None");
                                                  const conveyanceTotal = trainer.conveyance || 0;
                                                  const foodTotal = (trainer.food || 0) * days;
                                                  const lodgingTotal = (trainer.lodging || 0) * days;
                                                  const trainerCost = (trainer.assignedHours || 0) * (trainer.perHourCost || 0);
                                                  const miscTotal = conveyanceTotal + foodTotal + lodgingTotal;
                                                  const totalCost = trainerCost + miscTotal;
                                                  return (
                                                    <>
                                                      <div>Conveyance: ₹{conveyanceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                      <div>Food: ₹{foodTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({(trainer.food || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × {days})</div>
                                                      <div>Lodging: ₹{lodgingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({(trainer.lodging || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × {days})</div>
                                                      <div>Trainer: ₹{trainerCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                      <div>Misc: ₹{miscTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                      <div className="font-semibold text-gray-800 border-t border-gray-300 pt-1">
                                                        Total: ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                      </div>
                                                    </>
                                                  );
                                                })()}
                                              </div>
                                            </div>
                                            
                                            <div className="mt-2 flex justify-end">
                                              <button
                                                onClick={() => toggleSchedule(uniqueKey)}
                                                className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                                              >
                                                {showSchedule[uniqueKey] ? 'Hide Schedule' : 'Show Schedule'}
                                              </button>
                                            </div>
                                            
                                            {showSchedule[uniqueKey] && (
                                              <div className="mt-1 overflow-x-auto">
                                                <table className="w-full border-collapse leading-none" style={{fontSize: '10px'}}>
                                                  <thead>
                                                    <tr className="bg-gray-50">
                                                      <th className="border-b border-gray-200 px-0.5 py-0 text-left font-medium">Date</th>
                                                      <th className="border-b border-gray-200 px-0.5 py-0 text-left font-medium">Hrs</th>
                                                      <th className="border-b border-gray-200 px-0.5 py-0 text-left font-medium">Slot</th>
                                                      <th className="border-b border-gray-200 px-0.5 py-0 text-left font-medium">Timing</th>
                                                      <th className="border-b border-gray-200 px-0.5 py-0 text-left font-medium">Domain</th>
                                                      <th className="border-b border-gray-200 px-0.5 py-0 text-left font-medium">Cost</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {(() => {
                                                      // Generate dates between start and end date
                                                      const dates = [];
                                                      if (trainer.startDate && trainer.endDate) {
                                                        try {
                                                          const startDate = new Date(trainer.startDate);
                                                          const endDate = new Date(trainer.endDate);
                                                          
                                                          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                                                            return (
                                                              <tr>
                                                                <td colSpan="6" className="px-0.5 py-0 text-center text-red-500">
                                                                  Invalid date range
                                                                </td>
                                                              </tr>
                                                            );
                                                          }
                                                          
                                                          const excludeDays = trainingData?.excludeDays || "None";
                                                          let current = new Date(startDate);
                                                          
                                                          while (current <= endDate) {
                                                            const dayOfWeek = current.getDay();
                                                            let shouldInclude = true;
                                                            
                                                            if (excludeDays === "Saturday" && dayOfWeek === 6) {
                                                              shouldInclude = false;
                                                            } else if (excludeDays === "Sunday" && dayOfWeek === 0) {
                                                              shouldInclude = false;
                                                            } else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) {
                                                              shouldInclude = false;
                                                            }
                                                            
                                                            if (shouldInclude) {
                                                              const dateStr = current.toISOString().slice(0, 10);
                                                              if (!(trainer.excludedDates || []).includes(dateStr)) {
                                                                dates.push(new Date(current));
                                                              }
                                                            }
                                                            current.setDate(current.getDate() + 1);
                                                          }
                                                        } catch (e) {
                                                          console.error("Error generating dates:", e);
                                                          return (
                                                            <tr>
                                                              <td colSpan="6" className="px-0.5 py-0 text-center text-red-500">
                                                                Error generating schedule
                                                              </td>
                                                            </tr>
                                                          );
                                                        }
                                                      }
                                                      
                                                      // Calculate hours per day
                                                      let hoursArray = [];
                                                      if (trainer.dailyHours && Array.isArray(trainer.dailyHours) && trainer.dailyHours.length === dates.length) {
                                                        hoursArray = trainer.dailyHours;
                                                      } else {
                                                        const totalDays = dates.length;
                                                        const hoursPerDay = totalDays > 0 ? (trainer.assignedHours || 0) / totalDays : 0;
                                                        hoursArray = new Array(totalDays).fill(hoursPerDay);
                                                      }
                                                      
                                                      return dates.map((date, index) => {
                                                        const hoursForDay = hoursArray[index] || 0;
                                                        // Calculate daily total cost including fixed costs distributed across training days
                                                        const trainerCostForDay = hoursForDay * (trainer.perHourCost || 0);
                                                        const dailyMiscCosts = (trainer.food || 0) + (trainer.lodging || 0);
                                                        const totalCostForDay = trainerCostForDay + dailyMiscCosts;
                                                        
                                                        return (
                                                          <tr key={date.toISOString()} className="hover:bg-gray-50">
                                                            <td className="border-b border-gray-100 px-0.5 py-0">{formatCompactDate(date)}</td>
                                                            <td className="border-b border-gray-100 px-0.5 py-0">{hoursForDay.toFixed(2)}</td>
                                                            <td className="border-b border-gray-100 px-0.5 py-0">{trainer.dayDuration || '-'}</td>
                                                            <td className="border-b border-gray-100 px-0.5 py-0">{getTimingForSlot(trainer.dayDuration, phaseData)}</td>
                                                            <td className="border-b border-gray-100 px-0.5 py-0">{DOMAIN_KEYWORDS[domainInfo.domain] || domainInfo.domain}</td>
                                                            <td className="border-b border-gray-100 px-0.5 py-0">₹{totalCostForDay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                          </tr>
                                                        );
                                                      });
                                                    })()}
                                                  </tbody>
                                                </table>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-400 italic">
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
                  <div className="text-gray-500 text-sm italic">
                    No batch data available for this domain.
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-center py-8">
            No domains configured for this phase.
          </div>
        )}
      </div>

     {showSendSchedule && (
 // In your parent component
<SendSchedule
  training={training}
  trainingData={trainingData}
  phaseData={phaseData}
  domainsData={domainsData}
trainersData={domainsData.flatMap(domain => 
  domain.table1Data?.flatMap(row => 
    row.batches?.flatMap(batch => 
      batch.trainers?.map(trainer => ({
        ...trainer,
        domain: domain.domain,
        batchCode: batch.batchCode,
        conveyance: trainer.conveyance || 0,
        food: trainer.food || 0,
        lodging: trainer.lodging || 0
      })) || []
    ) || []
  ) || []
)}
  onClose={() => setShowSendSchedule(false)}
/>
)}
    </div>
  );
}

export default InitiationTrainingDetails;