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
    <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-54">
      <div className="py-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCompany(companyData);
            closeDropdown();
          }}
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
        >
          View Details
        </button>
        {["complete", "ongoing", "onhold", "cancel", "noapplications"]
          .filter(status => status !== activeTab)
          .map((status) => (
            <button
              key={status}
              onClick={(e) => {
                e.stopPropagation();
                updateCompanyStatus(companyId, status);
              }}
              className={`block w-full text-left px-4 py-2 text-sm ${
                statusColorMap[status]?.text || "text-gray-700"
              } hover:bg-gray-100 transition`}
            >
              Mark as {status}
            </button>
          ))}
      </div>
    </div>
  );
}

export default DropdownActions;