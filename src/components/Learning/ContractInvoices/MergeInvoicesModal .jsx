// components/MergeInvoicesModal.js
import React, { useState } from 'react';

const MergeInvoicesModal = ({ 
  isOpen, 
  contracts, 
  installment, 
  projectCode, 
  onClose, 
  onSubmit 
}) => {
  const [invoiceType, setInvoiceType] = useState('Tax Invoice');
  const [terms, setTerms] = useState('');

  if (!isOpen) return null;

  const totalAmount = contracts.reduce((sum, contract) => {
    const inst = contract.paymentDetails?.find(p => p.name === installment?.name);
    return sum + (inst?.totalAmount || 0);
  }, 0);

  const totalStudents = contracts.reduce((sum, contract) => 
    sum + (parseInt(contract.studentCount) || 0), 0
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      invoiceType,
      terms: terms || 'Standard terms and conditions apply'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-500">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white">Generate Merged Invoice</h2>
          <p className="text-purple-100 text-sm mt-1">
            Create a single invoice for multiple contracts
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Summary Section */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-2">Merge Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-purple-600 font-medium">Contracts:</span>
                <span className="ml-2">{contracts.length}</span>
              </div>
              <div>
                <span className="text-purple-600 font-medium">Installment:</span>
                <span className="ml-2">{installment?.name}</span>
              </div>
              <div>
                <span className="text-purple-600 font-medium">Total Amount:</span>
                <span className="ml-2 font-semibold">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 0
                  }).format(totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-purple-600 font-medium">Total Students:</span>
                <span className="ml-2">{totalStudents}</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-purple-600 font-medium">Project Code:</span>
              <span className="ml-2 font-mono text-sm">{projectCode}</span>
            </div>
          </div>

          {/* Contracts List */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Included Contracts</h3>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Project Code</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Course</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Year</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Students</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contracts.map((contract, index) => {
                    const inst = contract.paymentDetails?.find(p => p.name === installment?.name);
                    return (
                      <tr key={index}>
                        <td className="px-3 py-2">{contract.projectCode}</td>
                        <td className="px-3 py-2">{contract.course}</td>
                        <td className="px-3 py-2">{contract.year}</td>
                        <td className="px-3 py-2">{contract.studentCount}</td>
                        <td className="px-3 py-2 font-semibold">
                          {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 0
                          }).format(inst?.totalAmount || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Type
            </label>
            <select
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="Tax Invoice">Tax Invoice</option>
              <option value="Proforma Invoice">Proforma Invoice</option>
            </select>
          </div>

          {/* Terms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Terms & Conditions
            </label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter terms and conditions for the merged invoice..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Generate Merged Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MergeInvoicesModal;