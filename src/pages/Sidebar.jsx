import React, {
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
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
  FiMenu,
  FiUserCheck,
  FiUser,
  FiShield,
  FiShoppingCart,
  FiBell
} from "react-icons/fi";

const roleLinks = {
  admin: [
    { label: "Admin", path: "/dashboard/admin", icon: <FiUsers /> },
    {
      label: "Sales",
      path: "/dashboard/sales",
      icon: <MdOutlineCurrencyRupee />,
    },
    {
      label: "Purchase",
      path: "/dashboard/purchase",
      icon: <FiShoppingCart />,
    },
    {
      label: "L & D",
      path: "/dashboard/learning-development",
      icon: <FiBook />,
    },
    { label: "Placement", path: "/dashboard/placement", icon: <FiBriefcase /> },
    { label: "D M", path: "/dashboard/marketing", icon: <FiTrendingUp /> },
    { label: "CA", path: "/dashboard/ca", icon: <FiUserCheck /> },
    { label: "HR", path: "/dashboard/hr", icon: <FiShield /> },
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
  ca: [{ label: "CA", path: "/dashboard/ca", icon: <FiUserCheck /> }],
  hr: [{ label: "HR", path: "/dashboard/hr", icon: <FiShield /> }],
  purchase: [
    {
      label: "Purchase",
      path: "/dashboard/purchase",
      icon: <FiShoppingCart />,
    },
  ],
};

const normalizeRole = (role) => {
  if (!role) return "";
  const norm = String(role)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (norm.includes("admin")) return "admin";
  if (norm.includes("sales")) return "sales";
  if (norm.includes("purchase")) return "purchase";
  if (norm.includes("learning") || norm.includes("l&d") || norm.includes("ld"))
    return "learning-development";
  if (norm.includes("marketing") || norm.includes("dm")) return "marketing";
  if (norm.includes("ca")) return "ca";
  if (norm.includes("hr")) return "hr";
  if (norm.includes("placement")) return "placement";
  return "";
};

const Sidebar = ({ collapsed, onToggle }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const initializedRef = useRef(false);

  // Sync stored preference on mount (run once). If stored value differs from current prop, call onToggle to sync parent.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    try {
      const raw = localStorage.getItem("sidebar_collapsed");
      if (raw !== null) {
        const stored = JSON.parse(raw);
        if (Boolean(stored) !== Boolean(collapsed)) {
          if (typeof onToggle === "function") onToggle();
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [collapsed, onToggle]);

  const handleToggle = useCallback(() => {
    try {
      const newVal = !collapsed;
      localStorage.setItem("sidebar_collapsed", JSON.stringify(newVal));
    } catch {
      // ignore storage errors
    }
    if (typeof onToggle === "function") onToggle();
  }, [collapsed, onToggle]);

  if (!user) return null;

  // Get all departments for the user (handle both single department and array format)
  const userDepartments = Array.isArray(user.departments)
    ? user.departments
    : user.department
    ? [user.department]
    : [];
  const normalizedRole = normalizeRole(user.role);
  const isAdmin = normalizedRole === "admin";

  // If admin, show all links. Otherwise, show links for each department the user belongs to
  let departmentLinks = [];
  if (isAdmin) {
    departmentLinks = roleLinks.admin;
  } else {
    // Collect unique links for all user's departments
    const uniqueLinks = new Map();
    userDepartments.forEach((dept) => {
      const deptRole = normalizeRole(dept);
      if (roleLinks[deptRole]) {
        roleLinks[deptRole].forEach((link) => {
          if (!uniqueLinks.has(link.path)) {
            uniqueLinks.set(link.path, link);
          }
        });
      }
    });
    departmentLinks = Array.from(uniqueLinks.values());
  }

  const isActive = (path) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  const links = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <FiHome />,
      skipRedirect: true,
    },
    ...departmentLinks,
    {
      label: "Help",
      path: "/dashboard/help",
      icon: <FiHelpCircle />,
      skipRedirect: true,
    },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      {collapsed && (
        <button
          onClick={handleToggle}
          className="fixed top-4 left-4 z-60 p-2 bg-white rounded-md shadow-md lg:hidden border border-gray-200 hover:bg-gray-50"
          aria-label="Open menu"
        >
          <FiMenu className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {/* Overlay for mobile when sidebar is open */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={handleToggle}
        />
      )}

      <aside
        className={`
        ${collapsed ? "w-16" : "w-64 sm:w-72 lg:w-44"}
        bg-white border-r border-gray-200 flex flex-col fixed h-full z-50
        transition-all duration-300
        ${
          collapsed
            ? "-translate-x-full lg:translate-x-0" // Hide on mobile when collapsed, show on desktop
            : "translate-x-0" // Always show when expanded
        }
        lg:translate-x-0
      `}
      >
        {/* Header */}
        <div
          className={`p-3 border-b border-gray-200 ${
            collapsed
              ? "flex flex-col items-center space-y-2"
              : "flex items-center justify-between"
          }`}
        >
          <img
            src={collapsed ? compactLogo : logo}
            alt="SYNC"
            className={
              collapsed ? "w-6 h-6" : "h-5 max-w-[120px] sm:max-w-none"
            }
          />
          <button
            onClick={handleToggle}
            className="p-1 rounded hover:bg-gray-100 lg:block"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            <img
              src={collapsed ? expandIcon : collapseIcon}
              alt=""
              className="w-4 h-4"
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {links.map(({ label, path, icon, skipRedirect, onClick, hasNotification }) => (
            <div key={path} className="relative">
              {onClick ? (
                <button
                  onClick={() => {
                    onClick();
                    // Auto-close sidebar on mobile when opening modal
                    if (window.innerWidth < 1024) {
                      handleToggle();
                    }
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded text-sm transition ${
                    "text-gray-600 hover:bg-gray-100"
                  } notifications-button`}
                  title={collapsed ? label : ""}
                >
                  <span className="text-lg flex-shrink-0 relative">
                    {icon}
                    {collapsed && hasNotification && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </span>
                  {!collapsed && <span className="ml-2 truncate">{label}</span>}
                  {!collapsed && hasNotification && (
                    <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
              ) : (
                <Link
                  to={path}
                  state={skipRedirect ? { skipRedirect: true } : undefined}
                  className={`flex items-center px-3 py-2 rounded text-sm transition ${
                    isActive(path) ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-600 hover:bg-gray-100"
                  }`}
                  title={collapsed ? label : ""}
                  onClick={() => {
                    // Auto-close sidebar on mobile after navigation
                    if (window.innerWidth < 1024) {
                      handleToggle();
                    }
                  }}
                >
                  <span className="text-lg flex-shrink-0 relative">
                    {icon}
                    {collapsed && hasNotification && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </span>
                  {!collapsed && <span className="ml-2 truncate">{label}</span>}
                  {!collapsed && hasNotification && (
                    <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </Link>
              )}
            </div>
          ))}

          {/* AI Button */}
          <div className="pt-3 border-t border-gray-200">
            <button
              onClick={() => {
                setIsAIDrawerOpen(true);
                // Auto-close sidebar on mobile when opening AI
                if (window.innerWidth < 1024) {
                  handleToggle();
                }
              }}
              className="w-full flex items-center px-3 py-2 rounded text-sm bg-gradient-to-r from-blue-50 to-sky-100 text-blue-700 hover:from-blue-100 hover:to-sky-150 hover:text-blue-800 border border-blue-200 shadow-sm transition-all duration-200"
              title={collapsed ? "Ask AI" : ""}
            >
              <FiMessageSquare className="text-lg flex-shrink-0" />
              {!collapsed && <span className="ml-2">Ask AI</span>}
            </button>
          </div>
        </nav>
      </aside>

      <AiBot isOpen={isAIDrawerOpen} onClose={() => setIsAIDrawerOpen(false)} />
    </>
  );
};

export default Sidebar;
