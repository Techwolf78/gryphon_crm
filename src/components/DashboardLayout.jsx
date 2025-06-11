// components/DashboardLayout.jsx
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div
        className={`transition-all duration-300 ease-in-out flex-1 px-4 md:px-6 lg:px-8 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <Outlet context={{ sidebarCollapsed }} />
      </div>
    </div>
  );
};

export default DashboardLayout;
