import React, { useState, useRef, useEffect } from 'react';
import { FiDownload, FiChevronDown, FiCheck, FiCalendar, FiColumns, FiFilter, FiRotateCcw } from 'react-icons/fi';
import * as XLSX from 'xlsx-js-style';

const InitiationDashboardExportButton = ({ trainings }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedColumns, setSelectedColumns] = useState(new Set([
    'collegeName', 'projectCode', 'phaseId', 'domain', 'computedStatus', 'totalCost', 'totalHours', 'tcv'
  ]));

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const availableColumns = [
  { key: 'collegeName', label: 'College Name', icon: '🏫' },
  { key: 'projectCode', label: 'Project Code', icon: '📋' },
    { key: 'phaseId', label: 'Phase', icon: '📊' },
    { key: 'domain', label: 'Domain', icon: '🎯' },
    { key: 'computedStatus', label: 'Status', icon: '📈' },
    { key: 'totalCost', label: 'Total Cost', icon: '💰' },
    { key: 'totalHours', label: 'Total Hours', icon: '⏱️' },
    { key: 'tcv', label: 'TCV', icon: '📊' },
    { key: 'trainingStartDate', label: 'Start Date', icon: '📅' },
    { key: 'trainingEndDate', label: 'End Date', icon: '📅' },
    { key: 'domainsCount', label: 'Domains Count', icon: '🔢' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (key) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedColumns(newSelected);
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    setSelectedColumns(new Set([
      'collegeName', 'projectCode', 'phaseId', 'domain', 'computedStatus', 'totalCost', 'totalHours', 'tcv'
    ]));
  };

  const handleExport = () => {
    // Validate trainings data
    if (!trainings || !Array.isArray(trainings) || trainings.length === 0) {
      alert('No training data available to export');
      return;
    }

    // Filter trainings by date
    let filteredTrainings = trainings;
    if (startDate || endDate) {
      filteredTrainings = trainings.filter(t => {
        if (!t.trainingStartDate) return false;

        const tStart = new Date(t.trainingStartDate);
        if (isNaN(tStart.getTime())) return false; // Invalid date

        let include = true;

        if (startDate) {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) {
            include = include && tStart >= start;
          }
        }

        if (endDate) {
          const end = new Date(endDate);
          // Set end date to end of day
          end.setHours(23, 59, 59, 999);
          if (!isNaN(end.getTime())) {
            include = include && tStart <= end;
          }
        }

        return include;
      });
    }

    // Check if any trainings match the filter
    if (filteredTrainings.length === 0) {
      alert('No trainings found for the selected date range');
      return;
    }

    // Validate selected columns
    if (selectedColumns.size === 0) {
      alert('Please select at least one column to export');
      return;
    }

    // Prepare data for Excel
    const headers = Array.from(selectedColumns).map(key => {
      const col = availableColumns.find(c => c.key === key);
      return col ? col.label : key;
    });

    const data = filteredTrainings.map(t =>
      Array.from(selectedColumns).map(key => {
        // Prefer projectCode but fall back to collegeCode for compatibility
        if (key === 'projectCode') return t.projectCode || t.collegeCode || '';
        const value = t[key];
        // Handle different data types
        if (value === null || value === undefined) return '';
        return value;
      })
    );

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    // Set column widths based on content
    const maxLengths = headers.map((header, i) => {
      const headerLen = header.length;
      const dataLen = Math.max(...data.map(row => String(row[i] || '').length));
      return Math.max(headerLen, dataLen, 10); // minimum 10 chars
    });
    ws['!cols'] = maxLengths.map(len => ({ wch: len + 2 })); // add some padding

  // (removed unused per-header color array; header now uses a single distinct color)

    // Style headers to match ExportLead: light-blue fill, black bold font, thin black borders
    const headerFillColor = 'CCECFF'; // ExportLead uses light blues for phases; use similar light-blue here
    headers.forEach((header, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: header };
      ws[cellRef].s = {
        font: { bold: true, sz: 12, color: { rgb: '000000' } },
        fill: { fgColor: { rgb: headerFillColor } },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
      };
    });

    // Style data cells with zebra striping and boxed thin borders
    const rowLight = 'FFFFFF'; // white
    const rowDark = 'EEF6FF'; // very light blue for contrast
    const borderColor = 'D1D5DB'; // neutral border color
    data.forEach((row, r) => {
      const isEvenRow = (r + 1) % 2 === 0; // +1 because header is row 0
      const fillColor = isEvenRow ? rowDark : rowLight;
      row.forEach((cell, c) => {
        const cellRef = XLSX.utils.encode_cell({ r: r + 1, c: c });
        if (!ws[cellRef]) ws[cellRef] = { v: cell };
        ws[cellRef].s = {
          font: { sz: 10, color: { rgb: '111827' } },
          fill: { fgColor: { rgb: fillColor } },
          border: {
            top: { style: 'thin', color: { rgb: borderColor } },
            bottom: { style: 'thin', color: { rgb: borderColor } },
            left: { style: 'thin', color: { rgb: borderColor } },
            right: { style: 'thin', color: { rgb: borderColor } }
          },
          alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
        };
      });
    });

    // Freeze the header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    // Add filters to headers
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) };

    // Add a table object so Excel recognizes it as a structured table (improves UI: banded rows, header styling, filter)
    try {
      const startRef = 'A1';
      const endRef = XLSX.utils.encode_cell({ r: data.length, c: headers.length - 1 }); // data.length + header row => last row index = data.length
      const tableRef = `${startRef}:${endRef}`;
      // SheetJS community recognizes '!tables' for table metadata; Excel will show it as a table when supported by reader
      ws['!tables'] = [{ name: 'TrainingsTable', ref: tableRef, headerRow: true }];
    } catch (e) {
      // Non-critical: if table creation fails, continue without blocking export
      console.warn('Could not create table object for worksheet:', e);
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trainings');

    // Export file
    try {
      XLSX.writeFile(wb, `trainings_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  return (
    <div className="relative inline-block w-auto">
      {/* Main Export Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="group relative inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white"
        aria-label="Export training data"
      >
        <FiDownload className="mr-1.5 w-3.5 h-3.5" />
        <span className="hidden sm:inline">Export Data</span>
        <span className="sm:hidden">Export</span>
        <FiChevronDown className={`ml-1.5 w-3.5 h-3.5 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[50] opacity-100 transform scale-100 transition-all duration-200 ease-out max-h-[70vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-2 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-2xl">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <FiDownload className="w-3 h-3 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-900 leading-tight">Export Training Data</h3>
                <p className="text-[10px] text-gray-500">Customize and download your data</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-2 space-y-2 overflow-y-auto">
            {/* Date Filters Section */}
            <div className="space-y-1.5">
              <div className="flex items-center space-x-1">
                <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                <label className="text-xs font-semibold text-gray-900">Date Range</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="block text-xs font-medium text-gray-600">Start</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    aria-label="Select start date for filtering"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="block text-xs font-medium text-gray-600">End</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    aria-label="Select end date for filtering"
                  />
                </div>
              </div>
            </div>

            {/* Column Selection Section */}
            <div className="space-y-1.5">
              <div className="flex items-center space-x-1">
                <FiColumns className="w-3.5 h-3.5 text-gray-400" />
                <label className="text-xs font-semibold text-gray-900">Columns</label>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {availableColumns.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className={`relative p-1 rounded border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-center ${
                      selectedColumns.has(col.key)
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    aria-label={`Toggle ${col.label} column ${selectedColumns.has(col.key) ? 'off' : 'on'}`}
                  >
                    <div className="text-xs font-medium leading-tight">
                      {col.label}
                    </div>
                    {selectedColumns.has(col.key) && (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full flex items-center justify-center">
                        <FiCheck className="w-1.5 h-1.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded p-2 border border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Records:</span>
                <span className="font-semibold text-gray-900">
                  {(() => {
                    if (!trainings || !Array.isArray(trainings)) return '0';
                    let count = trainings.length;
                    if (startDate || endDate) {
                      count = trainings.filter(t => {
                        if (!t.trainingStartDate) return false;
                        const tStart = new Date(t.trainingStartDate);
                        if (isNaN(tStart.getTime())) return false;

                        let include = true;
                        if (startDate) {
                          const start = new Date(startDate);
                          if (!isNaN(start.getTime())) include = include && tStart >= start;
                        }
                        if (endDate) {
                          const end = new Date(endDate);
                          end.setHours(23, 59, 59, 999);
                          if (!isNaN(end.getTime())) include = include && tStart <= end;
                        }
                        return include;
                      }).length;
                    }
                    return count;
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Fixed Sticky Footer */}
          <div className="bottom-0 bg-white border-t border-gray-200 p-1.5 rounded-b-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <button
                onClick={handleClear}
                className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                aria-label="Clear all selections and reset to defaults"
              >
                <FiRotateCcw className="mr-0.5 w-2.5 h-2.5" />
                Clear
              </button>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setIsDropdownOpen(false)}
                  className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  aria-label="Cancel export"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Download XLSX file"
                >
                  <FiDownload className="mr-0.5 w-2.5 h-2.5" />
                  Download XLSX
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InitiationDashboardExportButton;
