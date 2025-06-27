
const statusColorMap = {
  hot: {
    border: "border-red-500",
    bg: "bg-red-50",
    text: "text-red-600",
    badge: "bg-red-100 text-red-800",
  },
  warm: {
    border: "border-amber-400",
    bg: "bg-amber-50",
    text: "text-amber-600",
    badge: "bg-amber-100 text-amber-800",
  },
  cold: {
    border: "border-cyan-400",
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    badge: "bg-cyan-100 text-cyan-800",
  },
  closed: {
    border: "border-green-500",
    bg: "bg-green-50",
    text: "text-green-600",
    badge: "bg-green-100 text-green-800",
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-52 animate-fadeIn">
      <div
        className={`relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto ${statusColors.border} border-l-8`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`sticky top-0 ${statusColors.bg} p-6 rounded-t-xl flex justify-between items-center`}
        >
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedLead.businessName || "Unnamed Lead"}
            </h2>
            <div className="flex items-center mt-2 space-x-4">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors.badge}`}
              >
                {activeTab.toUpperCase()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
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
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1 */}
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Contact Person
                    </p>
                    <p className="mt-1 text-gray-900">
                      {selectedLead.pocName || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Phone Number
                    </p>
                    <p className="mt-1 text-gray-900">
                      {selectedLead.phoneNo || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Email Address
                    </p>
                    <p className="mt-1 text-gray-900 break-all">
                      {selectedLead.email || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Assigned To
                    </p>
                    <p className="mt-1 text-gray-900">
                      {selectedLead.assignedTo?.uid &&
                      users?.[selectedLead.assignedTo.uid]
                        ? users[selectedLead.assignedTo.uid].name
                        : selectedLead.assignedTo?.name || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Location Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p className="mt-1 text-gray-900">
                      {selectedLead.address || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">City</p>
                    <p className="mt-1 text-gray-900">
                      {selectedLead.city || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">State</p>
                    <p className="mt-1 text-gray-900">
                      {selectedLead.state || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Academic Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Specialization
                    </p>
                    <p className="mt-1 text-gray-900">
                      {selectedLead.specialization || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Course Type
                    </p>
                    <p className="mt-1 text-gray-900">
                      {selectedLead.courseType || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Closure Type
                    </p>
                    <p className="mt-1 text-gray-900">
                      {selectedLead.closureType || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Financial Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Contract Value
                    </p>
                    <p className="mt-1 text-gray-900">
                      {selectedLead.tcv
                        ? `₹${selectedLead.tcv.toLocaleString()}`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Per Student Cost
                    </p>
                    <p className="mt-1 text-gray-900">
                      {selectedLead.perStudentCost
                        ? `₹${selectedLead.perStudentCost.toLocaleString()}`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Student Count
                    </p>
                    <p className="mt-1 text-gray-900">
                      {selectedLead.studentCount || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Timeline
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Opened Date
                    </p>
                    <p className="mt-1 text-gray-900">
                      {formatDate(
                        selectedLead.openedDate || selectedLead.createdAt
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Expected Closure
                    </p>
                    <p className="mt-1 text-gray-900">
                      {formatDate(selectedLead.expectedClosureDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Latest Followup
                    </p>
                    <p className="mt-1 text-gray-900">
                      {getLatestFollowup(selectedLead)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end space-x-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
          <button
            className={`px-6 py-2 rounded-lg text-white ${statusColors.bg.replace(
              "50",
              "600"
            )} hover:${statusColors.bg.replace(
              "50",
              "700"
            )} transition-colors font-medium`}
          >
            Take Action
          </button>
        </div>
      </div>
    </div>
  );
}
