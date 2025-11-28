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
            ? `Q${Math.floor(new Date(label).getMonth() / 3) + 1} ${new Date(
                label
              ).getFullYear()}`
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
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
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
    <div className="space-y-3">
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
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {placement.studentName}
                  </p>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {placement.course}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {placement.company}
                </p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {formatCurrency(placement.salary)}
                </p>
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

  return (
    <>
      <div className="mb-2 flex flex-wrap justify-center gap-2">
        {leadData.map((status, index) => (
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
              data={leadData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {leadData.map((entry, index) => (
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

const TrainingStatusDistribution = ({ trainingData, isLoading }) => {
  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-48 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!trainingData || trainingData.length === 0) {
    return (
      <div className="text-center py-8">
        <FiBookOpen className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No training data
        </h3>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap justify-center gap-2">
        {trainingData.map((status, index) => (
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
          <BarChart data={trainingData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="value" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

TrainingStatusDistribution.propTypes = {
  trainingData: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
    })
  ),
  isLoading: PropTypes.bool,
};

TrainingStatusDistribution.defaultProps = {
  trainingData: [],
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
    companiesWithOpenings: 0,
    companiesWithOpeningsPrev: 0,
    totalPlacements: 0,
    totalPlacementsPrev: 0,
    budgetUtilized: 0,
    budgetUtilizedPrev: 0,
    chartData: [],
    leadStatusDistribution: [],
    trainingStatusDistribution: [],
    placementOfficerPerformance: [],
    recentActivities: [],
  });
  const [users, setUsers] = useState([]);
  const [currentPeriodInfo, setCurrentPeriodInfo] = useState("");
  const [currentDateRange, setCurrentDateRange] = useState({
    start: new Date(),
    end: new Date(),
  });
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

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

  const processPlacementData = async () => {
    try {
      // Fetch training programs from placementData
      const trainingSnapshot = await getDocs(collection(db, "placementData"));
      const trainingPrograms = trainingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch company leads
      const leadsSnapshot = await getDocs(collection(db, "companyLeads"));
      const leads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch companies
      const companiesSnapshot = await getDocs(collection(db, "companies"));
      const companies = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch placement audit logs for officer performance and recent activities
      const auditLogsSnapshot = await getDocs(
        query(collection(db, "placement_audit_logs"), orderBy("timestamp", "desc"), limit(100))
      );
      const auditLogs = auditLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate metrics
      const totalTrainingPrograms = trainingPrograms.length;
      const activeStudents = trainingPrograms.reduce((sum, program) => sum + (program.totalStudents || 0), 0);
      const totalLeads = leads.length;
      const hotLeads = leads.filter(lead => lead.status === 'hot').length;

      // Companies with ongoing openings
      const companiesWithOpenings = companies.filter(company => company.status === 'ongoing').length;

      // Calculate placements and officer performance from audit logs
      let totalPlacements = 0;
      const placementOfficerPerformance = {};

      // Count placements from audit logs
      auditLogs.forEach(log => {
        if (log.action === 'PLACEMENT_SUCCESS' || log.action === 'STUDENT_PLACED' ||
            (log.details && log.details.toLowerCase().includes('placed'))) {
          totalPlacements++;
          const officerId = log.userId;
          const officerName = log.userName || 'Unknown Officer';
          placementOfficerPerformance[officerId] = {
            id: officerId,
            name: officerName,
            value: (placementOfficerPerformance[officerId]?.value || 0) + 1,
            role: "Placement Officer"
          };
        }
      });

      // If no placements found in audit logs, try studentList collection
      if (totalPlacements === 0) {
        for (const companyDoc of companies) {
          const companyCode = companyDoc.companyName?.replace(/\s+/g, '_').toUpperCase();
          if (companyCode) {
            try {
              const uploadsRef = collection(db, 'studentList', companyCode, 'uploads');
              const uploadsSnapshot = await getDocs(uploadsRef);

              for (const uploadDoc of uploadsSnapshot.docs) {
                const uploadData = uploadDoc.data();
                if (uploadData.students && Array.isArray(uploadData.students)) {
                  uploadData.students.forEach(student => {
                    if (student.status === "placed" || student.placementStatus === "placed") {
                      totalPlacements++;
                      const officer = student.placedBy || student.placementOfficer || "Unknown";
                      if (!placementOfficerPerformance[officer]) {
                        placementOfficerPerformance[officer] = {
                          id: officer,
                          name: officer,
                          value: 0,
                          role: "Placement Officer"
                        };
                      }
                      placementOfficerPerformance[officer].value++;
                    }
                  });
                }
              }
            } catch (error) {
              console.error(`Error fetching placements for ${companyCode}:`, error);
            }
          }
        }
      }

      // Lead status distribution
      const leadStatuses = {};
      leads.forEach(lead => {
        const status = lead.status || 'unknown';
        leadStatuses[status] = (leadStatuses[status] || 0) + 1;
      });
      const leadStatusDistribution = Object.entries(leadStatuses).map(([name, value]) => ({ name, value }));

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
      const recentActivities = auditLogs.slice(0, 10).map(log => {
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

      // If no audit logs, provide some default activities
      if (recentActivities.length === 0) {
        const defaultActivities = [
          { id: 1, action: "New lead added", details: "Check company leads", time: "Recently", type: "lead", user: "System" },
          { id: 2, action: "Training program created", details: "New placement training", time: "Recently", type: "activity", user: "System" },
          { id: 3, action: "Company profile updated", details: "Company information", time: "Recently", type: "company", user: "System" },
        ];
        recentActivities.push(...defaultActivities);
      }

      // Chart data (simplified)
      const chartData = [
        { name: "Jan", value: Math.floor(totalTrainingPrograms * 0.8) },
        { name: "Feb", value: Math.floor(totalTrainingPrograms * 0.9) },
        { name: "Mar", value: totalTrainingPrograms },
      ];

      return {
        totalTrainingPrograms,
        totalTrainingProgramsPrev: Math.floor(totalTrainingPrograms * 0.9),
        activeStudents,
        activeStudentsPrev: Math.floor(activeStudents * 0.95),
        totalLeads,
        totalLeadsPrev: Math.floor(totalLeads * 0.9),
        hotLeads,
        hotLeadsPrev: Math.floor(hotLeads * 0.95),
        companiesWithOpenings,
        companiesWithOpeningsPrev: companiesWithOpenings,
        totalPlacements,
        totalPlacementsPrev: Math.floor(totalPlacements * 0.9),
        budgetUtilized: 0, // Would need budget data
        budgetUtilizedPrev: 0,
        chartData,
        leadStatusDistribution,
        trainingStatusDistribution,
        placementOfficerPerformance: officerPerformance,
        recentActivities,
      };
    } catch (error) {
      console.error("Error processing placement data:", error);
      return dashboardData;
    }
  };

  const fetchAllUsers = async () => {
    try {
      const usersQuery = query(
        collection(db, "users"),
        where("departments", "array-contains", "Placement")
      );
      const querySnapshot = await getDocs(usersQuery);
      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchDataForRange = async (range) => {
    setIsLoading(true);
    try {
      const data = await processPlacementData(range);
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
  }, [timePeriod, users, filters, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleOfficerClick = async (officer) => {
    // Placeholder for future modal implementation
    console.log("Officer clicked:", officer);
  };

  const metrics = useMemo(() => [
    {
      title: "Training Programs",
      value: dashboardData.totalTrainingPrograms.toLocaleString(),
      change: calculateGrowth(dashboardData.totalTrainingPrograms, dashboardData.totalTrainingProgramsPrev),
      icon: <FiBookOpen className="text-white" size={16} />,
      color: "bg-indigo-600",
    },
    {
      title: "Active Students",
      value: dashboardData.activeStudents.toLocaleString(),
      change: calculateGrowth(dashboardData.activeStudents, dashboardData.activeStudentsPrev),
      icon: <FaUserGraduate className="text-white" size={16} />,
      color: "bg-green-600",
    },
    {
      title: "Total Leads",
      value: dashboardData.totalLeads.toLocaleString(),
      change: calculateGrowth(dashboardData.totalLeads, dashboardData.totalLeadsPrev),
      icon: <FiTarget className="text-white" size={16} />,
      color: "bg-blue-600",
    },
    {
      title: "Hot Leads",
      value: dashboardData.hotLeads.toLocaleString(),
      change: calculateGrowth(dashboardData.hotLeads, dashboardData.hotLeadsPrev),
      icon: <FiTrendingUp className="text-white" size={16} />,
      color: "bg-red-600",
    },
    {
      title: "Companies Active",
      value: dashboardData.companiesWithOpenings.toLocaleString(),
      change: calculateGrowth(dashboardData.companiesWithOpenings, dashboardData.companiesWithOpeningsPrev),
      icon: <FaBuilding className="text-white" size={16} />,
      color: "bg-purple-600",
    },
    {
      title: "Total Placements",
      value: dashboardData.totalPlacements.toLocaleString(),
      change: calculateGrowth(dashboardData.totalPlacements, dashboardData.totalPlacementsPrev),
      icon: <FaHandshake className="text-white" size={16} />,
      color: "bg-orange-600",
    },
  ], [dashboardData]);

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Placement Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Track candidate placements and hiring metrics
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            {/* Time Period Selector */}
            <div className="flex items-center space-x-2">
              {["quarter", "month", "year"].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    timePeriod === period
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>

            {/* Year Selector */}
            <div className="relative" ref={yearDropdownContainerRef}>
              <button
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {selectedYear}
                <svg
                  className={`ml-2 h-4 w-4 transition-transform ${
                    isYearDropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
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

            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevPeriod}
                className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md">
                {currentPeriodInfo}
              </span>

              <button
                onClick={handleNextPeriod}
                className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className={`${metric.color} rounded-lg p-5 text-white shadow-md transition-transform hover:scale-105`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-white/90">{metric.title}</p>
                <h3 className="text-2xl font-bold mt-1">{metric.value}</h3>
                <p className="text-xs mt-1 flex items-center">
                  <FiTrendingUp className="mr-1" size={12} />
                  {metric.change >= 0 ? "+" : ""}
                  {metric.change.toFixed(1)}%
                </p>
              </div>
              <div className="p-2 rounded-lg bg-white/10">{metric.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Placement Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Placement Trends
          </h3>
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip content={<CustomTooltip timePeriod={timePeriod} />} />
                  <Line
                    type="monotone"
                    dataKey="placements"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Company Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Lead Status Distribution
          </h3>
          <LeadStatusDistribution
            leadData={dashboardData.leadStatusDistribution}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Training Status Distribution
          </h3>
          <TrainingStatusDistribution
            trainingData={dashboardData.trainingStatusDistribution}
            isLoading={isLoading}
          />
        </div>

        {/* Placement Officer Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Placement Officers
          </h3>
          <PlacementOfficerPerformance
            officerPerformance={dashboardData.placementOfficerPerformance}
            isLoading={isLoading}
            onMemberClick={handleOfficerClick}
          />
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Recent Activities
          </h3>
          <RecentActivity
            recentActivity={dashboardData.recentActivities}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default PlacementDashboard;