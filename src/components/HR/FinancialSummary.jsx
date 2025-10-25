import React from "react";
import { FiDollarSign, FiTrendingUp, FiTrendingDown } from "react-icons/fi";

const FinancialSummary = ({ totalAmount, approvedAmount, pendingAmount, rejectedAmount }) => {
  const formatCurrency = (amount) => `₹${amount.toLocaleString()}`;

  const financialData = [
    {
      label: "Total Amount",
      value: totalAmount,
      color: "text-slate-900",
      bgColor: "bg-slate-50",
      icon: FiDollarSign
    },
    {
      label: "Approved Amount",
      value: approvedAmount,
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
      icon: FiTrendingUp
    },
    {
      label: "Pending Amount",
      value: pendingAmount,
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      icon: FiDollarSign
    },
    {
      label: "Rejected Amount",
      value: rejectedAmount,
      color: "text-red-700",
      bgColor: "bg-red-50",
      icon: FiTrendingDown
    }
  ];

  return (
    <div className="mt-4">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded flex items-center justify-center">
              <FiDollarSign className="w-3 h-3 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Financial Overview</h3>
              <p className="text-xs text-slate-600">Payment status and financial metrics</p>
            </div>
          </div>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {financialData.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className={`w-6 h-6 ${item.bgColor} rounded flex items-center justify-center`}>
                      <Icon className={`w-3 h-3 ${item.color}`} />
                    </div>
                  </div>

                  <div>
                    <div className={`text-lg font-bold ${item.color} tabular-nums`}>
                      {formatCurrency(item.value)}
                    </div>
                    <div className="text-xs text-slate-600 font-medium">
                      {item.label}
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1">
                    <div
                      className={`h-full bg-gradient-to-r ${
                        item.label.includes('Approved') ? 'from-emerald-400 to-emerald-500' :
                        item.label.includes('Pending') ? 'from-amber-400 to-amber-500' :
                        item.label.includes('Rejected') ? 'from-red-400 to-red-500' :
                        'from-slate-400 to-slate-500'
                      } rounded-full transition-all duration-500`}
                      style={{
                        width: totalAmount > 0 ? `${(item.value / totalAmount) * 100}%` : '0%'
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
