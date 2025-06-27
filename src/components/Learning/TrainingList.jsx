import React, { useState } from "react";
import TrainingTable from "./TrainingTable";
import TrainingDetailModal from "./TrainingDetailModal";
import FilePreviewModal from "./FilePreviewModal";

function TrainingList({ trainingData }) {
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [fileModalData, setFileModalData] = useState({
    show: false,
    fileUrl: "",
    type: "",
  });

  const openFilePreview = (fileUrl, type) => {
    if (!fileUrl) return alert("File not available.");
    setFileModalData({
      show: true,
      fileUrl,
      type,
    });
  };

  return (
    <>
      <TrainingTable
        trainingData={trainingData}
        onRowClick={(item) => setSelectedTraining(item)}
        onViewStudentData={(item) => openFilePreview(item.studentFileUrl, "student")}
        onViewMouFile={(item) => openFilePreview(item.mouFileUrl, "mou")}
      />

      {selectedTraining && (
        <TrainingDetailModal
          training={selectedTraining}
          onClose={() => setSelectedTraining(null)}
          openFilePreview={openFilePreview}
        />
      )}

      {fileModalData.show && (
        <FilePreviewModal
          fileUrl={fileModalData.fileUrl}
          type={fileModalData.type}
          onClose={() => setFileModalData({ show: false, fileUrl: "", type: "" })}
        />
      )}
    </>
  );
}

export default TrainingList;
