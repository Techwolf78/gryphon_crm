import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../../../firebase";

export default function InvoiceExcelExport() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    invoiceType: "",
    status: "",
    financialYear: "",
  });

  // Get current financial year
  const getCurrentFinancialYear = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (currentMonth >= 4) {
      return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    } else {
      return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
    }
  };

  // Fetch invoices from BOTH collections
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      // Dono collections se data fetch karo
      const [contractInvoicesSnapshot, proformaInvoicesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "ContractInvoices"), orderBy("raisedDate", "desc"))),
        getDocs(query(collection(db, "ProformaInvoices"), orderBy("raisedDate", "desc")))
      ]);

      // Combine data from both collections
      let allInvoices = [
        ...contractInvoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          collection: "ContractInvoices",
          ...doc.data()
        })),
        ...proformaInvoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          collection: "ProformaInvoices", 
          ...doc.data()
        }))
      ];

      // Client-side filtering apply karo
      allInvoices = allInvoices.filter(invoice => {
        // Financial year filter
        if (filters.financialYear && invoice.financialYear !== filters.financialYear) {
          return false;
        }

        // Invoice type filter
        if (filters.invoiceType && invoice.invoiceType !== filters.invoiceType) {
          return false;
        }

        // Status filter
        if (filters.status && invoice.status !== filters.status) {
          return false;
        }

        // Date range filter
        if (filters.startDate || filters.endDate) {
          const invoiceDate = invoice.raisedDate?.toDate ? invoice.raisedDate.toDate() : new Date(invoice.raisedDate);
          
          if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            startDate.setHours(0, 0, 0, 0);
            if (invoiceDate < startDate) return false;
          }

          if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (invoiceDate > endDate) return false;
          }
        }

        return true;
      });

      // Sort by date
      allInvoices.sort((a, b) => {
        const dateA = a.raisedDate?.toDate ? a.raisedDate.toDate() : new Date(a.raisedDate);
        const dateB = b.raisedDate?.toDate ? b.raisedDate.toDate() : new Date(b.raisedDate);
        return dateB - dateA;
      });

      setInvoices(allInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      alert("Failed to fetch invoices. Please check console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load default financial year
    setFilters(prev => ({
      ...prev,
      financialYear: getCurrentFinancialYear()
    }));
  }, []);

  // Auto-fetch when financial year changes
  useEffect(() => {
    if (filters.financialYear) {
      fetchInvoices();
    }
  }, [filters.financialYear]);

  // Generate financial year options
  const getFinancialYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let i = 2020; i <= currentYear + 1; i++) {
      const startYear = i;
      const endYear = i + 1;
      const financialYear = `${startYear}-${endYear.toString().slice(-2)}`;
      years.push(financialYear);
    }
    
    return years.reverse();
  };

  // Format date for Excel
  const formatDateForExcel = (date) => {
    if (!date) return "";
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString("en-IN");
    } catch {
      return "Invalid Date";
    }
  };

  // Get invoice month
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

  // ✅ NEW FUNCTION: Get Description from deliveryType
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

// Calculate GST breakdown - FIXED VERSION
const calculateGSTBreakdown = (invoice) => {
  let gstAmount = invoice.gstAmount || 0;
  
  // Agar gstAmount number nahi hai toh convert karo
  if (typeof gstAmount === 'string') {
    gstAmount = parseFloat(gstAmount) || 0;
  }

  // ✅ YEH LINE CHANGE KARO - "include" ko bhi CGST+SGST treat karo
  const gstType = invoice.gstType?.toLowerCase();
  
  if (gstType === "igst") {
    // Sirf IGST case mein hi IGST use karo
    return {
      cgst: 0,
      sgst: 0,
      igst: gstAmount
    };
  } else {
    // ✅ "include" aur sab cases mein CGST+SGST use karo (half-half)
    return {
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      igst: 0
    };
  }
};
  // Calculate rounded amount - IMPROVED VERSION
  const calculateRoundedAmount = (amount) => {
    if (!amount && amount !== 0) return 0;
    
    let numAmount = amount;
    if (typeof amount === 'string') {
      numAmount = parseFloat(amount) || 0;
    }
    
    return Math.round(numAmount);
  };

  // Get HSN code based on service type
  const getHSNCode = (invoice) => {
    return "9984"; // HSN code for education services
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "0";
    
    let numAmount = amount;
    if (typeof amount === 'string') {
      numAmount = parseFloat(amount) || 0;
    }
    
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  // Export to Excel
  const exportToExcel = () => {
    if (invoices.length === 0) {
      alert("No invoices to export");
      return;
    }

    // Prepare data for Excel
    const excelData = invoices.map(invoice => {
      const gstBreakdown = calculateGSTBreakdown(invoice);
      // Amount handling - string ya number dono handle karo
      let netPayableAmount = invoice.netPayableAmount || 0;
      if (typeof netPayableAmount === 'string') {
        netPayableAmount = parseFloat(netPayableAmount) || 0;
      }
      
      const roundedAmount = calculateRoundedAmount(netPayableAmount);
      
      return {
        "Invoice Month": getInvoiceMonth(invoice.raisedDate),
        "Invoice Number": invoice.invoiceNumber || "N/A",
        "Invoice Date": formatDateForExcel(invoice.raisedDate),
        "Party Name": invoice.collegeName || "N/A",
        "GSTIN Number": invoice.gstNumber || "N/A",
        "Description": getDescription(invoice),
        "Total Value": formatCurrency(invoice.baseAmount || 0),
        "CGST": formatCurrency(gstBreakdown.cgst),
        "SGST": formatCurrency(gstBreakdown.sgst),
        "IGST": formatCurrency(gstBreakdown.igst),
        "Rounded Off": formatCurrency(roundedAmount - netPayableAmount),
        "Total Invoice Value": formatCurrency(roundedAmount),
        "HSN Code": getHSNCode(invoice),
        "Invoice Type": invoice.invoiceType || "N/A",
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths - ✅ NEW COLUMN WIDTH ADDED
    const colWidths = [
      { wch: 15 }, // Invoice Month
      { wch: 20 }, // Invoice Number
      { wch: 12 }, // Invoice Date
      { wch: 25 }, // Party Name
      { wch: 20 }, // GSTIN Number
      { wch: 25 }, // ✅ NEW: Description column
      { wch: 12 }, // Total Value
      { wch: 10 }, // CGST
      { wch: 10 }, // SGST
      { wch: 10 }, // IGST
      { wch: 12 }, // Rounded Off
      { wch: 15 }, // Total Invoice Value
      { wch: 10 }, // HSN Code
      { wch: 15 }, // Invoice Type
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "All Invoices");

    // Generate Excel file
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `all_invoices_export_${timestamp}.xlsx`;
    
    saveAs(blob, filename);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      invoiceType: "",
      status: "",
      financialYear: getCurrentFinancialYear(),
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Export All Invoices to Excel</h2>
          <p className="text-gray-600 text-sm">
            Export Tax, Cash, and Proforma invoices with detailed GST breakdown
          </p>
        </div>
        
        <button
          onClick={exportToExcel}
          disabled={loading || invoices.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export to Excel
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Financial Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Financial Year
          </label>
          <select
            value={filters.financialYear}
            onChange={(e) => handleFilterChange("financialYear", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {getFinancialYearOptions().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Invoice Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Invoice Type
          </label>
          <select
            value={filters.invoiceType}
            onChange={(e) => handleFilterChange("invoiceType", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="Tax Invoice">Tax Invoice</option>
            <option value="Cash Invoice">Cash Invoice</option>
            <option value="Proforma Invoice">Proforma Invoice</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="registered">Registered</option>
            <option value="approved">Approved</option>
            <option value="cancelled">Cancelled</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
          </select>
        </div>

        {/* Date Range - Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Date Range - End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-end gap-2">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50 flex-1"
          >
            {loading ? "Loading..." : "Apply Filters"}
          </button>
          
          <button
            onClick={clearFilters}
            className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Found <span className="font-semibold text-gray-900">{invoices.length}</span> invoices
              {filters.financialYear && ` for FY ${filters.financialYear}`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Tax/Cash: {invoices.filter(inv => inv.collection === "ContractInvoices").length} | 
              Proforma: {invoices.filter(inv => inv.collection === "ProformaInvoices").length}
            </p>
          </div>
          {invoices.length > 0 && (
            <div className="text-sm text-gray-600">
              Total Amount:{" "}
              <span className="font-semibold text-green-600">
                ₹{invoices.reduce((sum, inv) => {
                  let amount = inv.netPayableAmount || 0;
                  if (typeof amount === 'string') {
                    amount = parseFloat(amount) || 0;
                  }
                  return sum + amount;
                }, 0).toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Preview Table - ✅ NEW COLUMN ADDED HERE TOO */}
      {invoices.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Invoice No
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Party Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Collection
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.slice(0, 5).map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {formatDateForExcel(invoice.raisedDate)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {invoice.collegeName}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {/* ✅ NEW DESCRIPTION COLUMN */}
                    {getDescription(invoice)}
                  </td>
                  <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                    ₹{formatCurrency(invoice.netPayableAmount || 0)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {invoice.invoiceType}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.status === "approved" ? "bg-green-100 text-green-800" :
                      invoice.status === "cancelled" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.collection === "ContractInvoices" 
                        ? "bg-blue-100 text-blue-800" 
                        : "bg-purple-100 text-purple-800"
                    }`}>
                      {invoice.collection === "ContractInvoices" ? "Tax/Cash" : "Proforma"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length > 5 && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Showing first 5 of {invoices.length} invoices
            </p>
          )}
        </div>
      )}
    </div>
  );
}