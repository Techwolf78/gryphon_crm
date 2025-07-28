import React, { useEffect } from 'react';

const BatchDetailsTable = ({ table1Data, setTable1Data, selectedDomain, topics, courses = [] }) => {
  // Handle assigned hours change with max hours limit
  const handleAssignedHoursChange = (rowIndex, value) => {
    const updatedData = [...table1Data];
    const max = updatedData[rowIndex].hrs;
    const inputValue = Number(value);

    updatedData[rowIndex].assignedHours = inputValue > max ? max : inputValue;
    setTable1Data(updatedData);
  };

  // Generate batch codes like CS1, CS2, etc.
  const generateBatchCode = (specialization, index) => {
    return `${specialization}${index}`;
  };

  // Add a new batch to a row
  const addBatch = (rowIndex) => {
    const updatedData = [...table1Data];
    const newBatchIndex = updatedData[rowIndex].batches.length + 1;

    updatedData[rowIndex].batches.push({
      batchPerStdCount: '',
      batchCode: generateBatchCode(updatedData[rowIndex].batch, newBatchIndex)
    });

    setTable1Data(updatedData);
  };

  // Remove a batch from a row
  const removeBatch = (rowIndex, batchIndex) => {
    if (table1Data[rowIndex].batches.length <= 1) return;

    const updatedData = [...table1Data];
    updatedData[rowIndex].batches.splice(batchIndex, 1);

    // Re-generate batch codes to maintain sequence
    updatedData[rowIndex].batches = updatedData[rowIndex].batches.map((batch, idx) => ({
      ...batch,
      batchCode: generateBatchCode(updatedData[rowIndex].batch, idx + 1)
    }));

    setTable1Data(updatedData);
  };

  // Handle changes in batch inputs
  const handleBatchChange = (rowIndex, batchIndex, field, value) => {
    const updatedData = [...table1Data];
    const currentRow = updatedData[rowIndex];

    if (field === 'batchPerStdCount') {
      const inputValue = Number(value);
      const otherBatchTotal = currentRow.batches.reduce((acc, batch, idx) => {
        return idx === batchIndex ? acc : acc + Number(batch.batchPerStdCount || 0);
      }, 0);

      const maxAllowed = currentRow.stdCount - otherBatchTotal;

      // Cap input if it exceeds
      const finalValue = inputValue > maxAllowed ? maxAllowed : inputValue;

      currentRow.batches[batchIndex][field] = finalValue;
    } else {
      currentRow.batches[batchIndex][field] = value;
    }

    setTable1Data(updatedData);
  };

  // Calculate remaining hours
  const calculateRemainingHours = (row) => {
    return row.hrs - (row.assignedHours || 0);
  };

  // Calculate total students assigned across all batches for a row
  const getTotalAssignedStudents = (row) => {
    return row.batches?.reduce((total, batch) => total + Number(batch.batchPerStdCount || 0), 0) || 0;
  };

  // Check if all students are assigned
  const isStudentAllocationComplete = (row) => {
    return getTotalAssignedStudents(row) === row.stdCount;
  };

  return (
    <div className="space-y-4">
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specialization
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Students
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students per Batch
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table1Data.map((row, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    {row.batches?.map((batch, batchIndex) => (
                      <tr 
                        key={`${rowIndex}-${batchIndex}`} 
                        className={`hover:bg-gray-50 transition-colors ${
                          batchIndex === 0 && !isStudentAllocationComplete(row) 
                            ? 'bg-yellow-50' 
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
                              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                                Number(batch.batchPerStdCount) > (row.stdCount - getTotalAssignedStudents(row) + Number(batch.batchPerStdCount))
                                  ? 'border-red-300 bg-red-50'
                                  : 'border-gray-300'
                              }`}
                              value={batch.batchPerStdCount}
                              onChange={(e) => handleBatchChange(rowIndex, batchIndex, 'batchPerStdCount', e.target.value)}
                              placeholder="Enter count"
                              min="0"
                              max={row.stdCount - getTotalAssignedStudents(row) + Number(batch.batchPerStdCount)}
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
                          />
                        </td>
                        {batchIndex === 0 && (
                          <>
                            <td className="px-4 py-4 align-top" rowSpan={row.batches.length}>
                              <div className="relative">
                                <input
                                  type="number"
                                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                                    Number(row.assignedHours) > row.hrs 
                                      ? 'border-red-300 bg-red-50' 
                                      : 'border-gray-300'
                                  }`}
                                  value={row.assignedHours || ''}
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
                              <div className={`text-sm font-medium ${
                                calculateRemainingHours(row) < 0 
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