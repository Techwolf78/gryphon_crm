import React from "react";
import {
  DollarSign,
  X,
} from "lucide-react";

const ViewBudgetModal = ({ show, onClose, budget }) => {
  if (!show || !budget) return null;

  // 🧩 Extract from new schema
  const summary = budget.summary || {};
  const totalAllocated = summary.totalBudget || 0;
  const totalSpent = summary.totalSpent || 0;
  const utilizationRate =
    totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  const formatNumber = (val) =>
    typeof val === "number" ? val.toLocaleString("en-IN") : val || "—";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-1000">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-200/50">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-gray-200/50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                View Budget - FY{budget.fiscalYear}
              </h2>
              <p className="text-xs text-gray-600">
                Budget details and allocation summary
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-85px)]">
          <div className="p-6 space-y-6">

            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Budget Title</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <span className="text-gray-900 font-medium">{budget.title || `${budget.department}_FY-${budget.fiscalYear}`}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Fiscal Year (FY)</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <span className="text-gray-900 font-medium">{budget.fiscalYear}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <span className="text-gray-900 font-medium capitalize">{budget.department}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Owner Name</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <span className="text-gray-900 font-medium">{budget.ownerName || "Unknown"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Costs Section */}
            {budget.fixedCosts && Object.keys(budget.fixedCosts).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-900">Fixed Costs</h3>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
                    {Object.entries(budget.fixedCosts).map(([key, val], index) => (
                      <div key={key} className={`p-4 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-r border-gray-200 last:border-r-0`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-gray-500">₹{formatNumber(val.allocated)}</span>
                        </div>
                        {val.spent > 0 && (
                          <div className="text-xs text-gray-600">
                            Spent: ₹{formatNumber(val.spent)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Department Expenses Section */}
            {budget.departmentExpenses && Object.keys(budget.departmentExpenses).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-900">Department Expenses</h3>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
                    {Object.entries(budget.departmentExpenses).map(([key, val], index) => (
                      <div key={key} className={`p-4 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-r border-gray-200 last:border-r-0`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-gray-500">₹{formatNumber(val.allocated)}</span>
                        </div>
                        {val.spent > 0 && (
                          <div className="text-xs text-gray-600">
                            Spent: ₹{formatNumber(val.spent)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CSDD Expenses Section */}
            {budget.csddExpenses && Object.keys(budget.csddExpenses).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-900">CSDD Expenses (Corporate Social & Developmental Duties)</h3>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
                    {Object.entries(budget.csddExpenses).map(([key, val], index) => (
                      <div key={key} className={`p-4 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-r border-gray-200 last:border-r-0`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-gray-500">₹{formatNumber(val.allocated)}</span>
                        </div>
                        {val.spent > 0 && (
                          <div className="text-xs text-gray-600">
                            Spent: ₹{formatNumber(val.spent)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Budget Summary Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Budget Summary</h3>
              </div>

              <div className="bg-linear-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600 mb-1">₹{formatNumber(totalAllocated)}</div>
                    <div className="text-sm text-emerald-700">Total Budget</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">₹{formatNumber(totalAllocated - totalSpent)}</div>
                    <div className="text-sm text-blue-700">Remaining</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-1">₹{formatNumber(totalSpent)}</div>
                    <div className="text-sm text-orange-700">Total Spent</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-1 ${utilizationRate < 60 ? 'text-green-600' : utilizationRate < 85 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {utilizationRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-700">Utilization</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Fixed Costs</span>
                    <span className="text-sm font-bold text-gray-900">₹{formatNumber(Object.values(budget.fixedCosts || {}).reduce((sum, item) => sum + (item.allocated || 0), 0))}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Department Expenses</span>
                    <span className="text-sm font-bold text-gray-900">₹{formatNumber(Object.values(budget.departmentExpenses || {}).reduce((sum, item) => sum + (item.allocated || 0), 0))}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">CSDD Expenses</span>
                    <span className="text-sm font-bold text-gray-900">₹{formatNumber(Object.values(budget.csddExpenses || {}).reduce((sum, item) => sum + (item.allocated || 0), 0))}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Components</span>
                    <span className="text-sm font-bold text-gray-900">
                      {Object.keys(budget.fixedCosts || {}).length + Object.keys(budget.departmentExpenses || {}).length + Object.keys(budget.csddExpenses || {}).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-gray-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Status</h3>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  budget.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : budget.status === 'draft'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {budget.status || 'active'}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewBudgetModal;
