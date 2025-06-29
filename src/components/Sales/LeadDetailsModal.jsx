const statusColorMap = {
  hot: {
    border: "border-red-500",
    bg: "bg-gradient-to-br from-red-50 to-red-100",
    text: "text-red-600",
    badge: "bg-gradient-to-br from-red-100 to-red-200 text-red-800 shadow-red-200",
    accent: "bg-gradient-to-r from-red-400 to-red-600",
    ring: "ring-red-200",
  },
  warm: {
    border: "border-amber-400",
    bg: "bg-gradient-to-br from-amber-50 to-amber-100",
    text: "text-amber-600",
    badge: "bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 shadow-amber-200",
    accent: "bg-gradient-to-r from-amber-400 to-amber-600",
    ring: "ring-amber-200",
  },
  cold: {
    border: "border-cyan-400",
    bg: "bg-gradient-to-br from-cyan-50 to-cyan-100",
    text: "text-cyan-600",
    badge: "bg-gradient-to-br from-cyan-100 to-cyan-200 text-cyan-800 shadow-cyan-200",
    accent: "bg-gradient-to-r from-cyan-400 to-cyan-600",
    ring: "ring-cyan-200",
  },
  closed: {
    border: "border-green-500",
    bg: "bg-gradient-to-br from-green-50 to-green-100",
    text: "text-green-600",
    badge: "bg-gradient-to-br from-green-100 to-green-200 text-green-800 shadow-green-200",
    accent: "bg-gradient-to-r from-green-400 to-green-600",
    ring: "ring-green-200",
  },
};

const formatDate = (ms) =>
  ms
    ? new Date(ms).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";

const getLatestFollowup = (lead) => {
  const followData = lead.followup || {};
  const entries = Object.entries(followData).sort(
    (a, b) => a[1].timestamp - b[1].timestamp
  );
  if (entries.length === 0) return "-";
  const latest = entries[entries.length - 1][1];
  return `${latest.date || "-"} ${latest.time || ""} - ${latest.remarks || ""}`;
};

export default function LeadDetailsModal({
  selectedLead,
  onClose,
  users,
  activeTab,
}) {
  if (!selectedLead) return null;

  const statusColors = statusColorMap[activeTab] || statusColorMap.hot;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-54 animate-fadeIn">
      <div
        className={`relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto border-l-[6px] ${statusColors.border} transition-all duration-300 transform hover:shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with floating effect */}
        <div className={`sticky top-0 ${statusColors.bg} p-6 rounded-t-2xl flex justify-between items-start z-10 backdrop-blur-sm bg-opacity-90`}>
          <div className="flex-1">
            <div className="flex items-start space-x-4">
              <div className={`h-14 w-1.5 rounded-full ${statusColors.accent} mr-3 shadow-md`}></div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 leading-tight tracking-tight">
                  {selectedLead.businessName || "Unnamed Lead"}
                </h2>
                <div className="flex items-center mt-3 space-x-3">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider ${statusColors.badge} shadow-md`}
                  >
                    {activeTab.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600 font-medium">
                    <span className="opacity-70">Created:</span> {formatDate(selectedLead.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-all duration-200 p-1.5 -mt-1.5 -mr-1.5 rounded-full hover:bg-gray-100 active:scale-95"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1 - Contact Information */}
            <div className="space-y-5">
              {/* Contact Card with subtle animation */}
              <div 
                className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-gray-200 ${statusColors.ring} hover:ring-2`}
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${statusColors.accent} mr-2`}></span>
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Contact Information
                  </span>
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider col-span-1">Contact Person</p>
                    <p className="mt-0 text-gray-900 font-medium col-span-3">{selectedLead.pocName || "-"}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider col-span-1">Phone</p>
                    <p className="mt-0 text-gray-900 font-medium col-span-3">
                      {selectedLead.phoneNo ? (
                        <a 
                          href={`tel:${selectedLead.phoneNo}`} 
                          className="hover:text-blue-600 transition-colors flex items-center group"
                        >
                          {selectedLead.phoneNo}
                          <svg className="w-4 h-4 ml-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </a>
                      ) : "-"}
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider col-span-1">Email</p>
                    <p className="mt-0 text-gray-900 font-medium col-span-3 break-all">
                      {selectedLead.email ? (
                        <a 
                          href={`mailto:${selectedLead.email}`} 
                          className="hover:text-blue-600 transition-colors flex items-center group"
                        >
                          {selectedLead.email}
                          <svg className="w-4 h-4 ml-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </a>
                      ) : "-"}
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider col-span-1">Assigned To</p>
                    <p className="mt-0 text-gray-900 font-medium col-span-3">
                      {selectedLead.assignedTo?.uid && users?.[selectedLead.assignedTo.uid]
                        ? (
                          <span className="inline-flex items-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-400 mr-2"></span>
                            {users[selectedLead.assignedTo.uid].name}
                          </span>
                        )
                        : selectedLead.assignedTo?.name || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location Card */}
              <div 
                className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-gray-200 ${statusColors.ring} hover:ring-2`}
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${statusColors.accent} mr-2`}></span>
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location
                  </span>
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider col-span-1">Address</p>
                    <p className="mt-0 text-gray-900 font-medium col-span-3">{selectedLead.address || "-"}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider col-span-1">City/State</p>
                    <div className="col-span-3">
                      <div className="flex space-x-4">
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium">{selectedLead.city || "-"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">City</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium">{selectedLead.state || "-"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">State</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2 - Lead Details */}
            <div className="space-y-5">
              {/* Lead Details Card */}
              <div 
                className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-gray-200 ${statusColors.ring} hover:ring-2`}
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${statusColors.accent} mr-2`}></span>
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Lead Details
                  </span>
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider col-span-1">Specializations</p>
                    <div className="col-span-3">
                      {selectedLead.specializations?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedLead.specializations.map((spec, index) => (
                            <span
                              key={index}
                              className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-900 font-medium">-</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider col-span-1">Education</p>
                    <div className="col-span-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-900 font-medium">{selectedLead.courseType || "-"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Course Type</p>
                        </div>
                        <div>
                          <p className="text-gray-900 font-medium">{selectedLead.passingYear || "-"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Passing Year</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider col-span-1">Accreditation</p>
                    <div className="col-span-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-900 font-medium">{selectedLead.affiliation || "-"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Affiliation</p>
                        </div>
                        <div>
                          <p className="text-gray-900 font-medium">{selectedLead.accreditation || "-"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Accreditation</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Card */}
              <div 
                className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-gray-200 ${statusColors.ring} hover:ring-2`}
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${statusColors.accent} mr-2`}></span>
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Financial Information
                  </span>
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">TCV</p>
                    <p className="mt-1 text-gray-900 font-bold text-lg">
                      {selectedLead.tcv ? (
                        <span className="text-green-600">
                          ₹{selectedLead.tcv.toLocaleString()}
                        </span>
                      ) : "-"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Per Student</p>
                    <p className="mt-1 text-gray-900 font-bold text-lg">
                      {selectedLead.perStudentCost ? (
                        <span className="text-blue-600">
                          ₹{selectedLead.perStudentCost.toLocaleString()}
                        </span>
                      ) : "-"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Students</p>
                    <p className="mt-1 text-gray-900 font-bold text-lg">
                      {selectedLead.studentCount || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline Card */}
              <div 
                className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-gray-200 ${statusColors.ring} hover:ring-2`}
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${statusColors.accent} mr-2`}></span>
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Timeline
                  </span>
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Opened Date</p>
                    <p className="mt-1 text-gray-900 font-medium">
                      {formatDate(selectedLead.openedDate || selectedLead.createdAt)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expected Closure</p>
                    <p className="mt-1 text-gray-900 font-medium">
                      {formatDate(selectedLead.expectedClosureDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Followup Card */}
              <div 
                className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-gray-200 ${statusColors.ring} hover:ring-2`}
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${statusColors.accent} mr-2`}></span>
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Latest Followup
                  </span>
                </h3>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-gray-900 font-medium">
                    {getLatestFollowup(selectedLead)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Action Buttons */}
        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-4 px-6 flex justify-end space-x-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 hover:shadow-sm active:scale-95"
          >
            Close
          </button>
          <button
            className={`px-6 py-2.5 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${statusColors.accent} hover:shadow-lg transition-all duration-200 active:scale-95 shadow-md hover:shadow-${statusColors.text.replace('text-', '')}/20`}
          >
            Take Action
          </button>
          <button
            className={`px-6 py-2.5 rounded-xl border ${statusColors.border} ${statusColors.text} bg-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 hover:bg-opacity-10 ${statusColors.bg.replace('bg-', 'hover:bg-')} transition-all duration-200 active:scale-95`}
          >
            Edit Lead
          </button>
        </div>
      </div>
    </div>
  );
}