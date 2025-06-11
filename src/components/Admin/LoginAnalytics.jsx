// src/components/Admin/LoginAnalytics.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const monthOrder = [
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
];

// Utility to format logs into monthly data
const processLogsToChartData = (logs) => {
  const counts = {};

  logs.forEach((log) => {
    if (log.action === "Logged in" && log.date) {
      const dateObj = new Date(log.date);
      if (!isNaN(dateObj)) {
        const month = dateObj.toLocaleString("default", { month: "short" });
        counts[month] = (counts[month] || 0) + 1;
      }
    }
  });

  const labels = monthOrder.filter((m) => m in counts);
  const values = labels.map((m) => counts[m]);

  return { labels, values };
};

const LoginAnalytics = ({ logs }) => {
  const [visible, setVisible] = useState(false);
  const [chartData, setChartData] = useState({ labels: [], values: [] });
  const containerRef = useRef();

  // Lazy-load using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Cache key for localStorage
  const CACHE_KEY = "loginAnalyticsChartData";

  useEffect(() => {
    if (!visible) return;

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      setChartData(JSON.parse(cached));
    } else {
      const result = processLogsToChartData(logs);
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
      setChartData(result);
    }
  }, [logs, visible]);

  const barChartData = useMemo(
    () => ({
      labels: chartData.labels,
      datasets: [
        {
          label: "Logins",
          data: chartData.values,
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderRadius: 4,
        },
      ],
    }),
    [chartData]
  );

  return (
    <section ref={containerRef}>
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Login Analytics
      </h2>
      <div className="bg-white p-6 rounded-lg shadow w-full overflow-hidden">
        <div className="relative w-auto h-[300px]">
          {!visible ? (
            <p className="text-gray-400 italic text-center">Loading chart...</p>
          ) : chartData.labels.length > 0 ? (
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: { beginAtZero: true },
                },
              }}
            />
          ) : (
            <p className="text-gray-500 text-center">
              No login data available.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default LoginAnalytics;
