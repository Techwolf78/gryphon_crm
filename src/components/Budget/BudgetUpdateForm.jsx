import { useState, useEffect } from "react";
import {
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  collection,
} from "firebase/firestore";
import { db } from "../../firebase";
import { Trash2, Package } from "lucide-react";

// Helper function to safely convert to number with fallback (only for calculations)
const safeNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

const BudgetUpdateForm = ({
  show,
  onClose,
  onSubmit,
  budgetComponents, // Initial components from parent
  allBudgetComponents, // All department components
  existingBudget,
  currentUser,
  department = "purchase",
}) => {
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    fiscalYear: "",
    ownerName: "",
    fixedCosts: {
      rent: "",
      maintenance: "",
      electricity: "",
      internet: "",
      renovation: "",
    },
    departmentExpenses: {
      employeeSalary: "",
    },
    csddExpenses: {
      intercity_outstation_visits: "",
      lunch_dinner_with_client: "",
      mobile_sim: "",
    },
    components: {},
    csddComponents: {},
    notes: "",
    status: "draft",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedComponent, setSelectedComponent] = useState("");
  const [componentAllocation, setComponentAllocation] = useState("");
  const [componentNotes, setComponentNotes] = useState("");
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [showCsddComponentForm, setShowCsddComponentForm] = useState(false);
  const [csddComponentName, setCsddComponentName] = useState("");
  const [csddComponentAllocation, setCsddComponentAllocation] = useState("");
  const [csddComponentNotes, setCsddComponentNotes] = useState("");

  // Simple function to get current department components
  const getDynamicBudgetComponents = () => {
    return (
      allBudgetComponents[formData.department] ||
      allBudgetComponents.admin ||
      {}
    );
  };

  // Get available components (not yet added)
  const availableComponents = Object.entries(
    getDynamicBudgetComponents() || {}
  ).filter(([key]) => !formData.components?.[key]);

  // Initialize form data from existing budget
  useEffect(() => {
    if (existingBudget) {
      setFormData({
        title: existingBudget.title || "",
        department: existingBudget.department || department,
        fiscalYear: existingBudget.fiscalYear || "",
        ownerName: existingBudget.ownerName || currentUser.displayName,
        fixedCosts: {
          rent: existingBudget.fixedCosts?.rent ?? "",
          maintenance: existingBudget.fixedCosts?.maintenance ?? "",
          electricity: existingBudget.fixedCosts?.electricity ?? "",
          internet: existingBudget.fixedCosts?.internet ?? "",
          renovation: existingBudget.fixedCosts?.renovation ?? "",
        },
        departmentExpenses: {
          employeeSalary:
            existingBudget.departmentExpenses?.employeeSalary ?? "",
        },
        csddExpenses: {
          intercity_outstation_visits:
            existingBudget.csddExpenses?.intercity_outstation_visits ?? "",
          lunch_dinner_with_client:
            existingBudget.csddExpenses?.lunch_dinner_with_client ?? "",
          mobile_sim: existingBudget.csddExpenses?.mobile_sim ?? "",
        },
        components: existingBudget.components || {},
        csddComponents: existingBudget.csddComponents || {},
        notes: existingBudget.notes || "",
        status: existingBudget.status || "draft",
      });
    }
  }, [existingBudget, department, currentUser]);

  const calculateTotalAllocated = () => {
    try {
      const fixedCostsTotal = Object.values(formData.fixedCosts || {}).reduce(
        (sum, cost) => sum + safeNumber(cost),
        0
      );
      const departmentExpensesTotal = Object.values(
        formData.departmentExpenses || {}
      ).reduce((sum, cost) => sum + safeNumber(cost), 0);
      const csddExpensesTotal = Object.values(
        formData.csddExpenses || {}
      ).reduce((sum, cost) => sum + safeNumber(cost), 0);
      const componentsTotal = Object.values(formData.components || {}).reduce(
        (sum, comp) => sum + safeNumber(comp?.allocated),
        0
      );
      const csddComponentsTotal = Object.values(
        formData.csddComponents || {}
      ).reduce((sum, comp) => sum + safeNumber(comp?.allocated), 0);

      return (
        fixedCostsTotal +
        departmentExpensesTotal +
        csddExpensesTotal +
        componentsTotal +
        csddComponentsTotal
      );
    } catch (error) {
      console.error("Error calculating total:", error);
      return 0;
    }
  };

  // Add new CSDD component
  const addNewCsddComponent = () => {
    if (!csddComponentName.trim()) {
      alert("Please enter a CSDD component name");
      return;
    }

    const componentId = csddComponentName.toLowerCase().replace(/\s+/g, "_");

    if (formData.csddComponents[componentId]) {
      alert("This CSDD component has already been added");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      csddComponents: {
        ...prev.csddComponents,
        [componentId]: {
          name: csddComponentName,
          allocated: csddComponentAllocation,
          spent: 0,
          notes: csddComponentNotes,
          isCsdd: true,
        },
      },
    }));

    // Reset form and close
    setCsddComponentName("");
    setCsddComponentAllocation("");
    setCsddComponentNotes("");
    setShowCsddComponentForm(false);
  };

  const handleCsddComponentChange = (componentId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      csddComponents: {
        ...prev.csddComponents,
        [componentId]: {
          ...prev.csddComponents[componentId],
          [field]: field === "allocated" ? value : value,
          spent: prev.csddComponents[componentId]?.spent || 0,
        },
      },
    }));
  };

  const removeCsddComponent = (componentId) => {
    setFormData((prev) => {
      const updatedComponents = { ...prev.csddComponents };
      delete updatedComponents[componentId];
      return {
        ...prev,
        csddComponents: updatedComponents,
      };
    });
  };

  // Input handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("fixedCosts.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        fixedCosts: {
          ...prev.fixedCosts,
          [field]: value,
        },
      }));
    } else if (name.startsWith("departmentExpenses.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        departmentExpenses: {
          ...prev.departmentExpenses,
          [field]: value,
        },
      }));
    } else if (name.startsWith("csddExpenses.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        csddExpenses: {
          ...prev.csddExpenses,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleComponentChange = (componentId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      components: {
        ...prev.components,
        [componentId]: {
          ...prev.components[componentId],
          [field]: field === "allocated" ? value : value,
          spent: prev.components[componentId]?.spent || 0,
        },
      },
    }));
  };

  const addNewComponent = () => {
    if (!selectedComponent) {
      alert("Please select a component");
      return;
    }

    if (formData.components[selectedComponent]) {
      alert("This component has already been added");
      return;
    }

    // Use dynamic components for the name
    const dynamicComponents = getDynamicBudgetComponents();

    setFormData((prev) => ({
      ...prev,
      components: {
        ...prev.components,
        [selectedComponent]: {
          name: dynamicComponents[selectedComponent],
          allocated: componentAllocation,
          spent: 0,
          notes: componentNotes,
        },
      },
    }));

    // Reset form and close
    setSelectedComponent("");
    setComponentAllocation("");
    setComponentNotes("");
    setShowComponentForm(false);
  };

  const removeComponent = (componentId) => {
    setFormData((prev) => {
      const updatedComponents = { ...prev.components };
      delete updatedComponents[componentId];
      return {
        ...prev,
        components: updatedComponents,
      };
    });
  };

  // Check if fiscal year already exists for this department (excluding current budget)
  const checkFiscalYearExists = async () => {
    try {
      const budgetsQuery = query(
        collection(db, "department_budgets"),
        where("department", "==", department),
        where("fiscalYear", "==", formData.fiscalYear)
      );
      const snapshot = await getDocs(budgetsQuery);

      // For existing budget, check if it's not the same document
      if (existingBudget && snapshot.size > 0) {
        const existingDoc = snapshot.docs.find(
          (doc) => doc.id !== existingBudget.id
        );
        return !!existingDoc;
      }

      return false;
    } catch (error) {
      console.error("Error checking fiscal year:", error);
      return false;
    }
  };

  const validateForm = async () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Budget title is required";
    }

    if (!formData.fiscalYear || !formData.fiscalYear.match(/^\d{2}-\d{2}$/)) {
      newErrors.fiscalYear = "Please enter a valid fiscal year (e.g., 25-26)";
    } else {
      // Check if fiscal year already exists (excluding current budget)
      const fiscalYearExists = await checkFiscalYearExists();
      if (fiscalYearExists) {
        newErrors.fiscalYear = `A budget for FY${formData.fiscalYear} already exists for this department`;
      }
    }

    if (!formData.ownerName.trim()) {
      newErrors.ownerName = "Owner name is required";
    }

    // Validate that component allocations are not less than spent amounts
    Object.entries(formData.components || {}).forEach(
      ([componentId, component]) => {
        const allocated = safeNumber(component.allocated);
        const spent = safeNumber(component.spent);
        if (allocated < spent) {
          newErrors[
            componentId
          ] = `Allocated amount (${allocated}) cannot be less than already spent amount (${spent})`;
        }
      }
    );

    // Validate CSDD component allocations
    Object.entries(formData.csddComponents || {}).forEach(
      ([componentId, component]) => {
        const allocated = safeNumber(component.allocated);
        const spent = safeNumber(component.spent);
        if (allocated < spent) {
          newErrors[
            `csdd_${componentId}`
          ] = `CSDD allocated amount (${allocated}) cannot be less than already spent amount (${spent})`;
        }
      }
    );

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!(await validateForm())) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for submission - convert empty strings to 0 only when sending
      const budgetData = {
        title: formData.title,
        department: formData.department,
        fiscalYear: formData.fiscalYear,
        ownerName: formData.ownerName,
        fixedCosts: {
          rent: safeNumber(formData.fixedCosts.rent),
          maintenance: safeNumber(formData.fixedCosts.maintenance),
          electricity: safeNumber(formData.fixedCosts.electricity),
          internet: safeNumber(formData.fixedCosts.internet),
          renovation: safeNumber(formData.fixedCosts.renovation),
        },
        departmentExpenses: {
          employeeSalary: safeNumber(
            formData.departmentExpenses.employeeSalary
          ),
        },
        csddExpenses: {
          intercity_outstation_visits: safeNumber(
            formData.csddExpenses.intercity_outstation_visits
          ),
          lunch_dinner_with_client: safeNumber(
            formData.csddExpenses.lunch_dinner_with_client
          ),
          mobile_sim: safeNumber(formData.csddExpenses.mobile_sim),
        },
        components: Object.fromEntries(
          Object.entries(formData.components).map(([key, comp]) => [
            key,
            {
              ...comp,
              allocated: safeNumber(comp.allocated),
              spent: safeNumber(comp.spent),
            },
          ])
        ),
        csddComponents: Object.fromEntries(
          Object.entries(formData.csddComponents).map(([key, comp]) => [
            key,
            {
              ...comp,
              allocated: safeNumber(comp.allocated),
              spent: safeNumber(comp.spent),
            },
          ])
        ),
        notes: formData.notes,
        status: formData.status,
        totalBudget: calculateTotalAllocated(),
        totalSpent: safeNumber(existingBudget?.totalSpent),
        lastUpdatedAt: new Date(),
        updatedBy: currentUser?.uid,
      };

      await onSubmit(budgetData, existingBudget);
      onClose();
    } catch (error) {
      console.error("Error updating budget:", error);
      alert(`Failed to update budget: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAllocated = calculateTotalAllocated();

  if (!show || !existingBudget) return null;

  useEffect(() => {
      const preventScrollChange = (e) => {
        if (
          document.activeElement.type === "number" &&
          document.activeElement.contains(e.target)
        ) {
          e.preventDefault(); // stop value change
        }
      };
  
      window.addEventListener("wheel", preventScrollChange, { passive: false });
  
      return () => window.removeEventListener("wheel", preventScrollChange);
    }, []);

  return (
    <div className="fixed inset-0 bg-black/30 mt-10 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-white">
            Edit Budget - FY{formData.fiscalYear}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-100 transition-colors"
            disabled={isSubmitting}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto max-h-[70vh]"
        >
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.title ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fiscal Year (FY) *
                </label>
                <input
                  type="text"
                  name="fiscalYear"
                  value={formData.fiscalYear}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.fiscalYear ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g., 25-26"
                  pattern="\d{2}-\d{2}"
                />
                {errors.fiscalYear && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.fiscalYear}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 min-h-[42px] flex items-center capitalize">
                  {formData.department}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Name *
                </label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.ownerName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Name of budget owner"
                />
                {errors.ownerName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.ownerName}
                  </p>
                )}
              </div>
            </div>

            {/* Fixed Costs */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Fixed Costs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rent (₹)
                  </label>
                  <input
                    type="number"
                    name="fixedCosts.rent"
                    value={formData.fixedCosts.rent}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maintenance (₹)
                  </label>
                  <input
                    type="number"
                    name="fixedCosts.maintenance"
                    value={formData.fixedCosts.maintenance}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Electricity (₹)
                  </label>
                  <input
                    type="number"
                    name="fixedCosts.electricity"
                    value={formData.fixedCosts.electricity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Internet (₹)
                  </label>
                  <input
                    type="number"
                    name="fixedCosts.internet"
                    value={formData.fixedCosts.internet}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Renovation (₹)
                  </label>
                  <input
                    type="number"
                    name="fixedCosts.renovation"
                    value={formData.fixedCosts.renovation}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Department Expenses */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Department Expenses
              </h3>

              {/* Employee Salary */}
              <div className="mb-6 flex gap-3 items-center justify-between">
                <label className="block text-md font-medium text-nowrap text-gray-700 mb-2">
                  Employee Salaries (₹)
                </label>
                <input
                  type="number"
                  name="departmentExpenses.employeeSalary"
                  value={formData.departmentExpenses.employeeSalary}
                  onChange={handleInputChange}
                  className="w-full  px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              {/* Budget Components Section */}
              <div className=" ">
                {/* Existing Components */}
                <div className="space-y-3 mb-4">
                  {Object.entries(formData.components || {}).map(
                    ([componentId, component]) => (
                      <div
                        key={componentId}
                        className="flex items-center gap-x-3  bg-white  rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex gap-5 justify-between items-center">
                            <label className="block text-md font-medium text-gray-700 mb-1 text-nowrap">
                              {component.name} (₹)
                            </label>
                            <input
                              type="number"
                              value={component.allocated}
                              onChange={(e) =>
                                handleComponentChange(
                                  componentId,
                                  "allocated",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              step="0.01"
                              placeholder="0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Spent: ₹
                              {safeNumber(component.spent).toLocaleString(
                                "en-IN"
                              )}
                            </p>
                          </div>
                          {errors[componentId] && (
                            <p className="text-xs text-red-600 mt-1">
                              {errors[componentId]}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeComponent(componentId)}
                          className=" text-red-600 text-sm hover:bg-red-50 rounded-lg transition-colors "
                        >
                          <Trash2 />
                        </button>
                      </div>
                    )
                  )}

                  {Object.keys(formData.components || {}).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      <Package size={40} className="mb-2 text-gray-400" />
                      <p className="text-sm">No components yet</p>
                      <p className="text-xs text-gray-400">
                        Add a component to see it here
                      </p>
                    </div>
                  )}
                </div>

                {/* Add Component Button at Bottom */}
                {!showComponentForm && availableComponents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowComponentForm(true)}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Add Budget Component
                  </button>
                )}
              </div>
            </div>

            {/* Component Selection Form - Only show when adding new component */}
            {showComponentForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-medium text-gray-900">
                    Add New Component
                  </h5>
                  <button
                    type="button"
                    onClick={() => setShowComponentForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Component
                    </label>
                    <select
                      value={selectedComponent}
                      onChange={(e) => setSelectedComponent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a component...</option>
                      {availableComponents.map(([key, name]) => (
                        <option key={key} value={key}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {availableComponents.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        All components have been added
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allocated Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={componentAllocation}
                      onChange={(e) => setComponentAllocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addNewComponent}
                    disabled={
                      !selectedComponent || availableComponents.length === 0
                    }
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Add Component
                  </button>
                </div>
              </div>
            )}

            {/* CSDD Expenses Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                CSDD Expenses (Corporate Social & Developmental Duties)
              </h3>

              {/* Static CSDD Expense Inputs */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="block text-md font-medium text-gray-700 mb-2">
                    Intercity/Outstation Visits (₹)
                  </label>
                  <input
                    type="number"
                    name="csddExpenses.intercity_outstation_visits"
                    value={formData.csddExpenses.intercity_outstation_visits}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-md font-medium text-gray-700 mb-2">
                    Lunch/Dinner with Client (₹)
                  </label>
                  <input
                    type="number"
                    name="csddExpenses.lunch_dinner_with_client"
                    value={formData.csddExpenses.lunch_dinner_with_client}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-md font-medium text-gray-700 mb-2">
                    Mobile/Sim (₹)
                  </label>
                  <input
                    type="number"
                    name="csddExpenses.mobile_sim"
                    value={formData.csddExpenses.mobile_sim}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* CSDD Components Section */}
              <div>
                {/* Existing CSDD Components */}
                <div className="space-y-3 mb-4">
                  {Object.entries(formData.csddComponents || {}).map(
                    ([componentId, component]) => (
                      <div
                        key={componentId}
                        className="flex items-center gap-x-3 bg-white rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex gap-5 justify-between items-center">
                            <label className="block text-md font-medium text-gray-700 mb-1 text-nowrap">
                              {component.name} (₹)
                            </label>
                            <input
                              type="number"
                              value={component.allocated}
                              onChange={(e) =>
                                handleCsddComponentChange(
                                  componentId,
                                  "allocated",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              step="0.01"
                              placeholder="0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Spent: ₹
                              {safeNumber(component.spent).toLocaleString(
                                "en-IN"
                              )}
                            </p>
                          </div>
                          {errors[`csdd_${componentId}`] && (
                            <p className="text-xs text-red-600 mt-1">
                              {errors[`csdd_${componentId}`]}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCsddComponent(componentId)}
                          className="text-red-600 text-sm hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    )
                  )}

                  {Object.keys(formData.csddComponents || {}).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      <Package size={40} className="mb-2 text-gray-400" />
                      <p className="text-sm">No CSDD components yet</p>
                      <p className="text-xs text-gray-400">
                        Add a CSDD component to see it here
                      </p>
                    </div>
                  )}
                </div>

                {/* Add CSDD Component Button */}
                {!showCsddComponentForm && (
                  <button
                    type="button"
                    onClick={() => setShowCsddComponentForm(true)}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Add CSDD Component
                  </button>
                )}
              </div>
            </div>

            {/* CSDD Component Selection Form */}
            {showCsddComponentForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-medium text-gray-900">
                    Add New CSDD Component
                  </h5>
                  <button
                    type="button"
                    onClick={() => setShowCsddComponentForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Component Name
                    </label>
                    <input
                      type="text"
                      value={csddComponentName}
                      onChange={(e) => setCsddComponentName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter CSDD component name"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allocated Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={csddComponentAllocation}
                      onChange={(e) =>
                        setCsddComponentAllocation(e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addNewCsddComponent}
                    disabled={!csddComponentName.trim()}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Add CSDD Component
                  </button>
                </div>
              </div>
            )}

            {/* Budget Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Budget Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    ₹{safeNumber(totalAllocated).toLocaleString("en-IN")}
                  </div>
                  <div className="text-sm text-gray-600">Total Budget</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    ₹
                    {Object.values(formData.fixedCosts || {})
                      .reduce((sum, cost) => sum + safeNumber(cost), 0)
                      .toLocaleString("en-IN")}
                  </div>
                  <div className="text-sm text-gray-600">Fixed Costs</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    ₹
                    {(
                      Object.values(formData.departmentExpenses || {}).reduce(
                        (sum, cost) => sum + safeNumber(cost),
                        0
                      ) +
                      Object.values(formData.components || {}).reduce(
                        (sum, comp) => sum + safeNumber(comp?.allocated),
                        0
                      )
                    ).toLocaleString("en-IN")}
                  </div>
                  <div className="text-sm text-gray-600">Department</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Salaries + Components
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    ₹
                    {(
                      Object.values(formData.csddExpenses || {}).reduce(
                        (sum, cost) => sum + safeNumber(cost),
                        0
                      ) +
                      Object.values(formData.csddComponents || {}).reduce(
                        (sum, comp) => sum + safeNumber(comp?.allocated),
                        0
                      )
                    ).toLocaleString("en-IN")}
                  </div>
                  <div className="text-sm text-gray-600">CSDD</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Expenses + Components
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {Object.keys(formData.components || {}).length +
                      Object.keys(formData.csddComponents || {}).length}
                  </div>
                  <div className="text-sm text-gray-600">Components</div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Updating...
                </>
              ) : (
                "Update Budget"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetUpdateForm;
