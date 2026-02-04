import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';

const InterviewSchedulerTab = () => {
  const [interviews, setInterviews] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [positionDropdownOpen, setPositionDropdownOpen] = useState(false);
  const [positionSuggestions, setPositionSuggestions] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [formData, setFormData] = useState({
    candidateName: '',
    positionApplied: '',
    interviewDate: '',
    status: 'Scheduled',
    notes: ''
  });
  const refreshClickCountRef = useRef(0);
  const [isRefreshDisabled, setIsRefreshDisabled] = useState(false);

  // Position suggestions list
  const positionOptions = [
    'Corporate Training',
    'Executive',
    'Intern',
    'Content Writer',
    'Graphic Designer',
    'Video Editor',
    'Manager',
    'Admin and HR',
    'Human Resource',
    'Corporate Relations Manager',
    'Corporate Relations Executive',
    'Sales Manager',
    'Sales Executive',
    'Business Development Engineer',
    'Software Engineer Intern',
    'Software Engineer'
  ];

  // Load interviews from Firestore
  const loadInterviews = async () => {
    try {
      setLoading(true);
      const interviewsRef = collection(db, 'interviews');
      const q = query(interviewsRef, orderBy('interviewDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const interviewsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInterviews(interviewsData);
    } catch (error) {
      console.error('Error loading interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data from Firestore on mount
  useEffect(() => {
    loadInterviews();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.dropdown-container')) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Add new interview
  const addNewInterview = () => {
    setFormData({
      candidateName: '',
      positionApplied: '',
      interviewDate: new Date().toISOString().split('T')[0],
      status: 'Scheduled',
      notes: ''
    });
    setPositionDropdownOpen(false);
    setPositionSuggestions([]);
    setShowAddModal(true);
  };

  // Edit interview
  const editInterview = (interview) => {
    setFormData({ ...interview });
    setEditingInterview(interview);
    setPositionDropdownOpen(false);
    setPositionSuggestions([]);
    setShowEditModal(true);
  };

  // Save new interview
  const saveNewInterview = async () => {
    try {
      const interviewData = {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'interviews'), interviewData);
      setShowAddModal(false);
      setPositionDropdownOpen(false);
      setPositionSuggestions([]);
      loadInterviews(); // Refresh the list
    } catch (error) {
      console.error('Error adding interview:', error);
      alert('Error adding interview. Please try again.');
    }
  };

  // Save edited interview
  const saveEditedInterview = async () => {
    try {
      const interviewRef = doc(db, 'interviews', editingInterview.id);
      await updateDoc(interviewRef, {
        ...formData,
        updatedAt: new Date()
      });
      setShowEditModal(false);
      setEditingInterview(null);
      setPositionDropdownOpen(false);
      setPositionSuggestions([]);
      loadInterviews(); // Refresh the list
    } catch (error) {
      console.error('Error updating interview:', error);
      alert('Error updating interview. Please try again.');
    }
  };

  // Delete interview (soft delete)
  const deleteInterview = async (id) => {
    if (window.confirm('Are you sure you want to move this interview to deleted?')) {
      try {
        const interviewRef = doc(db, 'interviews', id);
        await updateDoc(interviewRef, {
          deleted: true,
          deletedAt: new Date()
        });
        loadInterviews(); // Refresh the list
      } catch (error) {
        console.error('Error deleting interview:', error);
        alert('Error deleting interview. Please try again.');
      }
    }
  };

  // Restore interview
  const restoreInterview = async (id) => {
    try {
      const interviewRef = doc(db, 'interviews', id);
      await updateDoc(interviewRef, {
        deleted: false,
        restoredAt: new Date()
      });
      loadInterviews(); // Refresh the list
    } catch (error) {
      console.error('Error restoring interview:', error);
      alert('Error restoring interview. Please try again.');
    }
  };

  // Duplicate interview
  const duplicateInterview = async (interview) => {
    try {
      const duplicatedData = {
        ...interview,
        candidateName: interview.candidateName + ' (Copy)',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      delete duplicatedData.id; // Remove the old ID

      await addDoc(collection(db, 'interviews'), duplicatedData);
      loadInterviews(); // Refresh the list
    } catch (error) {
      console.error('Error duplicating interview:', error);
      alert('Error duplicating interview. Please try again.');
    }
  };

  // Sort interviews (client-side sorting for other fields)
  const sortedInterviews = [...interviews].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'candidateName':
        aVal = a.candidateName.toLowerCase();
        bVal = b.candidateName.toLowerCase();
        break;
      case 'date':
      default:
        aVal = new Date(a.interviewDate);
        bVal = new Date(b.interviewDate);
        break;
    }
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Filter interviews
  const filteredInterviews = sortedInterviews.filter(int => {
    const matchesStatus = filterStatus === 'All' || int.status === filterStatus;
    const matchesSearch = int.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         int.positionApplied.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDeleted = showDeleted ? (int.deleted === true) : (int.deleted !== true);
    return matchesStatus && matchesSearch && matchesDeleted;
  });

  // Status counts (only for active interviews)
  const activeInterviews = interviews.filter(int => int.deleted !== true);
  const deletedInterviews = interviews.filter(int => int.deleted === true);

  // Use appropriate interviews based on current view
  const currentInterviews = showDeleted ? deletedInterviews : activeInterviews;

  const statusCounts = {
    All: currentInterviews.length,
    Scheduled: currentInterviews.filter(int => int.status === 'Scheduled').length,
    Completed: currentInterviews.filter(int => int.status === 'Completed').length,
    Rejected: currentInterviews.filter(int => int.status === 'Rejected').length,
    Offered: currentInterviews.filter(int => int.status === 'Offered').length
  };

  // Analytics (only for active interviews)
  const totalInterviews = currentInterviews.length;
  const completedInterviews = currentInterviews.filter(int => int.status === 'Completed').length;
  const recentInterviews = currentInterviews.filter(int => {
    const interviewDate = new Date(int.interviewDate);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return interviewDate >= weekAgo;
  }).length;

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Candidate Name', 'Position Applied', 'Interview Date', 'Status', 'Closure Time', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredInterviews.map(int => [
        `"${int.candidateName}"`,
        `"${int.positionApplied}"`,
        int.interviewDate,
        int.status,
        `"${calculateClosureTime(int)}"`,
        `"${int.notes.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interviews.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate closure time (time from creation to completion)
  const calculateClosureTime = (interview) => {
    const status = interview.status?.toLowerCase();
    if (status !== 'completed' && status !== 'rejected' && status !== 'hired' && status !== 'no show' && status !== 'withdrawn') {
      return 'N/A';
    }

    const createdAt = interview.createdAt ? new Date(interview.createdAt.toDate ? interview.createdAt.toDate() : interview.createdAt) : null;
    const updatedAt = interview.updatedAt ? new Date(interview.updatedAt.toDate ? interview.updatedAt.toDate() : interview.updatedAt) : null;

    if (!createdAt) {
      return 'N/A';
    }

    // Use updatedAt if available (when status changed), otherwise use current time
    const endTime = updatedAt || new Date();
    const timeDiff = endTime - createdAt;

    // Calculate days, always round up to at least 1 day
    const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  // Handle position input changes
  const handlePositionChange = (value) => {
    setFormData({...formData, positionApplied: value});
    
    if (value.trim() === '') {
      setPositionSuggestions([]);
      setPositionDropdownOpen(false);
    } else {
      const filtered = positionOptions.filter(option =>
        option.toLowerCase().includes(value.toLowerCase())
      );
      setPositionSuggestions(filtered);
      setPositionDropdownOpen(filtered.length > 0);
    }
  };

  // Handle position input focus
  const handlePositionFocus = () => {
    if (formData.positionApplied.trim() === '') {
      setPositionSuggestions(positionOptions);
      setPositionDropdownOpen(true);
    } else {
      const filtered = positionOptions.filter(option =>
        option.toLowerCase().includes(formData.positionApplied.toLowerCase())
      );
      setPositionSuggestions(filtered);
      setPositionDropdownOpen(filtered.length > 0);
    }
  };

  // Handle position selection
  const selectPosition = (position) => {
    setFormData({...formData, positionApplied: position});
    setPositionDropdownOpen(false);
    setPositionSuggestions([]);
  };

  // Handle position input blur
  const handlePositionBlur = () => {
    // Delay closing to allow for click selection
    setTimeout(() => {
      setPositionDropdownOpen(false);
    }, 150);
  };



  return (
    <div className="bg-[#FFFFFF] rounded-lg shadow p-2 min-h-screen">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-black">
          Interview Tracker {showDeleted ? '(Deleted)' : ''}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={exportToCSV}
            className="px-2 py-1 bg-[#1C398E] text-white rounded text-xs hover:bg-[#0f2a5c] transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              showDeleted
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {showDeleted ? 'Active' : 'Deleted'}
          </button>
          <button
            onClick={() => {
              if (isRefreshDisabled) return;
              refreshClickCountRef.current += 1;
              if (refreshClickCountRef.current > 3) {
                setIsRefreshDisabled(true);
                setTimeout(() => {
                  setIsRefreshDisabled(false);
                  refreshClickCountRef.current = 0;
                }, 60000);
              }
              loadInterviews();
            }}
            disabled={isRefreshDisabled}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              isRefreshDisabled
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-[#1C398E] text-white hover:bg-[#0f2a5c]'
            }`}
          >
            {isRefreshDisabled ? 'Wait' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
        <div className="bg-white p-2 rounded border border-gray-200 shadow-sm">
          <div className="text-lg font-bold text-[#1C398E]">{totalInterviews}</div>
          <div className="text-xs text-gray-500">{showDeleted ? 'Deleted Interviews' : 'Total Interviews'}</div>
        </div>
        <div className="bg-white p-2 rounded border border-gray-200 shadow-sm">
          <div className="text-lg font-bold text-[#1C398E]">{completedInterviews}</div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
        <div className="bg-white p-2 rounded border border-gray-200 shadow-sm">
          <div className="text-lg font-bold text-[#1C398E]">{recentInterviews}</div>
          <div className="text-xs text-gray-500">Last 7 Days</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap gap-2 mb-2">
        <div className="flex gap-1">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                filterStatus === status
                  ? 'bg-[#1C398E] text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              {status} ({count})
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by candidate or position..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1C398E] focus:border-transparent transition-colors text-sm"
        />
        {!showDeleted && (
          <button
            onClick={addNewInterview}
            className="px-3 py-1 bg-[#1C398E] text-white rounded hover:bg-[#0f2a5c] transition-colors font-medium shadow-sm text-sm"
          >
            Add New Interview
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500 text-sm">Loading interviews...</div>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto relative bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="min-w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-3 py-2 text-left cursor-pointer text-xs font-medium text-gray-500 uppercase tracking-wider"
                onClick={() => {
                  if (sortBy === 'candidateName') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('candidateName');
                    setSortOrder('asc');
                  }
                }}
              >
                Candidate Name {sortBy === 'candidateName' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position Applied</th>
              <th
                className="px-3 py-2 text-left cursor-pointer text-xs font-medium text-gray-500 uppercase tracking-wider"
                onClick={() => {
                  if (sortBy === 'date') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('date');
                    setSortOrder('desc');
                  }
                }}
              >
                Interview Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closure Time</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInterviews.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-3 py-6 text-center text-gray-500 text-sm">
                  {showDeleted
                    ? 'No deleted interviews found.'
                    : 'No interviews found. Add your first interview'
                  }
                  {!showDeleted && (
                    <button onClick={addNewInterview} className="text-[#15803D] hover:underline font-medium"> here</button>
                  )}
                  .
                </td>
              </tr>
            ) : (
              filteredInterviews.map((interview) => (
                <tr key={interview.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 max-w-xs truncate" title={interview.candidateName}>{interview.candidateName}</td>
                  <td className="px-3 py-2 text-sm text-gray-500 max-w-32 truncate" title={interview.positionApplied}>{interview.positionApplied}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{new Date(interview.interviewDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      interview.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                      interview.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                      interview.status === 'Shortlisted' ? 'bg-purple-100 text-purple-800' :
                      interview.status === 'Final Round' ? 'bg-orange-100 text-orange-800' :
                      interview.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      interview.status === 'Offered' ? 'bg-teal-100 text-teal-800' :
                      interview.status === 'Hired' ? 'bg-emerald-100 text-emerald-800' :
                      interview.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      interview.status === 'No Show' ? 'bg-gray-100 text-gray-800' :
                      interview.status === 'On Hold' ? 'bg-amber-100 text-amber-800' :
                      interview.status === 'Withdrawn' ? 'bg-slate-100 text-slate-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {interview.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{calculateClosureTime(interview)}</td>
                  <td className="px-3 py-2 text-sm text-gray-500 max-w-32 truncate">{interview.notes}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-center relative dropdown-container">
                    <div className="relative">
                      <button
                        onClick={() => {
                          setDropdownOpen(dropdownOpen === interview.id ? null : interview.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        ⋮
                      </button>
                      {dropdownOpen === interview.id && (
                        <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                          <button
                            onClick={() => {
                              editInterview(interview);
                              setDropdownOpen(null);
                            }}
                            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              duplicateInterview(interview);
                              setDropdownOpen(null);
                            }}
                            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                          >
                            Copy
                          </button>
                          {showDeleted ? (
                            <button
                              onClick={() => {
                                restoreInterview(interview.id);
                                setDropdownOpen(null);
                              }}
                              className="block w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                deleteInterview(interview.id);
                                setDropdownOpen(null);
                              }}
                              className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
        </>
      )}

      {/* Add Interview Modal */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-54 p-4">
          <div className="bg-white rounded-lg w-full max-w-md border border-gray-200 shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-4 overflow-y-visible flex-1">
              <div className="min-w-[400px] overflow-x-auto">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Add New Interview</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Candidate Name</label>
                    <input
                      type="text"
                      value={formData.candidateName}
                      onChange={(e) => setFormData({...formData, candidateName: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Position Applied</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.positionApplied}
                        onChange={(e) => handlePositionChange(e.target.value)}
                        onFocus={handlePositionFocus}
                        onBlur={handlePositionBlur}
                        className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                        placeholder="Type or select position..."
                      />
                      {positionDropdownOpen && positionSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {positionSuggestions.map((position, index) => (
                            <div
                              key={index}
                              onClick={() => selectPosition(position)}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-900"
                            >
                              {position}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Interview Date</label>
                    <input
                      type="date"
                      value={formData.interviewDate}
                      onChange={(e) => setFormData({...formData, interviewDate: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Final Round">Final Round</option>
                      <option value="Completed">Completed</option>
                      <option value="Offered">Offered</option>
                      <option value="Hired">Hired</option>
                      <option value="Rejected">Rejected</option>
                      <option value="No Show">No Show</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Withdrawn">Withdrawn</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                      rows="3"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-white">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setPositionDropdownOpen(false);
                  setPositionSuggestions([]);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveNewInterview}
                className="px-3 py-1.5 bg-[#1C398E] text-white rounded-md hover:bg-[#0f2a5c] transition-colors font-medium text-sm"
              >
                Add Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Interview Modal */}
      {showEditModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-54 p-4">
          <div className="bg-white rounded-lg w-full max-w-md border border-gray-200 shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-4 overflow-y-visible flex-1">
              <div className="min-w-[400px] overflow-x-auto">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Edit Interview</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Candidate Name</label>
                    <input
                      type="text"
                      value={formData.candidateName}
                      onChange={(e) => setFormData({...formData, candidateName: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Position Applied</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.positionApplied}
                        onChange={(e) => handlePositionChange(e.target.value)}
                        onFocus={handlePositionFocus}
                        onBlur={handlePositionBlur}
                        className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                        placeholder="Type or select position..."
                      />
                      {positionDropdownOpen && positionSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {positionSuggestions.map((position, index) => (
                            <div
                              key={index}
                              onClick={() => selectPosition(position)}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-900"
                            >
                              {position}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Interview Date</label>
                    <input
                      type="date"
                      value={formData.interviewDate}
                      onChange={(e) => setFormData({...formData, interviewDate: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Final Round">Final Round</option>
                      <option value="Completed">Completed</option>
                      <option value="Offered">Offered</option>
                      <option value="Hired">Hired</option>
                      <option value="Rejected">Rejected</option>
                      <option value="No Show">No Show</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Withdrawn">Withdrawn</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                      rows="3"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-white">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setPositionDropdownOpen(false);
                  setPositionSuggestions([]);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveEditedInterview}
                className="px-3 py-1.5 bg-[#1C398E] text-white rounded-md hover:bg-[#0f2a5c] transition-colors font-medium text-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewSchedulerTab;