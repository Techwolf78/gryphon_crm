import React, { useEffect, useState, useMemo } from 'react';
import { XIcon, DownloadIcon, CheckIcon, ChevronDownIcon, InformationCircleIcon, ChevronRightIcon } from '@heroicons/react/outline';
import { db } from '../../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';

// Template fields mapping - ye fixed columns hain jo export honge
const TEMPLATE_FIELDS = [
  "STUDENT NAME",
  "ENROLLMENT NUMBER", 
  "EMAIL",
  "PHONE NUMBER",
  "COURSE",
  "SPECIALIZATION",
  "CURRENT YEAR",
  "10TH MARKS %",
  "12TH MARKS %", 
  "CGPA",
  "ACTIVE BACKLOGS",
  "GENDER"
];

// Field mapping - Firebase data ke fields ko template fields se map karta hai
const FIELD_MAPPING = {
  "STUDENT NAME": ["studentName", "FULL NAME OF STUDENT", "name"],
  "ENROLLMENT NUMBER": ["enrollmentNo", "ENROLLMENT NUMBER", "enrollment"],
  "EMAIL": ["email", "EMAIL ID", "accountEmail"],
  "PHONE NUMBER": ["phone", "accountPhone", "PHONE", "mobile"],
  "COURSE": ["course", "COURSE"],
  "SPECIALIZATION": ["specialization", "SPECIALIZATION", "branch"],
  "CURRENT YEAR": ["currentYear", "YEAR", "academicYear"],
  "10TH MARKS %": ["tenthMarks", "10TH MARKS", "tenthPercentage"],
  "12TH MARKS %": ["twelfthMarks", "12TH MARKS", "twelfthPercentage"],
  "CGPA": ["CGPA", "cgpa", "GPA"],
  "ACTIVE BACKLOGS": ["activeBacklogs", "BACKLOGS", "currentBacklogs"],
  "GENDER": ["gender", "GENDER"]
};

function CompanySelectDropdown({ companies = [], value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const uniqueCompanies = useMemo(() => {
    const map = new Map();
    (companies || []).forEach(c => {
      const name = (c.companyName || '').trim();
      if (!name) return;
      if (!map.has(name)) map.set(name, c);
    });
    return Array.from(map.values());
  }, [companies]);

  const selectedCompany = uniqueCompanies.find(c => 
    (c.companyName || '').replace(/\s+/g, '_').toUpperCase() === value
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Company
        <span className="text-red-500 ml-1">*</span>
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 flex items-center justify-between"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {selectedCompany ? selectedCompany.companyName : "-- Choose Company --"}
        </span>
        <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            <ul className="py-1" role="listbox">
              {uniqueCompanies.map(c => {
                const code = (c.companyName || '').replace(/\s+/g, '_').toUpperCase();
                return (
                  <li
                    key={code}
                    role="option"
                    aria-selected={value === code}
                    onClick={() => {
                      onChange(code);
                      setIsOpen(false);
                    }}
                    className={`px-4 py-2 cursor-pointer transition-colors duration-150 ${
                      value === code 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{c.companyName}</span>
                      {value === code && <CheckIcon className="h-4 w-4 text-blue-600" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

const StudentListExportModal = ({ companies = [], onClose }) => {
  const [companyCode, setCompanyCode] = useState('');
  const [uploads, setUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [selectedUploads, setSelectedUploads] = useState(new Set());
  const [exporting, setExporting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  useEffect(() => {
    if (!companyCode) {
      setUploads([]);
      setSelectedUploads(new Set());
      setExpandedGroups(new Set());
      return;
    }

    const fetchUploads = async () => {
      setLoadingUploads(true);
      try {
        const uploadsCollectionRef = collection(db, 'studentList', companyCode, 'uploads');
        const snapshot = await getDocs(uploadsCollectionRef);
        const items = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const uploadedAt = data.uploadedAt || data.uploadDate || data.createdAt || null;
          items.push({
            id: doc.id,
            college: data.college || 'Unknown College',
            uploadedAt,
            students: Array.isArray(data.students) ? data.students : [],
            raw: data
          });
        });

        items.sort((a, b) => {
          const da = a.uploadedAt && a.uploadedAt.seconds ? a.uploadedAt.seconds * 1000 : (a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0);
          const dbt = b.uploadedAt && b.uploadedAt.seconds ? b.uploadedAt.seconds * 1000 : (b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0);
          return dbt - da;
        });

        setUploads(items);
        setSelectedUploads(new Set(items.map(i => i.id)));
        
        // Automatically expand all groups initially
        const groups = new Set();
        items.forEach(item => {
          const groupKey = getMonthYearGroup(item.uploadedAt);
          groups.add(groupKey);
        });
        setExpandedGroups(groups);
      } catch (err) {
        console.error('Error fetching uploads', err);
        setUploads([]);
      } finally {
        setLoadingUploads(false);
      }
    };

    fetchUploads();
  }, [companyCode]);

  const formatMonthYear = (val) => {
    if (!val) return 'Unknown Date';
    try {
      const date = val.seconds ? new Date(val.seconds * 1000) : new Date(val);
      return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    } catch {
      return String(val);
    }
  };

  const formatFullDate = (val) => {
    if (!val) return '';
    try {
      const date = val.seconds ? new Date(val.seconds * 1000) : new Date(val);
      return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(val);
    }
  };

  const getMonthYearGroup = (val) => {
    if (!val) return 'unknown';
    try {
      const date = val.seconds ? new Date(val.seconds * 1000) : new Date(val);
      return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    } catch {
      return 'unknown';
    }
  };

  // Group uploads by month-year
  const groupedUploads = useMemo(() => {
    const groups = {};
    uploads.forEach(upload => {
      const groupKey = getMonthYearGroup(upload.uploadedAt);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(upload);
    });
    
    // Sort groups by date (newest first)
    const sortedGroups = {};
    Object.keys(groups)
      .sort((a, b) => {
        if (a === 'unknown') return 1;
        if (b === 'unknown') return -1;
        return new Date(b) - new Date(a);
      })
      .forEach(key => {
        sortedGroups[key] = groups[key];
      });
    
    return sortedGroups;
  }, [uploads]);

  const toggleUploadSelection = (id) => {
    const next = new Set(selectedUploads);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUploads(next);
  };

  const toggleGroupSelection = (groupKey) => {
    const groupUploads = groupedUploads[groupKey] || [];
    const groupIds = new Set(groupUploads.map(u => u.id));
    const allSelected = groupUploads.every(u => selectedUploads.has(u.id));
    
    const next = new Set(selectedUploads);
    if (allSelected) {
      groupIds.forEach(id => next.delete(id));
    } else {
      groupIds.forEach(id => next.add(id));
    }
    setSelectedUploads(next);
  };

  const toggleGroupExpansion = (groupKey) => {
    const next = new Set(expandedGroups);
    if (next.has(groupKey)) {
      next.delete(groupKey);
    } else {
      next.add(groupKey);
    }
    setExpandedGroups(next);
  };

  const selectAll = () => {
    const all = new Set(uploads.map(u => u.id));
    setSelectedUploads(all);
  };

  const clearAll = () => setSelectedUploads(new Set());

  // Helper function to find value from student data based on template field
  const getFieldValue = (student, templateField) => {
    const possibleFields = FIELD_MAPPING[templateField] || [templateField.toLowerCase()];
    
    for (const field of possibleFields) {
      if (student[field] !== undefined && student[field] !== null && student[field] !== '') {
        return student[field];
      }
    }
    
    return ''; // Return empty if no value found
  };

  // New function to determine which columns have data
  const getColumnsWithData = (students) => {
    const columnHasData = {};
    
    // Initialize all template fields as false
    TEMPLATE_FIELDS.forEach(field => {
      columnHasData[field] = false;
    });
    
    // Check each student for each field
    students.forEach(student => {
      TEMPLATE_FIELDS.forEach(field => {
        if (!columnHasData[field]) {
          const value = getFieldValue(student, field);
          if (value !== undefined && value !== null && value !== '') {
            columnHasData[field] = true;
          }
        }
      });
    });
    
    // Return only columns that have data + always include COLLEGE
    return ['SR NO', ...TEMPLATE_FIELDS.filter(field => columnHasData[field]), 'COLLEGE'];
  };

  const exportSelectedStudents = async () => {
    if (selectedUploads.size === 0) {
      alert('Please select at least one upload to export.');
      return;
    }

    setExporting(true);
    
    try {
      const rows = [];
      for (const up of uploads) {
        if (!selectedUploads.has(up.id)) continue;
        const metaCollege = up.college || '';

        up.students.forEach(s => {
          rows.push({ 
            ...s, 
            COLLEGE: metaCollege,
            __uploadId: up.id 
          });
        });
      }

      if (rows.length === 0) {
        alert('No student rows found in selected uploads.');
        return;
      }

      // Deduplicate by identifier WITHIN each upload only
      const seen = new Set();
      const unique = [];
      rows.forEach(r => {
        const idKey = (r.email || r.enrollmentNo || r.enrollment || r.accountEmail || r['EMAIL ID'] || r['ENROLLMENT NUMBER'] || r.accountPhone || '')
          .toString().trim().toLowerCase();
        const uploadScope = r.__uploadId || '';
        const key = `${uploadScope}__${idKey || JSON.stringify(r)}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(r);
        }
      });

      // Determine which columns actually have data
      const activeColumns = getColumnsWithData(unique);
      const dataColumns = activeColumns.filter(col => col !== 'SR NO' && col !== 'COLLEGE');
      
      // Build worksheet data with only columns that have data
      const sheetData = [activeColumns.map(h => ({ 
        v: h, 
        t: 's', 
        s: { 
          font: { bold: true, color: { rgb: "FFFFFF" } }, 
          fill: { fgColor: { rgb: "1F2937" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "374151" } },
            left: { style: "thin", color: { rgb: "374151" } },
            bottom: { style: "thin", color: { rgb: "374151" } },
            right: { style: "thin", color: { rgb: "374151" } }
          }
        }
      }))];

      // Add data rows
      unique.forEach((student, idx) => {
        const rowData = [];
        
        activeColumns.forEach(column => {
          if (column === 'SR NO') {
            rowData.push(idx + 1);
          } else if (column === 'COLLEGE') {
            rowData.push(student.COLLEGE || '');
          } else {
            rowData.push(getFieldValue(student, column));
          }
        });
        
        sheetData.push(rowData.map(cell => ({ 
          v: cell, 
          t: typeof cell === 'number' ? 'n' : 's',
          s: {
            border: {
              top: { style: "thin", color: { rgb: "E5E7EB" } },
              left: { style: "thin", color: { rgb: "E5E7EB" } },
              bottom: { style: "thin", color: { rgb: "E5E7EB" } },
              right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
          }
        })));
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Set column widths based on header lengths
      ws['!cols'] = activeColumns.map(h => ({ 
        wch: Math.max(12, Math.min(30, (h.length + 5))) 
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const fileName = `${companyCode || 'students'}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);
      
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (err) {
      console.error('Export failed', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const selectedCount = selectedUploads.size;
  const totalStudents = uploads
    .filter(u => selectedUploads.has(u.id))
    .reduce((sum, u) => sum + u.students.length, 0);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div 
        className="absolute inset-0 bg-gray-600 bg-opacity-75 transition-opacity backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div 
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-5 flex justify-between items-center">
          <div>
            <h2 id="export-modal-title" className="text-xl font-semibold">Export Student Data</h2>
            <p className="text-blue-100 text-sm mt-1">
              Smart export - only columns with data will be included
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            aria-label="Close modal"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <CompanySelectDropdown
              companies={companies}
              value={companyCode}
              onChange={setCompanyCode}
            />

            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selection Controls
              </label>
              <div className="flex gap-2 items-center h-full">
                <button 
                  onClick={selectAll} 
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors duration-200 flex-1"
                >
                  Select All
                </button>
                <button 
                  onClick={clearAll} 
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors duration-200 flex-1"
                >
                  Clear All
                </button>
                <div className="text-right ml-4">
                  <div className="text-sm font-medium text-gray-900">{uploads.length} upload(s)</div>
                  <div className="text-xs text-gray-500">found</div>
                </div>
              </div>
            </div>
          </div>

          {/* Uploads list with grouping */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Available Uploads</h3>
                {selectedCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{selectedCount} selected</span>
                    <span className="text-gray-300">•</span>
                    <span>{totalStudents} students</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {loadingUploads ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : uploads.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <InformationCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    {companyCode ? 'No uploads found for selected company.' : 'Select a company to view available uploads.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {Object.entries(groupedUploads).map(([groupKey, groupUploads]) => {
                    const isExpanded = expandedGroups.has(groupKey);
                    const groupSelectedCount = groupUploads.filter(u => selectedUploads.has(u.id)).length;
                    const isAllSelected = groupSelectedCount === groupUploads.length;
                    const groupStudentCount = groupUploads.reduce((sum, u) => sum + u.students.length, 0);
                    
                    return (
                      <div key={groupKey} className="bg-white">
                        {/* Group Header */}
                        <div className="flex items-center p-3 bg-gray-50 border-b border-gray-200">
                          <button
                            onClick={() => toggleGroupExpansion(groupKey)}
                            className="flex items-center gap-2 flex-1 text-left hover:bg-gray-100 rounded px-2 py-1 transition-colors"
                          >
                            <ChevronRightIcon 
                              className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
                            />
                            <span className="font-medium text-gray-900">{groupKey}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              ({groupUploads.length} uploads, {groupStudentCount} students)
                            </span>
                          </button>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">
                              {groupSelectedCount}/{groupUploads.length} selected
                            </span>
                            <input 
                              type="checkbox" 
                              checked={isAllSelected}
                              onChange={() => toggleGroupSelection(groupKey)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Group Content */}
                        {isExpanded && (
                          <ul className="divide-y divide-gray-100">
                            {groupUploads.map(u => (
                              <li key={u.id} className="hover:bg-gray-50 transition-colors duration-150">
                                <label className="flex items-start p-4 cursor-pointer">
                                  <div className="flex items-center h-5 mt-0.5">
                                    <input 
                                      type="checkbox" 
                                      checked={selectedUploads.has(u.id)} 
                                      onChange={() => toggleUploadSelection(u.id)}
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                  </div>
                                  <div className="ml-3 flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900 truncate">{u.college}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {formatFullDate(u.uploadedAt)} 
                                          • {u.students.length} students
                                        </p>
                                      </div>
                                      <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                        ID: {u.id.slice(0,6)}
                                      </div>
                                    </div>
                                  </div>
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {selectedCount > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Ready to export {totalStudents} students from {selectedCount} upload(s)</p>
                  <p className="mt-1">Export will automatically include only columns that contain data</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button 
            onClick={exportSelectedStudents} 
            disabled={selectedUploads.size === 0 || exporting}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Exporting...
              </>
            ) : (
              <>
                <DownloadIcon className="h-4 w-4" />
                Export List
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentListExportModal;