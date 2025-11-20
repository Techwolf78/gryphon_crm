import { useState, useMemo } from "react";
import { Building2, Wifi, Wrench, Zap, Home, Lock, Users } from "lucide-react";
import FixedCostExpenseModal from "./FixedCostExpenseModal";
import EmployeeSalaryModal from "./EmployeeSalaryModal";

// Shared fixed cost + HR salary categories
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

  // 🔒 Restrict non-HR users
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-purple-50 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Manage Expenses</h2>
            <p className="text-sm text-gray-600 mt-1">Manage shared company costs and department salaries</p>
          </div>
        </div>
      </div>

      {/* Shared Company Costs Section */}
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-lg overflow-hidden">
        <div className="bg-linear-to-r from-gray-50 to-slate-50 border-b border-gray-200/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Building2 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">Shared Company Costs</h4>
              <p className="text-sm text-gray-600">Apply company-wide expenses across all departments</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hrExpenseCategories.filter(exp => exp.type === "fixed").map((exp) => {
              const Icon = exp.icon;
              const isAvailable = activeBudgets.length > 0;

              return (
                <button
                  key={exp.key}
                  onClick={() => isAvailable && setActiveExpenseType(exp.key)}
                  disabled={!isAvailable}
                  className={`
                    group relative p-4 text-left rounded-lg
                    bg-white border border-gray-200 shadow-sm
                    transition-all duration-300 ease-out
                    hover:shadow-md hover:-translate-y-1 hover:border-blue-300
                    ${!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors`}
                    >
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {exp.label}
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Apply shared company-wide cost
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Department Salaries Section */}
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-lg overflow-hidden">
        <div className="bg-linear-to-r from-green-50 to-emerald-50 border-b border-gray-200/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">Department Salaries</h4>
              <p className="text-sm text-gray-600">Manage departmental salary expenses</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hrExpenseCategories.filter(exp => exp.type === "salary").map((exp) => {
              const Icon = exp.icon;
              const isAvailable = activeBudgets.length > 0;

              return (
                <button
                  key={exp.key}
                  onClick={() => isAvailable && setActiveExpenseType(exp.key)}
                  disabled={!isAvailable}
                  className={`
                    group relative p-4 text-left rounded-lg
                    bg-white border border-gray-200 shadow-sm
                    transition-all duration-300 ease-out
                    hover:shadow-md hover:-translate-y-1 hover:border-green-300
                    ${!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors`}
                    >
                      <Icon className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {exp.label}
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Manage departmental salary expenses
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Renderer */}
      {renderExpenseModal()}
    </div>
  );
}

export default ExpensesPanel;
