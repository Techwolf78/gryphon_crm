import React, { useState, useEffect, useCallback } from "react";
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
  const [uploadSuccess, setUploadSuccess] = useState(false);

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
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const result = await response.json();

      return {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        bytes: result.bytes,
        created_at: result.created_at,
      };
    } catch (error) {

      throw new Error(`Student list upload failed: ${error.message}`);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
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

  const processExcelData = async (data) => {
    try {
      if (data.length < 2) {
        throw new Error("Excel file must contain at least a header row and one data row");
      }

      const headers = data[0].map(header => header ? header.toString().trim() : '');

      const processedData = data.slice(1).map((row, index) => {
        const student = {};
        headers.forEach((header, colIndex) => {
          const value = row[colIndex];
          student[header] = value !== undefined && value !== null ? value.toString().trim() : '';
        });

        // Check for required fields (only first two columns: SN and FULL NAME OF STUDENT)
        if (!student['SN'] || !student['FULL NAME OF STUDENT']) {
          throw new Error(`Row ${index + 2}: SN and FULL NAME OF STUDENT are required`);
        }

        return student;
      });

      return processedData;
    } catch (error) {
      throw new Error(`Error processing Excel data: ${error.message}`);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file first");
      return;
    }

    if (!leadData || !leadData.projectCode) {
      setUploadError("No lead data available for student list upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Upload Excel file to Cloudinary first
      const cloudinaryResponse = await uploadToCloudinary(selectedFile);
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

          const processedData = await processExcelData(jsonData);
          setUploadProgress(60);

          // Get project code and training form document ID
          const projectCode = leadData.projectCode;
          const trainingFormDocId = projectCodeToDocId(projectCode);
          const trainingFormRef = doc(db, "trainingForms", trainingFormDocId);

          // Upload students to both trainingForms and placementData collections
          const batch = [];
          for (const student of processedData) {
            // Generate a unique student ID or use existing one
            const studentId = student['SN'] || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Add to trainingForms students subcollection
            const trainingFormStudentRef = doc(db, "trainingForms", trainingFormDocId, "students", studentId);
            batch.push({
              ref: trainingFormStudentRef,
              data: {
                ...student,
                projectCode: projectCode,
                uploadedAt: serverTimestamp(),
                uploadedBy: user?.email || "Unknown",
              },
            });
            
            // Add to placementData students subcollection
            const placementDataStudentRef = doc(db, "placementData", trainingFormDocId, "students", studentId);
            batch.push({
              ref: placementDataStudentRef,
              data: {
                ...student,
                projectCode: projectCode,
                uploadedAt: serverTimestamp(),
                uploadedBy: user?.email || "Unknown",
              },
            });
          }

          // Process in batches to avoid Firebase limits
          const batchSize = 10;
          for (let i = 0; i < batch.length; i += batchSize) {
            const currentBatch = batch.slice(i, i + batchSize);
            const promises = currentBatch.map(async (item) => {
              await setDoc(item.ref, item.data);
            });
            await Promise.all(promises);
            setUploadProgress(60 + Math.floor(((i + currentBatch.length) / batch.length) * 20));
          }

          // Update both trainingForms and placementData collections
          await updateDoc(trainingFormRef, {
            studentFileUrl: studentFileUrl,
            lastUpdated: serverTimestamp(),
            stdcountUpload: processedData.length,
          });

          // Also update placementData collection
          const placementDataRef = doc(db, "placementData", trainingFormDocId);
          await updateDoc(placementDataRef, {
            studentFileUrl: studentFileUrl,
            lastUpdated: serverTimestamp(),
            stdcountUpload: processedData.length,
          });

          setUploadProgress(100);
          setUploadSuccess(true);
          setSelectedFile(null);

          // Call success callback
          if (onUploadSuccess) {
            onUploadSuccess();
          }
        } catch (error) {
          setUploadError(error.message);
        } finally {
          setUploading(false);
        }
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      setUploadError("Error uploading file: " + error.message);
      setUploading(false);
    }
  };

  const resetStates = () => {
    setSelectedFile(null);
    setIsDragging(false);
    setUploading(false);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);
  };

  const handleClose = useCallback(() => {
    resetStates();
    onClose();
  }, [onClose]);

  // Auto-close modal after successful upload
  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => {
        handleClose();
      }, 3000); // 3 seconds

      return () => clearTimeout(timer);
    }
  }, [uploadSuccess, handleClose]);

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
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <div className="text-red-500 mr-2">⚠️</div>
                    <p className="text-red-700 text-sm">{uploadError}</p>
                  </div>
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
                  <p className="text-green-600 text-xs mt-1">
                    This modal will close automatically in 3 seconds...
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
                  <li>• First row should be headers</li>
                  <li>• <strong>Required columns (first two):</strong> SN, FULL NAME OF STUDENT</li>
                  <li>• All other columns are optional</li>
                  <li>• Empty cells will result in empty string values for those keys</li>
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
                  <a
                    href="/student_data_sample_template.csv"
                    download
                    className="inline-flex items-center px-2 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    📄 Download CSV
                  </a>
                  <a
                    href="/student_data_sample_template.xlsx"
                    download
                    className="inline-flex items-center px-2 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    📊 Download XLSX
                  </a>
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
