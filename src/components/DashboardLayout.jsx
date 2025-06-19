import React, { useContext, useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from './Sidebar';

const DashboardLayout = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Sirf tab redirect karna jab user dashboard root /dashboard pe ho
    if (location.pathname === '/dashboard' && user?.role) {
      const role = user.role.toLowerCase().trim();

      switch (role) {
        case 'admin':
          navigate('/dashboard/admin', { replace: true });
          break;
        case 'sales':
          navigate('/dashboard/sales', { replace: true });
          break;
        case 'placement':
          navigate('/dashboard/placement', { replace: true });
          break;
        case 'l & d':
        case 'learning & development':
        case 'learning-development':
          navigate('/dashboard/learning-development', { replace: true });
          break;
        case 'dm':
          navigate('/dashboard/marketing', { replace: true });
          break;
        default:
          // Agar role koi match nahi karta to dashboard pe rehne do
          break;
      }
    }
  }, [location.pathname, user, navigate]);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={`flex-grow transition-all duration-300 ease-in-out min-h-screen ${
          sidebarCollapsed ? 'ml-20' : 'ml-40'
        }`}
      >
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
