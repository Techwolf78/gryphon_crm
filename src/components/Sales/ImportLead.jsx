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
import * as XLSX from "xlsx-js-style";
import { collection, addDoc, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth } from "firebase/auth";

const ImportLead = ({ handleImportComplete, activeTab = "hot" }) => {
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
    "contactMethod",
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
    if (!dateString) return true;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const validatePhoneNumber = (phone) => {
    if (!phone) return false;
    const phoneStr = String(phone);
    const digitsOnly = phoneStr.replace(/\D/g, "");
    return digitsOnly.length >= 6;
  };

  const validateContactMethod = (method) => {
    if (!method) return false;
    const validMethods = ["Visit", "Call", "Email", "Meeting"];
    return validMethods.includes(method);
  };

  const validateAndUploadData = async (data) => {
    try {
      if (!data || data.length === 0) {
        throw new Error("File is empty");
      }

      const sampleKeys = Object.keys(data[0] || {});
      const missingFields = requiredFields.filter(
        (f) => !sampleKeys.includes(f)
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      const validatedLeads = [];
      const errorLeads = [];

      data.forEach((lead, index) => {
        const errors = {};
        let hasError = false;

        requiredFields.forEach((field) => {
          if (!lead[field] || String(lead[field]).trim() === "") {
            errors[field] = "This field is required";
            hasError = true;
          }
        });

        if (lead.city && !validateCity(lead.city)) {
          errors.city =
            "City must contain only letters (no numbers or special characters)";
          hasError = true;
        }

        if (lead.phoneNo && !validatePhoneNumber(lead.phoneNo)) {
          errors.phoneNo =
            "Phone number must contain only numbers (no letters or special characters)";
          hasError = true;
        }

        if (lead.contactMethod && !validateContactMethod(lead.contactMethod)) {
          errors.contactMethod =
            "Contact method must be one of: Visit, Call, Email, Meeting";
          hasError = true;
        }

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
        setErrorData(errorLeads);
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

      setImportStatus((prev) => ({ ...prev, loading: true }));

      // Use batch write for better performance
      const batch = writeBatch(db);
      const currentUser = auth.currentUser;
      const currentDate = new Date();
      const validPhases = ["hot", "warm", "cold"];
      const leadPhase = validPhases.includes(activeTab) ? activeTab : "cold";

      validatedLeads.forEach((lead) => {
        const docRef = doc(collection(db, 'leads'));
        const leadToUpload = {
          businessName: lead.businessName || "",
          city: lead.city || "",
          pocName: lead.pocName || "",
          phoneNo: String(lead.phoneNo || ""),
          email: lead.email || "",
          tcv: Number(lead.tcv) || 0,
          contactMethod: lead.contactMethod || "Call",
          phase: leadPhase,
          createdAt: new Date().getTime(), // Add this line
          openedDate: currentDate.getTime(),
          assignedTo: {
            uid: currentUser?.uid || "imported-unknown-uid",
            name: currentUser?.displayName || "Imported Lead",
            email: currentUser?.email || "no-email@imported.com"
          },
          firestoreTimestamp: serverTimestamp(),
          lastUpdatedAt: serverTimestamp(),
          lastUpdatedBy: 'import-process',
          // Add optional fields
          ...(lead.expectedClosureDate && {
            expectedClosureDate: new Date(lead.expectedClosureDate).getTime()
          }),
          ...(lead.notes && { notes: lead.notes }),
          ...(lead.followups && { 
            followup: typeof lead.followups === "string" 
              ? JSON.parse(lead.followups) 
              : lead.followups 
          }),
          // Add any other fields from your manual form
          affiliation: lead.affiliation || null,
          accreditation: lead.accreditation || null,
          courseType: lead.courseType || null,
          specializations: lead.specializations || [],
          studentCount: lead.studentCount ? Number(lead.studentCount) : null,
          perStudentCost: lead.perStudentCost ? Number(lead.perStudentCost) : null,
          passingYear: lead.passingYear || null,
          address: lead.address || "",
          state: lead.state || "",
          // Ensure these fields match your dashboard expectations
          totalCost: lead.totalCost ? Number(lead.totalCost) : 0,
          closedDate: lead.closedDate ? new Date(lead.closedDate).getTime() : null,
          closureType: lead.closureType || null
        };

        batch.set(docRef, leadToUpload);
      });

      await batch.commit();

      setImportStatus({
        loading: false,
        success: true,
        error: null,
        count: validatedLeads.length,
      });

      if (handleImportComplete) {
        handleImportComplete();
      }
    } catch (error) {
      handleImportError(error.message || "Invalid data structure");
    }
  };

  const validateCity = (city) => {
    if (!city) return false;
    const cityRegex = /^[A-Za-z\s]+$/;
    return cityRegex.test(city);
  };

  const handleImportError = (message) => {
    setImportStatus({
      loading: false,
      success: false,
      error: message,
      count: 0,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetState = () => {
    setImportStatus({ loading: false, success: false, error: null, count: 0 });
    setErrorData(null);
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
        contactMethod: "Call",
        expectedClosureDate: "2025-11-15",
        followups: JSON.stringify({
          initial: {
            date: new Date().toISOString().split("T")[0],
            time: "10:00 AM",
            remarks: "Initial contact made",
            timestamp: Date.now(),
          },
        }),
        // Additional fields that match your manual form
        affiliation: "Private",
        accreditation: "A",
        courseType: "MBA",
        specializations: ["Marketing", "Finance"],
        studentCount: "500",
        perStudentCost: "5000",
        passingYear: "2024-2025",
        address: "123 College Street",
        state: "New York",
        totalCost: "2500000",
        closedDate: "2025-06-15",
        closureType: "new"
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
          "4. Dates must be in exact format yyyy-mm-dd (e.g. 2025-11-15)",
      },
      { instruction: "5. Numeric fields should not contain currency symbols" },
      {
        instruction:
          "6. contactMethod must be one of: Visit, Call, Email, Meeting",
      },
      { instruction: "" },
      { instruction: "REQUIRED FIELDS (MUST INCLUDE):" },
      { instruction: "- businessName: College/Institution name" },
      { instruction: "- city: Location of the institution" },
      { instruction: "- pocName: Contact person's name" },
      { instruction: "- phoneNo: Contact phone number" },
      { instruction: "- email: Contact email address" },
      { instruction: "- tcv: Total Contract Value (numeric)" },
      { instruction: "- contactMethod: How the lead was contacted" },
      { instruction: "" },
      { instruction: "RECOMMENDED FIELDS:" },
      { instruction: "- expectedClosureDate: Expected deal closure date" },
      { instruction: "- followups: JSON string of followup history" },
      { instruction: "- studentCount: Number of students (numeric)" },
      { instruction: "- perStudentCost: Cost per student (numeric)" },
      { instruction: "- totalCost: Total deal value (numeric)" },
      { instruction: "- closedDate: When deal was closed (yyyy-mm-dd)" },
      { instruction: "- closureType: 'new' or 'renewal'" },
    ];

    const workbook = XLSX.utils.book_new();

    const requiredFields = [
      "businessName",
      "city",
      "pocName",
      "phoneNo",
      "email",
      "tcv",
      "contactMethod",
    ];
    const optionalFields = [
      "expectedClosureDate",
      "followups",
      "affiliation",
      "accreditation",
      "courseType",
      "specializations",
      "studentCount",
      "perStudentCost",
      "passingYear",
      "address",
      "state",
      "totalCost",
      "closedDate",
      "closureType"
    ];

    // Generate styled worksheet from JSON
    const ws = XLSX.utils.json_to_sheet(sampleData, { origin: "A2" });

    const headerKeys = Object.keys(sampleData[0]);

    // Apply styled headers
    headerKeys.forEach((key, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: colIndex });
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
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              IMPORT OPTIONS
            </p>
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