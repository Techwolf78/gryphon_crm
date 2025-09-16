import React from "react";
import { FiRefreshCw } from "react-icons/fi";

const LoadingState = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex items-center justify-center">
      <div className="text-center">
        <FiRefreshCw className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading bills data...</p>
      </div>
    </div>
  );
};

export default LoadingState;
