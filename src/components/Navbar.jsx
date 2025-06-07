import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

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

  return (
    <nav className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <Link to="/" className="flex items-center">
        <img
          src="https://res.cloudinary.com/dcjmaapvi/image/upload/v1740489025/ga-hori_ylcnm3.png"
          alt="Gryphon CRM Logo"
          className="h-20 w-auto"
        />
      </Link>

      <div className="flex items-center space-x-4">
        {isHome && !user && (
          <>
            <a href="#features" className="hover:text-blue-100 transition">Features</a>
            <a href="#faq" className="hover:text-blue-100 transition">FAQ</a>
            <Link
              to="/login"
              className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Login
            </Link>
          </>
        )}

        {isLogin && !user && (
          <>
            <Link to="/" className="hover:text-blue-100 transition">Home</Link>
          </>
        )}

        {user && (
          <>
            {user.role === 'admin' && (
              <Link
                to="/dashboard"
                className={`transition ${
                  isDashboard ? 'text-green-400 font-semibold' : 'hover:text-cyan-400'
                }`}
              >
                Dashboard
              </Link>
            )}
            <span className="text-sm font-medium bg-blue-800 text-white px-3 py-1 rounded">
              {formatDisplayName(user.email)}
            </span>
            <button
              onClick={logout}
              className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-600 transition"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
