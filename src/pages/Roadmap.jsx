import React from "react";

const Roadmap = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="w-full">
        <div className="overflow-x-auto">
            <div className="min-w-[600px] md:min-w-[1200px] bg-white rounded-3xl shadow-xl border border-slate-200/50 p-0 md:p-0 backdrop-blur-sm">
            {/* Premium Header */}
            <div className="rounded-t-3xl bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-4 py-1 md:px-8 border-b border-slate-200/60 flex flex-col md:flex-row md:items-center md:justify-between gap-1">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-1 tracking-tight text-slate-900">
                  <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">SYNC</span>
                  <span className="text-slate-700"> - Product Development Roadmap (Gantt Chart)</span>
                </h1>
                <p className="text-slate-600 text-xs md:text-sm font-medium leading-tight">
                  Transparent milestones, clear progress, and what's next in our journey.
                </p>
              </div>
              <div className="flex flex-wrap gap-1 items-center">
                <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold shadow-sm border border-emerald-200/50 transition-colors hover:bg-emerald-100">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Completed
                </span>
                <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold shadow-sm border border-amber-200/50">
                  <svg
                    className="w-5 h-5 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true" 
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
                <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-semibold shadow-sm border border-slate-200/50 transition-colors hover:bg-slate-100">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4l2 2" />
                  </svg>
                  Planned
                </span>
              </div>
            </div>
            {/* Timeline Section */}
            <div className="px-4 py-2">
              {/* Months Header */}
              <div className="flex items-center mb-4">
                <div className="w-[120px] md:w-40"></div>
                <div className="flex-1 pl-8 grid grid-cols-7 gap-2">
                  {["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(
                    (month, index) => (
                      <div key={month} className="flex flex-col items-center">
                        <div className="flex items-center mb-1">
                          <svg
                            className="w-5 h-5 mr-2 text-slate-400"
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
                            className="text-xs md:text-sm text-slate-500 font-semibold tracking-wide"
                            aria-label={`Month: ${month} 2025`}
                          >
                            {month}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-slate-200 rounded-full"></div>
                      </div>
                    )
                  )}
                </div>
              </div>
              {/* Roadmap Items */}
              <div className="space-y-2">
                {[
                  {
                    label: "Sales Phase",
                    start: 0,
                    span: 2,
                    color: "bg-gradient-to-r from-emerald-200 to-emerald-300",
                    status: "Completed (1 Jun - 30 Jul)",
                    icon: (
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ),
                    text: "text-slate-800",
                    desc: "Initial resource gathering,<br>demos,<br>and onboarding of early contracts.",
                    ariaDesc: "Sales Phase: Initial resource gathering, demos, and onboarding of early contracts. Completed from June 1 to July 30.",
                  },
                  {
                    label: "Initial Testing",
                    start: 0,
                    span: 2,
                    color: "bg-gradient-to-r from-emerald-400 to-emerald-500",
                    status: "Completed (25 Jun - 30 Jul)",
                    icon: (
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ),
                    text: "text-white",
                    desc: "Alpha release,<br>core feature validation,<br>and bug fixes.",
                    ariaDesc: "Initial Testing: Alpha release, core feature validation, and bug fixes. Completed from June 25 to July 30.",
                  },
                  {
                    label: "Learning & Development",
                    start: 1,
                    span: 3,
                    color: "bg-gradient-to-r from-emerald-300 to-emerald-400",
                    status: "Completed (15 Jul - 30 Sep)",
                    icon: (
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ),
                    text: "text-slate-800",
                    desc: "Training Scheduler,<br>trainer management,<br>and invoice generation.",
                    ariaDesc: "Learning & Development: Training Scheduler, trainer management, and invoice generation. Completed from July 15 to September 30.",
                  },
                  {
                    label: "Comprehensive Testing (L&D)",
                    start: 3,
                    span: 2,
                    color: "bg-gradient-to-r from-emerald-200 to-emerald-300",
                    status: "Completed (1 Sep - 30 Oct)",
                    icon: (
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ),
                    text: "text-slate-800",
                    desc: "Comprehensive QA and fine-tuning processes.<br>Optimization and scalability.",
                    ariaDesc: "Comprehensive Testing (L&D): Comprehensive QA and fine-tuning processes. Optimization and scalability. Completed from September 1 to October 30.",
                  },
                  {
                    label: "HR",
                    start: 3,
                    span: 2,
                    color: "bg-gradient-to-r from-emerald-400 to-emerald-500",
                    status: "Completed (15 Sep - 30 Oct)",
                    icon: (
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ),
                    text: "text-white",
                    desc: "Trainer bill management and contract invoice processing.<br>Purchase order processing.",
                    ariaDesc: "HR: Trainer bill management and contract invoice processing. Purchase order processing. Completed from September 1 to October 30.",
                  },
                  {
                    label: "Placement Phase",
                    start: 4,
                    span: 3,
                    color: "bg-gradient-to-r from-emerald-50 to-emerald-100",
                    status: "Completed (10 Oct - 25 Dec)",
                    icon: (
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ),
                    text: "text-slate-800",
                    desc: "Student placements with companies,<br>interviews,<br>and onboarding support.",
                    ariaDesc: "Placement Phase: Student placements with companies, interviews, and onboarding support. Completed from October 10 to December 25.",
                  },
                  {
                    label: "Digital Marketing",
                    start: 6,
                    span: 1,
                    color: "bg-gradient-to-r from-emerald-400 to-emerald-500",
                    status: "Completed (15 Dec - 27 Dec)",
                    icon: (
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ),
                    text: "text-white",
                    desc: "Launch of task tracking system,<br>analytics,<br>and reporting.",
                    ariaDesc: "Digital Marketing: Launch of task tracking system, analytics, and reporting. Completed from December 15 to December 27.",
                  },
                ].map((item, idx, arr) => (
                  <React.Fragment key={item.label}>
                    <div className="flex items-center group" role="row">
                      <div className="w-[140px] md:w-[180px] flex-1 md:flex-none flex flex-col pr-4">
                        <span className="text-sm md:text-base font-semibold text-slate-800 flex items-center mb-1">
                          {item.label}
                        </span>
                        <span
                          className="text-xs text-slate-500 font-normal leading-tight hidden md:block"
                          dangerouslySetInnerHTML={{ __html: item.desc }}
                        ></span>
                      </div>
                      <div className="flex-1 pl-8 grid grid-cols-7 gap-2" role="grid">
                        {[...Array(item.start)].map((_, idx) => (
                          <div key={idx} className="h-8"></div>
                        ))}
                        <div
                          className={`col-span-${item.span} ${item.color} rounded-xl h-8 md:h-10 flex items-center justify-center px-2 shadow-lg transition-all duration-300 ${item.text} font-semibold text-xs md:text-sm focus:outline-none focus:ring-4 focus:ring-indigo-300 hover:shadow-xl hover:scale-105 cursor-pointer ${item.label === "Initial Testing" || item.label === "HR" ? "ml-16" : ""}`}
                          tabIndex={0}
                          aria-label={item.ariaDesc}
                          role="gridcell"
                        >
                          <span className="sr-only md:not-sr-only truncate">
                            {item.status}
                          </span>
                        </div>
                        {[...Array(7 - item.start - item.span)].map(
                          (_, idx) => (
                            <div key={idx} className="h-8"></div>
                          )
                        )}
                      </div>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="border-t border-dashed border-slate-300 my-2"></div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              {/* Footer Note */}
              <div className="border-t border-dashed border-slate-300 mt-2 pt-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">
                      Note:
                    </span>{" "}
                    Timeline and milestones are subject to change based on
                    user feedback and technical discoveries.
                  </div>
                  <div className="text-xs text-slate-400">
                    Last updated: January 10, 2026
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Roadmap;
