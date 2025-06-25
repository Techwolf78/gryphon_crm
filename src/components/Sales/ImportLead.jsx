import { useState, useRef, useEffect } from "react";
import { FiUpload, FiDownload, FiChevronDown, FiX, FiCheck } from "react-icons/fi";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase"; // Adjust path as needed
import { getAuth } from "firebase/auth";

const ImportLead = ({ handleImportComplete }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [importStatus, setImportStatus] = useState({
    loading: false,
    success: false,
    error: null,
    count: 0
  });
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const auth = getAuth();

  // Required fields based on your system
  const requiredFields = [
    'businessName',
    'city',
    'pocName',
    'phoneNo',
    'email',
    'tcv'
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
      error: (err) => handleImportError(err.message || "Error parsing CSV file")
    });
  };

  const processExcel = (file) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
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

  const validateAndUploadData = async (data) => {
    try {
      if (!data || data.length === 0) {
        throw new Error("File is empty");
      }
      
      // Validate required fields
      const sampleKeys = Object.keys(data[0] || {});
      const missingFields = requiredFields.filter(f => !sampleKeys.includes(f));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }
      
      // Filter valid leads
      const validLeads = data.filter(lead => 
        requiredFields.every(field => lead[field] && String(lead[field]).trim() !== "")
      );
      
      if (validLeads.length === 0) {
        throw new Error("No valid leads found in the file");
      }

      // Upload to Firebase
      setImportStatus(prev => ({ ...prev, loading: true }));
      
      const batchResults = await Promise.allSettled(
        validLeads.map(lead => uploadLeadToFirebase(lead))
      );

      const successfulImports = batchResults.filter(r => r.status === "fulfilled");
      const failedImports = batchResults.filter(r => r.status === "rejected");

      setImportStatus({
        loading: false,
        success: true,
        error: failedImports.length > 0 
          ? `${failedImports.length} records failed to import` 
          : null,
        count: successfulImports.length
      });

      // Refresh table data if provided
      if (handleImportComplete) {
        handleImportComplete();
      }

    } catch (error) {
      handleImportError(error.message || "Invalid data structure");
    }
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
      phase: "hot", // Default phase
      createdAt: serverTimestamp(), // Firestore server timestamp
      openedDate: currentDate.getTime(), // Current timestamp for "Opened Date"
      assignedTo: currentUser ? { 
        uid: currentUser.uid,
        name: currentUser.displayName || "Current User"
      } : null,
    };

    // Add optional fields
    if (leadData.expectedClosureDate) {
      leadToUpload.expectedClosureDate = new Date(leadData.expectedClosureDate).getTime();
    }

    if (leadData.notes) {
      leadToUpload.notes = leadData.notes;
    }

    if (leadData.followups) {
      try {
        leadToUpload.followup = typeof leadData.followups === 'string' 
          ? JSON.parse(leadData.followups) 
          : leadData.followups;
      } catch {
        leadToUpload.followup = {
          initial: {
            date: currentDate.toISOString().split('T')[0], // Use current date
            time: "12:00 PM",
            remarks: leadData.notes || "Initial contact",
            timestamp: Date.now()
          }
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
      count: 0
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

    const resetState = () => {
    setImportStatus({ loading: false, success: false, error: null, count: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportStatus({ loading: true, success: false, error: null, count: 0 });
    setIsDropdownOpen(false);
    
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (extension === 'csv') {
      processCSV(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      processExcel(file);
    } else {
      handleImportError("Unsupported file format. Please use CSV or Excel files.");
    }
  };

const downloadSampleFile = () => {
  // Create sample data with all table columns
  const sampleData = [
    {
      // Required fields (will be highlighted green)
      businessName: "ABC College",
      city: "New York",
      pocName: "John Doe",
      phoneNo: "123-456-7890",
      email: "john@example.com",
      tcv: "25000",
      expectedClosureDate: "2025-11-15",
      followups: JSON.stringify({
        initial: {
          date: new Date().toISOString().split('T')[0],
          time: "10:00 AM",
          remarks: "Initial contact made",
          timestamp: Date.now()
        }
      }),
    }
  ];
  
  // Create detailed instructions with color coding
  const instructions = [
    { instruction: "FILE REQUIREMENTS:" },
    { instruction: "1. Required fields (highlighted in green) must be filled for all records" },
    { instruction: "2. Optional fields are highlighted in yellow" },
    { instruction: "3. Do not modify column headers" },
    { instruction: "4. Date fields should be in timestamp format (milliseconds since epoch)" },
    { instruction: "5. TCV should be numeric without currency symbols" },
    { instruction: "" },
    { instruction: "REQUIRED FIELDS (MUST INCLUDE):" },
    { instruction: "- businessName: College/Institution name" },
    { instruction: "- city: Location of the institution" },
    { instruction: "- pocName: Contact person's name" },
    { instruction: "- phoneNo: Contact phone number" },
    { instruction: "- email: Contact email address" },
    { instruction: "- tcv: Total Contract Value (numeric)" },
    { instruction: "" },
    { instruction: "OPTIONAL FIELDS:" },
    { instruction: "- openedDate: When lead was created (timestamp)" },
    { instruction: "- expectedClosureDate: Expected deal closure date (timestamp)" },
    { instruction: "- followups: JSON string of followup history" },
    { instruction: "- assignedTo: JSON string with uid and name of assigned user" },
    { instruction: "" },
    { instruction: "TIPS:" },
    { instruction: "1. Remove these instructions before saving your data" },
    { instruction: "2. Keep one row per institution" },
    { instruction: "3. All leads will be imported with current user as default assignee if not specified" }
  ];
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Add data sheet with styling
  const dataSheet = XLSX.utils.json_to_sheet(sampleData);
  
  // Apply color formatting to headers
  const requiredFields = ['businessName', 'city', 'pocName', 'phoneNo', 'email', 'tcv'];
  const optionalFields = ['openedDate', 'expectedClosureDate', 'followups', 'assignedTo'];
  
  // Add color formatting (Excel will show these colors)
  dataSheet["!cols"] = Object.keys(sampleData[0]).map((key) => ({
    width: 15,
    fill: {
      patternType: "solid",
      fgColor: requiredFields.includes(key) 
        ? { rgb: "E6FFE6" } // Light green for required
        : { rgb: "FFFFE0" } // Light yellow for optional
    }
  }));
  
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Leads Data");
  
  // Add instructions sheet
  const instructionSheet = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions");
  
  // Generate and download file
  XLSX.writeFile(workbook, "Leads_Import_Template.xlsx");
  setIsDropdownOpen(false);
};
  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Import Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border transition-all ${
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
          <div className="flex items-center gap-2">
            <FiUpload className="w-4 h-4" />
            <span>Import Leads</span>
            <FiChevronDown className="w-4 h-4" />
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-gray-200">
          <div className="py-1">
            <button
              onClick={downloadSampleFile}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <FiDownload className="w-4 h-4 mr-2 text-blue-600" />
              Download Sample File
            </button>
            
            <label className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
              <FiUpload className="w-4 h-4 mr-2 text-green-600" />
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
        </div>
      )}

      {/* Status indicators */}
      {importStatus.error && (
        <div className="absolute left-0 mt-2 w-full bg-red-50 text-red-700 text-xs p-2 rounded shadow z-10">
          <div className="flex justify-between items-start">
            <div>
              <strong>Import failed:</strong> {importStatus.error}
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
              <strong>Success!</strong> Imported {importStatus.count} leads
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