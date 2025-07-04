import React from "react";

const ClosedLeadsProgressBar = ({
  progressPercent,
  achievedValue,
  quarterTarget,
  formatCurrency,
}) => (
  <div className="px-6 py-3 bg-gray-50 border-b">
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm font-medium text-gray-700">
        {progressPercent.toFixed(1)}%
      </span>
      <span className="text-sm text-gray-500">
        {formatCurrency(achievedValue)} of {formatCurrency(quarterTarget)}
      </span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        style={{ width: `${progressPercent}%` }}
        className={`h-2.5 rounded-full ${
          progressPercent >= 100 ? "bg-green-500" : "bg-blue-500"
        }`}
      />
    </div>
  </div>
);

export default ClosedLeadsProgressBar;
