import { useState } from "react";
import { exportPurchaseOrderToPDF } from "./utils/exportPOtoPDF"; // Make sure this path is correct

const PurchaseOrdersList = ({
  orders,
  budgetComponents,
  componentColors,
  filters,
  onFiltersChange,
  onExportPurchaseOrder,
  vendors,
  getComponentsForItem,
  showDepartment = false,
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [viewModal, setViewModal] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

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
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatDate = (timestamp) => {
    const date = convertTimestamp(timestamp);
    if (!date) return "N/A";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getSavings = (order) => {
    if (!order.finalPrice || !order.estimatedTotal) return 0;
    return order.estimatedTotal - order.finalPrice;
  };

  const handleExport = (order) => {
    const vendorData = {
      name: getVendorName(order),
      contact: getVendorContact(order),
      email: getVendorEmail(order),
      phone: getVendorPhone(order),
    };

    console.log(vendorData.name);

    exportPurchaseOrderToPDF(
      order,
      vendorData,
      budgetComponents,
      getComponentsForItem
    );
  };

  return (
    <div className="space-y-6" onClick={handleClickOutside}>
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
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
              {Object.entries(budgetComponents).map(([key, label]) => (
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
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {sortedOrders.length} purchase order
          {sortedOrders.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Orders Table */}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Component
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Savings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
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
              {sortedOrders.map((order) => {
                const savings = getSavings(order);
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    {showDepartment && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.department?.toUpperCase() || "Unknown"}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.poNumber ||
                          `PO-${order.id?.slice(-6).toUpperCase()}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          componentColors[order.budgetComponent] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {budgetComponents[order.budgetComponent] ||
                          order.budgetComponent}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{order.finalPrice?.toLocaleString("en-In") || "0"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {savings > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          +₹{savings.toLocaleString("en-In")}
                        </span>
                      ) : savings < 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          -₹{Math.abs(savings).toLocaleString("en-In")}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getVendorName(order)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium relative">
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
                        {activeDropdown === order.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <div className="py-1">
                              {/* View Action */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewModal(order);
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

                              {/* Export Action */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExport(order);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
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
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                Export To PDF
                              </button>
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
            <p className="text-gray-500 text-lg">No purchase orders found</p>
            <p className="text-gray-400 mt-2">
              Purchase orders will appear here once created
            </p>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-1000">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                Purchase Order Details
              </h2>
              <button
                onClick={() => setViewModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Order Information
                    </h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          PO Number
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {viewModal.poNumber ||
                            `PO-${viewModal.id?.slice(-6).toUpperCase()}`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Title
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {viewModal.title}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Description
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {viewModal.description || "N/A"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Budget Component
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {budgetComponents[viewModal.budgetComponent] ||
                            viewModal.budgetComponent}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Financial Details
                    </h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Original Estimate
                        </dt>
                        <dd className="text-sm text-gray-900">
                          ₹
                          {viewModal.estimatedTotal?.toLocaleString("en-In") ||
                            "N/A"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Final Price
                        </dt>
                        <dd className="text-sm text-gray-900 font-semibold">
                          ₹{viewModal.finalPrice?.toLocaleString("en-In")}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Savings
                        </dt>
                        <dd className="text-sm">
                          {getSavings(viewModal) > 0 ? (
                            <span className="text-green-600 font-semibold">
                              +₹{getSavings(viewModal).toLocaleString("en-In")}
                            </span>
                          ) : getSavings(viewModal) < 0 ? (
                            <span className="text-red-600 font-semibold">
                              -₹
                              {Math.abs(getSavings(viewModal)).toLocaleString(
                                "en-In"
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Status
                        </dt>
                        <dd className="text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              viewModal.status
                            )}`}
                          >
                            {viewModal.status}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Vendor Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Vendor Information
                  </h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Vendor Name
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {getVendorName(viewModal)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Contact Person
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {getVendorContact(viewModal)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Email
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {getVendorEmail(viewModal)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Phone
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {getVendorPhone(viewModal)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Additional Notes */}
                {viewModal.notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Additional Notes
                    </h3>
                    <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {viewModal.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setViewModal(null)}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleExport(viewModal)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Export To PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersList;
