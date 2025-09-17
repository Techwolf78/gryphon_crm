import React, { useState, useEffect } from "react";

const RaiseInvoiceModal = ({ isOpen, invoice, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    totalContractValue: '',
    paymentType: '',
    installment: '',
    amountRaised: ''
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        totalContractValue: invoice.totalCost || '',
        paymentType: '',
        installment: '',
        amountRaised: ''
      });
    }
  }, [invoice]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onSubmit(formData, invoice);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center" id="my-modal">
      <div className="p-4 border w-80 shadow-lg rounded-md bg-white">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Raise Invoice</h3>
          <div className="mt-2 px-4 py-2">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">Total Contract Value</label>
              <input
                type="number"
                name="totalContractValue"
                value={formData.totalContractValue}
                onChange={handleFormChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">Payment Type</label>
              <select
                name="paymentType"
                value={formData.paymentType}
                onChange={handleFormChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Payment Type</option>
                <option value="full">Full Payment</option>
                <option value="installment">Installment</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">Select Installment</label>
              <select
                name="installment"
                value={formData.installment}
                onChange={handleFormChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Installment</option>
                <option value="1st">1st Installment</option>
                <option value="2nd">2nd Installment</option>
                <option value="3rd">3rd Installment</option>
                <option value="final">Final Installment</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">Amount Raised</label>
              <input
                type="number"
                name="amountRaised"
                value={formData.amountRaised}
                onChange={handleFormChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              Raised Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaiseInvoiceModal;