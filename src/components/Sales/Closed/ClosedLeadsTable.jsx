import React, { useState } from "react";
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
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import EditClosedLeadModal from "./EditClosedLeadModal";

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
  onEditClosureForm,
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

  const handleEditClosureClick = async (projectCode) => {
    try {
      setIsLoadingForm(true);
      const sanitizedCode = projectCode.replace(/\//g, "-");
      const docRef = doc(db, "trainingForms", sanitizedCode);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSelectedFormData(docSnap.data());
        setShowEditClosureForm(true);
      } else {
        console.error("No such form data found!");
      }
    } catch (err) {
      console.error("Error fetching form data: ", err);
    } finally {
      setIsLoadingForm(false);
    }
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_mou");
    formData.append("folder", "mou_documents");
    formData.append("timestamp", Math.round(Date.now() / 1000));

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
    setActiveLeadId(id);
    setShowMOUUploadModal(true);
    setOpenDropdown(null);
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

  const handleMOUUpload = async () => {
    if (!mouFile) {
      setUploadError("Please select a file first");
      return;
    }

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
      const currentLead = leads.find(([id]) => id === activeLeadId);

      if (!currentLead) {
        throw new Error(
          "Could not find lead data - please refresh and try again"
        );
      }

      const leadData = currentLead[1];
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

      setShowMOUUploadModal(false);
      setMOUFile(null);
      setActiveLeadId(null);
    } catch (error) {
      console.error("MOU upload failed:", error);
      setUploadError(`Upload failed: ${error.message}`);
    } finally {
      setMOUUploading(false);
    }
  };

  const handleEditClosureForm = (lead) => {
    setSelectedLead(lead);
    setShowEditClosureModal(true);
    setOpenDropdown(null);
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

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
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
      const existingStudents = await getDocs(studentsRef);
      const deletePromises = existingStudents.docs.map((studentDoc) =>
        deleteDoc(doc(studentsRef, studentDoc.id))
      );
      await Promise.all(deletePromises);

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
    <div className="w-full min-h-screen overflow-hidden">
      {" "}
      {/* Add min-h-screen */}
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b px-6 py-4 sticky top-0 bg-white z-10">
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
                className={`border-2 border-dashed rounded-lg p-4 md:p-8 text-center ${
                  isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4 flex flex-wrap justify-center text-sm text-gray-600">
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
                  <div className="flex items-center overflow-hidden">
                    <div className="ml-4 min-w-0">
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
                    className="text-gray-400 hover:text-gray-500 flex-shrink-0"
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
            <div className="bg-gray-50 px-6 py-3 flex justify-end border-t sticky bottom-0 bg-white z-10">
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
      {/* MOU Upload Modal */}
      {showMOUUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b px-6 py-4 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium text-gray-900">Upload MOU</h3>
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

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 md:p-8 text-center">
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
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {mouFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(mouFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setMOUFile(null)}
                      className="text-gray-400 hover:text-gray-500 flex-shrink-0"
                      disabled={mouUploading}
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className=" px-6 py-3 flex justify-end border-t sticky bottom-0 bg-white z-10">
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
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                  mouFile && !mouUploading
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
      <div className="w-full overflow-x-auto ">
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
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
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
                    className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-[180px]"
                    title={`DocID: ${projectCodeToDocId(
                      lead.projectCode || ""
                    )}, ProjectCode: ${docIdToProjectCode(
                      projectCodeToDocId(lead.projectCode || "")
                    )}, Year: ${displayYear(String(lead.closedDate || ""))}`}
                  >
                    {displayProjectCode(lead.projectCode) || "-"}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center min-w-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium flex-shrink-0">
                        {lead.businessName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="ml-2 min-w-0">
                        <div className="font-medium text-gray-900 truncate max-w-[150px]">
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
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 truncate max-w-[100px]">
                      {lead.city || "-"}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-[100px]">
                      {lead.state || ""}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-[100px]">
                    {formatDate(lead.closedDate)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap font-medium text-gray-900 truncate max-w-[80px]">
                    {formatCurrency(lead.totalCost)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap font-medium text-gray-900 truncate max-w-[80px]">
                    {formatCurrency(lead.tcv)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center min-w-0">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium flex-shrink-0">
                        {lead.assignedTo?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "?"}
                      </div>
                      <div className="ml-2 text-sm font-medium text-gray-900 truncate max-w-[100px]">
                        {lead.assignedTo?.name || "-"}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                    <button
                      onClick={() => toggleDropdown(id)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <FiMoreVertical className="h-5 w-5" />
                    </button>
                    {openDropdown === id && (
                      <div className="origin-top-right absolute right-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1" role="menu">
                          <button
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                            onClick={() => {
                              setActiveLeadId(id);
                              setShowUploadModal(true);
                              setOpenDropdown(null);
                            }}
                          >
                            <FiUpload className="mr-2 h-4 w-4" />
                            Upload Student List
                          </button>

                          <button
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                            onClick={() => handleMOUMenuClick(id)}
                          >
                            <FiFileText className="mr-2 h-4 w-4" />
                            {lead.mouFileUrl ? "Re-upload MOU" : "Upload MOU"}
                          </button>
                          <button
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                            onClick={() => handleEditClosureForm(lead)}
                          >
                            <FiEdit className="mr-2 h-4 w-4" />
                            Edit Closure Form
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="8"
                  className="px-6 py-12 text-center min-h-[calc(100vh-200px)]"
                >
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
      {/* Edit Closure Modal */}
      {showEditClosureModal && selectedLead && (
        <EditClosedLeadModal
          lead={selectedLead}
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
