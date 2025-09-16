import React from "react";
import { FiPlus, FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";

const StatsCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center">
          <div className="rounded-lg p-3 bg-blue-50 text-blue-600">
            <FiPlus className="h-5 w-5" />
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-semibold text-gray-900">{stats.total}</h2>
            <p className="text-sm text-gray-600">Total Bills</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center">
          <div className="rounded-lg p-3 bg-emerald-50 text-emerald-600">
            <FiCheckCircle className="h-5 w-5" />
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-semibold text-gray-900">{stats.approved}</h2>
            <p className="text-sm text-gray-600">Approved</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center">
          <div className="rounded-lg p-3 bg-rose-50 text-rose-600">
            <FiXCircle className="h-5 w-5" />
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-semibold text-gray-900">{stats.rejected}</h2>
            <p className="text-sm text-gray-600">Rejected</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center">
          <div className="rounded-lg p-3 bg-amber-50 text-amber-600">
            <FiClock className="h-5 w-5" />
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-semibold text-gray-900">{stats.pending + stats.onHold}</h2>
            <p className="text-sm text-gray-600">Pending Review</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
