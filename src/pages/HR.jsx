import React, { useState } from "react";
import HRBillsTour from "../components/tours/HRBillsTour";
import ContractInvoicesTab from "../components/HR/ContractInvoicesTab";
import TrainerBillsTab from "../components/HR/TrainerBillsTab";
import BudgetDashboard from "../components/Budget/BudgetDashboard";
import InterviewSchedulerTab from "../components/HR/InterviewSchedulerTab";
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

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem("hr_activeTab", tab);
    } catch {
      // Ignore localStorage errors
    }
  };

  // Calculate active tab index for sliding indicator
  const getActiveTabIndex = () => {
    const tabs = ["trainerBills", "contractInvoices", "budgetHR", "budgetMgmt", "interviewScheduler"];
    return tabs.indexOf(activeTab);
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <HRBillsTour userId={user?.uid} enabled={activeTab === "trainerBills"} />

  
      {/* Enhanced Tab Navigation with Sliding Indicator */}
      <div className="relative mb-3">
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 px-4 py-2 font-medium text-sm transition-all duration-150 ${
              activeTab === "trainerBills"
                ? "text-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => handleTabChange("trainerBills")}
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
            onClick={() => handleTabChange("contractInvoices")}
            data-tour="contract-invoices-tab"
          >
            Contract Invoices
          </button>

          <button
            className={`flex-1 px-4 py-2 font-medium text-sm transition-all duration-150 ${
              activeTab === "budgetHR"
                ? "text-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => handleTabChange("budgetHR")}
            data-tour="budget-hr-tab"
          >
            Budget (HR)
          </button>

          <button
            className={`flex-1 px-4 py-2 font-medium text-sm transition-all duration-150 ${
              activeTab === "budgetMgmt"
                ? "text-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => handleTabChange("budgetMgmt")}
            data-tour="budget-mgmt-tab"
          >
            Budget (Management)
          </button>

          <button
            className={`flex-1 px-4 py-2 font-medium text-sm transition-all duration-150 ${
              activeTab === "interviewScheduler"
                ? "text-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => handleTabChange("interviewScheduler")}
            data-tour="interview-scheduler-tab"
          >
            Interview Scheduler
          </button>
        </div>

        {/* Sliding Indicator */}
        <div
          className="absolute bottom-0 h-0.5 bg-blue-600 transition-transform duration-150 ease-out"
          style={{
            width: "20%",
            transform: `translateX(${getActiveTabIndex() * 100}%)`,
          }}
        ></div>
      </div>

      {/* Tab Content */}
      {activeTab === "trainerBills" && (
        <TrainerBillsTab onBillsCountChange={setBillsCount} />
      )}

      {activeTab === "contractInvoices" && <ContractInvoicesTab />}

      {activeTab === "budgetHR" && (
        <BudgetDashboard
          department="hr"
          dashboardTitle="HR Department Budget Overview"
        />
      )}

      {activeTab === "budgetMgmt" && (
        <BudgetDashboard
          department="management"
          dashboardTitle="Management Department Budget Overview"
        />
      )}

      {activeTab === "interviewScheduler" && (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <div className="text-4xl mb-4 text-blue-600">⏳</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Coming Soon</h2>
          <p className="text-gray-600 text-center max-w-md">
            The Interview Scheduler feature is under development. We'll notify you when it's ready.
          </p>
        </div>
      )}
    </div>
  );
};

export default HR;
