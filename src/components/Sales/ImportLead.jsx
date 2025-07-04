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
import {
  collection,
  serverTimestamp,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";
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
    "contactMethod",
    "phase", // Added phase as a required field
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
        handleImportError(error.message || "Error processing Excel file");
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

  const validatePhase = (phase) => {
    if (!phase) return false;
    const validPhases = ["hot", "warm", "cold"];
    return validPhases.includes(phase.toLowerCase());
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

        if (lead.phase && !validatePhase(lead.phase)) {
          errors.phase = "Phase must be one of: hot, warm, cold";
          hasError = true;
        }

        if (lead.specializations) {
          const specArray =
            typeof lead.specializations === "string"
              ? lead.specializations.split(",").map((s) => s.trim())
              : Array.isArray(lead.specializations)
              ? lead.specializations
              : [];

          const hasInvalidSpecs = specArray.some(
            (spec) => !isNaN(spec) && spec.trim() !== "" // Check if it's a number
          );

          if (hasInvalidSpecs) {
            errors.specializations =
              "Specializations should be text values (e.g. 'CS,IT')";
            hasError = true;
          }
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
          validatedLeads.push({
            ...lead,
            phase: lead.phase.toLowerCase(), // Ensure phase is lowercase
          });
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

      validatedLeads.forEach((lead) => {
        const docRef = doc(collection(db, "leads"));
        const leadToUpload = {
          businessName: lead.businessName || "",
          city: lead.city || "",
          pocName: lead.pocName || "",
          phoneNo: String(lead.phoneNo || ""),
          email: lead.email || "",
          tcv: Number(lead.tcv) || 0,
          contactMethod: lead.contactMethod || "Call",
          phase: lead.phase || "cold", // Use phase from the file
          createdAt: new Date().getTime(),
          openedDate: currentDate.getTime(),
          assignedTo: {
            uid: currentUser?.uid || "imported-unknown-uid",
            name: currentUser?.displayName || "Imported Lead",
            email: currentUser?.email || "no-email@imported.com",
          },
          firestoreTimestamp: serverTimestamp(),
          lastUpdatedAt: serverTimestamp(),
          lastUpdatedBy: "import-process",
          // Add optional fields
          ...(lead.expectedClosureDate && {
            expectedClosureDate: new Date(lead.expectedClosureDate).getTime(),
          }),
          ...(lead.notes && { notes: lead.notes }),
          ...(lead.followups && {
            followup:
              typeof lead.followups === "string"
                ? JSON.parse(lead.followups)
                : lead.followups,
          }),
          // Add any other fields from your manual form
          affiliation: lead.affiliation || null,
          accreditation: lead.accreditation || null,
          courseType: lead.courseType || null,
          specializations: lead.specializations
            ? typeof lead.specializations === "string"
              ? lead.specializations
                  .split(",")
                  .map((item) => item.trim())
                  .filter((item) => item && isNaN(item)) // Filter out numeric values
              : Array.isArray(lead.specializations)
              ? lead.specializations.filter((item) => isNaN(item))
              : []
            : [],
          studentCount: lead.studentCount ? Number(lead.studentCount) : null,
          perStudentCost: lead.perStudentCost
            ? Number(lead.perStudentCost)
            : null,
          passingYear: lead.passingYear || null,
          address: lead.address || "",
          state: lead.state || "",
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
    // Define user-friendly header names
    const headerDisplayNames = {
      businessName: "College Name",
      city: "City",
      pocName: "Contact Person",
      phoneNo: "Phone Number",
      email: "Email Address",
      studentCount: "Student Count",
      perStudentCost: "Per Student Cost",
      tcv: "Total Contract Value",
      contactMethod: "Contact Method",
      phase: "Lead Phase",
      expectedClosureDate: "Expected Closure Date",
      affiliation: "Affiliation",
      accreditation: "Accreditation",
      courseType: "Course Type",
      specializations: "Specializations",
      passingYear: "Passing Year",
      address: "Address",
      state: "State",
      followups: "Follow-ups",
    };

    const sampleData = [
      {
        businessName: "ABC College",
        address: "123 College Street",
        state: "Maharashtra",
        city: "Pune",
        pocName: "Ramesh Rawet",
        phoneNo: "1234567890",
        email: "john@example.com",
        expectedClosureDate: "2025-11-15",
        passingYear: "2024-2025",
        courseType: "MBA",
        specializations: "Marketing, Finance",
        accreditation: "A",
        affiliation: "University of Mumbai",
        contactMethod: "Call",
        studentCount: "50",
        perStudentCost: "5000",
        tcv: "250000",
        phase: "hot",
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

    // Enhanced instructions with styling metadata
    const instructions = [
      { instruction: "LEADS IMPORT GUIDE", type: "header" },
      { instruction: "File Requirements", type: "section" },
      {
        instruction:
          "• Required fields (highlighted in green) must be filled for all records",
        type: "item",
      },
      {
        instruction: "• Optional fields are highlighted in yellow",
        type: "item",
      },
      { instruction: "• Do not modify column headers", type: "item" },
      {
        instruction:
          "• Dates must be in exact format yyyy-mm-dd (e.g. 2025-11-15)",
        type: "item",
      },
      {
        instruction: "• Numeric fields should not contain currency symbols",
        type: "item",
      },
      {
        instruction: "• Specializations must be text values only (no numbers)",
        type: "item",
        highlight: true,
      },
      { type: "spacer" },
      { instruction: "Field Specifications", type: "section" },
      { instruction: "Required Fields:", type: "subsection" },
      { instruction: "businessName: College/Institution name", type: "field" },
      {
        instruction: "city: Location (letters only, no numbers/special chars)",
        type: "field",
      },
      { instruction: "pocName: Contact person's full name", type: "field" },
      { instruction: "phoneNo: 10-digit number (no symbols)", type: "field" },
      { instruction: "email: Valid email address format", type: "field" },
      {
        instruction: "tcv: Numeric value only (no currency symbols)",
        type: "field",
      },
      {
        instruction: "contactMethod: One of [Visit, Call, Email, Meeting]",
        type: "field",
      },
      { instruction: "phase: One of [hot, warm, cold]", type: "field" },
      { type: "spacer" },
      { instruction: "Special Fields:", type: "subsection" },
      {
        instruction:
          "specializations: Comma-separated text values (e.g. 'CS,IT') - numbers not allowed",
        type: "field",
        highlight: true,
      },
      {
        instruction: "followups: Must be valid JSON string (see sample)",
        type: "field",
      },
      { instruction: "dates: Must be in yyyy-mm-dd format", type: "field" },
      {
        instruction: "numeric fields: Enter numbers only (no text/symbols)",
        type: "field",
      },
      { instruction: "Field Mappings:", type: "section" },
      ...Object.entries(headerDisplayNames).map(([key, displayName]) => ({
        instruction: `${displayName} (stored as: ${key})`,
        type: "field",
      })),
    ];

    const workbook = XLSX.utils.book_new();

    // ===== Sample Data Sheet =====
    const ws = XLSX.utils.json_to_sheet(sampleData, { origin: "A2" });

    // Apply styles to headers
    const headerKeys = Object.keys(sampleData[0]);
    headerKeys.forEach((key, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: colIndex });
      if (headerDisplayNames[key]) {
        ws[cellAddress].v = headerDisplayNames[key]; // Show display name
      }

      // Apply styling
      ws[cellAddress].s = {
        fill: {
          patternType: "solid",
          fgColor: {
            rgb: requiredFields.includes(key) ? "E6FFE6" : "FFFFE0",
          },
        },
        font: {
          bold: true,
          color: { rgb: requiredFields.includes(key) ? "006600" : "666600" },
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      };
    });

    // Auto-size columns
    ws["!cols"] = headerKeys.map((key) => {
      const displayName = headerDisplayNames[key] || key;
      const headerLength = displayName.length;
      const maxDataLength = sampleData.reduce((max, row) => {
        const value = row[key] ? String(row[key]).length : 0;
        return Math.max(max, value);
      }, 0);
      return { wch: Math.max(headerLength, maxDataLength) + 2 };
    });
    // Add sample data sheet
    XLSX.utils.book_append_sheet(workbook, ws, "Leads Data");

    // ===== Instructions Sheet =====
    const instructionWs = XLSX.utils.json_to_sheet(
      instructions.map((item) => ({ Instruction: item.instruction || " " })),
      { skipHeader: true }
    );

    // Apply styles to each row based on type
    instructions.forEach((item, index) => {
      const cellAddress = XLSX.utils.encode_cell({ r: index, c: 0 });

      let style = {
        font: { name: "Calibri", sz: 11, color: { rgb: "000000" } },
        alignment: { wrapText: true, vertical: "top" },
      };

      switch (item.type) {
        case "header":
          style = {
            ...style,
            font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "2A5885" } }, // Dark blue background
            alignment: { horizontal: "center", vertical: "center" },
          };
          break;
        case "section":
          style = {
            ...style,
            font: { bold: true, sz: 14, color: { rgb: "2A5885" } },
            fill: { fgColor: { rgb: "D6E7FF" } }, // Light blue background
            alignment: { horizontal: "left" },
          };
          break;
        case "subsection":
          style = {
            ...style,
            font: { bold: true, sz: 12, color: { rgb: "3D7EBB" } },
            fill: { fgColor: { rgb: "FFFFFF" } },
          };
          break;
        case "field":
          style = {
            ...style,
            font: { sz: 11 },
            fill: { fgColor: { rgb: item.highlight ? "FFF2E6" : "FFFFFF" } }, // Orange highlight if needed
          };
          break;
        case "item":
          style = {
            ...style,
            font: { sz: 11 },
            fill: { fgColor: { rgb: "FFFFFF" } },
          };
          break;
        case "spacer":
          style = {
            ...style,
            font: { sz: 4 },
            fill: { fgColor: { rgb: "FFFFFF" } },
          };
          break;
      }

      instructionWs[cellAddress].s = style;
    });

    // Set column width and row heights
    instructionWs["!cols"] = [{ wch: 100 }]; // Wide column for instructions
    instructionWs["!rows"] = instructions.map((item) =>
      item.type === "header"
        ? { hpx: 30 }
        : item.type === "section"
        ? { hpx: 24 }
        : item.type === "spacer"
        ? { hpx: 8 }
        : { hpx: 18 }
    );

    // Add instructions sheet
    XLSX.utils.book_append_sheet(workbook, instructionWs, "Instructions");

    // ===== Export File =====
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
