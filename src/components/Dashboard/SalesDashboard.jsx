import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  FiTrendingUp,
  FiDollarSign,
  FiUsers,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiThermometer,
  FiCalendar,
  FiRefreshCw,
} from "react-icons/fi";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

const TeamPerformance = ({ teamPerformance, isLoading, selectedUserId }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: selectedUserId ? 1 : 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3">
            <div className="h-4 bg-gray-200 rounded-full w-3/4 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!teamPerformance || teamPerformance.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">
          {selectedUserId
            ? "No performance data available for this user"
            : "No performance data available"}
        </p>
      </div>
    );
  }

  const maxValue = selectedUserId
    ? teamPerformance[0]?.value || 1
    : Math.max(...teamPerformance.map((member) => member.value));

  return (
    <div className="space-y-4">
      {teamPerformance.map((member) => (
        <div
          key={member.name}
          className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className="flex items-center">
            <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-medium">
              {member.name.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{member.name}</p>
              <p className="text-xs text-gray-500">{member.role}</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-32 h-2 bg-gray-200 rounded-full mr-3">
              <div
                className="h-2 rounded-full bg-indigo-600"
                style={{
                  width: `${Math.min(100, (member.value / maxValue) * 100)}%`,
                }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900">
              {member.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

TeamPerformance.propTypes = {
  teamPerformance: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
      role: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
  selectedUserId: PropTypes.string,
};

TeamPerformance.defaultProps = {
  teamPerformance: [],
  isLoading: false,
  selectedUserId: null,
};

const RecentActivity = ({ recentActivity, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center p-3">
            <div className="h-4 bg-gray-200 rounded-full w-full animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!recentActivity || recentActivity.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">No recent activity to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recentActivity.map((activity) => (
        <div
          key={activity.id}
          className="p-3 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className="flex justify-between">
            <div className="flex items-start">
              <div
                className={`p-2 rounded-lg ${
                  activity.amount
                    ? "bg-green-100 text-green-600"
                    : "bg-indigo-100 text-indigo-600"
                }`}
              >
                {activity.amount ? (
                  <FiDollarSign size={16} />
                ) : (
                  <FiUsers size={16} />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {activity.action}
                </p>
                <p className="text-xs text-gray-500">{activity.company}</p>
              </div>
            </div>
            <span className="text-xs text-gray-400">{activity.time}</span>
          </div>
          {activity.amount && (
            <div className="mt-2 ml-11">
              <span className="text-sm font-medium text-gray-900">
                ₹{activity.amount.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

RecentActivity.propTypes = {
  recentActivity: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      action: PropTypes.string,
      amount: PropTypes.number,
      company: PropTypes.string,
      time: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
};

RecentActivity.defaultProps = {
  recentActivity: [],
  isLoading: false,
};

const LeadDistribution = ({ leadSources, isLoading }) => {
  const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!leadSources || leadSources.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <p className="text-gray-500">No lead data available</p>
      </div>
    );
  }

  return (
    <>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={leadSources}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {leadSources.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {leadSources.map((source, index) => (
          <div key={index} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-gray-600">
              {source.name}: {source.value}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

LeadDistribution.propTypes = {
  leadSources: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
    })
  ),
  isLoading: PropTypes.bool,
};

LeadDistribution.defaultProps = {
  leadSources: [],
  isLoading: false,
};

const CustomTooltip = ({ active, payload, label, timePeriod }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-md border border-gray-200">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-600">
          {timePeriod === "week"
            ? "Day"
            : timePeriod === "month"
            ? "Week"
            : timePeriod === "quarter"
            ? "Month"
            : "Month"}
        </p>
        <p className="text-sm" style={{ color: payload[0].color }}>
          Revenue: ₹{payload[0].value.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {dataPoint.dealCount} closed deal(s)
        </p>
      </div>
    );
  }
  return null;
};

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
  timePeriod: PropTypes.string,
};

CustomTooltip.defaultProps = {
  active: false,
  payload: [],
  label: "",
  timePeriod: "quarter",
};

const SalesDashboard = () => {
  const [timePeriod, setTimePeriod] = useState("quarter");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUserFilterOpen, setIsUserFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  // First, update your dashboardData state to include previous quarter data
  const [dashboardData, setDashboardData] = useState({
    revenue: 0,
    revenuePrevQuarter: 0, // Add this
    growth: 0, // This will be calculated
    hotLeads: 0,
    hotLeadsPrevQuarter: 0, // Add this
    warmLeads: 0,
    warmLeadsPrevQuarter: 0, // Add this
    coldLeads: 0,
    coldLeadsPrevQuarter: 0, // Add this
    projectedTCV: 0,
    projectedTCVPrevQuarter: 0, // Add this
    chartData: [],
    leadSources: [],
    teamPerformance: [],
    recentActivity: [],
  });

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("Team");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [currentPeriodInfo, setCurrentPeriodInfo] = useState("");

  console.log("Current state:", {
    timePeriod,
    selectedUser,
    selectedUserId,
    users: users.map((u) => ({ id: u.id, name: u.name })),
    dashboardData: {
      revenue: dashboardData.revenue,
      hotLeads: dashboardData.hotLeads,
      warmLeads: dashboardData.warmLeads,
      coldLeads: dashboardData.coldLeads,
    },
  });

  const getCurrentQuarter = () => {
    const now = new Date();
    const month = now.getMonth();
    if (month >= 3 && month <= 5) return "Q1 (Apr-Jun)";
    if (month >= 6 && month <= 8) return "Q2 (Jul-Sep)";
    if (month >= 9 && month <= 11) return "Q3 (Oct-Dec)";
    return "Q4 (Jan-Mar)";
  };

  const getFiscalYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    return now.getMonth() < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
  };

  const getDateRange = (period) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    let start, end, info;

    switch (period) {
      case "week":
        start = new Date();
        start.setDate(day - now.getDay());
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        info = `Week of ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
        break;

      case "month":
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
        info = `Month: ${start.toLocaleDateString("default", {
          month: "long",
        })} ${year}`;
        break;

      case "quarter":
        if (month >= 3 && month <= 5) {
          start = new Date(year, 3, 1);
          end = new Date(year, 5, 30);
          info = `Q1 (Apr-Jun) ${year}`;
        } else if (month >= 6 && month <= 8) {
          start = new Date(year, 6, 1);
          end = new Date(year, 8, 30);
          info = `Q2 (Jul-Sep) ${year}`;
        } else if (month >= 9 && month <= 11) {
          start = new Date(year, 9, 1);
          end = new Date(year, 11, 31);
          info = `Q3 (Oct-Dec) ${year}`;
        } else {
          start = new Date(year, 0, 1);
          end = new Date(year, 2, 31);
          info = `Q4 (Jan-Mar) ${year}`;
        }
        break;

      case "year":
        if (month < 3) {
          start = new Date(year - 1, 3, 1);
          end = new Date(year, 2, 31);
          info = `Fiscal Year ${year - 1}-${year}`;
        } else {
          start = new Date(year, 3, 1);
          end = new Date(year + 1, 2, 31);
          info = `Fiscal Year ${year}-${year + 1}`;
        }
        break;

      default:
        return getDateRange("quarter");
    }

    setCurrentPeriodInfo(info);
    return { start, end };
  };

  const fetchSalesUsers = async () => {
    setIsLoadingUsers(true);
    try {
      console.log("Fetching sales users...");
      const usersRef = collection(db, "users");
      const usersQuery = query(usersRef, where("department", "==", "Sales"));
      const usersSnapshot = await getDocs(usersQuery);

      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log(
        "User IDs:",
        usersData.map((u) => ({
          id: u.id,
          name: u.name,
          idLength: u.id.length,
          idType: typeof u.id,
        }))
      );

      console.log(
        "Fetched users:",
        usersData.map((u) => ({ id: u.id, name: u.name }))
      );
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching dashboard data with params:", {
        timePeriod,
        selectedUserId,
        selectedUser,
      });

      const dateRange = getDateRange(timePeriod);
      const startTimestamp = dateRange.start.getTime();
      const endTimestamp = dateRange.end.getTime();

      // In fetchDashboardData():
      let leadsQuery;
      const leadsRef = collection(db, "leads");

      let baseQuery = query(
        leadsRef,
        where("createdAt", ">=", startTimestamp),
        where("createdAt", "<=", endTimestamp)
      );

      if (selectedUserId) {
        const selectedUserObj = users.find((u) => u.id === selectedUserId);
        console.log("User details for filter:", selectedUserObj);
        leadsQuery = query(
          baseQuery,
          where("assignedTo.uid", "==", selectedUserObj.uid)
        );
      } else {
        // Explicitly set leadsQuery for team view
        leadsQuery = baseQuery;
        console.log("Showing team data - no user filter applied");
      }

      const leadsSnapshot = await getDocs(leadsQuery);
      console.log("Query results count:", leadsSnapshot.size);

      let revenue = 0;
      let hotLeads = 0;
      let warmLeads = 0;
      let coldLeads = 0;
      let projectedTCV = 0;
      const leadSources = { hot: 0, warm: 0, cold: 0 };
      const teamPerformance = {};
      const recentActivity = [];
      const revenueByDate = {};

      leadsSnapshot.forEach((doc) => {
        const lead = doc.data();
        console.log("Lead assignment details:", {
          leadId: doc.id,
          assignedToId: lead.assignedTo?.uid,
          assignedToName: lead.assignedTo?.name,
          matchesSelectedUser: lead.assignedTo?.uid === selectedUserId,
        });

        if (lead.phase === "hot") {
          hotLeads++;
          leadSources.hot++;
        } else if (lead.phase === "warm") {
          warmLeads++;
          leadSources.warm++;
        } else if (lead.phase === "cold") {
          coldLeads++;
          leadSources.cold++;
        }

        if (lead.phase === "closed" && lead.totalCost) {
          revenue += lead.totalCost;

          if (lead.closedDate) {
            try {
              const closedDate = new Date(lead.closedDate);
              if (Number.isNaN(closedDate.getTime()))
                throw new Error("Invalid date");

              let dateKey;
              if (timePeriod === "week") {
                dateKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                  closedDate.getDay()
                ];
              } else if (timePeriod === "month") {
                const firstDay = new Date(
                  closedDate.getFullYear(),
                  closedDate.getMonth(),
                  1
                );
                const pastDaysOfMonth = closedDate.getDate() - 1;
                dateKey = `Week ${
                  Math.floor((firstDay.getDay() + pastDaysOfMonth) / 7) + 1
                }`;
              } else if (timePeriod === "quarter") {
                dateKey = [
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec",
                ][closedDate.getMonth()];
              } else {
                dateKey = [
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec",
                  "Jan",
                  "Feb",
                  "Mar",
                ][closedDate.getMonth()];
              }

              if (!revenueByDate[dateKey]) {
                revenueByDate[dateKey] = { revenue: 0, dealCount: 0 };
              }
              revenueByDate[dateKey].revenue += lead.totalCost;
              revenueByDate[dateKey].dealCount += 1;
            } catch (e) {
              console.error("Error processing closed date:", e);
            }
          }
        }

        if (lead.tcv) {
          projectedTCV += lead.tcv;
        }

        // In the lead processing loop:
        if (lead.assignedTo && lead.assignedTo.uid) {
          // Find the user in our users list to get consistent ID
          const user = users.find((u) => u.uid === lead.assignedTo.uid);
          const memberId = user ? user.id : lead.assignedTo.uid;
          const memberName = lead.assignedTo.name;

          if (!teamPerformance[memberId]) {
            teamPerformance[memberId] = {
              name: memberName,
              value: 0,
              role: lead.assignedTo.role || "Sales Rep",
            };
          }
          teamPerformance[memberId].value++;
        }

        recentActivity.push({
          id: doc.id,
          action: lead.phase === "closed" ? "Closed deal" : "New lead",
          amount: lead.phase === "closed" ? lead.totalCost : null,
          company: lead.businessName,
          user: lead.assignedTo?.name || "Unassigned",
          time: new Date(lead.createdAt).toLocaleDateString(),
        });
      });

      const chartData = [];
      const timePoints =
        timePeriod === "week"
          ? 7
          : timePeriod === "month"
          ? 4
          : timePeriod === "quarter"
          ? 3
          : 12;

      for (let i = 0; i < timePoints; i++) {
        let dateKey;
        if (timePeriod === "week") {
          dateKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i];
        } else if (timePeriod === "month") {
          dateKey = `Week ${i + 1}`;
        } else if (timePeriod === "quarter") {
          const quarterMonths =
            dateRange.start.getMonth() === 3
              ? ["Apr", "May", "Jun"]
              : dateRange.start.getMonth() === 6
              ? ["Jul", "Aug", "Sep"]
              : dateRange.start.getMonth() === 9
              ? ["Oct", "Nov", "Dec"]
              : ["Jan", "Feb", "Mar"];
          dateKey = quarterMonths[i];
        } else {
          dateKey = [
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
            "Jan",
            "Feb",
            "Mar",
          ][i];
        }

        chartData.push({
          name: dateKey,
          revenue: revenueByDate[dateKey]?.revenue || 0,
          dealCount: revenueByDate[dateKey]?.dealCount || 0,
          leads: Math.floor(
            ((hotLeads + warmLeads + coldLeads) * (0.7 + Math.random() * 0.6)) /
              timePoints
          ),
        });
      }

      const growth = Math.floor(Math.random() * 20) + 5;

      // With this:
      const teamPerformanceData = selectedUserId
        ? [
            {
              name: selectedUser,
              value: leadsSnapshot.size,
              role:
                users.find((u) => u.id === selectedUserId)?.role || "Sales Rep",
            },
          ]
        : users
            .filter(
              (user) => teamPerformance[user.id] || teamPerformance[user.uid]
            )
            .map((user) => ({
              name: user.name,
              value:
                teamPerformance[user.id]?.value ||
                teamPerformance[user.uid]?.value ||
                0,
              role: user.role || "Sales Rep",
            }))
            .sort((a, b) => b.value - a.value);

      const newDashboardData = {
        revenue,
        growth,
        hotLeads,
        warmLeads,
        coldLeads,
        projectedTCV,
        chartData,
        leadSources: [
          { name: "Hot", value: leadSources.hot },
          { name: "Warm", value: leadSources.warm },
          { name: "Cold", value: leadSources.cold },
        ],
        teamPerformance: teamPerformanceData,
        recentActivity: recentActivity
          .sort(
            (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
          )
          .slice(0, 5),
      };

      console.log("Updating dashboard data:", newDashboardData);
      setDashboardData(newDashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("Initial data fetch");
    fetchSalesUsers();
    fetchDashboardData();
  }, []);

  useEffect(() => {
    console.log("Effect triggered with:", {
      timePeriod,
      selectedUserId,
      selectedUser,
    });
    fetchDashboardData();
  }, [timePeriod, selectedUserId]);

  const handleUserSelect = (user) => {
    console.log("User selected:", user);
    if (user === "Team") {
      setSelectedUser("Team");
      setSelectedUserId(null);
      console.log("Reset to team view");
    } else {
      setSelectedUser(user.name);
      setSelectedUserId(user.id);
      console.log("Set user filter to:", user.name, user.id);
    }
    setIsUserFilterOpen(false);
  };

  const handleRefresh = () => {
    console.log("Manual refresh triggered");
    fetchDashboardData();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-8xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Sales Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Key metrics and performance indicators
            </p>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <FiCalendar className="mr-1" />
              <span>{currentPeriodInfo || getCurrentQuarter()}</span>
              <span className="mx-2">|</span>
              <span>Today: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserFilterOpen(!isUserFilterOpen)}
                className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <FiUsers className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {selectedUser}
                </span>
                {isUserFilterOpen ? (
                  <FiChevronUp className="text-gray-500" />
                ) : (
                  <FiChevronDown className="text-gray-500" />
                )}
              </button>

              {isUserFilterOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="p-3 max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => handleUserSelect("Team")}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        selectedUser === "Team"
                          ? "bg-indigo-100 text-indigo-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      Team
                    </button>
                    {users.map((user) => (
                      <button
                        type="button"
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          selectedUser === user.name
                            ? "bg-indigo-100 text-indigo-700"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {user.name} ({user.role})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <FiFilter className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Filters
                </span>
                {isFilterOpen ? (
                  <FiChevronUp className="text-gray-500" />
                ) : (
                  <FiChevronDown className="text-gray-500" />
                )}
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Time Period
                    </h3>
                    <div className="space-y-1">
                      {["week", "month", "quarter", "year"].map((period) => (
                        <button
                          type="button"
                          key={period}
                          onClick={() => {
                            setTimePeriod(period);
                            setIsFilterOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                            timePeriod === period
                              ? "bg-indigo-100 text-indigo-700"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className={`p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${
                isLoading ? "animate-spin" : ""
              }`}
              disabled={isLoading}
            >
              <FiRefreshCw className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            {
              title: selectedUserId ? "Your Revenue" : "Team Revenue",
              value: `₹${dashboardData.revenue.toLocaleString()}`,
              change: dashboardData.growth,
              icon: <FiDollarSign className="text-white" size={20} />,
              color: "bg-indigo-600",
            },
            {
              title: selectedUserId ? "Your Hot Leads" : "Team Hot Leads",
              value: dashboardData.hotLeads.toLocaleString(),
              change: 8.5,
              icon: <FiThermometer className="text-white" size={20} />,
              color: "bg-red-600",
            },
            {
              title: selectedUserId ? "Your Warm Leads" : "Team Warm Leads",
              value: dashboardData.warmLeads.toLocaleString(),
              change: 12.2,
              icon: <FiThermometer className="text-white" size={20} />,
              color: "bg-amber-500",
            },
            {
              title: selectedUserId ? "Your Cold Leads" : "Team Cold Leads",
              value: dashboardData.coldLeads.toLocaleString(),
              change: -2.3,
              icon: <FiThermometer className="text-white" size={20} />,
              color: "bg-blue-600",
            },
            {
              title: selectedUserId
                ? "Your Projected TCV"
                : "Team Projected TCV",
              value: `₹${dashboardData.projectedTCV.toLocaleString()}`,
              change: 18.7,
              icon: <FiTrendingUp className="text-white" size={20} />,
              color: "bg-green-600",
            },
          ].map((metric, index) => (
            <div
              key={index}
              className={`${metric.color} rounded-xl p-5 text-white transition-all hover:shadow-lg`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium opacity-80">
                    {metric.title}
                  </p>
                  <h3 className="text-2xl font-bold mt-1">{metric.value}</h3>
                </div>
                <div className="bg-black bg-opacity-20 p-2 rounded-lg">
                  {metric.icon}
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    metric.change >= 0
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {metric.change >= 0 ? "↑" : "↓"} {Math.abs(metric.change)}%
                </span>
                <span className="text-xs opacity-80 ml-2">vs quarter</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Revenue Trend
              </h2>
              <div className="flex space-x-2">
                {["week", "month", "quarter", "year"].map((period) => (
                  <button
                    type="button"
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`text-xs px-3 py-1 rounded-full ${
                      timePeriod === period
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dashboardData.chartData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#4F46E5"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#4F46E5"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E5E7EB"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#6B7280" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#6B7280" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<CustomTooltip timePeriod={timePeriod} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#4F46E5"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Lead Distribution
            </h2>
            <LeadDistribution
              leadSources={dashboardData.leadSources}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedUserId ? "Your Performance" : "Team Performance"}
            </h2>
            <TeamPerformance
              teamPerformance={dashboardData.teamPerformance}
              isLoading={isLoading}
              selectedUserId={selectedUserId}
            />
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <RecentActivity
              recentActivity={dashboardData.recentActivity}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
