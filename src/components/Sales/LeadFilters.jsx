import { useState, useEffect, useRef } from "react";
import { FiFilter, FiX } from "react-icons/fi";
import ExportLead from "./ExportLead";
import ImportLead from "./ImportLead";
import { db } from "../../firebase"; // Firebase config
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
  activeTab, // Add this prop
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [allLeads, setAllLeads] = useState([]);
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
    contactMethods: [
      ...new Set(
        Object.values(leads)
          .map((lead) => lead.contactMethod)
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

  // Check if any filter is active
  const hasActiveFilters = Object.values(filters).some(
    (filter) =>
      (typeof filter === "string" && filter) ||
      (typeof filter === "object" && Object.values(filter).some(Boolean))
  );

  return (
    <div className="flex items-center gap-3 px-4 relative">
      {/* Export & Import */}
      <ExportLead filteredLeads={filteredLeads} allLeads={allLeads} />
      <ImportLead 
        handleImportComplete={handleImportComplete} 
        activeTab={activeTab} // Pass activeTab prop
      />

      {/* Filter Button */}
      <div className="relative">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border transition-all ${
            isFilterOpen || hasActiveFilters
              ? "bg-blue-100 border-blue-300 text-blue-800"
              : "bg-gradient-to-r from-gray-50 to-white border-gray-300 text-gray-700 hover:from-gray-100"
          }`}
        >
          <FiFilter className="w-4 h-4" />
          <span>Add Filters</span>
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {Object.values(filters).filter(Boolean).length}
            </span>
          )}
        </button>

        {/* Filter Panel */}
        {isFilterOpen && (
          <div
            ref={filterPanelRef}
            className="absolute top-full -left-80 mt-2 bg-white p-5 rounded-lg shadow-xl z-50 border border-gray-100 w-full min-w-[900px]"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Filter Leads</h3>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="text-white hover:text-red-100 transition-colors bg-red-500 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-900"
                aria-label="Close filters"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Grid */}
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: "1.5fr 3fr 1.5fr" }}
            >
              {/* Column 1 */}
              <div className="space-y-4">
                {/* City Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <select
                    value={localFilters.city || ""}
                    onChange={(e) =>
                      setLocalFilters({ ...localFilters, city: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Cities</option>
                    {filterOptions.cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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

              {/* Column 2 */}
              <div className="space-y-4">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <div className="flex gap-3">
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-500 mb-1">From</label>
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
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-500 mb-1">To</label>
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
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Person (pocName) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <select
                    value={localFilters.pocName || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        pocName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Contacts</option>
                    {filterOptions.pocNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Column 3 */}
              <div className="space-y-4">
                {/* Contact Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Method
                  </label>
                  <select
                    value={localFilters.contactMethod || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        contactMethod: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Methods</option>
                    {filterOptions.contactMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <select
                    value={localFilters.email || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Emails</option>
                    {filterOptions.emails.map((email) => (
                      <option key={email} value={email}>
                        {email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear All
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeadFilters;
