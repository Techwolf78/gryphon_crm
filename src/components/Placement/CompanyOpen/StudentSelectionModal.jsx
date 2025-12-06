import React, { useState, useEffect } from "react";
import { FaTimes, FaCheck, FaUsers } from "react-icons/fa";

const StudentSelectionModal = ({
  isOpen,
  onClose,
  students = [],
  roundName,
  currentSelected = [],
  onStudentsSelect,
}) => {
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ FIXED: Only update when modal opens or currentSelected changes
  useEffect(() => {
    if (isOpen) {
      setSelectedStudents(currentSelected);
    }
  }, [isOpen, currentSelected]);

  // Background scroll lock and overlay
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.position = 'static';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.position = 'static';
    };
  }, [isOpen]);

  // Escape key se close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ✅ FIXED: Filter students - REMOVE unmatched and already placed
  const filteredStudents = students.filter((student) => {
    // Check if student is unmatched
    const isUnmatched = student.matchStatus === "unmatched";
    
    // Check if student is already placed
    const isAlreadyPlaced = student.isPlaced || student.placementStatus === 'placed';
    
    // Search filter
    const matchesSearch = 
      student.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.collegeRollNo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // ✅ ONLY show: matched AND not already placed AND matches search
    return !isUnmatched && !isAlreadyPlaced && matchesSearch;
  });

  const toggleStudentSelection = (student) => {
    const isSelected = selectedStudents.some(s => 
      s.studentName === student.studentName && s.email === student.email
    );
    setSelectedStudents((prev) =>
      isSelected
        ? prev.filter((s) => !(s.studentName === student.studentName && s.email === student.email))
        : [...prev, student]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents);
    }
  };

  const handleSave = () => {
    onStudentsSelect(selectedStudents);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // ✅ Statistics
  const totalStudents = students.length;
  const unmatchedCount = students.filter(s => s.matchStatus === "unmatched").length;
  const placedCount = students.filter(s => s.isPlaced || s.placementStatus === 'placed').length;
  const availableCount = students.filter(s => 
    s.matchStatus !== "unmatched" && 
    !(s.isPlaced || s.placementStatus === 'placed')
  ).length;

  return (
    <>
      {/* Main Modal Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-md flex items-center justify-center z-99999 p-4"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-xl transform transition-all">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">
                Select Students for {roundName}
              </h2>
              <p className="text-blue-100 text-xs mt-1">
                📊 {filteredStudents.length} available • {selectedStudents.length} selected
                <span className="ml-2 text-blue-200">
                  (Filtered: ❌ {unmatchedCount} unmatched • 🎓 {placedCount} already placed)
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition p-1 rounded-full hover:bg-blue-800"
              title="Close (Esc)"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Search and Controls */}
          <div className="p-3 border-b bg-gray-50">
            <div className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="🔍 Search available students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                autoFocus
              />
              <button
                onClick={handleSelectAll}
                disabled={filteredStudents.length === 0}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition font-medium text-sm border border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedStudents.length === filteredStudents.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>
            
            {/* ✅ Statistics Bar */}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                📊 Total: {totalStudents}
              </div>
              <div className="px-2 py-1 bg-green-100 text-green-700 rounded">
                ✅ Available: {availableCount}
              </div>
              <div className="px-2 py-1 bg-red-100 text-red-700 rounded">
                ❌ Unmatched: {unmatchedCount}
              </div>
              <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                🎓 Already Placed: {placedCount}
              </div>
              <div className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                🔍 Showing: {filteredStudents.length}
              </div>
            </div>
          </div>

          {/* Students List */}
          <div className="overflow-y-auto max-h-80">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <FaUsers className="mx-auto text-4xl text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-600">No available students found</p>
                <p className="text-xs text-gray-500 mt-1">
                  {searchTerm 
                    ? "Try a different search term" 
                    : "All students are either unmatched or already placed"}
                </p>
                <div className="mt-3 text-xs text-gray-600">
                  <p>📊 Breakdown:</p>
                  <div className="flex justify-center gap-3 mt-1">
                    <span className="text-red-600">❌ {unmatchedCount} unmatched</span>
                    <span className="text-purple-600">🎓 {placedCount} already placed</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredStudents.map((student, index) => (
                  <div
                    key={student.studentName + student.email + index}
                    className={`p-2 flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                      selectedStudents.some(s => 
                        s.studentName === student.studentName && s.email === student.email
                      )
                        ? "bg-blue-50 border-l-4 border-blue-500 shadow-inner"
                        : "hover:bg-gray-50 hover:shadow-sm"
                    }`}
                    onClick={() => toggleStudentSelection(student)}
                    title={`${student.studentName} | ${student.email}`}
                  >
                    {/* Selection Checkbox */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                        selectedStudents.some(s => 
                          s.studentName === student.studentName && s.email === student.email
                        )
                          ? "bg-blue-500 border-blue-500 text-white scale-110 shadow-lg"
                          : "border-gray-300 hover:border-blue-400 hover:scale-105"
                      }`}
                    >
                      {selectedStudents.some(s => 
                        s.studentName === student.studentName && s.email === student.email
                      ) && <FaCheck size={12} />}
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {student.studentName || "Unknown Student"}
                      </h3>
                      <div className="text-xs text-gray-600 flex flex-wrap gap-2 mt-1">
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                          📧 {student.email || "No email"}
                        </span>
                        {student.collegeRollNo && (
                          <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            🆔 {student.collegeRollNo}
                          </span>
                        )}
                        {student.course && (
                          <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            📚 {student.course}
                          </span>
                        )}
                        {student.college && (
                          <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            🏫 {student.college}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge - Always green because we filtered out unmatched/placed */}
                    <div
                      className="px-2 py-1 rounded-full text-xs font-semibold border-2 bg-green-100 text-green-800 border-green-300"
                    >
                      ✅ Available
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              <span className="font-semibold">
                📊 {selectedStudents.length} of {filteredStudents.length} selected
              </span>
              <span className="ml-3 text-xs text-gray-600">
                (Filtered out: {unmatchedCount} unmatched, {placedCount} already placed)
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedStudents.length === 0}
              >
                <FaCheck size={14} />
                Save ({selectedStudents.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentSelectionModal;