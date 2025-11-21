import React, { useState, useMemo } from 'react';
import { XIcon, DownloadIcon, TrashIcon, CheckIcon } from '@heroicons/react/outline';
import * as XLSX from 'xlsx';

const StudentDataView = ({ students, onClose, companyName, collegeName, unmatchedStudents = [], deleteUnmatchedStudent, company, onStudentDeleted, acceptUnmatchedStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, _setStatusFilter] = useState('all');

  // Fixed column mapping with proper field mapping
  const columnMapping = useMemo(() => [
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
    { displayName: 'COLLEGE', fieldName: 'college' },
    { displayName: 'UPLOAD DATE', fieldName: 'uploadedAt' },
    { displayName: 'MATCH STATUS', fieldName: 'isMatched' },
    { displayName: 'ACTIONS', fieldName: 'actions', isActions: true }
  ], []);

  // Normalize student data - map different field names to consistent ones
  const normalizedStudents = useMemo(() => {
    return students.map((student) => {
      // Check if student is unmatched
      const isUnmatched = unmatchedStudents.some(unmatched => 
        unmatched.studentName?.toLowerCase().trim() === student.studentName?.toLowerCase().trim() ||
        unmatched.email?.toLowerCase().trim() === student.email?.toLowerCase().trim()
      );
      
      return {
        // Direct mappings
        studentName: student.studentName || student.name || student['STUDENT NAME'] || 'N/A',
        enrollmentNo: student.enrollmentNo || student.enrollmentNumber || student['ENROLLMENT NUMBER'] || student.enrollment || 'N/A',
        email: student.email || student['EMAIL'] || student.emailId || 'N/A',
        phone: student.phone || student.phoneNumber || student.mobile || student['PHONE NUMBER'] || 'N/A',
        course: student.course || student['COURSE'] || student.degree || 'N/A',
        specialization: student.specialization || student['SPECIALIZATION'] || student.branch || 'N/A',
        currentYear: student.currentYear || student['CURRENT YEAR'] || student.year || 'N/A',
        tenthMarks: student.tenthMarks || student['10TH MARKS %'] || student.tenthPercentage || 'N/A',
        twelfthMarks: student.twelfthMarks || student['12TH MARKS %'] || student.twelfthPercentage || 'N/A',
        cgpa: student.cgpa || student.CGPA || student.gpa || 'N/A',
        activeBacklogs: student.activeBacklogs || student['ACTIVE BACKLOGS'] || student.backlogs || '0',
        gender: student.gender || student['GENDER'] || student.sex || 'N/A',
        status: student.status || student.STATUS || 'submitted',
        college: student.college || student.collegeName || student['COLLEGE'] || collegeName || 'N/A',
        uploadedAt: student.uploadedAt || student.uploadDate || student.uploadedDate || 'N/A',
        isMatched: !isUnmatched,
        
        // Keep original data for debugging
        _original: student
      };
    });
  }, [students, collegeName, unmatchedStudents]);

  // Get only columns that have data in students
  const displayColumns = useMemo(() => {
    return columnMapping.filter(col => {
      if (col.isSrNo) return true; // Always show SR NO
      if (col.fieldName === 'isMatched') return true; // Always show match status
      if (col.isActions) return true; // Always show actions
      
      // Check if any student has this field with data
      return normalizedStudents.some(student => {
        const value = student[col.fieldName];
        return value !== null && value !== undefined && value !== '' && value !== 'N/A';
      });
    });
  }, [normalizedStudents, columnMapping]);

  // Filter students
  const filteredStudents = useMemo(() => {
    let filtered = normalizedStudents.filter(student => {
      const matchesSearch = Object.values(student).some(value => 
        String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    return filtered;
  }, [normalizedStudents, searchTerm, statusFilter]);

  // Export to Excel function
  const exportToExcel = () => {
    if (filteredStudents.length === 0) return;
    
    const worksheet = XLSX.utils.json_to_sheet(filteredStudents.map((student, index) => {
      const row = {};
      displayColumns.forEach(col => {
        if (col.isSrNo) {
          row[col.displayName] = index + 1;
        } else if (col.fieldName === 'isMatched') {
          row[col.displayName] = student.isMatched ? 'Matched' : 'Not Found in Training Data';
        } else {
          row[col.displayName] = student[col.fieldName];
        }
      });
      return row;
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, `${companyName}_students.xlsx`);
  };

  // Format cell value for display
  const formatCellValue = (value, fieldName) => {
    if (value === null || value === undefined || value === '' || value === 'N/A') {
      return '-';
    }

    if (fieldName === 'isMatched') {
      return value ? (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
          ✓ Matched
        </span>
      ) : (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
          ✗ Not Found
        </span>
      );
    }

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

    // Handle uploadedAt which may be a Firestore Timestamp object
    if (fieldName === 'uploadedAt') {
      try {
        let dateObj = null;

        // Firestore Timestamp has toDate()
        if (value && typeof value === 'object') {
          if (typeof value.toDate === 'function') {
            dateObj = value.toDate();
          } else if ('seconds' in value) {
            // { seconds, nanoseconds }
            dateObj = new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
          }
        } else if (typeof value === 'number') {
          // If number, try to guess milliseconds vs seconds
          dateObj = value > 1e12 ? new Date(value) : new Date(value * 1000);
        } else {
          dateObj = new Date(String(value));
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
        }

        return String(value);
      } catch {
        return String(value);
      }
    }

    // If some other object got through, stringify it to avoid React error
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return value;
  };

  // Get row background color based on match status
  const getRowClassName = (student) => {
    return student.isMatched ? '' : 'bg-red-50 border-l-4 border-red-400';
  };

  // Count matched vs unmatched
  const matchStats = useMemo(() => {
    const matched = normalizedStudents.filter(s => s.isMatched).length;
    const unmatched = normalizedStudents.filter(s => !s.isMatched).length;
    return { matched, unmatched, total: normalizedStudents.length };
  }, [normalizedStudents]);

  // Handle delete unmatched student
  const handleDeleteStudent = async (student) => {
    if (!student.isMatched && deleteUnmatchedStudent && company) {
      const confirmDelete = window.confirm(`Are you sure you want to delete student "${student.studentName}" from the backend? This action cannot be undone.`);
      if (confirmDelete) {
        try {
          await deleteUnmatchedStudent(student, company);
          // Refresh the data without reloading the page
          if (onStudentDeleted) {
            await onStudentDeleted();
          }
        } catch (error) {
          console.error('Failed to delete student:', student.studentName, error);
        }
      }
    }
  };

  // Handle accept unmatched student
  const handleAcceptStudent = async (student) => {
    if (!student.isMatched && acceptUnmatchedStudent && company) {
      const confirmAccept = window.confirm(`Are you sure you want to accept student "${student.studentName}" and add them to the training database?`);
      if (confirmAccept) {
        try {
          await acceptUnmatchedStudent(student, company);
          // Refresh the data without reloading the page
          if (onStudentDeleted) {
            await onStudentDeleted();
          }
        } catch (error) {
          console.error('Failed to accept student:', student.studentName, error);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-60 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-95vw max-h-[95vh] overflow-hidden mx-4">
        
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center sticky top-0">
          <div>
            <h2 className="text-xl font-semibold">Student Data</h2>
            <p className="text-green-100 text-sm">
              {companyName && `Company: ${companyName}`} 
              {collegeName && ` | College: ${collegeName}`}
              {` | Students: ${filteredStudents.length}/${normalizedStudents.length} | Columns: ${displayColumns.length}`}
            </p>
            {/* Match Statistics */}
            <div className={`mt-1 px-2 py-1 rounded text-xs font-medium ${
              matchStats.unmatched === 0 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}>
              📊 Match Status: {matchStats.matched} matched, {matchStats.unmatched} not found in training Data
            </div>
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

          

          
          </div>

          {/* Data Structure Info */}
          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Data Info:</strong> {normalizedStudents.length} students normalized | 
              Match Status: {matchStats.matched} matched, {matchStats.unmatched} not found | 
              Red rows indicate students not found in training Data
            </p>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          {displayColumns.length > 0 && normalizedStudents.length > 0 ? (
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {displayColumns.map((col, _index) => (
                    <th 
                      key={_index} 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border bg-gray-100"
                    >
                      {col.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student, _index) => (
                  <tr 
                    key={_index} 
                    className={`hover:bg-gray-50 ${getRowClassName(student)}`}
                    title={!student.isMatched ? "Student not found in training Data" : ""}
                  >
                    {displayColumns.map((col, colIndex) => (
                      <td 
                        key={colIndex} 
                        className={`px-4 py-3 whitespace-nowrap text-sm border ${
                          col.isSrNo ? 'text-center font-medium bg-gray-50' : ''
                        } ${!student.isMatched && colIndex > 0 ? 'text-red-700 font-medium' : ''}`}
                      >
                        {col.isSrNo 
                          ? _index + 1
                          : col.isActions
                          ? (!student.isMatched ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAcceptStudent(student)}
                                  className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition flex items-center gap-1"
                                  title="Accept this student and add to training database"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student)}
                                  className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition flex items-center gap-1"
                                  title="Delete this student from backend"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            ) : null)
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
              {normalizedStudents.length === 0 ? 'No student data available' : 'No students found matching your filters'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {filteredStudents.length} of {normalizedStudents.length} students | 
            <span className={`ml-2 font-medium ${
              matchStats.unmatched === 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {matchStats.matched} matched, {matchStats.unmatched} not found
            </span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportToExcel}
              disabled={filteredStudents.length === 0}
              className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
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