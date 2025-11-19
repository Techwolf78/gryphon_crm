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
  FiCheck,
  FiCalendar
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
    // Filter leads based on current view mode and active tab (but not filters)
    let baseFilteredLeads = leads;
    
    // Filter by user assignment based on view mode
    if (viewMyLeadsOnly) {
      // My Leads: Only show leads assigned to current user
      baseFilteredLeads = leads.filter(lead => lead.assignedTo === currentUser?.uid);
    } else {
      // My Team: Show leads assigned to team members OR unassigned leads (exclude current user's leads)
      const teamMemberIds = getTeamMemberIds ? getTeamMemberIds(currentUser?.uid) : [];
      baseFilteredLeads = leads.filter(lead => !lead.assignedTo || teamMemberIds.includes(lead.assignedTo));
    }
    
    // Filter by active tab if not "all"
    if (activeTab !== "all") {
      baseFilteredLeads = baseFilteredLeads.filter(lead => lead.status === activeTab);
    }

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
          baseFilteredLeads
            .map((lead) => lead.companyName)
            .filter(Boolean)
        ),
      ].sort(),
      phones: [
        ...new Set(
          baseFilteredLeads
            .map((lead) => lead.pocPhone)
            .filter(Boolean)
        ),
      ].sort(),
    };
  }, [leads, viewMyLeadsOnly, currentUser, allUsers, getTeamMemberIds, activeTab]);

  const [hasSynced, setHasSynced] = useState(false);

  // Sync localFilters with parent filters when panel opens
  useEffect(() => {
    if (isFilterOpen && !hasSynced) {
      setLocalFilters(filters);
      setHasSynced(true);
    } else if (!isFilterOpen) {
      setHasSynced(false);
    }
  }, [isFilterOpen, hasSynced, filters]);

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
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-200 ${
            isFilterOpen || hasActiveFilters
              ? "bg-blue-50 border-blue-200 text-blue-700 shadow-md"
              : "bg-white/80 backdrop-blur-sm border-gray-200/50 text-gray-700 hover:bg-white shadow-sm hover:shadow-md"
          }`}
        >
          <FiFilter className="w-3.5 h-3.5" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-semibold shadow-sm">
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
            className="absolute top-full right-0 mt-3 bg-white/95 backdrop-blur-xl p-3 rounded-2xl shadow-2xl z-50 border border-white/20 w-[320px] max-h-[380px] overflow-y-auto"
            style={{
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <FiFilter className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm tracking-tight">Filters</h3>
              </div>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
                aria-label="Close filters"
              >
                <FiX className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-2">
              {/* User Assignment Section */}
              <div className="bg-gray-50/50 rounded-lg p-2 border border-gray-100/50">
                <button
                  onClick={() => toggleSection('user')}
                  className="flex justify-between items-center w-full text-left group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center shadow-sm">
                      <FiUsers className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-medium text-gray-900 text-sm">User Assignment ({filterOptions.assignedPersons.length + 2})</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-200 ${activeSection === 'user' ? 'rotate-180' : ''}`}>
                    <FiChevronDown className="w-2.5 h-2.5 text-gray-500" />
                  </div>
                </button>
                {activeSection === 'user' && (
                  <div className="mt-2 ml-7">
                    <select
                      value={localFilters.selectedUserFilter || "all"}
                      onChange={(e) => {
                        console.log("User filter selected:", e.target.value);
                        setLocalFilters({ ...localFilters, selectedUserFilter: e.target.value });
                      }}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 shadow-sm"
                    >
                      <option value="all">All Users</option>
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
                  <div className="bg-gray-50/50 rounded-lg p-2 border border-gray-100/50">
                    <button
                      onClick={() => toggleSection('company')}
                      className="flex justify-between items-center w-full text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-green-500 rounded-md flex items-center justify-center shadow-sm">
                          <FiBriefcase className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm">Company Name ({filterOptions.companies.length + 1})</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-200 ${activeSection === 'company' ? 'rotate-180' : ''}`}>
                        <FiChevronDown className="w-2.5 h-2.5 text-gray-500" />
                      </div>
                    </button>
                    {activeSection === 'company' && (
                      <div className="mt-2 ml-7">
                        <select
                          value={localFilters.companyFilter || ""}
                          onChange={(e) => {
                            console.log("Company filter selected:", e.target.value);
                            setLocalFilters({ ...localFilters, companyFilter: e.target.value });
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 shadow-sm"
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
                  <div className="bg-gray-50/50 rounded-lg p-2 border border-gray-100/50">
                    <button
                      onClick={() => toggleSection('phone')}
                      className="flex justify-between items-center w-full text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-purple-500 rounded-md flex items-center justify-center shadow-sm">
                          <FiPhone className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm">Phone Number ({filterOptions.phones.length + 1})</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-200 ${activeSection === 'phone' ? 'rotate-180' : ''}`}>
                        <FiChevronDown className="w-2.5 h-2.5 text-gray-500" />
                      </div>
                    </button>
                    {activeSection === 'phone' && (
                      <div className="mt-2 ml-7">
                        <select
                          value={localFilters.phoneFilter || ""}
                          onChange={(e) => {
                            console.log("Phone filter selected:", e.target.value);
                            setLocalFilters({ ...localFilters, phoneFilter: e.target.value });
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 shadow-sm"
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

                  {/* Date Section */}
                  <div className="bg-gray-50/50 rounded-lg p-2 border border-gray-100/50">
                    <button
                      onClick={() => toggleSection('date')}
                      className="flex justify-between items-center w-full text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-orange-500 rounded-md flex items-center justify-center shadow-sm">
                          <FiCalendar className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm">Date</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-200 ${activeSection === 'date' ? 'rotate-180' : ''}`}>
                        <FiChevronDown className="w-2.5 h-2.5 text-gray-500" />
                      </div>
                    </button>
                    {activeSection === 'date' && (
                      <div className="mt-2 ml-7 space-y-2">
                        {/* Radio Buttons with iOS Style */}
                        <div className="flex gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                              localFilters.dateFilterType === 'single'
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300 bg-white'
                            }`}>
                              {localFilters.dateFilterType === 'single' && (
                                <div className="w-full h-full rounded-full bg-white scale-50"></div>
                              )}
                            </div>
                            <input
                              type="radio"
                              name="dateFilterType"
                              value="single"
                              checked={localFilters.dateFilterType === 'single'}
                              onChange={(e) => setLocalFilters({ ...localFilters, dateFilterType: e.target.value })}
                              className="sr-only"
                            />
                            <span className="text-xs text-gray-700 font-medium">Single</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                              localFilters.dateFilterType === 'range'
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300 bg-white'
                            }`}>
                              {localFilters.dateFilterType === 'range' && (
                                <div className="w-full h-full rounded-full bg-white scale-50"></div>
                              )}
                            </div>
                            <input
                              type="radio"
                              name="dateFilterType"
                              value="range"
                              checked={localFilters.dateFilterType === 'range'}
                              onChange={(e) => setLocalFilters({ ...localFilters, dateFilterType: e.target.value })}
                              className="sr-only"
                            />
                            <span className="text-xs text-gray-700 font-medium">Range</span>
                          </label>
                        </div>

                        {/* Date Inputs */}
                        {localFilters.dateFilterType === 'single' ? (
                          <div>
                            <label className="block text-xs text-gray-600 mb-1 font-medium">Select Date</label>
                            <input
                              type="date"
                              value={localFilters.singleDate || ''}
                              onChange={(e) => setLocalFilters({ ...localFilters, singleDate: e.target.value })}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 shadow-sm"
                            />
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-600 mb-0.5 font-medium">Start Date</label>
                              <input
                                type="date"
                                value={localFilters.startDate || ''}
                                onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 shadow-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs text-gray-600 mb-0.5 font-medium">End Date</label>
                              <input
                                type="date"
                                value={localFilters.endDate || ''}
                                onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 shadow-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
              <button
                onClick={resetFilters}
                className="flex-1 px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Reset
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-lg transform hover:scale-[1.02]"
              >
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