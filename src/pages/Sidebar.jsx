import React, { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import AiBot from "./AiBot";
import logo from "../assets/SYNC-logo-2.png";
import compactLogo from "../assets/s-final.png";
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
  FiMessageSquare,
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
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);

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
    <>
      <aside
        className={`
          ${collapsed ? "w-20" : "w-[168px]"}
          bg-white border-r border-gray-200 flex flex-col
          fixed h-full z-50
          transition-all duration-300 ease-in-out
        `}
      >
        {/* Header section - now with dynamic layout */}
        <div
          className={`
            px-4 py-4 border-b border-gray-200
            ${collapsed ? "flex flex-col items-center space-y-4" : "flex items-center justify-between"}
          `}
        >
          {/* Logo - changes based on collapsed state */}
          {collapsed ? (
            <img
              src={compactLogo}
              alt="SYNC"
              className="w-8 h-8 object-contain"
            />
          ) : (
            <img src={logo} alt="SYNC Logo" className="h-6" />
          )}

          {/* Toggle button - position changes based on collapsed state */}
          <button
            onClick={onToggle}
            className={`
              p-1 rounded-md hover:bg-gray-100 focus:outline-none transition-colors
              ${collapsed ? "mt-2" : ""}
            `}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <img
              src={collapsed ? expandIcon : collapseIcon}
              alt={collapsed ? "Expand" : "Collapse"}
              className="w-5 h-5"
            />
          </button>
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

          {/* Ask AI Button */}
          <button
            onClick={() => setIsAIDrawerOpen(true)}
            className={`
              w-full flex items-center px-4 py-2 rounded transition
              bg-gradient-to-r from-purple-500 to-blue-500 text-white
              hover:from-purple-600 hover:to-blue-600
            `}
            title={collapsed ? "Ask AI" : ""}
            aria-label="Ask AI"
          >
            <span className="text-xl">
              <FiMessageSquare />
            </span>
            {!collapsed && (
              <span className="ml-3 whitespace-nowrap font-medium">Ask AI</span>
            )}
          </button>
        </nav>
      </aside>

      {/* AI Chatbot Component */}
      <AiBot 
        isOpen={isAIDrawerOpen} 
        onClose={() => setIsAIDrawerOpen(false)} 
      />
    </>
  );
};

export default Sidebar;