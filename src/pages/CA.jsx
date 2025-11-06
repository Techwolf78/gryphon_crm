import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const [showFilters, setShowFilters] = useState(false); // ✅ NEW: Filters dropdown state

  const filtersRef = useRef(null); // ✅ NEW: Ref for filters dropdown

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
  const applyFilters = useCallback(() => {
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
        if (filters.status === "registered") {
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
  }, [filters, invoices]);

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
const getHSNCode = () => {
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

  const getRowHoverColor = (invoice) => {
    if (invoice.approvalStatus === "cancelled") {
      return "hover:bg-red-100";
    }
    if (invoice.approved) {
      return "hover:bg-green-100";
    }
    return "hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50";
  };

  const getRowTextColor = (invoice) => {
    if (invoice.approvalStatus === "cancelled") {
      return "text-red-800";
    }
    if (invoice.approved) {
      return "text-green-800";
    }
    return "text-gray-900";
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
  }, [filters, invoices, applyFilters]);

  // ✅ NEW: Close filters dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
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
    return <div className="text-center py-4">Loading all invoices...</div>;
  }

  if (error) {
    return (
      <div className="p-3">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          <strong>Error:</strong> {error}
        </div>
        <button
          onClick={fetchInvoices}
          className="mt-3 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="">
      {/* Header Section with Export Button */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 mb-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Invoice Registration
          </h2>
          <p className="text-gray-600 text-sm">
            Register approved invoices • Total: {invoices.length} invoices •
            Showing: {filteredInvoices.length} invoices
          </p>
        </div>

        <div className="flex gap-2">
          {/* Reset Filters Button - Only visible when filters are applied */}
          {[
            filters.financialYear,
            filters.invoiceType !== "all",
            filters.status !== "all", 
            filters.approvalStatus !== "all",
            filters.startDate,
            filters.endDate
          ].filter(Boolean).length > 0 && (
            <button
              onClick={() => {
                clearFilters();
                setShowFilters(false);
              }}
              className="bg-red-500 hover:bg-red-600 text-white py-1.5 px-3 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              title="Reset all filters"
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
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Reset
            </button>
          )}

          {/* Filters Button with Dropdown */}
          <div className="relative" ref={filtersRef}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                showFilters ? 'bg-blue-700' : ''
              }`}
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
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
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
              {(filters.financialYear || filters.invoiceType !== "all" || filters.status !== "all" || filters.approvalStatus !== "all" || filters.startDate || filters.endDate) && (
                <span className="bg-red-500 text-white text-[10px] rounded-full px-1 py-0.5">
                  {[
                    filters.financialYear,
                    filters.invoiceType !== "all",
                    filters.status !== "all", 
                    filters.approvalStatus !== "all",
                    filters.startDate,
                    filters.endDate
                  ].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Filters Dropdown */}
            {showFilters && (
              <div className="absolute top-full right-8 mt-2 w-80 max-h-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                {/* Header */}
                <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-white">Advanced Filters</h3>
                    </div>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-all duration-200"
                      title="Close filters"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-blue-100 text-xs mt-0.5">Refine your invoice search</p>
                </div>

                {/* Content */}
                <div className="p-3 overflow-y-auto max-h-80">
                  <div className="space-y-3">
                    {/* Financial Year */}
                    <div className="space-y-1">
                      <label className="flex items-center text-xs font-semibold text-gray-700">
                        <svg className="w-3.5 h-3.5 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Financial Year
                      </label>
                      <select
                        value={filters.financialYear}
                        onChange={(e) =>
                          setFilters({ ...filters, financialYear: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-400"
                      >
                        <option value="">All Years</option>
                        {financialYearOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Invoice Type */}
                    <div className="space-y-1">
                      <label className="flex items-center text-xs font-semibold text-gray-700">
                        <svg className="w-3.5 h-3.5 mr-1.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Invoice Type
                      </label>
                      <select
                        value={filters.invoiceType}
                        onChange={(e) =>
                          setFilters({ ...filters, invoiceType: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-400"
                      >
                        <option value="all">All Types</option>
                        <option value="tax">Tax Invoice</option>
                        <option value="cash">Cash Invoice</option>
                      </select>
                    </div>

                    {/* Registration Status */}
                    <div className="space-y-1">
                      <label className="flex items-center text-xs font-semibold text-gray-700">
                        <svg className="w-3.5 h-3.5 mr-1.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Registration Status
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) =>
                          setFilters({ ...filters, status: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-400"
                      >
                        <option value="all">All Status</option>
                        <option value="registered">Booked</option>
                        <option value="unregistered">Not Booked</option>
                      </select>
                    </div>

                    {/* Approval Status */}
                    <div className="space-y-1">
                      <label className="flex items-center text-xs font-semibold text-gray-700">
                        <svg className="w-3.5 h-3.5 mr-1.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Approval Status
                      </label>
                      <select
                        value={filters.approvalStatus}
                        onChange={(e) =>
                          setFilters({ ...filters, approvalStatus: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-400"
                      >
                        <option value="all">All Status</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending Approval</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-2">
                      <label className="flex items-center text-xs font-semibold text-gray-700">
                        <svg className="w-3.5 h-3.5 mr-1.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Date Range (Generated)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-0.5">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) =>
                              setFilters({ ...filters, startDate: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-0.5">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) =>
                              setFilters({ ...filters, endDate: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        applyFilters();
                        setShowFilters(false);
                      }}
                      className="flex-1 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center justify-center"
                    >
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Apply Filters
                    </button>
                    <button
                      onClick={() => {
                        clearFilters();
                        setShowFilters(false);
                      }}
                      className="flex-1 bg-linear-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center justify-center"
                    >
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={exportToExcel}
            disabled={
              exportLoading ||
              (filteredInvoices.length === 0 && invoices.length === 0)
            }
            className="bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {exportLoading ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></div>
                Exporting...
              </>
            ) : (
              <>
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export to Excel
              </>
            )}
          </button>

          <button
            onClick={fetchInvoices}
            className="bg-gray-500 text-white py-1.5 px-3 rounded hover:bg-gray-600 text-sm flex items-center gap-2"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Modern SaaS Table Design */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {invoices.length === 0 ? "No invoices found" : "No matching invoices"}
            </h3>
            <p className="text-gray-500 text-sm">
              {invoices.length === 0
                ? "Get started by creating your first invoice."
                : "Try adjusting your filters to see more results."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>Invoice Details</span>
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>Organization</span>
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span>Amount</span>
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Registration</span>
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Booking Date</span>
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Approval</span>
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Actions</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={`group transition-all duration-200 ease-in-out ${
                      getRowBackgroundColor(invoice)
                    } ${getRowHoverColor(invoice)}`}
                  >
                    {/* Invoice Number & Status */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 w-8 h-8 bg-linear-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <div className={`text-xs font-semibold group-hover:text-blue-700 transition-colors ${getRowTextColor(invoice)}`}>
                            {invoice.invoiceNumber || "N/A"}
                          </div>
                          {invoice.approvalStatus === "cancelled" && (
                            <div className="flex items-center mt-0.5">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                Cancelled
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* College Name */}
                    <td className="px-3 py-2">
                      <div className={`text-xs font-medium wrap-break-word ${getRowTextColor(invoice)}`}>
                        {invoice.collegeName || "N/A"}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 wrap-break-word">
                        {invoice.collegeState || "N/A"}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className={`text-sm font-bold ${getRowTextColor(invoice)}`}>
                        ₹{invoice.amount?.toLocaleString('en-IN') || "0"}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {invoice.invoiceType === "Tax Invoice" ? "Tax Invoice" : "Cash Invoice"}
                      </div>
                    </td>

                    {/* Registration Status */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {invoice.registered ? (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-linear-to-r from-green-500 to-emerald-500 text-white shadow-sm">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Booked
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-linear-to-r from-amber-400 to-orange-500 text-white shadow-sm">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 012 0zm-1 3a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Pending
                        </div>
                      )}
                    </td>

                    {/* Booking Date */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {invoice.registeredAt ? (
                        <div className={`text-xs font-medium ${getRowTextColor(invoice)}`}>
                          {formatDisplayDate(invoice.registeredAt)}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">
                          Not booked
                        </div>
                      )}
                    </td>

                    {/* Approval Status */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {invoice.approvalStatus === "cancelled" ? (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-linear-to-r from-red-500 to-rose-500 text-white shadow-sm">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Cancelled
                        </div>
                      ) : invoice.approved || invoice.receivedAmount > 0 ? (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-linear-to-r from-green-500 to-emerald-500 text-white shadow-sm">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Approved
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-linear-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 012 0zm-1 3a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Pending
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleView(invoice)}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="View invoice details"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>

                        {invoice.approvalStatus !== "cancelled" && !invoice.registered && (
                          <button
                            onClick={() => openDatePicker(invoice)}
                            className="inline-flex items-center px-2 py-1 border border-transparent rounded-md text-xs font-medium text-white bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                            title="Book this invoice"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
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

          {/* Table Footer */}
          <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center space-x-3">
                <span>Showing {filteredInvoices.length} of {invoices.length} invoices</span>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Real-time updates</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
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
          <div className="bg-white p-4 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-2">Select Booking Date</h3>
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
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