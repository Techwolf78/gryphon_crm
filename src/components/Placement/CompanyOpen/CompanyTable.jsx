import React, { useState } from "react";
import {
  FaEllipsisV,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaUsers,
  FaCalendar,
  FaUniversity,
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

// ✅ SIMPLE RoundStatus Component - No Auto-select
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
  isFirstRound = false,
}) => {
  const statusConfig =
    roundStatusOptions.find((option) => option.value === status) ||
    roundStatusOptions[0];
  const roundAbbr = getRoundAbbreviation(roundName);

  const handleStudentListClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    console.log(`Opening student modal for ${roundName}, eligible: ${eligibleStudents.length}, currently selected: ${currentSelected.length}`);
    
    // Call parent function to open modal
    onStudentSelection(eligibleStudents, roundName, currentSelected, companyId, roundIndex);
  };

  return (
    <div
      className="flex flex-col items-center gap-1 min-w-20"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Round Name and Student Count */}
      <div className="flex items-center gap-1 w-full justify-center">
        <span
          className="text-xs text-gray-600 font-medium truncate"
          title={roundName}
        >
          {roundAbbr}
        </span>
        {totalStudents > 0 && (
          <button
            onClick={handleStudentListClick}
            className={`text-xs rounded-full w-5 h-5 flex items-center justify-center hover:scale-110 transition cursor-pointer text-center ${
              studentCount === totalStudents
                ? "bg-blue-200 text-blue-800 border border-blue-300"
                : studentCount > 0
                ? "bg-orange-200 text-orange-800 border border-orange-300"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            title={`${studentCount}/${totalStudents} students - Click to manage`}
          >
            {studentCount}
          </button>
        )}
      </div>

      {/* Status Button */}
      <button
        onClick={onClick}
        className={`w-full px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105 active:scale-95 ${statusConfig.color} border border-transparent hover:border-gray-300`}
        title={`${roundName} - Click to change status (Current: ${statusConfig.label})`}
      >
        {statusConfig.label}
      </button>

      {/* Progress Bar */}
      {totalStudents > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div
            className={`h-1 rounded-full transition-all ${
              studentCount === totalStudents ? "bg-green-500" : "bg-blue-500"
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
}) {
  const [expandedCompanies, setExpandedCompanies] = useState({});
  const [selectedCompanyForStudents, setSelectedCompanyForStudents] = useState(null);
  const [companyMatchStats, setCompanyMatchStats] = useState({});
  const [loadingMatches, setLoadingMatches] = useState({});
  const [roundStudents, setRoundStudents] = useState({});
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

      console.log(`Company ${companyId}, Round ${roundIndex} selected:`, selectedStudentIds);
      return updated;
    });
  };

// ✅ FIXED: handleOpenStudentModal - Only open modal on user click
const handleOpenStudentModal = React.useCallback((students, roundName, currentSelected, companyId, roundIndex) => {
  // ✅ Only open modal if there are students to select
  if (students.length > 0) {
    setStudentModalData({
      isOpen: true,
      students,
      roundName,
      currentSelected,
      companyId,
      roundIndex
    });
  } else {
    console.log('No students available for selection');
  }
}, []);

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

  // Function to get students for a specific round (CARRY-FORWARD)
  const getStudentsForRound = (companyId, roundIndex, companyStudents) => {
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
      const studentId = student.id || student.email || student.studentName;
      return previousRoundStudents.includes(studentId);
    });
  };

  // Function to get currently selected students for a round
  const getCurrentSelectedForRound = (companyId, roundIndex) => {
    const companyRounds = roundStudents[companyId];
    if (!companyRounds || !companyRounds[roundIndex]) return [];
    return companyRounds[roundIndex];
  };

  // Function to get student count for a specific round
  const getRoundStudentCount = (companyId, roundIndex) => {
    return getCurrentSelectedForRound(companyId, roundIndex).length;
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
      setLoadingMatches((prev) => ({ ...prev, [company.companyName]: true }));

      const studentListStudents = await fetchCompanyStudents(company);
      const trainingFormStudents = await fetchTrainingFormStudents(
        company.college
      );

      const unmatchedStudents = [];

      studentListStudents.forEach((studentListStudent) => {
        const matched = trainingFormStudents.some((trainingStudent) => {
          const nameMatch =
            studentListStudent.studentName?.toLowerCase() ===
            trainingStudent["FULL NAME OF STUDENT"]?.toLowerCase();
          const emailMatch =
            studentListStudent.email?.toLowerCase() ===
            trainingStudent["EMAIL ID"]?.toLowerCase();
          return nameMatch || emailMatch;
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
        [company.companyName]: result,
      }));

      if (onMatchStatsUpdate) {
        onMatchStatsUpdate(result);
      }

      return result;
    } catch (error) {
      console.error("Error matching students:", error);
      return { matched: 0, total: 0, unmatched: [] };
    } finally {
      setLoadingMatches((prev) => ({ ...prev, [company.companyName]: false }));
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

  // Toggle expand/collapse for company group
  const toggleCompanyExpand = async (companyName, companies) => {
    const company = companies[0];

    if (!expandedCompanies[companyName]) {
      await checkStudentMatches(company);
      await getStudentsForCompany(company);
    }

    setExpandedCompanies((prev) => ({
      ...prev,
      [companyName]: !prev[companyName],
    }));
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
      companyMatchStats[company.companyName] ||
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
  const getCompanyStats = (companies, companyName) => {
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

    const matchStats = companyMatchStats[companyName] || {
      matched: 0,
      total: 0,
      unmatched: [],
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
    const eligibleStudents = getStudentsForRound(
      company.id,
      index,
      companyStudents
    );
    
    const currentSelected = getCurrentSelectedForRound(company.id, index);
    const isFirstRound = index === 0;

    return (
      <RoundStatus
        key={index}
        roundName={round}
        status={company.roundStatus?.[index] || "pending"}
        studentCount={currentSelected.length}
        totalStudents={eligibleStudents.length}
        eligibleStudents={eligibleStudents}
        currentSelected={currentSelected}
        isFirstRound={isFirstRound}
        onClick={(e) => {
          e.stopPropagation();
          handleRoundStatusClick(
            company.id,
            index,
            company.roundStatus?.[index] || "pending",
            company.hiringRounds,
            updateRoundStatus
          );
        }}
        onStudentSelection={handleOpenStudentModal}
        companyId={company.id}
        roundIndex={index}
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
          const stats = getCompanyStats(companies, companyName);
          const isExpanded = expandedCompanies[companyName];
          const isLoading = loadingMatches[companyName];

          return (
            <div key={companyName} className="space-y-1">
              {/* Company Header - Clickable for Expand/Collapse */}
              <div
                className="bg-blue-50 border-l-4 border-blue-500 p-2 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
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

                      {/* STUDENT COUNT - NOW CLICKABLE */}
                      <button
                        onClick={(e) => handleViewStudentList(companies[0], e)}
                        className="flex items-center gap-1 bg-white px-2 py-1 rounded-full text-green-700 hover:bg-green-50 hover:text-green-800 transition-colors cursor-pointer"
                        title="View Student List"
                      >
                        <FaUsers className="text-green-500" />
                        {stats.totalStudents} Student
                        {stats.totalStudents !== 1 ? "s" : ""}
                      </button>

                      {/* Match Statistics Badge - NOW CLICKABLE */}
                      {stats.matchStats.total > 0 && (
                        <button
                          onClick={(e) =>
                            handleViewStudentList(companies[0], e)
                          }
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:scale-105 transition-all ${
                            stats.matchStats.matched === stats.matchStats.total
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                          title="View Student List"
                        >
                          <FaUsers />
                          {isLoading ? (
                            <span className="animate-pulse">Checking...</span>
                          ) : (
                            <>
                              {stats.matchStats.matched}/
                              {stats.matchStats.total} Matched
                              {stats.matchStats.matched !==
                                stats.matchStats.total && (
                                <span className="ml-1">
                                  (
                                  {stats.matchStats.total -
                                    stats.matchStats.matched}{" "}
                                  Not Found)
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      )}

                      {/* Open Date in Header */}
                      <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-full text-purple-700">
                        <FaCalendar className="text-purple-500" />
                        Open: {companies[0]?.companyOpenDate || "-"}
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
                className={`grid grid-cols-8 gap-2 px-2 py-1 text-xs font-medium rounded-lg ml-4 ${headerColorMap[activeTab]}`}
              >
                <div>College</div>
                <div>Job Type</div>
                <div>Salary/Stipend</div>
                <div>Job Designation</div>
                <div className="col-span-2 text-center">Hiring Process</div>
                <div>Eligibility</div>
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
                        className={`grid grid-cols-8 gap-2 p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200 ease-out ${
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

                        {/* Actions - Column 8 */}
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