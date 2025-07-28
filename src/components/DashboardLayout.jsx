import React, { useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../pages/Sidebar';

const DashboardLayout = () => {
  const { user } = useContext(AuthContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
      />
      <main
        className={`flex-grow transition-all duration-300 ease-in-out min-h-screen
          ${sidebarCollapsed 
            ? 'ml-0 lg:ml-16' // Change this line - was missing ml-0
            : 'ml-0 lg:ml-44' // Change this line - was missing ml-0
          }
        `}
      >
        <div className="p-2 sm:p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
