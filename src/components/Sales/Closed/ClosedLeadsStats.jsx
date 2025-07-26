import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import TargetWithEdit from "./TargetWithEdit";
// 🔝 Top of ClosedLeadsStats.js
const getCurrentFinancialYear = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};
const ClosedLeadsStats = ({
  leads,
  targets,
  currentUser,
  users,
  selectedFY: propSelectedFY,  // ← rename incoming prop
  activeQuarter,
  formatCurrency,
  viewMyLeadsOnly,
  handleTargetUpdate,
  selectedTeamUserId,        
  setSelectedTeamUserId
}) => {
 
  const [selectedFY, setSelectedFY] = useState(propSelectedFY || getCurrentFinancialYear());
 
  const userObj = Object.values(users).find((u) => u.uid === currentUser?.uid);
 const isHead = userObj?.role === "Head";
const isAdminOrDirector = ["Admin", "Director"].includes(userObj?.role);
 
  const isManager = userObj?.role === "Manager";
 
  let teamMembers = [];
if (isAdminOrDirector) {
  teamMembers = Object.values(users).filter((u) =>
    ["Head", "Manager", "Assistant Manager", "Executive"].includes(u.role) &&
    u.department === "Sales"
  );
}
else if (isHead) {
  teamMembers = Object.values(users).filter((u) =>
    ["Manager"].includes(u.role) &&
    u.department === "Sales"
  );
} else if (isManager) {
  teamMembers = Object.values(users).filter(
    (u) =>
      ["Assistant Manager", "Executive"].includes(u.role) &&
      u.reportingManager === userObj.name &&
      u.department === "Sales"
  );
}
 
 
 
  let targetUser;
 
  const isAssistant = ["Assistant Manager", "Executive"].includes(userObj?.role);
 
  if (isAssistant) {
    viewMyLeadsOnly = true;
  }
  if (viewMyLeadsOnly) {
    targetUser = userObj;
  } else if (isAssistant) {
    targetUser = userObj; // ✅ Assistant/Executive ka khud ka target
  } else if (selectedTeamUserId !== "all") {
    targetUser = teamMembers.find((u) => u.uid === selectedTeamUserId);
  } else if (isManager) {
    targetUser = userObj;
  } else if (isHead) {
    targetUser = null;
  } else {
    targetUser = userObj;
  }
 
  const targetUid = targetUser?.uid;
 
  const getQuarter = (date) => {
    const m = date.getMonth() + 1;
    if (m >= 4 && m <= 6) return "Q1";
    if (m >= 7 && m <= 9) return "Q2";
    if (m >= 10 && m <= 12) return "Q3";
    return "Q4";
  };
 
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
    if (activeQuarter === "all") {
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
 
    // Existing logic for single quarter
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
 
      if (q === activeQuarter) {
        return { adjustedTarget, achieved, deficit };
      }
    }
 
    return { adjustedTarget: 0, achieved: 0, deficit: 0 };
  };
 
 
  const getTotalAchievedAmount = (uids, quarter) => {
    return uids.reduce((sum, uid) => sum + getAchievedAmount(uid, quarter), 0);
  };
 
  const getCombinedQuarterTarget = (uids) => {
    let totalAdjustedTarget = 0;
    let totalAchieved = 0;
    let totalDeficit = 0;
 
    uids.forEach((uid) => {
      const quarterData = getQuarterTargetWithCarryForward(uid);
      totalAdjustedTarget += quarterData.adjustedTarget;
      totalAchieved += quarterData.achieved;
      totalDeficit += quarterData.deficit;
    });
 
    return { adjustedTarget: totalAdjustedTarget, achieved: totalAchieved, deficit: totalDeficit };
  };
 
  const isHeadViewingManager =
    isHead && selectedTeamUserId !== "all" && targetUser?.role === "Manager";
 
  let allUids = [];
  if (isHeadViewingManager) {
    const managerTeamMembers = Object.values(users).filter(
      (u) =>
        ["Assistant Manager", "Executive"].includes(u.role) &&
        u.reportingManager === targetUser?.name &&
        u.department === "Sales"
    );
    const allManagerTeam = [targetUser, ...managerTeamMembers];
    allUids = allManagerTeam.map((u) => u.uid);
  }
 
  // Calculate aggregate values for "All Team Members"
  const allTeamMembers = [userObj, ...teamMembers];
  const uniqueTeamMembers = allTeamMembers.filter(
    (member, index, self) => index === self.findIndex((m) => m.uid === member.uid)
  );
  const aggregateValues = useMemo(() => {
  if (selectedTeamUserId !== "all" || viewMyLeadsOnly) {
    return null;
  }
 
  let allUids = [];
 
  if (isAdminOrDirector) {
    allUids = Object.values(users)
      .filter((u) =>
        ["Head", "Manager", "Assistant Manager", "Executive"].includes(u.role) &&
        u.department === "Sales"
      )
      .map((u) => u.uid);
  } else if (isHead) {
    let managers = teamMembers.filter((u) => u.role === "Manager" && u.department === "Sales");
 
    managers.forEach((manager) => {
      allUids.push(manager.uid);
 
      const subordinates = Object.values(users).filter(
        (u) =>
          ["Assistant Manager", "Executive"].includes(u.role) &&
          u.reportingManager === manager.name &&
          u.department === "Sales"
      );
 
      subordinates.forEach((sub) => {
        allUids.push(sub.uid);
      });
    });
  } else if (isManager) {
    allUids.push(userObj.uid);
 
    const subordinates = Object.values(users).filter(
      (u) =>
        ["Assistant Manager", "Executive"].includes(u.role) &&
        u.reportingManager === userObj.name &&
        u.department === "Sales"
    );
 
    subordinates.forEach((sub) => {
      allUids.push(sub.uid);
    });
  }
 
  let totalAdjustedTarget = 0;
  let totalAchieved = 0;
  let totalDeficit = 0;
  let totalAnnualTarget = 0;
 
  allUids.forEach((uid) => {
    const quarterData = getQuarterTargetWithCarryForward(uid);
 
    totalAdjustedTarget += quarterData.adjustedTarget;
    totalAchieved += quarterData.achieved;
    totalDeficit += quarterData.deficit;
 
    const memberAnnualTarget = ["Q1", "Q2", "Q3", "Q4"].reduce((total, q) => {
      const t = targets.find(
        (t) =>
          t.financial_year === selectedFY &&
          t.quarter === q &&
          t.assignedTo === uid
      );
      return total + (t ? t.target_amount : 0);
    }, 0);
 
    totalAnnualTarget += memberAnnualTarget;
  });
 
  return {
    adjustedTarget: totalAdjustedTarget,
    achieved: totalAchieved,
    deficit: totalDeficit,
    annualTarget: totalAnnualTarget,
  };
}, [
  selectedTeamUserId,
  viewMyLeadsOnly,
  targets,
  selectedFY,
  activeQuarter,
  leads,
  users,
]);
 
  // Display targets and achieved values
  const displayQuarterTarget = isHeadViewingManager
    ? getCombinedQuarterTarget(allUids)
    : selectedTeamUserId === "all" && !viewMyLeadsOnly && aggregateValues
      ? aggregateValues
      : getQuarterTargetWithCarryForward(targetUid);
 
  const achievedValue = isHeadViewingManager
    ? getTotalAchievedAmount(allUids, activeQuarter)
    : selectedTeamUserId === "all" && !viewMyLeadsOnly && aggregateValues
      ? aggregateValues.achieved
      : getAchievedAmount(targetUid, activeQuarter);
 
  const annualTarget = selectedTeamUserId === "all" && !viewMyLeadsOnly && aggregateValues
    ? aggregateValues.annualTarget
    : ["Q1", "Q2", "Q3", "Q4"].reduce((total, q) => {
      const t = targets.find(
        (t) =>
          t.financial_year === selectedFY &&
          t.quarter === q &&
          t.assignedTo === targetUid
      );
      return total + (t ? t.target_amount : 0);
    }, 0);
 
  const displayDeficit = displayQuarterTarget.deficit;
  const achievementPercentage =
    displayQuarterTarget.adjustedTarget > 0
      ? Math.min(Math.round((achievedValue / displayQuarterTarget.adjustedTarget) * 100), 100)
      : 0;
 
  const completionStatus = achievementPercentage >= 100 ? "Ahead" : "Behind";
  const statusColor = achievementPercentage >= 100 ? "text-green-600" : "text-red-600";
 
 
 
  return (
    // ... your existing UI (cards) as is, no change needed ...
    <>
      <div className="bg-white shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Sales Performance Dashboard</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shadow-sm">
                {selectedFY}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 shadow-sm">
                {activeQuarter}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 shadow-sm">
                {selectedTeamUserId === "all" && !viewMyLeadsOnly ? "All Team Members" : targetUser?.name}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColor} bg-opacity-20`}>
                {completionStatus} {achievementPercentage}%
              </span>
            </div>
          </div>
 
          {!viewMyLeadsOnly && teamMembers.length > 0 && (
            <div className="mt-3 sm:mt-0 w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Member</label>
              <div className="relative">
                <select
                  value={selectedTeamUserId}
                  onChange={(e) => setSelectedTeamUserId(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white shadow-sm appearance-none"
                >
                  <option value="all">All Team Members</option>
                  {teamMembers.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
 
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* Achieved Card */}
          <div className="p-6 hover:bg-gray-50 transition-colors duration-200">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-50 mb-4 shadow-inner border border-green-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">Achieved</h3>
              <p className="text-3xl font-bold text-gray-900 mb-4">
                {formatCurrency(achievedValue)}
              </p>
              {displayQuarterTarget.adjustedTarget > 0 && (
                <div className="w-full max-w-xs">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span className="font-medium">{achievementPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${achievementPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
 
          {/* Target Card */}
          <div className="p-6 hover:bg-gray-50 transition-colors duration-200">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-4 shadow-inner border border-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">Annual Target</h3>
              <div className="min-h-[48px] flex items-center justify-center mb-3">
                {annualTarget > 0 ? (
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(annualTarget)}
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-gray-500">
                    Not Assigned
                  </p>
                )}
              </div>
              
              {/* Show edit button only for individual users, not for "All Team Members" */}
              {selectedTeamUserId !== "all" || viewMyLeadsOnly ? (
                <div className="mb-3">
                  <TargetWithEdit
                    value={annualTarget}
                    fy={selectedFY}
                    currentUser={currentUser}
                    targetUser={!viewMyLeadsOnly && selectedTeamUserId !== "all" ? targetUser : null}
                    users={users}
                    onUpdate={handleTargetUpdate}
                    viewMyLeadsOnly={viewMyLeadsOnly}
                  />
                </div>
              ) : null}
              
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
              <div className={`flex items-center justify-center w-14 h-14 rounded-full mb-4 shadow-inner border ${displayDeficit > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                {displayDeficit > 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">
                {displayDeficit > 0 ? "Deficit" : "Surplus"}
              </h3>
              <p
                className="text-3xl font-bold mb-2"
                style={{
                  color: displayDeficit > 0 ? "#DC2626" : "#10B981",
                }}
              >
                {formatCurrency(Math.abs(displayDeficit))}
              </p>
              {displayQuarterTarget.adjustedTarget > 0 && (
                <div className={`w-full max-w-xs p-3 rounded-lg ${displayDeficit > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'} border`}>
                  <p className={`text-sm text-center font-medium ${displayDeficit > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {displayDeficit > 0 ? (
                      <span>You need <span className="font-bold">{Math.round((displayDeficit / displayQuarterTarget.adjustedTarget) * 100)}%</span> more to reach target</span>
                    ) : (
                      <span>You're <span className="font-bold">{Math.round((Math.abs(displayDeficit) / displayQuarterTarget.adjustedTarget) * 100)}%</span> above target</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
 
ClosedLeadsStats.propTypes = {
  leads: PropTypes.object.isRequired,
  targets: PropTypes.array.isRequired,
  currentUser: PropTypes.object.isRequired,
  users: PropTypes.object.isRequired,
  selectedFY: PropTypes.string.isRequired,
  activeQuarter: PropTypes.string.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  viewMyLeadsOnly: PropTypes.bool.isRequired,
  handleTargetUpdate: PropTypes.func.isRequired,
  selectedTeamUserId: PropTypes.string.isRequired,
  setSelectedTeamUserId: PropTypes.func.isRequired,
};
 
 
export default ClosedLeadsStats;
