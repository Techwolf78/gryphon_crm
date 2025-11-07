import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import SalesDashboard from '../components/Dashboard/SalesDashboard';
import LdDashboard from '../components/Dashboard/LdDashboard';
import PlacementDashboard from '../components/Dashboard/PlacementDashboard';
import MarketingDashboard from '../components/Dashboard/MarketingDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const { ticketAlerts, dismissAlert } = useNotifications();
  const navigate = useNavigate();
  const [activeDepartment, setActiveDepartment] = useState('sales');
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.notifications-dropdown')) {
        setShowNotificationsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const departments = [
    { id: 'sales', name: 'Sales', component: <SalesDashboard /> },
    { id: 'learning-development', name: 'Learning & Development', component: <LdDashboard /> },
    { id: 'placement', name: 'Placement', component: <PlacementDashboard /> },
    { id: 'marketing', name: 'Marketing', component: <MarketingDashboard /> }
  ];

  // Set initial department based on user's department
  useEffect(() => {
    if (user?.departments || user?.department) {
      // Handle both array and single department formats
      const userDepts = Array.isArray(user.departments) ? user.departments : (user.department ? [user.department] : []);

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

      // Use the first department that maps to a valid dashboard, or default to sales
      const mappedDepartment = userDepts
        .map(dept => departmentMapping[dept.toLowerCase()])
        .find(mapped => mapped) || 'sales';

      setActiveDepartment(mappedDepartment);
    }
  }, [user]);

  const handleDepartmentChange = (deptId) => {
    setActiveDepartment(deptId);
  };

  // Helper function to check if department belongs to user
  const isUserDepartment = (deptId) => {
    if (!user?.departments && !user?.department) return false;

    // Handle both array and single department formats
    const userDepts = Array.isArray(user.departments) ? user.departments : (user.department ? [user.department] : []);

    // Don't show "Your Dept" badge for Admin users
    if (userDepts.some(dept => dept.toLowerCase() === 'admin')) {
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

    return userDepts.some(userDept => {
      const mappedUserDept = departmentMapping[userDept.toLowerCase()];
      return deptId === mappedUserDept;
    });
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto">
        {/* Top Bar with Department Buttons and Notifications */}
        <div className="flex justify-between items-center mb-0">
          {/* Department Toggle Buttons */}
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
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

          {/* Notifications Button */}
          {ticketAlerts.length > 0 && (
            <div className="relative notifications-dropdown">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="relative rounded-lg transition-colors hover:bg-gray-100"
                title="Notifications"
              >
                <div className={`relative inline-block ${ticketAlerts.length > 0 ? 'animate-bounce' : ''}`}>
                  <FiBell className="w-6 h-6 text-gray-700" />
                  {ticketAlerts.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] text-center">
                      {ticketAlerts.length}
                    </span>
                  )}
                </div>
              </button>

              {/* Notifications Dropdown */}
              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                  <div className="px-3 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {ticketAlerts.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No new notifications
                      </div>
                    ) : (
                      ticketAlerts.map((alert) => (
                        <div key={alert.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                              <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                              <p className="text-xs text-gray-400 mt-2">
                                {(() => {
                                  try {
                                    const timestamp = alert.timestamp?.toDate?.() || alert.timestamp;
                                    const date = new Date(timestamp);
                                    return isNaN(date.getTime()) ? 'Just now' : date.toLocaleString();
                                  } catch {
                                    return 'Just now';
                                  }
                                })()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <button
                                onClick={() => {
                                  navigate('/dashboard/help', { state: { showTickets: true } });
                                }}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => dismissAlert(alert.id)}
                                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active Dashboard */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-0">
          {departments.find(d => d.id === activeDepartment)?.component}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
