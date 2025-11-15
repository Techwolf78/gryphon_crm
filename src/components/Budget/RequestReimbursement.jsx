// FILE: /components/budget/csdd/RequestReimbursement.jsx
import React, { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Calendar,
  User,
  Building,
  Hash,
  Target,
} from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export default function RequestReimbursement({
  department = "admin",
  fiscalYear,
  currentUser,
  currentBudget,
}) {
  const emptyRow = {
    date: "",
    description: "",
    travelledTo: "",
    travelMode: "",
    distanceKm: "",
    amount: "",
  };

  const [rows, setRows] = useState([emptyRow]);
  const [purpose, setPurpose] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [advanceReceived, setAdvanceReceived] = useState("");
  const [csddComponent, setCsddComponent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(
    currentUser?.displayName || ""
  );
  const [employeeId, setEmployeeId] = useState("");

  const csddComponents = currentBudget?.csddExpenses
    ? Object.keys(currentBudget.csddExpenses)
    : [];

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [rows]);

  const advance = Number(advanceReceived || 0);
  const amountToBeReceived = Math.max(0, totalAmount - advance);
  const amountToBeSettled = Math.max(0, advance - totalAmount);

  const numberToWords = (num) => {
    if (num === 0) return "Zero";
    const a = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const b = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const inWords = (n) => {
      if (n < 20) return a[n];
      if (n < 100)
        return `${b[Math.floor(n / 10)]}${n % 10 ? " " + a[n % 10] : ""}`;
      if (n < 1000)
        return `${a[Math.floor(n / 100)]} Hundred${
          n % 100 ? " " + inWords(n % 100) : ""
        }`;
      return n;
    };

    return inWords(Math.floor(num));
  };

  const amountInWords =
    totalAmount > 0 ? `${numberToWords(totalAmount)} only` : "";

  const updateRow = (i, patch) =>
    setRows((prev) => prev.map((r, x) => (x === i ? { ...r, ...patch } : r)));

  const addRow = () => setRows((prev) => [...prev, emptyRow]);
  const removeRow = (i) => setRows((prev) => prev.filter((_, x) => x !== i));

  const validateBeforeSubmit = () => {
    if (!currentUser?.uid) {
      alert("You must be signed in.");
      return false;
    }
    if (!purpose.trim()) {
      alert("Purpose is required.");
      return false;
    }
    if (!csddComponent) {
      alert("Please select a CSDD component.");
      return false;
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.date) {
        alert(`Row ${i + 1}: Date is required.`);
        return false;
      }
      if (!r.description) {
        alert(`Row ${i + 1}: Description is required.`);
        return false;
      }
      if (!r.amount || Number(r.amount) <= 0) {
        alert(`Row ${i + 1}: Valid amount is required.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateBeforeSubmit()) return;
    setSubmitting(true);

    try {
      const data = {
        type: "reimbursement",
        isVoucher: false,
        name,
        employeeId,
        department,
        fiscalYear,
        date: formDate,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        status: "submitted",
        csddComponent,
        purpose: purpose.trim(),
        totalAmount,
        amountInWords,
        advanceReceived: advance,
        amountToBeReceived,
        amountToBeSettled,
        rows: rows.map((r) => ({
          ...r,
          distanceKm: Number(r.distanceKm || 0),
          amount: Number(r.amount || 0),
        })),
      };

      await addDoc(collection(db, "csdd_expenses"), data);

      alert("Reimbursement submitted successfully!");

      // Reset form
      setRows([emptyRow]);
      setPurpose("");
      setAdvanceReceived("");
      setCsddComponent("");
      setEmployeeId("");
    } catch (err) {
      console.error("Submission error:", err);
      alert("Error submitting reimbursement. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const travelModeOptions = [
    "Car(Fuel)",
    "Car(Toll)",
    "Food",
    "Toll",
    "Parking",
    "Auto",
    "Cab",
    "Lodging",
    "Misc",
  ];

  const InputField = ({ label, icon: Icon, ...props }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </label>
      <input
        {...props}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 placeholder-gray-400"
      />
    </div>
  );

  const SummaryCard = ({ title, value, subtitle, variant = "default" }) => {
    const variants = {
      default: "bg-gray-50 border-gray-200 text-gray-900",
      primary: "bg-blue-50 border-blue-200 text-blue-900",
      success: "bg-green-50 border-green-200 text-green-900",
    };

    return (
      <div className={`rounded-xl p-6 border-2 ${variants[variant]}`}>
        <p className="text-sm font-medium mb-2">{title}</p>
        <p className="text-2xl font-semibold mb-1">
          ₹ {typeof value === "number" ? value.toLocaleString("en-IN") : value}
        </p>
        {subtitle && <p className="text-xs opacity-75">{subtitle}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 ">
          {/* EMPLOYEE DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <InputField
              label="Employee Name"
              icon={User}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
            <InputField
              label="Employee ID"
              icon={Hash}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Employee ID"
            />
            <InputField
              label="Department"
              icon={Building}
              value={department}
              readOnly
            />
            <InputField
              label="Request Date"
              icon={Calendar}
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>

          {/* PURPOSE & COMPONENT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Purpose of Expense
              </label>
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
                placeholder="Brief description of business purpose..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                CSDD Component
              </label>
              <select
                value={csddComponent}
                onChange={(e) => setCsddComponent(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
              >
                <option value="">Select a component</option>
                {csddComponents.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* EXPENSE TABLE */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Expense Details
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Add all individual expense items below
                </p>
              </div>
              <button
                onClick={addRow}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 hover:shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-xs">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      "SN",
                      "Date",
                      "Description",
                      "Destination",
                      "Mode",
                      "Distance (km)",
                      "Amount (₹)",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-left font-semibold text-gray-700 text-sm uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {i + 1}
                      </td>

                      <td className="px-6 py-4">
                        <input
                          type="date"
                          value={r.date}
                          onChange={(e) =>
                            updateRow(i, { date: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        />
                      </td>

                      <td className="px-6 py-4">
                        <input
                          value={r.description}
                          onChange={(e) =>
                            updateRow(i, { description: e.target.value })
                          }
                          placeholder="Expense description"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        />
                      </td>

                      <td className="px-6 py-4">
                        <input
                          value={r.travelledTo}
                          onChange={(e) =>
                            updateRow(i, { travelledTo: e.target.value })
                          }
                          placeholder="Destination"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        />
                      </td>

                      <td className="px-6 py-4">
                        <select
                          value={r.travelMode}
                          onChange={(e) =>
                            updateRow(i, { travelMode: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        >
                          <option value="">Select mode</option>
                          {travelModeOptions.map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={r.distanceKm}
                          onChange={(e) =>
                            updateRow(i, { distanceKm: e.target.value })
                          }
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        />
                      </td>

                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={r.amount}
                          onChange={(e) =>
                            updateRow(i, { amount: e.target.value })
                          }
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        />
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => removeRow(i)}
                          disabled={rows.length === 1}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SUMMARY SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <SummaryCard
              title="Total Amount"
              value={totalAmount}
              subtitle={amountInWords}
              variant="primary"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Advance Received (₹)
              </label>
              <input
                type="number"
                value={advanceReceived}
                onChange={(e) => setAdvanceReceived(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
              />
            </div>

            <SummaryCard
              title="Amount to be Received"
              value={amountToBeReceived}
              subtitle={`Advance settled: ₹ ${amountToBeSettled.toLocaleString(
                "en-IN"
              )}`}
              variant="success"
            />
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-4 pt-8 border-t border-gray-200">
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to reset the form? All data will be lost."
                  )
                ) {
                  setRows([emptyRow]);
                  setPurpose("");
                  setAdvanceReceived("");
                  setCsddComponent("");
                  setEmployeeId("");
                }
              }}
              className="px-8 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-all duration-200 hover:shadow-sm"
            >
              Clear Form
            </button>

            <button
              onClick={handleSubmit}
              disabled={submitting || totalAmount === 0}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Reimbursement"
              )}
            </button>
          </div>
        </div>

        {/* FOOTER NOTES */}
        <div className="text-center text-gray-500 text-sm">
          <p>
            Please ensure all information is accurate before submission. Allow
            5-7 business days for processing.
          </p>
        </div>
      </div>
    </div>
  );
}
