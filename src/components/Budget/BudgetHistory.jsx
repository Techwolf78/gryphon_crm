import React, { useState, useEffect } from "react";
import { DepartmentService } from "./services/DepartmentService";

export default function BudgetHistory({ department }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!department) return;

    setLoading(true);
    const unsub = DepartmentService.subscribeToBudgets(department, (data) => {
      setBudgets(data);
      setLoading(false);
    });

    return () => unsub();
  }, [department]);

  const displayDept =
    department?.toLowerCase() === "lnd"
      ? "L&D"
      : department?.charAt(0).toUpperCase() + department?.slice(1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="ml-3 text-gray-500 text-sm">Loading budget history...</p>
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-base">No budget history found</p>
        <p className="text-gray-400 mt-1.5 text-sm">
          Create a budget to get started
        </p>
      </div>
    );
  }

  // Sort: active first, then by fiscal year descending
  const sorted = [...budgets].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    return parseInt(b.fiscalYear) - parseInt(a.fiscalYear);
  });

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-bold text-gray-900">
        {displayDept} — All Budgets
      </h3>

      <div className="grid gap-3">
        {sorted.map((budget) => {
          const totalBudget = budget.summary?.totalBudget || 0;
          const totalSpent = budget.summary?.totalSpent || 0;
          const remaining = totalBudget - totalSpent;
          const utilization =
            totalBudget > 0
              ? ((totalSpent / totalBudget) * 100).toFixed(1)
              : "0.0";

          return (
            <div
              key={budget.id}
              className={`border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all text-sm ${
                budget.status === "active"
                  ? "bg-green-50/60 border-green-200"
                  : "bg-white"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 text-base">
                      FY {budget.fiscalYear} Budget
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        budget.status === "active"
                          ? "bg-green-100 text-green-800"
                          : budget.status === "draft"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {budget.status}
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                    <span>
                      Total:{" "}
                      <span className="font-semibold text-gray-900">
                        ₹{totalBudget.toLocaleString("en-IN")}
                      </span>
                    </span>
                    <span>
                      Spent:{" "}
                      <span className="font-semibold text-gray-700">
                        ₹{totalSpent.toLocaleString("en-IN")}
                      </span>
                    </span>
                    <span>
                      Remaining:{" "}
                      <span
                        className={`font-semibold ${remaining >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        ₹{remaining.toLocaleString("en-IN")}
                      </span>
                    </span>
                    <span>
                      Utilization:{" "}
                      <span className="font-semibold text-blue-600">
                        {utilization}%
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Utilization bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      parseFloat(utilization) > 100
                        ? "bg-red-500"
                        : parseFloat(utilization) > 80
                          ? "bg-amber-500"
                          : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min(parseFloat(utilization), 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
