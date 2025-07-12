import React, { useState } from 'react';
import SalesDashboard from '../components/Dashboard/SalesDashboard';
import LdDashboard from '../components/Dashboard/LdDashboard';
import PlacementDashboard from '../components/Dashboard/PlacementDashboard';
import MarketingDashboard from '../components/Dashboard/MarketingDashboard';

const Dashboard = () => {
  const [activeDepartment, setActiveDepartment] = useState('sales');

  const departments = [
    { id: 'sales', name: 'Sales', component: <SalesDashboard /> },
    { id: 'ld', name: 'Learning & Development', component: <LdDashboard /> },
    { id: 'placement', name: 'Placement', component: <PlacementDashboard /> },
    { id: 'marketing', name: 'Marketing', component: <MarketingDashboard /> }
  ];

  return (
    <div className="min-h-screen ">
      <div className="mx-auto ">
        {/* Department Toggle Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setActiveDepartment(dept.id)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeDepartment === dept.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>

        {/* Active Dashboard */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          {departments.find(d => d.id === activeDepartment)?.component}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;