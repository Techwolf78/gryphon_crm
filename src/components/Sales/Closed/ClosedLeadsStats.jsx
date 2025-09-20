import React, { useMemo, useCallback } from "react";
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
  selectedFY: propSelectedFY, // ← rename incoming prop
  activeQuarter,
  formatCurrency,
  viewMyLeadsOnly,
  handleTargetUpdate,
  selectedTeamUserId,
  setSelectedTeamUserId,
}) => {
  const selectedFY = propSelectedFY || getCurrentFinancialYear();

  const userObj = Object.values(users).find((u) => u.uid === currentUser?.uid);
  const isHead = userObj?.role === "Head";
  const isAdminOrDirector = ["Admin", "Director"].includes(userObj?.role);

  const isManager = userObj?.role === "Manager";

  const teamMembers = useMemo(() => {
    if (isAdminOrDirector) {
      return Object.values(users).filter(
        (u) =>
          ["Head", "Manager", "Assistant Manager", "Executive"].includes(
            u.role
          ) && u.department === "Sales"
      );
    } else if (isHead) {
      return Object.values(users).filter(
        (u) => ["Manager"].includes(u.role) && u.department === "Sales"
      );
    } else if (isManager) {
      return Object.values(users).filter(
        (u) =>
          ["Assistant Manager", "Executive"].includes(u.role) &&
          u.reportingManager === userObj.name &&
          u.department === "Sales"
      );
    }
    return [];
  }, [isAdminOrDirector, isHead, isManager, users, userObj.name]);

  let targetUser;

  const isAssistant = ["Assistant Manager", "Executive"].includes(
    userObj?.role
  );

  const effectiveViewMyLeadsOnly = isAssistant || viewMyLeadsOnly;
  if (effectiveViewMyLeadsOnly) {
    targetUser = userObj;
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

  const getAchievedAmount = useMemo(() => (uid, quarter) => {
    return Object.values(leads)
      .filter((l) => l.assignedTo?.uid === uid && l.phase === "closed")
      .filter((l) => {
        if (quarter === "all") return true;
        const closedQuarter = getQuarter(new Date(l.closedDate));
        return closedQuarter === quarter;
      })
      .reduce((sum, l) => sum + (l.totalCost || 0), 0);
  }, [leads]);

  const getQuarterTargetWithCarryForward = useCallback((uid) => {
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

      return { adjustedTarget: totalTarget, achieved, deficit, baseTarget: totalTarget };
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

      const diff = adjustedTarget - achieved;

      deficit = Math.max(diff, 0); // carry forward only if underachieved

      if (q === activeQuarter) {
        return {
          adjustedTarget,
          achieved,
          deficit: diff, // ← send raw value (can be negative for surplus)
          baseTarget,
        };
      }
    }

    return { adjustedTarget: 0, achieved: 0, deficit: 0, baseTarget: 0 };
  }, [activeQuarter, selectedFY, targets, getAchievedAmount]);

  const getTotalAchievedAmount = useCallback((uids, quarter) => {
    return uids.reduce((sum, uid) => sum + getAchievedAmount(uid, quarter), 0);
  }, [getAchievedAmount]);

  const getCombinedQuarterTarget = useCallback((uids) => {
    let totalAdjustedTarget = 0;
    let totalAchieved = 0;
    let totalDeficit = 0;
    let totalBaseTarget = 0;

    uids.forEach((uid) => {
      const quarterData = getQuarterTargetWithCarryForward(uid);
      totalAdjustedTarget += quarterData.adjustedTarget;
      totalAchieved += quarterData.achieved;
      totalDeficit += quarterData.deficit;
      totalBaseTarget += quarterData.baseTarget;
    });

    return {
      adjustedTarget: totalAdjustedTarget,
      achieved: totalAchieved,
      deficit: totalDeficit,
      baseTarget: totalBaseTarget,
    };
  }, [getQuarterTargetWithCarryForward]);

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
  const aggregateValues = useMemo(() => {
    if (selectedTeamUserId !== "all" || effectiveViewMyLeadsOnly) {
      return null;
    }

    let allUids = [];

    if (isAdminOrDirector) {
      allUids = Object.values(users)
        .filter(
          (u) =>
            ["Head", "Manager", "Assistant Manager", "Executive"].includes(
              u.role
            ) && u.department === "Sales"
        )
        .map((u) => u.uid);
    } else if (isHead) {
      let managers = teamMembers.filter(
        (u) => u.role === "Manager" && u.department === "Sales"
      );

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
    let totalBaseTarget = 0;

    allUids.forEach((uid) => {
      const quarterData = getQuarterTargetWithCarryForward(uid);

      totalAdjustedTarget += quarterData.adjustedTarget;
      totalAchieved += quarterData.achieved;
      totalDeficit += quarterData.deficit;
      totalBaseTarget += quarterData.baseTarget;

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
      baseTarget: totalBaseTarget,
    };
  }, [
    selectedTeamUserId,
    effectiveViewMyLeadsOnly,
    targets,
    selectedFY,
    users,
    getQuarterTargetWithCarryForward,
    isAdminOrDirector,
    isHead,
    isManager,
    teamMembers,
    userObj.name,
    userObj.uid,
  ]);

  // Display targets and achieved values
  const displayQuarterTarget = isHeadViewingManager
    ? getCombinedQuarterTarget(allUids)
    : selectedTeamUserId === "all" && !effectiveViewMyLeadsOnly && aggregateValues
    ? aggregateValues
    : getQuarterTargetWithCarryForward(targetUid);

  const achievedValue = isHeadViewingManager
    ? getTotalAchievedAmount(allUids, activeQuarter)
    : selectedTeamUserId === "all" && !effectiveViewMyLeadsOnly && aggregateValues
    ? aggregateValues.achieved
    : getAchievedAmount(targetUid, activeQuarter);

  const annualTarget =
    selectedTeamUserId === "all" && !effectiveViewMyLeadsOnly && aggregateValues
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
      ? Math.min(
          Math.round(
            (achievedValue / displayQuarterTarget.adjustedTarget) * 100
          ),
          100
        )
      : 0;

  const quarterLabel = displayQuarterTarget.adjustedTarget > displayQuarterTarget.baseTarget ? "Adjusted Quarter Target:" : "Quarter Target:";

  const annualLabel = (selectedTeamUserId === "all" && !effectiveViewMyLeadsOnly) ? "Annual Total Target" : "Annual Target";

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
      {/* Header Section */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/30">
                  📅 {selectedFY}
                </span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/30">
                  🎯 {activeQuarter}
                </span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/30">
                  👤{" "}
                  {selectedTeamUserId === "all" && !effectiveViewMyLeadsOnly
                    ? "All Team Members"
                    : targetUser?.name}
                </span>
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                    achievementPercentage >= 100
                      ? "bg-emerald-500/20 border border-emerald-400/30"
                      : "bg-amber-500/20 border border-amber-400/30"
                  }`}
                >
                  {achievementPercentage >= 100 ? "🚀 Ahead" : "📈 Behind"}{" "}
                  {achievementPercentage}%
                </span>
              </div>
            </div>

            {!effectiveViewMyLeadsOnly && teamMembers.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Team Member
                </label>
                <div className="relative">
                  <select
                    value={selectedTeamUserId}
                    onChange={(e) => setSelectedTeamUserId(e.target.value)}
                    className="block w-full pl-4 pr-10 py-2.5 text-base border border-white/30 rounded-lg bg-white/95 text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 sm:text-sm backdrop-blur-sm"
                  >
                    <option value="all">All Team Members</option>
                    {teamMembers.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/70">
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* Achieved Card */}
        <div className="group bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white"
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
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  Achieved
                </p>
                <p className="text-xs text-emerald-600">This Quarter</p>
              </div>
            </div>
          </div>
          {/* Centered big achieved amount */}
          <div className="text-center mb-4">
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(achievedValue)}
            </p>
            {displayQuarterTarget.adjustedTarget > 0 && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-green-600 h-3 rounded-full transition-all duration-700 ease-out shadow-sm"
                    style={{ width: `${achievementPercentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-emerald-700">
                  {achievementPercentage}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Target Card */}
        <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white"
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
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  {annualLabel}
                </p>
                <p className="text-xs text-blue-600">Full Year Goal</p>
              </div>
            </div>
            <div className="text-right">
              {annualTarget > 0 ? (
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(annualTarget)}
                </p>
              ) : (
                <p className="text-lg font-bold text-gray-500">Not Assigned</p>
              )}
            </div>
          </div>

          {/* Show edit button only for individual users, not for "All Team Members" */}
          {selectedTeamUserId !== "all" || effectiveViewMyLeadsOnly ? (
            <div className="mt-3 flex justify-end">
              <TargetWithEdit
                value={annualTarget}
                fy={selectedFY}
                currentUser={currentUser}
                targetUser={
                  !effectiveViewMyLeadsOnly && selectedTeamUserId !== "all"
                    ? targetUser
                    : null
                }
                users={users}
                onUpdate={handleTargetUpdate}
                viewMyLeadsOnly={effectiveViewMyLeadsOnly}
              />
            </div>
          ) : null}

          <div className="mt-3 bg-white/60 rounded-lg p-3 border border-blue-100/50">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">{quarterLabel}</span>
                <p className="font-semibold text-blue-700">
                  {formatCurrency(displayQuarterTarget.adjustedTarget)}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Achieved:</span>
                <p className="font-semibold text-emerald-600">
                  {formatCurrency(achievedValue)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Deficit/Surplus Card */}
        <div
          className={`group rounded-xl p-4 border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
            displayDeficit > 0
              ? "bg-gradient-to-br from-red-50 to-rose-50 border-red-100/50"
              : "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300 ${
                  displayDeficit > 0
                    ? "bg-gradient-to-r from-red-500 to-rose-600"
                    : "bg-gradient-to-r from-emerald-500 to-green-600"
                }`}
              >
                {displayDeficit > 0 ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-white"
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
                    className="h-4 w-4 text-white"
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
              <div>
                <p
                  className={`text-sm font-semibold ${
                    displayDeficit > 0 ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  {displayDeficit > 0 ? "Deficit" : "Surplus"}
                </p>
                <p
                  className={`text-xs ${
                    displayDeficit > 0 ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {displayDeficit > 0 ? "Gap to Fill" : "Extra Achievement"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p
                className={`text-xl font-bold ${
                  displayDeficit > 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {formatCurrency(Math.abs(displayDeficit))}
              </p>
              <div
                className={`text-xs mt-1 ${
                  displayDeficit > 0 ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {displayDeficit > 0 ? "⚠️ Action Required" : "✅ On Track"}
              </div>
            </div>
          </div>

          {displayQuarterTarget.adjustedTarget > 0 && (
            <div
              className={`mt-3 bg-white/60 rounded-lg p-3 border ${
                displayDeficit > 0
                  ? "border-red-100/50"
                  : "border-emerald-100/50"
              }`}
            >
              <p
                className={`text-xs text-center font-medium ${
                  displayDeficit > 0 ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {displayDeficit > 0 ? (
                  <span>
                    Need{" "}
                    <span className="font-bold">
                      {Math.round(
                        (displayDeficit / displayQuarterTarget.adjustedTarget) *
                          100
                      )}
                      %
                    </span>{" "}
                    more to reach target
                  </span>
                ) : (
                  <span>
                    <span className="font-bold">
                      {Math.round(
                        (Math.abs(displayDeficit) /
                          displayQuarterTarget.adjustedTarget) *
                          100
                      )}
                      %
                    </span>{" "}
                    above target
                  </span>
                )}
              </p>
            </div>
          )}
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
  handleTargetUpdate: PropTypes.func.isRequired,
  selectedTeamUserId: PropTypes.string.isRequired,
  setSelectedTeamUserId: PropTypes.func.isRequired,
};

export default ClosedLeadsStats;
