import {
  DollarSign,
  DollarSignIcon,
  CircleCheckBig,
  BarChart,
  ChartLine,
  Clock2Icon,
  TrendingUp,
  AlertTriangle,
  Users,
  Heart,
  Building,
} from "lucide-react";
import { useState } from "react";

const BudgetOverview = ({
  departmentBudget,
  budgetUtilization,
  budgetComponents,
  componentColors,
  purchaseIntents,
  purchaseOrders,
}) => {
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [viewMode, setViewMode] = useState("pie"); // "grid", "pie", "bar"

  if (!departmentBudget) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 max-w-md mx-auto">
          <svg
            className="w-12 h-12 text-yellow-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            No Budget Created
          </h3>
          <p className="text-yellow-700 mb-4">
            Create a budget to start tracking expenses and purchase intents.
          </p>
        </div>
      </div>
    );
  }

  // 🧩 All budget categories including additional parts
  const additionalBudgetItems = {
    employeeSalaries: {
      allocated: departmentBudget?.departmentExpenses?.employeeSalary || 0,
      spent: 0, // Typically salaries are fixed and fully spent
      label: "Employee Salaries",
      icon: Users,
      color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    },
    csdd: {
      allocated:
        (departmentBudget?.csddExpenses?.intercity_outstation_visits || 0) +
        (departmentBudget?.csddExpenses?.lunch_dinner_with_client || 0) +
        (departmentBudget?.csddExpenses?.mobile_sim || 0),
      spent: 0, // Track actual spending if available
      label: "CSDD ",
      icon: Heart,
      color: "bg-teal-100 text-teal-800 border-teal-200",
    },
    fixedCosts: {
      allocated: Object.values({
        electricity: departmentBudget?.fixedCosts?.electricity || 0,
        internet: departmentBudget?.fixedCosts?.internet || 0,
        maintenance: departmentBudget?.fixedCosts?.maintenance || 0,
        rent: departmentBudget?.fixedCosts?.rent || 0,
      }).reduce((sum, val) => sum + val, 0),
      spent: 0, // Track actual spending if available
      label: "Fixed Costs",
      icon: Building,
      color: "bg-gray-100 text-gray-800 border-gray-200",
      breakdown: {
        electricity: departmentBudget?.fixedCosts?.electricity || 0,
        internet: departmentBudget?.fixedCosts?.internet || 0,
        maintenance: departmentBudget?.fixedCosts?.maintenance || 0,
        rent: departmentBudget?.fixedCosts?.rent || 0,
      },
    },
  };

  // Calculate totals including all budget parts
  const calculatedTotal =
    Object.values(budgetUtilization).reduce(
      (sum, comp) => sum + (comp?.allocated || 0),
      0
    ) +
    additionalBudgetItems.employeeSalaries.allocated +
    additionalBudgetItems.csdd.allocated +
    additionalBudgetItems.fixedCosts.allocated;

  // ✅ Prefer using Firestore totalBudget if available
  const totalAllocated =
    departmentBudget?.totalBudget && departmentBudget.totalBudget > 0
      ? departmentBudget.totalBudget
      : calculatedTotal;

  const totalSpent =
    Object.values(budgetUtilization).reduce(
      (sum, comp) => sum + (comp?.spent || 0),
      0
    ) +
    additionalBudgetItems.employeeSalaries.spent +
    additionalBudgetItems.csdd.spent +
    additionalBudgetItems.fixedCosts.spent;

  const totalRemaining = totalAllocated - totalSpent;
  const overallUtilization =
    totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  const pendingIntents = purchaseIntents.filter((intent) =>
    ["pending_approval", "approved"].includes(intent.status)
  ).length;

  const pendingOrders = purchaseOrders.filter(
    (order) => order.status === "pending_hr_confirmation"
  ).length;

  // Prepare chart data for ALL budget components
  const componentChartData = Object.entries(budgetComponents)
    .filter(([key]) => budgetUtilization[key]?.allocated > 0)
    .map(([key, label]) => {
      const util = budgetUtilization[key] || {
        allocated: 0,
        spent: 0,
        remaining: 0,
        utilizationRate: 0,
      };

      return {
        id: key,
        label,
        allocated: util.allocated,
        spent: util.spent,
        remaining: util.remaining,
        utilizationRate: util.utilizationRate,
        color: componentColors[key]?.split(" ")[0] || "bg-gray-100",
        type: "component",
      };
    });

  // Add additional budget items to chart data
  const allChartData = [
    ...componentChartData,
    {
      id: "employeeSalaries",
      label: additionalBudgetItems.employeeSalaries.label,
      allocated: additionalBudgetItems.employeeSalaries.allocated,
      spent: additionalBudgetItems.employeeSalaries.spent,
      remaining:
        additionalBudgetItems.employeeSalaries.allocated -
        additionalBudgetItems.employeeSalaries.spent,
      utilizationRate:
        additionalBudgetItems.employeeSalaries.allocated > 0
          ? (additionalBudgetItems.employeeSalaries.spent /
              additionalBudgetItems.employeeSalaries.allocated) *
            100
          : 0,
      color: "bg-indigo-100",
      type: "additional",
      icon: Users,
    },
    {
      id: "csdd",
      label: additionalBudgetItems.csdd.label,
      allocated: additionalBudgetItems.csdd.allocated,
      spent: additionalBudgetItems.csdd.spent,
      remaining:
        additionalBudgetItems.csdd.allocated - additionalBudgetItems.csdd.spent,
      utilizationRate:
        additionalBudgetItems.csdd.allocated > 0
          ? (additionalBudgetItems.csdd.spent /
              additionalBudgetItems.csdd.allocated) *
            100
          : 0,
      color: "bg-teal-100",
      type: "additional",
      icon: Heart,
    },
    {
      id: "fixedCosts",
      label: additionalBudgetItems.fixedCosts.label,
      allocated: additionalBudgetItems.fixedCosts.allocated,
      spent: additionalBudgetItems.fixedCosts.spent,
      remaining:
        additionalBudgetItems.fixedCosts.allocated -
        additionalBudgetItems.fixedCosts.spent,
      utilizationRate:
        additionalBudgetItems.fixedCosts.allocated > 0
          ? (additionalBudgetItems.fixedCosts.spent /
              additionalBudgetItems.fixedCosts.allocated) *
            100
          : 0,
      color: "bg-gray-100",
      type: "additional",
      icon: Building,
      breakdown: additionalBudgetItems.fixedCosts.breakdown,
    },
  ].sort((a, b) => b.allocated - a.allocated);

  // Pie chart data
  const pieChartData = allChartData.map((item) => ({
    ...item,
    percentage: (item.allocated / totalAllocated) * 100,
  }));

  const getUtilizationColor = (rate) => {
    if (rate < 60) return "bg-green-500";
    if (rate < 85) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusColor = (status) => {
    const colors = {
      pending_approval: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      po_created: "bg-purple-100 text-purple-800",
      pending_hr_confirmation: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // Pie Chart Component
  const PieChartComponent = ({ data }) => {
    let cumulativePercentage = 0;

    // Color mapping for pie chart segments
    const colorMap = {
      blue: "#3b82f6",
      purple: "#8b5cf6",
      amber: "#f59e0b",
      indigo: "#6366f1",
      cyan: "#06b6d4",
      pink: "#ec4899",
      orange: "#f97316",
      green: "#10b981",
      red: "#ef4444",
      gray: "#6b7280",
      teal: "#14b8a6",
      yellow: "#eab308",
    };

    return (
      <div className="relative w-64 h-64 mx-auto">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full transform -rotate-90"
        >
          {data.map((item, index) => {
            const percentage = item.percentage;
            const strokeDasharray = `${percentage} 100`;
            const strokeDashoffset = -cumulativePercentage;
            cumulativePercentage += percentage;

            const colorKey = item.color.replace("bg-", "").split("-")[0];
            const strokeColor = colorMap[colorKey] || "#6b7280";

            return (
              <circle
                key={item.id}
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={strokeColor}
                strokeWidth="20"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 ease-in-out"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {overallUtilization.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Utilized</div>
          </div>
        </div>
      </div>
    );
  };

  // Bar Chart Component
  const BarChartComponent = ({ data }) => {
    const maxAllocation = Math.max(...data.map((item) => item.allocated));

    return (
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.id} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {item.icon && <item.icon className="w-4 h-4 text-gray-500" />}
                <span className="font-medium text-sm text-gray-700">
                  {item.label}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                ₹{item.allocated.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${(item.allocated / maxAllocation) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Allocated: ₹{item.allocated.toLocaleString("en-IN")}</span>
              <span>Spent: ₹{item.spent.toLocaleString("en-IN")}</span>
            </div>

            {/* Fixed Costs Breakdown */}
            {item.breakdown && (
              <div className="ml-4 mt-2 space-y-1 border-l-2 border-gray-200 pl-3">
                {Object.entries(item.breakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="capitalize text-gray-600">{key}:</span>
                    <span className="font-medium">
                      ₹{value.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Utilization Bar Chart
  const UtilizationBarChart = ({ data }) => {
    return (
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.id} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {item.icon && <item.icon className="w-4 h-4 text-gray-500" />}
                <span className="font-medium text-sm text-gray-700">
                  {item.label}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {item.utilizationRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  item.utilizationRate < 60
                    ? "bg-green-500"
                    : item.utilizationRate < 85
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${Math.min(item.utilizationRate, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Utilization: {item.utilizationRate.toFixed(1)}%</span>
              <span>Remaining: ₹{item.remaining.toLocaleString("en-IN")}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Budget Summary by Type
  const budgetSummary = {
    components: componentChartData.reduce(
      (sum, item) => sum + item.allocated,
      0
    ),
    salaries: additionalBudgetItems.employeeSalaries.allocated,
    csdd: additionalBudgetItems.csdd.allocated,
    fixedCosts: additionalBudgetItems.fixedCosts.allocated,
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_6px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{totalAllocated.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg text-blue-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_2px_4px_rgba(0,0,0,0.1)]">
              <DollarSignIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_6px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{totalSpent.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg text-rose-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_2px_4px_rgba(0,0,0,0.1)]">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_6px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Remaining</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{totalRemaining.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg text-emerald-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_2px_4px_rgba(0,0,0,0.1)]">
              <CircleCheckBig className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_6px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilization</p>
              <p className="text-2xl font-bold text-gray-900">
                {overallUtilization.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg text-purple-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_2px_4px_rgba(0,0,0,0.1)]">
              <ChartLine className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Budget Distribution Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_6px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                Dept Expense (exclude salaries)
              </p>
              <p className="text-xl font-bold text-blue-900">
                ₹{budgetSummary.components.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-blue-700">
                {((budgetSummary.components / totalAllocated) * 100).toFixed(1)}
                % of total
              </p>
            </div>
            <BarChart className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_6px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-800">Salaries</p>
              <p className="text-xl font-bold text-indigo-900">
                ₹{budgetSummary.salaries.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-indigo-700">
                {((budgetSummary.salaries / totalAllocated) * 100).toFixed(1)}%
                of total
              </p>
            </div>
            <Users className="w-8 h-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_6px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-800">CSDD</p>
              <p className="text-xl font-bold text-teal-900">
                ₹{budgetSummary.csdd.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-teal-700">
                {((budgetSummary.csdd / totalAllocated) * 100).toFixed(1)}% of
                total
              </p>
            </div>
            <Heart className="w-8 h-8 text-teal-600" />
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_6px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Fixed Costs</p>
              <p className="text-xl font-bold text-gray-900">
                ₹{budgetSummary.fixedCosts.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-gray-700">
                {((budgetSummary.fixedCosts / totalAllocated) * 100).toFixed(1)}
                % of total
              </p>
            </div>
            <Building className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>
      {/* Chart View Toggle */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Complete Budget Visualization
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("pie")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === "pie"
                  ? "bg-blue-500 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_6px_rgba(0,0,0,0.4)]"
                  : "bg-gray-100 text-gray-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_4px_6px_rgba(0,0,0,0.2)] hover:bg-gray-200 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_3px_5px_rgba(0,0,0,0.3)]"
              }`}
            >
              Pie Chart
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-blue-500 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_6px_rgba(0,0,0,0.4)]"
                  : "bg-gray-100 text-gray-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_4px_6px_rgba(0,0,0,0.2)] hover:bg-gray-200 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_3px_5px_rgba(0,0,0,0.3)]"
              }`}
            >
              Grid
            </button>

            <button
              onClick={() => setViewMode("bar")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === "bar"
                  ? "bg-blue-500 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_6px_rgba(0,0,0,0.4)]"
                  : "bg-gray-100 text-gray-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_4px_6px_rgba(0,0,0,0.2)] hover:bg-gray-200 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_3px_5px_rgba(0,0,0,0.3)]"
              }`}
            >
              Bar Chart
            </button>
            <button
              onClick={() => setViewMode("utilization")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === "utilization"
                  ? "bg-blue-500 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_6px_rgba(0,0,0,0.4)]"
                  : "bg-gray-100 text-gray-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_4px_6px_rgba(0,0,0,0.2)] hover:bg-gray-200 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_3px_5px_rgba(0,0,0,0.3)]"
              }`}
            >
              Utilization
            </button>
          </div>
        </div>

        {/* Chart Views */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allChartData.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedComponent === item.id ? "ring-2 ring-blue-500" : ""
                } ${
                  item.type === "additional"
                    ? "bg-gradient-to-br from-white to-gray-50"
                    : ""
                }`}
                onClick={() =>
                  setSelectedComponent(
                    selectedComponent === item.id ? null : item.id
                  )
                }
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {item.icon && (
                      <item.icon className="w-4 h-4 text-gray-500" />
                    )}
                    <h4 className="font-medium text-sm">{item.label}</h4>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white bg-opacity-50">
                    {item.utilizationRate.toFixed(1)}%
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Allocated:</span>
                    <span className="font-semibold">
                      ₹{item.allocated.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Spent:</span>
                    <span className="font-semibold">
                      ₹{item.spent.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Remaining:</span>
                    <span
                      className={`font-semibold ${
                        item.remaining < item.allocated * 0.1
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      ₹{item.remaining.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getUtilizationColor(
                        item.utilizationRate
                      )}`}
                      style={{
                        width: `${Math.min(item.utilizationRate, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Fixed Costs Breakdown */}
                {item.breakdown && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Breakdown:
                    </p>
                    <div className="space-y-1">
                      {Object.entries(item.breakdown).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="capitalize text-gray-500">
                            {key}:
                          </span>
                          <span className="font-medium">
                            ₹{value.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {viewMode === "pie" && (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <PieChartComponent data={pieChartData} />
            </div>
            <div className="flex-1 space-y-4">
              <h4 className="font-semibold text-gray-900 text-center lg:text-left">
                Complete Budget Allocation
              </h4>
              {pieChartData.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: `var(--${
                          item.color.replace("bg-", "").split("-")[0]
                        }-500)`,
                      }}
                    ></div>
                    <div className="flex items-center gap-2">
                      {item.icon && (
                        <item.icon className="w-3 h-3 text-gray-500" />
                      )}
                      <span className="font-medium text-sm text-gray-700">
                        {item.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      ₹{item.allocated.toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-gray-600">
                      {item.percentage.toFixed(1)}% of total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === "bar" && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                Complete Budget Allocation Comparison
              </h4>
              <BarChartComponent data={allChartData} />
            </div>
          </div>
        )}

        {viewMode === "utilization" && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Complete Budget Utilization Rates
              </h4>
              <UtilizationBarChart data={allChartData} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetOverview;
