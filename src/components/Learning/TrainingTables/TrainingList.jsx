import React, { useState } from "react";
import TrainingTable from "../TrainingTables/TrainingTable";
import TrainingDetailModal from "../TrainingTables/TrainingDetailModal";
import FilePreviewModal from "../TrainingTables/FilePreviewModal";

function TrainingList({ trainingData }) {
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [fileModalData, setFileModalData] = useState({
    show: false,
    fileUrl: "",
    type: "",
  });
  const [mouPageUrl, setMouPageUrl] = useState(null); // NEW state for full-page MOU

  const openFilePreview = (fileUrl, type) => {
    if (!fileUrl) return alert("File not available.");

    if (type === "mou") {
      setMouPageUrl(fileUrl); // Open MOU in full-page view
    } else {
      setFileModalData({
        show: true,
        fileUrl,
        type,
      });
    }
  };

  return (
    <>
      {mouPageUrl ? (
        <div className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setMouPageUrl(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ← Back
            </button>
            <h2 className="text-xl font-semibold text-blue-800">MOU File</h2>
          </div>

          <div className="flex-1 overflow-auto border rounded shadow mt-4">
            <iframe
              src={mouPageUrl}
              title="MOU File"
              className="w-full h-[80vh] rounded"
            />
          </div>
        </div>
      ) : (
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
              onClose={() =>
                setFileModalData({ show: false, fileUrl: "", type: "" })
              }
            />
          )}
        </>
      )}
    </>
  );
}

export default TrainingList;
