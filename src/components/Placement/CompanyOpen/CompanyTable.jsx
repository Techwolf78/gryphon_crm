import React, { useState } from "react";
import {
  FaEllipsisV,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaUsers,
  FaCalendar,
  FaUniversity,
  FaDownload,
} from "react-icons/fa";
import CompanyDropdownActions from "./CompanyDropdownActions";
import StudentDataView from "./StudentDataView";
import StudentSelectionModal from "./StudentSelectionModal";
import { formatSalary, formatStipend } from "../../../utils/salaryUtils.js";

const borderColorMap = {
  complete: "border-l-4 border-green-500",
  ongoing: "border-l-4 border-amber-400",
  onhold: "border-l-4 border-cyan-400",
  cancel: "border-l-4 border-red-500",
  noapplications: "border-l-4 border-gray-400",
};

const headerColorMap = {
  complete: "bg-green-50 text-green-800 border-b border-green-200",
  ongoing: "bg-amber-50 text-amber-800 border-b border-amber-200",
  onhold: "bg-cyan-50 text-cyan-800 border-b border-cyan-200",
  cancel: "bg-red-50 text-red-800 border-b border-red-200",
  noapplications: "bg-gray-50 text-gray-800 border-b border-gray-200",
};

// Round status options
const roundStatusOptions = [
  { value: "pending", label: "Pending", color: "bg-gray-100 text-gray-800" },
  {
    value: "inprogress",
    label: "In Progress",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "completed",
    label: "Completed",
    color: "bg-green-100 text-green-800",
  },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
];

// Function to get college abbreviation
const getCollegeAbbreviation = (collegeName) => {
  if (!collegeName) return null;
  return collegeName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

// Function to format eligibility criteria for display
const formatEligibility = (company) => {
  const parts = [];

  if (company.course) {
    parts.push(company.course);
  }

  if (company.specialization && company.specialization.length > 0) {
    const specs = Array.isArray(company.specialization)
      ? company.specialization.join(", ")
      : company.specialization;
    parts.push(`(${specs})`);
  }

  if (company.passingYear) {
    parts.push(`Pass ${company.passingYear}`);
  }

  if (company.gender) {
    parts.push(company.gender);
  }

  if (company.marksCriteria && company.marksCriteria !== "No Criteria") {
    parts.push(company.marksCriteria);
  }

  if (company.backlogCriteria && company.backlogCriteria !== "No Criteria") {
    parts.push(company.backlogCriteria);
  }

  return parts.length > 0 ? parts.join(" | ") : "No criteria specified";
};

// Function to get round abbreviation
const getRoundAbbreviation = (roundName) => {
  if (!roundName) return "??";

  const roundMap = {
    "resume screening": "RS",
    "gd (group discussion)": "GD",
    "pi (personal interview)": "PI",
    "ti (technical interview)": "TI",
    "cr (coding round)": "CR",
    "hr round": "HR",
    others: "OT",
  };

  const lowerRound = roundName.toLowerCase();
  return (
    roundMap[lowerRound] ||
    roundName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  );
};

// ✅ UPDATED RoundStatus Component - Always show count, green when selected
const RoundStatus = ({
  status,
  roundName,
  onClick,
  studentCount = 0,
  totalStudents = 0,
  onStudentSelection,
  companyId,
  roundIndex,
  eligibleStudents = [],
  currentSelected = [],
  isDisabled = false,
  previousRoundName = null,
}) => {
  const statusConfig =
    roundStatusOptions.find((option) => option.value === status) ||
    roundStatusOptions[0];
  const roundAbbr = getRoundAbbreviation(roundName);

  const handleStudentListClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (isDisabled) {
      alert(`Please complete the previous round "${previousRoundName}" before selecting students for this round.`);
      return;
    }

    // Call parent function to open modal
    onStudentSelection(eligibleStudents, roundName, currentSelected, companyId, roundIndex);
  };

  return (
    <div
      className={`flex flex-col items-center gap-1 min-w-20 ${isDisabled ? 'opacity-50' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Round Name and Student Count */}
      <div className="flex items-center gap-1 w-full justify-center">
        <div className="flex items-center gap-1">
          <span
            className={`text-xs font-medium truncate ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}
            title={isDisabled ? `Complete "${previousRoundName}" first` : roundName}
          >
            {roundAbbr}
          </span>
          {isDisabled && (
            <svg 
              className="w-3 h-3 text-amber-500" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              title={`Waiting for "${previousRoundName}" to be completed`}
            >
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        {/* Always show student count button */}
        <button
          onClick={handleStudentListClick}
          disabled={isDisabled}
          className={`text-xs rounded-full w-5 h-5 flex items-center justify-center transition cursor-pointer text-center ${
            isDisabled 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
              : studentCount > 0
              ? "bg-green-500 text-white border border-green-600 shadow-md hover:scale-110"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300 hover:scale-110"
          }`}
          title={
            isDisabled 
              ? `Complete "${previousRoundName}" first before selecting students`
              : `${studentCount}/${totalStudents || 0} students selected - Click to manage`
          }
        >
          {studentCount}
        </button>
      </div>

      {/* Status Button */}
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`w-full px-2 py-1 rounded-full text-xs font-medium transition-all border border-transparent ${
          isDisabled 
            ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
            : `cursor-pointer hover:scale-105 active:scale-95 hover:border-gray-300 ${statusConfig.color}`
        }`}
        title={
          isDisabled 
            ? `Complete "${previousRoundName}" first before changing status`
            : `${roundName} - Click to change status (Current: ${statusConfig.label})`
        }
      >
        {statusConfig.label}
      </button>

      {/* Progress Bar - only show if there are eligible students */}
      {totalStudents > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div
            className={`h-1 rounded-full transition-all ${
              isDisabled ? "bg-gray-300" : studentCount === totalStudents ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${(studentCount / totalStudents) * 100}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};
function CompanyTable({
  filteredCompanies,
  activeTab,
  setSelectedCompany,
  dropdownOpen,
  setDropdownOpen,
  setShowJDForm,
  updateCompanyStatus,
  updateRoundStatus,
  fetchCompanyStudents,
  fetchTrainingFormStudents,
  onMatchStatsUpdate,
  onEditJD,
}) {
  const [expandedCompanies, setExpandedCompanies] = useState({});
  const [selectedCompanyForStudents, setSelectedCompanyForStudents] = useState(null);
  const [companyMatchStats, setCompanyMatchStats] = useState({});
  const [roundStudents, setRoundStudents] = useState(() => {
    // Load from localStorage on initial render
    try {
      const saved = localStorage.getItem('placementRoundSelections');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading round selections from localStorage:', error);
      return {};
    }
  });
  const [companyStudentsData, setCompanyStudentsData] = useState({});
  
  // NEW STATE FOR STUDENT MODAL
  const [studentModalData, setStudentModalData] = useState({
    isOpen: false,
    students: [],
    roundName: "",
    currentSelected: [],
    companyId: null,
    roundIndex: null
  });

  // Save to localStorage whenever roundStudents changes
  React.useEffect(() => {
    try {
      localStorage.setItem('placementRoundSelections', JSON.stringify(roundStudents));
    } catch (error) {
      console.error('Error saving round selections to localStorage:', error);
    }
  }, [roundStudents]);

  // Function to handle round student selection
  const handleRoundStudentSelection = (
    companyId,
    roundIndex,
    selectedStudentIds
  ) => {
    setRoundStudents((prev) => {
      const updated = {
        ...prev,
        [companyId]: {
          ...prev[companyId],
          [roundIndex]: selectedStudentIds,
        },
      };

      return updated;
    });
  };

  // Function to get students for a specific round (CARRY-FORWARD)
  const getStudentsForRound = React.useCallback((companyId, roundIndex, companyStudents) => {
    if (roundIndex === 0) {
      // First round - all students are eligible
      return companyStudents;
    }

    // For subsequent rounds, only students selected in previous round are eligible
    const previousRoundStudents = roundStudents[companyId]?.[roundIndex - 1];
    if (!previousRoundStudents || previousRoundStudents.length === 0) {
      return [];
    }

    // Filter companyStudents based on previous round selection
    return companyStudents.filter((student) => {
      return previousRoundStudents.some(selected => 
        selected.studentName === student.studentName && selected.email === student.email
      );
    });
  }, [roundStudents]);

// ✅ FIXED: handleOpenStudentModal - Always open modal and load students if needed
const handleOpenStudentModal = React.useCallback(async (eligibleStudents, roundName, currentSelected, companyId, roundIndex) => {
  // Find the company object from filteredCompanies
  const company = filteredCompanies.find(c => c.id === companyId);
  
  // Ensure students are loaded for this company
  let companyStudents = companyStudentsData[companyId];
  if (!companyStudents && company) {
    try {
      companyStudents = await fetchCompanyStudents(company);
      setCompanyStudentsData((prev) => ({
        ...prev,
        [companyId]: companyStudents,
      }));
    } catch (error) {
      console.error("Error loading students for modal:", error);
      companyStudents = [];
    }
  }
  
  // Get eligible students for this round (use fresh data if available)
  const finalEligibleStudents = companyStudents ? getStudentsForRound(companyId, roundIndex, companyStudents) : eligibleStudents;
  
  // ✅ Always open modal
  setStudentModalData({
    isOpen: true,
    students: finalEligibleStudents,
    roundName,
    currentSelected,
    companyId,
    roundIndex
  });
}, [filteredCompanies, companyStudentsData, fetchCompanyStudents, getStudentsForRound]);

// ✅ FIXED: handleStudentSelection with useCallback
const handleStudentSelection = React.useCallback((selectedStudents) => {
  if (studentModalData.companyId !== null && studentModalData.roundIndex !== null) {
    handleRoundStudentSelection(
      studentModalData.companyId,
      studentModalData.roundIndex,
      selectedStudents
    );
  }
  setStudentModalData({
    isOpen: false,
    students: [],
    roundName: "",
    currentSelected: [],
    companyId: null,
    roundIndex: null
  });
}, [studentModalData.companyId, studentModalData.roundIndex]);

  // Function to get currently selected students for a round
  const getCurrentSelectedForRound = (companyId, roundIndex) => {
    const companyRounds = roundStudents[companyId];
    if (!companyRounds || !companyRounds[roundIndex]) return [];
    return companyRounds[roundIndex];
  };

  const getStudentsForCompany = async (company) => {
    if (companyStudentsData[company.id]) {
      return companyStudentsData[company.id];
    }

    try {
      const students = await fetchCompanyStudents(company);
      setCompanyStudentsData((prev) => ({
        ...prev,
        [company.id]: students,
      }));
      return students;
    } catch (error) {
      console.error("Error fetching students:", error);
      return [];
    }
  };

  // Student match check function
  const checkStudentMatches = async (company) => {
    if (!company?.companyName || !company?.college)
      return { matched: 0, total: 0, unmatched: [] };

    try {
      const studentListStudents = await fetchCompanyStudents(company);
      
      const trainingFormStudents = await fetchTrainingFormStudents(
        company.college
      );

      const unmatchedStudents = [];

      studentListStudents.forEach((studentListStudent) => {
        const matched = trainingFormStudents.some((trainingStudent) => {
          const nameMatch =
            studentListStudent.studentName?.toLowerCase().trim() ===
            trainingStudent["FULL NAME OF STUDENT"]?.toLowerCase().trim();
          const emailMatch =
            studentListStudent.email?.toLowerCase().trim() ===
            trainingStudent["EMAIL ID"]?.toLowerCase().trim();
          const isMatch = nameMatch || emailMatch;
          
          return isMatch;
        });

        if (!matched) {
          unmatchedStudents.push({
            ...studentListStudent,
            matchStatus: "unmatched",
          });
        }
      });

      const result = {
        matched: studentListStudents.length - unmatchedStudents.length,
        total: studentListStudents.length,
        unmatched: unmatchedStudents,
      };

      setCompanyMatchStats((prev) => ({
        ...prev,
        [company.id]: result,  // Store by company ID instead of company name
      }));

      if (onMatchStatsUpdate) {
        onMatchStatsUpdate(result);
      }

      return result;
    } catch (error) {
      console.error("Error matching students:", error);
      return { matched: 0, total: 0, unmatched: [] };
    }
  };

  // Group companies by companyName
  const groupedCompanies = filteredCompanies.reduce((acc, company) => {
    const companyName = company.companyName || "Unknown";
    if (!acc[companyName]) {
      acc[companyName] = [];
    }
    acc[companyName].push(company);
    return acc;
  }, {});

  // State to track visibility of per-company match lists for each company group
  const [showGroupMatchList, setShowGroupMatchList] = useState({});

  // Toggle expand/collapse for company group
  const toggleCompanyExpand = async (companyName, companies) => {
    if (!expandedCompanies[companyName]) {
      // Check student matches for each college in the company group
      await Promise.all(companies.map(company => checkStudentMatches(company)));
      // Load students for each company
      await Promise.all(companies.map(company => getStudentsForCompany(company)));
    }

    setExpandedCompanies((prev) => ({
      ...prev,
      [companyName]: !prev[companyName],
    }));
  };

  // Toggle match-count list visibility. Ensure match data is loaded first.
  const toggleGroupMatchListVisibility = async (companyName, companies, e) => {
    if (e) e.stopPropagation();
    // Make sure matches are computed for all companies in the group
    await Promise.all(companies.map((company) => checkStudentMatches(company)));

    setShowGroupMatchList((prev) => ({
      ...prev,
      [companyName]: !prev[companyName],
    }));
  };

  // Export matched students across colleges in a group to CSV
  const exportMatchedStudentsCSV = async (companyName, companies, e) => {
    if (e) e.stopPropagation();

    // Ensure match stats and students are loaded
    await Promise.all(companies.map((c) => checkStudentMatches(c)));
    await Promise.all(companies.map((c) => getStudentsForCompany(c)));

    // Build rows for matched students
    const rows = [];
    companies.forEach((comp) => {
      const students = companyStudentsData[comp.id] || [];
      const unmatched = companyMatchStats[comp.id]?.unmatched || [];
      const unmatchedKeys = new Set(unmatched.map(u => ((u.email || u.studentName || '') + '').toLowerCase().trim()));

      const matched = students.filter(s => {
        const key = ((s.email || s.studentName || '') + '').toLowerCase().trim();
        return !unmatchedKeys.has(key);
      });

      matched.forEach((m) => {
        rows.push({
          studentName: m.studentName || m['FULL NAME OF STUDENT'] || m.name || '',
          email: m.email || m['EMAIL ID'] || '',
          phone: m.phone || m.mobile || '',
          college: m.college || comp.college || '',
          companyName: comp.companyName || companyName || '',
          enrollmentNo: m.enrollmentNo || m.enrollment || m['ENROLLMENT NUMBER'] || ''
        });
      });
    });

    if (!rows.length) {
      alert('No matched students found for this group.');
      return;
    }

    // Build CSV
    const headers = ['SR NO', 'STUDENT NAME', 'ENROLLMENT NO', 'EMAIL', 'PHONE', 'COLLEGE', 'COMPANY'];
    const csvRows = [headers.join(',')];

    rows.forEach((r, i) => {
      const safe = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      };
      csvRows.push([
        i + 1,
        safe(r.studentName),
        safe(r.enrollmentNo),
        safe(r.email),
        safe(r.phone),
        safe(r.college),
        safe(r.companyName),
      ].join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `${companyName.replace(/\s+/g, '_')}_matched_students_${new Date().toISOString().split('T')[0]}.csv`;
    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, fileName);
    } else {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  };

  // Export matched students for a single company to CSV
  const exportMatchedForCompanyCSV = async (company, e) => {
    if (e) e.stopPropagation();

    await checkStudentMatches(company);
    await getStudentsForCompany(company);

    const students = companyStudentsData[company.id] || [];
    const unmatched = companyMatchStats[company.id]?.unmatched || [];
    const unmatchedKeys = new Set(unmatched.map(u => ((u.email || u.studentName || '') + '').toLowerCase().trim()));

    const matched = students.filter(s => {
      const key = ((s.email || s.studentName || '') + '').toLowerCase().trim();
      return !unmatchedKeys.has(key);
    });

    if (!matched.length) {
      alert('No matched students found for this college.');
      return;
    }

    const rows = matched.map((m) => ({
      studentName: m.studentName || m['FULL NAME OF STUDENT'] || m.name || '',
      email: m.email || m['EMAIL ID'] || '',
      phone: m.phone || m.mobile || '',
      college: m.college || company.college || '',
      companyName: company.companyName || '',
      enrollmentNo: m.enrollmentNo || m.enrollment || m['ENROLLMENT NUMBER'] || ''
    }));

    // CSV
    const headers = ['SR NO', 'STUDENT NAME', 'ENROLLMENT NO', 'EMAIL', 'PHONE', 'COLLEGE', 'COMPANY'];
    const csvRows = [headers.join(',')];
    rows.forEach((r, i) => {
      const safe = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      };
      csvRows.push([
        i + 1,
        safe(r.studentName),
        safe(r.enrollmentNo),
        safe(r.email),
        safe(r.phone),
        safe(r.college),
        safe(r.companyName),
      ].join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `${(company.college || 'college').replace(/\s+/g, '_')}_matched_students_${new Date().toISOString().split('T')[0]}.csv`;
    if (navigator.msSaveBlob) navigator.msSaveBlob(blob, fileName);
    else {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  };

  // Function to handle round status click
  const handleRoundStatusClick = (
    companyId,
    roundIndex,
    currentStatus,
    hiringRounds,
    updateRoundStatus
  ) => {
    const currentIndex = roundStatusOptions.findIndex(
      (option) => option.value === currentStatus
    );
    const nextIndex = (currentIndex + 1) % roundStatusOptions.length;
    const nextStatus = roundStatusOptions[nextIndex].value;
    updateRoundStatus(companyId, roundIndex, nextStatus, hiringRounds);
  };

  // Function to view student list
  const handleViewStudentList = async (company, e) => {
    if (e) e.stopPropagation();

    const students = await fetchCompanyStudents(company);
    const matchStats =
      companyMatchStats[company.id] ||
      (await checkStudentMatches(company));

    const companyWithStudents = {
      ...company,
      studentList: students,
      matchStats: matchStats,
    };
    setSelectedCompanyForStudents(companyWithStudents);
  };

  // Close student data view
  const handleCloseStudentView = () => {
    setSelectedCompanyForStudents(null);
  };

  // Calculate stats for company group
  const getCompanyStats = (companies) => {
    const uniqueColleges = [
      ...new Set(companies.map((comp) => comp.college).filter(Boolean)),
    ];

    const totalStudents = companies.reduce((sum, comp) => {
      if (comp.studentList && Array.isArray(comp.studentList)) {
        return sum + comp.studentList.length;
      }
      return sum + (comp.studentCount || 0);
    }, 0);

    const hasStudentList = companies.some(
      (comp) => comp.studentList && comp.studentList.length > 0
    );

    // Build per-college match stats using companyMatchStats keyed by company.id
    const perCollegeMatchStats = companies.map((comp) => {
      const s = companyMatchStats[comp.id];
      return {
        college: comp.college || "Unknown",
        matched: s?.matched ?? null,
        total: s?.total ?? (comp.studentCount ?? 0),
        companyId: comp.id,
      };
    });

    const anyUnknown = perCollegeMatchStats.some((c) => c.matched === null);

    const aggregatedMatched = perCollegeMatchStats.reduce(
      (s, c) => s + (typeof c.matched === "number" ? c.matched : 0),
      0
    );
    const aggregatedTotal = perCollegeMatchStats.reduce(
      (s, c) => s + (typeof c.total === "number" ? c.total : 0),
      0
    );

    const matchStats = {
      aggregatedMatched,
      aggregatedTotal,
      perCollegeMatchStats,
      anyUnknown,
    };

    return {
      collegeCount: uniqueColleges.length,
      totalStudents,
      hasStudentList,
      uniqueColleges,
      matchStats,
    };
  };

  // Render Round Status helper function
  const renderRoundStatus = (company, round, index, companyStudents) => {
    // Ensure we have students loaded, load them if not
    const actualCompanyStudents = companyStudents.length > 0 ? companyStudents : 
      (companyStudentsData[company.id] || []);
    
    const eligibleStudents = getStudentsForRound(
      company.id,
      index,
      actualCompanyStudents
    );
    
    const currentSelected = getCurrentSelectedForRound(company.id, index);

    // Check if previous round is completed (not pending)
    const previousRoundCompleted = index === 0 || 
      (company.roundStatus && company.roundStatus[index - 1] && 
       company.roundStatus[index - 1] === "completed");

    return (
      <RoundStatus
        key={index}
        roundName={round}
        status={company.roundStatus?.[index] || "pending"}
        studentCount={currentSelected.length}
        totalStudents={eligibleStudents.length}
        eligibleStudents={eligibleStudents}
        currentSelected={currentSelected}
        onClick={(e) => {
          e.stopPropagation();
          if (!previousRoundCompleted) {
            // Show warning if previous round is not completed
            alert(`Please complete the previous round "${company.hiringRounds[index - 1]}" before proceeding to this round.`);
            return;
          }
          handleRoundStatusClick(
            company.id,
            index,
            company.roundStatus?.[index] || "pending",
            company.hiringRounds,
            updateRoundStatus
          );
        }}
        onStudentSelection={(eligibleStudents, roundName, currentSelected, companyId, roundIndex) => {
          if (!previousRoundCompleted) {
            alert(`Please complete the previous round "${company.hiringRounds[index - 1]}" before selecting students for this round.`);
            return;
          }
          handleOpenStudentModal(eligibleStudents, roundName, currentSelected, companyId, roundIndex);
        }}
        companyId={company.id}
        roundIndex={index}
        isDisabled={!previousRoundCompleted}
        previousRoundName={index > 0 ? company.hiringRounds[index - 1] : null}
      />
    );
  };

  return (
    <div className="mt-1 space-y-1">
      {/* Student Data View Modal */}
      {selectedCompanyForStudents && (
        <StudentDataView
          students={selectedCompanyForStudents.studentList || []}
          unmatchedStudents={selectedCompanyForStudents.matchStats?.unmatched || []}
          onClose={handleCloseStudentView}
          companyName={selectedCompanyForStudents.companyName}
          collegeName={selectedCompanyForStudents.college}
        />
      )}

      {/* Student Selection Modal - ROOT LEVEL */}
      {studentModalData.isOpen && (
        <StudentSelectionModal
          isOpen={studentModalData.isOpen}
          onClose={() => setStudentModalData(prev => ({ ...prev, isOpen: false }))}
          students={studentModalData.students}
          roundName={studentModalData.roundName}
          currentSelected={studentModalData.currentSelected}
          onStudentsSelect={handleStudentSelection}
        />
      )}

      {Object.keys(groupedCompanies).length > 0 ? (
        Object.entries(groupedCompanies).map(([companyName, companies]) => {
          const stats = getCompanyStats(companies);
          const isExpanded = expandedCompanies[companyName];

          return (
            <div key={companyName} className="space-y-1">
              {/* Company Header - Clickable for Expand/Collapse */}
              <div
                className="bg-blue-50 border-l-4 border-blue-500 p-2 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors relative"
                onClick={() => toggleCompanyExpand(companyName, companies)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-blue-900 text-sm">
                      {companyName}
                    </h3>

                    {/* Stats Badges */}
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-full text-blue-700">
                        <FaUniversity className="text-blue-500" />
                        {stats.collegeCount} College
                        {stats.collegeCount !== 1 ? "s" : ""}
                      </span>

                      {/* Open Date in Header */}
                      <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-full text-purple-700">
                        <FaCalendar className="text-purple-500" />
                        Open: {companies[0]?.companyOpenDate || "-"}
                      </span>

                      {/* Aggregated Match Stats Badge */}
                      <span className="relative">
                        <button
                          onClick={(e) => toggleGroupMatchListVisibility(companyName, companies, e)}
                          className={`flex items-center gap-1 bg-white px-2 py-1 rounded-full text-sm hover:bg-green-50 transition-colors ${
                            stats.matchStats?.aggregatedMatched === stats.matchStats?.aggregatedTotal && stats.matchStats?.aggregatedTotal > 0
                              ? 'text-green-700'
                              : 'text-red-700'
                          }`}
                          title={`Match: ${stats.matchStats?.aggregatedMatched ?? "?"}/${stats.matchStats?.aggregatedTotal ?? "?"}`}
                        >
                          <FaUsers className="text-green-500" />
                          {stats.matchStats?.aggregatedMatched ?? 0}/{stats.matchStats?.aggregatedTotal ?? 0}
                        </button>

                        {/* Per-college match list popover */}
                        {showGroupMatchList[companyName] && (
                          <div
                            className="absolute right-0 mt-2 w-56 bg-white border rounded-md p-2 shadow-lg text-xs z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <div className="font-semibold text-gray-800">Match Details</div>
                              <div>
                                <button
                                  onClick={(e) => exportMatchedStudentsCSV(companyName, companies, e)}
                                  className={`text-xs flex items-center gap-1 px-2 py-1 rounded bg-white border ${stats.matchStats?.aggregatedTotal > 0 ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                                  disabled={!stats.matchStats?.aggregatedTotal}
                                  title={stats.matchStats?.aggregatedTotal ? 'Export matched students' : 'No students to export'}
                                >
                                  <FaDownload className="h-3 w-3" />
                                  Export
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1 max-h-48 overflow-auto">
                              {stats.matchStats?.perCollegeMatchStats?.map((pc) => {
                                const comp = companies.find(c => c.id === pc.companyId) || { id: pc.companyId, college: pc.college, companyName };
                                return (
                                  <div className="flex justify-between items-center" key={pc.companyId}>
                                    <div className="truncate text-xs text-gray-700">{pc.college || "Unknown"}</div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-xs text-gray-600">{pc.matched === null ? "?" : `${pc.matched}/${pc.total}`}</div>
                                      <button
                                        onClick={(e) => exportMatchedForCompanyCSV(comp, e)}
                                        disabled={pc.matched === null || (pc.total || 0) === 0}
                                        className={`text-xs px-2 py-0.5 rounded bg-white border ${pc.matched === null || (pc.total || 0) === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-700 hover:bg-blue-50'}`}
                                        title={pc.matched === null ? 'Match not computed yet' : (pc.matched === 0 ? 'No matched students' : 'Export matched students for this college')}
                                      >
                                        <FaDownload className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                              Aggregated: {stats.matchStats?.aggregatedMatched ?? 0}/{stats.matchStats?.aggregatedTotal ?? 0}
                              {stats.matchStats?.anyUnknown ? " (some unknown)" : ""}
                            </div>
                          </div>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <FaChevronUp className="text-blue-600" />
                    ) : (
                      <FaChevronDown className="text-blue-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Column Headers for each company group */}
              <div
                className={`grid grid-cols-10 gap-2 px-2 py-1 text-xs font-medium rounded-lg ml-4 ${headerColorMap[activeTab]}`}
              >
                <div>College</div>
                <div>Job Type</div>
                <div>Salary/Stipend</div>
                <div>Job Designation</div>
                <div className="col-span-2 text-center">Hiring Process</div>
                <div>Eligibility</div>
                <div>Students</div>
                <div>Match Status</div>
                <div className="text-center">Actions</div>
              </div>

              {/* Company Rows - Only show if expanded */}
              {isExpanded &&
                companies.map((company) => {
                  const companyStudents = companyStudentsData[company.id] || [];

                  return (
                    <div
                      key={company.id}
                      className="relative group cursor-pointer ml-4"
                      onClick={() => setSelectedCompany(company)}
                    >
                      <div
                        className={`grid grid-cols-10 gap-2 p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200 ease-out ${
                          borderColorMap[activeTab]
                        } ${
                          company.isTransitioning
                            ? "opacity-50 scale-95"
                            : "opacity-100 scale-100"
                        }`}
                      >
                        {/* College - Column 1 */}
                        <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                          {getCollegeAbbreviation(company.college) || "-"}
                        </div>

                        {/* Job Type - Column 2 */}
                        <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                          {company.jobType || "-"}
                        </div>

                        {/* Salary/Stipend - Column 3 */}
                        <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                          {company.jobType === "Int + PPO" && company.salary && company.stipend ? (
                            <div className="flex flex-col gap-1">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {formatSalary(company.salary)}
                              </span>
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {formatStipend(company.stipend)}
                              </span>
                            </div>
                          ) : company.salary ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {formatSalary(company.salary)}
                            </span>
                          ) : company.stipend ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {formatStipend(company.stipend)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </div>

                        {/* Job Designation - Column 4 */}
                        <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                          {company.jobDesignation || "-"}
                        </div>

                        {/* Hiring Process - Column 5 & 6 */}
                        <div
                          className="col-span-2 flex items-center h-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-wrap gap-3 w-full justify-center">
                            {company.hiringRounds &&
                            company.hiringRounds.length > 0 ? (
                              company.hiringRounds.map((round, index) => 
                                renderRoundStatus(company, round, index, companyStudents)
                              )
                            ) : (
                              <span className="text-xs text-gray-500 italic">
                                No rounds
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Eligibility - Column 7 */}
                        <div className="text-sm text-gray-700 flex items-center h-full">
                          <div className="min-w-0">
                            <div className="text-xs text-gray-500 leading-tight">
                              {formatEligibility(company)}
                            </div>
                          </div>
                        </div>

                        {/* Students - Column 8 */}
                        <div className="text-sm text-gray-700 flex items-center h-full">
                          <button
                            onClick={(e) => handleViewStudentList(company, e)}
                            className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded text-xs text-green-700 hover:bg-green-100 transition-colors"
                            title="View Student List"
                          >
                            <FaUsers className="text-green-500" />
                            {company.studentCount || 0}
                          </button>
                        </div>

                        {/* Match Status - Column 9 */}
                        <div className="text-sm text-gray-700 flex items-center h-full">
                          {company.studentCount > 0 && (
                            <div className={`text-xs px-1 py-0.5 rounded-full max-w-16 truncate ${
                              companyMatchStats[company.id]?.matched === company.studentCount
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`} title={
                              companyMatchStats[company.id] 
                                ? `${companyMatchStats[company.id].matched || 0}/${company.studentCount} students matched`
                                : "Match status not checked"
                            }>
                              {companyMatchStats[company.id] ? (
                                `${companyMatchStats[company.id].matched || 0}/${company.studentCount}`
                              ) : (
                                "?"
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions - Column 10 */}
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropdownOpen(
                                dropdownOpen === company.id ? null : company.id
                              );
                            }}
                            className={`text-gray-500 hover:text-gray-700 focus:outline-none transition p-2 rounded-full hover:bg-gray-100 ${
                              dropdownOpen === company.id
                                ? "bg-gray-200 text-gray-900 shadow-inner"
                                : ""
                            }`}
                            aria-expanded={dropdownOpen === company.id}
                            aria-haspopup="true"
                            aria-label={
                              dropdownOpen === company.id
                                ? "Close actions menu"
                                : "Open actions menu"
                            }
                          >
                            {dropdownOpen === company.id ? (
                              <FaTimes size={16} />
                            ) : (
                              <FaEllipsisV size={16} />
                            )}
                          </button>
                        </div>
                      </div>

                      {dropdownOpen === company.id && (
                        <CompanyDropdownActions
                          companyId={company.id}
                          companyData={company}
                          closeDropdown={() => setDropdownOpen(null)}
                          setSelectedCompany={setSelectedCompany}
                          updateCompanyStatus={updateCompanyStatus}
                          activeTab={activeTab}
                          onEditJD={onEditJD}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })
      ) : (
        <div className="bg-white rounded-xl p-4 text-center border-2 border-dashed border-gray-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 mx-auto text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H3V7zm0 4h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z"
            />
          </svg>

          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No companies found
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Get started by adding a new company
          </p>
          <button
            onClick={() => setShowJDForm(true)}
            className="mt-3 bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition text-sm"
          >
            Add Company
          </button>
        </div>
      )}
    </div>
  );
}

export default CompanyTable;