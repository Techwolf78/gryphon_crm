import { useState, useEffect, useRef, useMemo } from "react";
import {
  FiFilter,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiUsers,
  FiBriefcase,
  FiPhone,
  FiRefreshCw,
  FiCheck
} from "react-icons/fi";

function LeadFilters({
  filters,
  setFilters,
  isFilterOpen,
  setIsFilterOpen,
  allUsers,
  leads,
  activeTab,
  viewMyLeadsOnly,
  currentUser,
  getTeamMemberIds,
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [activeSection, setActiveSection] = useState(null);
  const filterPanelRef = useRef(null);

  // Generate filter options from leads and users data based on current context
  const filterOptions = useMemo(() => {
    // First, filter leads based on current tab and view mode
    let relevantLeads = leads.filter(lead => {
      // Filter by status if not showing all
      if (activeTab !== "all" && lead.status !== activeTab) {
        return false;
      }

      // Filter by view mode
      if (viewMyLeadsOnly) {
        // My Leads: Only show leads assigned to current user
        return lead.assignedTo === currentUser?.uid;
      } else {
        // My Team: Show leads assigned to team members OR unassigned leads
        const teamMemberIds = getTeamMemberIds ? getTeamMemberIds(currentUser?.uid) : [];
        return !lead.assignedTo || teamMemberIds.includes(lead.assignedTo);
      }
    });

    return {
      assignedPersons: Object.values(allUsers)
        .map((user) => ({
          uid: user.uid || user.id,
          displayName: user.name || user.displayName,
        }))
        .filter((user) => user.displayName)
        .filter((user) => {
          if (viewMyLeadsOnly) {
            return user.uid === currentUser?.uid;
          } else {
            const teamMemberIds = getTeamMemberIds ? getTeamMemberIds(currentUser?.uid) : [];
            return teamMemberIds.includes(user.uid || user.id);
          }
        }),
      companies: [
        ...new Set(
          relevantLeads
            .map((lead) => lead.companyName)
            .filter(Boolean)
        ),
      ].sort(),
      phones: [
        ...new Set(
          relevantLeads
            .map((lead) => lead.pocPhone)
            .filter(Boolean)
        ),
      ].sort(),
    };
  }, [leads, activeTab, viewMyLeadsOnly, currentUser, allUsers, getTeamMemberIds]);

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

  // Early return for performance optimization - must be after all hooks
  // Removed: if (!viewMyLeadsOnly && activeTab === "cold") { return null; }

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

  // Check if any filter is active
  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => {
      if (!value || (typeof value === 'string' && !value.trim())) return false;
      if (key === 'selectedUserFilter' && value === 'all') return false;
      return true;
    }
  );

  return (
    <div className="flex items-center gap-3 relative">
      {/* Filter Button */}
      <div className="relative">
        <button
          onClick={() => !isFilterOpen && setIsFilterOpen(true)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            isFilterOpen || hasActiveFilters
              ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm"
          }`}
        >
          <FiFilter className="w-4 h-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
              {Object.entries(filters).filter(([key, value]) => {
                if (!value || (typeof value === 'string' && !value.trim())) return false;
                if (key === 'selectedUserFilter' && value === 'all') return false;
                return true;
              }).length}
            </span>
          )}
        </button>

        {/* Filter Panel */}
        {isFilterOpen && (
          <div
            ref={filterPanelRef}
            className="absolute top-full right-0 mt-2 bg-white p-4 rounded-xl shadow-lg z-50 border border-gray-200 w-[320px] max-h-[400px] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <FiFilter className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-gray-800 text-sm">Filters</h3>
              </div>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
                aria-label="Close filters"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* User Assignment Section - Always shown */}
              <div className="border-b border-gray-100 pb-3">
                <button
                  onClick={() => toggleSection('user')}
                  className="flex justify-between items-center w-full text-left font-medium text-gray-700 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <FiUsers className="w-3.5 h-3.5 text-blue-500" />
                    <span>User Assignment</span>
                  </div>
                  {activeSection === 'user' ? (
                    <FiChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FiChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {activeSection === 'user' && (
                  <div className="mt-2 pl-5">
                    <select
                      value={localFilters.selectedUserFilter || ""}
                      onChange={(e) =>
                        setLocalFilters({ ...localFilters, selectedUserFilter: e.target.value })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Users</option>
                      <option value="unassigned">Unassigned</option>
                      {filterOptions.assignedPersons.map((user) => (
                        <option key={user.uid} value={user.uid}>
                          {user.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Company and Phone Sections - Hidden in team view cold tab */}
              {!(!viewMyLeadsOnly && activeTab === "cold") && (
                <>
                  {/* Company Section */}
                  <div className="border-b border-gray-100 pb-3">
                    <button
                      onClick={() => toggleSection('company')}
                      className="flex justify-between items-center w-full text-left font-medium text-gray-700 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <FiBriefcase className="w-3.5 h-3.5 text-blue-500" />
                        <span>Company Name</span>
                      </div>
                      {activeSection === 'company' ? (
                        <FiChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <FiChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {activeSection === 'company' && (
                      <div className="mt-2 pl-5">
                        <select
                          value={localFilters.companyFilter || ""}
                          onChange={(e) =>
                            setLocalFilters({ ...localFilters, companyFilter: e.target.value })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">All Companies</option>
                          {filterOptions.companies.map((company) => (
                            <option key={company} value={company}>
                              {company}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Phone Section */}
                  <div>
                    <button
                      onClick={() => toggleSection('phone')}
                      className="flex justify-between items-center w-full text-left font-medium text-gray-700 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <FiPhone className="w-3.5 h-3.5 text-blue-500" />
                        <span>Phone Number</span>
                      </div>
                      {activeSection === 'phone' ? (
                        <FiChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <FiChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {activeSection === 'phone' && (
                      <div className="mt-2 pl-5">
                        <select
                          value={localFilters.phoneFilter || ""}
                          onChange={(e) =>
                            setLocalFilters({ ...localFilters, phoneFilter: e.target.value })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">All Phone Numbers</option>
                          {filterOptions.phones.map((phone) => (
                            <option key={phone} value={phone}>
                              {phone}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-between gap-2 mt-4">
              <button
                onClick={resetFilters}
                className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1"
              >
                <FiRefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                onClick={applyFilters}
                className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 shadow-sm"
              >
                <FiCheck className="w-3.5 h-3.5" />
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeadFilters;