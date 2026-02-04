import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  Building2,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Star,
  Tag,
  Users,
  MapPin,
  X,
} from "lucide-react";

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
      {/* Header Section */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-linear-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Vendor Management</h2>
            <p className="text-sm text-gray-600 mt-1">Manage vendor relationships and performance</p>
          </div>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">Search & Filter Vendors</h4>
              <p className="text-sm text-gray-600">Find and organize your vendor database</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Compact Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 min-w-0">
              <label htmlFor="vendor-search" className="sr-only">Search Vendors</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="vendor-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search vendors..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="min-w-0">
                <label htmlFor="vendor-category" className="sr-only">Category</label>
                <select
                  id="vendor-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[120px]"
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

              <div className="min-w-0">
                <label htmlFor="vendor-sort" className="sr-only">Sort By</label>
                <select
                  id="vendor-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[120px]"
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="rating-desc">Top Rated</option>
                  <option value="orders-desc">Most Orders</option>
                </select>
              </div>

              <button
                onClick={() => setShowAddVendorModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                aria-label="Add new vendor"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vendors Grid Section */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">Vendor Directory</h4>
              <p className="text-sm text-gray-600">Browse and manage all registered vendors</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredVendors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVendors.map((vendor) => {
                const stats = getVendorStats(vendor.id);

                return (
                  <div
                    key={vendor.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    {/* Vendor Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                          {vendor.name}
                        </h3>
                        {vendor.category && (
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium mt-1">
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
                          {stats.avgRating.toFixed(1)}
                        </div>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1 mb-3">
                      {vendor.contactPerson && (
                        <div className="flex items-center text-xs text-gray-600">
                          <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {vendor.contactPerson}
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center text-xs text-gray-600">
                          <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {vendor.phone}
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center text-xs text-gray-600">
                          <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {vendor.email}
                        </div>
                      )}
                    </div>

                    {/* Vendor Stats */}
                    <div className="border-t border-gray-200 pt-3 mb-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {stats.totalOrders}
                          </div>
                          <div className="text-xs text-gray-600">Orders</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            ₹{(stats.totalSpent / 100000).toFixed(1)}L
                          </div>
                          <div className="text-xs text-gray-600">Spent</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {stats.avgRating ? stats.avgRating.toFixed(1) : "-"}
                          </div>
                          <div className="text-xs text-gray-600">Rating</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleViewVendor(vendor)}
                        className="flex-1 text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center justify-center py-1.5 rounded hover:bg-blue-50 transition-colors"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={() => handleEditVendor(vendor)}
                        className="flex-1 text-green-600 hover:text-green-800 text-xs font-medium flex items-center justify-center py-1.5 rounded hover:bg-green-50 transition-colors"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteVendor(vendor)}
                        disabled={loading}
                        className="flex-1 text-red-600 hover:text-red-800 text-xs font-medium flex items-center justify-center py-1.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 max-w-md mx-auto">
                <svg className="w-12 h-12 text-yellow-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-base font-semibold text-yellow-800 mb-1.5">
                  No vendors found
                </h3>
                <p className="text-yellow-700 mb-3 text-sm">
                  {searchTerm || selectedCategory
                    ? "Try adjusting your search criteria"
                    : "Get started by adding your first vendor"}
                </p>
                <button
                  onClick={() => setShowAddVendorModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Add First Vendor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
      !/^[+]?\d+$/.test(formData.phone.replace(/\s/g, ""))
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
    <div className="fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center p-4 z-54">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Add New Vendor</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 overflow-y-auto max-h-[85vh]"
        >
          <div className="space-y-4">
            {/* Basic Information */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                      errors.name ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter vendor company name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
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
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                      errors.phone ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="+91 9876543210"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
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
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                Address Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Building, Street, Area"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    name="address.pincode"
                    value={formData.address.pincode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="PIN Code"
                  />
                </div>
              </div>
            </div>

            {/* Vendor Terms */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                Vendor Terms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="net15">Net 15</option>
                    <option value="net30">Net 30</option>
                    <option value="net45">Net 45</option>
                    <option value="net60">Net 60</option>
                    <option value="uponDelivery">Upon Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Time
                  </label>
                  <input
                    type="text"
                    name="deliveryTime"
                    value={formData.deliveryTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="e.g., 7-10 days"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 flex items-center text-sm"
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
      !/^[+]?\d+$/.test(formData.phone.replace(/\s/g, ""))
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
    <div className="fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center p-4 z-54">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Vendor</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 overflow-y-auto max-h-[85vh]"
        >
          <div className="space-y-4">
            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter vendor company name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person *
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    errors.phone ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="+91 9876543210"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="contact@vendor.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Building, Street, Area"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIN Code
                </label>
                <input
                  type="text"
                  name="address.pincode"
                  value={formData.address.pincode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="PIN Code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <select
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="net15">Net 15</option>
                  <option value="net30">Net 30</option>
                  <option value="net45">Net 45</option>
                  <option value="net60">Net 60</option>
                  <option value="uponDelivery">Upon Delivery</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Time
                </label>
                <input
                  type="text"
                  name="deliveryTime"
                  value={formData.deliveryTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="e.g., 7-10 days"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 flex items-center text-sm"
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-54">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{vendor.name}</h1>
                <p className="text-xs text-gray-500 capitalize">
                  {vendor.category?.replace("-", " ") || "Vendor"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="px-4 py-4 space-y-4">
            {/* Performance Overview */}
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Performance Overview</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Orders</span>
                  <span className="text-sm font-medium text-gray-900">{vendorStats.totalOrders}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Value</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(vendorStats.totalSpent)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Avg Rating</span>
                  <span className="text-sm font-medium text-gray-900">
                    {vendorStats.avgRating ? vendorStats.avgRating.toFixed(1) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Category</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {vendor.category?.replace("-", " ") || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Basic Information</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Payment Terms</span>
                  <span className="text-sm font-medium text-gray-900">
                    {vendor.paymentTerms?.replace(/([A-Z])/g, " $1").trim() || "Net 30"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Delivery Time</span>
                  <span className="text-sm font-medium text-gray-900">
                    {vendor.deliveryTime || "7-10 days"}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Contact Information</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Contact Person</span>
                  <span className="text-sm font-medium text-gray-900">{vendor.contactPerson || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Phone Number</span>
                  <span className="text-sm font-medium text-gray-900">{vendor.phone || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Email Address</span>
                  <span className="text-sm font-medium text-gray-900">{vendor.email || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Address</h2>
              <div className="py-2">
                <span className="text-sm text-gray-900">
                  {vendor.address?.street && `${vendor.address.street}, `}
                  {vendor.address?.city && `${vendor.address.city}, `}
                  {vendor.address?.state && `${vendor.address.state} `}
                  {vendor.address?.pincode && `- ${vendor.address.pincode}`}
                  {!vendor.address?.street && !vendor.address?.city && !vendor.address?.state && !vendor.address?.pincode && "N/A"}
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Timeline</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(vendor.createdAt)}</span>
                </div>
                {vendor.lastUsed && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Last Used</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(vendor.lastUsed)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {vendor.notes && (
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-3">Notes</h2>
                <div className="py-2">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{vendor.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom spacing */}
          <div className="h-4"></div>
        </div>
      </div>
    </div>
  );
};

export default VendorManagement;
