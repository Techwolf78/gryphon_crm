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
import { universityOptions } from "./universityData";

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

  // Required fields based on your college leads system
  const requiredFields = [
    "businessName",
    "city",
    "state",
    "pocName",
    "phoneNo",
    "email",
    "contactMethod",
    "phase",
    "courseType",
  ];

  // Course-related fields that need special handling
  const courseFields = [
    "courseType",
    "specializations",
    "passingYear",
    "studentCount",
    "perStudentCost",
    "tcv",
  ];

  // Accreditation options
  const accreditationOptions = [
    "A++",
    "A+",
    "A",
    "B++",
    "B+",
    "B",
    "C",
    "D",
    "Not Accredited",
    "Applied For",
    "Other",
  ];

  const headerToFieldMap = {
    "College Name": "businessName",
    Address: "address",
    State: "state",
    City: "city",
    "Contact Person": "pocName",
    "Phone Number": "phoneNo",
    "Email Address": "email",
    "Contact Method": "contactMethod",
    "Lead Phase": "phase",
    "University Affiliation": "affiliation",
    "NAAC Accreditation": "accreditation",
    "Course Type": "courseType",
    "Specializations (comma separated)": "specializations",
    "Passing Year": "passingYear",
    "Student Count": "studentCount",
    "Per Student Cost (₹)": "perStudentCost",
    "Total Contract Value (₹)": "tcv",
    "Expected Closure Date (yyyy-mm-dd)": "expectedClosureDate",
    Notes: "notes",
    "Follow-ups (JSON format)": "followups",
  };

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
    complete: (results) => {
      const mappedData = results.data.map(row => {
        const newRow = {};
        Object.keys(row).forEach(header => {
          const fieldName = headerToFieldMap[header] || header;
          let value = row[header];
          
          // Only normalize these specific fields
          if (fieldName === 'contactMethod' && typeof value === 'string') {
            value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
          }
          if (fieldName === 'phase' && typeof value === 'string') {
            value = value.toLowerCase();
          }
          
          newRow[fieldName] = value;
        });
        return newRow;
      });
      
      validateAndUploadData(mappedData);
    },
    error: (err) => handleImportError(err.message || "Error parsing CSV file")
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
      
      const mappedData = jsonData.map(row => {
        const newRow = {};
        Object.keys(row).forEach(header => {
          const fieldName = headerToFieldMap[header] || header;
          let value = row[header];
          
          // Only normalize these specific fields
          if (fieldName === 'contactMethod' && typeof value === 'string') {
            value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
          }
          if (fieldName === 'phase' && typeof value === 'string') {
            value = value.toLowerCase();
          }
          
          newRow[fieldName] = value;
        });
        return newRow;
      });
      
      validateAndUploadData(mappedData);
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
    const validMethods = ["Visit", "Call", "Email", "Reference", "Other"];
    return validMethods.some((m) => m.toLowerCase() === method.toLowerCase());
  };

  const validatePhase = (phase) => {
    if (!phase) return false;
    const validPhases = ["hot", "warm", "cold"];
    return validPhases.includes(phase.toLowerCase());
  };

  const validateCourseType = (courseType) => {
    if (!courseType) return false;
    const validTypes = [
      "Engineering",
      "MBA",
      "BBA",
      "BCA",
      "MCA",
      "Diploma",
      "BSC",
      "MSC",
      "Others",
    ];
    return validTypes.some((t) => t.toLowerCase() === courseType.toLowerCase());
  };

  const validateAndUploadData = async (data) => {
    try {
      if (!data || data.length === 0) {
        throw new Error("File is empty");
      }

      // Check for missing required fields in each row
      const rowsWithMissingFields = [];
      data.forEach((row, index) => {
        const missingFields = requiredFields.filter(
          (field) => !(field in row) || String(row[field]).trim() === ""
        );

        if (missingFields.length > 0) {
          rowsWithMissingFields.push({
            rowNumber: index + 2, // +2 because header is row 1 and we count from 0
            missingFields,
          });
        }
      });

      if (rowsWithMissingFields.length > 0) {
        const errorMessage = `Missing required fields in some rows:\n${rowsWithMissingFields
          .map((r) => `Row ${r.rowNumber}: ${r.missingFields.join(", ")}`)
          .join("\n")}`;
        throw new Error(errorMessage);
      }

      // Rest of your existing validation logic...
      const validatedLeads = [];
      const errorLeads = [];

      data.forEach((lead, index) => {
        const errors = {};
        let hasError = false;

        // Validate required fields
        requiredFields.forEach((field) => {
          if (!lead[field] || String(lead[field]).trim() === "") {
            errors[field] = "This field is required";
            hasError = true;
          }
        });

        // Validate field formats
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
            "Contact method must be one of: Visit, Call, Email, Reference, Other";
          hasError = true;
        }

        if (lead.phase && !validatePhase(lead.phase)) {
          errors.phase = "Phase must be one of: hot, warm, cold";
          hasError = true;
        }

        if (lead.courseType && !validateCourseType(lead.courseType)) {
          errors.courseType =
            "Course type must be one of: Engineering, MBA, BBA, BCA, MCA, Diploma, BSC, MSC, Others";
          hasError = true;
        }

        // Validate specializations
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

        // Validate accreditation
        if (
          lead.accreditation &&
          !accreditationOptions.includes(lead.accreditation)
        ) {
          errors.accreditation = "Invalid accreditation value";
          hasError = true;
        }

        // Validate university affiliation
        if (
          lead.affiliation &&
          lead.affiliation !== "Other" &&
          !universityOptions.includes(lead.affiliation)
        ) {
          errors.affiliation = "Invalid university affiliation";
          hasError = true;
        }

        // Validate dates
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

        // Process specializations
        const specializations = lead.specializations
          ? typeof lead.specializations === "string"
            ? lead.specializations
                .split(",")
                .map((item) => item.trim())
                .filter((item) => item && isNaN(item)) // Filter out numeric values
            : Array.isArray(lead.specializations)
            ? lead.specializations.filter((item) => isNaN(item))
            : []
          : [];

        // Calculate TCV if not provided
        const studentCount = lead.studentCount ? Number(lead.studentCount) : 0;
        const perStudentCost = lead.perStudentCost
          ? Number(lead.perStudentCost)
          : 0;
        const tcv = lead.tcv ? Number(lead.tcv) : studentCount * perStudentCost;

        const leadToUpload = {
          businessName: lead.businessName || "",
          address: lead.address || "",
          city: lead.city || "",
          state: lead.state || "",
          pocName: lead.pocName || "",
          phoneNo: String(lead.phoneNo || ""),
          email: lead.email || "",
          contactMethod: lead.contactMethod || "Visit",
          phase: lead.phase || "cold",
          createdAt: new Date().getTime(),
          assignedTo: {
            uid: currentUser?.uid || "imported-unknown-uid",
            name: currentUser?.displayName || "Imported Lead",
            email: currentUser?.email || "no-email@imported.com",
          },
          firestoreTimestamp: serverTimestamp(),
          lastUpdatedAt: serverTimestamp(),
          lastUpdatedBy: "import-process",
          // Course information
          courses: [
            {
              courseType: lead.courseType || "",
              specializations: specializations,
              manualSpecialization: lead.manualSpecialization || "",
              manualCourseType: lead.manualCourseType || "",
              passingYear: lead.passingYear || "",
              studentCount: studentCount,
              perStudentCost: perStudentCost,
              tcv: tcv,
            },
          ],
          // Accreditation and affiliation
          affiliation: lead.affiliation || null,
          accreditation: lead.accreditation || null,
          manualAffiliation: lead.manualAffiliation || "",
          manualAccreditation: lead.manualAccreditation || "",
          // Optional fields
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
    XLSX.writeFile(workbook, "College_Leads_Import_Errors.xlsx");
  };

  const downloadSampleFile = () => {
    // Define user-friendly header names
    const headerDisplayNames = {
      businessName: "College Name",
      address: "Address",
      city: "City",
      state: "State",
      pocName: "Contact Person",
      phoneNo: "Phone Number",
      email: "Email Address",
      contactMethod: "Contact Method",
      phase: "Lead Phase",
      affiliation: "University Affiliation",
      accreditation: "NAAC Accreditation",
      courseType: "Course Type",
      specializations: "Specializations (comma separated)",
      passingYear: "Passing Year",
      studentCount: "Student Count",
      perStudentCost: "Per Student Cost (₹)",
      tcv: "Total Contract Value (₹)",
      expectedClosureDate: "Expected Closure Date (yyyy-mm-dd)",
      notes: "Notes",
      followups: "Follow-ups (JSON format)",
    };

    // Sample data with all possible fields
    const sampleData = [
      {
        businessName: "ABC College of Engineering",
        address: "123 College Street, Education Nagar",
        state: "Maharashtra",
        city: "Pune",
        pocName: "Dr. Ramesh Patil",
        phoneNo: "9876543210",
        email: "principal@abccollege.edu",
        contactMethod: "Visit",
        phase: "hot",
        affiliation: "University of Mumbai",
        accreditation: "A+",
        courseType: "Engineering",
        specializations: "CS,IT,Mechanical",
        passingYear: "2024-2025",
        studentCount: "120",
        perStudentCost: "5000",
        tcv: "600000",
        expectedClosureDate: "2025-11-15",
        notes: "Interested in AI/ML program",
        followups: JSON.stringify({
          initial: {
            date: new Date().toISOString().split("T")[0],
            time: "10:00 AM",
            remarks: "Initial contact made",
            timestamp: Date.now(),
          },
        }),
      },
      {
        businessName: "XYZ Business School",
        address: "456 Business Avenue",
        state: "Karnataka",
        city: "Bangalore",
        pocName: "Ms. Priya Sharma",
        phoneNo: "8765432109",
        email: "admissions@xyzbschool.edu",
        contactMethod: "Email",
        phase: "warm",
        affiliation: "Other",
        manualAffiliation: "XYZ Autonomous University",
        accreditation: "B++",
        courseType: "MBA",
        specializations: "Marketing,Finance",
        passingYear: "2023-2024",
        studentCount: "80",
        perStudentCost: "7500",
        tcv: "600000",
        expectedClosureDate: "2025-09-30",
      },
    ];

    // Enhanced instructions with styling metadata
    const instructions = [
      { instruction: "COLLEGE LEADS IMPORT GUIDE", type: "header" },
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
      { instruction: "city: Location (letters only)", type: "field" },
      { instruction: "state: State where college is located", type: "field" },
      { instruction: "pocName: Contact person's full name", type: "field" },
      { instruction: "phoneNo: 10-digit number (no symbols)", type: "field" },
      { instruction: "email: Valid email address format", type: "field" },
      {
        instruction:
          "contactMethod: One of [Visit, Call, Email, Reference, Other]",
        type: "field",
      },
      { instruction: "phase: One of [hot, warm, cold]", type: "field" },
      {
        instruction:
          "courseType: One of [Engineering, MBA, BBA, BCA, MCA, Diploma, BSC, MSC, Others]",
        type: "field",
      },
      { type: "spacer" },
      { instruction: "Course Information:", type: "subsection" },
      {
        instruction: "specializations: Comma-separated values (e.g. 'CS,IT')",
        type: "field",
      },
      {
        instruction: "studentCount: Number of students (numeric only)",
        type: "field",
      },
      {
        instruction: "perStudentCost: Cost per student (numeric only)",
        type: "field",
      },
      {
        instruction: "tcv: Total contract value (auto-calculated if blank)",
        type: "field",
      },
      {
        instruction: "passingYear: Academic year (e.g. 2024-2025)",
        type: "field",
      },
      { type: "spacer" },
      { instruction: "Accreditation:", type: "subsection" },
      {
        instruction:
          "accreditation: One of [A++, A+, A, B++, B+, B, C, D, Not Accredited, Applied For, Other]",
        type: "field",
      },
      {
        instruction:
          "manualAccreditation: Required if accreditation is 'Other'",
        type: "field",
      },
      { instruction: "Affiliation:", type: "subsection" },
      {
        instruction: "affiliation: Select from university list or 'Other'",
        type: "field",
      },
      {
        instruction: "manualAffiliation: Required if affiliation is 'Other'",
        type: "field",
      },
      { type: "spacer" },
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

      // Apply styling based on whether field is required
      const isRequired =
        requiredFields.includes(key) || courseFields.includes(key);
      ws[cellAddress].s = {
        fill: {
          patternType: "solid",
          fgColor: {
            rgb: isRequired ? "E6FFE6" : "FFFFE0", // Green for required, yellow for optional
          },
        },
        font: {
          bold: true,
          color: { rgb: isRequired ? "006600" : "666600" }, // Dark green for required, dark yellow for optional
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
    XLSX.utils.book_append_sheet(workbook, ws, "College Leads Data");

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

    // ===== University List Sheet =====
    const universityWs = XLSX.utils.json_to_sheet(
      universityOptions.map((uni) => ({ "University Name": uni })),
      { skipHeader: true }
    );
    XLSX.utils.book_append_sheet(workbook, universityWs, "University List");

    // ===== Export File =====
    XLSX.writeFile(workbook, "College_Leads_Import_Template.xlsx");
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
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg z-10 border border-gray-200">
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
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
              Download template
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
              <strong>Success!</strong> Added {importStatus.count} college leads
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
