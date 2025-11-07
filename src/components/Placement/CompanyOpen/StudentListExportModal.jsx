import React, { useEffect, useState, useMemo } from 'react';
import { XIcon, DownloadIcon, CheckIcon, ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/outline';
import { db } from '../../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';

// Custom dropdown with enhanced styling
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

// Enhanced modal with premium styling
const StudentListExportModal = ({ companies = [], onClose }) => {
  const [companyCode, setCompanyCode] = useState('');
  const [uploads, setUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [selectedUploads, setSelectedUploads] = useState(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!companyCode) {
      setUploads([]);
      setSelectedUploads(new Set());
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

        // Sort by date descending
        items.sort((a, b) => {
          const da = a.uploadedAt && a.uploadedAt.seconds ? a.uploadedAt.seconds * 1000 : (a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0);
          const dbt = b.uploadedAt && b.uploadedAt.seconds ? b.uploadedAt.seconds * 1000 : (b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0);
          return dbt - da;
        });

        setUploads(items);
        // Auto-select all uploads for convenience
        setSelectedUploads(new Set(items.map(i => i.id)));
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

  const toggleUploadSelection = (id) => {
    const next = new Set(selectedUploads);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUploads(next);
  };

  const selectAll = () => {
    const all = new Set(uploads.map(u => u.id));
    setSelectedUploads(all);
  };

  const clearAll = () => setSelectedUploads(new Set());

  const exportSelectedStudents = async () => {
    if (selectedUploads.size === 0) {
      // Enhanced alert with better UX
      alert('Please select at least one upload to export.');
      return;
    }

    setExporting(true);
    
    try {
      // Collect students from selected uploads
      const rows = [];
      for (const up of uploads) {
        if (!selectedUploads.has(up.id)) continue;
        const metaCollege = up.college || '';
        const metaUploadDate = formatFullDate(up.uploadedAt);

        up.students.forEach(s => {
          rows.push({ ...s, COLLEGE: metaCollege, UPLOAD_DATE: metaUploadDate, __uploadId: up.id });
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

      // Build headers
      const preferred = [
        'SR NO', 'studentName', 'FULL NAME OF STUDENT', 'enrollmentNo', 'ENROLLMENT NUMBER', 'email', 'EMAIL ID', 'accountEmail', 'phone', 'accountPhone', 'course', 'COURSE', 'specialization', 'SPECIALIZATION', 'currentYear', 'CGPA', 'tenthMarks', 'twelfthMarks', 'activeBacklogs', 'gender', 'status', 'COLLEGE', 'UPLOAD_DATE'
      ];

      const allKeys = new Set();
      unique.forEach(u => Object.keys(u).forEach(k => allKeys.add(k)));
      const headers = [];
      preferred.forEach(p => { if (allKeys.has(p)) { headers.push(p); allKeys.delete(p); } });
      Array.from(allKeys).sort().forEach(k => headers.push(k));

      // Build worksheet data with enhanced styling
      const sheetData = [headers.map(h => ({ v: h, t: 's', s: { 
        font: { bold: true, color: { rgb: "FFFFFF" } }, 
        fill: { fgColor: { rgb: "1F2937" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "374151" } },
          left: { style: "thin", color: { rgb: "374151" } },
          bottom: { style: "thin", color: { rgb: "374151" } },
          right: { style: "thin", color: { rgb: "374151" } }
        }
      }}))];

      unique.forEach((row, idx) => {
        const r = headers.map(h => {
          if (h === 'SR NO') return idx + 1;
          return row[h] !== undefined ? row[h] : '';
        });
        sheetData.push(r.map(cell => ({ 
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
      ws['!cols'] = headers.map(h => ({ wch: Math.max(12, Math.min(30, (h.length + 5))) }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const fileName = `${companyCode || 'students'}_students_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);
      
      // Success feedback
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
      {/* Backdrop with blur effect */}
      <div 
        className="absolute inset-0 bg-gray-600 bg-opacity-75 transition-opacity backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal container */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-5 flex justify-between items-center">
          <div>
            <h2 id="export-modal-title" className="text-xl font-semibold">Export Student Data</h2>
            <p className="text-blue-100 text-sm mt-1">Select company and uploads to export student information</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            aria-label="Close modal"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
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

          {/* Uploads list */}
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
                <ul className="divide-y divide-gray-100">
                  {uploads.map(u => (
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
                                {formatMonthYear(u.uploadedAt)} 
                                {u.uploadedAt && ` • ${formatFullDate(u.uploadedAt)}`} 
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
          </div>

          {/* Info panel */}
          {selectedCount > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Ready to export {totalStudents} students from {selectedCount} upload(s)</p>
                  <p className="mt-1">The exported file will include deduplicated student records with enhanced formatting.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
                Export Selected
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentListExportModal;