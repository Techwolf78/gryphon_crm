import React from "react";

const statusColorMap = {
  hot: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-300",
    activeBg: "bg-blue-100",
    tab: {
      active: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg",
      inactive: "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
    }
  },
  warm: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-300",
    activeBg: "bg-blue-100",
    tab: {
      active: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg",
      inactive: "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
    }
  },
  called: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-300",
    activeBg: "bg-blue-100",
    tab: {
      active: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg",
      inactive: "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
    }
  },
  onboarded: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-300",
    activeBg: "bg-blue-100",
    tab: {
      active: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg",
      inactive: "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
    }
  },
  deleted: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-300",
    activeBg: "bg-blue-100",
    tab: {
      active: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg",
      inactive: "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
    }
  }
};

const tabLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  called: "Called",
  onboarded: "Onboarded",
  deleted: "Deleted"
};

const LeadStatusTabs = ({ activeTab, setActiveTab, leadsByStatus = {}, user }) => {
  // Get available tabs based on user permissions
  const getAvailableTabs = () => {
    const baseTabs = ['hot', 'warm', 'cold', 'called', 'onboarded'];
    // Only show deleted tab for admin department users or admin role
    const isAdmin = user?.departments?.includes("admin") || 
                   user?.departments?.includes("Admin") || 
                   user?.department === "admin" || 
                   user?.department === "Admin" ||
                   user?.role === "admin" || 
                   user?.role === "Admin";
    
    if (isAdmin) {
      baseTabs.push('deleted');
    }
    return baseTabs;
  };

  const availableTabs = getAvailableTabs();

  return (
    <div className={`grid gap-x-4 gap-y-1 mb-3 pt-2 w-full ${
      availableTabs.length === 6 ? 'grid-cols-2 md:grid-cols-6' : 'grid-cols-2 md:grid-cols-5'
    }`}>
      {availableTabs.map((key) => (
        <button
          key={key}
          onClick={() => setActiveTab(key)}
          className={`w-full py-1 rounded-lg text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-[1.02] ${
            activeTab === key
              ? statusColorMap[key]?.tab?.active || 'bg-blue-600 text-white'
              : statusColorMap[key]?.tab?.inactive || 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${
            activeTab === key ? "ring-2 ring-offset-2 ring-opacity-50" : ""
          } ${
            activeTab === key
              ? key === "hot"
                ? "ring-blue-500"
                : key === "warm"
                ? "ring-blue-400"
                : key === "cold"
                ? "ring-blue-400"
                : key === "called"
                ? "ring-blue-500"
                : key === "onboarded"
                ? "ring-blue-400"
                : key === "deleted"
                ? "ring-blue-400"
                : "ring-gray-500"
              : ""
          }`}
        >
          {tabLabels[key]}{" "}
          <span className="ml-1 text-xs font-bold">
            ({key === 'called' ? ((leadsByStatus['called'] || 0) + (leadsByStatus['dialed'] || 0)) : (leadsByStatus[key] || 0)})
          </span>
        </button>
      ))}
    </div>
  );
};

export default LeadStatusTabs;
