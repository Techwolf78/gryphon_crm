import React, { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  collection,
} from "firebase/firestore";
import { db } from "../../firebase";
import * as XLSX from "xlsx";
import {
  FiX,
  FiUpload,
  FiDownload,
  FiUserPlus,
  FiInfo,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import specializationOptions from "./specializationOptions";

function AddTrainer({ onClose, onTrainerAdded }) {
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
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Multi-select specialization state
  const [selectedSpecs, setSelectedSpecs] = useState([]); // standard options
  const [customSpecs, setCustomSpecs] = useState([]); // custom added
  const [customInput, setCustomInput] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState("basic");

  // Generate next trainer ID
  useEffect(() => {
    const getNextTrainerId = async () => {
      try {
        const q = query(
          collection(db, "trainers"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);

        let maxNumber = 0;
        snapshot.forEach((doc) => {
          const id = doc.id;
          if (id && id.startsWith("GA-T")) {
            const num = parseInt(id.replace("GA-T", ""));
            if (!isNaN(num)) {
              maxNumber = Math.max(maxNumber, num);
            }
          }
        });

        const nextId = `GA-T${(maxNumber + 1).toString().padStart(3, "0")}`;
        setTrainerData((prev) => ({ ...prev, trainerId: nextId }));
      } catch (err) {
        console.error("Error generating ID:", err);
        setTrainerData((prev) => ({ ...prev, trainerId: "GA-T001" }));
      }
    };
    getNextTrainerId();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTrainerData((prev) => ({ ...prev, [name]: value }));

  // (legacy select removed; no-op for specialization now)
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const trainerToSave = {
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
        createdAt: new Date(),
      };

      // Validate multi-select specialization
      if (selectedSpecs.length + customSpecs.length === 0) {
        setError("Select at least one specialization");
        setLoading(false);
        return;
      }
      trainerToSave.specialization = selectedSpecs;
      trainerToSave.otherSpecialization = customSpecs;

  await setDoc(doc(db, "trainers", trainerData.trainerId), trainerToSave, { merge: true });

  // Provide the created trainer (with an id field matching Firestore doc id)
  onTrainerAdded({ id: trainerData.trainerId, ...trainerToSave });
      onClose();
    } catch (err) {
      console.error("Error adding trainer:", err);
      setError(`Failed to add trainer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportStatus("Processing file...");
    setImportProgress(10);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setImportProgress(30);
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        setImportProgress(60);

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          throw new Error("No data found in the Excel file");
        }

        setImportProgress(80);

  const importedTrainers = [];
  for (const importedData of jsonData) {
          let trainerId = importedData["Trainer ID"] || "";
          if (!trainerId) {
            const q = query(
              collection(db, "trainers"),
              orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(q);

            let maxNumber = 0;
            snapshot.forEach((doc) => {
              const id = doc.id;
              if (id && id.startsWith("GA-T")) {
                const num = parseInt(id.replace("GA-T", ""));
                if (!isNaN(num)) {
                  maxNumber = Math.max(maxNumber, num);
                }
              }
            });
            trainerId = `GA-T${(maxNumber + 1).toString().padStart(3, "0")}`;
          }

          // Handle comma-separated specializations
          let specializationData = importedData["Specialization"] || "";
          let specializations = [];
          let otherSpecializations = [];

          if (specializationData.includes(",")) {
            // Split by comma and trim whitespace
            const splitSpecs = specializationData
              .split(",")
              .map((s) => s.trim());

            splitSpecs.forEach((spec) => {
              if (specializationOptions.includes(spec)) {
                specializations.push(spec);
              } else {
                otherSpecializations.push(spec);
              }
            });
          } else {
            if (specializationOptions.includes(specializationData)) {
              specializations.push(specializationData);
            } else {
              otherSpecializations.push(specializationData);
            }
          }

          const trainerToSave = {
            trainerId: trainerId,
            name: importedData["Name"] || "",
            nameLower: (importedData["Name"] || "").toLowerCase(),
            contact: importedData["Contact"] || "",
            email: importedData["Email"] || "",
            domain: importedData["Domain"] || "Soft Skills",
            nameAsPerBank: importedData["Name as per Bank"] || "",
            bankName: importedData["Bank Name"] || "",
            accountNumber: importedData["Account Number"] || "",
            ifsc: importedData["IFSC Code"] || "",
            pan: importedData["PAN"] || "",
            aadhar: importedData["Aadhar"] || "",
            bankAddress: importedData["Bank Address"] || "",
            paymentType: importedData["Payment Type"] || "Per Hour",
            charges: Number(importedData["Charges"]) || 0,
            specialization: specializations,
            otherSpecialization: otherSpecializations,
            createdAt: new Date(),
          };

          await setDoc(doc(db, "trainers", trainerId), trainerToSave);
          importedTrainers.push({ id: trainerId, ...trainerToSave });

              // After import we rely on toast in parent; no per-row UI update needed
        }

        setImportStatus(`${jsonData.length} trainers imported successfully!`);
        setImportProgress(100);
        if (importedTrainers.length) {
          onTrainerAdded(importedTrainers);
        }

        setTimeout(() => {
          setImportStatus("");
          setImportProgress(0);
        }, 3000);
      } catch (error) {
        console.error("Import error:", error);
        setError(`Import failed: ${error.message}`);
        setImportStatus("Import failed");
        setImportProgress(0);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Error reading file");
      setImportStatus("Import failed");
      setImportProgress(0);
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleExportTemplate = () => {
    const templateData = [
      {
        Name: "",
        Contact: "",
        Email: "",
        Domain: "Soft Skills",
        "Name as per Bank": "",
        "Bank Name": "",
        "Account Number": "",
        "IFSC Code": "",
        PAN: "",
        Aadhar: "",
        "Bank Address": "",
        "Payment Type": "Per Hour",
        Charges: "",
        Specialization: "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trainers");
    XLSX.writeFile(workbook, "trainer_import_template.xlsx");
  };

  const toggleSpec = (opt) => {
    setSelectedSpecs((prev) =>
      prev.includes(opt) ? prev.filter((s) => s !== opt) : [...prev, opt]
    );
  };

  const addCustomSpec = (e) => {
    e.preventDefault();
    const val = customInput.trim();
    if (!val) return;
    // Split by comma to allow bulk add
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
            <option value="Soft Skills">Soft Skills</option>
            <option value="Aptitude">Aptitude</option>
            <option value="Technical">Technical</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
              if (e.key === "Enter") {
                addCustomSpec(e);
              }
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

      <div className="flex justify-end">
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
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
          disabled={loading}
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
            "Save Trainer"
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-54 overflow-y-auto">
      {/* Backdrop - fixed positioning and proper z-index */}
      <div
        className="fixed inset-0 transition-opacity"
        style={{
          backgroundColor: "rgba(0, 0, 50, 0.2)", // soft transparent blue
          backdropFilter: "blur(10px)", // blurry glass effect
          WebkitBackdropFilter: "blur(10px)", // Safari support
        }}
      ></div>

      {/* Modal container */}
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* This element is to trick the browser into centering the modal contents */}
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        {/* Modal content - relative positioning and higher z-index */}
  <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full relative z-10">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  <FiUserPlus className="inline mr-2" />
                  Add New Trainer
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
                <FiAlertCircle className="flex-shrink-0 h-5 w-5 mr-2 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {importStatus && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm flex flex-col">
                <div className="flex items-start">
                  {importProgress === 100 ? (
                    <FiCheckCircle className="flex-shrink-0 h-5 w-5 mr-2 mt-0.5 text-green-500" />
                  ) : (
                    <FiInfo className="flex-shrink-0 h-5 w-5 mr-2 mt-0.5" />
                  )}
                  <span>{importStatus}</span>
                </div>
                {importProgress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleExportTemplate}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiDownload className="mr-2 h-4 w-4" />
                Download Template
              </button>
              <label className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
                <FiUpload className="mr-2 h-4 w-4" />
                Import from Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-6">
              <div className="mb-4">
                <nav className="flex space-x-4" aria-label="Tabs">
                  <button
                    onClick={() => setCurrentSection("basic")}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentSection === "basic"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Basic Info
                  </button>
                  <button
                    onClick={() => setCurrentSection("payment")}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentSection === "payment"
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddTrainer;
