import {
  DollarSign,
  CircleCheckBig,
  ChartLine,
  DollarSignIcon,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import * as JSC from "jscharting";

const BudgetOverview = ({
  departmentBudget,
  purchaseIntents = [],
  purchaseOrders = [],
}) => {
  const [viewMode, setViewMode] = useState("bar");
  const chartRef = useRef(null);

  if (!departmentBudget)
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            No Budget Created
          </h3>
          <p className="text-yellow-700 mb-4">
            Create a budget to start tracking expenses and purchase intents.
          </p>
        </div>
      </div>
    );

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

  const allItems = [
    ...fixedCostItems,
    ...deptExpenseItems,
    ...csddExpenseItems,
  ];

  const totalFixed = fixedCostItems.reduce((a, c) => a + c.allocated, 0);
  const totalDept = deptExpenseItems.reduce((a, c) => a + c.allocated, 0);
  const totalCsdd = csddExpenseItems.reduce((a, c) => a + c.allocated, 0);

  const pieData = [
    { name: "Fixed Costs", y: totalFixed },
    { name: "Department Expenses", y: totalDept },
    { name: "CSDD", y: totalCsdd },
  ];

  const barData = allItems.map((item) => ({
    x: item.label,
    y: item.utilizationRate,
  }));

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
  }, [viewMode, JSON.stringify(pieData), JSON.stringify(barData)]);

  const getColor = (rate) => {
    if (rate < 60) return "text-green-600";
    if (rate < 85) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            title: "Total Budget",
            value: totalBudget,
            icon: DollarSignIcon,
            color: "bg-blue-100 text-blue-600",
          },
          {
            title: "Total Spent",
            value: totalSpent,
            icon: DollarSign,
            color: "bg-rose-100 text-rose-600",
          },
          {
            title: "Remaining",
            value: totalRemaining,
            icon: CircleCheckBig,
            color: "bg-green-100 text-green-600",
          },
          {
            title: "Utilization",
            value: `${overallUtilization.toFixed(1)}%`,
            icon: ChartLine,
            color: "bg-purple-100 text-purple-600",
          },
        ].map(({ title, value, icon: Icon, color }) => (
          <div
            key={title}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {typeof value === "number"
                    ? `₹${value.toLocaleString("en-IN")}`
                    : value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Fixed Costs"
          amount={totalFixed}
          color="text-gray-600"
        />
        <SummaryCard
          label="Department Expenses"
          amount={totalDept}
          color="text-blue-600"
        />
        <SummaryCard label="CSDD" amount={totalCsdd} color="text-teal-600" />
      </div>

      {/* Interactive Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Budget Visualization
          </h3>
          <div className="flex gap-2">
            {["pie", "bar"].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  viewMode === mode
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {mode === "pie" ? "Pie Chart" : "Bar Chart"}
              </button>
            ))}
          </div>
        </div>
        <div
          id="budgetChartContainer"
          className="w-full h-[400px]"
          ref={chartRef}
        ></div>
      </div>

      {/* Detailed Utilization List */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h4 className="text-lg font-semibold mb-3">Detailed Utilization</h4>
        <div className="space-y-2">
          {allItems.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.label}</span>
              <span
                className={`font-semibold ${getColor(item.utilizationRate)}`}
              >
                {item.utilizationRate.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, amount, color }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
    <p className={`text-sm font-medium ${color}`}>{label}</p>
    <p className="text-xl font-bold text-gray-900">
      ₹{amount.toLocaleString("en-IN")}
    </p>
  </div>
);

export default BudgetOverview;
