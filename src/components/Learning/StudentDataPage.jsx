import React, { useEffect, useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx-js-style";
import { db } from "../../firebase";
import {
  collection, getDocs, doc, query, onSnapshot, setDoc
} from "firebase/firestore";

function StudentDataPage({ trainingId, onBack }) {
  const [studentData, setStudentData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [serialSortDirection, setSerialSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [isSerialColumnSorted, setIsSerialColumnSorted] = useState(false);
  const tableContainerRef = useRef(null);
  const importOptionsRef = useRef(null);

  const fetchStudentData = useCallback(async () => {
    setLoading(true);
    try {
      const studentsRef = collection(db, "trainingForms", trainingId, "students");
      const snapshot = await getDocs(studentsRef);

      if (snapshot.empty) {
        setStudentData([]);
        setHeaders([]);
        return;
      }

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Collect all unique keys from all documents to create dynamic headers
      const allKeys = new Set();
      data.forEach(student => {
        Object.keys(student).forEach(key => {
          if (key !== 'id') { // Exclude the id field from headers
            allKeys.add(key);
          }
        });
      });

      const dynamicHeaders = Array.from(allKeys).sort((a, b) => {
        // Check if column contains serial number variations (case insensitive)
        const aIsSerial = /^(s\.?\s*no\.?\s*|sr\.?\s*no\.?\s*|serial\s*no\.?\s*)$/i.test(a.trim());
        const bIsSerial = /^(s\.?\s*no\.?\s*|sr\.?\s*no\.?\s*|serial\s*no\.?\s*)$/i.test(b.trim());
        
        // Check if column contains name-related words (case insensitive)
        const aIsName = /name/i.test(a);
        const bIsName = /name/i.test(b);
        
        // Serial numbers first
        if (aIsSerial && !bIsSerial) return -1;
        if (!aIsSerial && bIsSerial) return 1;
        
        // Then names
        if (aIsName && !bIsName) return -1;
        if (!aIsName && bIsName) return 1;
        
        // Alphabetical for same type
        return a.localeCompare(b);
      });
      setHeaders(dynamicHeaders);
      setStudentData(data);
    } catch (err) {
      console.error("Error loading student data:", err);
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [trainingId]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // Real-time updates
  useEffect(() => {
    if (!trainingId) return;

    const q = query(collection(db, "trainingForms", trainingId, "students"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Collect all unique keys from all documents to create dynamic headers
      const allKeys = new Set();
      data.forEach(student => {
        Object.keys(student).forEach(key => {
          if (key !== 'id') { // Exclude the id field from headers
            allKeys.add(key);
          }
        });
      });

      const dynamicHeaders = Array.from(allKeys).sort((a, b) => {
        // Check if column contains serial number variations (case insensitive)
        const aIsSerial = /^(s\.?\s*no\.?\s*|sr\.?\s*no\.?\s*|serial\s*no\.?\s*)$/i.test(a.trim());
        const bIsSerial = /^(s\.?\s*no\.?\s*|sr\.?\s*no\.?\s*|serial\s*no\.?\s*)$/i.test(b.trim());
        
        // Check if column contains name-related words (case insensitive)
        const aIsName = /name/i.test(a);
        const bIsName = /name/i.test(b);
        
        // Serial numbers first
        if (aIsSerial && !bIsSerial) return -1;
        if (!aIsSerial && bIsSerial) return 1;
        
        // Then names
        if (aIsName && !bIsName) return -1;
        if (!aIsName && bIsName) return 1;
        
        // Alphabetical for same type
        return a.localeCompare(b);
      });
      setHeaders(dynamicHeaders);
      setStudentData(data);
    });

    return () => unsubscribe();
  }, [trainingId]);

  const ProfessionalErrorDisplay = ({ error, onDismiss }) => {
    if (!error) return null;

    return (
      <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
        <div className="flex justify-between items-start">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Import Error</h3>
              <div className="mt-1 text-sm text-red-700 whitespace-pre-wrap">{error}</div>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="ml-4 p-1 text-red-500 hover:text-red-700 focus:outline-none"
            aria-label="Dismiss error"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const validateImportedFile = (data) => {
    if (data.length < 2) {
      throw new Error("File must contain at least one data row");
    }

    // For dynamic columns, we just need to ensure there's data
    // No specific header validation needed
  };
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();

    // Add async here
    reader.onload = async (e) => {  // <-- Add async here
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonDataRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonDataRaw.length < 2) {
          throw new Error("File must contain at least one data row");
        }

        validateImportedFile(jsonDataRaw);

        const headersRow = jsonDataRaw[0];
        const newData = jsonDataRaw.slice(1).map((row, index) => {
          const obj = {};
          headersRow.forEach((header, idx) => {
            let value = row[idx] ?? "";
            if (header === "BIRTH DATE" && typeof value === 'number' && value > 0) {
              const date = new Date((value - 25569) * 86400 * 1000);
              value = date.toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'short',
                year: '2-digit'
              }).replace(/(\d+)\/(\d+)\/(\d+)/, '$1-$2-$3');
            }
            obj[header] = value;
          });
          obj.__rowId = `${file.name}-${index}`;
          return obj;
        });

        const { uniqueData, duplicateCount, duplicateRows } = filterDuplicates(newData);

        if (duplicateRows.length > 0) {
          const duplicateDetails = duplicateRows.map(d =>
            `• Row ${d.rowNumber}: "${d["FULL NAME OF STUDENT"] || d.name || d.fullName || "unnamed"}" (${d["EMAIL ID"] || d.email || 'no email'}, ${d["MOBILE NO."] || d.mobile || 'no phone'})`
          ).join('\n');
          setError(`Duplicate entries detected (${duplicateCount} skipped):\n${duplicateDetails}`);
        }

        if (uniqueData.length > 0) {
          const batchWrites = [];

          for (const row of uniqueData) {
            const studentRef = doc(collection(db, "trainingForms", trainingId, "students"));

            // Save the data as-is with dynamic fields
            const studentData = {
              ...row,
              trainingId: trainingId,
              createdAt: new Date()
            };

            // Remove the temporary __rowId field
            delete studentData.__rowId;

            batchWrites.push(setDoc(studentRef, studentData));
          }

          await Promise.all(batchWrites);
          fetchStudentData(); // Refresh the displayed data
        }
      } catch (err) {
        console.error("Error importing file:", err);
        setError(`Import error: ${err.message}`);
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    };

    reader.onerror = () => {
      setError("Failed to read file");
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const filterDuplicates = (newData) => {
    let duplicateCount = 0;
    const duplicateRows = [];

    const uniqueData = newData.filter((newRow, newIndex) => {
      // Check for duplicates based on email and mobile (dynamic field names)
      const newEmail = newRow["EMAIL ID"] || newRow.email || newRow.Email;
      const newMobile = newRow["MOBILE NO."] || newRow.mobile || newRow.Mobile || newRow.phone || newRow.Phone;

      const isDuplicateInExisting = studentData.some(existingRow => {
        const existingEmail = existingRow["EMAIL ID"] || existingRow.email || existingRow.Email;
        const existingMobile = existingRow["MOBILE NO."] || existingRow.mobile || existingRow.Mobile || existingRow.phone || existingRow.Phone;

        const emailMatch = newEmail && existingEmail &&
          newEmail.toLowerCase() === existingEmail.toLowerCase();
        const mobileMatch = newMobile && existingMobile &&
          newMobile === existingMobile;
        return emailMatch || mobileMatch;
      });

      const isDuplicateInNew = newData.slice(0, newIndex).some(otherRow => {
        const otherEmail = otherRow["EMAIL ID"] || otherRow.email || otherRow.Email;
        const otherMobile = otherRow["MOBILE NO."] || otherRow.mobile || otherRow.Mobile || otherRow.phone || otherRow.Phone;

        const emailMatch = newEmail && otherEmail &&
          newEmail.toLowerCase() === otherEmail.toLowerCase();
        const mobileMatch = newMobile && otherMobile &&
          newMobile === otherMobile;
        return emailMatch || mobileMatch;
      });

      const isDuplicate = isDuplicateInExisting || isDuplicateInNew;

      if (isDuplicate) {
        duplicateCount++;
        duplicateRows.push({
          rowNumber: newIndex + 2,
          email: newEmail || "no email",
          mobile: newMobile || "no phone",
          name: newRow["FULL NAME OF STUDENT"] || newRow.fullName || newRow.name || newRow.Name || "unnamed"
        });
      }

      return !isDuplicate;
    });

    return { uniqueData, duplicateCount, duplicateRows };
  };

  const exportToExcel = () => {
    if (studentData.length === 0) {
      alert("No data to export");
      return;
    }

    const exportData = [headers].concat(
      studentData.map(row => headers.map(header => row[header] || ""))
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);

    const headerStyle = {
      fill: { fgColor: { rgb: "7C3AED" } },
      font: { bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center" },
      border: {
        top: { style: "thin", color: { rgb: "4B5563" } },
        bottom: { style: "thin", color: { rgb: "4B5563" } },
        left: { style: "thin", color: { rgb: "4B5563" } },
        right: { style: "thin", color: { rgb: "4B5563" } }
      }
    };

    for (let i = 0; i < headers.length; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      ws[cellRef].s = headerStyle;
    }

    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, "Student Data");
    XLSX.writeFile(wb, `student_data_${trainingId || new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const downloadSampleFile = () => {
    // Create a sample with common student data fields
    const sampleHeaders = [
      "SN", "FULL NAME OF STUDENT", "CURRENT COLLEGE NAME", "EMAIL ID", "MOBILE NO.",
      "BIRTH DATE", "GENDER", "HOMETOWN", "10th PASSING YR", "10th MARKS %",
      "12th PASSING YR", "12th MARKS %", "DIPLOMA COURSE", "DIPLOMA SPECIALIZATION",
      "DIPLOMA PASSING YR", "DIPLOMA MARKS %", "GRADUATION COURSE", "GRADUATION SPECIALIZATION",
      "GRADUATION PASSING YR", "GRADUATION MARKS %", "COURSE", "SPECIALIZATION",
      "PASSING YEAR", "OVERALL MARKS %"
    ];
    const sampleData = [
      [
        1, "Ajay Pawar", "MIT", "XYZ@GMAIL.COM", "9999999999", "24-May-02", "MALE", "PUNE",
        2018, 76, 2020, 87, "", "", "", "", "", "", "", "", "BE", "COMPUTER SCIENCE", 2024, 77,
        "MBA", "BUSINESS ANALYTICS", 2026, 85
      ],
      [
        2, "Deep Mahire", "Symbiosis", "ABC@GMAIL.COM", "8888888888", "26-Jun-04", "MALE",
        "SHIRDI", 2020, 57, 2020, 87, "", "", "", "", "", "", "", "", "BTECH", "MECHANICAL", 2026, 66,
        "MBA", "IT", 2027, 75
      ],
      [
        3, "Sakshi Patil", "COEP", "LMN@GMAIL.COM", "7777777777", "30-Mar-04", "FEMALE",
        "PUNE", 2020, 57, "", "", "DIPLOMA", "CS", 2023, 73, "BTECH", "MECHANICAL", 2026, 66,
        "MBA", "IT", 2027, 75
      ]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleData]);

    const headerStyle = {
      fill: { fgColor: { rgb: "7C3AED" } },
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "4B5563" } },
        bottom: { style: "thin", color: { rgb: "4B5563" } },
        left: { style: "thin", color: { rgb: "4B5563" } },
        right: { style: "thin", color: { rgb: "4B5563" } }
      }
    };

    sampleHeaders.forEach((_, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      ws[cellRef].s = headerStyle;
    });

    // Set appropriate column widths based on content
    ws['!cols'] = [
      { wch: 5 },   // SN
      { wch: 20 },  // FULL NAME OF STUDENT
      { wch: 22 },  // CURRENT COLLEGE NAME
      { wch: 18 },  // EMAIL ID
      { wch: 15 },  // MOBILE NO.
      { wch: 12 },  // BIRTH DATE
      { wch: 8 },   // GENDER
      { wch: 12 },  // HOMETOWN
      { wch: 12 },  // 10th PASSING YR
      { wch: 12 },  // 10th MARKS %
      { wch: 12 },  // 12th PASSING YR
      { wch: 12 },  // 12th MARKS %
      { wch: 15 },  // DIPLOMA COURSE
      { wch: 20 },  // DIPLOMA SPECIALIZATION
      { wch: 15 },  // DIPLOMA PASSING YR
      { wch: 15 },  // DIPLOMA MARKS %
      { wch: 18 },  // GRADUATION COURSE
      { wch: 22 },  // GRADUATION SPECIALIZATION
      { wch: 18 },  // GRADUATION PASSING YR
      { wch: 18 },  // GRADUATION MARKS %
      { wch: 12 },  // COURSE
      { wch: 18 },  // SPECIALIZATION
      { wch: 12 },  // PASSING YEAR
      { wch: 15 }   // OVERALL MARKS %
    ];

    // Set row height for header
    ws['!rows'] = [{ hpt: 30 }]; // Header row height

    XLSX.utils.book_append_sheet(wb, ws, "Sample Student Data");
    XLSX.writeFile(wb, "student_data_sample_template.xlsx");
    setShowImportOptions(false);
  };

  const filteredData = studentData.filter(row => {
    return Object.values(row).some(
      value => String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleSerialSort = () => {
    setSerialSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    setIsSerialColumnSorted(true);
  };

  // Get the serial column header name
  const getSerialHeader = useCallback(() => {
    return headers.find(header => 
      /^(s\.?\s*no\.?\s*|sr\.?\s*no\.?\s*|serial\s*no\.?\s*)$/i.test(header.trim())
    );
  }, [headers]);

  // Sort data based on serial column if sorting is active
  const sortedData = React.useMemo(() => {
    if (!isSerialColumnSorted) return filteredData;
    
    const serialHeader = getSerialHeader();
    if (!serialHeader) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[serialHeader];
      const bVal = b[serialHeader];
      
      // Convert to numbers if possible, otherwise treat as strings
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      
      const aValue = isNaN(aNum) ? aVal : aNum;
      const bValue = isNaN(bNum) ? bVal : bNum;
      
      if (serialSortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [filteredData, serialSortDirection, isSerialColumnSorted, getSerialHeader]);

  // Handle mouse wheel scrolling for horizontal scroll
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
          e.preventDefault();
          container.scrollLeft += e.deltaY;
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Close import dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (importOptionsRef.current && !importOptionsRef.current.contains(event.target)) {
        setShowImportOptions(false);
      }
    };

    if (showImportOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImportOptions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2 text-white flex-shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1">
            <div className="flex items-center gap-1">
              <button
                onClick={onBack}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold">Student List</h1>
                <p className="text-purple-100 text-sm">{trainingId && `Training ID: ${trainingId}`}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              <div className="relative" ref={importOptionsRef}>
                <button
                  onClick={() => setShowImportOptions(!showImportOptions)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Import
                  <svg className={`w-3 h-3 transition-transform ${showImportOptions ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showImportOptions && (
                  <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-xl z-20 overflow-hidden min-w-max">
                    <button onClick={downloadSampleFile} className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-800 text-sm">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Template
                    </button>
                    <label className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-800 cursor-pointer border-t text-sm">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Import File
                      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
                    </label>
                  </div>
                )}
              </div>

              <button
                onClick={exportToExcel}
                className="flex items-center gap-1 px-3 py-1.5 bg-white text-purple-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                disabled={studentData.length === 0}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 pb-6 px-6 overflow-y-auto flex-grow">
          {error && <ProfessionalErrorDisplay error={error} onDismiss={() => setError(null)} />}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-gray-600">Loading student data...</p>
            </div>
          ) : studentData.length > 0 ? (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1 mb-2">
                <div className="relative w-full md:w-48">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search students..."
                    className="block w-full pl-8 pr-2 py-1 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <span>{sortedData.length} students found</span>
                </div>
              </div>

              <div
                ref={tableContainerRef}
                className="overflow-y-auto rounded-lg border border-gray-200 shadow-sm mx-auto"
                style={{
                  height: '100%',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#9CA3AF #F3F4F6'
                }}
              >
                <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      {headers.map((header, idx) => {
                        const isSerialColumn = /^(s\.?\s*no\.?\s*|sr\.?\s*no\.?\s*|serial\s*no\.?\s*)$/i.test(header.trim());
                        const columnWidth = isSerialColumn ? '60px' : `${100 / (headers.length - (headers.some(h => /^(s\.?\s*no\.?\s*|sr\.?\s*no\.?\s*|serial\s*no\.?\s*)$/i.test(h.trim())) ? 1 : 0))}%`;
                        return (
                          <th 
                            key={idx} 
                            scope="col" 
                            className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate ${isSerialColumn ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
                            style={{ width: columnWidth, minWidth: isSerialColumn ? '60px' : 'auto' }}
                            onClick={isSerialColumn ? handleSerialSort : undefined}
                            title={header}
                          >
                            <div className="flex items-center justify-between">
                              <span>{header}</span>
                              {isSerialColumn && (
                                <div className="flex flex-col ml-1">
                                  <svg 
                                    className={`w-2 h-2 ${isSerialColumnSorted && serialSortDirection === 'asc' ? 'text-purple-600' : 'text-gray-400'}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                  <svg 
                                    className={`w-2 h-2 -mt-1 ${isSerialColumnSorted && serialSortDirection === 'desc' ? 'text-purple-600' : 'text-gray-400'}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                        {headers.map((header, idx) => (
                          <td key={idx} className="px-3 py-2 text-sm text-gray-900 truncate" title={row[header] || '-'}>
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-6 p-4 bg-purple-100 rounded-full">
                <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No student data available</h3>
              <p className="text-gray-500 mb-6 text-center max-w-md">Import an Excel file to view student data or download our template to get started.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={downloadSampleFile}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Template
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Import File
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentDataPage;
