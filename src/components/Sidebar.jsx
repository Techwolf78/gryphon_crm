import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import logo from "../assets/SYNC-logo-2.png";
import compactLogo from "../assets/s-final.png"; // Import the compact logo
// Import your custom icons
import collapseIcon from "../assets/sidebar-close.png";
import expandIcon from "../assets/sidebar-open.png";
import { MdOutlineCurrencyRupee } from "react-icons/md";
import {
  FiHome,
  FiUsers,
  FiBriefcase,
  FiBook,
  FiTrendingUp,
  FiHelpCircle,
} from "react-icons/fi";

// Role-based links
const roleLinks = {
  admin: [
    { label: "Admin", path: "/dashboard/admin", icon: <FiUsers /> },
    {
      label: "Sales",
      path: "/dashboard/sales",
      icon: <MdOutlineCurrencyRupee />,
    },
    { label: "Placement", path: "/dashboard/placement", icon: <FiBriefcase /> },
    {
      label: "L & D",
      path: "/dashboard/learning-development",
      icon: <FiBook />,
    },
    { label: "D M", path: "/dashboard/marketing", icon: <FiTrendingUp /> },
  ],
  sales: [
    {
      label: "Sales",
      path: "/dashboard/sales",
      icon: <MdOutlineCurrencyRupee />,
    },
  ],
  placement: [
    { label: "Placement", path: "/dashboard/placement", icon: <FiBriefcase /> },
  ],
  "learning-development": [
    {
      label: "L & D",
      path: "/dashboard/learning-development",
      icon: <FiBook />,
    },
  ],
  marketing: [
    { label: "D M", path: "/dashboard/marketing", icon: <FiTrendingUp /> },
  ],
};

// Normalize roles
const normalizeRole = (roleOrDepartment) => {
  if (!roleOrDepartment) return "";

  const normalized = String(roleOrDepartment)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("sales")) return "sales";
  if (normalized.includes("placement")) return "placement";
  if (
    normalized.includes("learning") ||
    normalized.includes("l&d") ||
    normalized.includes("ld")
  )
    return "learning-development";
  if (normalized.includes("marketing") || normalized.includes("dm"))
    return "marketing";

  return "";
};

const Sidebar = ({ collapsed, onToggle }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return null;

  const normalizedRole =
    normalizeRole(user.department) || normalizeRole(user.role);

  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const links = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <FiHome />,
      skipRedirect: true,
    },
    ...(roleLinks[normalizedRole] || []),
    {
      label: "Help",
      path: "/dashboard/help",
      icon: <FiHelpCircle />,
      skipRedirect: true,
    },
  ];

  return (
    <aside
      className={`
        ${collapsed ? "w-20" : "w-[168px]"}
        bg-white border-r border-gray-200 flex flex-col
        fixed h-full z-50
        transition-all duration-300 ease-in-out
      `}
    >
      {/* Header section */}
      <div
        className={`px-4 py-4 flex flex-col items-center ${
          collapsed ? "space-y-4" : "space-y-0 justify-between"
        } border-b border-gray-200`}
      >
        {collapsed ? (
          <>
            {/* Compact logo - shown when sidebar is collapsed */}
            <div className="flex items-center justify-center w-10 h-10">
              <img
                src={compactLogo}
                alt="SYNC"
                className="w-full h-full object-contain"
              />
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded-md hover:bg-gray-100 focus:outline-none transition-colors"
              aria-label="Expand sidebar"
            >
              <img src={expandIcon} alt="Expand" className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            {/* Full logo - shown when sidebar is expanded */}
            <img src={logo} alt="SYNC Logo" className="h-6" />
            <button
              onClick={onToggle}
              className="p-1 rounded-md hover:bg-gray-100 focus:outline-none transition-colors"
              aria-label="Collapse sidebar"
            >
              <img src={collapseIcon} alt="Collapse" className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Navigation links */}
      <nav className="flex-grow px-4 py-6 space-y-3 overflow-y-auto">
        {links.map(({ label, path, icon, skipRedirect }) => (
          <Link
            key={path}
            to={path}
            state={skipRedirect ? { skipRedirect: true } : undefined}
            className={`flex items-center px-4 py-2 rounded transition ${
              isActive(path)
                ? "bg-blue-50 text-blue-600 font-semibold"
                : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"
            }`}
            title={collapsed ? label : ""}
            aria-label={label}
          >
            <span className="text-xl">{icon}</span>
            {!collapsed && (
              <span className="ml-3 whitespace-nowrap">{label}</span>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;