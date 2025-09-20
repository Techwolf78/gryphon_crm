// InvoiceDetailModal.jsx
import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";

const InvoiceDetailModal = ({ invoice, contract, onClose, onDownload }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...invoice });
  const [saving, setSaving] = useState(false);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "-";
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(Number(amount));
    } catch {
      return `₹${amount}`;
    }
  };

  const getDate = (dateValue) => {
    if (!dateValue) return new Date().toLocaleDateString();
    if (dateValue?.toDate) return dateValue.toDate().toLocaleDateString();
    try {
      return new Date(dateValue).toLocaleDateString();
    } catch {
      return new Date().toLocaleDateString();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const invoiceRef = doc(db, "ContractInvoices", invoice.id);
      await updateDoc(invoiceRef, { ...formData, updatedDate: new Date() });
      alert("Invoice updated successfully!");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save invoice. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
        >
          ✖
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center">Invoice Details</h2>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-gray-700">Invoice Number:</p>
              <p className="text-gray-900">{invoice.invoiceNumber || "N/A"}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Date:</p>
              <p className="text-gray-900">{getDate(invoice.raisedDate)}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Installment:</p>
              {isEditing ? (
                <input
                  name="installment"
                  value={formData.installment || ""}
                  onChange={handleChange}
                  className="border px-2 py-1 rounded w-full"
                />
              ) : (
                <p className="text-gray-900">{invoice.installment || "N/A"}</p>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-700">College Name:</p>
              <p className="text-gray-900">{contract.collegeName || "N/A"}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="font-semibold text-gray-700">Project Code:</p>
              <p className="text-gray-900">{contract.projectCode || "N/A"}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Course:</p>
              <p className="text-gray-900">{contract.course || "N/A"}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Students:</p>
              <p className="text-gray-900">{contract.studentCount || "N/A"}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Status:</p>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  invoice.status === "approved"
                    ? "bg-green-100 text-green-800"
                    : invoice.status === "raised"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {invoice.status || "draft"}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Details */}
        <div className="border-t pt-4 mb-6">
          <h3 className="font-bold text-lg mb-3">Financial Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-gray-700">Amount Raised:</p>
              {isEditing ? (
                <input
                  name="amountRaised"
                  type="number"
                  value={formData.amountRaised || ""}
                  onChange={handleChange}
                  className="border px-2 py-1 rounded w-full"
                />
              ) : (
                <p className="text-green-600 font-bold text-lg">
                  {formatCurrency(invoice.amountRaised || invoice.netPayableAmount)}
                </p>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-700">Per Student Cost:</p>
              <p className="text-gray-900">{formatCurrency(contract.perStudentCost)}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Total Cost:</p>
              <p className="text-gray-900">{formatCurrency(contract.totalCost)}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">GST Amount:</p>
              {isEditing ? (
                <input
                  name="gstAmount"
                  type="number"
                  value={formData.gstAmount || ""}
                  onChange={handleChange}
                  className="border px-2 py-1 rounded w-full"
                />
              ) : (
                <p className="text-gray-900">{formatCurrency(invoice.gstAmount)}</p>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-700">Payment Type:</p>
              <p className="text-gray-900">{invoice.paymentType || "N/A"}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">GST Type:</p>
              <p className="text-gray-900">{contract.gstType || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => onDownload(invoice)}
            className="flex items-center bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Download
          </button>

          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
