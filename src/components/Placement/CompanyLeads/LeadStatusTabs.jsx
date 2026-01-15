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
  dead: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-300",
    activeBg: "bg-red-100",
    tab: {
      active: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg",
      inactive: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
    }
  }
};

const tabLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  called: "Called",
  onboarded: "Onboarded",
  dead: "Dead"
};

const LeadStatusTabs = ({ activeTab, setActiveTab, leadsByStatus = {} }) => {
  // Get available tabs based on user permissions
  const getAvailableTabs = () => {
    const baseTabs = ['hot', 'warm', 'cold', 'called', 'onboarded', 'dead'];
    return baseTabs;
  };

  const availableTabs = getAvailableTabs();

  return (
    <div className={`grid gap-x-4 gap-y-1 mb-3 pt-2 w-full grid-cols-2 md:grid-cols-6`}>
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
                : key === "dead"
                ? "ring-red-400"
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
