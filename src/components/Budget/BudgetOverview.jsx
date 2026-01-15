import {
  DollarSign,
  CircleCheckBig,
  ChartLine,
  DollarSignIcon,
  PieChart,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import * as JSC from "jscharting";

const BudgetOverview = ({
  departmentBudget,
}) => {
  const [viewMode, setViewMode] = useState("bar");
  const chartRef = useRef(null);

  const totalBudget = departmentBudget?.summary?.totalBudget || 0;
  const totalSpent = departmentBudget?.summary?.totalSpent || 0;
  const totalRemaining = totalBudget - totalSpent;
  const overallUtilization =
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const flattenExpenses = (group, labelPrefix = "") => {
    if (!group) return [];
    return Object.entries(group).map(([key, val]) => ({
      id: `${labelPrefix}${key}`,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      allocated: val?.allocated || 0,
      spent: val?.spent || 0,
      remaining: (val?.allocated || 0) - (val?.spent || 0),
      utilizationRate:
        val?.allocated > 0 ? (val.spent / val.allocated) * 100 : 0,
      type: labelPrefix.replace("_", ""),
    }));
  };

  const fixedCostItems = flattenExpenses(departmentBudget.fixedCosts, "fixed_");
  const deptExpenseItems = flattenExpenses(
    departmentBudget.departmentExpenses,
    "dept_"
  );
  const csddExpenseItems = flattenExpenses(
    departmentBudget.csddExpenses,
    "csdd_"
  );

  const allItems = useMemo(() => [
    ...fixedCostItems,
    ...deptExpenseItems,
    ...csddExpenseItems,
  ], [fixedCostItems, deptExpenseItems, csddExpenseItems]);

  const totalFixed = fixedCostItems.reduce((a, c) => a + c.allocated, 0);
  const totalDept = deptExpenseItems.reduce((a, c) => a + c.allocated, 0);
  const totalCsdd = csddExpenseItems.reduce((a, c) => a + c.allocated, 0);

  const pieData = useMemo(() => [
    { name: "Fixed Costs", y: totalFixed },
    { name: "Department Expenses", y: totalDept },
    { name: "CSDD", y: totalCsdd },
  ], [totalFixed, totalDept, totalCsdd]);

  const barData = useMemo(() => allItems.map((item) => ({
    x: item.label,
    y: item.utilizationRate,
  })), [allItems]);

  // 🎨 Initialize / update chart
  useEffect(() => {
    if (!chartRef.current) return;

    // Destroy existing chart if switching mode
    if (chartRef.current.chart) chartRef.current.chart.destroy();

    if (viewMode === "pie") {
      chartRef.current.chart = new JSC.Chart("budgetChartContainer", {
        type: "pie",
        legend_visible: true,
        title_label_text: "Budget Distribution",
        palette: ["#3b82f6", "#06b6d4", "#64748b"],
        series: [
          {
            name: "Budget",
            points: pieData.map((d) => ({
              name: d.name,
              y: d.y,
              tooltip: `₹${d.y.toLocaleString("en-IN")}`,
            })),
          },
        ],
      });
    } else {
      chartRef.current.chart = new JSC.Chart("budgetChartContainer", {
        type: "column",
        title_label_text: "Expense Utilization by Category",
        legend_visible: false,
        yAxis_label_text: "Utilization (%)",
        xAxis_label_text: "Category",
        palette: "material",
        defaultPoint: {
          tooltip:
            "<b>%xValue</b><br>Utilization: %yValue%<br><hr>Allocated/Spent breakdowns visible in summary",
        },
        series: [
          {
            name: "Utilization",
            points: barData.map((d) => ({
              x: d.x,
              y: parseFloat(d.y.toFixed(2)),
            })),
          },
        ],
      });
    }
  }, [viewMode, pieData, barData]);

  if (!departmentBudget)
    return (
      <div className="text-center py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 max-w-md mx-auto">
          <h3 className="text-base font-semibold text-yellow-800 mb-1.5">
            No Budget Created
          </h3>
          <p className="text-yellow-700 mb-3 text-sm">
            Create a budget to start tracking expenses and purchase intents.
          </p>
        </div>
      </div>
    );

  return (
    <div className="space-y-3">
      {/* iOS-Style Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        {[
          {
            title: "Total Budget",
            value: totalBudget,
            icon: DollarSignIcon,
            gradient: "from-blue-500 to-blue-600",
            bgColor: "bg-white/70",
            textColor: "text-blue-600",
            shadowColor: "shadow-blue-500/10",
            borderColor: "border-blue-200/50",
          },
          {
            title: "Total Spent",
            value: totalSpent,
            icon: DollarSign,
            gradient: "from-rose-500 to-pink-600",
            bgColor: "bg-white/70",
            textColor: "text-rose-600",
            shadowColor: "shadow-rose-500/10",
            borderColor: "border-rose-200/50",
          },
          {
            title: "Remaining",
            value: totalRemaining,
            icon: CircleCheckBig,
            gradient: "from-emerald-500 to-green-600",
            bgColor: "bg-white/70",
            textColor: "text-emerald-600",
            shadowColor: "shadow-emerald-500/10",
            borderColor: "border-emerald-200/50",
          },
          {
            title: "Utilization",
            value: `${overallUtilization.toFixed(1)}%`,
            icon: ChartLine,
            gradient: "from-purple-500 to-indigo-600",
            bgColor: "bg-white/70",
            textColor: "text-purple-600",
            shadowColor: "shadow-purple-500/10",
            borderColor: "border-purple-200/50",
          },
        ].map(({ title, value, icon: Icon, gradient, bgColor, textColor, shadowColor, borderColor }) => (
          <div
            key={title}
            className={`${bgColor} backdrop-blur-sm ${borderColor} border rounded-2xl p-2 shadow-lg ${shadowColor} hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer min-h-18 flex items-center`}
          >
            <div className={`p-2.5 rounded-xl bg-linear-to-br ${gradient} shadow-md mr-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-right">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight mb-2">
                {title}
              </p>
              <p className={`text-lg font-bold ${textColor} leading-none`}>
                {typeof value === "number"
                  ? `₹${value.toLocaleString("en-IN")}`
                  : value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <SummaryCard
          label="Fixed Costs"
          amount={totalFixed}
        />
        <SummaryCard
          label="Department Expenses"
          amount={totalDept}
        />
        <SummaryCard
          label="CSDD"
          amount={totalCsdd}
        />
      </div>

      {/* Interactive Chart */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header with gradient background */}
        <div className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-3 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Budget Visualization
                </h3>
                <p className="text-sm text-gray-600">
                  Interactive charts for budget analysis
                </p>
              </div>
            </div>

            {/* Enhanced Toggle Buttons */}
            <div className="flex bg-gray-100 p-1 rounded-lg shadow-inner">
              {[
                { mode: "pie", icon: PieChart, label: "Pie Chart" },
                { mode: "bar", icon: BarChart3, label: "Bar Chart" },
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    viewMode === mode
                      ? "bg-white text-blue-600 shadow-md transform scale-105"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="p-3">
          <div
            id="budgetChartContainer"
            className="w-full h-[400px] rounded-lg bg-linear-to-br from-gray-50 to-white border border-gray-100 shadow-inner"
            ref={chartRef}
          ></div>

          {/* Chart Info */}
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Fixed Costs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                <span>Department Expenses</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span>CSDD</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Utilization */}
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-gray-50 to-slate-50 border-b border-gray-200/50 px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">Detailed Utilization</h4>
              <p className="text-sm text-gray-600">Expense breakdown by category</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {allItems
              .sort((a, b) => b.utilizationRate - a.utilizationRate)
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-semibold text-gray-900 leading-tight flex-1 mr-2">
                      {item.label}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        item.utilizationRate < 30
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : item.utilizationRate < 70
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-red-100 text-red-800 border border-red-200"
                      }`}
                    >
                      {item.utilizationRate.toFixed(1)}%
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Allocated</span>
                      <span className="font-bold text-gray-900">₹{item.allocated.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Spent</span>
                      <span className="font-bold text-gray-900">₹{item.spent.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="w-full bg-gray-200/60 rounded-full h-3 shadow-inner">
                      <div
                        className={`h-3 rounded-full transition-all duration-700 shadow-sm ${
                          item.utilizationRate < 30
                            ? "bg-linear-to-r from-emerald-400 to-emerald-500"
                            : item.utilizationRate < 70
                            ? "bg-linear-to-r from-amber-400 to-amber-500"
                            : "bg-linear-to-r from-red-400 to-red-500"
                        }`}
                        style={{ width: `${Math.min(item.utilizationRate, 100)}%` }}
                      ></div>
                    </div>
                    <div className="absolute inset-0 rounded-full bg-white/20"></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, amount }) => {
  // Define colors and styles based on the label
  const getCardStyle = () => {
    return {
      bgColor: "bg-white/80",
      borderColor: "border-gray-200/60",
      shadowColor: "shadow-gray-500/10",
      textColor: "text-gray-700",
      accentColor: "from-gray-500 to-gray-600"
    };
  };

  const style = getCardStyle();

  return (
    <div className={`${style.bgColor} backdrop-blur-sm ${style.borderColor} border rounded-xl p-2 shadow-lg ${style.shadowColor} hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer`}>
      <div className="text-center mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </p>
      </div>
      <div className="text-center">
        <p className={`text-xl font-bold ${style.textColor} leading-none`}>
          ₹{amount.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
};

export default BudgetOverview;
