import React from "react";
import { FiPlus, FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";

const StatsCards = ({ totalBills, approvedBills, pendingBills, rejectedBills }) => {
  return (
    <div className="py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100" data-tour="total-bills-card">
        <div className="flex items-center">
          <div className="rounded-lg p-2 bg-blue-50 text-blue-600">
            <FiPlus className="h-4 w-4" />
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-semibold text-gray-900">{totalBills}</h2>
            <p className="text-sm text-gray-600">Total Bills</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100" data-tour="approved-bills-card">
        <div className="flex items-center">
          <div className="rounded-lg p-2 bg-emerald-50 text-emerald-600">
            <FiCheckCircle className="h-4 w-4" />
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-semibold text-gray-900">{approvedBills}</h2>
            <p className="text-sm text-gray-600">Approved</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100" data-tour="rejected-bills-card">
        <div className="flex items-center">
          <div className="rounded-lg p-2 bg-rose-50 text-rose-600">
            <FiXCircle className="h-4 w-4" />
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-semibold text-gray-900">{rejectedBills}</h2>
            <p className="text-sm text-gray-600">Rejected</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100" data-tour="pending-bills-card">
        <div className="flex items-center">
          <div className="rounded-lg p-2 bg-amber-50 text-amber-600">
            <FiClock className="h-4 w-4" />
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-semibold text-gray-900">{pendingBills}</h2>
            <p className="text-sm text-gray-600">Pending Review</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default StatsCards;
