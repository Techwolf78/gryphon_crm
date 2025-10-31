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
  cold: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-300",
    activeBg: "bg-blue-100",
    tab: {
      active: "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg",
      inactive: "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
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
  }
};

const tabLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  onboarded: "Onboarded"
};

const LeadsFilters = ({ activeTab, setActiveTab, leadsByStatus = {} }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mb-6 pt-4 w-full">
      {Object.keys(tabLabels).map((key) => (
        <button
          key={key}
          onClick={() => setActiveTab(key)}
          className={`w-full py-2 rounded-xl text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-[1.02] ${
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
                : key === "onboarded"
                ? "ring-green-500"
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

export default LeadsFilters;