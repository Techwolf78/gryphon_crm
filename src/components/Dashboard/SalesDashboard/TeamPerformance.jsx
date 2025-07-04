// components/dashboard/TeamPerformance.jsx
import React from 'react';

const TeamPerformance = ({ teamPerformance = [], isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3">
            <div className="h-4 bg-gray-200 rounded-full w-3/4 animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  // Handle case when there's no data
  if (!teamPerformance || teamPerformance.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">No team performance data available</p>
      </div>
    );
  }

  // Find the maximum value for percentage calculation
  const maxValue = Math.max(...teamPerformance.map(member => member.value));

  return (
    <div className="space-y-4">
      {teamPerformance.map((member, index) => (
        <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="flex items-center">
            <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-medium">
              {member.name.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{member.name}</p>
              <p className="text-xs text-gray-500">{member.role}</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-32 h-2 bg-gray-200 rounded-full mr-3">
              <div 
                className="h-2 rounded-full bg-indigo-600" 
                style={{ width: `${Math.min(100, (member.value / maxValue) * 100)}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-900">{member.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamPerformance;