import React, { useState, useEffect } from "react";
import {
  FiFilter,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiEdit,
  FiPlus,
  FiX,
  FiDollarSign,
  FiBarChart2,
  FiChevronDown
} from "react-icons/fi";

const HR = () => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    onHold: 0,
    totalAmount: 0,
    paidAmount: 0
  });
  const [showBanner, setShowBanner] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Sample data
  useEffect(() => {
    const sampleBills = [
      {
        id: 1,
        trainerName: "Rajesh Kumar",
        course: "React Fundamentals",
        batch: "RF-2023-01",
        hours: 40,
        rate: 1200,
        totalAmount: 48000,
        submittedDate: "2023-10-15",
        status: "pending",
        remarks: ""
      },
      {
        id: 2,
        trainerName: "Priya Sharma",
        course: "Advanced JavaScript",
        batch: "AJ-2023-02",
        hours: 32,
        rate: 1500,
        totalAmount: 48000,
        submittedDate: "2023-10-10",
        status: "approved",
        remarks: "Timely submission",
        approvedDate: "2023-10-12",
        approvedBy: "HR Manager"
      },
      {
        id: 3,
        trainerName: "Amit Patel",
        course: "Node.js Backend",
        batch: "NB-2023-03",
        hours: 48,
        rate: 1400,
        totalAmount: 67200,
        submittedDate: "2023-10-05",
        status: "onHold",
        remarks: "Need clarification on extra hours"
      },
      {
        id: 4,
        trainerName: "Sneha Desai",
        course: "UI/UX Design",
        batch: "UD-2023-04",
        hours: 36,
        rate: 1300,
        totalAmount: 46800,
        submittedDate: "2023-10-18",
        status: "rejected",
        remarks: "Incorrect hours reported",
        rejectedDate: "2023-10-20",
        rejectedBy: "HR Executive"
      },
      {
        id: 5,
        trainerName: "Vikram Singh",
        course: "Python Data Science",
        batch: "PDS-2023-05",
        hours: 45,
        rate: 1600,
        totalAmount: 72000,
        submittedDate: "2023-10-22",
        status: "pending",
        remarks: ""
      }
    ];

    setBills(sampleBills);
    setFilteredBills(sampleBills);
    
    // Calculate stats
    const total = sampleBills.length;
    const approved = sampleBills.filter(bill => bill.status === "approved").length;
    const rejected = sampleBills.filter(bill => bill.status === "rejected").length;
    const pending = sampleBills.filter(bill => bill.status === "pending").length;
    const onHold = sampleBills.filter(bill => bill.status === "onHold").length;
    const totalAmount = sampleBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const paidAmount = sampleBills
      .filter(bill => bill.status === "approved")
      .reduce((sum, bill) => sum + bill.totalAmount, 0);
    
    setStats({
      total,
      approved,
      rejected,
      pending,
      onHold,
      totalAmount,
      paidAmount
    });
  }, []);

  // Filter bills based on status and search term
  useEffect(() => {
    let result = bills;
    
    if (statusFilter !== "all") {
      result = result.filter(bill => bill.status === statusFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        bill =>
          bill.trainerName.toLowerCase().includes(term) ||
          bill.course.toLowerCase().includes(term) ||
          bill.batch.toLowerCase().includes(term)
      );
    }
    
    setFilteredBills(result);
  }, [statusFilter, searchTerm, bills]);

  const handleStatusUpdate = (billId, newStatus) => {
    const updatedBills = bills.map(bill => {
      if (bill.id === billId) {
        const updatedBill = {
          ...bill,
          status: newStatus,
          remarks: remarks
        };
        
        if (newStatus === "approved") {
          updatedBill.approvedDate = new Date().toISOString().split('T')[0];
          updatedBill.approvedBy = "Current User";
        } else if (newStatus === "rejected") {
          updatedBill.rejectedDate = new Date().toISOString().split('T')[0];
          updatedBill.rejectedBy = "Current User";
        }
        
        return updatedBill;
      }
      return bill;
    });
    
    setBills(updatedBills);
    setShowModal(false);
    setRemarks("");
  };

  const openModal = (bill) => {
    setSelectedBill(bill);
    setRemarks(bill.remarks || "");
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: "bg-amber-50 text-amber-700 border border-amber-200",
      approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      rejected: "bg-rose-50 text-rose-700 border border-rose-200",
      onHold: "bg-blue-50 text-blue-700 border border-blue-200"
    };
    
    const statusIcons = {
      pending: <FiClock className="mr-1 h-3 w-3" />,
      approved: <FiCheckCircle className="mr-1 h-3 w-3" />,
      rejected: <FiXCircle className="mr-1 h-3 w-3" />,
      onHold: <FiClock className="mr-1 h-3 w-3" />
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusClasses[status]}`}>
        {statusIcons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Under Construction Banner */}
      {showBanner && (
        <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-800 p-4 mb-6 rounded-md flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium">
              <strong>Notice:</strong> This is dummy data for demonstration purposes only.
            </p>
            <p className="text-sm mt-1">The dashboard is under construction and should not be referenced for production use.</p>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="ml-4 text-amber-600 hover:text-amber-800 focus:outline-none"
            aria-label="Close banner"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Trainer Bill Approvals</h1>
        <p className="text-gray-600 mt-1">Approve, reject or hold trainer bills with remarks</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="rounded-lg p-3 bg-blue-50 text-blue-600">
              <FiPlus className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900">{stats.total}</h2>
              <p className="text-sm text-gray-600">Total Bills</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="rounded-lg p-3 bg-emerald-50 text-emerald-600">
              <FiCheckCircle className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900">{stats.approved}</h2>
              <p className="text-sm text-gray-600">Approved</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="rounded-lg p-3 bg-rose-50 text-rose-600">
              <FiXCircle className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900">{stats.rejected}</h2>
              <p className="text-sm text-gray-600">Rejected</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="rounded-lg p-3 bg-amber-50 text-amber-600">
              <FiClock className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900">{stats.pending + stats.onHold}</h2>
              <p className="text-sm text-gray-600">Pending Review</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiDollarSign className="mr-2 text-blue-600" />
            Financial Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-xl font-bold text-gray-900">₹{stats.totalAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Paid Amount</p>
              <p className="text-xl font-bold text-emerald-600">₹{stats.paidAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiBarChart2 className="mr-2 text-blue-600" />
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-2">
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <FiDownload className="mr-2 h-4 w-4" /> Export Data
            </button>
            <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              <FiEye className="mr-2 h-4 w-4" /> View Reports
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400 h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Search trainers, courses..."
                className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FiFilter className="mr-2 text-gray-400 h-4 w-4" />
                Filter
                <FiChevronDown className={`ml-2 h-4 w-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isFilterOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 p-2">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-1.5">Status</div>
                  {["all", "pending", "approved", "rejected", "onHold"].map((status) => (
                    <button
                      key={status}
                      className={`flex items-center w-full px-2 py-1.5 text-sm rounded-md hover:bg-gray-50 ${statusFilter === status ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                      onClick={() => {
                        setStatusFilter(status);
                        setIsFilterOpen(false);
                      }}
                    >
                      {status === "all" ? "All Status" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{filteredBills.length}</span> of <span className="font-medium">{bills.length}</span> bills
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trainer & Course
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours & Rate
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{bill.trainerName}</div>
                    <div className="text-sm text-gray-600">{bill.course}</div>
                    <div className="text-xs text-gray-400">{bill.batch}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{bill.hours} hours</div>
                    <div className="text-sm text-gray-500">₹{bill.rate}/hour</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">₹{bill.totalAmount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(bill.submittedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(bill.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                    <button
                      onClick={() => openModal(bill)}
                      className="text-blue-600 hover:text-blue-800 mr-4 transition-colors"
                      aria-label="Review bill"
                    >
                      <FiEdit className="inline mr-1 h-4 w-4" /> Review
                    </button>
                    <button className="text-gray-600 hover:text-gray-800 transition-colors" aria-label="View bill details">
                      <FiEye className="inline mr-1 h-4 w-4" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBills.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <FiSearch className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-500 text-lg font-medium">No bills found</p>
            <p className="text-gray-400 mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Review Bill - {selectedBill.trainerName}
              </h3>
              
              <div className="mb-4 text-sm text-gray-600">
                <p>
                  <span className="font-medium">Course:</span> {selectedBill.course} ({selectedBill.batch})
                </p>
                <p className="mt-1">
                  <span className="font-medium">Amount:</span> ₹{selectedBill.totalAmount.toLocaleString()}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Hours:</span> {selectedBill.hours} @ ₹{selectedBill.rate}/hour
                </p>
                <p className="mt-1">
                  <span className="font-medium">Submitted:</span> {new Date(selectedBill.submittedDate).toLocaleDateString()}
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add remarks for your decision"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
                <button
                  onClick={() => handleStatusUpdate(selectedBill.id, "rejected")}
                  className="flex-1 px-4 py-2.5 bg-rose-50 text-rose-700 rounded-lg font-medium hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors"
                >
                  Reject
                </button>
                
                <button
                  onClick={() => handleStatusUpdate(selectedBill.id, "onHold")}
                  className="flex-1 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Hold
                </button>
                
                <button
                  onClick={() => handleStatusUpdate(selectedBill.id, "approved")}
                  className="flex-1 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg font-medium hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 rounded-lg font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HR;