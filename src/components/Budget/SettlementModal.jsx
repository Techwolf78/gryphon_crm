// ==========================
// Settlement Modal Component (Transactional)
// ==========================

import { useState } from "react";
import React from "react";
import {
  runTransaction,
  doc,
  increment,
  serverTimestamp,
  collection,
} from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";

export default function SettlementModal({
  request,
  currentBudget,
  currentUser,
  onClose,
}) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("return"); // return | carry
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Validation ---
  const validateAmount = (value) => {
    if (value === "" || value === null) return "Amount is required";
    if (isNaN(value)) return "Invalid number";
    if (value <= 0) return "Amount must be greater than zero";
    if (value > request.totalAmount)
      return "Cannot exceed the original advance amount";
    return "";
  };

  const handleAmountChange = (e) => {
    const value = Number(e.target.value);
    const err = validateAmount(value);
    setError(err);
    setAmount(value);
  };

  // =====================
  //  TRANSACTIONAL SUBMIT HANDLER
  // =====================
  const handleSettle = async () => {
    // 1. Client-side Validation
    const err = validateAmount(amount);
    if (err) {
      setError(err);
      return;
    }

    if (!request.employeeId) {
      alert("Request missing employeeId.");
      return;
    }

    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        const budgetIdToUse = request.budgetId || currentBudget?.id;

        if (!budgetIdToUse) {
          throw new Error("Budget ID missing. Cannot process settlement.");
        }

        // 1. References
        const reqRef = doc(db, "csdd_expenses", request.id);
        const budgetRef = doc(db, "department_budgets", budgetIdToUse);
        const logRef = doc(collection(budgetRef, "settlement_logs"));

        // 2. Read
        const reqDoc = await transaction.get(reqRef);
        if (!reqDoc.exists()) throw new Error("Request not found");
        const reqData = reqDoc.data();

        if (reqData.settled) throw new Error("Already settled");

        // --- Calculate New Totals ---
        // The settlement amount is money NOT spent.
        // New Total = Old Total - Settlement Amount
        const currentTotal = Number(reqData.totalAmount || 0);
        const currentAdvance = Number(reqData.advanceUsed || 0);

        const newTotal = currentTotal - amount;
        const newAdvance = Math.max(0, currentAdvance - amount);

        // 3. Write: Update Budget
        if (mode === "return") {
          // Money goes back to department budget
          transaction.update(budgetRef, {
            [`csddExpenses.${request.csddComponent}.spent`]: increment(-amount),
            "summary.totalSpent": increment(-amount),
          });
        } else {
          // Money stays with employee (carried forward)
          transaction.update(budgetRef, {
            [`employeeAdvanceBalances.${request.employeeId}`]:
              increment(amount),
          });
        }

        // 4. Write: Update Request
        // We update 'totalAmount' to show the actual expense in the UI,
        // but we save 'originalAmount' for audit history.
        transaction.update(reqRef, {
          settled: true,
          settlementAmount: amount,
          settlementMode: mode,

          // 👇 UPDATING REQUEST AMOUNTS HERE
          totalAmount: newTotal, // Shows new actual in list
          advanceUsed: newAdvance, // Consistency update
          originalAmount: currentTotal, // Backup of what was originally taken

          settledAt: serverTimestamp(),
          settledBy: currentUser.uid,
        });

        // 5. Write: Add Log to Subcollection
        transaction.set(logRef, {
          type: "settlement",
          requestId: request.id,
          employeeId: request.employeeId,
          employeeName: request.name || "Unknown",
          amount: amount,
          originalAmount: currentTotal,
          newAmount: newTotal,
          mode: mode,
          performedBy: currentUser.uid,
          performedByName: currentUser.displayName || "Admin",
          timestamp: serverTimestamp(),
          component: request.csddComponent,
        });
      });

      toast.success("Settled successfully! Request amount updated.");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Settlement failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================
  //  UI COMPONENT
  // =====================
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-[9999]">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-5">
          <div className="text-white flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Settle Advance Amount</h2>
              <p className="text-amber-200 text-sm">
                Enter the leftover amount from this voucher
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-black/20 rounded-xl transition"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Amount Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Amount Returned / Left Over (₹)
            </label>

            <input
              type="number"
              value={amount}
              onChange={handleAmountChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl 
                           focus:ring-2 focus:ring-amber-500 focus:border-amber-500 
                           bg-white transition-all duration-200"
            />

            {error && (
              <p className="text-sm text-red-600 mt-1 font-medium">{error}</p>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Original Advance: ₹{request.totalAmount?.toLocaleString("en-IN")}{" "}
              <br />
              New Amount will be: ₹
              {((request.totalAmount || 0) - (amount || 0)).toLocaleString(
                "en-IN",
              )}
            </p>
          </div>

          {/* Mode Selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={mode === "return"}
                onChange={() => setMode("return")}
                className="form-radio text-amber-600"
              />
              <span className="text-gray-800">
                Return to Department (reduce spent)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={mode === "carry"}
                onChange={() => setMode("carry")}
                className="form-radio text-amber-600"
              />
              <span className="text-gray-800">
                Carry Forward for Next Visit
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white border border-gray-300 
                       hover:bg-gray-100 transition font-medium text-gray-700"
          >
            Cancel
          </button>

          <button
            onClick={handleSettle}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-amber-600 text-white font-semibold 
                       hover:bg-amber-700 disabled:opacity-50 transition shadow-sm"
          >
            {loading ? "Processing..." : "Confirm Settlement"}
          </button>
        </div>
      </div>
    </div>
  );
}
