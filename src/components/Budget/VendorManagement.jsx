import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

const VendorManagement = ({ vendors, purchaseOrders, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showEditVendorModal, setShowEditVendorModal] = useState(false);
  const [showViewVendorModal, setShowViewVendorModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Vendor categories for dropdown
  const vendorCategories = [
    "hardware",
    "software",
    "services",
    "printing",
    "merchandise",
    "office-supplies",
    "travel",
    "training",
    "consulting",
    "other",
  ];

  // Filter and sort vendors
  const filteredVendors = vendors
    .filter((vendor) => {
      const matchesSearch =
        vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.contactPerson
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.phone?.includes(searchTerm);
      const matchesCategory =
        !selectedCategory || vendor.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "");
        case "rating-desc":
          return (
            (getVendorStats(b.id).avgRating || 0) -
            (getVendorStats(a.id).avgRating || 0)
          );
        case "orders-desc":
          return (
            (getVendorStats(b.id).totalOrders || 0) -
            (getVendorStats(a.id).totalOrders || 0)
          );
        default:
          return 0;
      }
    });

  const getVendorStats = (vendorId) => {
    const vendorOrders = purchaseOrders.filter(
      (order) => order.vendorId === vendorId
    );
    const totalOrders = vendorOrders.length;
    const totalSpent = vendorOrders.reduce(
      (sum, order) => sum + (order.totalCost || order.finalPrice || 0),
      0
    );
    const avgRating =
      vendorOrders.reduce((sum, order) => sum + (order.vendorRating || 0), 0) /
        totalOrders || 0;

    return { totalOrders, totalSpent, avgRating };
  };

  const getPerformanceColor = (rating) => {
    if (rating >= 4.5) return "text-green-600 bg-green-100";
    if (rating >= 4.0) return "text-blue-600 bg-blue-100";
    if (rating >= 3.0) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const handleEditVendor = async (vendor) => {
    setSelectedVendor(vendor);
    setShowEditVendorModal(true);
  };

  const handleViewVendor = (vendor) => {
    setSelectedVendor(vendor);
    setShowViewVendorModal(true);
  };

  const handleDeleteVendor = async (vendor) => {
    if (
      window.confirm(
        `Are you sure you want to delete vendor "${vendor.name}"? This action cannot be undone.`
      )
    ) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, "vendors", vendor.id));
        // Optional: Show success message
        alert("Vendor deleted successfully!");
      } catch (error) {
        console.error("Error deleting vendor:", error);
        alert("Failed to delete vendor. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdateVendor = async (vendorData) => {
    if (!selectedVendor) return;

    setIsSubmitting(true);
    try {
      const vendorRef = doc(db, "vendors", selectedVendor.id);
      await updateDoc(vendorRef, {
        ...vendorData,
        lastUpdatedAt: new Date(),
        updatedBy: currentUser.uid,
      });

      setShowEditVendorModal(false);
      setSelectedVendor(null);
      alert("Vendor updated successfully!");
    } catch (error) {
      console.error("Error updating vendor:", error);
      alert("Failed to update vendor. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Vendor Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage vendor relationships and performance
          </p>
        </div>

        <button
          onClick={() => setShowAddVendorModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Vendor
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Vendors
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, contact, or email..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {vendorCategories.map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() +
                    category.slice(1).replace("-", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="rating-desc">Highest Rated</option>
              <option value="orders-desc">Most Orders</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vendor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => {
          const stats = getVendorStats(vendor.id);

          return (
            <div
              key={vendor.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              {/* Vendor Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {vendor.name}
                  </h3>
                  {vendor.category && (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium mt-1">
                      {vendor.category.charAt(0).toUpperCase() +
                        vendor.category.slice(1).replace("-", " ")}
                    </span>
                  )}
                </div>
                {stats.avgRating > 0 && (
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-bold ${getPerformanceColor(
                      stats.avgRating
                    )}`}
                  >
                    {stats.avgRating.toFixed(1)}/5
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {vendor.contactPerson && (
                  <div className="flex items-center text-sm text-gray-600">
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    {vendor.contactPerson}
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center text-sm text-gray-600">
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
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    {vendor.phone}
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center text-sm text-gray-600">
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {vendor.email}
                  </div>
                )}
              </div>

              {/* Vendor Stats */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.totalOrders}
                    </div>
                    <div className="text-xs text-gray-600">Orders</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      ₹{(stats.totalSpent / 100000).toFixed(1)}L
                    </div>
                    <div className="text-xs text-gray-600">Spent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.avgRating ? stats.avgRating.toFixed(1) : "-"}
                    </div>
                    <div className="text-xs text-gray-600">Rating</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleViewVendor(vendor)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-1"
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
                  View
                </button>
                <button
                  onClick={() => handleEditVendor(vendor)}
                  className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteVendor(vendor)}
                  disabled={loading}
                  className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center disabled:opacity-50"
                >
                  <svg
                    className="w-4 h-4 mr-1"
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
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredVendors.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No vendors found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory
              ? "Try adjusting your search criteria"
              : "Get started by adding your first vendor"}
          </p>
          <button
            onClick={() => setShowAddVendorModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add First Vendor
          </button>
        </div>
      )}

      {/* Add Vendor Modal */}
      <AddVendorModal
        show={showAddVendorModal}
        onClose={() => setShowAddVendorModal(false)}
        vendorCategories={vendorCategories}
        currentUser={currentUser}
      />

      {/* Edit Vendor Modal */}
      {showEditVendorModal && selectedVendor && (
        <EditVendorModal
          show={showEditVendorModal}
          onClose={() => {
            setShowEditVendorModal(false);
            setSelectedVendor(null);
          }}
          onSubmit={handleUpdateVendor}
          vendor={selectedVendor}
          vendorCategories={vendorCategories}
          currentUser={currentUser}
          isSubmitting={isSubmitting}
        />
      )}

      {/* View Vendor Modal */}
      {showViewVendorModal && selectedVendor && (
        <ViewVendorModal
          show={showViewVendorModal}
          onClose={() => {
            setShowViewVendorModal(false);
            setSelectedVendor(null);
          }}
          vendor={selectedVendor}
          vendorStats={getVendorStats(selectedVendor.id)}
        />
      )}
    </div>
  );
};

// Add Vendor Modal Component
const AddVendorModal = ({ show, onClose, vendorCategories, currentUser }) => {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: {
      street: "",
      city: "",
      state: "",
      pincode: "",
    },
    paymentTerms: "net30",
    deliveryTime: "7-10 days",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Vendor name is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = "Contact person is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (
      !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ""))
    ) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Add safety check for currentUser
    if (!currentUser || !currentUser.uid) {
      alert("User not authenticated. Please log in again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const vendorData = {
        ...formData,
        rating: 0, // Initial rating
        totalOrders: 0,
        totalSpent: 0,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      await addDoc(collection(db, "vendors"), vendorData);

      // Reset form and close modal
      setFormData({
        name: "",
        category: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: {
          street: "",
          city: "",
          state: "",
          pincode: "",
        },
        paymentTerms: "net30",
        deliveryTime: "7-10 days",
        notes: "",
      });
      setErrors({});
      onClose();
      alert("Vendor added successfully!");
    } catch (error) {
      console.error("Error adding vendor:", error);
      alert("Failed to add vendor. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      category: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: {
        street: "",
        city: "",
        state: "",
        pincode: "",
      },
      paymentTerms: "net30",
      deliveryTime: "7-10 days",
      notes: "",
    });
    setErrors({});
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add New Vendor</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
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

        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto max-h-[70vh]"
        >
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter vendor company name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.category ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select Category</option>
                    {vendorCategories.map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() +
                          category.slice(1).replace("-", " ")}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.category}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.contactPerson
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Full name of contact person"
                  />
                  {errors.contactPerson && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.contactPerson}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.phone ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="+91 9876543210"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="contact@vendor.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Address Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Building, Street, Area"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    name="address.pincode"
                    value={formData.address.pincode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="PIN Code"
                  />
                </div>
              </div>
            </div>

            {/* Vendor Terms */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Vendor Terms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms
                  </label>
                  <select
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="net15">Net 15</option>
                    <option value="net30">Net 30</option>
                    <option value="net45">Net 45</option>
                    <option value="net60">Net 60</option>
                    <option value="uponDelivery">Upon Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Time
                  </label>
                  <input
                    type="text"
                    name="deliveryTime"
                    value={formData.deliveryTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 7-10 days"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? (
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
                  Adding...
                </>
              ) : (
                "Add Vendor"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Vendor Modal Component
const EditVendorModal = ({
  show,
  onClose,
  onSubmit,
  vendor,
  vendorCategories,
  currentUser,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState({
    name: vendor.name || "",
    category: vendor.category || "",
    contactPerson: vendor.contactPerson || "",
    phone: vendor.phone || "",
    email: vendor.email || "",
    address: {
      street: vendor.address?.street || "",
      city: vendor.address?.city || "",
      state: vendor.address?.state || "",
      pincode: vendor.address?.pincode || "",
    },
    paymentTerms: vendor.paymentTerms || "net30",
    deliveryTime: vendor.deliveryTime || "7-10 days",
    notes: vendor.notes || "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name || "",
        category: vendor.category || "",
        contactPerson: vendor.contactPerson || "",
        phone: vendor.phone || "",
        email: vendor.email || "",
        address: {
          street: vendor.address?.street || "",
          city: vendor.address?.city || "",
          state: vendor.address?.state || "",
          pincode: vendor.address?.pincode || "",
        },
        paymentTerms: vendor.paymentTerms || "net30",
        deliveryTime: vendor.deliveryTime || "7-10 days",
        notes: vendor.notes || "",
      });
    }
  }, [vendor]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Vendor name is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = "Contact person is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (
      !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ""))
    ) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!currentUser || !currentUser.uid) {
      alert("User not authenticated. Please log in again.");
      return;
    }

    await onSubmit(formData);
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center p-4 z-1000">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Vendor</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
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

        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto max-h-[70vh]"
        >
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter vendor company name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.category ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select Category</option>
                    {vendorCategories.map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() +
                          category.slice(1).replace("-", " ")}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.category}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.contactPerson
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Full name of contact person"
                  />
                  {errors.contactPerson && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.contactPerson}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.phone ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="+91 9876543210"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="contact@vendor.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Address Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Building, Street, Area"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    name="address.pincode"
                    value={formData.address.pincode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="PIN Code"
                  />
                </div>
              </div>
            </div>

            {/* Vendor Terms */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Vendor Terms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms
                  </label>
                  <select
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="net15">Net 15</option>
                    <option value="net30">Net 30</option>
                    <option value="net45">Net 45</option>
                    <option value="net60">Net 60</option>
                    <option value="uponDelivery">Upon Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Time
                  </label>
                  <input
                    type="text"
                    name="deliveryTime"
                    value={formData.deliveryTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 7-10 days"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? (
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
                  Updating...
                </>
              ) : (
                "Update Vendor"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// View Vendor Modal Component
const ViewVendorModal = ({ show, onClose, vendor, vendorStats }) => {
  if (!show || !vendor) return null;

  const formatDate = (date) => {
    if (!date) return "N/A";
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString("en-IN");
    }
    return new Date(date).toLocaleDateString("en-IN");
  };

  return (
    <div className="fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center p-4 z-1000">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Vendor Details</h2>
          <button
            onClick={onClose}
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
            {/* Vendor Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {vendor.name}
                </h3>
                {vendor.category && (
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mt-2">
                    {vendor.category.charAt(0).toUpperCase() +
                      vendor.category.slice(1).replace("-", " ")}
                  </span>
                )}
              </div>
              {vendorStats.avgRating > 0 && (
                <div
                  className={`px-3 py-1 rounded-full text-sm font-bold ${
                    vendorStats.avgRating >= 4.5
                      ? "text-green-600 bg-green-100"
                      : vendorStats.avgRating >= 4.0
                      ? "text-blue-600 bg-blue-100"
                      : vendorStats.avgRating >= 3.0
                      ? "text-yellow-600 bg-yellow-100"
                      : "text-red-600 bg-red-100"
                  }`}
                >
                  {vendorStats.avgRating.toFixed(1)}/5 Rating
                </div>
              )}
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {vendorStats.totalOrders}
                </div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  ₹{(vendorStats.totalSpent / 100000).toFixed(1)}L
                </div>
                <div className="text-sm text-gray-600">Total Spent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {vendorStats.avgRating
                    ? vendorStats.avgRating.toFixed(1)
                    : "-"}
                </div>
                <div className="text-sm text-gray-600">Avg Rating</div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                Contact Information
              </h4>
              <div className="space-y-2">
                {vendor.contactPerson && (
                  <div className="flex items-center text-gray-700">
                    <svg
                      className="w-4 h-4 mr-3 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span>{vendor.contactPerson}</span>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center text-gray-700">
                    <svg
                      className="w-4 h-4 mr-3 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <span>{vendor.phone}</span>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center text-gray-700">
                    <svg
                      className="w-4 h-4 mr-3 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{vendor.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            {vendor.address &&
              (vendor.address.street ||
                vendor.address.city ||
                vendor.address.state ||
                vendor.address.pincode) && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Address
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {vendor.address.street && (
                      <p className="text-gray-700">{vendor.address.street}</p>
                    )}
                    <div className="flex gap-2 text-gray-700 mt-1">
                      {vendor.address.city && (
                        <span>{vendor.address.city}</span>
                      )}
                      {vendor.address.state && (
                        <span>{vendor.address.state}</span>
                      )}
                      {vendor.address.pincode && (
                        <span>{vendor.address.pincode}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Vendor Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Payment Terms
                </h4>
                <p className="text-gray-700 capitalize">
                  {vendor.paymentTerms?.replace(/([A-Z])/g, " $1").trim() ||
                    "Net 30"}
                </p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Delivery Time
                </h4>
                <p className="text-gray-700">
                  {vendor.deliveryTime || "7-10 days"}
                </p>
              </div>
            </div>

            {/* Metadata */}
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {formatDate(vendor.createdAt)}
                </div>
                {vendor.lastUpdatedAt && (
                  <div>
                    <span className="font-medium">Last Updated:</span>{" "}
                    {formatDate(vendor.lastUpdatedAt)}
                  </div>
                )}
                {vendor.lastUsed && (
                  <div className="col-span-2">
                    <span className="font-medium">Last Used:</span>{" "}
                    {formatDate(vendor.lastUsed)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorManagement;
