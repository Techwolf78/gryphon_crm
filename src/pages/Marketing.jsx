import React from "react";
import { FiTool, FiClock, FiMail, FiChevronRight } from "react-icons/fi";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const DigitalMarketing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100vh] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-2 sm:px-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="px-2 sm:px-6 py-4 sm:py-8">
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl"
            >
              <FiTool className="text-indigo-600 text-3xl" />
            </motion.div>
          </div>

          <motion.h1
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 text-center"
          >
            Digital Marketing Suite
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center mb-6 sm:mb-8"
          >
            <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <FiClock className="mr-2" /> Coming Soon
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mb-6 sm:mb-8 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            We're crafting a powerful digital marketing platform to help you
            automate campaigns, analyze performance, and grow your business
            efficiently.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-8 sm:mb-10"
          >
            <button
              onClick={() => navigate("/dashboard/marketing/roadmap")}
              className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-200 hover:border-gray-300 text-gray-700 font-medium rounded-lg transition-all duration-200 flex items-center justify-center text-sm sm:text-base"
            >
              View Roadmap <FiChevronRight className="ml-2" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-blue-50 border border-blue-100 rounded-lg p-3 sm:p-4 max-w-2xl mx-auto"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-xs sm:text-sm font-medium text-blue-800">
                  Estimated Launch
                </h3>
                <div className="mt-1 text-xs sm:text-sm text-blue-700">
                  <p>Targeting Q4 2026 - Currently in active development</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="bg-gray-50 px-2 sm:px-8 py-4 sm:py-6 border-t border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-xs sm:text-sm mb-3 md:mb-0">
              Want updates?{" "}
              <button className="text-indigo-600 hover:text-indigo-800 font-medium">
                Join our newsletter
              </button>
            </p>
            <div className="flex space-x-4 sm:space-x-6">
              <button
                className="text-gray-500 hover:text-gray-700 text-xs sm:text-sm transition-colors"
                onClick={() => navigate("/dashboard/help")}
              >
                Contact Support
              </button>
              <button
                className="text-gray-500 hover:text-gray-700 text-xs sm:text-sm transition-colors"
                onClick={() => navigate("/dashboard/help")}
              >
                Feature Requests
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DigitalMarketing;
