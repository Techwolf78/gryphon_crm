import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { FiChevronDown, FiChevronUp, FiUser, FiClock, FiUsers, FiBookOpen, FiLayers } from "react-icons/fi";

const PHASE_LABELS = {
  "phase-1": "Phase 1",
  "phase-2": "Phase 2",
  "phase-3": "Phase 3"
};

const Dashboard = ({ onRowClick }) => {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all trainingForms and their phases
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const formsSnap = await getDocs(collection(db, "trainingForms"));
      const allTrainings = [];

      for (const formDoc of formsSnap.docs) {
        const formData = formDoc.data();
        const phasesSnap = await getDocs(collection(db, "trainingForms", formDoc.id, "trainings"));
        for (const phaseDoc of phasesSnap.docs) {
          const phaseData = phaseDoc.data();
          allTrainings.push({
            id: `${formDoc.id}_${phaseDoc.id}`,
            trainingId: formDoc.id,
            phaseId: phaseDoc.id,
            collegeName: formData.collegeName,
            collegeCode: formData.collegeCode,
            ...phaseData
          });
        }
      }
      setTrainings(allTrainings);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Training Initiation Dashboard</h1>
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">College</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Phase</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Domain</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Start Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">End Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Batches</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {trainings.map((t, idx) => (
                <tr
                  key={t.id}
                  className="hover:bg-indigo-50 cursor-pointer transition"
                  onClick={() => onRowClick && onRowClick(t)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{t.collegeName} <span className="text-xs text-gray-400">({t.collegeCode})</span></td>
                  <td className="px-4 py-3">{PHASE_LABELS[t.phaseId] || t.phaseId}</td>
                  <td className="px-4 py-3">{t.domain || "-"}</td>
                  <td className="px-4 py-3">{t.trainingStartDate || "-"}</td>
                  <td className="px-4 py-3">{t.trainingEndDate || "-"}</td>
                  <td className="px-4 py-3">{t.table1Data ? t.table1Data.length : 0}</td>
                  <td className="px-4 py-3 text-indigo-600 flex items-center">
                    View
                  </td>
                </tr>
              ))}
              {trainings.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">No trainings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Details panel for a single training phase
function TrainingDetailsPanel({ training }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-indigo-700 mb-1">
          {training.collegeName} ({training.collegeCode}) - {training.domain || "No Domain"}
        </h2>
        <div className="text-gray-600 text-sm mb-2">
          <span className="mr-4"><FiClock className="inline mr-1" />{training.trainingStartDate} to {training.trainingEndDate}</span>
          {training.details && <span className="ml-4">{training.details}</span>}
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span><FiLayers className="inline mr-1" />Phase: {PHASE_LABELS[training.phaseId] || training.phaseId}</span>
          <span><FiBookOpen className="inline mr-1" />Domain Hours: {training.domainHours || "-"}</span>
          {training.phase2Dates && (
            <span>
              Phase 2: {training.phase2Dates.startDate} to {training.phase2Dates.endDate}
            </span>
          )}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-gray-800 mb-2">Batches & Trainers</h3>
        {Array.isArray(training.table1Data) && training.table1Data.length > 0 ? (
          <div className="space-y-6">
            {training.table1Data.map((row, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-gray-200 shadow p-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">{idx + 1}</div>
                  <div>
                    <div className="font-medium text-gray-900">{row.batch}</div>
                    <div className="text-xs text-gray-500">{row.stdCount} students • {row.hrs} hours</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {row.batches && row.batches.map((batch, bidx) => (
                    <div key={bidx} className="border rounded p-3 mb-2 bg-gray-50">
                      <div className="flex flex-wrap gap-4 items-center mb-2">
                        <span className="text-xs font-semibold text-gray-700">Batch Code: {batch.batchCode}</span>
                        <span className="text-xs text-gray-600">Students: {batch.batchPerStdCount || 0}</span>
                        <span className="text-xs text-gray-600">Assigned Hours: {batch.assignedHours || 0}</span>
                        {batch.isMerged && (
                          <span className="text-xs text-rose-600 font-semibold">Merged: {batch.mergedFrom}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-gray-700 mb-1">Trainers:</div>
                        {batch.trainers && batch.trainers.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {batch.trainers.map((trainer, tidx) => (
                              <div key={tidx} className="bg-white border rounded p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <FiUser className="text-indigo-500" />
                                  <span className="font-medium">{trainer.trainerName || "Unassigned"}</span>
                                  <span className="text-xs text-gray-500 ml-2">{trainer.trainerId}</span>
                                </div>
                                <div className="text-xs text-gray-600 mb-1">
                                  {trainer.dayDuration && <span className="mr-2">Duration: {trainer.dayDuration}</span>}
                                  {trainer.startDate && <span className="mr-2">From: {trainer.startDate}</span>}
                                  {trainer.endDate && <span>To: {trainer.endDate}</span>}
                                </div>
                                <div className="text-xs text-gray-600 mb-1">
                                  Assigned Hours: <span className="font-semibold">{trainer.assignedHours || 0}</span>
                                </div>
                                {trainer.dailyHours && trainer.dailyHours.length > 0 && (
                                  <div className="mt-1">
                                    <div className="font-semibold text-xs text-gray-700 mb-1">Daily Hours:</div>
                                    <div className="flex flex-wrap gap-2">
                                      {(trainer.activeDates || []).map((date, didx) => (
                                        <span key={didx} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs">
                                          {typeof date === "string" ? date : (date?.toDateString?.() || "")}: {trainer.dailyHours[didx] || 0}h
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">No trainers assigned</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-sm">No batch data available.</div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;