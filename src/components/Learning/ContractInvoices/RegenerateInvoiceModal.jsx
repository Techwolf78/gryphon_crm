import React, { useState, useEffect } from "react";

const RegenerateInvoiceModal = ({
  isOpen,
  contract,
  installment,
  onClose,
  onSubmit,
  editInvoice,
}) => {
  const [formData, setFormData] = useState({
    invoiceType: "Tax Invoice",
  });

  useEffect(() => {
    if (editInvoice) {
      // For regenerate, default to same type as cancelled invoice
      setFormData({
        invoiceType: editInvoice.invoiceType || "Tax Invoice",
      });
    }
  }, [editInvoice]);

  const handleSubmit = () => {
    onSubmit(formData, contract, installment);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50"
      id="regenerate-modal"
    >
      <div className="p-4 border w-96 shadow-lg rounded-md bg-white">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Regenerate Cancelled Invoice
          </h3>
          <div className="mt-2 px-4 py-2">
            <p className="text-sm text-gray-600 mb-4">
              This will create a new invoice with the same details as the cancelled invoice.
            </p>
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Invoice Type
              </label>
              <div className="mt-1 flex gap-4 justify-center">
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
              className="px-4 py-2 bg-orange-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              Regenerate Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegenerateInvoiceModal;
