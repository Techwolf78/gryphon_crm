import React, { useState, useEffect, useCallback } from "react";
import { XIcon, CloudUploadIcon } from "@heroicons/react/outline";
import * as XLSX from 'xlsx';
import { uploadCompaniesFromExcel } from '../../../utils/excelUpload';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';

function BulkUploadModal({ show, onClose, allUsers = null, currentUser = null }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [users, setUsers] = useState({});
  const [batches, setBatches] = useState([]);
  const [batchInfo, setBatchInfo] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState('auto');

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

  // Fetch batches when modal opens
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const q = query(collection(db, "companyleads"), orderBy("__name__", "desc"));
        const querySnapshot = await getDocs(q);
        const batchList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const companies = data.companies || [];
          const numCompanies = Array.isArray(companies) ? companies.length : Object.keys(companies).length;
          return {
            id: doc.id,
            numCompanies,
            size: JSON.stringify(data).length
          };
        });
        // Sort by batch number
        const sorted = batchList.sort((a, b) => {
          const aMatch = a.id.match(/batch_(\d+)/);
          const bMatch = b.id.match(/batch_(\d+)/);
          const aNum = aMatch ? parseInt(aMatch[1]) : 0;
          const bNum = bMatch ? parseInt(bMatch[1]) : 0;
          return aNum - bNum;
        });
        setBatches(sorted);
      } catch (error) {
        console.error("Error fetching batches:", error);
      }
    };

    if (show) {
      fetchBatches();
    }
  }, [show]);

  // Set default assignee to current user when modal opens
  useEffect(() => {
    if (show && currentUser) {
      setSelectedAssignee('');
      setSelectedBatchId('auto'); // Reset to auto
      setBatchInfo(null); // Reset batch info
    }
  }, [show, currentUser]);

  const calculateBatchInfo = async (selectedFile) => {
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      // Remove header row and filter empty rows
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
      const numCompanies = rows.length;

      // Set initial batchInfo with numCompanies, will update target later
      setBatchInfo({ 
        numCompanies,
        batchDetails: [],
        isMultiple: false,
        totalBatches: 0,
        totalSizeKB: 0,
        willExceed: false
      });

      // Update target batch based on current selection
      updateTargetBatch(numCompanies, selectedBatchId);

    } catch (error) {
      console.error("Error calculating batch info:", error);
      setBatchInfo(null);
    }
  };

  const updateTargetBatch = useCallback((numCompanies, batchId) => {
    if (!numCompanies) return;

    const chunkSize = 500;
    const maxSizeKB = 900; // 900KB to be safe under 1MB
    const sizePerCompanyKB = 1; // Rough estimate

    if (batchId === 'auto') {
      // Auto logic - may create multiple batches
      let batchesNeeded = Math.ceil(numCompanies / chunkSize);
      let batchDetails = [];
      let currentBatchNum = batches.length > 0 ? 
        (batches[batches.length - 1].id.match(/batch_(\d+)/) ? 
         parseInt(batches[batches.length - 1].id.match(/batch_(\d+)/)[1]) + 1 : 1) : 1;

      for (let i = 0; i < batchesNeeded; i++) {
        const companiesInBatch = Math.min(chunkSize, numCompanies - i * chunkSize);
        const sizeKB = companiesInBatch * sizePerCompanyKB;
        batchDetails.push({
          id: `batch_${currentBatchNum + i}`,
          companies: companiesInBatch,
          sizeKB,
          isNew: true
        });
      }

      setBatchInfo({
        numCompanies,
        batchDetails,
        isMultiple: batchesNeeded > 1,
        totalBatches: batchesNeeded,
        totalSizeKB: numCompanies * sizePerCompanyKB,
        willExceed: numCompanies * sizePerCompanyKB > maxSizeKB
      });
    } else if (batchId === 'new') {
      // Create new batch(es) - may need multiple
      let batchesNeeded = Math.ceil(numCompanies / chunkSize);
      let batchDetails = [];
      let currentBatchNum = batches.length > 0 ? 
        (batches[batches.length - 1].id.match(/batch_(\d+)/) ? 
         parseInt(batches[batches.length - 1].id.match(/batch_(\d+)/)[1]) + 1 : 1) : 1;

      for (let i = 0; i < batchesNeeded; i++) {
        const companiesInBatch = Math.min(chunkSize, numCompanies - i * chunkSize);
        const sizeKB = companiesInBatch * sizePerCompanyKB;
        batchDetails.push({
          id: `batch_${currentBatchNum + i}`,
          companies: companiesInBatch,
          sizeKB,
          isNew: true
        });
      }

      setBatchInfo({
        numCompanies,
        batchDetails,
        isMultiple: batchesNeeded > 1,
        totalBatches: batchesNeeded,
        totalSizeKB: numCompanies * sizePerCompanyKB,
        willExceed: numCompanies * sizePerCompanyKB > maxSizeKB
      });
    } else {
      // Specific existing batch
      const targetBatch = batches.find(b => b.id === batchId);
      if (!targetBatch) {
        // Fallback to auto - don't call recursively, just handle inline
        let batchesNeeded = Math.ceil(numCompanies / chunkSize);
        let batchDetails = [];
        let currentBatchNum = batches.length > 0 ? 
          (batches[batches.length - 1].id.match(/batch_(\d+)/) ? 
           parseInt(batches[batches.length - 1].id.match(/batch_(\d+)/)[1]) + 1 : 1) : 1;

        for (let i = 0; i < batchesNeeded; i++) {
          const companiesInBatch = Math.min(chunkSize, numCompanies - i * chunkSize);
          const sizeKB = companiesInBatch * sizePerCompanyKB;
          batchDetails.push({
            id: `batch_${currentBatchNum + i}`,
            companies: companiesInBatch,
            sizeKB,
            isNew: true
          });
        }

        setBatchInfo({
          numCompanies,
          batchDetails,
          isMultiple: batchesNeeded > 1,
          totalBatches: batchesNeeded,
          totalSizeKB: numCompanies * sizePerCompanyKB,
          willExceed: numCompanies * sizePerCompanyKB > maxSizeKB
        });
        return;
      }

      const availableSpace = chunkSize - targetBatch.numCompanies;
      const companiesForExisting = Math.min(availableSpace, numCompanies);
      const remainingCompanies = numCompanies - companiesForExisting;

      let batchDetails = [{
        id: targetBatch.id,
        companies: targetBatch.numCompanies + companiesForExisting,
        sizeKB: (targetBatch.size + companiesForExisting * sizePerCompanyKB) / 1024,
        isNew: false
      }];

      let currentBatchNum = parseInt(targetBatch.id.match(/batch_(\d+)/)[1]);
      let additionalBatches = Math.ceil(remainingCompanies / chunkSize);

      for (let i = 0; i < additionalBatches; i++) {
        currentBatchNum++;
        const companiesInBatch = Math.min(chunkSize, remainingCompanies - i * chunkSize);
        const sizeKB = companiesInBatch * sizePerCompanyKB;
        batchDetails.push({
          id: `batch_${currentBatchNum}`,
          companies: companiesInBatch,
          sizeKB,
          isNew: true
        });
      }

      const totalSizeKB = batchDetails.reduce((sum, b) => sum + b.sizeKB, 0);

      setBatchInfo({
        numCompanies,
        batchDetails,
        isMultiple: batchDetails.length > 1,
        totalBatches: batchDetails.length,
        totalSizeKB,
        willExceed: totalSizeKB > maxSizeKB
      });
    }
  }, [batches]);

  // Update target batch when selection changes
  useEffect(() => {
    if (batchInfo && batchInfo.numCompanies) {
      updateTargetBatch(batchInfo.numCompanies, selectedBatchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchId, batches, updateTargetBatch]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setSelectedBatchId('auto'); // Reset to auto when file changes
    if (selectedFile) {
      calculateBatchInfo(selectedFile);
    } else {
      setBatchInfo(null);
    }
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
      const finalAssigneeId = selectedAssignee && selectedAssignee !== 'unassigned' ? selectedAssignee : null;
      if (finalAssigneeId) {
        console.log("👤 Leads will be assigned to user:", finalAssigneeId);
      }

      // Use the new uploadCompaniesFromExcel function
      const finalTargetBatchId = (selectedBatchId === 'auto' || batchInfo.isMultiple) ? null : 
                                 (selectedBatchId === 'new' ? batchInfo.batchDetails[0].id : selectedBatchId);
      const result = await uploadCompaniesFromExcel(file, (progressPercent) => {
        setProgress(progressPercent);
      }, finalAssigneeId, finalTargetBatchId);

      console.log("🎊 Upload completed successfully!");
      console.log(`📈 Summary: ${result.totalCompanies} companies uploaded in ${result.totalBatches} batches`);
      console.log(`🧠 Smart batching: ${result.batchesUpdated || 0} batches updated, ${result.batchesCreated || 0} batches created`);

      setProgress(100);
      alert(`Successfully uploaded ${result.totalCompanies} companies!\n\nSmart batching results:\n• ${result.batchesUpdated || 0} existing batches updated\n• ${result.batchesCreated || 0} new batches created\n• Total batches: ${result.totalBatches}${finalAssigneeId ? '\n• Leads have been assigned to the selected user.' : ''}`);

      setUploading(false);
      setFile(null);
      setSelectedAssignee('');
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
            {file && !batchInfo && (
              <p className="text-xs text-gray-500 mt-1">Analyzing file...</p>
            )}
          </div>

          {file && batchInfo && batchInfo.batchDetails && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-3">📋 Upload Preview</h4>
              
              {/* Batch Selection */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  Target Batch:
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="auto">Auto-select (recommended)</option>
                  <option value="new">Create New Batch</option>
                  {batches.map(batch => (
                    <option key={batch.id} value={batch.id}>
                      {batch.id} ({batch.numCompanies} companies, ~{Math.round(batch.size / 1024)} KB)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-blue-600 mt-1">
                  Choose where to upload the companies. Auto-select uses smart batching.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                {batchInfo.isMultiple ? (
                  <div>
                    <p className="text-blue-700">
                      <strong>{batchInfo.numCompanies.toLocaleString()}</strong> companies will be distributed across <strong>{batchInfo.totalBatches}</strong> batch{batchInfo.totalBatches > 1 ? 'es' : ''}:
                    </p>
                    <div className="mt-3 space-y-2">
                      {batchInfo.batchDetails && batchInfo.batchDetails.map((batch) => (
                        <div key={batch.id} className="bg-white p-3 rounded border">
                          <p className="font-medium text-blue-900">{batch.id} {batch.isNew ? '(new)' : '(existing)'}</p>
                          <p className="text-xs text-gray-600">
                            {batch.companies} companies, ~{Math.round(batch.sizeKB)} KB
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-green-600 font-medium mt-2">
                      Total: {batchInfo.totalBatches} batches, ~{Math.round(batchInfo.totalSizeKB)} KB across all batches
                    </p>
                  </div>
                ) : batchInfo.batchDetails && batchInfo.batchDetails.length > 0 ? (
                  <div>
                    <p className="text-blue-700">
                      <strong>{batchInfo.numCompanies.toLocaleString()}</strong> companies will be {batchInfo.batchDetails[0]?.isNew ? 'added to a new batch' : 'appended to existing batch'}:
                    </p>
                    <div className="bg-white p-3 rounded border">
                      <p className="font-medium text-blue-900">{batchInfo.batchDetails[0]?.id}</p>
                      <p className="text-xs text-gray-600">
                        Current: {batchInfo.batchDetails[0]?.companies - (batchInfo.batchDetails[0]?.isNew ? 0 : batchInfo.numCompanies)} companies, ~{Math.round((batchInfo.batchDetails[0]?.sizeKB - batchInfo.numCompanies) || 0)} KB
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        After upload: ~{batchInfo.batchDetails[0]?.companies} companies, ~{Math.round(batchInfo.batchDetails[0]?.sizeKB)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-blue-700">Calculating batch information...</p>
                  </div>
                )}
                {batchInfo.willExceed && (
                  <div className="bg-red-50 border border-red-200 rounded p-2">
                    <p className="text-xs text-red-700 font-medium">
                      ⚠️ <strong>Warning:</strong> The total upload size ({Math.round(batchInfo.totalSizeKB)} KB) may cause issues.
                      The system will automatically split into {batchInfo.totalBatches} batches to stay under limits.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

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
              ⚠️ Each batch of ~500 companies creates:<br/>
              - 1 write per batch document<br/><br/>
              For 58,000 companies: ~116 batches × 1 = 116 writes<br/><br/>
              Free tier: 20,000 writes/day. This upload is well within limits.<br/><br/>
              ⏱️ 2-second delay between batches to prevent rate limiting.<br/><br/>
              � Failed batches will be retried up to 3 times with exponential backoff.<br/><br/>
              🧠 <strong>Smart batching enabled:</strong> Automatically detects existing batches and continues numbering from the highest batch found. If the last batch has space (&lt;499 records), new records will be appended to it. Otherwise, a new batch is created automatically.<br/><br/>
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
