import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";

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

  // New state for GST
  const [includeGST, setIncludeGST] = useState(false);

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
      setIncludeGST(false); // Reset GST
    }
  }, [show]);

  // 🔹 Auto-sync all item categories with the selected budget component
  useEffect(() => {
    if (!formData.budgetComponent) return;

    setFormData((prev) => ({
      ...prev,
      requestedItems: prev.requestedItems.map((item) => ({
        ...item,
        category: formData.budgetComponent,
      })),
    }));
  }, [formData.budgetComponent]);

  const handleItemChange = (index, field, value) => {
    const updatedItems = formData.requestedItems.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };

        // Auto-calculate estTotal (BASE PRICE) when quantity or price changes
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
          category: prev.budgetComponent,
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

  // Calculates BASE Total (without GST)
  const calculateBaseTotal = () => {
    return formData.requestedItems.reduce((total, item) => {
      return total + (item.estTotal || 0);
    }, 0);
  };

  // Calculates Final Total (with GST if checked)
  const calculateFinalTotal = () => {
    const base = calculateBaseTotal();
    return includeGST ? base * 1.18 : base; // Adding 18% GST
  };

  const getRemainingBudget = () => {
    if (!currentBudget || !formData.budgetComponent) return 0;

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

    const estimatedTotal = calculateFinalTotal();
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
      estimatedTotal, // This is the Grand Total (Base + GST if checked)
      includeGST, // 🔹 Pass the flag
      baseTotal: calculateBaseTotal(), // 🔹 Helper for PO creation later
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

  useEffect(() => {
    const preventScrollChange = (e) => {
      if (
        document.activeElement.type === "number" &&
        document.activeElement.contains(e.target)
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", preventScrollChange, { passive: false });
    return () => window.removeEventListener("wheel", preventScrollChange);
  }, []);

  if (!show) return null;

  const baseTotal = calculateBaseTotal();
  const grandTotal = calculateFinalTotal();
  const remainingBudget = getRemainingBudget();
  const exceedsBudget = grandTotal > remainingBudget;

  const availableCategories = Object.keys(
    currentBudget?.departmentExpenses || {}
  )
    .filter((key) => key !== "employeeSalary")
    .map((key) => ({
      value: key,
      label:
        budgetComponents?.[key] || key.charAt(0).toUpperCase() + key.slice(1),
    }));

  console.log(budgetComponents);
  console.log(availableCategories);
  console.log(currentBudget?.departmentExpenses);

  const hasBudget =
    currentBudget &&
    Object.keys(currentBudget).length > 0 &&
    currentBudget.csddExpenses;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-1000">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-200/50">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-gray-200/50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Create Purchase Intent
              </h2>
              <p className="text-xs text-gray-600">
                Submit a new purchase request for approval
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        {!hasBudget ? (
          <div className="p-8 text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-600 mb-2">
                No Budget Found
              </h2>
              <p className="text-gray-600">
                The CSDD budget for FY {fiscalYear} has not been created yet.
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="overflow-y-auto max-h-[calc(90vh-85px)]"
          >
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Basic Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Intent Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Laptops for New Team Members"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                        <span className="text-gray-600">
                          Remaining Budget:{" "}
                        </span>
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
              </div>

              {/* Description */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Description
                  </h3>
                </div>
                <div className="space-y-2">
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Describe the purpose..."
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Requested Items
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.requestedItems.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-semibold text-gray-900">
                          Item {item.sno}
                        </h4>
                        {formData.requestedItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 text-sm font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
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
                            className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-lg cursor-not-allowed"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Description *
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Est. Price (₹) *
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            required
                          />
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-sm font-medium text-gray-700">
                          Item Total (Excl. GST): ₹
                          {(item.estTotal || 0).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Details & GST Checkbox */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Additional Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Total Estimated Cost
                    </label>
                    <div
                      className={`p-3 rounded-lg border flex flex-col justify-center items-center ${
                        exceedsBudget
                          ? "bg-red-50 text-red-800 border-red-200"
                          : "bg-green-50 text-green-800 border-green-200"
                      }`}
                    >
                      <span className="font-bold text-lg">
                        ₹{grandTotal.toLocaleString("en-IN")}
                      </span>
                      {exceedsBudget && (
                        <div className="text-sm font-normal">
                          Exceeds remaining budget
                        </div>
                      )}
                    </div>

                    {/* GST Checkbox */}
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        id="intent-gst"
                        type="checkbox"
                        checked={includeGST}
                        onChange={(e) => setIncludeGST(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor="intent-gst"
                        className="text-sm text-gray-700 font-medium"
                      >
                        Include GST Estimate (18%)
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      Base Cost: ₹{baseTotal.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Submit Purchase Intent
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PurchaseIntentModal;
