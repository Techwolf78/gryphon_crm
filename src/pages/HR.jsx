import React, { useState } from "react";
import HRBillsTour from "../components/tours/HRBillsTour";
import ContractInvoicesTab from "../components/HR/ContractInvoicesTab";
import TrainerBillsTab from "../components/HR/TrainerBillsTab";
import { useAuth } from "../context/AuthContext";

const HR = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem("hr_activeTab") || "trainerBills";
    } catch {
      return "trainerBills";
    }
  });
  const [billsCount, setBillsCount] = useState(0);

  // Calculate active tab index for sliding indicator
  const getActiveTabIndex = () => {
    switch (activeTab) {
      case "trainerBills": return 0;
      case "contractInvoices": return 1;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <HRBillsTour userId={user?.uid} enabled={activeTab === "trainerBills"} />

      {/* Common Header */}
      <div className="mb-2" data-tour="hr-header">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          HR Dashboard
        </h1>
        <p className="text-gray-600 text-sm">
          Approve trainer bills and manage contract invoices
        </p>
      </div>

      {/* Enhanced Tab Navigation with Sliding Indicator */}
      <div className="relative mb-3">
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 px-4 py-2 font-medium text-sm transition-all duration-150 ${
              activeTab === "trainerBills"
                ? "text-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("trainerBills")}
            data-tour="trainer-bills-tab"
          >
            Trainer Bills ({billsCount})
          </button>
          <button
            className={`flex-1 px-4 py-2 font-medium text-sm transition-all duration-150 ${
              activeTab === "contractInvoices"
                ? "text-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("contractInvoices")}
            data-tour="contract-invoices-tab"
          >
            Contract Invoices
          </button>
        </div>
        {/* Sliding Indicator */}
        <div
          className="absolute bottom-0 h-0.5 bg-blue-600 transition-transform duration-150 ease-out"
          style={{
            width: '50%',
            transform: `translateX(${getActiveTabIndex() * 100}%)`,
          }}
        ></div>
      </div>

      {/* Tab Content */}
      {activeTab === "trainerBills" ? (
        <TrainerBillsTab onBillsCountChange={setBillsCount} />
      ) : activeTab === "contractInvoices" ? (
        <ContractInvoicesTab />
      ) : null}
    </div>
  );
};

export default HR;
