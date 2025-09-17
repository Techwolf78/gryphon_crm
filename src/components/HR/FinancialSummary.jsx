import React from "react";
import { FiDollarSign, FiBarChart2, FiDownload, FiEye } from "react-icons/fi";

const FinancialSummary = ({ totalAmount, approvedAmount, pendingAmount, rejectedAmount }) => {
  return (
    <div className="py-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100" data-tour="financial-summary-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FiDollarSign className="mr-2 text-blue-600" />
            Financial Summary
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-lg font-bold text-gray-900">₹{totalAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Approved Amount</p>
            <p className="text-lg font-bold text-emerald-600">₹{approvedAmount.toLocaleString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <p className="text-sm text-gray-600">Pending Amount</p>
            <p className="text-lg font-bold text-yellow-600">₹{pendingAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Rejected Amount</p>
            <p className="text-lg font-bold text-red-600">₹{rejectedAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100" data-tour="quick-actions-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <FiBarChart2 className="mr-2 text-blue-600" />
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors" data-tour="export-data-button">
            <FiDownload className="mr-2 h-3 w-3" /> Export Data
          </button>
          <button className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors" data-tour="view-reports-button">
            <FiEye className="mr-2 h-3 w-3" /> View Reports
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
