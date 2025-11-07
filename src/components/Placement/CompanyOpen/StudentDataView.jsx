import React, { useState, useMemo } from 'react';
import { XIcon, DownloadIcon } from '@heroicons/react/outline';
import * as XLSX from 'xlsx';

const StudentDataView = ({ students, onClose, companyName, collegeName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fixed column mapping - Only Excel columns we want to show
  const columnMapping = [
    { displayName: 'SR NO', fieldName: 'srNo', isSrNo: true },
    { displayName: 'STUDENT NAME', fieldName: 'studentName' },
    { displayName: 'ENROLLMENT NUMBER', fieldName: 'enrollmentNo' },
    { displayName: 'EMAIL', fieldName: 'email' },
    { displayName: 'PHONE NUMBER', fieldName: 'phone' },
    { displayName: 'COURSE', fieldName: 'course' },
    { displayName: 'SPECIALIZATION', fieldName: 'specialization' },
    { displayName: 'CURRENT YEAR', fieldName: 'currentYear' },
    { displayName: '10TH MARKS %', fieldName: 'tenthMarks' },
    { displayName: '12TH MARKS %', fieldName: 'twelfthMarks' },
    { displayName: 'CGPA', fieldName: 'cgpa' },
    { displayName: 'ACTIVE BACKLOGS', fieldName: 'activeBacklogs' },
    { displayName: 'GENDER', fieldName: 'gender' },
    { displayName: 'STATUS', fieldName: 'status' },
    { displayName: 'COLLEGE', fieldName: 'college' },
    { displayName: 'UPLOAD DATE', fieldName: 'uploadDate' }
  ];

  // Get only columns that have data in students
  const displayColumns = useMemo(() => {
    return columnMapping.filter(col => {
      if (col.isSrNo) return true; // Always show SR NO
      
      // Check if any student has this field with data
      return students.some(student => 
        student[col.fieldName] !== null && 
        student[col.fieldName] !== undefined && 
        student[col.fieldName] !== ''
      );
    });
  }, [students]);

  // Filter students
  const filteredStudents = useMemo(() => {
    let filtered = students.filter(student => {
      const matchesSearch = Object.values(student).some(value => 
        String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    return filtered;
  }, [students, searchTerm, statusFilter]);

  // Export to Excel function
  const exportToExcel = () => {
    if (filteredStudents.length === 0) return;
    
    const worksheet = XLSX.utils.json_to_sheet(filteredStudents.map((student, index) => {
      const row = {};
      displayColumns.forEach(col => {
        if (col.isSrNo) {
          row[col.displayName] = index + 1;
        } else {
          row[col.displayName] = student[col.fieldName];
        }
      });
      return row;
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, `${companyName}_${collegeName}_students.xlsx`);
  };

  // Format cell value for display
  const formatCellValue = (value, fieldName) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    
    if (fieldName === 'status') {
      return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          value === 'shortlisted' 
            ? 'bg-green-100 text-green-800'
            : value === 'rejected'
            ? 'bg-red-100 text-red-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {value}
        </span>
      );
    }
    
    if (fieldName === 'uploadDate' && typeof value === 'string') {
      // Format date to readable format
      try {
        const date = new Date(value);
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      } catch {
        return value;
      }
    }
    
    return value;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-60 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-95vw max-h-[95vh] overflow-hidden mx-4">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-4 flex justify-between items-center sticky top-0">
          <div>
            <h2 className="text-xl font-semibold">Student Data</h2>
            <p className="text-green-100 text-sm">
              {companyName && `Company: ${companyName}`} 
              {collegeName && ` | College: ${collegeName}`}
              {` | Students: ${filteredStudents.length}/${students.length} | Columns: ${displayColumns.length}`}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-green-700 transition"
          >
            <XIcon className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 bg-white border-b">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-3">
              <input
                type="text"
                placeholder="Search in all fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Export Button */}
            <div>
              <button
                onClick={exportToExcel}
                disabled={filteredStudents.length === 0}
                className={`w-full px-3 py-2 rounded-md transition flex items-center justify-center ${
                  filteredStudents.length === 0 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Debug Info - Remove this in production */}
          <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-xs text-yellow-700">
              <strong>Debug Info:</strong> {students.length} students loaded | 
              First student fields: {students[0] ? Object.keys(students[0]).join(', ') : 'No data'}
            </p>
          </div>
        </div>

        {/* Students Table - FIXED COLUMN NAMES */}
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          {displayColumns.length > 0 && students.length > 0 ? (
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {displayColumns.map((col, index) => (
                    <th 
                      key={index} 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border bg-gray-100"
                    >
                      {col.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {displayColumns.map((col, colIndex) => (
                      <td 
                        key={colIndex} 
                        className={`px-4 py-3 whitespace-nowrap text-sm border ${
                          col.isSrNo ? 'text-center font-medium bg-gray-50' : ''
                        }`}
                      >
                        {col.isSrNo 
                          ? index + 1
                          : formatCellValue(student[col.fieldName], col.fieldName)
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              {students.length === 0 ? 'No student data available' : 'No students found matching your filters'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {filteredStudents.length} of {students.length} students
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportToExcel}
              disabled={filteredStudents.length === 0}
              className={`px-4 py-2 rounded-md transition flex items-center ${
                filteredStudents.length === 0 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export Excel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDataView;