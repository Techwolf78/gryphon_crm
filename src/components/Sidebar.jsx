// components/Sidebar.jsx
import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  const roleLinks = {
    admin: [
      { label: 'Admin', path: '/dashboard/admin' },
      { label: 'Sales', path: '/dashboard/sales' },
      { label: 'Placement', path: '/dashboard/placement' },
      { label: 'L & D', path: '/dashboard/learning-development' },
      { label: 'D M', path: '/dashboard/digital-marketing' },
    ],
    sales: [{ label: 'Sales', path: '/dashboard/sales' }],
    placement: [{ label: 'Placement', path: '/dashboard/placement' }],
    learning: [{ label: 'L & D', path: '/dashboard/learning-development' }],
    marketing: [{ label: 'D M', path: '/dashboard/digital-marketing' }],
  };

  const links = roleLinks[user.role] || [];

  return (
    <aside className="w-64 bg-blue-700 text-white flex flex-col">
      <div className="px-6 py-6 text-2xl font-bold border-b border-blue-600">
        Gryphon CRM
      </div>
<nav className="flex-grow px-4 py-6 space-y-3">
  {user.role === 'admin' && (
    <Link
      to="/dashboard"
      className={`block px-4 py-2 rounded hover:bg-blue-600 transition ${
        isActive('/dashboard') ? 'bg-blue-800 font-semibold' : ''
      }`}
    >
      Dashboard
    </Link>
  )}
  {links.map(({ label, path }) => (
    <Link
      key={path}
      to={path}
      className={`block px-4 py-2 rounded hover:bg-blue-600 transition ${
        isActive(path) ? 'bg-blue-800 font-semibold' : ''
      }`}
    >
      {label}
    </Link>
  ))}
</nav>

    </aside>
  );
};

export default Sidebar;
