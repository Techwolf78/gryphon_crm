import React, { useMemo,useState } from "react";
import PropTypes from "prop-types";
import TargetWithEdit from "./TargetWithEdit";
import { FiTrendingUp, FiTarget, FiAlertTriangle, FiCheckCircle, FiUsers, FiCalendar, FiDollarSign } from "react-icons/fi";

const ClosedLeadsStats = ({
  leads,
  targets,
  currentUser,
  users,
  selectedFY,
  activeQuarter,
  formatCurrency,
  viewMyLeadsOnly,
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
 
    let targetUser;
    if (viewMyLeadsOnly) {
        targetUser = userObj;
    } else if (selectedTeamUserId !== "all") {
        targetUser = teamMembers.find((u) => u.uid === selectedTeamUserId);
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
                u.reportingManager === targetUser?.name
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
 
        if (isHead) {
            let managers = teamMembers.filter((u) => u.role === "Manager");
 
            managers.forEach((manager) => {
                allUids.push(manager.uid);
 
                const subordinates = Object.values(users).filter(
                    (u) =>
                        ["Assistant Manager", "Executive"].includes(u.role) &&
                        u.reportingManager === manager.name
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
                    u.reportingManager === userObj.name
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Header Section */}
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Sales Performance</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <FiCalendar className="mr-1" size={12} />
                {selectedFY} | {activeQuarter}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <FiUsers className="mr-1" size={12} />
                {selectedTeamUserId === "all" && !viewMyLeadsOnly ? "Team View" : targetUser?.name}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                achievementPercentage >= 100 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
              }`}>
                {achievementPercentage >= 100 ? (
                  <FiCheckCircle className="mr-1" size={12} />
                ) : (
                  <FiAlertTriangle className="mr-1" size={12} />
                )}
                {completionStatus} ({achievementPercentage}%)
              </span>
            </div>
          </div>

          {/* Team Member Selector */}
          {!viewMyLeadsOnly && teamMembers.length > 0 && (
            <div className="w-full md:w-auto">
              <label htmlFor="team-select" className="sr-only">Select team member</label>
              <div className="relative">
                <select
                  id="team-select"
                  value={selectedTeamUserId}
                  onChange={(e) => setSelectedTeamUserId(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white shadow-xs"
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
      </div>

      {/* Stats Cards - Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {/* Achieved Card */}
        <div className="p-6 hover:bg-gray-50 transition-colors duration-150">
          <div className="flex flex-col h-full">
            <div className="flex items-center mb-4">
              <div className="p-2 rounded-lg bg-green-50 text-green-600 mr-3">
                <FiTrendingUp size={20} />
              </div>
              <h3 className="text-lg font-medium text-gray-700">Achieved</h3>
            </div>
            <div className="flex-grow">
              <p className="text-3xl font-bold text-gray-900 mb-3">
                {formatCurrency(achievedValue)}
              </p>
              {displayQuarterTarget.adjustedTarget > 0 && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Target: {formatCurrency(displayQuarterTarget.adjustedTarget)}</span>
                    <span>{achievementPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        achievementPercentage >= 100 
                          ? "bg-gradient-to-r from-green-400 to-green-600" 
                          : "bg-gradient-to-r from-blue-400 to-blue-600"
                      }`}
                      style={{ width: `${Math.min(achievementPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Target Card */}
        <div className="p-6 hover:bg-gray-50 transition-colors duration-150">
          <div className="flex flex-col h-full">
            <div className="flex items-center mb-4">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mr-3">
                <FiTarget size={20} />
              </div>
              <h3 className="text-lg font-medium text-gray-700">Annual Target</h3>
            </div>
            <div className="flex-grow">
              <div className="mb-3">
                {selectedTeamUserId === "all" && !viewMyLeadsOnly ? (
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(annualTarget)}
                  </p>
                ) : (
                  <TargetWithEdit
                    value={annualTarget}
                    fy={selectedFY}
                    currentUser={currentUser}
                    targetUser={!viewMyLeadsOnly && selectedTeamUserId !== "all" ? targetUser : null}
                    users={users}
                    onUpdate={handleTargetUpdate}
                    viewMyLeadsOnly={viewMyLeadsOnly}
                  />
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Quarter Target:</div>
                  <div className="font-medium text-right">
                    {formatCurrency(displayQuarterTarget.adjustedTarget)}
                  </div>
                  <div className="text-gray-500">Quarter Achieved:</div>
                  <div className="font-medium text-right text-green-600">
                    {formatCurrency(achievedValue)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deficit/Surplus Card */}
        <div className="p-6 hover:bg-gray-50 transition-colors duration-150">
          <div className="flex flex-col h-full">
            <div className="flex items-center mb-4">
              <div className={`p-2 rounded-lg ${
                displayDeficit > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
              } mr-3`}>
                {displayDeficit > 0 ? (
                  <FiAlertTriangle size={20} />
                ) : (
                  <FiCheckCircle size={20} />
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-700">
                {displayDeficit > 0 ? "Deficit" : "Surplus"}
              </h3>
            </div>
            <div className="flex-grow">
              <p className={`text-3xl font-bold mb-3 ${
                displayDeficit > 0 ? "text-red-600" : "text-green-600"
              }`}>
                {formatCurrency(Math.abs(displayDeficit))}
              </p>
              {displayQuarterTarget.adjustedTarget > 0 && (
                <div className={`p-3 rounded-lg ${
                  displayDeficit > 0 
                    ? "bg-red-50 border-red-100" 
                    : "bg-green-50 border-green-100"
                } border`}>
                  <p className={`text-sm text-center ${
                    displayDeficit > 0 ? "text-red-700" : "text-green-700"
                  }`}>
                    {displayDeficit > 0 ? (
                      <span>
                        Need <span className="font-bold">
                          {Math.round((displayDeficit / displayQuarterTarget.adjustedTarget) * 100)}%
                        </span> more to reach target
                      </span>
                    ) : (
                      <span>
                        <span className="font-bold">
                          {Math.round((Math.abs(displayDeficit) / displayQuarterTarget.adjustedTarget) * 100)}%
                        </span> above target
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
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
  handleTargetUpdate: PropTypes.func.isRequired,
};

export default ClosedLeadsStats;
