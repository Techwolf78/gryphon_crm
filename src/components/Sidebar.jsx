import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import logo from "../assets/SYNC-logo-2.png";
import {
  FiHome,
  FiUsers,
  FiDollarSign,
  FiBriefcase,
  FiBook,
  FiTrendingUp,
  FiChevronLeft,
  FiChevronRight,
  FiHelpCircle,
} from "react-icons/fi";

// Role-based links
const roleLinks = {
  admin: [
    { label: "Admin", path: "/dashboard/admin", icon: <FiUsers /> },
    { label: "Sales", path: "/dashboard/sales", icon: <FiDollarSign /> },
    { label: "Placement", path: "/dashboard/placement", icon: <FiBriefcase /> },
    {
      label: "L & D",
      path: "/dashboard/learning-development",
      icon: <FiBook />,
    },
    { label: "D M", path: "/dashboard/marketing", icon: <FiTrendingUp /> },
  ],
  sales: [{ label: "Sales", path: "/dashboard/sales", icon: <FiDollarSign /> }],
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
      {/* Header */}
      <div className="px-6 py-6 text-2xl font-bold  flex items-center justify-between">
        {!collapsed && (
          <img
            src={logo}
            alt="SRC Logo"
            className="h-8"
          />
        )}
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-blue-600 focus:outline-none"
          aria-label="Toggle Sidebar"
        >
          {collapsed ? <FiChevronRight size={24} /> : <FiChevronLeft size={24} />}
        </button>
      </div>

      {/* Links */}
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
