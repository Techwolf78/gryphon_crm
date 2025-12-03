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
import helpGif from "../assets/bubble-chat.gif";
import hackerGif from "../assets/hacker.gif";
import mortarboardGif from "../assets/mortarboard.gif";
import lineChartGif from "../assets/line-chart.gif";
import briefcaseGif from "../assets/briefcase.gif";
import customerGif from "../assets/customer.gif";
import checklistGif from "../assets/checklist.gif";
import moneyBagGif from "../assets/money-bag.gif";
import calculatorGif from "../assets/calculator.gif";
import receiptGif from "../assets/receipt.gif";
import dashboardGif from "../assets/dashboard.gif";
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
  FiBell,
  FiFileText,
  FiTerminal,
} from "react-icons/fi";

const roleLinks = {
  admin: [
    { label: "Admin", path: "/dashboard/admin", icon: <img src={hackerGif} alt="Admin" className="w-6 h-6" /> },
    {
      label: "Sales",
      path: "/dashboard/sales",
      icon: <img src={moneyBagGif} alt="Sales" className="w-6 h-6" />,
    },
    {
      label: "L & D",
      path: "/dashboard/learning-development",
      icon: <img src={mortarboardGif} alt="L & D" className="w-6 h-6" />,
    },
    { label: "Placement", path: "/dashboard/placement", icon: <img src={briefcaseGif} alt="Placement" className="w-6 h-6" /> },
    { label: "D M", path: "/dashboard/marketing", icon: <img src={lineChartGif} alt="D M" className="w-6 h-6" /> },
    { label: "CA", path: "/dashboard/ca", icon: <img src={checklistGif} alt="CA" className="w-6 h-6" /> },
    { label: "HR", path: "/dashboard/hr", icon: <img src={customerGif} alt="HR" className="w-6 h-6" /> },
    { label: "Accounts", path: "/dashboard/accounts", icon: <img src={calculatorGif} alt="Accounts" className="w-6 h-6" /> },
    {
      label: "Purchase",
      path: "/dashboard/purchase",
      icon: <img src={receiptGif} alt="Purchase" className="w-6 h-6" />,
    },
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
  hr: [
    { label: "HR", path: "/dashboard/hr", icon: <FiShield /> },
    {
      label: "Purchase",
      path: "/dashboard/purchase",
      icon: <FiShoppingCart />,
    },
  ],
  purchase: [
    {
      label: "Purchase",
      path: "/dashboard/purchase",
      icon: <FiShoppingCart />,
    },
  ],
  accountant: [
    { label: "Accounts", path: "/dashboard/accounts", icon: <FiFileText /> },
  ],
  accounts: [
    { label: "Accounts", path: "/dashboard/accounts", icon: <FiFileText /> },
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
  if (norm.includes("accountant") || norm.includes("accounts")) return "accounts";
  return "";
};

const Sidebar = ({ collapsed, onToggle }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [tooltip, setTooltip] = useState({ show: false, text: "", x: 0, y: 0 });
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

  const handleMouseEnter = useCallback(
    (text, event) => {
      if (!collapsed) return;
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltip({
        show: true,
        text,
        x: rect.right + 8,
        y: rect.top + rect.height / 2,
      });
    },
    [collapsed]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip({ show: false, text: "", x: 0, y: 0 });
  }, []);

  // Hide tooltip when sidebar expands
  useEffect(() => {
    if (!collapsed) {
      setTooltip({ show: false, text: "", x: 0, y: 0 });
    }
  }, [collapsed]);

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

  if (normalizedRole === "hr") {
    const purchaseLink = roleLinks.purchase[0];
    if (!departmentLinks.find((l) => l.path === purchaseLink.path)) {
      departmentLinks.push(purchaseLink);
    }
  }
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

  // Check if user is in accounts department
  const isAccountsUser = user?.departments?.some(dept =>
    dept.toLowerCase().includes('accounts') || dept.toLowerCase().includes('accountant')
  ) || user?.department?.toLowerCase().includes('accounts') || user?.department?.toLowerCase().includes('accountant');

  const links = [
    // Hide Dashboard link for accounts users
    ...(isAccountsUser ? [] : [{
      label: "Dashboard",
      path: "/dashboard",
      icon: <img src={dashboardGif} alt="Dashboard" className="w-6 h-6" />,
      skipRedirect: true,
    }]),
    // {
    //   label: "Intro",
    //   path: "/dashboard/intro",
    //   icon: <FiBook />,
    // },
    ...departmentLinks,
    {
      label: "Help",
      path: "/dashboard/help",
      icon: <img src={helpGif} alt="Help" className="w-7 h-7" />,
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
        ${collapsed ? "w-16" : "w-64 sm:w-72 lg:w-36"}
        bg-white border-r border-gray-200 flex flex-col fixed h-screen z-50
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
          className={`shrink-0 p-3 border-b border-gray-200 ${
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
            onMouseEnter={(e) =>
              handleMouseEnter(
                collapsed ? "Expand Sidebar" : "Collapse Sidebar",
                e
              )
            }
            onMouseLeave={handleMouseLeave}
            className="p-1 rounded hover:bg-gray-100 lg:block"
            aria-label={collapsed ? "Expand" : "Collapse"}
            title={!collapsed ? "Collapse Sidebar" : ""}
          >
            <img
              src={collapsed ? expandIcon : collapseIcon}
              alt=""
              className="w-4 h-4"
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-hidden">
          <div className="h-full p-3 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
            <div className="flex flex-col space-y-2">
              {links.map(
                ({
                  label,
                  path,
                  icon,
                  skipRedirect,
                  onClick,
                  hasNotification,
                }) => (
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
                        onMouseEnter={(e) => handleMouseEnter(label, e)}
                        onMouseLeave={handleMouseLeave}
                        className={`w-full flex items-center ${
                          collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
                        } rounded text-sm transition ${"text-gray-600 hover:bg-gray-100"} notifications-button`}
                        title={!collapsed ? label : ""}
                      >
                        <span className="text-lg shrink-0 relative">
                          {icon}
                          {collapsed && hasNotification && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                          )}
                        </span>
                        {!collapsed && (
                          <span className="ml-2 truncate">{label}</span>
                        )}
                        {!collapsed && hasNotification && (
                          <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
                        )}
                      </button>
                    ) : (
                      <Link
                        to={path}
                        state={
                          skipRedirect ? { skipRedirect: true } : undefined
                        }
                        onMouseEnter={(e) => handleMouseEnter(label, e)}
                        onMouseLeave={handleMouseLeave}
                        className={`flex items-center ${
                          collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
                        } rounded text-sm transition ${
                          isActive(path)
                            ? "bg-blue-100 text-blue-700 font-medium shadow-sm"
                            : "text-gray-600 hover:bg-gray-200 hover:shadow-sm"
                        }`}
                        title={!collapsed ? label : ""}
                        onClick={() => {
                          // Auto-close sidebar on mobile after navigation
                          if (window.innerWidth < 1024) {
                            handleToggle();
                          }
                        }}
                      >
                        <span className="text-lg shrink-0 relative">
                          {icon}
                          {collapsed && hasNotification && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                          )}
                        </span>
                        {!collapsed && (
                          <span className="ml-2 truncate">{label}</span>
                        )}
                        {!collapsed && hasNotification && (
                          <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
                        )}
                      </Link>
                    )}
                  </div>
                )
              )}

              {/* AI Button */}
              <div className="pt-3 border-t border-gray-200 mb-24">
                <button
                  onClick={() => {
                    setIsAIDrawerOpen(true);
                    // Auto-close sidebar on mobile when opening AI
                    if (window.innerWidth < 1024) {
                      handleToggle();
                    }
                  }}
                  onMouseEnter={(e) => handleMouseEnter("Ask AI", e)}
                  onMouseLeave={handleMouseLeave}
                  className={`w-full flex items-center ${
                    collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
                  } rounded text-sm bg-linear-to-r from-blue-50 to-sky-100 text-blue-700 hover:from-blue-100 hover:to-sky-150 hover:text-blue-800 border border-blue-200 shadow-sm transition-all duration-200`}
                  title={!collapsed ? "Ask AI" : ""}
                >
                  <FiMessageSquare className="text-lg shrink-0" />
                  {!collapsed && <span className="ml-2">Ask AI</span>}
                </button>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Custom Tooltip */}
      {tooltip.show && collapsed && (
        <div
          className="fixed z-60 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translateY(-50%)",
          }}
        >
          <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm bg-opacity-95 border border-gray-700 max-w-xs">
            {tooltip.text}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
          </div>
        </div>
      )}

      <AiBot isOpen={isAIDrawerOpen} onClose={() => setIsAIDrawerOpen(false)} />
    </>
  );
};

export default Sidebar;
