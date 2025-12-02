import React from 'react';

const ViewModeToggle = ({ viewMyLeadsOnly, setViewMyLeadsOnly }) => {
  return (
    <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-sm p-1.5 gap-1.5">
      <span className="text-xs font-semibold text-blue-600">
        Viewing:
      </span>
      <div className="flex items-center bg-linear-to-r from-green-50 to-blue-50 rounded-full p-0.5 border border-green-200">
        <button
          onClick={() => setViewMyLeadsOnly(true)}
          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
            viewMyLeadsOnly
              ? 'bg-linear-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Leads
        </button>
        <button
          onClick={() => setViewMyLeadsOnly(false)}
          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
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
};

export default ViewModeToggle;
