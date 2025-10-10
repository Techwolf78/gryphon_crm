import React from 'react';
import { FiSettings, FiClock } from 'react-icons/fi';

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl w-full bg-white rounded-2xl shadow-2xl p-6 sm:p-8 lg:p-10 text-center">
        {/* Maintenance Icon */}
        <div className="mb-4 sm:mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <FiSettings className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 animate-spin" style={{animationDuration: '3s'}} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
          System Under Maintenance
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed px-2 sm:px-0">
          We're currently performing scheduled maintenance to improve your experience.
          The system will be back online shortly.
        </p>

        {/* Maintenance Details */}
        <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-center mb-2">
            <FiClock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mr-2" />
            <span className="text-xs sm:text-sm font-medium text-blue-900">Expected Duration</span>
          </div>
          <p className="text-xs sm:text-sm text-blue-700">
            Approximately 1-2 hours
          </p>
        </div>

        {/* Contact Info */}
        <div className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
          <p className="mb-2">For urgent matters, please contact support</p>
          <div className="space-y-1">
            <a href="mailto:connect@gryphonacademy.co.in" className="block text-blue-600 hover:text-blue-800 transition-colors">
              connect@gryphonacademy.co.in
            </a>
            <a href="tel:+918605234701" className="block text-blue-600 hover:text-blue-800 transition-colors">
              +91 8605234701
            </a>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm sm:text-base font-medium"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};

export default Maintenance;