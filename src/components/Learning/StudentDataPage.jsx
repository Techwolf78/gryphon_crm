import React, { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx-js-style";
import { db } from "../../firebase";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, setDoc
} from "firebase/firestore";

function StudentDataPage({ trainingId, onBack }) {
  const [studentData, setStudentData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [error, setError] = useState(null);
  const tableContainerRef = useRef(null);
  const importOptionsRef = useRef(null);

  // Expected headers for validation
  const expectedHeaders = [
    "SN", "FULL NAME OF STUDENT", "CURRENT COLLEGE NAME", "EMAIL ID", "MOBILE NO.",
    "BIRTH DATE", "GENDER", "HOMETOWN", "10th PASSING YR", "10th OVERALL MARKS %",
    "12th PASSING YR", "12th OVERALL MARKS %", "DIPLOMA COURSE", "DIPLOMA SPECIALIZATION",
    "DIPLOMA PASSING YR", "DIPLOMA OVERALL MARKS %", "GRADUATION COURSE",
    "GRADUATION SPECIALIZATION", "GRADUATION PASSING YR", "GRADUATION OVERALL MARKS %",
    "COURSE", "SPECIALIZATION", "PASSING YEAR", "OVERALL MARKS %"
  ];

  useEffect(() => {
    console.log("Fetching student data for trainingId:", trainingId);
    fetchStudentData();
  }, [trainingId]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const studentsRef = collection(db, "trainingForms", trainingId, "students");
      const snapshot = await getDocs(studentsRef);

      if (snapshot.empty) {
        console.log("No documents found");
        setStudentData([]);
        return;
      }

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log("First raw document:", data[0]);

      // Complete mapping for all fields
      const formatted = data.map(item => ({
        "SN": item.serialNumber || item.SN || "",
        "FULL NAME OF STUDENT": item.fullName || item["FULL NAME OF STUDENT"] || item.name || "",
        "CURRENT COLLEGE NAME": item.college || item["CURRENT COLLEGE NAME"] || item.institution || "",
        "EMAIL ID": item.email || item["EMAIL ID"] || "",
        "MOBILE NO.": item.mobile || item.phone || item["MOBILE NO."] || "",
        "BIRTH DATE": item.birthDate || item["BIRTH DATE"] || "",
        "GENDER": item.gender || item["GENDER"] || "",
        "HOMETOWN": item.hometown || item["HOMETOWN"] || "",
        "10th PASSING YR": item.tenthPassingYear || item["10th PASSING YR"] || "",
        "10th OVERALL MARKS %": item.tenthMarks || item["10th OVERALL MARKS %"] || "",
        "12th PASSING YR": item.twelfthPassingYear || item["12th PASSING YR"] || "",
        "12th OVERALL MARKS %": item.twelfthMarks || item["12th OVERALL MARKS %"] || "",
        "DIPLOMA COURSE": item.diplomaCourse || item["DIPLOMA COURSE"] || "",
        "DIPLOMA SPECIALIZATION": item.diplomaSpecialization || item["DIPLOMA SPECIALIZATION"] || "",
        "DIPLOMA PASSING YR": item.diplomaPassingYear || item["DIPLOMA PASSING YR"] || "",
        "DIPLOMA OVERALL MARKS %": item.diplomaMarks || item["DIPLOMA OVERALL MARKS %"] || "",
        "GRADUATION COURSE": item.graduationCourse || item["GRADUATION COURSE"] || "",
        "GRADUATION SPECIALIZATION": item.graduationSpecialization || item["GRADUATION SPECIALIZATION"] || "",
        "GRADUATION PASSING YR": item.graduationPassingYear || item["GRADUATION PASSING YR"] || "",
        "GRADUATION OVERALL MARKS %": item.graduationMarks || item["GRADUATION OVERALL MARKS %"] || "",
        "COURSE": item.currentCourse || item["COURSE"] || "",
        "SPECIALIZATION": item.currentSpecialization || item["SPECIALIZATION"] || "",
        "PASSING YEAR": item.passingYear || item["PASSING YEAR"] || item.expectedPassingYear || "",
        "OVERALL MARKS %": item.currentMarks || item["OVERALL MARKS %"] || ""
      }));

      setStudentData(formatted);
      setHeaders(expectedHeaders);

    } catch (err) {
      console.error("Fetch error:", err);
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates
  useEffect(() => {
    if (!trainingId) return;

    const q = query(collection(db, "trainingForms", trainingId, "students"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Use the same mapping as in fetchStudentData
      const formatted = data.map(item => ({
        "SN": item.serialNumber || item.SN || "",
        "FULL NAME OF STUDENT": item.fullName || item["FULL NAME OF STUDENT"] || item.name || "",
        "CURRENT COLLEGE NAME": item.college || item["CURRENT COLLEGE NAME"] || item.institution || "",
        "EMAIL ID": item.email || item["EMAIL ID"] || "",
        "MOBILE NO.": item.mobile || item.phone || item["MOBILE NO."] || "",
        "BIRTH DATE": item.birthDate || item["BIRTH DATE"] || "",
        "GENDER": item.gender || item["GENDER"] || "",
        "HOMETOWN": item.hometown || item["HOMETOWN"] || "",
        "10th PASSING YR": item.tenthPassingYear || item["10th PASSING YR"] || "",
        "10th OVERALL MARKS %": item.tenthMarks || item["10th OVERALL MARKS %"] || "",
        "12th PASSING YR": item.twelfthPassingYear || item["12th PASSING YR"] || "",
        "12th OVERALL MARKS %": item.twelfthMarks || item["12th OVERALL MARKS %"] || "",
        "DIPLOMA COURSE": item.diplomaCourse || item["DIPLOMA COURSE"] || "",
        "DIPLOMA SPECIALIZATION": item.diplomaSpecialization || item["DIPLOMA SPECIALIZATION"] || "",
        "DIPLOMA PASSING YR": item.diplomaPassingYear || item["DIPLOMA PASSING YR"] || "",
        "DIPLOMA OVERALL MARKS %": item.diplomaMarks || item["DIPLOMA OVERALL MARKS %"] || "",
        "GRADUATION COURSE": item.graduationCourse || item["GRADUATION COURSE"] || "",
        "GRADUATION SPECIALIZATION": item.graduationSpecialization || item["GRADUATION SPECIALIZATION"] || "",
        "GRADUATION PASSING YR": item.graduationPassingYear || item["GRADUATION PASSING YR"] || "",
        "GRADUATION OVERALL MARKS %": item.graduationMarks || item["GRADUATION OVERALL MARKS %"] || "",
        "COURSE": item.currentCourse || item["COURSE"] || "",
        "SPECIALIZATION": item.currentSpecialization || item["SPECIALIZATION"] || "",
        "PASSING YEAR": item.passingYear || item["PASSING YEAR"] || item.expectedPassingYear || "",
        "OVERALL MARKS %": item.currentMarks || item["OVERALL MARKS %"] || ""
      }));

      setStudentData(formatted);
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

  const validateHeaders = (headers) => {
    if (!Array.isArray(headers)) {
      throw new Error("Invalid file format - headers not found");
    }

    const lowerCaseHeaders = headers.map(h => String(h).toLowerCase().trim());
    const missingHeaders = expectedHeaders.filter(expected =>
      !lowerCaseHeaders.includes(expected.toLowerCase().trim())
    );

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(", ")}`);
    }
  };

  const validateImportedFile = (data) => {
    const headers = data[0];
    if (!Array.isArray(headers) || headers.length !== expectedHeaders.length) {
      throw new Error("Invalid file structure - incorrect number of columns");
    }

    expectedHeaders.forEach((expectedHeader, index) => {
      if (headers[index] !== expectedHeader) {
        throw new Error(`Invalid column header at position ${index + 1}. Expected: "${expectedHeader}", Found: "${headers[index]}"`);
      }
    });

    data.slice(1).forEach((row, rowIndex) => {
      if (isNaN(Number(row[0]))) {
        throw new Error(`Row ${rowIndex + 2}: SN must be a number`);
      }

      if (typeof row[1] !== 'string' || row[1].trim() === '') {
        throw new Error(`Row ${rowIndex + 2}: Full name is required`);
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(row[3]).toLowerCase())) {
        throw new Error(`Row ${rowIndex + 2}: Invalid email format`);
      }

      const mobileRegex = /^\d{10}$/;
      if (!mobileRegex.test(String(row[4]))) {
        throw new Error(`Row ${rowIndex + 2}: Mobile number must be 10 digits`);
      }

      const dateStr = String(row[5]);
      const dateFormats = [
        /^\d{1,2}-[a-zA-Z]{3}-\d{2}$/,
        /^\d{4}-\d{2}-\d{2}/,
        /^\d{2}\/\d{2}\/\d{4}/,
        /^\d{5}$/
      ];

      if (!dateFormats.some(format => format.test(dateStr))) {
        throw new Error(`Row ${rowIndex + 2}: Invalid birth date format`);
      }

      const validGenders = ['MALE', 'FEMALE', 'OTHER'];
      if (!validGenders.includes(String(row[6]).toUpperCase())) {
        throw new Error(`Row ${rowIndex + 2}: Gender must be MALE, FEMALE or OTHER`);
      }

      const percentageFields = [9, 11, 15, 19, 23];
      percentageFields.forEach(col => {
        const value = Number(row[col]);
        if (isNaN(value) || value < 0 || value > 100) {
          throw new Error(`Row ${rowIndex + 2}: Percentage in column ${expectedHeaders[col]} must be between 0-100`);
        }
      });

      const yearFields = [8, 10, 14, 18, 22];
      yearFields.forEach(col => {
        const value = Number(row[col]);
        if (row[col] && (isNaN(value) || value < 1900 || value > new Date().getFullYear() + 5)) {
          throw new Error(`Row ${rowIndex + 2}: Year in column ${expectedHeaders[col]} must be between 1900-${new Date().getFullYear() + 5}`);
        }
      });
    });
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
            `• Row ${d.rowNumber}: "${d.name}" (${d.email || 'no email'}, ${d.mobile || 'no phone'})`
          ).join('\n');
          setError(`Duplicate entries detected (${duplicateCount} skipped):\n${duplicateDetails}`);
        }

        if (uniqueData.length > 0) {
          const batchWrites = [];

          for (const row of uniqueData) {
            const studentRef = doc(collection(db, "trainingForms", trainingId, "students"));

            const studentData = {
              serialNumber: row["SN"] || 0,
              fullName: row["FULL NAME OF STUDENT"] || "",
              college: row["CURRENT COLLEGE NAME"] || "",
              email: row["EMAIL ID"] || "",
              mobile: row["MOBILE NO."] || "",
              birthDate: row["BIRTH DATE"] || "",
              gender: row["GENDER"] || "",
              hometown: row["HOMETOWN"] || "",
              tenthPassingYear: row["10th PASSING YR"] || "",
              tenthMarks: row["10th OVERALL MARKS %"] || "",
              twelfthPassingYear: row["12th PASSING YR"] || "",
              twelfthMarks: row["12th OVERALL MARKS %"] || "",
              diplomaCourse: row["DIPLOMA COURSE"] || "",
              diplomaSpecialization: row["DIPLOMA SPECIALIZATION"] || "",
              diplomaPassingYear: row["DIPLOMA PASSING YR"] || "",
              diplomaMarks: row["DIPLOMA OVERALL MARKS %"] || "",
              graduationCourse: row["GRADUATION COURSE"] || "",
              graduationSpecialization: row["GRADUATION SPECIALIZATION"] || "",
              graduationPassingYear: row["GRADUATION PASSING YR"] || "",
              graduationMarks: row["GRADUATION OVERALL MARKS %"] || "",
              currentCourse: row["COURSE"] || "",
              currentSpecialization: row["SPECIALIZATION"] || "",
              expectedPassingYear: row["PASSING YEAR"] || "",
              currentMarks: row["OVERALL MARKS %"] || "",
              trainingId: trainingId,
              createdAt: new Date()
            };

            batchWrites.push(setDoc(studentRef, studentData));
          }

          // Now this await will work because the function is async
          await Promise.all(batchWrites);
          fetchStudentData(); // Refresh the displayed data
        }
      } catch (err) {
        console.error("Import failed:", err);
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
      const isDuplicateInExisting = studentData.some(existingRow => {
        const emailMatch = newRow["EMAIL ID"] && existingRow["EMAIL ID"] &&
          newRow["EMAIL ID"].toLowerCase() === existingRow["EMAIL ID"].toLowerCase();
        const mobileMatch = newRow["MOBILE NO."] && existingRow["MOBILE NO."] &&
          newRow["MOBILE NO."] === existingRow["MOBILE NO."];
        return emailMatch || mobileMatch;
      });

      const isDuplicateInNew = newData.slice(0, newIndex).some(otherRow => {
        const emailMatch = newRow["EMAIL ID"] && otherRow["EMAIL ID"] &&
          newRow["EMAIL ID"].toLowerCase() === otherRow["EMAIL ID"].toLowerCase();
        const mobileMatch = newRow["MOBILE NO."] && otherRow["MOBILE NO."] &&
          newRow["MOBILE NO."] === otherRow["MOBILE NO."];
        return emailMatch || mobileMatch;
      });

      const isDuplicate = isDuplicateInExisting || isDuplicateInNew;

      if (isDuplicate) {
        duplicateCount++;
        duplicateRows.push({
          rowNumber: newIndex + 2,
          email: newRow["EMAIL ID"] || "no email",
          mobile: newRow["MOBILE NO."] || "no phone",
          name: newRow["FULL NAME OF STUDENT"] || "unnamed"
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
      studentData.map(row => headers.map(header => row[header]))
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
    const sampleHeaders = expectedHeaders;
    const sampleData = [
      [
        1, "Ajay Pawar", "MIT", "XYZ@GMAIL.COM", "9999999999", "24-May-02", "MALE", "PUNE",
        2018, 76, 2020, 87, "", "", "", "", "BE", "COMPUTER SCIENCE",
        2024, 77, "MBA", "BUSINESS ANALYTICS", 2026, 85
      ],
      [
        2, "Deep Mahire", "Symbiosis", "ABC@GMAIL.COM", "8888888888", "26-Jun-04", "MALE",
        "SHIRDI", 2020, 57, 2020, 87, "", "", "", "", "BTECH",
        "MECHANICAL", 2026, 66, "MBA", "IT", 2027, 75
      ],
       [
        2, "Sakshi Patil", "COEP", "LMN@GMAIL.COM", "7777777777", "30-Mar-04", "FEMALE",
        "PUNE", 2020, 57, "", "", "DIPLOMA", "CS", 2023, 73, "BTECH",
        "MECHANICAL", 2026, 66, "MBA", "IT", 2027, 75
      ]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleData]);

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

    sampleHeaders.forEach((_, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      ws[cellRef].s = headerStyle;
    });

    ws['!cols'] = sampleHeaders.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, "Sample Student Data");
    XLSX.writeFile(wb, "student_data_sample_template.xlsx");
    setShowImportOptions(false);
  };

  const filteredData = studentData.filter(row => {
    return Object.values(row).some(
      value => String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const toggleRowSelection = (index) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(index)) {
      newSelectedRows.delete(index);
    } else {
      newSelectedRows.add(index);
    }
    setSelectedRows(newSelectedRows);
  };

  const selectAllRows = () => {
    if (selectedRows.size === filteredData.length && filteredData.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set([...Array(filteredData.length).keys()]));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;

    try {
      const deletions = [];
      const newStudentData = [...studentData];

      Array.from(selectedRows).sort((a, b) => b - a).forEach(index => {
        const student = filteredData[index];
        if (student.id) {
          deletions.push(deleteDoc(doc(db, "trainingForms", trainingId, "students", student.id)));
        }
        newStudentData.splice(studentData.indexOf(student), 1);
      });

      await Promise.all(deletions);
      setStudentData(newStudentData);
      setSelectedRows(new Set());
    } catch (error) {
      setError(`Failed to delete students: ${error.message}`);
    }
  };

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

  // Custom hook for detecting clicks outside an element
  const useClickOutside = (ref, callback) => {
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (ref.current && !ref.current.contains(event.target)) {
          callback();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [ref, callback]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 p-4 md:p-8">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex-shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Back"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold">Student List</h1>
                <p className="text-purple-100">{trainingId && `Training ID: ${trainingId}`}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="relative" ref={importOptionsRef}>
                <button
                  onClick={() => setShowImportOptions(!showImportOptions)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Import
                  <svg className={`w-4 h-4 transition-transform ${showImportOptions ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showImportOptions && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-20 overflow-hidden">
                    <button onClick={downloadSampleFile} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-800">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Template
                    </button>
                    <label className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-800 cursor-pointer border-t">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={studentData.length === 0}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          {error && <ProfessionalErrorDisplay error={error} onDismiss={() => setError(null)} />}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-gray-600">Loading student data...</p>
            </div>
          ) : studentData.length > 0 ? (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="relative w-full md:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search students..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{filteredData.length} students found</span>
                  {selectedRows.size > 0 && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                      {selectedRows.size} selected
                    </span>
                  )}
                </div>
              </div>

              <div
                ref={tableContainerRef}
                className="overflow-auto rounded-lg border border-gray-200 shadow-sm"
                style={{
                  maxHeight: 'calc(100vh - 400px)',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#9CA3AF #F3F4F6'
                }}
              >
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                          onChange={selectAllRows}
                        />
                      </th>
                      {headers.map((header, idx) => (
                        <th key={idx} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.map((row, rowIndex) => (
                      <tr key={rowIndex} className={`hover:bg-gray-50 transition-colors ${selectedRows.has(rowIndex) ? 'bg-purple-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            checked={selectedRows.has(rowIndex)}
                            onChange={() => toggleRowSelection(rowIndex)}
                          />
                        </td>
                        {headers.map((header, idx) => (
                          <td key={idx} className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
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

      {selectedRows.size > 0 && (
        <button
          onClick={handleDeleteSelected}
          className="fixed bottom-6 right-6 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700 transition-colors z-50"
        >
          Delete Selected ({selectedRows.size})
        </button>
      )}
    </div>
  );
}

export default StudentDataPage;