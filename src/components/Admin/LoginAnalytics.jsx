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
import { FiRefreshCw, FiAlertCircle, FiCalendar, FiDatabase } from "react-icons/fi";
import { motion } from "framer-motion";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Constants
const TIME_RANGES = ["1M", "3M", "6M", "12M"];
const MONTH_ORDER = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Utility functions
const safeParseDate = (date) => {
  if (!date) return null;
  try {
    const parsed = date?.toDate?.() ?? new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

const process1MData = (logs, currentMonthIndex, currentYear) => {
  const weekCounts = Array(4).fill(0).reduce((acc, _, i) => {
    acc[`Week ${i + 1}`] = 0;
    return acc;
  }, {});

  logs.forEach((log) => {
    if (log.action && log.action.trim().startsWith("Logged in")) {
      const dateObj = safeParseDate(log.timestamp);
      if (dateObj && 
          dateObj.getMonth() === currentMonthIndex && 
          dateObj.getFullYear() === currentYear) {
        const weekIndex = Math.floor((dateObj.getDate() - 1) / 7);
        weekCounts[`Week ${Math.min(weekIndex + 1, 4)}`]++;
      }
    }
  });

  return {
    labels: Object.keys(weekCounts),
    values: Object.values(weekCounts),
  };
};

const processMultiMonthData = (logs, rangeCount, currentMonthIndex) => {
  const counts = MONTH_ORDER.reduce((acc, month) => {
    acc[month] = 0;
    return acc;
  }, {});

  logs.forEach((log) => {
    if (log.action && log.action.trim().startsWith("Logged in")) {
      const dateObj = safeParseDate(log.timestamp);
      if (dateObj) {
        const month = dateObj.toLocaleString("en-US", { month: "short" });
        counts[month] = (counts[month] || 0) + 1;
      }
    }
  });

  const orderedMonths = Array.from({ length: rangeCount }, (_, i) => {
    const offset = i - Math.floor(rangeCount / 2);
    const index = (currentMonthIndex + offset + 12) % 12;
    return MONTH_ORDER[index];
  });

  return {
    labels: orderedMonths,
    values: orderedMonths.map(month => counts[month]),
  };
};

const processLogsToChartData = (logs, timeRange = "12M") => {
  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const currentYear = now.getFullYear();

  if (timeRange === "1M") return process1MData(logs, currentMonthIndex, currentYear);

  const rangeCount = {
    "3M": 3,
    "6M": 6,
    "12M": 12,
  }[timeRange] || 12;

  return processMultiMonthData(logs, rangeCount, currentMonthIndex);
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
const LoginAnalytics = ({ logs, className = "" }) => {
  const [chartData, setChartData] = useState({ labels: [], values: [] });
  const [timeRange, setTimeRange] = useState("12M");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef();

  useEffect(() => {
    const processData = async () => {
      try {
        setIsLoading(true);
        const result = processLogsToChartData(logs, timeRange);
        setChartData(result);
        setError(null);
      } catch (err) {

        setError("Failed to process login data");
      } finally {
        setIsLoading(false);
      }
    };

    if (logs?.length >= 0) { // Only process if logs is defined (empty array is valid)
      processData();
    }
  }, [logs, timeRange]);

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
    const result = processLogsToChartData(logs, timeRange);
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
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors"
              aria-label="Refresh data"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
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
              <span className="text-sm text-gray-500">Current period</span>
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
