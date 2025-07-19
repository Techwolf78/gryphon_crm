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

function EditTrainer({ trainerId, onClose, onTrainerUpdated }) {
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
  const [showOtherSpecialization, setShowOtherSpecialization] = useState(false);
  const [currentSection, setCurrentSection] = useState("basic");

  useEffect(() => {
    const fetchTrainer = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, "trainers", trainerId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // Convert specialization to array
          const specArr = Array.isArray(data.specialization)
            ? data.specialization
            : typeof data.specialization === "string"
              ? data.specialization.split(",").map(s => s.trim())
              : [];
          // Find custom specializations not in options
          const customSpecs = specArr.filter(s => !specializationOptions.includes(s) && s !== "Others");
          // If custom specs exist, add "Others" to specialization and set otherSpecialization
          let specializationStr = specArr.join(", ");
          let otherSpecializationStr = "";
          let showOther = false;
          if (customSpecs.length > 0) {
            // Add "Others" if not present
            if (!specArr.includes("Others")) {
              specializationStr = [...specArr.filter(s => specializationOptions.includes(s)), "Others"].join(", ");
            }
            otherSpecializationStr = customSpecs.join(", ");
            showOther = true;
          } else if (Array.isArray(data.otherSpecialization) && data.otherSpecialization.length > 0) {
            otherSpecializationStr = data.otherSpecialization.join(", ");
            showOther = true;
          } else if (specArr.includes("Others")) {
            showOther = true;
          }

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
            specialization: specializationStr,
            otherSpecialization: otherSpecializationStr,
          });
          setShowOtherSpecialization(showOther);
        } else {
          setError("Trainer not found");
        }
      } catch (err) {
        console.error("Error fetching trainer:", err);
        setError("Failed to load trainer data");
      } finally {
        setLoading(false);
      }
    };

    fetchTrainer();
  }, [trainerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTrainerData((prev) => ({ ...prev, [name]: value }));

    if (name === "specialization") {
      // If "Others" is selected or not in options, show otherSpecialization
      const selectedSpecs = value.split(",").map(s => s.trim());
      if (
        selectedSpecs.includes("Others") ||
        selectedSpecs.some(s => !specializationOptions.includes(s))
      ) {
        setShowOtherSpecialization(true);
      } else {
        setShowOtherSpecialization(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Always save as arrays in Firestore
      const specializationArr = trainerData.specialization
        ? trainerData.specialization
            .split(",")
            .map(s => s.trim())
            .filter(s => s && s !== "Others") // Remove "Others"
        : [];
      const otherSpecializationArr = trainerData.otherSpecialization
        ? trainerData.otherSpecialization.split(",").map(s => s.trim()).filter(Boolean)
        : [];

      const trainerToUpdate = {
        trainerId: trainerData.trainerId,
        name: trainerData.name,
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
        specialization: specializationArr,
        updatedAt: new Date(),
      };

      if (showOtherSpecialization) {
        trainerToUpdate.otherSpecialization = otherSpecializationArr;
      } else {
        trainerToUpdate.otherSpecialization = [];
      }

      await updateDoc(doc(db, "trainers", trainerId), trainerToUpdate);
      onTrainerUpdated();
      onClose();
    } catch (err) {
      console.error("Error updating trainer:", err);
      setError(`Failed to update trainer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add these functions to the EditTrainer component
  const renderBasicInfoSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <div className="grid grid-cols-1 gap-4">
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

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Specialization*
          </label>
          <div className="flex flex-wrap gap-2">
            {specializationOptions.map(opt => (
              <label key={opt} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={opt}
                  checked={trainerData.specialization.split(",").map(s => s.trim()).includes(opt)}
                  onChange={e => {
                    const specs = trainerData.specialization
                      ? trainerData.specialization.split(",").map(s => s.trim())
                      : [];
                    let updatedSpecs;
                    if (e.target.checked) {
                      updatedSpecs = [...specs, opt];
                    } else {
                      updatedSpecs = specs.filter(s => s !== opt);
                    }
                    setTrainerData(prev => ({
                      ...prev,
                      specialization: updatedSpecs.join(", "),
                    }));
                    if (
                      updatedSpecs.includes("Others") ||
                      updatedSpecs.some(s => !specializationOptions.includes(s))
                    ) {
                      setShowOtherSpecialization(true);
                    } else {
                      setShowOtherSpecialization(false);
                    }
                  }}
                  className="form-checkbox"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
          <small className="text-gray-500">
            Select all that apply.
          </small>
        </div>
      </div>

      {showOtherSpecialization && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other Specialization*
            </label>
            <input
              type="text"
              name="otherSpecialization"
              value={trainerData.otherSpecialization}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required={showOtherSpecialization}
              placeholder="e.g. Microsoft Excel, PowerPoint"
            />
            <small className="text-gray-500">
              Enter comma separated values. Example: Microsoft Excel, PowerPoint
            </small>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          disabled={loading}
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="space-y-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-10">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
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
                <FiAlertCircle className="flex-shrink-0 h-5 w-5 mr-2 mt-0.5" />
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