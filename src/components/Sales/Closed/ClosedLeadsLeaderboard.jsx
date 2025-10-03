import React from "react";
import PropTypes from "prop-types";
import TargetWithEdit from "./TargetWithEdit";

const ClosedLeadsLeaderboard = ({ onBack, enrichedLeads, users, formatCurrency, targets, selectedFY, currentUser, onTargetUpdate }) => {
  // Get all closed leads from enriched data
  const allClosedLeads = Object.entries(enrichedLeads).filter(([, lead]) => lead.closureType);

  // Calculate leaderboard data from all closed leads
  const leaderboardData = allClosedLeads.reduce((acc, [, lead]) => {
    const userId = lead.assignedTo?.uid;
    if (!userId) return acc;

    const user = users[userId];
    if (!user) {
      // Try to find user by name if UID doesn't match
      const assignedName = lead.assignedTo?.name;
      const userByName = Object.values(users).find(u =>
        u.name === assignedName ||
        u.name === 'direc 2' ||
        u.name === 'Direc2' ||
        u.name?.toLowerCase() === assignedName?.toLowerCase()
      );

      if (userByName) {
        const name = userByName.name || "Unknown";
        // Use totalCost from enriched data
        const totalCost = lead.totalCost || 0;

        if (!acc[name]) {
          acc[name] = { name, total: 0, count: 0 };
        }
        acc[name].total += totalCost;
        acc[name].count += 1;
        
        // Find annual target for this user (sum of all quarters)
        const userAnnualTarget = ["Q1", "Q2", "Q3", "Q4"].reduce((total, q) => {
          const t = targets.find(
            (t) =>
              t.financial_year === selectedFY &&
              t.quarter === q &&
              t.assignedTo === userByName.uid
          );
          return total + (t ? t.target_amount : 0);
        }, 0);
        acc[name].target = userAnnualTarget;
        
        return acc;
      }
      return acc;
    }

    const name = user.name || "Unknown";
    // Use totalCost from enriched data
    const totalCost = lead.totalCost || 0;

    if (!acc[name]) {
      acc[name] = { name, total: 0, count: 0 };
    }
    acc[name].total += totalCost;
    acc[name].count += 1;

    // Find annual target for this user (sum of all quarters)
    const userAnnualTarget = ["Q1", "Q2", "Q3", "Q4"].reduce((total, q) => {
      const t = targets.find(
        (t) =>
          t.financial_year === selectedFY &&
          t.quarter === q &&
          t.assignedTo === user.uid
      );
      return total + (t ? t.target_amount : 0);
    }, 0);
    acc[name].target = userAnnualTarget;

    return acc;
  }, {});

  const sortedLeaderboard = Object.values(leaderboardData).sort((a, b) => b.total - a.total);

  // Use only real data (filter out performers with zero total)
  const displayLeaderboard = sortedLeaderboard.filter(item => item.total > 0).sort((a, b) => b.total - a.total);

  // Calculate total deals from all performers
  const totalDeals = displayLeaderboard.reduce((sum, item) => sum + item.count, 0);

  // Calculate total target from all performers
  const totalTarget = displayLeaderboard.reduce((sum, item) => sum + item.target, 0);

  // Calculate total achieved from all performers
  const totalAchieved = displayLeaderboard.reduce((sum, item) => sum + item.total, 0);

  // Show loading if no data yet
  if (allClosedLeads.length > 0 && sortedLeaderboard.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10">
        <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:underline text-sm font-medium transition-all duration-200 focus:outline-none"
            aria-label="Go back to closed leads"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Closed Leads</span>
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Performance Leaderboard</h1>
            <p className="text-sm text-gray-600">Track top performers and deal values across your sales team</p>
          </div>

          <div className="text-center">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Deals</div>
            <div className="text-xl font-bold text-gray-900">{totalDeals}</div>
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-md mt-1">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-amber-700">Demo Data Included</span>
            </div>
          </div>
        </div>          {/* Loading State */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-6">
                <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Calculating Rankings</h3>
              <p className="text-gray-600">Processing performance data...</p>
              <div className="mt-6 flex justify-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:underline text-sm font-medium transition-all duration-200 focus:outline-none"
            aria-label="Go back to closed leads"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Closed Leads</span>
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Performance Leaderboard</h1>
            <p className="text-sm text-gray-600">Track top performers and deal values across your sales team</p>
          </div>

          {/* All Metrics in One Row */}
          <div className="flex items-center gap-3">
            {/* Total Deals Card - Content-sized */}
            <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-lg p-3 border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-200 w-auto">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-gray-500 rounded-md">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Deals</div>
                  <div className="text-lg font-bold text-gray-900">{totalDeals}</div>
                </div>
              </div>
            </div>

            {/* Total Target Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-3 border border-blue-200/60 shadow-sm hover:shadow-md transition-all duration-200 flex-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500 rounded-md">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider whitespace-nowrap">Total Target</div>
                  <div className="text-sm font-bold text-blue-900">{formatCurrency(totalTarget)}</div>
                </div>
              </div>
            </div>

            {/* Total Achieved Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-3 border border-green-200/60 shadow-sm hover:shadow-md transition-all duration-200 flex-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-500 rounded-md">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-green-600 uppercase tracking-wider whitespace-nowrap">Total Achieved</div>
                  <div className="text-sm font-bold text-green-900">{formatCurrency(totalAchieved)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>        {/* Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Rankings</h2>
              <div className="text-sm text-gray-500">{displayLeaderboard.length} performers</div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {displayLeaderboard.map((item, index) => (
              <div
                key={item.name}
                className="group p-4 hover:bg-gray-50/50 transition-all duration-200 focus-within:bg-gray-50/50"
                role="row"
                tabIndex={0}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Rank Badge */}
                    <div className={`relative flex items-center justify-center w-8 h-8 font-semibold text-sm rounded-md border-2 ${
                      index === 0
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : index === 1
                        ? 'bg-green-50 text-green-700 border-green-300'
                        : index === 2
                        ? 'bg-orange-50 text-orange-700 border-orange-300'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {index + 1}
                      {index === 0 && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-yellow-500">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 16L3 5l5.5 4L12 3l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-white">
                            {item.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md">
                              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-xs font-medium text-blue-700">{item.count} deal{item.count !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <span>Target: {formatCurrency(item.target)}</span>
                              {(() => {
                                // Find the user object for this performer
                                const performerUser = Object.values(users).find(u => u.name === item.name);
                                // Only show edit button for Admin department users, always visible in leaderboard
                                const currentUserObj = Object.values(users).find(u => u.uid === currentUser?.uid);
                                const isAdminDepartment = currentUserObj?.department === "Admin";
                                
                                if (performerUser && isAdminDepartment) {
                                  return (
                                    <TargetWithEdit
                                      value={item.target}
                                      fy={selectedFY}
                                      currentUser={currentUser}
                                      targetUser={performerUser}
                                      users={users}
                                      onUpdate={onTargetUpdate}
                                      viewMyLeadsOnly={false} // Always allow editing in leaderboard
                                    />
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deal Value */}
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors duration-200">
                      {formatCurrency(item.total)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Total Value</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {displayLeaderboard.length === 0 && (
            <div className="text-center py-8 px-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No Performance Data</h3>
              <p className="text-gray-600 text-sm max-w-md mx-auto">Closed deals will appear here once they're processed.</p>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 mt-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                View Closed Leads
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ClosedLeadsLeaderboard.propTypes = {
  onBack: PropTypes.func.isRequired,
  enrichedLeads: PropTypes.object.isRequired,
  users: PropTypes.object.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  targets: PropTypes.array.isRequired,
  selectedFY: PropTypes.string.isRequired,
  currentUser: PropTypes.object.isRequired,
  onTargetUpdate: PropTypes.func.isRequired,
};

export default ClosedLeadsLeaderboard;
