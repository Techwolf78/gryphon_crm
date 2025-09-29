import React, { useState, useEffect } from "react";

const RaiseInvoiceModal = ({
  isOpen,
  contract,
  installment,
  onClose,
  onSubmit,
  isEdit,
  editInvoice,
}) => {
  const [formData, setFormData] = useState({
    invoiceType: "Tax Invoice",
  });

  useEffect(() => {
    if (isEdit && editInvoice) {
      // For converting Proforma to Tax Invoice
      setFormData({
        invoiceType: "Tax Invoice",
      });
    } else {
      // For new invoice
      setFormData({
        invoiceType: "Tax Invoice",
      });
    }
  }, [isEdit, editInvoice]);


  const handleSubmit = () => {
    onSubmit(formData, contract, installment);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50"
      id="my-modal"
    >
      <div className="p-4 border w-96 shadow-lg rounded-md bg-white">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">
            {isEdit ? "Convert to Tax Invoice" : "Generate Invoice"}
          </h3>
          <div className="mt-2 px-4 py-2">
           
            
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
                    disabled={isEdit} // Disable for conversion (always Tax)
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
                    disabled={isEdit} // Disable for conversion
                  />
                  Proforma Invoice
                </label>
              </div>
              {isEdit && (
                <p className="text-xs text-yellow-600 mt-1">
                  Converting Proforma invoice to Tax Invoice
                </p>
              )}
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
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {isEdit ? "Convert to Tax Invoice" : "Generate Invoice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaiseInvoiceModal;