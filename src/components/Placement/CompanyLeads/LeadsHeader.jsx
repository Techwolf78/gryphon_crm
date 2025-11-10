import { PlusIcon, CloudUploadIcon } from "@heroicons/react/outline";

const LeadsHeader = ({ searchTerm, setSearchTerm, onAddLead, onBulkUpload }) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 w-full">
      <div className="flex-1 max-w-md">
        <input
          type="text"
          placeholder="Search companies or contacts..."
          className="w-full px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={onAddLead}
          className="px-3 py-1 bg-linear-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold flex items-center justify-center hover:from-blue-700 hover:to-indigo-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md transition-all duration-200 text-xs"
        >
          <PlusIcon className="h-3 w-3 mr-1" />
          Add Company
        </button>
        <button
          onClick={onBulkUpload}
          className="px-3 py-1 bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md text-xs"
        >
          <CloudUploadIcon className="h-3 w-3 mr-1" />
          Bulk Upload
        </button>
      </div>
    </div>
  );
};

export default LeadsHeader;