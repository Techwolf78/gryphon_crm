import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, getDoc, collection, addDoc, updateDoc } from "firebase/firestore";
import { query, where, getDocs } from "firebase/firestore";
import {  FiX, FiEdit2, FiEye, FiFileText, FiSave, FiArrowLeft, FiCheckCircle, FiXCircle, FiAlertCircle } from "react-icons/fi";

// Import the standardized PDF generation function

function getTrainingDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

// Helper function to round numbers to nearest whole number
const roundToNearestWhole = (num) => {
  return Math.round(num);
};

function InvoiceModal({ trainer, onClose, onInvoiceGenerated, onToast }) {
  const days = getTrainingDays(trainer?.earliestStartDate, trainer?.latestEndDate);
    const [invoiceData, setInvoiceData] = useState({
    billNumber: `INV-${Date.now()}`,
    projectCode: Array.isArray(trainer?.allProjects) ? trainer.allProjects.join(", ") : trainer?.projectCode || "",
    domain: trainer?.domain || "",
    topics: Array.isArray(trainer?.topics) ? trainer.topics.join(", ") : "",
    startDate: trainer?.earliestStartDate || "",
    endDate: trainer?.latestEndDate || "",
    billingDate: new Date().toISOString().split("T")[0],
    trainingRate: trainer?.perHourCost || 0,
    totalHours: trainer?.totalCollegeHours || 0,
    tds: 10,
    adhocAdjustment: 0,
    conveyance: trainer?.conveyance || 0,
    perDayFood: trainer?.food || 0,
    perDayLodging: trainer?.lodging || 0,
    food: (trainer?.food || 0) * days,
    lodging: (trainer?.lodging || 0) * days,
    businessName: trainer?.businessName || "",
    collegeName: trainer?.collegeName || "",
  });
  const [existingInvoice, setExistingInvoice] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);

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
          // Trainer document doesn't exist - this is expected for new trainers
          console.warn(`Trainer document not found for trainerId: ${trainer?.trainerId}`);
        }
      } catch (error) {
        console.error('Error fetching trainer bank details:', error);
        // Continue with empty bank details - user can still fill them manually
      }
    };

    const checkExistingInvoice = async () => {
      if (!trainer?.trainerId || !trainer?.collegeName) return;

      try {
        const q = query(
          collection(db, "invoices"),
          where("trainerId", "==", trainer.trainerId),
          where("collegeName", "==", trainer.collegeName),
          where("phase", "==", trainer.phase)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          // Get the most recent invoice
          const latestInvoiceDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
          const latestInvoice = {
            id: latestInvoiceDoc.id,
            ...latestInvoiceDoc.data(),
          };
          setExistingInvoice(latestInvoice);
          setViewMode(true); // Automatically set to view mode if invoice exists

          // Pre-fill form with existing data
          setInvoiceData((prev) => ({
            ...prev,
            ...latestInvoice,
            billingDate: latestInvoice.billingDate || new Date().toISOString().split("T")[0],
          }));
        }
      } catch (error) {
        console.error('Error checking for existing invoice:', error);
        // Continue without existing invoice - user can create a new one
      }
    };

    checkExistingInvoice();
    fetchTrainerBankDetails();
  }, [trainer?.trainerId, trainer?.collegeName, trainer?.phase]);

const handleSubmit = async (e) => {
  e.preventDefault();
  setIsGenerating(true);

  try {
    // Prepare invoice data
    const invoiceToSave = {
      ...invoiceData,
      trainerId: trainer?.trainerId,
      trainerName: trainer?.trainerName,
      businessName: trainer?.businessName,
      formId: trainer?.formId,
      phase: trainer?.phase,
      projectCode: trainer?.projectCode,
      totalAmount: calculateTotalAmount(),
      netPayment: calculateNetPayment(),
      updatedAt: new Date(),
      status: "generated",

      // 👇 add these defaults
      payment: false,
      invoice: false,
    };

    if (existingInvoice && editMode) {
      await updateDoc(doc(db, "invoices", existingInvoice.id), invoiceToSave);
      onToast({ type: 'success', message: "Changes applied successfully!" });
    } else {
      invoiceToSave.createdAt = new Date();
      const docRef = await addDoc(collection(db, "invoices"), invoiceToSave);
      onToast({ type: 'success', message: "Invoice generated successfully!" });
      setExistingInvoice({ id: docRef.id, ...invoiceToSave });
    }

    await onInvoiceGenerated(invoiceToSave); // Pass the invoice data for undo functionality
    setEditMode(false);
    setViewMode(true);
    onClose();

  } catch (error) {
    console.error('Error generating/updating invoice:', error);
    onToast({ type: 'error', message: "Invoice not generated. Please try again." });
  } finally {
    setIsGenerating(false);
  }
};


  const handleEditToggle = () => {
    setEditMode(!editMode);
    setViewMode(false);
  };

  const handleCancelEdit = () => {
    if (existingInvoice) {
      // Reset to original invoice data
      setInvoiceData((prev) => ({
        ...prev,
        ...existingInvoice,
        billingDate: existingInvoice.billingDate || new Date().toISOString().split("T")[0],
      }));
    }
    setEditMode(false);
    setViewMode(true);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setInvoiceData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const calculateTotalAmount = () => {
    return roundToNearestWhole(
      (invoiceData.trainingRate || 0) * (invoiceData.totalHours || 0) +
      (parseFloat(invoiceData.conveyance) || 0) +
      (parseFloat(invoiceData.food) || 0) +
      (parseFloat(invoiceData.lodging) || 0)
    );
  };

  const calculateNetPayment = () => {
    const trainingFees = roundToNearestWhole((invoiceData.trainingRate || 0) * (invoiceData.totalHours || 0));
    const tdsAmount = roundToNearestWhole((trainingFees * (parseFloat(invoiceData.tds) || 0)) / 100);
    const totalAmount = calculateTotalAmount();
    return roundToNearestWhole(
      totalAmount + (parseFloat(invoiceData.adhocAdjustment) || 0) - tdsAmount
    );
  };

  const isReadOnly = viewMode || (existingInvoice && !editMode);

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-transparent bg-opacity-50 flex items-center justify-center p-4 z-500">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {editMode ? "Edit Invoice" : 
                 viewMode ? "View Invoice" : "Generate Invoice"}
              </h2>
              {existingInvoice && (
                <span className="ml-3 bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                  {invoiceData.billNumber}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Action Buttons */}
              {existingInvoice && viewMode && (
                <>
                  <button
                    onClick={handleEditToggle}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    title="Edit Invoice"
                  >
                    <FiEdit2 className="mr-1" />
                    Edit
                  </button>
                </>
              )}
              
              {editMode && (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <FiArrowLeft className="mr-1" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isGenerating}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <FiSave className="mr-1" />
                    {isGenerating ? "Saving..." : "Save"}
                  </button>
                </>
              )}
              
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                title="Close"
              >
                <FiX size={20} />
              </button>
            </div>
          </div>

          {/* Trainer Info */}
          <div className="mb-4 p-2 bg-gray-50 rounded-lg">
            <h3 className="text-base font-semibold text-gray-800 mb-2">Trainer  Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div><span className="font-medium">Name:</span> {trainer?.trainerName}</div>
              <div><span className="font-medium">ID:</span> {trainer?.trainerId}</div>
              <div><span className="font-medium">College:</span> {trainer?.businessName}</div>
              <div><span className="font-medium">Phase:</span> {trainer?.phase}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Bill Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Bill Number
                </label>
                <input
                  type="text"
                  name="billNumber"
                  value={invoiceData.billNumber}
                  onChange={handleChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md"
                  required
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Billing Date
                </label>
                <input
                  type="date"
                  name="billingDate"
                  value={invoiceData.billingDate}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={isReadOnly}
                />
              </div>

              {/* Project Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Project Code
                </label>
                <input
                  type="text"
                  name="projectCode"
                  value={invoiceData.projectCode}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Domain
                </label>
                <input
                  type="text"
                  name="domain"
                  value={invoiceData.domain}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={isReadOnly}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Topics Covered
                </label>
                <input
                  type="text"
                  name="topics"
                  value={invoiceData.topics}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={isReadOnly}
                />
              </div>

              {/* Training Dates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={invoiceData.startDate}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={invoiceData.endDate}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={isReadOnly}
                />
              </div>

              {/* Financial Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Training Rate (₹/hour)
                </label>
                <input
                  type="number"
                  name="trainingRate"
                  value={invoiceData.trainingRate}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={isReadOnly}
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Total Hours
                </label>
                <input
                  type="number"
                  name="totalHours"
                  value={invoiceData.totalHours}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={isReadOnly}
                  step="0.5"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  TDS (%)
                </label>
                <input
                  type="number"
                  name="tds"
                  value={invoiceData.tds}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  readOnly={isReadOnly}
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Adhoc Adjustment (₹)
                </label>
                <input
                  type="number"
                  name="adhocAdjustment"
                  value={invoiceData.adhocAdjustment}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={isReadOnly}
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Conveyance (₹) - One-time
                </label>
                <input
                  type="number"
                  name="conveyance"
                  value={invoiceData.conveyance}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={isReadOnly}
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Food (₹{invoiceData.perDayFood.toFixed(2)} × {days} d)
                </label>
                <input
                  type="number"
                  name="food"
                  value={invoiceData.food}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={isReadOnly}
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Lodging (₹{invoiceData.perDayLodging.toFixed(2)} × {days} d)
                </label>
                <input
                  type="number"
                  name="lodging"
                  value={invoiceData.lodging}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={isReadOnly}
                  step="0.01"
                  min="0"
                />
              </div>

              {/* Bank Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={invoiceData.bankName || ""}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={invoiceData.accountNumber || ""}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  IFSC Code
                </label>
                <input
                  type="text"
                  name="ifscCode"
                  value={invoiceData.ifscCode || ""}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  PAN Number
                </label>
                <input
                  type="text"
                  name="panNumber"
                  value={invoiceData.panNumber || ""}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            {/* Calculation Summary */}
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-base font-semibold text-blue-800 mb-2">Payment Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="text-sm">
                  <span className="font-medium">Training Fees:</span> ₹
                  {roundToNearestWhole((invoiceData.trainingRate || 0) * (invoiceData.totalHours || 0)).toLocaleString()}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Conveyance (one-time):</span> ₹
                  {roundToNearestWhole(parseFloat(invoiceData.conveyance) || 0).toLocaleString()}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Food ({invoiceData.perDayFood.toFixed(2)} × {days}):</span> ₹
                  {roundToNearestWhole(parseFloat(invoiceData.food) || 0).toLocaleString()}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Lodging ({invoiceData.perDayLodging.toFixed(2)} × {days}):</span> ₹
                  {roundToNearestWhole(parseFloat(invoiceData.lodging) || 0).toLocaleString()}
                </div>
                <div className="text-sm font-semibold border-t border-blue-200 pt-2">
                  <span className="text-blue-800">Total Amount:</span> ₹
                  {calculateTotalAmount().toLocaleString()}
                </div>
                <div className="text-sm">
                  <span className="font-medium">TDS ({invoiceData.tds}% on Training Fees):</span> ₹
                  {roundToNearestWhole((((invoiceData.trainingRate || 0) * (invoiceData.totalHours || 0) * (parseFloat(invoiceData.tds) || 0)) / 100)).toLocaleString()}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Adhoc Adjustment:</span> ₹
                  {roundToNearestWhole(parseFloat(invoiceData.adhocAdjustment) || 0).toLocaleString()}
                </div>
                <div className="text-sm font-semibold border-t border-blue-200 pt-2 text-green-600">
                  <span className="font-bold">Net Payment:</span> ₹
                  {calculateNetPayment().toLocaleString()}
                </div>
              </div>
            </div>

            {/* Action Buttons for New Invoice */}
            {!existingInvoice && !viewMode && (
              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isGenerating ? "Generating..." : "Generate Invoice"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default InvoiceModal;
