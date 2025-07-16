import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import AddTrainer from "./AddTrainer.jsx";
import EditTrainer from "./EditTrainer.jsx";
import DeleteTrainer from "./DeleteTrainer.jsx";
import { FiPlus, FiEdit, FiTrash2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

function TrainersDashboard() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddTrainer, setShowAddTrainer] = useState(false);
  const [showEditTrainer, setShowEditTrainer] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteTrainer, setShowDeleteTrainer] = useState(false);
  const [trainerToDelete, setTrainerToDelete] = useState(null);
  const navigate = useNavigate();

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      setError(null);

      const q = query(
        collection(db, "trainers"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setTrainers(data);
    } catch (err) {
      console.error("Error fetching trainers:", err);
      setError("Failed to load trainer data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const filteredTrainers = trainers.filter(trainer =>
    (trainer.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (trainer.trainerId?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (trainer.domain?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const handleTrainerAdded = () => {
    fetchTrainers();
    setShowAddTrainer(false);
  };

  const handleTrainerUpdated = () => {
    fetchTrainers();
    setShowEditTrainer(false);
  };

  const handleEditTrainer = (trainer) => {
    setSelectedTrainer(trainer);
    setShowEditTrainer(true);
  };

  const handleDeleteTrainer = (trainer) => {
    setTrainerToDelete(trainer);
    setShowDeleteTrainer(true);
  };

  const handleTrainerDeleted = () => {
    fetchTrainers();
    setShowDeleteTrainer(false);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-800">Trainers Management</h1>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Back
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search trainers..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => setShowAddTrainer(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FiPlus className="mr-2" />
            Add Trainer
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charges</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrainers.map((trainer) => (
                  <tr key={trainer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trainer.trainerId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trainer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trainer.contact}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trainer.domain}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trainer.specialization}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{trainer.charges ?? "-"} {trainer.paymentType === "Per Hour" ? "/hr" : trainer.paymentType === "Per Day" ? "/day" : ""}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        onClick={() => handleEditTrainer(trainer)}
                      >
                        <FiEdit />
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteTrainer(trainer)}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {showAddTrainer && (
              <AddTrainer
                onClose={() => setShowAddTrainer(false)}
                onTrainerAdded={handleTrainerAdded}
              />
            )}

            {showEditTrainer && selectedTrainer && (
              <EditTrainer
                trainerId={selectedTrainer.id}
                onClose={() => setShowEditTrainer(false)}
                onTrainerUpdated={handleTrainerUpdated}
              />
            )}

            {showDeleteTrainer && trainerToDelete && (
              <DeleteTrainer
                trainerId={trainerToDelete.id}
                trainerName={trainerToDelete.name}
                onClose={() => setShowDeleteTrainer(false)}
                onTrainerDeleted={handleTrainerDeleted}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TrainersDashboard;