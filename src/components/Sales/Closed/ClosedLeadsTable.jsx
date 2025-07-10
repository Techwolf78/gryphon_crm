import React, { useState } from "react";
import { FiFilter, FiMoreVertical, FiUpload, FiX } from "react-icons/fi";
import PropTypes from "prop-types";
import * as XLSX from "xlsx";
import { db } from "../../../firebase";
import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

// Project Code Conversion Utilities
const projectCodeToDocId = (projectCode) =>
  projectCode ? projectCode.replace(/\//g, "-") : "";
const docIdToProjectCode = (docId) => (docId ? docId.replace(/-/g, "/") : "");
const displayProjectCode = (code) => (code ? code.replace(/-/g, "/") : "-");
const displayYear = (year) => year.replace(/-/g, " ");

const ClosedLeadsTable = ({
  leads,
  formatDate,
  formatCurrency,
  viewMyLeadsOnly,
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const logAvailableProjectCodes = async () => {
    try {
      console.group("Debugging Project Code Mismatch");

      // Log the current lead's project code
      const currentLead = leads.find(([id]) => id === openDropdown)?.[1];
      console.log("Current Lead:", currentLead);
      console.log("Lead Project Code:", currentLead?.projectCode);
      console.log(
        "Converted Doc ID:",
        projectCodeToDocId(currentLead?.projectCode || "")
      );

      // Log all trainingForms documents (just their IDs)
      console.log("Fetching all trainingForms documents...");
      const trainingFormsSnapshot = await getDocs(
        collection(db, "trainingForms")
      );
      const allTrainingForms = trainingFormsSnapshot.docs.map((doc) => ({
        id: doc.id,
        projectCode: doc.data().projectCode,
      }));

      console.log("All Training Forms:", allTrainingForms);
      console.log(
        "Matching Document:",
        allTrainingForms.find(
          (form) =>
            form.id === projectCodeToDocId(currentLead?.projectCode || "") ||
            form.projectCode === currentLead?.projectCode
        )
      );

      console.groupEnd();
    } catch (error) {
      console.error("Error logging project codes:", error);
    }
  };

  const handleUploadClick = async () => {
    const currentLead = leads.find(([id]) => id === openDropdown)?.[1];

    if (!currentLead) {
      console.error("No lead found for ID:", openDropdown);
      setUploadError("No lead selected");
      return;
    }

    const projectCode = currentLead.projectCode || "";

    if (projectCode) {
      await logAvailableProjectCodes();
      handleUpload(projectCode);
    } else {
      console.error("Invalid project code structure:", currentLead.projectCode);
      await logAvailableProjectCodes();
      setUploadError("No valid project code found for this lead");
    }
  };

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && isValidFileType(file)) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File size exceeds 5MB limit");
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && isValidFileType(file)) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File size exceeds 5MB limit");
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const isValidFileType = (file) => {
    const validTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel.sheet.macroEnabled.12",
      "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
      "text/csv",
    ];
    return (
      validTypes.includes(file.type) ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls") ||
      file.name.endsWith(".csv")
    );
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  const processExcelData = async (data, projectCode) => {
    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      const docId = projectCodeToDocId(projectCode);
      const trainingFormRef = doc(db, "trainingForms", docId);
      const docSnap = await getDoc(trainingFormRef);

      if (!docSnap.exists()) {
        await setDoc(trainingFormRef, {
          projectCode,
          docId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const studentsRef = collection(trainingFormRef, "students");

      // DELETE ALL EXISTING STUDENTS FIRST
      console.log("Deleting existing students...");
      const existingStudents = await getDocs(studentsRef);
      const deletePromises = existingStudents.docs.map((studentDoc) =>
        deleteDoc(doc(studentsRef, studentDoc.id))
      );
      await Promise.all(deletePromises);
      console.log(`Deleted ${existingStudents.size} existing students`);

      // Process new data
      const totalRows = data.length;
      let processedRows = 0;

      for (const row of data) {
        try {
          const studentData = {};
          Object.keys(row).forEach((key) => {
            if (row[key] !== undefined && row[key] !== null) {
              studentData[key] = row[key];
            }
          });

          studentData.uploadedAt = new Date();
          studentData.projectCode = projectCode;

          const newStudentRef = doc(studentsRef);
          await setDoc(newStudentRef, studentData);

          processedRows++;
          setUploadProgress(Math.round((processedRows / totalRows) * 100));
        } catch (error) {
          console.error(`Error processing row ${processedRows + 1}:`, error);
        }
      }

      // Update the parent document
      await setDoc(
        trainingFormRef,
        {
          studentCount: data.length,
          updatedAt: new Date(),
          studentFileUrl: selectedFile?.name || "uploaded_file",
        },
        { merge: true }
      );

      return true;
    } catch (error) {
      console.error("Error processing Excel data:", error);
      setUploadError("Failed to process the file. Please try again.");
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (projectCode) => {
    if (!selectedFile) return;

    try {
      const fileData = await readFile(selectedFile);
      const workbook = XLSX.read(fileData, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        setUploadError("The file contains no data.");
        return;
      }

      if (jsonData.length > 1000) {
        setUploadError("File contains too many rows (max 1000 allowed)");
        return;
      }

      const success = await processExcelData(jsonData, projectCode);

      if (success) {
        setUploadSuccess(true);
        setTimeout(() => {
          setShowUploadModal(false);
          setSelectedFile(null);
          setUploadProgress(0);
          setUploadSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError(
        "Error reading the file. Please check the format and try again."
      );
    }
  };

  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  return (
    <div className="overflow-x-auto">
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center border-b px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">
                Upload Student List
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setUploadError(null);
                  setUploadProgress(0);
                }}
                className="text-gray-400 hover:text-gray-500"
                disabled={uploading}
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4 flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                  >
                    <span>Browse files</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Excel (.xlsx, .xls) or CSV files only (max 5MB)
                </p>
              </div>

              {selectedFile && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="text-gray-400 hover:text-gray-500"
                    disabled={uploading}
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
              )}

              {uploading && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {uploadSuccess && (
                <div className="mt-4 p-3 bg-green-50 rounded-md text-green-600 text-sm">
                  Student list uploaded successfully!
                </div>
              )}

              {uploadError && (
                <div className="mt-4 p-3 bg-red-50 rounded-md text-red-600 text-sm">
                  {uploadError}
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end border-t">
              <button
                type="button"
                className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setUploadError(null);
                  setUploadProgress(0);
                }}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                  selectedFile && !uploading
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-blue-300 cursor-not-allowed"
                }`}
                disabled={!selectedFile || uploading}
                onClick={handleUploadClick}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {[
              "Project Code",
              "Institution",
              "Location",
              "Closed Date",
              "Actual TCV",
              "Projected TCV",
              "Owner",
              "Actions",
            ].map((h) => (
              <th
                key={h}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.length > 0 ? (
            leads.map(([id, lead]) => (
              <tr key={id} className="hover:bg-gray-50 transition-colors">
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  title={`DocID: ${projectCodeToDocId(
                    lead.projectCode || ""
                  )}, ProjectCode: ${docIdToProjectCode(
                    projectCodeToDocId(lead.projectCode || "")
                  )}, Year: ${displayYear(String(lead.closedDate || ""))}`}
                >
                  {displayProjectCode(lead.projectCode) || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium flex-shrink-0">
                      {lead.businessName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-gray-900 truncate max-w-xs">
                        {lead.businessName || "-"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {lead.closureType === "new" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            New
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Renewal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {lead.city || "-"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {lead.state || ""}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(lead.closedDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {formatCurrency(lead.totalCost)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {formatCurrency(lead.tcv)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium flex-shrink-0">
                      {lead.assignedTo?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "?"}
                    </div>
                    <div className="ml-3 text-sm font-medium text-gray-900 truncate max-w-xs">
                      {lead.assignedTo?.name || "-"}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                  <button
                    onClick={() => toggleDropdown(id)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <FiMoreVertical className="h-5 w-5" />
                  </button>
                  {openDropdown === id && (
                    <div className="origin-top-right absolute right-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <div
                        className="py-1"
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="options-menu"
                      >
                        <button
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                          role="menuitem"
                          onClick={() => {
                            setShowUploadModal(true);
                            // Don't setOpenDropdown(null) here - we need the ID for upload
                          }}
                        >
                          Upload Student List
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className="py-12 text-center">
                <FiFilter className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 font-medium text-gray-900">
                  No closed deals found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {`There are currently no ${
                    viewMyLeadsOnly ? "your" : "team"
                  } closed deals.`}
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

ClosedLeadsTable.propTypes = {
  leads: PropTypes.array.isRequired,
  formatDate: PropTypes.func.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  viewMyLeadsOnly: PropTypes.bool.isRequired,
};

export default ClosedLeadsTable;
