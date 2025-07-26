import React, { useEffect } from 'react';

const BatchDetailsTable = ({ table1Data, setTable1Data, selectedDomain, topics, courses = [] }) => {
  // Effect to update hours when domain changes
  useEffect(() => {
    if (selectedDomain && courses.length > 0) {
      const domainTopic = topics.find(t => t.topic === `Domain ${selectedDomain}`);
      const domainHours = domainTopic?.hours || 0;

      const rows = courses.map(course => {
        return {
          batch: course.specialization,
          stdCount: course.students,
          hrs: domainHours,
          batchPerStdCount: '',
          batchCode: generateBatchCode(course.specialization, 1),
          assignedHours: '',
          batches: [
            {
              batchPerStdCount: '',
              batchCode: generateBatchCode(course.specialization, 1)
            }
          ]
        };
      });

      setTable1Data(rows);
    }
  }, [selectedDomain, courses, topics]);

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
    updatedData[rowIndex].batches[batchIndex][field] = value;
    setTable1Data(updatedData);
  };

  // Handle assigned hours change
  const handleAssignedHoursChange = (rowIndex, value) => {
    const updatedData = [...table1Data];
    updatedData[rowIndex].assignedHours = Number(value);
    setTable1Data(updatedData);
  };

  // Calculate remaining hours
  const calculateRemainingHours = (row) => {
    return row.hrs - (row.assignedHours || 0);
  };

  return (
    <div className="mb-6 p-4 border rounded">
      <h3 className="font-medium mb-3 text-lg">Batch Details</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Batch</th>
              <th className="border px-4 py-2 text-left">Students</th>
              <th className="border px-4 py-2 text-left">Hours</th>
              <th className="border px-4 py-2 text-left">Batch/Student</th>
              <th className="border px-4 py-2 text-left">Batch Code</th>
              <th className="border px-4 py-2 text-left">Assigned Hours</th>
              <th className="border px-4 py-2 text-left">Remaining Hours</th>
              <th className="border px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {table1Data.map((row, rowIndex) => (
              <React.Fragment key={rowIndex}>
                {row.batches?.map((batch, batchIndex) => (
                  <tr key={`${rowIndex}-${batchIndex}`} className="hover:bg-gray-50">
                    {batchIndex === 0 && (
                      <>
                        <td className="border px-4 py-2 align-top" rowSpan={row.batches.length}>
                          <div className="font-medium">{row.batch}</div>
                        </td>
                        <td className="border px-4 py-2 align-top" rowSpan={row.batches.length}>
                          {row.stdCount}
                        </td>
                        <td className="border px-4 py-2 align-top" rowSpan={row.batches.length}>
                          {row.hrs || 0}
                        </td>
                      </>
                    )}
                    <td className="border px-4 py-2">
                      <input
                        type="number"
                        className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={batch.batchPerStdCount}
                        onChange={(e) => handleBatchChange(rowIndex, batchIndex, 'batchPerStdCount', e.target.value)}
                        placeholder="Enter count"
                      />
                    </td>
                    <td className="border px-4 py-2">
                      <input
                        type="text"
                        className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={batch.batchCode}
                        onChange={(e) => handleBatchChange(rowIndex, batchIndex, 'batchCode', e.target.value)}
                      />
                    </td>
                    {batchIndex === 0 && (
                      <>
                        <td className="border px-4 py-2 align-top" rowSpan={row.batches.length}>
                          <input
                            type="number"
                            className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={row.assignedHours || ''}
                            onChange={(e) => handleAssignedHoursChange(rowIndex, e.target.value)}
                            placeholder="Enter hours"
                          />
                        </td>
                        <td className="border px-4 py-2 align-top" rowSpan={row.batches.length}>
                          <div className={`px-2 py-1 ${calculateRemainingHours(row) < 0 ? 'text-red-500' : ''}`}>
                            {calculateRemainingHours(row)}
                          </div>
                        </td>
                      </>
                    )}
                    <td className="border px-4 py-2">
                      <div className="flex space-x-1">
                        {batchIndex === row.batches.length - 1 && (
                          <button
                            type="button"
                            onClick={() => addBatch(rowIndex)}
                            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
                            title="Add Batch"
                          >
                            +
                          </button>
                        )}
                        {row.batches.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBatch(rowIndex, batchIndex)}
                            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none"
                            title="Remove Batch"
                          >
                            -
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
    </div>
  );
};

export default BatchDetailsTable;