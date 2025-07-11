import React, { useState } from "react";
import { FiTool, FiClock, FiMail, FiX, FiChevronRight } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const DigitalMarketing = () => {
  const [showRoadmap, setShowRoadmap] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-8 md:p-10">
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
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 text-center"
          >
            Digital Marketing Suite
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center mb-8"
          >
            <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <FiClock className="mr-2" /> Coming Soon
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mb-8 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            We're crafting a powerful digital marketing platform to help you
            automate campaigns, analyze performance, and grow your business
            efficiently.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row justify-center gap-4 mb-10"
          >
            <button
              onClick={() => setShowRoadmap(true)}
              className="px-6 py-3 border border-gray-200 hover:border-gray-300 text-gray-700 font-medium rounded-lg transition-all duration-200 flex items-center justify-center"
            >
              View Roadmap <FiChevronRight className="ml-2" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-blue-50 border border-blue-100 rounded-lg p-4 max-w-2xl mx-auto"
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
                <h3 className="text-sm font-medium text-blue-800">
                  Estimated Launch
                </h3>
                <div className="mt-1 text-sm text-blue-700">
                  <p>Targeting Q4 2026 - Currently in active development</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="bg-gray-50 px-8 py-6 border-t border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-3 md:mb-0">
              Want updates?{" "}
              <button className="text-indigo-600 hover:text-indigo-800 font-medium">
                Join our newsletter
              </button>
            </p>
            <div className="flex space-x-6">
              <button
                className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
                onClick={() => navigate("/dashboard/help")}
              >
                Contact Support
              </button>
              <button className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
              onClick={() => navigate("/dashboard/help")}>
                Feature Requests
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Roadmap Modal */}
      <AnimatePresence>
        {showRoadmap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-54"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/20"
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-56">
                <h3 className="text-xl font-bold text-gray-900">
                  Development Roadmap
                </h3>
                <button
                  onClick={() => setShowRoadmap(false)}
                  className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-50"
                  aria-label="Close roadmap"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>

              <div className="p-6">
                <div className="relative">
                  {/* Vertical line */}
                  <div
                    className="absolute left-4 top-0 h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  ></div>

                  <div className="space-y-8 z-52">
                    {/* Timeline Item */}
                    <div className="relative pl-12">
                      <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 ring-8 ring-indigo-50">
                        <svg
                          className="h-5 w-5 text-white"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-indigo-600">
                            June - July 2025
                          </span>
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            Completed
                          </span>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          Sales Phase
                        </h4>
                        <p className="text-gray-600">
                          Initial market research and sales strategy
                          development.
                        </p>
                      </div>
                    </div>

                    {/* Timeline Item */}
                    <div className="relative pl-12">
                      <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 ring-8 ring-indigo-50">
                        <svg
                          className="h-5 w-5 text-white"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-indigo-600">
                            July (2nd Half) 2025
                          </span>
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            In Progress
                          </span>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          Initial Testing Phase
                        </h4>
                        <p className="text-gray-600">
                          Core functionality testing with select clients.
                        </p>
                      </div>
                    </div>

                    {/* Timeline Item */}
                    <div className="relative pl-12">
                      <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 ring-8 ring-gray-50">
                        <svg
                          className="h-5 w-5 text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-600">
                            July - August 2025
                          </span>
                          <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">
                            Pending
                          </span>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          Learning & Development
                        </h4>
                        <p className="text-gray-600">
                          Team training and feature development based on initial
                          feedback.
                        </p>
                      </div>
                    </div>

                    {/* Timeline Item */}
                    <div className="relative pl-12">
                      <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 ring-8 ring-gray-50">
                        <svg
                          className="h-5 w-5 text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-600">
                            August (2nd Half) 2025
                          </span>
                          <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">
                            Pending
                          </span>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          Comprehensive Testing
                        </h4>
                        <p className="text-gray-600">
                          Full platform testing with expanded user group.
                        </p>
                      </div>
                    </div>

                    {/* Timeline Item */}
                    <div className="relative pl-12">
                      <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 ring-8 ring-gray-50">
                        <svg
                          className="h-5 w-5 text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-600">
                            September - November 2025
                          </span>
                          <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">
                            Pending
                          </span>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          Placement Phase
                        </h4>
                        <p className="text-gray-600">
                          Integration with existing systems and deployment
                          preparation.
                        </p>
                      </div>
                    </div>

                    {/* Timeline Item */}
                    <div className="relative pl-12">
                      <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 ring-8 ring-gray-50">
                        <svg
                          className="h-5 w-5 text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-600">
                            November - December 2025
                          </span>
                          <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">
                            Pending
                          </span>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          Digital Marketing Implementation
                        </h4>
                        <p className="text-gray-600">
                          Full platform launch and marketing campaign rollout.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DigitalMarketing;
