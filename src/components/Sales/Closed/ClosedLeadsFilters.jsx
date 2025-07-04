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
    <div className="px-6 py-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Closed Deals</h2>
        <p className="text-sm text-gray-500 mt-1">
          {filterType === "all"
            ? `All ${viewMyLeadsOnly ? "your" : "team"} closed deals`
            : filterType === "new"
            ? `New customer acquisitions (${viewMyLeadsOnly ? "your" : "team"})`
            : `Renewal contracts (${viewMyLeadsOnly ? "your" : "team"})`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* Closure Type Buttons */}
        <div className="flex items-center bg-gray-50 rounded-lg p-1">
          {["all", "new", "renewal"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filterType === type
                  ? "bg-white shadow-sm text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {type === "all" ? "All" : type === "new" ? "New" : "Renewals"}
            </button>
          ))}
        </div>

        {/* Quarter Filter Dropdown */}
        <div className="relative">
          <select
            value={quarterFilter}
            onChange={(e) => setQuarterFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8"
          >
            <option value="current">Current Quarter</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
            <option value="all">All Quarters</option>
            {/* If you want previous year */}
            {/* <option value={`PY_${getFinancialYearFromDate(today)}`}>
              Previous Year
            </option> */}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>

        {/* View My Leads Only Toggle */}
        <label className="inline-flex items-center ml-4 cursor-pointer">
          <input
            type="checkbox"
            checked={viewMyLeadsOnly}
            onChange={() => setViewMyLeadsOnly((v) => !v)}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
          <span className="ml-2 text-sm text-gray-700">My Leads Only</span>
        </label>
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
