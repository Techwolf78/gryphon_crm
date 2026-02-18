import { useState, useEffect, useRef } from "react";
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
  FiThermometer,
  FiCalendar,
  FiRefreshCw,
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

const formatNumber = (num) => {
  const number = Number(num);
  if (number >= 10000000) { // 1 crore
    const crores = number / 10000000;
    if (crores >= 100) return `${Math.floor(crores)}CR`;
    if (crores >= 10) return `${crores.toFixed(0)}CR`;
    return `${crores.toFixed(1).replace(/\.0$/, '')}CR`;
  } else if (number >= 100000) { // 1 lakh
    const lakhs = number / 100000;
    if (lakhs >= 10) return `${lakhs.toFixed(0)}L`;
    return `${lakhs.toFixed(1).replace(/\.0$/, '')}L`;
  } else if (number >= 1000) { // 1 thousand
    const thousands = number / 1000;
    if (thousands >= 10) return `${thousands.toFixed(0)}k`;
    return `${thousands.toFixed(1).replace(/\.0$/, '')}k`;
  } else {
    return number.toString();
  }
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
          Revenue: {formatCurrency(payload[0].value)}
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

const TeamPerformance = ({
  teamPerformance,
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
          key={member.id}
          className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          onClick={() => onMemberClick && onMemberClick(member)}
        >
          <div className="flex items-center flex-1">
            <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-medium">
              {member.name.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{member.name}</p>
              <p className="text-xs text-gray-500">{member.role}</p>
            </div>
          </div>
          <div className="flex items-center justify-center mx-4">
            {member.closedRevenue > 0 && (
              <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium">
                CL {formatNumber(member.closedRevenue)}
              </span>
            )}
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
      closedRevenue: PropTypes.number,
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
    <div className="space-y-3">
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
                    <FiUsers size={16} />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.action}
                  </p>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {activity.userInitials}
                  </span>
                </div>
                <p
                  className="text-xs text-gray-500 mt-0.5 truncate"
                  style={{ maxWidth: "180px" }} // You can adjust this width as needed
                  title={activity.company}
                >
                  {activity.company}
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
      company: PropTypes.string,
      time: PropTypes.string,
      user: PropTypes.string,
      userInitials: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
};

RecentActivity.defaultProps = {
  recentActivity: [],
  isLoading: false,
};
const EducationDistribution = ({ leadCategories, isLoading }) => {
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
    !leadCategories ||
    leadCategories.length === 0 ||
    leadCategories.reduce((sum, cat) => sum + cat.value, 0) === 0
  ) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-gray-500">No education data available</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap justify-center gap-2">
        {leadCategories.map((category, index) => (
          <div key={index} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-gray-600">
              {category.name}: {category.value}
            </span>
          </div>
        ))}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={leadCategories}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {leadCategories.map((entry, index) => (
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

EducationDistribution.propTypes = {
  leadCategories: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
    })
  ),
  isLoading: PropTypes.bool,
};

EducationDistribution.defaultProps = {
  leadCategories: [],
  isLoading: false,
};
const LeadDistribution = ({ leadSources, isLoading }) => {
  // Set colors: Hot = red, Warm = orange, Cold = blue
  const COLORS = ["#EF4444", "#F59E0B", "#3B82F6"]; // Red, Orange, Blue

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
      <div className="h-56 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!leadSources || leadSources.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center">
        <p className="text-gray-500">No lead data available</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap justify-center gap-2">
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
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={leadSources}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={70}
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

const SalesDashboard = ({ filters }) => {
  const userDropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);
  const yearDropdownContainerRef = useRef(null);

  const [timePeriod, setTimePeriod] = useState("quarter");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUserFilterOpen, setIsUserFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dashboardData, setDashboardData] = useState({
    revenue: 0,
    revenuePrevQuarter: 0,
    hotLeads: 0,
    hotLeadsPrevQuarter: 0,
    warmLeads: 0,
    warmLeadsPrevQuarter: 0,
    coldLeads: 0,
    coldLeadsPrevQuarter: 0,
    projectedTCV: 0,
    projectedTCVPrevQuarter: 0,
    chartData: [],
    leadSources: [],
    teamPerformance: [],
    recentActivity: [],
    studentCategories: [],
  });
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("Team");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const currentUser = useAuth()?.user;
  const [currentPeriodInfo, setCurrentPeriodInfo] = useState("");
  const [currentDateRange, setCurrentDateRange] = useState({
    start: new Date(),
    end: new Date(),
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLeads, setModalLeads] = useState([]);
  const [modalMember, setModalMember] = useState(null);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  const getCurrentQuarter = () => {
    const now = new Date();
    const month = now.getMonth();
    if (month >= 3 && month <= 5) return "Q1 (Apr-Jun)";
    if (month >= 6 && month <= 8) return "Q2 (Jul-Sep)";
    if (month >= 9 && month <= 11) return "Q3 (Oct-Dec)";
    return "Q4 (Jan-Mar)";
  };

  const getDateRange = (period, year = selectedYear) => {
    // Handle lifetime selection - return a very wide range
    if (year === "lifetime") {
      return {
        start: new Date(2000, 0, 1), // Start from year 2000
        end: new Date(2100, 11, 31), // End in year 2100
      };
    }

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
  };

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

  const getPrevDateRange = (period, currentStart) => {
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
  };

  const updatePeriodInfo = (range, isCurrentPeriod = true) => {
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
  };

  const processLeadsData = (input, dateRange) => {
    const leadCategories = {
      Engineering: 0,
      MBA: 0,
      MCA: 0,
      Others: 0,
    };

    // Handle both QuerySnapshot and filtered doc arrays
    let docs = [];
    let forEachFn;

    if (input && input.docs) {
      // It's a QuerySnapshot
      docs = input.docs;
      forEachFn = (callback) => {
        docs.forEach((doc) => callback(doc));
      };
    } else if (Array.isArray(input)) {
      // It's an array of documents
      docs = input;
      forEachFn = (callback) => {
        docs.forEach((doc) => callback(doc));
      };
    } else {
      // Invalid input

      return {
        revenue: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        projectedTCV: 0,
        chartData: [],
        leadSources: [],
        teamPerformance: [],
        recentActivity: [],
      };
    }

    let revenue = 0;
    let hotLeads = 0;
    let warmLeads = 0;
    let coldLeads = 0;
    let projectedTCV = 0;
    const leadSources = { hot: 0, warm: 0, cold: 0 };
    const teamPerformance = {};
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

    const studentCategories = {
      Engineering: 0,
      MBA: 0,
      MCA: 0,
      Others: 0,
    };

    forEachFn((doc) => {
      const lead = docs === input ? doc : doc.data();

if (selectedUserId) {
  const selectedUserObj = users.find((u) => u.id === selectedUserId);
  if (!selectedUserObj) return; // skip if user not found
  if (lead.assignedTo?.uid !== selectedUserObj?.uid) {
    return;
  }
}
      if (lead.courses?.[0]?.courseType) {
        const courseType = lead.courses[0].courseType;
        if (courseType.includes("Engineering")) {
          leadCategories.Engineering++;
        } else if (courseType.includes("MBA")) {
          leadCategories.MBA++;
        } else if (courseType.includes("MCA")) {
          leadCategories.MCA++;
        } else {
          leadCategories.Others++;
        }
      } else {
        leadCategories.Others++;
      }

      if (lead.courses?.[0]?.studentCount != null && lead.courses?.[0]?.courseType) {
        const courseType = lead.courses[0].courseType;
        if (courseType.includes("Engineering")) {
          studentCategories.Engineering += Number(lead.courses?.[0]?.studentCount) || 0;
        } else if (courseType.includes("MBA")) {
          studentCategories.MBA += Number(lead.courses?.[0]?.studentCount) || 0;
        } else if (courseType.includes("MCA")) {
          studentCategories.MCA += Number(lead.courses?.[0]?.studentCount) || 0;
        } else {
          studentCategories.Others += Number(lead.courses?.[0]?.studentCount) || 0;
        }
      }

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

        if (lead.contractStartDate) {
          try {
            const contractStartDate = new Date(lead.contractStartDate);
            if (Number.isNaN(contractStartDate.getTime()))
              throw new Error("Invalid date");

            let dateKey;
            if (timePeriod === "week") {
              dateKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                contractStartDate.getDay()
              ];
            } else if (timePeriod === "month") {
              const firstDay = new Date(
                contractStartDate.getFullYear(),
                contractStartDate.getMonth(),
                1
              );
              const pastDaysOfMonth = contractStartDate.getDate() - 1;
              dateKey = `Week ${
                Math.floor((firstDay.getDay() + pastDaysOfMonth) / 7) + 1
              }`;
            } else if (timePeriod === "quarter") {
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
              let monthIdx = contractStartDate.getMonth() - startMonth;
              if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 2) monthIdx = 0; // fallback to first month
              dateKey = months[monthIdx];
            } else {
              const month = contractStartDate.getMonth();
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
              revenueByDate[dateKey] = { revenue: 0, dealCount: 0 };
            }
            revenueByDate[dateKey].revenue += lead.totalCost;
            revenueByDate[dateKey].dealCount += 1;
          } catch (e) {
            console.error("Error processing lead data:", e);
          }
        }
      }

      if (lead.tcv && lead.phase !== "closed") {
        projectedTCV += lead.tcv;
      }

      if (lead.assignedTo && lead.assignedTo.uid) {
        const user = users.find((u) => u.uid === lead.assignedTo.uid);
        const memberId = user ? user.id : lead.assignedTo.uid;
        const memberName = lead.assignedTo.name || "Unknown";

        if (!teamPerformance[memberId]) {
          teamPerformance[memberId] = {
            id: memberId,
            name: memberName,
            value: 0,
            closedRevenue: 0,
            role: lead.assignedTo.role || "Sales Rep",
          };
        }
        teamPerformance[memberId].value += 1; // Count of leads
        if (lead.phase === "closed" && lead.totalCost) {
          teamPerformance[memberId].closedRevenue += lead.totalCost;
        }
      }

      let createdDate = new Date(lead.createdAt);
      let timeStr = Number.isNaN(createdDate.getTime()) ? "" : createdDate.toLocaleDateString();

      recentActivity.push({
        id: doc.id,
        action: lead.phase === "closed" ? "Closed deal" : "New lead",
        amount: lead.phase === "closed" ? lead.totalCost : null,
        company: lead.businessName,
        user: lead.assignedTo?.name || "Unassigned",
        userInitials: lead.assignedTo?.name
          ? lead.assignedTo.name.split(" ").map((n) => n[0]).join("")
          : "NA",
        time: timeStr,
      });
    });

    // Generate chart data
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
          // Fallback: calculate quarter dynamically
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
        dealCount: revenueByDate[dateKey]?.dealCount || 0,
        leads: Math.floor(
          ((hotLeads + warmLeads + coldLeads) * (0.7 + Math.random() * 0.6)) /
            timePoints
        ),
        currentMonth: isCurrentMonth,
      });
    }

    return {
      revenue,
      hotLeads,
      warmLeads,
      coldLeads,
      projectedTCV,
      chartData,
      leadCategories: [
        { name: "Engineering", value: leadCategories.Engineering },
        { name: "MBA", value: leadCategories.MBA },
        { name: "MCA", value: leadCategories.MCA },
        { name: "Others", value: leadCategories.Others },
      ],
      leadSources: [
        { name: "Hot", value: leadSources.hot },
        { name: "Warm", value: leadSources.warm },
        { name: "Cold", value: leadSources.cold },
      ],
      studentCategories: [
        { name: "Engineering", value: studentCategories.Engineering },
        { name: "MBA", value: studentCategories.MBA },
        { name: "MCA", value: studentCategories.MCA },
        { name: "Others", value: studentCategories.Others },
      ],
      teamPerformance: Object.values(teamPerformance).sort(
        (a, b) => b.value - a.value
      ),
      recentActivity: recentActivity
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5),
    };
  };

  const fetchAllUsers = async () => {
    setIsLoading(true);
    
    try {
      const usersRef = collection(db, "users");
      
      let usersQuery;
      const isPrivilegedUser = 
        currentUser?.department?.toLowerCase() === "sales" || 
        currentUser?.department?.toLowerCase() === "dm" || 
        currentUser?.department === "Admin" ||
        currentUser?.departments?.includes("Sales") ||
        currentUser?.departments?.includes("DM") ||
        currentUser?.departments?.includes("Admin");
      
      if (isPrivilegedUser) {
        usersQuery = query(usersRef);
      } else {
        usersQuery = query(
          usersRef,
          where("department", "==", currentUser?.department || "")
        );
      }

      const usersSnapshot = await getDocs(usersQuery);
      
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const filteredUsers = usersData.filter(user => {
        // Exclude specific user UIDs
        const excludedUserUids = ['Xw3HsAZEgYNAxnEyX8I5THO4eub2', 'voMWYTXfLNZ70sAnHalC0qoqGD03'];
        if (excludedUserUids.includes(user.uid)) {
          return false;
        }

        // Exclude users with multiple departments
        const hasMultipleDepartments = user.departments && Array.isArray(user.departments) && user.departments.length > 1;
        if (hasMultipleDepartments) {
          return false;
        }

        if (user.department) {
          // Old format: single department field
          return user.department.toLowerCase() === "sales" || user.department === "Admin";
        } else if (user.departments && Array.isArray(user.departments) && user.departments.length === 1) {
          // New format: departments array - only if exactly one department
          return user.departments[0].toLowerCase() === "sales" || user.departments[0] === "Admin";
        }
        return false;
      });
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDataForRange = async (range) => {
    setIsLoading(true);

    try {
      const leadsRef = collection(db, "leads");
      let leadsQuery = leadsRef;

      // Example: apply city filter
      if (filters?.city) {
        leadsQuery = query(leadsRef, where("city", "==", filters.city));
      }
      // Add more filters as needed...

      const snapshot = await getDocs(leadsQuery);
      let leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter by date range in JS, but include leads with missing createdAt
      // For closed leads, also include if contractStartDate is in range
      let currentLeads = leads.filter(lead => {
        if (!lead.createdAt && !lead.contractStartDate) return true; // Include if missing both dates
        if (lead.phase === "closed" && lead.contractStartDate) {
          // For closed leads, check contractStartDate for FY membership
          const contractStart = new Date(lead.contractStartDate);
          return contractStart >= range.start && contractStart <= range.end;
        } else if (lead.createdAt) {
          // For other leads, check createdAt
          const created = new Date(lead.createdAt);
          return created >= range.start && created <= range.end;
        }
        return false;
      });

      // Fetch DM contracts
      const dmRef = collection(db, "digitalMarketing");
      const dmSnapshot = await getDocs(dmRef);
      let dmContracts = dmSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter DM contracts by contractStartDate
      let dmContractsFiltered = dmContracts.filter(dm => {
        if (dm.contractStartDate) {
          const contractStart = new Date(dm.contractStartDate);
          return contractStart >= range.start && contractStart <= range.end;
        }
        return false;
      });

      // Map DM contracts to look like leads
      const dmAsLeads = dmContractsFiltered.map(dm => ({
        id: dm.id,
        businessName: dm.collegeName,
        phase: "closed",
        totalCost: dm.totalCost,
        contractStartDate: dm.contractStartDate,
        assignedTo: dm.createdBy,
        courses: [{ courseType: dm.course }],
        createdAt: dm.createdAt,
        studentCount: dm.studentCount,
        tcv: dm.totalCost, // For projected, but since closed, use totalCost
      }));

      // Combine leads and DM contracts
      const allDocs = [...currentLeads, ...dmAsLeads];

      const currentData = processLeadsData(allDocs, range);

      // Fetch previous period data for growth calculations
      const prevRange = getPrevDateRange(timePeriod, range.start);
      let prevLeads = leads.filter(lead => {
        if (!lead.createdAt && !lead.contractStartDate) return false; // Exclude missing dates for previous
        if (lead.phase === "closed" && lead.contractStartDate) {
          // For closed leads, check contractStartDate for FY membership
          const contractStart = new Date(lead.contractStartDate);
          return contractStart >= prevRange.start && contractStart <= prevRange.end;
        } else if (lead.createdAt) {
          // For other leads, check createdAt
          const created = new Date(lead.createdAt);
          return created >= prevRange.start && created <= prevRange.end;
        }
        return false;
      });

      // Filter prev DM contracts
      let prevDmContractsFiltered = dmContracts.filter(dm => {
        if (dm.contractStartDate) {
          const contractStart = new Date(dm.contractStartDate);
          return contractStart >= prevRange.start && contractStart <= prevRange.end;
        }
        return false;
      });

      const prevDmAsLeads = prevDmContractsFiltered.map(dm => ({
        id: dm.id,
        businessName: dm.collegeName,
        phase: "closed",
        totalCost: dm.totalCost,
        contractStartDate: dm.contractStartDate,
        assignedTo: dm.createdBy,
        courses: [{ courseType: dm.course }],
        createdAt: dm.createdAt,
        studentCount: dm.studentCount,
        tcv: dm.totalCost,
      }));

      const prevAllDocs = [...prevLeads, ...prevDmAsLeads];

      const prevData = processLeadsData(prevAllDocs, prevRange);

      // Merge current and previous data
      const mergedData = {
        ...currentData,
        revenuePrevQuarter: prevData.revenue,
        hotLeadsPrevQuarter: prevData.hotLeads,
        warmLeadsPrevQuarter: prevData.warmLeads,
        coldLeadsPrevQuarter: prevData.coldLeads,
        projectedTCVPrevQuarter: prevData.projectedTCV,
      };

      setDashboardData(mergedData);
    } catch (error) {
      console.error("Error fetching data for range:", error);
      setDashboardData({
        revenue: 0,
        revenuePrevQuarter: 0,
        hotLeads: 0,
        hotLeadsPrevQuarter: 0,
        warmLeads: 0,
        warmLeadsPrevQuarter: 0,
        coldLeads: 0,
        coldLeadsPrevQuarter: 0,
        projectedTCV: 0,
        projectedTCVPrevQuarter: 0,
        chartData: [],
        leadSources: [],
        teamPerformance: [],
        recentActivity: [],
        studentCategories: [],
      });
    } finally {
      setIsLoading(false);
    }
  };
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
  const handleUserSelect = (user) => {
    if (user === "Team") {
      setSelectedUser("Team");
      setSelectedUserId(null);
    } else {
      setSelectedUser(user.name);
      setSelectedUserId(user.id);
    }
    setIsUserFilterOpen(false);
  };

  const handleRefresh = () => {
    const newRange = getDateRange(timePeriod, selectedYear);
    setCurrentDateRange(newRange);
    updatePeriodInfo(newRange);
    fetchDataForRange(newRange);
  };

  // WITH THIS:
  useEffect(() => {
    fetchAllUsers(); // Changed function name here
    const initialRange = getDateRange(timePeriod, selectedYear);
    setCurrentDateRange(initialRange);
    updatePeriodInfo(initialRange);
    fetchDataForRange(initialRange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (users.length === 0) return; // wait for users
    const newRange = getDateRange(timePeriod, selectedYear);
    setCurrentDateRange(newRange);
    updatePeriodInfo(newRange);
    fetchDataForRange(newRange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriod, selectedUserId, users, filters, selectedYear]);

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

  // Scroll to selected year option when dropdown opens
  useEffect(() => {
    if (isYearDropdownOpen && yearDropdownContainerRef.current) {
      // Find the selected option button
      const selectedButton = yearDropdownContainerRef.current.querySelector(
        `[data-selected-year="${selectedYear}"]`
      );
      if (selectedButton) {
        selectedButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [isYearDropdownOpen, selectedYear]);

  // Define calculateGrowth for metrics grid
  const calculateGrowth = (current, previous) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / previous) * 100;
  };

  // Handler for clicking a team member
  const handleMemberClick = async (member) => {
    setIsModalOpen(true);
    setModalMember(member);
    setModalLeads([]); // Clear previous

    try {
      let uid = member.id;
      const user = users.find(u => u.id === member.id);
      if (user) {
        uid = user.uid;
      }

      const leadsRef = collection(db, "leads");
      const leadsQuery = query(leadsRef, where("assignedTo.uid", "==", uid));
      const snapshot = await getDocs(leadsQuery);
      let leads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Fetch DM contracts
      const dmRef = collection(db, "digitalMarketing");
      const dmSnapshot = await getDocs(dmRef);
      let dmContracts = dmSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Filter DM by createdBy.uid
      let memberDmContracts = dmContracts.filter(dm => dm.createdBy?.uid === uid);

      // Map DM to similar structure
      const dmAsLeads = memberDmContracts.map(dm => ({
        id: dm.id,
        businessName: dm.collegeName,
        phase: "closed",
        totalCost: dm.totalCost,
        contractStartDate: dm.contractStartDate,
        assignedTo: dm.createdBy,
        courses: [{ courseType: dm.course }],
        createdAt: dm.createdAt,
        studentCount: dm.studentCount,
        tcv: dm.totalCost,
      }));

      // Combine
      let allLeads = [...leads, ...dmAsLeads];

      // Filter by the current date range (selected year) like the dashboard doe
      allLeads = allLeads.filter(lead => {
        if (!lead.createdAt && !lead.contractStartDate) return true; // Include if missing both dates
        if (lead.phase === "closed" && lead.contractStartDate) {
          // For closed leads, check contractStartDate for FY membership
          const contractStart = new Date(lead.contractStartDate);
          return contractStart >= currentDateRange.start && contractStart <= currentDateRange.end;
        } else if (lead.createdAt) {
          // For other leads, check createdAt
          const created = new Date(lead.createdAt);
          return created >= currentDateRange.start && created <= currentDateRange.end;
        }
        return false;
      });

      // Sort leads: CL first, then H, then W, then C
      const phasePriority = { closed: 1, hot: 2, warm: 3, cold: 4 };
      allLeads = allLeads.sort((a, b) => {
        const priorityA = phasePriority[a.phase] || 5;
        const priorityB = phasePriority[b.phase] || 5;
        return priorityA - priorityB;
      });

      setModalLeads(allLeads);
    } catch {
      setModalLeads([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="mx-auto max-w-8xl w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Sales Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Key metrics and performance indicators
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
                >
                  <span>{selectedYear === "lifetime" ? "Lifetime" : selectedYear}</span>
                  {isYearDropdownOpen ? (
                    <FiChevronUp className="text-gray-500 h-4 w-4" />
                  ) : (
                    <FiChevronDown className="text-gray-500 h-4 w-4" />
                  )}
                </button>

                {isYearDropdownOpen && (
                  <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-48 overflow-y-auto" ref={yearDropdownContainerRef}>
                    {/* Lifetime option */}
                    <button
                      key="lifetime"
                      type="button"
                      data-selected-year="lifetime"
                      onClick={() => {
                        setSelectedYear("lifetime");
                        setIsYearDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                        selectedYear === "lifetime" ? 'text-green-600 font-medium' : 'text-gray-700'
                      }`}
                      style={{ color: '#059669', fontWeight: '600' }}
                    >
                      <span>Lifetime</span>
                      <span className="text-green-500">•</span>
                    </button>
                    {Array.from({ length: 11 }, (_, i) => {
                      const currentYear = new Date().getFullYear();
                      const year = currentYear - 5 + i;
                      const isCurrentYear = year === currentYear;
                      return (
                        <button
                          key={year}
                          type="button"
                          data-selected-year={year}
                          onClick={() => {
                            setSelectedYear(year);
                            setIsYearDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                            selectedYear === year ? 'text-indigo-600 font-medium' : 'text-gray-700'
                          }`}
                          style={isCurrentYear ? { color: '#2563eb', fontWeight: '600' } : {}}
                        >
                          <span>{year}</span>
                          {isCurrentYear && <span className="ml-1 text-blue-500">•</span>}
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
                        {user.name} (
                        {user.department
                          ? `${user.role} (${user.department})`
                          : user.departments && user.departments.length > 0
                          ? `${user.role} (${user.departments.join(", ")})`
                          : user.role || "User"}
                        )
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

        {/* Metrics Grid */}
        <div className="w-full overflow-x-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 min-w-0">
            {[
              {
                title: selectedUserId ? "Your Revenue" : "Team Revenue",
                value: formatCurrency(dashboardData.revenue),
                change: calculateGrowth(dashboardData.revenue, dashboardData.revenuePrevQuarter),
                icon: <FaRupeeSign className="text-white" size={16} />, // changed size
                color: "bg-indigo-600",
              },
              {
                title: selectedUserId ? "Your Hot Leads" : "Team Hot Leads",
                value: dashboardData.hotLeads.toLocaleString(),
                change: calculateGrowth(dashboardData.hotLeads, dashboardData.hotLeadsPrevQuarter),
                icon: <FiThermometer className="text-white" size={16} />, // changed size
                color: "bg-red-600",
              },
              {
                title: selectedUserId ? "Your Warm Leads" : "Team Warm Leads",
                value: dashboardData.warmLeads.toLocaleString(),
                change: calculateGrowth(dashboardData.warmLeads, dashboardData.warmLeadsPrevQuarter),
                icon: <FiThermometer className="text-white" size={16} />, // changed size
                color: "bg-amber-500",
              },
              {
                title: selectedUserId ? "Your Cold Leads" : "Team Cold Leads",
                value: dashboardData.coldLeads.toLocaleString(),
                change: calculateGrowth(dashboardData.coldLeads, dashboardData.coldLeadsPrevQuarter),
                icon: <FiThermometer className="text-white" size={16} />, // changed size
                color: "bg-blue-600",
              },
              {
                title: selectedUserId
                  ? "Your Projected TCV"
                  : "Team Projected TCV",
                value: formatCurrency(dashboardData.projectedTCV),
                change:
                  ((dashboardData.projectedTCV -
                    dashboardData.projectedTCVPrevQuarter) /
                    (dashboardData.projectedTCVPrevQuarter || 1)) *
                  100,
                icon: <FiTrendingUp className="text-white" size={16} />, // changed size
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
                    <h3
                      className="text-2xl font-bold mt-1 truncate"
                      style={{ maxWidth: "140px", display: "block" }} // adjust width as needed
                      title={metric.value}
                    >
                      {metric.value}
                    </h3>
                  </div>
                  <div className="bg-black bg-opacity-20 p-1 rounded-lg"> {/* changed p-2 to p-1 */}
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
                    margin={{ top: 10, right: 30, left: 30, bottom: 0 }} // Increased left margin from 10 to 50
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
                      tick={{ fill: "#6B7280", fontSize: 8 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tickFormatter={(value) => {
                        // For quarter/year, show month and year for clarity
                        if (timePeriod === "quarter" || timePeriod === "year") {
                          return `${value} ${currentDateRange.start.getFullYear()}`;
                        }
                        return value;
                      }}
                    />
                    <YAxis
                      width={30} // Keep width for large numbers
                      tick={{ fill: "#6B7280", fontSize: 10 }} // Reduce font size for Y-axis numbers
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 min-w-0">
            <div className="bg-white p-2 md:p-3 rounded-xl border border-gray-200 shadow-sm min-w-0">
              <h3 className="text-md font-semibold text-gray-800 mb-3">
                Lead Distribution
              </h3>
              <LeadDistribution
                leadSources={dashboardData.leadSources}
                isLoading={isLoading}
              />
            </div>
            <div className="bg-white p-2 md:p-3 rounded-xl border border-gray-200 shadow-sm min-w-0">
              <h3 className="text-md font-semibold text-gray-800 mb-3">
                Education Distribution
              </h3>
              <EducationDistribution
                leadCategories={dashboardData.leadCategories}
                isLoading={isLoading}
              />
            </div>
            <div className="bg-white p-2 md:p-3 rounded-xl border border-gray-200 shadow-sm min-w-0">
              <h3 className="text-md font-semibold text-gray-800 mb-3">
                Student Distribution
              </h3>
              <EducationDistribution
                leadCategories={dashboardData.studentCategories}
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
                {selectedUserId ? "Individual Pipeline" : "Sales Team Pipeline"}
              </h2>
              <TeamPerformance
                teamPerformance={dashboardData.teamPerformance}
                isLoading={isLoading}
                selectedUserId={selectedUserId}
                onMemberClick={handleMemberClick} // Pass handler
              />
            </div>
            <div className="bg-white p-3 md:p-5 rounded-xl border border-gray-200 shadow-sm min-w-0">
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



        {/* Modal for showing leads */}
      <ReactModal
  isOpen={isModalOpen}
  onRequestClose={() => setIsModalOpen(false)}
  shouldCloseOnOverlayClick={true}
  ariaHideApp={false}
  className="fixed inset-0 flex items-center justify-center z-56"
  overlayClassName="fixed inset-0 bg-gradient-to-br from-gray-900/40 to-indigo-200/30 backdrop-blur-sm z-56 transition-all"
>
  <div
    className="relative bg-white rounded-2xl shadow-2xl w-[80vw] h-[95vh] mx-4 p-0 flex flex-col overflow-hidden animate-fade-in"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-linear-to-r from-white via-gray-50 to-indigo-50">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-100 text-indigo-600 rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-sm">
          {modalMember?.name?.[0] || "?"}
        </div>
        <div>
          <h3
            id="modal-title"
            className="text-lg md:text-xl font-semibold text-gray-900"
          >
            Colleges for {modalMember?.name}
          </h3>
          <div className="text-xs text-gray-500 font-medium mt-0.5">
            Total: <span className="text-indigo-600 font-bold">{modalLeads.length}</span>
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
        {modalLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-base font-medium">No leads found.</span>
          </div>
        ) : (
          <table className="min-w-full text-sm md:text-base">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 font-semibold text-gray-700 w-[60%]">College</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700 w-[20%]">Course/Year</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700 w-[20%]">Projection / TCV</th>
              </tr>
            </thead>
            <tbody>
              {modalLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-indigo-50 transition-colors group"
                >
<td className="px-3 py-2 text-gray-900 font-medium flex items-center gap-2">
  {/* Symbol for phase */}
  {lead.phase === "cold" && (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 shrink-0"
      title="Cold"
    >
      C
    </span>
  )}
  {lead.phase === "warm" && (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 font-bold text-xs border border-yellow-200 shrink-0"
      title="Warm"
    >
      W
    </span>
  )}
  {lead.phase === "hot" && (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 font-bold text-xs border border-red-200 shrink-0"
      title="Hot"
    >
      H
    </span>
  )}
{lead.phase === "closed" && (
  <span
    className="inline-flex items-center justify-center h-6 rounded-full bg-green-100 text-green-700 font-bold text-[10px] border border-green-200 shrink-0"
    title="Closed"
    style={{ minWidth: "1.3rem", padding: "0 0.3rem" }}
  >
    CL
  </span>
)}
  <span className="min-w-0 flex-1">
    {lead.businessName || "-"}
  </span>
</td>
                  <td className="px-3 py-2 text-gray-700">
                    {lead.courses?.[0]?.courseType || "-"}
                    {lead.courses?.[0]?.year
                      ? ` (${lead.courses?.[0]?.year})`
                      : ""}
                  </td>
                  <td className="px-3 py-2 text-gray-700 font-medium">
                    <span className={
                      lead.phase === "closed" ? "text-green-700" :
                      lead.phase === "hot" ? "text-red-700" :
                      lead.phase === "warm" ? "text-yellow-700" :
                      lead.phase === "cold" ? "text-blue-700" :
                      "text-gray-700"
                    }>
                      {lead.phase === "closed" 
                        ? (lead.totalCost ? formatCurrency(lead.totalCost) : "-")
                        : (lead.tcv ? formatCurrency(lead.tcv) : "-")
                      }
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>

    {/* Footer */}
    <div className="px-4 py-2 bg-linear-to-r from-white via-gray-50 to-indigo-50 border-t border-gray-100 flex justify-end">
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

export default SalesDashboard;
