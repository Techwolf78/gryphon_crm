import React, { useState } from "react";
import { auth, db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { XIcon } from "@heroicons/react/outline";

const statusOptions = [
  "Hot",
  "Warm",
  "Cold",
  "Onboarded",
];

function AddLeads({ show, onClose, onAddLead }) {
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [pocName, setPocName] = useState("");
  const [workingSince, setWorkingSince] = useState("");
  const [pocLocation, setPocLocation] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [pocMail, setPocMail] = useState("");
  const [pocDesignation, setPocDesignation] = useState("");
  const [status, setStatus] = useState("Warm");

  const handleClose = () => {
    setCompanyName("");
    setSector("");
    setEmployeeCount("");
    setPocName("");
    setWorkingSince("");
    setPocLocation("");
    setPocPhone("");
    setPocMail("");
    setPocDesignation("");
    setStatus("Warm");
    onClose();
  };

  const handleAddCompany = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add a company.");
      return;
    }

    if (!isFormValid) {
      alert("Please fill all required fields");
      return;
    }

    const newCompany = {
      companyName,
      sector,
      employeeCount: employeeCount ? parseInt(employeeCount) : 0,
      pocName,
      workingSince,
      pocLocation,
      pocPhone,
      pocMail,
      pocDesignation,
      status: status.toLowerCase() || "warm",
      assignedTo: {
        uid: user.uid,
        name: user.displayName?.trim() || "No Name Provided",
        email: user.email || "No Email Provided",
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, "CompanyLeads"), newCompany);
      if (onAddLead) {
        onAddLead({
          id: docRef.id,
          ...newCompany,
          createdAt: new Date().toISOString(),
        });
      }
      handleClose();
    } catch (error) {
      console.error("Error adding company:", error);
    }
  };

  const isFormValid = 
    companyName.trim() && 
    sector.trim() &&
    employeeCount.trim() && 
    pocName.trim() && 
    workingSince.trim() &&
    pocLocation.trim() && 
    pocPhone.trim() &&
    pocDesignation.trim();

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-54 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Add New Company</h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(100vh-180px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sector <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="e.g. IT Services"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee Count <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                placeholder="e.g. 250"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                POC Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pocName}
                onChange={(e) => setPocName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Working Since <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={workingSince}
                onChange={(e) => setWorkingSince(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                POC Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pocLocation}
                onChange={(e) => setPocLocation(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                POC Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pocPhone}
                onChange={(e) => setPocPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                POC Mail
              </label>
              <input
                type="email"
                value={pocMail}
                onChange={(e) => setPocMail(e.target.value)}
                placeholder="e.g. john@company.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                POC Designation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pocDesignation}
                onChange={(e) => setPocDesignation(e.target.value)}
                placeholder="e.g. HR Manager"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCompany}
              disabled={!isFormValid}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isFormValid
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Add Company
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddLeads;