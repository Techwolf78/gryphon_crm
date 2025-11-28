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
  const [showVoucher, setShowVoucher] = useState(false);
  const [showReimbursement, setShowReimbursement] = useState(false);

  // ====== BUDGET CHECK ======
  const hasBudget =
    currentBudget &&
    Object.keys(currentBudget).length > 0 &&
    currentBudget.csddExpenses;

  if (!hasBudget) {
    return (
      <div className="max-w-auto mx-auto p-8 bg-white rounded-2xl shadow-lg border border-gray-100 text-center">
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

        {/* Right side buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowVoucher(true)}
            className="bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium 
               shadow-lg hover:shadow-md transition-all duration-200
               border-b-2 border-amber-700 hover:border-amber-800
                active:translate-y-0 active:shadow-sm"
          >
            Create Voucher
          </button>

          <button
            onClick={() => setShowReimbursement(true)}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium 
               shadow-lg hover:shadow-md transition-all duration-200
               border-b-2 border-blue-700 hover:border-blue-800
               active:translate-y-0 active:shadow-sm"
          >
            Request Reimbursement
          </button>
        </div>
      </div>

      {/* Always show ViewRequests */}
      <Suspense
        fallback={
          <div className="flex justify-center items-center py-12 max-w-7xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        }
      >
        <ViewRequests
          department={department}
          fiscalYear={fiscalYear}
          currentUser={currentUser}
          currentBudget={currentBudget}
        />

        {/* Modal components - Add isOpen prop */}
        <CreateVoucher
          department={department}
          fiscalYear={fiscalYear}
          currentUser={currentUser}
          currentBudget={currentBudget}
          isOpen={showVoucher}
          onClose={() => setShowVoucher(false)}
        />

        <RequestReimbursement
          department={department}
          fiscalYear={fiscalYear}
          currentUser={currentUser}
          currentBudget={currentBudget}
          isOpen={showReimbursement}
          onClose={() => setShowReimbursement(false)}
        />
      </Suspense>
    </div>
  );
}
