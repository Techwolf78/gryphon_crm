import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../../firebase";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { query, where, getDocs } from "firebase/firestore";
import {  FiX, FiEye, FiFileText, FiSave, FiArrowLeft, FiCheckCircle, FiXCircle, FiAlertCircle } from "react-icons/fi";
import { logInvoiceAction, AUDIT_ACTIONS } from "../../utils/trainerInvoiceAuditLogger";

// Import the standardized PDF generation function

// Helper function to round numbers to nearest whole number
const roundToNearestWhole = (num) => {
  return Math.round(num);
};

// Helper function to format payment cycle for UI display
const formatPaymentCycleForUI = (cycleStr) => {
  if (!cycleStr || cycleStr === 'unknown') return 'Unknown';

  // Parse format like "2025-12-1-15" or "2025-12-16-31"
  const parts = cycleStr.split('-');
  if (parts.length !== 4) return cycleStr;

  const [year, month, startDay, endDay] = parts;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[parseInt(month) - 1] || month;

  return `${monthName} ${year} (Days ${startDay}-${endDay})`;
};

function InvoiceModal({ trainer, onClose, onInvoiceGenerated, onToast }) {
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    if (!hasLoggedRef.current && trainer) {
      // console.log('📋 INVOICE MODAL opened for trainer:', trainer.trainerName, 'ID:', trainer.trainerId, 'Cycle:', trainer.paymentCycle, 'Mode: generate');
      hasLoggedRef.current = true;
    }
  }, [trainer]);

  const [invoiceData, setInvoiceData] = useState({
    billNumber: trainer?.paymentCycle 
      ? `INV-${Date.now()}-${trainer.paymentCycle.replace('-', '')}` 
      : `INV-${Date.now()}`,
    trainerName: trainer?.trainerName || "",
    projectCode: Array.isArray(trainer?.allProjects) ? trainer.allProjects.join(", ") : trainer?.projectCode || "",
    domain: trainer?.domain || "",
    topics: Array.isArray(trainer?.topics) ? trainer.topics.join(", ") : "",
    startDate: trainer?.earliestStartDate || "",
    endDate: trainer?.latestEndDate || "",
    billingDate: new Date().toISOString().split("T")[0],
    trainingRate: trainer?.perHourCost || 0,
    totalHours: trainer?.assignedHours || 0,
    tds: 10,
    adhocAdjustment: 0,
    conveyance: trainer?.totalConveyance || 0,
    perDayFood: trainer?.food || 0,
    perDayLodging: trainer?.lodging || 0,
    food: trainer?.totalFood || 0,
    lodging: trainer?.totalLodging || 0,
    totalStudents: trainer?.totalStudents || 0,
    businessName: trainer?.businessName || "",
    collegeName: trainer?.collegeName || "",
    gst: "", // GST option: "NA", "0", "18"
  });
  const [existingInvoice, setExistingInvoice] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [billNumberError, setBillNumberError] = useState('');
  const billNumberRef = useRef(null);

  // Memoize query dependencies to prevent useEffect dependency array size changes
  const queryDeps = useMemo(() => ({
    trainerId: trainer?.trainerId,
    collegeName: trainer?.collegeName,
    phase: trainer?.phase,
    gst: trainer?.gst,
    isMerged: trainer?.isMerged,
    projectCode: trainer?.projectCode,
    paymentCycle: trainer?.paymentCycle,
  }), [trainer?.trainerId, trainer?.collegeName, trainer?.phase, trainer?.gst, trainer?.isMerged, trainer?.projectCode, trainer?.paymentCycle]);

  useEffect(() => {
    const fetchTrainerBankDetails = async () => {
      if (!queryDeps.trainerId) return;

      try {
        const trainerRef = doc(db, "trainers", queryDeps.trainerId);
        const trainerSnap = await getDoc(trainerRef);

        if (trainerSnap.exists()) {
          const data = trainerSnap.data();
          setInvoiceData((prev) => ({
            ...prev,
            trainerName: data.name || data.trainerName || data.displayName || prev.trainerName,
            bankName: data.bankName || "",
            accountNumber: data.accountNumber || "",
            ifscCode: data.ifsc || "",
            panNumber: data.pan || "",
            trainerEmail: data.email || "",
            trainerPhone: data.phone || "",
            gst: prev.gst || (data.gst ? "0" : "NA"),
          }));
        } else {
          // Trainer document doesn't exist - this is expected for new trainers
          // console.warn(`Trainer document not found for trainerId: ${queryDeps.trainerId}`);
          setInvoiceData((prev) => ({
            ...prev,
            gst: prev.gst || "NA", // Default to NA if trainer not found
          }));
        }
      } catch {
        // console.error('Error fetching trainer bank details');
        // Continue with empty bank details - user can still fill them manually
      }
    };

    const checkExistingInvoice = async () => {
      if (!queryDeps.trainerId || !queryDeps.collegeName) return;

      // console.log('🔍 CHECKING EXISTING INVOICE for trainer:', queryDeps.trainerId, 'college:', queryDeps.collegeName, 'phase:', queryDeps.phase, 'paymentCycle:', trainer?.paymentCycle, 'projectCode:', queryDeps.projectCode);

      try {
        const q = queryDeps.isMerged
          ? query(
              collection(db, "invoices"),
              where("trainerId", "==", queryDeps.trainerId),
              where("collegeName", "==", queryDeps.collegeName),
              where("phase", "==", queryDeps.phase),
              where("paymentCycle", "==", trainer?.paymentCycle)
            )
          : query(
              collection(db, "invoices"),
              where("trainerId", "==", queryDeps.trainerId),
              where("collegeName", "==", queryDeps.collegeName),
              where("phase", "==", queryDeps.phase),
              where("projectCode", "==", queryDeps.projectCode),
              where("paymentCycle", "==", trainer?.paymentCycle)
            );

        const querySnapshot = await getDocs(q);
        // console.log('📋 Existing invoice query results:', querySnapshot.size, 'documents found for payment cycle:', trainer?.paymentCycle);
        
        if (!querySnapshot.empty) {
          // Get the most recent invoice
          const latestInvoiceDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
          const latestInvoice = {
            id: latestInvoiceDoc.id,
            ...latestInvoiceDoc.data(),
          };
          // console.log('📄 FOUND EXISTING INVOICE:', latestInvoice.billNumber, 'for cycle:', latestInvoice.paymentCycle, 'dates:', latestInvoice.startDate, 'to', latestInvoice.endDate);
          setExistingInvoice(latestInvoice);
          setViewMode(true); // Automatically set to view mode if invoice exists

          // Pre-fill form with existing data
          setInvoiceData((prev) => ({
            ...prev,
            ...latestInvoice,
            billingDate: latestInvoice.billingDate || new Date().toISOString().split("T")[0],
            gst: latestInvoice.gst !== undefined ? String(latestInvoice.gst) : (queryDeps.gst ? "0" : "NA"),
          }));
        } else {
          // console.log('✅ NO EXISTING INVOICE found for this payment cycle - ready to create new invoice');
          setExistingInvoice(null);
          setViewMode(false);
        }
      } catch {
        // console.error('Error checking for existing invoice');
        // Continue without existing invoice - user can create a new one
      }
    };

    checkExistingInvoice();
    fetchTrainerBankDetails();
  }, [queryDeps, trainer?.paymentCycle]);

const handleSubmit = async (e) => {
  e.preventDefault();
  if (viewMode) return; // Don't allow submission in view mode

  setIsGenerating(true);

  try {
    // Check for duplicate bill number
    const billNumberQuery = query(
      collection(db, "invoices"),
      where("billNumber", "==", invoiceData.billNumber)
    );
    const billNumberSnapshot = await getDocs(billNumberQuery);
    
    if (!billNumberSnapshot.empty) {
      setBillNumberError('Invoice number is taken!');
      setIsGenerating(false);
      // Scroll to bill number input field
      setTimeout(() => {
        billNumberRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    // Prepare invoice data
    const invoiceToSave = {
      ...invoiceData,
      trainerId: trainer?.trainerId,
      businessName: trainer?.businessName,
      formId: trainer?.formId,
      phase: trainer?.phase,
      projectCode: trainer?.projectCode,
      paymentCycle: trainer?.paymentCycle,
      totalAmount: calculateTotalAmount(),
      netPayment: calculateNetPayment(),
      updatedAt: new Date(),
      status: "generated",

      // 👇 add these defaults
      payment: false,
      invoice: false,
    };

    invoiceToSave.createdAt = new Date();
    // console.log('💾 SAVING INVOICE to Firebase:', {
    //   trainer: invoiceToSave.trainerName,
    //   id: invoiceToSave.trainerId,
    //   cycle: invoiceToSave.paymentCycle,
    //   billNumber: invoiceToSave.billNumber,
    //   totalAmount: invoiceToSave.totalAmount,
    //   netPayment: invoiceToSave.netPayment
    // });
    const docRef = await addDoc(collection(db, "invoices"), invoiceToSave);

    // Log the invoice generation action
    await logInvoiceAction(AUDIT_ACTIONS.GENERATE, {
      ...trainer,
      ...invoiceToSave,
      invoiceId: docRef.id
    }, {
      generatedFrom: 'modal',
      invoiceData: invoiceToSave
    });

    onToast({ type: 'success', message: "Invoice generated successfully!" });

    await onInvoiceGenerated(invoiceToSave); // Pass the invoice data for undo functionality
    onClose();

  } catch {
    // console.error('Error generating invoice');
    onToast({ type: 'error', message: "Invoice not generated. Please try again." });
  } finally {
    setIsGenerating(false);
  }
};


  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setInvoiceData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
    
    // Clear bill number error when bill number changes
    if (name === 'billNumber') {
      setBillNumberError('');
    }
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
    const gstAmount = invoiceData.gst === "18" ? roundToNearestWhole(trainingFees * 0.18) : 0;
    const taxableAmount = trainingFees + gstAmount;
    const tdsAmount = roundToNearestWhole((taxableAmount * (parseFloat(invoiceData.tds) || 0)) / 100);
    const otherExpenses = calculateTotalAmount() - trainingFees;
    
    // Final calculation: (Training Fees + GST - TDS) + Other Expenses + Adhoc Adjustment
    return roundToNearestWhole(
      taxableAmount - tdsAmount + otherExpenses + (parseFloat(invoiceData.adhocAdjustment) || 0)
    );
  };

  const isReadOnly = viewMode;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-transparent bg-opacity-50 flex items-center justify-center p-2 z-500">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-purple-600 px-2 py-1 flex justify-between items-center shrink-0">
          <div className="flex items-center">
            <h2 className="text-base font-bold text-white">
              {viewMode ? "View Invoice" : "Generate Invoice"}
            </h2>
            {existingInvoice && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {invoiceData.billNumber}
              </span>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-0.5 text-white hover:bg-black/20 rounded transition-colors"
            title="Close"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* Trainer Info */}
          <div className="mb-2 p-1.5 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-800 mb-1.5">Trainer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
              <div><span className="font-medium">Name:</span> {invoiceData.trainerName || trainer?.trainerName}</div>
              <div><span className="font-medium">ID:</span> {trainer?.trainerId}</div>
              <div><span className="font-medium">College:</span> {trainer?.businessName}</div>
              <div><span className="font-medium">Phase:</span> {trainer?.phase}</div>
              {trainer?.paymentCycle && (
                <div className="col-span-2">
                  <span className="font-medium">Payment Cycle:</span>
                  <span className="ml-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                    {formatPaymentCycleForUI(trainer.paymentCycle)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Bill Information */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Bill Number
                </label>
                <input
                  ref={billNumberRef}
                  type="text"
                  name="billNumber"
                  value={invoiceData.billNumber}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  required
                  readOnly={isReadOnly}
                />
                {billNumberError && (
                  <p className="text-red-500 text-xs mt-0.5">{billNumberError}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Billing Date
                </label>
                <input
                  type="date"
                  name="billingDate"
                  value={invoiceData.billingDate}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  required
                  readOnly={isReadOnly}
                />
              </div>

              {/* Project Information */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Project Code
                </label>
                <input
                  type="text"
                  name="projectCode"
                  value={invoiceData.projectCode}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  required
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Domain
                </label>
                <input
                  type="text"
                  name="domain"
                  value={invoiceData.domain}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  required
                  readOnly={isReadOnly}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Topics Covered
                </label>
                <input
                  type="text"
                  name="topics"
                  value={invoiceData.topics}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  readOnly={isReadOnly}
                />
              </div>

              {/* Training Dates */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={invoiceData.startDate}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={invoiceData.endDate}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  readOnly={isReadOnly}
                />
              </div>

              {/* Financial Information */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Training Rate (₹/hour)
                </label>
                <input
                  type="number"
                  name="trainingRate"
                  value={invoiceData.trainingRate}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  required
                  readOnly={isReadOnly}
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Total Hours
                </label>
                <input
                  type="number"
                  name="totalHours"
                  value={invoiceData.totalHours}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  required
                  readOnly={isReadOnly}
                  step="0.5"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  TDS (%)
                </label>
                <input
                  type="number"
                  name="tds"
                  value={invoiceData.tds}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  required
                  readOnly={isReadOnly}
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Adhoc Adjustment (₹)
                </label>
                <input
                  type="number"
                  name="adhocAdjustment"
                  value={invoiceData.adhocAdjustment}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  readOnly={isReadOnly}
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Conveyance (₹) - One-time
                </label>
                <input
                  type="number"
                  name="conveyance"
                  value={invoiceData.conveyance}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  readOnly={isReadOnly}
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Food (₹)
                </label>
                <input
                  type="number"
                  name="food"
                  value={invoiceData.food}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  readOnly={isReadOnly}
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Lodging (₹)
                </label>
                <input
                  type="number"
                  name="lodging"
                  value={invoiceData.lodging}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  readOnly={isReadOnly}
                  step="0.01"
                  min="0"
                />
              </div>

              {/* Bank Details */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={invoiceData.bankName || ""}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={invoiceData.accountNumber || ""}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  IFSC Code
                </label>
                <input
                  type="text"
                  name="ifscCode"
                  value={invoiceData.ifscCode || ""}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  PAN Number
                </label>
                <input
                  type="text"
                  name="panNumber"
                  value={invoiceData.panNumber || ""}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-sm"
                  readOnly={isReadOnly}
                />
              </div>

              {/* GST Section */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  GST Application
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gst"
                      value="NA"
                      checked={invoiceData.gst === "NA"}
                      onChange={handleChange}
                      disabled={isReadOnly || (invoiceData.gst !== "NA" && invoiceData.gst !== "")}
                      className="mr-2"
                    />
                    <span className="text-xs">NA</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gst"
                      value="0"
                      checked={invoiceData.gst === "0"}
                      onChange={handleChange}
                      disabled={isReadOnly || invoiceData.gst === "NA"}
                      className="mr-2"
                    />
                    <span className="text-xs">0%</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gst"
                      value="18"
                      checked={invoiceData.gst === "18"}
                      onChange={handleChange}
                      disabled={isReadOnly || invoiceData.gst === "NA"}
                      className="mr-2"
                    />
                    <span className="text-xs">18%</span>
                  </label>
                </div>
                {invoiceData.gst === "NA" && (
                  <p className="text-xs text-gray-500 mt-0.5">GST not applicable (trainer has no GST number)</p>
                )}
              </div>
            </div>

            {/* Calculation Summary */}
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Payment Summary</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Training Fees:</span>
                  <span>₹{roundToNearestWhole((invoiceData.trainingRate || 0) * (invoiceData.totalHours || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">GST ({invoiceData.gst === "NA" ? "NA" : invoiceData.gst + "%"}):</span>
                  <span className={invoiceData.gst === "18" ? "text-green-600" : ""}>₹{(() => {
                    const trainingFees = roundToNearestWhole((invoiceData.trainingRate || 0) * (invoiceData.totalHours || 0));
                    if (invoiceData.gst === "18") {
                      return roundToNearestWhole(trainingFees * 0.18).toLocaleString();
                    }
                    return "0";
                  })()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-red-600">TDS ({invoiceData.tds}% on Training Fees + GST only):</span>
                  <span className="text-red-600">-₹{(() => {
                    const trainingFees = roundToNearestWhole((invoiceData.trainingRate || 0) * (invoiceData.totalHours || 0));
                    const gstAmount = invoiceData.gst === "18" ? roundToNearestWhole(trainingFees * 0.18) : 0;
                    const taxableAmount = trainingFees + gstAmount;
                    return roundToNearestWhole((taxableAmount * (parseFloat(invoiceData.tds) || 0)) / 100).toLocaleString();
                  })()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Adhoc Adjustment:</span>
                  <span>₹{roundToNearestWhole(parseFloat(invoiceData.adhocAdjustment) || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Conveyance (one-time):</span>
                  <span>₹{roundToNearestWhole(parseFloat(invoiceData.conveyance) || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Food:</span>
                  <span>₹{roundToNearestWhole(parseFloat(invoiceData.food) || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Lodging:</span>
                  <span>₹{roundToNearestWhole(parseFloat(invoiceData.lodging) || 0).toLocaleString()}</span>
                </div>

                <div className="border-t border-blue-300 pt-1">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-blue-800">Taxable Amount (Training Fees + GST):</span>
                    <span className="text-blue-800">₹{(() => {
                      const trainingFees = roundToNearestWhole((invoiceData.trainingRate || 0) * (invoiceData.totalHours || 0));
                      const gstAmount = invoiceData.gst === "18" ? roundToNearestWhole(trainingFees * 0.18) : 0;
                      return (trainingFees + gstAmount).toLocaleString();
                    })()}</span>
                  </div>
                </div>

                <div className="border-t border-blue-300 pt-1">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-blue-800">Amount (after TDS):</span>
                    <span className="text-blue-800">₹{(() => {
                      const trainingFees = roundToNearestWhole((invoiceData.trainingRate || 0) * (invoiceData.totalHours || 0));
                      const gstAmount = invoiceData.gst === "18" ? roundToNearestWhole(trainingFees * 0.18) : 0;
                      const taxableAmount = trainingFees + gstAmount;
                      const tdsAmount = roundToNearestWhole((taxableAmount * (parseFloat(invoiceData.tds) || 0)) / 100);
                      const otherExpenses = calculateTotalAmount() - trainingFees;
                      return roundToNearestWhole(taxableAmount - tdsAmount + otherExpenses + (parseFloat(invoiceData.adhocAdjustment) || 0)).toLocaleString();
                    })()}</span>
                  </div>
                </div>

                <div className="border-t-2 border-blue-400 pt-1 mt-2">
                  <div className="flex justify-between items-center text-sm font-bold text-green-600">
                    <span>Net Payment:</span>
                    <span>₹{calculateNetPayment().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!viewMode && (
              <div className="flex justify-end space-x-2 pt-1 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
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
