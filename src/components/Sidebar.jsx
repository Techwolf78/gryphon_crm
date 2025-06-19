import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  FiHome, FiUsers, FiDollarSign, FiBriefcase, FiBook,
  FiTrendingUp, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';

// Role-based links
const roleLinks = {
  admin: [
    { label: 'Admin', path: '/dashboard/admin', icon: <FiUsers /> },
    { label: 'Sales', path: '/dashboard/sales', icon: <FiDollarSign /> },
    { label: 'Placement', path: '/dashboard/placement', icon: <FiBriefcase /> },
    { label: 'L & D', path: '/dashboard/learning-development', icon: <FiBook /> },
    { label: 'D M', path: '/dashboard/marketing', icon: <FiTrendingUp /> },
  ],
  sales: [
    { label: 'Sales', path: '/dashboard/sales', icon: <FiDollarSign /> }
  ],
  placement: [
    { label: 'Placement', path: '/dashboard/placement', icon: <FiBriefcase /> }
  ],
  'learning-development': [
    { label: 'L & D', path: '/dashboard/learning-development', icon: <FiBook /> }
  ],
  marketing: [
    { label: 'D M', path: '/dashboard/marketing', icon: <FiTrendingUp /> }
  ]
};

// Role name cleaner
const normalizeRole = (role) =>
  role?.toLowerCase().replace('&', 'and').replace(/\s+/g, '-').trim();

const Sidebar = ({ collapsed, onToggle }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return null;

  const normalizedRole = normalizeRole(user.role);

  const isActive = (path) => {
  if (path === '/dashboard') {
    return location.pathname === '/dashboard';
  }
  return location.pathname.startsWith(path);
};


  // 🟢 Important: skipRedirect set here for dashboard only
  const commonLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: <FiHome />, skipRedirect: true }
  ];

  const links = [...commonLinks, ...(roleLinks[normalizedRole] || [])];

  return (
    <aside className={`
      ${collapsed ? 'w-20' : 'w-[168px]'}
      bg-blue-700 text-white flex flex-col
      fixed h-full z-50
      transition-all duration-300 ease-in-out
    `}>
      <div className="px-6 py-6 text-2xl font-bold border-b border-blue-600 flex items-center justify-between">
        {!collapsed && <span className="whitespace-nowrap">GA CRM</span>}
        <button
          onClick={onToggle}
          className="text-white hover:text-blue-200 focus:outline-none"
          aria-label="Toggle Sidebar"
        >
          {collapsed ? <FiChevronRight size={24} /> : <FiChevronLeft size={24} />}
        </button>
      </div>

      <nav className="flex-grow px-4 py-6 space-y-3 overflow-y-auto">
        {links.map(({ label, path, icon, skipRedirect }) => (
          <Link
            key={path}
            to={path}
            state={skipRedirect ? { skipRedirect: true } : undefined}
            className={`flex items-center px-4 py-2 rounded hover:bg-blue-600 transition ${
              isActive(path) ? 'bg-blue-800 font-semibold' : ''
            }`}
            title={collapsed ? label : ''}
            aria-label={label}
          >
            <span className="text-xl">{icon}</span>
            {!collapsed && <span className="ml-3 whitespace-nowrap">{label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
