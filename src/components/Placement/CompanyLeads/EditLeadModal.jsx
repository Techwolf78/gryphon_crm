import React, { useState, useEffect } from "react";
import { XIcon } from "@heroicons/react/outline";

const statusOptions = [
  "Hot",
  "Warm",
  "Cold",
  "Onboarded",
];

function EditLeadModal({ show, onClose, lead, onUpdateLead }) {
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
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

  useEffect(() => {
    if (lead && show) {
      setCompanyName(lead.companyName || lead.name || "");
      setIndustry(lead.industry || lead.sector || "");
      setCompanySize(String(lead.companySize || lead.employeeCount || ""));
      setCompanyWebsite(lead.companyWebsite || lead.companyUrl || "");
      setPocName(lead.pocName || lead.contactPerson || "");
      setWorkingSince(lead.workingSince || "");
      setPocLocation(lead.pocLocation || lead.location || "");
      setPocPhone(String(lead.pocPhone || lead.phone || ""));
      setPocMail(lead.pocMail || lead.email || "");
      setPocDesignation(lead.pocDesignation || lead.designation || "");
      setPocLinkedin(lead.pocLinkedin || lead.linkedinUrl || "");
      setStatus(lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : "Warm");
      setHasUnsavedChanges(false);
    }
  }, [lead, show]);

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
    onClose();
  };

  const handleUpdateCompany = async () => {
    if (!isFormValid) {
      alert("Please fill all required fields");
      return;
    }

    const updatedCompany = {
      companyName,
      industry,
      companySize: companySize ? parseInt(companySize) : 0,
      companyWebsite,
      pocName,
      workingSince,
      pocLocation,
      pocPhone,
      pocMail,
      pocDesignation,
      pocLinkedin,
      status: status.toLowerCase() || "warm",
      updatedAt: new Date().toISOString(),
    };

    // Pass the updated data to the parent component for batch processing
    if (onUpdateLead) {
      onUpdateLead(lead.id, updatedCompany);
    }

    onClose();
  };

  const isFormValid =
    (companyName || "").toString().trim() &&
    (pocName || "").toString().trim();

  if (!show || !lead) return null;

  return (
    <div className="fixed inset-0 z-54 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Edit Company</h2>
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
                Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => updateField(setIndustry, e.target.value)}
                placeholder="e.g. IT Services"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Size
              </label>
              <input
                type="number"
                value={companySize}
                onChange={(e) => updateField(setCompanySize, e.target.value)}
                placeholder="e.g. 250"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                Working Since
              </label>
              <input
                type="date"
                value={workingSince}
                onChange={(e) => updateField(setWorkingSince, e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                POC Location
              </label>
              <input
                type="text"
                value={pocLocation}
                onChange={(e) => updateField(setPocLocation, e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                POC Phone
              </label>
              <input
                type="text"
                value={pocPhone}
                onChange={(e) => updateField(setPocPhone, e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                POC Designation
              </label>
              <input
                type="text"
                value={pocDesignation}
                onChange={(e) => updateField(setPocDesignation, e.target.value)}
                placeholder="e.g. HR Manager"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              onClick={handleUpdateCompany}
              disabled={!isFormValid}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isFormValid
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Update Company
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditLeadModal;