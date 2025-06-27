import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import TrainingTable from "../components/Learning/TrainingTable";
import TrainingDetailModal from "../components/Learning/TrainingDetailModal";

function LearningDevelopment() {
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);

  useEffect(() => {
    const fetchTrainings = async () => {
      const snapshot = await getDocs(collection(db, "trainingForms"));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrainings(data);
    };

    fetchTrainings();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-blue-900">Training Onboarding Submissions</h1>

      <TrainingTable trainingData={trainings} onRowClick={setSelectedTraining} />

      {selectedTraining && (
        <TrainingDetailModal
          training={selectedTraining}
          onClose={() => setSelectedTraining(null)}
        />
      )}
    </div>
  );
}

export default LearningDevelopment;
