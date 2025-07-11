import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import TrainingDetailModal from "../components/Learning/TrainingTables/TrainingDetailModal";
import FilePreviewModal from "../components/Learning/TrainingTables/FilePreviewModal";
import AddJD from "../components/Placement/AddJD";
import CompanyOpen from "../components/Placement/CompanyOpen";
import CompanyLeads from "../components/Placement/CompanyLeads";

function Placement() {
  const [trainingData, setTrainingData] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [fileModalData, setFileModalData] = useState({
    show: false,
    fileUrl: "",
    type: "",
  });
  const [showJDForm, setShowJDForm] = useState(false);
  const [viewMode, setViewMode] = useState('training'); // 'training', 'placement', or 'leads'

  const fetchData = async () => {
    try {
      // Fetch training data
      const trainingSnapshot = await getDocs(collection(db, "trainingForms"));
      const trainingData = trainingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTrainingData(trainingData);

      // Fetch leads data
      const leadsSnapshot = await getDocs(collection(db, "leads"));
      const leadsData = leadsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLeads(leadsData);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openFilePreview = (fileUrl, type) => {
    if (!fileUrl) return alert("File not available.");
    setFileModalData({ show: true, fileUrl, type });
  };

  const handleAddJD = (leadId, jdData, selectedColleges) => {
    setLeads(prevLeads => prevLeads.map(lead => {
      if (lead.id === leadId) {
        return {
          ...lead,
          jds: [...(lead.jds || []), {
            ...jdData,
            colleges: selectedColleges,
            createdAt: new Date().toISOString()
          }]
        };
      }
      return lead;
    }));
  };

  return (
    <div className="p-2">
      <h2 className="text-2xl font-bold mb-1 text-blue-800">
        Placement Management
      </h2>

      <div className="flex mb-3 border-b">
        <button
          className={`px-4 py-2 font-medium ${viewMode === 'training' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setViewMode('training')}
        >
          Training Data
        </button>
        <button
          className={`px-4 py-2 font-medium ${viewMode === 'placement' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setViewMode('placement')}
        >
          Placement Stats
        </button>
        <button
          className={`px-4 py-2 font-medium ${viewMode === 'leads' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setViewMode('leads')}
        >
          Company Leads
        </button>
      </div>

      {viewMode === 'training' && (
        <>
          {/* Training Data View */}
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
                          onClick={() => openFilePreview(item.studentFileUrl, "student")}
                          className="px-2 py-1 bg-indigo-500 text-white rounded"
                          disabled={!item.studentFileUrl}
                        >
                          Student Data
                        </button>
                        <button
                          onClick={() => openFilePreview(item.mouFileUrl, "mou")}
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

      {viewMode === 'placement' && (
        <CompanyOpen />
      )}

      {viewMode === 'leads' && (
        <CompanyLeads 
          leads={leads} 
          onLeadSelect={(lead) => {
            setSelectedLead(lead);
            setViewMode('placement');
          }} 
        />
      )}

      {/* Modals */}
      {selectedTraining && (
        <TrainingDetailModal
          training={selectedTraining}
          onClose={() => setSelectedTraining(null)}
        />
      )}
      {fileModalData.show && (
        <FilePreviewModal
          fileUrl={fileModalData.fileUrl}
          type={fileModalData.type}
          onClose={() => setFileModalData({ show: false, fileUrl: "", type: "" })}
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
            setLeads(leads.map(lead => 
              lead.id === leadId 
                ? { ...lead, jds: [...(lead.jds || []), jdData] } 
                : lead
            ));
          }}
        />
      )}
    </div>
  );
}

export default Placement;