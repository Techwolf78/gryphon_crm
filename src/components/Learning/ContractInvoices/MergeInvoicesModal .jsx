import React, { useState, useEffect } from 'react';

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
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [baseAmount, setBaseAmount] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);

// MergeInvoicesModal.js - Amount calculation update
useEffect(() => {
  if (contracts && installment) {
    // ✅ TOTAL AMOUNT calculate karo by finding installment at same index in each contract
    const calculatedTotal = contracts.reduce((sum, contract) => {
      if (!contract.paymentDetails || !Array.isArray(contract.paymentDetails)) return sum;
      
      // Find installment at the same index position
      const inst = contract.paymentDetails[installment.idx];
      if (!inst) return sum;
      
      const amount = parseFloat(inst.totalAmount) || 0;
      return sum + Math.round(amount);
    }, 0);

    const calculatedStudents = contracts.reduce((sum, contract) => {
      const students = parseInt(contract.studentCount) || 0;
      return sum + students;
    }, 0);

    setTotalAmount(calculatedTotal);
    setTotalStudents(calculatedStudents);
    
    // ✅ BASE AMOUNT DONO CASES MEIN SAME RAHEGA
    const calculatedBaseAmount = Math.round(calculatedTotal / 1.18);
    const calculatedGstAmount = calculatedTotal - calculatedBaseAmount;
    
    setBaseAmount(calculatedBaseAmount);
    setGstAmount(calculatedGstAmount);
  }
}, [contracts, installment]);

// ✅ Jab invoice type change ho toh SIRF display change hoga
const getDisplayAmounts = () => {
  if (invoiceType === 'Cash Invoice') {
    return {
      baseAmount: baseAmount,
      gstAmount: 0,
      totalAmount: baseAmount // Cash invoice mein total = base amount
    };
  } else {
    return {
      baseAmount: baseAmount,
      gstAmount: gstAmount,
      totalAmount: totalAmount // Tax invoice mein total = base + GST
    };
  }
};
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const displayAmounts = getDisplayAmounts();
    
    onSubmit({
      invoiceType,
      terms: terms || 'Standard terms and conditions apply',
      // ✅ Actual calculations parent ko bhejo
      actualBaseAmount: baseAmount,
      actualGstAmount: gstAmount,
      actualTotalAmount: totalAmount,
      // ✅ Display ke liye amounts
      baseAmount: displayAmounts.baseAmount,
      gstAmount: displayAmounts.gstAmount,
      totalAmount: displayAmounts.totalAmount
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₹0";
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return "₹0";
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  // Helper function to format currency in Indian numbering system with abbreviations
  const formatIndianCurrency = (amount) => {
    if (!amount && amount !== 0) return "0";

    let numAmount = Number(amount);
    if (isNaN(numAmount)) return "0";

    // For amounts less than 1 lakh, show regular formatting
    if (numAmount < 100000) {
      return new Intl.NumberFormat('en-IN').format(numAmount);
    }

    // For amounts >= 1 lakh, use abbreviations
    if (numAmount >= 10000000000) { // 1000 Cr and above
      return `${(numAmount / 10000000).toFixed(1)}K Cr`;
    } else if (numAmount >= 1000000000) { // 100 Cr to 999 Cr
      return `${(numAmount / 10000000).toFixed(1)} Cr`;
    } else if (numAmount >= 100000000) { // 10 Cr to 99 Cr
      return `${(numAmount / 10000000).toFixed(1)} Cr`;
    } else if (numAmount >= 10000000) { // 1 Cr to 9.9 Cr
      return `${(numAmount / 10000000).toFixed(1)} Cr`;
    } else if (numAmount >= 1000000) { // 10 Lakh to 99 Lakh
      return `${(numAmount / 100000).toFixed(0)} Lakh`;
    } else { // 1 Lakh to 9.9 Lakh
      return `${(numAmount / 100000).toFixed(1)} Lakh`;
    }
  };

  const displayAmounts = getDisplayAmounts();

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
                <span className="ml-2">{contracts?.length || 0}</span>
              </div>
              <div>
                <span className="text-purple-600 font-medium">Installment:</span>
                <span className="ml-2">{installment?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-purple-600 font-medium">Total Students:</span>
                <span className="ml-2">{totalStudents}</span>
              </div>
              <div>
                <span className="text-purple-600 font-medium">Project Code:</span>
                <span className="ml-2 font-mono text-sm">{projectCode || 'N/A'}</span>
              </div>
            </div>
            
            {/* ✅ Amount Breakdown - Cash aur Tax ke liye alag display */}
            <div className="mt-3 pt-3 border-t border-purple-200">
              <h4 className="font-medium text-purple-700 mb-1">Amount Breakdown:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-purple-600">Base Amount:</span>
                  <span className="ml-1 font-semibold">
                    {formatIndianCurrency(displayAmounts.baseAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-purple-600">GST Amount:</span>
                  <span className="ml-1 font-semibold">
                    {formatIndianCurrency(displayAmounts.gstAmount)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-purple-600">Final Amount:</span>
                  <span className="ml-1 font-semibold text-green-600">
                    {formatIndianCurrency(displayAmounts.totalAmount)}
                  </span>
                  <span className="ml-2 text-xs text-purple-500">
                    ({invoiceType === 'Cash Invoice' ? 'Cash Invoice - No GST' : 'Tax Invoice - With GST'})
                  </span>
                </div>
              </div>
            </div>
          </div>
            
            <div className="mt-2">
              <span className="text-purple-600 font-medium">Project Code:</span>
              <span className="ml-2 font-mono text-sm">{projectCode || 'N/A'}</span>
            </div>

          {/* Contracts List */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Included Contracts ({contracts?.length || 0})</h3>
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
                  {contracts?.map((contract, index) => {
                    // Find installment at the same index position
                    const inst = contract.paymentDetails?.[installment?.idx];
                    const amount = parseFloat(inst?.totalAmount) || 0;
                    
                    return (
                      <tr key={index}>
                        <td className="px-3 py-2">{contract.projectCode || 'N/A'}</td>
                        <td className="px-3 py-2">{contract.course || 'N/A'}</td>
                        <td className="px-3 py-2">{contract.year || 'N/A'}</td>
                        <td className="px-3 py-2">{contract.studentCount || '0'}</td>
                        <td className="px-3 py-2 font-semibold">
                          {formatIndianCurrency(amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

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
              <option value="Cash Invoice">Cash Invoice</option>
              <option value="Proforma Invoice">Proforma Invoice</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {invoiceType === 'Cash Invoice' 
                ? 'Cash Invoice: Base Amount will be used as Final Amount (No GST)' 
                : invoiceType === 'Tax Invoice'
                ? 'Tax Invoice: Base Amount + 18% GST = Final Amount'
                : 'Proforma Invoice: For quotation purposes'
              }
            </p>
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