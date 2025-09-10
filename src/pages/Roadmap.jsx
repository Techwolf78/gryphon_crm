import React from "react";
import { useNavigate } from "react-router-dom";

const Roadmap = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="mx-auto">
        <div className="">
          {/* <button
            onClick={() => navigate("/dashboard/marketing")}
            className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Marketing
          </button> */}
        </div>

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
                  Transparent milestones, clear progress, and what's next.
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
            <div className="px-4 py-2">
              {/* Months Header */}
              <div className="flex items-center mb-2">
                <div className="min-w-[120px] md:min-w-[180px]"></div>
                <div className="flex-1 pl-12 grid grid-cols-6 gap-2">
                  {["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map(
                    (m) => (
                      <div key={m} className="flex flex-col items-center">
                        <div className="flex items-center">
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
                    color: "bg-green-500",
                    status: "Completed (1 Jun-30 Jul)",
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
                    start: 0,
                    span: 2,
                    color: "bg-green-400",
                    status: "Completed (1 Jul-30 Jul)",
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
                    start: 1,
                    span: 3,
                    color: "bg-amber-400",
                    status: "In Progress (15 Jul-30 Sep)",
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
                    start: 2,
                    span: 2,
                    color: "bg-gray-400",
                    status: "Pending (1 Sep-30 Sep)",
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
                    start: 3,
                    span: 2,
                    color: "bg-gray-200",
                    status: "Pending (20 Sep-25 Oct)",
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
                    start: 4,
                    span: 2,
                    color: "bg-gray-500",
                    status: "Pending (25 Oct-15 Nov)",
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
                      <div className="flex-1 pl-12 grid grid-cols-6 gap-2">
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
                        {[...Array(6 - row.start - row.span)].map(
                          (_, idx) => (
                            <div key={idx}></div>
                          )
                        )}
                      </div>
                    </div>
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
    </div>
  );
};

export default Roadmap;
