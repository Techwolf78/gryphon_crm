import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import {
  FiX,
  FiUser,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import specializationOptions from './specializationOptions'
import { auditLogTrainerOperations, auditLogErrorOperations } from "../../utils/learningAuditLogger";

function EditTrainer({ trainerId, onClose, onTrainerUpdated, trainers = [] }) {
  const [trainerData, setTrainerData] = useState({
    trainerId: "",
    name: "",
    contact: "",
    email: "",
    domain: "Soft Skills",
    nameAsPerBank: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    pan: "",
    aadhar: "",
    bankAddress: "",
    paymentType: "Per Hour",
    charges: "",
    specialization: "",
    otherSpecialization: "",
    gst: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSpecs, setSelectedSpecs] = useState([]); // standard specs
  const [customSpecs, setCustomSpecs] = useState([]); // custom specs
  const [customInput, setCustomInput] = useState("");
  const [currentSection, setCurrentSection] = useState("basic");
  const [nameExists, setNameExists] = useState(false);

  const getDomains = (trainer) => {
    let domains = [];
    if (Array.isArray(trainer.domain)) domains = trainer.domain;
    else if (typeof trainer.domain === 'string') domains = trainer.domain.split(',').map(d => d.trim());
    return domains.map(d => d.toLowerCase().trim());
  };

  useEffect(() => {
    const toArray = (val) => {
      if (Array.isArray(val)) return val.filter(Boolean);
      if (typeof val === "string")
        return val
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      return [];
    };
    const fetchTrainer = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, "trainers", trainerId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          setError("Trainer not found");
          return;
        }
        const data = snap.data();
        const specArr = toArray(data.specialization);
        const otherArr = toArray(data.otherSpecialization);
        // Standard options from specArr only
        const standard = specArr.filter((s) => specializationOptions.includes(s));
        // Custom are explicit otherArr + any specArr items not in standard list
        const custom = [
          ...otherArr,
          ...specArr.filter((s) => !specializationOptions.includes(s)),
        ].filter((v, i, a) => a.indexOf(v) === i);
        const showOthers = custom.length > 0;
  setTrainerData({
          trainerId: data.trainerId || trainerId,
          name: data.name || "",
          contact: data.contact || "",
          email: data.email || "",
          domain: data.domain || "Soft Skills",
            nameAsPerBank: data.nameAsPerBank || "",
          bankName: data.bankName || "",
          accountNumber: data.accountNumber || "",
          ifsc: data.ifsc || "",
          pan: data.pan || "",
          aadhar: data.aadhar || "",
          bankAddress: data.bankAddress || "",
          paymentType: data.paymentType || "Per Hour",
          charges: data.charges || "",
          gst: data.gst || "",
          specialization: [...standard, ...(showOthers ? ["Others"] : [])].join(", "),
          otherSpecialization: custom.join(", "),
        });
  // showOthers no longer toggles a separate UI section; kept for potential future logic
        setSelectedSpecs(standard);
        setCustomSpecs(custom);
      } catch (e) {
        console.error("Error loading trainer data:", e);
        setError("Failed to load trainer data");
      } finally {
        setLoading(false);
      }
    };
    fetchTrainer();
  }, [trainerId]);

  useEffect(() => {
    if (!trainerData.name.trim()) {
      setNameExists(false);
      return;
    }
    const newName = trainerData.name.toLowerCase().trim();
    const newDomains = getDomains({domain: trainerData.domain});
    for (const trainer of trainers) {
      if (trainer.id === trainerId) continue; // exclude self
      if (trainer.name.toLowerCase().trim() === newName) {
        const existingDomains = getDomains(trainer);
        for (const domain of newDomains) {
          if (existingDomains.includes(domain)) {
            setNameExists(true);
            return;
          }
        }
      }
    }
    setNameExists(false);
  }, [trainerData.name, trainerData.domain, trainers, trainerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTrainerData((prev) => ({ ...prev, [name]: value }));

  // specialization handled via chip UI now
  };
  // Submit updated trainer
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (nameExists) {
      setError("Trainer with same name and domain already exists");
      setLoading(false);
      return;
    }
    try {
      // Validation: require at least one specialization
      if (selectedSpecs.length + customSpecs.length === 0) {
        setError("Select at least one specialization");
        setLoading(false);
        return;
      }

      // Get original trainer data for change tracking
      const originalDoc = await getDoc(doc(db, "trainers", trainerId));
      const originalData = originalDoc.data();

      const specializationArr = selectedSpecs; // only standard
      const otherArr = customSpecs; // custom list
      const trainerToUpdate = {
        trainerId: trainerData.trainerId,
        name: trainerData.name,
        nameLower: (trainerData.name || "").toLowerCase(),
        contact: trainerData.contact,
        email: trainerData.email,
        domain: trainerData.domain,
        nameAsPerBank: trainerData.nameAsPerBank,
        bankName: trainerData.bankName,
        accountNumber: trainerData.accountNumber,
        ifsc: trainerData.ifsc,
        pan: trainerData.pan,
        aadhar: trainerData.aadhar,
        bankAddress: trainerData.bankAddress,
        paymentType: trainerData.paymentType,
        charges: Number(trainerData.charges) || 0,
        gst: trainerData.gst || "",
        specialization: specializationArr,
        otherSpecialization: otherArr,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, "trainers", trainerId), trainerToUpdate);

      // Audit log: Trainer updated - track changes
      const changedFields = [];
      const oldValues = {};
      const newValues = {};

      Object.keys(trainerToUpdate).forEach(key => {
        if (JSON.stringify(originalData[key]) !== JSON.stringify(trainerToUpdate[key])) {
          changedFields.push(key);
          oldValues[key] = originalData[key];
          newValues[key] = trainerToUpdate[key];
        }
      });

      if (changedFields.length > 0) {
        // Get trainer name from multiple sources for robust logging
        const trainerName = (originalData?.name && originalData.name.trim()) || 
                           (trainerData?.name && trainerData.name.trim()) || 
                           "Unknown Trainer";
        
        await auditLogTrainerOperations.trainerUpdated(
          trainerId,
          trainerName,
          changedFields,
          oldValues,
          newValues
        );
      }

      onTrainerUpdated({ id: trainerId, ...trainerToUpdate });
      onClose();
    } catch (err) {
      console.error("Error updating trainer:", err);

      // Audit log: Database operation failed
      await auditLogErrorOperations.databaseOperationFailed(
        "UPDATE",
        "trainers",
        err.code || "UNKNOWN_ERROR",
        err.message
      );

      setError(`Failed to update trainer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add these functions to the EditTrainer component
  const toggleSpec = (opt) => {
    setSelectedSpecs((prev) =>
      prev.includes(opt) ? prev.filter((s) => s !== opt) : [...prev, opt]
    );
  };
  const addCustomSpec = (e) => {
    e.preventDefault();
    const val = customInput.trim();
    if (!val) return;
    const parts = val
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (!parts.length) return;
    setCustomSpecs((prev) => {
      const existing = new Set(prev.map((p) => p.toLowerCase()));
      const additions = parts.filter((p) => !existing.has(p.toLowerCase()));
      return [...prev, ...additions];
    });
    setCustomInput("");
  };
  const removeCustom = (spec) => {
    setCustomSpecs((prev) => prev.filter((s) => s !== spec));
  };

  const renderBasicInfoSection = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trainer ID
          </label>
          <input
            type="text"
            value={trainerData.trainerId}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name*
          </label>
          <input
            type="text"
            name="name"
            value={trainerData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          {nameExists && <p className="text-red-500 text-sm mt-1">Trainer exists</p>}
        </div>
      </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact*
          </label>
          <input
            type="tel"
            name="contact"
            value={trainerData.contact}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email*
          </label>
          <input
            type="email"
            name="email"
            value={trainerData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>

  <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Domain*
          </label>
          <select
            name="domain"
            value={trainerData.domain}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="Technical">Technical</option>
            <option value="Soft Skills">Soft Skills</option>
            <option value="Aptitude">Aptitude</option>
            <option value="Tools (Excel - Power BI)">Tools (Excel - Power BI)</option>
            <option value="Tools (Looker Studio)">Tools (Looker Studio)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Specializations* (choose multiple)
        </label>
  <div className="flex flex-wrap gap-1">
          {specializationOptions
            .filter((o) => o !== "Others")
            .map((opt) => {
              const active = selectedSpecs.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleSpec(opt)}
      className={`px-2 py-0.5 rounded-full border text-[11px] font-medium transition ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Add Custom (press Enter)
          </label>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addCustomSpec(e);
            }}
            placeholder="e.g. Microsoft Excel, PowerPoint"
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          {!!customSpecs.length && (
    <div className="flex flex-wrap gap-1 mt-2">
              {customSpecs.map((spec) => (
                <span
                  key={spec}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-800 border border-purple-200"
                >
                  {spec}
                  <button
                    type="button"
                    onClick={() => removeCustom(spec)}
                    className="ml-1 text-purple-500 hover:text-purple-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Selected: {selectedSpecs.length + customSpecs.length} (standard {selectedSpecs.length}, custom {customSpecs.length})
        </p>
      </div>
      <div className="flex justify-between">
        <button
          type="submit"
          className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
            loading || nameExists ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
          disabled={loading || nameExists}
        >
          {loading ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setCurrentSection("payment")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Next: Payment Details
        </button>
      </div>
    </div>
  );

  const renderPaymentInfoSection = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Type*
          </label>
          <select
            name="paymentType"
            value={trainerData.paymentType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="Per Hour">Per Hour</option>
            <option value="Per Day">Per Day</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Charges*
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">₹</span>
            </div>
            <input
              type="number"
              name="charges"
              value={trainerData.charges}
              onChange={handleChange}
              className="block w-full pl-7 pr-12 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              required
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">
                {trainerData.paymentType === "Per Hour" ? "/hr" : "/day"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GST Number
          </label>
          <input
            type="text"
            name="gst"
            value={trainerData.gst}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="GST Number (optional)"
          />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Bank Details</h3>
  <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name as per Bank*
            </label>
            <input
              type="text"
              name="nameAsPerBank"
              value={trainerData.nameAsPerBank}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name*
              </label>
              <input
                type="text"
                name="bankName"
                value={trainerData.bankName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account No*
              </label>
              <input
                type="text"
                name="accountNumber"
                value={trainerData.accountNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IFSC Code*
              </label>
              <input
                type="text"
                name="ifsc"
                value={trainerData.ifsc}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PAN*
              </label>
              <input
                type="text"
                name="pan"
                value={trainerData.pan}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aadhar*
            </label>
            <input
              type="text"
              name="aadhar"
              value={trainerData.aadhar}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Address*
            </label>
            <textarea
              name="bankAddress"
              value={trainerData.bankAddress}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => setCurrentSection("basic")}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Back
        </button>
        <button
          type="submit"
          className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center ${
            loading || nameExists ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={loading || nameExists}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Saving...
            </>
          ) : (
            "Update Trainer"
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-54 overflow-y-auto">
      <div
        className="fixed inset-0 transition-opacity"
        style={{
          backgroundColor: "rgba(0, 0, 50, 0.2)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      ></div>

      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

  <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-auto shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full relative z-10 max-h-[90vh]">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 min-w-[600px] overflow-x-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  <FiUser className="inline mr-2" />
                  Edit Trainer
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {currentSection === "basic"
                    ? "Basic Information"
                    : "Payment & Bank Details"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start">
                <FiAlertCircle className="shrink-0 h-5 w-5 mr-2 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {loading && !trainerData.name ? (
              <div className="mt-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="mt-6">
                <div className="mb-4">
                  <nav className="flex space-x-4" aria-label="Tabs">
                    <button
                      onClick={() => setCurrentSection("basic")}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${currentSection === "basic"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Basic Info
                    </button>
                    <button
                      onClick={() => setCurrentSection("payment")}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${currentSection === "payment"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Payment & Bank
                    </button>
                  </nav>
                </div>

                <form onSubmit={handleSubmit}>
                  {currentSection === "basic"
                    ? renderBasicInfoSection()
                    : renderPaymentInfoSection()}
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditTrainer;
