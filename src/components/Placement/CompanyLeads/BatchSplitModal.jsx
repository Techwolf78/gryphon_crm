import React, { useState, useCallback, useEffect } from "react";
import { collection, query, orderBy, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

const BatchSplitModal = ({
  showBatchSplitModal,
  setShowBatchSplitModal,
  fetchLeads,
  showToast,
  user
}) => {
  const [batches, setBatches] = useState([]);
  const [showSplitConfirmation, setShowSplitConfirmation] = useState(false);
  const [selectedBatchForSplit, setSelectedBatchForSplit] = useState(null);

  // Fetch batches for split modal
  const fetchBatches = useCallback(async () => {
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
      // Sort batches by batch number
      const sortedBatchList = batchList.sort((a, b) => {
        const aMatch = a.id.match(/batch_(\d+)/);
        const bMatch = b.id.match(/batch_(\d+)/);
        const aNum = aMatch ? parseInt(aMatch[1]) : 0;
        const bNum = bMatch ? parseInt(bMatch[1]) : 0;
        return aNum - bNum;
      });
      setBatches(sortedBatchList);
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  }, []);

  // Split batch function
  const splitBatch = useCallback(async (batchId) => {
    try {
      // Find the max batch number
      const batchNumbers = batches.map(b => {
        const match = b.id.match(/batch_(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
      const maxBatch = batchNumbers.length > 0 ? Math.max(...batchNumbers) : 0;
      const newBatchId = `batch_${maxBatch + 1}`;

      // Fetch the batch
      const batchDocRef = doc(db, "companyleads", batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (!batchDocSnap.exists()) {
        throw new Error('Batch not found');
      }

      const batchData = batchDocSnap.data();
      const encodedCompanies = batchData.companies || [];
      const totalCompanies = encodedCompanies.length;
      const mid = Math.floor(totalCompanies / 2);
      const firstHalf = encodedCompanies.slice(0, mid);
      const secondHalf = encodedCompanies.slice(mid);

      // Update old batch with first half
      const updatedBatchData = {
        ...batchData,
        companies: firstHalf,
      };
      await setDoc(batchDocRef, updatedBatchData);

      // Create new batch with second half
      const newBatchData = {
        companies: secondHalf,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "companyleads", newBatchId), newBatchData);

      // Refresh data
      await fetchLeads();
      await fetchBatches();
      showToast(`Batch ${batchId} split into ${batchId} and ${newBatchId}`, 'success');
    } catch (error) {
      console.error("Error splitting batch:", error);
      showToast('Failed to split batch', 'error');
    }
  }, [batches, fetchLeads, fetchBatches, showToast]);

  // Handle batch split initiation
  const initiateSplit = useCallback((batch) => {
    setSelectedBatchForSplit(batch);
    setShowSplitConfirmation(true);
  }, []);

  // Confirm and execute split
  const confirmSplit = useCallback(async () => {
    if (!selectedBatchForSplit) return;

    await splitBatch(selectedBatchForSplit.id);
    setShowSplitConfirmation(false);
    setSelectedBatchForSplit(null);
  }, [selectedBatchForSplit, splitBatch]);

  // Check if user is admin
  const isAdmin = user && (user?.departments?.includes("admin") ||
                           user?.departments?.includes("Admin") ||
                           user?.department === "admin" ||
                           user?.department === "Admin" ||
                           user?.role === "admin" ||
                           user?.role === "Admin");

  // Fetch batches when modal opens
  useEffect(() => {
    if (showBatchSplitModal) {
      fetchBatches();
    }
  }, [showBatchSplitModal, fetchBatches]);

  if (!isAdmin) return null;

  return (
    <>
      {/* Batch Split Modal */}
      {showBatchSplitModal && (
        <div className="fixed inset-0 bg-opacity-25 backdrop-blur-sm flex items-center justify-center z-54">
          <div className="bg-white rounded-2xl shadow-lg p-4 max-w-md w-full mx-4">
            <div className="text-center mb-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Split Batches</h3>
              <p className="text-xs text-gray-500">Select a batch to split into two</p>
            </div>
            <div className="max-h-60 overflow-y-auto mb-4">
              {batches.map(batch => (
                <div key={batch.id} className="flex items-center justify-between p-2 border rounded mb-2">
                  <div>
                    <span className="font-medium">{batch.id}</span>
                    <span className="text-xs text-gray-500 ml-2">({batch.numCompanies} companies, {Math.round(batch.size / 1024)} KB)</span>
                  </div>
                  <button
                    onClick={() => initiateSplit(batch)}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Split
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBatchSplitModal(false)}
                className="flex-1 px-3 py-2 text-gray-600 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 active:scale-95 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Split Confirmation Modal */}
      {showSplitConfirmation && selectedBatchForSplit && (
        <div className="fixed inset-0 bg-opacity-25 backdrop-blur-sm flex items-center justify-center z-55">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-lg w-full mx-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Batch Split</h3>
              <p className="text-sm text-gray-600">Are you sure you want to split this batch? This action cannot be undone.</p>
            </div>

            {/* Current Batch Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Current Batch: {selectedBatchForSplit.id}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Companies:</span>
                  <span className="font-medium ml-2">{selectedBatchForSplit.numCompanies}</span>
                </div>
                <div>
                  <span className="text-gray-600">Size:</span>
                  <span className="font-medium ml-2">{Math.round(selectedBatchForSplit.size / 1024)} KB</span>
                </div>
              </div>
            </div>

            {/* Split Preview */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-3">After Split:</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <span className="font-medium text-gray-900">{selectedBatchForSplit.id}</span>
                    <span className="text-sm text-gray-600 ml-2">(First half)</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600">
                    {Math.floor(selectedBatchForSplit.numCompanies / 2)} companies
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <span className="font-medium text-gray-900">
                      batch_{(() => {
                        const batchNumbers = batches.map(b => {
                          const match = b.id.match(/batch_(\d+)/);
                          return match ? parseInt(match[1]) : 0;
                        });
                        const maxBatch = batchNumbers.length > 0 ? Math.max(...batchNumbers) : 0;
                        return maxBatch + 1;
                      })()}
                    </span>
                    <span className="text-sm text-gray-600 ml-2">(Second half)</span>
                  </div>
                  <span className="text-sm font-medium text-green-600">
                    {Math.ceil(selectedBatchForSplit.numCompanies / 2)} companies
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                The original batch will be updated with the first half of companies, and a new batch will be created with the second half.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSplitConfirmation(false);
                  setSelectedBatchForSplit(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmSplit}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-all duration-200"
              >
                Confirm Split
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BatchSplitModal;