import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import InvoiceModal from "./InvoiceModal";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

const ContractInvoicesTab = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    invoice: null,
  });
  const [invoiceModal, setInvoiceModal] = useState({
    isOpen: false,
    invoice: null,
    isViewOnly: true,
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter states
  const [filters, setFilters] = useState({
    financialYear: "",
    invoiceType: "all",
    status: "all",
    startDate: "",
    endDate: "",
  });

  const [showFilters, setShowFilters] = useState(false);

  // Statistics state
  const [stats, setStats] = useState({
    totalInvoices: 0,
    cancelledInvoices: 0,
    totalAmount: 0,
    receivedAmount: 0,
    dueAmount: 0,
    bookedInvoices: 0,
    cashInvoices: 0,
    taxInvoices: 0,
    approvedInvoices: 0,
    pendingInvoices: 0
  });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      const contractsRef = collection(db, "ContractInvoices");
      const snapshot = await getDocs(contractsRef);

      if (snapshot.docs.length > 0) {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          receivedAmount: doc.data().receivedAmount || 0,
          dueAmount: doc.data().dueAmount || 0,
          paymentHistory: doc.data().paymentHistory || [],
          status: doc.data().status || "pending",
          approvalStatus: doc.data().approvalStatus || "pending",
          approved: doc.data().approved || false,
        }));

        setInvoices(data);
        setFilteredInvoices(data);
        calculateStats(data);
      } else {
        setInvoices([]);
        setFilteredInvoices([]);
        calculateStats([]);
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics - FIXED VERSION
  const calculateStats = (invoiceData) => {
    const newStats = {
      totalInvoices: invoiceData.length,
      cancelledInvoices: 0,
      totalAmount: 0,
      receivedAmount: 0,
      dueAmount: 0,
      bookedInvoices: 0,
      cashInvoices: 0,
      taxInvoices: 0,
      approvedInvoices: 0,
      pendingInvoices: 0
    };

    invoiceData.forEach(invoice => {
      // Safely parse amounts to numbers
      const totalAmount = parseFloat(invoice.amountRaised) || 0;
      const receivedAmount = parseFloat(invoice.receivedAmount) || 0;
      const dueAmount = parseFloat(invoice.dueAmount) || (totalAmount - receivedAmount);

      // Count cancelled invoices
      if (invoice.approvalStatus === "cancelled") {
        newStats.cancelledInvoices++;
      }

      // Count booked invoices
      if (invoice.status === "Booked" || invoice.registered) {
        newStats.bookedInvoices++;
      }

      // Count by invoice type
      if (invoice.invoiceType === "Cash Invoice") {
        newStats.cashInvoices++;
      } else if (invoice.invoiceType === "Tax Invoice") {
        newStats.taxInvoices++;
      } 

      // Count approval status
      if (invoice.approved) {
        newStats.approvedInvoices++;
      } else {
        newStats.pendingInvoices++;
      }

      // Amount calculations - ADD numbers, don't concatenate
      newStats.totalAmount += totalAmount;
      newStats.receivedAmount += receivedAmount;
      newStats.dueAmount += dueAmount;
    });

    // Ensure numbers are properly formatted
    newStats.totalAmount = Number(newStats.totalAmount.toFixed(2));
    newStats.receivedAmount = Number(newStats.receivedAmount.toFixed(2));
    newStats.dueAmount = Number(newStats.dueAmount.toFixed(2));

    setStats(newStats);
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...invoices];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((invoice) =>
        Object.values(invoice).some(
          (value) =>
            value &&
            value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Financial Year filter
    if (filters.financialYear) {
      filtered = filtered.filter((invoice) => {
        const invoiceDate = invoice.raisedDate?.toDate
          ? invoice.raisedDate.toDate()
          : new Date(invoice.raisedDate);
        const year = invoiceDate.getFullYear();
        const month = invoiceDate.getMonth() + 1;

        let financialYear;
        if (month >= 4) {
          financialYear = `${year}-${(year + 1).toString().slice(2)}`;
        } else {
          financialYear = `${year - 1}-${year.toString().slice(2)}`;
        }

        return financialYear === filters.financialYear;
      });
    }

    // Invoice Type filter
    if (filters.invoiceType !== "all") {
      filtered = filtered.filter((invoice) => {
        if (filters.invoiceType === "tax") {
          return invoice.invoiceType === "Tax Invoice";
        } else if (filters.invoiceType === "cash") {
          return invoice.invoiceType === "Cash Invoice";
        } 
        return true;
      });
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((invoice) => {
        if (filters.status === "approved") {
          return invoice.approved === true;
        } else if (filters.status === "pending_approval") {
          return invoice.approvalStatus === "pending" && !invoice.approved;
        } else if (filters.status === "cancelled") {
          return invoice.approvalStatus === "cancelled";
        } else if (filters.status === "fully_paid") {
          return invoice.status === "received" || invoice.dueAmount === 0;
        } else if (filters.status === "partially_paid") {
          return invoice.status === "partially_received";
        } else if (filters.status === "unpaid") {
          return invoice.status === "pending" && invoice.receivedAmount === 0;
        }
        return true;
      });
    }

    // Date Range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((invoice) => {
        const invoiceDate = invoice.raisedDate?.toDate
          ? invoice.raisedDate.toDate()
          : new Date(invoice.raisedDate);
        invoiceDate.setHours(0, 0, 0, 0);
        return invoiceDate >= startDate;
      });
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((invoice) => {
        const invoiceDate = invoice.raisedDate?.toDate
          ? invoice.raisedDate.toDate()
          : new Date(invoice.raisedDate);
        invoiceDate.setHours(0, 0, 0, 0);
        return invoiceDate <= endDate;
      });
    }

    setFilteredInvoices(filtered);
    calculateStats(filtered);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      financialYear: "",
      invoiceType: "all",
      status: "all",
      startDate: "",
      endDate: "",
    });
    setSearchTerm("");
    setFilteredInvoices(invoices);
    calculateStats(invoices);
  };

  // Export to Excel with same columns as InvoiceExcelExport + Payment History
  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      const dataToExport = filteredInvoices.length > 0 ? filteredInvoices : invoices;

      // Calculate GST breakdown function - SAME AS InvoiceExcelExport
      const calculateGSTBreakdown = (invoice) => {
        let gstAmount = invoice.gstAmount || 0;
        
        if (typeof gstAmount === 'string') {
          gstAmount = parseFloat(gstAmount) || 0;
        }
        
        const gstType = invoice.gstType?.toLowerCase();
        
        if (gstType === "igst") {
          return {
            cgst: 0,
            sgst: 0,
            igst: gstAmount
          };
        } else {
          return {
            cgst: gstAmount / 2,
            sgst: gstAmount / 2,
            igst: 0
          };
        }
      };

      // Get invoice month - SAME AS InvoiceExcelExport
      const getInvoiceMonth = (date) => {
        if (!date) return "";
        try {
          const d = date?.toDate ? date.toDate() : new Date(date);
          return d.toLocaleDateString("en-IN", { 
            year: "numeric", 
            month: "long" 
          });
        } catch {
          return "Invalid Date";
        }
      };

      // Get Description from deliveryType - SAME AS InvoiceExcelExport
      const getDescription = (invoice) => {
        const deliveryType = invoice.deliveryType || "";
        
        switch(deliveryType.toUpperCase()) {
          case "TP":
            return "Training and Placement";
          case "OT":
            return "Only Training";
          case "IP":
            return "Induction Program";
          case "DM":
            return "Digital Marketing Services";
          default:
            return deliveryType || "N/A";
        }
      };

      // Calculate rounded amount - SAME AS InvoiceExcelExport
      const calculateRoundedAmount = (amount) => {
        if (!amount && amount !== 0) return 0;
        
        let numAmount = amount;
        if (typeof amount === 'string') {
          numAmount = parseFloat(amount) || 0;
        }
        
        return Math.round(numAmount);
      };

      // Get HSN code - SAME AS InvoiceExcelExport
      const getHSNCode = (invoice) => {
        return "9984";
      };

// Format payment history with dates and amounts - UPDATED FUNCTION
const getPaymentHistoryText = (invoice) => {
  if (!invoice.paymentHistory || invoice.paymentHistory.length === 0) {
    return "No Payments";
  }
  
  // Sort payment history by date ascending (oldest first)
  const sortedPayments = [...invoice.paymentHistory].sort((a, b) => {
    const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.date);
    const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.date);
    return dateA - dateB;
  });
  
  // Format each payment: "₹Amount on Date" - USING THE STORED DATE
  return sortedPayments.map(payment => {
    const paymentDate = payment.date; // Use the stored date directly
    const formattedDate = new Date(paymentDate).toLocaleDateString("en-IN");
    const amount = payment.amount || 0;
    
    return `₹${formatCurrency(amount)} on ${formattedDate}`;
  }).join('\n');
};

// Get total received amount - helper function
const getTotalReceived = (invoice) => {
  if (!invoice.paymentHistory || invoice.paymentHistory.length === 0) {
    return 0;
  }
  
  return invoice.paymentHistory.reduce((total, payment) => {
    return total + (payment.amount || 0);
  }, 0);
};

      const excelData = dataToExport.map((invoice) => {
        const gstBreakdown = calculateGSTBreakdown(invoice);
        
        let netPayableAmount = invoice.netPayableAmount || 0;
        if (typeof netPayableAmount === 'string') {
          netPayableAmount = parseFloat(netPayableAmount) || 0;
        }
        
        const roundedAmount = calculateRoundedAmount(netPayableAmount);
        const baseAmount = invoice.baseAmount || 0;
        const totalReceived = getTotalReceived(invoice);

        return {
          "Invoice Month": getInvoiceMonth(invoice.raisedDate),
          "Invoice Number": invoice.invoiceNumber || "N/A",
          "Invoice Date": formatDateForExcel(invoice.raisedDate),
          "Party Name": invoice.collegeName || "N/A",
          "GSTIN Number": invoice.gstNumber || "N/A",
          "Description": getDescription(invoice),
          "Total Value": formatCurrency(baseAmount),
          "CGST": formatCurrency(gstBreakdown.cgst),
          "SGST": formatCurrency(gstBreakdown.sgst),
          "IGST": formatCurrency(gstBreakdown.igst),
          "Rounded Off": formatCurrency(roundedAmount - netPayableAmount),
          "Total Invoice Value": formatCurrency(roundedAmount),
          "Total Received": formatCurrency(totalReceived), // NEW: Total received amount
          "Due Amount": formatCurrency(roundedAmount - totalReceived), // NEW: Due amount
          "HSN Code": getHSNCode(invoice),
          "Invoice Type": invoice.invoiceType || "N/A",
          "Payment History": getPaymentHistoryText(invoice), // NEW: All payment dates with amounts
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths - SAME AS InvoiceExcelExport + NEW COLUMNS
      const colWidths = [
        { wch: 15 }, // Invoice Month
        { wch: 20 }, // Invoice Number
        { wch: 12 }, // Invoice Date
        { wch: 25 }, // Party Name
        { wch: 20 }, // GSTIN Number
        { wch: 25 }, // Description
        { wch: 12 }, // Total Value
        { wch: 10 }, // CGST
        { wch: 10 }, // SGST
        { wch: 10 }, // IGST
        { wch: 12 }, // Rounded Off
        { wch: 15 }, // Total Invoice Value
        { wch: 12 }, // NEW: Total Received
        { wch: 12 }, // NEW: Due Amount
        { wch: 10 }, // HSN Code
        { wch: 15 }, // Invoice Type
        { wch: 30 }, // NEW: Payment History (wider for multiple lines)
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "All Invoices");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });

      const timestamp = new Date().toISOString().slice(0, 10);
      let filename = `all_invoices_${timestamp}`;

      if (filters.financialYear || filters.invoiceType !== "all" || filters.status !== "all") {
        filename += "_filtered";
      }
      filename += ".xlsx";

      saveAs(blob, filename);
    } catch (error) {
      alert("Error exporting to Excel: " + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Helper functions
  const formatDateForExcel = (date) => {
    if (!date) return "";
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString("en-IN");
    } catch {
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "0";
    let numAmount = amount;
    if (typeof amount === "string") {
      numAmount = parseFloat(amount) || 0;
    }
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  const getInvoiceTypeText = (invoiceType) => {
    if (invoiceType === "Tax Invoice") return "Tax Invoice";
    if (invoiceType === "Cash Invoice") return "Cash Invoice";
    return invoiceType || "N/A";
  };

  // NEW: Get Status Badge (Only Pending/Booked)
  const getStatusBadge = (invoice) => {
    if (invoice.status === "Booked" || invoice.registered) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
          Booked
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1"></span>
          Pending
        </span>
      );
    }
  };

  // NEW: Get Payment Status Badge
// NEW: Get Payment Status Badge - FIXED VERSION
const getPaymentStatusBadge = (invoice) => {
  if (invoice.approvalStatus === "cancelled") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></span>
        Cancelled
      </span>
    );
  }

  const totalAmount = parseFloat(invoice.amountRaised) || 0;
  const receivedAmount = parseFloat(invoice.receivedAmount) || 0;
  
  // FIXED: Use proper floating point comparison with tolerance
  const isFullyPaid = Math.abs(totalAmount - receivedAmount) < 0.01; // 0.01 tolerance for floating point errors
  
  // FIXED: Also check if dueAmount is zero in database
  const dbDueAmount = parseFloat(invoice.dueAmount) || 0;
  const isDueAmountZero = Math.abs(dbDueAmount) < 0.01;

  if (isFullyPaid || isDueAmountZero) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></span>
        Fully Paid
      </span>
    );
  } else if (receivedAmount > 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1"></span>
        Partially Paid
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1"></span>
        Unpaid
      </span>
    );
  }
};

  // Financial year options
  const financialYearOptions = [
    { value: "2024-25", label: "2024-25" },
    { value: "2025-26", label: "2025-26" },
    { value: "2026-27", label: "2026-27" },
    { value: "2027-28", label: "2027-28" },
  ];

  // Cancel Invoice Function
  const handleCancelInvoice = async (invoice) => {
    if (invoice.receivedAmount > 0) {
      alert("❌ Cannot cancel invoice. Payment has already been received!");
      return;
    }

    if (!window.confirm("Are you sure you want to cancel this invoice?")) {
      return;
    }

    try {
      const invoiceRef = doc(db, "ContractInvoices", invoice.id);
      await updateDoc(invoiceRef, {
        approvalStatus: "cancelled",
        cancelledAt: new Date().toISOString(),
        status: "cancelled",
        approved: false,
      });

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? {
                ...inv,
                approvalStatus: "cancelled",
                status: "cancelled",
                approved: false,
              }
            : inv
        )
      );

      setFilteredInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? {
                ...inv,
                approvalStatus: "cancelled",
                status: "cancelled",
                approved: false,
              }
            : inv
        )
      );

      alert("❌ Invoice cancelled successfully!");
    } catch (error) {
      alert("❌ Error cancelling invoice: " + error.message);
    }
  };

// Payment Receive Function - UPDATED WITH DATE
const handleReceivePayment = async (invoice, receivedAmount, paymentDate) => {
  try {
    if (!receivedAmount || receivedAmount <= 0) {
      alert("Please enter valid amount");
      return;
    }

    if (!paymentDate) {
      alert("Please select payment date");
      return;
    }

    if (receivedAmount > invoice.dueAmount) {
      alert(`Received amount cannot be more than due amount (₹${invoice.dueAmount})`);
      return;
    }

    const invoiceRef = doc(db, "ContractInvoices", invoice.id);
    const newReceivedAmount = (invoice.receivedAmount || 0) + parseFloat(receivedAmount);
    const newDueAmount = invoice.dueAmount - parseFloat(receivedAmount);

    // Create payment record with selected date
    const paymentRecord = {
      amount: parseFloat(receivedAmount),
      date: paymentDate, // Use selected date instead of current date
      timestamp: new Date(paymentDate), // Use selected date for timestamp
      recordedAt: new Date().toISOString(), // Keep when it was actually recorded in system
    };

    let newStatus = invoice.status;
    if (newDueAmount === 0) {
      newStatus = "received";
    } else if (newReceivedAmount > 0) {
      newStatus = "partially_received";
    }

    const updateData = {
      receivedAmount: newReceivedAmount,
      dueAmount: newDueAmount,
      paymentHistory: [...(invoice.paymentHistory || []), paymentRecord],
      status: newStatus,
      approved: true,
      approvalStatus: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: "Auto-Approved via Payment",
    };

    await updateDoc(invoiceRef, updateData);

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoice.id ? { ...inv, ...updateData } : inv
      )
    );

    setFilteredInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoice.id ? { ...inv, ...updateData } : inv
      )
    );

    setPaymentModal({ isOpen: false, invoice: null });
    alert(`Payment of ₹${receivedAmount} recorded successfully for date ${paymentDate}!\n✅ Invoice auto-approved!`);
  } catch (error) {
    alert("Error recording payment: " + error.message);
  }
};

  const handleViewInvoice = (invoice) => {
    setInvoiceModal({
      isOpen: true,
      invoice: invoice,
      isViewOnly: true,
    });
  };

  const shouldDisableCancel = (invoice) => {
    return invoice.approvalStatus === "cancelled" || invoice.receivedAmount > 0;
  };

// Payment Modal Component - UPDATED WITH DATE SELECTION
const PaymentModal = ({ invoice, onClose, onSubmit }) => {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const dueAmount = invoice.dueAmount || 0;

  const handleSubmit = () => {
    if (!amount || amount <= 0) {
      alert("Please enter valid amount");
      return;
    }

    if (!paymentDate) {
      alert("Please select payment date");
      return;
    }

    if (amount > dueAmount) {
      alert(`Received amount cannot be more than due amount (₹${dueAmount})`);
      return;
    }

    onSubmit(invoice, amount, paymentDate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Receive Payment</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-gray-600">Invoice Number</label>
              <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <label className="text-gray-600">College</label>
              <p className="font-semibold text-gray-900 truncate">{invoice.collegeName}</p>
            </div>
            <div>
              <label className="text-gray-600">Total Amount</label>
              <p className="font-semibold text-gray-900">₹{invoice.amountRaised?.toLocaleString()}</p>
            </div>
            <div>
              <label className="text-gray-600">Due Amount</label>
              <p className="font-semibold text-red-600">₹{dueAmount.toLocaleString()}</p>
            </div>
          </div>

          {invoice.receivedAmount > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Already Received:</strong> ₹{invoice.receivedAmount.toLocaleString()}
              </p>
            </div>
          )}

          {/* Payment Date Field - NEW */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date *
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} // Can't select future dates
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Received *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter amount (max ₹${dueAmount})`}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                max={dueAmount}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!amount || amount <= 0 || !paymentDate}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
};
  // Statistics Cards Component
  const StatisticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
      {/* Total Invoices */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Cancelled Invoices */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Cancelled</p>
            <p className="text-2xl font-bold text-red-600">{stats.cancelledInvoices}</p>
          </div>
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
      </div>

      {/* Booked Invoices */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Booked</p>
            <p className="text-2xl font-bold text-green-600">{stats.bookedInvoices}</p>
          </div>
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Total Amount */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Amount</p>
            <p className="text-lg font-bold text-gray-900">₹{stats.totalAmount.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
      </div>

      {/* Received Amount */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Received</p>
            <p className="text-lg font-bold text-green-600">₹{stats.receivedAmount.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Due Amount */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Due Amount</p>
            <p className="text-lg font-bold text-red-600">₹{stats.dueAmount.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );

  // Invoice Type Statistics
  const InvoiceTypeStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Tax Invoices */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Tax Invoices</p>
            <p className="text-xl font-bold text-blue-600">{stats.taxInvoices}</p>
          </div>
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">T</span>
          </div>
        </div>
      </div>

      {/* Cash Invoices */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Cash Invoices</p>
            <p className="text-xl font-bold text-green-600">{stats.cashInvoices}</p>
          </div>
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-xs font-bold text-green-600">C</span>
          </div>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, invoices, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Invoices</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchInvoices}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-8 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Invoice Management
              </h1>
              <p className="text-gray-600">
                Manage invoice approvals and track payments • Total: {stats.totalInvoices} invoices • Showing: {filteredInvoices.length} invoices
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>

              <button
                onClick={exportToExcel}
                disabled={exportLoading || (filteredInvoices.length === 0 && invoices.length === 0)}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm"
              >
                {exportLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to Excel
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search invoices..."
                className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <StatisticsCards />
        <InvoiceTypeStats />
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Financial Year
                </label>
                <select
                  value={filters.financialYear}
                  onChange={(e) => setFilters({ ...filters, financialYear: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">All Years</option>
                  {financialYearOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Type
                </label>
                <select
                  value={filters.invoiceType}
                  onChange={(e) => setFilters({ ...filters, invoiceType: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="all">All Types</option>
                  <option value="tax">Tax Invoice</option>
                  <option value="cash">Cash Invoice</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="fully_paid">Fully Paid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={applyFilters}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
                >
                  Apply Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-600 mb-6">
              {invoices.length === 0
                ? "Get started by creating your first invoice."
                : "No invoices match your current filters."}
            </p>
            {invoices.length > 0 && (
              <button
                onClick={clearFilters}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Mobile Cards View */}
            <div className="lg:hidden">
              {filteredInvoices.map((invoice) => {
                const totalAmount = parseFloat(invoice.amountRaised) || 0;
                const receivedAmount = parseFloat(invoice.receivedAmount) || 0;
                const dbDueAmount = parseFloat(invoice.dueAmount) || 0;
                
                const calculatedDue = totalAmount - receivedAmount;
                const isFullyPaidByCalc = Math.abs(calculatedDue) < 0.01;
                const isFullyPaidByDB = Math.abs(dbDueAmount) < 0.01;
                const isFullyPaid = isFullyPaidByCalc || isFullyPaidByDB;
                
                const dueAmount = isFullyPaid ? 0 : (dbDueAmount || calculatedDue);
                const canCancel = !shouldDisableCancel(invoice);

                return (
                  <div key={invoice.id} className="p-6 border-b border-gray-100 last:border-b-0">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{invoice.invoiceNumber}</h3>
                        <p className="text-sm text-gray-600">{invoice.collegeName}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {getStatusBadge(invoice)}
                        {getPaymentStatusBadge(invoice)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <label className="text-gray-600">Total</label>
                        <p className="font-semibold">₹{totalAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-gray-600">Received</label>
                        <p className="font-semibold text-green-600">₹{receivedAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-gray-600">Due</label>
                        <p className="font-semibold text-red-600">₹{dueAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-gray-600">Type</label>
                        <p className="font-semibold">{getInvoiceTypeText(invoice.invoiceType)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        View
                      </button>

                      {!isFullyPaid && invoice.approvalStatus !== "cancelled" ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentModal({ isOpen: true, invoice });
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Receive
                        </button>
                      ) : isFullyPaid ? (
                        <span className="flex-1 bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium text-center">
                         Received
                        </span>
                      ) : null}

                      {canCancel ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelInvoice(invoice);
                          }}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      ) : invoice.approvalStatus === "cancelled" ? (
                        <span className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium text-center">
                          Cancelled
                        </span>
                      ) : (
                        <span className="flex-1 bg-gray-100 text-gray-400 px-3 py-2 rounded-lg text-sm font-medium text-center cursor-not-allowed">
                          Cancel
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Invoice Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((invoice) => {
                    const totalAmount = parseFloat(invoice.amountRaised) || 0;
                    const receivedAmount = parseFloat(invoice.receivedAmount) || 0;
                    const dbDueAmount = parseFloat(invoice.dueAmount) || 0;
                    
                    const calculatedDue = totalAmount - receivedAmount;
                    const isFullyPaidByCalc = Math.abs(calculatedDue) < 0.01;
                    const isFullyPaidByDB = Math.abs(dbDueAmount) < 0.01;
                    const isFullyPaid = isFullyPaidByCalc || isFullyPaidByDB;
                    
                    const dueAmount = isFullyPaid ? 0 : (dbDueAmount || calculatedDue);
                    const canCancel = !shouldDisableCancel(invoice);

                    return (
                      <tr
                        key={invoice.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-gray-900">{invoice.invoiceNumber}</h3>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {getInvoiceTypeText(invoice.invoiceType)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{invoice.collegeName}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {invoice.raisedDate && formatDateForExcel(invoice.raisedDate)}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Total:</span>
                              <span className="font-semibold">₹{totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Received:</span>
                              <span className="font-semibold text-green-600">₹{receivedAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Due:</span>
                              <span className="font-semibold text-red-600">₹{dueAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(invoice)}
                        </td>
                        <td className="px-6 py-4">
                          {getPaymentStatusBadge(invoice)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewInvoice(invoice);
                              }}
                              className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                            >
                              View
                            </button>

                            {!isFullyPaid && invoice.approvalStatus !== "cancelled" ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPaymentModal({ isOpen: true, invoice });
                                }}
                                className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                Receive
                              </button>
                            ) : isFullyPaid ? (
                              <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                                Received
                              </span>
                            ) : null}

                            {canCancel ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelInvoice(invoice);
                                }}
                                className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                Cancel
                              </button>
                            ) : invoice.approvalStatus === "cancelled" ? (
                              <span className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                                Cancelled
                              </span>
                            ) : (
                              <span 
                                className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
                                title="Cannot cancel - payment already received"
                              >
                                Cancel
                              </span>
                            )}

                            {invoice.paymentHistory?.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const history = invoice.paymentHistory
                                    .map(
                                      (p) =>
                                        `₹${p.amount} on ${new Date(
                                          p.date
                                        ).toLocaleDateString()}`
                                    )
                                    .join("\n");
                                  alert(`Payment History:\n${history}`);
                                }}
                                className="inline-flex items-center px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                History
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

{paymentModal.isOpen && (
  <PaymentModal
    invoice={paymentModal.invoice}
    onClose={() => setPaymentModal({ isOpen: false, invoice: null })}
    onSubmit={handleReceivePayment} // This now accepts 3 parameters
  />
)}
      {invoiceModal.isOpen && (
        <InvoiceModal
          invoice={invoiceModal.invoice}
          onClose={() =>
            setInvoiceModal({ isOpen: false, invoice: null, isViewOnly: true })
          }
          onRegister={() => {}}
          isViewOnly={invoiceModal.isViewOnly}
        />
      )}
    </div>
  );
};

export default ContractInvoicesTab;