import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import StudentListModal from "../components/Placement/StudentListModal";
import AddJD from "../components/Placement/AddJd/AddJD";
import CompanyOpen from "../components/Placement/CompanyOpen/CompanyOpen";
import CompanyLeads from "../components/Placement/CompanyLeads/CompanyLeads";
import MouPreviewModal from "../components/Placement/MouPreviewModal";
import PlacementDetailsModal from "../components/Placement/PlacementDetailsModal";
import { Eye, User, FileText } from "lucide-react";
import BudgetDashboard from "../components/Budget/BudgetDashboard";

function Placement() {
  const [trainingData, setTrainingData] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [studentModalData, setStudentModalData] = useState({
    show: false,
    students: [],
  });
  const [showJDForm, setShowJDForm] = useState(false);
  const [mouPreview, setMouPreview] = useState({
    show: false,
    url: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentError, setStudentError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [progressData, setProgressData] = useState({});
  const [filters, setFilters] = useState({
    courseType: [], // Changed to array for multi-select
    year: [], // Changed to array for multi-select
    deliveryType: 'TP'
  });
  const [filterDropdowns, setFilterDropdowns] = useState({
    courseType: false,
    year: false,
    deliveryType: false
  });
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [sortBy, setSortBy] = useState('projectCode');
  const [sortOrder, setSortOrder] = useState('asc');

  // Enhanced Tab Navigation State with localStorage persistence
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem("placementActiveTab");
    return saved || "training";
  });

  // Persist active tab changes
  useEffect(() => {
    localStorage.setItem("placementActiveTab", activeTab);
  }, [activeTab]);

  // Inline CSS for animations
  const tableStyles = `
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out forwards;
    }
  `;

  // Get active tab index for sliding indicator
  const getActiveTabIndex = () => {
    const tabs = ["training", "placement", "leads", "budget"];
    return tabs.indexOf(activeTab);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch placementData
      const trainingSnapshot = await getDocs(collection(db, "placementData"));
      const trainingData = trainingSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTrainingData(trainingData);

      // Fetch progress for each trainingData
      const progressPromises = trainingData.map(async (item) => {
        try {
          const docName = item.projectCode.replace(/\//g, "-");
          const trainingsCollectionRef = collection(
            db,
            "trainingForms",
            docName,
            "trainings"
          );

          const trainingsSnap = await getDocs(trainingsCollectionRef);
          if (trainingsSnap.empty) {
            return { projectCode: item.projectCode, phases: [] };
          }

          const phases = trainingsSnap.docs.map((phaseDoc) => {
            const data = phaseDoc.data();
            return {
              name: phaseDoc.id,
              status: data.status || "not started",
            };
          });

          return { projectCode: item.projectCode, phases };
        } catch (err) {
          console.error(`Error fetching status for ${item.projectCode}:`, err);
          return { projectCode: item.projectCode, phases: [] };
        }
      });
      const progressResults = await Promise.all(progressPromises);

      const progressMap = {};
      progressResults.forEach((res) => {
        progressMap[res.projectCode] = res.phases;
      });

      setProgressData(progressMap);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set default year and course selections (2nd and 4th) after data is loaded
  useEffect(() => {
    if (trainingData.length > 0 && !hasUserInteracted) {
      const uniqueYears = [...new Set(trainingData.map(item => item.year).filter(Boolean))].sort();
      const courseFrequency = {};
      trainingData.forEach(item => {
        if (item.course) {
          courseFrequency[item.course] = (courseFrequency[item.course] || 0) + 1;
        }
      });
      const uniqueCourses = Object.entries(courseFrequency)
        .sort(([,a], [,b]) => b - a) // Sort by frequency descending
        .map(([course]) => course);

      let shouldUpdate = false;
      const newFilters = { ...filters };

      // Set default years (2nd and 4th) only if not already set
      if (newFilters.year.length === 0 && uniqueYears.length >= 4) {
        newFilters.year = [uniqueYears[1], uniqueYears[3]];
        shouldUpdate = true;
      }

      // Set default courses (engineering and MBA-related courses) only if not already set
      if (newFilters.courseType.length === 0 && uniqueCourses.length >= 1) {
        // Find only "Engineering" and "MBA" courses
        const relevantCourses = uniqueCourses.filter(course => 
          course.toLowerCase() === 'engineering' || 
          course.toLowerCase() === 'mba'
        );
        
        if (relevantCourses.length > 0) {
          newFilters.courseType = relevantCourses.slice(0, 2); // Take Engineering and MBA
          shouldUpdate = true;
        } else {
          // Fallback to most common if Engineering/MBA not found
          newFilters.courseType = [uniqueCourses[0]];
          shouldUpdate = true;
        }
      }

      if (shouldUpdate) {
        setFilters(newFilters);
      }
    }
  }, [trainingData, hasUserInteracted, filters]);

  const fetchStudentData = useCallback(async (trainingDocId, projectCode) => {
    try {
      setStudentError(null);

      // Use projectCode instead of trainingDocId to build the path
      const docName = projectCode.replace(/\//g, "-");
      const studentsSnapshot = await getDocs(
        collection(db, "placementData", docName, "students")
      );

      const students = studentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setStudentModalData({ show: true, students });
      setDropdownOpen(null);
    } catch (err) {
      console.error("Error fetching students:", err);
      setStudentError("Failed to load student data.");
    }
  }, []);

  const handleViewDetails = (item) => {
    setSelectedTraining(item);
    setDropdownOpen(null);
  };

  const handleMouPreview = (item) => {
    setMouPreview({
      show: true,
      url: item.mouFileUrl,
    });
    setDropdownOpen(null);
  };

  const toggleDropdown = (itemId, event) => {
    event.stopPropagation();
    setDropdownOpen(dropdownOpen === itemId ? null : itemId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null);
      setFilterDropdowns({
        courseType: false,
        year: false,
        deliveryType: false
      });
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Helper function to format cell values
  const formatCellValue = (value) => {
    if (value == null || value === "") return "N/A";
    return String(value);
  };

  // Function to check if dropdown should open above (for bottom rows)
  const getDropdownPosition = (index) => {
    // If it's one of the last 3 rows, open dropdown above
    return index >= sortedFilteredData.length - 3 ? "above" : "below";
  };

  // Filter training data based on selected filters
  const filteredTrainingData = trainingData.filter(item => {
    const courseTypeMatch = filters.courseType.length === 0 || filters.courseType.includes('all') || filters.courseType.some(course => item.course?.toLowerCase().includes(course.toLowerCase()));
    const yearMatch = filters.year.length === 0 || filters.year.includes(item.year);
    const deliveryTypeMatch = filters.deliveryType === 'all' || item.deliveryType === filters.deliveryType;

    return courseTypeMatch && yearMatch && deliveryTypeMatch;
  });

  // Get unique values for filter dropdowns, sorted by frequency
  const uniqueYears = [...new Set(trainingData.map(item => item.year).filter(Boolean))].sort();
  
  // Count frequency of courses and sort by most common first
  const courseFrequency = {};
  trainingData.forEach(item => {
    if (item.course) {
      courseFrequency[item.course] = (courseFrequency[item.course] || 0) + 1;
    }
  });
  const uniqueCourses = Object.entries(courseFrequency)
    .sort(([,a], [,b]) => b - a) // Sort by frequency descending
    .map(([course]) => course);
  
  // Count frequency of delivery types and sort by most common first
  const deliveryTypeFrequency = {};
  trainingData.forEach(item => {
    if (item.deliveryType) {
      deliveryTypeFrequency[item.deliveryType] = (deliveryTypeFrequency[item.deliveryType] || 0) + 1;
    }
  });
  const uniqueDeliveryTypes = Object.entries(deliveryTypeFrequency)
    .sort(([,a], [,b]) => b - a) // Sort by frequency descending
    .map(([type]) => type);

  // Sort the filtered data
  const sortedFilteredData = [...filteredTrainingData].sort((a, b) => {
    if (sortBy === 'projectCode') {
      const aVal = a.projectCode || '';
      const bVal = b.projectCode || '';
      if (sortOrder === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    }
    return 0;
  });

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setHasUserInteracted(true); // Mark that user has interacted
    if (filterType === 'year') {
      if (value === 'all') {
        setFilters(prev => ({
          ...prev,
          [filterType]: []
        }));
      } else {
        setFilters(prev => ({
          ...prev,
          [filterType]: prev[filterType].includes(value)
            ? prev[filterType].filter(item => item !== value)
            : [...prev[filterType], value]
        }));
      }
    } else if (filterType === 'courseType') {
      if (value === 'all') {
        // For courseType, "all" is a selectable option
        setFilters(prev => ({
          ...prev,
          [filterType]: prev[filterType].includes('all')
            ? prev[filterType].filter(item => item !== 'all')
            : ['all']
        }));
      } else {
        // If selecting a specific course, remove "all" if it was selected
        setFilters(prev => ({
          ...prev,
          [filterType]: prev[filterType].includes(value)
            ? prev[filterType].filter(item => item !== value)
            : [...prev[filterType].filter(item => item !== 'all'), value]
        }));
      }
    } else {
      setFilters(prev => ({
        ...prev,
        [filterType]: value
      }));
    }
  };

  // Toggle filter dropdowns
  const toggleFilterDropdown = (filterType) => {
    setFilterDropdowns(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  // Handle sorting
  const handleSort = () => {
    if (sortBy === 'projectCode') {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy('projectCode');
      setSortOrder('asc');
    }
  };

  return (
    <div className="p-0 -mt-1">
      <style>{tableStyles}</style>
      <h2 className="text-xl font-bold mb-2 text-blue-800 mt-0">
        Placement Management
      </h2>

      {loading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-3">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="mt-1 text-red-500 hover:text-red-700 font-medium text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Enhanced Tab Navigation with Sliding Indicator */}
          <div className="relative mb-2">
            <div className="flex border-b border-gray-200">
              <button
                className={`flex-1 px-4 py-2 font-medium text-sm transition-all duration-150 ${
                  activeTab === "training"
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("training")}
                data-tour="training-tab"
              >
                Programs & Colleges ({filteredTrainingData.length})
              </button>
              <button
                className={`flex-1 px-4 py-2 font-medium text-sm transition-all duration-150 ${
                  activeTab === "placement"
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("placement")}
                data-tour="placement-tab"
              >
                Job Openings
              </button>
              <button
                className={`flex-1 px-4 py-2 font-medium text-sm transition-all duration-150 ${
                  activeTab === "leads"
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("leads")}
                data-tour="leads-tab"
              >
                Company Leads
              </button>
              <button
                className={`flex-1 px-4 py-2 font-medium text-sm transition-all duration-150 ${
                  activeTab === "budget"
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("budget")}
                data-tour="budget-tab"
              >
                Budget Management
              </button>
            </div>
            {/* Sliding Indicator */}
            <div
              className="absolute bottom-0 h-0.5 bg-blue-600 transition-transform duration-150 ease-out"
              style={{
                width: "25%", // Changed from 33.333% to 25% for 4 tabs
                transform: `translateX(${getActiveTabIndex() * 100}%)`,
              }}
            ></div>
          </div>

          {activeTab === "training" && (
            <>
              {/* Summary Dashboard */}
              {!loading && !error && trainingData.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                  {/* Total Programs */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Total Programs</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{filteredTrainingData.length}</p>
                      </div>
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Engineering Colleges */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Engineering</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {filteredTrainingData.filter(item => 
                            item.course?.toLowerCase().includes('engineering') || 
                            item.course?.toLowerCase().includes('b.tech') ||
                            item.course?.toLowerCase().includes('b.e.') ||
                            item.course?.toLowerCase().includes('m.tech')
                          ).length}
                        </p>
                      </div>
                      <div className="bg-green-50 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* MBA Colleges */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">MBA</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {filteredTrainingData.filter(item => 
                            item.course?.toLowerCase().includes('mba') || 
                            item.course?.toLowerCase().includes('pgdm') ||
                            item.course?.toLowerCase().includes('management')
                          ).length}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Total Students */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Total Students</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {filteredTrainingData.reduce((total, item) => total + (parseInt(item.studentCount) || 0), 0)}
                        </p>
                      </div>
                      <div className="bg-indigo-50 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab.length === 0 ? (
                <div className="text-center py-6">
                  <svg
                    className="mx-auto h-8 w-8 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-1 text-sm font-medium text-gray-900">
                    No training data found
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    There are currently no training programs to display.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Compact Modern Header */}
                  <div className="bg-linear-to-r from-blue-500 via-indigo-600 to-indigo-700 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white text-base font-semibold">Training Programs</h3>
                      <div className="flex items-center space-x-2">
                        {/* Course Type Filter */}
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFilterDropdown('courseType'); }}
                            className="flex items-center px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium transition-colors"
                          >
                            <span>Course: {filters.courseType.length === 0 ? 'None' : filters.courseType.includes('all') ? 'All' : filters.courseType.length === 1 ? filters.courseType[0] : `${filters.courseType.length} selected`}</span>
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {filterDropdowns.courseType && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                              <div className="p-1">
                                <div 
                                  className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); handleFilterChange('courseType', 'all'); }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={filters.courseType.includes('all')}
                                    onChange={() => {}} // Handled by parent onClick
                                    className="mr-2 h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  All
                                </div>
                                {uniqueCourses.map(course => (
                                  <div 
                                    key={course} 
                                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); handleFilterChange('courseType', course); }}
                                    title={course}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={filters.courseType.includes(course)}
                                      onChange={() => {}} // Handled by parent onClick
                                      className="mr-2 h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="truncate">{course.length > 15 ? `${course.substring(0, 15)}...` : course}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Year Filter */}
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFilterDropdown('year'); }}
                            className="flex items-center px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium transition-colors"
                          >
                            <span>Year: {filters.year.length === 0 ? 'All' : filters.year.length === 1 ? filters.year[0] : `${filters.year.length} selected`}</span>
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {filterDropdowns.year && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                              <div className="p-1">
                                <div 
                                  className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); handleFilterChange('year', 'all'); }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={filters.year.length === 0}
                                    onChange={() => {}} // Handled by parent onClick
                                    className="mr-2 h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  All
                                </div>
                                {uniqueYears.map(year => (
                                  <div 
                                    key={year} 
                                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); handleFilterChange('year', year); }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={filters.year.includes(year)}
                                      onChange={() => {}} // Handled by parent onClick
                                      className="mr-2 h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    {year}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Delivery Type Filter */}
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFilterDropdown('deliveryType'); }}
                            className="flex items-center px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium transition-colors"
                          >
                            <span>Type: {filters.deliveryType === 'all' ? 'All' : filters.deliveryType}</span>
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {filterDropdowns.deliveryType && (
                            <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                              <div className="p-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleFilterChange('deliveryType', 'all'); toggleFilterDropdown('deliveryType'); }}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                                >
                                  All
                                </button>
                                {uniqueDeliveryTypes.map(type => (
                                  <button
                                    key={type}
                                    onClick={(e) => { e.stopPropagation(); handleFilterChange('deliveryType', type); toggleFilterDropdown('deliveryType'); }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                                  >
                                    {type}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <span className="text-blue-100 text-xs">{filteredTrainingData.length} programs</span>
                      </div>
                    </div>
                  </div>

                  {/* Compact Table Header */}
                  <div className="bg-gray-50/50 px-4 py-2 border-b border-gray-100">
                    <div className="grid grid-cols-[200px_1fr_1fr_80px_80px_80px_1fr_1fr_80px] gap-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center cursor-pointer hover:text-gray-800" onClick={handleSort}>
                        <span>Project Code</span>
                        {sortBy === 'projectCode' && (
                          <div className="flex items-center ml-2">
                            <span className="text-xs font-normal text-gray-500 mr-1">
                              {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                            </span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>College</div>
                      <div>Course</div>
                      <div>Year</div>
                      <div>Type</div>
                      <div>Students</div>
                      <div>Domains</div>
                      <div>Progress</div>
                      <div>Actions</div>
                    </div>
                  </div>

                  {/* Compact Table Body */}
                  <div className="divide-y divide-gray-50">
                    {sortedFilteredData.map((item, index) => {
                      const dropdownPosition = getDropdownPosition(index);

                      return (
                        <div
                          key={item.id}
                          className="px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                          onClick={() => handleViewDetails(item)}
                        >
                          <div className="grid grid-cols-[200px_1fr_1fr_80px_80px_80px_1fr_1fr_80px] gap-3 items-center">
                            {/* Project Code */}
                            <div>
                              <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-100 whitespace-nowrap">
                                {formatCellValue(item.projectCode)}
                              </div>
                            </div>

                            {/* College */}
                            <div>
                              <span className="text-gray-900 text-xs font-medium block max-w-full" title={formatCellValue(item.collegeName)}>
                                {formatCellValue(item.collegeName)}
                              </span>
                            </div>

                            {/* Course */}
                            <div>
                              <span className="text-gray-700 text-xs block max-w-full" title={formatCellValue(item.course)}>
                                {formatCellValue(item.course)}
                              </span>
                            </div>

                            {/* Year */}
                            <div>
                              <span className="text-gray-700 text-xs font-medium">
                                {formatCellValue(item.year)}
                              </span>
                            </div>

                            {/* Type */}
                            <div>
                              <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${
                                item.deliveryType === 'TP' 
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : 'bg-purple-100 text-purple-800 border border-purple-200'
                              }`}>
                                {formatCellValue(item.deliveryType)}
                              </span>
                            </div>

                            {/* Students */}
                            <div>
                              <div className="flex items-center">
                                <div className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs font-medium border border-indigo-100">
                                  {formatCellValue(item.studentCount)}
                                </div>
                              </div>
                            </div>

                            {/* Domains */}
                            <div>
                              {item.courses && item.courses.length > 0 ? (
                                <div className="flex flex-wrap gap-0.5">
                                  {item.courses.slice(0, 3).map((course, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-linear-to-r from-indigo-50 to-purple-50 text-indigo-700 px-1.5 py-0.5 rounded-md text-xs font-medium border border-indigo-200 flex items-center gap-1"
                                      title={`${course.specialization || 'N/A'}: ${course.students || 'N/A'} students`}
                                    >
                                      <span className="font-semibold">{course.specialization || 'N/A'}</span>
                                      <span className="text-indigo-600">({course.students || 'N/A'})</span>
                                    </div>
                                  ))}
                                  {item.courses.length > 3 && (
                                    <div className="bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded-md text-xs font-medium border border-gray-200">
                                      +{item.courses.length - 3}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-500 italic">No domains</span>
                              )}
                            </div>

                            {/* Progress */}
                            <div>
                              {progressData[item.projectCode] ? (
                                progressData[item.projectCode].length > 0 ? (
                                  <div className="flex flex-wrap gap-0.5">
                                    {progressData[item.projectCode].map((phase, idx) => (
                                      <span
                                        key={idx}
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${
                                          phase.status === "Done"
                                            ? "bg-green-50 text-green-700 border-green-200"
                                            : phase.status === "Initiated"
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : phase.status === "Ongoing"
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : phase.status === "Hold"
                                            ? "bg-red-50 text-red-700 border-red-200"
                                            : "bg-gray-50 text-gray-600 border-gray-200"
                                        }`}
                                        title={`${phase.name}: ${phase.status}`}
                                      >
                                        <span className={`w-1 h-1 rounded-full mr-1 ${
                                          phase.status === "Done"
                                            ? "bg-green-500"
                                            : phase.status === "Initiated"
                                            ? "bg-amber-500"
                                            : phase.status === "Ongoing"
                                            ? "bg-blue-500"
                                            : phase.status === "Hold"
                                            ? "bg-red-500"
                                            : "bg-gray-400"
                                        }`}></span>
                                        {phase.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500 italic">No phases</span>
                                )
                              ) : (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-2.5 w-2.5 border border-gray-300 border-t-gray-600"></div>
                                  <span className="ml-1 text-xs text-gray-500">Loading...</span>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-center">
                              <div className="relative">
                                <button
                                  onClick={(e) => toggleDropdown(item.id, e)}
                                  className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all duration-200 group-hover:shadow-sm"
                                  title="Actions"
                                >
                                  <svg
                                    className="w-3.5 h-3.5 text-gray-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                    />
                                  </svg>
                                </button>

                                {dropdownOpen === item.id && (
                                  <div
                                    className={`absolute right-0 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-10 ${
                                      dropdownPosition === "above"
                                        ? "bottom-full mb-1"
                                        : "top-full mt-1"
                                    }`}
                                  >
                                    <div className="p-1">
                                      <button
                                        onClick={() => handleViewDetails(item)}
                                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                      >
                                        <Eye className="w-4 h-4 mr-2 text-blue-500" />
                                        <span>View Details</span>
                                      </button>

                                      <button
                                        onClick={() =>
                                          fetchStudentData(
                                            item.id,
                                            item.projectCode
                                          )
                                        }
                                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                      >
                                        <User className="w-4 h-4 mr-2 text-green-500" />
                                        <span>Student Data</span>
                                      </button>
                                      <button
                                        onClick={() => handleMouPreview(item)}
                                        disabled={!item.mouFileUrl}
                                        className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                                          item.mouFileUrl
                                            ? "text-gray-700 hover:bg-gray-50"
                                            : "text-gray-400 cursor-not-allowed"
                                        }`}
                                      >
                                        <FileText className="w-4 h-4 mr-2 text-purple-500" />
                                        <span>MOU File</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Compact Empty State */}
                  {sortedFilteredData.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-200">
                        <svg
                          className="mx-auto h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          No training programs found
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Try adjusting your filters to see more results.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === "placement" && <CompanyOpen />}

          {activeTab === "leads" && (
            <CompanyLeads
              leads={leads}
              onLeadSelect={(lead) => {
                setSelectedLead(lead);
                setActiveTab("placement");
              }}
            />
          )}

          {activeTab === "budget" && (
            <BudgetDashboard
              department="placement"
              dashboardTitle="Placement Department Budget"
            />
          )}

          {selectedTraining && (
            <PlacementDetailsModal
              training={selectedTraining}
              onClose={() => setSelectedTraining(null)}
            />
          )}

          {studentModalData.show && (
            <StudentListModal
              students={studentModalData.students}
              onClose={() => setStudentModalData({ show: false, students: [] })}
              error={studentError}
            />
          )}

          {showJDForm && (
            <AddJD show={showJDForm} onClose={() => setShowJDForm(false)} />
          )}

          {selectedLead && (
            <CompanyOpen
              selectedLead={selectedLead}
              onClose={() => setSelectedLead(null)}
              onAddJD={(leadId, jdData) => {
                setLeads(
                  leads.map((lead) =>
                    lead.id === leadId
                      ? { ...lead, jds: [...(lead.jds || []), jdData] }
                      : lead
                  )
                );
              }}
            />
          )}

          {mouPreview.show && (
            <MouPreviewModal
              show={mouPreview.show}
              onClose={() => setMouPreview({ show: false, url: null })}
              mouFileUrl={mouPreview.url}
            />
          )}
        </>
      )}
    </div>
  );
}

export default Placement;
