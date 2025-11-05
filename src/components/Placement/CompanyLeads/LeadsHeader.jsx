import { PlusIcon, CloudUploadIcon } from "@heroicons/react/outline";

const LeadsHeader = ({ searchTerm, setSearchTerm, onAddLead, onBulkUpload }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-2">
      <div className="w-full md:max-w-xs">
        <input
          type="text"
          placeholder="Search companies or contacts..."
          className="w-full px-3 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="flex gap-2 w-full md:w-auto">
        <button
          onClick={onAddLead}
          className="flex-1 md:flex-none px-3 py-1 text-white rounded-lg font-semibold flex items-center justify-center focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md relative overflow-hidden text-sm"
        >
          <span className="absolute inset-0 bg-linear-to-r from-blue-600 to-indigo-700 opacity-100 hover:opacity-90 transition-opacity duration-200 z-0"></span>
          <span className="relative z-10 flex items-center">
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Company
          </span>
        </button>
        <button
          onClick={onBulkUpload}
          className="flex-1 md:flex-none px-3 py-1 bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md text-sm"
        >
          <CloudUploadIcon className="h-4 w-4 mr-1" />
          Bulk Upload
        </button>
      </div>
    </div>
  );
};

export default LeadsHeader;