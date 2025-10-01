import React, { useState, useMemo, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { FiChevronLeft, FiChevronRight, FiDownload, FiFilter, FiTrendingUp } from "react-icons/fi";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import ClosedLeadsTable from "./ClosedLeadsTable";
import ClosedLeadsStats from "./ClosedLeadsStats";
import TrainingForm from "../ClosureForm/TrainingForm";
import { exportClosedLeads } from "./ClosedLeadsExport";
import EditClosedLeadModal from "./EditClosedLeadModal";
import ClosedLeadDetailModal from "./ClosedLeadDetailModel";
import StudentListUploadModal from "./StudentListUploadModal";
import MOUUploadModal from "./MOUUploadModal";
import ClosedLeadsLeaderboard from "./ClosedLeadsLeaderboard";
import * as XLSX from "xlsx";

const ClosedLeads = ({ leads, viewMyLeadsOnly, currentUser, users, onCountChange }) => {
  const [filterType, setFilterType] = useState("all");
  const [quarterFilter, setQuarterFilter] = useState("current");
  const [targets, setTargets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [selectedTeamUserId, setSelectedTeamUserId] = useState("all");
  // 🆕 Add department toggle state
  const [showDirectorLeads, setShowDirectorLeads] = useState(false);

  // 🆕 Add enriched leads state
  const [enrichedLeads, setEnrichedLeads] = useState({});

  // Modal states for table modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMOUUploadModal, setShowMOUUploadModal] = useState(false);
  const [showEditClosureModal, setShowEditClosureModal] = useState(false);
  const [selectedLeadForModal, setSelectedLeadForModal] = useState(null);
  const [selectedLeadDetails, setSelectedLeadDetails] = useState(null);
  const [activeLeadData, setActiveLeadData] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Modal handlers for table
  const handleUploadModal = (lead) => {
    setSelectedLeadForModal(lead);
    setShowUploadModal(true);
  };

  const handleMOUModal = (leadId) => {
    // Find the lead data from the leads object
    const leadData = leads[leadId];
    if (leadData) {
      setActiveLeadData(leadData);
      setShowMOUUploadModal(true);
    } else {
      console.error("Lead data not found for ID:", leadId);
    }
  };

  const handleEditModal = async (lead) => {
    try {
      const projectCode = lead.projectCode;
      if (!projectCode) {
        alert("Project code not found!");
        return;
      }

      const docId = projectCode.replace(/\//g, "-");
      const docRef = doc(db, "trainingForms", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSelectedLeadForModal({ id: docSnap.id, ...docSnap.data() });
        setShowEditClosureModal(true);
      } else {
        alert("Training form data not found in Firestore!");
      }
    } catch (error) {
      console.error("Error fetching training form data:", error);
      alert("Failed to fetch form data");
    }
  };

  const handleViewDetails = (lead) => {
    setSelectedLeadDetails(lead);
  };

  const fetchTargets = useCallback(async () => {
    const snapshot = await getDocs(collection(db, "quarterly_targets"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setTargets(data);
  }, []);

  // 🆕 Enrich leads with gstAmount from trainingForms
  const enrichLeadsData = useCallback(async () => {
    if (!leads || Object.keys(leads).length === 0) {
      setEnrichedLeads({});
      return;
    }

    const enriched = {};
    console.log('Enriching leads data for', Object.keys(leads).length, 'leads');

    await Promise.all(
      Object.entries(leads).map(async ([id, lead]) => {
        try {
          const projectCode = lead.projectCode;
          console.log('Processing lead:', id, 'projectCode:', projectCode);

          if (!projectCode) {
            console.log('No projectCode for lead:', id);
            enriched[id] = lead;
            return;
          }

          const docId = projectCode.replace(/\//g, "-");
          console.log('Looking for training form with docId:', docId);

          const docRef = doc(db, "trainingForms", docId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const trainingFormData = docSnap.data();
            console.log('Found training form data:', trainingFormData);

            // Merge the training form data with the lead data
            enriched[id] = {
              ...lead,
              studentCount: parseInt(trainingFormData.studentCount) || lead.studentCount,
              perStudentCost: parseFloat(trainingFormData.perStudentCost) || lead.perStudentCost,
              totalCost: parseFloat(trainingFormData.totalCost) || lead.totalCost,
              gstAmount: parseFloat(trainingFormData.gstAmount) || 0,
              netPayableAmount: parseFloat(trainingFormData.netPayableAmount) || lead.totalCost,
            };
          } else {
            // For leads without training forms, calculate totalCost from available data
            const studentCount = parseInt(lead.studentCount) || 0;
            const perStudentCost = parseFloat(lead.perStudentCost) || 0;
            const calculatedTotalCost = studentCount * perStudentCost;

            console.log('No training form found, calculating totalCost:', calculatedTotalCost, 'from', studentCount, '*', perStudentCost);

            enriched[id] = {
              ...lead,
              totalCost: calculatedTotalCost || lead.totalCost || 0,
              gstAmount: 0,
            };
          }

          console.log('Final enriched lead:', id, enriched[id]);
        } catch (error) {
          console.error("Error fetching training form data:", error);
          enriched[id] = lead;
        }
      })
    );

    console.log('Setting enriched leads:', enriched);
    setEnrichedLeads(enriched);
  }, [leads]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  useEffect(() => {
    enrichLeadsData();
  }, [enrichLeadsData]);

  const getFinancialYear = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  const getQuarter = (date) => {
    const m = date.getMonth() + 1;
    if (m >= 4 && m <= 6) return "Q1";
    if (m >= 7 && m <= 9) return "Q2";
    if (m >= 10 && m <= 12) return "Q3";
    return "Q4";
  };

  const today = new Date();
  const currentQuarter = getQuarter(today);
  const selectedQuarter =
    quarterFilter === "current" ? currentQuarter : quarterFilter;
  const selectedFY = getFinancialYear(today);

  const currentUserObj = Object.values(users).find(
    (u) => u.uid === currentUser?.uid
  );
  const currentRole = currentUserObj?.role;

  // 🆕 Check if user should see the department toggle
  const shouldShowDepartmentToggle =
    !viewMyLeadsOnly &&
    currentUserObj?.department === "Admin" &&
    currentRole === "Director";

  const isUserInTeam = useCallback((uid) => {
    if (!uid) return false;

    if (currentRole === "Head") {
      const user = Object.values(users).find((u) => u.uid === uid);
      if (!user) return false;

      // Head can see all managers and all their subordinates
      if (user.role === "Manager") return true;
      if (
        ["Assistant Manager", "Executive"].includes(user.role) &&
        user.reportingManager
      ) {
        // Check if this subordinate's manager is among managers (head team)
        return Object.values(users).some(
          (mgr) => mgr.role === "Manager" && mgr.name === user.reportingManager
        );
      }
    }

    if (currentRole === "Manager") {
      const user = Object.values(users).find((u) => u.uid === uid);
      if (!user) return false;

      if (["Assistant Manager", "Executive"].includes(user.role)) {
        return user.reportingManager === currentUserObj.name;
      }
    }

    return false;
  }, [currentRole, users, currentUserObj.name]);

  const filteredLeads = useMemo(() => {
    if (!currentUser) return [];

    const result = Object.entries(enrichedLeads)
      .filter(([, lead]) => {
        if (viewMyLeadsOnly) {
          return lead.assignedTo?.uid === currentUser.uid;
        }

        // 🔥 FIX: Handle individual team member selection FIRST
        if (selectedTeamUserId !== "all") {
          return lead.assignedTo?.uid === selectedTeamUserId;
        }

        // 🔥 SAFE: Only exclude current user's leads when showing "All Team Members"
        // BUT skip this exclusion for Admin Directors when department filter is ON
        if (
          selectedTeamUserId === "all" &&
          lead.assignedTo?.uid === currentUser.uid &&
          !(shouldShowDepartmentToggle && showDirectorLeads && currentUserObj?.department === "Admin" && currentRole === "Director")
        ) {
          return false;
        }

        // 🆕 Department filtering for Admin Directors
        if (shouldShowDepartmentToggle) {
          const leadUser = Object.values(users).find(
            (u) => u.uid === lead.assignedTo?.uid
          );
          if (!leadUser) return false;

          if (showDirectorLeads) {
            // Show both Sales department and Admin Directors
            return (
              leadUser.department === "Sales" ||
              (leadUser.department === "Admin" && leadUser.role === "Director")
            );
          } else {
            // Show only Sales department
            return leadUser.department === "Sales";
          }
        }

        // Default Team filtering by role
        if (currentRole === "Director") {
          return true;
        }
        if (currentRole === "Head") {
          return isUserInTeam(lead.assignedTo?.uid);
        } else if (currentRole === "Manager") {
          return isUserInTeam(lead.assignedTo?.uid);
        } else {
          return isUserInTeam(lead.assignedTo?.uid);
        }
      })
      .filter(([, lead]) => {
        if (filterType === "all") return true;
        return lead.closureType === filterType;
      })
      .filter(([, lead]) => {
        if (!lead.closedDate) return false;
        if (selectedQuarter === "all") return true;
        const closedQuarter = getQuarter(new Date(lead.closedDate));
        return closedQuarter === selectedQuarter;
      })
      .sort(([, a], [, b]) => new Date(b.closedDate) - new Date(a.closedDate));

    console.log('Filtered leads for leaderboard:', result);
    return result;
  }, [
    enrichedLeads,
    currentUser,
    currentRole,
    filterType,
    selectedQuarter,
    viewMyLeadsOnly,
    selectedTeamUserId,
    users,
    shouldShowDepartmentToggle,
    showDirectorLeads,
    isUserInTeam,
    currentUserObj?.department,
  ]);

  // ⭐⭐ Yeh line add karo ⭐⭐

  const startIdx = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredLeads.slice(startIdx, startIdx + rowsPerPage);
  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, quarterFilter, viewMyLeadsOnly]);

  const achievedValue = useMemo(() => {
    const value = filteredLeads.reduce(
      (sum, [, lead]) => sum + (lead.totalCost || 0),
      0
    );
    return value;
  }, [filteredLeads]);

  const formatCurrency = (amt) =>
    typeof amt === "number"
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(amt)
      : "-";

  const formatDate = (ts) =>
    ts
      ? new Date(ts).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

  const handleTargetUpdate = async () => {
    await fetchTargets();
    // Note: updateDeficitsAndCarryForward function is not implemented yet
    // await updateDeficitsAndCarryForward(currentUser.uid, selectedFY);
    // Dobara fetch karo taaki latest deficit Firestore se aaye
    await fetchTargets();
  };


  // Add effect to report count changes
  useEffect(() => {
    if (onCountChange) {
      onCountChange(filteredLeads.length);
    }
  }, [filteredLeads.length, onCountChange]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="w-full py-4">
        {showLeaderboard ? (
          // Leaderboard Section
          <ClosedLeadsLeaderboard
            onBack={() => setShowLeaderboard(false)}
            enrichedLeads={enrichedLeads}
            users={users}
            formatCurrency={formatCurrency}
            targets={targets}
            selectedFY={selectedFY}
            currentUser={currentUser}
            onTargetUpdate={handleTargetUpdate}
          />
        ) : (
          <>
            {/* Header Section */}
            <div className="mb-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-md">
                      <FiTrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Closed Deals
                    </h1>
                  </div>
                  <p className="text-base text-gray-600 font-medium">
                    All your closed deals
                  </p>
                </div>

                {/* Export Button and Filters Inline with Header */}
                <div className="flex items-center gap-3">
                  {/* Leaderboard Button */}
                  <button
                    onClick={() => setShowLeaderboard(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <span className="text-base">🏆</span>
                    Leaderboard
                  </button>

                  {/* Deals Count Capsule */}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {filteredLeads.length} deals
                  </span>

                  {/* Export Button */}
                  <button
                    onClick={() => exportClosedLeads(filteredLeads, db)}
                    className="inline-flex items-center justify-center px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                  >
                    <FiDownload className="w-3.5 h-3.5 mr-1" />
                    Export
                  </button>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Deal Type Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-700">Type:</span>
                      <div className="relative bg-gray-100 p-0.5 rounded-md border border-gray-200">
                        {/* Sliding Background */}
                        <div
                          className={`absolute top-0.5 bottom-0.5 bg-white border border-blue-200 rounded-sm shadow-sm transition-all duration-300 ease-in-out ${
                            filterType === "all"
                              ? "left-0.5 w-[42px]"
                              : filterType === "new"
                              ? "left-[49px] w-[38px]"
                              : "left-[93px] w-[61px]"
                          }`}
                        />
                        {/* Buttons */}
                        {["all", "new", "renewal"].map((type) => (
                          <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`relative px-3 py-1.5 text-xs font-medium rounded-sm transition-all duration-200 focus:outline-none z-10 ${
                              filterType === type
                                ? "text-blue-700"
                                : "text-gray-600 hover:text-gray-800"
                            }`}
                          >
                            {type === "all" ? "All" : type === "new" ? "New" : "Renewals"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quarter Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-700">Quarter:</span>
                      <select
                        value={quarterFilter}
                        onChange={(e) => setQuarterFilter(e.target.value)}
                        className="px-2 py-0.5 border border-gray-300 rounded-md text-xs text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                      >
                        <option value="current">Current</option>
                        <option value="Q1">Q1</option>
                        <option value="Q2">Q2</option>
                        <option value="Q3">Q3</option>
                        <option value="Q4">Q4</option>
                        <option value="all">All</option>
                      </select>
                    </div>

                    {/* View Mode Display */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-700">View:</span>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {viewMyLeadsOnly ? "Your Leads" : "Team Leads"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>



            {/* Department Toggle for Admin Directors */}
            {shouldShowDepartmentToggle && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-1.5 mb-2 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900">Department Filter</h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-gray-600">Include Admin Directors</p>

                    <span
                      id="department-toggle-label"
                      className={`text-xs font-semibold transition-colors duration-300 ${
                        showDirectorLeads ? "text-amber-700" : "text-gray-500"
                      }`}
                    >
                      {showDirectorLeads ? "ON" : "OFF"}
                    </span>

                    <button
                      onClick={() => setShowDirectorLeads(!showDirectorLeads)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none ${
                        showDirectorLeads
                          ? "bg-gradient-to-r from-amber-400 to-orange-500"
                          : "bg-gray-300"
                      } shadow-sm`}
                      role="switch"
                      aria-checked={showDirectorLeads}
                      aria-labelledby="department-toggle-label"
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-in-out ${
                          showDirectorLeads ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>

                    <div className="text-xs text-gray-500 bg-white/80 px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">
                      {showDirectorLeads
                        ? "📊 Sales + Admin"
                        : "💼 Sales Only"
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}            {/* Stats Dashboard */}
            <div className="mb-8">
              <ClosedLeadsStats
                leads={enrichedLeads}
                targets={targets}
                currentUser={currentUser}
                users={users}
                selectedFY={selectedFY}
                activeQuarter={selectedQuarter}
                formatCurrency={formatCurrency}
                viewMyLeadsOnly={viewMyLeadsOnly}
                achievedValue={achievedValue}
                handleTargetUpdate={handleTargetUpdate}
                selectedTeamUserId={selectedTeamUserId}
                setSelectedTeamUserId={setSelectedTeamUserId}
                showDirectorLeads={showDirectorLeads}
                shouldShowDepartmentToggle={shouldShowDepartmentToggle}
              />
            </div>

            {/* Data Table */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
              <ClosedLeadsTable
                leads={currentRows}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
                viewMyLeadsOnly={viewMyLeadsOnly}
                onUploadModal={handleUploadModal}
                onMOUModal={handleMOUModal}
                onEditModal={handleEditModal}
                onViewDetails={handleViewDetails}
              />

              {/* Pagination */}
              {filteredLeads.length > rowsPerPage && (
                <div className="px-6 py-6 border-t border-gray-200 bg-gray-50/50">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600 font-medium">
                      Showing <span className="font-semibold text-gray-900">{startIdx + 1}</span> to{" "}
                      <span className="font-semibold text-gray-900">
                        {Math.min(startIdx + rowsPerPage, filteredLeads.length)}
                      </span>{" "}
                      of <span className="font-semibold text-gray-900">{filteredLeads.length}</span> results
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/25 ${
                          currentPage === 1
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md border border-gray-300"
                        }`}
                      >
                        <FiChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                          if (pageNum > totalPages) return null;

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/25 ${
                                currentPage === pageNum
                                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                                  : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md border border-gray-300"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/25 ${
                          currentPage === totalPages
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md border border-gray-300"
                        }`}
                      >
                        Next
                        <FiChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Table Modals */}
            <StudentListUploadModal
              isOpen={showUploadModal}
              onClose={() => setShowUploadModal(false)}
              leadData={selectedLeadForModal}
              onUploadSuccess={() => {
                // Refresh data or handle success
              }}
            />

            <MOUUploadModal
              isOpen={showMOUUploadModal}
              onClose={() => setShowMOUUploadModal(false)}
              leadData={activeLeadData}
              onUploadSuccess={() => {
                // Refresh data or handle success
              }}
            />

            {showEditClosureModal && selectedLeadForModal && (
              <EditClosedLeadModal
                lead={selectedLeadForModal}
                onClose={() => {
                  setShowEditClosureModal(false);
                  setSelectedLeadForModal(null);
                }}
                onSave={() => {
                  setShowEditClosureModal(false);
                  setSelectedLeadForModal(null);
                }}
              />
            )}

            {selectedLeadDetails && (
              <ClosedLeadDetailModal
                lead={selectedLeadDetails}
                onClose={() => setSelectedLeadDetails(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

ClosedLeads.propTypes = {
  leads: PropTypes.object.isRequired,
  viewMyLeadsOnly: PropTypes.bool.isRequired,
  currentUser: PropTypes.shape({ uid: PropTypes.string }),
  users: PropTypes.object.isRequired,
  onCountChange: PropTypes.func,
};

export default ClosedLeads;