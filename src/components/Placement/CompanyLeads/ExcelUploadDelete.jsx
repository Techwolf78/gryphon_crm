import React, { useState, useEffect } from "react";
import * as XLSX from 'xlsx';
import { db } from '../../../firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

function ExcelUploadDelete() {
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [users, setUsers] = useState({});
  const [selectedUser, setSelectedUser] = useState('all');
  const [deleting, setDeleting] = useState(false);
  const [deleteResults, setDeleteResults] = useState(null);

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = {};
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          const userId = userData.uid || doc.id;
          usersData[userId] = {
            id: userId,
            name: userData.name || userData.displayName || userData.email || 'Unknown User'
          };
        });
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to fetch users');
      }
    };
    fetchUsers();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResults([]);
    setError('');
  };

  const handleScan = async () => {
    if (!file) return;

    setScanning(true);
    setError('');

    try {
      // 1. Parse Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Extract company names
      const excelCompanies = jsonData.map(row => ({
        name: row['CompanyName'] || row['Company Name'] || row['companyName'] || row['company_name'] || '',
        originalRow: row
      })).filter(company => company.name.trim() !== '');

      if (excelCompanies.length === 0) {
        throw new Error('No valid company names found in Excel file');
      }

      console.log(`Found ${excelCompanies.length} companies in Excel`);

      // 2. Users are already fetched in useEffect, use the state

      // 3. Fetch all company batches
      const batchesSnapshot = await getDocs(collection(db, 'companyleads'));
      const dbCompanies = [];

      batchesSnapshot.forEach(doc => {
        const batchData = doc.data();
        if (batchData.companies && Array.isArray(batchData.companies)) {
          batchData.companies.forEach(encodedCompany => {
            try {
              // Decode Base64
              const decodedJson = decodeURIComponent(atob(encodedCompany));
              const company = JSON.parse(decodedJson);
              dbCompanies.push(company);
            } catch (decodeError) {
              console.error('Error decoding company:', decodeError);
            }
          });
        }
      });

      console.log(`Found ${dbCompanies.length} companies in database`);

      // 4. Match Excel companies with database
      const scanResults = excelCompanies.map(excelCompany => {
        const dbMatch = dbCompanies.find(dbCompany =>
          dbCompany.name.toLowerCase().trim() === excelCompany.name.toLowerCase().trim()
        );

        if (dbMatch) {
          const assignee = dbMatch.assignedTo ? users[dbMatch.assignedTo] : null;
          return {
            companyName: excelCompany.name,
            status: 'Found in Database',
            assignedTo: assignee ? assignee.name : 'Not Assigned',
            assignedToId: dbMatch.assignedTo || null,
            dbCompany: dbMatch
          };
        } else {
          return {
            companyName: excelCompany.name,
            status: 'Not Found in Database',
            assignedTo: 'N/A',
            assignedToId: null,
            dbCompany: null
          };
        }
      });

      setResults(scanResults);

    } catch (err) {
      console.error('Scan error:', err);
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleDelete = async () => {
    if (!results.length) return;

    const confirmMessage = selectedUser === 'all'
      ? `Are you sure you want to PERMANENTLY DELETE ALL ${results.filter(r => r.status === 'Found in Database').length} companies from the database? This will completely remove these companies and cannot be undone.`
      : `Are you sure you want to PERMANENTLY DELETE ${results.filter(r => r.status === 'Found in Database' && r.assignedToId === selectedUser).length} companies assigned to ${users[selectedUser]?.name} from the database? This will completely remove these companies and cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    setDeleting(true);
    setDeleteResults(null);

    try {
      // Get all batches again to find and update them
      const batchesSnapshot = await getDocs(collection(db, 'companyleads'));
      const batchUpdates = [];
      let totalDeleted = 0;

      // Process each batch
      for (const batchDoc of batchesSnapshot.docs) {
        const batchData = batchDoc.data();
        if (!batchData.companies || !Array.isArray(batchData.companies)) continue;

        const updatedCompanies = [];
        let batchChanged = false;

        // Process each company in the batch
        for (const encodedCompany of batchData.companies) {
          try {
            const decodedJson = decodeURIComponent(atob(encodedCompany));
            const company = JSON.parse(decodedJson);

            // Check if this company should be deleted
            const excelMatch = results.find(r =>
              r.status === 'Found in Database' &&
              r.companyName.toLowerCase().trim() === company.name.toLowerCase().trim()
            );

            const shouldDelete = excelMatch && (
              selectedUser === 'all' ||
              (selectedUser !== 'all' && company.assignedTo === selectedUser)
            );

            if (shouldDelete) {
              batchChanged = true;
              totalDeleted++;
            } else {
              updatedCompanies.push(encodedCompany);
            }
          } catch {
            // If we can't decode, keep the company
            updatedCompanies.push(encodedCompany);
          }
        }

        if (batchChanged) {
          if (updatedCompanies.length > 0) {
            // Update batch with remaining companies
            batchUpdates.push({
              batchId: batchDoc.id,
              data: { companies: updatedCompanies },
              type: 'update'
            });
          } else {
            // Delete entire batch if no companies left
            batchUpdates.push({
              batchId: batchDoc.id,
              type: 'delete'
            });
          }
        }
      }

      // Execute batch operations
      const batch = writeBatch(db);
      for (const update of batchUpdates) {
        if (update.type === 'update') {
          batch.set(doc(db, 'companyleads', update.batchId), update.data);
        } else if (update.type === 'delete') {
          batch.delete(doc(db, 'companyleads', update.batchId));
        }
      }

      await batch.commit();

      setDeleteResults({
        success: true,
        totalDeleted,
        batchesUpdated: batchUpdates.filter(u => u.type === 'update').length,
        batchesDeleted: batchUpdates.filter(u => u.type === 'delete').length
      });

      // Refresh results to show updated status
      setResults(prev => prev.map(r =>
        r.status === 'Found in Database' && (
          selectedUser === 'all' ||
          (selectedUser !== 'all' && r.assignedToId === selectedUser)
        ) ? { ...r, status: 'Deleted from Database' } : r
      ));

    } catch (err) {
      console.error('Delete error:', err);
      setDeleteResults({
        success: false,
        error: err.message
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Excel Scanner & Company Deleter</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Excel File to Scan
        </label>
        <input
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <button
        onClick={handleScan}
        disabled={!file || scanning}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {scanning ? 'Scanning...' : 'Scan Excel File'}
      </button>

      {results.length > 0 && (
        <>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select User to Delete Companies For:
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All Users (Delete All Found Companies)</option>
              {(() => {
                // Get unique assigned users from scan results
                const assignedUsers = [...new Set(
                  results
                    .filter(r => r.status === 'Found in Database' && r.assignedTo !== 'Not Assigned' && r.assignedTo !== 'N/A')
                    .map(r => r.assignedToId)
                    .filter(id => id) // Remove null/undefined
                )];

                return assignedUsers.map(userId => {
                  const user = users[userId];
                  return user ? (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.id})
                    </option>
                  ) : null;
                }).filter(Boolean);
              })()}
            </select>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : `Delete ${selectedUser === 'all' ? 'All' : 'Selected'} Companies`}
            </button>
          </div>

          {deleteResults && (
            <div className={`mt-4 p-3 rounded-lg ${deleteResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {deleteResults.success ? (
                <div>
                  <p className="text-green-700 font-medium">✅ Companies permanently deleted from database!</p>
                  <p className="text-green-600 text-sm mt-1">
                    • {deleteResults.totalDeleted} companies completely removed<br/>
                    • {deleteResults.batchesUpdated} batches updated<br/>
                    • {deleteResults.batchesDeleted} batches completely removed
                  </p>
                </div>
              ) : (
                <p className="text-red-700">❌ Deletion failed: {deleteResults.error}</p>
              )}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Scan Results ({results.length} companies)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 border-b text-left">Company Name</th>
                  <th className="px-4 py-2 border-b text-left">Status</th>
                  <th className="px-4 py-2 border-b text-left">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 border-b">{result.companyName}</td>
                    <td className="px-4 py-2 border-b">
                      <span className={`px-2 py-1 rounded text-xs ${
                        result.status === 'Found in Database'
                          ? 'bg-green-100 text-green-800'
                          : result.status === 'Deleted from Database'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 border-b">{result.assignedTo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExcelUploadDelete;
