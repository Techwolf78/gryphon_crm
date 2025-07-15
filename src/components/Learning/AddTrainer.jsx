// components/Learning/AddTrainer.jsx
import React, { useState, useEffect } from "react";
import { addDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";

function AddTrainer({ onClose, onTrainerAdded }) {
  const [trainerData, setTrainerData] = useState({
    trainerId: "",
    name: "",
    contact: "",
    email: "",
    domain: "Soft Skills",
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifsc: "",
    pan: "",
    aadhar: "",
    bankAddress: "",
    paymentType: "Per Hour",
    charges: "",
    specialization: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Generate next trainer ID
  useEffect(() => {
    const getNextTrainerId = async () => {
      try {
        const q = query(collection(db, "trainers"), orderBy("trainerId", "desc"));
        const snapshot = await getDocs(q);
        const lastId = snapshot.docs[0]?.data()?.trainerId || "GA-T00";
        const nextNum = parseInt(lastId.split("-")[1]) + 1;
        setTrainerData(prev => ({ ...prev, trainerId: `GA-T${nextNum.toString().padStart(2, '0')}` }));
      } catch (err) {
        console.error("Error generating ID:", err);
        setTrainerData(prev => ({ ...prev, trainerId: "GA-T01" }));
      }
    };
    getNextTrainerId();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTrainerData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await addDoc(collection(db, "trainers"), {
        ...trainerData,
        charges: Number(trainerData.charges),
        createdAt: new Date()
      });
      onTrainerAdded();
      onClose();
    } catch (err) {
      console.error("Error adding trainer:", err);
      setError("Failed to add trainer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded p-4 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Add New Trainer</h2>
          <button onClick={onClose} className="text-gray-500">×</button>
        </div>

        {error && <div className="mb-2 p-2 bg-red-100 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label className="block mb-1">Trainer ID</label>
            <input
              type="text"
              value={trainerData.trainerId}
              readOnly
              className="w-full p-1 border bg-gray-100"
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Name*</label>
            <input
              type="text"
              name="name"
              value={trainerData.name}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Contact*</label>
            <input
              type="tel"
              name="contact"
              value={trainerData.contact}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Email*</label>
            <input
              type="email"
              name="email"
              value={trainerData.email}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Domain*</label>
            <select
              name="domain"
              value={trainerData.domain}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            >
              <option value="Soft Skills">Soft Skills</option>
              <option value="Aptitude">Aptitude</option>
              <option value="Technical">Technical</option>
            </select>
          </div>

          <div className="mb-2">
            <label className="block mb-1">Bank Name*</label>
            <input
              type="text"
              name="bankName"
              value={trainerData.bankName}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Account Name*</label>
            <input
              type="text"
              name="accountName"
              value={trainerData.accountName}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Account Number*</label>
            <input
              type="text"
              name="accountNumber"
              value={trainerData.accountNumber}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">IFSC Code*</label>
            <input
              type="text"
              name="ifsc"
              value={trainerData.ifsc}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">PAN*</label>
            <input
              type="text"
              name="pan"
              value={trainerData.pan}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Charges*</label>
            <input
              type="number"
              name="charges"
              value={trainerData.charges}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Payment Type*</label>
            <select
              name="paymentType"
              value={trainerData.paymentType}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            >
              <option value="Per Hour">Per Hour</option>
              <option value="Per Day">Per Day</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-gray-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-blue-500 text-white"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTrainer;