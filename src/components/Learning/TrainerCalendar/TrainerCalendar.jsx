import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, onSnapshot, query as fsQuery, where, orderBy, addDoc } from "firebase/firestore";
import {
  FiX,
  FiDownload,
  FiCalendar,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiAlertTriangle,
  FiPlus,
  FiClock,
  FiLayers,
  FiFilter,
  FiMaximize2,
  FiMinimize2,
} from "react-icons/fi";
// delete functionality removed for safety; deleteDoc/doc intentionally not imported

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
  // Enhancements
  const [viewMode, setViewMode] = useState('month'); // month | week | day
  const [focusedDate, setFocusedDate] = useState(() => new Date());
  const [showQuickBooking, setShowQuickBooking] = useState(false);
  const [quickBookingDate, setQuickBookingDate] = useState('');
  const [quickBookingSlot, setQuickBookingSlot] = useState('AM');
  const [quickBookingTrainer, setQuickBookingTrainer] = useState('');
  const [quickCreating, setQuickCreating] = useState(false);
  const [quickError, setQuickError] = useState('');
  const [showFreeSlots, setShowFreeSlots] = useState(false);
  const [slotFilters, setSlotFilters] = useState({ AM: true, PM: true, FULL: true }); // FULL maps to AM & PM
  const [showAllPast, setShowAllPast] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(()=> new Set()); // dates that are collapsed
  const [showBookingsFull, setShowBookingsFull] = useState(false); // full-screen bookings overlay
  const [showSlotMenu, setShowSlotMenu] = useState(false); // dropdown for slot filters (main toolbar)
  const [showSlotMenuFull, setShowSlotMenuFull] = useState(false); // dropdown for slot filters (full-screen toolbar)
  const slotMenuRef = useRef(null);
  const slotMenuFullRef = useRef(null);
  const firstSlotCheckRef = useRef(null);
  const firstSlotCheckFullRef = useRef(null);
  // Persistence key
  const PERSIST_KEY = 'trainerCalendarPrefs_v1';

  // Load persisted preferences once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw);
      if (prefs && typeof prefs === 'object') {
        if (prefs.slotFilters) setSlotFilters(f => ({...f, ...prefs.slotFilters}));
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
      const data = { slotFilters, selectedCollege, selectedTrainer, showAllPast };
      localStorage.setItem(PERSIST_KEY, JSON.stringify(data));
  } catch { /* ignore persist error */ }
  }, [slotFilters, selectedCollege, selectedTrainer, showAllPast]);
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

  // Close slot filter dropdowns on outside click / Escape + focus management
  useEffect(() => {
    const handler = (e) => {
      if (showSlotMenu && slotMenuRef.current && !slotMenuRef.current.contains(e.target)) setShowSlotMenu(false);
      if (showSlotMenuFull && slotMenuFullRef.current && !slotMenuFullRef.current.contains(e.target)) setShowSlotMenuFull(false);
    };
    const keyHandler = (e) => {
      if (e.key === 'Escape') { setShowSlotMenu(false); setShowSlotMenuFull(false); }
      if (e.key === 'Tab') {
        // trap focus while menu open (simple containment)
        if (showSlotMenu && slotMenuRef.current && !slotMenuRef.current.contains(document.activeElement)) {
          firstSlotCheckRef.current && firstSlotCheckRef.current.focus();
        }
        if (showSlotMenuFull && slotMenuFullRef.current && !slotMenuFullRef.current.contains(document.activeElement)) {
          firstSlotCheckFullRef.current && firstSlotCheckFullRef.current.focus();
        }
      }
    };
    document.addEventListener('pointerdown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => { document.removeEventListener('pointerdown', handler); document.removeEventListener('keydown', keyHandler); };
  }, [showSlotMenu, showSlotMenuFull]);

  // Autofocus first checkbox when menu opens
  useEffect(() => { if (showSlotMenu && firstSlotCheckRef.current) firstSlotCheckRef.current.focus(); }, [showSlotMenu]);
  useEffect(() => { if (showSlotMenuFull && firstSlotCheckFullRef.current) firstSlotCheckFullRef.current.focus(); }, [showSlotMenuFull]);

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
        const isPast = date < todayISO;
        return { date, label, bookings: list, anyConflict, isPast };
      });
    return out;
  }, [bookingsWithConflicts]);

  const filteredGroupedBookings = useMemo(() => {
    const matchSlot = (b) => {
      const dd = String(b.dayDuration||'').toUpperCase();
      const isFull = dd.includes('AM') && dd.includes('PM');
      if (isFull) return slotFilters.FULL;
      if (dd.includes('AM') && !dd.includes('PM')) return slotFilters.AM;
      if (dd.includes('PM') && !dd.includes('AM')) return slotFilters.PM;
      // fallback treat unknown as full
      return slotFilters.FULL;
    };
    return groupedBookings.map(g => ({
      ...g,
      bookings: g.bookings.filter(matchSlot)
    })).filter(g => g.bookings.length > 0);
  }, [groupedBookings, slotFilters]);

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

  // Close full bookings on Escape
  useEffect(() => {
    if (!showBookingsFull) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setShowBookingsFull(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showBookingsFull]);

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

  // Helper to get taken half-day slots for a trainer and date
  const getTakenSlots = useCallback((trainerId, isoDate) => {
    const taken = new Set();
    bookingsWithConflicts.forEach(b => {
      if (b.trainerId !== trainerId) return;
      if (b.dateISO !== isoDate) return;
      const dd = String(b.dayDuration || '').toUpperCase();
      if (dd.includes('AM')) taken.add('AM');
      if (dd.includes('PM')) taken.add('PM');
      if (!dd.includes('AM') && !dd.includes('PM')) { taken.add('AM'); taken.add('PM'); }
    });
    return taken;
  }, [bookingsWithConflicts]);

  // Free slot finder (next 5 half-day slots across 90 days)
  const freeSlots = useMemo(() => {
    if (!selectedTrainer) return [];
    const res = [];
    const start = new Date();
    start.setDate(start.getDate() + 1);
    for (let i=0; i<90 && res.length < 5; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const iso = formatDateISO(d);
      const taken = getTakenSlots(selectedTrainer, iso);
      if (!taken.has('AM')) res.push({ date: iso, slot: 'AM' });
      if (res.length >= 5) break;
      if (!taken.has('PM')) res.push({ date: iso, slot: 'PM' });
    }
    return res.slice(0,5);
  }, [selectedTrainer, getTakenSlots]);

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

  const exportCSV = () => {
    const rows = bookingsWithConflicts.map((b) => ({
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
    a.download = `trainer-bookings-${selectedTrainer || 'all'}-${viewMode}.csv`;
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

  const openQuickBooking = (dateObj, presetSlot=null) => {
    const iso = typeof dateObj === 'string' ? dateObj : formatDateISO(dateObj);
    setQuickBookingDate(iso);
    if (presetSlot) setQuickBookingSlot(presetSlot);
    setQuickBookingTrainer(selectedTrainer || '');
    setShowQuickBooking(true);
  };

  const QuickBookingModal = () => {
    if (!showQuickBooking) return null;
    const needsTrainerSelect = !selectedTrainer && !quickBookingTrainer;
    const submit = async (e) => {
      e.preventDefault();
      setQuickError('');
      const trainerId = selectedTrainer || quickBookingTrainer;
      if (!trainerId) { setQuickError('Trainer required'); return; }
      if (!quickBookingDate) { setQuickError('Date required'); return; }
      try {
        setQuickCreating(true);
        const taken = getTakenSlots(trainerId, quickBookingDate);
        if (quickBookingSlot === 'AM & PM') {
          if (taken.has('AM') || taken.has('PM')) throw new Error('Slot conflict');
        } else if (taken.has(quickBookingSlot)) {
          throw new Error('Slot conflict');
        }
        await addDoc(collection(db,'trainerAssignments'), {
          trainerId,
          date: quickBookingDate,
          dayDuration: quickBookingSlot,
          createdAt: Date.now(),
        });
        setShowQuickBooking(false);
      } catch (err) {
        console.error('quick booking create failed', err);
        setQuickError(err.message || 'Create failed');
      } finally {
        setQuickCreating(false);
      }
    };
    return (
      <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-5 relative animate-scaleIn">
          <button onClick={()=> setShowQuickBooking(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"><FiX /></button>
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2"><FiPlus />Quick Booking</h3>
          <form onSubmit={submit} className="mt-4 space-y-3 text-sm">
            <div>
              <label className="text-xs text-gray-500">Date</label>
              <input type="date" value={quickBookingDate} onChange={e=> setQuickBookingDate(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-md p-2" required />
            </div>
            {needsTrainerSelect && (
              <div>
                <label className="text-xs text-gray-500">Trainer</label>
                <select value={quickBookingTrainer} onChange={e=> setQuickBookingTrainer(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-md p-2" required>
                  <option value="">Select trainer</option>
                  {trainers.map(t => <option key={t.id} value={t.trainerId || t.id}>{t.name || t.trainerName || t.trainerId}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500">Slot</label>
              <select value={quickBookingSlot} onChange={e=> setQuickBookingSlot(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-md p-2">
                <option>AM</option>
                <option>PM</option>
                <option>AM & PM</option>
              </select>
            </div>
            {quickError && <div className="text-xs text-red-600">{quickError}</div>}
            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={()=> setShowQuickBooking(false)} className="px-3 py-1.5 rounded-md border border-gray-200 text-sm">Cancel</button>
              <button type="submit" disabled={quickCreating} className={`px-3 py-1.5 rounded-md text-sm text-white ${quickCreating ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{quickCreating ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const FreeSlotsPanel = () => {
    if (!showFreeSlots || !selectedTrainer) return null;
    return (
      <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-40 text-xs">
        <div className="font-medium text-gray-800 mb-2 flex items-center gap-1"><FiClock className="w-4 h-4"/>Next Free Slots</div>
        {freeSlots.length === 0 && <div className="text-gray-500">No free slots (90d)</div>}
        <ul className="space-y-1">
          {freeSlots.map((s,i)=>(
            <li key={i} className="flex items-center justify-between">
              <span>{s.date} • {s.slot}</span>
              <button onClick={()=> openQuickBooking(s.date, s.slot)} className="text-indigo-600 hover:underline">Book</button>
            </li>
          ))}
        </ul>
        <div className="pt-2 text-right">
          <button onClick={()=> setShowFreeSlots(false)} className="text-gray-500 hover:text-gray-700">Close</button>
        </div>
      </div>
    );
  };

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
            <div className="relative">
              <button
                type="button"
                disabled={!selectedTrainer}
                onClick={()=> setShowFreeSlots(s => !s)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border ${selectedTrainer ? 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700' : 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                <FiClock className="w-4 h-4" />
                Free Slots
              </button>
              <FreeSlotsPanel />
            </div>
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
            <button
              disabled={bookingsWithConflicts.length === 0}
              onClick={exportCSV}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${bookingsWithConflicts.length === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
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

    <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-2 max-h-[520px] overflow-y-auto">
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
      const util = utilizationByTrainer[t.trainerId || t.id];
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
        <div className="text-sm font-medium text-gray-900 flex items-center gap-1">{t.name || t.trainerName || id}{util != null && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{util}%</span>}</div>
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
                    const takenSet = selectedTrainer ? getTakenSlots(selectedTrainer, iso) : new Set();
                    const freeHalf = selectedTrainer ? ['AM','PM'].filter(s => !takenSet.has(s)) : [];
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
                          {dayBookings.length > 3 && <div className="text-[9px] sm:text-[10px] text-gray-400">+{dayBookings.length - 3} more</div>}
                        </div>
                        {selectedTrainer && freeHalf.length > 0 && (
                          <div className="absolute bottom-1 right-1 flex gap-1">
                            <button onClick={()=> openQuickBooking(dt, freeHalf.length === 1 ? freeHalf[0] : 'AM')} className="p-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow focus:outline-none" title={`Add booking (${freeHalf.join('/')})`}><FiPlus className="w-3.5 h-3.5"/></button>
                          </div>
                        )}
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
                    const takenSet = selectedTrainer ? getTakenSlots(selectedTrainer, iso) : new Set();
                    const freeHalf = selectedTrainer ? ['AM','PM'].filter(s=> !takenSet.has(s)) : [];
                    return (
                      <div key={iso} className={`relative border-r last:border-r-0 border-t border-gray-100 p-1.5 ${hasConflict ? 'bg-red-50/60' : 'bg-white'} hover:bg-indigo-50/30 transition`}> 
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {dayBookings.map((b,i)=>(
                            <button key={i} onClick={()=> setBookingDetail(b)} className={`w-full text-left px-1 py-0.5 rounded border ${b._conflict ? 'border-red-300 bg-red-100/70 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-700'} hover:shadow-sm`}>{b.dayDuration} • {(b.batchCode || b.domain || '')}</button>
                          ))}
                        </div>
                        {selectedTrainer && freeHalf.length>0 && (
                          <button onClick={()=> openQuickBooking(d, freeHalf.length===1 ? freeHalf[0] : 'AM')} className="absolute top-1 right-1 p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" aria-label="Add booking"><FiPlus className="w-3 h-3"/></button>
                        )}
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
                  <div className="flex gap-2">
                    {['AM','PM'].map(slot => {
                      const iso = formatDateISO(focusedDate);
                      const taken = selectedTrainer ? getTakenSlots(selectedTrainer, iso) : new Set();
                      const isFree = selectedTrainer && !taken.has(slot);
                      return (
                        <button key={slot} disabled={!isFree} onClick={()=> openQuickBooking(focusedDate, slot)} className={`px-2 py-1 rounded text-xs border ${isFree ? 'border-indigo-200 text-indigo-600 hover:bg-indigo-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}>{slot} {isFree ? '+' : ''}</button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  {dayBookings.length === 0 && <div className="p-4 border border-dashed border-gray-300 rounded text-sm text-gray-500">No bookings. {selectedTrainer && <button onClick={()=> openQuickBooking(focusedDate,'AM')} className="text-indigo-600 underline ml-1">Add one</button>}</div>}
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
                  <button
                    type="button"
                    onClick={() => setShowBookingsFull(true)}
                    title="Full Screen"
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-gray-200 text-[10px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-700"
                    aria-label="Full Screen"
                  >
                    <FiMaximize2 className="w-3.5 h-3.5" />
                    <span>Full Screen</span>
                  </button>
                  <div className="relative" ref={slotMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowSlotMenu(s => !s)}
                      aria-haspopup="true"
                      aria-expanded={showSlotMenu}
                      className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md border text-[10px] font-medium transition ${ (slotFilters.AM && slotFilters.PM && slotFilters.FULL) ? 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'} focus:outline-none`}
                      title="Slot Filters"
                    >
                      <FiFilter className="w-3.5 h-3.5" />
                      <span>Slots</span>
                      {!(slotFilters.AM && slotFilters.PM && slotFilters.FULL) && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />}
                    </button>
                    {showSlotMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-[11px] animate-popIn z-[9999] max-h-64 overflow-y-auto" role="menu" aria-label="Slot filters">
                        <div className="font-medium text-gray-700 mb-2 flex items-center justify-between">
                          <span>Slot Filters</span>
                          <button type="button" onClick={()=> setShowSlotMenu(false)} className="text-gray-400 hover:text-gray-600 focus:outline-none" aria-label="Close slot filters"><FiX className="w-3.5 h-3.5" /></button>
                        </div>
                        {['AM','PM','FULL'].map((slot, idx) => (
                          <label key={slot} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-indigo-50 select-none transition" onKeyDown={(e)=> { if(e.key==='Enter' || e.key===' ') { e.preventDefault(); setSlotFilters(f => ({...f, [slot]: !f[slot]})); }}}>
                            <input
                              ref={idx===0 ? firstSlotCheckRef : null}
                              type="checkbox"
                              className="accent-indigo-600 w-3.5 h-3.5 focus:ring-0 focus:outline-none"
                              checked={!!slotFilters[slot]}
                              onChange={() => setSlotFilters(f => ({...f, [slot]: !f[slot]}))}
                            />
                            <span className="text-gray-700">{slot}</span>
                          </label>
                        ))}
                        <div className="mt-2 flex items-center justify-between pt-2 border-t border-gray-100">
                          <button type="button" onClick={()=> setSlotFilters({AM:true,PM:true,FULL:true})} className="text-indigo-600 hover:underline">Reset</button>
                          <button type="button" onClick={()=> setShowSlotMenu(false)} className="text-gray-500 hover:underline">Done</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-gray-500 flex flex-wrap items-center gap-3">
                <span>Total: <span className="font-semibold text-gray-700">{bookingsWithConflicts.length}</span></span>
                <span>Visible: <span className="font-semibold text-gray-700">{filteredGroupedBookings.reduce((a,g)=> a+g.bookings.length,0)}</span></span>
                {bookingsWithConflicts.some(b=> b._conflict) && <span>Conflicts: <span className="font-semibold text-red-600">{bookingsWithConflicts.filter(b=> b._conflict).length}</span></span>}
                {filteredGroupedBookings.length > 1 && (
                  <span className="ml-auto flex items-center gap-1">
                    <button onClick={expandAll} className="text-indigo-600 hover:underline">Expand All</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={collapseAll} className="text-indigo-600 hover:underline">Collapse All</button>
                  </span>
                )}
              </div>
              <div className="mt-3 relative max-h-48 xl:max-h-64 overflow-y-auto pr-1 rounded-lg border border-gray-100 bg-white/50">
                {filteredGroupedBookings.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No bookings match the current filters.
                    { (slotFilters.AM+slotFilters.PM+slotFilters.FULL) !== 3 && (
                      <div className="mt-2"><button onClick={()=> setSlotFilters({AM:true,PM:true,FULL:true})} className="text-indigo-600 underline">Reset slot filters</button></div>
                    )}
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
                          const full = dd.includes('AM') && dd.includes('PM');
                          const slotType = full ? 'FULL' : (dd.includes('AM') ? 'AM' : 'PM');
                          const slotColor = full ? 'bg-purple-100 text-purple-700' : (slotType==='AM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700');
                          // deleteBooking removed (safety)
                          return (
                            <div key={b.id || `${b.trainerId}-${b.dateISO}-${dd}`} className={`group relative p-3 rounded-md border ${b._conflict ? 'border-red-300 bg-red-50/60' : 'border-gray-200 bg-white'} hover:shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition`}> 
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${slotColor}`}>{slotType}</span>
                                    <span className="font-medium text-gray-900 text-sm truncate max-w-[120px]">{b.batchCode || b.domain || '—'}</span>
                                  </div>
                                  <div className="mt-0.5 text-[11px] text-gray-500 truncate">
                                    {b.trainerName || b.trainerId} • {b.collegeName || '—'} {b._conflict && <span className="ml-1 text-red-600 font-semibold">(Conflict)</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                  <button onClick={()=> setBookingDetail(b)} aria-label="Details" className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[11px]">Info</button>
                                  {/* Delete disabled */}
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
  <QuickBookingModal />
  {showBookingsFull && (
    <div role="dialog" aria-modal="true" aria-label="All bookings" className="fixed inset-0 z-[80] flex flex-col bg-white/90 backdrop-blur-md animate-fadeIn">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <FiCalendar className="text-indigo-600 w-5 h-5" />
          <h3 className="text-base font-semibold text-gray-900">All Bookings</h3>
          {bookingsWithConflicts.some(b=> b._conflict) && <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700"><FiAlertTriangle className="w-3 h-3"/>Conflicts</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-2 relative" ref={slotMenuFullRef}>
            <button
              type="button"
              onClick={()=> setShowSlotMenuFull(s=> !s)}
              aria-haspopup="true"
              aria-expanded={showSlotMenuFull}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition ${(slotFilters.AM && slotFilters.PM && slotFilters.FULL) ? 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'} focus:outline-none`}
              title="Slot Filters"
            >
              <FiFilter className="w-4 h-4" />
              <span>Slots</span>
              {!(slotFilters.AM && slotFilters.PM && slotFilters.FULL) && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />}
            </button>
            {showSlotMenuFull && (
              <div className="absolute top-full mt-2 right-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-[11px] animate-popIn z-[9999] max-h-72 overflow-y-auto" role="menu" aria-label="Slot filters">
                <div className="font-medium text-gray-700 mb-2 flex items-center justify-between">
                  <span>Slot Filters</span>
                  <button type="button" onClick={()=> setShowSlotMenuFull(false)} className="text-gray-400 hover:text-gray-600 focus:outline-none" aria-label="Close slot filters"><FiX className="w-3.5 h-3.5"/></button>
                </div>
                {['AM','PM','FULL'].map((slot, idx) => (
                  <label key={slot} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-indigo-50 select-none transition" onKeyDown={(e)=> { if(e.key==='Enter' || e.key===' ') { e.preventDefault(); setSlotFilters(f => ({...f, [slot]: !f[slot]})); }}}>
                    <input
                      ref={idx===0 ? firstSlotCheckFullRef : null}
                      type="checkbox"
                      className="accent-indigo-600 w-3.5 h-3.5 focus:ring-0 focus:outline-none"
                      checked={!!slotFilters[slot]}
                      onChange={() => setSlotFilters(f => ({...f, [slot]: !f[slot]}))}
                    />
                    <span className="text-gray-700">{slot}</span>
                  </label>
                ))}
                <div className="mt-2 flex items-center justify-between pt-2 border-t border-gray-100">
                  <button type="button" onClick={()=> setSlotFilters({AM:true,PM:true,FULL:true})} className="text-indigo-600 hover:underline">Reset</button>
                  <button type="button" onClick={()=> setShowSlotMenuFull(false)} className="text-gray-500 hover:underline">Done</button>
                </div>
              </div>
            )}
          </div>
          <button onClick={expandAll} className="text-xs text-indigo-600 hover:underline">Expand All</button>
          <button onClick={collapseAll} className="text-xs text-indigo-600 hover:underline">Collapse All</button>
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
          {filteredGroupedBookings.map(g => (
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
                    const full = dd.includes('AM') && dd.includes('PM');
                    const slotType = full ? 'FULL' : (dd.includes('AM') ? 'AM' : 'PM');
                    const slotColor = full ? 'bg-purple-100 text-purple-700' : (slotType==='AM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700');
                    // deleteBooking removed (safety)
                    return (
                      <div key={b.id || `${b.trainerId}-${b.dateISO}-${dd}`} className={`group relative p-4 rounded-md border ${b._conflict ? 'border-red-300 bg-red-50/60' : 'border-gray-200 bg-white'} hover:shadow-sm transition`}> 
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${slotColor}`}>{slotType}</span>
                              <span className="font-medium text-gray-900 text-sm truncate max-w-[140px]">{b.batchCode || b.domain || '—'}</span>
                            </div>
                            <div className="text-[11px] text-gray-500 truncate">
                              {b.trainerName || b.trainerId} • {b.collegeName || '—'} {b._conflict && <span className="ml-1 text-red-600 font-semibold">(Conflict)</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={()=> setBookingDetail(b)} aria-label="Details" className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[11px]">Info</button>
                            {/* Delete disabled */}
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
