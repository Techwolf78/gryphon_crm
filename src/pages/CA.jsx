import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import InvoiceModal from "../components/HR/InvoiceModal";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

const Register = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false); // ✅ NEW: Date picker modal state
  const [selectedDate, setSelectedDate] = useState(""); // ✅ NEW: Selected date state
  const [invoiceToRegister, setInvoiceToRegister] = useState(null); // ✅ NEW: Invoice to register

  // Filter states
  const [filters, setFilters] = useState({
    financialYear: "",
    invoiceType: "all",
    status: "all",
    approvalStatus: "all",
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
          status: doc.data().status || "pending",
          amount: doc.data().amountRaised || 0,
          registered: doc.data().registered || false,
          approvalStatus: doc.data().approvalStatus || "pending",
          approved: doc.data().approved || false,
          collegeAddress: doc.data().collegeAddress || "NA",
          collegeGSTIN: doc.data().collegeGSTIN || "NA",
          collegeState: doc.data().collegeState || "NA",
          description: doc.data().description || "NA",
          additionalDetails: doc.data().additionalDetails || "NA",
          projectCode: doc.data().projectCode || "NA",
          receivedAmount: doc.data().receivedAmount || 0,
          dueAmount: doc.data().dueAmount || 0,
          paymentHistory: doc.data().paymentHistory || [],
          // ✅ Ensure registeredAt field is included
          registeredAt: doc.data().registeredAt || null,
        }));

        const allTaxInvoices = data.filter(
          (invoice) =>
            invoice.invoiceType === "Tax Invoice" ||
            invoice.invoiceType === "Cash Invoice" ||
            invoice.invoiceType === undefined
        );

        setInvoices(allTaxInvoices);
        setFilteredInvoices(allTaxInvoices);
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
        }
        return true;
      });
    }

    // Registration Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((invoice) => {
        if (filters.status === "Booked") {
          return invoice.registered === true;
        } else if (filters.status === "unregistered") {
          return invoice.registered === false;
        }
        return true;
      });
    }

    // Approval Status filter
    if (filters.approvalStatus !== "all") {
      filtered = filtered.filter((invoice) => {
        if (filters.approvalStatus === "approved") {
          return invoice.approved === true;
        } else if (filters.approvalStatus === "pending") {
          return invoice.approvalStatus === "pending" && !invoice.approved;
        } else if (filters.approvalStatus === "cancelled") {
          return invoice.approvalStatus === "cancelled";
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
      approvalStatus: "all",
      startDate: "",
      endDate: "",
    });
    setFilteredInvoices(invoices);
  };

  // ✅ NEW: Open date picker modal
  const openDatePicker = (invoice) => {
    setInvoiceToRegister(invoice);
    setSelectedDate(new Date().toISOString().split('T')[0]); // Set today's date as default
    setShowDatePicker(true);
  };

  // ✅ NEW: Close date picker modal
  const closeDatePicker = () => {
    setShowDatePicker(false);
    setInvoiceToRegister(null);
    setSelectedDate("");
  };

  // ✅ UPDATED: Handle register with manual date
  const handleRegister = async (invoice, manualDate = null) => {
    try {
      if (!invoice.id) {
        throw new Error("Invoice ID is missing");
      }

      // ✅ SIRF CANCELLED INVOICES KO CHECK KARO
      if (invoice.approvalStatus === "cancelled") {
        alert("❌ Cannot register a cancelled invoice!");
        return;
      }

      const invoiceRef = doc(db, "ContractInvoices", invoice.id);
      
      // ✅ MANUAL DATE YA CURRENT DATE USE KARO
      let bookedDate;
      if (manualDate) {
        // Manual date from picker
        bookedDate = new Date(manualDate).toISOString();
      } else {
        // Current date (for backward compatibility)
        bookedDate = new Date().toISOString();
      }
      
      await updateDoc(invoiceRef, {
        registered: true,
        registeredAt: bookedDate, // ✅ SELECTED DATE STORE KARO
        status: "Booked",
      });

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? { 
                ...inv, 
                registered: true, 
                status: "Booked",
                registeredAt: bookedDate // ✅ FRONTEND MEIN BHI UPDATE KARO
              }
            : inv
        )
      );

      setFilteredInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? { 
                ...inv, 
                registered: true, 
                status: "Booked",
                registeredAt: bookedDate // ✅ FRONTEND MEIN BHI UPDATE KARO
              }
            : inv
        )
      );

      alert("✅ Invoice Booked successfully!");
    } catch (error) {
      alert("❌ Error registering invoice: " + error.message);
    }
  };

  // ✅ NEW: Confirm registration with selected date
  const confirmRegistration = () => {
    if (invoiceToRegister && selectedDate) {
      handleRegister(invoiceToRegister, selectedDate);
      closeDatePicker();
    }
  };
// Export to Excel - UPDATED WITH SAME COLUMNS AS InvoiceExcelExport + BOOKED DATE
const exportToExcel = async () => {
  try {
    setExportLoading(true);
const dataToExport = filteredInvoices.length > 0 ? filteredInvoices : invoices;
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

// Calculate rounded amount
const calculateRoundedAmount = (amount) => {
  if (!amount && amount !== 0) return 0;
  
  let numAmount = amount;
  if (typeof amount === 'string') {
    numAmount = parseFloat(amount) || 0;
  }
  
  return Math.round(numAmount);
};

// Get HSN code
const getHSNCode = (invoice) => {
  return "9984";
};

// Get description from delivery type
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
    // Prepare data for Excel - SAME COLUMNS AS InvoiceExcelExport + Booked Date
    const excelData = dataToExport.map((invoice) => {
      const gstBreakdown = calculateGSTBreakdown(invoice);
      let netPayableAmount = invoice.netPayableAmount || invoice.amountRaised || 0;
      if (typeof netPayableAmount === 'string') {
        netPayableAmount = parseFloat(netPayableAmount) || 0;
      }
      
      const roundedAmount = calculateRoundedAmount(netPayableAmount);
      const baseAmount = invoice.baseAmount || invoice.amountRaised || 0;

      return {
        // ✅ SAME COLUMNS AS InvoiceExcelExport.jsx
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
        "HSN Code": getHSNCode(invoice),
        "Invoice Type": getInvoiceTypeText(invoice.invoiceType),
        
        // ✅ EXTRA COLUMN: Booked Date (Yahi tumhara naya column hai)
        "Booked Date": invoice.registeredAt 
          ? formatDateForExcel(invoice.registeredAt)
          : "Not Booked",
        
        // Additional status columns for Register.jsx
        "Registration Status": invoice.registered ? "Booked" : "Not Booked",
        "Approval Status": invoice.approvalStatus === "cancelled" 
          ? "Cancelled" 
          : (invoice.approved || invoice.receivedAmount > 0) 
            ? "Approved" 
            : "Pending Approval",
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths - UPDATED FOR NEW STRUCTURE
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
      { wch: 10 }, // HSN Code
      { wch: 15 }, // Invoice Type
      { wch: 12 }, // ✅ NEW: Booked Date
      { wch: 15 }, // Registration Status
      { wch: 15 }, // Approval Status
    ];
    ws["!cols"] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Registration Invoices");

    // Generate Excel file
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });

    // Create filename
    const timestamp = new Date().toISOString().slice(0, 10);
    let filename = `invoice_registration_${timestamp}`;
    
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
// ✅ ADD THESE HELPER FUNCTIONS TO Register.jsx


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

  

  const getInvoiceTypeText = (invoiceType) => {
    if (invoiceType === "Tax Invoice") return "Tax Invoice";
    if (invoiceType === "Cash Invoice") return "Cash Invoice";
    return invoiceType || "N/A";
  };

  const financialYearOptions = [
    { value: "2024-25", label: "2024-25" },
    { value: "2025-26", label: "2025-26" },
    { value: "2026-27", label: "2026-27" },
    { value: "2027-28", label: "2027-28" },
  ];

  const handleView = (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedInvoice(null);
  };

  const getRowBackgroundColor = (invoice) => {
    if (invoice.approvalStatus === "cancelled") {
      return "bg-red-50 border-l-4 border-l-red-400";
    }
    if (invoice.approved) {
      return "bg-green-50 border-l-4 border-l-green-400";
    }
    return "";
  };

  // ✅ NEW: Format date for display
  const formatDisplayDate = (date) => {
    if (!date) return "Not Booked";
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString("en-IN");
    } catch {
      return "Invalid Date";
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Apply filters when filters change
  useEffect(() => {
    applyFilters();
  }, [filters, invoices]);

  if (loading) {
    return <div className="text-center py-8">Loading all invoices...</div>;
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
            Invoice Registration
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Register approved invoices • Total: {invoices.length} invoices •
            Showing: {filteredInvoices.length} invoices
          </p>
        </div>

        <div className="flex gap-2">
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
                Export to Excel
              </>
            )}
          </button>

          <button
            onClick={fetchInvoices}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center gap-2"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
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
            </select>
          </div>

          {/* Registration Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="registered">Booked</option>
              <option value="unregistered">Not Booked</option>
            </select>
          </div>

          {/* Approval Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Approval Status
            </label>
            <select
              value={filters.approvalStatus}
              onChange={(e) =>
                setFilters({ ...filters, approvalStatus: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending Approval</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Date Range Filters and Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-3 border border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Invoice Number
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  College
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Registration Status
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  ✅ Booking Date
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Approval Status
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className={`hover:bg-gray-100 transition-colors ${getRowBackgroundColor(
                    invoice
                  )}`}
                >
                  <td className="px-4 py-3 border border-gray-200 font-semibold">
                    {invoice.invoiceNumber || "N/A"}
                    {invoice.approvalStatus === "cancelled" && (
                      <span className="ml-2 text-red-600 text-xs">
                        (CANCELLED)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200">
                    {invoice.collegeName || "N/A"}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 font-semibold">
                    ₹{invoice.amount?.toLocaleString() || "0"}
                  </td>
                  <td className="px-4 py-3 border border-gray-200">
                    {invoice.registered ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        ✓ Booked
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        Not Booked
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200">
                    {/* ✅ BOOKING DATE COLUMN */}
                    {invoice.registeredAt ? (
                      <span className="text-sm text-gray-700">
                        {formatDisplayDate(invoice.registeredAt)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Not Booked</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200">
                    {/* ✅ UPDATED APPROVAL STATUS BADGE */}
                    {invoice.approvalStatus === "cancelled" ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                        Cancelled
                      </span>
                    ) : invoice.approved || invoice.receivedAmount > 0 ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        ✓ Approved
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        Pending Approval
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(invoice)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                      >
                        View
                      </button>

                      {/* ✅ DIRECT BOOKED BUTTON - SIRF CANCELLED NA HO AUR PEHLE SE BOOKED NA HO */}
                      {invoice.approvalStatus !== "cancelled" &&
                        !invoice.registered && (
                          <button
                            onClick={() => openDatePicker(invoice)}
                            className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                          >
                            Book
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={closeModal}
          onRegister={handleRegister}
        />
      )}

      {/* ✅ DATE PICKER MODAL */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Select Booking Date</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Booking Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                max={new Date().toISOString().split('T')[0]} // Can't select future dates
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeDatePicker}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmRegistration}
                disabled={!selectedDate}
                className="bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;