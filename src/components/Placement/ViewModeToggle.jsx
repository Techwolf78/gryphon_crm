import React from 'react';

const ViewModeToggle = ({ viewMyLeadsOnly, setViewMyLeadsOnly }) => {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => setViewMyLeadsOnly(true)}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          viewMyLeadsOnly
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        My Leads
      </button>
      <button
        onClick={() => setViewMyLeadsOnly(false)}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          !viewMyLeadsOnly
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        My Team
      </button>
    </div>
  );
};

export default ViewModeToggle;