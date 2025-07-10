import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiCheck,
  FiX,
  FiLoader,
  FiFilter,
  FiMoreVertical,
  FiUpload,
  FiChevronDown,
  FiChevronUp,
  FiUser,
} from "react-icons/fi";
import PropTypes from "prop-types";
import * as XLSX from "xlsx";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const SalesClientOnboarding = ({
  leads,
  viewMyLeadsOnly,
  currentUser,
  users,
}) => {
  // =============================== STATE & FILTERS ===============================
  const [filterType, setFilterType] = useState("all");
  const [quarterFilter, setQuarterFilter] = useState("current");
  const [targets, setTargets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedTeamUserId, setSelectedTeamUserId] = useState("all");
  const [showSubordinates, setShowSubordinates] = useState(false);
  const [subordinateTargets, setSubordinateTargets] = useState([]);

  console.log('Leads:', leads);
console.log('Current User:', currentUser);
console.log('Users:', users);

  const rowsPerPage = 10;

  // =============================== UTILITY FUNCTIONS ===============================
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

  const projectCodeToDocId = (projectCode) =>
    projectCode ? projectCode.replace(/\//g, "-") : "";

  const docIdToProjectCode = (docId) => (docId ? docId.replace(/-/g, "/") : "");

  const displayProjectCode = (code) => (code ? code.replace(/-/g, "/") : "-");

  const displayYear = (year) => year.replace(/-/g, " ");

  // =============================== FIREBASE OPERATIONS ===============================
const fetchTargets = useCallback(async () => {
  console.log('Fetching targets...');
  const snapshot = await getDocs(collection(db, "quarterly_targets"));
  console.log('Targets snapshot:', snapshot);
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log('Targets data:', data);
  setTargets(data);
}, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const logAvailableProjectCodes = async () => {
    try {
      console.group("Debugging Project Code Mismatch");
      const currentLead = leads.find(([id]) => id === openDropdown)?.[1];
      console.log("Current Lead:", currentLead);
      console.log("Lead Project Code:", currentLead?.projectCode);
      console.log(
        "Converted Doc ID:",
        projectCodeToDocId(currentLead?.projectCode || "")
      );

      const trainingFormsSnapshot = await getDocs(
        collection(db, "trainingForms")
      );
      const allTrainingForms = trainingFormsSnapshot.docs.map((doc) => ({
        id: doc.id,
        projectCode: doc.data().projectCode,
      }));

      console.log("All Training Forms:", allTrainingForms);
      console.log(
        "Matching Document:",
        allTrainingForms.find(
          (form) =>
            form.id === projectCodeToDocId(currentLead?.projectCode || "") ||
            form.projectCode === currentLead?.projectCode
        )
      );
      console.groupEnd();
    } catch (error) {
      console.error("Error logging project codes:", error);
    }
  };

  const processExcelData = async (data, projectCode) => {
    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      const docId = projectCodeToDocId(projectCode);
      const trainingFormRef = doc(db, "trainingForms", docId);
      const docSnap = await getDoc(trainingFormRef);

      if (!docSnap.exists()) {
        await setDoc(trainingFormRef, {
          projectCode,
          docId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const studentsRef = collection(trainingFormRef, "students");

      // Delete existing students
      const existingStudents = await getDocs(studentsRef);
      const deletePromises = existingStudents.docs.map((studentDoc) =>
        deleteDoc(doc(studentsRef, studentDoc.id))
      );
      await Promise.all(deletePromises);

      // Process new data
      const totalRows = data.length;
      let processedRows = 0;

      for (const row of data) {
        try {
          const studentData = {};
          Object.keys(row).forEach((key) => {
            if (row[key] !== undefined && row[key] !== null) {
              studentData[key] = row[key];
            }
          });

          studentData.uploadedAt = new Date();
          studentData.projectCode = projectCode;

          const newStudentRef = doc(studentsRef);
          await setDoc(newStudentRef, studentData);

          processedRows++;
          setUploadProgress(Math.round((processedRows / totalRows) * 100));
        } catch (error) {
          console.error(`Error processing row ${processedRows + 1}:`, error);
        }
      }

      // Update parent document
      await setDoc(
        trainingFormRef,
        {
          studentCount: data.length,
          updatedAt: new Date(),
          studentFileUrl: selectedFile?.name || "uploaded_file",
        },
        { merge: true }
      );

      return true;
    } catch (error) {
      console.error("Error processing Excel data:", error);
      setUploadError("Failed to process the file. Please try again.");
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleTargetUpdate = async () => {
    await fetchTargets();
    // Placeholder for deficit calculations
    await fetchTargets();
  };

  // =============================== LEAD FILTERING LOGIC ===============================
  const isUserInTeam = (uid) => {
    if (!uid) return false;

    const currentUserObj = Object.values(users).find(
      (u) => u.uid === currentUser?.uid
    );
    const currentRole = currentUserObj?.role;

    if (currentRole === "Head") {
      const user = Object.values(users).find((u) => u.uid === uid);
      if (!user) return false;

      if (user.role === "Manager") return true;
      if (
        ["Assistant Manager", "Executive"].includes(user.role) &&
        user.reportingManager
      ) {
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
  };

  const filteredLeads = useMemo(() => {
    console.log('Filtering leads...', leads, currentUser, filterType, quarterFilter);
    if (!currentUser) return [];

    return Object.entries(leads)
      .filter(([, lead]) => {
        if (viewMyLeadsOnly) {
          return lead.assignedTo?.uid === currentUser.uid;
        } else {
          const currentUserObj = Object.values(users).find(
            (u) => u.uid === currentUser?.uid
          );
          const currentRole = currentUserObj?.role;

          if (currentRole === "Director") return true;
          if (currentRole === "Head") {
            return isUserInTeam(lead.assignedTo?.uid);
          } else if (currentRole === "Manager") {
            return (
              isUserInTeam(lead.assignedTo?.uid) ||
              lead.assignedTo?.uid === currentUser.uid
            );
          } else {
            return (
              isUserInTeam(lead.assignedTo?.uid) ||
              lead.assignedTo?.uid === currentUser.uid
            );
          }
        }
      })
      .filter(([, lead]) => {
        if (filterType === "all") return true;
        return lead.closureType === filterType;
      })
      .filter(([, lead]) => {
        if (selectedQuarter === "all") return true;
        const closedQuarter = getQuarter(new Date(lead.closedDate));
        return closedQuarter === selectedQuarter;
      })
      .sort(([, a], [, b]) => new Date(b.closedDate) - new Date(a.closedDate));
  }, [leads, currentUser, filterType, quarterFilter, viewMyLeadsOnly, users]);

  // =============================== TARGET COMPONENT ===============================
  const TargetWithEdit = ({
    value,
    fy,
    currentUser,
    targetUser,
    users,
    onUpdate,
    viewMyLeadsOnly,
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value?.toString() || "");
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
      setEditValue(value?.toString() || "");
    }, [value]);

    const currentUserObj = Object.values(users).find(
      (u) => u.uid === currentUser?.uid
    );
    const targetUserObj = targetUser || currentUserObj;
    const currentRole = currentUserObj?.role;
    const targetRole = targetUserObj?.role;

    // Check edit permissions
    let canEdit = false;
    if (!viewMyLeadsOnly) {
      if (["Admin", "Director"].includes(currentRole)) {
        canEdit = true;
      } else if (
        currentRole === "Head" &&
        ["Manager", "Assistant Manager", "Executive"].includes(targetRole)
      ) {
        canEdit = true;
      } else if (
        currentRole === "Manager" &&
        ["Assistant Manager", "Executive"].includes(targetRole)
      ) {
        canEdit = true;
      }
    }

    const isSelf = currentUser?.uid === targetUserObj?.uid;
    const isAdminOrDirector = ["Admin", "Director"].includes(
      currentUserObj?.role
    );

    // Render read-only if not authorized
    if (viewMyLeadsOnly) {
      if (!(isSelf && isAdminOrDirector)) {
        return (
          <span className="text-gray-700 font-medium">
            {formatCurrency(value)}
          </span>
        );
      }
    } else {
      if (!canEdit || !targetUserObj) {
        return (
          <span className="text-gray-700 font-medium">
            {formatCurrency(value)}
          </span>
        );
      }
    }

    const handleSave = async () => {
      const numValue = Number(editValue.replace(/,/g, ""));
      if (isNaN(numValue)) {
        setError("Please enter a valid number");
        return;
      }

      try {
        setIsUpdating(true);
        setError(null);
        const quarters = ["Q1", "Q2", "Q3", "Q4"];

        // Check Manager's total target if assigning to subordinate
        if (
          currentRole === "Manager" &&
          ["Assistant Manager", "Executive"].includes(targetRole)
        ) {
          const managerUid = currentUserObj.uid;
          let managerTotalTarget = 0;

          for (const q of quarters) {
            const managerTargetId = `${fy}_${q}_${managerUid}`;
            const managerDocRef = doc(db, "quarterly_targets", managerTargetId);
            const managerDocSnap = await getDoc(managerDocRef);

            if (managerDocSnap.exists()) {
              const data = managerDocSnap.data();
              managerTotalTarget += data.target_amount || 0;
            }
          }

          if (numValue > managerTotalTarget) {
            setError("Cannot assign more than your total target");
            setIsUpdating(false);
            return;
          }
        }

        // Split target into quarters
        const perQuarter = Math.floor(numValue / 4);
        let remaining = numValue - perQuarter * 4;

        for (let i = 0; i < quarters.length; i++) {
          let adjustedTarget = perQuarter;
          if (remaining > 0) {
            adjustedTarget += 1;
            remaining -= 1;
          }

          const targetId = `${fy}_${quarters[i]}_${targetUserObj.uid}`;
          await setDoc(
            doc(db, "quarterly_targets", targetId),
            {
              target_amount: adjustedTarget,
              financial_year: fy,
              quarter: quarters[i],
              assignedTo: targetUserObj.uid,
            },
            { merge: true }
          );
        }

        // Manager target reduction
        if (
          currentRole === "Manager" &&
          ["Assistant Manager", "Executive"].includes(targetRole)
        ) {
          const managerUid = currentUserObj.uid;
          const managerPerQuarterReduction = Math.floor(numValue / 4);
          let mgrRemaining = numValue - managerPerQuarterReduction * 4;

          for (let i = 0; i < quarters.length; i++) {
            let reduction = managerPerQuarterReduction;
            if (mgrRemaining > 0) {
              reduction += 1;
              mgrRemaining -= 1;
            }

            const managerTargetId = `${fy}_${quarters[i]}_${managerUid}`;
            const managerDocRef = doc(db, "quarterly_targets", managerTargetId);
            const managerDocSnap = await getDoc(managerDocRef);
            const managerData = managerDocSnap.exists()
              ? managerDocSnap.data()
              : {};
            const currentManagerTarget = managerData.target_amount || 0;
            const newManagerTarget = Math.max(
              currentManagerTarget - reduction,
              0
            );

            await setDoc(
              managerDocRef,
              {
                target_amount: newManagerTarget,
                financial_year: fy,
                quarter: quarters[i],
                assignedTo: managerUid,
              },
              { merge: true }
            );
          }
        }

        onUpdate();
        setIsEditing(false);
      } catch (err) {
        console.error("Error updating target:", err);
        setError("Failed to update target. Please try again.");
      } finally {
        setIsUpdating(false);
      }
    };

    const handleInputChange = (e) => {
      const val = e.target.value.replace(/[^0-9]/g, "");
      setEditValue(val.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    };

    const handleKeyDown = (e) => {
      if (e.key === "Enter") handleSave();
      else if (e.key === "Escape") {
        setIsEditing(false);
        setError(null);
        setEditValue(value?.toString() || "");
      }
    };

    return (
      <div>
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={editValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="px-3 py-1 border rounded focus:outline-none focus:ring"
              disabled={isUpdating}
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              {isUpdating ? (
                <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded flex items-center">
                  <FiLoader className="animate-spin mr-1" /> Updating...
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setError(null);
                      setEditValue(value?.toString() || "");
                    }}
                    className="px-3 py-1 border rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 bg-blue-600 text-white rounded"
                  >
                    Save
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-blue-50 text-blue-600 rounded"
          >
            <FiEdit className="inline-block mr-1" size={14} />
            Edit
          </button>
        )}
      </div>
    );
  };

  // =============================== STATS COMPONENT ===============================
  const ClosedLeadsStats = () => {
    // Defensive: avoid crash if users/leads/currentUser are not ready
    if (!users || !leads || !currentUser) {
      return (
        <div className="p-8 text-center text-gray-500">Loading stats...</div>
      );
    }

    const today = new Date();
    const selectedQuarter =
      quarterFilter === "current" ? getQuarter(today) : quarterFilter;
    const selectedFY = getFinancialYear(today);
    const currentUserObj = Object.values(users).find(
      (u) => u.uid === currentUser?.uid
    );
    const isHead = currentUserObj?.role === "Head";
    const isAdminOrDirector = ["Admin", "Director"].includes(
      currentUserObj?.role
    );
    const isManager = currentUserObj?.role === "Manager";
    const isAssistant = ["Assistant Manager", "Executive"].includes(
      currentUserObj?.role
    );

    if (isAssistant) viewMyLeadsOnly = true;

    // Team members logic
    let teamMembers = [];
    if (isAdminOrDirector) {
      teamMembers = Object.values(users).filter((u) =>
        ["Head", "Manager", "Assistant Manager", "Executive"].includes(u.role)
      );
    } else if (isHead) {
      teamMembers = Object.values(users).filter((u) => u.role === "Manager");
    } else if (isManager) {
      teamMembers = Object.values(users).filter(
        (u) =>
          ["Assistant Manager", "Executive"].includes(u.role) &&
          u.reportingManager === currentUserObj.name
      );
    }

    // Target user logic
    let targetUser;
    if (viewMyLeadsOnly) {
      targetUser = currentUserObj;
    } else if (selectedTeamUserId !== "all") {
      targetUser = teamMembers.find((u) => u.uid === selectedTeamUserId);
    } else if (isManager) {
      targetUser = currentUserObj;
    } else {
      targetUser = currentUserObj;
    }

    // Achievement calculations
    const getAchievedAmount = (uid, quarter) => {
      return Object.values(leads)
        .filter((l) => l.assignedTo?.uid === uid && l.phase === "closed")
        .filter((l) => {
          if (quarter === "all") return true;
          const closedQuarter = getQuarter(new Date(l.closedDate));
          return closedQuarter === quarter;
        })
        .reduce((sum, l) => sum + (l.totalCost || 0), 0);
    };

    const getQuarterTargetWithCarryForward = (uid) => {
      if (selectedQuarter === "all") {
        const totalTarget = ["Q1", "Q2", "Q3", "Q4"].reduce((sum, q) => {
          const t = targets.find(
            (t) =>
              t.financial_year === selectedFY &&
              t.quarter === q &&
              t.assignedTo === uid
          );
          return sum + (t ? t.target_amount : 0);
        }, 0);

        const achieved = getAchievedAmount(uid, "all");
        const deficit = Math.max(totalTarget - achieved, 0);
        return { adjustedTarget: totalTarget, achieved, deficit };
      }

      // Single quarter logic
      let deficit = 0;
      const quarters = ["Q1", "Q2", "Q3", "Q4"];

      for (const q of quarters) {
        const t = targets.find(
          (t) =>
            t.financial_year === selectedFY &&
            t.quarter === q &&
            t.assignedTo === uid
        );
        const baseTarget = t ? t.target_amount : 0;
        const adjustedTarget = baseTarget + deficit;
        const achieved = getAchievedAmount(uid, q);
        deficit = Math.max(adjustedTarget - achieved, 0);

        if (q === selectedQuarter) {
          return { adjustedTarget, achieved, deficit };
        }
      }

      return { adjustedTarget: 0, achieved: 0, deficit: 0 };
    };

    // Aggregate calculations
    const displayQuarterTarget = getQuarterTargetWithCarryForward(
      targetUser?.uid
    );
    const achievedValue = getAchievedAmount(targetUser?.uid, selectedQuarter);
    const achievementPercentage =
      displayQuarterTarget.adjustedTarget > 0
        ? Math.min(
            Math.round(
              (achievedValue / displayQuarterTarget.adjustedTarget) * 100
            ),
            100
          )
        : 0;
    const completionStatus = achievementPercentage >= 100 ? "Ahead" : "Behind";
    const statusColor =
      achievementPercentage >= 100 ? "text-green-600" : "text-red-600";

    console.log("Leads:", leads);
    console.log("Current User:", currentUser);
    console.log("Users:", users);

    return (
      <div className="bg-white shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Sales Performance Dashboard
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shadow-sm">
                {selectedFY}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 shadow-sm">
                {selectedQuarter}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 shadow-sm">
                {selectedTeamUserId === "all" && !viewMyLeadsOnly
                  ? "All Team Members"
                  : targetUser?.name}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColor} bg-opacity-20`}
              >
                {completionStatus} {achievementPercentage}%
              </span>
            </div>
          </div>

          {!viewMyLeadsOnly && teamMembers.length > 0 && (
            <div className="mt-3 sm:mt-0 w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team Member
              </label>
              <div className="relative">
                <select
                  value={selectedTeamUserId}
                  onChange={(e) => setSelectedTeamUserId(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white shadow-sm"
                >
                  <option value="all">All Team Members</option>
                  {teamMembers.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* Achieved Card */}
          <div className="p-6 hover:bg-gray-50 transition-colors duration-200">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-50 mb-4 shadow-inner border border-green-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">
                Achieved
              </h3>
              <p className="text-3xl font-bold text-gray-900 mb-4">
                {formatCurrency(achievedValue)}
              </p>
              {displayQuarterTarget.adjustedTarget > 0 && (
                <div className="w-full max-w-xs">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span className="font-medium">
                      {achievementPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${achievementPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Target Card */}
          <div className="p-6 hover:bg-gray-50 transition-colors duration-200">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-4 shadow-inner border border-blue-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">
                Annual Target
              </h3>
              <div className="min-h-[48px] flex items-center justify-center mb-3">
                <TargetWithEdit
                  value={displayQuarterTarget.adjustedTarget}
                  fy={selectedFY}
                  currentUser={currentUser}
                  targetUser={
                    !viewMyLeadsOnly && selectedTeamUserId !== "all"
                      ? targetUser
                      : null
                  }
                  users={users}
                  onUpdate={handleTargetUpdate}
                  viewMyLeadsOnly={viewMyLeadsOnly}
                />
              </div>
              <div className="w-full max-w-xs bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Quarter Target:</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {formatCurrency(displayQuarterTarget.adjustedTarget)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-600">Achieved:</span>
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(achievedValue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Deficit Card */}
          <div className="p-6 hover:bg-gray-50 transition-colors duration-200">
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-14 h-14 rounded-full mb-4 shadow-inner border ${
                  displayQuarterTarget.deficit > 0
                    ? "bg-red-50 border-red-100"
                    : "bg-green-50 border-green-100"
                }`}
              >
                {displayQuarterTarget.deficit > 0 ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">
                {displayQuarterTarget.deficit > 0 ? "Deficit" : "Surplus"}
              </h3>
              <p
                className="text-3xl font-bold mb-2"
                style={{
                  color:
                    displayQuarterTarget.deficit > 0 ? "#DC2626" : "#10B981",
                }}
              >
                {formatCurrency(Math.abs(displayQuarterTarget.deficit))}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =============================== TABLE COMPONENT ===============================
  const ClosedLeadsTable = () => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    const currentRows = filteredLeads.slice(startIdx, startIdx + rowsPerPage);
    const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);

    const isValidFileType = (file) => {
      const validTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel.sheet.macroEnabled.12",
        "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
        "text/csv",
      ];
      return (
        validTypes.includes(file.type) ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls") ||
        file.name.endsWith(".csv")
      );
    };

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file && isValidFileType(file)) {
        if (file.size > 5 * 1024 * 1024) {
          setUploadError("File size exceeds 5MB limit");
          return;
        }
        setSelectedFile(file);
        setUploadError(null);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && isValidFileType(file)) {
        if (file.size > 5 * 1024 * 1024) {
          setUploadError("File size exceeds 5MB limit");
          return;
        }
        setSelectedFile(file);
        setUploadError(null);
      }
    };

    const removeFile = () => {
      setSelectedFile(null);
      setUploadError(null);
    };

    const readFile = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
      });
    };

    const handleUpload = async (projectCode) => {
      if (!selectedFile) return;

      try {
        const fileData = await readFile(selectedFile);
        const workbook = XLSX.read(fileData, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          setUploadError("The file contains no data.");
          return;
        }

        const success = await processExcelData(jsonData, projectCode);

        if (success) {
          setUploadSuccess(true);
          setTimeout(() => {
            setShowUploadModal(false);
            setSelectedFile(null);
            setUploadProgress(0);
            setUploadSuccess(false);
          }, 2000);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        setUploadError(
          "Error reading the file. Please check the format and try again."
        );
      }
    };

    const handleUploadClick = async () => {
      const currentLead = leads.find(([id]) => id === openDropdown)?.[1];
      if (!currentLead) return;
      const projectCode = currentLead.projectCode || "";

      if (projectCode) {
        await logAvailableProjectCodes();
        handleUpload(projectCode);
      } else {
        setUploadError("No valid project code found for this lead");
      }
    };

    const toggleDropdown = (id) => {
      setOpenDropdown(openDropdown === id ? null : id);
    };

    return (
      <div className="overflow-x-auto">
        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center border-b px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Upload Student List
                </h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setUploadError(null);
                    setUploadProgress(0);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                  disabled={uploading}
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>
              <div className="px-6 py-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    isDragging
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4 flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                    >
                      <span>Browse files</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Excel (.xlsx, .xls) or CSV files only (max 5MB)
                  </p>
                </div>

                {selectedFile && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeFile}
                      className="text-gray-400 hover:text-gray-500"
                      disabled={uploading}
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {uploading && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="mt-4 p-3 bg-green-50 rounded-md text-green-600 text-sm">
                    Student list uploaded successfully!
                  </div>
                )}

                {uploadError && (
                  <div className="mt-4 p-3 bg-red-50 rounded-md text-red-600 text-sm">
                    {uploadError}
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-6 py-3 flex justify-end border-t">
                <button
                  type="button"
                  className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setUploadError(null);
                    setUploadProgress(0);
                  }}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    selectedFile && !uploading
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-blue-300 cursor-not-allowed"
                  }`}
                  disabled={!selectedFile || uploading}
                  onClick={handleUploadClick}
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Project Code",
                "Institution",
                "Location",
                "Closed Date",
                "Actual TCV",
                "Projected TCV",
                "Owner",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentRows.length > 0 ? (
              currentRows.map(([id, lead]) => (
                <tr key={id} className="hover:bg-gray-50 transition-colors">
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    title={`DocID: ${projectCodeToDocId(
                      lead.projectCode || ""
                    )}, ProjectCode: ${docIdToProjectCode(
                      projectCodeToDocId(lead.projectCode || "")
                    )}, Year: ${displayYear(String(lead.closedDate || ""))}`}
                  >
                    {displayProjectCode(lead.projectCode) || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium flex-shrink-0">
                        {lead.businessName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900 truncate max-w-xs">
                          {lead.businessName || "-"}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {lead.closureType === "new" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              New
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Renewal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {lead.city || "-"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {lead.state || ""}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(lead.closedDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {formatCurrency(lead.totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {formatCurrency(lead.tcv)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium flex-shrink-0">
                        {lead.assignedTo?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "?"}
                      </div>
                      <div className="ml-3 text-sm font-medium text-gray-900 truncate max-w-xs">
                        {lead.assignedTo?.name || "-"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                    <button
                      onClick={() => toggleDropdown(id)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <FiMoreVertical className="h-5 w-5" />
                    </button>
                    {openDropdown === id && (
                      <div className="origin-top-right absolute right-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1" role="menu">
                          <button
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                            role="menuitem"
                            onClick={() => {
                              setShowUploadModal(true);
                            }}
                          >
                            Upload Student List
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="py-12 text-center">
                  <FiFilter className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 font-medium text-gray-900">
                    No closed deals found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {`There are currently no ${
                      viewMyLeadsOnly ? "your" : "team"
                    } closed deals.`}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {filteredLeads.length > rowsPerPage && (
          <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-t gap-4">
            <div className="text-sm text-gray-500">
              Showing <strong>{startIdx + 1}</strong> to{" "}
              <strong>
                {Math.min(startIdx + rowsPerPage, filteredLeads.length)}
              </strong>{" "}
              of <strong>{filteredLeads.length}</strong> results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md border text-sm flex items-center ${
                  currentPage === 1
                    ? "border-gray-200 text-gray-400"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FiChevronLeft className="mr-1" /> Prev
              </button>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md border text-sm flex items-center ${
                  currentPage === totalPages
                    ? "border-gray-200 text-gray-400"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Next <FiChevronRight className="ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =============================== MAIN COMPONENT RENDER ===============================
  const today = new Date();
  const selectedQuarter =
    quarterFilter === "current" ? getQuarter(today) : quarterFilter;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Closed Deals</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            {["all", "new", "renewal"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filterType === type
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {type === "all" ? "All" : type === "new" ? "New" : "Renewals"}
              </button>
            ))}
          </div>

          <select
            value={quarterFilter}
            onChange={(e) => setQuarterFilter(e.target.value)}
            className="px-4 py-2 border rounded-md text-sm bg-white shadow-sm"
          >
            <option value="current">Current Quarter</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
            <option value="all">All Quarters</option>
          </select>
        </div>
      </div>

      <ClosedLeadsStats />
      <ClosedLeadsTable />
    </div>
  );
};

SalesClientOnboarding.propTypes = {
  leads: PropTypes.object.isRequired,
  viewMyLeadsOnly: PropTypes.bool.isRequired,
  currentUser: PropTypes.shape({
    uid: PropTypes.string,
    role: PropTypes.string,
    name: PropTypes.string,
  }),
  users: PropTypes.object.isRequired,
};

export default SalesClientOnboarding;
