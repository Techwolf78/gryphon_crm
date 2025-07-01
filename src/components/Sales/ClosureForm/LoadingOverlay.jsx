import React from "react";
import syncLogo from "../../../assets/SYNC logo png .png";

const LoadingOverlay = () => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative w-24 h-24 animate-spin-slow">
        <img
          src={syncLogo}
          alt="Loading"
          className="absolute inset-0 w-16 h-16 m-auto z-10"
        />
        <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
