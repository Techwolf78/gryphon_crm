import React from 'react';

const ViewToggle = ({ viewMode, setViewMode }) => {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-xl p-0.5 border border-gray-200/60 shadow-sm">
        <button
          onClick={() => setViewMode('date')}
          className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all duration-200 transform ${
            viewMode === 'date'
              ? 'bg-linear-to-r from-blue-500 to-indigo-600 text-white shadow-sm scale-105'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          Date
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all duration-200 transform ${
            viewMode === 'table'
              ? 'bg-linear-to-r from-blue-500 to-indigo-600 text-white shadow-sm scale-105'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          Table
        </button>
      </div>
    </div>
  );
};

export default ViewToggle;