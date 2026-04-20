import { useState, useCallback } from "react";
import { exportPurchaseOrderToPDF } from "./utils/exportPOtoPDF"; // Make sure this path is correct
import { exportCsddPurchaseOrderToPDF } from "./utils/exportCsddPOtoPDF";
import ViewPurchaseOrderModal from "./ViewPurchaseOrderModal";

const PurchaseOrdersList = ({
  orders,
  budgetComponents,
  componentColors,
  filters,
  onFiltersChange,
  vendors,
  getComponentsForItem,
  showDepartment = false,
  onUpdatePurchaseOrder,
  onRejectOrder,
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [viewModal, setViewModal] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [rejectConfirm, setRejectConfirm] = useState(null);
  const [rejectingOrderId, setRejectingOrderId] = useState(null);

  // Helper function to get vendor details by ID
  const getVendorDetails = (vendorId) => {
    if (!vendorId || !vendors || !Array.isArray(vendors)) return null;
    return vendors.find((vendor) => vendor.id === vendorId) || null;
  };

  // Get vendor name for display
  const getVendorName = (order) => {
    if (order.vendorName) return order.vendorName;
    if (order.vendorId) {
      const vendor = getVendorDetails(order.vendorId);
      return vendor?.businessName || vendor?.name || "N/A";
    }
    return "N/A";
  };

  // Get vendor contact for display
  const getVendorContact = (order) => {
    if (order.vendorContact) return order.vendorContact;
    if (order.vendorId) {
      const vendor = getVendorDetails(order.vendorId);
      return vendor?.contactPerson || "N/A";
    }
    return "N/A";
  };

  // Get vendor email for display
  const getVendorEmail = (order) => {
    if (order.vendorEmail) return order.vendorEmail;
    if (order.vendorId) {
      const vendor = getVendorDetails(order.vendorId);
      return vendor?.email || "N/A";
    }
    return "N/A";
  };

  // Get vendor phone for display
  const getVendorPhone = (order) => {
    if (order.vendorPhone) return order.vendorPhone;
    if (order.vendorId) {
      const vendor = getVendorDetails(order.vendorId);
      return vendor?.phone || "N/A";
    }
    return "N/A";
  };

  // Get vendor address for display
  const getVendorAddress = (order) => {
    if (order.vendorId) {
      const vendor = getVendorDetails(order.vendorId);
      if (vendor?.address) {
        const addr = vendor.address;
        const parts = [];
        if (addr.street) parts.push(addr.street);
        return parts.join(", ");
      }
    }
    return "N/A";
  };

  // Helper function to convert Firestore timestamp to Date
  const convertTimestamp = (timestamp) => {
    if (!timestamp) return null;

    // If it's a Firestore timestamp object
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }

    // If it's a regular timestamp (milliseconds)
    if (typeof timestamp === "number") {
      return new Date(timestamp);
    }

    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }

    // If it's a string, try to parse it
    if (typeof timestamp === "string") {
      return new Date(timestamp);
    }

    return null;
  };

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleDropdown = (orderId) => {
    setActiveDropdown(activeDropdown === orderId ? null : orderId);
  };

  const handleClickOutside = () => {
    setActiveDropdown(null);
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (sortConfig.key === "finalPrice") {
      return sortConfig.direction === "asc"
        ? (a.finalPrice || 0) - (b.finalPrice || 0)
        : (b.finalPrice || 0) - (a.finalPrice || 0);
    }
    if (sortConfig.key === "createdAt") {
      const dateA = convertTimestamp(a.createdAt)?.getTime() || 0;
      const dateB = convertTimestamp(b.createdAt)?.getTime() || 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  const getStatusColor = (status) => {
    const colors = {
      approved: "bg-green-100 text-green-800 border-green-200",
      completed: "bg-blue-100 text-blue-800 border-blue-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatDate = (timestamp) => {
    const date = convertTimestamp(timestamp);
    if (!date) return "N/A";
    return date.toLocaleDateString("en-IN");
  };

  const getSavings = (order) => {
    if (!order.finalAmount || !order.estimatedTotal) return 0;
    return order.estimatedTotal - order.finalAmount;
  };

  const handleExport = (order) => {
    const vendorData = {
      name: getVendorName(order),
      contact: getVendorContact(order),
      email: getVendorEmail(order),
      phone: getVendorPhone(order),
      address: getVendorAddress(order),
    };

    // Use CSDD-specific export for CSDD POs (includes client budget sheet)
    if (order.intentType === "csdd") {
      exportCsddPurchaseOrderToPDF(order, vendorData);
    } else {
      exportPurchaseOrderToPDF(
        order,
        vendorData,
        budgetComponents,
        getComponentsForItem,
      );
    }
  };

  const handleRejectClick = useCallback((order) => {
    setRejectConfirm(order);
    setActiveDropdown(null);
  }, []);

  const confirmReject = useCallback(async () => {
    if (!rejectConfirm || !onRejectOrder) return;
    setRejectingOrderId(rejectConfirm.id);
    try {
      await onRejectOrder(rejectConfirm);
    } finally {
      setRejectingOrderId(null);
      setRejectConfirm(null);
    }
  }, [rejectConfirm, onRejectOrder]);

  return (
    <div className="space-y-4" onClick={handleClickOutside}>
      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                onFiltersChange({ ...filters, status: e.target.value })
              }
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs bg-white"
            >
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Component Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Component
            </label>
            <select
              value={filters.component}
              onChange={(e) =>
                onFiltersChange({ ...filters, component: e.target.value })
              }
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs bg-white"
            >
              <option value="">All Components</option>
              {Object.entries(budgetComponents).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* From Date Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
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
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs bg-white"
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-600">
          Showing {sortedOrders.length} purchase order
          {sortedOrders.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-gray-200 rounded-lg text-sm">
        <div className="">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {showDepartment && (
                  <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                )}
                <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Component
                </th>
                <th
                  className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("finalPrice")}
                >
                  <div className="flex items-center">
                    Final Price
                    {sortConfig.key === "finalPrice" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Savings
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
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
                <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedOrders.map((order) => {
                const savings = getSavings(order);
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    {showDepartment && (
                      <td className="p-2 whitespace-nowrap text-xs text-gray-900">
                        {order.department?.toUpperCase() || "Unknown"}
                      </td>
                    )}
                    <td className="p-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.poNumber ||
                          `PO-${order.id?.slice(-6).toUpperCase()}`}
                      </div>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          componentColors[order.budgetComponent] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {budgetComponents[order.budgetComponent] ||
                          order.budgetComponent}
                      </span>
                    </td>
                    <td className="p-2 whitespace-nowrap text-sm text-gray-900">
                      ₹{order.finalAmount?.toLocaleString("en-In") || "0"}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {savings > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          +₹{savings.toLocaleString("en-In")}
                        </span>
                      ) : savings < 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          -₹{Math.abs(savings).toLocaleString("en-In")}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap text-sm text-gray-900">
                      {getVendorName(order)}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          order.status,
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="p-2 whitespace-nowrap text-xs text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="p-2 whitespace-nowrap text-xs font-medium relative">
                      {/* 3-dot Dropdown Menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown(order.id);
                          }}
                          className="flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          <svg
                            className="w-4 h-4"
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
                        {activeDropdown === order.id && (
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10 text-xs">
                            <div className="py-1">
                              {/* View Action */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewModal(order);
                                }}
                                className="flex items-center w-full px-3 py-1.5 text-gray-700 hover:bg-gray-100"
                              >
                                <svg
                                  className="w-3.5 h-3.5 mr-2"
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

                              {/* Export Action */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExport(order);
                                }}
                                className="flex items-center w-full px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
                              >
                                <svg
                                  className="w-3.5 h-3.5 mr-2"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                Export To PDF
                              </button>

                              {/* Reject Action — only for approved orders */}
                              {order.status === "approved" && onRejectOrder && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRejectClick(order);
                                  }}
                                  disabled={rejectingOrderId === order.id}
                                  className="flex items-center w-full px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  <svg
                                    className="w-3.5 h-3.5 mr-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                    />
                                  </svg>
                                  Reject PO
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedOrders.length === 0 && (
          <div className="text-center py-8">
            <svg
              className="w-10 h-10 text-gray-400 mx-auto mb-3"
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
            <p className="text-gray-500 text-base">No purchase orders found</p>
            <p className="text-gray-400 mt-1.5 text-xs">
              Purchase orders will appear here once created
            </p>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {viewModal && (
        <ViewPurchaseOrderModal
          show={!!viewModal}
          onClose={() => setViewModal(null)}
          order={viewModal}
          vendors={vendors}
          budgetComponents={budgetComponents}
          componentColors={componentColors}
          getComponentsForItem={getComponentsForItem}
          onExport={handleExport}
          onUpdate={onUpdatePurchaseOrder}
          vendorData={{
            name: getVendorName(viewModal),
            contact: getVendorContact(viewModal),
            email: getVendorEmail(viewModal),
            phone: getVendorPhone(viewModal),
          }}
        />
      )}

      {/* Reject Confirmation Modal */}
      {rejectConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50 text-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4">
              <div className="flex items-center justify-center w-10 h-10 mx-auto bg-red-100 rounded-full mb-3">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 text-center mb-1.5">
                Reject Purchase Order?
              </h3>
              <p className="text-gray-600 text-center mb-1 text-sm">
                Are you sure you want to reject{" "}
                <strong>{rejectConfirm.poNumber}</strong>?
              </p>
              <p className="text-gray-500 text-center mb-4 text-xs">
                This will reverse the spent amount (₹
                {(rejectConfirm.finalAmount || rejectConfirm.totalCost || 0).toLocaleString("en-IN")}
                ) from the department budget and reset the linked purchase intent.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setRejectConfirm(null)}
                  disabled={rejectingOrderId === rejectConfirm.id}
                  className="flex-1 px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  disabled={rejectingOrderId === rejectConfirm.id}
                  className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center text-sm"
                >
                  {rejectingOrderId === rejectConfirm.id ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white"
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
                      Rejecting...
                    </>
                  ) : (
                    "Reject PO"
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

export default PurchaseOrdersList;
