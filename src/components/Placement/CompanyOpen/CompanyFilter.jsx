import { useState, useEffect, useRef } from "react";
import { 
  FiFilter, 
  FiX, 
  FiChevronDown, 
  FiChevronUp,
  FiUsers,
  FiCalendar,
  FiBriefcase,
  FiDollarSign,
  FiBook,
  FiRefreshCw,
  FiCheck
} from "react-icons/fi";
import { formatSalary } from "../../../utils/salaryUtils";

function CompanyFilter({
  filters,
  setFilters,
  isFilterOpen,
  setIsFilterOpen,
  users = [],
  companies = [],
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [activeSection, setActiveSection] = useState(null);
  const filterPanelRef = useRef(null);

  // Generate filter options from companies data
  const filterOptions = {
    colleges: [
      ...new Set(
        companies
          .map((company) => company.college)
          .filter(Boolean)
      ),
    ],
    assignedPersons: users
      .map((user) => ({
        uid: user.uid,
        displayName: user.name || user.displayName || user.email,
      }))
      .filter((user) => user.displayName),
    companyNames: [
      ...new Set(
        companies
          .map((company) => company.companyName)
          .filter(Boolean)
      ),
    ],
    jobTypes: [
      ...new Set(
        companies
          .flatMap((c) => c.jobTypes || [])
          .filter(Boolean)
      ),
    ],
    salaries: [
      ...new Set(
        companies
          .map((company) => company.salary)
          .filter(Boolean)
      ),
    ],
  };

  // Sync localFilters with parent filters
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Close filter panel on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target)
      ) {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen, setIsFilterOpen]);

  // Apply filters
  const applyFilters = () => {
    setFilters(localFilters);
    setIsFilterOpen(false);
  };

  // Reset filters
  const resetFilters = () => {
    setLocalFilters({});
    setFilters({});
  };

  // Toggle filter section
  const toggleSection = (section) => {
    setActiveSection(activeSection === section ? null : section);
  };

  if (!users.length || !companies.length) {
    return (
      <button
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
        disabled
      >
        <FiFilter className="w-4 h-4" />
        <span>Filters</span>
      </button>
    );
  }

  return (
    <div className="relative">
      

      {/* Filter Panel */}
      {isFilterOpen && (
        <div
          ref={filterPanelRef}
          className="absolute top-full right-50  bg-white p-5 rounded-xl shadow-lg z-50 border border-gray-200 w-[340px]"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <FiFilter className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-800 text-lg">Filters</h3>
            </div>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
              aria-label="Close filters"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* College Section */}
            <div className="border-b border-gray-100 pb-4">
              <button
                onClick={() => toggleSection('college')}
                className="flex justify-between items-center w-full text-left font-medium text-gray-700"
              >
                <div className="flex items-center gap-2">
                  <FiBook className="w-4 h-4 text-blue-500" />
                  <span>College</span>
                </div>
                {activeSection === 'college' ? (
                  <FiChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <FiChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {activeSection === 'college' && (
                <div className="mt-3 space-y-3 pl-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                      <FiBook className="w-4 h-4 text-gray-400" />
                      College Name
                    </label>
                    <select
                      value={localFilters.college || ""}
                      onChange={(e) =>
                        setLocalFilters({ ...localFilters, college: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Colleges</option>
                      {filterOptions.colleges.map((college) => (
                        <option key={college} value={college}>
                          {college}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Company Section */}
            <div className="border-b border-gray-100 pb-4">
              <button
                onClick={() => toggleSection('company')}
                className="flex justify-between items-center w-full text-left font-medium text-gray-700"
              >
                <div className="flex items-center gap-2">
                  <FiBriefcase className="w-4 h-4 text-blue-500" />
                  <span>Company</span>
                </div>
                {activeSection === 'company' ? (
                  <FiChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <FiChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {activeSection === 'company' && (
                <div className="mt-3 space-y-3 pl-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                      <FiBriefcase className="w-4 h-4 text-gray-400" />
                      Company Name
                    </label>
                    <select
                      value={localFilters.companyName || ""}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          companyName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Companies</option>
                      {filterOptions.companyNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                      <FiDollarSign className="w-4 h-4 text-gray-400" />
                      Salary (LPA)
                    </label>
                    <select
                      value={localFilters.salary || ""}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          salary: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Salaries</option>
                      {filterOptions.salaries
                        .sort((a, b) => a - b)
                        .map((salary) => (
                          <option key={salary} value={salary}>
                            {formatSalary(salary)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                      <FiBriefcase className="w-4 h-4 text-gray-400" />
                      Job Type
                    </label>
                    <select
                      value={localFilters.jobType || ""}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          jobType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Job Types</option>
                      {filterOptions.jobTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Team Section */}
            <div className="border-b border-gray-100 pb-4">
              <button
                onClick={() => toggleSection('team')}
                className="flex justify-between items-center w-full text-left font-medium text-gray-700"
              >
                <div className="flex items-center gap-2">
                  <FiUsers className="w-4 h-4 text-blue-500" />
                  <span>Team</span>
                </div>
                {activeSection === 'team' ? (
                  <FiChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <FiChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {activeSection === 'team' && (
                <div className="mt-3 space-y-3 pl-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                      <FiUsers className="w-4 h-4 text-gray-400" />
                      Assigned To
                    </label>
                    <select
                      value={localFilters.assignedTo || ""}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          assignedTo: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Team Members</option>
                      {filterOptions.assignedPersons.length === 0 ? (
                        <option disabled>No users found</option>
                      ) : (
                        filterOptions.assignedPersons.map((user) => (
                          <option key={user.uid} value={user.uid}>
                            {user.displayName}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Date Section */}
            <div className="border-b border-gray-100 pb-4">
              <button
                onClick={() => toggleSection('date')}
                className="flex justify-between items-center w-full text-left font-medium text-gray-700"
              >
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-4 h-4 text-blue-500" />
                  <span>Date Range</span>
                </div>
                {activeSection === 'date' ? (
                  <FiChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <FiChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {activeSection === 'date' && (
                <div className="mt-3 space-y-3 pl-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <FiCalendar className="w-4 h-4 text-gray-400" />
                      Date Range
                    </label>
                    <div className="flex flex-col gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">From</label>
                        <input
                          type="date"
                          value={localFilters.dateRange?.start || ""}
                          onChange={(e) =>
                            setLocalFilters({
                              ...localFilters,
                              dateRange: {
                                ...localFilters.dateRange,
                                start: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">To</label>
                        <input
                          type="date"
                          value={localFilters.dateRange?.end || ""}
                          onChange={(e) =>
                            setLocalFilters({
                              ...localFilters,
                              dateRange: {
                                ...localFilters.dateRange,
                                end: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-between gap-3 mt-6">
            <button
              onClick={resetFilters}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex-1"
            >
              <FiRefreshCw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={applyFilters}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex-1 shadow-sm"
            >
              <FiCheck className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyFilter;
