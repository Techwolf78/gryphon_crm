import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";

const BudgetDashboard = React.lazy(() => import("../components/Budget/BudgetDashboard"));
const ITTaskManager = React.lazy(() => import("../components/ITDashboard/ITTaskManager"));

const SECTION = {
  BUDGET: "budget",
  TASKS: "tasks",
};

const IT = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [active, setActive] = useState(() => {
    const section = searchParams.get('section');
    return section && Object.values(SECTION).includes(section) ? section : SECTION.TASKS;
  });

  const handleSetActive = (newActive) => {
    setActive(newActive);
    setSearchParams({ section: newActive });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full flex-1">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">IT Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Manage IT department budget and tasks.</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <nav className="flex space-x-1">
              <button
                onClick={() => handleSetActive(SECTION.TASKS)}
                className={`py-2 px-6 rounded-md font-medium text-sm transition-colors ${
                  active === SECTION.TASKS
                    ? "bg-[#1C39BB] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Task Manager
              </button>
              <button
                onClick={() => handleSetActive(SECTION.BUDGET)}
                className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                  active === SECTION.BUDGET
                    ? "bg-[#1C39BB] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Budget
              </button>
            </nav>
          </div>
        </div>

        <div className="space-y-6">
          {active === SECTION.TASKS && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <React.Suspense fallback={<div className="p-6">Loading task manager...</div>}>
                <ITTaskManager onBack={() => handleSetActive(SECTION.BUDGET)} />
              </React.Suspense>
            </div>
          )}

          {active === SECTION.BUDGET && (
            <React.Suspense fallback={<div className="p-6">Loading budget...</div>}>
              <BudgetDashboard department="it" />
            </React.Suspense>
          )}
        </div>
      </div>
    </div>
  );
};

export default IT;
