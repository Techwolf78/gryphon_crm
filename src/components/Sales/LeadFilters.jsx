import { useState, useEffect, useRef } from "react";
import { 
  FiFilter, 
  FiX, 
  FiChevronDown, 
  FiChevronUp,
  FiMapPin,
  FiUsers,
  FiCalendar,
  FiUser,
  FiMail,
  FiPhone,
  FiRefreshCw,
  FiCheck
} from "react-icons/fi";
import ExportLead from "./ExportLead";
import ImportLead from "./ImportLead";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

function LeadFilters({
  filteredLeads,
  handleImportComplete,
  filters,
  setFilters,
  isFilterOpen,
  setIsFilterOpen,
  users,
  leads,
  activeTab,
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [allLeads, setAllLeads] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const filterPanelRef = useRef(null);

  // Fetch all leads from Firebase
  useEffect(() => {
    const fetchAllLeads = async () => {
      try {
        const snapshot = await getDocs(collection(db, "leads"));
        const fetchedLeads = snapshot.docs.map((doc) => [doc.id, doc.data()]);
        setAllLeads(fetchedLeads);
      } catch (error) {
        console.error("Error fetching all leads:", error);
      }
    };
    fetchAllLeads();
  }, []);

  // Generate filter options from leads and users data
  const filterOptions = {
    cities: [
      ...new Set(
        Object.values(leads)
          .map((lead) => lead.city)
          .filter(Boolean)
      ),
    ],
    assignedPersons: Object.values(users)
      .map((user) => ({
        uid: user.uid,
        displayName: user.name || user.displayName,
      }))
      .filter((user) => user.displayName),
    pocNames: [
      ...new Set(
        Object.values(leads)
          .map((lead) => lead.pocName)
          .filter(Boolean)
      ),
    ],
    emails: [
      ...new Set(
        Object.values(leads)
          .map((lead) => lead.email)
          .filter(Boolean)
      ),
    ],
    contactMethods: ["Visit", "Call"],
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

  // Check if any filter is active
  const hasActiveFilters = Object.values(filters).some(
    (filter) =>
      (typeof filter === "string" && filter) ||
      (typeof filter === "object" && Object.values(filter).some(Boolean))
  );

  if (activeTab === 'closed') {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-4 relative">
      {/* Export & Import */}
      <ExportLead filteredLeads={filteredLeads} allLeads={allLeads} />
      <ImportLead 
        handleImportComplete={handleImportComplete} 
        activeTab={activeTab}
      />

      {/* Filter Button */}
      <div className="relative">
        <button
          onClick={() => !isFilterOpen && setIsFilterOpen(true)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
            isFilterOpen || hasActiveFilters
              ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm"
          }`}
        >
          <FiFilter className="w-4 h-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {Object.values(filters).filter(Boolean).length}
            </span>
          )}
        </button>

        {/* Filter Panel */}
        {isFilterOpen && (
          <div
            ref={filterPanelRef}
            className="absolute top-full right-0 mt-2 bg-white p-4 rounded-xl shadow-lg z-50 border border-gray-200 w-[280px] max-h-[400px] overflow-y-auto"
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
              {/* Location Section */}
              <div className="border-b border-gray-100 pb-3">
                <button
                  onClick={() => toggleSection('location')}
                  className="flex justify-between items-center w-full text-left font-medium text-gray-700 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <FiMapPin className="w-3.5 h-3.5 text-blue-500" />
                    <span>Location</span>
                  </div>
                  {activeSection === 'location' ? (
                    <FiChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FiChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {activeSection === 'location' && (
                  <div className="mt-2 pl-5">
                    <select
                      value={localFilters.city || ""}
                      onChange={(e) =>
                        setLocalFilters({ ...localFilters, city: e.target.value })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Cities</option>
                      {filterOptions.cities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Team Section */}
              <div className="border-b border-gray-100 pb-3">
                <button
                  onClick={() => toggleSection('team')}
                  className="flex justify-between items-center w-full text-left font-medium text-gray-700 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <FiUsers className="w-3.5 h-3.5 text-blue-500" />
                    <span>Team</span>
                  </div>
                  {activeSection === 'team' ? (
                    <FiChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FiChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {activeSection === 'team' && (
                  <div className="mt-2 pl-5">
                    <select
                      value={localFilters.assignedTo || ""}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          assignedTo: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                )}
              </div>

              {/* Date Section */}
              <div className="border-b border-gray-100 pb-3">
                <button
                  onClick={() => toggleSection('date')}
                  className="flex justify-between items-center w-full text-left font-medium text-gray-700 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>Date Range</span>
                  </div>
                  {activeSection === 'date' ? (
                    <FiChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FiChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {activeSection === 'date' && (
                  <div className="mt-2 pl-5 space-y-2">
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
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="From"
                    />
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
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="To"
                    />
                  </div>
                )}
              </div>

              {/* Contact Section */}
              <div>
                <button
                  onClick={() => toggleSection('contact')}
                  className="flex justify-between items-center w-full text-left font-medium text-gray-700 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <FiUser className="w-3.5 h-3.5 text-blue-500" />
                    <span>Contact</span>
                  </div>
                  {activeSection === 'contact' ? (
                    <FiChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FiChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {activeSection === 'contact' && (
                  <div className="mt-2 pl-5 space-y-2">
                    <select
                      value={localFilters.pocName || ""}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          pocName: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Contacts</option>
                      {filterOptions.pocNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={localFilters.email || ""}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Emails</option>
                      {filterOptions.emails.map((email) => (
                        <option key={email} value={email}>
                          {email}
                        </option>
                      ))}
                    </select>
                    <select
                      value={localFilters.contactMethod || ""}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          contactMethod: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Methods</option>
                      {filterOptions.contactMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
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