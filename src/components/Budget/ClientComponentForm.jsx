import React, { useState, useEffect } from "react";
import {
  X,
  Layers,
  AlertCircle,
  Wallet,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";

// Helper: Safe number conversion
const safeNumber = (value) => {
  if (!value) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

export default function ClientBudgetForm({
  show,
  onClose,
  onSubmit,
  client,
  existingData = null, // Pass existing client document data if editing
}) {
  // Form State
  const [formData, setFormData] = useState({
    client_name: "",
    owner_name: "direc2",
    status: "active",
    budgetRef: "",
    client_components: {},
  });

  const [components, setComponents] = useState([]);
  const [newComponent, setNewComponent] = useState({
    name: "",
    allocated: "",
    spent: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allocatedBudget, setAllocatedBudget] = useState(0);

  // Reset form when opening
  useEffect(() => {
    if (show) {
      if (existingData) {
        // Editing existing document
        setFormData({
          client_name: existingData.client_name || client?.name || "",
          owner_name: existingData.owner_name || "direc2",
          status: existingData.status || "active",
          budgetRef: existingData.budgetRef || `dm_FY-2025-26`,
          client_components: existingData.client_components || {},
        });

        // Convert client_components object to array for editing
        const compsArray = existingData.client_components
          ? Object.entries(existingData.client_components).map(
              ([key, data]) => ({
                id: key,
                name: key,
                allocated: data.allocated || 0,
                spent: data.spent || 0,
              }),
            )
          : [];
        setComponents(compsArray);

        setAllocatedBudget(client?.allocated || 0);
      } else {
        // Creating new document
        setFormData({
          client_name: client?.name || "",
          owner_name: "direc2",
          status: "active",
          budgetRef: `dm_FY-2025-26`,
          client_components: {},
        });
        setComponents([]);
        setAllocatedBudget(client?.allocated || 0);
      }

      setNewComponent({ name: "", allocated: "", spent: "" });
      setError("");
      setIsSubmitting(false);
    }
  }, [show, client, existingData]);

  // Calculate totals
  const totalAllocated = components.reduce(
    (sum, comp) => sum + safeNumber(comp.allocated),
    0,
  );
  const totalSpent = components.reduce(
    (sum, comp) => sum + safeNumber(comp.spent),
    0,
  );
  const remainingBudget = allocatedBudget - totalAllocated;
  const overspent = totalSpent - totalAllocated;

  // Add new component
  const handleAddComponent = (e) => {
    e.preventDefault();

    const name = newComponent.name.trim().toLowerCase().replace(/\s+/g, "_");
    const allocated = safeNumber(newComponent.allocated);
    const spent = safeNumber(newComponent.spent);

    if (!name) {
      setError("Component name is required.");
      return;
    }

    if (components.some((comp) => comp.id === name)) {
      setError(`Component "${name}" already exists.`);
      return;
    }

    if (allocated < 0) {
      setError("Allocated amount cannot be negative.");
      return;
    }

    if (spent < 0) {
      setError("Spent amount cannot be negative.");
      return;
    }

    if (spent > allocated) {
      setError("Spent amount cannot exceed allocated amount.");
      return;
    }

    if (allocated > remainingBudget) {
      setError(
        `Cannot allocate more than remaining budget (₹${remainingBudget.toLocaleString()})`,
      );
      return;
    }

    const newComp = {
      id: name,
      name: name,
      allocated: allocated,
      spent: spent,
    };

    setComponents([...components, newComp]);
    setNewComponent({ name: "", allocated: "", spent: "" });
    setError("");
  };

  // Remove component
  const handleRemoveComponent = (id) => {
    setComponents(components.filter((comp) => comp.id !== id));
  };

  // Update component
  const handleUpdateComponent = (id, field, value) => {
    setComponents(
      components.map((comp) => {
        if (comp.id === id) {
          // FIX: Only apply number conversion to allocated/spent
          const finalValue =
            field === "allocated" || field === "spent"
              ? safeNumber(value)
              : value;

          return { ...comp, [field]: finalValue };
        }
        return comp;
      }),
    );
  };

  // Validation & Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.client_name.trim()) {
      setError("Client name is required.");
      return;
    }

    if (!formData.owner_name.trim()) {
      setError("Owner name is required.");
      return;
    }

    if (components.length === 0) {
      setError("At least one component is required.");
      return;
    }

    // Check for negative values
    for (const comp of components) {
      if (comp.spent < 0) {
        setError(`Spent amount for "${comp.name}" cannot be negative.`);
        return;
      }
      if (comp.allocated < 0) {
        setError(`Allocated amount for "${comp.name}" cannot be negative.`);
        return;
      }
      if (comp.spent > comp.allocated) {
        setError(`Spent amount for "${comp.name}" exceeds allocated amount.`);
        return;
      }
    }

    // Check if total allocated exceeds client budget
    if (totalAllocated > allocatedBudget) {
      setError(
        `Total allocated (₹${totalAllocated.toLocaleString()}) exceeds client budget (₹${allocatedBudget.toLocaleString()})`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert components array to client_components object
      const client_components = {};
      components.forEach((comp) => {
        client_components[comp.id] = {
          spent: safeNumber(comp.spent),
          allocated: safeNumber(comp.allocated),
        };
      });

      // Prepare the complete document structure
      const documentData = {
        client_name: formData.client_name.trim(),
        owner_name: formData.owner_name.trim(),
        status: formData.status,
        budgetRef: formData.budgetRef,
        client_components: client_components,
      };

      await onSubmit(documentData);
      onClose();
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to save budget allocation. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!show || !client) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-200 my-8">
        {/* --- HEADER --- */}
        <div className="bg-linear-to-r from-indigo-50 to-blue-50 border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              {existingData ? "Edit" : "Create"} Budget Allocation
            </h2>
            <p className="text-xs text-indigo-600 font-medium">
              Client: {client.name} • Budget: ₹
              {allocatedBudget.toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/50 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- CONTENT --- */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 max-h-[70vh] overflow-y-auto"
        >
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.client_name}
                onChange={(e) =>
                  setFormData({ ...formData, client_name: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.owner_name}
                onChange={(e) =>
                  setFormData({ ...formData, owner_name: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Budget Summary */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Client Budget
                </p>
                <p className="text-xl font-bold text-gray-900">
                  ₹{allocatedBudget.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Total Allocated
                </p>
                <p
                  className={`text-xl font-bold ${totalAllocated > allocatedBudget ? "text-red-600" : "text-blue-600"}`}
                >
                  ₹{totalAllocated.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Total Spent
                </p>
                <p className="text-xl font-bold text-emerald-600">
                  ₹{totalSpent.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Remaining
                </p>
                <p
                  className={`text-xl font-bold ${remainingBudget < 0 ? "text-red-600" : "text-gray-900"}`}
                >
                  ₹{remainingBudget.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Components Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Components</h3>
              <div className="flex items-center gap-4">
                {overspent > 0 && (
                  <span className="text-sm font-medium text-red-600">
                    Overspent: ₹{overspent.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Add New Component Form */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3">
                Add New Component
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Component name (e.g., social_media)"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={newComponent.name}
                  onChange={(e) =>
                    setNewComponent({ ...newComponent, name: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Allocated (₹)"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  value={newComponent.allocated}
                  onChange={(e) =>
                    setNewComponent({
                      ...newComponent,
                      allocated: e.target.value,
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Spent (₹)"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  value={newComponent.spent}
                  onChange={(e) =>
                    setNewComponent({ ...newComponent, spent: e.target.value })
                  }
                />
                <button
                  onClick={handleAddComponent}
                  className="px-4 py-2 bg-white border-2 border-dashed border-indigo-300 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>

            {/* Components List */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase">
                      Component
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-bold text-gray-500 uppercase">
                      Allocated (₹)
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-bold text-gray-500 uppercase">
                      Spent (₹)
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-bold text-gray-500 uppercase">
                      Remaining (₹)
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-bold text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {components.map((comp, index) => {
                    const remaining = comp.allocated - comp.spent;
                    return (
                      <tr key={comp.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={comp.name}
                            disabled
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono text-right"
                            value={comp.allocated}
                            onChange={(e) =>
                              handleUpdateComponent(
                                comp.id,
                                "allocated",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono text-right"
                            value={comp.spent}
                            onChange={(e) =>
                              handleUpdateComponent(
                                comp.id,
                                "spent",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm">
                          <span
                            className={`font-medium ${remaining < 0 ? "text-red-600" : "text-gray-700"}`}
                          >
                            ₹{remaining.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveComponent(comp.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            title="Remove component"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="py-3 px-4 font-bold text-sm">Total</td>
                    <td className="py-3 px-4 text-right font-bold font-mono text-sm">
                      ₹{totalAllocated.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold font-mono text-sm">
                      ₹{totalSpent.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold font-mono text-sm">
                      <span
                        className={
                          remainingBudget < 0 ? "text-red-600" : "text-gray-900"
                        }
                      >
                        ₹{remainingBudget.toLocaleString()}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm hover:shadow"
            >
              {isSubmitting ? (
                <>Processing...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />{" "}
                  {existingData ? "Update" : "Create"} Allocation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
