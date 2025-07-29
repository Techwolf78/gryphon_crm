import React, { useState } from 'react';

const BatchDetailsTable = ({ table1Data, setTable1Data, selectedDomain, topics, courses = [] }) => {
  const [mergeModal, setMergeModal] = useState({
    open: false,
    sourceRowIndex: null,
    targetSpecialization: ''
  });

  const getDomainHours = (domain) => {
    if (!domain || !topics) return 0;
    const domainTopic = topics.find(t => t.topic === `Domain ${domain}`);
    return domainTopic?.hours || 0;
  };

  const handleAssignedHoursChange = (rowIndex, value) => {
  const updated = [...table1Data];
  updated[rowIndex].assignedHours = Number(value);
  setTable1Data(updated);
};


  const generateBatchCode = (specialization, index) => {
    return `${specialization}${index}`;
  };

  const addBatch = (rowIndex) => {
    const updatedData = [...table1Data];
    const newBatchIndex = updatedData[rowIndex].batches.length + 1;

    updatedData[rowIndex].batches.push({
      batchPerStdCount: '',
      batchCode: generateBatchCode(updatedData[rowIndex].batch, newBatchIndex)
    });

    setTable1Data(updatedData);
  };

  const removeBatch = (rowIndex, batchIndex) => {
    if (table1Data[rowIndex].batches.length <= 1) return;

    const updatedData = [...table1Data];
    updatedData[rowIndex].batches.splice(batchIndex, 1);

    updatedData[rowIndex].batches = updatedData[rowIndex].batches.map((batch, idx) => ({
      ...batch,
      batchCode: generateBatchCode(updatedData[rowIndex].batch, idx + 1)
    }));

    setTable1Data(updatedData);
  };

  const handleMergeBatch = (sourceRowIndex, targetSpecialization) => {
    const updatedData = [...table1Data];
    const sourceRow = updatedData[sourceRowIndex];
    const targetRowIndex = updatedData.findIndex(row => row.batch === targetSpecialization);

    if (targetRowIndex === -1) return;

    const targetRow = updatedData[targetRowIndex];

    const combinedStudents = sourceRow.stdCount + targetRow.stdCount;
    const combinedHours = sourceRow.hrs + targetRow.hrs;

    const newBatchIndex = targetRow.batches.length + 1;
    const mergedBatchCode = `${sourceRow.batch}-${targetRow.batch}-${newBatchIndex}`;

    const mergedRow = {
      ...targetRow,
      batch: `${sourceRow.batch}+${targetRow.batch}`,
      stdCount: combinedStudents,
      hrs: combinedHours,
      assignedHours: null,
      batches: [
        ...targetRow.batches,
        {
          batchPerStdCount: combinedStudents,
          batchCode: mergedBatchCode,
          isMerged: true,
          mergedFrom: `${sourceRow.batch}+${targetRow.batch}`,
          originalData: {
            source: sourceRow,
            target: targetRow
          }
        }
      ]
    };

    updatedData[targetRowIndex] = mergedRow;
    updatedData.splice(sourceRowIndex, 1);

    setTable1Data(updatedData);
    setMergeModal({ open: false, sourceRowIndex: null, targetSpecialization: '' });
  };

  const handleBatchChange = (rowIndex, batchIndex, field, value) => {
    const updatedData = [...table1Data];
    const currentRow = updatedData[rowIndex];

    if (field === 'batchPerStdCount') {
      const inputValue = Number(value);
      const otherBatchTotal = currentRow.batches.reduce((acc, batch, idx) => {
        return idx === batchIndex ? acc : acc + Number(batch.batchPerStdCount || 0);
      }, 0);

      const maxAllowed = currentRow.stdCount - otherBatchTotal;
      const finalValue = inputValue > maxAllowed ? maxAllowed : inputValue;

      currentRow.batches[batchIndex][field] = finalValue;
    } else {
      currentRow.batches[batchIndex][field] = value;
    }

    setTable1Data(updatedData);
  };

  const calculateRemainingHours = (row) => {
    return row.hrs - (row.assignedHours || 0);
  };

  const getTotalAssignedStudents = (row) => {
    return row.batches?.reduce((total, batch) => total + Number(batch.batchPerStdCount || 0), 0) || 0;
  };

  const isStudentAllocationComplete = (row) => {
    return getTotalAssignedStudents(row) === row.stdCount;
  };

  const getAvailableSpecializations = (currentRowIndex) => {
    return table1Data
      .filter((_, idx) => idx !== currentRowIndex)
      .map(row => row.batch);
  };

  return (
    <div className="space-y-4">
      {mergeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Merge with another specialization</h3>
            <select
              className="w-full p-2 border rounded mb-4"
              value={mergeModal.targetSpecialization}
              onChange={(e) => setMergeModal(prev => ({
                ...prev,
                targetSpecialization: e.target.value
              }))}
            >
              <option value="">Select specialization to merge with</option>
              {getAvailableSpecializations(mergeModal.sourceRowIndex).map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 border rounded"
                onClick={() => setMergeModal({ open: false, sourceRowIndex: null, targetSpecialization: '' })}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300"
                disabled={!mergeModal.targetSpecialization}
                onClick={() => handleMergeBatch(mergeModal.sourceRowIndex, mergeModal.targetSpecialization)}
              >
                Merge
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
          <h3 className="text-lg font-semibold text-gray-900">Batch Configuration</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure batches and assign hours for {selectedDomain} domain
          </p>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Students</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students per Batch</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table1Data.map((row, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    {row.batches?.map((batch, batchIndex) => (
                      <tr
                        key={`${rowIndex}-${batchIndex}`}
                        className={`hover:bg-gray-50 transition-colors ${batchIndex === 0 && !isStudentAllocationComplete(row)
                            ? 'bg-yellow-50'
                            : batch.isMerged
                              ? 'bg-blue-50'
                              : ''
                          }`}
                      >
                        {batchIndex === 0 && (
                          <>
                            <td className="px-4 py-4 align-top" rowSpan={row.batches.length}>
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-blue-600 font-medium text-sm">
                                      {row.batch.charAt(0)}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {row.batch}
                                    {batch.isMerged && (
                                      <span className="text-xs text-blue-600 ml-2">(merged with {batch.mergedFrom})</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top" rowSpan={row.batches.length}>
                              <div className="text-sm text-gray-900">{row.stdCount}</div>
                              <div className="text-xs text-gray-500">
                                Assigned: {getTotalAssignedStudents(row)} / {row.stdCount}
                              </div>
                              {!isStudentAllocationComplete(row) && (
                                <div className="text-xs text-yellow-600 mt-1">
                                  ⚠️ Incomplete allocation
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 align-top" rowSpan={row.batches.length}>
                              <div className="text-sm font-medium text-gray-900">
                                {row.hrs || 0} hrs
                              </div>
                            </td>
                          </>
                        )}
                        <td className="px-4 py-4">
                          <div className="relative">
                            <input
                              type="number"
                              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${Number(batch.batchPerStdCount) > (row.stdCount - getTotalAssignedStudents(row) + Number(batch.batchPerStdCount))
                                  ? 'border-red-300 bg-red-50'
                                  : 'border-gray-300'
                                }`}
                              value={batch.batchPerStdCount}
                              onChange={(e) => handleBatchChange(rowIndex, batchIndex, 'batchPerStdCount', e.target.value)}
                              placeholder="Enter count"
                              min="0"
                              max={row.stdCount - getTotalAssignedStudents(row) + Number(batch.batchPerStdCount)}
                              disabled={batch.isMerged}
                            />
                            {Number(batch.batchPerStdCount) > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Max: {row.stdCount - getTotalAssignedStudents(row) + Number(batch.batchPerStdCount)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            value={batch.batchCode}
                            onChange={(e) => handleBatchChange(rowIndex, batchIndex, 'batchCode', e.target.value)}
                            placeholder="Batch code"
                            disabled={batch.isMerged}
                          />
                        </td>
                        {batchIndex === 0 && (
                          <>
                            <td className="px-4 py-4 align-top" rowSpan={row.batches.length}>
                              <div className="relative">
                                <input
                                  type="number"
                                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${Number(row.assignedHours) > row.hrs
                                      ? 'border-red-300 bg-red-50'
                                      : 'border-gray-300'
                                    }`}
value={row.assignedHours ?? ''}
                                  onChange={(e) => handleAssignedHoursChange(rowIndex, e.target.value)}
                                  placeholder="Enter hours"
                                  min="0"
                                  max={row.hrs}
                                />
                                <div className="text-xs text-gray-500 mt-1">
                                  Max: {row.hrs} hrs
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top" rowSpan={row.batches.length}>
                              <div className={`text-sm font-medium ${calculateRemainingHours(row) < 0
                                  ? 'text-red-600'
                                  : calculateRemainingHours(row) === 0
                                    ? 'text-green-600'
                                    : 'text-gray-900'
                                }`}>
                                {calculateRemainingHours(row)} hrs
                              </div>
                              {calculateRemainingHours(row) < 0 && (
                                <div className="text-xs text-red-500 mt-1">
                                  ⚠️ Over-allocated
                                </div>
                              )}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            {batchIndex === row.batches.length - 1 && (
                              <>
                                {selectedDomain !== 'Technical' ? (
                                  <button
                                    type="button"
                                    onClick={() => setMergeModal({
                                      open: true,
                                      sourceRowIndex: rowIndex,
                                      targetSpecialization: ''
                                    })}
                                    className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                    title="Merge Batch"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                  </button>
                                ) : (
                                  // Show Add Batch button
                                  <button
                                    type="button"
                                    onClick={() => addBatch(rowIndex)}
                                    className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    title="Add Batch"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                  </button>
                                )}

                              </>
                            )}
                            {row.batches.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeBatch(rowIndex, batchIndex)}
                                className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                title="Remove Batch"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {table1Data.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No batch data</h3>
              <p className="mt-1 text-sm text-gray-500">
                Please select a domain and ensure courses are available.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchDetailsTable;