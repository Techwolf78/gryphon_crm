// components/Sidebar.jsx
import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  FiHome, FiUsers, FiDollarSign, FiBriefcase, FiBook,
  FiTrendingUp, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';

const Sidebar = ({ collapsed, onToggle }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return null;

  // Normalize role to lowercase and trim spaces
  const normalizedRole = user.role.toLowerCase().trim();

  const isActive = (path) => location.pathname === path;

  const commonLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: <FiHome /> }
  ];

  const roleLinks = {
    admin: [
      { label: 'Admin', path: '/dashboard/admin', icon: <FiUsers /> },
      { label: 'Sales', path: '/dashboard/sales', icon: <FiDollarSign /> },
      { label: 'Placement', path: '/dashboard/placement', icon: <FiBriefcase /> },
      { label: 'L & D', path: '/dashboard/learning-development', icon: <FiBook /> },
      { label: 'D M', path: '/dashboard/marketing', icon: <FiTrendingUp /> },  // updated path here
    ],
    sales: [
      { label: 'Sales', path: '/dashboard/sales', icon: <FiDollarSign /> }
    ],
    placement: [
      { label: 'Placement', path: '/dashboard/placement', icon: <FiBriefcase /> }
    ],
    learning: [
      { label: 'L & D', path: '/dashboard/learning-development', icon: <FiBook /> }
    ],
    marketing: [
      { label: 'D M', path: '/dashboard/marketing', icon: <FiTrendingUp /> }  // updated path here
    ],
  };

  // Sidebar me links aise milega:
  const links = [...commonLinks, ...(roleLinks[normalizedRole] || [])];

  return (
    <aside className={`
      ${collapsed ? 'w-20' : 'w-42'}
      bg-blue-700 text-white flex flex-col
      fixed h-full z-50
      transition-all duration-300 ease-in-out
    `}>
      <div className="px-6 py-6 text-2xl font-bold border-b border-blue-600 flex items-center justify-between">
        {!collapsed && <span className="whitespace-nowrap">GA CRM</span>}
        <button 
          onClick={onToggle}
          className="text-white hover:text-blue-200 focus:outline-none"
        >
          {collapsed ? <FiChevronRight size={24} /> : <FiChevronLeft size={24} />}
        </button>
      </div>
      <nav className="flex-grow px-4 py-6 space-y-3 overflow-y-auto">
        {links.map(({ label, path, icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center px-4 py-2 rounded hover:bg-blue-600 transition ${
              isActive(path) ? 'bg-blue-800 font-semibold' : ''
            }`}
            title={collapsed ? label : ''}
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
