import React, { useState, useMemo, useCallback } from "react";

function StudentListModal({ students, onClose }) {
  const [serialSortDirection, setSerialSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [isSerialColumnSorted, setIsSerialColumnSorted] = useState(false);
  const [showAllColumns, setShowAllColumns] = useState(false);

  // Inline CSS for animations
  const modalStyles = `
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    .animate-slideUp {
      animation: slideUp 0.3s ease-out forwards;
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out forwards;
    }
  `;

  // Collect all unique keys from all documents to create dynamic headers
  const headers = useMemo(() => {
    if (students.length === 0) return [];
    
    const allKeys = new Set();
    students.forEach(student => {
      Object.keys(student).forEach(key => {
        if (key !== 'id') { // Exclude the id field from headers
          allKeys.add(key);
        }
      });
    });

    return Array.from(allKeys).sort((a, b) => {
      // Check if column contains serial number variations (case insensitive)
      const aIsSerial = /^(s\.?\s*no\.?\s*|sr\.?\s*no\.?\s*|serial\s*no\.?\s*|sn\s*)$/i.test(a.trim()) || a.trim().toLowerCase() === 'sn';
      const bIsSerial = /^(s\.?\s*no\.?\s*|sr\.?\s*no\.?\s*|serial\s*no\.?\s*|sn\s*)$/i.test(b.trim()) || b.trim().toLowerCase() === 'sn';
      
      // Check if column contains name-related words (case insensitive) - prioritize student names over other name fields
      const aIsName = /full\s*name\s*of\s*student/i.test(a) || /student\s*name/i.test(a) || (/name/i.test(a) && !/college/i.test(a) && !/course/i.test(a));
      const bIsName = /full\s*name\s*of\s*student/i.test(b) || /student\s*name/i.test(b) || (/name/i.test(b) && !/college/i.test(b) && !/course/i.test(b));
      
      // Serial numbers first
      if (aIsSerial && !bIsSerial) return -1;
      if (!aIsSerial && bIsSerial) return 1;
      
      // Then names
      if (aIsName && !bIsName) return -1;
      if (!aIsName && bIsName) return 1;
      
      // Alphabetical for same type
      return a.localeCompare(b);
    });
  }, [students]);

  // Define important columns that should be shown by default
  const importantColumns = [
    'SR NO', 'FULL NAME OF STUDENT', 'CURRENT COLLEGE NAME', 
    'EMAIL ID', 'MOBILE NO.', 'COURSE', 'SPECIALIZATION', 'PASSING YEAR'
  ];

  // Filter headers based on showAllColumns toggle
  const displayedHeaders = showAllColumns ? headers : headers.filter(header => 
    importantColumns.some(important => 
      header.toLowerCase().includes(important.toLowerCase()) || 
      important.toLowerCase().includes(header.toLowerCase())
    )
  );

  const handleSerialSort = () => {
    setSerialSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    setIsSerialColumnSorted(true);
  };

  // Get the serial column header name
  const getSerialHeader = useCallback(() => {
    return headers.find(header => 
      /^(s\.?\s*no\.?\s*|sr\.?\s*no\.?\s*|serial\s*no\.?\s*|sn\s*)$/i.test(header.trim()) || header.trim().toLowerCase() === 'sn'
    );
  }, [headers]);

  // Sort data based on serial column if sorting is active
  const sortedData = useMemo(() => {
    if (!isSerialColumnSorted) return students;
    
    const serialHeader = getSerialHeader();
    if (!serialHeader) return students;

    return [...students].sort((a, b) => {
      const aVal = a[serialHeader];
      const bVal = b[serialHeader];
      
      // Convert to numbers if possible, otherwise treat as strings
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      
      const aValue = isNaN(aNum) ? aVal : aNum;
      const bValue = isNaN(bNum) ? bVal : bNum;
      
      if (serialSortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [students, serialSortDirection, isSerialColumnSorted, getSerialHeader]);

  // Helper function to format cell values
  const formatCellValue = (value) => {
    if (value == null || value === "") return "N/A";
    
    // Handle Firestore Timestamp objects
    if (value && typeof value === 'object' && value.seconds && value.nanoseconds) {
      const date = new Date(value.seconds * 1000);
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: '2-digit'
      }).replace(/(\d+)\/(\d+)\/(\d+)/, '$1-$2-$3');
    }
    
    // Handle other objects
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };
  return (
    <>
      <style>{modalStyles}</style>
      <div className="fixed inset-0 z-54 flex items-center justify-center p-4">
        {/* Enhanced backdrop with fade-in animation */}
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-md transition-opacity duration-300"
          onClick={onClose}
        ></div>
        
        {/* Modal with slide-up animation */}
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp transform transition-all duration-300">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">Student Details</h2>
            <button
              onClick={() => setShowAllColumns(!showAllColumns)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20 text-sm"
              title={showAllColumns ? "Show important columns only" : "Show all columns"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showAllColumns ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                )}
              </svg>
              {showAllColumns ? "Important" : "All"}
            </button>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl focus:outline-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {students.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-gray-500">There are currently no students to display.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {displayedHeaders.map((header) => {
                      const isSerialColumn = /^(s\.?\s*no\.?\s*|sr\.?\s*no\.?\s*|serial\s*no\.?\s*|sn\s*)$/i.test(header.trim()) || header.trim().toLowerCase() === 'sn';
                      const columnWidth = isSerialColumn ? '60px' : `${100 / (displayedHeaders.length - (displayedHeaders.some(h => /^(s\.?\s*no\.?\s*|sr\.?\s*no\.?\s*|serial\s*no\.?\s*|sn\s*)$/i.test(h.trim()) || h.trim().toLowerCase() === 'sn') ? 1 : 0))}%`;
                      return (
                        <th 
                          key={header}
                          scope="col" 
                          className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate ${isSerialColumn ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
                          style={{ width: columnWidth, minWidth: isSerialColumn ? '60px' : 'auto' }}
                          onClick={isSerialColumn ? handleSerialSort : undefined}
                          title={header}
                        >
                          <div className="flex items-center justify-between">
                            <span>{header}</span>
                            {isSerialColumn && (
                              <div className="flex flex-col ml-1">
                                <svg 
                                  className={`w-2 h-2 ${isSerialColumnSorted && serialSortDirection === 'asc' ? 'text-purple-600' : 'text-gray-400'}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                                <svg 
                                  className={`w-2 h-2 -mt-1 ${isSerialColumnSorted && serialSortDirection === 'desc' ? 'text-purple-600' : 'text-gray-400'}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedData.map((student, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      {displayedHeaders.map((header) => {
                        const cellValue = formatCellValue(student[header]);
                        return (
                          <td key={header} className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 truncate" title={cellValue}>
                            {cellValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Close
          </button>
        </div>
        </div>
      </div>
    </>
  );
}export default StudentListModal;
