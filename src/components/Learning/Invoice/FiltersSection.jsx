import React from "react";
import { createPortal } from "react-dom";
import { FiSearch, FiFilter, FiRefreshCw, FiTrash2, FiBook, FiUser, FiCalendar } from "react-icons/fi";
import InvoiceExcelExporter from "../../Learning/Initiate/InvoiceExcelExporter";
import { db } from "../../../firebase";
function FiltersSection({
  searchTerm,
  setSearchTerm,
  filtersBtnRef,
  isAnyFilterActive,
  toggleFiltersDropdown,
  filtersDropdownOpen,
  filtersDropdownRef,
  dropdownPosition,
  projectCodeFilter,
  setProjectCodeFilter,
  projectCodes,
  businessNameFilter,
  setBusinessNameFilter,
  businessNames,
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  clearAllFilters,
  applyFilters,
  showOnlyActive,
  setShowOnlyActive,
  handleRefreshData,
  exporting,
  setExporting,
  filteredGroupedData
}) {
  return (
    <div className="p-2 border-b border-gray-100 bg-gray-50/50">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 mb-2">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <label
            htmlFor="search"
            className="block text-xs font-medium text-gray-700 mb-0.5"
          >
            Search
          </label>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              id="search"
              type="text"
              placeholder="Search trainers, colleges, IDs..."
              className="w-full pl-10 pr-4 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search trainers"
            />
          </div>
        </div>

        {/* Combined Filters Button */}
        <div className="relative">
          <button
            ref={filtersBtnRef}
            onClick={toggleFiltersDropdown}
            className={`inline-flex items-center px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
              isAnyFilterActive ? "ring-2 ring-blue-500/20" : ""
            }`}
            aria-label="Open filters"
          >
            <FiFilter className="w-3 h-3 mr-1" />
            Filters
            {isAnyFilterActive && (
              <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </button>
          {filtersDropdownOpen &&
            createPortal(
              <div
                ref={filtersDropdownRef}
                className="z-50 w-full max-w-xs md:max-w-sm bg-white border border-gray-200 rounded-xl shadow-xl py-2 px-2 flex flex-col space-y-2 animate-fade-in transition-opacity duration-200"
                style={{
                  position: "absolute",
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  maxHeight: "80vh",
                  overflowY: "auto",
                }}
              >
                {/* Project Code Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                    <FiBook className="w-3 h-3 mr-1" />
                    Project Code
                  </label>
                  <select
                    value={projectCodeFilter}
                    onChange={(e) => setProjectCodeFilter(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">All Project Codes</option>
                    {projectCodes.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* College Name Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                    <FiUser className="w-3 h-3 mr-1" />
                    College Name
                  </label>
                  <select
                    value={businessNameFilter}
                    onChange={(e) => setBusinessNameFilter(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">All Colleges</option>
                    {businessNames.map((college) => (
                      <option key={college} value={college}>
                        {college}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                    <FiCalendar className="w-3 h-3 mr-1" />
                    Date Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={startDateFilter}
                      onChange={(e) => setStartDateFilter(e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Start Date"
                    />
                    <input
                      type="date"
                      value={endDateFilter}
                      onChange={(e) => setEndDateFilter(e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="End Date"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between gap-1.5 pt-1 border-t border-gray-100">
                  <button
                    onClick={clearAllFilters}
                    className="flex-1 inline-flex items-center justify-center px-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                  >
                    <FiTrash2 className="w-3 h-3 mr-1" />
                    Clear All
                  </button>
                  <button
                    onClick={applyFilters}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all"
                  >
                    Apply
                  </button>
                </div>
              </div>,
              document.body
            )}
        </div>

        {/* Active-only toggle (label - switch - status) and Refresh Button */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-700">
            Only active invoices
          </span>

          <button
            role="switch"
            aria-checked={showOnlyActive}
            onClick={() => setShowOnlyActive((s) => !s)}
            className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors focus:outline-none ${
              showOnlyActive ? "bg-blue-600" : "bg-gray-300"
            }`}
            aria-label="Toggle show only active invoices"
          >
            <span
              className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform ${
                showOnlyActive ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>

          <span
            className={`text-xs font-medium ${
              showOnlyActive ? "text-blue-600" : "text-gray-500"
            }`}
          >
            {showOnlyActive ? "ON" : "OFF"}
          </span>

          <InvoiceExcelExporter 
            db={db} 
            exporting={exporting} 
            setExporting={setExporting} 
            filteredData={filteredGroupedData}
            clearAllFilters={clearAllFilters}
          />

          <button
            onClick={handleRefreshData}
            className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <FiRefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Active filters indicator */}
      {(searchTerm ||
        startDateFilter ||
        endDateFilter ||
        projectCodeFilter ||
        businessNameFilter) && (
        <div className="mt-1 flex flex-wrap items-center text-sm text-gray-500">
          <span className="mr-2">Active filters:</span>
          {searchTerm && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2 mb-2">
              Search: {searchTerm}
            </span>
          )}
          {projectCodeFilter && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-2 mb-2">
              Project Code: {projectCodeFilter}
            </span>
          )}
          {businessNameFilter && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2 mb-2">
              College: {businessNameFilter}
            </span>
          )}
          {startDateFilter && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mr-2 mb-2">
              Start Date: {startDateFilter}
            </span>
          )}
          {endDateFilter && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 mr-2 mb-2">
              End Date: {endDateFilter}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default FiltersSection;
