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

  // Filter students
  const filteredStudents = students.filter(
    (student) =>
      student.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.collegeRollNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((student) => 
        student.id || student.email || student.studentName
      ));
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

  return (
    <>
      {/* Main Modal Overlay - HIGHEST Z-INDEX */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-md flex items-center justify-center z-[99999] p-4"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl transform transition-all">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">
                Select Students for {roundName}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {students.length} total students • {selectedStudents.length} selected
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition p-2 rounded-full hover:bg-blue-800"
              title="Close (Esc)"
            >
              <FaTimes size={24} />
            </button>
          </div>

          {/* Search and Controls */}
          <div className="p-6 border-b bg-gray-50">
            <div className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="🔍 Search students by name, email, or roll no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                autoFocus
              />
              <button
                onClick={handleSelectAll}
                className="px-6 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition font-semibold border border-blue-300"
              >
                {selectedStudents.length === filteredStudents.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>
          </div>

          {/* Students List */}
          <div className="overflow-y-auto max-h-96">
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FaUsers className="mx-auto text-5xl text-gray-300 mb-4" />
                <p className="text-xl font-medium text-gray-600">No students found</p>
                <p className="text-sm text-gray-500 mt-2">
                  {searchTerm ? "Try a different search term" : "No students available"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredStudents.map((student, index) => {
                  const studentId = student.id || student.email || student.studentName || index;
                  
                  return (
                    <div
                      key={studentId}
                      className={`p-5 flex items-center gap-4 cursor-pointer transition-all duration-200 ${
                        selectedStudents.includes(studentId)
                          ? "bg-blue-50 border-l-4 border-blue-500 shadow-inner"
                          : "hover:bg-gray-50 hover:shadow-sm"
                      }`}
                      onClick={() => toggleStudentSelection(studentId)}
                    >
                      <div
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          selectedStudents.includes(studentId)
                            ? "bg-blue-500 border-blue-500 text-white scale-110 shadow-lg"
                            : "border-gray-300 hover:border-blue-400 hover:scale-105"
                        }`}
                      >
                        {selectedStudents.includes(studentId) && (
                          <FaCheck size={14} />
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {student.studentName || "Unknown Student"}
                        </h3>
                        <div className="text-sm text-gray-600 flex flex-wrap gap-4 mt-2">
                          <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            📧 {student.email || "No email"}
                          </span>
                          <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            🆔 {student.collegeRollNo || "No Roll No"}
                          </span>
                          {student.course && (
                            <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                              📚 {student.course}
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${
                          student.matchStatus === "unmatched"
                            ? "bg-red-100 text-red-800 border-red-300"
                            : "bg-green-100 text-green-800 border-green-300"
                        }`}
                      >
                        {student.matchStatus === "unmatched"
                          ? "❌ Not Found"
                          : "✅ Matched"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
            <span className="text-lg text-gray-700 font-semibold">
              📊 {selectedStudents.length} of {filteredStudents.length} students selected
            </span>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                disabled={selectedStudents.length === 0}
              >
                <FaCheck size={16} />
                Save Selection ({selectedStudents.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Additional overlay to ensure everything behind is covered */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[99998]"></div>
    </>
  );
};

export default StudentSelectionModal;