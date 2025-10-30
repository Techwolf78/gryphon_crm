import React, { useState } from "react";
import { XIcon, CloudUploadIcon } from "@heroicons/react/outline";
import * as XLSX from 'xlsx';
import { uploadCompaniesFromExcel } from '../../../utils/excelUpload';

function BulkUploadModal({ show, onClose }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'CompanyName',
      'ContactPerson',
      'Designation',
      'Phone',
      'CompanyUrl',
      'LinkedinUrl',
      'Email', // Optional
      'Location', // Optional
      'Industry', // Optional
      'CompanySize', // Optional
      'Source', // Optional
      'Notes', // Optional
      'Status' // Optional (hot, warm, cold, onboarded)
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    
    XLSX.writeFile(workbook, 'company_leads_template.xlsx');
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      console.log("🚀 Starting Excel upload process...");

      // Use the new uploadCompaniesFromExcel function
      const result = await uploadCompaniesFromExcel(file, (progressPercent) => {
        setProgress(progressPercent);
      });

      console.log("🎊 Upload completed successfully!");
      console.log(`📈 Summary: ${result.totalCompanies} companies uploaded in ${result.totalBatches} batches`);

      setProgress(100);
      alert(`Successfully uploaded ${result.totalCompanies} companies in ${result.totalBatches} batches!`);

      setUploading(false);
      setFile(null);
      onClose();

    } catch (error) {
      console.error("❌ Upload failed:", error);
      alert(`Upload failed: ${error.message}`);
      setUploading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-54 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Bulk Upload Companies</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Excel File (.xlsx)
              </label>
              <button
                onClick={handleDownloadTemplate}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Download Template
              </button>
            </div>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {uploading && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Processing Excel file... ({progress}%)
              </p>
            </div>
          )}

          <div className="text-sm text-gray-600 mb-4">
            <p><strong>Expected columns:</strong></p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <div>
                <p className="font-medium text-green-700">Required:</p>
                <ul className="list-disc list-inside text-xs">
                  <li>CompanyName</li>
                  <li>ContactPerson</li>
                  <li>Designation</li>
                  <li>Phone</li>
                  <li>CompanyUrl</li>
                  <li>LinkedinUrl</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-blue-700">Optional:</p>
                <ul className="list-disc list-inside text-xs">
                  <li>Email</li>
                  <li>Location</li>
                  <li>Industry</li>
                  <li>CompanySize</li>
                  <li>Source</li>
                  <li>Notes</li>
                  <li>Status (hot/warm/cold/onboarded)</li>
                </ul>
              </div>
            </div>
            <p className="mt-2 text-xs text-red-600 font-medium">
              ⚠️ Each batch of ~2000 companies creates:<br/>
              - 1 write per batch document<br/><br/>
              For 58,000 companies: ~29 batches × 1 = 29 writes<br/><br/>
              Free tier: 20,000 writes/day. This upload is well within limits.<br/><br/>
              💡 Uses Base64 encoding for efficient storage.
            </p>
            
            <p className="mt-2 text-xs text-gray-500">
              Other fields (Industry, Company Size, etc.) will be set to default values.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                file && !uploading
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              <CloudUploadIcon className="h-4 w-4 mr-2 inline" />
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulkUploadModal;