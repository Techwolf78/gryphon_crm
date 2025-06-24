import React, { useState } from "react";
import {
  FiFilter,
  FiDownload,
  FiUpload,
  FiX,
  FiChevronDown,
} from "react-icons/fi";
import { CSVLink } from "react-csv";
import Papa from "papaparse";

const LeadFilters = ({
  leads,
  users,
  currentUser,
  onFilterChange,
  onImportComplete,
  isFilterOpen,
  setIsFilterOpen,
}) => {
  const [activeFilterTab, setActiveFilterTab] = useState("basic");
  const [filters, setFilters] = useState({
    city: "",
    assignedTo: "",
    dateRange: { start: "", end: "" },
    followUpStatus: "",
    closureStatus: "",
    pocName: "",
    phoneNo: "",
    email: "",
  });

  const [importError, setImportError] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      dateRange: { ...prev.dateRange, [name]: value },
    }));
  };

  const applyFilters = () => {
    onFilterChange(filters);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    setFilters({
      city: "",
      assignedTo: "",
      dateRange: { start: "", end: "" },
      followUpStatus: "",
      closureStatus: "",
      pocName: "",
      phoneNo: "",
      email: "",
    });
    onFilterChange({});
  };

  const exportToCSV = () => {
    const data = Object.values(leads).map((lead) => ({
      "College Name": lead.businessName,
      City: lead.city,
      "Contact Name": lead.pocName,
      "Phone No.": lead.phoneNo,
      "Email ID": lead.email,
      "Opened Date": new Date(lead.createdAt).toLocaleDateString(),
      "Expected Closure": lead.expectedClosureDate
        ? new Date(lead.expectedClosureDate).toLocaleDateString()
        : "",
      Phase: lead.phase,
      "Assigned To": lead.assignedTo?.name || "",
      Status: lead.status || "",
    }));

    return data;
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setImportError("Please upload a valid CSV file");
      return;
    }

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setImportError("Error parsing CSV file");
          return;
        }
        onImportComplete(results.data);
        setImportError(null);
      },
      error: (error) => {
        setImportError("Error parsing CSV file");
      },
    });
  };

  const triggerImport = () => {
    fileInputRef.current.click();
  };

  const uniqueCities = [
    ...new Set(Object.values(leads).map((lead) => lead.city)),
  ].filter(Boolean);

  const salesTeam = Object.values(users).filter(
    (user) => user.department === "Sales"
  );

  return (
    <div className="mb-6">
<div className="flex justify-between items-center mb-4">
  {/* Left: Filters */}
  <button
    onClick={() => setIsFilterOpen(!isFilterOpen)}
    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
      isFilterOpen
        ? "bg-blue-50 border-blue-200 text-blue-600"
        : "bg-white border-gray-200 hover:bg-gray-50"
    }`}
  >
    <FiFilter className="w-5 h-5" />
    <span>Filters</span>
    {Object.values(filters).some(
      (filter) =>
        (typeof filter === "string" && filter) ||
        (typeof filter === "object" && Object.values(filter).some(Boolean))
    ) && (
      <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
        !
      </span>
    )}
  </button>

  {/* Right: Export + Import */}
  <div className="flex space-x-2">
    <CSVLink
      data={exportToCSV()}
      filename={"leads-export.csv"}
      className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
    >
      <FiDownload className="w-5 h-5" />
      <span>Export</span>
    </CSVLink>

    <input
      type="file"
      ref={fileInputRef}
      onChange={handleImport}
      accept=".csv"
      className="hidden"
    />
    <button
      onClick={triggerImport}
      className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
    >
      <FiUpload className="w-5 h-5" />
      <span>Import</span>
    </button>
  </div>
</div>


      {isFilterOpen && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveFilterTab("basic")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeFilterTab === "basic"
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                Basic Filters
              </button>
              <button
                onClick={() => setActiveFilterTab("advanced")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeFilterTab === "advanced"
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                Advanced Filters
              </button>
            </div>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Rest of the filter content remains the same */}
          {activeFilterTab === "basic" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <select
                  name="city"
                  value={filters.city}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Cities</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <select
                  name="assignedTo"
                  value={filters.assignedTo}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Team Members</option>
                  {salesTeam.map((user) => (
                    <option key={user.uid} value={user.uid}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    name="start"
                    value={filters.dateRange.start}
                    onChange={handleDateRangeChange}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="date"
                    name="end"
                    value={filters.dateRange.end}
                    onChange={handleDateRangeChange}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeFilterTab === "advanced" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="pocName"
                  value={filters.pocName}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phoneNo"
                  value={filters.phoneNo}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by phone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="text"
                  name="email"
                  value={filters.email}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by email"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadFilters;
