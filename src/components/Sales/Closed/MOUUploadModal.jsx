import React, { useState } from "react";
import PropTypes from "prop-types";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";

const MOUUploadModal = ({ isOpen, onClose, leadData, onUploadSuccess }) => {
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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError("Please select a valid document file (PDF, DOC, or DOCX)");
        return;
      }
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
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError("Please select a valid document file (PDF, DOC, or DOCX)");
        return;
      }
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

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file first");
      return;
    }

    if (!leadData || !leadData.projectCode) {
      setUploadError("No lead data available for MOU upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload to Cloudinary
      const cloudinaryResponse = await uploadToCloudinary(selectedFile);
      const newMouUrl = cloudinaryResponse.url;

      // Find the training form document based on the leadData
      const projectCode = leadData.projectCode;
      console.log("Found project code:", projectCode);

      // Convert project code to document ID for trainingForms collection
      const trainingFormDocId = projectCodeToDocId(projectCode);
      console.log("Training form document ID:", trainingFormDocId);

      const trainingFormRef = doc(db, "trainingForms", trainingFormDocId);

      // Check if the training form document exists first
      const trainingFormSnap = await getDoc(trainingFormRef);
      if (!trainingFormSnap.exists()) {
        throw new Error(`Training form not found for project: ${projectCode}`);
      }

      // Create a clean mouDocument object without undefined values
      const mouDocumentData = {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        uploadedAt: serverTimestamp(),
        uploadedBy: user?.email || "Unknown",
        fileType: selectedFile.type,
      };

      // Add Cloudinary metadata only if they exist
      if (cloudinaryResponse.public_id) {
        mouDocumentData.public_id = cloudinaryResponse.public_id;
      }
      if (cloudinaryResponse.format) {
        mouDocumentData.format = cloudinaryResponse.format;
      }
      if (cloudinaryResponse.bytes) {
        mouDocumentData.bytes = cloudinaryResponse.bytes;
      }
      if (cloudinaryResponse.created_at) {
        mouDocumentData.created_at = cloudinaryResponse.created_at;
      }

      // Update both trainingForms and placementData collections with MOU document info
      await updateDoc(trainingFormRef, {
        mouFileUrl: newMouUrl,
        mouDocument: mouDocumentData,
        lastUpdated: serverTimestamp()
      });

      // Also update placementData collection
      const placementDataRef = doc(db, "placementData", trainingFormDocId);
      await updateDoc(placementDataRef, {
        mouFileUrl: newMouUrl,
        mouDocument: mouDocumentData,
        lastUpdated: serverTimestamp()
      });

      console.log("MOU document uploaded successfully for project:", projectCode);

      setUploadProgress(100);
      setUploadSuccess(true);
      setSelectedFile(null);

      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("MOU upload error:", error);
      setUploadError("Error uploading MOU document: " + error.message);
    } finally {
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

  const handleClose = () => {
    resetStates();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">
              Upload MOU Document
            </h3>
            <button
              onClick={handleClose}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6">
          {/* MOU File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              isDragging
                ? "border-red-500 bg-red-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="space-y-4">
              <div className="text-4xl">
                {selectedFile ? "📄" : "📋"}
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {selectedFile ? selectedFile.name : "Drop your MOU document here"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse files
                </p>
              </div>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="mou-file-upload"
              />
              <label
                htmlFor="mou-file-upload"
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer transition-colors"
              >
                Choose Document
              </label>
            </div>
          </div>

          {/* MOU Upload Progress */}
          {uploading && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Uploading MOU...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* MOU Error Message */}
          {uploadError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-500 mr-2">⚠️</div>
                <p className="text-red-700 text-sm">{uploadError}</p>
              </div>
            </div>
          )}

          {/* MOU Success Message */}
          {uploadSuccess && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-green-500 mr-2">✅</div>
                <p className="text-green-700 text-sm">
                  MOU document uploaded successfully to both Learning and Placement departments!
                </p>
              </div>
            </div>
          )}

          {/* MOU Instructions */}
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">Document Requirements:</h4>
            <ul className="text-sm text-red-800 space-y-1">
              <li>• Supported formats: PDF, DOC, DOCX</li>
              <li>• Maximum file size: 10MB</li>
              <li>• Document should be clearly readable</li>
              <li>• File will be stored securely and linked to both Learning and Placement departments</li>
            </ul>
          </div>

          {/* MOU Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? "Uploading..." : "Upload MOU"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

MOUUploadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  leadData: PropTypes.object,
  onUploadSuccess: PropTypes.func,
};

export default MOUUploadModal;