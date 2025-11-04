import React, { useState } from "react";
import { auth, db } from "../../../firebase";
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
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [pocName, setPocName] = useState("");
  const [workingSince, setWorkingSince] = useState("");
  const [pocLocation, setPocLocation] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [pocMail, setPocMail] = useState("");
  const [pocDesignation, setPocDesignation] = useState("");
  const [pocLinkedin, setPocLinkedin] = useState("");
  const [status, setStatus] = useState("Warm");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update all state setters to track changes
  const updateField = (setter, value) => {
    setHasUnsavedChanges(true);
    setter(value);
  };

  const handleClose = () => {
    if (
      hasUnsavedChanges &&
      !window.confirm("You have unsaved changes. Are you sure you want to close?")
    ) {
      return;
    }
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setCompanyName("");
    setSector("");
    setEmployeeCount("");
    setCompanyWebsite("");
    setPocName("");
    setWorkingSince("");
    setPocLocation("");
    setPocPhone("");
    setPocMail("");
    setPocDesignation("");
    setPocLinkedin("");
    setStatus("Warm");
    setHasUnsavedChanges(false);
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

    // Convert to the format expected by the batch system
    const companyData = {
      name: companyName,
      contactPerson: pocName,
      designation: pocDesignation,
      phone: pocPhone,
      companyUrl: companyWebsite,
      linkedinUrl: pocLinkedin,
      email: pocMail,
      location: pocLocation,
      industry: sector,
      companySize: employeeCount,
      source: "Manual Add",
      notes: "",
      status: status.toLowerCase() || "warm",
      contacts: []
    };

    try {
      // Create a new batch document with this single company
      const batchData = {
        companies: [btoa(JSON.stringify(companyData))],
        uploadedBy: user.uid,
        uploadedAt: serverTimestamp(),
        batchSize: 1,
        source: "manual_add"
      };

      // Add to companyleads collection
      const docRef = await addDoc(collection(db, "companyleads"), batchData);

      // Create the lead object for local state update
      const newLead = {
        id: `${docRef.id}_0`, // First (and only) company in this batch
        batchId: docRef.id,
        ...companyData,
        // Map fields for UI compatibility
        companyName: companyData.name,
        pocName: companyData.contactPerson,
        pocDesignation: companyData.designation,
        pocPhone: companyData.phone,
        companyUrl: companyData.companyUrl,
        companyWebsite: companyData.companyUrl,
        linkedinUrl: companyData.linkedinUrl,
        pocLinkedin: companyData.linkedinUrl,
        pocMail: companyData.email || '',
        pocLocation: companyData.location || '',
        industry: companyData.industry,
        companySize: companyData.companySize,
        source: companyData.source,
        notes: companyData.notes,
        status: companyData.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contacts: []
      };

      if (onAddLead) {
        onAddLead(newLead);
      }
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error adding company:", error);
      alert("Failed to add company. Please try again.");
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
        <div className="bg-linear-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
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
                onChange={(e) => updateField(setCompanyName, e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sector}
                onChange={(e) => updateField(setSector, e.target.value)}
                placeholder="e.g. IT Services"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Size <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={employeeCount}
                onChange={(e) => updateField(setEmployeeCount, e.target.value)}
                placeholder="e.g. 250"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Website
              </label>
              <input
                type="url"
                value={companyWebsite}
                onChange={(e) => updateField(setCompanyWebsite, e.target.value)}
                placeholder="e.g. https://company.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                POC Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pocName}
                onChange={(e) => updateField(setPocName, e.target.value)}
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
                onChange={(e) => updateField(setWorkingSince, e.target.value)}
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
                onChange={(e) => updateField(setPocLocation, e.target.value)}
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
                onChange={(e) => updateField(setPocPhone, e.target.value)}
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
                onChange={(e) => updateField(setPocMail, e.target.value)}
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
                onChange={(e) => updateField(setPocDesignation, e.target.value)}
                placeholder="e.g. HR Manager"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                POC LinkedIn
              </label>
              <input
                type="url"
                value={pocLinkedin}
                onChange={(e) => updateField(setPocLinkedin, e.target.value)}
                placeholder="e.g. https://linkedin.com/in/johndoe"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => updateField(setStatus, e.target.value)}
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