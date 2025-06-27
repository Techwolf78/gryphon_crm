import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import TrainingDetailModal from "../Learning/TrainingDetailModal";
import StudentDataModal from "../Learning/StudentDataModal";
import MOUFileModal from "../Learning/MOUFileModal";

function PlacementTeamTrainingList() {
  const [trainingData, setTrainingData] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showMouModal, setShowMouModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "trainingForms"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrainingData(data);
    };
    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-blue-800">All Trainings (Placement Team)</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Project Code</th>
              <th className="p-2 border">College</th>
              <th className="p-2 border">Course</th>
              <th className="p-2 border">Year</th>
              <th className="p-2 border">Delivery Type</th>
              <th className="p-2 border">Total Students</th>
              <th className="p-2 border">Total Cost</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trainingData.map((training) => (
              <tr key={training.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 border">{training.projectCode}</td>
                <td className="p-2 border">{training.collegeName}</td>
                <td className="p-2 border">{training.course}</td>
                <td className="p-2 border">{training.year}</td>
                <td className="p-2 border">{training.deliveryType}</td>
                <td className="p-2 border">{training.studentCount}</td>
                <td className="p-2 border">₹{training.totalCost}</td>
                <td className="p-2 border space-x-2">
                  <button onClick={() => setSelectedTraining(training)} className="text-blue-600 hover:underline">View Details</button>
                  <button onClick={() => setShowStudentModal(training)} disabled={!training.studentFileUrl} className="text-green-600 hover:underline">Student Data</button>
                  <button onClick={() => setShowMouModal(training)} disabled={!training.mouFileUrl} className="text-purple-600 hover:underline">MOU</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTraining && (
        <TrainingDetailModal
          training={selectedTraining}
          onClose={() => setSelectedTraining(null)}
        />
      )}

      {showStudentModal && (
        <StudentDataModal
          fileUrl={showStudentModal.studentFileUrl}
          onClose={() => setShowStudentModal(false)}
        />
      )}

      {showMouModal && (
        <MOUFileModal
          fileUrl={showMouModal.mouFileUrl}
          onClose={() => setShowMouModal(false)}
        />
      )}
    </div>
  );
}

export default PlacementTeamTrainingList;
