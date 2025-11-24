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
      shadowColor: "shadow-blue-500/20",
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
      shadowColor: "shadow-emerald-500/20",
      description: "Ready for payment",
      tourId: "approved-bills-card"
    },
    {
      title: "Pending",
      value: pendingBills,
      icon: FiClock,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
      textColor: "text-purple-700",
      shadowColor: "shadow-purple-500/20",
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
      shadowColor: "shadow-red-500/20",
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
            className={`group bg-white rounded-xl shadow-lg ${stat.shadowColor} border border-slate-200/60 hover:shadow-xl hover:border-slate-300/60 transition-all duration-300 overflow-hidden`}
            data-tour={stat.tourId}
          >
            <div className="p-4">
              {/* Title and Description in same line */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-900">
                  {stat.title}
                </div>
                <div className="text-xs text-slate-500">
                  {stat.description}
                </div>
              </div>

              {/* Number on left, Icon on right */}
              <div className="flex items-center justify-between mb-1">
                <div className="text-2xl font-bold text-slate-900 tabular-nums">
                  {stat.value}
                </div>
                <div className={`w-7 h-7 bg-linear-to-r ${stat.bgColor} rounded flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-4 h-4 ${stat.textColor}`} />
                </div>
              </div>

              {/* Progress bar for visual interest */}
              <div className="mt-2 pt-2 border-t border-slate-100">
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full bg-linear-to-r ${stat.color} rounded-full transition-all duration-500 ease-out`}
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
