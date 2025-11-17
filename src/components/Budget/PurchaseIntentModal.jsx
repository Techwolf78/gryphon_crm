import { useState, useEffect } from "react";

const PurchaseIntentModal = ({
  show,
  onClose,
  onSubmit,
  budgetComponents,
  componentColors,
  currentBudget,
  currentUser,
  department,
  fiscalYear,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budgetComponent: "",
    requestedItems: [
      {
        sno: 1,
        category: "",
        description: "",
        quantity: "",
        estPricePerUnit: "",
        estTotal: 0,
      },
    ],
    requiredBy: "",
  });

  useEffect(() => {
    if (!show) {
      // Reset form when modal closes
      setFormData({
        title: "",
        description: "",
        budgetComponent: "",
        requestedItems: [
          {
            sno: 1,
            category: "",
            description: "",
            quantity: "",
            estPricePerUnit: "",
            estTotal: 0,
          },
        ],
        requiredBy: "",
      });
    }
  }, [show]);

  // 🔹 Auto-sync all item categories with the selected budget component
  useEffect(() => {
    if (!formData.budgetComponent) return;

    setFormData((prev) => ({
      ...prev,
      requestedItems: prev.requestedItems.map((item) => ({
        ...item,
        category: formData.budgetComponent, // sync with selected budget component
      })),
    }));
  }, [formData.budgetComponent]);

  const handleItemChange = (index, field, value) => {
    const updatedItems = formData.requestedItems.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };

        // Auto-calculate estTotal when quantity or price changes
        if (field === "quantity" || field === "estPricePerUnit") {
          const quantity = parseFloat(updatedItem.quantity) || 0;
          const price = parseFloat(updatedItem.estPricePerUnit) || 0;
          updatedItem.estTotal = quantity * price;
        }

        return updatedItem;
      }
      return item;
    });

    setFormData((prev) => ({ ...prev, requestedItems: updatedItems }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      requestedItems: [
        ...prev.requestedItems,
        {
          sno: prev.requestedItems.length + 1,
          category: "",
          description: "",
          quantity: "",
          estPricePerUnit: "",
          estTotal: 0,
        },
      ],
    }));
  };

  const removeItem = (index) => {
    if (formData.requestedItems.length > 1) {
      const updatedItems = formData.requestedItems
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, sno: i + 1 }));

      setFormData((prev) => ({
        ...prev,
        requestedItems: updatedItems,
      }));
    }
  };

  const calculateTotalEstimate = () => {
    return formData.requestedItems.reduce((total, item) => {
      return total + (item.estTotal || 0);
    }, 0);
  };

  const getRemainingBudget = () => {
    if (!currentBudget || !formData.budgetComponent) return 0;

    // Check across all expense groups
    const component =
      currentBudget.departmentExpenses?.[formData.budgetComponent] ||
      currentBudget.fixedCosts?.[formData.budgetComponent] ||
      currentBudget.csddExpenses?.[formData.budgetComponent];

    return component ? (component.allocated || 0) - (component.spent || 0) : 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title.trim() || !formData.budgetComponent) {
      alert("Please fill in all required fields");
      return;
    }

    // Validate items
    for (let i = 0; i < formData.requestedItems.length; i++) {
      const item = formData.requestedItems[i];
      if (!item.category.trim()) {
        alert(`Please select a category for item ${i + 1}`);
        return;
      }
      if (!item.description.trim()) {
        alert(`Please enter a description for item ${i + 1}`);
        return;
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        alert(`Please enter a valid quantity for item ${i + 1}`);
        return;
      }
      if (!item.estPricePerUnit || parseFloat(item.estPricePerUnit) <= 0) {
        alert(`Please enter a valid price for item ${i + 1}`);
        return;
      }
    }

    const estimatedTotal = calculateTotalEstimate();
    const remainingBudget = getRemainingBudget();

    if (estimatedTotal > remainingBudget) {
      if (
        !confirm(
          `This purchase intent (₹${estimatedTotal.toLocaleString()}) exceeds the remaining budget (₹${remainingBudget.toLocaleString()}). Do you want to proceed?`
        )
      ) {
        return;
      }
    }

    // Prepare data according to Firestore structure
    const submissionData = {
      deptId: department,
      budgetId: currentBudget?.id || `${department}_FY-20${fiscalYear}`,
      createdBy: currentUser?.uid,
      ownerName: currentUser?.displayName || "Unknown",
      title: formData.title,
      description: formData.description || "",
      requestedItems: formData.requestedItems.map((item) => ({
        sno: item.sno,
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        estPricePerUnit: parseFloat(item.estPricePerUnit) || 0,
        estTotal: item.estTotal || 0,
      })),
      estimatedTotal,
      requiredBy: formData.requiredBy || "",
      selectedBudgetComponent: formData.budgetComponent,
      status: "submitted",
      createdAt: new Date().getTime(),
      history: [
        {
          by: currentUser?.uid,
          action: "created",
          at: new Date().getTime(),
        },
      ],
    };

    onSubmit(submissionData);
  };

  if (!show) return null;

  const estimatedTotal = calculateTotalEstimate();
  const remainingBudget = getRemainingBudget();
  const exceedsBudget = estimatedTotal > remainingBudget;

  const availableCategories = Object.entries(budgetComponents || {})
    .filter(([key]) => currentBudget?.departmentExpenses?.[key])
    .map(([key, label]) => ({
      value: key,
      label: label,
    }));

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

  // ====== BUDGET CHECK ======
  const hasBudget =
    currentBudget &&
    Object.keys(currentBudget).length > 0 &&
    currentBudget.csddExpenses; // or any key you rely on

  return (
    <div className="mt-10 fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Create Purchase Intent
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
        {!hasBudget ? (
          <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-2">
              ❗ No Budget Found
            </h2>
            <p className="text-gray-600">
              The CSDD budget for FY {fiscalYear} has not been created yet.
            </p>
            <p className="text-gray-500 mt-1">
              Please ask Finance/Admin to set it up.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6 overflow-y-auto max-h-[70vh]"
          >
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intent Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Laptops for New Team Members"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Component *
                </label>
                <select
                  value={formData.budgetComponent}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      budgetComponent: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Component</option>
                  {availableCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {formData.budgetComponent && currentBudget && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-600">Remaining Budget: </span>
                    <span
                      className={`font-semibold ${
                        exceedsBudget ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      ₹{remainingBudget.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the purpose and requirements for this purchase..."
              />
            </div>

            {/* Requested Items List */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Requested Items
                </h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  + Add Item
                </button>
              </div>

              {formData.requestedItems.map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg mb-3">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-gray-900">
                      Item {item.sno}
                    </h4>
                    {formData.requestedItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Category *
                      </label>
                      <input
                        type="text"
                        value={
                          budgetComponents[formData.budgetComponent] ||
                          formData.budgetComponent ||
                          "—"
                        }
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-lg text-sm cursor-not-allowed"
                        placeholder="Auto-set from Budget Component"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, "description", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="e.g., Dell Latitude 5440 Laptop"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", e.target.value)
                        }
                        min="1"
                        step="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Estimated Price (₹) *
                      </label>
                      <input
                        type="number"
                        value={item.estPricePerUnit}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "estPricePerUnit",
                            e.target.value
                          )
                        }
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-600">
                    Item Total: ₹{(item.estTotal || 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required By Date
                </label>
                <input
                  type="date"
                  value={formData.requiredBy}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      requiredBy: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Estimated Cost
                </label>
                <div
                  className={`p-2 rounded-lg text-center font-semibold ${
                    exceedsBudget
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  ₹{estimatedTotal.toLocaleString()}
                  {exceedsBudget && (
                    <div className="text-xs mt-1">Exceeds remaining budget</div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Submit Purchase Intent
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PurchaseIntentModal;
