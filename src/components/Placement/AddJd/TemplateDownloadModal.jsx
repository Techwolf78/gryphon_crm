import React, { useState } from 'react';
import { XIcon, DownloadIcon } from '@heroicons/react/outline';

const TemplateDownloadModal = ({ show, onClose, college, formData, selectedFields, onFieldsChange }) => {
  const [selectedColumns, setSelectedColumns] = useState([
    'studentName', 'enrollmentNo', 'email', 'phone', 'course', 'specialization', 
    'currentYear', 'tenthMarks', 'twelfthMarks', 'diplomaMarks', 'cgpa', 'activeBacklogs', 
    'totalBacklogs', 'gender', 'resumeLink'
  ]);

  const allColumns = [
    { key: 'studentName', label: 'Student Name', required: true },
    { key: 'enrollmentNo', label: 'Enrollment No', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Phone', required: true },
    { key: 'course', label: 'Course', required: true },
    { key: 'specialization', label: 'Specialization', required: true },
    { key: 'currentYear', label: 'Current Year', required: true },
    { key: 'tenthMarks', label: '10th Marks (%)', required: true },
    { key: 'twelfthMarks', label: '12th Marks (%)', required: false },
    { key: 'diplomaMarks', label: 'Diploma Marks (%)', required: false },
    { key: 'cgpa', label: 'CGPA', required: true },
    { key: 'activeBacklogs', label: 'Active Backlogs', required: true },
    { key: 'totalBacklogs', label: 'Total Backlogs', required: true },
    { key: 'gender', label: 'Gender', required: true },
    { key: 'resumeLink', label: 'Resume Link', required: false },
    { key: 'address', label: 'Address', required: false },
    { key: 'city', label: 'City', required: false },
    { key: 'state', label: 'State', required: false }
  ];

  const handleColumnToggle = (columnKey) => {
    const column = allColumns.find(col => col.key === columnKey);
    if (column?.required) return; // Required columns can't be deselected
    
    setSelectedColumns(prev => 
      prev.includes(columnKey)
        ? prev.filter(col => col !== columnKey)
        : [...prev, columnKey]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(allColumns.map(col => col.key));
  };

  const selectMinimumColumns = () => {
    setSelectedColumns(allColumns.filter(col => col.required).map(col => col.key));
  };

  const downloadTemplate = () => {
    // Create Excel file with selected columns
    const selectedColumnData = allColumns.filter(col => selectedColumns.includes(col.key));
    
    // Generate Excel file dynamically
    const worksheetData = [
      selectedColumnData.map(col => col.label), // Headers
      // Add sample data row
      selectedColumnData.map(col => {
        if (col.required) return 'REQUIRED_DATA';
        return 'OPTIONAL_DATA';
      })
    ];

    // Convert to Excel and download
    const csvContent = worksheetData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${formData.companyName}_${college}_Student_Template.csv`;
    link.click();
    
    // Update parent component
    onFieldsChange(selectedColumns);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">
            Download Excel Template - {college}
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="mb-4">
            <p className="text-gray-600 mb-3">
              Select columns to include in your Excel template:
            </p>
            
            {/* Quick Selection Buttons */}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={selectAllColumns}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Select All
              </button>
              <button
                onClick={selectMinimumColumns}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Minimum Required
              </button>
            </div>

            {/* Columns Selection */}
            <div className="grid grid-cols-2 gap-2">
              {allColumns.map(column => (
                <label key={column.key} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.key)}
                    onChange={() => handleColumnToggle(column.key)}
                    disabled={column.required}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${column.required ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                    {column.label}
                    {column.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-700 text-sm">
              <strong>Note:</strong> Required columns (*) cannot be removed. 
              The template will be generated with your selected columns.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={downloadTemplate}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center"
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Download Template ({selectedColumns.length} columns)
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateDownloadModal;