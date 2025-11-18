import { useState, useMemo } from "react";
import { Building2, Wifi, Wrench, Zap, Home, Lock, Users } from "lucide-react";
import FixedCostExpenseModal from "./FixedCostExpenseModal";
import EmployeeSalaryModal from "./EmployeeSalaryModal";
import CsddCostsPanel from "./CSDDCostsPanel";

const hrExpenseCategories = [
  {
    key: "rent",
    label: "Office Rent",
    icon: Home,
    section: "fixedCosts",
    type: "fixed",
  },
  {
    key: "electricity",
    label: "Electricity Bill",
    icon: Zap,
    section: "fixedCosts",
    type: "fixed",
  },
  {
    key: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    section: "fixedCosts",
    type: "fixed",
  },
  {
    key: "internet",
    label: "Internet / Wi-Fi",
    icon: Wifi,
    section: "fixedCosts",
    type: "fixed",
  },
  {
    key: "employeeSalary",
    label: "Employee Salaries",
    icon: Users,
    section: "departmentExpenses",
    type: "salary",
  },
];

function ExpensesPanel({
  activeBudgets = [],
  currentUser,
  userDepartment = "hr",
  onExpenseSubmit,
}) {
  const [activeExpenseType, setActiveExpenseType] = useState(null);
  const [activeTab, setActiveTab] = useState("csdd");

  const isHR = useMemo(() => {
    const allowed = ["hr", "admin", "purchase"];
    return allowed.includes(userDepartment?.toLowerCase());
  }, [userDepartment]);

  const handleCloseModal = () => setActiveExpenseType(null);

  const renderExpenseModal = () => {
    const selected = hrExpenseCategories.find(
      (e) => e.key === activeExpenseType
    );
    if (!selected) return null;

    const baseProps = {
      onClose: handleCloseModal,
      activeBudgets,
      currentUser,
    };

    if (selected.type === "salary") {
      return (
        <EmployeeSalaryModal
          {...baseProps}
          onSubmit={(data) => {
            onExpenseSubmit({
              ...data,
              expenseType: "employeeSalary",
              expenseSection: "departmentExpenses",
              createdBy: currentUser.uid,
              createdAt: new Date(),
            });
            handleCloseModal();
          }}
        />
      );
    }

    return (
      <FixedCostExpenseModal
        {...baseProps}
        category={selected}
        onSubmit={(data) => {
          onExpenseSubmit({
            ...data,
            expenseType: selected.key,
            expenseSection: "fixedCosts",
            createdBy: currentUser.uid,
            createdAt: new Date(),
          });
          handleCloseModal();
        }}
      />
    );
  };

  // Restrict access
  if (!isHR) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Access Restricted
        </h2>
        <p className="text-gray-500 text-center max-w-sm">
          Only HR, Admin, or Purchase departments can manage shared company
          expenses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ---------------------- */}
      {/* 🎯 TOP NAVIGATION - SMOOTH UNDERLINE */}
      {/* ---------------------- */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("csdd")}
            className="relative py-4 px-1 text-sm font-medium transition-all duration-300"
          >
            <span
              className={`transition-colors duration-300 ${
                activeTab === "csdd"
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              CSDD Costs
            </span>
            {activeTab === "csdd" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transition-all duration-300" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("fixed")}
            className="relative py-4 px-1 text-sm font-medium transition-all duration-300"
          >
            <span
              className={`transition-colors duration-300 ${
                activeTab === "fixed"
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Fixed Costs
            </span>
            {activeTab === "fixed" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transition-all duration-300" />
            )}
          </button>
        </nav>
      </div>

      {/* ---------------------- */}
      {/* 📊 MAIN CONTENT PANEL */}
      {/* ---------------------- */}
      <div>
        {activeTab === "fixed" && (
          <div className="space-y-6">
            <div className="text-left">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Fixed Costs
              </h2>
              <p className="text-gray-600">
                Manage shared company costs and department salaries
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {hrExpenseCategories.map((exp) => {
                const Icon = exp.icon;
                const isAvailable = activeBudgets.length > 0;

                return (
                  <button
                    key={exp.key}
                    onClick={() => isAvailable && setActiveExpenseType(exp.key)}
                    disabled={!isAvailable}
                    className={`
                      group relative p-6 text-left rounded-xl
                      bg-white border border-gray-200 shadow-sm
                      transition-all duration-300 ease-out
                      hover:shadow-md hover:-translate-y-1 hover:border-gray-300
                      ${!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gray-100 group-hover:bg-gray-200 transition-colors">
                        <Icon className="w-6 h-6 text-gray-700" />
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {exp.label}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {exp.type === "fixed"
                            ? "Apply shared company-wide cost"
                            : "Manage departmental salary expenses"}
                        </p>
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-100 group-hover:bg-blue-500 transition-all rounded-b-xl" />
                  </button>
                );
              })}
            </div>

            {renderExpenseModal()}
          </div>
        )}

        {activeTab === "csdd" && (
          <CsddCostsPanel
            department="purchase"
            fiscalYear={activeBudgets?.[0]?.fiscalYear}
            currentUser={currentUser}
            currentBudget={activeBudgets?.[0] || null}
          />
        )}
      </div>
    </div>
  );
}

export default ExpensesPanel;
