import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import { FiPlay, FiEdit } from "react-icons/fi";

const PHASE_LABELS = {
  "phase-1": "Phase 1",
  "phase-2": "Phase 2",
  "phase-3": "Phase 3"
};

// Helper to group trainings by college
function groupByCollege(trainings) {
  const map = {};
  trainings.forEach(t => {
    const key = `${t.collegeName} (${t.collegeCode})`;
    if (!map[key]) map[key] = [];
    map[key].push(t);
  });
  return map;
}

const Dashboard = ({ onRowClick, onStartPhase }) => {
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
          
          // Get domains count and summary info
          const domainsSnap = await getDocs(collection(db, "trainingForms", formDoc.id, "trainings", phaseDoc.id, "domains"));
          const domains = [];
          let totalBatches = 0;
          
          domainsSnap.forEach(domainDoc => {
            const domainData = domainDoc.data();
            domains.push(domainData.domain || domainDoc.id);
            if (domainData.table1Data) {
              totalBatches += domainData.table1Data.length;
            }
          });
          
          allTrainings.push({
            id: `${formDoc.id}_${phaseDoc.id}`,
            trainingId: formDoc.id,
            phaseId: phaseDoc.id,
            collegeName: formData.collegeName,
            collegeCode: formData.collegeCode,
            domain: domains.join(", ") || "-",
            domainsCount: domains.length,
            table1Data: Array(totalBatches).fill({}), // For batch count display
            ...phaseData,
            // Include original form data for phase initiation
            originalFormData: formData
          });
        }
      }
      setTrainings(allTrainings);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Group trainings by college
  const grouped = groupByCollege(trainings);

  const handleStartPhase = (e, training) => {
    e.stopPropagation(); // Prevent row click
    
    // Prepare training data for InitiationModal
    const trainingForModal = {
      id: training.trainingId,
      selectedPhase: training.phaseId,
      collegeName: training.collegeName,
      collegeCode: training.collegeCode,
      ...training.originalFormData
    };
    
    if (onStartPhase) {
      onStartPhase(trainingForModal);
    }
  };

  // Edit button handler - reopens initiation modal in edit mode for the specific phase
  const handleEditPhase = (e, training) => {
    e.stopPropagation();
    const trainingForModal = {
      id: training.trainingId,
      selectedPhase: training.phaseId,
      collegeName: training.collegeName,
      collegeCode: training.collegeCode,
      ...training.originalFormData,
      isEdit: true, // optional flag consumers can use to open modal in edit mode
    };
    if (onStartPhase) onStartPhase(trainingForModal);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 px-4">
      {loading ? (
        <div className="py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([college, phases]) => (
            <div key={college} className="bg-white rounded-xl shadow border border-gray-200">
              <div className="bg-indigo-600 rounded-t-xl px-6 py-4">
                <h2 className="text-lg font-bold text-white">{college}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Phase</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Domain</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Start Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">End Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Batches</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {phases.map((t) => {
                      const canEdit = t.domainsCount > 0 || t.isEdit === true; // adjust condition or add role check as needed
                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-indigo-50 cursor-pointer transition"
                          onClick={() =>
                            onRowClick &&
                            onRowClick({ 
                              ...t, 
                              id: t.trainingId,
                              selectedPhase: t.phaseId
                            })
                          }
                        >
                          <td className="px-4 py-3">{PHASE_LABELS[t.phaseId] || t.phaseId}</td>
                          <td className="px-4 py-3">{t.domain || "-"}</td>
                          <td className="px-4 py-3">{t.trainingStartDate || "-"}</td>
                          <td className="px-4 py-3">{t.trainingEndDate || "-"}</td>
                          <td className="px-4 py-3">{t.table1Data ? t.table1Data.length : 0}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {t.domainsCount === 0 ? (
                                <button
                                  onClick={(e) => handleStartPhase(e, t)}
                                  className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                                  title={`Start ${PHASE_LABELS[t.phaseId] || t.phaseId}`}
                                >
                                  <FiPlay className="w-3 h-3 mr-1" />
                                  Start {PHASE_LABELS[t.phaseId]?.replace('Phase ', '') || t.phaseId.replace('phase-', '')}
                                </button>
                              ) : (
                                <span className="text-indigo-600 hover:text-indigo-800 cursor-pointer">
                                  View
                                </span>
                              )}

                              {/* show Edit only when allowed */}
                              {canEdit && (
                                <button
                                  onClick={(e) => handleEditPhase(e, t)}
                                  className="inline-flex items-center px-3 py-1.5 bg-yellow-500 text-white text-xs font-medium rounded-md hover:bg-yellow-600 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1"
                                  title={`Edit ${PHASE_LABELS[t.phaseId] || t.phaseId}`}
                                >
                                  <FiEdit className="w-3 h-3 mr-1" />
                                  Edit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {trainings.length === 0 && (
            <div className="py-8 text-gray-400 bg-white rounded-xl shadow border border-gray-200">
              No trainings found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;