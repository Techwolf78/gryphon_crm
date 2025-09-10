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
  const [selectedInitiationTraining, setSelectedInitiationTraining] =
    useState(null);
  const [showInitiationModal, setShowInitiationModal] = useState(false);
  const [selectedTrainingForInitiation, setSelectedTrainingForInitiation] =
    useState(null);

  const navigate = useNavigate();

  // Calculate active tab index for sliding indicator
  const getActiveTabIndex = () => {
    switch (activeTab) {
      case "newContact": return 0;
      case "initiation": return 1;
      case "trainerInvoice": return 2;
      default: return 0;
    }
  };

  const fetchTrainings = async () => {
    try {
      setError(null);

      const q = query(
        collection(db, "trainingForms"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const data = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const trainingData = { id: doc.id, ...doc.data() };

          // Check if training has been initiated by looking for phases
          try {
            const trainingsSnap = await getDocs(
              collection(db, "trainingForms", doc.id, "trainings")
            );
            trainingData.isInitiated = !trainingsSnap.empty;
          } catch (err) {
            console.error("Error checking initiation status:", err);
            trainingData.isInitiated = false;
          }

          return trainingData;
        })
      );

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
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-3xl font-bold text-blue-800">
            Training Dashboard
          </h1>
          <button
            onClick={handleViewTrainers}
            className="px-5 py-1.5 bg-black text-white font-medium rounded-full shadow-md hover:bg-gray-800 hover:shadow-lg transform hover:scale-105 transition-all duration-200 border border-gray-300"
          >
            View Trainers
          </button>
        </div>

        {/* Enhanced Tab Navigation with Sliding Indicator */}
        <div className="relative mb-4">
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 px-6 py-3 font-medium text-sm transition-all duration-150 ${
                activeTab === "newContact"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("newContact")}
            >
              New Contract ({trainings.length})
            </button>
            <button
              className={`flex-1 px-6 py-3 font-medium text-sm transition-all duration-150 ${
                activeTab === "initiation"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("initiation")}
            >
              Trainings
            </button>
            <button
              className={`flex-1 px-6 py-3 font-medium text-sm transition-all duration-150 ${
                activeTab === "trainerInvoice"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("trainerInvoice")}
            >
              Trainer Invoice
            </button>
          </div>
          {/* Sliding Indicator */}
          <div
            className="absolute bottom-0 h-0.5 bg-blue-600 transition-transform duration-150 ease-out"
            style={{
              width: '33.333%',
              transform: `translateX(${getActiveTabIndex() * 100}%)`,
            }}
          ></div>
        </div>

        {error && (
          <div className="mb-2 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
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
        ) : null}
      </div>
    </>
  );
}

export default LearningDevelopment;
