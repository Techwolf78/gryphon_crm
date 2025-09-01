import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import TrainingTable from "../components/Learning/TrainingTables/TrainingTable";
import TrainingDetailModal from "../components/Learning/TrainingTables/TrainingDetailModal";
import FilePreviewModal from "../components/Learning/TrainingTables/FilePreviewModal";
import StudentDataPage from "../components/Learning/StudentDataPage";
import InitiationDashboard from "../components/Learning/Initiate/InitiationDashboard";
import InitiationTrainingDetails from "../components/Learning/Initiate/InitiationTrainingDetails";
import InitiationModal from "../components/Learning/Initiate/InitiationModal";
import GenerateTrainerInvoice from "../components/Learning/GenerateTrainerInvoice";

import { useNavigate } from "react-router-dom";

function LearningDevelopment() {
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileType, setFileType] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [modalTrainingId, setModalTrainingId] = useState(null);
  const [studentPageData, setStudentPageData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem("ld_activeTab") || "newContact";
    } catch {
      return "newContact";
    }
  });
  const [selectedInitiationTraining, setSelectedInitiationTraining] = useState(null);
  const [showInitiationModal, setShowInitiationModal] = useState(false);
  const [selectedTrainingForInitiation, setSelectedTrainingForInitiation] = useState(null);

  const navigate = useNavigate();

  const fetchTrainings = async () => {
    try {
      setError(null);

      const q = query(
        collection(db, "trainingForms"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTrainings(data);
    } catch (err) {
      console.error("Error fetching trainings:", err);
      setError("Failed to load training data. Please try again.");
    }
  };

  useEffect(() => {
    if (activeTab === "newContact") {
      fetchTrainings();
    }
  }, [activeTab]);

  // Persist active tab so it survives reloads
  useEffect(() => {
    try {
      localStorage.setItem("ld_activeTab", activeTab);
    } catch {
      // ignore storage errors
    }
  }, [activeTab]);

  const handleViewStudentData = (item) => {
    if (!item.studentFileUrl) {
      alert("No student file available.");
      return;
    }
    setStudentPageData({
      fileUrl: item.studentFileUrl,
      trainingId: item.id,
      trainingName: item.trainingName || "Training",
    });
  };

  const handleViewMouFile = (item) => {
    if (!item.mouFileUrl) {
      alert("No MOU file available.");
      return;
    }
    setFileType("mou");
    setFileUrl(item.mouFileUrl);
    setModalTrainingId(item.id);
    setShowFileModal(true);
  };

  const handleViewTrainers = () => {
    navigate("trainers");
  };

  // When Initiation button is clicked from TrainingTable
  const handleInitiateClick = (training) => {
    setSelectedTrainingForInitiation(training);
    setShowInitiationModal(true);
  };

  // NEW: Handle "Start Phase" button click from InitiationDashboard
  const handleStartPhase = (training) => {
    setSelectedTrainingForInitiation(training);
    setShowInitiationModal(true);
  };

  // NEW: Handle closing InitiationModal and refresh dashboard
  const handleInitiationModalClose = () => {
    setShowInitiationModal(false);
    setSelectedTrainingForInitiation(null);
    // Optionally refresh the dashboard data here if needed
  };

  if (studentPageData) {
    return (
      <StudentDataPage
        fileUrl={studentPageData.fileUrl}
        trainingId={studentPageData.trainingId}
        trainingName={studentPageData.trainingName}
        onBack={() => setStudentPageData(null)}
      />
    );
  }

  if (showInitiationModal && selectedTrainingForInitiation) {
    return (
      <InitiationModal
        training={selectedTrainingForInitiation}
        onClose={handleInitiationModalClose}
        onConfirm={handleInitiationModalClose}
      />
    );
  }

  return (
    <>
      <div className="bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-blue-800">
            Training Onboarding
          </h1>
          <button
            onClick={handleViewTrainers}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            View Trainers
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 border-b">
          <button
            className={`px-4 py-2 font-medium ${activeTab === "newContact"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
              }`}
            onClick={() => setActiveTab("newContact")}
          >
            New Contract ({trainings.length})
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === "initiation"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
              }`}
            onClick={() => setActiveTab("initiation")}
          >
            Initiation
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === "trainerInvoice"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
              }`}
            onClick={() => setActiveTab("trainerInvoice")}
          >
            Trainer Invoice
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            {error}
            <button
              onClick={fetchTrainings}
              className="ml-4 text-blue-600 hover:text-blue-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "newContact" ? (
          <>
            <TrainingTable
              trainingData={trainings}
              onRowClick={setSelectedTraining}
              onViewStudentData={handleViewStudentData}
              onViewMouFile={handleViewMouFile}
              onInitiate={handleInitiateClick}
            />

            {selectedTraining && (
              <TrainingDetailModal
                training={selectedTraining}
                onClose={() => setSelectedTraining(null)}
              />
            )}

            {showFileModal && fileType === "mou" && (
              <FilePreviewModal
                fileUrl={fileUrl}
                type={fileType}
                trainingId={modalTrainingId}
                onClose={() => setShowFileModal(false)}
              />
            )}
          </>
        ) : activeTab === "initiation" ? (
          selectedInitiationTraining ? (
            <InitiationTrainingDetails
              training={selectedInitiationTraining}
              onBack={() => setSelectedInitiationTraining(null)}
            />
          ) : (
            <InitiationDashboard 
              onRowClick={setSelectedInitiationTraining}
              onStartPhase={handleStartPhase} // ADD this prop
            />
          )
        ) : activeTab === "trainerInvoice" ? (
          <GenerateTrainerInvoice />
        ) : null }
      </div>
    </>
  );
}

export default LearningDevelopment;