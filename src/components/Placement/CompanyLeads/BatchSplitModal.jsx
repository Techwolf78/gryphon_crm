import React, { useState, useCallback, useEffect } from "react";
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { logPlacementActivity, AUDIT_ACTIONS } from "../../../utils/placementAuditLogger";

const BatchSplitModal = ({
  showBatchSplitModal,
  setShowBatchSplitModal,
  fetchLeads,
  showToast,
  user
}) => {
  const [batches, setBatches] = useState([]);
  const [allBatchIds, setAllBatchIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [splitting, setSplitting] = useState(false);
  const [viewMode, setViewMode] = useState('large'); // 'large' or 'all'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0, currentBatch: '' });
  const [sortBy, setSortBy] = useState('companies'); // 'companies' or 'size'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  // Fetch batches with more than 400 leads
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "companyleads"), orderBy("__name__", "desc"));
      const querySnapshot = await getDocs(q);
      const batchList = [];
      const allBatchIds = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const companies = data.companies || [];
        const numCompanies = Array.isArray(companies) ? companies.length : Object.keys(companies).length;

        allBatchIds.push(docSnap.id);

        if (viewMode === 'all' || numCompanies > 250) {
          batchList.push({
            id: docSnap.id,
            numCompanies,
            size: JSON.stringify(data).length,
            data
          });
        }
      }

      // Sort batches based on selected criteria
      const sortedBatchList = batchList.sort((a, b) => {
        let aValue, bValue;
        
        if (sortBy === 'size') {
          aValue = a.size;
          bValue = b.size;
        } else {
          aValue = a.numCompanies;
          bValue = b.numCompanies;
        }
        
        if (sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
      setBatches(sortedBatchList);

      // Store all batch IDs for sequential numbering
      setAllBatchIds(allBatchIds);
    } catch (error) {
      console.error("Error fetching batches:", error);
      showToast("Error fetching batch data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, viewMode, sortBy, sortOrder]);

  // Split selected batches
  const splitSelectedBatches = useCallback(async () => {
    if (selectedBatches.length === 0) {
      showToast("Please select at least one batch to split", "warning");
      return;
    }

    setSplitting(true);
    let totalSplit = 0;

    try {
      let currentMaxBatchNumber = Math.max(
        ...allBatchIds
          .map(id => {
            const match = id.match(/batch_(\d+)/);
            return match ? parseInt(match[1]) : 0;
          })
          .filter(num => num > 0),
        0
      );

      for (const batchId of selectedBatches) {
        const batch = batches.find(b => b.id === batchId);
        if (!batch || batch.numCompanies <= 250) continue;

        const encodedCompanies = batch.data.companies || [];
        const totalLeads = batch.numCompanies;

        // Keep first 250 companies in original batch, create new batches for the rest
        const firstBatchCompanies = encodedCompanies.slice(0, 250);
        const remainingCompanies = encodedCompanies.slice(250);
        const numNewBatches = Math.ceil(remainingCompanies.length / 250);

        // Log the split operation
        logPlacementActivity({
          userId: user?.uid,
          userName: user?.displayName || user?.name || "Unknown User",
          action: AUDIT_ACTIONS.BATCH_SPLIT,
          companyId: null,
          companyName: null,
          details: `Split batch ${batchId} with ${totalLeads} leads: kept first 250 in original batch, created ${numNewBatches} new batches for remaining ${remainingCompanies.length} leads`,
          changes: { originalBatchId: batchId, totalLeads, keptInOriginal: 250, numNewBatches },
          sessionId: sessionStorage.getItem('sessionId') || 'unknown'
        });

        // Update original batch with first 400 companies
        const { companies: _, ...batchDataWithoutCompanies } = batch.data;
        const updatedOriginalBatchData = {
          ...batchDataWithoutCompanies,
          companies: firstBatchCompanies,
          splitAt: new Date().toISOString(),
          originalSize: encodedCompanies.length
        };

        await setDoc(doc(db, "companyleads", batchId), updatedOriginalBatchData);
        console.log(`Updated original batch ${batchId} to keep first 400 of ${encodedCompanies.length} companies`);

        // Log the split operation
        logPlacementActivity({
          userId: user?.uid,
          userName: user?.displayName || user?.name || "Unknown User",
          action: AUDIT_ACTIONS.BATCH_SPLIT,
          companyId: null,
          companyName: null,
          details: `Split batch ${batchId} with ${encodedCompanies.length} leads: kept first 250 in original batch, created ${numNewBatches} new batches for remaining ${remainingCompanies.length} leads`,
          changes: { originalBatchId: batchId, totalLeads: encodedCompanies.length, keptInOriginal: 250, numNewBatches },
          sessionId: sessionStorage.getItem('sessionId') || 'unknown'
        });

        // Create new batches for remaining companies
        for (let i = 0; i < numNewBatches; i++) {
          const startIndex = i * 250;
          const endIndex = Math.min((i + 1) * 250, remainingCompanies.length);
          const batchCompanies = remainingCompanies.slice(startIndex, endIndex);

          const newBatchId = `batch_${currentMaxBatchNumber + i + 1}`;
          const newBatchData = {
            ...batchDataWithoutCompanies,
            companies: batchCompanies,
            splitFrom: batchId,
            splitIndex: i,
            createdAt: new Date().toISOString()
          };

          await setDoc(doc(db, "companyleads", newBatchId), newBatchData);
          console.log(`Created new batch ${newBatchId} with ${batchCompanies.length} companies`);
        }

        // Update the current max batch number
        currentMaxBatchNumber += numNewBatches;

        totalSplit++;
      }

      showToast(`Successfully split ${totalSplit} batch(es)`, "success");
      setSelectedBatches([]);
      // Clear cache and refresh data
      localStorage.removeItem('companyLeadsCache');
      await fetchLeads();
      // Refresh the modal's batch list
      await fetchBatches();
    } catch (error) {
      console.error("Error splitting batches:", error);
      showToast("Error splitting batches", "error");
    } finally {
      setSplitting(false);
    }
  }, [selectedBatches, batches, allBatchIds, user, fetchLeads, fetchBatches, showToast]);

  // Delete selected batches
  const deleteSelectedBatches = useCallback(async () => {
    if (selectedBatches.length === 0) {
      showToast("Please select at least one batch to delete", "warning");
      return;
    }

    setDeleting(true);
    setShowDeleteConfirm(false);
    setDeleteProgress({ current: 0, total: selectedBatches.length, currentBatch: '' });

    try {
      let deletedCount = 0;

      for (let i = 0; i < selectedBatches.length; i++) {
        const batchId = selectedBatches[i];
        const batch = batches.find(b => b.id === batchId);
        if (!batch) continue;

        // Update progress
        setDeleteProgress({
          current: i + 1,
          total: selectedBatches.length,
          currentBatch: batchId
        });

        // Log the delete operation
        logPlacementActivity({
          userId: user?.uid,
          userName: user?.displayName || user?.name || "Unknown User",
          action: AUDIT_ACTIONS.BATCH_DELETE,
          companyId: null,
          companyName: null,
          details: `Deleted batch ${batchId} containing ${batch.numCompanies} companies`,
          changes: { deletedBatchId: batchId, companiesCount: batch.numCompanies },
          sessionId: sessionStorage.getItem('sessionId') || 'unknown'
        });

        // Delete the batch
        await deleteDoc(doc(db, "companyleads", batchId));
        deletedCount++;

        // Add delay for smooth progress (1 second per batch)
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log(`Deleted batch ${batchId}`);
      }

      showToast(`Successfully deleted ${deletedCount} batch(es)`, "success");
      setSelectedBatches([]);

      // Clear cache and refresh data
      localStorage.removeItem('companyLeadsCache');
      await fetchLeads();
      // Refresh the modal's batch list
      await fetchBatches();

    } catch (error) {
      console.error("Error deleting batches:", error);
      showToast("Error deleting batches", "error");
    } finally {
      setDeleting(false);
      setDeleteProgress({ current: 0, total: 0, currentBatch: '' });
    }
  }, [selectedBatches, batches, user, fetchLeads, fetchBatches, showToast]);

  const handleSelectBatch = (batchId) => {
    setSelectedBatches(prev =>
      prev.includes(batchId)
        ? prev.filter(id => id !== batchId)
        : [...prev, batchId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBatches.length === batches.length) {
      setSelectedBatches([]);
    } else {
      setSelectedBatches(batches.map(b => b.id));
    }
  };

  // Check if user is admin
  const isAdmin = user && (user?.departments?.includes("admin") ||
                           user?.departments?.includes("Admin") ||
                           user?.department === "admin" ||
                           user?.department === "Admin" ||
                           user?.role === "admin" ||
                           user?.role === "Admin");

  // Fetch batches when modal opens or view mode/sort options change
  useEffect(() => {
    if (showBatchSplitModal && isAdmin) {
      fetchBatches();
    }
  }, [showBatchSplitModal, isAdmin, viewMode, sortBy, sortOrder, fetchBatches]);

  if (!isAdmin) return null;

  return (
    <>
      {/* Batch Split Modal */}
      {showBatchSplitModal && (
        <div className="fixed inset-0 z-54 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-2">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-linear-to-r from-red-600 to-red-700 px-4 py-3 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-semibold text-white">Split Large Batches</h2>
              <button
                onClick={() => setShowBatchSplitModal(false)}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading...</span>
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-6">
                  <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-1 text-sm font-medium text-gray-900">
                    {viewMode === 'large' ? 'No large batches found' : 'No batches found'}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {viewMode === 'large' 
                      ? 'All batches have 400 or fewer leads.'
                      : 'No batches exist in the system.'
                    }
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">
                        {viewMode === 'large' ? 'Batches with more than 250 leads' : 'All Batches'}
                        <span className="text-xs font-normal text-gray-500 ml-1">
                          (sorted by {sortBy === 'size' ? 'size' : 'companies'} {sortOrder === 'desc' ? '↓' : '↑'})
                        </span>
                      </h3>
                      <p className="text-xs text-gray-500">
                        {viewMode === 'large' 
                          ? 'Select batches to split: keep first 250 in original batch, create new batches for remaining companies'
                          : 'View all batches. Only large batches (>250 leads) can be split.'
                        }
                      </p>
                    </div>
                    <button
                      onClick={handleSelectAll}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      {selectedBatches.length === batches.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* View Mode Radio Buttons */}
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="viewMode"
                          value="large"
                          checked={viewMode === 'large'}
                          onChange={(e) => setViewMode(e.target.value)}
                          className="w-3 h-3 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                        />
                        <span className="ml-1 text-xs font-medium text-gray-900">Large Batches (&gt;250)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="viewMode"
                          value="all"
                          checked={viewMode === 'all'}
                          onChange={(e) => setViewMode(e.target.value)}
                          className="w-3 h-3 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                        />
                        <span className="ml-1 text-xs font-medium text-gray-900">All Batches</span>
                      </label>
                    </div>
                  </div>

                  {/* Sorting Controls */}
                  <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-900">Sort by:</span>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="sortBy"
                              value="companies"
                              checked={sortBy === 'companies'}
                              onChange={(e) => setSortBy(e.target.value)}
                              className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-1 text-xs text-gray-900">Companies</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="sortBy"
                              value="size"
                              checked={sortBy === 'size'}
                              onChange={(e) => setSortBy(e.target.value)}
                              className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-1 text-xs text-gray-900">Size (KB)</span>
                          </label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="sortOrder"
                              value="desc"
                              checked={sortOrder === 'desc'}
                              onChange={(e) => setSortOrder(e.target.value)}
                              className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-1 text-xs text-gray-900">↓ Desc</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="sortOrder"
                              value="asc"
                              checked={sortOrder === 'asc'}
                              onChange={(e) => setSortOrder(e.target.value)}
                              className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-1 text-xs text-gray-900">↑ Asc</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {batches.map((batch) => (
                      <div
                        key={batch.id}
                        className={`p-3 border rounded cursor-pointer transition-colors ${
                          selectedBatches.includes(batch.id)
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleSelectBatch(batch.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedBatches.includes(batch.id)}
                              onChange={() => handleSelectBatch(batch.id)}
                              className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                            />
                            <div className="ml-2">
                              <h4 className="text-xs font-medium text-gray-900">Batch ID: {batch.id}</h4>
                              <p className="text-xs text-gray-500">{batch.numCompanies} leads • {Math.round(batch.size / 1024)} KB</p>
                              <p className="text-xs text-gray-400">
                                {batch.numCompanies > 250 
                                  ? `Will keep first 250 in ${batch.id}, create ${Math.ceil((batch.numCompanies - 250) / 250)} new batch${Math.ceil((batch.numCompanies - 250) / 250) !== 1 ? 'es' : ''} for remaining ${batch.numCompanies - 250} companies`
                                  : 'This batch does not need splitting'
                                }
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded ${
                              batch.numCompanies > 400
                                ? 'bg-red-100 text-red-800'
                                : batch.numCompanies > 300
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {batch.numCompanies > 400 ? 'Critical' : batch.numCompanies > 300 ? 'High' : 'Medium'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {batches.length > 0 && (
              <div className="border-t px-4 py-3 flex justify-between items-center shrink-0">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={selectedBatches.length === 0 || deleting}
                  className={`px-3 py-1.5 rounded transition-colors text-xs ${
                    selectedBatches.length === 0 || deleting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Deleting...
                    </>
                  ) : (
                    `Delete ${selectedBatches.length} Batch${selectedBatches.length !== 1 ? 'es' : ''}`
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBatchSplitModal(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    disabled={splitting || deleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={splitSelectedBatches}
                    disabled={selectedBatches.length === 0 || splitting || deleting || selectedBatches.some(id => {
                      const batch = batches.find(b => b.id === id);
                      return !batch || batch.numCompanies <= 250;
                    })}
                    className={`px-3 py-1.5 rounded transition-colors text-xs ${
                      selectedBatches.length === 0 || splitting || deleting || selectedBatches.some(id => {
                        const batch = batches.find(b => b.id === id);
                        return !batch || batch.numCompanies <= 250;
                      })
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {splitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                        Splitting...
                      </>
                    ) : (
                      `Split ${selectedBatches.filter(id => {
                        const batch = batches.find(b => b.id === id);
                        return batch && batch.numCompanies > 250;
                      }).length} Batch${selectedBatches.filter(id => {
                        const batch = batches.find(b => b.id === id);
                        return batch && batch.numCompanies > 250;
                      }).length !== 1 ? 'es' : ''}`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-4 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Confirm Batch Deletion
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Are you sure you want to delete {selectedBatches.length} batch{selectedBatches.length !== 1 ? 'es' : ''}?
              This action cannot be undone.
            </p>
            <div className="text-xs text-gray-500 mb-4">
              <p className="font-medium mb-1">Batches to be deleted:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {selectedBatches.map(id => {
                  const batch = batches.find(b => b.id === id);
                  return batch ? (
                    <li key={id}>
                      {batch.id} ({batch.numCompanies} companies)
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={deleteSelectedBatches}
                disabled={deleting}
                className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1 inline-block"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Progress Popup */}
      {deleting && deleteProgress.total > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg p-4 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Deleting Batches
            </h3>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{deleteProgress.current} / {deleteProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="text-xs text-gray-600 mb-3">
              <p>Currently deleting: <span className="font-medium">{deleteProgress.currentBatch}</span></p>
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            </div>
            <p className="text-center text-xs text-gray-500 mt-1">
              Please wait while batches are being deleted...
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default BatchSplitModal;