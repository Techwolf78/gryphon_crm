import React, { useState } from "react";
import { FiTool, FiClock, FiMail, FiX, FiChevronRight } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const DigitalMarketing = () => {
  const [showRoadmap, setShowRoadmap] = useState(false);
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
              onClick={() => setShowRoadmap(true)}
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
              className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl max-w-8xl w-full max-h-[90vh] overflow-y-auto border border-white/20"
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

              <div className="p-0 md:p-10">
                <div className="overflow-x-auto">
                  <div className="min-w-[600px] md:min-w-[1200px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-0 md:p-0">
                    {/* Gradient Header */}
                    <div className="rounded-t-2xl bg-gradient-to-r from-blue-100 via-white to-amber-50 px-6 py-2 md:px-12 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h4 className="text-2xl md:text-3xl font-bold mb-1 tracking-tight">
                          <span className="text-black">SYNC</span>
                          <span className="text-gray-900"> - Product Development Roadmap</span>
                        </h4>
                        <p className="text-gray-500 text-sm md:text-base font-medium">
                          Transparent milestones, clear progress, and what’s
                          next.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 items-center">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold shadow-sm">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Completed
                        </span>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold shadow-sm">
                          <svg
                            className="w-4 h-4 animate-spin"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              strokeOpacity="0.3"
                            />
                            <path d="M12 2a10 10 0 0 1 10 10" />
                          </svg>
                          In Progress
                        </span>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold shadow-sm">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v4l2 2" />
                          </svg>
                          Pending
                        </span>
                      </div>
                    </div>
                    {/* Timeline */}
                    <div className="px-4  py-2">
                      {/* Months Header */}
                      <div className="flex items-center mb-2"> {/* Reduced mb-6 to mb-2 to decrease gap */}
                        <div className="w-36 md:w-48"></div>
                        <div className="flex-1 grid grid-cols-7 gap-2">
                          {["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(
                            (m) => (
                              <div key={m} className="flex flex-col items-center">
                                <div className="flex items-center">
                                  {/* Month Icon on the left of month name */}
                                  <svg
                                    className="w-4 h-4 mr-1 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                  >
                                    <rect x="3" y="4" width="18" height="18" rx="3" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                  </svg>
                                  <span
                                    className="text-xs md:text-sm text-gray-400 text-center font-semibold tracking-wide"
                                    aria-label={m}
                                  >
                                    {m}
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                      {/* Gantt Rows */}
                      <div className="space-y-6">
                        {[
                          {
                            label: "Sales Phase",
                            start: 0,
                            span: 2,
                            color: "bg-green-500", // changed from bg-indigo-500
                            status: "Completed",
                            icon: (
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ),
                            text: "text-white",
                            desc: "Initial resource gathering, demos,<br />and onboarding of early contracts.",
                          },
                          {
                            label: "Initial Testing",
                            start: 1,
                            span: 1,
                            color: "bg-green-400", // changed from bg-indigo-400
                            status: "Completed",
                            icon: (
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ),
                            text: "text-white",
                            desc: "Alpha release, core feature validation, and bug fixes.",
                          },
                          {
                            label: "Learning & Development",
                            start: 1, // July
                            span: 3, // July, August, September
                            color: "bg-amber-400",
                            status: "In Progress",
                            icon: (
                              <svg
                                className="w-4 h-4 mr-2 animate-spin"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  strokeOpacity="0.3"
                                />
                                <path d="M12 2a10 10 0 0 1 10 10" />
                              </svg>
                            ),
                            text: "text-white",
                            desc: "Training Scheduler, trainer management, and invoice generation.",
                          },
                          {
                            label: "Comprehensive Testing (L&D)",
                            start: 3, // September
                            span: 2, // September + October (approximate mid-Oct visually)
                            color: "bg-gray-400",
                            status: "Pending",
                            icon: (
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v4l2 2" />
                              </svg>
                            ),
                            text: "text-white",
                            desc: "Comprehensive QA, fine-tuning processes, and optimization/scalability.",
                          },
                          {
                            label: "Placement Phase",
                            start: 4, // October
                            span: 2, // October + November (approximate mid-Nov visually)
                            color: "bg-gray-200",
                            status: "Pending",
                            icon: (
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v4l2 2" />
                              </svg>
                            ),
                            text: "text-gray-700",
                            desc: "Student placements with companies, interviews, and onboarding support",
                          },
                          {
                            label: "Digital Marketing",
                            start: 5, // November
                            span: 2, // November + December
                            color: "bg-gray-500",
                            status: "Pending",
                            icon: (
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v4l2 2" />
                              </svg>
                            ),
                            text: "text-white",
                            desc: "Launch of task tracking system, analytics, and reporting.",
                          },
                        ].map((row, idx, arr) => (
                          <React.Fragment key={row.label}>
                            <div className="flex items-center group">
                              <div className="min-w-[120px] md:min-w-[180px] flex-1 md:flex-none flex flex-col">
                                <span className="text-sm md:text-base font-semibold text-gray-800 flex items-center mb-1">
                                  {row.icon}
                                  {row.label}
                                </span>
                                <span
                                  className="text-xs text-gray-400 font-normal leading-tight hidden md:block"
                                  dangerouslySetInnerHTML={{ __html: row.desc }}
                                ></span>
                              </div>
                              <div className="flex-1 grid grid-cols-7 gap-2">
                                {[...Array(row.start)].map((_, idx) => (
                                  <div key={idx}></div>
                                ))}
                                <div
                                  className={`col-span-${row.span} ${row.color} rounded-xl h-7 md:h-9 flex items-center justify-center px-3 shadow transition-all duration-200 ${row.text} font-semibold text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ring-inset ring-1 ring-black/5 group-hover:scale-[1.03]`}
                                  tabIndex={0}
                                  aria-label={`${row.label} ${row.status}`}
                                  role="status"
                                >
                                  <span className="sr-only md:not-sr-only">
                                    {row.status}
                                  </span>
                                </div>
                                {[...Array(7 - row.start - row.span)].map(
                                  (_, idx) => (
                                    <div key={idx}></div>
                                  )
                                )}
                              </div>
                            </div>
                            {/* Add a horizontal line between tasks, except after the last one */}
                            {idx < arr.length - 1 && (
                              <div className="border-t border-dashed border-gray-200 my-2"></div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      {/* Subtle Divider */}
                      <div className="border-t border-dashed border-gray-200 mt-4 mb-2"></div>
                      {/* Footer Note */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="text-xs text-gray-400">
                          <span className="font-semibold text-gray-500">
                            Note:
                          </span>{" "}
                          Timeline and milestones are subject to change based on
                          user feedback and technical discoveries.
                        </div>
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
