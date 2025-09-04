import React from "react";
import { FiDownload } from "react-icons/fi";

function TrainerCalendarExcel({ bookings, selectedTrainer, disabled, asDropdownItem = false, onClick }) {
  const exportCSV = () => {
    if (disabled) return;
    if (onClick) onClick(); // Close dropdown
    const rows = bookings.map((b) => ({
      trainerId: b.trainerId,
      trainerName: b.trainerName || b.trainer || "",
      date: b.dateISO || "",
      dayDuration: b.dayDuration || "",
      domain: b.domain || "",
      batchCode: b.batchCode || "",
      sourceTrainingId: b.sourceTrainingId || "",
      conflict: b._conflict ? 'YES' : 'NO'
    }));
    if (!rows.length) return;
    const headerCols = ['trainerId','trainerName','date','dayDuration','domain','batchCode','sourceTrainingId','conflict'];
    const header = headerCols.join(',') + '\n';
    const body = rows.map((r) => headerCols.map(k => `"${String(r[k] || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const csv = header + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `trainer-bookings-${selectedTrainer || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return asDropdownItem ? (
    <button
      disabled={disabled}
      onClick={exportCSV}
      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FiDownload className="w-4 h-4" />
      Export CSV
    </button>
  ) : (
    <button
      disabled={disabled}
      onClick={exportCSV}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
        disabled
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
          : 'bg-indigo-600 text-white hover:bg-indigo-700'
      }`}
    >
      <FiDownload className="w-4 h-4" />
      <span className="hidden sm:inline">Export CSV</span>
      <span className="sm:hidden">CSV</span>
    </button>
  );
}

export default TrainerCalendarExcel;
