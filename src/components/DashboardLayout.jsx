import React, { useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../pages/Sidebar';

const DashboardLayout = () => {
  const { user } = useContext(AuthContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem('sidebar_collapsed');
      if (raw !== null) return JSON.parse(raw);
    } catch {
      // ignore
    }
    // Default to collapsed
    return true;
  });
  const [sidebarHovered, setSidebarHovered] = useState(false);

  // Auto-collapse sidebar on mobile only when user has not set a preference
  useEffect(() => {
    const handleResize = () => {
      try {
        const raw = localStorage.getItem('sidebar_collapsed');
        if (raw !== null) return; // respect user preference
      } catch {
        // ignore
      }
      setSidebarCollapsed(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onHoverChange={setSidebarHovered}
        user={user}
      />
      <main
        className={`grow transition-all duration-300 ease-in-out min-h-screen
          ${sidebarCollapsed && !sidebarHovered
            ? 'ml-0 lg:ml-16'
            : 'ml-0 lg:ml-36'
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
