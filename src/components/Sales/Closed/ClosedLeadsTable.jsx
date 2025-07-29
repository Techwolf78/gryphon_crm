import React, { useState, useEffect, useRef } from "react";
import {
  FiFilter,
  FiMoreVertical,
  FiUpload,
  FiX,
  FiFileText,
  FiEdit,
} from "react-icons/fi";
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
  updateDoc,
  serverTimestamp, // <-- arrayUnion removed if unused
} from "firebase/firestore";
import EditClosedLeadModal from "./EditClosedLeadModal"; // Adjust path if needed
import ViewClosedLeadDetails from "./ClosedLeadDetailModel"; // Adjust path if needed

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
  const [showMOUUploadModal, setShowMOUUploadModal] = useState(false);
  const [mouFile, setMOUFile] = useState(null);
  const [mouUploading, setMOUUploading] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [showEditClosureModal, setShowEditClosureModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedLeadDetails, setSelectedLeadDetails] = useState(null);

  // Add ref for dropdown container
  const dropdownRef = useRef(null);

  // Update the useEffect for click outside handling
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close if we're clicking outside ALL dropdowns
      if (!event.target.closest('[data-dropdown-container]')) {
        setOpenDropdown(null);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // Remove openDropdown dependency

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_mou"); // Using your preset name
    formData.append("folder", "mou_documents");
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
      console.error("Cloudinary upload error:", error);
      throw new Error(`MOU upload failed: ${error.message}`);
    }
  };

  const handleMOUMenuClick = (id) => {
    setActiveLeadId(id); // Store the lead ID separately
    setShowMOUUploadModal(true);
    setOpenDropdown(null); // Close dropdown but keep lead reference
  };

  const handleMOUUpload = async () => {
    if (!mouFile) {
      setUploadError("Please select a file first");
      return;
    }

    // Validate PDF
    const isPDF =
      mouFile.type.includes("pdf") ||
      mouFile.name.toLowerCase().endsWith(".pdf");
    if (!isPDF) {
      setUploadError("Only PDF files are accepted");
      return;
    }

    if (mouFile.size > 10 * 1024 * 1024) {
      setUploadError("File must be smaller than 10MB");
      return;
    }

    setMOUUploading(true);
    setUploadError(null);

    try {
      // Use activeLeadId instead of openDropdown
      const currentLead = leads.find(([id]) => id === activeLeadId);

      if (!currentLead) {
        throw new Error(
          "Could not find lead data - please refresh and try again"
        );
      }

      const leadData = currentLead[1];

      // Upload to Cloudinary
      const cloudinaryResponse = await uploadToCloudinary(mouFile);
      const newMouUrl = cloudinaryResponse.url;

      const docId = leadData.projectCode
        ? projectCodeToDocId(leadData.projectCode)
        : leadData.businessName?.toLowerCase().replace(/\s+/g, "-") ||
        "default-id";

      const docRef = doc(db, "trainingForms", docId);

      await updateDoc(docRef, {
        mouFileUrl: newMouUrl,
        mouFileMeta: {
          public_id: cloudinaryResponse.public_id || "",
          format: cloudinaryResponse.format || "",
          bytes: cloudinaryResponse.bytes || 0,
          created_at: cloudinaryResponse.created_at || "",
        },
        lastUpdated: serverTimestamp(),
      });

      // Also update placementData collection
      const placementRef = doc(db, "placementData", docId);
      await updateDoc(placementRef, {
        mouFileUrl: newMouUrl,
        mouFileMeta: {
          public_id: cloudinaryResponse.public_id || "",
          format: cloudinaryResponse.format || "",
          bytes: cloudinaryResponse.bytes || 0,
          created_at: cloudinaryResponse.created_at || "",
        },
        lastUpdated: serverTimestamp(),
      });

      setShowMOUUploadModal(false);
      setMOUFile(null);
      setActiveLeadId(null);
      // Clear after successful upload
    } catch (error) {
      console.error("MOU upload failed:", error);
      setUploadError(`Upload failed: ${error.message}`);
    } finally {
      setMOUUploading(false);
    }
  };
  const handleEditClosureForm = async (lead) => {
    try {
      setOpenDropdown(null);

      const projectCode = lead.projectCode;
      if (!projectCode) {
        alert("Project code not found!");
        return;
      }

      const docId = projectCodeToDocId(projectCode);
      const docRef = doc(db, "trainingForms", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSelectedLead({ id: docSnap.id, ...docSnap.data() }); // ✅ Ye trainingForms ka data bhejega
        setShowEditClosureModal(true);
      } else {
        alert("Training form data not found in Firestore!");
      }
    } catch (error) {
      console.error("Error fetching training form data:", error);
      alert("Failed to fetch form data");
    }
  };

  const handleUploadClick = async () => {
    const currentLead = leads.find(([id]) => id === activeLeadId)?.[1];

    if (!currentLead) {
      console.error("No lead found for ID:", activeLeadId);
      setUploadError("No lead selected");
      return;
    }

    const projectCode =
      currentLead?.projectCode || currentLead?.id || "default";
    await handleUpload(projectCode);
  };

  // Update the toggleDropdown function
  const toggleDropdown = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
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

      // --- TRAINING FORMS ---
      const trainingFormRef = doc(db, "trainingForms", docId);
      const trainingStudentsRef = collection(trainingFormRef, "students");
      const trainingDocSnap = await getDoc(trainingFormRef);

      if (!trainingDocSnap.exists()) {
        await setDoc(trainingFormRef, {
          projectCode,
          docId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // DELETE ALL EXISTING STUDENTS IN TRAINING FORMS
      const existingTrainingStudents = await getDocs(trainingStudentsRef);
      const deleteTrainingPromises = existingTrainingStudents.docs.map((studentDoc) =>
        deleteDoc(doc(trainingStudentsRef, studentDoc.id))
      );
      await Promise.all(deleteTrainingPromises);

      // --- PLACEMENT DATA ---
      const placementFormRef = doc(db, "placementData", docId);
      const placementStudentsRef = collection(placementFormRef, "students");
      const placementDocSnap = await getDoc(placementFormRef);

      if (!placementDocSnap.exists()) {
        await setDoc(placementFormRef, {
          projectCode,
          docId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // DELETE ALL EXISTING STUDENTS IN PLACEMENT DATA
      const existingPlacementStudents = await getDocs(placementStudentsRef);
      const deletePlacementPromises = existingPlacementStudents.docs.map((studentDoc) =>
        deleteDoc(doc(placementStudentsRef, studentDoc.id))
      );
      await Promise.all(deletePlacementPromises);

      // Process new data for both collections
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

          // Add to trainingForms
          const newTrainingStudentRef = doc(trainingStudentsRef);
          await setDoc(newTrainingStudentRef, studentData);

          // Add to placementData
          const newPlacementStudentRef = doc(placementStudentsRef);
          await setDoc(newPlacementStudentRef, studentData);

          processedRows++;
          setUploadProgress(Math.round((processedRows / totalRows) * 100));
        } catch (error) {
          console.error(`Error processing row ${processedRows + 1}:`, error);
        }
      }

      // Update the parent documents in both collections
      await setDoc(
        trainingFormRef,
        {
          studentCount: data.length,
          updatedAt: new Date(),
          studentFileUrl: selectedFile?.name || "uploaded_file",
        },
        { merge: true }
      );
      await setDoc(
        placementFormRef,
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
    <div className="overflow-x-auto min-h-screen">
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50  flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md ">
            <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 border-b px-6 py-4">
              <h3 className="text-lg font-medium ">
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
                className={`border-2 border-dashed rounded-lg p-8 text-center ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
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
            <div className="bg-gray-50 px-6 py-3 bg-gradient-to-l from-blue-600 to-blue-800 flex justify-end ">
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
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${selectedFile && !uploading
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
      {/* MOU Upload Modal */}
      {showMOUUploadModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 border-b px-6 py-4">
              <h3 className="text-lg font-medium 
              ">Upload MOU</h3>
              <button
                onClick={() => {
                  setShowMOUUploadModal(false);
                  setMOUFile(null);
                  setUploadError(null);
                }}
                className="text-gray-400 hover:text-gray-500"
                disabled={mouUploading}
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-4">
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
                  {uploadError}
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4 flex justify-center text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>Select PDF File</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setMOUFile(e.target.files[0])}
                      disabled={mouUploading}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  PDF files only (max 10MB)
                </p>
              </div>

              {mouFile && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {mouFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(mouFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setMOUFile(null)}
                      className="text-gray-400 hover:text-gray-500"
                      disabled={mouUploading}
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-3 flex  bg-gradient-to-l from-blue-600 to-blue-800 justify-end">
              <button
                type="button"
                className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => {
                  setShowMOUUploadModal(false);
                  setMOUFile(null);
                }}
                disabled={mouUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${mouFile && !mouUploading
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-blue-300 cursor-not-allowed"
                  }`}
                disabled={!mouFile || mouUploading}
                onClick={handleMOUUpload}
              >
                {mouUploading ? "Uploading..." : "Upload MOU"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Table */}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project Code
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[180px]">
              Institution
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Closed Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actual TCV
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Projected TCV
            </th>
            <th className="px-8 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[140px]">
              Owner
            </th>
            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[60px]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.length > 0 ? (
            leads.map(([id, lead]) => (
              <tr
                key={id}
                className="hover:bg-gray-50 transition-colors align-top cursor-pointer"
                onClick={async () => {
                  try {
                    const projectCode = lead.projectCode;
                    if (!projectCode) {
                      console.error("No project code found for this lead");
                      return;
                    }

                    const docId = projectCodeToDocId(projectCode);
                    const docRef = doc(db, "trainingForms", docId);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                      setSelectedLeadDetails({ id: docSnap.id, ...docSnap.data() });
                    } else {
                      console.error("No training form found for this lead");
                      setSelectedLeadDetails(lead);
                    }
                  } catch (error) {
                    console.error("Error fetching training form:", error);
                    setSelectedLeadDetails(lead);
                  }
                }}
              >
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 overflow-hidden truncate max-w-[120px]"
                  title={`DocID: ${projectCodeToDocId(
                    lead.projectCode || ""
                  )}, ProjectCode: ${docIdToProjectCode(
                    projectCodeToDocId(lead.projectCode || "")
                  )}, Year: ${displayYear(String(lead.closedDate || ""))}`}
                >
                  {displayProjectCode(lead.projectCode) || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap overflow-hidden truncate max-w-[180px]">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium flex-shrink-0">
                      {lead.businessName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-gray-900 truncate max-w-[140px] overflow-hidden whitespace-nowrap">
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
                <td className="px-6 py-4 whitespace-nowrap overflow-hidden truncate max-w-[120px]">
                  <div className="text-sm text-gray-900 truncate max-w-[100px] overflow-hidden whitespace-nowrap">
                    {lead.city || "-"}
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-[100px] overflow-hidden whitespace-nowrap">
                    {lead.state || ""}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 overflow-hidden truncate max-w-[120px]">
                  {formatDate(lead.closedDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 overflow-hidden truncate max-w-[120px]">
                  {formatCurrency(lead.totalCost)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 overflow-hidden truncate max-w-[120px]">
                  {formatCurrency(lead.tcv)}
                </td>
                <td className="px-8 py-4 whitespace-nowrap overflow-hidden truncate w-[140px]">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium flex-shrink-0">
                      {lead.assignedTo?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "?"}
                    </div>
                    <div className="ml-3 text-sm font-medium text-gray-900 truncate max-w-[100px] overflow-hidden whitespace-nowrap">
                      {lead.assignedTo?.name || "-"}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 whitespace-nowrap w-[60px]">
                  <div 
                    className="flex justify-center items-center h-full relative" 
                    data-dropdown-container // Add this data attribute
                  >
                    <button
                      onClick={(e) => toggleDropdown(id, e)} // Pass event to toggleDropdown
                      aria-label="Action menu"
                      aria-expanded={openDropdown === id}
                      className={`p-1.5 rounded-full transition-all duration-150 ${
                        openDropdown === id
                          ? "bg-gray-100/80 text-primary-600"
                          : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-700"
                      }`}
                    >
                      {openDropdown === id ? (
                        <FiX className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <FiMoreVertical className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>

                    {/* Dropdown menu */}
                    {openDropdown === id && (
                      <div
                        className="absolute right-0 top-full z-30 mt-1 w-48 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-gray-200/95 focus:outline-none"
                        data-dropdown-container // Add this data attribute here too
                        onClick={(e) => e.stopPropagation()} // Prevent clicks inside dropdown from bubbling
                        style={{
                          boxShadow:
                            "0px 10px 25px -5px rgba(0, 0, 0, 0.1), 0px 5px 10px -3px rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <div className="flex flex-col p-1.5">
                          <button
                            className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50/90 hover:text-primary-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveLeadId(id);
                              setShowUploadModal(true);
                              setOpenDropdown(null);
                            }}
                          >
                            <FiUpload className="mr-3 h-4 w-4 opacity-80" />
                            <span>Upload Student List</span>
                          </button>

                          <button
                            className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50/90 hover:text-primary-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMOUMenuClick(id);
                            }}
                          >
                            <FiFileText className="mr-3 h-4 w-4 opacity-80" />
                            <span>
                              {lead.mouFileUrl ? "Update MOU" : "Upload MOU"}
                            </span>
                            {lead.mouFileUrl && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-green-400/90"></span>
                            )}
                          </button>

                          <button
                            className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50/90 hover:text-primary-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClosureForm(lead);
                            }}
                          >
                            <FiEdit className="mr-3 h-4 w-4 opacity-80" />
                            <span>Edit Details</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
                  {`There are currently no ${viewMyLeadsOnly ? "your" : "team"
                    } closed deals.`}
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {/* Edit Closure Modal */}
      {showEditClosureModal && selectedLead && (
        <EditClosedLeadModal
          lead={selectedLead} // Ye ab trainingForms ka data hai
          onClose={() => {
            setShowEditClosureModal(false);
            setSelectedLead(null);
          }}
          onSave={() => {
            setShowEditClosureModal(false);
            setSelectedLead(null);
          }}
        />
      )}
      {selectedLeadDetails && (
        <ViewClosedLeadDetails
          lead={selectedLeadDetails}
          onClose={() => setSelectedLeadDetails(null)}
        />
      )}

    </div>
  );
};

ClosedLeadsTable.propTypes = {
  leads: PropTypes.array.isRequired,
  formatDate: PropTypes.func.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  viewMyLeadsOnly: PropTypes.bool.isRequired,
  // onEditClosureForm: PropTypes.func, // <-- Remove if not used
};

export default ClosedLeadsTable;
