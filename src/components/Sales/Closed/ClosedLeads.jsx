import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { FiChevronLeft, FiChevronRight, FiDownload, FiFilter, FiTrendingUp, FiRotateCw } from "react-icons/fi";
import { collection, getDocs, doc, getDoc, writeBatch } from "firebase/firestore";
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
  const [quarterFilter, setQuarterFilter] = useState("all");
  const [selectedFYFilter, setSelectedFYFilter] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const baseYear = month >= 3 ? year : year - 1;
    return `${baseYear}-${(baseYear + 1).toString().slice(-2)}`;
  }); // 🆕 Use short format to match dropdown options
  const [targets, setTargets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [selectedTeamUserId, setSelectedTeamUserId] = useState("all");
  // 🆕 Add department toggle state
  const [showDirectorLeads, setShowDirectorLeads] = useState(false);

  // 🆕 Add enriched leads state
  const [enrichedLeads, setEnrichedLeads] = useState({});

  // 🆕 Add loading state for refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🆕 Add cache for training form data to prevent refetching
  const trainingFormCache = useRef({});

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
      console.warn("Lead data not found for ID:", leadId);
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

  // 🆕 Enrich leads with gstAmount from trainingForms using batch operations and caching
  const enrichLeadsData = useCallback(async () => {
    if (!leads || Object.keys(leads).length === 0) {
      setEnrichedLeads({});
      return;
    }

    const enriched = {};

    // Collect all projectCodes that need training form data
    const projectCodes = Object.entries(leads)
      .filter(([, lead]) => lead.projectCode)
      .map(([, lead]) => lead.projectCode.replace(/\//g, "-"));

    // Check cache for existing data and identify missing ones
    const cachedData = {};
    const missingDocIds = [];

    projectCodes.forEach(docId => {
      if (trainingFormCache.current[docId]) {
        cachedData[docId] = trainingFormCache.current[docId];
      } else {
        missingDocIds.push(docId);
      }
    });

    // Batch fetch only missing training forms (process in smaller batches to avoid overwhelming Firestore)
    if (missingDocIds.length > 0) {
      const batchSize = 5;
      for (let i = 0; i < missingDocIds.length; i += batchSize) {
        const batch = missingDocIds.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (docId) => {
            try {
              const docRef = doc(db, "trainingForms", docId);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                const data = docSnap.data();
                trainingFormCache.current[docId] = data; // Cache the fetched data
                cachedData[docId] = data;
              }
            } catch (err) {
              console.error(`Error fetching training form ${docId}:`, err);
            }
          })
        );
      }
    }

    // Use cached data for processing
    const trainingFormData = cachedData;

    // Process all leads using the fetched training form data
    const closureTypeUpdates = [];
    for (const [id, lead] of Object.entries(leads)) {
      try {
        const projectCode = lead.projectCode;

        if (!projectCode) {
          // For leads without training forms, calculate totalCost from available data
          const studentCount = parseInt(lead.studentCount) || 0;
          const perStudentCost = parseFloat(lead.perStudentCost) || 0;
          const calculatedTotalCost = studentCount * perStudentCost;

          enriched[id] = {
            ...lead,
            totalCost: calculatedTotalCost || lead.totalCost || 0,
            gstAmount: 0,
          };
          continue;
        }

        const docId = projectCode.replace(/\//g, "-");
        const trainingFormDataItem = trainingFormData[docId];

        if (trainingFormDataItem) {
          // Check contract end date and update closureType if needed
          let updatedClosureType = lead.closureType || "new";
          if (trainingFormDataItem.contractEndDate) {
            const endDate = new Date(trainingFormDataItem.contractEndDate);
            const today = new Date();
            const diffTime = endDate - today;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays <= 90 && diffDays >= 0) {
              updatedClosureType = "renewal";
            } else {
              updatedClosureType = "new";
            }

            // Collect closureType updates for batch processing
            if (updatedClosureType !== (lead.closureType || "new")) {
              closureTypeUpdates.push({
                leadId: id,
                closureType: updatedClosureType
              });
            }
          }

          // Merge the training form data with the lead data
          enriched[id] = {
            ...lead,
            studentCount: parseInt(trainingFormDataItem.studentCount) || lead.studentCount,
            perStudentCost: parseFloat(trainingFormDataItem.perStudentCost) || lead.perStudentCost,
            totalCost: parseFloat(trainingFormDataItem.totalCost) || lead.totalCost,
            gstAmount: parseFloat(trainingFormDataItem.gstAmount) || 0,
            netPayableAmount: parseFloat(trainingFormDataItem.netPayableAmount) || lead.totalCost,
            contractEndDate: trainingFormDataItem.contractEndDate || lead.contractEndDate, // 🆕 Add contractEndDate from trainingForms
            contractStartDate: trainingFormDataItem.contractStartDate || lead.contractStartDate, // 🆕 Add contractStartDate from trainingForms
            closureType: updatedClosureType, // Use the updated closureType
            courses: trainingFormDataItem.courses || lead.courses, // 🆕 Add courses data from trainingForms
            topics: trainingFormDataItem.topics || lead.topics, // 🆕 Add topics data from trainingForms
            deliveryType: trainingFormDataItem.deliveryType || lead.deliveryType, // 🆕 Add delivery type
            course: trainingFormDataItem.course || lead.course, // 🆕 Add course
            year: trainingFormDataItem.year || lead.year, // 🆕 Add year
            passingYear: trainingFormDataItem.passingYear || lead.passingYear, // 🆕 Add passing year
            totalHours: trainingFormDataItem.totalHours || lead.totalHours, // 🆕 Add total hours
          };
        } else {
          // For leads without training forms, calculate totalCost from available data
          // and set contractEndDate to closedDate as fallback
          const studentCount = parseInt(lead.studentCount) || 0;
          const perStudentCost = parseFloat(lead.perStudentCost) || 0;
          const calculatedTotalCost = studentCount * perStudentCost;

          enriched[id] = {
            ...lead,
            totalCost: calculatedTotalCost || lead.totalCost || 0,
            gstAmount: 0,
            contractEndDate: lead.contractEndDate || lead.closedDate, // Fallback to closedDate
            contractStartDate: lead.contractStartDate || lead.closedDate, // Fallback to closedDate
          };
        }

      } catch (error) {
        console.error("Error enriching lead data:", error);
        enriched[id] = lead;
      }
    }

    // Batch update closureType changes
    if (closureTypeUpdates.length > 0) {
      const batch = writeBatch(db);
      closureTypeUpdates.forEach(({ leadId, closureType }) => {
        const leadRef = doc(db, "leads", leadId);
        batch.update(leadRef, { closureType });
      });

      try {
        await batch.commit();
        console.log(`Successfully updated closureType for ${closureTypeUpdates.length} leads`);
      } catch (batchError) {
        console.error("Error batch updating closureType:", batchError);
      }
    }

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

  // 🆕 Memoize date calculations to prevent unnecessary recalculations
  const today = useMemo(() => new Date(), []);
  const currentQuarter = useMemo(() => getQuarter(today), [today]);
  const selectedQuarter = useMemo(() =>
    quarterFilter === "current" ? currentQuarter : quarterFilter,
    [quarterFilter, currentQuarter]
  );

  // 🆕 Memoize current user object lookup
  const currentUserObj = useMemo(() =>
    Object.values(users).find((u) => u.uid === currentUser?.uid),
    [users, currentUser?.uid]
  );

  const currentRole = currentUserObj?.role;

  // 🆕 Check if user should see the department toggle
  const shouldShowDepartmentToggle = useMemo(() =>
    !viewMyLeadsOnly &&
    currentUserObj?.department === "Admin" &&
    currentRole === "Director",
    [viewMyLeadsOnly, currentUserObj?.department, currentRole]
  );

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

          const isSalesUser = (user) => {
            return (
              user.department === "Sales" ||
              (Array.isArray(user.department) && user.department.includes("Sales")) ||
              user.departments === "Sales" ||
              (Array.isArray(user.departments) && user.departments.includes("Sales"))
            );
          };

          if (showDirectorLeads) {
            // Show both Sales department and Admin Directors
            return (
              isSalesUser(leadUser) ||
              (leadUser.department === "Admin" && leadUser.role === "Director")
            );
          } else {
            // Show only Sales department
            return isSalesUser(leadUser);
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
        // Use contractStartDate instead of contractEndDate for financial year/quarter filtering
        if (!lead.contractStartDate) {
          console.log('❌ Lead filtered out - no contractStartDate:', lead.businessName, lead.projectCode);
          return false;
        }

        // Skip FY filtering if "Lifetime" is selected
        if (selectedFYFilter === "lifetime") {
          console.log('✅ Lead passed - Lifetime filter active:', lead.businessName);
        } else {
          const contractStartDate = new Date(lead.contractStartDate);
          const closedFY = getFinancialYear(contractStartDate);
          const closedFYShort = `${closedFY.split('-')[0]}-${closedFY.split('-')[1].slice(-2)}`;

          console.log('🔍 Lead:', lead.businessName, 'contractStartDate:', lead.contractStartDate, 'FY:', closedFY, 'FY Short:', closedFYShort, 'selectedFY:', selectedFYFilter);

          // Always filter by financial year first
          if (closedFYShort !== selectedFYFilter) {
            console.log('❌ Lead filtered out - wrong FY:', lead.businessName, closedFYShort, '!==', selectedFYFilter);
            return false;
          }

          console.log('✅ Lead passed FY filter:', lead.businessName);
        }

        // Then filter by quarter if not "all"
        if (selectedQuarter === "all") return true;
        const closedQuarter = getQuarter(new Date(lead.contractStartDate));
        return closedQuarter === selectedQuarter;
      })
      .sort(([, a], [, b]) => new Date(b.contractStartDate || b.contractEndDate || b.closedDate) - new Date(a.contractStartDate || a.contractEndDate || a.closedDate));


    return result;
  }, [
    enrichedLeads,
    currentUser,
    currentRole,
    filterType,
    selectedQuarter,
    selectedFYFilter, // 🆕 Add selectedFYFilter to dependencies
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
  }, [filterType, quarterFilter, selectedFYFilter, viewMyLeadsOnly]);

  const achievedValue = useMemo(() => {
    const value = filteredLeads.reduce(
      (sum, [, lead]) => sum + (lead.totalCost || 0),
      0
    );
    return value;
  }, [filteredLeads]);

  const achievedGST = useMemo(() => {
    const gst = filteredLeads.reduce(
      (sum, [, lead]) => sum + (Number(lead.gstAmount) || 0),
      0
    );
    return gst;
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const startTime = Date.now();

    try {
      // Clear the training form cache to force fresh data fetch
      trainingFormCache.current = {};
      await Promise.all([fetchTargets(), enrichLeadsData()]);

      // Ensure animation runs for at least 2 seconds
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };


  // Add effect to report count changes
  useEffect(() => {
    if (onCountChange) {
      onCountChange(filteredLeads.length);
    }
  }, [filteredLeads.length, onCountChange]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="w-full py-4">
        {showLeaderboard ? (
          // Leaderboard Section
          <ClosedLeadsLeaderboard
            onBack={() => setShowLeaderboard(false)}
            enrichedLeads={enrichedLeads}
            users={users}
            formatCurrency={formatCurrency}
            targets={targets}
            selectedFY={selectedFYFilter} // 🆕 Use selectedFYFilter for leaderboard
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
                    <div className="p-1.5 bg-linear-to-r from-blue-500 to-indigo-600 rounded-lg shadow-md">
                      <FiTrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl lg:text-2xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
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
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <span className="text-sm">🏆</span>
                    Leaderboard
                  </button>

                  {/* Deals Count Capsule */}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {filteredLeads.length} deals
                  </span>

                  {/* Export Button */}
                  <button
                    onClick={() => exportClosedLeads(filteredLeads, db)}
                    className="inline-flex items-center justify-center px-2 py-1 bg-linear-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                  >
                    <FiDownload className="w-3.5 h-3.5 mr-1" />
                    Export
                  </button>

                  {/* Refresh Button */}
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="inline-flex items-center justify-center px-2 py-0.5 bg-linear-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiRotateCw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
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

                    {/* Financial Year Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-700">FY:</span>
                      <select
                        value={selectedFYFilter}
                        onChange={(e) => setSelectedFYFilter(e.target.value)}
                        className="px-1 py-0.5 border border-gray-300 rounded-md text-xs text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                      >
                        {/* Lifetime option */}
                        <option value="lifetime" style={{ color: '#059669', fontWeight: '600' }}>
                          Lifetime •
                        </option>
                        {/* Generate financial years from current year -5 to +5 */}
                        {Array.from({ length: 11 }, (_, i) => {
                          const currentYear = new Date().getFullYear();
                          const currentMonth = new Date().getMonth();
                          const baseYear = currentMonth >= 3 ? currentYear : currentYear - 1;
                          const fy = `${baseYear - 5 + i}-${(baseYear - 5 + i + 1).toString().slice(-2)}`;
                          const currentFYShort = `${baseYear}-${(baseYear + 1).toString().slice(-2)}`;
                          const isCurrentFY = fy === currentFYShort;
                          return (
                            <option key={fy} value={fy} style={isCurrentFY ? { color: '#2563eb', fontWeight: '600' } : {}}>
                              {fy}{isCurrentFY ? ' •' : ''}
                            </option>
                          );
                        })}
                      </select>
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
              <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-1.5 mb-2 shadow-sm">
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
                          ? "bg-linear-to-r from-amber-400 to-orange-500"
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
            )}            <div className="mb-4">
              <ClosedLeadsStats
                leads={enrichedLeads}
                targets={targets}
                currentUser={currentUser}
                users={users}
                selectedFY={selectedFYFilter} // 🆕 Use selectedFYFilter instead of current FY
                activeQuarter={selectedQuarter}
                formatCurrency={formatCurrency}
                viewMyLeadsOnly={viewMyLeadsOnly}
                achievedValue={achievedValue}
                achievedGST={achievedGST}
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
                                  ? "bg-linear-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
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
