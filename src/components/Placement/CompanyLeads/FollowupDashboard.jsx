import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const FollowupDashboard = ({
  allLeads = [],
  allUsers = {},
  user,
  showDashboard,
  onClose,
  onRefresh
}) => {
  const [allFollowUps, setAllFollowUps] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Show 50 follow-ups per page
  const [totalFollowUps, setTotalFollowUps] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState(() => {
    if (user && ['Manager', 'Assistant Manager', 'Executive'].includes(user.role)) {
      const userName = user.displayName || user.name;
      return {
        status: [],
        assignedTo: [userName],
        dateRange: 'all'
      };
    } else {
      return {
        status: [],
        assignedTo: [],
        dateRange: 'all'
      };
    }
  });
  const [filterDropdowns, setFilterDropdowns] = useState({
    status: false,
    assignedTo: false,
    dateRange: false
  });
  const [chartsVisible, setChartsVisible] = useState(true);

  // Fetch follow-ups for current page
  const fetchFollowUpsForPage = useCallback(async (page = 1) => {
    if (!user) return;

    try {
      setIsLoading(true);
      const allFollowUpsData = [];

      // Get all leads (no filtering by user assignment for dashboard)
      allLeads.forEach(lead => {
        const followups = lead.followups || [];
        followups.forEach(followup => {
          allFollowUpsData.push({
            id: `${lead.id}_${followup.key}`,
            company: lead.companyName || lead.name || 'Unknown Company',
            contactPerson: lead.pocName || 'N/A',
            contactPhone: lead.pocPhone || 'N/A',
            time: followup.time,
            date: followup.date,
            remarks: followup.remarks,
            assignedTo: lead.assignedTo,
            leadId: lead.id,
            followupKey: followup.key,
            status: lead.status,
            createdAt: followup.createdAt,
            assignedUserName: lead.assignedTo ?
              Object.values(allUsers).find(u => (u.uid || u.id) === lead.assignedTo)?.displayName ||
              Object.values(allUsers).find(u => (u.uid || u.id) === lead.assignedTo)?.name ||
              'Unknown User' : 'Unassigned'
          });
        });
      });

      // Filter by role
      let filteredFollowUpsData = allFollowUpsData;
      if (['Manager', 'Assistant Manager', 'Executive'].includes(user?.role)) {
        const userName = user.displayName || user.name;
        filteredFollowUpsData = allFollowUpsData.filter(f => f.assignedUserName === userName);
      }
      // Directors and Heads see all follow-ups

      // Sort by created date descending (most recent first)
      filteredFollowUpsData.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      // Set total count
      setTotalFollowUps(filteredFollowUpsData.length);

      // Get current page data
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pageData = filteredFollowUpsData.slice(startIndex, endIndex);

      setAllFollowUps(pageData);
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
    } finally {
      setIsLoading(false);
    }
  }, [allLeads, user, allUsers, itemsPerPage]);

  // Fetch follow-ups when dashboard is shown and data changes
  useEffect(() => {
    if (showDashboard && allLeads.length > 0) {
      setCurrentPage(1); // Reset to first page when dashboard opens
      fetchFollowUpsForPage(1);
    }
  }, [showDashboard, allLeads, allUsers, fetchFollowUpsForPage]);

  // Get unique values for filters
  const uniqueStatuses = [...new Set(allFollowUps.map(f => f.status).filter(Boolean))].sort();
  const uniqueAssignedUsers = (() => {
    if (['Manager', 'Assistant Manager', 'Executive'].includes(user?.role)) {
      return [user.displayName || user.name].filter(Boolean);
    } else {
      // For Directors and Heads, show all users from Placement department
      return Object.values(allUsers)
        .filter(u => Array.isArray(u.departments) ? u.departments.includes('Placement') : u.department === 'Placement')
        .map(u => u.displayName || u.name)
        .filter(Boolean)
        .sort();
    }
  })();

  // Filter follow-ups
  const filteredFollowUps = allFollowUps.filter(followup => {
    const statusMatch = filters.status.length === 0 || filters.status.includes(followup.status);
    const assignedMatch = filters.assignedTo.length === 0 || filters.assignedTo.includes(followup.assignedUserName);
    const dateMatch = (() => {
      if (filters.dateRange === 'all') return true;
      const followupDate = new Date(followup.createdAt);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      switch (filters.dateRange) {
        case 'today': {
          return followupDate >= today;
        }
        case 'yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          return followupDate >= yesterday && followupDate < today;
        }
        case 'week': {
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          return followupDate >= weekAgo;
        }
        case 'month': {
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          return followupDate >= monthAgo;
        }
        case 'year': {
          const yearAgo = new Date(today);
          yearAgo.setFullYear(today.getFullYear() - 1);
          return followupDate >= yearAgo;
        }
        default:
          return true;
      }
    })();
    return statusMatch && assignedMatch && dateMatch;
  });

  // Calculate KPIs
  const today = new Date().toDateString();
  const todayFollowUpsCount = filteredFollowUps.filter(f => f.createdAt && new Date(f.createdAt).toDateString() === today).length;
  const hotLeads = filteredFollowUps.filter(f => f.status === 'hot').length;
  const warmLeads = filteredFollowUps.filter(f => f.status === 'warm').length;
  const calledLeads = filteredFollowUps.filter(f => f.status === 'called').length;
  const coldLeads = filteredFollowUps.filter(f => f.status === 'cold').length;

  // Calculate upcoming follow-ups in next 3 hours
  const now = new Date();
  const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const upcomingFollowUps = filteredFollowUps.filter(f => {
    if (!f.date || !f.time) return false;
    try {
      const followupDateTime = new Date(`${f.date} ${f.time}`);
      return followupDateTime >= now && followupDateTime <= threeHoursFromNow;
    } catch {
      return false;
    }
  }).length;

  // Determine label based on user role
  const upcomingLabel = ['Manager', 'Assistant Manager', 'Executive'].includes(user?.role) 
    ? 'Upcoming Follow-ups (3hrs)' 
    : 'Upcoming Team Follow-ups (3hrs)';
  const todaysLabel = ['Manager', 'Assistant Manager', 'Executive'].includes(user?.role) 
    ? "Today's Follow-ups" 
    : "Team's Today's Follow-ups";

  // Bar chart: follow-ups per day for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toDateString();
  }).reverse();
  const barData = last7Days.map(dateStr => {
    const count = filteredFollowUps.filter(f => f.createdAt && new Date(f.createdAt).toDateString() === dateStr).length;
    return { date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count };
  });

  // Bar chart: follow-ups by user
  const userCounts = filteredFollowUps.reduce((acc, f) => {
    acc[f.assignedUserName || 'Unassigned'] = (acc[f.assignedUserName || 'Unassigned'] || 0) + 1;
    return acc;
  }, {});
  const userBarData = Object.entries(userCounts).map(([user, count]) => ({ user: user.length > 10 ? user.substring(0,10) + '...' : user, count }));

  // Helper function to get date range display text
  const getDateRangeDisplay = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filters.dateRange) {
      case 'today': {
        const todayStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `${todayStr} to ${todayStr}`;
      }
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `${yesterdayStr} to ${yesterdayStr}`;
      }
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        const weekStartStr = weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const weekEndStr = weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `${weekStartStr} to ${weekEndStr}`;
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const monthStartStr = monthStart.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const monthEndStr = monthEnd.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `${monthStartStr} to ${monthEndStr}`;
      }
      case 'year': {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        const yearStartStr = yearStart.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const yearEndStr = yearEnd.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `${yearStartStr} to ${yearEndStr}`;
      }
      default:
        return 'All';
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    if (filterType === 'status' || filterType === 'assignedTo') {
      if (value === 'all') {
        setFilters(prev => ({
          ...prev,
          [filterType]: []
        }));
      } else {
        setFilters(prev => ({
          ...prev,
          [filterType]: prev[filterType].includes(value)
            ? prev[filterType].filter(item => item !== value)
            : [...prev[filterType], value]
        }));
      }
    } else {
      setFilters(prev => ({
        ...prev,
        [filterType]: value
      }));
    }
    // Refetch current page data when filters change
    fetchFollowUpsForPage(currentPage);
  };

  // Toggle filter dropdowns
  const toggleFilterDropdown = (filterType) => {
    setFilterDropdowns(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  if (!showDashboard) return null;

  return (
    <div className="fixed inset-0 mt-18 bg-white z-50 overflow-auto">
      <div className="px-2 py-2 ">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-blue-900">Recent Follow-ups Dashboard</h3>
          <div className="flex items-center space-x-2">
            {/* Status Filter */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); toggleFilterDropdown('status'); }}
                className="flex items-center px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-900 text-xs font-medium transition-colors"
              >
                <span>Status: {filters.status.length === 0 ? 'All' : filters.status.length === 1 ? filters.status[0] : `${filters.status.length} selected`}</span>
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {filterDropdowns.status && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-blue-200 z-20">
                  <div className="p-1">
                    <div 
                      className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); handleFilterChange('status', 'all'); }}
                    >
                      <input
                        type="checkbox"
                        checked={filters.status.length === 0}
                        onChange={() => {}} // Handled by parent onClick
                        className="mr-2 h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      All
                    </div>
                    {uniqueStatuses.map(status => (
                      <div 
                        key={status} 
                        className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); handleFilterChange('status', status); }}
                      >
                        <input
                          type="checkbox"
                          checked={filters.status.includes(status)}
                          onChange={() => {}} // Handled by parent onClick
                          className="mr-2 h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        {status}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Assigned To Filter */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); toggleFilterDropdown('assignedTo'); }}
                className="flex items-center px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-900 text-xs font-medium transition-colors"
              >
                <span>Assigned: {filters.assignedTo.length === 0 ? 'All' : filters.assignedTo.length === 1 ? filters.assignedTo[0] : `${filters.assignedTo.length} selected`}</span>
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {filterDropdowns.assignedTo && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-blue-200 z-20">
                  <div className="p-1">
                    {!['Manager', 'Assistant Manager', 'Executive'].includes(user?.role) && (
                    <div 
                      className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); handleFilterChange('assignedTo', 'all'); }}
                    >
                      <input
                        type="checkbox"
                        checked={filters.assignedTo.length === 0}
                        onChange={() => {}} // Handled by parent onClick
                        className="mr-2 h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      All
                    </div>
                    )}
                    {uniqueAssignedUsers.map(user => (
                      <div 
                        key={user} 
                        className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); handleFilterChange('assignedTo', user); }}
                        title={user}
                      >
                        <input
                          type="checkbox"
                          checked={filters.assignedTo.includes(user)}
                          onChange={() => {}} // Handled by parent onClick
                          className="mr-2 h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="truncate">{user.length > 15 ? `${user.substring(0, 15)}...` : user}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Date Range Filter */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); toggleFilterDropdown('dateRange'); }}
                className="flex items-center px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-900 text-xs font-medium transition-colors"
              >
                <span className={`${filters.dateRange === 'all' ? 'text-blue-900' : 'text-blue-700'} text-xs`}>Created: {getDateRangeDisplay()}</span>
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {filterDropdowns.dateRange && (
                <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-lg shadow-lg border border-blue-200 z-20">
                  <div className="p-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFilterChange('dateRange', 'all'); toggleFilterDropdown('dateRange'); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded"
                    >
                      All
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFilterChange('dateRange', 'today'); toggleFilterDropdown('dateRange'); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded"
                    >
                      Today
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFilterChange('dateRange', 'yesterday'); toggleFilterDropdown('dateRange'); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded"
                    >
                      Yesterday
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFilterChange('dateRange', 'week'); toggleFilterDropdown('dateRange'); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded"
                    >
                      This Week
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFilterChange('dateRange', 'month'); toggleFilterDropdown('dateRange'); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded"
                    >
                      This Month
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFilterChange('dateRange', 'year'); toggleFilterDropdown('dateRange'); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded"
                    >
                      This Year
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div
              onClick={() => {
                if (onRefresh) {
                  onRefresh();
                } else {
                  setCurrentPage(1);
                  fetchFollowUpsForPage(1);
                }
              }}
              className="bg-blue-600 text-white hover:bg-blue-700 transition-colors p-1 rounded flex items-center cursor-pointer text-xs mr-2"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </div>

            <div
              onClick={onClose}
              className="bg-blue-800 text-white hover:bg-blue-900 transition-colors px-2 py-1 rounded flex items-center cursor-pointer text-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
              </svg>
              Back
            </div>
          </div>
        </div>
      </div>
      <div className="p-4">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="text-sm font-medium text-blue-700">{upcomingLabel}</h4>
            <p className="text-2xl font-bold text-blue-900">{upcomingFollowUps}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="text-sm font-medium text-blue-700">{todaysLabel}</h4>
            <p className="text-2xl font-bold text-blue-900">{todayFollowUpsCount}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="text-sm font-medium text-blue-700">Hot Follow-ups</h4>
            <p className="text-2xl font-bold text-blue-900">{hotLeads}</p>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800">Warm Follow-ups</h4>
            <p className="text-2xl font-bold text-blue-900">{warmLeads}</p>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800">Called Follow-ups</h4>
            <p className="text-2xl font-bold text-blue-900">{calledLeads}</p>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800">Cold Follow-ups</h4>
            <p className="text-2xl font-bold text-blue-900">{coldLeads}</p>
          </div>
        </div>

        {/* Charts */}
        {!['Manager', 'Assistant Manager', 'Executive'].includes(user?.role) && (
          chartsVisible ? (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-blue-800">Charts</h3>
                <button
                  onClick={() => setChartsVisible(false)}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Hide Charts
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-xl border border-blue-200">
                  <h3 className="text-lg font-semibold mb-3 text-blue-800">Follow-ups Over Last 7 Days</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                      <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8B6FFF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-200">
                  <h3 className="text-lg font-semibold mb-3 text-blue-800">Follow-ups by User</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={userBarData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                      <XAxis dataKey="user" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8B6FFF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex items-center justify-between py-2 px-4 bg-blue-100 rounded border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800">Charts</h3>
              <button
                onClick={() => setChartsVisible(true)}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                Show Charts
              </button>
            </div>
          )
        )}

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-8">
            <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-gray-500">Loading follow-ups...</p>
          </div>
        ) : allFollowUps.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">No follow-ups found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Company</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Contact</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Date & Time</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Remarks</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Action Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Assigned To</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFollowUps.map((followup) => (
                  <tr key={followup.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                      {followup.company}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      <div>
                        <div className="font-medium">{followup.contactPerson}</div>
                        {followup.contactPhone && followup.contactPhone !== 'N/A' && (
                          <div className="text-xs text-gray-400">{followup.contactPhone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      <div>
                        <div>{followup.createdAt ? new Date(followup.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : 'N/A'}</div>
                        <div className="text-xs text-gray-400">{followup.createdAt ? new Date(followup.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : ''}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={followup.remarks}>
                        {followup.remarks || 'No remarks'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      <div>
                        <div>{new Date(followup.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}</div>
                        <div className="text-xs text-gray-400">{followup.time}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        followup.status === 'hot' ? 'bg-blue-800 text-white' :
                        followup.status === 'warm' ? 'bg-blue-600 text-white' :
                        followup.status === 'cold' ? 'bg-blue-400 text-blue-900' :
                        followup.status === 'called' ? 'bg-blue-200 text-blue-800' :
                        followup.status === 'onboarded' ? 'bg-blue-700 text-white' :
                        followup.status === 'deleted' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {followup.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {followup.assignedUserName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
              <div className="flex justify-between flex-1 sm:hidden">
                {totalFollowUps > itemsPerPage && (
                  <>
                    <button
                      onClick={() => {
                        const newPage = Math.max(1, currentPage - 1);
                        setCurrentPage(newPage);
                        fetchFollowUpsForPage(newPage);
                      }}
                      disabled={currentPage === 1 || isLoading}
                      className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => {
                        const totalPages = Math.ceil(totalFollowUps / itemsPerPage);
                        const newPage = Math.min(totalPages, currentPage + 1);
                        setCurrentPage(newPage);
                        fetchFollowUpsForPage(newPage);
                      }}
                      disabled={currentPage === Math.ceil(totalFollowUps / itemsPerPage) || isLoading}
                      className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </>
                )}
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalFollowUps)}</span> of{' '}
                    <span className="font-medium">{totalFollowUps}</span> follow-ups
                  </p>
                </div>
                {totalFollowUps > itemsPerPage && (
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => {
                          const newPage = Math.max(1, currentPage - 1);
                          setCurrentPage(newPage);
                          fetchFollowUpsForPage(newPage);
                        }}
                        disabled={currentPage === 1 || isLoading}
                        className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          const totalPages = Math.ceil(totalFollowUps / itemsPerPage);
                          const newPage = Math.min(totalPages, currentPage + 1);
                          setCurrentPage(newPage);
                          fetchFollowUpsForPage(newPage);
                        }}
                        disabled={currentPage === Math.ceil(totalFollowUps / itemsPerPage) || isLoading}
                        className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowupDashboard;
