import React, { useState } from "react";
import { FiSearch, FiFilter, FiChevronDown, FiRefreshCw, FiX, FiDownload } from "react-icons/fi";

const FiltersSection = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  isLoading,
  onExport
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const getStatusLabel = (status) => {
    switch (status) {
      case "all": return "All Status";
      case "pending": return "Pending Review";
      case "approved": return "Approved";
      case "rejected": return "Rejected";
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "text-amber-700 bg-amber-50 border-amber-200";
      case "approved": return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "rejected": return "text-red-700 bg-red-50 border-red-200";
      default: return "text-slate-700 bg-slate-50 border-slate-200";
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center" data-tour="quick-actions-card">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className="text-slate-400 h-3 w-3" />
        </div>
        <input
          type="text"
          placeholder="Search trainers, courses, colleges..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm placeholder-slate-400"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          data-tour="search-input"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            <FiX className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="relative">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`inline-flex items-center px-2 py-2 border rounded text-xs font-medium transition-all duration-200 min-w-[120px] justify-between ${
            statusFilter === "all"
              ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              : `${getStatusColor(statusFilter)} border-current`
          }`}
          data-tour="filter-button"
        >
          <span className="flex items-center gap-1.5">
            <FiFilter className="h-3 w-3" />
            {getStatusLabel(statusFilter)}
          </span>
          <FiChevronDown className={`h-3 w-3 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
        </button>

        {isFilterOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)}></div>
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20 p-1">
              {["all", "pending", "approved", "rejected"].map((status) => (
                <button
                  key={status}
                  className={`flex items-center w-full px-3 py-2 text-sm rounded-md hover:bg-slate-50 transition-colors duration-150 ${
                    statusFilter === status ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                  }`}
                  onClick={() => {
                    onStatusFilterChange(status);
                    setIsFilterOpen(false);
                  }}
                >
                  {getStatusLabel(status)}
                  {statusFilter === status && (
                    <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Export Button */}
      <button
        onClick={onExport}
        className="inline-flex items-center px-3 py-2 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <FiDownload className="mr-1.5 h-3 w-3" />
        Export
      </button>

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="inline-flex items-center px-3 py-2 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
        data-tour="refresh-button"
      >
        <FiRefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  );
};

export default FiltersSection;
