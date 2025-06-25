// components/Sales/LeadFilters.jsx
import { CSVLink } from "react-csv";
import { FiDownload, FiUpload, FiFilter } from "react-icons/fi";
import Papa from "papaparse";

function LeadFilters({
  filteredLeads,
  handleImportComplete,
  filters,
  isFilterOpen,
  setIsFilterOpen,
}) {
  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        handleImportComplete(results.data);
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
      },
    });
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Export Button */}
      <CSVLink
        data={filteredLeads.map(([, lead]) => ({
          BusinessName: lead.businessName,
          City: lead.city,
          Phone: lead.phoneNo,
          Email: lead.email,
          Phase: lead.phase,
          AssignedTo: lead.assignedTo?.displayName || "",
          CreatedAt: new Date(lead.createdAt).toLocaleDateString(),
        }))}
        filename={"leads_export.csv"}
        className="flex items-center space-x-1 text-xs px-3 py-1 rounded-full border bg-white hover:bg-gray-50 transition-colors border-gray-200 text-gray-700"
      >
        <FiDownload className="w-4 h-4" />
        <span>Export</span>
      </CSVLink>

      {/* Import Button */}
      <label className="flex items-center space-x-1 text-xs px-3 py-1 rounded-full border bg-white hover:bg-gray-50 transition-colors border-gray-200 text-gray-700 cursor-pointer">
        <FiUpload className="w-4 h-4" />
        <span>Import</span>
        <input
          type="file"
          accept=".csv"
          onChange={handleCSVUpload}
          className="hidden"
        />
      </label>

      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsFilterOpen(!isFilterOpen)}
        className={`flex items-center space-x-2 px-3 py-1 rounded-full border transition-colors text-xs ${
          isFilterOpen
            ? "bg-blue-50 border-blue-200 text-blue-600"
            : "bg-white border-gray-200 hover:bg-gray-50"
        }`}
      >
        <FiFilter className="w-4 h-4" />
        <span>Filters</span>
        {Object.values(filters).some(
          (filter) =>
            (typeof filter === "string" && filter) ||
            (typeof filter === "object" && Object.values(filter).some(Boolean))
        ) && (
          <span className="bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            !
          </span>
        )}
      </button>
    </div>
  );
}

export default LeadFilters;
