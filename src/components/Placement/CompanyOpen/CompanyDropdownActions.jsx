import React from 'react';
import { FaEllipsisV, FaTimes } from "react-icons/fa";

const statusColorMap = {
  complete: {
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-300",
    activeBg: "bg-green-100",
    tab: {
      active: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg",
      inactive: "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
    }
  },
  ongoing: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-300",
    activeBg: "bg-amber-100",
    tab: {
      active: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg",
      inactive: "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"
    }
  },
  onhold: {
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    border: "border-cyan-300",
    activeBg: "bg-cyan-100",
    tab: {
      active: "bg-gradient-to-r from-cyan-400 to-cyan-500 text-white shadow-lg",
      inactive: "bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border border-cyan-200"
    }
  },
  cancel: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-300",
    activeBg: "bg-red-100",
    tab: {
      active: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg",
      inactive: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
    }
  },
  noapplications: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
    activeBg: "bg-gray-200",
    tab: {
      active: "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg",
      inactive: "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
    }
  }
};

function DropdownActions({
  companyId,
  companyData,
  closeDropdown,
  setSelectedCompany,
  updateCompanyStatus,
  activeTab
}) {
  return (
    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-xl bg-white border border-gray-200 z-50 overflow-hidden">
      {/* Dropdown arrow */}
      <div className="absolute -top-1 right-4 w-2 h-2 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
      
      <div className="py-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCompany(companyData);
            closeDropdown();
          }}
          className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
        >
          <svg className="w-4 h-4 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Details
        </button>
        
        <div className="border-t border-gray-100 my-1"></div>
        
        {["complete", "ongoing", "onhold", "cancel", "noapplications"]
          .filter(status => status !== activeTab)
          .map((status) => (
            <button
              key={status}
              onClick={(e) => {
                e.stopPropagation();
                updateCompanyStatus(companyId, status);
              }}
              className={`flex items-center w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 hover:bg-gray-50 ${
                statusColorMap[status]?.text || "text-gray-700"
              }`}
            >
              <div className={`w-2 h-2 rounded-full mr-3 ${
                status === 'complete' ? 'bg-green-500' :
                status === 'ongoing' ? 'bg-amber-500' :
                status === 'onhold' ? 'bg-cyan-500' :
                status === 'cancel' ? 'bg-red-500' :
                'bg-gray-500'
              }`}></div>
              Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
      </div>
    </div>
  );
}

export default DropdownActions;