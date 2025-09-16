import React, { useEffect, useState, useMemo, useRef } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, onSnapshot, query as fsQuery, where, orderBy, doc, deleteDoc } from "firebase/firestore";
import {
  FiX,
  FiDownload,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiAlertTriangle,
  FiLayers,
  FiMaximize2,
  FiMinimize2,
  FiTrash2,
} from "react-icons/fi";
import TrainerCalendarPDF from './TrainerCalendarPDF';
import TrainerCalendarExcel from './TrainerCalendarExcel';
import BookingDetail from './BookingDetail';

// TrainerCalendar
// Purpose: dashboard to view trainer bookings (booked dates, details).
// - Fetches `trainers` and `trainerAssignments` from Firestore.
// - Allows filtering by trainer, college, date range and searching by name/id.
// - Shows a simple month calendar with booked days highlighted and a side list of bookings.
// - Provides an export (CSV) button for selected trainer's bookings.

function formatDateISO(d) {
  if (!d) return "";
  try {
    if (typeof d === 'string') {
      // Assume YYYY-MM-DD local
      return d;
    }
    if (typeof d === 'object' && typeof d.toDate === 'function') {
      const dt = d.toDate();
      return dt.toLocaleDateString('en-CA');
    }
    if (d && typeof d.seconds === 'number') {
      const dt = new Date(d.seconds * 1000);
      return dt.toLocaleDateString('en-CA');
    }
    if (typeof d === 'number') {
      const dt = new Date(d);
      return dt.toLocaleDateString('en-CA');
    }
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString('en-CA');
  } catch {
    return "";
  }
}

function DateBookingsModal({ dateBookings, date, onClose, onBookingDetail }) {
  if (!dateBookings) return null;
  
  const dateObj = new Date(date + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-CA');
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`All bookings for ${formattedDate}`}
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40"
    >
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-5 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">All Bookings</h4>
            <p className="text-sm text-gray-500">{dayName}, {formattedDate}</p>
            <p className="text-xs text-gray-400 mt-1">{dateBookings.length} booking{dateBookings.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close bookings modal"
            className="text-gray-500 p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <FiX />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            {dateBookings.map((booking, index) => {
              const dd = String(booking.dayDuration || '').toUpperCase();
              return (
                <div key={booking.id || `${booking.trainerId}-${booking.dateISO}-${dd}-${index}`} 
                     className={`p-4 rounded-lg border ${booking._conflict ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'} hover:shadow-sm transition`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">{booking.batchCode || booking.domain || '—'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${dd.includes('AM') && dd.includes('PM') ? 'bg-blue-100 text-blue-700' : dd.includes('AM') ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {booking.dayDuration || '—'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {booking.trainerName || booking.trainerId} • {booking.collegeName || '—'}
                        {booking._conflict && <span className="ml-2 text-red-600 font-semibold">(Conflict)</span>}
                      </div>
                      {booking.sourceTrainingId && (
                        <div className="text-xs text-gray-500 mt-1">
                          Project Code: {booking.sourceTrainingId}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onBookingDetail) {
                          onBookingDetail(booking);
                        }
                      }}
                      className="shrink-0 p-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      aria-label="View booking details"
                    >
                      Info
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 text-right">
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
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month
  const [selectedCollege, setSelectedCollege] = useState("");
  const [bookingDetail, setBookingDetail] = useState(null);
  // Trainer search dropdown state
  const [trainerSearchOpen, setTrainerSearchOpen] = useState(false);
  const [trainerSearchValue, setTrainerSearchValue] = useState("");
  const [viewMode, setViewMode] = useState('month'); // month | week | day
  const [focusedDate, setFocusedDate] = useState(() => new Date());
  const [showAllPast, setShowAllPast] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(()=> new Set()); // dates that are collapsed
  const [showBookingsFull, setShowBookingsFull] = useState(false); // full-screen bookings overlay
  const [selectedDateBookings, setSelectedDateBookings] = useState(null); // for showing all bookings for a specific date
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  // Persistence key
  const PERSIST_KEY = 'trainerCalendarPrefs_v1';

  // Load persisted preferences once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw);
      if (prefs && typeof prefs === 'object') {
        if (prefs.selectedCollege) setSelectedCollege(prefs.selectedCollege);
        if (prefs.selectedTrainer) setSelectedTrainer(prefs.selectedTrainer);
        if (typeof prefs.showAllPast === 'boolean') setShowAllPast(prefs.showAllPast);
      }
    } catch (e) {
      console.warn('TrainerCalendar: load prefs failed', e);
    }
  }, []);

  // Persist on change (debounced minimal implementation)
  useEffect(() => {
    try {
      const data = { selectedCollege, selectedTrainer, showAllPast };
      localStorage.setItem(PERSIST_KEY, JSON.stringify(data));
  } catch { /* ignore persist error */ }
  }, [selectedCollege, selectedTrainer, showAllPast]);
  const modalRef = useRef(null);
  const previousActiveRef = useRef(null);
  const mainRef = useRef(null);



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

  // Sync trainer search value with selected trainer
  useEffect(() => {
    if (selectedTrainer && trainers.length > 0) {
      const selectedTrainerData = trainers.find(t => (t.trainerId || t.id) === selectedTrainer);
      if (selectedTrainerData) {
        const name = selectedTrainerData.name || selectedTrainerData.trainerName || selectedTrainer;
        setTrainerSearchValue(name);
      }
    } else if (!selectedTrainer) {
      setTrainerSearchValue('');
    }
  }, [selectedTrainer, trainers]);

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

  // Delete specific trainer assignment
  const deleteTrainerAssignment = async (assignment) => {
    if (!assignment || !assignment.id) {
      console.error('Invalid assignment for deletion');
      return;
    }

    try {
      const assignmentRef = doc(db, 'trainerAssignments', assignment.id);
      await deleteDoc(assignmentRef);
      console.log(`✅ Deleted trainer assignment: ${assignment.trainerName || assignment.trainerId} - ${assignment.date}`);
      
      // Refresh assignments by triggering a re-fetch
      setAssignments(prev => prev.filter(a => a.id !== assignment.id));
    } catch (error) {
      console.error('Error deleting trainer assignment:', error);
      alert('Failed to delete trainer assignment. Please try again.');
    }
  };

  const filteredTrainers = useMemo(() => {
    const q = trainerSearchValue.trim().toLowerCase();
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
  }, [trainers, trainerSearchValue]);
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

  // Conflict detection per half-day slot
  const bookingsWithConflicts = useMemo(() => {
    const slotCounts = {};
    const expand = (b) => {
      const dd = String(b.dayDuration || '').toUpperCase();
      if (dd.includes('AM') && dd.includes('PM')) return ['AM','PM'];
      if (dd.includes('AM')) return ['AM'];
      if (dd.includes('PM')) return ['PM'];
      return ['AM','PM'];
    };
    bookings.forEach(b => {
      const slots = expand(b);
      slots.forEach(s => {
        const key = `${b.trainerId}-${b.dateISO}-${s}`;
        slotCounts[key] = (slotCounts[key] || 0) + 1;
      });
    });
    return bookings.map(b => {
      const hasConflict = expand(b).some(s => (slotCounts[`${b.trainerId}-${b.dateISO}-${s}`] || 0) > 1);
      return { ...b, _conflict: hasConflict };
    });
  }, [bookings]);

  // Group bookings by date for redesigned list
  const groupedBookings = useMemo(() => {
    if (!bookingsWithConflicts.length) return [];
    const map = new Map();
    bookingsWithConflicts.forEach(b => {
      const date = b.dateISO;
      if (!date) return;
      if (!map.has(date)) map.set(date, []);
      map.get(date).push(b);
    });
    // sort dates ascending (oldest first) then we'll manage past collapsing
    const todayISO = formatDateISO(new Date());
    const out = Array.from(map.entries())
      .sort((a,b)=> a[0].localeCompare(b[0]))
      .map(([date, list]) => {
        list.sort((a,b)=> (a.dayDuration||'').localeCompare(b.dayDuration||''));
        const anyConflict = list.some(l=> l._conflict);
        // date label formatting
        let label = date;
        if (date === todayISO) label = 'Today';
        else {
          const tomorrow = formatDateISO(new Date(Date.now()+86400000));
            if (date === tomorrow) label = 'Tomorrow';
        }
        const isPast = new Date(date + 'T00:00:00') < new Date(new Date().toDateString());
        return { date, label, bookings: list, anyConflict, isPast };
      });
    return out;
  }, [bookingsWithConflicts]);

  const filteredGroupedBookings = useMemo(() => {
    return groupedBookings.map(g => ({
      ...g,
      bookings: g.bookings
    })).filter(g => g.bookings.length > 0);
  }, [groupedBookings]);

  // Toggle a grouped date section collapsed/expanded
  const toggleGroup = (date) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };
  const collapseAll = () => {
    setCollapsedGroups(new Set(filteredGroupedBookings.map(g=> g.date)));
  };
  const expandAll = () => setCollapsedGroups(new Set());

  // Close date bookings modal on Escape
  useEffect(() => {
    if (!selectedDateBookings) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setSelectedDateBookings(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selectedDateBookings]);

  // Utilization (% half-day slots booked / total in month)
  const utilizationByTrainer = useMemo(() => {
    const base = new Date();
    const monthRef = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
    const totalHalfSlots = new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 0).getDate() * 2;
    const used = {};
    bookingsWithConflicts.forEach(b => {
      const dd = String(b.dayDuration || '').toUpperCase();
      let count = 2;
      if (dd.includes('AM') && !dd.includes('PM')) count = 1;
      else if (dd.includes('PM') && !dd.includes('AM')) count = 1;
      used[b.trainerId] = (used[b.trainerId] || 0) + count;
    });
    const out = {};
    Object.keys(used).forEach(t => out[t] = Math.min(100, Math.round(used[t] / totalHalfSlots * 100)));
    return out;
  }, [bookingsWithConflicts, monthOffset]);

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
    bookingsWithConflicts.forEach((b) => {
      const key = formatDateISO(b.dateISO);
      if (!key) return;
      map[key] = map[key] || [];
      map[key].push(b);
    });
    return map;
  }, [bookingsWithConflicts]);



  const outerWrapperClass = embedded
    ? 'w-full'
    : 'fixed inset-0 z-54 flex items-stretch justify-center p-0 md:p-6 bg-black/30 backdrop-blur-sm overflow-y-auto';
  const containerClass = embedded
    ? 'w-full bg-white rounded-xl shadow-sm ring-1 ring-gray-200 flex flex-col'
    : 'w-full max-w-7xl bg-white rounded-none md:rounded-2xl shadow-2xl ring-1 ring-gray-200 flex flex-col max-h-none min-h-full md:min-h-[0]';

  // Derived helpers for alternate views
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return [];
    const base = new Date(focusedDate);
    const dow = base.getDay(); // 0=Sun
    const start = new Date(base);
    start.setDate(base.getDate() - dow);
    return Array.from({length:7}, (_,i) => new Date(start.getFullYear(), start.getMonth(), start.getDate()+i));
  }, [viewMode, focusedDate]);

  const dayBookings = useMemo(() => {
    if (viewMode !== 'day') return [];
    const iso = formatDateISO(focusedDate);
    return bookingsByDate[iso] || [];
  }, [viewMode, focusedDate, bookingsByDate]);

  const ViewToggle = () => (
    <div className="inline-flex items-center rounded-lg border border-gray-200 overflow-hidden text-xs">
      {['month','week','day'].map(v => (
        <button key={v} onClick={()=> { setViewMode(v); if (v==='day') setFocusedDate(new Date()); }} className={`px-2.5 py-1.5 font-medium ${viewMode===v ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
      ))}
    </div>
  );

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
            <ViewToggle />
            {embedded && (
              <button
                type="button"
                onClick={() => { if (onBack) onBack(); }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Back
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                disabled={bookingsWithConflicts.length === 0}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-200 ${
                  bookingsWithConflicts.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                <FiDownload className="w-4 h-4" />
                Export
                <FiChevronDown className={`w-3 h-3 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {exportDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setExportDropdownOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      <TrainerCalendarPDF 
                        bookings={bookingsWithConflicts} 
                        selectedTrainer={selectedTrainer} 
                        selectedCollege={selectedCollege} 
                        disabled={false}
                        asDropdownItem={true}
                        onClick={() => setExportDropdownOpen(false)}
                      />
                      <TrainerCalendarExcel 
                        bookings={bookingsWithConflicts} 
                        selectedTrainer={selectedTrainer} 
                        disabled={false}
                        asDropdownItem={true}
                        onClick={() => setExportDropdownOpen(false)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
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
            <div className="bg-white border border-gray-100 rounded-lg p-3 text-sm text-gray-600">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-gray-900">Filters</div>
                <button onClick={() => { setSelectedTrainer(''); setSelectedCollege(''); setTrainerSearchValue(''); }} className="text-xs text-indigo-600">Reset</button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Trainer</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={trainerSearchValue}
                      onChange={(e) => {
                        setTrainerSearchValue(e.target.value);
                        setTrainerSearchOpen(true);
                      }}
                      onFocus={() => setTrainerSearchOpen(true)}
                      onBlur={() => setTimeout(() => setTrainerSearchOpen(false), 200)}
                      placeholder="Search trainers..."
                      className="w-full mt-1 rounded-md border border-gray-200 text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {trainerSearchOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSelectedTrainer('');
                            setTrainerSearchValue('');
                            setTrainerSearchOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                        >
                          All trainers
                        </button>
                        {filteredTrainers.map((t) => {
                          const id = t.trainerId || t.id;
                          const name = t.name || t.trainerName || id;
                          const util = utilizationByTrainer[id];
                          return (
                            <button
                              key={id}
                              onClick={() => {
                                setSelectedTrainer(id);
                                setTrainerSearchValue(name);
                                setTrainerSearchOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                            >
                              {name} {util != null ? `(${util}%)` : ''}
                            </button>
                          );
                        })}
                        {filteredTrainers.length === 0 && trainerSearchValue && (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            No trainers found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">College</label>
                  <select 
                    value={selectedCollege} 
                    onChange={(e) => setSelectedCollege(e.target.value)} 
                    className="w-full mt-1 rounded-md border border-gray-200 text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All colleges</option>
                    {colleges.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </aside>

          <main ref={mainRef} data-main-content className="md:col-span-3 lg:col-span-4 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="text-sm text-gray-700 font-medium flex items-center gap-2">
                {viewMode === 'month' && monthLabel}
                {viewMode === 'week' && <>Week of {weekDays[0] && formatDateISO(weekDays[0])}</>}
                {viewMode === 'day' && formatDateISO(focusedDate)}
                {viewMode === 'day' && (
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => setFocusedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()-1))} className="p-1 rounded hover:bg-gray-100" aria-label="Previous day"><FiChevronLeft /></button>
                    <button onClick={() => setFocusedDate(new Date())} className="px-2 py-0.5 rounded border text-xs" aria-label="Today">Today</button>
                    <button onClick={() => setFocusedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()+1))} className="p-1 rounded hover:bg-gray-100" aria-label="Next day"><FiChevronRight /></button>
                  </div>
                )}
              </div>
              {viewMode !== 'day' && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button onClick={() => { if (viewMode==='month') setMonthOffset(m=>m-1); else setFocusedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()-7)); }} aria-label="Previous" className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"><FiChevronLeft /></button>
                  <button onClick={() => { if (viewMode==='month') setMonthOffset(0); else setFocusedDate(new Date()); }} aria-label="Current" className="px-3 py-1 text-sm rounded-md bg-gray-50 border border-gray-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">Today</button>
                  <button onClick={() => { if (viewMode==='month') setMonthOffset(m=>m+1); else setFocusedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()+7)); }} aria-label="Next" className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"><FiChevronRight /></button>
                </div>
              )}
            </div>
            {viewMode === 'month' && (
              <>
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
                    const hasConflict = dayBookings.some(b => b._conflict);
                    return (
                      <div key={iso} className={`relative h-16 sm:h-20 xl:h-24 border ${hasConflict ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-100'} rounded-lg p-1.5 sm:p-2 flex flex-col justify-between text-[11px] sm:text-sm bg-white hover:shadow-sm transition`}> 
                        <div className="flex items-start justify-between">
                          <button onClick={() => dayBookings[0] && setBookingDetail(dayBookings[0])} className="font-medium text-gray-900 text-xs sm:text-sm leading-none focus:outline-none">{dt.getDate()}</button>
                          <div className="flex items-center gap-1">
                            {hasConflict && <FiAlertTriangle className="text-red-500 w-3.5 h-3.5" title="Conflict" />}
                            <div className="text-[10px] sm:text-xs text-gray-500 leading-none">{dayBookings.length}</div>
                          </div>
                        </div>
                        <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-600 overflow-y-auto max-h-12 sm:max-h-16 space-y-1 pr-0.5">
                          {dayBookings.slice(0,3).map((b,i)=>(
                            <div key={i} className="flex items-start justify-between gap-1">
                              <div className="truncate leading-tight">
                                <div className="font-medium text-gray-800 truncate max-w-[60px] sm:max-w-[80px]">{b.trainerName || b.trainerId}</div>
                                <div className={`text-[9px] sm:text-[10px] truncate ${b._conflict ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{b.dayDuration} • {b.batchCode || b.domain || ''}</div>
                              </div>
                              <button onClick={(ev)=> { ev.stopPropagation(); setBookingDetail(b); }} className="shrink-0 text-[10px] sm:text-xs text-indigo-600 hover:text-indigo-700 focus:outline-none">Info</button>
                            </div>
                          ))}
                          {dayBookings.length > 3 && (
                            <button 
                              onClick={() => setSelectedDateBookings({ date: iso, bookings: dayBookings })}
                              className="text-[9px] sm:text-[10px] text-indigo-600 hover:text-indigo-700 hover:underline focus:outline-none focus:underline"
                              aria-label={`View all ${dayBookings.length} bookings for ${iso}`}
                            >
                              +{dayBookings.length - 3} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {viewMode === 'week' && (
              <div className="mt-2 border border-gray-100 rounded-lg overflow-hidden">
                <div className="grid grid-cols-7 bg-gray-50 text-[11px] sm:text-xs font-medium text-gray-600">
                  {weekDays.map(d => <div key={d.toISOString()} className="px-2 py-1 border-r last:border-r-0 border-gray-100">{d.toLocaleDateString(undefined,{weekday:'short'})}<div className="text-[10px] text-gray-400">{d.getDate()}</div></div>)}
                </div>
                <div className="grid grid-cols-7 text-[11px] sm:text-xs min-h-[140px]">
                  {weekDays.map(d => {
                    const iso = formatDateISO(d);
                    const dayBookings = bookingsByDate[iso] || [];
                    const hasConflict = dayBookings.some(b=> b._conflict);
                    return (
                      <div key={iso} className={`relative border-r last:border-r-0 border-t border-gray-100 p-1.5 ${hasConflict ? 'bg-red-50/60' : 'bg-white'} hover:bg-indigo-50/30 transition`}> 
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {dayBookings.map((b,i)=>(
                            <button key={i} onClick={()=> setBookingDetail(b)} className={`w-full text-left px-1 py-0.5 rounded border ${b._conflict ? 'border-red-300 bg-red-100/70 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-700'} hover:shadow-sm`}>{b.dayDuration} • {(b.batchCode || b.domain || '')}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {viewMode === 'day' && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-800 flex items-center gap-2"><FiLayers /> Day View</div>
                </div>
                <div className="space-y-2">
                  {dayBookings.length === 0 && <div className="p-4 border border-dashed border-gray-300 rounded text-sm text-gray-500">No bookings.</div>}
                  {dayBookings.map((b,i)=>(
                    <div key={i} className={`p-3 rounded-lg border ${b._conflict ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'} flex items-start justify-between`}>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{b.dayDuration} • {(b.batchCode || b.domain || '')}</div>
                        <div className="text-xs text-gray-500">{b.trainerName || b.trainerId} {b._conflict && <span className="text-red-600 font-semibold ml-1">Conflict</span>}</div>
                      </div>
                      <button onClick={()=> setBookingDetail(b)} className="text-indigo-600 text-xs hover:underline">Details</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">Bookings
                  {bookingsWithConflicts.some(b=> b._conflict) && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700"><FiAlertTriangle className="w-3 h-3"/>Conflicts</span>}
                </h4>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowBookingsFull(true)} className="text-indigo-600 hover:underline">Full Screen</button>
                  <span className="text-gray-300">|</span>
                  {collapsedGroups.size === 0 ? (
                    <button onClick={collapseAll} className="text-indigo-600 hover:underline">Collapse All</button>
                  ) : collapsedGroups.size === filteredGroupedBookings.length ? (
                    <button onClick={expandAll} className="text-indigo-600 hover:underline">Expand All</button>
                  ) : (
                    <>
                      <button onClick={expandAll} className="text-indigo-600 hover:underline">Expand All</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={collapseAll} className="text-indigo-600 hover:underline">Collapse All</button>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-gray-500 flex flex-wrap items-center gap-3">
                <span>Total: <span className="font-semibold text-gray-700">{bookingsWithConflicts.length}</span></span>
                <span>Visible: <span className="font-semibold text-gray-700">{filteredGroupedBookings.reduce((a,g)=> a+g.bookings.length,0)}</span></span>
                {bookingsWithConflicts.some(b=> b._conflict) && <span>Conflicts: <span className="font-semibold text-red-600">{bookingsWithConflicts.filter(b=> b._conflict).length}</span></span>}
              </div>
              <div className="mt-3 relative max-h-48 xl:max-h-64 overflow-y-auto pr-1 rounded-lg border border-gray-100 bg-white/50">
                {filteredGroupedBookings.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No bookings match the current filters.
                  </div>
                )}
                <ul className="divide-y divide-gray-100">
                  {filteredGroupedBookings
                    .filter(g => showAllPast || !g.isPast || g.date === formatDateISO(new Date()))
                    .map(g => (
                    <li key={g.date} className="bg-white">
                      <button
                        type="button"
                        onClick={()=> toggleGroup(g.date)}
                        className={`sticky top-0 z-10 w-full flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-gray-50 to-white border-l-4 ${g.anyConflict ? 'border-red-400' : 'border-indigo-300'} text-xs font-semibold text-gray-700 backdrop-blur cursor-pointer group focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        aria-expanded={!collapsedGroups.has(g.date)}
                        aria-controls={`group-${g.date}`}
                      >
                        <div className="flex items-center gap-2">
                          <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedGroups.has(g.date) ? '-rotate-90' : 'rotate-0'} text-gray-500 group-hover:text-gray-700`} />
                          <span>{g.label}</span>
                          <span className="text-[10px] font-normal text-gray-400">{g.date}</span>
                          {g.anyConflict && <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600"><FiAlertTriangle className="w-3 h-3"/>Conflict</span>}
                        </div>
                        <span className="text-[10px] font-medium text-gray-500">{g.bookings.length}</span>
                      </button>
                      {!collapsedGroups.has(g.date) && (
                      <div id={`group-${g.date}`} className="px-3 py-2 space-y-2">
                        {g.bookings.map(b => {
                          const dd = String(b.dayDuration||'').toUpperCase();
                          // deleteBooking removed (safety)
                          return (
                            <div key={b.id || `${b.trainerId}-${b.dateISO}-${dd}`} className={`group relative p-3 rounded-md border ${b._conflict ? 'border-red-300 bg-red-50/60' : 'border-gray-200 bg-white'} hover:shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition`}> 
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 text-sm truncate max-w-[120px]">{b.batchCode || b.domain || '—'}</span>
                                  </div>
                                  <div className="mt-0.5 text-[11px] text-gray-500 truncate">
                                    {b.trainerName || b.trainerId} • {b.collegeName || '—'} {b._conflict && <span className="ml-1 text-red-600 font-semibold">(Conflict)</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBookingDetail(b);
                                    }} 
                                    aria-label="View booking details" 
                                    className="p-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                  >
                                    Info
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`Delete trainer assignment for ${b.trainerName || b.trainerId} on ${b.dateISO}? This action cannot be undone.`)) {
                                        deleteTrainerAssignment(b);
                                      }
                                    }} 
                                    aria-label="Delete trainer assignment" 
                                    className="p-2 rounded-md bg-red-600 text-white hover:bg-red-700 text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                  >
                                    <FiTrash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      )}
                    </li>
                  ))}
                </ul>
                {!showAllPast && groupedBookings.some(g=> g.isPast) && (
                  <div className="sticky bottom-0 bg-gradient-to-t from-white to-white/70 p-2 text-center">
                    <button onClick={()=> setShowAllPast(true)} className="text-[11px] text-indigo-600 hover:underline">Show older bookings</button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
        </div>
      </div>
  {bookingDetail && <BookingDetail booking={bookingDetail} onClose={() => setBookingDetail(null)} />}
  {selectedDateBookings && (
    <DateBookingsModal 
      dateBookings={selectedDateBookings.bookings} 
      date={selectedDateBookings.date} 
      onClose={() => setSelectedDateBookings(null)}
      onBookingDetail={setBookingDetail}
    />
  )}
  {showBookingsFull && (
    <div role="dialog" aria-modal="true" aria-label="All bookings" className="fixed inset-0 z-[80] flex flex-col bg-white/90 backdrop-blur-md animate-fadeIn">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <FiCalendar className="text-indigo-600 w-5 h-5" />
          <h3 className="text-base font-semibold text-gray-900">All Bookings</h3>
          {bookingsWithConflicts.some(b=> b._conflict) && <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700"><FiAlertTriangle className="w-3 h-3"/>Conflicts</span>}
        </div>
        <div className="flex items-center gap-2">
          {collapsedGroups.size === 0 ? (
            <button onClick={collapseAll} className="text-xs text-indigo-600 hover:underline">Collapse All</button>
          ) : collapsedGroups.size === filteredGroupedBookings.length ? (
            <button onClick={expandAll} className="text-xs text-indigo-600 hover:underline">Expand All</button>
          ) : (
            <>
              <button onClick={expandAll} className="text-xs text-indigo-600 hover:underline">Expand All</button>
              <button onClick={collapseAll} className="text-xs text-indigo-600 hover:underline">Collapse All</button>
            </>
          )}
          <button
            onClick={() => setShowBookingsFull(false)}
            aria-label="Close full bookings"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 bg-white hover:bg-gray-50"
          >
            <FiMinimize2 className="w-4 h-4" /> Close
          </button>
        </div>
      </div>
      <div className="px-4 py-2 text-[12px] text-gray-600 flex flex-wrap items-center gap-4 bg-white/70 border-b border-gray-100">
        <span>Total: <span className="font-semibold text-gray-800">{bookingsWithConflicts.length}</span></span>
        <span>Visible: <span className="font-semibold text-gray-800">{filteredGroupedBookings.reduce((a,g)=> a+g.bookings.length,0)}</span></span>
        {bookingsWithConflicts.some(b=> b._conflict) && <span>Conflicts: <span className="font-semibold text-red-600">{bookingsWithConflicts.filter(b=> b._conflict).length}</span></span>}
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-100">
          {filteredGroupedBookings
            .filter(g => showAllPast || !g.isPast || g.date === formatDateISO(new Date()))
            .map(g => (
            <li key={g.date} className="bg-white">
              <button
                type="button"
                onClick={()=> toggleGroup(g.date)}
                className={`sticky top-0 w-full flex items-center justify-between px-4 py-2 bg-gradient-to-r from-gray-50 to-white border-l-4 ${g.anyConflict ? 'border-red-400' : 'border-indigo-300'} text-xs sm:text-[13px] font-semibold text-gray-700 backdrop-blur cursor-pointer group`}
                aria-expanded={!collapsedGroups.has(g.date)}
                aria-controls={`full-group-${g.date}`}
              >
                <div className="flex items-center gap-2">
                  <FiChevronDown className={`w-4 h-4 transition-transform ${collapsedGroups.has(g.date) ? '-rotate-90' : 'rotate-0'} text-gray-500 group-hover:text-gray-700`} />
                  <span>{g.label}</span>
                  <span className="text-[10px] font-normal text-gray-400">{g.date}</span>
                  {g.anyConflict && <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600"><FiAlertTriangle className="w-3 h-3"/>Conflict</span>}
                </div>
                <span className="text-[10px] font-medium text-gray-500">{g.bookings.length}</span>
              </button>
              {!collapsedGroups.has(g.date) && (
                <div id={`full-group-${g.date}`} className="px-4 py-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 animate-fadeIn">
                  {g.bookings.map(b => {
                    const dd = String(b.dayDuration||'').toUpperCase();
                    // deleteBooking removed (safety)
                    return (
                      <div key={b.id || `${b.trainerId}-${b.dateISO}-${dd}`} className={`group relative p-4 rounded-md border ${b._conflict ? 'border-red-300 bg-red-50/60' : 'border-gray-200 bg-white'} hover:shadow-sm transition`}> 
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-gray-900 text-sm truncate max-w-[140px]">{b.batchCode || b.domain || '—'}</span>
                            </div>
                            <div className="text-[11px] text-gray-500 truncate">
                              {b.trainerName || b.trainerId} • {b.collegeName || '—'} {b._conflict && <span className="ml-1 text-red-600 font-semibold">(Conflict)</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setBookingDetail(b);
                              }} 
                              aria-label="View booking details" 
                              className="p-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                              Info
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete trainer assignment for ${b.trainerName || b.trainerId} on ${b.dateISO}? This action cannot be undone.`)) {
                                  deleteTrainerAssignment(b);
                                }
                              }} 
                              aria-label="Delete trainer assignment" 
                              className="p-2 rounded-md bg-red-600 text-white hover:bg-red-700 text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                              <FiTrash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          ))}
        </ul>
        {!showAllPast && groupedBookings.some(g=> g.isPast) && (
          <div className="sticky bottom-0 bg-gradient-to-t from-white to-white/70 p-2 text-center border-t border-gray-100">
            <button onClick={()=> setShowAllPast(true)} className="text-[11px] text-indigo-600 hover:underline">Show older bookings</button>
          </div>
        )}
      </div>
    </div>
  )}
    </div>
  );
}

export default TrainerCalendar;

// Lightweight animations (scoped globally once loaded)
if (typeof document !== 'undefined' && !document.getElementById('trainer-calendar-anim-styles')) {
  const style = document.createElement('style');
  style.id = 'trainer-calendar-anim-styles';
  style.innerHTML = `@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes popIn{0%{opacity:0;transform:translateY(4px) scale(.96)}60%{opacity:1;transform:translateY(-1px) scale(1.01)}100%{opacity:1;transform:translateY(0) scale(1)}}.animate-fadeIn{animation:fadeIn .18s ease-out}.animate-scaleIn{animation:scaleIn .18s ease-out}.animate-popIn{animation:popIn .22s cubic-bezier(.4,.6,.3,1)}}`;
  document.head.appendChild(style);
}
