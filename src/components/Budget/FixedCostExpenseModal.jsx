import { useState } from "react";
import { X } from "lucide-react";

function FixedCostExpenseModal({
  onClose,
  onSubmit,
  activeBudgets,
  category,
  currentUser,
}) {
  const [entries, setEntries] = useState(
    activeBudgets.map((b) => ({
      department: b.department,
      amount: "",
      remaining:
        b.fixedCosts?.[category.key]?.allocated -
          b.fixedCosts?.[category.key]?.spent || 0,
    }))
  );

  const handleChange = (dept, val) => {
    setEntries((prev) =>
      prev.map((e) => (e.department === dept ? { ...e, amount: val } : e))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validEntries = entries.filter(
      (e) =>
        e.amount &&
        Number(e.amount) > 0 &&
        !isNaN(e.amount) &&
        Number(e.amount) <= e.remaining
    );

    if (validEntries.length === 0) {
      alert("Please enter at least one valid expense within budget.");
      return;
    }

    onSubmit({
      expenseType: category.key,
      expenseSection: "fixedCosts",
      entries: validEntries.map((v) => ({
        department: v.department,
        category: category.key,
        amount: Number(v.amount),
      })),
      createdBy: currentUser?.uid || "system",
      createdAt: new Date(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-1000">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200/50">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-gray-200/50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {category.label} Expense Allocation
              </h2>
              <p className="text-xs text-gray-600">
                Deduct shared fixed cost across all active departments
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
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto max-h-[calc(90vh-85px)]"
        >
          <div className="p-6 space-y-6">

            {/* Department Allocations Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Department Allocations</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entries.map((entry) => (
                  <div
                    key={entry.department}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold capitalize text-gray-900">
                          {entry.department}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Remaining Budget: ₹{entry.remaining.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Enter amount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={entry.amount}
                        onChange={(e) => handleChange(entry.department, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 flex items-center text-sm"
              >
                Deduct Expense
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FixedCostExpenseModal;
