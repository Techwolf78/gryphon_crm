import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";


const PHASE_LABELS = {
  "phase-1": "Phase 1",
  "phase-2": "Phase 2",
  "phase-3": "Phase 3"
};

// Format date into dd/mm/yyyy
const formatDate = (dateValue) => {
  if (!dateValue) return "-";

  let dateObj;
  // Firestore Timestamp
  if (dateValue.seconds) {
    dateObj = dateValue.toDate();
  }
  // JS Date object
  else if (dateValue instanceof Date) {
    dateObj = dateValue;
  }
  // String date
  else if (typeof dateValue === "string" || typeof dateValue === "number") {
    dateObj = new Date(dateValue);
  } else {
    return "-";
  }

  if (isNaN(dateObj)) return "-";

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();

  return `${day}/${month}/${year}`;
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
        const phasesSnap = await getDocs(
          collection(db, "trainingForms", formDoc.id, "trainings")
        );
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Training Initiation Dashboard
      </h1>
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  College
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Phase
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Domain
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Start Date
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  End Date
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Batches
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {trainings.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-indigo-50 cursor-pointer transition"
                  onClick={() => onRowClick && onRowClick(t)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {t.collegeName}{" "}
                    <span className="text-xs text-gray-400">
                      ({t.collegeCode})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {PHASE_LABELS[t.phaseId] || t.phaseId}
                  </td>
                  <td className="px-4 py-3">{t.domain || "-"}</td>
                  <td className="px-4 py-3">
                    {formatDate(t.trainingStartDate)}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(t.trainingEndDate)}
                  </td>
                  <td className="px-4 py-3">
                    {t.table1Data ? t.table1Data.length : 0}
                  </td>
                  <td className="px-4 py-3 text-indigo-600 flex items-center">
                    View
                  </td>
                </tr>
              ))}
              {trainings.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-8 text-gray-400"
                  >
                    No trainings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
