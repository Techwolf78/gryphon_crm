import React from "react";
import PropTypes from "prop-types";
import { FiTarget, FiCheckCircle } from "react-icons/fi";

const ClosedLeadsProgressBar = ({
  progressPercent,
  achievedValue,
  quarterTarget,
  formatCurrency,
}) => {
  const isTargetAchieved = progressPercent >= 100;
  const progressColor = isTargetAchieved ? "from-green-400 to-green-500" : "from-blue-400 to-blue-500";
  const progressTextColor = isTargetAchieved ? "text-green-600" : "text-blue-600";

  return (
    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
      <div className="max-w-screen-2xl mx-auto">
        {/* Progress Labels */}
        <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isTargetAchieved ? 'bg-green-100' : 'bg-blue-100'}`}>
              {isTargetAchieved ? (
                <FiCheckCircle className={`text-green-600`} size={18} />
              ) : (
                <FiTarget className={`text-blue-600`} size={18} />
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">Quarterly Target Progress</h3>
              <p className={`text-xs ${progressTextColor} font-medium`}>
                {progressPercent.toFixed(1)}% completed
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">
              {formatCurrency(achievedValue)} <span className="text-gray-400">/</span> {formatCurrency(quarterTarget)}
            </p>
            <p className="text-xs text-gray-500">
              {isTargetAchieved ? "Target achieved" : "Remaining: " + formatCurrency(quarterTarget - achievedValue)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
            className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-500 ease-out`}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin="0"
            aria-valuemax="100"
          />
        </div>

        {/* Performance Indicator */}
        {progressPercent > 100 && (
          <div className="mt-2 text-right">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              +{formatCurrency(achievedValue - quarterTarget)} over target
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

ClosedLeadsProgressBar.propTypes = {
  progressPercent: PropTypes.number.isRequired,
  achievedValue: PropTypes.number.isRequired,
  quarterTarget: PropTypes.number.isRequired,
  formatCurrency: PropTypes.func.isRequired,
};

export default ClosedLeadsProgressBar;