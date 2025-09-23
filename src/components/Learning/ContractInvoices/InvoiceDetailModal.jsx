import React, { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";

const InvoiceDetailModal = ({ invoice, contract, onClose, onDownload, isViewMode = false, onSave }) => {
  const [isEditing, setIsEditing] = useState(!isViewMode);
  const [formData, setFormData] = useState({ ...invoice });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({ ...invoice });
    setIsEditing(!isViewMode);
  }, [invoice, isViewMode]);

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
      await updateDoc(invoiceRef, { 
        ...formData, 
        updatedDate: new Date() 
      });
      alert("Invoice updated successfully!");
      setIsEditing(false);
      onSave?.(); // Call the onSave callback to refresh parent data
    } catch (err) {
      console.error("Error saving invoice:", err);
      alert("Failed to save invoice. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (isViewMode) {
      setIsEditing(false);
    } else {
      setFormData({ ...invoice });
      setIsEditing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-500">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
        >
          ✖
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center">
          {isViewMode ? "Invoice Details" : "Edit Invoice"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Invoice Number:</label>
              {isEditing ? (
                <input
                  name="invoiceNumber"
                  value={formData.invoiceNumber || ""}
                  onChange={handleChange}
                  className="border border-gray-300 px-3 py-2 rounded w-full"
                />
              ) : (
                <p className="text-gray-900">{invoice.invoiceNumber || "N/A"}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Date:</label>
              <p className="text-gray-900">{getDate(invoice.raisedDate)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Installment:</label>
              {isEditing ? (
                <input
                  name="installment"
                  value={formData.installment || ""}
                  onChange={handleChange}
                  className="border border-gray-300 px-3 py-2 rounded w-full"
                />
              ) : (
                <p className="text-gray-900">{invoice.installment || "N/A"}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">College Name:</label>
              <p className="text-gray-900">{contract?.collegeName || "N/A"}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Project Code:</label>
              <p className="text-gray-900">{contract?.projectCode || "N/A"}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Course:</label>
              <p className="text-gray-900">{contract?.course || "N/A"}</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Students:</label>
              <p className="text-gray-900">{contract?.studentCount || "N/A"}</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status:</label>
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

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Invoice Type:</label>
              {isEditing ? (
                <select
                  name="invoiceType"
                  value={formData.invoiceType || "Tax Invoice"}
                  onChange={handleChange}
                  className="border border-gray-300 px-3 py-2 rounded w-full"
                >
                  <option value="Tax Invoice">Tax Invoice</option>
                  <option value="Proforma Invoice">Proforma Invoice</option>
                </select>
              ) : (
                <p className="text-gray-900">{invoice.invoiceType || "Tax Invoice"}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Type:</label>
              <p className="text-gray-900">{invoice.paymentType || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Financial Details */}
        <div className="border-t pt-4 mb-6">
          <h3 className="font-bold text-lg mb-4">Financial Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Amount Raised:</label>
              {isEditing ? (
                <input
                  name="amountRaised"
                  type="number"
                  value={formData.amountRaised || ""}
                  onChange={handleChange}
                  className="border border-gray-300 px-3 py-2 rounded w-full"
                />
              ) : (
                <p className="text-green-600 font-bold text-lg">
                  {formatCurrency(invoice.amountRaised || invoice.netPayableAmount)}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Per Student Cost:</label>
              <p className="text-gray-900">{formatCurrency(contract?.perStudentCost)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Total Cost:</label>
              <p className="text-gray-900">{formatCurrency(contract?.totalCost)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">GST Amount:</label>
              {isEditing ? (
                <input
                  name="gstAmount"
                  type="number"
                  value={formData.gstAmount || ""}
                  onChange={handleChange}
                  className="border border-gray-300 px-3 py-2 rounded w-full"
                />
              ) : (
                <p className="text-gray-900">{formatCurrency(invoice.gstAmount)}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">GST Type:</label>
              <p className="text-gray-900">{contract?.gstType || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => onDownload(invoice)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm"
          >
            Download Invoice
          </button>

          {!isViewMode && (
            <>
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded text-sm"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded text-sm"
                >
                  Edit Invoice
                </button>
              )}
            </>
          )}
          
          {isViewMode && isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded text-sm"
            >
              Back to View
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;