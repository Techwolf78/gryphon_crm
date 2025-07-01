import React from 'react';
import { FiBookOpen, FiUsers, FiAward, FiBarChart2 } from 'react-icons/fi';

const LdDashboard = () => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Learning & Development Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* LD-specific metrics */}
        {[
          { title: 'Active Courses', value: '12', icon: <FiBookOpen size={20} />, color: 'bg-blue-500' },
          { title: 'Enrolled Students', value: '245', icon: <FiUsers size={20} />, color: 'bg-green-500' },
          { title: 'Certifications', value: '87', icon: <FiAward size={20} />, color: 'bg-purple-500' },
          { title: 'Completion Rate', value: '78%', icon: <FiBarChart2 size={20} />, color: 'bg-amber-500' }
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
        <p className="text-gray-500">Learning & Development specific charts and data will go here</p>
      </div>
    </div>
  );
};

export default LdDashboard;