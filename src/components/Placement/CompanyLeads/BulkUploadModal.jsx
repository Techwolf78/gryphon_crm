import React, { useState, useEffect } from "react";
import { XIcon, CloudUploadIcon } from "@heroicons/react/outline";
import * as XLSX from 'xlsx';
import { uploadCompaniesFromExcel } from '../../../utils/excelUpload';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../../firebase';

function BulkUploadModal({ show, onClose, allUsers = null, currentUser = null }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [users, setUsers] = useState({});

  // Fetch users if not provided as props
  useEffect(() => {
    const fetchUsers = async () => {
      if (allUsers) {
        setUsers(allUsers);
        return;
      }

      try {
        const usersQuery = query(collection(db, "users"));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = {};
        usersSnapshot.forEach((doc) => {
          usersData[doc.id] = { id: doc.id, ...doc.data() };
        });
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    if (show) {
      fetchUsers();
    }
  }, [show, allUsers]);

  // Set default assignee to current user when modal opens
  useEffect(() => {
    if (show && currentUser) {
      setSelectedAssignee(currentUser.uid || currentUser.id || '');
    }
  }, [show, currentUser]);

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

      // Determine assignee ID
      const finalAssigneeId = selectedAssignee || null;
      if (finalAssigneeId) {
        console.log("👤 Leads will be assigned to user:", finalAssigneeId);
      }

      // Use the new uploadCompaniesFromExcel function
      const result = await uploadCompaniesFromExcel(file, (progressPercent) => {
        setProgress(progressPercent);
      }, finalAssigneeId);

      console.log("🎊 Upload completed successfully!");
      console.log(`📈 Summary: ${result.totalCompanies} companies uploaded in ${result.totalBatches} batches`);
      console.log(`🧠 Smart batching: ${result.batchesUpdated || 0} batches updated, ${result.batchesCreated || result.totalBatches} batches created`);

      setProgress(100);
      alert(`Successfully uploaded ${result.totalCompanies} companies!\n\nSmart batching results:\n• ${result.batchesUpdated || 0} existing batches updated\n• ${result.batchesCreated || result.totalBatches} new batches created\n• Total batches: ${result.totalBatches}${finalAssigneeId ? '\n• Leads have been assigned to the selected user.' : ''}`);

      setUploading(false);
      setFile(null);
      setSelectedAssignee(currentUser?.uid || currentUser?.id || '');
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
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="bg-linear-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-semibold text-white">Bulk Upload Companies</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
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

          {Object.keys(users).length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign leads to:
              </label>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Don't assign (leave unassigned)</option>
                {Object.values(users)
                  .filter(user => user.departments?.includes("Placement") || user.department === "Placement")
                  .sort((a, b) => (a.name || a.displayName || '').localeCompare(b.name || b.displayName || ''))
                  .map(user => (
                    <option key={user.uid || user.id} value={user.uid || user.id}>
                      {user.name || user.displayName || user.email || 'Unknown User'}
                      {user.role && ` (${user.role})`}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select a user from the Placement department to assign all uploaded leads to them immediately.
              </p>
            </div>
          )}

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
                  <li>CompanyName (or Company Name)</li>
                  <li>ContactPerson (or Contact Person)</li>
                  <li>Designation</li>
                  <li>Phone</li>
                  <li>CompanyUrl (or Company URL)</li>
                  <li>LinkedinUrl (or LinkedIn URL)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-blue-700">Optional:</p>
                <ul className="list-disc list-inside text-xs">
                  <li>Email</li>
                  <li>Location</li>
                  <li>Industry</li>
                  <li>CompanySize (or Company Size)</li>
                  <li>Source</li>
                  <li>Notes</li>
                  <li>Status (hot/warm/cold/onboarded)</li>
                </ul>
              </div>
            </div>
            <p className="mt-2 text-xs text-red-600 font-medium">
              ⚠️ Each batch of ~1000 companies creates:<br/>
              - 1 write per batch document<br/><br/>
              For 58,000 companies: ~58 batches × 1 = 58 writes<br/><br/>
              Free tier: 20,000 writes/day. This upload is well within limits.<br/><br/>
              ⏱️ 2-second delay between batches to prevent rate limiting.<br/><br/>
              � Failed batches will be retried up to 3 times with exponential backoff.<br/><br/>
              🧠 <strong>Smart batching enabled:</strong> Automatically detects existing batches and continues numbering from the highest batch found. If the last batch has space (&lt;999 records), new records will be appended to it. Otherwise, a new batch is created automatically.<br/><br/>
              �💡 Uses Base64 encoding for efficient storage and reduced document size.
            </p>
            
            <p className="mt-2 text-xs text-gray-500">
              <strong>Troubleshooting:</strong> If upload shows 0 records, check that your Excel file has proper column headers and data rows.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end shrink-0">
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