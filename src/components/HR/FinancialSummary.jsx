import React from "react";
import { FiDollarSign, FiBarChart2, FiDownload, FiEye } from "react-icons/fi";

const FinancialSummary = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiDollarSign className="mr-2 text-blue-600" />
          Financial Summary
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-xl font-bold text-gray-900">₹{stats.totalAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Paid Amount</p>
            <p className="text-xl font-bold text-emerald-600">₹{stats.paidAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiBarChart2 className="mr-2 text-blue-600" />
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <FiDownload className="mr-2 h-4 w-4" /> Export Data
          </button>
          <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
            <FiEye className="mr-2 h-4 w-4" /> View Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
