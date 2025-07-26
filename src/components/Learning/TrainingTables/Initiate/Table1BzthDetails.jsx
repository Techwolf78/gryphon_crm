// components/InitiationModal/Table1BatchDetails.jsx
import React from 'react';

const Table1BatchDetails = ({ table1Data, onChange }) => {
  return (
    <div className="mb-6 p-4 border rounded">
      <h3 className="font-medium mb-3">Batch Details</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Batch</th>
              <th className="border px-4 py-2">Std Count</th>
              <th className="border px-4 py-2">Hrs</th>
              <th className="border px-4 py-2">Batch per Std Count</th>
              <th className="border px-4 py-2">Batch Code</th>
              <th className="border px-4 py-2">Assigned Hours</th>
            </tr>
          </thead>
          <tbody>
            {table1Data.map((row, index) => (
              <tr key={index}>
                {['batch', 'stdCount'].map((field) => (
                  <td key={field} className="border px-4 py-2">
                    <input
                      type="text"
                      className="w-full px-2 py-1 bg-gray-100"
                      value={row[field]}
                      readOnly
                    />
                  </td>
                ))}
                {['hrs', 'batchPerStdCount', 'batchCode', 'assignedHours'].map((field) => (
                  <td key={field} className="border px-4 py-2">
                    <input
                      type={field === 'batchCode' ? 'text' : 'number'}
                      className="w-full px-2 py-1"
                      value={row[field]}
                      onChange={(e) => onChange(index, field, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table1BatchDetails;
