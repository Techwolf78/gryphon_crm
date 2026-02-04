import React, { useState, useEffect, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import {
  FaHandshake,
  FaBuilding,
  FaUserGraduate,
  FaRupeeSign,
  FaChartLine,
  FaUsers,
  FaBriefcase,
  FaCalendarAlt,
} from "react-icons/fa";
import {
  FiUsers,
  FiTrendingUp,
  FiTarget,
  FiDollarSign,
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
} from "react-icons/fi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { INDUSTRY_OPTIONS } from "../../utils/constants";

const formatCurrency = (amount) => {
  const numAmount = Number(amount);
  if (numAmount > 10000000) {
    return `₹${(numAmount / 10000000).toFixed(1)}Cr`;
  } else if (numAmount > 100000) {
    return `₹${(numAmount / 100000).toFixed(1)}L`;
  } else {
    return `₹${numAmount.toLocaleString("en-IN")}`;
  }
};

const getTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  return `${Math.floor(diffInSeconds / 2592000)} months ago`;
};

const CustomTooltip = ({ active, payload, label, timePeriod }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const value = data.value;
    const name = data.name || label;

    let formattedValue;
    if (typeof value === "number") {
      if (data.dataKey === "salary" || data.dataKey === "avgSalary") {
        formattedValue = formatCurrency(value);
      } else {
        formattedValue = value.toLocaleString();
      }
    } else {
      formattedValue = value;
    }

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">{name}</p>
        <p className="text-sm text-gray-600">
          {timePeriod === "quarter"
            ? (() => {
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const monthIndex = monthNames.indexOf(label);
                if (monthIndex !== -1) {
                  const quarter = Math.floor(monthIndex / 3) + 1;
                  const year = new Date().getFullYear();
                  return `Q${quarter} ${year}`;
                }
                return label;
              })()
            : timePeriod === "month"
            ? new Date(label).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })
            : label}
          : <span className="font-semibold text-indigo-600">{formattedValue}</span>
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

const PlacementOfficerPerformance = ({
  officerPerformance,
  isLoading,
  selectedUserId,
  onMemberClick,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="ml-3">
                <div className="w-20 h-4 bg-gray-200 rounded"></div>
                <div className="w-16 h-3 bg-gray-200 rounded mt-1"></div>
              </div>
              <div className="w-32 h-2 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!officerPerformance || officerPerformance.length === 0) {
    return (
      <div className="text-center py-8">
        <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No placement officers found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          No placement activity data available for the selected period.
        </p>
      </div>
    );
  }

  const maxValue = selectedUserId
    ? officerPerformance[0]?.value || 1
    : Math.max(...officerPerformance.map((officer) => officer.value));

  return (
    <div className="space-y-4">
      {officerPerformance.map((officer) => (
        <div
          key={officer.id}
          className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          onClick={() => onMemberClick && onMemberClick(officer)}
        >
          <div className="flex items-center">
            <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-medium">
              {officer.name.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{officer.name}</p>
              <p className="text-xs text-gray-500">{officer.role}</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-32 h-2 bg-gray-200 rounded-full mr-3">
              <div
                className="h-2 rounded-full bg-indigo-600"
                style={{
                  width: `${Math.min(100, (officer.value / maxValue) * 100)}%`,
                }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900">
              {officer.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

PlacementOfficerPerformance.propTypes = {
  officerPerformance: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
      role: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
  selectedUserId: PropTypes.string,
};

PlacementOfficerPerformance.defaultProps = {
  officerPerformance: [],
  isLoading: false,
  selectedUserId: null,
};

const RecentPlacements = ({ recentPlacements, isLoading }) => {
  if (isLoading) {
    return (
      <div className="max-h-96 overflow-y-auto space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="w-32 h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="w-24 h-3 bg-gray-200 rounded"></div>
                </div>
                <div className="w-16 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!recentPlacements || recentPlacements.length === 0) {
    return (
      <div className="text-center py-8">
        <FaHandshake className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No recent placements
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          No placement activity in the selected period.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto space-y-3">
      {recentPlacements.map((placement) => (
        <div
          key={placement.id}
          className="p-3 hover:bg-gray-50 rounded-lg transition-colors group"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="relative">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <FaHandshake size={16} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {placement.studentName}
                  </p>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {placement.course}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span>{placement.company}</span>
                  <span className="text-gray-400">•</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(placement.salary)}
                  </span>
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap ml-2 self-start">
              {placement.date}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

RecentPlacements.propTypes = {
  recentPlacements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      studentName: PropTypes.string,
      company: PropTypes.string,
      salary: PropTypes.number,
      course: PropTypes.string,
      date: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
};

RecentPlacements.defaultProps = {
  recentPlacements: [],
  isLoading: false,
};

const RecentJDOpened = ({ recentJobOpenings, isLoading }) => {
  if (isLoading) {
    return (
      <div className="max-h-96 overflow-y-auto space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="w-32 h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="w-24 h-3 bg-gray-200 rounded"></div>
                </div>
                <div className="w-16 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!recentJobOpenings || recentJobOpenings.length === 0) {
    return (
      <div className="text-center py-8">
        <FaBriefcase className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No recent job openings
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          No job descriptions opened recently.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto space-y-3">
      {recentJobOpenings.map((jobOpening) => (
        <div
          key={jobOpening.id}
          className="p-3 hover:bg-gray-50 rounded-lg transition-colors group"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="relative">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <FaBriefcase size={16} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {jobOpening.companyName || jobOpening.title}
                  </p>
                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                    {jobOpening.status || 'Open'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="font-medium text-gray-900">
                    {jobOpening.jobTitle || jobOpening.position || 'Job Opening'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>{jobOpening.location || 'Location not specified'}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-blue-600">
                    Coordinator: {jobOpening.coordinator}
                  </span>
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap ml-2 self-start">
              {jobOpening.date}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

RecentJDOpened.propTypes = {
  recentJobOpenings: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      companyName: PropTypes.string,
      title: PropTypes.string,
      jobTitle: PropTypes.string,
      position: PropTypes.string,
      status: PropTypes.string,
      location: PropTypes.string,
      coordinator: PropTypes.string,
      date: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
};

RecentJDOpened.defaultProps = {
  recentJobOpenings: [],
  isLoading: false,
};

const LeadStatusDistribution = ({ leadData, isLoading }) => {
  const COLORS = ["#EF4444", "#F59E0B", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899"];

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-48 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!leadData || leadData.length === 0) {
    return (
      <div className="text-center py-8">
        <FiTarget className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No lead data
        </h3>
      </div>
    );
  }

  // Sort data by value descending and take top 10, group rest as "Others"
  const sortedData = [...leadData].sort((a, b) => b.value - a.value);
  const topData = sortedData.slice(0, 10);
  const othersValue = sortedData.slice(10).reduce((sum, item) => sum + item.value, 0);
  
  let displayData = topData;
  if (othersValue > 0) {
    displayData = [...topData, { name: 'Others', value: othersValue }];
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap justify-center gap-2">
        {displayData.map((status, index) => (
          <div key={index} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-gray-600 truncate max-w-32" title={`${status.name}: ${status.value}`}>
              {status.name}: {status.value}
            </span>
          </div>
        ))}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ value }) => `${value}`}
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {displayData.map((entry, index) => (
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
    </>
  );
};

LeadStatusDistribution.propTypes = {
  leadData: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
    })
  ),
  isLoading: PropTypes.bool,
};

LeadStatusDistribution.defaultProps = {
  leadData: [],
  isLoading: false,
};

const CTCDistribution = ({ ctcData, isLoading }) => {
  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-48 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!ctcData || ctcData.length === 0) {
    return (
      <div className="text-center py-8">
        <FiDollarSign className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No CTC data
        </h3>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap justify-center gap-2">
        {ctcData.map((range, index) => (
          <div key={index} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-gray-600">
              {range.name}: {range.value}
            </span>
          </div>
        ))}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={ctcData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ value }) => `${value}`}
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {ctcData.map((entry, index) => (
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
    </>
  );
};

CTCDistribution.propTypes = {
  ctcData: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
    })
  ),
  isLoading: PropTypes.bool,
};

CTCDistribution.defaultProps = {
  ctcData: [],
  isLoading: false,
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
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {recentActivity.map((activity) => (
        <div
          key={activity.id}
          className="p-3 hover:bg-gray-50 rounded-lg transition-colors group"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="relative">
                <div
                  className={`p-2 rounded-lg ${
                    activity.type === "placement"
                      ? "bg-green-100 text-green-600"
                      : activity.type === "lead"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-indigo-100 text-indigo-600"
                  }`}
                >
                  {activity.type === "placement" ? (
                    <FaHandshake size={16} />
                  ) : activity.type === "lead" ? (
                    <FaUserGraduate size={16} />
                  ) : (
                    <FaBuilding size={16} />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.action}
                  </p>
                  {activity.user && (
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {activity.user}
                    </span>
                  )}
                </div>
                <p
                  className="text-xs text-gray-500 mt-0.5 truncate"
                  style={{ maxWidth: "180px" }}
                  title={activity.details}
                >
                  {activity.details}
                </p>
                {activity.amount && (
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    ₹{activity.amount.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap ml-2 self-start">
              {activity.time}
            </span>
          </div>
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
      type: PropTypes.string,
      amount: PropTypes.number,
      details: PropTypes.string,
      time: PropTypes.string,
      user: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
};

RecentActivity.defaultProps = {
  recentActivity: [],
  isLoading: false,
};

const PlacementDashboard = ({ filters }) => {
  const userDropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);
  const yearDropdownContainerRef = useRef(null);

  const [timePeriod, setTimePeriod] = useState("quarter");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dashboardData, setDashboardData] = useState({
    totalTrainingPrograms: 0,
    totalTrainingProgramsPrev: 0,
    activeStudents: 0,
    activeStudentsPrev: 0,
    totalLeads: 0,
    totalLeadsPrev: 0,
    hotLeads: 0,
    hotLeadsPrev: 0,
    warmLeads: 0,
    warmLeadsPrev: 0,
    companiesWithOpenings: 0,
    companiesWithOpeningsPrev: 0,
    totalPlacements: 0,
    totalPlacementsPrev: 0,
    chartData: [],
    leadStatusDistribution: [],
    userLeadDistribution: [],
    trainingStatusDistribution: [],
    ctcDistribution: [],
    placementOfficerPerformance: [],
    recentActivities: [],
    recentPlacements: [],
    totalJobOpenings: 0,
    recentJobOpenings: [],
  });
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("Team");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [currentPeriodInfo, setCurrentPeriodInfo] = useState("");
  const [currentDateRange, setCurrentDateRange] = useState({
    start: new Date(),
    end: new Date(),
  });
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const getCurrentQuarter = () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return quarter;
  };

  const getDateRange = (period, year = selectedYear) => {
    const now = new Date();
    let start, end;

    switch (period) {
      case "quarter": {
        const currentQuarter = getCurrentQuarter();
        const quarterStartMonth = (currentQuarter - 1) * 3;
        start = new Date(year, quarterStartMonth, 1);
        end = new Date(year, quarterStartMonth + 3, 0);
        break;
      }
      case "month":
        start = new Date(year, now.getMonth(), 1);
        end = new Date(year, now.getMonth() + 1, 0);
        break;
      case "year":
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31);
        break;
      default:
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31);
    }

    return { start, end };
  };

  const getNextDateRange = (period, currentStart) => {
    const start = new Date(currentStart);
    let end;

    switch (period) {
      case "quarter":
        start.setMonth(start.getMonth() + 3);
        end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
        break;
      case "month":
        start.setMonth(start.getMonth() + 1);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        break;
      case "year":
        start.setFullYear(start.getFullYear() + 1);
        end = new Date(start.getFullYear() + 1, 11, 31);
        break;
      default:
        start.setFullYear(start.getFullYear() + 1);
        end = new Date(start.getFullYear() + 1, 11, 31);
    }

    return { start, end };
  };

  const getPrevDateRange = (period, currentStart) => {
    const start = new Date(currentStart);
    let end;

    switch (period) {
      case "quarter":
        start.setMonth(start.getMonth() - 3);
        end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
        break;
      case "month":
        start.setMonth(start.getMonth() - 1);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        break;
      case "year":
        start.setFullYear(start.getFullYear() - 1);
        end = new Date(start.getFullYear() - 1, 11, 31);
        break;
      default:
        start.setFullYear(start.getFullYear() - 1);
        end = new Date(start.getFullYear() - 1, 11, 31);
    }

    return { start, end };
  };

  const updatePeriodInfo = (range, isCurrentPeriod = true) => {
    const { start, end } = range;
    let periodInfo = "";

    if (timePeriod === "quarter") {
      const quarter = Math.floor(start.getMonth() / 3) + 1;
      periodInfo = `Q${quarter} ${start.getFullYear()}`;
    } else if (timePeriod === "month") {
      periodInfo = start.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
    } else {
      periodInfo = start.getFullYear().toString();
    }

    if (!isCurrentPeriod) {
      periodInfo += " (Previous)";
    }

    setCurrentPeriodInfo(periodInfo);
    setCurrentDateRange({ start, end });
  };

  const processPlacementData = async (dateRange, users) => {
    try {
      // Fetch training programs from placementData
      const trainingSnapshot = await getDocs(collection(db, "placementData"));
      const trainingPrograms = trainingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch company leads (decode from batches)
      const leadsSnapshot = await getDocs(collection(db, "companyleads"));
      const leads = [];
      leadsSnapshot.docs.forEach(doc => {
        const batchData = doc.data();
        if (batchData.companies && Array.isArray(batchData.companies)) {
          batchData.companies.forEach(encodedCompany => {
            try {
              if (typeof encodedCompany === 'string' && encodedCompany.trim()) {
                const uriDecoded = atob(encodedCompany);
                const jsonString = decodeURIComponent(uriDecoded);
                const companyData = JSON.parse(jsonString);
                // Filter by user if selected
                if (!selectedUserId || companyData.assignedTo === selectedUserId) {
                  leads.push({
                    id: `${doc.id}_${batchData.companies.indexOf(encodedCompany)}`,
                    ...companyData,
                    batchId: doc.id
                  });
                }
              }
            } catch (error) {
              console.error('Error decoding company data:', error);
            }
          });
        }
      });

      // Fetch companies (decode from batches)
      const companiesSnapshot = await getDocs(collection(db, "companyleads"));
      const companies = [];
      companiesSnapshot.docs.forEach(doc => {
        const batchData = doc.data();
        if (batchData.companies && Array.isArray(batchData.companies)) {
          batchData.companies.forEach(encodedCompany => {
            try {
              if (typeof encodedCompany === 'string' && encodedCompany.trim()) {
                const uriDecoded = atob(encodedCompany);
                const jsonString = decodeURIComponent(uriDecoded);
                const companyData = JSON.parse(jsonString);
                companies.push({
                  id: `${doc.id}_${batchData.companies.indexOf(encodedCompany)}`,
                  ...companyData,
                  batchId: doc.id
                });
              }
            } catch (error) {
              console.error('Error decoding company data:', error);
            }
          });
        }
      });

      // Fetch placement audit logs for officer performance and recent activities
      let auditLogsQuery = query(collection(db, "placement_audit_logs"), orderBy("timestamp", "desc"), limit(100));
      if (selectedUserId) {
        auditLogsQuery = query(collection(db, "placement_audit_logs"), where("userId", "==", selectedUserId), orderBy("timestamp", "desc"), limit(100));
      }
      const auditLogsSnapshot = await getDocs(auditLogsQuery);
      const auditLogs = auditLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate metrics
      const totalTrainingPrograms = trainingPrograms.length;
      const activeStudents = trainingPrograms.reduce((sum, program) => sum + (program.totalStudents || 0), 0);
      const totalLeads = leads.length;
      const hotLeads = leads.filter(lead => lead.status === 'hot').length;
      const warmLeads = leads.filter(lead => lead.status === 'warm' || lead.phase === 'warm').length;

      // Fetch job openings for companies with openings count (from companies collection)
      const jobOpeningsSnapshot = await getDocs(collection(db, "companies"));
      const jobOpenings = [];
      jobOpeningsSnapshot.docs.forEach(doc => {
        const companyData = { id: doc.id, ...doc.data() };
        // Filter by user if selected
        if (!selectedUserId || companyData.assignedTo === selectedUserId) {
          jobOpenings.push(companyData);
        }
      });

      // Companies with ongoing openings (count job openings that are ongoing)
      const companiesWithOpenings = jobOpenings.filter(opening => 
        opening.status === 'ongoing' || 
        opening.status === 'Ongoing' || 
        opening.status === 'active' ||
        opening.status === 'Active'
      ).length;

      // Fetch placed students from placedStudents collection
      const placedStudentsQuery = query(collection(db, "placedStudents"));
      const placedStudentsSnapshot = await getDocs(placedStudentsQuery);
      const placedStudents = placedStudentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate placements and officer performance from placed students data
      const totalPlacements = placedStudents.length;

      // Calculate officer performance from placed students
      const placementOfficerPerformance = {};
      placedStudents.forEach(student => {
        const officerId = student.placedBy || student.placementOfficer || student.assignedTo || 'Unknown Officer';
        const officerName = student.placedByName || student.placementOfficerName || officerId;

        if (!placementOfficerPerformance[officerId]) {
          placementOfficerPerformance[officerId] = {
            id: officerId,
            name: officerName,
            value: 0,
            role: "Placement Officer"
          };
        }
        placementOfficerPerformance[officerId].value++;
      });

      // Lead industry distribution
      const leadIndustries = {};
      leads.forEach(lead => {
        let industry = lead.industry || 'Other';
        // Check if the industry matches one of the predefined options
        if (!INDUSTRY_OPTIONS.includes(industry)) {
          industry = 'Other';
        }
        leadIndustries[industry] = (leadIndustries[industry] || 0) + 1;
      });
      const leadIndustryDistribution = Object.entries(leadIndustries).map(([name, value]) => ({ name, value }));

      // User-wise lead distribution
      const userLeadDistribution = {};
      leads.forEach(lead => {
        let assignedUser = 'Unassigned';
        if (lead.assignedTo) {
          // assignedTo might be a string (user ID) or an object
          if (typeof lead.assignedTo === 'string') {
            // Find user by ID - check multiple possible ID fields
            const user = users.find(u =>
              u.uid === lead.assignedTo ||
              u.id === lead.assignedTo ||
              u.docId === lead.assignedTo
            );
            if (user) {
              assignedUser = user.displayName || user.name || user.email || lead.assignedTo;
            } else {
              // Group all unknown users together
              assignedUser = 'Unknown Users';
            }
          } else if (typeof lead.assignedTo === 'object') {
            // Handle object structure
            assignedUser = lead.assignedTo.name || lead.assignedTo.displayName || lead.assignedTo.uid || 'Unassigned';
          }
        }
        userLeadDistribution[assignedUser] = (userLeadDistribution[assignedUser] || 0) + 1;
      });
      const userLeadDistributionData = Object.entries(userLeadDistribution)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // CTC distribution
      const ctcRanges = {
        "10+ LPA": 0,
        "7-10 LPA": 0,
        "5-7 LPA": 0,
        "3-5 LPA": 0,
        "Below 3 LPA": 0,
      };

      const parseCTC = (ctcString) => {
        if (!ctcString || ctcString === 'N/A') return null;

        // Handle range format like "5-7 LPA" or "3-5 LPA"
        if (ctcString.includes('-')) {
          const parts = ctcString.split('-');
          if (parts.length === 2) {
            const min = parseFloat(parts[0].trim());
            const max = parseFloat(parts[1].replace('LPA', '').trim());
            return (min + max) / 2; // Use average for range
          }
        }

        // Handle single value
        const num = parseFloat(ctcString.replace('LPA', '').trim());
        return isNaN(num) ? null : num;
      };

      leads.forEach(lead => {
        const ctcValue = parseCTC(lead.ctc);
        if (ctcValue !== null) {
          if (ctcValue >= 10) {
            ctcRanges["10+ LPA"]++;
          } else if (ctcValue >= 7) {
            ctcRanges["7-10 LPA"]++;
          } else if (ctcValue >= 5) {
            ctcRanges["5-7 LPA"]++;
          } else if (ctcValue >= 3) {
            ctcRanges["3-5 LPA"]++;
          } else {
            ctcRanges["Below 3 LPA"]++;
          }
        }
      });

      const ctcDistribution = Object.entries(ctcRanges)
        .map(([name, value]) => ({ name, value }))
        .filter(range => range.value > 0); // Only show ranges with data

      // Training status distribution
      const trainingStatuses = {};
      trainingPrograms.forEach(program => {
        const status = program.status || 'ongoing';
        trainingStatuses[status] = (trainingStatuses[status] || 0) + 1;
      });
      const trainingStatusDistribution = Object.entries(trainingStatuses).map(([name, value]) => ({ name, value }));

      // Officer performance
      const officerPerformance = Object.values(placementOfficerPerformance)
        .sort((a, b) => b.value - a.value);

      // Recent activities from audit logs
      let recentActivities = auditLogs.slice(0, 10).map(log => {
        const timestamp = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        const timeAgo = getTimeAgo(timestamp);

        let action = log.action || 'Activity';
        let type = 'activity';
        let details = log.companyName || log.details || '';

        // Determine activity type and format action
        if (log.action === 'VIEW_LEAD' || log.action === 'UPDATE_LEAD') {
          type = 'lead';
          action = log.action === 'VIEW_LEAD' ? 'Viewed lead' : 'Updated lead';
        } else if (log.action === 'ASSIGN_LEAD') {
          type = 'lead';
          action = 'Assigned lead';
        } else if (log.action === 'STATUS_CHANGE') {
          type = 'lead';
          action = 'Changed lead status';
        } else if (log.action === 'PLACEMENT_SUCCESS' || log.action === 'STUDENT_PLACED') {
          type = 'placement';
          action = 'Student placed';
        } else if (log.action === 'SCHEDULE_FOLLOWUP') {
          type = 'lead';
          action = 'Scheduled followup';
        } else {
          type = 'activity';
        }

        return {
          id: log.id,
          action,
          type,
          details,
          time: timeAgo,
          user: log.userName || 'Unknown User'
        };
      });

      // Add recent placements from placedStudents collection for activities feed
      const placementActivities = placedStudents
        .filter(student => student.placedDate) // Only students with placement dates
        .sort((a, b) => {
          const dateA = a.placedDate?.seconds ? new Date(a.placedDate.seconds * 1000) : new Date(0);
          const dateB = b.placedDate?.seconds ? new Date(b.placedDate.seconds * 1000) : new Date(0);
          return dateB - dateA; // Most recent first
        })
        .slice(0, 10) // Get 10 most recent placements
        .map(student => {
          const placedDate = student.placedDate?.seconds ? new Date(student.placedDate.seconds * 1000) : new Date();
          const timeAgo = getTimeAgo(placedDate);

          return {
            id: `placement_${student.id}`,
            action: 'Student placed',
            type: 'placement',
            details: `${student.studentName} placed at ${student.companyName}`,
            time: timeAgo,
            user: student.placedByName || student.placementOfficerName || 'Placement Team',
            amount: student.salary ? parseFloat(student.salary) : null
          };
        });

      // Combine audit log activities and placement activities
      recentActivities = [...placementActivities, ...recentActivities].slice(0, 10);

      // If no activities, provide some default activities
      if (recentActivities.length === 0) {
        const defaultActivities = [
          { id: 1, action: "New lead added", details: "Check company leads", time: "Recently", type: "lead", user: "System" },
          { id: 2, action: "Training program created", details: "New placement training", time: "Recently", type: "activity", user: "System" },
          { id: 3, action: "Company profile updated", details: "Company information", time: "Recently", type: "company", user: "System" },
        ];
        recentActivities.push(...defaultActivities);
      }

      // Process job openings for trends
      const jobOpeningsByDate = {};
      const timePoints = timePeriod === "week" ? 7 : timePeriod === "month" ? 4 : timePeriod === "quarter" ? 3 : 12;
      jobOpenings.forEach(opening => {
        try {
          // Use createdAt field specifically for job opening creation date
          let createdDate;
          if (opening.createdAt) {
            // Handle Firestore timestamp
            createdDate = opening.createdAt.toDate ? opening.createdAt.toDate() : new Date(opening.createdAt);
          } else {
            // Fallback to current date if no createdAt
            createdDate = new Date();
          }

          if (createdDate >= dateRange.start && createdDate <= dateRange.end) {
            let dateKey;
            if (timePeriod === "week") {
              dateKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][createdDate.getDay()];
            } else if (timePeriod === "month") {
              const weekOfMonth = Math.ceil(createdDate.getDate() / 7);
              dateKey = `Week ${weekOfMonth}`;
            } else if (timePeriod === "quarter") {
              // Use dateRange.start to determine the quarter months
              const startMonth = dateRange?.start?.getMonth?.() ?? 3; // Default to April
              let months;
              if (startMonth === 3) {
                months = ["Apr", "May", "Jun"];
              } else if (startMonth === 6) {
                months = ["Jul", "Aug", "Sep"];
              } else if (startMonth === 9) {
                months = ["Oct", "Nov", "Dec"];
              } else if (startMonth === 0) {
                months = ["Jan", "Feb", "Mar"];
              } else {
                const quarterStart = Math.floor(startMonth / 3) * 3;
                months = [
                  new Date(2000, quarterStart, 1).toLocaleString("default", { month: "short" }),
                  new Date(2000, quarterStart + 1, 1).toLocaleString("default", { month: "short" }),
                  new Date(2000, quarterStart + 2, 1).toLocaleString("default", { month: "short" }),
                ];
              }
              let monthIdx = createdDate.getMonth() - startMonth;
              if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 2) monthIdx = 0; // fallback to first month
              dateKey = months[monthIdx];
            } else {
              const month = createdDate.getMonth();
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
              ][month < 3 ? month + 9 : month - 3];
            }

            if (!jobOpeningsByDate[dateKey]) {
              jobOpeningsByDate[dateKey] = 0;
            }
            jobOpeningsByDate[dateKey] += 1;
          }
        } catch (e) {
          console.error("Error processing job opening data:", e);
        }
      });

      // Generate chart data
      const chartData = [];
      for (let i = 0; i < timePoints; i++) {
        let dateKey;
        let months;
        if (timePeriod === "week") {
          dateKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i];
        } else if (timePeriod === "month") {
          dateKey = `Week ${i + 1}`;
        } else if (timePeriod === "quarter") {
          // Use dateRange.start to determine the quarter months
          const startMonth = dateRange?.start?.getMonth?.() ?? 3; // Default to April
          if (startMonth === 3) {
            months = ["Apr", "May", "Jun"];
          } else if (startMonth === 6) {
            months = ["Jul", "Aug", "Sep"];
          } else if (startMonth === 9) {
            months = ["Oct", "Nov", "Dec"];
          } else if (startMonth === 0) {
            months = ["Jan", "Feb", "Mar"];
          } else {
            const quarterStart = Math.floor(startMonth / 3) * 3;
            months = [
              new Date(2000, quarterStart, 1).toLocaleString("default", { month: "short" }),
              new Date(2000, quarterStart + 1, 1).toLocaleString("default", { month: "short" }),
              new Date(2000, quarterStart + 2, 1).toLocaleString("default", { month: "short" }),
            ];
          }
          dateKey = months[i];
        } else {
          const fiscalMonths = [
            "Apr", "May", "Jun", "Jul", "Aug", "Sep",
            "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
          ];
          dateKey = fiscalMonths[i];
        }

        let isCurrentMonth = false;

        if (timePeriod === "quarter" || timePeriod === "year") {
          const now = new Date();
          const currentMonth = now.getMonth();

          if (timePeriod === "year") {
            const fiscalMonthIndex = currentMonth < 3 ? currentMonth + 9 : currentMonth - 3;
            isCurrentMonth = i === fiscalMonthIndex;
          } else if (timePeriod === "quarter") {
            const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
            isCurrentMonth = currentMonth - quarterStartMonth === i;
          }
        }

        chartData.push({
          name: dateKey,
          jobOpenings: jobOpeningsByDate[dateKey] || 0,
          leads: Math.floor((totalLeads * (0.7 + Math.random() * 0.6)) / timePoints),
          currentMonth: isCurrentMonth,
        });
      }

      // Prepare recent placements data for the RecentPlacements component
      const recentPlacementsData = placedStudents
        .filter(student => student.placedDate) // Only students with placement dates
        .sort((a, b) => {
          const dateA = a.placedDate?.seconds ? new Date(a.placedDate.seconds * 1000) : new Date(0);
          const dateB = b.placedDate?.seconds ? new Date(b.placedDate.seconds * 1000) : new Date(0);
          return dateB - dateA; // Most recent first
        })
        .slice(0, 10) // Get 10 most recent placements
        .map(student => ({
          id: student.id,
          studentName: student.studentName || 'Unknown Student',
          company: student.companyName || 'Unknown Company',
          salary: student.salary ? parseFloat(student.salary) : 0,
          course: student.course || student.college || 'Unknown Course',
          date: student.placedDate?.seconds
            ? new Date(student.placedDate.seconds * 1000).toLocaleDateString('en-IN')
            : 'N/A'
        }));

      // Prepare recent job openings data for the RecentJDOpened component
      const recentJobOpeningsData = jobOpenings
        .filter(opening => opening.createdAt) // Only openings with creation dates
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA; // Most recent first
        })
        .slice(0, 10) // Get 10 most recent job openings
        .map(opening => ({
          id: opening.id,
          companyName: opening.companyName || opening.name || 'Unknown Company',
          title: opening.title || opening.jobTitle || opening.position || opening.jobDesignation || 'Job Opening',
          jobTitle: opening.jobTitle || opening.position || opening.jobDesignation || 'Position',
          position: opening.position || opening.jobTitle || opening.jobDesignation,
          status: opening.status || 'Open',
          location: opening.location || opening.city || opening.jobLocation || 'Location not specified',
          coordinator: opening.assignedTo || opening.coordinator || opening.placementOfficer || opening.contactPerson || 'Unassigned',
          date: opening.createdAt?.toDate
            ? opening.createdAt.toDate().toLocaleDateString('en-IN')
            : new Date(opening.createdAt).toLocaleDateString('en-IN')
        }));

      return {
        totalTrainingPrograms,
        totalTrainingProgramsPrev: Math.floor(totalTrainingPrograms * 0.9),
        activeStudents,
        activeStudentsPrev: Math.floor(activeStudents * 0.95),
        totalLeads,
        totalLeadsPrev: Math.floor(totalLeads * 0.9),
        hotLeads,
        hotLeadsPrev: Math.floor(hotLeads * 0.95),
        warmLeads,
        warmLeadsPrev: Math.floor(warmLeads * 0.95),
        companiesWithOpenings,
        companiesWithOpeningsPrev: companiesWithOpenings,
        totalPlacements,
        totalPlacementsPrev: Math.floor(totalPlacements * 0.9),
        chartData,
        leadStatusDistribution: leadIndustryDistribution,
        userLeadDistribution: userLeadDistributionData,
        trainingStatusDistribution,
        ctcDistribution,
        placementOfficerPerformance: officerPerformance,
        recentActivities,
        recentPlacements: recentPlacementsData,
        totalJobOpenings: jobOpenings.length,
        recentJobOpenings: recentJobOpeningsData,
      };
    } catch (error) {
      console.error("Error processing placement data:", error);
      return dashboardData;
    }
  };

  const fetchAllUsers = async () => {
    try {
      const usersQuery = query(collection(db, "users"));
      const querySnapshot = await getDocs(usersQuery);
      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        uid: doc.id, // Add uid field for consistency
        ...doc.data(),
      }));
      const placementUsers = usersData.filter(user => user.departments && user.departments.includes('Placement'));
      setUsers(placementUsers);
      console.log("Fetched placement users:", placementUsers.length, placementUsers.slice(0, 3)); // Debug log
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchDataForRange = async (range) => {
    setIsLoading(true);
    try {
      const data = await processPlacementData(range, users);
      setDashboardData(data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPeriod = () => {
    const nextRange = getNextDateRange(timePeriod, currentDateRange.start);
    updatePeriodInfo(nextRange, false);
    fetchDataForRange(nextRange);
  };

  const handlePrevPeriod = () => {
    const prevRange = getPrevDateRange(timePeriod, currentDateRange.start);
    updatePeriodInfo(prevRange, false);
    fetchDataForRange(prevRange);
  };

  const handleUserSelect = (user) => {
    if (user === "Team") {
      setSelectedUser("Team");
      setSelectedUserId(null);
    } else {
      setSelectedUser(user.displayName || user.name);
      setSelectedUserId(user.uid || user.id);
    }
  };

  const handleRefresh = () => {
    fetchDataForRange(currentDateRange);
  };

  useEffect(() => {
    fetchAllUsers();
    const initialRange = getDateRange(timePeriod, selectedYear);
    updatePeriodInfo(initialRange);
    fetchDataForRange(initialRange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (users.length > 0) {
      const range = getDateRange(timePeriod, selectedYear);
      updatePeriodInfo(range);
      fetchDataForRange(range);
    }
  }, [timePeriod, users, filters, selectedYear, selectedUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target) &&
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target) &&
        yearDropdownRef.current &&
        !yearDropdownRef.current.contains(event.target) &&
        yearDropdownContainerRef.current &&
        !yearDropdownContainerRef.current.contains(event.target)
      ) {
        setIsYearDropdownOpen(false);
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isYearDropdownOpen && yearDropdownContainerRef.current) {
      const selectedOption = yearDropdownContainerRef.current.querySelector(
        `[data-year="${selectedYear}"]`
      );
      if (selectedOption) {
        selectedOption.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
  }, [isYearDropdownOpen, selectedYear]);

  const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const metrics = useMemo(() => [
    {
      title: "Companies Active",
      value: dashboardData.companiesWithOpenings.toLocaleString(),
      change: calculateGrowth(dashboardData.companiesWithOpenings, dashboardData.companiesWithOpeningsPrev),
      icon: <FaBuilding className="text-white" size={16} />,
      color: "bg-purple-600",
    },
    {
      title: "JD Opened",
      value: dashboardData.totalJobOpenings.toLocaleString(),
      change: 0, // For now, no previous data calculation
      icon: <FaBriefcase className="text-white" size={16} />,
      color: "bg-green-600",
    },
    {
      title: "Total Placed Students",
      value: dashboardData.totalPlacements.toLocaleString(),
      change: calculateGrowth(dashboardData.totalPlacements, dashboardData.totalPlacementsPrev),
      icon: <FaHandshake className="text-white" size={16} />,
      color: "bg-orange-600",
    },
    {
      title: "Hot Leads",
      value: dashboardData.hotLeads.toLocaleString(),
      change: calculateGrowth(dashboardData.hotLeads, dashboardData.hotLeadsPrev),
      icon: <FiTrendingUp className="text-white" size={16} />,
      color: "bg-red-600",
    },
    {
      title: "Warm Leads",
      value: dashboardData.warmLeads.toLocaleString(),
      change: calculateGrowth(dashboardData.warmLeads, dashboardData.warmLeadsPrev),
      icon: <FiTarget className="text-white" size={16} />,
      color: "bg-blue-600",
    },
  ], [dashboardData]);

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="mx-auto max-w-8xl w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-80 mb-3"></div>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  <div className="h-6 bg-gray-200 rounded w-6"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-6"></div>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Placement Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  Key metrics and performance indicators for placement activities
                </p>
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <FiCalendar className="mr-1" />
                  <button
                    onClick={handlePrevPeriod}
                    className="p-1 rounded-full hover:bg-gray-200"
                    disabled={isLoading}
                  >
                    <FiChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="mx-1">
                    {currentPeriodInfo || getCurrentQuarter()}
                  </span>
                  <button
                    onClick={handleNextPeriod}
                    className="p-1 rounded-full hover:bg-gray-200"
                    disabled={isLoading}
                  >
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            {isLoading ? (
              <div className="animate-pulse flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-gray-200 px-4 py-2 rounded-lg">
                  <div className="h-4 w-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-12"></div>
                  <div className="h-3 w-3 bg-gray-300 rounded"></div>
                </div>
                <div className="flex items-center space-x-2 bg-gray-200 px-4 py-2 rounded-lg">
                  <div className="h-4 w-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                  <div className="h-3 w-3 bg-gray-300 rounded"></div>
                </div>
                <div className="flex items-center space-x-2 bg-gray-200 px-4 py-2 rounded-lg">
                  <div className="h-4 w-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-12"></div>
                  <div className="h-3 w-3 bg-gray-300 rounded"></div>
                </div>
                <div className="p-2 bg-gray-200 rounded-md">
                  <div className="h-4 w-4 bg-gray-300 rounded"></div>
                </div>
              </div>
            ) : (
              <>
                {/* User Filter */}
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <FiUsers className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {selectedUser}
                    </span>
                    {isUserDropdownOpen ? (
                      <FiChevronUp className="text-gray-500 h-4 w-4" />
                    ) : (
                      <FiChevronDown className="text-gray-500 h-4 w-4" />
                    )}
                  </button>

                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <div className="p-3 max-h-60 overflow-y-auto">
                        <button
                          onClick={() => {
                            handleUserSelect("Team");
                            setIsUserDropdownOpen(false);
                          }}
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
                            key={user.uid || user.id}
                            onClick={() => {
                              handleUserSelect(user);
                              setIsUserDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                              selectedUserId === (user.uid || user.id)
                                ? "bg-indigo-100 text-indigo-700"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {user.displayName || user.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Period Selector */}
                <div className="relative" ref={filterDropdownRef}>
                  <button
                    onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                    className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <FiFilter className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)}
                    </span>
                    {isYearDropdownOpen ? (
                      <FiChevronUp className="text-gray-500 h-4 w-4" />
                    ) : (
                      <FiChevronDown className="text-gray-500 h-4 w-4" />
                    )}
                  </button>

                  {isYearDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <div className="p-3">
                        {[
                          { value: "quarter", label: "Current Quarter" },
                          { value: "month", label: "This Month" },
                          { value: "year", label: "This Year" },
                        ].map((period) => (
                          <button
                            key={period.value}
                            onClick={() => {
                              setTimePeriod(period.value);
                              setIsYearDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                              timePeriod === period.value
                                ? "bg-indigo-100 text-indigo-700"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {period.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Year Selector */}
                <div className="relative" ref={yearDropdownContainerRef}>
                  <button
                    onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                    className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <FiCalendar className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {selectedYear}
                    </span>
                    {isYearDropdownOpen ? (
                      <FiChevronUp className="text-gray-500 h-4 w-4" />
                    ) : (
                      <FiChevronDown className="text-gray-500 h-4 w-4" />
                    )}
                  </button>

                  {isYearDropdownOpen && (
                    <div
                      ref={yearDropdownRef}
                      className="absolute right-0 z-10 mt-1 w-24 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
                        (year) => (
                          <button
                            key={year}
                            data-year={year}
                            onClick={() => {
                              setSelectedYear(year);
                              setIsYearDropdownOpen(false);
                            }}
                            className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                              year === selectedYear ? "bg-indigo-50 text-indigo-700" : "text-gray-700"
                            }`}
                          >
                            {year}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={isLoading}
                >
                  <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 min-w-0">
        {isLoading ? (
          // Skeleton loading for metrics
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="bg-gray-200 rounded-xl p-5 text-white animate-pulse"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-300 rounded w-16"></div>
                </div>
                <div className="p-2 rounded-lg bg-gray-300 w-8 h-8"></div>
              </div>
              <div className="mt-4 flex items-center">
                <div className="h-5 bg-gray-300 rounded-full w-12"></div>
                <div className="h-3 bg-gray-300 rounded w-20 ml-2"></div>
              </div>
            </div>
          ))
        ) : (
          metrics.map((metric, index) => (
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
                <div className="p-2 rounded-lg bg-white/10">
                  {metric.icon}
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    metric.change >= 0 || isNaN(metric.change)
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {isNaN(metric.change)
                    ? "↑ 0%"
                    : metric.change >= 0
                    ? `↑ ${Math.abs(metric.change).toFixed(1)}%`
                    : `↓ ${Math.abs(metric.change).toFixed(1)}%`}
                </span>
                <span className="text-xs opacity-80 ml-2">vs last quarter</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Charts Section */}
      <div className="w-full overflow-x-auto">
        <div className="bg-white p-3 md:p-5 rounded-xl border border-gray-200 shadow-sm mb-6 min-w-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Job Opening Trends
            </h2>
            <div className="flex space-x-2">
              {["week", "month", "quarter", "year"].map((period) => (
                <button
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
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dashboardData.chartData}
                  margin={{ top: 10, right: 30, left: 30, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorJobOpenings"
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
                    tick={{ fill: "#6B7280", fontSize: 8 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    tickFormatter={(value) => {
                      // For quarter/year, show month and year for clarity
                      if (timePeriod === "quarter" || timePeriod === "year") {
                        // Similar logic as Sales
                        return value;
                      }
                      return value;
                    }}
                  />
                  <YAxis
                    width={30}
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<CustomTooltip timePeriod={timePeriod} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="jobOpenings"
                    stroke="#4F46E5"
                    fillOpacity={1}
                    fill="url(#colorJobOpenings)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 min-w-0">
          <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm min-w-0">
            <h3 className="text-md font-semibold text-gray-800 mb-3">
              Lead Industry Distribution
            </h3>
            <LeadStatusDistribution
              leadData={dashboardData.leadStatusDistribution}
              isLoading={isLoading}
            />
          </div>
          <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm min-w-0">
            <h3 className="text-md font-semibold text-gray-800 mb-3">
              User-wise Lead Distribution
            </h3>
            <LeadStatusDistribution
              leadData={dashboardData.userLeadDistribution}
              isLoading={isLoading}
            />
          </div>
          <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm min-w-0">
            <h3 className="text-md font-semibold text-gray-800 mb-3">
              CTC Distribution
            </h3>
            <CTCDistribution
              ctcData={dashboardData.ctcDistribution}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Recent Sections - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 min-w-0">
          {/* Recent Placements Section */}
          <div className="bg-white p-3 md:p-5 rounded-xl border border-gray-200 shadow-sm min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Placements
            </h3>
            <RecentPlacements
              recentPlacements={dashboardData.recentPlacements}
              isLoading={isLoading}
            />
          </div>

          {/* Recent JD Opened Section */}
          <div className="bg-white p-3 md:p-5 rounded-xl border border-gray-200 shadow-sm min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent JD Opened
            </h3>
            <RecentJDOpened
              recentJobOpenings={dashboardData.recentJobOpenings}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

    </div>
  );
};

export default PlacementDashboard;