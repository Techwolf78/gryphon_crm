import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { setDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";
import * as XLSX from "xlsx";

const StudentListUploadModal = ({ isOpen, onClose, leadData, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadErrorDetails, setUploadErrorDetails] = useState([]);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const { user } = useAuth();

  // Project Code Conversion Utilities
  const projectCodeToDocId = (projectCode) =>
    projectCode ? projectCode.replace(/\//g, "-") : "";

  // Upload to Cloudinary function
const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "unsigned_mou"); // Using your preset name
  formData.append("folder", "student_lists");
  formData.append("timestamp", Math.round(Date.now() / 1000)); // Adds timestamp for security

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/da0ypp61n/raw/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed with status ${response.status}`);
    }

    const result = await response.json();

    // Validate that we got the expected response structure
    if (!result || !result.secure_url) {
      throw new Error("Invalid response from cloud storage service");
    }

    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error(`Student list upload failed: ${error.message}`);
  }
};  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      setUploadErrorDetails([]);
      setShowErrorDetails(false);
      setUploadSuccess(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      setUploadErrorDetails([]);
      setShowErrorDetails(false);
      setUploadSuccess(false);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  // Filter out completely empty rows (rows where all values are empty)
  const filterValidRows = (rows) => {
    return rows.filter(row => {
      // Check if at least one value in the row is not empty
      return Object.values(row).some(value =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ''
      );
    });
  };

  // Process Excel data in chunks to prevent memory issues
  const processExcelDataChunked = async (jsonData, onProgress) => {
    const errors = [];

    try {
      if (jsonData.length < 2) {
        errors.push("Excel file must contain at least a header row and one data row");
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }

      const headers = jsonData[0].map(header => header ? header.toString().trim() : '');

      // Expected template headers (exact match required)
      const expectedHeaders = [
        "SR NO", "FULL NAME OF STUDENT", "CURRENT COLLEGE NAME", "EMAIL ID", "MOBILE NO.",
        "BIRTH DATE", "GENDER", "HOMETOWN", "10th PASSING YR", "10th MARKS %",
        "12th PASSING YR", "12th MARKS %", "DIPLOMA COURSE", "DIPLOMA SPECIALIZATION",
        "DIPLOMA PASSING YR", "DIPLOMA MARKS %", "GRADUATION COURSE", "GRADUATION SPECIALIZATION",
        "GRADUATION PASSING YR", "GRADUATION MARKS %", "COURSE", "SPECIALIZATION",
        "PASSING YEAR", "OVERALL MARKS %"
      ];

      // Check if headers exactly match the template
      const headersMatch = headers.length === expectedHeaders.length &&
        headers.every((header, index) => header === expectedHeaders[index]);

      if (!headersMatch) {
        // Find missing columns
        const missingColumns = expectedHeaders.filter(expected =>
          !headers.some(header => header === expected)
        );

        // Find extra columns
        const extraColumns = headers.filter(header =>
          !expectedHeaders.some(expected => expected === header)
        );

        // Find modified columns (same position but different name)
        const modifiedColumns = [];
        for (let i = 0; i < Math.min(headers.length, expectedHeaders.length); i++) {
          if (headers[i] !== expectedHeaders[i]) {
            modifiedColumns.push({
              position: i + 1,
              expected: expectedHeaders[i],
              found: headers[i] || '(empty)'
            });
          }
        }

        let errorMessage = "Column headers do not match the template. ";

        if (missingColumns.length > 0) {
          errorMessage += `Missing columns: ${missingColumns.join(', ')}. `;
        }

        if (extraColumns.length > 0) {
          errorMessage += `Extra columns found: ${extraColumns.join(', ')}. `;
        }

        if (modifiedColumns.length > 0) {
          const modifiedDetails = modifiedColumns.map(mod =>
            `Column ${mod.position} should be '${mod.expected}' but found '${mod.found}'`
          ).join('; ');
          errorMessage += `Modified columns: ${modifiedDetails}. `;
        }

        errorMessage += "Please download the template and do not modify the column structure.";
        errors.push(errorMessage);
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }

      // Process data rows in chunks to prevent memory issues
      const dataRows = jsonData.slice(1);
      const CHUNK_SIZE = 100; // Process 100 rows at a time
      const processedData = [];
      const totalRows = dataRows.length;

      for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
        const chunk = dataRows.slice(i, i + CHUNK_SIZE);

        // Process this chunk
        const chunkProcessed = chunk.map((row, chunkIndex) => {
          const globalIndex = i + chunkIndex;
          const student = {};
          headers.forEach((header, colIndex) => {
            const value = row[colIndex];
            student[header] = value !== undefined && value !== null ? value.toString().trim() : '';
          });

          // Check for required fields (SR NO and FULL NAME OF STUDENT are required, others can be empty)
          const requiredFields = ['SR NO', 'FULL NAME OF STUDENT'];
          const missingRequiredFields = requiredFields.filter(field =>
            !student[field] || String(student[field]).trim() === ''
          );

          if (missingRequiredFields.length > 0) {
            errors.push(`Row ${globalIndex + 2}: Required fields missing: ${missingRequiredFields.join(', ')}`);
          }

          return student;
        });

        processedData.push(...chunkProcessed);

        // Update progress for this chunk
        if (onProgress) {
          const progressPercent = Math.floor(((i + chunk.length) / totalRows) * 100);
          onProgress(progressPercent);
        }
      }

      // Filter out completely empty rows
      const validRowsOnly = filterValidRows(processedData);

      if (errors.length > 0) {
        throw new Error(`Validation failed with ${errors.length} error(s)`);
      }

      return validRowsOnly;
    } catch (error) {
      // If we have detailed errors, throw them all
      if (errors.length > 0) {
        error.details = errors;
      }
      throw error;
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file first");
      return;
    }

    // Add file size validation to prevent memory issues
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
    if (selectedFile.size > MAX_FILE_SIZE) {
      setUploadError(`File too large. Maximum size allowed: 5MB. Your file is ${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB.`);
      return;
    }

    if (!leadData || !leadData.projectCode) {
      setUploadError("No lead data available for student list upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadErrorDetails([]);
    setShowErrorDetails(false);
    setUploadSuccess(false);

    try {
      // Upload Excel file to Cloudinary first
      const cloudinaryResponse = await uploadToCloudinary(selectedFile);

      // Validate Cloudinary response
      if (!cloudinaryResponse || !cloudinaryResponse.url) {
        throw new Error("Failed to upload file to cloud storage. Please try again.");
      }

      const studentFileUrl = cloudinaryResponse.url;

      setUploadProgress(20);

      // Process Excel data
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          setUploadProgress(40);

          if (jsonData.length < 2) {
            throw new Error("Excel file must contain at least a header row and one data row");
          }

          // Process Excel data in chunks with progress updates
          const processedData = await processExcelDataChunked(jsonData, (progress) => {
            // Update progress from 40% to 60% during processing
            setUploadProgress(40 + Math.floor(progress * 0.2));
          });

          setUploadProgress(60);

          // Get project code and training form document ID
          const projectCode = leadData.projectCode;
          const trainingFormDocId = projectCodeToDocId(projectCode);
          const trainingFormRef = doc(db, "trainingForms", trainingFormDocId);

          // Stream upload students to both collections in chunks to prevent memory issues
          const UPLOAD_CHUNK_SIZE = 50; // Upload 50 students at a time
          let uploadedCount = 0;
          let failedUploads = 0;
          const totalStudents = processedData.length;

          for (let i = 0; i < totalStudents && !isCancelling; i += UPLOAD_CHUNK_SIZE) {
            const chunk = processedData.slice(i, i + UPLOAD_CHUNK_SIZE);

            try {
              // Create upload operations for this chunk
              const uploadPromises = [];
              for (const student of chunk) {
                // Generate a unique student ID or use existing one
                const studentId = student['SR NO'] || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Add to trainingForms students subcollection
                const trainingFormStudentRef = doc(db, "trainingForms", trainingFormDocId, "students", studentId);
                uploadPromises.push(
                  setDoc(trainingFormStudentRef, {
                    ...student,
                    projectCode: projectCode,
                    uploadedAt: serverTimestamp(),
                    uploadedBy: user?.email || "Unknown",
                  })
                );

                // Add to placementData students subcollection
                const placementDataStudentRef = doc(db, "placementData", trainingFormDocId, "students", studentId);
                uploadPromises.push(
                  setDoc(placementDataStudentRef, {
                    ...student,
                    projectCode: projectCode,
                    uploadedAt: serverTimestamp(),
                    uploadedBy: user?.email || "Unknown",
                  })
                );
              }

              // Upload this chunk
              await Promise.all(uploadPromises);
              uploadedCount += chunk.length;

            } catch (chunkError) {
              console.error(`Failed to upload chunk ${Math.floor(i / UPLOAD_CHUNK_SIZE) + 1}:`, chunkError);
              failedUploads += chunk.length;
              // Continue with next chunk instead of failing completely
            }

            // Update progress from 60% to 80% during upload
            const uploadProgressPercent = Math.floor((uploadedCount / totalStudents) * 20);
            setUploadProgress(60 + uploadProgressPercent);
          }

          // Check if upload was partially successful
          if (failedUploads > 0 && uploadedCount > 0) {
            setUploadError(`Partial upload completed. ${uploadedCount} students uploaded successfully, ${failedUploads} failed. Please check your data and try again for failed records.`);
          } else if (failedUploads > 0 && uploadedCount === 0) {
            throw new Error(`Upload failed. All ${failedUploads} student uploads failed. Please check your data and try again.`);
          }

          setUploadProgress(80);

          // Only update metadata if we have successful uploads
          if (uploadedCount > 0) {
            // Update both trainingForms and placementData collections
            await updateDoc(trainingFormRef, {
              studentFileUrl: studentFileUrl,
              lastUpdated: serverTimestamp(),
              stdcountUpload: uploadedCount, // Use actual uploaded count
            });

            // Also update placementData collection
            const placementDataRef = doc(db, "placementData", trainingFormDocId);
            await updateDoc(placementDataRef, {
              studentFileUrl: studentFileUrl,
              lastUpdated: serverTimestamp(),
              stdcountUpload: uploadedCount, // Use actual uploaded count
            });
          }

          setUploadProgress(100);

          // Set success state based on results
          if (uploadedCount > 0 && failedUploads === 0) {
            setUploadSuccess(true);
            setSelectedFile(null);
          } else if (uploadedCount > 0 && failedUploads > 0) {
            // Partial success - don't clear file so user can retry
            setUploadSuccess(false);
          }

          // Call success callback only for complete success
          if (uploadedCount > 0 && failedUploads === 0 && onUploadSuccess) {
            onUploadSuccess();
          }

          // Memory cleanup
          processedData.length = 0; // Clear the array to free memory
        } catch (error) {
          setUploadError(error.message);
          if (error.details && error.details.length > 0) {
            setUploadErrorDetails(error.details);
          }
        } finally {
          setUploading(false);
        }
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      setUploadError("Error uploading file: " + error.message);
      if (error.details && error.details.length > 0) {
        setUploadErrorDetails(error.details);
      }
      setUploading(false);
    }
  };

  const downloadCSVTemplate = () => {
    const headers = [
      "SR NO", "FULL NAME OF STUDENT", "CURRENT COLLEGE NAME", "EMAIL ID", "MOBILE NO.",
      "BIRTH DATE", "GENDER", "HOMETOWN", "10th PASSING YR", "10th MARKS %",
      "12th PASSING YR", "12th MARKS %", "DIPLOMA COURSE", "DIPLOMA SPECIALIZATION",
      "DIPLOMA PASSING YR", "DIPLOMA MARKS %", "GRADUATION COURSE", "GRADUATION SPECIALIZATION",
      "GRADUATION PASSING YR", "GRADUATION MARKS %", "COURSE", "SPECIALIZATION",
      "PASSING YEAR", "OVERALL MARKS %"
    ];

    // Create CSV content
    const csvContent = headers.join(",") + "\n";

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "student_data_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadXLSXTemplate = () => {
    const headers = [
      "SR NO", "FULL NAME OF STUDENT", "CURRENT COLLEGE NAME", "EMAIL ID", "MOBILE NO.",
      "BIRTH DATE", "GENDER", "HOMETOWN", "10th PASSING YR", "10th MARKS %",
      "12th PASSING YR", "12th MARKS %", "DIPLOMA COURSE", "DIPLOMA SPECIALIZATION",
      "DIPLOMA PASSING YR", "DIPLOMA MARKS %", "GRADUATION COURSE", "GRADUATION SPECIALIZATION",
      "GRADUATION PASSING YR", "GRADUATION MARKS %", "COURSE", "SPECIALIZATION",
      "PASSING YEAR", "OVERALL MARKS %"
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    // Professional header styling with purple background
    const headerStyle = {
      fill: {
        patternType: "solid",
        fgColor: { rgb: "7C3AED" }, // Purple background
        bgColor: { rgb: "7C3AED" }
      },
      font: {
        bold: true,
        color: { rgb: "FFFFFF" }, // White text
        sz: 11,
        name: "Calibri"
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true
      },
      border: {
        top: { style: "medium", color: { rgb: "4B5563" } },
        bottom: { style: "medium", color: { rgb: "4B5563" } },
        left: { style: "medium", color: { rgb: "4B5563" } },
        right: { style: "medium", color: { rgb: "4B5563" } }
      }
    };

    // Apply header styling to all header cells and ensure cell values are set
    headers.forEach((header, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      ws[cellRef] = {
        t: "s", // string type
        v: header, // value
        s: headerStyle // style
      };
    });

    // Add sample data rows to make it look more professional
    const sampleData = [
      ["1", "John Smith", "MIT College", "john.smith@email.com", "9876543210", "15-May-2002", "Male", "Mumbai", "2018", "85", "2020", "82", "", "", "", "", "BE", "Computer Science", "2024", "78", "MBA", "Business Analytics", "2026", "85"],
      ["2", "Sarah Johnson", "Symbiosis University", "sarah.j@email.com", "8765432109", "22-Jun-2001", "Female", "Pune", "2017", "88", "2019", "85", "", "", "", "", "BTech", "Information Technology", "2023", "82", "MCA", "Software Development", "2025", "88"],
      ["3", "Rajesh Kumar", "COEP College", "rajesh.kumar@email.com", "7654321098", "10-Mar-2003", "Male", "Nagpur", "2019", "79", "2021", "76", "Diploma", "Electrical", "2022", "75", "BE", "Mechanical Engineering", "2025", "80", "MTech", "Design Engineering", "2027", "82"]
    ];

    // Add sample rows to worksheet
    XLSX.utils.sheet_add_aoa(ws, sampleData, { origin: "A2" });

    // Apply border styling to all data cells
    const dataStyle = {
      border: {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } }
      },
      alignment: { vertical: "center" }
    };

    // Apply styling to all data cells (rows 1-3, columns 0-23)
    for (let row = 1; row <= 3; row++) {
      for (let col = 0; col < headers.length; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellRef]) {
          ws[cellRef] = { t: "s", v: "", s: dataStyle };
        } else {
          ws[cellRef].s = dataStyle;
        }
      }
    }

    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 6 },   // SR NO
      { wch: 25 },  // FULL NAME OF STUDENT
      { wch: 25 },  // CURRENT COLLEGE NAME
      { wch: 20 },  // EMAIL ID
      { wch: 15 },  // MOBILE NO.
      { wch: 12 },  // BIRTH DATE
      { wch: 10 },  // GENDER
      { wch: 15 },  // HOMETOWN
      { wch: 12 },  // 10th PASSING YR
      { wch: 12 },  // 10th MARKS %
      { wch: 12 },  // 12th PASSING YR
      { wch: 12 },  // 12th MARKS %
      { wch: 18 },  // DIPLOMA COURSE
      { wch: 22 },  // DIPLOMA SPECIALIZATION
      { wch: 15 },  // DIPLOMA PASSING YR
      { wch: 15 },  // DIPLOMA MARKS %
      { wch: 20 },  // GRADUATION COURSE
      { wch: 25 },  // GRADUATION SPECIALIZATION
      { wch: 18 },  // GRADUATION PASSING YR
      { wch: 18 },  // GRADUATION MARKS %
      { wch: 15 },  // COURSE
      { wch: 20 },  // SPECIALIZATION
      { wch: 12 },  // PASSING YEAR
      { wch: 15 }   // OVERALL MARKS %
    ];

    // Set row heights
    ws['!rows'] = [
      { hpt: 35 }, // Header row
      { hpt: 25 }, // Data row 1
      { hpt: 25 }, // Data row 2
      { hpt: 25 }  // Data row 3
    ];

    // Add freeze pane (freeze header row)
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    // Add print settings for professional look
    ws['!printHeader'] = [{ text: "Student Data Template" }];
    ws['!margins'] = { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5 };

    XLSX.utils.book_append_sheet(wb, ws, "Student Data Template");
    XLSX.writeFile(wb, "student_data_template.xlsx");
  };

  const resetStates = () => {
    setSelectedFile(null);
    setIsDragging(false);
    setUploading(false);
    setUploadProgress(0);
    setUploadError(null);
    setUploadErrorDetails([]);
    setShowErrorDetails(false);
    setUploadSuccess(false);
    setIsCancelling(false);
  };

  const cancelUpload = () => {
    setIsCancelling(true);
    setUploadError("Upload cancelled by user");
    setUploading(false);
  };

  const handleClose = useCallback(() => {
    resetStates();
    onClose();
  }, [onClose]);

  // Auto-close modal after successful upload
  // useEffect(() => {
  //   if (uploadSuccess) {
  //     const timer = setTimeout(() => {
  //       handleClose();
  //     }, 3000); // 3 seconds

  //     return () => clearTimeout(timer);
  //   }
  // }, [uploadSuccess, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-2">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">
              Upload Student List
            </h3>
            <button
              onClick={handleClose}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Left Column - File Upload */}
            <div className="space-y-4">
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="space-y-3">
                  <div className="text-3xl">
                    {selectedFile ? "📄" : "📁"}
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-700">
                      {selectedFile ? selectedFile.name : "Drop your Excel or CSV file here"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      or click to browse files
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors text-sm"
                  >
                    Choose File
                  </label>
                </div>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{isCancelling ? "Cancelling..." : "Uploading..."}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  {!isCancelling && (
                    <button
                      onClick={cancelUpload}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Cancel Upload
                    </button>
                  )}
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-red-500 mr-2">⚠️</div>
                      <p className="text-red-700 text-sm">{uploadError}</p>
                    </div>
                    {uploadErrorDetails.length > 0 && (
                      <button
                        onClick={() => setShowErrorDetails(!showErrorDetails)}
                        className="text-red-600 hover:text-red-800 text-sm underline ml-2"
                      >
                        {showErrorDetails ? 'Hide Details' : `Show ${uploadErrorDetails.length} Error${uploadErrorDetails.length > 1 ? 's' : ''}`}
                      </button>
                    )}
                  </div>
                  {showErrorDetails && uploadErrorDetails.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <div className="max-h-40 overflow-y-auto">
                        <ul className="space-y-1">
                          {uploadErrorDetails.map((detail, index) => (
                            <li key={index} className="text-red-600 text-xs flex items-start">
                              <span className="text-red-500 mr-1">•</span>
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Success Message */}
              {uploadSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <div className="text-green-500 mr-2">✅</div>
                  <p className="text-green-700 text-sm">
                    Student list uploaded successfully!
                  </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Instructions */}
            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-900 mb-2 text-sm">File Format Requirements:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• First row should be headers (do not modify or delete column headers)</li>
                  <li>• <strong>All 24 columns must be present</strong> in the exact order as template</li>
                  <li>• Individual cells in data rows can be empty</li>
                  <li>• Empty cells in data rows are allowed (will be saved as empty strings)</li>
                  <li>• Supported formats: .xlsx, .xls, .csv</li>
                  <li>• Choose template format (CSV or XLSX) above</li>
                  <li>• Your file will be securely uploaded and student data will be saved to both Learning and Placement departments</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Full Width Template Download Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-green-900 text-sm">📋 Download Complete Template</h4>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">All Fields</span>
            </div>

            <div className="bg-white px-3 py-2 rounded-lg border border-green-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900 text-sm mb-1">📊 Complete Student Data Template</h5>
                  <p className="text-xs text-gray-600">Complete template with all 25 columns including optional fields</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={downloadCSVTemplate}
                    className="inline-flex items-center px-2 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    📄 Download CSV
                  </button>
                  <button
                    onClick={downloadXLSXTemplate}
                    className="inline-flex items-center px-2 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    📊 Download XLSX
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 border-t bg-white px-4 py-3">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {uploading ? "Uploading..." : "Upload Students"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

StudentListUploadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  leadData: PropTypes.object,
  onUploadSuccess: PropTypes.func,
};

export default StudentListUploadModal;
