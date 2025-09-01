import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaEllipsisV, FaUsers, FaFileContract, FaClock, FaUniversity, FaPlay, FaTimes } from "react-icons/fa";
import { IoDocumentTextOutline } from "react-icons/io5";
import { MdOutlineAttachMoney } from "react-icons/md";


function TrainingTable({ trainingData, onRowClick, onViewStudentData, onViewMouFile, onInitiate }) {

  const [menuOpenId, setMenuOpenId] = useState(null);
  // Removed unused isMobile state
  const [dropdownDirection, setDropdownDirection] = useState({});
  const menuRefs = useRef({});

  const toggleMenu = (id, e) => {
    e.stopPropagation();
    if (menuOpenId === id) {
      setMenuOpenId(null);
      setDropdownDirection({});
    } else {
      setMenuOpenId(id);
      // Check if there's enough space below
      setTimeout(() => {
        const btn = document.querySelector(`button[data-id="${id}"]`);
        if (btn) {
          const rect = btn.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          if (spaceBelow < 200) { // 200px is approx dropdown height
            setDropdownDirection((prev) => ({ ...prev, [id]: 'up' }));
          } else {
            setDropdownDirection((prev) => ({ ...prev, [id]: 'down' }));
          }
        }
      }, 0);
    }
  };


  // Removed resize listener (was only updating removed isMobile state)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpenId !== null) {
        const menuElement = menuRefs.current[menuOpenId];
        if (menuElement && !menuElement.contains(event.target)) {
          // Check if the click was on the three dots button of the same row
          const dotsButton = document.querySelector(`button[data-id="${menuOpenId}"]`);
          if (!dotsButton || !dotsButton.contains(event.target)) {
            setMenuOpenId(null);
          }
        }
      }
    };

    if (menuOpenId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpenId]);

  const formatCurrency = useCallback((amount) => {
    if (!amount && amount !== 0) return '-';
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount));
    } catch {
      return `₹${amount}`;
    }
  }, []);

  // Assign ref to each menu
  const setMenuRef = (id, element) => {
    menuRefs.current[id] = element;
  };

  return (
  <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm ring-1 ring-gray-200/60">
      {/* Desktop Header */}
      <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 text-[11px] font-semibold tracking-wide uppercase text-gray-600 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200">
        <div className="col-span-3 flex items-center gap-1.5">
          <IoDocumentTextOutline className="text-blue-500 text-sm" />
          <span>Code</span>
        </div>
        <div className="col-span-3 flex items-center gap-1.5">
          <FaUniversity className="text-blue-500 text-sm" />
          <span>College</span>
        </div>
        <div className="col-span-2 flex items-center gap-1.5">
          <FaUsers className="text-blue-500 text-sm" />
          <span>Students</span>
        </div>
        <div className="col-span-2 flex items-center gap-1.5">
          <MdOutlineAttachMoney className="text-blue-500 text-sm" />
          <span>Cost</span>
        </div>
        <div className="col-span-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FaClock className="text-blue-500 text-sm" />
            <span>Hours</span>
          </div>
          <span className="opacity-0 select-none">
            <FaEllipsisV />
          </span>
        </div>
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-gray-100/80">
        {trainingData.map((item, idx) => (
          <div
            key={item.id}
            className={`relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 focus-visible:z-10 transition-colors ${menuOpenId === item.id ? 'bg-indigo-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60 hover:bg-gray-100'} hover:bg-gray-50`}
            onClick={() => onRowClick(item)}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(item); } }}
            aria-label={`Training ${item.projectCode || ''}`}
          >
            {/* Mobile Card Layout */}
            <div className="md:hidden p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-1">
                    <IoDocumentTextOutline className="mr-2 text-blue-500 flex-shrink-0" />
                    <span className="font-semibold text-blue-700 truncate tracking-wide">{item.projectCode}</span>
                  </div>
                  <div className="flex items-center text-gray-600 text-sm">
                    <FaUniversity className="mr-2 text-blue-500 flex-shrink-0" />
                    <span className="truncate font-medium text-gray-800">{item.collegeName}</span>
                  </div>
                  {item.city && (
                    <div className="text-[11px] text-gray-500 mt-1 ml-6">{item.city}</div>
                  )}
                </div>
                <button
                  data-id={item.id}
                  onClick={(e) => toggleMenu(item.id, e)}
                  className={`mt-0.5 p-2 rounded-full transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${menuOpenId === item.id ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100 active:scale-95'}`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpenId === item.id}
                  aria-label="Row menu"
                >
                  {menuOpenId === item.id ? <FaTimes size={12} /> : <FaEllipsisV size={12} />}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-[13px]">
                <div className="flex items-center text-gray-700">
                  <FaUsers className="mr-1.5 text-blue-500 text-xs" />
                  <span className="font-semibold">{item.studentCount}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <MdOutlineAttachMoney className="mr-1.5 text-blue-500 text-xs" />
                  <span className="font-semibold text-[12px]">{formatCurrency(item.perStudentCost)}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <FaClock className="mr-1.5 text-blue-500 text-xs" />
                  <span className="font-semibold">{item.totalHours || '-'}</span>
                </div>
              </div>
            </div>

            {/* Desktop Grid Layout */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 text-[13px] items-center transition-colors">
              <div className="col-span-3 truncate">
                <span className="font-medium text-blue-700 tracking-wide group-hover:underline underline-offset-2 decoration-dotted">{item.projectCode}</span>
              </div>
              <div className="col-span-3 truncate">
                <span className="font-medium text-gray-800">{item.collegeName}</span>
                {item.city && (
                  <div className="text-[11px] text-gray-500 mt-0.5">{item.city}</div>
                )}
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                <span className="font-semibold text-gray-800">{item.studentCount}</span>
                <span className="text-[11px] text-gray-500">students</span>
              </div>
              <div className="col-span-2 font-semibold text-gray-800 tabular-nums tracking-tight">
                {formatCurrency(item.perStudentCost)}
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="font-semibold text-gray-800 tabular-nums">{item.totalHours || '-'}</span>
                <button
                  data-id={item.id}
                  onClick={(e) => toggleMenu(item.id, e)}
                  className={`p-2 rounded-full transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${menuOpenId === item.id ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100 active:scale-95'}`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpenId === item.id}
                  aria-label="Row menu"
                >
                  {menuOpenId === item.id ? <FaTimes size={12} /> : <FaEllipsisV size={12} />}
                </button>
              </div>
            </div>

            {/* Dropdown Menu */}
            {menuOpenId === item.id && (
              <div
                ref={(el) => setMenuRef(item.id, el)}
                onClick={(e) => e.stopPropagation()}
                className={`absolute right-4 ${dropdownDirection[item.id] === 'up' ? 'bottom-10 mb-2 origin-bottom-right' : 'mt-1 origin-top-right'} bg-white/95 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-gray-200 text-[13px] w-48 z-20 overflow-hidden animate-in fade-in slide-in-from-top-1`}
                role="menu"
                aria-label="Row actions"
              >
                <div className="py-1 divide-y divide-gray-100/70">
                  <div className="space-y-0.5">
                    <button
                      onClick={() => { onViewStudentData(item); setMenuOpenId(null); }}
                      disabled={!item.studentFileUrl}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 transition group ${item.studentFileUrl ? 'hover:bg-indigo-50 focus:bg-indigo-50 text-gray-700' : 'text-gray-400 cursor-not-allowed'}`}
                      role="menuitem"
                    >
                      <FaUsers className="text-blue-500 text-xs" />
                      <span className="font-medium text-[12px]">View Students</span>
                    </button>
                    <button
                      onClick={() => { onViewMouFile(item); setMenuOpenId(null); }}
                      disabled={!item.mouFileUrl}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 transition group ${item.mouFileUrl ? 'hover:bg-indigo-50 focus:bg-indigo-50 text-gray-700' : 'text-gray-400 cursor-not-allowed'}`}
                      role="menuitem"
                    >
                      <FaFileContract className="text-blue-500 text-xs" />
                      <span className="font-medium text-[12px]">View MOU</span>
                    </button>
                    <button
                      onClick={() => { onInitiate(item); setMenuOpenId(null); }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-indigo-50 focus:bg-indigo-50 text-gray-700 transition group"
                      role="menuitem"
                    >
                      <FaPlay className="text-blue-500 text-xs" />
                      <span className="font-medium text-[12px]">Initiation</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {trainingData.length === 0 && (
        <div className="p-10 text-center bg-gradient-to-b from-white to-gray-50">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 shadow-inner mb-4">
            <IoDocumentTextOutline className="w-6 h-6" />
          </div>
          <div className="text-base font-semibold text-gray-800 mb-1">No training programs</div>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">Once new training submissions are created they will appear here automatically.</p>
        </div>
      )}
    </div>
  );
}

export default TrainingTable;