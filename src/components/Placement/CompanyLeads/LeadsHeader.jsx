import React from "react";
import { PlusIcon } from "@heroicons/react/outline";

const LeadsHeader = ({ searchTerm, setSearchTerm, onAddLead }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
      <div className="w-full md:max-w-xs">
        <input
          type="text"
          placeholder="Search companies or contacts..."
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <button
        onClick={onAddLead}
        className="w-full md:w-auto px-4 py-2 text-white rounded-lg font-semibold flex items-center justify-center focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md relative overflow-hidden"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 opacity-100 hover:opacity-90 transition-opacity duration-200 z-0"></span>
        <span className="relative z-10 flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Company
        </span>
      </button>
    </div>
  );
};

export default LeadsHeader;