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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900">
              {category.label} Expense Allocation
            </h3>
            <p className="text-sm text-gray-500">
              Deduct shared fixed cost across all active departments
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 max-h-[70vh] overflow-y-auto"
        >
          {entries.map((entry) => (
            <div
              key={entry.department}
              className="flex flex-col sm:flex-row justify-between items-center gap-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all p-5 shadow-sm"
            >
              <div className="flex flex-col items-start w-full sm:w-auto">
                <h4 className="text-lg font-semibold capitalize text-gray-900">
                  {entry.department}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Remaining Budget:{" "}
                  <span
                    className={`font-medium ${
                      entry.remaining <= 0 ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    ₹{entry.remaining.toLocaleString("en-IN")}
                  </span>
                </p>
              </div>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount (₹)"
                value={entry.amount}
                onChange={(e) => handleChange(entry.department, e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-48 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
            </div>
          ))}

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-sm hover:shadow-md transition-all"
            >
              Deduct Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FixedCostExpenseModal;
