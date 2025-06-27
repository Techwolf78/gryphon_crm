import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import TrainingDetailModal from "../components/Learning/TrainingDetailModal";
import FilePreviewModal from "../components/Learning/FilePreviewModal";

function Placement() {
  const [trainingData, setTrainingData] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [fileModalData, setFileModalData] = useState({
    show: false,
    fileUrl: "",
    type: "",
  });

  const fetchTrainingData = async () => {
    try {
      const snapshot = await getDocs(collection(db, "trainingForms"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTrainingData(data);
    } catch (err) {
      console.error("Error fetching training data:", err);
    }
  };

  useEffect(() => {
    fetchTrainingData();
  }, []);

  const openFilePreview = (fileUrl, type) => {
    if (!fileUrl) return alert("File not available.");
    setFileModalData({
      show: true,
      fileUrl,
      type,
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-blue-800">Training & Closure Details (Placement View)</h2>

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
    </div>
  );
}

export default Placement;
