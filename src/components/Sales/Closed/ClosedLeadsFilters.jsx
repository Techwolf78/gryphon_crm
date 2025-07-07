import React from "react";
import PropTypes from "prop-types";
import { FiFilter, FiCalendar, FiUser, FiChevronDown } from "react-icons/fi";

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
    <div className="px-6 py-5 border-b border-gray-100 bg-white">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 max-w-screen-2xl mx-auto">
        {/* Title and Subtitle */}
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-800">Closed Deals</h2>
          <p className="text-sm text-gray-500">
            {filterType === "all"
              ? `All ${viewMyLeadsOnly ? "your" : "team"} closed deals`
              : filterType === "new"
              ? `New customer acquisitions (${viewMyLeadsOnly ? "your" : "team"})`
              : `Renewal contracts (${viewMyLeadsOnly ? "your" : "team"})`}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Deal Type Segmented Control */}
          <div className="inline-flex bg-gray-50 rounded-lg p-1 shadow-xs">
            {["all", "new", "renewal"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                  filterType === type
                    ? "bg-white shadow-sm text-blue-600 font-semibold"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                aria-current={filterType === type ? "page" : undefined}
              >
                {type === "all" ? "All" : type === "new" ? "New" : "Renewals"}
              </button>
            ))}
          </div>

          {/* Quarter Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <FiCalendar size={16} />
            </div>
            <select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white shadow-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none"
              aria-label="Select quarter"
            >
              <option value="current">Current Quarter</option>
              <option value="Q1">Q1 (Apr-Jun)</option>
              <option value="Q2">Q2 (Jul-Sep)</option>
              <option value="Q3">Q3 (Oct-Dec)</option>
              <option value="Q4">Q4 (Jan-Mar)</option>
              <option value="all">All Quarters</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
              <FiChevronDown size={16} />
            </div>
          </div>

          {/* My Leads Toggle */}
          <label className="inline-flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={viewMyLeadsOnly}
                onChange={() => setViewMyLeadsOnly((v) => !v)}
                className="sr-only peer"
                aria-label={viewMyLeadsOnly ? "Show team leads" : "Show only my leads"}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700 flex items-center gap-1">
              <FiUser size={14} />
              {viewMyLeadsOnly ? "My Leads" : "Team Leads"}
            </span>
          </label>
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