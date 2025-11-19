// FILE: /components/budget/ManageCSDD.jsx
import React, { useState, Suspense, lazy } from "react";
const CreateVoucher = lazy(() => import("./CreateVoucher"));
const RequestReimbursement = lazy(() => import("./RequestReimbursement"));
const ViewRequests = lazy(() => import("./ViewRequests"));

export default function ManageCSDD({
  department,
  currentBudget,
  fiscalYear,
  currentUser,
}) {
  const [tab, setTab] = useState("viewRequests");
  const tabs = {
    viewRequests: "View Requests",
    createVoucher: "Create Voucher",
    requestReimbursement: "Request Reimbursement",
  };

  // ====== BUDGET CHECK ======
  const hasBudget =
    currentBudget &&
    Object.keys(currentBudget).length > 0 &&
    currentBudget.csddExpenses; // or any key you rely on

  if (!hasBudget) {
    return (
      <div className="max-w-auto mx-auto p-8 bg-white rounded-2xl shadow-lg border border-gray-100 text-center">
        {/* Content */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Budget Not Configured
        </h2>

        <div className="space-y-2 mb-6">
          <p className="text-gray-600 leading-relaxed">
            The CSDD budget for FY {fiscalYear} has not been created yet.
          </p>
          <p className="text-gray-500 text-sm">
            Please contact the {department.toUpperCase()} Head to set up the
            budget.
          </p>
        </div>

        {/* Action Button */}
      </div>
    );
  }

  // ====== NORMAL UI RENDERS BELOW ======

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            CSDD Expense Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage department expenses and reimbursements
          </p>
        </div>
        <div className="text-sm text-gray-500 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
          FY {fiscalYear}
        </div>
      </div>

      {/* Simple Underline Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8 -mb-px">
          {Object.entries(tabs).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors duration-200 ${
                tab === key
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <Suspense
        fallback={
          <div className="flex justify-center items-center py-12 max-w-7xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        }
      >
        {tab === "viewRequests" && (
          <ViewRequests
            department={department}
            fiscalYear={fiscalYear}
            currentUser={currentUser}
            currentBudget={currentBudget}
          />
        )}
        {tab === "requestReimbursement" && (
          <RequestReimbursement
            department={department}
            fiscalYear={fiscalYear}
            currentUser={currentUser}
            currentBudget={currentBudget}
          />
        )}
        {tab === "createVoucher" && (
          <CreateVoucher
            department={department}
            fiscalYear={fiscalYear}
            currentUser={currentUser}
            currentBudget={currentBudget}
          />
        )}
      </Suspense>
    </div>
  );
}
