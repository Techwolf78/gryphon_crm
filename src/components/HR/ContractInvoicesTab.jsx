import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    invoice: null,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    financialYear: "",
    invoiceType: "all",
    status: "all",
    startDate: "",
    endDate: "",
  });

  const [showFilters, setShowFilters] = useState(false);
  const filtersButtonRef = useRef(null);
  const dropdownRef = useRef(null);

  // Helper function to get payment amounts - consistent with InvoiceModal
  const getPaymentAmounts = (invoice) => {
    if (invoice.baseAmount !== undefined) {
      return {
        baseAmount: invoice.baseAmount,
        gstAmount: invoice.gstAmount || 0,
        totalAmount: invoice.netPayableAmount || invoice.amountRaised || 0,
      };
    }

    if (!invoice.paymentDetails || invoice.paymentDetails.length === 0) {
      const total =
        invoice.amount || invoice.netPayableAmount || invoice.amountRaised || 0;
      const baseAmount = total / 1.18;
      const gstAmount = total - baseAmount;

      return {
        baseAmount: Math.round(baseAmount),
        gstAmount: Math.round(gstAmount),
        totalAmount: total,
      };
    }

    const payment = invoice.paymentDetails[0];
    return {
      baseAmount: payment.baseAmount || payment.totalAmount / 1.18,
      gstAmount: payment.gstAmount || invoice.gstAmount || 0,
      totalAmount:
        payment.totalAmount ||
        invoice.netPayableAmount ||
        invoice.amountRaised ||
        0,
    };
  };

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
    pendingInvoices: 0,
  });

  const calculateStats = useCallback((invoiceData) => {
    const stats = {
      totalInvoices: invoiceData.length,
      cancelledInvoices: invoiceData.filter(inv => inv.approvalStatus === "cancelled").length,
      totalAmount: 0,
      receivedAmount: 0,
      dueAmount: 0,
      bookedInvoices: invoiceData.filter(inv => inv.status === "Booked" || inv.registered).length,
      cashInvoices: invoiceData.filter(inv => inv.invoiceType === "Cash Invoice").length,
      taxInvoices: invoiceData.filter(inv => inv.invoiceType === "Tax Invoice").length,
      approvedInvoices: invoiceData.filter(inv => inv.approved === true).length,
      pendingInvoices: invoiceData.filter(inv => inv.approvalStatus === "pending" && !inv.approved).length,
    };

    invoiceData.forEach(invoice => {
      const amounts = getPaymentAmounts(invoice);
      // stats.totalAmount += amounts.totalAmount || 0; // Remove this line
      stats.receivedAmount += parseFloat(invoice.receivedAmount) || 0;

      // Calculate total TDS amount from payment history
      const totalTdsAmount = invoice.paymentHistory?.reduce((sum, payment) => {
        return sum + (parseFloat(payment.tdsAmount) || 0);
      }, 0) || 0;

      // Due amount should account for TDS: totalAmount - (receivedAmount + totalTdsAmount)
      const calculatedDue = amounts.totalAmount - (parseFloat(invoice.receivedAmount) || 0) - totalTdsAmount;
      stats.dueAmount += parseFloat(invoice.dueAmount) || calculatedDue;
    });

    // Calculate total amount as received + due (this is what makes logical sense)
    stats.totalAmount = stats.receivedAmount + stats.dueAmount;

    setStats(stats);
  }, []);

  const fetchInvoices = useCallback(async () => {
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
  }, [calculateStats]);

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
      const dataToExport =
        filteredInvoices.length > 0 ? filteredInvoices : invoices;

      // Calculate GST breakdown function - SAME AS InvoiceExcelExport
      const calculateGSTBreakdown = (invoice) => {
        let gstAmount = invoice.gstAmount || 0;

        if (typeof gstAmount === "string") {
          gstAmount = parseFloat(gstAmount) || 0;
        }

        const gstType = invoice.gstType?.toLowerCase();

        if (gstType === "igst") {
          return {
            cgst: 0,
            sgst: 0,
            igst: gstAmount,
          };
        } else {
          return {
            cgst: gstAmount / 2,
            sgst: gstAmount / 2,
            igst: 0,
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
            month: "long",
          });
        } catch {
          return "Invalid Date";
        }
      };

      // Get Description from deliveryType - SAME AS InvoiceExcelExport
      const getDescription = (invoice) => {
        const deliveryType = invoice.deliveryType || "";

        switch (deliveryType.toUpperCase()) {
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
        if (typeof amount === "string") {
          numAmount = parseFloat(amount) || 0;
        }

        return Math.round(numAmount);
      };

      // Get HSN code - SAME AS InvoiceExcelExport
      const getHSNCode = () => {
        return "9984";
      };

      // Format payment history with dates and amounts - UPDATED WITH TDS
      const getPaymentHistoryText = (invoice) => {
        if (!invoice.paymentHistory || invoice.paymentHistory.length === 0) {
          return "No Payments";
        }

        // Sort payment history by date ascending (oldest first)
        const sortedPayments = [...invoice.paymentHistory].sort((a, b) => {
          const dateA = a.timestamp?.toDate
            ? a.timestamp.toDate()
            : new Date(a.date);
          const dateB = b.timestamp?.toDate
            ? b.timestamp.toDate()
            : new Date(b.date);
          return dateA - dateB;
        });

        // Format each payment: "₹Amount on Date" - USING THE STORED DATE
        return sortedPayments
          .map((payment) => {
            const paymentDate = payment.date; // Use the stored date directly
            const formattedDate = new Date(paymentDate).toLocaleDateString(
              "en-IN"
            );
            const amount = payment.amount || 0;
            const originalAmount = payment.originalAmount || amount;
            const tdsPercentage = payment.tdsPercentage || 0;
            const tdsAmount = payment.tdsAmount || 0;

            if (tdsPercentage > 0) {
              return `₹${formatIndianCurrency(amount)} received (after ${tdsPercentage}% TDS of ₹${formatIndianCurrency(tdsAmount)} from ₹${formatIndianCurrency(originalAmount)}) on ${formattedDate}`;
            } else {
              return `₹${formatIndianCurrency(amount)} on ${formattedDate}`;
            }
          })
          .join("\n");
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
        if (typeof netPayableAmount === "string") {
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
          Description: getDescription(invoice),
          "Total Value": formatCurrency(baseAmount),
          CGST: formatCurrency(gstBreakdown.cgst),
          SGST: formatCurrency(gstBreakdown.sgst),
          IGST: formatCurrency(gstBreakdown.igst),
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
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "All Invoices");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });

      const timestamp = new Date().toISOString().slice(0, 10);
      let filename = `all_invoices_${timestamp}`;

      if (
        filters.financialYear ||
        filters.invoiceType !== "all" ||
        filters.status !== "all"
      ) {
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

  // Payment Receive Function - UPDATED WITH DATE AND TDS
  const handleReceivePayment = async (invoice, receivedAmount, paymentDate, tdsPercentage = 0, originalAmount = 0, tdsAmount = 0, tdsBaseType = "base") => {
    try {
      const actualReceived = parseFloat(receivedAmount) || 0;
      const tdsPercent = parseFloat(tdsPercentage) || 0;

      if (!actualReceived || actualReceived <= 0) {
        alert("Please enter valid received amount");
        return;
      }

      if (!paymentDate) {
        alert("Please select payment date");
        return;
      }

      // Calculate original amount if not provided
      const calculatedOriginal = tdsPercent > 0 ? actualReceived / (1 - tdsPercent / 100) : actualReceived;
      const finalOriginalAmount = originalAmount || calculatedOriginal;
      const finalTdsAmount = tdsAmount || (finalOriginalAmount - actualReceived);

      if (finalOriginalAmount > invoice.dueAmount) {
        alert(
          `Calculated original amount (₹${finalOriginalAmount.toFixed(2)}) cannot be more than due amount (₹${invoice.dueAmount})`
        );
        return;
      }

      const invoiceRef = doc(db, "ContractInvoices", invoice.id);
      const newReceivedAmount =
        (invoice.receivedAmount || 0) + actualReceived;
      const newDueAmount = invoice.dueAmount - finalOriginalAmount;

      // Create payment record with TDS info
      const paymentRecord = {
        amount: actualReceived, // Amount actually received (after TDS)
        originalAmount: finalOriginalAmount, // Original billed amount before TDS
        tdsPercentage: tdsPercent,
        tdsAmount: finalTdsAmount,
        tdsBaseType: tdsBaseType, // "base" or "total"
        date: paymentDate,
        timestamp: new Date(paymentDate),
        recordedAt: new Date().toISOString(),
      };

      let newStatus = invoice.status;
      if (newDueAmount <= 0) {
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

      const tdsMessage = tdsPercent > 0
        ? `\nTDS Deducted: ₹${finalTdsAmount.toFixed(2)} (${tdsPercent}%)`
        : "";

      alert(
        `Payment recorded successfully!\n✅ Amount Received: ₹${actualReceived.toLocaleString()}${tdsMessage}\n📅 Date: ${paymentDate}\n✅ Invoice auto-approved!`
      );
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

  // Payment History Modal Component
  const PaymentHistoryModal = ({ invoice, onClose }) => {
    if (!invoice || !invoice.paymentHistory) return null;

    // Sort payment history by date (newest first)
    const sortedPayments = [...invoice.paymentHistory].sort((a, b) =>
      new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp)
    );

    return (
      <div className="fixed inset-0 bg-transparent backdrop-blur-md bg-opacity-50 flex items-center justify-center z-54 p-3">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          {/* Fixed Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2 rounded-t-lg flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Payment History</h2>
                <p className="text-blue-100 text-xs">
                  {invoice.invoiceNumber} • {invoice.collegeName}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-blue-200 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3">
              {sortedPayments.length === 0 ? (
                <div className="text-center py-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-xs">No payment history available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Summary - More Compact */}
                  <div className="bg-gray-50 rounded p-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Total Payments</p>
                        <p className="text-sm font-bold text-gray-900">{sortedPayments.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Total Received</p>
                        <p className="text-xs font-bold text-green-600">
                          ₹{sortedPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Total TDS</p>
                        <p className="text-xs font-bold text-red-600">
                          ₹{sortedPayments.reduce((sum, p) => sum + (p.tdsAmount || 0), 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Original Amount</p>
                        <p className="text-xs font-bold text-blue-600">
                          ₹{sortedPayments.reduce((sum, p) => sum + (p.originalAmount || p.amount || 0), 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment History Table - More Compact */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date & Time
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount Received
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            TDS Rate
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            TDS Amount
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            TDS Base
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Billed Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedPayments.map((payment, index) => {
                          const paymentDate = new Date(payment.date || payment.timestamp).toLocaleDateString('en-IN');
                          const paymentTime = new Date(payment.date || payment.timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          const amount = payment.amount || 0;
                          const tdsPercentage = payment.tdsPercentage || 0;
                          const tdsAmount = payment.tdsAmount || 0;
                          const originalAmount = payment.originalAmount || amount;
                          const tdsBaseType = payment.tdsBaseType || 'base';

                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-2 py-1.5 text-xs text-gray-900">
                                <div className="flex items-center">
                                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-1.5">
                                    <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <div className="font-medium text-xs">{paymentDate}</div>
                                    <div className="text-xs text-gray-500">{paymentTime}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-xs">
                                <span className="font-semibold text-green-600">
                                  ₹{amount.toLocaleString()}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-xs">
                                {tdsPercentage >= 0 ? (
                                  <span className="font-bold text-red-700">{tdsPercentage}%</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-xs">
                                {tdsAmount >= 0 ? (
                                  <span className="font-bold text-red-700">₹{tdsAmount.toFixed(2)}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-xs">
                                {tdsPercentage >= 0 ? (
                                  <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-medium">
                                    {tdsBaseType === 'base' ? 'Base Amount' : 'Total Amount'}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-xs">
                                <span className="font-semibold text-blue-600">
                                  ₹{originalAmount.toLocaleString()}
                                </span>
                                {originalAmount !== amount && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    (Before TDS deduction)
                                  </div>
                                )}
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
          </div>

          {/* Fixed Footer */}
          <div className="px-3 py-2 bg-gray-50 rounded-b-lg flex justify-end flex-shrink-0">
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };
  const PaymentModal = ({ invoice, onClose, onSubmit }) => {
    const [amount, setAmount] = useState("");
    const [paymentDate, setPaymentDate] = useState(
      new Date().toISOString().split("T")[0]
    ); // Default to today
    const [tdsPercentage, setTdsPercentage] = useState(""); // TDS percentage (0-10)
    const [tdsBaseType, setTdsBaseType] = useState("base"); // "base" or "total"
    const amounts = getPaymentAmounts(invoice);
    const dueAmount = invoice.dueAmount || amounts.totalAmount;

    // Calculate TDS breakdown from received amount
    const calculateTDSBreakdown = () => {
      const receivedAmount = parseFloat(amount) || 0;
      const tdsPercent = parseFloat(tdsPercentage) || 0;

      if (tdsPercent === 0) {
        return {
          originalAmount: receivedAmount,
          tdsAmount: 0,
          receivedAfterTDS: receivedAmount,
          baseAmount: receivedAmount,
          gstAmount: 0,
        };
      }

      // Calculate original amount before TDS: received = original * (1 - tds%)
      // So: original = received / (1 - tds%)
      const originalAmount = receivedAmount / (1 - tdsPercent / 100);
      const tdsAmount = originalAmount - receivedAmount;

      // Calculate base amount and GST (assuming 18% GST)
      const gstRate = 0.18;
      let baseAmount, gstAmount, totalBilled;

      if (tdsBaseType === "base") {
        // TDS calculated on base amount
        // originalAmount here is the base amount
        baseAmount = originalAmount;
        gstAmount = baseAmount * gstRate;
        totalBilled = baseAmount + gstAmount;
      } else {
        // TDS calculated on total amount including GST
        // originalAmount here is the total billed amount
        totalBilled = originalAmount;
        baseAmount = totalBilled / (1 + gstRate);
        gstAmount = totalBilled - baseAmount;
      }

      return {
        originalAmount: tdsBaseType === "base" ? baseAmount : totalBilled,
        tdsAmount: tdsAmount,
        receivedAfterTDS: receivedAmount,
        baseAmount: baseAmount,
        gstAmount: gstAmount,
        totalBilled: totalBilled,
      };
    };

    const tdsBreakdown = calculateTDSBreakdown();

    const handleSubmit = () => {
      const receivedAmount = parseFloat(amount) || 0;
      const tdsPercent = parseFloat(tdsPercentage) || 0;

      if (!receivedAmount || receivedAmount <= 0) {
        alert("Please enter valid received amount");
        return;
      }

      if (!paymentDate) {
        alert("Please select payment date");
        return;
      }

      if (tdsPercent < 0 || tdsPercent > 10) {
        alert("TDS percentage must be between 0 and 10");
        return;
      }

      // Calculate original amount before TDS
      const originalAmount = tdsPercent > 0 ? receivedAmount / (1 - tdsPercent / 100) : receivedAmount;
      const tdsAmount = originalAmount - receivedAmount;

      // Calculate the total billed amount for validation
      const totalBilledAmount = tdsBaseType === "base" ? originalAmount * 1.18 : originalAmount;

      // Check if the calculated total billed amount exceeds due amount
      if (totalBilledAmount > dueAmount) {
        alert(`Calculated total billed amount (₹${totalBilledAmount.toFixed(2)}) exceeds due amount (₹${dueAmount})`);
        return;
      }

      onSubmit(invoice, receivedAmount, paymentDate, tdsPercent, originalAmount, tdsAmount, tdsBaseType);
    };

    return (
      <div className="fixed inset-0 bg-transparent backdrop-blur-md bg-opacity-50 flex items-center justify-center z-54 p-3">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm transform transition-all">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Receive Payment
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
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
          </div>

          <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div>
                <label className="text-gray-600 text-xs">Invoice Number</label>
                <p className="font-semibold text-gray-900 text-xs">
                  {invoice.invoiceNumber}
                </p>
              </div>
              <div>
                <label className="text-gray-600 text-xs">College</label>
                <p className="font-semibold text-gray-900 text-xs truncate">
                  {invoice.collegeName}
                </p>
              </div>
              <div>
                <label className="text-gray-600 text-xs">Total Amount</label>
                <p className="font-semibold text-gray-900 text-xs">
                  ₹{amounts.totalAmount?.toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-gray-600 text-xs">Due Amount</label>
                <p className="font-semibold text-red-600 text-xs">
                  ₹{dueAmount.toLocaleString()}
                </p>
              </div>
            </div>

            {invoice.receivedAmount > 0 && (
              <div className="bg-blue-50 p-1.5 rounded">
                <p className="text-xs text-blue-700">
                  <strong>Already Received:</strong> ₹
                  {invoice.receivedAmount.toLocaleString()}
                </p>
              </div>
            )}

            {/* Payment Date Field - FIRST */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]} // Can't select future dates
                className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                TDS Percentage (0-10%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={tdsPercentage}
                  onChange={(e) => setTdsPercentage(e.target.value)}
                  placeholder="Enter TDS % (0-10)"
                  min="0"
                  max="10"
                  step="0.01"
                  className="w-full pl-2 pr-5 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <span className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                  %
                </span>
              </div>
            </div>

            {/* TDS Base Type Radio Buttons - THIRD */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                TDS Calculation Base
              </label>
              <div className="space-y-0.5">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="tds-base"
                    name="tdsBaseType"
                    value="base"
                    checked={tdsBaseType === "base"}
                    onChange={(e) => setTdsBaseType(e.target.value)}
                    className="h-2.5 w-2.5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="tds-base" className="ml-1 text-xs text-gray-700">
                    Base Amount (excluding GST) (₹{amounts.baseAmount?.toLocaleString()})
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="tds-total"
                    name="tdsBaseType"
                    value="total"
                    checked={tdsBaseType === "total"}
                    onChange={(e) => setTdsBaseType(e.target.value)}
                    className="h-2.5 w-2.5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="tds-total" className="ml-1 text-xs text-gray-700">
                    Total Amount (including GST) (₹{amounts.totalAmount?.toLocaleString()})
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Amount Received (After TDS) *
              </label>
              <div className="relative">
                <span className="absolute left-1.5 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Enter received amount (max ₹${dueAmount})`}
                  className="w-full pl-5 pr-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  max={dueAmount}
                />
              </div>
            </div>

            {/* TDS Calculation Display */}
            {amount && tdsPercentage && (
              <div className="bg-blue-50 p-1.5 rounded">
                <div className="text-xs text-blue-700 space-y-0.5">
                  <div className="flex justify-between">
                    <span>{tdsBaseType === "base" ? "Base Amount Billed:" : "Total Amount Billed:"}</span>
                    <span className="font-semibold">₹{(parseFloat(tdsBaseType === "base" ? amounts.baseAmount : amounts.totalAmount) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TDS Deducted ({tdsPercentage}%):</span>
                    <span className="font-semibold text-red-600">
                      -₹{tdsBreakdown.tdsAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-0.5 mt-0.5">
                    <span>Amount Received:</span>
                    <span className="font-semibold">₹{parseFloat(amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Due Amount:</span>
                    <span className={`font-semibold ${(tdsBaseType === "base" ? tdsBreakdown.totalBilled : tdsBreakdown.originalAmount) > dueAmount ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{Math.max(0, dueAmount - (tdsBaseType === "base" ? tdsBreakdown.totalBilled : tdsBreakdown.originalAmount)).toFixed(2)}
                    </span>
                  </div>
                  {(tdsBaseType === "base" ? tdsBreakdown.totalBilled : tdsBreakdown.originalAmount) > dueAmount && (
                    <p className="text-xs text-red-600 mt-0.5">
                      ⚠️ Calculated amount exceeds due amount
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="px-2 py-1.5 bg-gray-50 rounded-b-lg flex gap-1.5">
            <button
              onClick={onClose}
              className="flex-1 px-2 py-1 text-gray-700 bg-white border border-gray-300 rounded text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!amount || amount <= 0 || !paymentDate}
              className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Record Payment
            </button>
          </div>
        </div>
      </div>
    );
  };
  // Helper function to format currency in Indian numbering system with abbreviations
  const formatIndianCurrency = (amount) => {
    if (!amount && amount !== 0) return "0";

    let numAmount = Number(amount);
    if (isNaN(numAmount)) return "0";

    // For amounts less than 1 lakh, show regular formatting
    if (numAmount < 100000) {
      return new Intl.NumberFormat('en-IN').format(numAmount);
    }

    // For amounts >= 1 lakh, use abbreviations
    if (numAmount >= 10000000000) { // 1000 Cr and above
      return `${(numAmount / 10000000).toFixed(1)}K Cr`;
    } else if (numAmount >= 1000000000) { // 100 Cr to 999 Cr
      return `${(numAmount / 10000000).toFixed(1)} Cr`;
    } else if (numAmount >= 100000000) { // 10 Cr to 99 Cr
      return `${(numAmount / 10000000).toFixed(1)} Cr`;
    } else if (numAmount >= 10000000) { // 1 Cr to 9.9 Cr
      return `${(numAmount / 10000000).toFixed(1)} Cr`;
    } else if (numAmount >= 1000000) { // 10 Lakh to 99 Lakh
      return `${(numAmount / 100000).toFixed(0)} Lakh`;
    } else { // 1 Lakh to 9.9 Lakh
      return `${(numAmount / 100000).toFixed(1)} Lakh`;
    }
  };

  // Statistics Cards Component
  const StatisticsCards = () => (
    <>
      {/* First Row: Tax, Cash, Approved, Total Invoices, Cancelled, Booked */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 mb-2">
        {/* Tax Invoices */}
        <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tax Invoices</p>
              <p className="text-xl font-bold text-blue-600 mt-0.5">
                {stats.taxInvoices}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Tax documents</p>
            </div>
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Cash Invoices */}
        <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cash Invoices</p>
              <p className="text-xl font-bold text-green-600 mt-0.5">
                {stats.cashInvoices}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Cash payments</p>
            </div>
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Approved Invoices */}
        <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approved</p>
              <p className="text-xl font-bold text-purple-600 mt-0.5">
                {stats.approvedInvoices}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Verified</p>
            </div>
            <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Invoices */}
        <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Invoices</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {stats.totalInvoices}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">All time</p>
            </div>
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Cancelled Invoices */}
        <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cancelled</p>
              <p className="text-xl font-bold text-red-600 mt-0.5">
                {stats.cancelledInvoices}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Voided</p>
            </div>
            <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 9l6 6m0-6l-6 6"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Booked Invoices */}
        <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Booked</p>
              <p className="text-xl font-bold text-green-600 mt-0.5">
                {stats.bookedInvoices}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Confirmed</p>
            </div>
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Total Amount, Received, Due Amount */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        {/* Total Amount */}
        <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Amount</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                ₹{formatIndianCurrency(stats.totalAmount)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Invoice value</p>
            </div>
            <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Received Amount */}
        <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Received</p>
              <p className="text-sm font-bold text-green-600 mt-0.5">
                ₹{formatIndianCurrency(stats.receivedAmount)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Payments collected</p>
              <div className="mt-0.5 bg-gray-200 rounded-full h-1">
                <div
                  className="bg-green-500 h-1 rounded-full transition-all duration-300"
                  style={{
                    width: stats.totalAmount > 0 ? `${(stats.receivedAmount / stats.totalAmount) * 100}%` : '0%'
                  }}
                  title={`Payment Progress: ${(stats.totalAmount > 0 ? ((stats.receivedAmount / stats.totalAmount) * 100).toFixed(1) : 0)}%`}
                ></div>
              </div>
            </div>
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Due Amount */}
        <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due Amount</p>
              <p className="text-sm font-bold text-red-600 mt-0.5">
                ₹{formatIndianCurrency(stats.dueAmount)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Outstanding</p>
              <div className="mt-0.5 bg-gray-200 rounded-full h-1">
                <div
                  className="bg-red-500 h-1 rounded-full transition-all duration-300"
                  style={{
                    width: stats.totalAmount > 0 ? `${(stats.dueAmount / stats.totalAmount) * 100}%` : '0%'
                  }}
                  title={`Outstanding: ${(stats.totalAmount > 0 ? ((stats.dueAmount / stats.totalAmount) * 100).toFixed(1) : 0)}%`}
                ></div>
              </div>
            </div>
            <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  );



  // Fetch invoices on component mount
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showFilters &&
        filtersButtonRef.current &&
        dropdownRef.current &&
        !filtersButtonRef.current.contains(event.target) &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-4 h-4 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-red-800 mb-1">
              Error Loading Invoices
            </h3>
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <button
              onClick={fetchInvoices}
              className="bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
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
        <div className="px-3 py-1.5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1.5">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h1 className="text-base font-bold text-gray-900">
                  Invoice Management
                </h1>
                <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  <svg className="w-2 h-2 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Secure
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Manage invoice approvals and track payments • Total:{" "}
                {invoices.length} invoices • Showing:{" "}
                {filteredInvoices.length} invoices
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-1.5 relative">
              <div className="relative">
                <button
                  ref={filtersButtonRef}
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center justify-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <svg
                    className="w-2.5 h-2.5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  Filters
                  <svg
                    className={`w-2.5 h-2.5 ml-1 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Filters Dropdown */}
                {showFilters && (
                  <div
                    ref={dropdownRef}
                    className="absolute top-full right-8 mt-1 w-72 max-h-80 bg-white rounded-md shadow-md border border-gray-200 z-50 overflow-y-auto"
                  >
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-gray-900">Filters</h3>
                        <button
                          onClick={() => setShowFilters(false)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              Financial Year
                            </label>
                            <select
                              value={filters.financialYear}
                              onChange={(e) =>
                                setFilters({ ...filters, financialYear: e.target.value })
                              }
                              className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              Invoice Type
                            </label>
                            <select
                              value={filters.invoiceType}
                              onChange={(e) =>
                                setFilters({ ...filters, invoiceType: e.target.value })
                              }
                              className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            >
                              <option value="all">All Types</option>
                              <option value="tax">Tax Invoice</option>
                              <option value="cash">Cash Invoice</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              Status
                            </label>
                            <select
                              value={filters.status}
                              onChange={(e) =>
                                setFilters({ ...filters, status: e.target.value })
                              }
                              className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            >
                              <option value="all">All Status</option>
                              <option value="approved">Approved</option>
                              <option value="pending_approval">Pending</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="fully_paid">Fully Paid</option>
                              <option value="partially_paid">Partially Paid</option>
                              <option value="unpaid">Unpaid</option>
                            </select>
                          </div>
                        </div>

                        {/* Date Range Filters */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={filters.startDate}
                              onChange={(e) =>
                                setFilters({ ...filters, startDate: e.target.value })
                              }
                              className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              End Date
                            </label>
                            <input
                              type="date"
                              value={filters.endDate}
                              onChange={(e) =>
                                setFilters({ ...filters, endDate: e.target.value })
                              }
                              className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>

                        <div className="flex gap-1.5 pt-2 border-t border-gray-200">
                          <button
                            onClick={() => {
                              applyFilters();
                              setShowFilters(false);
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs font-medium transition-colors"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => {
                              clearFilters();
                              setShowFilters(false);
                            }}
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-1 px-2 rounded text-xs font-medium transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={exportToExcel}
                disabled={
                  exportLoading ||
                  (filteredInvoices.length === 0 && invoices.length === 0)
                }
                className="inline-flex items-center justify-center px-2 py-1 bg-gradient-to-r from-green-600 to-green-700 text-white rounded hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 shadow-sm text-xs font-medium"
              >
                {exportLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-2.5 w-2.5 border-t-2 border-b-2 border-white mr-1"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-2.5 h-2.5 mr-1"
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
                    Export to Excel
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-1.5">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none">
                <svg
                  className="h-3.5 w-3.5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search invoices..."
                className="block w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="py-0.5">
        <div className="flex items-center justify-between mb-0.5">
          <h2 className="text-xs font-semibold text-gray-900">Overview</h2>
          <span className="text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
        <StatisticsCards />
      </div>

      {/* Main Content */}
      <div className="pb-1.5">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
              <svg
                className="w-5 h-5 text-gray-400"
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
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-0.5">
              No invoices found
            </h3>
            <p className="text-xs text-gray-600 mb-1.5">
              {invoices.length === 0
                ? "Get started by creating your first invoice."
                : "No invoices match your current filters."}
            </p>
            {invoices.length > 0 && (
              <button
                onClick={clearFilters}
                className="bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 transition-colors font-medium text-xs"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="px-2.5 py-1.5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Invoice Management</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Track approvals and payments • {filteredInvoices.length} of {invoices.length} invoices
                  </p>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded-full">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live Data</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden">
              {filteredInvoices.map((invoice) => {
                const amounts = getPaymentAmounts(invoice);
                const totalAmount = amounts.totalAmount;
                const receivedAmount = parseFloat(invoice.receivedAmount) || 0;
                const dbDueAmount = parseFloat(invoice.dueAmount) || 0;

                // Calculate total TDS amount from payment history
                const totalTdsAmount = invoice.paymentHistory?.reduce((sum, payment) => {
                  return sum + (parseFloat(payment.tdsAmount) || 0);
                }, 0) || 0;

                // Due amount should account for TDS: totalAmount - (receivedAmount + totalTdsAmount)
                const calculatedDue = totalAmount - (receivedAmount + totalTdsAmount);
                const isFullyPaidByCalc = Math.abs(calculatedDue) < 0.01;
                const isFullyPaidByDB = Math.abs(dbDueAmount) < 0.01;
                const isFullyPaid = isFullyPaidByCalc || isFullyPaidByDB;

                const dueAmount = isFullyPaid
                  ? 0
                  : dbDueAmount || calculatedDue;
                const canCancel = !shouldDisableCancel(invoice);

                return (
                  <div
                    key={invoice.id}
                    className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {invoice.invoiceNumber}
                          </h3>
                          <p className="text-xs text-gray-600">
                            {invoice.collegeName}
                          </p>
                          <div className="flex items-center space-x-1 mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {getInvoiceTypeText(invoice.invoiceType)}
                            </span>
                            {invoice.approvalStatus === "cancelled" && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Cancelled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {getStatusBadge(invoice)}
                        {getPaymentStatusBadge(invoice)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-3 bg-gray-50 rounded-lg p-2">
                      <div>
                        <label className="text-gray-600 text-xs font-medium">Total Amount</label>
                        <p className="font-bold text-gray-900">
                          ₹{formatIndianCurrency(totalAmount)}
                        </p>
                      </div>
                      <div>
                        <label className="text-gray-600 text-xs font-medium">Received</label>
                        <p className="font-bold text-green-600">
                          ₹{formatIndianCurrency(receivedAmount)}
                        </p>
                      </div>
                      <div>
                        <label className="text-gray-600 text-xs font-medium">Due Amount</label>
                        <p className="font-bold text-red-600">
                          ₹{formatIndianCurrency(dueAmount)}
                        </p>
                      </div>
                      <div>
                        <label className="text-gray-600 text-xs font-medium">Date</label>
                        <p className="font-medium text-gray-900 text-sm">
                          {invoice.raisedDate && formatDateForExcel(invoice.raisedDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="flex-1 inline-flex items-center justify-center px-2 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>

                      {!isFullyPaid && invoice.approvalStatus !== "cancelled" ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentModal({ isOpen: true, invoice });
                          }}
                          className="flex-1 inline-flex items-center justify-center px-2 py-1.5 border border-transparent rounded text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                          Receive
                        </button>
                      ) : isFullyPaid ? (
                        <div className="flex-1 inline-flex items-center justify-center px-2 py-1.5 rounded text-xs font-medium bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Received
                        </div>
                      ) : null}

                      {canCancel ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelInvoice(invoice);
                          }}
                          className="flex-1 inline-flex items-center justify-center px-2 py-1.5 border border-transparent rounded text-xs font-medium text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </button>
                      ) : invoice.approvalStatus === "cancelled" ? (
                        <div className="flex-1 inline-flex items-center justify-center px-2 py-1.5 rounded text-xs font-medium bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Cancelled
                        </div>
                      ) : (
                        <div className="flex-1 inline-flex items-center justify-center px-2 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-400 cursor-not-allowed shadow-sm">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Cancel
                        </div>
                      )}

                      {invoice.paymentHistory?.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setHistoryModal({ isOpen: true, invoice });
                          }}
                          className="flex-1 inline-flex items-center justify-center px-2 py-1.5 border border-transparent rounded text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          History
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Invoice Details</span>
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Amount Breakdown</span>
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Approval Status</span>
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                        <span>Payment Status</span>
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Actions</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice, index) => {
                    const amounts = getPaymentAmounts(invoice);
                    const totalAmount = amounts.totalAmount;
                    const receivedAmount = parseFloat(invoice.receivedAmount) || 0;
                    const dbDueAmount = parseFloat(invoice.dueAmount) || 0;

                    // Calculate total TDS amount from payment history
                    const totalTdsAmount = invoice.paymentHistory?.reduce((sum, payment) => {
                      return sum + (parseFloat(payment.tdsAmount) || 0);
                    }, 0) || 0;

                    // Due amount should account for TDS: totalAmount - (receivedAmount + totalTdsAmount)
                    const calculatedDue = totalAmount - (receivedAmount + totalTdsAmount);
                    const isFullyPaidByCalc = Math.abs(calculatedDue) < 0.01;
                    const isFullyPaidByDB = Math.abs(dbDueAmount) < 0.01;
                    const isFullyPaid = isFullyPaidByCalc || isFullyPaidByDB;

                    const dueAmount = isFullyPaid
                      ? 0
                      : dbDueAmount || calculatedDue;
                    const canCancel = !shouldDisableCancel(invoice);

                    return (
                      <tr
                        key={invoice.id}
                        className={`group hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ease-in-out cursor-pointer ${
                          invoice.approvalStatus === "cancelled" ? 'bg-red-50/30 border-l-4 border-l-red-400' : ''
                        } ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        {/* Invoice Details */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                {invoice.invoiceNumber}
                              </div>
                              <div className="text-xs text-gray-600 font-medium">
                                {invoice.collegeName}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {getInvoiceTypeText(invoice.invoiceType)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {invoice.raisedDate && formatDateForExcel(invoice.raisedDate)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Amount Breakdown */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Total:</span>
                              <span className="text-xs font-bold text-gray-900">
                                ₹{formatIndianCurrency(totalAmount)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Received:</span>
                              <span className="text-xs font-semibold text-green-600">
                                ₹{formatIndianCurrency(receivedAmount)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Due:</span>
                              <span className="text-xs font-semibold text-red-600">
                                ₹{formatIndianCurrency(dueAmount)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Approval Status */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          {invoice.approvalStatus === "cancelled" ? (
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              Cancelled
                            </div>
                          ) : invoice.approved || receivedAmount > 0 ? (
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Approved
                            </div>
                          ) : (
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 012 0zm-1 3a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Pending
                            </div>
                          )}
                        </td>

                        {/* Payment Status */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          {getPaymentStatusBadge(invoice)}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewInvoice(invoice);
                              }}
                              className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="View invoice details"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>

                            {!isFullyPaid && invoice.approvalStatus !== "cancelled" ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPaymentModal({ isOpen: true, invoice });
                                }}
                                className="inline-flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                                title="Receive payment"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                                Receive
                              </button>
                            ) : isFullyPaid ? (
                              <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Received
                              </div>
                            ) : null}

                            {canCancel ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelInvoice(invoice);
                                }}
                                className="inline-flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-sm hover:shadow-md"
                                title="Cancel invoice"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel
                              </button>
                            ) : invoice.approvalStatus === "cancelled" ? (
                              <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                Cancelled
                              </div>
                            ) : (
                              <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-400 cursor-not-allowed shadow-sm">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Cancel
                              </div>
                            )}

                            {invoice.paymentHistory?.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHistoryModal({ isOpen: true, invoice });
                                }}
                                className="inline-flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-sm hover:shadow-md"
                                title="View payment history"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
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

            {/* Table Footer */}
            <div className="px-2.5 py-1.5 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center space-x-2.5">
                  <span>Showing {filteredInvoices.length} of {invoices.length} invoices</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span>Real-time updates</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
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
      {historyModal.isOpen && (
        <PaymentHistoryModal
          invoice={historyModal.invoice}
          onClose={() => setHistoryModal({ isOpen: false, invoice: null })}
        />
      )}
    </div>
  );
};

export default ContractInvoicesTab;
