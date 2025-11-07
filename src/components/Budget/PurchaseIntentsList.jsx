import { useState } from "react";

const PurchaseIntentsList = ({
  intents,
  budgetComponents,
  componentColors,
  onCreatePurchaseOrder,
  onDeleteIntent,
  filters,
  onFiltersChange,
  currentUser,
  userDepartment,
  getComponentsForItem,
  showDepartment = false,
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [viewModal, setViewModal] = useState(null);

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Add this function to get the component name for any intent
  const getComponentName = (intent) => {
    // Safely get the component key from intent
    const componentKey =
      intent?.selectedBudgetComponent || intent?.budgetComponent;

    if (!componentKey) {
      return "Unknown Component";
    }

    if (getComponentsForItem) {
      // Use the provided function to get department-specific components
      try {
        const deptComponents = getComponentsForItem(intent);
        return deptComponents?.[componentKey] || componentKey;
      } catch (error) {
        console.error("Error getting department components:", error);
        return componentKey;
      }
    }

    // Fallback to current department's components
    if (budgetComponents && typeof budgetComponents === "object") {
      return budgetComponents[componentKey] || componentKey;
    }
    return componentKey;
  };

  // Add this function to get component color
  const getComponentColor = (intent) => {
    const componentKey =
      intent?.selectedBudgetComponent || intent?.budgetComponent;

    if (!componentKey) {
      return "bg-gray-100 text-gray-800 border-gray-200";
    }

    return (
      componentColors?.[componentKey] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  const handleDelete = async (intentId) => {
    setDeletingId(intentId);
    try {
      await onDeleteIntent(intentId);
      setDeleteConfirm(null);
      setActiveDropdown(null);
    } catch (error) {
      console.error("Error deleting intent:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreatePO = (intent) => {
    onCreatePurchaseOrder(intent);
    setActiveDropdown(null);
  };

  const toggleDropdown = (intentId) => {
    setActiveDropdown(activeDropdown === intentId ? null : intentId);
  };

  const handleClickOutside = () => {
    setActiveDropdown(null);
  };

  const sortedIntents = [...intents].sort((a, b) => {
    if (sortConfig.key === "title") {
      return sortConfig.direction === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    }
    if (sortConfig.key === "estimatedTotal") {
      // Updated field name
      return sortConfig.direction === "asc"
        ? (a.estimatedTotal || 0) - (b.estimatedTotal || 0)
        : (b.estimatedTotal || 0) - (a.estimatedTotal || 0);
    }
    if (sortConfig.key === "createdAt") {
      return sortConfig.direction === "asc"
        ? (a.createdAt || 0) - (b.createdAt || 0)
        : (b.createdAt || 0) - (a.createdAt || 0);
    }
    return 0;
  });

  const getStatusColor = (status) => {
    const colors = {
      submitted: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-blue-100 text-blue-800 border-blue-200",
      po_created: "bg-purple-100 text-purple-800 border-purple-200",
      pending_hr_confirmation:
        "bg-orange-100 text-orange-800 border-orange-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Check if current user is from purchase department
  const isPurchaseDepartment = ["purchase", "admin", "hr"].includes(
    userDepartment?.toLowerCase()
  );

  const canCreatePO = (intent) => {
    return intent.status === "submitted" && isPurchaseDepartment && currentUser;
  };

  const canDelete = (intent) => {
    if (!currentUser) return false;
    const isCreator = intent.createdBy === currentUser.uid;
    const isAdmin = userDepartment?.toLowerCase() === "admin";
    return (
      (intent.status === "submitted" || intent.status === "rejected") &&
      (isCreator || isAdmin)
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";

    // Handle both timestamp objects and milliseconds
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "N/A";

    // Handle both timestamp objects and milliseconds
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate total items count and total estimated amount
  const getItemsSummary = (intent) => {
    if (intent.requestedItems && intent.requestedItems.length > 0) {
      const totalItems = intent.requestedItems.length;
      const totalQty = intent.requestedItems.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      );
      return `${totalItems} item${
        totalItems !== 1 ? "s" : ""
      } • ${totalQty} unit${totalQty !== 1 ? "s" : ""}`;
    }
    return "No items";
  };

  return (
    <div className="space-y-6" onClick={handleClickOutside}>
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                onFiltersChange({ ...filters, status: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="po_created">PO Created</option>
              <option value="pending_hr_confirmation">Pending HR</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Component
            </label>
            <select
              value={filters.component}
              onChange={(e) =>
                onFiltersChange({ ...filters, component: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Components</option>
              {getComponentsForItem
                ? // For multiple departments, show unique components from all intents
                  [
                    ...new Set(
                      intents
                        .map(
                          (intent) =>
                            intent.selectedBudgetComponent ||
                            intent.budgetComponent
                        )
                        .filter(Boolean)
                    ),
                  ].map((componentKey) => (
                    <option key={componentKey} value={componentKey}>
                      {getComponentName({
                        selectedBudgetComponent: componentKey,
                        budgetComponent: componentKey,
                      })}
                    </option>
                  ))
                : // For single department, show from budgetComponents
                  Object.entries(budgetComponents).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  dateRange: { ...filters.dateRange, start: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  dateRange: { ...filters.dateRange, end: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {sortedIntents.length} purchase intent
          {sortedIntents.length !== 1 ? "s" : ""}
        </p>
        {isPurchaseDepartment && (
          <p className="text-sm text-blue-600 font-medium">
            Purchase Department - Can Create Purchase Orders
          </p>
        )}
      </div>

      {/* Intents Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {showDepartment && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                )}
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("title")}
                >
                  <div className="flex items-center">
                    Title & Details
                    {sortConfig.key === "title" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Component
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("estimatedTotal")}
                >
                  <div className="flex items-center">
                    Amount
                    {sortConfig.key === "estimatedTotal" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="flex items-center">
                    Created
                    {sortConfig.key === "createdAt" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedIntents.map((intent) => (
                <tr key={intent.id} className="hover:bg-gray-50">
                  {showDepartment && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {intent.department.toUpperCase() || "Unknown"}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {intent.title}
                      </div>
                      <div className="text-sm text-gray-500 max-w-xs">
                        {intent.description}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {getItemsSummary(intent)}
                      </div>
                      {intent.requiredBy && (
                        <div className="text-xs text-gray-500 mt-1">
                          Required by: {formatDate(intent.requiredBy)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getComponentColor(
                        intent
                      )}`}
                    >
                      {getComponentName(intent)} {/* ✅ NEW WAY */}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹
                    {intent.estimatedTotal?.toLocaleString("en-In") ||
                      intent.totalEstimate?.toLocaleString("en-In")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        intent.status
                      )}`}
                    >
                      {intent.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(intent.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium relative">
                    {/* 3-dot Dropdown Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDropdown(intent.id);
                        }}
                        className="flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                          />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {activeDropdown === intent.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <div className="py-1">
                            {/* View Action - Always Available */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewModal(intent);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              View Details
                            </button>

                            {/* Create PO Action - Only for Purchase Department */}
                            {canCreatePO(intent) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreatePO(intent);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                              >
                                <svg
                                  className="w-4 h-4 mr-2"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                Create PO
                              </button>
                            )}

                            {/* Delete Action */}
                            {canDelete(intent) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm(intent.id);
                                }}
                                disabled={deletingId === intent.id}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg
                                  className="w-4 h-4 mr-2"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                {deletingId === intent.id
                                  ? "Rejecting..."
                                  : "Reject"}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedIntents.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-500 text-lg">No purchase intents found</p>
            <p className="text-gray-400 mt-2">
              {isPurchaseDepartment
                ? "Purchase intents from other departments will appear here for PO creation"
                : "Create your first purchase intent to get started"}
            </p>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-1000">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.15)] w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center px-6 py-4 shadow-sm">
              <h2 className="text-xl font-bold tracking-wide">
                Purchase Intent Details
              </h2>
              <button
                onClick={() => setViewModal(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-white"
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

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-8">
              {/* Basic + Financial Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-1">
                    Basic Information
                  </h3>
                  <dl className="space-y-3 text-sm">
                    {showDepartment && (
                      <div>
                        <dt className="font-medium text-gray-500">
                          Department
                        </dt>
                        <dd className="text-gray-900">
                          {viewModal.department?.toUpperCase() || "Unknown"}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="font-medium text-gray-500">Title</dt>
                      <dd className="text-gray-900 font-medium">
                        {viewModal.title}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Description</dt>
                      <dd className="text-gray-800">
                        {viewModal.description || "N/A"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">
                        Budget Component
                      </dt>
                      <dd className="text-gray-900">
                        {getComponentName(viewModal)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Financial Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-1">
                    Financial Details
                  </h3>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">
                        Total Estimate
                      </dt>
                      <dd className="text-gray-900 font-semibold">
                        ₹
                        {viewModal.estimatedTotal?.toLocaleString("en-IN") ||
                          viewModal.totalEstimate?.toLocaleString("en-IN")}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Status</dt>
                      <dd>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(
                            viewModal.status
                          )}`}
                        >
                          {viewModal.status.replace(/_/g, " ")}
                        </span>
                      </dd>
                    </div>
                    {viewModal.requiredBy && (
                      <div>
                        <dt className="font-medium text-gray-500">
                          Required By
                        </dt>
                        <dd className="text-gray-900">
                          {formatDate(viewModal.requiredBy)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* Requested Items */}
              {viewModal.requestedItems?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-1">
                    Requested Items ({viewModal.requestedItems.length})
                  </h3>
                  <div className="space-y-3">
                    {viewModal.requestedItems.map((item, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-500">
                              Category:
                            </span>
                            <div className="text-gray-900">{item.category}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">
                              Description:
                            </span>
                            <div className="text-gray-900">
                              {item.description}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">
                              Qty × Price:
                            </span>
                            <div className="text-gray-900">
                              {item.quantity} × ₹
                              {item.estPricePerUnit?.toLocaleString("en-IN")}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">
                              Total:
                            </span>
                            <div className="text-gray-900 font-semibold">
                              ₹{item.estTotal?.toLocaleString("en-IN")}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-1">
                  Timeline
                </h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="font-medium text-gray-500">Created</dt>
                    <dd className="text-gray-900">
                      {formatDateTime(viewModal.createdAt)}
                    </dd>
                  </div>
                  {viewModal.approvedAt && (
                    <div>
                      <dt className="font-medium text-gray-500">Approved</dt>
                      <dd className="text-gray-900">
                        {formatDateTime(viewModal.approvedAt)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Purchase Department Action */}
              {isPurchaseDepartment && viewModal.status === "submitted" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Purchase Department Action
                  </h3>
                  <p className="text-blue-700 mb-4 text-sm">
                    You can create a Purchase Order for this intent. This will
                    automatically approve the intent.
                  </p>
                  <button
                    onClick={() => {
                      handleCreatePO(viewModal);
                      setViewModal(null);
                    }}
                    className="
                px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold
                shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,0,0,0.2)]
                hover:bg-emerald-700
                active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_2px_rgba(255,255,255,0.3)]
                active:translate-y-[0.5px]
                transition-all duration-150 ease-in-out
              "
                  >
                    Create Purchase Order
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setViewModal(null)}
                className="
            px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium
            shadow-[inset_0_-1px_2px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.6)]
            hover:bg-gray-50
            active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25),inset_0_-1px_1px_rgba(255,255,255,0.5)]
            active:translate-y-[0.5px]
            transition-all duration-150 ease-in-out
          "
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Purchase Intent?
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete this purchase intent? This
                action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deletingId}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deletingId}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center"
                >
                  {deletingId ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseIntentsList;
