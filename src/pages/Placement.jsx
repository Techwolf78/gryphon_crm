import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import StudentListModal from "../components/Placement/StudentListModal";
import AddJD from "../components/Placement/AddJd/AddJD";
import CompanyOpen from "../components/Placement/CompanyOpen/CompanyOpen";
import CompanyLeads from "../components/Placement/CompanyLeads/CompanyLeads";
import MouPreviewModal from "../components/Placement/MouPreviewModal";
import PlacementDetailsModal from "../components/Placement/PlacementDetailsModal";

function Placement() {
  const [trainingData, setTrainingData] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [studentModalData, setStudentModalData] = useState({
    show: false,
    students: [],
  });
  const [showJDForm, setShowJDForm] = useState(false);
  const [viewMode, setViewMode] = useState("training");
  const [mouPreview, setMouPreview] = useState({
    show: false,
    url: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentError, setStudentError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const trainingSnapshot = await getDocs(collection(db, "placementData"));
      const trainingData = trainingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTrainingData(trainingData);

      const leadsSnapshot = await getDocs(collection(db, "leads"));
      const leadsData = leadsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLeads(leadsData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchStudentData = useCallback(async (trainingDocId) => {
    try {
      setStudentError(null);
      const studentsSnapshot = await getDocs(
        collection(db, "placementData", trainingDocId, "students")
      );
      const students = studentsSnapshot.docs.map((doc) => doc.data());
      setStudentModalData({ show: true, students });
    } catch (err) {
      console.error("Error fetching students:", err);
      setStudentError("Failed to load student data.");
    }
  }, []);

  return (
    <div className="p-2">
      <h2 className="text-2xl font-bold mb-1 text-blue-800">
        Placement Management
      </h2>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">{error}</p>
          <button onClick={fetchData} className="mt-2 text-red-500 hover:text-red-700 font-medium">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex mb-3 border-b">
            <button
              className={`px-4 py-2 font-medium ${
                viewMode === "training"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setViewMode("training")}
            >
              Training Data
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                viewMode === "placement"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setViewMode("placement")}
            >
              Placement Stats
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                viewMode === "leads"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setViewMode("leads")}
            >
              Company Leads
            </button>
          </div>

          {viewMode === "training" && (
            <>
              {trainingData.length === 0 ? (
                <p>No training data found.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-300 rounded">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 border">Project Code</th>
                        <th className="p-2 border">College</th>
                        <th className="p-2 border">Course</th>
                        <th className="p-2 border">Year</th>
                        <th className="p-2 border">Delivery Type</th>
                        <th className="p-2 border">Total Students</th>
                        <th className="p-2 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainingData.map((item) => (
                        <tr key={item.id} className="odd:bg-white even:bg-gray-50">
                          <td className="p-2 border">{item.projectCode}</td>
                          <td className="p-2 border">{item.collegeName}</td>
                          <td className="p-2 border">{item.course}</td>
                          <td className="p-2 border">{item.year}</td>
                          <td className="p-2 border">{item.deliveryType}</td>
                          <td className="p-2 border">{item.studentCount}</td>
                          <td className="p-2 border space-x-2">
                            <button
                              onClick={() => setSelectedTraining(item)}
                              className="px-2 py-1 bg-blue-500 text-white rounded"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => fetchStudentData(item.id)}
                              className="px-2 py-1 bg-indigo-500 text-white rounded"
                            >
                              Student Data
                            </button>
                            <button
                              onClick={() => setMouPreview({ show: true, url: item.mouFileUrl })}
                              className="px-2 py-1 bg-green-600 text-white rounded"
                              disabled={!item.mouFileUrl}
                            >
                              MOU File
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {viewMode === "placement" && <CompanyOpen />}
          {viewMode === "leads" && (
            <CompanyLeads
              leads={leads}
              onLeadSelect={(lead) => {
                setSelectedLead(lead);
                setViewMode("placement");
              }}
            />
          )}

          {selectedTraining && (
            <PlacementDetailsModal
              training={selectedTraining}
              onClose={() => setSelectedTraining(null)}
            />
          )}

          {studentModalData.show && (
            <StudentListModal
              students={studentModalData.students}
              onClose={() => setStudentModalData({ show: false, students: [] })}
              error={studentError}
            />
          )}

          {showJDForm && (
            <AddJD show={showJDForm} onClose={() => setShowJDForm(false)} />
          )}

          {selectedLead && (
            <CompanyOpen
              selectedLead={selectedLead}
              onClose={() => setSelectedLead(null)}
              onAddJD={(leadId, jdData) => {
                setLeads(
                  leads.map((lead) =>
                    lead.id === leadId
                      ? { ...lead, jds: [...(lead.jds || []), jdData] }
                      : lead
                  )
                );
              }}
            />
          )}

          {/* MOU Preview Modal - Correctly placed at the bottom */}
          {mouPreview.show && (
            <MouPreviewModal
              show={mouPreview.show}
              onClose={() => setMouPreview({ show: false, url: null })}
              mouFileUrl={mouPreview.url}
            />
          )}
        </>
      )}
    </div>
  );
}

export default Placement;
