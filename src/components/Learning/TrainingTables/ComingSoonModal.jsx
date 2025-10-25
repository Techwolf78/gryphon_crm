import React from "react";
import { FiX, FiClock } from "react-icons/fi";

const ComingSoonModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md transform transition-all duration-300 scale-100">
        {/* Clean white background */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Blue header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                Coming Soon
              </h3>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 text-center">
            {/* Icon */}
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-6 border-4 border-blue-200">
              <FiClock className="h-10 w-10 text-blue-600" />
            </div>

            {/* Description */}
            <p className="text-gray-700 mb-8 leading-relaxed text-base">
              JD Training feature is currently under development and will be available soon. Stay tuned for updates!
            </p>

            {/* Action button */}
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonModal;
