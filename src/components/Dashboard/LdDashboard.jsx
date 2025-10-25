import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext"; // Adjust the path as needed
import PropTypes from "prop-types";
import {
  FiTrendingUp,
  FiUsers,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiBookOpen,
  FiCalendar,
  FiRefreshCw,
  FiAward,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
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
import ReactModal from "react-modal"; // Add this import at the top

const formatCurrency = (amount) => {
  const numAmount = Number(amount);
  if (numAmount > 10000000) {
    const crores = numAmount / 10000000;
    let str = crores.toFixed(4);
    str = str.replace(/\.?0+$/, '');
    return `₹${str} cr`;
  } else {
    return `₹${numAmount.toLocaleString('en-IN')}`;
  }
};

const getPhaseStatus = (training) => {
  return training.status || "Not Started";
};

const CustomTooltip = ({ active, payload, label, timePeriod }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    let timeLabel = "";

    switch (timePeriod) {
      case "week":
        timeLabel = `Day: ${label}`;
        break;
      case "month":
        timeLabel = `Week: ${label}`;
        break;
      case "quarter":
        // Show month and year for clarity
        timeLabel = `Month: ${label} ${new Date().getFullYear()}`;
        break;
      case "year":
        // Show month and year for clarity
        timeLabel = `Month: ${label} ${new Date().getFullYear()}`;
        break;
      default:
        timeLabel = `Period: ${label}`;
    }

    return (
      <div className="bg-white p-3 rounded-lg shadow-md border border-gray-200">
        <p className="font-medium text-gray-900">{timeLabel}</p>
        <p className="text-sm" style={{ color: payload[0].color }}>
          TCV: {formatCurrency(payload[0].value)}
        </p>
        <p className="text-sm" style={{ color: payload[1]?.color || '#EF4444' }}>
          Cost: {formatCurrency(payload[1]?.value || 0)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {dataPoint.sessionCount} sessions
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

const TrainerPerformance = ({
  trainerPerformance,
  isLoading,
  selectedUserId,
  onMemberClick,
}) => {
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

  if (!trainerPerformance || trainerPerformance.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">
          {selectedUserId
            ? "No performance data available for this trainer"
            : "No performance data available"}
        </p>
      </div>
    );
  }

  const maxValue = selectedUserId
    ? trainerPerformance[0]?.value || 1
    : Math.max(...trainerPerformance.map((trainer) => trainer.value));

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {trainerPerformance.map((trainer) => (
        <div
          key={trainer.id}
          className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          onClick={() => onMemberClick && onMemberClick(trainer)}
        >
          <div className="flex items-center">
            <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-medium">
              {trainer.name.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{trainer.name}</p>
              <p className="text-xs text-gray-500">{trainer.specialization}</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-32 h-2 bg-gray-200 rounded-full mr-3">
              <div
                className="h-2 rounded-full bg-indigo-600"
                style={{
                  width: `${Math.min(100, (trainer.value / maxValue) * 100)}%`,
                }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900">
              {trainer.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

TrainerPerformance.propTypes = {
  trainerPerformance: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
      specialization: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
  selectedUserId: PropTypes.string,
};

TrainerPerformance.defaultProps = {
  trainerPerformance: [],
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
                    activity.amount
                      ? "bg-green-100 text-green-600"
                      : "bg-indigo-100 text-indigo-600"
                  }`}
                >
                  {activity.amount ? (
                    <FaRupeeSign size={16} />
                  ) : (
                    <FiBookOpen size={16} />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.action}
                  </p>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {activity.trainerInitials}
                  </span>
                </div>
                <p
                  className="text-xs text-gray-500 mt-0.5 truncate"
                  style={{ maxWidth: "180px" }}
                  title={activity.college}
                >
                  {activity.college}
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
      amount: PropTypes.number,
      college: PropTypes.string,
      time: PropTypes.string,
      trainer: PropTypes.string,
      trainerInitials: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
};

RecentActivity.defaultProps = {
  recentActivity: [],
  isLoading: false,
};

const SpecializationDistribution = ({ specializations, isLoading }) => {
  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"]; // Blue, Green, Amber, Red

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
      <div className="h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (
    !specializations ||
    specializations.length === 0 ||
    specializations.reduce((sum, cat) => sum + cat.value, 0) === 0
  ) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-gray-500">No specialization data available</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap justify-center gap-2">
        {specializations.map((spec, index) => (
          <div key={index} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-gray-600">
              {spec.name}: {spec.value}
            </span>
          </div>
        ))}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={specializations}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {specializations.map((entry, index) => (
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

SpecializationDistribution.propTypes = {
  specializations: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
    })
  ),
  isLoading: PropTypes.bool,
};

SpecializationDistribution.defaultProps = {
  specializations: [],
  isLoading: false,
};

const TrainingStatus = ({ statuses, isLoading }) => {
  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]; // Blue, Green, Amber, Red, Purple

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
      <div className="h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (
    !statuses ||
    statuses.length === 0 ||
    statuses.reduce((sum, cat) => sum + cat.value, 0) === 0
  ) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-gray-500">No status data available</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap justify-center gap-2">
        {statuses.map((status, index) => (
          <div key={index} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-gray-600">
              {status.name}: {status.value}
            </span>
          </div>
        ))}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statuses}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {statuses.map((entry, index) => (
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

TrainingStatus.propTypes = {
  statuses: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
    })
  ),
  isLoading: PropTypes.bool,
};

TrainingStatus.defaultProps = {
  statuses: [],
  isLoading: false,
};

const CourseDistribution = ({ courses, isLoading }) => {
  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]; // Blue, Green, Amber, Red, Purple, Pink

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
      <div className="h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (
    !courses ||
    courses.length === 0 ||
    courses.reduce((sum, cat) => sum + cat.value, 0) === 0
  ) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-gray-500">No course data available</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap justify-center gap-2">
        {courses.map((course, index) => (
          <div key={index} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-gray-600">
              {course.name}: {course.value}
            </span>
          </div>
        ))}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={courses}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {courses.map((entry, index) => (
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

CourseDistribution.propTypes = {
  courses: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
    })
  ),
  isLoading: PropTypes.bool,
};

CourseDistribution.defaultProps = {
  courses: [],
  isLoading: false,
};

const LdDashboard = ({ filters }) => {
  const userDropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);

  const [timePeriod, setTimePeriod] = useState("quarter");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUserFilterOpen, setIsUserFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dashboardData, setDashboardData] = useState({
    totalTrainers: 0,
    totalTrainersPrev: 0,
    activeStudents: 0,
    activeStudentsPrev: 0,
    trainingSessions: 0,
    trainingSessionsPrev: 0,
    trainingRevenue: 0,
    trainingRevenuePrev: 0,
    completionRate: 0,
    completionRatePrev: 0,
    activePrograms: 0,
    activeProgramsPrev: 0,
    totalTrainingHours: 0,
    totalTrainingHoursPrev: 0,
    overallTotalTrainingHours: 0,
    chartData: [],
    specializations: [],
    domains: [],
    statuses: [],
    courses: [],
    trainerPerformance: [],
    recentActivity: [],
  });
  const [trainers, setTrainers] = useState([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState(() => {
    try {
      return localStorage.getItem("ld_dashboard_selectedUserFilter") || "all";
    } catch {
      return "all";
    }
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const currentUser = useAuth()?.user;
  const [currentPeriodInfo, setCurrentPeriodInfo] = useState("");
  const [currentDateRange, setCurrentDateRange] = useState({
    start: new Date(),
    end: new Date(),
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSessions, setModalSessions] = useState([]);
  const [modalTrainer, setModalTrainer] = useState(null);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [error, setError] = useState(null);

  // Filter L&D users for assignment (include Admin users if current user is Admin)
  const ldUsers = useMemo(() => {
    // If current user is Admin, show both L&D and Admin users
    if ((currentUser?.department || "").toLowerCase() === "admin") {
      return availableUsers.filter((u) => {
        const departmentFilter = (u.department || "").toLowerCase();
        const isLdUser =
          departmentFilter === "l & d" || departmentFilter.includes("learning");
        const isAdminUser = departmentFilter === "admin";
        return isLdUser || isAdminUser;
      });
    }

    // Otherwise, show only L&D users
    return availableUsers.filter((u) => {
      const departmentFilter = (u.department || "").toLowerCase();
      return (
        departmentFilter === "l & d" || departmentFilter.includes("learning")
      );
    });
  }, [availableUsers, currentUser?.department]);

  const defaultSelectedUserFilter = useMemo(() => {
    if (currentUser?.role === "Director" || currentUser?.role === "Head") {
      return "all";
    } else {
      return currentUser?.uid || "all";
    }
  }, [currentUser]);

  const getCurrentQuarter = () => {
    const now = new Date();
    const month = now.getMonth();
    if (month >= 3 && month <= 5) return "Q1 (Apr-Jun)";
    if (month >= 6 && month <= 8) return "Q2 (Jul-Sep)";
    if (month >= 9 && month <= 11) return "Q3 (Oct-Dec)";
    return "Q4 (Jan-Mar)";
  };

  const getDateRange = useCallback((period, year = selectedYear) => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();

    let start, end;

    switch (period) {
      case "week":
        start = new Date();
        start.setDate(day - now.getDay());
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;

      case "month":
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
        break;

      case "quarter":
        if (month >= 3 && month <= 5) {
          start = new Date(year, 3, 1); // April 1
          end = new Date(year, 5, 30); // June 30
        } else if (month >= 6 && month <= 8) {
          start = new Date(year, 6, 1); // July 1
          end = new Date(year, 8, 30); // September 30
        } else if (month >= 9 && month <= 11) {
          start = new Date(year, 9, 1); // October 1
          end = new Date(year, 11, 31); // December 31
        } else {
          start = new Date(year, 0, 1); // January 1
          end = new Date(year, 2, 31); // March 31
        }
        break;

      case "year":
        if (month < 3) {
          start = new Date(year - 1, 3, 1); // April 1 of previous year
          end = new Date(year, 2, 31); // March 31 of current year
        } else {
          start = new Date(year, 3, 1); // April 1 of current year
          end = new Date(year + 1, 2, 31); // March 31 of next year
        }
        break;

      default:
        return getDateRange("quarter", year);
    }

    return { start, end };
  }, [selectedYear]);

  const getNextDateRange = (period, currentStart) => {
    const start = new Date(currentStart);
    let newStart, newEnd;

    switch (period) {
      case "week":
        newStart = new Date(start);
        newStart.setDate(start.getDate() + 7);
        newEnd = new Date(newStart);
        newEnd.setDate(newStart.getDate() + 6);
        break;

      case "month":
        newStart = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 1, 0);
        break;

      case "quarter":
        {
          const quarterMonth = start.getMonth();
          if (quarterMonth >= 0 && quarterMonth <= 2) {
            // Q4 -> Q1
            newStart = new Date(start.getFullYear(), 3, 1);
            newEnd = new Date(start.getFullYear(), 5, 30);
          } else if (quarterMonth >= 3 && quarterMonth <= 5) {
            // Q1 -> Q2
            newStart = new Date(start.getFullYear(), 6, 1);
            newEnd = new Date(start.getFullYear(), 8, 30);
          } else if (quarterMonth >= 6 && quarterMonth <= 8) {
            // Q2 -> Q3
            newStart = new Date(start.getFullYear(), 9, 1);
            newEnd = new Date(start.getFullYear(), 11, 31);
          } else {
            // Q3 -> Q4
            newStart = new Date(start.getFullYear() + 1, 0, 1);
            newEnd = new Date(start.getFullYear() + 1, 2, 31);
          }
        }
        break;

      case "year":
        newStart = new Date(start.getFullYear() + 1, 3, 1);
        newEnd = new Date(start.getFullYear() + 2, 2, 31);
        break;

      default:
        return getDateRange(period, selectedYear);
    }

    return { start: newStart, end: newEnd };
  };

  const getPrevDateRange = useCallback((period, currentStart) => {
    const start = new Date(currentStart);
    let newStart, newEnd;

    switch (period) {
      case "week":
        newStart = new Date(start);
        newStart.setDate(start.getDate() - 7);
        newEnd = new Date(newStart);
        newEnd.setDate(newStart.getDate() + 6);
        break;

      case "month":
        newStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
        newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 1, 0);
        break;

      case "quarter":
        {
          const quarterMonth = start.getMonth();
          if (quarterMonth >= 0 && quarterMonth <= 2) {
            newStart = new Date(start.getFullYear() - 1, 9, 1);
            newEnd = new Date(start.getFullYear() - 1, 11, 31);
          } else if (quarterMonth >= 3 && quarterMonth <= 5) {
            newStart = new Date(start.getFullYear(), 0, 1);
            newEnd = new Date(start.getFullYear(), 2, 31);
          } else if (quarterMonth >= 6 && quarterMonth <= 8) {
            newStart = new Date(start.getFullYear(), 3, 1);
            newEnd = new Date(start.getFullYear(), 5, 30);
          } else {
            newStart = new Date(start.getFullYear(), 6, 1);
            newEnd = new Date(start.getFullYear(), 8, 30);
          }
        }
        break;

      case "year":
        newStart = new Date(start.getFullYear() - 1, 3, 1);
        newEnd = new Date(start.getFullYear(), 2, 31);
        break;

      default:
        return getDateRange(period, selectedYear);
    }

    return { start: newStart, end: newEnd };
  }, [selectedYear, getDateRange]);

  const updatePeriodInfo = useCallback((range, isCurrentPeriod = true) => {
    const { start, end } = range;
    let info = "";
    const now = new Date();
    const isCurrent = isCurrentPeriod && start <= now && end >= now;

    switch (timePeriod) {
      case "week":
        info = `${
          isCurrent ? "Current " : ""
        }Week: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
        break;
      case "month":
        info = `${isCurrent ? "Current " : ""}Month: ${start.toLocaleDateString(
          "default",
          { month: "long" }
        )} ${start.getFullYear()}`;
        break;
      case "quarter":
        {
          const month = start.getMonth();
          let quarter, quarterMonths;

          if (month >= 3 && month <= 5) {
            quarter = "Q1";
            quarterMonths = "Apr-Jun";
          } else if (month >= 6 && month <= 8) {
            quarter = "Q2";
            quarterMonths = "Jul-Sep";
          } else if (month >= 9 && month <= 11) {
            quarter = "Q3";
            quarterMonths = "Oct-Dec";
          } else {
            quarter = "Q4";
            quarterMonths = "Jan-Mar";
          }

          info = `${quarter} (${quarterMonths}) ${start.getFullYear()}`;
        }
        break;
      case "year":
        info = `Fiscal Year: ${start.getFullYear()}-${end.getFullYear()}`;
        break;
      default:
        info = `${getCurrentQuarter()}`;
    }

    setCurrentPeriodInfo(info);
  }, [timePeriod]);

  const processLdData = useCallback((trainersData, sessionsData, invoicesData, assignmentsData, trainingFormsData, dateRange, selectedUserFilter) => {
    const specializations = {};
    const domains = {};
    const statuses = {};
    const courses = {};
    const trainerPerformance = {};
    const recentActivity = [];
    const revenueByDate = {};
    const chartData = [];
    const timePoints =
      timePeriod === "week"
        ? 7
        : timePeriod === "month"
        ? 4
        : timePeriod === "quarter"
        ? 3
        : 12;

    let totalTrainers = 0;
    let activeStudents = 0;
    let trainingSessions = 0;
    let trainingRevenue = 0;
    let completionRate = 0;
    let activePrograms = 0;
    let totalTrainingHours = 0;
    const processedForms = new Set();

    // Create a set of colleges assigned to the selected user for filtering recent activity
    const userAssignedColleges = new Set();
    if (selectedUserFilter && selectedUserFilter !== "all") {
      trainingFormsData.forEach((training) => {
        if (training.originalFormData?.assignedTo?.uid === selectedUserFilter) {
          userAssignedColleges.add(training.collegeName);
        }
      });
    }

    // Process trainers
    trainersData.forEach((trainer) => {
      totalTrainers++;
      const spec = trainer.specialization || "Other";
      specializations[spec] = (specializations[spec] || 0) + 1;

      if (!trainerPerformance[trainer.id]) {
        trainerPerformance[trainer.id] = {
          id: trainer.id,
          name: trainer.name,
          value: 0,
          specialization: spec,
        };
      }
    });

    // Process training sessions
    sessionsData.forEach((session) => {
      // Removed activeStudents count from sessions - now counted from training forms

      const course = session.courseType || "Other";
      courses[course] = (courses[course] || 0) + (session.studentCount || 0);

      if (session.createdAt) {
        let createdDate;
        if (typeof session.createdAt === 'string' && session.createdAt.includes('/')) {
          const [day, month, year] = session.createdAt.split('/');
          createdDate = new Date(year, month - 1, day);
        } else {
          createdDate = new Date(session.createdAt);
        }
        let dateKey;
        if (timePeriod === "week") {
          dateKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
            createdDate.getDay()
          ];
        } else if (timePeriod === "month") {
          const firstDay = new Date(
            createdDate.getFullYear(),
            createdDate.getMonth(),
            1
          );
          const pastDaysOfMonth = createdDate.getDate() - 1;
          dateKey = `Week ${
            Math.floor((firstDay.getDay() + pastDaysOfMonth) / 7) + 1
          }`;
        } else if (timePeriod === "quarter") {
          const startMonth = dateRange?.start?.getMonth?.() ?? 3;
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
          if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 2) monthIdx = 0;
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

        if (!revenueByDate[dateKey]) {
          revenueByDate[dateKey] = { revenue: 0, sessionCount: 0, cost: 0 };
        }
        revenueByDate[dateKey].sessionCount += 1;
        revenueByDate[dateKey].cost += session.fee || 0;
      }

      let createdDate = new Date(session.createdAt);
      if (typeof session.createdAt === 'string' && session.createdAt.includes('/')) {
        const [day, month, year] = session.createdAt.split('/');
        createdDate = new Date(year, month - 1, day);
      }
      let timeStr = Number.isNaN(createdDate.getTime()) ? "" : createdDate.toLocaleDateString();

      // Only add to recent activity if no user filter or college is assigned to selected user
      if (selectedUserFilter === "all" || userAssignedColleges.has(session.collegeName)) {
        recentActivity.push({
          id: session.id,
          action: "Training Session",
          amount: session.fee || null,
          college: session.collegeName,
          trainer: session.trainerName || "Unknown",
          trainerInitials: session.trainerName
            ? session.trainerName.split(" ").map((n) => n[0]).join("")
            : "NA",
          time: timeStr,
        });
      }
    });

    // Process training forms for courses and cost
    trainingFormsData.forEach((training) => {
      const course = training.originalFormData?.course || "Other";
      courses[course] = (courses[course] || 0) + 1; // Count trainings per course

      const status = getPhaseStatus(training);
      statuses[status] = (statuses[status] || 0) + 1;

      // Accumulate revenue from main form totalCost (only once per form)
      if (!processedForms.has(training.trainingId)) {
        trainingRevenue += training.originalFormData.totalCost || 0;
        // Count students from training contracts instead of sessions
        activeStudents += training.originalFormData.studentCount || training.studentCount || 0;
        activePrograms += 1; // Count each unique training program
        processedForms.add(training.trainingId);
      }

      // Accumulate total training hours from training forms (same as InitiationDashboard)
      totalTrainingHours += training.totaltraininghours || 0;

      // Accumulate cost from phase totalCost
      const startDate = training.trainingStartDate;
      if (startDate) {
        const trainingStart = new Date(startDate);

        let dateKey;
        if (timePeriod === "week") {
          dateKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
            trainingStart.getDay()
          ];
        } else if (timePeriod === "month") {
          const firstDay = new Date(
            trainingStart.getFullYear(),
            trainingStart.getMonth(),
            1
          );
          const pastDaysOfMonth = trainingStart.getDate() - 1;
          dateKey = `Week ${
            Math.floor((firstDay.getDay() + pastDaysOfMonth) / 7) + 1
          }`;
        } else if (timePeriod === "quarter") {
          const startMonth = dateRange?.start?.getMonth?.() ?? 3;
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
          let monthIdx = trainingStart.getMonth() - startMonth;
          if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 2) monthIdx = 0;
          dateKey = months[monthIdx];
        } else {
          const month = trainingStart.getMonth();
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

        if (!revenueByDate[dateKey]) {
          revenueByDate[dateKey] = { revenue: 0, sessionCount: 0, cost: 0 };
        }
        revenueByDate[dateKey].revenue += training.originalFormData.totalCost || 0;
        revenueByDate[dateKey].cost += training.totalCost || 0;
      }
    });

    // Process trainer assignments
    assignmentsData.forEach((assignment) => {
      if (selectedUserFilter === "all" || userAssignedColleges.has(assignment.collegeName)) {
        trainingSessions++;

        if (trainerPerformance[assignment.trainerId]) {
          trainerPerformance[assignment.trainerId].value++;
        }
      }

      const domain = assignment.domain || "Other";
      domains[domain] = (domains[domain] || 0) + 1;

      let createdDate = new Date(assignment.createdAt);
      if (typeof assignment.createdAt === 'string' && assignment.createdAt.includes('/')) {
        const [day, month, year] = assignment.createdAt.split('/');
        createdDate = new Date(year, month - 1, day);
      }
      let timeStr = Number.isNaN(createdDate.getTime()) ? assignment.date : createdDate.toLocaleDateString();

      // Only add to recent activity if no user filter or college is assigned to selected user
      if (selectedUserFilter === "all" || userAssignedColleges.has(assignment.collegeName)) {
        recentActivity.push({
          id: assignment.id,
          action: "Training Assignment",
          amount: null,
          college: assignment.collegeName,
          trainer: assignment.trainerName || "Unknown",
          trainerInitials: assignment.trainerName
            ? assignment.trainerName.split(" ").map((n) => n[0]).join("")
            : "NA",
          time: timeStr,
        });
      }
    });

    // Process invoices
    invoicesData.forEach((invoice) => {
      trainingRevenue += invoice.amount || 0;
      if (invoice.createdAt) {
        let createdDate;
        if (typeof invoice.createdAt === 'string' && invoice.createdAt.includes('/')) {
          const [day, month, year] = invoice.createdAt.split('/');
          createdDate = new Date(year, month - 1, day);
        } else {
          createdDate = new Date(invoice.createdAt);
        }
        let dateKey;
        if (timePeriod === "week") {
          dateKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
            createdDate.getDay()
          ];
        } else if (timePeriod === "month") {
          const firstDay = new Date(
            createdDate.getFullYear(),
            createdDate.getMonth(),
            1
          );
          const pastDaysOfMonth = createdDate.getDate() - 1;
          dateKey = `Week ${
            Math.floor((firstDay.getDay() + pastDaysOfMonth) / 7) + 1
          }`;
        } else if (timePeriod === "quarter") {
          const startMonth = dateRange?.start?.getMonth?.() ?? 3;
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
          if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 2) monthIdx = 0;
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

        if (!revenueByDate[dateKey]) {
          revenueByDate[dateKey] = { revenue: 0, sessionCount: 0, cost: 0 };
        }
        revenueByDate[dateKey].revenue += invoice.amount || 0;
      }
    });

    // Calculate completion rate (simplified)
    completionRate = trainingSessions > 0 ? (activeStudents / (trainingSessions * 20)) * 100 : 0; // Assuming avg 20 students per session

    // Generate chart data
    for (let i = 0; i < timePoints; i++) {
      let dateKey;
      let months;
      if (timePeriod === "week") {
        dateKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i];
      } else if (timePeriod === "month") {
        dateKey = `Week ${i + 1}`;
      } else if (timePeriod === "quarter") {
        const startMonth = dateRange?.start?.getMonth?.() ?? 3;
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
            new Date(2000, quarterStart, 1).toLocaleString("default", {
              month: "short",
            }),
            new Date(2000, quarterStart + 1, 1).toLocaleString("default", {
              month: "short",
            }),
            new Date(2000, quarterStart + 2, 1).toLocaleString("default", {
              month: "short",
            }),
          ];
        }
        dateKey = months[i];
      } else {
        const fiscalMonths = [
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
        ];
        dateKey = fiscalMonths[i];
      }

      let isCurrentMonth = false;

      if (timePeriod === "quarter" || timePeriod === "year") {
        const now = new Date();
        const currentMonth = now.getMonth();

        if (timePeriod === "year") {
          const fiscalMonthIndex =
            currentMonth < 3 ? currentMonth + 9 : currentMonth - 3;
          isCurrentMonth = i === fiscalMonthIndex;
        } else if (timePeriod === "quarter") {
          const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
          isCurrentMonth = currentMonth - quarterStartMonth === i;
        }
      }

      chartData.push({
        name: dateKey,
        revenue: revenueByDate[dateKey]?.revenue || 0,
        cost: revenueByDate[dateKey]?.cost || 0,
        sessionCount: revenueByDate[dateKey]?.sessionCount || 0,
        currentMonth: isCurrentMonth,
      });
    }

    return {
      totalTrainers,
      activeStudents,
      trainingSessions,
      trainingRevenue,
      completionRate,
      activePrograms,
      totalTrainingHours,
      chartData,
      specializations: Object.entries(specializations).map(([name, value]) => ({ name, value })),
      domains: Object.entries(domains).map(([name, value]) => ({ name, value })),
      statuses: Object.entries(statuses).map(([name, value]) => ({ name, value })),
      courses: Object.entries(courses).map(([name, value]) => ({ name, value })),
      trainerPerformance: Object.values(trainerPerformance).sort(
        (a, b) => b.value - a.value
      ).filter(trainer => trainer.value > 0),
      recentActivity: recentActivity
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
    };
  }, [timePeriod]);

  const fetchAllTrainers = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const trainersRef = collection(db, "trainers");
      
      let trainersQuery;
      if (currentUser?.department === "learning") {
        trainersQuery = query(trainersRef, where("department", "==", "learning"));
      } else if (currentUser?.department === "Admin") {
        trainersQuery = query(trainersRef);
      } else {
        trainersQuery = query(
          trainersRef,
          where("department", "==", currentUser?.department || "")
        );
      }

      const trainersSnapshot = await getDocs(trainersQuery);
      
      const trainersData = trainersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTrainers(trainersData);
    } catch (error) {
      console.error("Error fetching trainers:", error);
      setError("Failed to load trainers. Please try again.");
      setTrainers([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.department]);

  // Fetch available users based on current user's permissions
  useEffect(() => {
    const fetchAvailableUsers = async () => {
      if (!currentUser) return;

      try {
        let q;

        // Directors and Heads can see the filter, but it should only show L&D and Admin users
        if (currentUser.role === "Director" || currentUser.role === "Head") {
          q = query(collection(db, "users")); // Fetch all users, then filter client-side
        }
        // L&D department users can see all L&D users (including themselves)
        else if (currentUser.department === "L & D") {
          q = query(
            collection(db, "users"),
            where("department", "==", "L & D")
          );
        }
        // Everyone else can only see themselves (no filter dropdown)
        else {
          q = query(collection(db, "users"), where("uid", "==", currentUser.uid));
        }

        const usersSnap = await getDocs(q);
        let users = usersSnap.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));

        // For Directors and Heads, filter to only include L&D and Admin departments
        if (currentUser.role === "Director" || currentUser.role === "Head") {
          users = users.filter(
            (u) => u.department === "L & D" || u.department === "Admin"
          );
        }

        setAvailableUsers(users);

        // Set default selected user filter based on role if not already set
        if (!selectedUserFilter) {
          setSelectedUserFilter(defaultSelectedUserFilter);
        }
      } catch {
        // Error fetching available users
      }
    };

    fetchAvailableUsers();
  }, [currentUser, selectedUserFilter, defaultSelectedUserFilter]);

  const fetchDataForRange = useCallback(async (range) => {
    setIsLoading(true);

    try {
      // Fetch trainers
      const trainersRef = collection(db, "trainers");
      const trainersSnapshot = await getDocs(trainersRef);
      let trainersData = trainersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch training sessions
      const sessionsRef = collection(db, "training_sessions");
      const sessionsSnapshot = await getDocs(sessionsRef);
      let sessionsData = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch contract invoices
      const invoicesRef = collection(db, "contract_invoices");
      const invoicesSnapshot = await getDocs(invoicesRef);
      let invoicesData = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch trainer assignments
      const assignmentsRef = collection(db, "trainerAssignments");
      const assignmentsSnapshot = await getDocs(assignmentsRef);
      let fullAssignmentsData = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch training forms and their phases
      const trainingFormsRef = collection(db, "trainingForms");
      const trainingFormsSnapshot = await getDocs(trainingFormsRef);
      let trainingFormsData = [];
      for (const formDoc of trainingFormsSnapshot.docs) {
        const formData = formDoc.data();
        const phasesSnap = await getDocs(collection(db, "trainingForms", formDoc.id, "trainings"));
        for (const phaseDoc of phasesSnap.docs) {
          const phaseData = phaseDoc.data();
          const training = {
            id: `${formDoc.id}_${phaseDoc.id}`,
            trainingId: formDoc.id,
            phaseId: phaseDoc.id,
            collegeName: formData.collegeName,
            projectCode: formData.projectCode || formData.collegeCode,
            ...phaseData,
            originalFormData: formData,
          };
          training.computedStatus = getPhaseStatus(training).status;
          trainingFormsData.push(training);
        }
      }

      // Calculate overall total training hours from ALL data (before any filtering)
      const overallTotalTrainingHours = trainingFormsData.reduce((acc, training) => acc + (training.totaltraininghours || 0), 0);

      // Filter by selected user (if not showing all)
      if (selectedUserFilter && selectedUserFilter !== "all") {
        trainingFormsData = trainingFormsData.filter(training => {
          // Check if any phase is assigned to the selected user
          return training.originalFormData?.assignedTo?.uid === selectedUserFilter;
        });
      }

      // Filter by date range (using training start and end dates from phases)
      trainingFormsData = trainingFormsData.filter(training => {
        const startDate = training.trainingStartDate;
        const endDate = training.trainingEndDate;
        if (!startDate || !endDate) return true;
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Check if training period overlaps with the selected date range
        return end >= range.start && start <= range.end;
      });

      // Filter by date range
      sessionsData = sessionsData.filter(session => {
        if (!session.createdAt) return true;
        let created;
        if (typeof session.createdAt === 'string' && session.createdAt.includes('/')) {
          // Parse DD/MM/YYYY format
          const [day, month, year] = session.createdAt.split('/');
          created = new Date(year, month - 1, day);
        } else {
          created = new Date(session.createdAt);
        }
        return created >= range.start && created <= range.end;
      });

      invoicesData = invoicesData.filter(invoice => {
        if (!invoice.createdAt) return true;
        let created;
        if (typeof invoice.createdAt === 'string' && invoice.createdAt.includes('/')) {
          const [day, month, year] = invoice.createdAt.split('/');
          created = new Date(year, month - 1, day);
        } else {
          created = new Date(invoice.createdAt);
        }
        return created >= range.start && created <= range.end;
      });

      let assignmentsData = fullAssignmentsData.filter(assignment => {
        let assignmentDate;
        if (typeof assignment.date === 'string' && assignment.date.includes('/')) {
          const [day, month, year] = assignment.date.split('/');
          assignmentDate = new Date(year, month - 1, day);
        } else {
          assignmentDate = new Date(assignment.date);
        }
        return assignmentDate >= range.start && assignmentDate <= range.end;
      });

      const currentData = processLdData(trainersData, sessionsData, invoicesData, assignmentsData, trainingFormsData, range, selectedUserFilter);

      // Fetch previous period data
      const prevRange = getPrevDateRange(timePeriod, range.start);
      let prevSessions = sessionsData.filter(session => {
        if (!session.createdAt) return false;
        let created;
        if (typeof session.createdAt === 'string' && session.createdAt.includes('/')) {
          const [day, month, year] = session.createdAt.split('/');
          created = new Date(year, month - 1, day);
        } else {
          created = new Date(session.createdAt);
        }
        return created >= prevRange.start && created <= prevRange.end;
      });

      let prevInvoices = invoicesData.filter(invoice => {
        if (!invoice.createdAt) return false;
        let created;
        if (typeof invoice.createdAt === 'string' && invoice.createdAt.includes('/')) {
          const [day, month, year] = invoice.createdAt.split('/');
          created = new Date(year, month - 1, day);
        } else {
          created = new Date(invoice.createdAt);
        }
        return created >= prevRange.start && created <= prevRange.end;
      });

      let prevAssignments = fullAssignmentsData.filter(assignment => {
        let assignmentDate;
        if (typeof assignment.date === 'string' && assignment.date.includes('/')) {
          const [day, month, year] = assignment.date.split('/');
          assignmentDate = new Date(year, month - 1, day);
        } else {
          assignmentDate = new Date(assignment.date);
        }
        return assignmentDate >= prevRange.start && assignmentDate <= prevRange.end;
      });

      let prevTrainingForms = trainingFormsData.filter(training => {
        const startDate = training.trainingStartDate;
        const endDate = training.trainingEndDate;
        if (!startDate || !endDate) return false;
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Check if training period overlaps with the previous date range
        return end >= prevRange.start && start <= prevRange.end;
      });

      // Add computedStatus to previous training forms
      prevTrainingForms = prevTrainingForms.map(training => ({
        ...training,
        computedStatus: getPhaseStatus(training).status
      }));

      const prevData = processLdData(trainersData, prevSessions, prevInvoices, prevAssignments, prevTrainingForms, prevRange, selectedUserFilter);

      const mergedData = {
        ...currentData,
        totalTrainersPrev: prevData.totalTrainers,
        activeStudentsPrev: prevData.activeStudents,
        trainingSessionsPrev: prevData.trainingSessions,
        trainingRevenuePrev: prevData.trainingRevenue,
        completionRatePrev: prevData.completionRate,
        activeProgramsPrev: prevData.activePrograms,
        totalTrainingHoursPrev: prevData.totalTrainingHours,
        overallTotalTrainingHours,
      };

      setDashboardData(mergedData);
    } catch (error) {
      console.error("Error fetching data for range:", error);
      setError("Failed to load dashboard data. Please try again.");
      setDashboardData({
        totalTrainers: 0,
        totalTrainersPrev: 0,
        activeStudents: 0,
        activeStudentsPrev: 0,
        trainingSessions: 0,
        trainingSessionsPrev: 0,
        trainingRevenue: 0,
        trainingRevenuePrev: 0,
        completionRate: 0,
        completionRatePrev: 0,
        activePrograms: 0,
        activeProgramsPrev: 0,
        totalTrainingHours: 0,
        totalTrainingHoursPrev: 0,
        overallTotalTrainingHours: 0,
        chartData: [],
        specializations: [],
        domains: [],
        statuses: [],
        courses: [],
        trainerPerformance: [],
        recentActivity: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [timePeriod, processLdData, getPrevDateRange, selectedUserFilter]);

  const handleNextPeriod = () => {
    const newRange = getNextDateRange(timePeriod, currentDateRange.start);
    setCurrentDateRange(newRange);
    updatePeriodInfo(newRange);
    fetchDataForRange(newRange);
  };

  const handlePrevPeriod = () => {
    const newRange = getPrevDateRange(timePeriod, currentDateRange.start);
    setCurrentDateRange(newRange);
    updatePeriodInfo(newRange);
    fetchDataForRange(newRange);
  };

  const handleRefresh = () => {
    const newRange = getDateRange(timePeriod, selectedYear);
    setCurrentDateRange(newRange);
    updatePeriodInfo(newRange);
    fetchDataForRange(newRange);
  };

  // Persist selected user filter
  useEffect(() => {
    try {
      localStorage.setItem("ld_dashboard_selectedUserFilter", selectedUserFilter);
    } catch (error) {
      console.error("Error persisting selected user filter:", error);
    }
  }, [selectedUserFilter]);

  useEffect(() => {
    fetchAllTrainers();
    const initialRange = getDateRange(timePeriod, selectedYear);
    setCurrentDateRange(initialRange);
    updatePeriodInfo(initialRange);
    fetchDataForRange(initialRange);
  }, [fetchAllTrainers, fetchDataForRange, getDateRange, selectedYear, timePeriod, updatePeriodInfo]);

  useEffect(() => {
    if (trainers.length === 0) return;
    const newRange = getDateRange(timePeriod, selectedYear);
    setCurrentDateRange(newRange);
    updatePeriodInfo(newRange);
    fetchDataForRange(newRange);
  }, [timePeriod, trainers, filters, selectedYear, fetchDataForRange, getDateRange, updatePeriodInfo, selectedUserFilter]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setIsUserFilterOpen(false);
      }

      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      ) {
        setIsFilterOpen(false);
      }

      if (
        yearDropdownRef.current &&
        !yearDropdownRef.current.contains(event.target)
      ) {
        setIsYearDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const calculateGrowth = (current, previous) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / previous) * 100;
  };

  const metrics = useMemo(() => [
    {
      title: "Total Trainers",
      value: dashboardData.totalTrainers.toLocaleString(),
      change: calculateGrowth(dashboardData.totalTrainers, dashboardData.totalTrainersPrev),
      icon: <FiUsers className="text-white" size={16} />,
      color: "bg-indigo-600",
    },
    {
      title: "Total Training Hours",
      value: dashboardData.totalTrainingHours.toLocaleString(),
      change: calculateGrowth(dashboardData.totalTrainingHours, dashboardData.totalTrainingHoursPrev),
      icon: <FiBookOpen className="text-white" size={16} />,
      color: "bg-green-600",
    },
    {
      title: "Training Sessions",
      value: dashboardData.trainingSessions.toLocaleString(),
      change: calculateGrowth(dashboardData.trainingSessions, dashboardData.trainingSessionsPrev),
      icon: <FiAward className="text-white" size={16} />,
      color: "bg-blue-600",
    },
    {
      title: "TCV",
      value: formatCurrency(dashboardData.trainingRevenue),
      change: calculateGrowth(dashboardData.trainingRevenue, dashboardData.trainingRevenuePrev),
      icon: <FaRupeeSign className="text-white" size={16} />,
      color: "bg-purple-600",
    },
    {
      title: "Completion Rate",
      value: `${dashboardData.completionRate.toFixed(1)}%`,
      change: calculateGrowth(dashboardData.completionRate, dashboardData.completionRatePrev),
      icon: <FiTrendingUp className="text-white" size={16} />,
      color: "bg-orange-600",
    },
  ], [dashboardData]);

  const handleTrainerClick = async (trainer) => {
    setIsModalOpen(true);
    setModalTrainer(trainer);
    setModalSessions([]);

    try {
      const assignmentsRef = collection(db, "trainerAssignments");
      const assignmentsQuery = query(assignmentsRef, where("trainerId", "==", trainer.id));
      const snapshot = await getDocs(assignmentsQuery);
      let assignments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Apply user filter if not showing all users
      if (selectedUserFilter && selectedUserFilter !== "all") {
        // Get training forms to determine which colleges are assigned to the selected user
        const trainingFormsRef = collection(db, "trainingForms");
        const trainingFormsSnapshot = await getDocs(trainingFormsRef);
        const userAssignedColleges = new Set();

        trainingFormsSnapshot.docs.forEach((formDoc) => {
          const formData = formDoc.data();
          if (formData.assignedTo?.uid === selectedUserFilter) {
            userAssignedColleges.add(formData.collegeName);
          }
        });

        // Filter assignments to only include colleges assigned to the selected user
        assignments = assignments.filter(assignment =>
          userAssignedColleges.has(assignment.collegeName)
        );
      }

      // Apply date range filtering (same logic as dashboard)
      if (currentDateRange && currentDateRange.start && currentDateRange.end) {
        assignments = assignments.filter(assignment => {
          let assignmentDate;
          if (typeof assignment.date === 'string' && assignment.date.includes('/')) {
            const [day, month, year] = assignment.date.split('/');
            assignmentDate = new Date(year, month - 1, day);
          } else {
            assignmentDate = new Date(assignment.date);
          }
          return assignmentDate >= currentDateRange.start && assignmentDate <= currentDateRange.end;
        });
      }

      setModalSessions(assignments);
    } catch {
      setModalSessions([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="mx-auto max-w-8xl w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Learning & Development Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Key metrics and performance indicators for training programs
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
          </div>

          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Year:</span>
              <div className="relative year-dropdown" ref={yearDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 flex items-center gap-2"
                  aria-expanded={isYearDropdownOpen}
                  aria-haspopup="listbox"
                  aria-label="Select year"
                >
                  <span>{selectedYear}</span>
                  {isYearDropdownOpen ? (
                    <FiChevronUp className="text-gray-500 h-4 w-4" />
                  ) : (
                    <FiChevronDown className="text-gray-500 h-4 w-4" />
                  )}
                </button>

                {isYearDropdownOpen && (
                  <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-48 overflow-y-auto">
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - 5 + i;
                      const currentYear = new Date().getFullYear();
                      return (
                        <button
                          key={year}
                          type="button"
                          onClick={() => {
                            setSelectedYear(year);
                            setIsYearDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                            selectedYear === year ? 'text-indigo-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {year === currentYear && (
                            <span className="text-blue-500 text-xs">●</span>
                          )}
                          <span className={year === currentYear ? 'ml-0' : 'ml-4'}>
                            {year}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setIsUserFilterOpen(!isUserFilterOpen)}
                className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                aria-expanded={isUserFilterOpen}
                aria-haspopup="listbox"
                aria-label="Select user filter"
              >
                <FiUsers className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {selectedUserFilter === "all" ? "All Users" : 
                   availableUsers.find(u => u.uid === selectedUserFilter)?.name || "Select User"}
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
                      onClick={() => {
                        setSelectedUserFilter("all");
                        setIsUserFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        selectedUserFilter === "all"
                          ? "bg-indigo-100 text-indigo-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      All Users
                    </button>
                    {ldUsers.map((user) => (
                      <button
                        type="button"
                        key={user.uid}
                        onClick={() => {
                          setSelectedUserFilter(user.uid);
                          setIsUserFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          selectedUserFilter === user.uid
                            ? "bg-indigo-100 text-indigo-700"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {user.name || user.email || user.uid}
                        {user.department && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({user.department})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                aria-expanded={isFilterOpen}
                aria-haspopup="listbox"
                aria-label="Select time period filter"
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
                    {[
                      { value: "week", label: "This Week" },
                      { value: "month", label: "This Month" },
                      { value: "quarter", label: "Current Quarter" },
                      { value: "year", label: "This Year" },
                    ].map((period) => (
                      <button
                        type="button"
                        key={period.value}
                        onClick={() => {
                          setTimePeriod(period.value);
                          setIsFilterOpen(false);
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

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 font-medium">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="w-full overflow-x-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 min-w-0">
            {metrics.map((metric, index) => (
              <div
                key={index}
                className={`${metric.color} rounded-xl p-5 text-white transition-all hover:shadow-lg`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium opacity-80">
                      {metric.title}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <h3
                        className="text-2xl font-bold truncate"
                        style={{ maxWidth: "140px", display: "block" }}
                        title={metric.value}
                      >
                        {metric.value}
                      </h3>
                      {metric.title === "Total Training Hours" && dashboardData.overallTotalTrainingHours && (
                        <div 
                          className="bg-black bg-opacity-20 rounded-full px-2 py-1 text-xs font-medium"
                          title="Overall Training Hours"
                        >
                          {dashboardData.overallTotalTrainingHours.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-black bg-opacity-20 p-1 rounded-lg">
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
            ))}
          </div>
        </div>

        {/* Charts & Distribution */}
        <div className="w-full overflow-x-auto">
          <div className="bg-white p-3 md:p-5 rounded-xl border border-gray-200 shadow-sm mb-6 min-w-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                TCV & Cost Trend
              </h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-indigo-600 rounded"></div>
                  <span className="text-sm text-gray-600">TCV</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-sm text-gray-600">Cost</span>
                </div>
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
                    margin={{ top: 10, right: 30, left: 30, bottom: 0 }}
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
                      <linearGradient
                        id="colorCost"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#EF4444"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#EF4444"
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
                        if (timePeriod === "quarter" || timePeriod === "year") {
                          return `${value} ${currentDateRange.start.getFullYear()}`;
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
                      dataKey="revenue"
                      stroke="#4F46E5"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="#EF4444"
                      fillOpacity={1}
                      fill="url(#colorCost)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 min-w-0">
            <div className="bg-white p-2 md:p-3 rounded-xl border border-gray-200 shadow-sm min-w-0">
              <h3 className="text-md font-semibold text-gray-800 mb-3">
                Trainer Domains
              </h3>
              <SpecializationDistribution
                specializations={dashboardData.domains}
                isLoading={isLoading}
              />
            </div>
            <div className="bg-white p-2 md:p-3 rounded-xl border border-gray-200 shadow-sm min-w-0">
              <h3 className="text-md font-semibold text-gray-800 mb-3">
                Course Distribution
              </h3>
              <CourseDistribution
                courses={dashboardData.courses}
                isLoading={isLoading}
              />
            </div>
            <div className="bg-white p-2 md:p-3 rounded-xl border border-gray-200 shadow-sm min-w-0">
              <h3 className="text-md font-semibold text-gray-800 mb-3">
                Training Status
              </h3>
              <TrainingStatus
                statuses={dashboardData.statuses}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Performance & Activity */}
        <div className="w-full overflow-x-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
            <div className="bg-white p-3 md:p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Trainer Performance
              </h2>
              <TrainerPerformance
                trainerPerformance={dashboardData.trainerPerformance}
                isLoading={isLoading}
                onMemberClick={handleTrainerClick}
              />
            </div>
            <div className="bg-white p-3 md:p-5 rounded-xl border border-gray-200 shadow-sm min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Training Activity
              </h2>
              <RecentActivity
                recentActivity={dashboardData.recentActivity}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Modal for showing training sessions */}
        <ReactModal
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
          ariaHideApp={false}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName="fixed inset-0 bg-gradient-to-br from-gray-900/40 to-indigo-200/30 backdrop-blur-sm transition-all"
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 p-0 flex flex-col overflow-hidden animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            style={{ maxHeight: "600px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-white via-gray-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 text-indigo-600 rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-sm">
                  {modalTrainer?.name?.[0] || "?"}
                </div>
                <div>
                  <h3
                    id="modal-title"
                    className="text-lg md:text-xl font-semibold text-gray-900"
                  >
                    Assignments by {modalTrainer?.name}
                  </h3>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    Total: <span className="text-indigo-600 font-bold">{modalSessions.length}</span>
                  </div>
                </div>
              </div>
              <button
                className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                aria-label="Close"
                onClick={() => setIsModalOpen(false)}
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Table */}
            <div className="px-6 py-4 bg-white flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              <div className="overflow-x-auto">
                {modalSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-base font-medium">No assignments found.</span>
                  </div>
                ) : (
                  <table className="min-w-full text-sm md:text-base">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">College</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">Domain</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">Date</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalSessions.map((assignment) => (
                        <tr
                          key={assignment.id}
                          className="hover:bg-indigo-50 transition-colors group"
                        >
                          <td className="px-3 py-2 text-gray-900 font-medium truncate" style={{ maxWidth: "200px" }} title={assignment.collegeName || "-"}>
                            {assignment.collegeName || "-"}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {assignment.domain || "-"}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {assignment.date || "-"}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {assignment.dayDuration || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gradient-to-r from-white via-gray-50 to-indigo-50 border-t border-gray-100 flex justify-end">
              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
                onClick={() => setIsModalOpen(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>
          </div>
        </ReactModal>
      </div>
    </div>
  );
};

export default LdDashboard;
