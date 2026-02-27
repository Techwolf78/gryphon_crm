import { useState, useEffect } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

/**
 * CSDD Purchase Intent Modal — DM Department Only
 *
 * Two-level budget selector:
 *   1. Client (from csddExpenses keys where type === "client")
 *   2. Component (from csdd_clients/{clientKey}.client_components)
 *
 * Adds intentType: "csdd", clientKey, and csddComponent to the payload
 * so the PO creation transaction knows to update both the main doc and subcollection.
 */
const CsddPurchaseIntentModal = ({
  show,
  onClose,
  onSubmit,
  currentBudget,
  currentUser,
  department,
  fiscalYear,
}) => {
  // --- Form State ---
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    clientKey: "",
    csddComponent: "",
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

  const [includeGST, setIncludeGST] = useState(false);
  const [clientComponents, setClientComponents] = useState({});
  const [loadingComponents, setLoadingComponents] = useState(false);

  // --- Derived: Client list from main budget doc ---
  const clientList = currentBudget?.csddExpenses
    ? Object.entries(currentBudget.csddExpenses)
        .filter(([, val]) => typeof val === "object" && val.type === "client")
        .map(([key, val]) => ({
          key,
          name: val.client_name || key.replace(/_/g, " "),
          allocated: val.allocated || 0,
          spent: val.spent || 0,
        }))
    : [];

  // --- Reset form on close ---
  useEffect(() => {
    if (!show) {
      setFormData({
        title: "",
        description: "",
        clientKey: "",
        csddComponent: "",
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
      setIncludeGST(false);
      setClientComponents({});
    }
  }, [show]);

  // --- Fetch client components when client changes ---
  useEffect(() => {
    if (!formData.clientKey || !currentBudget?.id) {
      setClientComponents({});
      return;
    }

    const fetchComponents = async () => {
      setLoadingComponents(true);
      try {
        const clientDocRef = doc(
          db,
          "department_budgets",
          currentBudget.id,
          "csdd_clients",
          formData.clientKey,
        );
        const clientDoc = await getDoc(clientDocRef);
        if (clientDoc.exists()) {
          setClientComponents(clientDoc.data().client_components || {});
        } else {
          setClientComponents({});
        }
      } catch (err) {
        console.error("Error fetching client components:", err);
        setClientComponents({});
      } finally {
        setLoadingComponents(false);
      }
    };

    fetchComponents();
  }, [formData.clientKey, currentBudget?.id]);

  // --- Auto-sync item categories with selected component ---
  useEffect(() => {
    if (!formData.csddComponent) return;
    setFormData((prev) => ({
      ...prev,
      requestedItems: prev.requestedItems.map((item) => ({
        ...item,
        category: formData.csddComponent,
      })),
    }));
  }, [formData.csddComponent]);

  // --- Item handlers ---
  const handleItemChange = (index, field, value) => {
    const updatedItems = formData.requestedItems.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        if (field === "quantity" || field === "estPricePerUnit") {
          const qty = parseFloat(updatedItem.quantity) || 0;
          const price = parseFloat(updatedItem.estPricePerUnit) || 0;
          updatedItem.estTotal = qty * price;
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
          category: prev.csddComponent,
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
      setFormData((prev) => ({ ...prev, requestedItems: updatedItems }));
    }
  };

  // --- Budget calculations ---
  const calculateBaseTotal = () =>
    formData.requestedItems.reduce(
      (total, item) => total + (item.estTotal || 0),
      0,
    );

  const calculateFinalTotal = () => {
    const base = calculateBaseTotal();
    return includeGST ? base * 1.18 : base;
  };

  const getClientRemaining = () => {
    const client = clientList.find((c) => c.key === formData.clientKey);
    return client ? client.allocated - client.spent : 0;
  };

  const getComponentRemaining = () => {
    if (!formData.csddComponent || !clientComponents[formData.csddComponent])
      return 0;
    const comp = clientComponents[formData.csddComponent];
    return (comp.allocated || 0) - (comp.spent || 0);
  };

  // --- Submit ---
  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.clientKey ||
      !formData.csddComponent
    ) {
      alert("Please fill in all required fields (Title, Client, Component)");
      return;
    }

    for (let i = 0; i < formData.requestedItems.length; i++) {
      const item = formData.requestedItems[i];
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
    const componentRemaining = getComponentRemaining();

    if (estimatedTotal > componentRemaining) {
      if (
        !confirm(
          `This intent (₹${estimatedTotal.toLocaleString()}) exceeds the component's remaining budget (₹${componentRemaining.toLocaleString()}). Proceed anyway?`,
        )
      ) {
        return;
      }
    }

    const selectedClient = clientList.find((c) => c.key === formData.clientKey);

    const submissionData = {
      // Standard fields (same shape as normal intents)
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
      includeGST,
      baseTotal: calculateBaseTotal(),
      requiredBy: formData.requiredBy || "",
      selectedBudgetComponent: formData.clientKey, // Maps to csddExpenses key
      status: "submitted",
      createdAt: new Date().getTime(),
      history: [
        { by: currentUser?.uid, action: "created", at: new Date().getTime() },
      ],

      // CSDD-specific fields
      intentType: "csdd",
      clientKey: formData.clientKey,
      clientName: selectedClient?.name || formData.clientKey,
      csddComponent: formData.csddComponent,
    };

    onSubmit(submissionData);
  };

  // --- Scroll prevention ---
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

  return (
    <div className="mt-10 fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              CSDD Purchase Intent
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Create a purchase intent for a client budget component
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto max-h-[72vh]"
        >
          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="e.g., Social Media Campaign Q3"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows={2}
              placeholder="Brief description of the purchase..."
            />
          </div>

          {/* Client & Component Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Client Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client *
              </label>
              <select
                value={formData.clientKey}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    clientKey: e.target.value,
                    csddComponent: "", // Reset component when client changes
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              >
                <option value="">Select Client</option>
                {clientList.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name} (₹{(c.allocated - c.spent).toLocaleString("en-IN")}{" "}
                    remaining)
                  </option>
                ))}
              </select>
            </div>

            {/* Component Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Component *
              </label>
              {loadingComponents ? (
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading components...
                </div>
              ) : (
                <select
                  value={formData.csddComponent}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      csddComponent: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                  disabled={!formData.clientKey}
                >
                  <option value="">
                    {formData.clientKey
                      ? Object.keys(clientComponents).length > 0
                        ? "Select Component"
                        : "No components found"
                      : "Select a client first"}
                  </option>
                  {Object.entries(clientComponents).map(([key, comp]) => (
                    <option key={key} value={key}>
                      {key.replace(/_/g, " ")} (₹
                      {(
                        (comp.allocated || 0) - (comp.spent || 0)
                      ).toLocaleString("en-IN")}{" "}
                      remaining)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Budget Info Cards */}
          {formData.clientKey && (
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
                  Client Remaining
                </p>
                <p className="text-lg font-bold text-blue-900">
                  ₹{getClientRemaining().toLocaleString("en-IN")}
                </p>
              </div>
              {formData.csddComponent && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">
                    Component Remaining
                  </p>
                  <p className="text-lg font-bold text-emerald-900">
                    ₹{getComponentRemaining().toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Requested Items */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                Requested Items
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-lg hover:bg-amber-200 font-medium transition-colors"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-3">
              {formData.requestedItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-200"
                >
                  <div className="col-span-1 text-center">
                    <span className="text-xs text-gray-500 font-medium">
                      #{item.sno}
                    </span>
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs text-gray-600 mb-0.5">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(index, "description", e.target.value)
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-amber-500"
                      placeholder="Item description"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-0.5">
                      Qty *
                    </label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-amber-500"
                      min="1"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-0.5">
                      Unit Price *
                    </label>
                    <input
                      type="number"
                      value={item.estPricePerUnit}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "estPricePerUnit",
                          e.target.value,
                        )
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-amber-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-0.5">
                      Total
                    </label>
                    <p className="text-sm font-semibold text-gray-900 py-1.5">
                      ₹{(item.estTotal || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {formData.requestedItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GST + Required By */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 pt-5">
              <input
                id="csdd-gst"
                type="checkbox"
                checked={includeGST}
                onChange={(e) => setIncludeGST(e.target.checked)}
                className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <label
                htmlFor="csdd-gst"
                className="text-sm text-gray-700 font-medium"
              >
                Include GST (9% CGST + 9% SGST)
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required By
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Amount:</span>
              <span className="font-medium">
                ₹{calculateBaseTotal().toLocaleString("en-IN")}
              </span>
            </div>
            {includeGST && (
              <>
                <div className="flex justify-between text-gray-500 text-xs mt-1">
                  <span>CGST (9%):</span>
                  <span>
                    ₹{(calculateBaseTotal() * 0.09).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>SGST (9%):</span>
                  <span>
                    ₹{(calculateBaseTotal() * 0.09).toLocaleString("en-IN")}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t border-gray-300 pt-2 mt-2 font-semibold text-gray-900">
              <span>Grand Total:</span>
              <span>₹{calculateFinalTotal().toLocaleString("en-IN")}</span>
            </div>

            {/* Budget warning */}
            {formData.csddComponent &&
              calculateFinalTotal() > getComponentRemaining() && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    Exceeds component budget by ₹
                    {(
                      calculateFinalTotal() - getComponentRemaining()
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold text-sm shadow-sm"
            >
              Submit CSDD Intent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CsddPurchaseIntentModal;
