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

  // Filter states
  const [filters, setFilters] = useState({
    financialYear: "",
    invoiceType: "all",
    status: "all",
    startDate: "",
    endDate: "",
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

        // All invoice types including Proforma
        setInvoices(data);
        setFilteredInvoices(data);
      } else {
        setInvoices([]);
        setFilteredInvoices([]);
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...invoices];

    // Financial Year filter
    if (filters.financialYear) {
      filtered = filtered.filter((invoice) => {
        const invoiceDate = invoice.raisedDate?.toDate
          ? invoice.raisedDate.toDate()
          : new Date(invoice.raisedDate);
        const year = invoiceDate.getFullYear();
        const month = invoiceDate.getMonth() + 1;

        // Financial year logic: April to March
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
        } else if (filters.invoiceType === "proforma") {
          return invoice.invoiceType === "Proforma Invoice";
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
    setFilteredInvoices(invoices);
  };

  // Export to Excel with filters
  const exportToExcel = async () => {
    try {
      setExportLoading(true);

      // Use filtered invoices for export
      const dataToExport =
        filteredInvoices.length > 0 ? filteredInvoices : invoices;

      // Prepare data for Excel
      const excelData = dataToExport.map((invoice) => {
        const totalAmount = invoice.amountRaised || 0;
        const receivedAmount = invoice.receivedAmount || 0;
        const dueAmount = invoice.dueAmount || totalAmount - receivedAmount;

        return {
          "Invoice Number": invoice.invoiceNumber || "N/A",
          "Invoice Type": getInvoiceTypeText(invoice.invoiceType),
          "Invoice Date": formatDateForExcel(invoice.raisedDate),
          "College Name": invoice.collegeName || "N/A",
          "College Code": invoice.collegeCode || "N/A",
          "Project Code": invoice.projectCode || "N/A",
          Course: invoice.course || "N/A",
          Year: invoice.year || "N/A",
          "Student Count": invoice.studentCount || 0,
          "Total Amount": formatCurrency(totalAmount),
          "Received Amount": formatCurrency(receivedAmount),
          "Due Amount": formatCurrency(dueAmount),
          "Payment Status": getPaymentStatusText(invoice),
          "Approval Status": getApprovalStatusText(invoice),
          "GST Number": invoice.gstNumber || "N/A",
          "GST Type": invoice.gstType || "N/A",
          Installment: invoice.installment || "N/A",
          "Base Amount": formatCurrency(invoice.baseAmount || 0),
          "SGST Amount": formatCurrency(invoice.sgstAmount || 0),
          "CGST Amount": formatCurrency(invoice.cgstAmount || 0),
          "IGST Amount": formatCurrency(invoice.igstAmount || 0),
          "Total GST": formatCurrency(
            (invoice.sgstAmount || 0) +
              (invoice.cgstAmount || 0) +
              (invoice.igstAmount || 0)
          ),
          "Net Payable": formatCurrency(invoice.netPayableAmount || 0),
          "TPO Name": invoice.tpoName || "N/A",
          "TPO Email": invoice.tpoEmail || "N/A",
          "TPO Phone": invoice.tpoPhone || "N/A",
          Remarks: invoice.remarks || "N/A",
        };
      });

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const colWidths = [
        { wch: 20 }, // Invoice Number
        { wch: 15 }, // Invoice Type
        { wch: 12 }, // Invoice Date
        { wch: 25 }, // College Name
        { wch: 15 }, // College Code
        { wch: 20 }, // Project Code
        { wch: 20 }, // Course
        { wch: 10 }, // Year
        { wch: 12 }, // Student Count
        { wch: 12 }, // Total Amount
        { wch: 12 }, // Received Amount
        { wch: 12 }, // Due Amount
        { wch: 15 }, // Payment Status
        { wch: 15 }, // Approval Status
        { wch: 20 }, // GST Number
        { wch: 10 }, // GST Type
        { wch: 15 }, // Installment
        { wch: 12 }, // Base Amount
        { wch: 12 }, // SGST Amount
        { wch: 12 }, // CGST Amount
        { wch: 12 }, // IGST Amount
        { wch: 12 }, // Total GST
        { wch: 12 }, // Net Payable
        { wch: 20 }, // TPO Name
        { wch: 25 }, // TPO Email
        { wch: 15 }, // TPO Phone
        { wch: 30 }, // Remarks
      ];
      ws["!cols"] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "All Invoices");

      // Generate Excel file
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });

      // Create filename with timestamp and filter info
      const timestamp = new Date().toISOString().slice(0, 10);
      let filename = `all_invoices_${timestamp}`;

      // Add filter info to filename if any filter is active
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

  // Helper functions for export and filters
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

  const getPaymentStatusText = (invoice) => {
    const status = invoice.status;
    if (status === "received") return "Fully Paid";
    if (status === "partially_received") return "Partially Paid";
    if (status === "registered") return "Registered";
    return "Pending";
  };

  const getApprovalStatusText = (invoice) => {
    if (invoice.approvalStatus === "cancelled") return "Cancelled";
    if (invoice.approved) return "Approved";
    if (invoice.approvalStatus === "pending") return "Pending Approval";
    return "Pending";
  };

  const getInvoiceTypeText = (invoiceType) => {
    if (invoiceType === "Tax Invoice") return "Tax Invoice";
    if (invoiceType === "Cash Invoice") return "Cash Invoice";
    if (invoiceType === "Proforma Invoice") return "Proforma Invoice";
    return invoiceType || "N/A";
  };

  // Financial year options
  const financialYearOptions = [
    { value: "2024-25", label: "2024-25" },
    { value: "2025-26", label: "2025-26" },
    { value: "2026-27", label: "2026-27" },
    { value: "2027-28", label: "2027-28" },
  ];

  // ✅ CANCEL INVOICE FUNCTION - WITH PAYMENT CHECK
  const handleCancelInvoice = async (invoice) => {
    // ✅ CHECK IF ANY PAYMENT HAS BEEN RECEIVED
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

  // ✅ PAYMENT RECEIVE FUNCTION - AUTOMATIC APPROVAL
  const handleReceivePayment = async (invoice, receivedAmount) => {
    try {
      if (!receivedAmount || receivedAmount <= 0) {
        alert("Please enter valid amount");
        return;
      }

      if (receivedAmount > invoice.dueAmount) {
        alert(
          `Received amount cannot be more than due amount (₹${invoice.dueAmount})`
        );
        return;
      }

      const invoiceRef = doc(db, "ContractInvoices", invoice.id);
      const newReceivedAmount =
        (invoice.receivedAmount || 0) + parseFloat(receivedAmount);
      const newDueAmount = invoice.dueAmount - parseFloat(receivedAmount);

      const paymentRecord = {
        amount: parseFloat(receivedAmount),
        date: new Date().toISOString(),
        timestamp: new Date(),
      };

      let newStatus = invoice.status;
      if (newDueAmount === 0) {
        newStatus = "received";
      } else if (newReceivedAmount > 0) {
        newStatus = "partially_received";
      }

      // ✅ AUTOMATICALLY APPROVE WHEN PAYMENT IS RECEIVED
      const updateData = {
        receivedAmount: newReceivedAmount,
        dueAmount: newDueAmount,
        paymentHistory: [...(invoice.paymentHistory || []), paymentRecord],
        status: newStatus,
        approved: true, // ✅ AUTO APPROVE
        approvalStatus: "approved", // ✅ AUTO APPROVE
        approvedAt: new Date().toISOString(), // ✅ AUTO APPROVE
        approvedBy: "Auto-Approved via Payment", // ✅ AUTO APPROVE
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
      alert(
        `Payment of ₹${receivedAmount} recorded successfully!\n✅ Invoice auto-approved!`
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

  // ✅ UPDATED STATUS BADGES
  const getStatusBadge = (invoice) => {
    const status = invoice.status;
    const approvalStatus = invoice.approvalStatus;

    // Pehle cancelled check karo
    if (approvalStatus === "cancelled") {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
          Cancelled
        </span>
      );
    }

    // Fir status check karo - "Booked" priority me
    if (status === "Booked" || invoice.registered) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          Booked
        </span>
      );
    } else if (status === "received") {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
          Received
        </span>
      );
    } else if (status === "partially_received") {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
          Partially Received
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
          Pending
        </span>
      );
    }
  };

  // ✅ CHECK IF CANCEL BUTTON SHOULD BE DISABLED
  const shouldDisableCancel = (invoice) => {
    // Cancel button disable hoga agar:
    // 1. Invoice already cancelled hai
    // 2. Koi bhi payment receive ho chuki hai (even ₹1 bhi)
    return invoice.approvalStatus === "cancelled" || invoice.receivedAmount > 0;
  };

  // Payment Modal Component
  const PaymentModal = ({ invoice, onClose, onSubmit }) => {
    const [amount, setAmount] = useState("");
    const dueAmount = invoice.dueAmount || 0;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-96">
          <h3 className="text-lg font-semibold mb-4">Receive Payment</h3>
          <div className="mb-4">
            <p>
              <strong>Invoice:</strong> {invoice.invoiceNumber}
            </p>
            <p>
              <strong>College:</strong> {invoice.collegeName}
            </p>
            <p>
              <strong>Total Amount:</strong> ₹
              {invoice.amountRaised?.toLocaleString()}
            </p>
            <p>
              <strong>Due Amount:</strong> ₹{dueAmount.toLocaleString()}
            </p>
            {invoice.receivedAmount > 0 && (
              <p>
                <strong>Already Received:</strong> ₹
                {invoice.receivedAmount.toLocaleString()}
              </p>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Amount Received *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter amount (max ₹${dueAmount})`}
              className="w-full p-2 border rounded"
              max={dueAmount}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button
              onClick={() => onSubmit(invoice, amount)}
              className="px-4 py-2 bg-green-500 text-white rounded"
              disabled={!amount || amount <= 0}
            >
              Record Payment
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Apply filters when filters change
  useEffect(() => {
    applyFilters();
  }, [filters, invoices]);

  if (loading) {
    return <div className="text-center py-8">Loading invoices...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
        <button
          onClick={fetchInvoices}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header Section with Export Button */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            All Invoices - Approval & Payment Tracking
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Manage invoice approvals and track payments • Total:{" "}
            {invoices.length} invoices • Showing: {filteredInvoices.length}{" "}
            invoices
          </p>
        </div>

        {/* Export Button */}
        <button
          onClick={exportToExcel}
          disabled={
            exportLoading ||
            (filteredInvoices.length === 0 && invoices.length === 0)
          }
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {exportLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              Exporting...
            </>
          ) : (
            <>
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export All to Excel
            </>
          )}
        </button>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-lg border mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Filter Invoices
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Financial Year Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Financial Year
            </label>
            <select
              value={filters.financialYear}
              onChange={(e) =>
                setFilters({ ...filters, financialYear: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Years</option>
              {financialYearOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Type
            </label>
            <select
              value={filters.invoiceType}
              onChange={(e) =>
                setFilters({ ...filters, invoiceType: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="tax">Tax Invoice</option>
              <option value="cash">Cash Invoice</option>
              <option value="proforma">Proforma Invoice</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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

          {/* Action Buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={applyFilters}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md font-medium"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {invoices.length === 0
            ? "No invoices found."
            : "No invoices match the current filters."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Invoice Number</th>
                <th className="px-4 py-2 border">Type</th>
                <th className="px-4 py-2 border">College</th>
                <th className="px-4 py-2 border">Total Amount</th>
                <th className="px-4 py-2 border">Received Amount</th>
                <th className="px-4 py-2 border">Due Amount</th>
                <th className="px-4 py-2 border">Status</th>
                <th className="px-4 py-2 border">Approval Actions</th>
                <th className="px-4 py-2 border">Payment Actions</th>
                <th className="px-4 py-2 border">View Invoice</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const totalAmount = invoice.amountRaised || 0;
                const receivedAmount = invoice.receivedAmount || 0;
                const dueAmount =
                  invoice.dueAmount || totalAmount - receivedAmount;
                const isFullyPaid = dueAmount === 0;
                const canCancel = !shouldDisableCancel(invoice);

                return (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewInvoice(invoice)}
                  >
                    <td className="px-4 py-2 border font-semibold">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-2 border text-xs">
                      {getInvoiceTypeText(invoice.invoiceType)}
                    </td>
                    <td className="px-4 py-2 border">{invoice.collegeName}</td>
                    <td className="px-4 py-2 border">
                      ₹{totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 border">
                      <span
                        className={
                          receivedAmount > 0
                            ? "text-green-600"
                            : "text-gray-600"
                        }
                      >
                        ₹{receivedAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2 border">
                      <span
                        className={
                          dueAmount > 0 ? "text-red-600" : "text-green-600"
                        }
                      >
                        ₹{dueAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2 border">
                      {getStatusBadge(invoice)}
                    </td>
                    <td className="px-4 py-2 border">
                      <div className="flex flex-col gap-1">
                        {/* ✅ CANCEL BUTTON - SIRF TABHI SHOW HOGA JAB PAYMENT NAHI RECEIVE HUI HO */}
                        {canCancel ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelInvoice(invoice);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                          >
                            Cancel
                          </button>
                        ) : invoice.approvalStatus === "cancelled" ? (
                          <span className="text-red-600 text-xs font-semibold">
                            ✗ Cancelled
                          </span>
                        ) : (
                          <span 
                            className="text-gray-400 text-xs cursor-not-allowed px-2 py-1 border border-gray-300 rounded bg-gray-100"
                            title="Cannot cancel - payment already received"
                          >
                            Cancel
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 border">
                      {/* ✅ RECEIVABLE BUTTON - SIRF FULLY PAID NA HO AUR CANCELLED NA HO */}
                      {!isFullyPaid &&
                      invoice.approvalStatus !== "cancelled" ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentModal({ isOpen: true, invoice });
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Receivable
                        </button>
                      ) : isFullyPaid ? (
                        <span className="text-green-600 text-xs font-semibold">
                          Received
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Cancelled</span>
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
                          className="ml-2 px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
                        >
                          History
                        </button>
                      )}
                    </td>

                    <td className="px-4 py-2 border">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewInvoice(invoice);
                        }}
                        className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-xs"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {paymentModal.isOpen && (
        <PaymentModal
          invoice={paymentModal.invoice}
          onClose={() => setPaymentModal({ isOpen: false, invoice: null })}
          onSubmit={handleReceivePayment}
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