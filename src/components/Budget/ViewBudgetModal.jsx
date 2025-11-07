import React from "react";
import {
  Building,
  Calendar,
  User,
  Clock,
  DollarSign,
  PieChart,
  TrendingUp,
  X,
} from "lucide-react";

const ViewBudgetModal = ({ show, onClose, budget, componentColors = {} }) => {
  if (!show || !budget) return null;

  // 🧩 Extract from new schema
  const summary = budget.summary || {};
  const totalAllocated = summary.totalBudget || 0;
  const totalSpent = summary.totalSpent || 0;
  const totalRemaining = summary.totalRemaining ?? totalAllocated - totalSpent;
  const utilizationRate =
    totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  // 🔹 New unified categories
  const sections = [
    { title: "Fixed Costs", data: budget.fixedCosts || {} },
    { title: "Department Expenses", data: budget.departmentExpenses || {} },
    { title: "CSDD Expenses", data: budget.csddExpenses || {} },
  ];

  const getStatusColor = (status) => {
    const colors = {
      active: "bg-green-100 text-green-800 border-green-200",
      draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
      archived: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getUtilizationColor = (rate) => {
    if (rate < 60) return "text-green-600";
    if (rate < 85) return "text-yellow-600";
    return "text-red-600";
  };

  const formatNumber = (val) =>
    typeof val === "number" ? val.toLocaleString("en-IN") : val || "—";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[1000]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Budget Overview
            </h2>
            <p className="text-gray-600 mt-1">
              Allocation and spending summary for the department
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Department
                    </p>
                    <p className="text-lg font-bold text-blue-900 capitalize">
                      {budget.department}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">
                      Fiscal Year
                    </p>
                    <p className="text-lg font-bold text-purple-900">
                      FY{budget.fiscalYear}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">
                      Created By
                    </p>
                    <p className="text-lg font-bold text-orange-900">
                      {budget.ownerName || "Unknown"}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`border rounded-xl p-4 ${getStatusColor(
                  budget.status
                )}`}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5" />
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-lg font-bold capitalize">
                      {budget.status || "active"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Total Budget</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{formatNumber(totalAllocated)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{formatNumber(totalSpent)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p
                    className={`text-2xl font-bold ${getUtilizationColor(
                      utilizationRate
                    )}`}
                  >
                    ₹{formatNumber(totalRemaining)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Overall Utilization</span>
                  <span>{utilizationRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      utilizationRate < 60
                        ? "bg-green-500"
                        : utilizationRate < 85
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 🔹 Budget Sections */}
            <div className="space-y-6">
              {sections.map(
                ({ title, data }) =>
                  data &&
                  Object.keys(data).length > 0 && (
                    <div
                      key={title}
                      className="border border-gray-200 rounded-xl p-4"
                    >
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <PieChart className="w-4 h-4" />
                        {title}
                      </h4>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="text-left py-2 px-3 border border-gray-300">
                                Component
                              </th>
                              <th className="text-right py-2 px-3 border border-gray-300">
                                Allocated
                              </th>
                              <th className="text-right py-2 px-3 border border-gray-300">
                                Spent
                              </th>
                              <th className="text-right py-2 px-3 border border-gray-300">
                                Remaining
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(data).map(([key, val]) => {
                              const remaining =
                                (val.allocated || 0) - (val.spent || 0);
                              return (
                                <tr key={key} className="hover:bg-gray-50">
                                  <td className="py-2 px-3 border border-gray-300 capitalize">
                                    {key.replace(/_/g, " ")}
                                  </td>
                                  <td className="text-right py-2 px-3 border border-gray-300">
                                    ₹{formatNumber(val.allocated)}
                                  </td>
                                  <td className="text-right py-2 px-3 border border-gray-300">
                                    ₹{formatNumber(val.spent)}
                                  </td>
                                  <td
                                    className={`text-right py-2 px-3 border border-gray-300 ${
                                      remaining < 0
                                        ? "text-red-600 font-semibold"
                                        : ""
                                    }`}
                                  >
                                    ₹{formatNumber(remaining)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Performance Metrics
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="font-medium">
                      {budget.lastUpdatedAt
                        ? new Date(
                            budget.lastUpdatedAt.seconds
                              ? budget.lastUpdatedAt.seconds * 1000
                              : budget.lastUpdatedAt
                          ).toLocaleDateString("en-IN")
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Budget Health</span>
                    <span
                      className={`font-medium ${getUtilizationColor(
                        utilizationRate
                      )}`}
                    >
                      {utilizationRate < 60
                        ? "Excellent"
                        : utilizationRate < 85
                        ? "Good"
                        : "Critical"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Additional Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Department Code</span>
                    <span className="font-medium uppercase">
                      {budget.department}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fiscal Period</span>
                    <span className="font-medium">
                      April 20{budget.fiscalYear?.split("-")[0]} - March 20
                      {budget.fiscalYear?.split("-")[1]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewBudgetModal;
