import React, { useEffect, useMemo, useState, useRef, memo } from "react";
import PropTypes from "prop-types";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { FiRefreshCw, FiAlertCircle, FiCalendar, FiDatabase, FiDownload } from "react-icons/fi";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Constants
const TIME_RANGES = ["1M", "3M", "6M", "12M", "FY"];
const MONTH_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep", 
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"
];

// Utility functions
const getFiscalYearRange = (selectedDate = new Date()) => {
  const date = new Date(selectedDate);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (0 = Jan, 3 = Apr)
  
  // If month is before April (0, 1, 2), fiscal year started previous year
  // However, if we're passing a specific year choice like 2025, 
  // we want April 2025 to March 2026.
  
  const start = new Date(year, 3, 1, 0, 0, 0); // April 1st
  const end = new Date(year + 1, 2, 31, 23, 59, 59); // March 31st
  
  return { start, end };
};

const safeParseDate = (date) => {
  if (!date) return null;
  try {
    // Handle Firestore Timestamp {seconds, nanoseconds}
    if (date.seconds !== undefined) {
      return new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
    }
    // Handle String or Date object
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) return parsed;

    // Fallback for custom formats like "November 18, 2025 at 4:48:27 PM UTC+5:30"
    // Remove " at " and convert to standard parsable string
    if (typeof date === 'string') {
      const cleaned = date.replace(" at ", " ");
      const fallbackParsed = new Date(cleaned);
      if (!isNaN(fallbackParsed.getTime())) return fallbackParsed;
    }
    
    return null;
  } catch (err) {
    console.warn("[LoginAnalytics] Date parse error:", err, date);
    return null;
  }
};

const process1MData = (logs, currentMonthIndex, currentYear) => {
  const weekCounts = {
    "Week 1": 0,
    "Week 2": 0,
    "Week 3": 0,
    "Week 4": 0,
  };

  logs.forEach((log) => {
    const action = log.action?.toLowerCase() || "";
    // Match "Logged in" or any user_session entry (which has startTime)
    if (action.includes("logged in") || log.userId || log.startTime) {
      const dateObj = safeParseDate(log.timestamp || log.startTime);
      if (dateObj && 
          dateObj.getMonth() === currentMonthIndex && 
          dateObj.getFullYear() === currentYear) {
        const day = dateObj.getDate();
        let weekKey = "Week 4";
        if (day <= 7) weekKey = "Week 1";
        else if (day <= 14) weekKey = "Week 2";
        else if (day <= 21) weekKey = "Week 3";
        
        weekCounts[weekKey]++;
      }
    }
  });

  return {
    labels: Object.keys(weekCounts),
    values: Object.values(weekCounts),
  };
};

const processFYData = (logs, fiscalYearStart = null) => {
  const { start, end } = getFiscalYearRange(fiscalYearStart ? new Date(fiscalYearStart, 3, 1) : new Date());
  const counts = MONTH_ORDER.reduce((acc, month) => {
    acc[month] = 0;
    return acc;
  }, {});

  logs.forEach((log) => {
    const action = log.action?.toLowerCase() || "";
    if (action.includes("logged in") || log.userId || log.startTime) {
      const dateObj = safeParseDate(log.timestamp || log.startTime);
      if (dateObj) {
        // Log individual dates that fall in Nov/Dec to verify parsing
        const m = dateObj.getMonth();
        if (m === 10 || m === 11) {
          console.log(`[Verification] Entry in ${m === 10 ? 'Nov' : 'Dec'}:`, dateObj.toISOString());
        }
        
        if (dateObj >= start && dateObj <= end) {
          const month = dateObj.toLocaleString("en-US", { month: "short" });
          counts[month] = (counts[month] || 0) + 1;
        }
      }
    }
  });

  return {
    labels: MONTH_ORDER,
    values: MONTH_ORDER.map(month => counts[month]),
  };
};

const processMultiMonthData = (logs, rangeCount) => {
  const now = new Date();
  const counts = {};
  
  // Initialize last N months
  const labels = [];
  for (let i = rangeCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en-US", { month: "short" });
    labels.push(label);
    counts[label] = 0;
  }

  logs.forEach((log) => {
    const action = log.action?.toLowerCase() || "";
    if (action.includes("logged in") || log.userId || log.startTime) {
      const dateObj = safeParseDate(log.timestamp || log.startTime);
      if (dateObj) {
        const month = dateObj.toLocaleString("en-US", { month: "short" });
        if (counts[month] !== undefined) {
          counts[month]++;
        }
      }
    }
  });

  return {
    labels,
    values: labels.map(label => counts[label]),
  };
};

const processLogsToChartData = (logs, timeRange = "FY", selectedYear = null) => {
  if (!logs || !Array.isArray(logs)) return { labels: [], values: [] };

  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const currentYear = now.getFullYear();

  if (timeRange === "FY") return processFYData(logs, selectedYear);
  if (timeRange === "1M") return process1MData(logs, currentMonthIndex, currentYear);

  const rangeCount = {
    "3M": 3,
    "6M": 6,
    "12M": 12,
  }[timeRange] || 12;

  return processMultiMonthData(logs, rangeCount);
};

// Chart configuration
const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: "rgba(229, 231, 235, 0.5)",
        drawBorder: false,
      },
      ticks: {
        precision: 0,
        color: "#6B7280",
        font: {
          family: "Inter, sans-serif",
        },
      },
    },
    x: {
      grid: {
        display: false,
        drawBorder: false,
      },
      ticks: {
        color: "#6B7280",
        font: {
          family: "Inter, sans-serif",
        },
      },
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: "#111827",
      titleFont: {
        family: "Inter, sans-serif",
        size: 14,
      },
      bodyFont: {
        family: "Inter, sans-serif",
        size: 12,
      },
      padding: 12,
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        label: (context) => `${context.parsed.y} logins`,
      },
    },
  },
};

// Components
const TimeRangeButton = memo(({ range, currentRange, onClick }) => (
  <button
    onClick={() => onClick(range)}
    className={`px-3 py-1 text-sm rounded-md transition-colors ${
      currentRange === range
        ? "bg-white shadow-sm text-indigo-600 font-medium"
        : "text-gray-600 hover:text-gray-900"
    }`}
    aria-current={currentRange === range ? "true" : "false"}
    aria-label={`Show data for ${range}`}
  >
    {range}
  </button>
));

const LoadingSkeleton = () => (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="animate-pulse flex flex-col items-center">
      <div className="w-12 h-12 bg-gray-200 rounded-full mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
    <FiDatabase className="w-8 h-8 text-gray-400 mb-3" />
    <p className="text-gray-600 font-medium">No login data available</p>
    <p className="text-sm text-gray-500 mt-1">Try selecting a different time range</p>
  </div>
);

const ErrorState = ({ error }) => (
  <div className="flex flex-col items-center justify-center py-12 bg-red-50 rounded-lg">
    <FiAlertCircle className="w-8 h-8 text-red-400 mb-3" />
    <p className="text-red-600 font-medium">{error}</p>
    <p className="text-sm text-red-500 mt-1">Please try again later</p>
  </div>
);

// Main Component
const LoginAnalytics = ({ logs: initialLogs = [], className = "" }) => {
  const [logs, setLogs] = useState(initialLogs);
  const [chartData, setChartData] = useState({ labels: [], values: [] });
  const [timeRange, setTimeRange] = useState("FY");
  const [selectedYear, setSelectedYear] = useState(new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef();

  // Load more data specifically for Login Analytics
  const fetchAdvancedLogs = async () => {
    if (isFetchingMore) return;
    try {
      setIsFetchingMore(true);
      const { start, end } = getFiscalYearRange(new Date(selectedYear, 3, 1));
      
      console.log(`[LoginAnalytics] Fetching between ${start.toISOString()} and ${end.toISOString()}`);
      
      const q = query(
        collection(db, "user_sessions"),
        where("startTime", ">=", start),
        where("startTime", "<=", end),
        orderBy("startTime", "desc")
      );
      
      const snap = await getDocs(q);
      console.log(`[LoginAnalytics] Query returned ${snap.docs.length} docs`);
      
      const newLogs = snap.docs.map(doc => {
        const data = doc.data();
        const ts = data.startTime || data.timestamp;
        return {
          id: doc.id,
          ...data,
          action: "Logged in",
          timestamp: ts?.toDate ? ts.toDate().toISOString() : ts,
        };
      });

      setLogs(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const uniqueNew = newLogs.filter(l => !existingIds.has(l.id));
        return [...prev, ...uniqueNew];
      });
    } catch (err) {
      console.error("[LoginAnalytics] Fetch error:", err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    if (timeRange === "FY" || timeRange === "12M") {
      fetchAdvancedLogs();
    }
  }, [selectedYear, timeRange]);

  useEffect(() => {
    // Keep internal logs in sync with props when they change
    setLogs(prev => {
      const existingIds = new Set(prev.map(l => l.id));
      const propNew = initialLogs.filter(l => !existingIds.has(l.id));
      return [...prev, ...propNew];
    });
  }, [initialLogs]);

  // Generate year options (current year and 5 years back)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let i = 0; i < 5; i++) {
      options.push(currentYear - i);
    }
    return options;
  }, []);

  const currentFYText = useMemo(() => {
    const { start, end } = getFiscalYearRange(new Date(selectedYear, 3, 1));
    return `${start.getFullYear()}-${end.getFullYear()}`;
  }, [selectedYear]);

  useEffect(() => {
    const processData = async () => {
      try {
        setIsLoading(true);
        console.log(`[LoginAnalytics] Total logs received: ${logs?.length || 0}`);
        const result = processLogsToChartData(logs, timeRange, selectedYear);
        
        // Month-wise count breakdown
        const breakdown = result.labels.map((label, i) => ({ month: label, logins: result.values[i] }));
        console.log(`[LoginAnalytics] ${timeRange} Breakdown:`, breakdown);

        setChartData(result);
        setError(null);
      } catch (err) {
        console.error("[LoginAnalytics] Processing Error:", err);
        setError("Failed to process login data");
      } finally {
        setIsLoading(false);
      }
    };

    if (logs?.length >= 0) {
      processData();
    }
  }, [logs, timeRange, selectedYear]);

  const chartDataConfig = useMemo(() => ({
    labels: chartData.labels,
    datasets: [
      {
        label: "Logins",
        data: chartData.values,
        backgroundColor: "rgba(79, 70, 229, 0.7)",
        hoverBackgroundColor: "rgba(79, 70, 229, 1)",
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 24,
      },
    ],
  }), [chartData]);

  const totalLogins = useMemo(
    () => chartData.values.reduce((sum, val) => sum + val, 0),
    [chartData]
  );

  const handleRefresh = () => {
    fetchAdvancedLogs();
    const result = processLogsToChartData(logs, timeRange, selectedYear);
    setChartData(result);
  };

  const hasData = chartData.values.some(v => v > 0);

  return (
    <motion.section
      ref={containerRef}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-labelledby="login-analytics-title"
    >
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 id="login-analytics-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiCalendar className="text-indigo-500" />
              Login Analytics
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Track user login patterns over time
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {timeRange === "FY" && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    FY {year}-{year + 1}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center bg-gray-50 rounded-lg p-1 w-full sm:w-auto overflow-x-auto">
              {TIME_RANGES.map((range) => (
                <TimeRangeButton
                  key={range}
                  range={range}
                  currentRange={timeRange}
                  onClick={setTimeRange}
                />
              ))}
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading || isFetchingMore}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors"
              aria-label="Refresh data"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${isLoading || isFetchingMore ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Logins</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalLogins.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-indigo-500"></span>
              <span className="text-sm text-gray-500">Internal Fiscal Year ({currentFYText})</span>
            </div>
          </div>

          <div className="relative h-64 w-full">
            {isLoading ? (
              <LoadingSkeleton />
            ) : error ? (
              <ErrorState error={error} />
            ) : !hasData ? (
              <EmptyState />
            ) : (
              <Bar
                data={chartDataConfig}
                options={CHART_OPTIONS}
                aria-label="Login analytics chart"
                role="img"
              />
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
};

LoginAnalytics.propTypes = {
  logs: PropTypes.arrayOf(
    PropTypes.shape({
      action: PropTypes.string.isRequired,
      timestamp: PropTypes.oneOfType([
        PropTypes.instanceOf(Date),
        PropTypes.object, // for Firestore Timestamp
        PropTypes.string
      ])
    })
  ).isRequired,
  className: PropTypes.string
};

LoginAnalytics.defaultProps = {
  logs: [],
  className: ""
};

export default LoginAnalytics;
