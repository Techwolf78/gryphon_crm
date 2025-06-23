import React, { useState } from "react";
import stateCityData from "../Sales/stateCityData";
import { auth, realtimeDb } from "../../firebase";
import { ref, push } from "firebase/database";

function AddCollegeModal({ show, onClose }) {
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [pocName, setPocName] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [phase, setPhase] = useState("");

  const handleClose = () => {
    setBusinessName("");
    setAddress("");
    setPocName("");
    setPhoneNo("");
    setEmail("");
    setState("");
    setCity("");
    setPhase("");
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
      phase,
      createdBy: user.uid,
      createdAt: timestamp,
      lastUpdatedBy: user.uid,
      lastUpdatedAt: timestamp,
    };

    try {
      await push(ref(realtimeDb, "leads"), newLead);
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-2 py-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg p-6 sm:p-8 overflow-y-auto max-h-[95vh]">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Add New College Lead</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* College Name */}
          <div className="col-span-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              College Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Address */}
          <div className="col-span-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* POC Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              POC Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={pocName}
              onChange={(e) => setPocName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Phone No.<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
              placeholder="e.g. +91 9876543210"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Email */}
          <div className="col-span-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. contact@business.com"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* State */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              State<span className="text-red-500">*</span>
            </label>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setCity("");
              }}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select State</option>
              {Object.keys(stateCityData).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              City<span className="text-red-500">*</span>
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select City</option>
              {state && stateCityData[state]?.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>

          {/* Phase */}
          <div className="col-span-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Phase<span className="text-red-500">*</span>
            </label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select Phase</option>
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
              <option value="hot">Hot</option>
              <option value="closure">Closure</option>
              <option value="renewal">Renewal</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={handleClose}
            className="text-sm text-gray-600 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg transition"
          >
            Cancel
          </button>

          <button
            onClick={handleAddBusiness}
            disabled={!isFormValid}
            className={`px-6 py-2.5 rounded-lg font-semibold text-white transition ${
              isFormValid
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Add Business
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddCollegeModal;
