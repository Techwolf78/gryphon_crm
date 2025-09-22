import React, { useState, useEffect } from "react";

// RaiseInvoiceModal.js mein changes karo
const RaiseInvoiceModal = ({
  isOpen,
  invoice,
  onClose,
  onSubmit,
  isEdit,
  paymentType,
  existingInvoices,
}) => {
  const [formData, setFormData] = useState({
    totalContractValue: "",
    paymentType: "",
    installment: "",
    amountRaised: "",
    invoiceType: "Tax Invoice",
  });

  useEffect(() => {
    if (invoice) {
      // Agar edit mode mein hain, toh existing invoice data se form fill karo
      if (isEdit) {
        setFormData({
          totalContractValue:
            invoice.netPayableAmount || invoice.totalCost || "",
          paymentType: invoice.paymentType || "",
          installment: invoice.installment || "",
          amountRaised: invoice.amountRaised || invoice.netPayableAmount || "",
          invoiceType: invoice.invoiceType || "Tax Invoice",
        });
      } else {
        // Naya invoice create kar rahe hain
        setFormData({
          totalContractValue:
            invoice.netPayableAmount || invoice.totalCost || "",
          paymentType: paymentType || invoice.paymentType || "",
          installment: "",
          amountRaised: "",
          invoiceType: "Tax Invoice",
        });
      }
    }
  }, [invoice, paymentType, isEdit]);

  // Get available installments that haven't been generated yet
  const getAvailableInstallments = () => {
    if (!invoice || !invoice.paymentDetails) return [];

    // Get all existing invoices for this contract
    const contractInvoices = existingInvoices.filter(
      (inv) => inv.originalInvoiceId === invoice.id
    );

    // Filter out installments that have already been generated
    return invoice.paymentDetails.filter((payment) => {
      return !contractInvoices.some((inv) => inv.installment === payment.name);
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    // If installment is changed, update the amount automatically
    if (name === "installment" && invoice && invoice.paymentDetails) {
      const selectedInstallment = invoice.paymentDetails.find(
        (p) => p.name === value
      );
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        amountRaised: selectedInstallment
          ? selectedInstallment.totalAmount
          : prev.amountRaised,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = () => {
    onSubmit(formData, invoice);
  };

  const getPaymentTypeName = (type) => {
    switch (type) {
      case "AT":
        return "Advanced Training";
      case "ATP":
        return "Advanced Training Placement";
      case "ATTP":
        return "Advanced Training Training Placement";
      case "ATTT":
        return "Advanced Training Training Training";
      case "EMI":
        return "Equated Monthly Installment";
      default:
        return type;
    }
  };

  if (!isOpen) return null;

  const availableInstallments = getAvailableInstallments();

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center"
      id="my-modal"
    >
      <div className="p-4 border w-96 shadow-lg rounded-md bg-white">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">
            {isEdit
              ? "Edit Invoice"
              : `Raise ${getPaymentTypeName(paymentType)} Invoice`}
          </h3>
          <div className="mt-2 px-4 py-2">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Total Contract Value
              </label>
              <input
                type="text"
                name="totalContractValue"
                value={formData.totalContractValue}
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Payment Type
              </label>
              <input
                type="text"
                name="paymentType"
                value={getPaymentTypeName(formData.paymentType)}
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Installment
              </label>
              <select
                name="installment"
                value={formData.installment}
                onChange={handleFormChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Select Installment</option>
                {availableInstallments.map((payment, index) => (
                  <option key={index} value={payment.name}>
                    {payment.name} ({payment.percentage}%) - ₹
                    {payment.totalAmount}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Invoice Type
              </label>
              <div className="mt-1 flex gap-4">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="invoiceType"
                    value="Tax Invoice"
                    checked={formData.invoiceType === "Tax Invoice"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        invoiceType: e.target.value,
                      }))
                    }
                  />
                  Tax Invoice
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="invoiceType"
                    value="Proforma Invoice"
                    checked={formData.invoiceType === "Proforma Invoice"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        invoiceType: e.target.value,
                      }))
                    }
                  />
                  Proforma Invoice
                </label>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Amount Raised
              </label>
              <input
                type="text"
                name="amountRaised"
                value={formData.amountRaised}
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
              />
            </div>
          </div>
          <div className="flex items-center px-3 py-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 mr-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formData.installment}
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isEdit ? "Update Invoice" : "Raise Invoice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaiseInvoiceModal;
