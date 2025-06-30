import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import TrainingTable from "../components/Learning/TrainingTable";
import TrainingDetailModal from "../components/Learning/TrainingDetailModal";
import FilePreviewModal from "../components/Learning/FilePreviewModal";
 
function LearningDevelopment() {
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileType, setFileType] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [modalTrainingId, setModalTrainingId] = useState(null); // <-- new state for training id in modal
 
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
  setFileType("student");
  setFileUrl(item.studentFileUrl);
  setModalTrainingId(item.id);
  setShowFileModal(true);
};
  const handleViewMouFile = (item) => {
    if (!item.mouFileUrl) return alert("No MOU file available.");
    setFileType("mou");
    setFileUrl(item.mouFileUrl);
    setModalTrainingId(null); // no need trainingId for MOU
    setShowFileModal(true);
  };
 
  return (
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
 
      {showFileModal && (
  <FilePreviewModal
    fileUrl={fileUrl}
    type={fileType}
    trainingId={modalTrainingId} // this is important for Firestore CRUD
    onClose={() => setShowFileModal(false)}
  />
      )}
    </div>
  );
}
 
export default LearningDevelopment;
 
 