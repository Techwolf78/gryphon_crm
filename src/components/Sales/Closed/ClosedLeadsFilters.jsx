import React from "react";
import PropTypes from "prop-types";

const ClosedLeadsFilters = ({
  filterType,
  setFilterType,
  quarterFilter,
  setQuarterFilter,
  viewMyLeadsOnly,
  setViewMyLeadsOnly,
  today,
}) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Closure Type Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Deal Type</label>
            <div className="flex flex-wrap gap-2">
              {["all", "new", "renewal"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/25 ${
                    filterType === type
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md"
                  }`}
                >
                  {type === "all" ? "All Deals" : type === "new" ? "New" : "Renewals"}
                </button>
              ))}
            </div>
          </div>

          {/* Quarter Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Quarter</label>
            <select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
            >
              <option value="current">Current Quarter</option>
              <option value="Q1">Q1 (Apr-Jun)</option>
              <option value="Q2">Q2 (Jul-Sep)</option>
              <option value="Q3">Q3 (Oct-Dec)</option>
              <option value="Q4">Q4 (Jan-Mar)</option>
              <option value="all">All Quarters</option>
            </select>
          </div>

          {/* My Leads Toggle */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">View Mode</label>
            <label className="inline-flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={viewMyLeadsOnly}
                onChange={() => setViewMyLeadsOnly((v) => !v)}
                className="sr-only peer"
              />
              <div className="relative w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-indigo-600 shadow-sm"></div>
              <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                My Leads Only
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

ClosedLeadsFilters.propTypes = {
  filterType: PropTypes.string.isRequired,
  setFilterType: PropTypes.func.isRequired,
  quarterFilter: PropTypes.string.isRequired,
  setQuarterFilter: PropTypes.func.isRequired,
  viewMyLeadsOnly: PropTypes.bool.isRequired,
  setViewMyLeadsOnly: PropTypes.func.isRequired,
  today: PropTypes.instanceOf(Date),
};

export default ClosedLeadsFilters;