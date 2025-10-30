import React, { useState } from "react";
import { XIcon, CloudUploadIcon } from "@heroicons/react/outline";
import * as XLSX from 'xlsx';
import { auth, db } from "../../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function BulkUploadModal({ show, onClose }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentGroup, setCurrentGroup] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Company Name',
      'Contact Person', 
      'Designation',
      'Contact Details',
      'email ID',
      'LinkedIn Profile'
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
    setCurrentGroup(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet).filter(row => 
        row['Company Name'] && row['Company Name'].toString().trim() !== ''
      );

      const chunkSize = 2000; // Modify this value to change chunk size
      const chunks = [];
      for (let i = 0; i < jsonData.length; i += chunkSize) {
        chunks.push(jsonData.slice(i, i + chunkSize));
      }

      setTotalGroups(chunks.length);

      // Calculate total writes: 1 per group document + 1 per company for index
      const totalWrites = chunks.length + jsonData.length;
      const dailyLimit = 20000; // Firestore free tier daily write limit

      if (totalWrites > dailyLimit) {
        const confirmed = window.confirm(
          `⚠️ WARNING: This upload will create ${totalWrites.toLocaleString()} writes, which exceeds the Firestore daily limit of ${dailyLimit.toLocaleString()} writes.\n\n` +
          `Details:\n` +
          `- ${chunks.length} group documents (${chunks.length} writes)\n` +
          `- ${jsonData.length} index entries (${jsonData.length.toLocaleString()} writes)\n\n` +
          `Free tier: 20,000 writes/day. Consider upgrading to Blaze plan.\n\n` +
          `Are you sure you want to proceed? This may cause quota exhaustion.`
        );
        if (!confirmed) {
          setUploading(false);
          return;
        }
      }

      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to upload companies.");
        setUploading(false);
        return;
      }

      let uploadedGroups = 0;

      for (let i = 0; i < chunks.length; i++) {
        setCurrentGroup(i + 1);
        const chunk = chunks[i];

        const companies = chunk.map(row => ({
          companyName: row['Company Name'] || '',
          industry: '', // Not provided
          companySize: 0, // Not provided
          companyWebsite: '', // Not provided
          pocName: row['Contact Person'] || '',
          workingSince: '', // Not provided
          pocLocation: '', // Not provided
          pocPhone: row['Contact Details'] || '',
          pocMail: row['email ID'] || '',
          pocDesignation: row['Designation'] || '',
          pocLinkedin: row['LinkedIn Profile'] || '',
          status: 'warm', // Default
          assignedTo: {
            uid: user.uid,
            name: user.displayName?.trim() || "No Name Provided",
            email: user.email || "No Email Provided",
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          contacts: [],
        }));

        try {
          // Upload chunk as one document in "companyGroups" collection
          const docRef = await addDoc(collection(db, "companyGroups"), {
            companies,
            uploadedBy: user.uid,
            uploadedAt: serverTimestamp(),
          });

          // Optional: Create index entries for queryability
          for (const company of companies) {
            await addDoc(collection(db, "companyIndex"), {
              companyName: company.companyName,
              groupId: docRef.id,
            });
          }

          uploadedGroups++;
          setProgress(Math.round((uploadedGroups / chunks.length) * 100));

          // Add delay between uploads to avoid rate limits
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error("Error uploading chunk:", error);
          alert(`Upload failed for group ${i + 1}: ${error.message}`);
          setUploading(false);
          return;
        }
      }

      alert(`Successfully uploaded ${jsonData.length} companies in ${chunks.length} groups!`);
      setUploading(false);
      setFile(null);
      onClose();
    };
    reader.readAsArrayBuffer(file);
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
                Uploading group {currentGroup} of {totalGroups} ({progress}%)
              </p>
            </div>
          )}

          <div className="text-sm text-gray-600 mb-4">
            <p><strong>Expected columns:</strong></p>
            <ul className="list-disc list-inside">
              <li>Company Name</li>
              <li>Contact Person</li>
              <li>Designation</li>
              <li>Contact Details</li>
              <li>email ID</li>
              <li>LinkedIn Profile</li>
            </ul>
            <p className="mt-2 text-xs text-red-600 font-medium">
              ⚠️ Each group of ~2000 companies creates:<br/>
              - 1 write for the group document<br/>
              - 2000 writes for index entries<br/>
              = ~2001 writes per group<br/><br/>
              For 58,000 companies: ~29 groups × 2001 = ~58,029 writes<br/><br/>
              Free tier: 20,000 writes/day. System will warn if exceeded.<br/>
              Consider upgrading to Blaze plan for large uploads.<br/><br/>
              💡 Modify chunkSize in code to change group size.
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