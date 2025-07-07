import { useState, useRef, useEffect } from "react";
import { FiUpload, FiDownload, FiChevronDown, FiX, FiCheck, FiInfo } from "react-icons/fi";
import * as XLSX from "xlsx";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth } from "firebase/auth";

const ImportData = ({ show, onClose, handleImportComplete }) => {
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

  const requiredFields = [
    "companyName",
    "course",
    "jobType",
    "jobDesignation",
    "jobLocation",
    "status"
  ];

  const statusMapping = {
    "ongoing": "ongoing",
    "onhold": "onhold",
    "complete": "complete",
    "cancel": "cancel",
    "noapplications": "noapplications",
    "Ongoing(5)": "ongoing",
    "Onhold(0)": "onhold",
    "Complete(0)": "complete",
    "Cancel(0)": "cancel",
    "Noapplications(0)": "noapplications"
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const validateStatus = (status) => {
    if (!status) return false;
    const normalizedStatus = status.toLowerCase().replace(/\s*\(\d+\)\s*$/, '');
    return Object.keys(statusMapping).includes(normalizedStatus);
  };

  const validateDate = (dateString) => {
    if (!dateString) return true;
    if (typeof dateString === 'object' && dateString instanceof Date) return true;
    if (typeof dateString === 'number') return true;
    
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return !isNaN(date.getTime());
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "";
    if (typeof dateValue === 'string') return dateValue;
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return "";
    }
  };

  const validateAndUploadData = async (data) => {
    try {
      if (!data || data.length === 0) {
        throw new Error("File is empty");
      }

      const sampleKeys = Object.keys(data[0] || {});
      const missingFields = requiredFields.filter(f => !sampleKeys.includes(f));

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      const validatedData = [];
      const errorData = [];

      data.forEach((item, index) => {
        const errors = {};
        let hasError = false;

        requiredFields.forEach(field => {
          if (!item[field] || String(item[field]).trim() === "") {
            errors[field] = "This field is required";
            hasError = true;
          }
        });

        if (item.status && !validateStatus(item.status)) {
          errors.status = "Invalid status value";
          hasError = true;
        }

        if (item.joiningPeriod && !validateDate(item.joiningPeriod)) {
          errors.joiningPeriod = "Date must be in format dd/mm/yyyy";
          hasError = true;
        }

        if (item.companyOpenDate && !validateDate(item.companyOpenDate)) {
          errors.companyOpenDate = "Date must be in format dd/mm/yyyy";
          hasError = true;
        }

        if (hasError) {
          errorData.push({
            ...item,
            __rowNumber: index + 2,
            __errors: errors
          });
        } else {
          validatedData.push(item);
        }
      });

      if (validatedData.length === 0 && errorData.length > 0) {
        setErrorData(errorData);
        throw new Error("All records have validation errors. Download error file to see details.");
      }

      if (errorData.length > 0) {
        setErrorData(errorData);
        throw new Error(`${errorData.length} records have validation errors. Download error file to see details.`);
      }

      setImportStatus(prev => ({ ...prev, loading: true }));

      const batchResults = await Promise.allSettled(
        validatedData.map(item => uploadToFirebase(item))
      );

      const successfulImports = batchResults.filter(r => r.status === "fulfilled");
      const failedImports = batchResults.filter(r => r.status === "rejected");

      setImportStatus({
        loading: false,
        success: true,
        error: failedImports.length > 0 ? `${failedImports.length} records failed to import` : null,
        count: successfulImports.length,
      });

      if (handleImportComplete) {
        handleImportComplete();
      }
    } catch (error) {
      handleImportError(error.message || "Invalid data structure");
    }
  };

  const uploadToFirebase = async (data) => {
    try {
      const currentUser = auth.currentUser;
      
      const normalizedStatus = statusMapping[data.status.toLowerCase().replace(/\s*\(\d+\)\s*$/, '')] || "ongoing";
      
      const companyData = {
        companyName: data.companyName || "",
        companyWebsite: data.companyWebsite || "",
        course: data.course || "",
        specialization: data.specialization || "",
        passingYear: data.passingYear || "",
        marksCriteria: data.marksCriteria || "",
        backlogCriteria: data.backlogCriteria || "",
        otherCriteria: data.otherCriteria || "",
        jobType: data.jobType || "",
        jobDesignation: data.jobDesignation || "",
        jobLocation: data.jobLocation || "",
        salary: data.salary || "",
        internshipDuration: data.internshipDuration || "",
        stipend: data.stipend || "",
        modeOfInterview: data.modeOfInterview || "Online",
        joiningPeriod: formatDate(data.joiningPeriod) || "",
        companyOpenDate: formatDate(data.companyOpenDate) || "",
        modeOfWork: data.modeOfWork || "",
        jobDescription: data.jobDescription || "",
        source: data.source || "",
        coordinator: data.coordinator || "",
        status: normalizedStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        assignedTo: currentUser ? {
          uid: currentUser.uid,
          name: currentUser.displayName || "Current User"
        } : null
      };

      await addDoc(collection(db, "companies"), companyData);
      return { success: true };
    } catch (error) {
      console.error("Error uploading company data:", error);
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
    if (fileInputRef.current) fileInputRef.current.value = "";
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

    if (extension === "xlsx" || extension === "xls") {
      processExcel(file);
    } else {
      handleImportError("Unsupported file format. Please use Excel files.");
    }
  };

  const downloadErrorFile = () => {
    if (!errorData || errorData.length === 0) return;

    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(errorData.map(item => {
      const cleanItem = { ...item };
      delete cleanItem.__errors;
      delete cleanItem.__rowNumber;
      return cleanItem;
    }));

    const errorMessages = errorData.map(item => ({
      "Row Number": item.__rowNumber,
      ...item.__errors
    }));
    const errorWs = XLSX.utils.json_to_sheet(errorMessages);
    
    XLSX.utils.book_append_sheet(workbook, ws, "Original Data");
    XLSX.utils.book_append_sheet(workbook, errorWs, "Error Details");
    XLSX.writeFile(workbook, "Import_Errors.xlsx");
  };

  const downloadSampleFile = () => {
    const sampleData = [{
      companyName: "Tech Solutions Inc",
      companyWebsite: "www.techsolutions.com",
      course: "B.Tech/BE",
      specialization: "CS/IT",
      passingYear: "2025",
      marksCriteria: "60% & Above Throughout",
      backlogCriteria: "No Active Backlog",
      otherCriteria: "",
      jobType: "Full Time",
      jobDesignation: "Software Engineer",
      jobLocation: "Bangalore",
      salary: "8",
      internshipDuration: "",
      stipend: "",
      modeOfInterview: "Online",
      joiningPeriod: "15/08/2025",
      companyOpenDate: "10/07/2025",
      modeOfWork: "Hybrid",
      jobDescription: "Develop and maintain software applications",
      source: "Company Website",
      coordinator: "John Doe",
      status: "Ongoing(5)"
    }];

    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    const headerKeys = Object.keys(sampleData[0]);
    headerKeys.forEach((key, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
      ws[cellAddress] = {
        v: key,
        t: "s",
        s: {
          fill: {
            patternType: "solid",
            fgColor: { rgb: requiredFields.includes(key) ? "E6FFE6" : "FFFFE0" }
          },
          font: { bold: true },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        }
      };
    });

    const instructions = [
      ["INSTRUCTIONS FOR IMPORTING DATA"],
      [""],
      ["1. Required fields are highlighted in green"],
      ["2. Status must be one of: Ongoing(5), Onhold(0), Complete(0), Cancel(0), Noapplications(0)"],
      ["3. Dates must be in dd/mm/yyyy format or Excel date format"],
      ["4. Salary should be in LPA (just the number)"],
      ["5. Stipend should be in monthly amount (just the number)"],
      ["6. For empty fields, leave the cell blank"]
    ];
    
    const instructionWs = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(workbook, ws, "Sample Data");
    XLSX.utils.book_append_sheet(workbook, instructionWs, "Instructions");
    XLSX.writeFile(workbook, "JD_Import_Template.xlsx");
    setIsDropdownOpen(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-start justify-center bg-black bg-transparent z-54 pt-16">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Import JD Data</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="relative inline-block" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                importStatus.loading
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : importStatus.success
                  ? "bg-green-50 border-green-200 text-green-700"
                  : importStatus.error
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
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
                <div className="flex items-center gap-2">
                  <FiUpload className="w-4 h-4" />
                  <span>Select File</span>
                  <FiChevronDown className="w-4 h-4" />
                </div>
              )}
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-gray-200">
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
                    Download sample file
                  </button>

                  <label className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <FiUpload className="w-4 h-4 mr-2 text-green-500" />
                    Import from file
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100 bg-gray-50 flex items-center gap-1">
                  <FiInfo className="w-3 h-3 text-blue-400" />
                  Supports Excel format
                </div>
              </div>
            )}

            {importStatus.error && (
              <div className="absolute left-0 mt-2 w-full bg-red-50 text-red-700 text-xs p-2 rounded shadow z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <strong>Error:</strong> {importStatus.error}
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
                    <strong>Success!</strong> Added {importStatus.count} companies
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

          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">Instructions:</h3>
            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
              <li>Download the sample file to see the required format</li>
              <li>Required fields are highlighted in green</li>
              <li>Status must be one of: Ongoing(5), Onhold(0), Complete(0), Cancel(0), Noapplications(0)</li>
              <li>Dates must be in dd/mm/yyyy format or Excel date format</li>
              <li>Salary should be in LPA (just the number)</li>
              <li>Stipend should be in monthly amount (just the number)</li>
              <li>For empty fields, leave the cell blank</li>
            </ul>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end px-6 py-4 bg-gray-100 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportData;