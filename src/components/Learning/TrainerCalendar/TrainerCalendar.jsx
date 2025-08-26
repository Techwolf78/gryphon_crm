import React, { useEffect, useState, useMemo, useRef } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, onSnapshot, query as fsQuery, where, orderBy } from "firebase/firestore";
import {
  FiX,
  FiDownload,
  FiCalendar,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
} from "react-icons/fi";

// TrainerCalendar
// Purpose: dashboard to view trainer bookings (booked dates, free dates, details).
// - Fetches `trainers` and `trainerAssignments` from Firestore.
// - Allows filtering by trainer, college, date range and searching by name/id.
// - Shows a simple month calendar with booked days highlighted and a side list of bookings.
// - Provides an export (CSV) button for selected trainer's bookings.

function formatDateISO(d) {
  if (!d) return "";
  try {
    // Firestore Timestamp has toDate()
    if (typeof d === 'object' && typeof d.toDate === 'function') {
      const dt = d.toDate();
      return isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
    }
    // Firestore-like { seconds, nanoseconds }
    if (d && typeof d.seconds === 'number') {
      const dt = new Date(d.seconds * 1000);
      return isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
    }
    // numeric timestamp in ms
    if (typeof d === 'number') {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
    }
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

function BookingDetail({ booking, onClose }) {
  if (!booking) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Booking details"
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40"
    >
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Booking details</h4>
            <p className="text-sm text-gray-500">Details for the selected trainer booking</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close booking details"
            className="text-gray-500 p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <FiX />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
          <div className="space-y-2">
            <div className="text-xs text-gray-500">Trainer</div>
            <div className="font-medium text-gray-900">{booking.trainerName || booking.trainerId}</div>
            <div className="text-xs text-gray-500 mt-2">Date</div>
            <div className="font-medium text-gray-900">{booking.dateISO || booking.date || booking.startDate}</div>
            <div className="text-xs text-gray-500 mt-2">Duration</div>
            <div className="font-medium text-gray-900">{booking.dayDuration || '—'}</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Batch / Domain</div>
            <div className="font-medium text-gray-900">
              {booking.batchCode && booking.domain
                ? `${booking.batchCode} • ${booking.domain}`
                : (booking.batchCode || booking.domain || '—')}
            </div>
            <div className="text-xs text-gray-500 mt-2">College</div>
            <div className="font-medium text-gray-900">{booking.collegeName || '—'}</div>
            <div className="text-xs text-gray-500 mt-2">Source training</div>
            <div className="font-medium text-gray-900">{booking.sourceTrainingId || '—'}</div>
          </div>
        </div>

        <div className="mt-5 text-right">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TrainerCalendar({
  onClose,
  initialTrainerId = "",
  embedded = false,
  onBack, // used only in embedded mode
}) {
  const [trainers, setTrainers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(initialTrainerId);
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month
  const [selectedCollege, setSelectedCollege] = useState("");
  const [bookingDetail, setBookingDetail] = useState(null);
  const [trainersCollapsed, setTrainersCollapsed] = useState(true);
  const searchRef = useRef(null);
  const trainersListRef = useRef(null);
  const trainersPanelRef = useRef(null);
  const modalRef = useRef(null);
  const previousActiveRef = useRef(null);
  // Loading states removed for now (add if skeletons needed later)
  const debouncedSearch = useDebounced(search, 250);

  const selectedTrainerObj = useMemo(() => {
    if (!selectedTrainer) return null;
    return trainers.find(t => (t.trainerId === selectedTrainer) || (t.id === selectedTrainer) || (t.name === selectedTrainer)) || null;
  }, [trainers, selectedTrainer]);

  // Auto-collapse trainers list on mobile when a trainer is selected to free screen space
  useEffect(() => {
    if (!selectedTrainer) return;
    try {
      if (window.innerWidth < 768) {
        setTrainersCollapsed(true);
      }
    } catch {
      // ignore in non-browser environments
    }
  }, [selectedTrainer]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'trainers'));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (mounted) setTrainers(list);
      } catch (err) {
        console.error('TrainerCalendar: failed to fetch trainers', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // focus trap for modal + Escape to close
  // Focus trap only for modal mode
  useEffect(() => {
    if (embedded) return; // skip in embedded mode
    try {
      previousActiveRef.current = document.activeElement;
      const root = modalRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable && focusable.length) focusable[0].focus();

      const handleKey = (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          if (typeof onClose === 'function') onClose();
        }
        if (e.key === 'Tab' && focusable && focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKey);
      return () => {
        document.removeEventListener('keydown', handleKey);
        try { previousActiveRef.current && previousActiveRef.current.focus && previousActiveRef.current.focus(); } catch {/* ignore restore focus errors */}
      };
    } catch {
      // ignore when not in browser
    }
  }, [onClose, embedded]);

  // Collapse trainers panel when clicking/tapping outside of it (and outside the search box)
  useEffect(() => {
    const handleOutsideTrainers = (e) => {
      try {
        const target = e.target;
        if (!trainersPanelRef.current) return;
        // if click is inside trainers panel or inside search area, do nothing
        if (trainersPanelRef.current.contains(target)) return;
        if (searchRef.current && searchRef.current.contains(target)) return;
        // collapse if currently open
        if (!trainersCollapsed) setTrainersCollapsed(true);
      } catch {
        // ignore
      }
    };

    document.addEventListener('pointerdown', handleOutsideTrainers);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideTrainers);
    };
  }, [trainersCollapsed]);

  // Close suggestions when clicking outside
  useEffect(() => {
    // Use pointerdown/touchstart to cover mouse and touch, and listen for Escape key
    const handleOutside = (e) => {
      try {
        if (searchRef.current && !searchRef.current.contains(e.target)) {
          setShowSuggestions(false);
        }
      } catch {
        // defensive: if ref access fails, close suggestions
        setShowSuggestions(false);
      }
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') setShowSuggestions(false);
    };

    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => {
    const colRef = collection(db, 'trainerAssignments');
    let unsub = null;
    const base = new Date();
    const startISO = formatDateISO(new Date(base.getFullYear(), base.getMonth() + monthOffset, 1));
    const endISO = formatDateISO(new Date(base.getFullYear(), base.getMonth() + monthOffset + 1, 0));

    const subscribe = async () => {
      try {
        let q = fsQuery(colRef, where('date', '>=', startISO), where('date', '<=', endISO), orderBy('date'));
        if (selectedTrainer) q = fsQuery(q, where('trainerId', '==', selectedTrainer));
        if (selectedCollege) q = fsQuery(q, where('collegeName', '==', selectedCollege));
        unsub = onSnapshot(q, snap => {
          const out = [];
            snap.forEach(d => out.push({ id: d.id, ...d.data() }));
          setAssignments(out);
        }, err => console.error('trainerAssignments query snapshot error', err));
      } catch (err) {
        console.warn('TrainerCalendar: query fallback - full collection', err);
        unsub = onSnapshot(colRef, snap => {
          const out = [];
          snap.forEach(d => out.push({ id: d.id, ...d.data() }));
          const filtered = out.filter(a => {
            const dt = formatDateISO(a.date || a.startDate || a.start);
            if (!dt) return false;
            if (dt < startISO || dt > endISO) return false;
            if (selectedTrainer && a.trainerId !== selectedTrainer) return false;
            if (selectedCollege && a.collegeName !== selectedCollege) return false;
            return true;
          });
          setAssignments(filtered);
        }, err => console.error('trainerAssignments fallback snapshot error', err));
      }
    };
    subscribe();
    return () => { try { typeof unsub === 'function' && unsub(); } catch (err) { console.warn('unsubscribe failed', err); } };
  }, [monthOffset, selectedTrainer, selectedCollege]);

  const colleges = useMemo(() => {
    const set = new Set();
    assignments.forEach((a) => a.collegeName && set.add(a.collegeName));
    return Array.from(set);
  }, [assignments]);

  const filteredTrainers = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return trainers.filter((t) => {
      if (!t) return false;
      if (q) {
        return (
          String(t.trainerId || "").toLowerCase().includes(q) ||
          String(t.name || t.trainerName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [trainers, debouncedSearch]);
  // note: dependent on debouncedSearch to avoid rapid re-filtering

  // Build bookings map for selected trainer (or all if not selected)
  const bookings = useMemo(() => {
    const list = assignments
      .filter((a) => (selectedTrainer ? a.trainerId === selectedTrainer : true))
      .filter((a) => (selectedCollege ? a.collegeName === selectedCollege : true));
    return list.map((a) => ({
      ...a,
      dateISO: formatDateISO(a.date || a.startDate || a.start),
    }));
  }, [assignments, selectedTrainer, selectedCollege]);

  // calendar helpers
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  const viewMonth = new Date(current.getFullYear(), current.getMonth() + monthOffset, 1);
  const monthLabel = viewMonth.toLocaleString("default", { month: "long", year: "numeric" });

  const daysInMonth = (m) => new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const firstWeekday = viewMonth.getDay();
  const monthDays = [];
  for (let i = 0; i < firstWeekday; i++) monthDays.push(null);
  for (let d = 1; d <= daysInMonth(viewMonth); d++) monthDays.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

  const bookingsByDate = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      const key = formatDateISO(b.dateISO);
      if (!key) return;
      map[key] = map[key] || [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  const exportCSV = () => {
    const rows = bookings.map((b) => ({
      trainerId: b.trainerId,
      trainerName: b.trainerName || b.trainer || "",
      date: b.dateISO || "",
      dayDuration: b.dayDuration || "",
      domain: b.domain || "",
      batchCode: b.batchCode || "",
      sourceTrainingId: b.sourceTrainingId || "",
    }));
    if (!rows.length) return;
    const headerCols = ['trainerId','trainerName','date','dayDuration','domain','batchCode','sourceTrainingId'];
    const header = headerCols.join(',') + '\n';
    const body = rows.map((r) => headerCols.map(k => `"${String(r[k] || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const csv = header + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `trainer-bookings-${selectedTrainer || 'all'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const outerWrapperClass = embedded
    ? 'w-full'
    : 'fixed inset-0 z-54 flex items-stretch justify-center p-0 md:p-6 bg-black/30 backdrop-blur-sm overflow-y-auto';
  const containerClass = embedded
    ? 'w-full bg-white rounded-xl shadow-sm ring-1 ring-gray-200 flex flex-col'
    : 'w-full max-w-7xl bg-white rounded-none md:rounded-2xl shadow-2xl ring-1 ring-gray-200 flex flex-col max-h-none min-h-full md:min-h-[0]';

  return (
    <div ref={modalRef} className={outerWrapperClass}>
      <div className={containerClass}>
  <header className={`${embedded ? 'relative' : 'sticky top-0'} z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-white/95 backdrop-blur ${embedded ? 'border-b border-gray-100 rounded-t-xl' : 'border-b border-gray-100'}`}>        
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-50 to-white shadow-inner">
              <FiCalendar className="text-indigo-600 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Trainer Calendar</h2>
              <p className="text-sm text-gray-500">Track trainer bookings and availability across colleges</p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {embedded && (
              <button
                type="button"
                onClick={() => { if (onBack) onBack(); }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Back
              </button>
            )}
            <button
              disabled={bookings.length === 0}
              onClick={exportCSV}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${bookings.length === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            >
              <FiDownload className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
            {!embedded && (
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Close
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 p-4 md:p-5 xl:gap-6">
          <aside className="md:col-span-2 lg:col-span-1 space-y-4">
            <div className="relative" ref={searchRef}>
              <label className="sr-only">Search trainers</label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><FiSearch /></div>
              <input
                aria-label="Search trainers"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setShowSuggestions(false); }
                }}
                className="pl-10 pr-10 w-full rounded-lg border border-gray-200 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder={selectedTrainerObj ? (selectedTrainerObj.name || selectedTrainerObj.trainerName || selectedTrainerObj.trainerId || '') : 'Search name or id'}
                role="combobox"
                aria-expanded={showSuggestions}
              />

              {/* inline clear button: clears selected trainer and search */}
              {selectedTrainerObj && (
                <button
                  aria-label="Clear selected trainer"
                  onClick={() => { setSelectedTrainer(''); setSearch(''); setShowSuggestions(false); setTrainersCollapsed(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded focus:outline-none"
                >
                  <FiX />
                </button>
              )}

              {showSuggestions && search.trim() !== '' && (
                <div role="listbox" className="absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded shadow-md max-h-56 overflow-auto">
                  {filteredTrainers.length === 0 && <div className="p-2 text-sm text-gray-500">No trainers found</div>}
                  {filteredTrainers.map((t) => {
                    const id = t.trainerId || t.id || t.name;
                    return (
                      <div
                        role="option"
                        tabIndex={0}
                        key={`suggest-${id}`}
                        onClick={() => { const id = t.trainerId || t.id; setSelectedTrainer(id); setShowSuggestions(false); setSearch(''); setTrainersCollapsed(true); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { const id = t.trainerId || t.id; setSelectedTrainer(id); setShowSuggestions(false); setSearch(''); setTrainersCollapsed(true); } }}
                        className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-gray-800"
                      >
                        <div className="font-medium">{t.name || t.trainerName || id}</div>
                        <div className="text-xs text-gray-500">{t.trainerId || t.id}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-2 max-h-[420px] overflow-y-auto">
              {/* trainersPanelRef used to detect outside clicks to collapse the list */}
              <div ref={trainersPanelRef} className="flex flex-col">
                <div className="flex items-center justify-between px-2 py-1">
                <div className="text-xs font-medium text-gray-500">Trainers</div>
                <button aria-expanded={!trainersCollapsed} onClick={() => setTrainersCollapsed(s => !s)} className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none flex items-center gap-1">
                  <span className="sr-only">Toggle trainers list</span>
                  <FiChevronDown className={`${trainersCollapsed ? 'transform rotate-0' : 'transform rotate-180'} w-4 h-4`} />
                </button>
                </div>
                <div ref={trainersListRef} className={`divide-y divide-gray-100 ${trainersCollapsed ? 'hidden' : ''}`}>
                {filteredTrainers.map((t) => {
                  const id = t.trainerId || t.id || t.name;
                  const initials = (t.name || t.trainerName || id || '').split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase();
                  const count = (assignments.filter(a => (a.trainerId === (t.trainerId || t.id)) || (a.trainerName === t.name))).length;
                  const isSelected = selectedTrainer === (t.trainerId || t.id);
                  return (
                    <button key={id} onClick={() => {
                        const newId = isSelected ? '' : (t.trainerId || t.id);
                        setSelectedTrainer(newId);
                        if (!isSelected) {
                          setTrainersCollapsed(true);
                          setSearch('');
                          setShowSuggestions(false);
                        }
                      }} className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-gray-50 focus:outline-none ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-100' : ''}`}>
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">{initials}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{t.name || t.trainerName || id}</div>
                        <div className="text-xs text-gray-500">{t.trainerId || t.id}</div>
                      </div>
                      <div className="text-xs text-gray-500">{count}</div>
                    </button>
                  );
                })}
                {filteredTrainers.length === 0 && <div className="p-3 text-sm text-gray-500">No trainers found</div>}
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-3 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">Filters</div>
                <button onClick={() => { setSelectedTrainer(''); setSelectedCollege(''); setSearch(''); }} className="text-xs text-indigo-600">Reset</button>
              </div>
              <div className="mt-3">
                <label className="text-xs text-gray-500">College</label>
                <select aria-label="Filter by college" value={selectedCollege} onChange={(e) => setSelectedCollege(e.target.value)} className="w-full mt-1 rounded-md border border-gray-200 text-sm py-1">
                  <option value="">All colleges</option>
                  {colleges.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </aside>

          <main className="md:col-span-3 lg:col-span-4 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="text-sm text-gray-700 font-medium">{monthLabel}</div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button onClick={() => setMonthOffset(m => m - 1)} aria-label="Previous month" className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"><FiChevronLeft /></button>
                <button onClick={() => setMonthOffset(0)} aria-label="Go to current month" className="px-3 py-1 text-sm rounded-md bg-gray-50 border border-gray-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">Today</button>
                <button onClick={() => setMonthOffset(m => m + 1)} aria-label="Next month" className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"><FiChevronRight /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center font-medium py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-600 tracking-wide">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mt-2">
              {monthDays.map((dt, idx) => {
                if (!dt) return <div key={`empty-${idx}`} className="h-16 sm:h-20 xl:h-24 border border-gray-100 rounded-lg bg-gray-50" aria-hidden />;
                const iso = formatDateISO(dt);
                const dayBookings = bookingsByDate[iso] || [];
                const isBooked = dayBookings.length > 0;
                return (
                  <div
                    key={iso}
                    onClick={() => isBooked && setBookingDetail(dayBookings[0])}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') { isBooked && setBookingDetail(dayBookings[0]); } }}
                    className={`h-16 sm:h-20 xl:h-24 border border-gray-100 rounded-lg p-1.5 sm:p-2 flex flex-col justify-between text-[11px] sm:text-sm transition shadow-[0_0_0_0_rgba(0,0,0,0)] hover:shadow-sm ${isBooked ? 'bg-red-50/70 hover:bg-red-50' : 'bg-white hover:bg-indigo-50/30'} focus:outline-none focus:ring-2 focus:ring-indigo-500/50`}
                    aria-label={`${dt.getDate()} ${monthLabel} - ${dayBookings.length} bookings`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-medium text-gray-900 text-xs sm:text-sm leading-none">{dt.getDate()}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 leading-none">{dayBookings.length}</div>
                    </div>
                    <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-600 overflow-y-auto max-h-12 sm:max-h-16 space-y-1 pr-0.5">
                      {dayBookings.slice(0,3).map((b, i) => (
                        <div key={i} className="flex items-start justify-between gap-1">
                          <div className="truncate leading-tight">
                            <div className="font-medium text-gray-800 truncate max-w-[60px] sm:max-w-[80px]">{b.trainerName || b.trainerId}</div>
                            <div className="text-gray-500 text-[9px] sm:text-[10px] truncate">{b.dayDuration} • {b.batchCode || b.domain || ''}</div>
                          </div>
                          <button
                            onClick={(ev) => { ev.stopPropagation(); setBookingDetail(b); }}
                            className="shrink-0 text-[10px] sm:text-xs text-indigo-600 hover:text-indigo-700 focus:outline-none"
                          >
                            Info
                          </button>
                        </div>
                      ))}
                      {dayBookings.length > 3 && <div className="text-[9px] sm:text-[10px] text-gray-400">+{dayBookings.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex-1 flex flex-col">
              <h4 className="text-sm font-medium text-gray-900">Bookings</h4>
              <div className="mt-3 space-y-2 max-h-40 sm:max-h-48 xl:max-h-56 overflow-y-auto pr-1">
                {bookings.length === 0 && <div className="text-gray-500 text-sm">No bookings for selected filters</div>}
                {bookings.map((b) => (
                  <div
                    key={b.id || `${b.trainerId}-${b.dateISO}`}
                    className="p-3 bg-white border border-gray-100 rounded-lg flex items-center justify-between gap-4 hover:border-indigo-200/70 transition"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {b.trainerName || b.trainerId}
                        <span className="text-xs text-gray-500"> • {b.trainerId}</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {b.dateISO || b.date || ''} • {b.dayDuration} • {b.batchCode || b.domain || ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <div className="text-[10px] text-gray-500">{b.collegeName || ''}</div>
                      <button
                        onClick={() => setBookingDetail(b)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
        </div>
      </div>
  {bookingDetail && <BookingDetail booking={bookingDetail} onClose={() => setBookingDetail(null)} />}
    </div>
  );
}

export default TrainerCalendar;
