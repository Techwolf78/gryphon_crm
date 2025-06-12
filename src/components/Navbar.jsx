import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

import {
  FaStar,
  FaQuestionCircle,
  FaHome,
  FaTachometerAlt,
  FaSignOutAlt,
} from 'react-icons/fa';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const isDashboard = location.pathname === '/dashboard';
  const isLogin = location.pathname === '/login';
  const isHome = location.pathname === '/';

  const formatDisplayName = (email) => {
    const domain = '@gryphonacademy.co.in';
    if (email.endsWith(domain)) {
      const namePart = email.split('@')[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return email;
  };

  const navItemClass =
    'group flex items-center gap-2 relative transition text-white hover:text-white';

  return (
    <nav className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <Link to="/" className="flex items-center">
        <img
          src="https://res.cloudinary.com/dcjmaapvi/image/upload/v1740489025/ga-hori_ylcnm3.png"
          alt="Gryphon CRM Logo"
          className="h-20 w-auto"
        />
      </Link>

      <div className="flex items-center space-x-6">
        {/* Home Page: Features + FAQ + Login */}
        {isHome && !user && (
          <>
            <a href="#features" className="relative group text-white">
              <span className="relative inline-block transition duration-300 group-hover:text-yellow-400">
                Features
                <span className="absolute left-0 -bottom-1 w-full h-0.5 bg-yellow-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-300"></span>
              </span>
            </a>
            <a href="#faq" className="relative group text-white">
              <span className="relative inline-block transition duration-300 group-hover:text-yellow-400">
                FAQ
                <span className="absolute left-0 -bottom-1 w-full h-0.5 bg-yellow-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-300"></span>
              </span>
            </a>
            <Link
              to="/login"
              className="relative group text-white transition"
            >
              <span className="relative inline-block transition duration-300 group-hover:text-yellow-400">
                Login
                <span className="absolute left-0 -bottom-1 w-full h-0.5 bg-yellow-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-300"></span>
              </span>
            </Link>
          </>
        )}

        {/* Login Page: Home icon with tooltip */}
        {isLogin && !user && (
          <div className="relative group">
            <Link to="/" className="text-white hover:text-white">
              <FaHome className="text-white text-4xl transition" />
            </Link>
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none">
              Home
            </div>
          </div>
        )}

        {/* Authenticated User */}
        {user && (
          <>
            {user.role === 'admin' && (
              <Link to="/dashboard" className={navItemClass}>
                <FaTachometerAlt
                  className={`transition ${
                    isDashboard
                      ? 'text-green-400 animate-pulse'
                      : 'text-white group-hover:text-yellow-400'
                  }`}
                />
                <span
                  className={`relative inline-block transition duration-300 ${
                    isDashboard ? 'text-green-400 font-semibold' : 'group-hover:text-yellow-400'
                  }`}
                >
                  Dashboard
                  <span className="absolute left-0 -bottom-1 w-full h-0.5 bg-yellow-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-300"></span>
                </span>
              </Link>
            )}
            <span className="text-sm font-medium bg-blue-800 text-white px-3 py-1 rounded animate-[fadein_0.5s_ease-out]">
              {formatDisplayName(user.email)}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-red-700 text-white px-4 py-2 rounded hover:bg-red-600 transition"
            >
              <FaSignOutAlt className="group-hover:text-yellow-400 transition" />
              Logout
            </button>
          </>
        )}
      </div>

      {/* Inline animation keyframe */}
      <style>{`
        @keyframes fadein {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
