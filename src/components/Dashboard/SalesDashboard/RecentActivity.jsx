// components/dashboard/RecentActivity.jsx
import React from 'react';
import { FiDollarSign, FiUsers } from 'react-icons/fi';

const RecentActivity = ({ recentActivity = [], isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center p-3">
            <div className="h-4 bg-gray-200 rounded-full w-full animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  // Handle case when there's no data
  if (!recentActivity || recentActivity.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">No recent activity to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recentActivity.map((activity) => (
        <div key={activity.id} className="p-3 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="flex justify-between">
            <div className="flex items-start">
              <div className={`p-2 rounded-lg ${
                activity.amount ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {activity.amount ? <FiDollarSign size={16} /> : <FiUsers size={16} />}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-xs text-gray-500">{activity.company}</p>
              </div>
            </div>
            <span className="text-xs text-gray-400">{activity.time}</span>
          </div>
          {activity.amount && (
            <div className="mt-2 ml-11">
              <span className="text-sm font-medium text-gray-900">
                ₹{activity.amount.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default RecentActivity;