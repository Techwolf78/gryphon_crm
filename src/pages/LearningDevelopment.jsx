import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import TrainingTable from "../components/Learning/TrainingTables/TrainingTable";
import TrainingDetailModal from "../components/Learning/TrainingTables/TrainingDetailModal";
import FilePreviewModal from "../components/Learning/TrainingTables/FilePreviewModal";
import StudentDataPage from "../components/Learning/StudentDataPage";
import AddTrainer from "../components/Learning/AddTrainer"; // Add this import

function LearningDevelopment() {
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileType, setFileType] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [modalTrainingId, setModalTrainingId] = useState(null);
  const [studentPageData, setStudentPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddTrainer, setShowAddTrainer] = useState(false); // Add this state

 const handleTrainerAdded = () => {
    // You can add a toast notification here or refresh trainers list if needed
    console.log("Trainer added successfully");
  };

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add query with ordering if needed
      const q = query(
        collection(db, "trainingForms"),
        orderBy("createdAt", "desc") // assuming you have a createdAt field
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      setTrainings(data);
    } catch (err) {
      console.error("Error fetching trainings:", err);
      setError("Failed to load training data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  const handleViewStudentData = (item) => {
    if (!item.studentFileUrl) {
      alert("No student file available.");
      return;
    }
    setStudentPageData({ 
      fileUrl: item.studentFileUrl, 
      trainingId: item.id,
      trainingName: item.trainingName || "Training" // Add fallback name
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

  const handleRefresh = () => {
    fetchTrainings();
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-800">
          Training Onboarding Submissions
        </h1>
        <button
          onClick={() => setShowAddTrainer(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Add Trainer
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

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <TrainingTable
            trainingData={trainings}
            onRowClick={setSelectedTraining}
            onViewStudentData={handleViewStudentData}
            onViewMouFile={handleViewMouFile}
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
      )}

      {showAddTrainer && (
        <AddTrainer
          onClose={() => setShowAddTrainer(false)}
          onTrainerAdded={handleTrainerAdded}
        />
      )}
    </div>
  );
}

export default LearningDevelopment;