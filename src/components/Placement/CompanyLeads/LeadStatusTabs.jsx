import React from "react";

const statusColorMap = {
  hot: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-300",
    activeBg: "bg-red-100",
    tab: {
      active: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg",
      inactive: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
    }
  },
  warm: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-300",
    activeBg: "bg-orange-100",
    tab: {
      active: "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg",
      inactive: "bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200"
    }
  },
  called: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    border: "border-purple-300",
    activeBg: "bg-purple-100",
    tab: {
      active: "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg",
      inactive: "bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200"
    }
  },
  onboarded: {
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-300",
    activeBg: "bg-green-100",
    tab: {
      active: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg",
      inactive: "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
    }
  },
  deleted: {
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-300",
    activeBg: "bg-gray-100",
    tab: {
      active: "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg",
      inactive: "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
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
                ? "ring-red-500"
                : key === "warm"
                ? "ring-orange-400"
                : key === "cold"
                ? "ring-blue-500"
                : key === "called"
                ? "ring-purple-500"
                : key === "onboarded"
                ? "ring-green-500"
                : key === "deleted"
                ? "ring-gray-500"
                : "ring-gray-500"
              : ""
          }`}
        >
          {tabLabels[key]}{" "}
          <span className="ml-1 text-xs font-bold">
            ({leadsByStatus[key] || 0})
          </span>
        </button>
      ))}
    </div>
  );
};

export default LeadStatusTabs;