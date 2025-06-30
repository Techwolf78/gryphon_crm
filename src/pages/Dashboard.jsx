import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const Dashboard = ({ department = 'sales', leads = [], users = {}, currentUser = null }) => {
  const [showBanner, setShowBanner] = useState(true);

  // Calculate phase counts for sales dashboard
  const computePhaseCounts = () => {
    const counts = { hot: 0, warm: 0, cold: 0, closed: 0 };
    Object.values(leads).forEach((lead) => {
      const phase = lead.phase || "hot";
      if (counts[phase] !== undefined) counts[phase]++;
    });
    return counts;
  };

  const phaseCounts = computePhaseCounts();

  // Sales Dashboard Components
  const summaryCards = [
    {
      title: "Total Leads",
      value: Object.keys(leads).length,
      icon: "👥",
      color: "bg-blue-100 text-blue-800",
    },
    {
      title: "Hot Leads",
      value: phaseCounts.hot,
      icon: "🔥",
      color: "bg-red-100 text-red-800",
    },
    {
      title: "Warm Leads",
      value: phaseCounts.warm,
      icon: "☀️",
      color: "bg-amber-100 text-amber-800",
    },
    {
      title: "Cold Leads",
      value: phaseCounts.cold,
      icon: "❄️",
      color: "bg-cyan-100 text-cyan-800",
    },
    {
      title: "Closed Deals",
      value: phaseCounts.closed,
      icon: "✅",
      color: "bg-green-100 text-green-800",
    },
  ];

  const funnelData = [
    { name: "Hot", value: phaseCounts.hot, fill: "#EF4444" },
    { name: "Warm", value: phaseCounts.warm, fill: "#F59E0B" },
    { name: "Cold", value: phaseCounts.cold, fill: "#06B6D4" },
    { name: "Closed", value: phaseCounts.closed, fill: "#10B981" },
  ];

  const recentActivity = Object.entries(leads)
    .sort(([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5)
    .map(([id, lead]) => ({
      id,
      title: `${lead.businessName || "New lead"} added`,
      date: lead.createdAt
        ? new Date(lead.createdAt).toLocaleDateString()
        : "N/A",
      icon: "➕",
      color: "text-blue-500",
    }));

  const leadSources = Object.values(leads).reduce((acc, lead) => {
    const source = lead.contactMethod || "Unknown";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const tcvStats = {
    total: Object.values(leads).reduce(
      (sum, lead) => sum + (parseInt(lead.tcv) || 0),
      0
    ),
    average:
      Object.values(leads).length > 0
        ? Object.values(leads).reduce(
            (sum, lead) => sum + (parseInt(lead.tcv) || 0),
            0
          ) / Object.values(leads).length
        : 0,
  };

  // Render department-specific dashboard
  const renderDashboard = () => {
    const dept = department?.toLowerCase() || "sales";

    switch (dept) {
      case "sales":
        return (
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {summaryCards.map((card) => (
                <div
                  key={card.title}
                  className={`p-4 rounded-lg shadow ${card.color}`}
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">{card.title}</p>
                      <p className="text-2xl font-bold">{card.value}</p>
                    </div>
                    <div className="text-2xl">{card.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conversion Funnel */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-4">Lead Conversion Funnel</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={funnelData}>
                    <Bar dataKey="value" fill="#8884d8" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Lead Sources */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-4">Lead Sources</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(leadSources).map(
                        ([name, value]) => ({ name, value })
                      )}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {Object.entries(leadSources).map(([name], index) => (
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
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start">
                      <div className={`mt-1 mr-3 text-lg ${activity.color}`}>
                        {activity.icon}
                      </div>
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-gray-500">{activity.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TCV Metrics */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-4">Contract Values</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Total Contract Value
                    </p>
                    <p className="text-2xl font-bold">
                      ₹{tcvStats.total.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">Average Deal Size</p>
                    <p className="text-2xl font-bold">
                      ₹{Math.round(tcvStats.average).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-4">Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-800">Conversion Rate</p>
                    <p className="text-2xl font-bold">
                      {phaseCounts.closed > 0
                        ? `${Math.round(
                            (phaseCounts.closed / Object.keys(leads).length) *
                              100
                          )}%`
                        : "0%"}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-800">Hot Lead %</p>
                    <p className="text-2xl font-bold">
                      {phaseCounts.hot > 0
                        ? `${Math.round(
                            (phaseCounts.hot / Object.keys(leads).length) * 100
                          )}%`
                        : "0%"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "learning":
      case "placement":
      case "dm":
      default:
        return (
          <div className="p-6">
            {/* 🟨 Info Banner */}
            {showBanner && (
              <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 flex items-center justify-between">
                <span>
                  🚧 The {dept.toUpperCase()} dashboard is under construction.
                </span>
                <button
                  className="text-yellow-800 hover:text-yellow-600 font-bold text-xl leading-none"
                  onClick={() => setShowBanner(false)}
                  aria-label="Close banner"
                >
                  &times;
                </button>
              </div>
            )}

            <header className="mb-10 mt-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {dept.toUpperCase()} Dashboard
              </h1>
              <p className="text-lg text-gray-600">
                Coming soon - currently in development.
              </p>
            </header>

            {/* Placeholder content */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Under Construction
              </h2>
              <p className="text-gray-700">
                We're working hard to bring you comprehensive analytics for this
                department. Check back soon!
              </p>
            </div>
          </div>
        );
    }
  };

  return <div className="min-h-screen bg-gray-50">{renderDashboard()}</div>;
};

export default Dashboard;
