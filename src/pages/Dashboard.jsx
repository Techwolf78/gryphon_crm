import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SalesDashboard from '../components/Dashboard/SalesDashboard';
import LdDashboard from '../components/Dashboard/LdDashboard';
import PlacementDashboard from '../components/Dashboard/PlacementDashboard';
import MarketingDashboard from '../components/Dashboard/MarketingDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const [activeDepartment, setActiveDepartment] = useState('sales');

  const departments = [
    { id: 'sales', name: 'Sales', component: <SalesDashboard /> },
    { id: 'learning-development', name: 'Learning & Development', component: <LdDashboard /> },
    { id: 'placement', name: 'Placement', component: <PlacementDashboard /> },
    { id: 'marketing', name: 'Marketing', component: <MarketingDashboard /> }
  ];

  // Set initial department based on user's department
  useEffect(() => {
    if (user?.department) {
      const userDept = user.department.toLowerCase();
      
      // Map user department to dashboard IDs
      const departmentMapping = {
        'sales': 'sales',
        'learning & development': 'learning-development',
        'l & d': 'learning-development',
        'ld': 'learning-development',
        'learning-development': 'learning-development',
        'placement': 'placement',
        'marketing': 'marketing',
        'admin': 'sales'
      };
      
      const mappedDepartment = departmentMapping[userDept] || 'sales';
      setActiveDepartment(mappedDepartment);
    }
  }, [user]);

  const handleDepartmentChange = (deptId) => {
    setActiveDepartment(deptId);
  };

  // Helper function to check if department belongs to user
  const isUserDepartment = (deptId) => {
    if (!user?.department) return false;
    
    const userDept = user.department.toLowerCase();
    
    // Don't show "Your Dept" badge for Admin users
    if (userDept === 'admin') {
      return false;
    }
    
    // Direct mapping check for non-admin users
    const departmentMapping = {
      'sales': 'sales',
      'learning & development': 'learning-development',
      'l & d': 'learning-development',
      'ld': 'learning-development',
      'learning-development': 'learning-development',
      'placement': 'placement',
      'marketing': 'marketing'
    };
    
    const mappedUserDept = departmentMapping[userDept];
    return deptId === mappedUserDept;
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto">
        {/* Department Toggle Buttons */}
        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2">
          {departments.map((dept) => {
            const isActive = activeDepartment === dept.id;
            const isUserDept = isUserDepartment(dept.id);
            
            return (
              <button
                key={dept.id}
                onClick={() => handleDepartmentChange(dept.id)}
                className={`px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-sm ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span className="hidden sm:inline">{dept.name}</span>
                <span className="sm:hidden">
                  {dept.name.split(' ')[0]}
                </span>
                {/* Show user's department with a badge (except for Admin) */}
                {isUserDept && (
                  <span className="ml-1 sm:ml-2 text-xs bg-blue-100 text-blue-600 px-1 sm:px-2 py-0.5 rounded-full">
                    <span className="hidden sm:inline">Your Dept</span>
                    <span className="sm:hidden">You</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Dashboard */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 sm:p-4">
          {departments.find(d => d.id === activeDepartment)?.component}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;