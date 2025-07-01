import React from 'react';
import { FiBriefcase, FiDollarSign, FiUserCheck, FiMapPin } from 'react-icons/fi';

const PlacementDashboard = () => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Placement Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Placement-specific metrics */}
        {[
          { title: 'Placements', value: '56', icon: <FiBriefcase size={20} />, color: 'bg-indigo-500' },
          { title: 'Avg. Salary', value: '$85k', icon: <FiDollarSign size={20} />, color: 'bg-green-500' },
          { title: 'Active Candidates', value: '132', icon: <FiUserCheck size={20} />, color: 'bg-amber-500' },
          { title: 'Top Location', value: 'Remote', icon: <FiMapPin size={20} />, color: 'bg-red-500' }
        ].map((metric, index) => (
          <div key={index} className={`${metric.color} rounded-xl p-5 text-white`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium opacity-80">{metric.title}</p>
                <h3 className="text-2xl font-bold mt-1">{metric.value}</h3>
              </div>
              <div className="bg-black bg-opacity-20 p-2 rounded-lg">
                {metric.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-gray-100 p-8 rounded-lg text-center">
        <p className="text-gray-500">Placement specific charts and data will go here</p>
      </div>
    </div>
  );
};

export default PlacementDashboard;