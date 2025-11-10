import React from "react";
import { XIcon } from "@heroicons/react/outline";
import CompanyFilter from "./CompanyFilter";
import ImportData from "./ImportData";
import ExportData from "./ExportData";

const statusColorMap = {
  complete: {
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-300",
    activeBg: "bg-green-100",
    tab: {
      active: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg",
      inactive: "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
    }
  },
  ongoing: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-300",
    activeBg: "bg-amber-100",
    tab: {
      active: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg",
      inactive: "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"
    }
  },
  onhold: {
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    border: "border-cyan-300",
    activeBg: "bg-cyan-100",
    tab: {
      active: "bg-gradient-to-r from-cyan-400 to-cyan-500 text-white shadow-lg",
      inactive: "bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border border-cyan-200"
    }
  },
  cancel: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-300",
    activeBg: "bg-red-100",
    tab: {
      active: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg",
      inactive: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
    }
  },
  noapplications: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
    activeBg: "bg-gray-200",
    tab: {
      active: "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg",
      inactive: "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
    }
  }
};

const tabLabels = {
  complete: "Complete",
  ongoing: "Ongoing",
  onhold: "On Hold",
  cancel: "Cancelled",
  noapplications: "No Applications"
};

const headerColorMap = {
  complete: "bg-green-50 text-green-800 border-b border-green-200",
  ongoing: "bg-amber-50 text-amber-800 border-b border-amber-200",
  onhold: "bg-cyan-50 text-cyan-800 border-b border-cyan-200",
  cancel: "bg-red-50 text-red-800 border-b border-red-200",
  noapplications: "bg-gray-50 text-gray-800 border-b border-gray-200"
};

function CompanyHeader({
  searchTerm,
  setSearchTerm,
  companies,
  filteredCompanies,
  isFilterOpen,
  setIsFilterOpen,
  filters,
  setFilters,
  users,
  activeTab,
  setActiveTab,
  setShowJDForm,
  setShowPlacedStudent,
  fetchCompanies
}) {
  return (
    <div className="sticky top-0 z-40 bg-linear-to-br from-gray-50 to-gray-100 pt-1 pb-2">
      {/* Search and filter row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
        <div className="relative grow md:grow-0 md:w-64">
          <input
            type="text"
            placeholder="Search Bar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <ImportData handleImportComplete={fetchCompanies} />

          <ExportData companies={companies} filteredCompanies={filteredCompanies} />

          <button
            onClick={() => setIsFilterOpen(prev => !prev)}
            className="flex items-center justify-center px-2 py-1 bg-white border border-gray-300 rounded-lg shadow-sm text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 ease-in-out hover:shadow-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter
          </button>

          <button
            onClick={() => setShowJDForm(true)}
            className="flex items-center justify-center px-2 py-1 bg-linear-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:opacity-90 transition-all shadow-md text-xs"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clipRule="evenodd"
              />
            </svg>
            Add JD
          </button>
          <button
            onClick={() => setShowPlacedStudent(true)}
            className="flex items-center justify-center px-2 py-1 bg-linear-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:opacity-90 transition-all shadow-md text-xs"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
              <path d="M12 9c-1.66 0-3-1.34-3-3V4h6v2c0 1.66-1.34 3-3 3z"/>
              <circle cx="12" cy="12" r="2" fill="#FFD700"/>
            </svg>
            Placed Student
          </button>
        </div>
      </div>

      {/* Filter dropdown */}
      {isFilterOpen && (
        <div className="">
          <CompanyFilter
            filters={filters}
            setFilters={setFilters}
            isFilterOpen={isFilterOpen}
            setIsFilterOpen={setIsFilterOpen}
            users={users}
            companies={companies}
          />
        </div>
      )}

      {/* Status tabs row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
        {Object.keys(tabLabels).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`py-1.5 rounded-xl text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-[1.02] ${
              activeTab === key
                ? statusColorMap[key].tab.active
                : statusColorMap[key].tab.inactive
            } ${
              activeTab === key ? "ring-2 ring-offset-2 ring-opacity-50" : ""
            } ${
              activeTab === key
                ? key === "complete"
                  ? "ring-green-500"
                  : key === "ongoing"
                  ? "ring-amber-400"
                  : key === "onhold"
                  ? "ring-cyan-400"
                  : key === "cancel"
                  ? "ring-red-500"
                  : "ring-gray-500"
                : ""
            }`}
          >
            {tabLabels[key]}{" "}
            <span className="ml-1 text-xs font-bold">
              ({companies.filter(c => c.status === key).length})
            </span>
          </button>
        ))}
      </div>

      {/* Table header row */}
      <div
        className={`grid grid-cols-8 ${headerColorMap[activeTab]} text-sm font-medium px-2 py-1.5 rounded-lg`}
      >
        <div className="wrap-break-word">Company</div>
        <div className="wrap-break-word">College</div>
        <div className="wrap-break-word">Eligible</div>
        <div className="wrap-break-word">Source</div>
        <div className="wrap-break-word">Salary</div>
        <div className="wrap-break-word">Type</div>
        <div className="wrap-break-word">Date</div>
        <div className="text-center wrap-break-word">Actions</div>
      </div>
    </div>
  );
}

export default CompanyHeader;