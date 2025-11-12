import React from 'react';

const ViewModeToggle = ({ viewMyLeadsOnly, setViewMyLeadsOnly }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-700">
        {viewMyLeadsOnly ? 'Viewing Leads:' : 'Viewing Team:'}
      </span>
      <div className="flex items-center bg-linear-to-r from-green-50 to-blue-50 rounded-full p-1 border border-green-200">
        <button
          onClick={() => setViewMyLeadsOnly(true)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
            viewMyLeadsOnly
              ? 'bg-linear-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Leads
        </button>
        <button
          onClick={() => setViewMyLeadsOnly(false)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
            !viewMyLeadsOnly
              ? 'bg-linear-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Team
        </button>
      </div>
    </div>
  );
};export default ViewModeToggle;