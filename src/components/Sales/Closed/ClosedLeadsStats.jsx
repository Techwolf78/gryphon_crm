import React, { useState } from "react";
import PropTypes from "prop-types";
import TargetWithEdit from "./TargetWithEdit";

const ClosedLeadsStats = ({
  leads,
  targets,
  currentUser,
  users,
  selectedFY,
  activeQuarter,
  formatCurrency,
  viewMyLeadsOnly,
  achievedValue,
  handleTargetUpdate,
}) => {
  const userObj = Object.values(users).find((u) => u.uid === currentUser?.uid);
  const isHead = ["Head", "Admin", "Director"].includes(userObj?.role);
  const isManager = userObj?.role === "Manager";

  let teamMembers = [];
  if (isHead) {
    teamMembers = Object.values(users).filter((u) => u.role === "Manager");
  } else if (isManager) {
    teamMembers = Object.values(users).filter(
      (u) =>
        ["Assistant Manager", "Executive"].includes(u.role) &&
        u.reportingManager === userObj.name
    );
  }

  const [selectedTeamUserId, setSelectedTeamUserId] = useState("all");

  const getQuarter = (date) => {
    const m = date.getMonth() + 1;
    if (m >= 4 && m <= 6) return "Q1";
    if (m >= 7 && m <= 9) return "Q2";
    if (m >= 10 && m <= 12) return "Q3";
    return "Q4";
  };

  const getAchievedAmount = (uid, quarter) => {
    return Object.values(leads)
      .filter((l) => l.assignedTo === uid && l.phase === "closed")
      .filter((l) => {
        const closedQuarter = getQuarter(new Date(l.closedDate));
        return closedQuarter === quarter;
      })
      .reduce((sum, l) => sum + (l.totalCost || 0), 0);
  };

  const getCarryForwardTarget = (uid) => {
    let previousDeficit = 0;
    let finalTarget = 0;
    const quarters = ["Q1", "Q2", "Q3", "Q4"];

    for (const q of quarters) {
      const t = targets.find(
        (t) =>
          t.financial_year === selectedFY &&
          t.quarter === q &&
          t.assignedTo === uid
      );
      const quarterTarget = t ? t.target_amount : 0;
      const adjustedTarget = quarterTarget + previousDeficit;

      const quarterAchieved = getAchievedAmount(uid, q);
      const deficit = Math.max(adjustedTarget - quarterAchieved, 0);

      if (q === activeQuarter) {
        finalTarget = adjustedTarget;
        break;
      }

      previousDeficit = deficit;
    }

    return finalTarget;
  };

  // Determine targetUser correctly
  let targetUser;
  if (viewMyLeadsOnly) {
    targetUser = userObj;
  } else if (selectedTeamUserId !== "all") {
    targetUser = teamMembers.find((u) => u.uid === selectedTeamUserId);
  } else {
    targetUser = null;
  }

  const targetUid = targetUser ? targetUser.uid : currentUser.uid;
  const displayTarget = getCarryForwardTarget(targetUid);
  const displayDeficit = displayTarget - achievedValue;

  // Percentage calculation
  const achievementPercentage = displayTarget > 0
    ? Math.min(Math.round((achievedValue / displayTarget) * 100), 100)
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header with Team Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Performance Dashboard</h2>
          <p className="text-sm text-gray-600">
            {selectedFY} • {activeQuarter} • {targetUser?.name || userObj?.name}
          </p>
        </div>
        
        {!viewMyLeadsOnly && teamMembers.length > 0 && (
          <div className="mt-3 sm:mt-0 w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">View Team Member</label>
            <select
              value={selectedTeamUserId}
              onChange={(e) => setSelectedTeamUserId(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="all">All Team Members</option>
              {teamMembers.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {/* Achieved */}
        <div className="p-8">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-50 mb-4">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-500 mb-2">Achieved</p>
            <p className="text-4xl font-bold text-green-600 mb-4">
              {formatCurrency(achievedValue)}
            </p>
            {displayTarget > 0 && (
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{achievementPercentage}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${achievementPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Target */}
        <div className="p-8">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 mb-4">
              <svg
                className="w-10 h-10 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-500 mb-2">Target</p>
            <div className="min-h-[48px] flex items-center justify-center mb-4">
              <TargetWithEdit
                value={displayTarget}
                fy={selectedFY}
                quarter={activeQuarter}
                currentUser={currentUser}
                targetUser={!viewMyLeadsOnly && selectedTeamUserId !== "all" ? targetUser : null}
                users={users}
                onUpdate={handleTargetUpdate}
                viewMyLeadsOnly={viewMyLeadsOnly}
              />
            </div>
            <div className="text-sm text-gray-600">
              {displayTarget > 0 && (
                <p>Quarterly: {formatCurrency(Math.floor(displayTarget / 4))}</p>
              )}
            </div>
          </div>
        </div>

        {/* Deficit */}
        <div className="p-8">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mb-4">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-500 mb-2">Deficit</p>
            <p className="text-4xl font-bold mb-4" style={{ 
              color: displayDeficit > 0 ? '#DC2626' : '#10B981'
            }}>
              {formatCurrency(Math.abs(displayDeficit))}
            </p>
            {displayTarget > 0 && (
              <p className="text-lg" style={{ 
                color: displayDeficit > 0 ? '#DC2626' : '#10B981'
              }}>
                {displayDeficit > 0 ? (
                  <span>Remaining to target</span>
                ) : (
                  <span>Above target</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
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
  achievedValue: PropTypes.number.isRequired,
  handleTargetUpdate: PropTypes.func.isRequired,
};

export default ClosedLeadsStats;