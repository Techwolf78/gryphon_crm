import React, { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import {
  FiArrowLeft,
  FiUser,
  FiClock,
  FiBookOpen,
  FiLayers,
  FiChevronDown,
  FiChevronUp,
  FiLoader,
} from "react-icons/fi";

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
  const [trainingData, setTrainingData] = useState(null);
  const [phaseData, setPhaseData] = useState(null);
  const [domainsData, setDomainsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch hierarchical data from Firestore
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

        // 1. Fetch root training form document
        const trainingFormRef = doc(db, "trainingForms", training.id);
        const trainingFormSnap = await getDoc(trainingFormRef);
        
        if (!trainingFormSnap.exists()) {
          throw new Error("Training form not found");
        }
        
        const trainingFormData = trainingFormSnap.data();
        setTrainingData(trainingFormData);

        // 2. Fetch specific phase document
        const phaseRef = doc(db, "trainingForms", training.id, "trainings", training.selectedPhase);
        const phaseSnap = await getDoc(phaseRef);
        
        if (!phaseSnap.exists()) {
          throw new Error("Phase not found");
        }
        
        const phaseDocData = phaseSnap.data();
        setPhaseData(phaseDocData);

        // 3. Fetch all domains for this phase
        const domainsRef = collection(db, "trainingForms", training.id, "trainings", training.selectedPhase, "domains");
        const domainsSnap = await getDocs(domainsRef);
        
        const domains = [];
        domainsSnap.forEach(domainDoc => {
          const domainData = domainDoc.data();
          domains.push({
            id: domainDoc.id,
            domain: domainData.domain || domainDoc.id,
            ...domainData
          });
        });
        
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

  // simpler: toggle by a single unique key
  const toggleExpand = (key) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!training) return null;

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-200 p-6">
        <button
          className="mb-6 flex items-center text-blue-600 hover:underline"
          onClick={onBack}
        >
          <FiArrowLeft className="mr-2" /> Back to Dashboard
        </button>
        <div className="w-full mx-auto bg-white rounded-xl shadow border border-gray-200 p-8">
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
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-200 p-6">
        <button
          className="mb-6 flex items-center text-blue-600 hover:underline"
          onClick={onBack}
        >
          <FiArrowLeft className="mr-2" /> Back to Dashboard
        </button>
        <div className="w-full mx-auto bg-white rounded-xl shadow border border-gray-200 p-8">
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
        className="mb-2 flex items-center text-blue-600 hover:underline"
        onClick={onBack}
      >
        <FiArrowLeft className="mr-2" /> Back to Dashboard
      </button>
      
      <div className="w-full mx-auto bg-white rounded-xl shadow border border-gray-200 p-4">
        {/* Training Form Header */}
        <h2 className="text-2xl font-bold text-indigo-800 mb-2">
          {trainingData?.collegeName}{" "}
          <span className="text-gray-400">({trainingData?.collegeCode})</span>
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

        {/* Phase Summary */}
        <div className="mb-4 p-2 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Phase Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Students:</span>
              <div className="font-medium">{trainingData?.studentCount || 0}</div>
            </div>
            <div>
              <span className="text-gray-500">Total Hours:</span>
              <div className="font-medium">{trainingData?.totalHours || 0}</div>
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

        {/* Domain-wise Details */}
        <h3 className="font-semibold text-gray-800 mb-2">Domain-wise Training Details</h3>
        
        {domainsData.length > 0 ? (
          <div className="space-y-8">
            {domainsData.map((domainInfo) => (
              <div
                key={domainInfo.id}
                className={`rounded-lg border-2 p-2 ${
                  DOMAIN_COLORS[domainInfo.domain] || "bg-gray-100 border-gray-300 text-gray-800"
                }`}
              >
                {/* Domain Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-lg font-bold">{domainInfo.domain}</h4>
                    <div className="text-sm opacity-75">
                      Domain Hours: {domainInfo.domainHours || 0} | 
                      Assigned Hours: {domainInfo.assignedHours || 0}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>Phase: {PHASE_LABELS[domainInfo.phase] || domainInfo.phase}</div>
                    {domainInfo.isMainPhase && (
                      <div className="text-xs font-semibold">Main Phase</div>
                    )}
                  </div>
                </div>

                {/* Batches for this domain */}
                {Array.isArray(domainInfo.table1Data) && domainInfo.table1Data.length > 0 ? (
                  <div className="space-y-4">
                    {domainInfo.table1Data.map((row, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-lg border border-gray-200 shadow-sm p-2"
                      >
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{row.batch}</div>
                            <div className="text-xs text-gray-500">
                              {row.stdCount} students • {row.hrs} hours • {row.assignedHours} assigned
                            </div>
                          </div>
                        </div>

                        {/* Batch Details */}
                        <div className="space-y-3">
                          {row.batches &&
                            row.batches.map((batch, bidx) => (
                              <div
                                key={bidx}
                                className="border rounded p-2 bg-gray-50"
                              >
                                <div className="flex flex-wrap gap-4 items-center mb-1">
                                  <span className="text-sm font-semibold text-gray-700">
                                    {batch.batchCode}
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    Students: {batch.batchPerStdCount || 0}
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    Hours: {batch.assignedHours || 0}
                                  </span>
                                  {batch.isMerged && (
                                    <span className="text-sm text-rose-600 font-semibold px-2 py-1 bg-rose-100 rounded">
                                      Merged from: {batch.mergedFrom}
                                    </span>
                                  )}
                                </div>

                                {/* Trainers */}
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
                                                <div>Rate: ₹{trainer.perHourCost}/hour</div>
                                              )}
                                            </div>

                                            {/* Daily Hours Breakdown */}
                                            {trainer.dailyHours && trainer.dailyHours.length > 0 && (
                                              <div className="mt-3">
                                                <button
                                                  className="flex items-center text-sm text-indigo-600 hover:underline"
                                                  onClick={() => toggleExpand(uniqueKey)}
                                                  type="button"
                                                >
                                                  {expanded[uniqueKey] ? (
                                                    <>
                                                      <FiChevronUp className="mr-1" />
                                                      Hide Schedule
                                                    </>
                                                  ) : (
                                                    <>
                                                      <FiChevronDown className="mr-1" />
                                                      Show Schedule
                                                    </>
                                                  )}
                                                </button>

                                                {expanded[uniqueKey] && (
                                                  <div className="mt-3 overflow-x-auto">
                                                    <table className="w-full border-collapse text-[10px] leading-tight">
                                                      <thead className="bg-gray-100">
                                                        <tr>
                                                          <th className="px-0.5 py-0.5 text-left border font-normal">Date</th>
                                                          <th className="px-0.5 py-0.5 text-left border font-normal">Hours</th>
                                                          <th className="px-0.5 py-0.5 text-left border font-normal">Slot</th>
                                                          <th className="px-0.5 py-0.5 text-left border font-normal">Timing</th>
                                                          <th className="px-0.5 py-0.5 text-left border font-normal">Domain</th>
                                                          <th className="px-0.5 py-0.5 text-left border font-normal">Cost</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody>
                                                        {(trainer.activeDates || []).map((date, didx) => {
                                                          const hours = trainer.dailyHours?.[didx] || 0;
                                                          const slot = trainer.slotInfo?.[didx]?.slot || trainer.dayDuration || "-";
                                                          const timing = getTimingForSlot(slot, phaseData);
                                                          const cost = (trainer.perHourCost || 0) * hours;
                                                          const domain = trainer.slotInfo?.[didx]?.domain || domainInfo.domain;

                                                          return (
                                                            <tr key={didx}>
                                                              <td className="px-0.5 py-0.5 border">{formatDate(date)}</td>
                                                              <td className="px-0.5 py-0.5 border">{hours}</td>
                                                              <td className="px-0.5 py-0.5 border">{slot}</td>
                                                              <td className="px-0.5 py-0.5 border">{timing}</td>
                                                              <td className="px-0.5 py-0.5 border">{domain}</td>
                                                              <td className="px-0.5 py-0.5 border">
                                                                {cost > 0 ? `₹${cost}` : "-"}
                                                              </td>
                                                            </tr>
                                                          );
                                                        })}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                )}
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
    </div>
  );
}

export default InitiationTrainingDetails;
