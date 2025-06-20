import React, { useState } from "react";
import stateCityData from "../Sales/stateCityData";
import { auth, db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function AddCollegeModal({ show, onClose }) {
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [pocName, setPocName] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [phase, setPhase] = useState("hot"); // Set default to "hot"

  const handleClose = () => {
    setBusinessName("");
    setAddress("");
    setPocName("");
    setPhoneNo("");
    setEmail("");
    setState("");
    setCity("");
    setPhase("hot"); // Reset to "hot" on close
    onClose();
  };

  const handleAddBusiness = async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in to add a lead.");
      return;
    }

    const timestamp = Date.now();

    const newLead = {
      businessName,
      address,
      pocName,
      phoneNo,
      email,
      state,
      city,
      phase: phase || "hot", // Fallback to "hot" if empty
      assignedTo: {
        uid: user.uid,
        name: user.displayName?.trim() || "No Name Provided",
        email: user.email || "No Email Provided",
      },
      createdAt: timestamp,
      lastUpdatedBy: user.uid,
      lastUpdatedAt: timestamp,
      firestoreTimestamp: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "leads"), newLead);
      alert("Lead added successfully.");
      handleClose();
    } catch (error) {
      console.error("Error adding lead:", error);
      alert("Failed to add lead. Please try again.");
    }
  };

  const isFormValid =
    businessName.trim() &&
    pocName.trim() &&
    phoneNo.trim() &&
    state &&
    city &&
    phase;

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-xl overflow-y-auto max-h-[95vh]">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Lead</h2>

        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* Business Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              College Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* POC Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              POC Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={pocName}
              onChange={(e) => setPocName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Phone No.<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
              placeholder="e.g. +91 9876543210"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. contact@business.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* State Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              State<span className="text-red-500">*</span>
            </label>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setCity("");
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select State</option>
              {Object.keys(stateCityData).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* City Dropdown */}
          {state && (
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                City<span className="text-red-500">*</span>
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Select City</option>
                {stateCityData[state].map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Phase Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Phase<span className="text-red-500">*</span>
            </label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={handleAddBusiness}
            disabled={!isFormValid}
            className={`px-5 py-2.5 rounded-lg text-white font-medium transition ${
              isFormValid
                ? "bg-blue-600 hover:bg-blue-800"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Add Business
          </button>

          <button
            onClick={handleClose}
            className="text-sm text-gray-500 hover:text-white hover:bg-red-600 px-4 py-2 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddCollegeModal;