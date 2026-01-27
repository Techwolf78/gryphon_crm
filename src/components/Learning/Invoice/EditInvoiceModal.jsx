import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../../../firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { FiX, FiSave, FiEdit2, FiCalendar, FiUser, FiMapPin, FiDollarSign } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { logInvoiceAction, AUDIT_ACTIONS } from "../../../utils/trainerInvoiceAuditLogger";

// Reusable form field component
const FormField = ({ label, name, type = "text", required, step, min, max, span = 1, value, onChange }) => (
  <div className={`${span === 2 ? 'md:col-span-2' : ''}`}>
    <label className="block text-xs font-medium text-gray-700 mb-0.5">{label}</label>
    <input
      type={type} name={name} value={value || ''} onChange={onChange}
      className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      required={required} step={step} min={min} max={max}
    />
  </div>
);

// Reusable summary row component
const SummaryRow = ({ label, value, bold, borderTop, red }) => (
  <div className={`flex justify-between items-center text-sm ${borderTop ? 'border-t border-gray-300 pt-2' : ''} ${bold ? 'font-semibold' : 'font-medium'}`}>
    <span>{label}</span>
    <span className={red ? 'text-red-600' : bold ? 'text-green-600' : ''}>{value}</span>
  </div>
);

function EditInvoiceModal({ trainer, onClose, onInvoiceUpdated, onToast }) {
  const [invoiceData, setInvoiceData] = useState({
    billNumber: '',
    projectCode: '',
    domain: '',
    topics: '',
    startDate: '',
    endDate: '',
    billingDate: '',
    trainingRate: 0,
    totalHours: 0,
    tds: 10,
    adhocAdjustment: 0,
    conveyance: 0,
    food: 0,
    lodging: 0,
    gst: 'NA',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    panNumber: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billNumberError, setBillNumberError] = useState('');
  const billNumberRef = useRef(null);

  // Fetch existing invoice data
  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        const q = trainer.isMerged
          ? query(
              collection(db, "invoices"),
              where("trainerId", "==", trainer.trainerId),
              where("collegeName", "==", trainer.collegeName),
              where("phase", "==", trainer.phase),
              where("paymentCycle", "==", trainer.paymentCycle)
            )
          : query(
              collection(db, "invoices"),
              where("trainerId", "==", trainer.trainerId),
              where("collegeName", "==", trainer.collegeName),
              where("phase", "==", trainer.phase),
              where("projectCode", "==", trainer.projectCode),
              where("paymentCycle", "==", trainer.paymentCycle)
            );

        // console.log('🔍 EditInvoiceModal fetching invoice for:', {
        //   trainerId: trainer.trainerId,
        //   collegeName: trainer.collegeName,
        //   phase: trainer.phase,
        //   paymentCycle: trainer.paymentCycle,
        //   projectCode: trainer.projectCode,
        //   isMerged: trainer.isMerged
        // });

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const invoiceDoc = querySnapshot.docs[0];
          const data = invoiceDoc.data();
          // console.log('✅ EditInvoiceModal found invoice:', {
          //   trainer: trainer.trainerName,
          //   cycle: trainer.paymentCycle,
          //   billNumber: data.billNumber,
          //   netPayment: data.netPayment,
          //   totalAmount: data.totalAmount,
          //   totalHours: data.totalHours
          // });
          setInvoiceData({
            ...data,
            billingDate: data.billingDate || new Date().toISOString().split("T")[0],
            gst: String(data.gst || 'NA'),
          });
        } else {
          // console.log('❌ EditInvoiceModal no invoice found for:', {
          //   trainer: trainer.trainerName,
          //   cycle: trainer.paymentCycle
          // });
        }
      } catch (error) {
        // console.error('Error fetching invoice:', error);
        onToast({ type: 'error', message: 'Failed to load invoice data' });
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [trainer, onToast]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setInvoiceData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    
    // Clear bill number error when bill number changes
    if (name === 'billNumber') {
      setBillNumberError('');
    }
  };

  // Memoized calculations
  const calculations = useMemo(() => {
    const trainingFees = Math.round((invoiceData.trainingRate || 0) * (invoiceData.totalHours || 0));
    const gstAmount = invoiceData.gst === "18" ? Math.round(trainingFees * 0.18) : 0;
    const taxableAmount = trainingFees + gstAmount;
    const tdsAmount = Math.round((taxableAmount * (parseFloat(invoiceData.tds) || 0)) / 100);
    const otherExpenses = Math.round((parseFloat(invoiceData.conveyance) || 0) + (parseFloat(invoiceData.food) || 0) + (parseFloat(invoiceData.lodging) || 0));
    const netPayment = taxableAmount - tdsAmount + otherExpenses + (parseFloat(invoiceData.adhocAdjustment) || 0);

    return { trainingFees, gstAmount, taxableAmount, tdsAmount, otherExpenses, netPayment };
  }, [invoiceData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Check for duplicate bill number
      const billNumberQuery = query(
        collection(db, "invoices"),
        where("billNumber", "==", invoiceData.billNumber)
      );
      const billNumberSnapshot = await getDocs(billNumberQuery);
      
      if (!billNumberSnapshot.empty) {
        // Check if it's not the current invoice being edited
        const existingDoc = billNumberSnapshot.docs[0];
        const currentInvoiceQuery = trainer.isMerged
          ? query(
              collection(db, "invoices"),
              where("trainerId", "==", trainer.trainerId),
              where("collegeName", "==", trainer.collegeName),
              where("phase", "==", trainer.phase),
              where("paymentCycle", "==", trainer.paymentCycle)
            )
          : query(
              collection(db, "invoices"),
              where("trainerId", "==", trainer.trainerId),
              where("collegeName", "==", trainer.collegeName),
              where("phase", "==", trainer.phase),
              where("projectCode", "==", trainer.projectCode),
              where("paymentCycle", "==", trainer.paymentCycle)
            );
        
        const currentInvoiceSnapshot = await getDocs(currentInvoiceQuery);
        const isSameInvoice = currentInvoiceSnapshot.docs.some(doc => doc.id === existingDoc.id);
        
        if (!isSameInvoice) {
          setBillNumberError('Invoice number is taken!');
          setSaving(false);
          // Scroll to bill number input field
          setTimeout(() => {
            billNumberRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
          return;
        }
      }

      // Find the invoice document
      const q = trainer.isMerged
        ? query(
            collection(db, "invoices"),
            where("trainerId", "==", trainer.trainerId),
            where("collegeName", "==", trainer.collegeName),
            where("phase", "==", trainer.phase),
            where("paymentCycle", "==", trainer.paymentCycle)
          )
        : query(
            collection(db, "invoices"),
            where("trainerId", "==", trainer.trainerId),
            where("collegeName", "==", trainer.collegeName),
            where("phase", "==", trainer.phase),
            where("projectCode", "==", trainer.projectCode),
            where("paymentCycle", "==", trainer.paymentCycle)
          );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const invoiceRef = doc(db, "invoices", querySnapshot.docs[0].id);
        const originalInvoiceData = querySnapshot.docs[0].data();

        const updatedInvoice = {
          ...invoiceData,
          totalAmount: calculations.taxableAmount, // Taxable amount (training fees + GST)
          netPayment: calculations.netPayment,
          updatedAt: new Date(),
          // If resubmitting a rejected invoice, reset status to pending (like approved)
          ...(invoiceData.status === "rejected" && {
            status: "pending",
            rejectedDate: null,
            rejectedBy: null,
            rejectionRemarks: null,
          }),
        };

        await updateDoc(invoiceRef, updatedInvoice);

        // Log the invoice edit action
        await logInvoiceAction(AUDIT_ACTIONS.EDIT, {
          ...trainer,
          ...updatedInvoice,
          invoiceId: querySnapshot.docs[0].id
        }, {
          previousValues: originalInvoiceData,
          newValues: updatedInvoice,
          changedFields: Object.keys(updatedInvoice).filter(key => 
            JSON.stringify(originalInvoiceData[key]) !== JSON.stringify(updatedInvoice[key])
          ),
          editReason: invoiceData.status === "rejected" ? "Resubmitting rejected invoice" : "Manual edit"
        });

        onToast({ type: 'success', message: 'Invoice updated successfully!' });
        onInvoiceUpdated();
        onClose();
      }
    } catch (error) {
      // console.error('Error updating invoice:', error);
      onToast({ type: 'error', message: 'Failed to update invoice' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-2 z-54">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-purple-600 px-2 py-1 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <FiEdit2 className="text-white text-base" />
            <div>
              <h2 className="text-base font-bold text-white">Edit Invoice</h2>
              <p className="text-blue-100 text-xs">{invoiceData.billNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-0.5 text-white hover:bg-black/20 rounded transition-colors">
            <FiX size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* Trainer Info - Compact */}
          <div className="bg-linear-to-r from-gray-50 to-blue-50 rounded-lg p-1.5 mb-2 border border-gray-200">
            <div className="flex items-center gap-3">
              <FiUser className="text-blue-600 text-base" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{trainer.trainerName}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span>ID: {trainer.trainerId}</span>
                  <span className="flex items-center gap-1">
                    <FiMapPin className="text-xs" />{trainer.businessName}
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{trainer.phase}</span>
                </div>
              </div>
            </div>
          </div>

          <form id="invoiceForm" onSubmit={handleSubmit} className="space-y-2">
            {/* Basic Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5 flex items-center gap-2">
                <FiCalendar className="text-blue-600" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Bill Number</label>
                  <input
                    ref={billNumberRef}
                    type="text" name="billNumber" value={invoiceData.billNumber || ''} onChange={handleChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                  {billNumberError && (
                    <p className="text-red-500 text-xs mt-0.5">{billNumberError}</p>
                  )}
                </div>
                <FormField label="Billing Date" name="billingDate" type="date" required value={invoiceData.billingDate} onChange={handleChange} />
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Project Code</label>
                  <input
                    type="text" name="projectCode" value={invoiceData.projectCode || ''} 
                    className="w-full px-2 py-1 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Domain</label>
                  <input
                    type="text" name="domain" value={invoiceData.domain || ''} 
                    className="w-full px-2 py-1 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
                    readOnly
                  />
                </div>
                <FormField label="Topics Covered" name="topics" span={2} value={invoiceData.topics} onChange={handleChange} />
                <FormField label="Start Date" name="startDate" type="date" value={invoiceData.startDate} onChange={handleChange} />
                <FormField label="End Date" name="endDate" type="date" value={invoiceData.endDate} onChange={handleChange} />
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5 flex items-center gap-2">
                <FaRupeeSign className="text-green-600" />
                Financial Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <FormField label="Training Rate (₹/hour)" name="trainingRate" type="number" step="0.01" min="0" required value={invoiceData.trainingRate} onChange={handleChange} />
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Total Hours</label>
                  <input
                    type="number" name="totalHours" value={invoiceData.totalHours || ''} 
                    className="w-full px-2 py-1 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
                    readOnly
                  />
                </div>
                <FormField label="TDS (%)" name="tds" type="number" step="0.01" min="0" max="100" required value={invoiceData.tds} onChange={handleChange} />
                <FormField label="Adhoc Adjustment (₹)" name="adhocAdjustment" type="number" step="0.01" value={invoiceData.adhocAdjustment} onChange={handleChange} />
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Conveyance (₹)</label>
                  <input
                    type="number" name="conveyance" value={invoiceData.conveyance || ''} 
                    className="w-full px-2 py-1 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Food (₹)</label>
                  <input
                    type="number" name="food" value={invoiceData.food || ''} 
                    className="w-full px-2 py-1 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Lodging (₹)</label>
                  <input
                    type="number" name="lodging" value={invoiceData.lodging || ''} 
                    className="w-full px-2 py-1 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* GST Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5">GST Application</h3>
              <div className="flex gap-6">
                {['NA', '0', '18'].map(rate => (
                  <label key={rate} className="flex items-center">
                    <input type="radio" name="gst" value={rate} checked={invoiceData.gst === rate} onChange={handleChange}
                           disabled={rate === 'NA' ? (invoiceData.gst !== "NA" && invoiceData.gst !== "") : invoiceData.gst === "NA"}
                           className="mr-2 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-medium">{rate === 'NA' ? 'NA' : rate + '%'}</span>
                  </label>
                ))}
              </div>
              {invoiceData.gst === "NA" && (
                <p className="text-xs text-gray-500 mt-1">GST not applicable (trainer has no GST number)</p>
              )}
            </div>

            {/* Bank Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5">Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <FormField label="Bank Name" name="bankName" value={invoiceData.bankName} onChange={handleChange} />
                <FormField label="Account Number" name="accountNumber" value={invoiceData.accountNumber} onChange={handleChange} />
                <FormField label="IFSC Code" name="ifscCode" value={invoiceData.ifscCode} onChange={handleChange} />
                <FormField label="PAN Number" name="panNumber" value={invoiceData.panNumber} onChange={handleChange} />
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-linear-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5 flex items-center gap-2">
                <FiDollarSign className="text-green-600" />
                Payment Summary
              </h3>
              <div className="space-y-1 text-sm">
                <SummaryRow label="Training Fees:" value={`₹${calculations.trainingFees.toLocaleString()}`} />
                <SummaryRow label={`GST (${invoiceData.gst === "NA" ? "NA" : invoiceData.gst + "%"}):`} 
                           value={`₹${calculations.gstAmount.toLocaleString()}`} />
                <SummaryRow label="Taxable Amount (Training Fees + GST):" value={`₹${calculations.taxableAmount.toLocaleString()}`} bold borderTop />
                <SummaryRow label={`TDS (${invoiceData.tds}% on Training Fees + GST only):`} value={`-₹${calculations.tdsAmount.toLocaleString()}`} />
                <SummaryRow label="Other Expenses (Conveyance + Food + Lodging):" value={`₹${calculations.otherExpenses.toLocaleString()}`} />
                <SummaryRow label="Adhoc Adjustment:" value={`₹${(parseFloat(invoiceData.adhocAdjustment) || 0).toLocaleString()}`} />
                <div className="border-t-2 border-green-400 pt-1 mt-2">
                  <SummaryRow label="Net Payment:" value={`₹${calculations.netPayment.toLocaleString()}`} bold />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-1 border-t border-gray-200 bg-white">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="invoiceForm"
              disabled={saving}
              className="px-2 py-1 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all flex items-center gap-2 text-sm"
            >
              <FiSave className="text-xs" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditInvoiceModal;