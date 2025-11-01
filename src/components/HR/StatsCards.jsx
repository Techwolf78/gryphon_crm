import React from "react";
import { FiFileText, FiCheckCircle, FiXCircle, FiClock, FiTrendingUp } from "react-icons/fi";

const StatsCards = ({ totalBills, approvedBills, pendingBills, rejectedBills }) => {
  const stats = [
    {
      title: "Total Bills",
      value: totalBills,
      icon: FiFileText,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      textColor: "text-blue-700",
      description: "All submissions",
      tourId: "total-bills-card"
    },
    {
      title: "Approved",
      value: approvedBills,
      icon: FiCheckCircle,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "from-emerald-50 to-emerald-100",
      textColor: "text-emerald-700",
      description: "Ready for payment",
      tourId: "approved-bills-card"
    },
    {
      title: "Pending",
      value: pendingBills,
      icon: FiClock,
      color: "from-amber-500 to-amber-600",
      bgColor: "from-amber-50 to-amber-100",
      textColor: "text-amber-700",
      description: "Awaiting approval",
      tourId: "pending-bills-card"
    },
    {
      title: "Rejected",
      value: rejectedBills,
      icon: FiXCircle,
      color: "from-red-500 to-red-600",
      bgColor: "from-red-50 to-red-100",
      textColor: "text-red-700",
      description: "Needs revision",
      tourId: "rejected-bills-card"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className="group bg-white rounded-lg shadow-sm border border-slate-200/60 hover:shadow-md hover:border-slate-300/60 transition-all duration-300 overflow-hidden"
            data-tour={stat.tourId}
          >
            <div className="p-3">
              {/* Title at top */}
              <div className="text-xs font-semibold text-slate-900 mb-2">
                {stat.title}
              </div>

              {/* Number on left, Icon on right */}
              <div className="flex items-center justify-between mb-1">
                <div className="text-xl font-bold text-slate-900 tabular-nums">
                  {stat.value}
                </div>
                <div className={`w-6 h-6 bg-gradient-to-r ${stat.bgColor} rounded flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-3 h-3 ${stat.textColor}`} />
                </div>
              </div>

              {/* Description */}
              <div className="text-xs text-slate-500">
                {stat.description}
              </div>

              {/* Progress bar for visual interest */}
              <div className="mt-2 pt-2 border-t border-slate-100">
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${stat.color} rounded-full transition-all duration-500 ease-out`}
                    style={{
                      width: totalBills > 0 ? `${(stat.value / totalBills) * 100}%` : '0%'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
