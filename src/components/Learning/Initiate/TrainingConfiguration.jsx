import React, { useState, useRef, useEffect } from 'react';

// Helper functions for time calculations
function toMin(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fmt(mins) {
  if (mins == null) return '--';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Helper to generate time options in chronological order (30-minute intervals)
function generateTimeOptions(step = 30) {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      opts.push(`${hh}:${mm}`);
    }
  }
  return opts;
}

function formatTime12(hhmm) {
  if (!hhmm) return '';
  const [hStr, m] = hhmm.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12; // Midnight / Noon edge
  return `${h}:${m} ${suffix}`;
}

// Generate time options for all fields (same chronological order)
const TIME_OPTIONS = generateTimeOptions(30);

const timeOptions = TIME_OPTIONS.map(t => ({ value: t, label: formatTime12(t) }));

function TrainingConfiguration({
  commonFields,
  setCommonFields,
  selectedPhases,
  phase2Dates,
  phase3Dates,
  setPhase2Dates,
  setPhase3Dates,
  getMainPhase,
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const startRef = useRef();
  const endRef = useRef();
  const lunchStartRef = useRef();
  const lunchEndRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const scrollToSelected = (ref, selectedValue) => {
    if (ref.current && selectedValue) {
      const selectedOption = ref.current.querySelector(`[data-value="${selectedValue}"]`);
      if (selectedOption) {
        selectedOption.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="pb-2 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">
          Training Configuration
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Set up the basic timing and schedule configuration for the training.
        </p>
      </div>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:flex-1">
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              College Start Time
            </label>
            <div className="relative dropdown-container">
              <div
                onClick={() => {
                  const newOpen = openDropdown === 'start' ? null : 'start';
                  setOpenDropdown(newOpen);
                  if (newOpen) setTimeout(() => scrollToSelected(startRef, commonFields.collegeStartTime || '09:00'), 0);
                }}
                className="w-full h-9 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs px-3 bg-white shadow-sm hover:border-gray-400 transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>{commonFields.collegeStartTime ? formatTime12(commonFields.collegeStartTime) : 'Select time'}</span>
                <span className="text-gray-500">{openDropdown === 'start' ? '▲' : '▼'}</span>
              </div>
              {openDropdown === 'start' && (
                <div ref={startRef} className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {timeOptions.map((opt) => (
                    <div
                      key={opt.value}
                      data-value={opt.value}
                      onClick={() => {
                        setCommonFields({ ...commonFields, collegeStartTime: opt.value });
                        setOpenDropdown(null);
                      }}
                      className={`px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs ${
                        opt.value === commonFields.collegeStartTime ? 'bg-blue-100 text-blue-800' : ''
                      }`}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              College End Time
            </label>
            <div className="relative dropdown-container">
              <div
                onClick={() => {
                  const newOpen = openDropdown === 'end' ? null : 'end';
                  setOpenDropdown(newOpen);
                  if (newOpen) setTimeout(() => scrollToSelected(endRef, commonFields.collegeEndTime || '17:00'), 0);
                }}
                className="w-full h-9 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs px-3 bg-white shadow-sm hover:border-gray-400 transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>{commonFields.collegeEndTime ? formatTime12(commonFields.collegeEndTime) : 'Select time'}</span>
                <span className="text-gray-500">{openDropdown === 'end' ? '▲' : '▼'}</span>
              </div>
              {openDropdown === 'end' && (
                <div ref={endRef} className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {timeOptions.map((opt) => (
                    <div
                      key={opt.value}
                      data-value={opt.value}
                      onClick={() => {
                        setCommonFields({ ...commonFields, collegeEndTime: opt.value });
                        setOpenDropdown(null);
                      }}
                      className={`px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs ${
                        opt.value === commonFields.collegeEndTime ? 'bg-blue-100 text-blue-800' : ''
                      }`}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Lunch Start Time
            </label>
            <div className="relative dropdown-container">
              <div
                onClick={() => {
                  const newOpen = openDropdown === 'lunchStart' ? null : 'lunchStart';
                  setOpenDropdown(newOpen);
                  if (newOpen) setTimeout(() => scrollToSelected(lunchStartRef, commonFields.lunchStartTime || '13:00'), 0);
                }}
                className="w-full h-9 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs px-3 bg-white shadow-sm hover:border-gray-400 transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>{commonFields.lunchStartTime ? formatTime12(commonFields.lunchStartTime) : 'Select time'}</span>
                <span className="text-gray-500">{openDropdown === 'lunchStart' ? '▲' : '▼'}</span>
              </div>
              {openDropdown === 'lunchStart' && (
                <div ref={lunchStartRef} className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {timeOptions.map((opt) => (
                    <div
                      key={opt.value}
                      data-value={opt.value}
                      onClick={() => {
                        setCommonFields({ ...commonFields, lunchStartTime: opt.value });
                        setOpenDropdown(null);
                      }}
                      className={`px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs ${
                        opt.value === commonFields.lunchStartTime ? 'bg-blue-100 text-blue-800' : ''
                      }`}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Lunch End Time
            </label>
            <div className="relative dropdown-container">
              <div
                onClick={() => {
                  const newOpen = openDropdown === 'lunchEnd' ? null : 'lunchEnd';
                  setOpenDropdown(newOpen);
                  if (newOpen) setTimeout(() => scrollToSelected(lunchEndRef, commonFields.lunchEndTime || '14:00'), 0);
                }}
                className="w-full h-9 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs px-3 bg-white shadow-sm hover:border-gray-400 transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>{commonFields.lunchEndTime ? formatTime12(commonFields.lunchEndTime) : 'Select time'}</span>
                <span className="text-gray-500">{openDropdown === 'lunchEnd' ? '▲' : '▼'}</span>
              </div>
              {openDropdown === 'lunchEnd' && (
                <div ref={lunchEndRef} className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {timeOptions.map((opt) => (
                    <div
                      key={opt.value}
                      data-value={opt.value}
                      onClick={() => {
                        setCommonFields({ ...commonFields, lunchEndTime: opt.value });
                        setOpenDropdown(null);
                      }}
                      className={`px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs ${
                        opt.value === commonFields.lunchEndTime ? 'bg-blue-100 text-blue-800' : ''
                      }`}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Inline summary */}
        {(() => {
          const s = toMin(commonFields.collegeStartTime);
          const e = toMin(commonFields.collegeEndTime);
          let total = null;
          if (s != null && e != null && e > s) total = e - s;
          const ls = toMin(commonFields.lunchStartTime);
          const le = toMin(commonFields.lunchEndTime);
          let lunch = null;
          if (total != null && ls != null && le != null && le > ls) {
            lunch = le - ls;
          }
          let working = null;
          if (total != null) {
            working = total - (lunch || 0);
          }
          return (
            <div className="lg:w-72 w-full border border-gray-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 shadow-sm">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-md px-2 py-1.5 shadow-sm">
                  <div className="text-xs text-gray-600 font-medium">Total</div>
                  <div className="text-xs font-semibold text-gray-900">{fmt(total)}</div>
                </div>
                <div className="bg-white rounded-md px-2 py-1.5 shadow-sm">
                  <div className="text-xs text-gray-600 font-medium">Lunch</div>
                  <div className="text-xs font-semibold text-orange-600">{fmt(lunch)}</div>
                </div>
                <div className="bg-white rounded-md px-2 py-1.5 shadow-sm">
                  <div className="text-xs text-gray-600 font-medium">Working</div>
                  <div className="text-xs font-bold text-green-600">{fmt(working)}</div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Phase 2 and Phase 3 Dates in Same Row */}
      {(selectedPhases.includes("phase-2") ||
        selectedPhases.includes("phase-3")) &&
        selectedPhases.length > 1 && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Phase 2 Dates */}
            {selectedPhases.includes("phase-2") &&
              getMainPhase() !== "phase-2" && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-900">
                  Phase 2 Dates
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Phase 2 Start Date
                    </label>
                    <input
                      type="date"
                      value={phase2Dates.startDate || ""}
                      onChange={(e) =>
                        setPhase2Dates({
                          ...phase2Dates,
                          startDate: e.target.value,
                        })
                      }
                      className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Phase 2 End Date
                    </label>
                    <input
                      type="date"
                      value={phase2Dates.endDate || ""}
                      onChange={(e) =>
                        setPhase2Dates({
                          ...phase2Dates,
                          endDate: e.target.value,
                        })
                      }
                      className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Phase 3 Dates */}
            {selectedPhases.includes("phase-3") &&
              getMainPhase() !== "phase-3" && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-900">
                  Phase 3 Dates
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Phase 3 Start Date
                    </label>
                    <input
                      type="date"
                      value={phase3Dates?.startDate || ""}
                      onChange={(e) =>
                        setPhase3Dates({
                          ...phase3Dates,
                          startDate: e.target.value,
                        })
                      }
                      className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Phase 3 End Date
                    </label>
                    <input
                      type="date"
                      value={phase3Dates?.endDate || ""}
                      onChange={(e) =>
                        setPhase3Dates({
                          ...phase3Dates,
                          endDate: e.target.value,
                        })
                      }
                      className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Training Dates for JD */}
      {selectedPhases.includes("JD") && getMainPhase() === "JD" && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <h4 className="text-xs font-medium text-gray-900">Training Dates</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Training Start Date
              </label>
              <input
                type="date"
                value={(() => {
                  if (!commonFields.trainingStartDate) return "";
                  if (commonFields.trainingStartDate instanceof Date) {
                    return commonFields.trainingStartDate.toISOString().split('T')[0];
                  }
                  if (typeof commonFields.trainingStartDate === 'string') {
                    // If it's already a date string, return it
                    return commonFields.trainingStartDate;
                  }
                  // Handle Firestore Timestamp
                  if (commonFields.trainingStartDate && typeof commonFields.trainingStartDate.toDate === 'function') {
                    return commonFields.trainingStartDate.toDate().toISOString().split('T')[0];
                  }
                  return "";
                })()}
                onChange={(e) => setCommonFields({ ...commonFields, trainingStartDate: e.target.value ? new Date(e.target.value) : null })}
                className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Training End Date
              </label>
              <input
                type="date"
                value={(() => {
                  if (!commonFields.trainingEndDate) return "";
                  if (commonFields.trainingEndDate instanceof Date) {
                    return commonFields.trainingEndDate.toISOString().split('T')[0];
                  }
                  if (typeof commonFields.trainingEndDate === 'string') {
                    // If it's already a date string, return it
                    return commonFields.trainingEndDate;
                  }
                  // Handle Firestore Timestamp
                  if (commonFields.trainingEndDate && typeof commonFields.trainingEndDate.toDate === 'function') {
                    return commonFields.trainingEndDate.toDate().toISOString().split('T')[0];
                  }
                  return "";
                })()}
                onChange={(e) => setCommonFields({ ...commonFields, trainingEndDate: e.target.value ? new Date(e.target.value) : null })}
                className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default TrainingConfiguration;
