import { useState, useRef, useEffect } from "react";
import {
  FiUpload,
  FiDownload,
  FiChevronDown,
  FiX,
  FiCheck,
  FiInfo,
} from "react-icons/fi";
import Papa from "papaparse";
import * as XLSX from "xlsx-js-style"; // styling supported version
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase"; // Adjust path as needed
import { getAuth } from "firebase/auth";

const ImportLead = ({ handleImportComplete }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [importStatus, setImportStatus] = useState({
    loading: false,
    success: false,
    error: null,
    count: 0,
  });
  const [errorData, setErrorData] = useState(null);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const auth = getAuth();

  // Required fields based on your system
  const requiredFields = [
    "businessName",
    "city",
    "pocName",
    "phoneNo",
    "email",
    "tcv",
    "contactMethod", // Added as required field
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const processCSV = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => validateAndUploadData(results.data),
      error: (err) =>
        handleImportError(err.message || "Error parsing CSV file"),
    });
  };

  const processExcel = (file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        validateAndUploadData(jsonData);
      } catch (error) {
        handleImportError("Error processing Excel file");
      }
    };

    reader.onerror = () => handleImportError("Error reading file");
    reader.readAsArrayBuffer(file);
  };

  const validateDate = (dateString) => {
    if (!dateString) return true; // Skip validation if empty

    // Check format exactly matches yyyy-mm-dd
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    // Check if it's a valid date
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const validatePhoneNumber = (phone) => {
    if (!phone) return false; // Phone is required (already checked by required fields)

    // Convert to string if it's not already
    const phoneStr = String(phone);

    // Remove all non-digit characters
    const digitsOnly = phoneStr.replace(/\D/g, "");

    // Check if we have at least 6 digits (minimum reasonable phone number length)
    return digitsOnly.length >= 6;
  };

  const validateContactMethod = (method) => {
    if (!method) return false; // Contact method is required
    const validMethods = ["Visit", "Call", "Email", "Meeting"]; // Add other valid methods if needed
    return validMethods.includes(method);
  };

  const validateAndUploadData = async (data) => {
    try {
      if (!data || data.length === 0) {
        throw new Error("File is empty");
      }

      // Validate required fields
      const sampleKeys = Object.keys(data[0] || {});
      const missingFields = requiredFields.filter(
        (f) => !sampleKeys.includes(f)
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      // Validate each record and collect errors
      const validatedLeads = [];
      const errorLeads = [];

      data.forEach((lead, index) => {
        const errors = {};
        let hasError = false;

        // Check required fields
        requiredFields.forEach((field) => {
          if (!lead[field] || String(lead[field]).trim() === "") {
            errors[field] = "This field is required";
            hasError = true;
          }
        });

        // Special validation for city
        if (lead.city && !validateCity(lead.city)) {
          errors.city =
            "City must contain only letters (no numbers or special characters)";
          hasError = true;
        }

        // Phone number validation
        if (lead.phoneNo && !validatePhoneNumber(lead.phoneNo)) {
          errors.phoneNo =
            "Phone number must contain only numbers (no letters or special characters)";
          hasError = true;
        }

        // Contact method validation
        if (lead.contactMethod && !validateContactMethod(lead.contactMethod)) {
          errors.contactMethod =
            "Contact method must be one of: Visit, Call, Email, Meeting";
          hasError = true;
        }

        // Check expectedClosureDate format if present
        if (
          lead.expectedClosureDate &&
          !validateDate(lead.expectedClosureDate)
        ) {
          errors.expectedClosureDate =
            "Date must be in exact format yyyy-mm-dd (e.g. 2025-11-15)";
          hasError = true;
        }

        if (hasError) {
          errorLeads.push({
            ...lead,
            __rowNumber: index + 2,
            __errors: errors,
          });
        } else {
          validatedLeads.push(lead);
        }
      });

      if (validatedLeads.length === 0 && errorLeads.length > 0) {
        setErrorData(errorLeads); // Make sure to set error data first
        throw new Error(
          "All records have validation errors. Download error file to see details."
        );
      }

      if (errorLeads.length > 0) {
        setErrorData(errorLeads);
        throw new Error(
          `${errorLeads.length} records have validation errors. Download error file to see details.`
        );
      }

      // Upload to Firebase
      setImportStatus((prev) => ({ ...prev, loading: true }));

      const batchResults = await Promise.allSettled(
        validatedLeads.map((lead) => uploadLeadToFirebase(lead))
      );

      const successfulImports = batchResults.filter(
        (r) => r.status === "fulfilled"
      );
      const failedImports = batchResults.filter((r) => r.status === "rejected");

      setImportStatus({
        loading: false,
        success: true,
        error:
          failedImports.length > 0
            ? `${failedImports.length} records failed to import`
            : null,
        count: successfulImports.length,
      });

      // Refresh table data if provided
      if (handleImportComplete) {
        handleImportComplete();
      }
    } catch (error) {
      handleImportError(error.message || "Invalid data structure");
    }
  };

  const validateCity = (city) => {
    if (!city) return false; // City is required
    const cityRegex = /^[A-Za-z\s]+$/; // Only letters and spaces allowed
    return cityRegex.test(city);
  };

  const uploadLeadToFirebase = async (leadData) => {
    try {
      const currentUser = auth.currentUser;
      const currentDate = new Date(); // Get current date/time

      const leadToUpload = {
        businessName: leadData.businessName || "",
        city: leadData.city || "",
        pocName: leadData.pocName || "",
        phoneNo: leadData.phoneNo || "",
        email: leadData.email || "",
        tcv: leadData.tcv || "",
        contactMethod: leadData.contactMethod || "Call", // Default to "Call" if not provided
        phase: "hot", // Default phase
        createdAt: serverTimestamp(), // Firestore server timestamp
        openedDate: currentDate.getTime(), // Current timestamp for "Opened Date"
        assignedTo: currentUser
          ? {
              uid: currentUser.uid,
              name: currentUser.displayName || "Current User",
            }
          : null,
      };

      // Add optional fields
      if (leadData.expectedClosureDate) {
        leadToUpload.expectedClosureDate = new Date(
          leadData.expectedClosureDate
        ).getTime();
      }

      if (leadData.notes) {
        leadToUpload.notes = leadData.notes;
      }

      if (leadData.followups) {
        try {
          leadToUpload.followup =
            typeof leadData.followups === "string"
              ? JSON.parse(leadData.followups)
              : leadData.followups;
        } catch {
          leadToUpload.followup = {
            initial: {
              date: currentDate.toISOString().split("T")[0], // Use current date
              time: "12:00 PM",
              remarks: leadData.notes || "Initial contact",
              timestamp: Date.now(),
            },
          };
        }
      }

      // Add to Firestore
      await addDoc(collection(db, "leads"), leadToUpload);

      return { success: true };
    } catch (error) {
      console.error("Error uploading lead:", error);
      return { success: false, error: error.message };
    }
  };

  const handleImportError = (message) => {
    setImportStatus({
      loading: false,
      success: false,
      error: message,
      count: 0,
    });

    // Don't clear errorData here - we want to keep it for downloading
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetState = () => {
    setImportStatus({ loading: false, success: false, error: null, count: 0 });
    setErrorData(null); // Clear error data when resetting
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ loading: true, success: false, error: null, count: 0 });
    setErrorData(null);
    setIsDropdownOpen(false);

    const extension = file.name.split(".").pop().toLowerCase();

    if (extension === "csv") {
      processCSV(file);
    } else if (extension === "xlsx" || extension === "xls") {
      processExcel(file);
    } else {
      handleImportError(
        "Unsupported file format. Please use CSV or Excel files."
      );
    }
  };

  const downloadErrorFile = () => {
    if (!errorData || errorData.length === 0) return;

    // Prepare data for export
    const exportData = errorData.map((item) => {
      const cleanItem = { ...item };
      delete cleanItem.__errors;
      delete cleanItem.__rowNumber;
      return cleanItem;
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // First, create a map of all error cells for quick lookup
    const errorCells = new Map();
    errorData.forEach((errorItem) => {
      Object.keys(errorItem.__errors).forEach((field) => {
        const rowIndex = errorData.indexOf(errorItem) + 1; // +1 for header row
        const colIndex = Object.keys(exportData[0]).indexOf(field);
        if (colIndex >= 0) {
          errorCells.set(`${rowIndex}-${colIndex}`, true);
        }
      });
    });

    // Apply styles to all cells - highlight only those with errors
    Object.keys(ws).forEach((cellAddress) => {
      if (cellAddress.startsWith("!")) return; // Skip special sheet properties

      // Get row and column from cell address
      const cell = XLSX.utils.decode_cell(cellAddress);
      const cellKey = `${cell.r}-${cell.c}`;

      if (errorCells.has(cellKey)) {
        // Apply error styling
        ws[cellAddress].s = {
          fill: {
            patternType: "solid",
            fgColor: { rgb: "FFCCCC" }, // Light red background
          },
          font: {
            color: { rgb: "FF0000" }, // Red text
            bold: true,
          },
        };
      }
    });

    // Auto-size columns
    const maxColWidths = Object.keys(exportData[0]).map((key) => {
      const header = key.length;
      const maxData = exportData.reduce((max, row) => {
        const value = row[key];
        const length = value ? String(value).length : 0;
        return Math.max(max, length);
      }, 0);
      return { wch: Math.max(header, maxData) + 2 };
    });

    ws["!cols"] = maxColWidths;
    XLSX.utils.book_append_sheet(workbook, ws, "Errors");

    // Add error summary sheet
    const errorSummary = errorData.map((item) => ({
      row: item.__rowNumber,
      errors: Object.entries(item.__errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join("; "),
    }));

    const summarySheet = XLSX.utils.json_to_sheet(errorSummary);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Error Summary");

    // Export file
    XLSX.writeFile(workbook, "Import_Errors.xlsx");
  };

  const downloadSampleFile = () => {
    const sampleData = [
      {
        businessName: "ABC College",
        city: "New York",
        pocName: "John Doe",
        phoneNo: "1234567890",
        email: "john@example.com",
        tcv: "25000",
        contactMethod: "Call", // Added contactMethod to sample
        expectedClosureDate: "2025-11-15", // Example of correct format
        followups: JSON.stringify({
          initial: {
            date: new Date().toISOString().split("T")[0],
            time: "10:00 AM",
            remarks: "Initial contact made",
            timestamp: Date.now(),
          },
        }),
      },
    ];

    const instructions = [
      { instruction: "FILE REQUIREMENTS:" },
      {
        instruction:
          "1. Required fields (highlighted in green) must be filled for all records",
      },
      { instruction: "2. Optional fields are highlighted in yellow" },
      { instruction: "3. Do not modify column headers" },
      {
        instruction:
          "4. expectedClosureDate must be in exact format yyyy-mm-dd (e.g. 2025-11-15)",
      },
      { instruction: "5. TCV should be numeric without currency symbols" },
      {
        instruction:
          "6. contactMethod must be one of: Visit, Call, Email, Meeting",
      },
      { instruction: "" },
      { instruction: "REQUIRED FIELDS (MUST INCLUDE):" },
      { instruction: "- businessName: College/Institution name" },
      {
        instruction:
          "- city: Location of the institution (letters only, no numbers or special characters)",
      },
      { instruction: "- pocName: Contact person's name" },
      {
        instruction:
          "- phoneNo: Contact phone number (digits only, no spaces or special characters)",
      },
      { instruction: "- email: Contact email address" },
      { instruction: "- tcv: Total Contract Value (numeric)" },
      { instruction: "- contactMethod: How the lead was contacted" },
      { instruction: "" },
      { instruction: "OPTIONAL FIELDS:" },
      { instruction: "- openedDate: When lead was created (timestamp)" },
      {
        instruction:
          "- expectedClosureDate: Expected deal closure date (must be yyyy-mm-dd)",
      },
      { instruction: "- followups: JSON string of followup history" },
      {
        instruction:
          "- assignedTo: JSON string with uid and name of assigned user",
      },
    ];

    const workbook = XLSX.utils.book_new();

    const requiredFields = [
      "businessName",
      "city",
      "pocName",
      "phoneNo",
      "email",
      "tcv",
      "contactMethod", // Added to required fields
    ];
    const optionalFields = [
      "expectedClosureDate",
      "followups",
      "openedDate",
      "assignedTo",
    ];

    // Generate styled worksheet from JSON
    const ws = XLSX.utils.json_to_sheet(sampleData, { origin: "A2" });

    const headerKeys = Object.keys(sampleData[0]);

    // Apply styled headers
    headerKeys.forEach((key, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: colIndex }); // Row 2 for headers (0-indexed)
      ws[cellAddress] = {
        v: key,
        t: "s",
        s: {
          fill: {
            patternType: "solid",
            fgColor: {
              rgb: requiredFields.includes(key) ? "E6FFE6" : "FFFFE0",
            },
          },
          font: { bold: true },
          alignment: { horizontal: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        },
      };
    });

    // Auto-size columns
    const maxColWidths = headerKeys.map((key) => {
      const header = key.length;
      const maxData = sampleData.reduce((max, row) => {
        const value = row[key];
        const length = value ? String(value).length : 0;
        return Math.max(max, length);
      }, 0);
      return { wch: Math.max(header, maxData) + 2 };
    });

    ws["!cols"] = maxColWidths;
    XLSX.utils.book_append_sheet(workbook, ws, "Leads Data");

    // Add instructions sheet
    const instructionSheet = XLSX.utils.json_to_sheet(instructions);
    XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions");

    // Export file
    XLSX.writeFile(workbook, "Leads_Import_Template.xlsx");
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Import Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md border transition-colors ${
          importStatus.loading
            ? "bg-blue-50 border-blue-200 text-blue-700"
            : importStatus.success
            ? "bg-green-50 border-green-200 text-green-700"
            : importStatus.error
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
        disabled={importStatus.loading}
      >
        {importStatus.loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            <span>Processing...</span>
          </div>
        ) : importStatus.success ? (
          <div className="flex items-center gap-2">
            <FiCheck className="w-4 h-4" />
            <span>Imported ({importStatus.count})</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-700">
            <FiUpload className="w-4 h-4" />
            <span>Import Leads</span>
            <FiChevronDown className="w-4 h-4" />
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-gray-200">
          <div className="px-3 py-2 border-b border-gray-10 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">IMPORT OPTIONS</p>
          </div>
          <div className="py-1">
            <button
              onClick={downloadSampleFile}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <FiDownload className="w-4 h-4 mr-2 text-blue-500" />
              Download sample file
            </button>

            <label className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
              <FiUpload className="w-4 h-4 mr-2 text-green-500" />
              Import from file
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100 bg-gray-50 flex items-center gap-1">
            <FiInfo className="w-3 h-3 text-blue-400" />
            Supports CSV and Excel formats
          </div>
        </div>
      )}

      {/* Status Messages */}
      {importStatus.error && (
        <div className="absolute left-0 mt-2 w-full bg-red-50 text-red-700 text-xs p-2 rounded shadow z-10">
          <div className="flex justify-between items-start">
            <div>
              <strong>Whoops!</strong> {importStatus.error}
              {errorData && errorData.length > 0 && (
                <div className="mt-1">
                  <button
                    onClick={downloadErrorFile}
                    className="text-blue-600 hover:text-blue-800 underline flex items-center"
                  >
                    <FiDownload className="w-3 h-3 mr-1" />
                    Download error details
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={resetState}
              className="text-red-800 hover:text-red-900"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {importStatus.success && (
        <div className="absolute left-0 mt-2 w-full bg-green-50 text-green-700 text-xs p-2 rounded shadow z-10">
          <div className="flex justify-between">
            <div>
              <strong>Nice!</strong> Added {importStatus.count} leads
              {importStatus.error && (
                <div className="text-yellow-700 mt-1">{importStatus.error}</div>
              )}
            </div>
            <button
              onClick={resetState}
              className="text-green-800 hover:text-green-900"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportLead;