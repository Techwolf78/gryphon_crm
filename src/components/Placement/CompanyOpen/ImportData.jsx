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
import { db } from "../../../firebase";
import { getAuth } from "firebase/auth";
import { normalizeSalaryForStorage, normalizeStipendForStorage } from "../../../utils/salaryUtils";

const ImportData = ({ handleImportComplete }) => {
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

  // Required fields for company data
  const requiredFields = [
    "companyName",
    "college",
    "jobDesignation",
    "course",
    "jobType",
    "source",
  ];

  const headerToFieldMap = {
    "Company Name": "companyName",
    "College": "college",
    "Job Designation": "jobDesignation",
    "Course": "course",
    "Specialization": "specialization",
    "Job Type": "jobType",
    "Source": "source",
    "Salary (LPA)": "salary",
    "Stipend (₹/month)": "stipend",
    "Job Location": "jobLocation",
    "Company Website": "companyWebsite",
    "Eligibility Criteria": "marksCriteria",
    "Passing Year": "passingYear",
    "Mode of Interview": "modeOfInterview",
    "Joining Period": "joiningPeriod",
    "Mode of Work": "modeOfWork",
    "Job Description": "jobDescription",
    "Internship Duration (months)": "internshipDuration",
    "Company Open Date": "companyOpenDate",
    "Status": "status",
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
            newRow[fieldName] = row[header];
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
            newRow[fieldName] = row[header];
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

  const validateAndUploadData = async (data) => {
    try {
      if (!data || data.length === 0) {
        throw new Error("File is empty");
      }

      // Check for missing required fields
      const rowsWithMissingFields = [];
      data.forEach((row, index) => {
        const missingFields = requiredFields.filter(
          (field) => !(field in row) || String(row[field]).trim() === ""
        );

        if (missingFields.length > 0) {
          rowsWithMissingFields.push({
            rowNumber: index + 2,
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

      const validatedCompanies = [];
      const errorCompanies = [];

      data.forEach((company, index) => {
        const errors = {};
        let hasError = false;

        // Validate required fields
        requiredFields.forEach((field) => {
          if (!company[field] || String(company[field]).trim() === "") {
            errors[field] = "This field is required";
            hasError = true;
          }
        });

        // Validate status
        if (company.status && !["ongoing", "complete", "onhold", "cancel", "noapplications"].includes(company.status.toLowerCase())) {
          errors.status = "Status must be one of: ongoing, complete, onhold, cancel, noapplications";
          hasError = true;
        }

        // Validate job type
        if (company.jobType && !["Full Time", "Internship", "Part Time"].includes(company.jobType)) {
          errors.jobType = "Job type must be one of: Full Time, Internship, Part Time";
          hasError = true;
        }

        if (hasError) {
          errorCompanies.push({
            ...company,
            __rowNumber: index + 2,
            __errors: errors,
          });
        } else {
          validatedCompanies.push(company);
        }
      });

      if (validatedCompanies.length === 0 && errorCompanies.length > 0) {
        setErrorData(errorCompanies);
        throw new Error(
          "All records have validation errors. Download error file to see details."
        );
      }

      if (errorCompanies.length > 0) {
        setErrorData(errorCompanies);
        throw new Error(
          `${errorCompanies.length} records have validation errors. Download error file to see details.`
        );
      }

      setImportStatus((prev) => ({ ...prev, loading: true }));

      // Use batch write for better performance
      const batch = writeBatch(db);
      const currentUser = auth.currentUser;

      validatedCompanies.forEach((company) => {
        const docRef = doc(collection(db, "companies"));

        const companyToUpload = {
          companyName: company.companyName || "",
          college: company.college || "",
          jobDesignation: company.jobDesignation || "",
          course: company.course || "",
          specialization: company.specialization || "",
          jobType: company.jobType || "Full Time",
          source: company.source || "",
          salary: normalizeSalaryForStorage(company.salary),
          stipend: normalizeStipendForStorage(company.stipend),
          jobLocation: company.jobLocation || "",
          companyWebsite: company.companyWebsite || "",
          marksCriteria: company.marksCriteria || "",
          passingYear: company.passingYear || "",
          modeOfInterview: company.modeOfInterview || "",
          joiningPeriod: company.joiningPeriod || "",
          modeOfWork: company.modeOfWork || "",
          jobDescription: company.jobDescription || "",
          internshipDuration: company.internshipDuration ? Number(company.internshipDuration) : null,
          companyOpenDate: company.companyOpenDate || "",
          status: company.status ? company.status.toLowerCase() : "ongoing",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          assignedTo: currentUser ? {
            uid: currentUser.uid,
            name: currentUser.displayName || "Unknown",
            email: currentUser.email || "",
          } : null,
        };

        batch.set(docRef, companyToUpload);
      });

      await batch.commit();

      setImportStatus({
        loading: false,
        success: true,
        error: null,
        count: validatedCompanies.length,
      });

      if (handleImportComplete) {
        handleImportComplete();
      }

      // Close the dropdown after successful import
      setTimeout(() => setIsDropdownOpen(false), 2000);
    } catch (error) {
      handleImportError(error.message || "Invalid data structure");
    }
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

    const exportData = errorData.map((item) => {
      const cleanItem = { ...item };
      delete cleanItem.__errors;
      delete cleanItem.__rowNumber;
      return cleanItem;
    });

    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Highlight error cells
    const errorCells = new Map();
    errorData.forEach((errorItem) => {
      Object.keys(errorItem.__errors).forEach((field) => {
        const rowIndex = errorData.indexOf(errorItem) + 1;
        const colIndex = Object.keys(exportData[0]).indexOf(field);
        if (colIndex >= 0) {
          errorCells.set(`${rowIndex}-${colIndex}`, true);
        }
      });
    });

    Object.keys(ws).forEach((cellAddress) => {
      if (cellAddress.startsWith("!")) return;

      const cell = XLSX.utils.decode_cell(cellAddress);
      const cellKey = `${cell.r}-${cell.c}`;

      if (errorCells.has(cellKey)) {
        ws[cellAddress].s = {
          fill: {
            patternType: "solid",
            fgColor: { rgb: "FFCCCC" },
          },
          font: {
            color: { rgb: "FF0000" },
            bold: true,
          },
        };
      }
    });

    XLSX.utils.book_append_sheet(workbook, ws, "Errors");
    XLSX.writeFile(workbook, "Company_Data_Import_Errors.xlsx");
  };

  const downloadSampleFile = () => {
    const sampleData = [
      {
        companyName: "Tech Solutions Pvt Ltd",
        college: "ABC College of Engineering",
        jobDesignation: "Software Engineer",
        course: "Engineering",
        specialization: "Computer Science",
        jobType: "Full Time",
        source: "LinkedIn",
        salary: "6",
        jobLocation: "Mumbai",
        companyWebsite: "https://techsolutions.com",
        marksCriteria: "60% aggregate",
        passingYear: "2024",
        modeOfInterview: "Online",
        joiningPeriod: "Immediate",
        modeOfWork: "Remote",
        jobDescription: "Develop and maintain web applications",
        companyOpenDate: "2025-01-15",
        status: "ongoing",
      },
      {
        companyName: "DataCorp",
        college: "XYZ Institute of Technology",
        jobDesignation: "Data Analyst Intern",
        course: "Engineering",
        specialization: "Information Technology",
        jobType: "Internship",
        source: "Campus Placement",
        stipend: "15000",
        jobLocation: "Pune",
        internshipDuration: "6",
        companyOpenDate: "2025-02-01",
        status: "ongoing",
      },
    ];

    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData, { origin: "A2" });

    // Apply styles to headers
    const headerKeys = Object.keys(sampleData[0]);
    headerKeys.forEach((key, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: colIndex });
      if (headerToFieldMap[key]) {
        ws[cellAddress].v = Object.keys(headerToFieldMap).find(k => headerToFieldMap[k] === key) || key;
      }

      const isRequired = requiredFields.includes(key);
      ws[cellAddress].s = {
        fill: {
          patternType: "solid",
          fgColor: {
            rgb: isRequired ? "E6FFE6" : "FFFFE0",
          },
        },
        font: {
          bold: true,
          color: { rgb: isRequired ? "006600" : "666600" },
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

    ws["!cols"] = headerKeys.map((key) => {
      const displayName = Object.keys(headerToFieldMap).find(k => headerToFieldMap[k] === key) || key;
      return { wch: Math.max(displayName.length, 15) };
    });

    XLSX.utils.book_append_sheet(workbook, ws, "Company Data");
    XLSX.writeFile(workbook, "Company_Data_Import_Template.xlsx");
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className="flex items-center justify-center px-2 py-1 bg-white border border-gray-300 rounded-lg shadow-sm text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 ease-in-out hover:shadow-md"
      >
        <FiUpload className="w-4 h-4 mr-2" />
        Import Data
        <FiChevronDown
          className={`w-4 h-4 ml-2 transition-transform ${
            isDropdownOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Import Company Data
            </p>
          </div>
          <div className="p-4 space-y-3">
            <button
              onClick={downloadSampleFile}
              className="w-full flex items-center justify-center px-3 py-2 border border-blue-300 rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors text-sm"
            >
              <FiDownload className="w-4 h-4 mr-2" />
              Download Template
            </button>

            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={importStatus.loading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importStatus.loading}
                className="w-full flex items-center justify-center px-3 py-2 border border-green-300 rounded-md text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <FiUpload className="w-4 h-4 mr-2" />
                {importStatus.loading ? "Processing..." : "Choose File"}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Supports CSV and Excel formats
            </p>

            {importStatus.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex justify-between items-start">
                  <div className="text-red-700 text-xs">
                    <strong>Error:</strong> {importStatus.error}
                    {errorData && errorData.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={downloadErrorFile}
                          className="text-blue-600 hover:text-blue-800 underline text-xs"
                        >
                          Download error details
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={resetState}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {importStatus.success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex justify-between items-start">
                  <div className="text-green-700 text-xs">
                    <strong>Success!</strong> Imported {importStatus.count} companies
                  </div>
                  <button
                    onClick={resetState}
                    className="text-green-500 hover:text-green-700"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportData;