import React from "react";

function LoadingState() {
  return (
    <div className="flex flex-col justify-center items-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-gray-500">Loading trainer data...</p>
    </div>
  );
}

export default LoadingState;
