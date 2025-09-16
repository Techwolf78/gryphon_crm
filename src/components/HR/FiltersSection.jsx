import React from "react";
import { FiSearch, FiFilter, FiChevronDown } from "react-icons/fi";

const FiltersSection = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  isFilterOpen,
  setIsFilterOpen,
  filteredBills,
  bills
}) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400 h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search trainers, courses, colleges..."
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FiFilter className="mr-2 text-gray-400 h-4 w-4" />
              Filter
              <FiChevronDown className={`ml-2 h-4 w-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 p-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-1.5">Status</div>
                {["all", "pending", "approved", "rejected", "onHold"].map((status) => (
                  <button
                    key={status}
                    className={`flex items-center w-full px-2 py-1.5 text-sm rounded-md hover:bg-gray-50 ${statusFilter === status ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                    onClick={() => {
                      setStatusFilter(status);
                      setIsFilterOpen(false);
                    }}
                  >
                    {status === "all" ? "All Status" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Showing <span className="font-medium">{filteredBills.length}</span> of <span className="font-medium">{bills.length}</span> bills
        </div>
      </div>
    </div>
  );
};

export default FiltersSection;
