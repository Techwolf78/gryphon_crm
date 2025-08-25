import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, getDoc, collection, addDoc, updateDoc } from "firebase/firestore";
import { query, where, getDocs } from "firebase/firestore";
import { FiDownload, FiX, FiEdit2 } from "react-icons/fi";

// Import the standardized PDF generation function
import { generateInvoicePDF } from "./GenerateTrainerInvoice";

function InvoiceModal({ trainer, onClose, onInvoiceGenerated }) {
  const [invoiceData, setInvoiceData] = useState({
    billNumber: `INV-${Date.now()}`,
    projectCode: trainer?.projectCode || "",
    domain: trainer?.domain || "",
    topics: Array.isArray(trainer?.topics) ? trainer.topics.join(", ") : "",
    startDate: trainer?.earliestStartDate || "",
    endDate: trainer?.latestEndDate || "",
    billingDate: new Date().toISOString().split("T")[0],
    trainingRate: trainer?.perHourCost || 0,
    totalHours: trainer?.totalCollegeHours || 0,
    tds: 10,
    adhocAdjustment: 0,
    conveyance: 0,
    food: 0,
    lodging: 0,
    collegeName: trainer?.collegeName || "",
  });
  const [existingInvoice, setExistingInvoice] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const fetchTrainerBankDetails = async () => {
      if (!trainer?.trainerId) return;

      try {
        const trainerRef = doc(db, "trainers", trainer.trainerId);
        const trainerSnap = await getDoc(trainerRef);

        if (trainerSnap.exists()) {
          const data = trainerSnap.data();
          setInvoiceData((prev) => ({
            ...prev,
            bankName: data.bankName || "",
            accountNumber: data.accountNumber || "",
            ifscCode: data.ifsc || "",
            panNumber: data.pan || "",
            trainerEmail: data.email || "",
            trainerPhone: data.phone || "",
          }));
        } else {
          console.warn("Trainer details not found");
        }
      } catch (error) {
        console.error("Error fetching trainer details:", error);
      }
    };

    const checkExistingInvoice = async () => {
      if (!trainer?.trainerId || !trainer?.collegeName) return;

      try {
        const q = query(
          collection(db, "invoices"),
          where("trainerId", "==", trainer.trainerId),
          where("collegeName", "==", trainer.collegeName)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          // Get the most recent invoice
          const latestInvoiceDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
          const latestInvoice = {
            id: latestInvoiceDoc.id,
            ...latestInvoiceDoc.data()
          };
          setExistingInvoice(latestInvoice);

          // Pre-fill form with existing data
          setInvoiceData((prev) => ({
            ...prev,
            ...latestInvoice,
            billingDate:
              latestInvoice.billingDate ||
              new Date().toISOString().split("T")[0],
          }));
        }
      } catch (error) {
        console.error("Error checking existing invoices:", error);
      }
    };

    checkExistingInvoice();
    fetchTrainerBankDetails();
  }, [trainer?.trainerId, trainer?.collegeName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      // Prepare invoice data
      const invoiceToSave = {
        ...invoiceData,
        trainerId: trainer?.trainerId,
        trainerName: trainer?.trainerName,
        collegeName: trainer?.collegeName,
        totalAmount: calculateTotalAmount(),
        netPayment: calculateNetPayment(),
        updatedAt: new Date(),
        status: "generated",
      };

      // If editing existing invoice, update it instead of creating new
      if (existingInvoice && editMode) {
        await updateDoc(doc(db, "invoices", existingInvoice.id), invoiceToSave);
        console.log("Invoice updated with ID: ", existingInvoice.id);
        alert("Invoice updated successfully!");
      } else {
        // Add to Firestore as new invoice
        invoiceToSave.createdAt = new Date();
        const docRef = await addDoc(collection(db, "invoices"), invoiceToSave);
        console.log("Invoice saved with ID: ", docRef.id);
        alert("Invoice generated successfully!");
      }

      // Generate and download PDF using the standardized function
      await generateInvoicePDF(invoiceToSave);

      onClose();
      onInvoiceGenerated(); // Refresh the parent component
    } catch (error) {
      console.error("Error saving invoice: ", error);
      alert("Error saving invoice. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await generateInvoicePDF({
        ...existingInvoice,
        trainerName: trainer?.trainerName || existingInvoice.trainerName || "",
      });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      alert("Failed to download invoice. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setInvoiceData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const calculateTotalAmount = () => {
    return (
      (invoiceData.trainingRate || 0) * (invoiceData.totalHours || 0) +
      (parseFloat(invoiceData.conveyance) || 0) +
      (parseFloat(invoiceData.food) || 0) +
      (parseFloat(invoiceData.lodging) || 0)
    );
  };

  const calculateNetPayment = () => {
    const totalAmount = calculateTotalAmount();
    const tdsAmount = (totalAmount * (parseFloat(invoiceData.tds) || 0)) / 100;
    return (
      totalAmount + (parseFloat(invoiceData.adhocAdjustment) || 0) - tdsAmount
    );
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center p-4 z-500">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {existingInvoice && !editMode ? "View Invoice" : "Generate Invoice"} for {trainer?.trainerName || "Trainer"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX size={24} />
            </button>
          </div>
          
          {existingInvoice && !editMode && (
            <div className="mb-4 p-4 bg-blue-50 rounded-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <p className="text-blue-700">
                  An invoice already exists for this trainer and college.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <FiDownload className="mr-2" />
                    {isDownloading ? "Downloading..." : "Download Invoice"}
                  </button>
                  <button
                    onClick={handleEdit}
                    className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                  >
                    <FiEdit2 className="mr-2" />
                    Edit Invoice
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bill Number
                </label>
                <input
                  type="text"
                  name="billNumber"
                  value={invoiceData.billNumber}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={existingInvoice && !editMode}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Date
                </label>
                <input
                  type="date"
                  name="billingDate"
                  value={invoiceData.billingDate}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={existingInvoice && !editMode}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  College Name
                </label>
                <input
                  type="text"
                  name="collegeName"
                  value={invoiceData.collegeName}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={true}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Code
                </label>
                <input
                  type="text"
                  name="projectCode"
                  value={invoiceData.projectCode}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={existingInvoice && !editMode}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain
                </label>
                <input
                  type="text"
                  name="domain"
                  value={invoiceData.domain}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={existingInvoice && !editMode}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topics
                </label>
                <input
                  type="text"
                  name="topics"
                  value={invoiceData.topics}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={existingInvoice && !editMode}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={invoiceData.startDate}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={existingInvoice && !editMode}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={invoiceData.endDate}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={existingInvoice && !editMode}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Training Rate (per hour)
                </label>
                <input
                  type="number"
                  name="trainingRate"
                  value={invoiceData.trainingRate}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={existingInvoice && !editMode}
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Hours
                </label>
                <input
                  type="number"
                  name="totalHours"
                  value={invoiceData.totalHours}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={existingInvoice && !editMode}
                  step="0.5"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TDS (%)
                </label>
                <input
                  type="number"
                  name="tds"
                  value={invoiceData.tds}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={existingInvoice && !editMode}
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adhoc Adjustment
                </label>
                <input
                  type="number"
                  name="adhocAdjustment"
                  value={invoiceData.adhocAdjustment}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={existingInvoice && !editMode}
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conveyance
                </label>
                <input
                  type="number"
                  name="conveyance"
                  value={invoiceData.conveyance}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={existingInvoice && !editMode}
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Food
                </label>
                <input
                  type="number"
                  name="food"
                  value={invoiceData.food}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={existingInvoice && !editMode}
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lodging
                </label>
                <input
                  type="number"
                  name="lodging"
                  value={invoiceData.lodging}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={existingInvoice && !editMode}
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={invoiceData.bankName || ""}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={existingInvoice && !editMode}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={invoiceData.accountNumber || ""}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={existingInvoice && !editMode}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  name="ifscCode"
                  value={invoiceData.ifscCode || ""}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={existingInvoice && !editMode}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PAN Number
                </label>
                <input
                  type="text"
                  name="panNumber"
                  value={invoiceData.panNumber || ""}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={existingInvoice && !editMode}
                />
              </div>
            </div>
            
            {/* Calculation Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-lg font-semibold mb-2">Calculation Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>Training Fees: ₹{(invoiceData.trainingRate * invoiceData.totalHours).toFixed(2)}</div>
                <div>Conveyance: ₹{parseFloat(invoiceData.conveyance || 0).toFixed(2)}</div>
                <div>Food: ₹{parseFloat(invoiceData.food || 0).toFixed(2)}</div>
                <div>Lodging: ₹{parseFloat(invoiceData.lodging || 0).toFixed(2)}</div>
                <div className="font-semibold">Total Amount: ₹{calculateTotalAmount().toFixed(2)}</div>
                <div>TDS ({invoiceData.tds}%): ₹{(calculateTotalAmount() * (parseFloat(invoiceData.tds) || 0) / 100).toFixed(2)}</div>
                <div>Adhoc Adjustment: ₹{parseFloat(invoiceData.adhocAdjustment || 0).toFixed(2)}</div>
                <div className="font-semibold text-green-600">Net Payment: ₹{calculateNetPayment().toFixed(2)}</div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              {(!existingInvoice || editMode) && (
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isGenerating ? "Processing..." : (editMode ? "Update Invoice" : "Generate Invoice")}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InvoiceModal;