import React, { useState, useEffect, useRef } from "react";
import { FaEllipsisV, FaUsers, FaFileContract, FaRupeeSign, FaClock, FaUniversity, FaPlay, FaTimes } from "react-icons/fa";
import { IoDocumentTextOutline } from "react-icons/io5";
import { MdOutlineAttachMoney } from "react-icons/md";


function TrainingTable({ trainingData, onRowClick, onViewStudentData, onViewMouFile, onManageStudents, onInitiate }) {

  const [menuOpenId, setMenuOpenId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
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


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const formatCurrency = (amount) => {
    return amount ? `₹${amount.toLocaleString('en-IN')}` : '-';
  };

  // Assign ref to each menu
  const setMenuRef = (id, element) => {
    menuRefs.current[id] = element;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
      {/* Desktop Header */}
      <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 text-gray-600 font-medium text-xs uppercase tracking-wide">
        <div className="col-span-3 flex items-center">
          <IoDocumentTextOutline className="mr-1 text-blue-500 text-sm" />
          Code
        </div>
        <div className="col-span-3 flex items-center">
          <FaUniversity className="mr-1 text-blue-500 text-sm" />
          College
        </div>
        <div className="col-span-2 flex items-center">
          <FaUsers className="mr-1 text-blue-500 text-sm" />
          Students
        </div>
        <div className="col-span-2 flex items-center">
          <MdOutlineAttachMoney className="mr-1 text-blue-500 text-sm" />
          Cost
        </div>
        <div className="col-span-2 flex items-center justify-between">
          <div className="flex items-center">
            <FaClock className="mr-1 text-blue-500 text-sm" />
            Hours
          </div>
          <span className="opacity-0">
            <FaEllipsisV />
          </span>
        </div>
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-gray-100">
        {trainingData.map((item) => (
          <div
            key={item.id}
            className={`cursor-pointer transition-colors hover:bg-gray-50 ${menuOpenId === item.id ? 'bg-blue-50' : 'bg-white'}`}
            onClick={() => onRowClick(item)}
          >
            {/* Mobile Card Layout */}
            <div className="md:hidden p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-1">
                    <IoDocumentTextOutline className="mr-2 text-blue-500 flex-shrink-0" />
                    <span className="font-semibold text-blue-600 truncate">{item.projectCode}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FaUniversity className="mr-2 text-blue-500 flex-shrink-0" />
                    <span className="truncate">{item.collegeName}</span>
                  </div>
                  {item.city && (
                    <div className="text-xs text-gray-500 mt-1 ml-6">{item.city}</div>
                  )}
                </div>
                <button
                  data-id={item.id}
                  onClick={(e) => toggleMenu(item.id, e)}
                  className={`ml-2 p-2 rounded-full transition ${menuOpenId === item.id ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  {menuOpenId === item.id ? <FaTimes size={12} /> : <FaEllipsisV size={12} />}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex items-center">
                  <FaUsers className="mr-1 text-blue-500 text-xs" />
                  <span className="font-medium">{item.studentCount}</span>
                </div>
                <div className="flex items-center">
                  <MdOutlineAttachMoney className="mr-1 text-blue-500 text-xs" />
                  <span className="font-medium text-xs">{formatCurrency(item.perStudentCost)}</span>
                </div>
                <div className="flex items-center">
                  <FaClock className="mr-1 text-blue-500 text-xs" />
                  <span className="font-medium">{item.totalHours || "-"}</span>
                </div>
              </div>
            </div>

            {/* Desktop Grid Layout */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 text-sm items-center">
              <div className="col-span-3 truncate">
                <span className="font-medium text-blue-600">{item.projectCode}</span>
              </div>
              <div className="col-span-3 truncate">
                <span className="font-medium text-gray-800">{item.collegeName}</span>
                {item.city && (
                  <div className="text-xs text-gray-500 mt-1">{item.city}</div>
                )}
              </div>
              <div className="col-span-2">
                <span className="font-medium">{item.studentCount}</span>
                <span className="text-xs text-gray-500 ml-1">students</span>
              </div>
              <div className="col-span-2 font-medium text-gray-800">
                {formatCurrency(item.perStudentCost)}
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="font-medium">{item.totalHours || "-"}</span>
                <button
                  data-id={item.id}
                  onClick={(e) => toggleMenu(item.id, e)}
                  className={`p-2 rounded-full transition ${menuOpenId === item.id ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
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
                className={`absolute right-4 ${dropdownDirection[item.id] === 'up' ? 'bottom-10 mb-2' : 'mt-1'} bg-white rounded-lg shadow-lg text-sm w-44 border border-gray-200 z-20 overflow-hidden`}
              >
                <button
                  onClick={() => {
                    onViewStudentData(item);
                    setMenuOpenId(null);
                  }}
                  disabled={!item.studentFileUrl}
                  className={`w-full px-3 py-2 text-left flex items-center transition ${item.studentFileUrl ? 'hover:bg-gray-50 text-gray-700' : 'text-gray-400'
                    }`}
                >
                  <FaUsers className="mr-2 text-blue-500 text-xs" />
                  View Students
                </button>
                <button
                  onClick={() => {
                    onViewMouFile(item);
                    setMenuOpenId(null);
                  }}
                  disabled={!item.mouFileUrl}
                  className={`w-full px-3 py-2 text-left flex items-center transition ${item.mouFileUrl ? 'hover:bg-gray-50 text-gray-700' : 'text-gray-400'
                    }`}
                >
                  <FaFileContract className="mr-2 text-blue-500 text-xs" />
                  View MOU
                </button>
                <button
                  onClick={() => onInitiate(item)}
                  className="w-full px-3 py-2 text-left flex items-center hover:bg-gray-50 text-gray-700 transition"
                >
                  <FaPlay className="mr-2 text-blue-500 text-xs" />
                  Initiation
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {trainingData.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No training programs found</div>
          <p className="text-sm">Create a new training program to get started</p>
        </div>
      )}
    </div>
  );
}

export default TrainingTable;