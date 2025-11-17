// ==========================
// Settlement Modal Component
// ==========================

import { useState } from "react";
import React from "react";
import { updateDoc, doc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

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
  //  SUBMIT HANDLER
  // =====================
  const handleSettle = async () => {
    const err = validateAmount(amount);
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);

    try {
      const reqRef = doc(db, "csdd_expenses", request.id);
      const budgetRef = doc(db, "department_budgets", currentBudget.id);

      const employeeId = request.employeeId;

      if (!employeeId) {
        alert("Request missing employeeId.");
        setLoading(false);
        return;
      }

      if (mode === "return") {
        // Employee returns leftover → decrease spent
        await updateDoc(budgetRef, {
          [`csddExpenses.${request.csddComponent}.spent`]: increment(-amount),
          "summary.totalSpent": increment(-amount),
        });
      } else {
        // Employee carries forward leftover → add to their personal advance balance
        await updateDoc(budgetRef, {
          [`employeeAdvanceBalances.${employeeId}`]: increment(amount),
        });
      }

      // Mark request as settled
      await updateDoc(reqRef, {
        settled: true,
        settlementAmount: amount,
        settlementMode: mode,
        settledAt: serverTimestamp(),
        settledBy: currentUser.uid,
      });

      alert("Settlement completed successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to settle. Try again.");
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
