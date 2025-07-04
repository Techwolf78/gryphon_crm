import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import TrainingTable from "../components/Learning/TrainingTables/TrainingTable";
import TrainingDetailModal from "../components/Learning/TrainingTables/TrainingDetailModal";
import FilePreviewModal from "../components/Learning/TrainingTables/FilePreviewModal";
import StudentDataPage from "../components/Learning/StudentDataPage";  // Correct import path

function LearningDevelopment() {
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileType, setFileType] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [modalTrainingId, setModalTrainingId] = useState(null);
  const [studentPageData, setStudentPageData] = useState(null);

  const fetchTrainings = async () => {
    const snapshot = await getDocs(collection(db, "trainingForms"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setTrainings(data);
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  const handleViewStudentData = (item) => {
    if (!item.studentFileUrl) return alert("No student file available.");
    setStudentPageData({ fileUrl: item.studentFileUrl, trainingId: item.id });
  };

  const handleViewMouFile = (item) => {
    if (!item.mouFileUrl) return alert("No MOU file available.");
    setFileType("mou");
    setFileUrl(item.mouFileUrl);
    setModalTrainingId(null);
    setShowFileModal(true);
  };

  return (
    <>
      {/* Student Data Full Page View */}
      {studentPageData ? (
        <StudentDataPage
          fileUrl={studentPageData.fileUrl}
          trainingId={studentPageData.trainingId}
          onBack={() => setStudentPageData(null)}
        />
      ) : (
        <div className="p-6 bg-gray-50 min-h-screen">
          <h1 className="text-3xl font-bold mb-6 text-blue-800">
            Training Onboarding Submissions
          </h1>

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

          {/* MOU File Preview */}
          {showFileModal && fileType === "mou" && (
            <FilePreviewModal
              fileUrl={fileUrl}
              type={fileType}
              trainingId={modalTrainingId}
              onClose={() => setShowFileModal(false)}
            />
          )}
        </div>
      )}
    </>
  );
}

export default LearningDevelopment;
