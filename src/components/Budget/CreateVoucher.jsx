import React, { useMemo, useState } from "react";
import { addDoc, collection, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth } from "firebase/auth";
import { Calendar, IndianRupee, X } from "lucide-react";

/**
 * CreateVoucher Modal
 *
 * Props:
 *  - department (string)
 *  - fiscalYear (string)
 *  - currentUser (firebase user object)
 *  - currentBudget (active department budget doc - may be null)
 *  - isOpen (boolean)
 *  - onClose (function)
 *
 * Saves to collection: csdd_expenses
 * Adds: isVoucher: true, advanceUsed, usedFromEmployeeBalance
 */
export default function CreateVoucher({
  department,
  fiscalYear,
  currentUser,
  currentBudget,
  isOpen,
  onClose,
}) {
  const auth = getAuth();

  // Prefill basic fields when possible
  const defaultName = currentUser?.displayName || "";
  const defaultEmployeeId = currentUser?.email
    ? currentUser.email.split("@")[0]
    : "";

  const [form, setForm] = useState({
    name: defaultName,
    employeeId: "",
    department: department || "",
    date: new Date().toISOString().slice(0, 10),
    modeOfPayment: "Online",
    location: "",
    visitPurpose: "",
    clientName: "",
    startDate: "",
    endDate: "",
    description: "",
    noOfPeople: 1,
    food: "",
    stay: "",
    fuel: "",
    toll: "",
    misc: "",
    csddComponent: "", // required field
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Gather csdd components from budget (if provided)
  const csddComponents = useMemo(() => {
    if (!currentBudget?.csddExpenses) return [];
    return Object.keys(currentBudget.csddExpenses);
  }, [currentBudget]);

  // Helpers: update form
  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear error when field is updated
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  // Parse numeric safe
  const parseNum = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  // Auto calc total from breakdown
  const totalAmount = useMemo(() => {
    const sum =
      parseNum(form.food) +
      parseNum(form.stay) +
      parseNum(form.fuel) +
      parseNum(form.toll) +
      parseNum(form.misc);
    return sum;
  }, [form.food, form.stay, form.fuel, form.toll, form.misc]);

  // Convert number to words (Indian style short version)
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
      if (n < 100000)
        return `${inWords(Math.floor(n / 1000))} Thousand${
          n % 1000 ? " " + inWords(n % 1000) : ""
        }`;
      if (n < 10000000)
        return `${inWords(Math.floor(n / 100000))} Lakh${
          n % 100000 ? " " + inWords(n % 100000) : ""
        }`;
      return `${inWords(Math.floor(n / 10000000))} Crore${
        n % 10000000 ? " " + inWords(n % 10000000) : ""
      }`;
    };

    const rounded = Math.floor(num);
    return inWords(rounded);
  };

  const amountInWords = useMemo(() => {
    if (!totalAmount) return "";
    return `${numberToWords(totalAmount)} only`;
  }, [totalAmount]);

  // Employee balance & adjusted amounts
  const employeeIdTrimmed = (form.employeeId || "").trim();
  const employeeBalance = useMemo(() => {
    if (!employeeIdTrimmed) return 0;
    return Number(
      currentBudget?.employeeAdvanceBalances?.[employeeIdTrimmed] || 0
    );
  }, [currentBudget, employeeIdTrimmed]);

  const usedFromEmployeeBalance = useMemo(() => {
    return Math.min(employeeBalance, totalAmount);
  }, [employeeBalance, totalAmount]);

  const advanceUsed = useMemo(() => {
    return Math.max(0, totalAmount - usedFromEmployeeBalance);
  }, [totalAmount, usedFromEmployeeBalance]);

  // Validation
  const validate = () => {
    const newErrors = {};

    // Required fields validation
    if (!form.name.trim()) newErrors.name = "Employee name is required";
    if (!form.employeeId.trim())
      newErrors.employeeId = "Employee ID is required";
    if (!form.date) newErrors.date = "Date is required";
    if (!form.modeOfPayment)
      newErrors.modeOfPayment = "Mode of payment is required";
    if (!form.location.trim()) newErrors.location = "Location is required";
    if (!form.visitPurpose.trim())
      newErrors.visitPurpose = "Visit purpose is required";
    if (!form.clientName.trim())
      newErrors.clientName = "Client name is required";
    if (!form.startDate) newErrors.startDate = "Start date is required";
    if (!form.endDate) newErrors.endDate = "End date is required";
    if (!form.description.trim())
      newErrors.description = "Description is required";
    if (!form.csddComponent)
      newErrors.csddComponent = "CSDD component is required";

    // Expense validation - at least one cost field should be non-zero
    if (totalAmount <= 0) {
      newErrors.food = "At least one expense field must be filled";
    }

    // Date validation
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      newErrors.endDate = "End date cannot be before start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Reset form
  const resetForm = () => {
    setForm({
      name: defaultName,
      employeeId: defaultEmployeeId,
      department: department || "",
      date: new Date().toISOString().slice(0, 10),
      modeOfPayment: "Online",
      location: "",
      visitPurpose: "",
      clientName: "",
      startDate: "",
      endDate: "",
      description: "",
      noOfPeople: 1,
      food: "",
      stay: "",
      fuel: "",
      toll: "",
      misc: "",
      csddComponent: "",
    });
    setErrors({});
  };

  // Handle modal close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    if (!currentUser && !auth.currentUser) {
      alert("User not authenticated.");
      return;
    }

    setLoading(true);

    const payload = {
      isVoucher: true,
      type: "voucher",
      name: form.name.trim(),
      employeeId: employeeIdTrimmed,
      department: form.department || department || "",
      date: form.date,
      modeOfPayment: form.modeOfPayment,
      location: form.location,
      visitPurpose: form.visitPurpose,
      clientName: form.clientName,
      startDate: form.startDate,
      endDate: form.endDate,
      description: form.description,
      noOfPeople: parseNum(form.noOfPeople),
      breakdown: {
        food: parseNum(form.food),
        stay: parseNum(form.stay),
        fuel: parseNum(form.fuel),
        toll: parseNum(form.toll),
        misc: parseNum(form.misc),
      },
      totalAmount: advanceUsed,
      advanceUsed,
      usedFromEmployeeBalance,
      amountInWords,
      csddComponent: form.csddComponent,
      fiscalYear: fiscalYear || null,
      status: "submitted",
      createdBy:
        (currentUser && currentUser.uid) ||
        (auth.currentUser && auth.currentUser.uid) ||
        null,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "csdd_expenses"), payload);
      alert("Voucher submitted successfully.");
      handleClose();
    } catch (err) {
      console.error("Error submitting voucher:", err);
      alert("Failed to submit voucher. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-1000 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h2 className="text-2xl font-bold">Create Expense Voucher</h2>
              <p className="text-blue-100 mt-1">
                Fill in all required fields to submit a new voucher
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors duration-200 text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Employee & Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                    errors.name ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="Employee name"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.employeeId}
                  onChange={(e) => update("employeeId", e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                    errors.employeeId ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="Employee ID"
                />
                {errors.employeeId && (
                  <p className="text-red-500 text-xs">{errors.employeeId}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => update("date", e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white ${
                      errors.date ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                </div>
                {errors.date && (
                  <p className="text-red-500 text-xs">{errors.date}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Mode of Payment <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.modeOfPayment}
                  onChange={(e) => update("modeOfPayment", e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white ${
                    errors.modeOfPayment ? "border-red-300" : "border-gray-300"
                  }`}
                >
                  <option value="Online">Online</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
                {errors.modeOfPayment && (
                  <p className="text-red-500 text-xs">{errors.modeOfPayment}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                    errors.location ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="e.g., Ahmednagar"
                />
                {errors.location && (
                  <p className="text-red-500 text-xs">{errors.location}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Department
                </label>
                <input
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                  placeholder="Department"
                  readOnly
                />
              </div>
            </div>

            {/* Purpose & dates */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Visit Purpose <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.visitPurpose}
                  onChange={(e) => update("visitPurpose", e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                    errors.visitPurpose ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="Meetings / Event details"
                />
                {errors.visitPurpose && (
                  <p className="text-red-500 text-xs">{errors.visitPurpose}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.clientName}
                  onChange={(e) => update("clientName", e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                    errors.clientName ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="Client name"
                />
                {errors.clientName && (
                  <p className="text-red-500 text-xs">{errors.clientName}</p>
                )}
              </div>

              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => update("startDate", e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white ${
                        errors.startDate ? "border-red-300" : "border-gray-300"
                      }`}
                    />
                  </div>
                  {errors.startDate && (
                    <p className="text-red-500 text-xs">{errors.startDate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => update("endDate", e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white ${
                        errors.endDate ? "border-red-300" : "border-gray-300"
                      }`}
                    />
                  </div>
                  {errors.endDate && (
                    <p className="text-red-500 text-xs">{errors.endDate}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                  errors.description ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Description / meeting notes"
              />
              {errors.description && (
                <p className="text-red-500 text-xs">{errors.description}</p>
              )}
            </div>

            {/* Expense table */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Expense Breakdown <span className="text-red-500">*</span>
                </h3>
                <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-lg">
                  No. of people: <strong>{form.noOfPeople}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    No. of people travelling
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.noOfPeople}
                    onChange={(e) =>
                      update(
                        "noOfPeople",
                        Math.max(1, parseInt(e.target.value || 1))
                      )
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Food (₹)
                  </label>
                  <input
                    type="number"
                    value={form.food}
                    onChange={(e) => update("food", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                      errors.food ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Stay (₹)
                  </label>
                  <input
                    type="number"
                    value={form.stay}
                    onChange={(e) => update("stay", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                      errors.food ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Fuel (₹)
                  </label>
                  <input
                    type="number"
                    value={form.fuel}
                    onChange={(e) => update("fuel", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                      errors.food ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Toll (₹)
                  </label>
                  <input
                    type="number"
                    value={form.toll}
                    onChange={(e) => update("toll", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                      errors.food ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Miscellaneous (₹)
                  </label>
                  <input
                    type="number"
                    value={form.misc}
                    onChange={(e) => update("misc", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                      errors.food ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="0"
                  />
                </div>
              </div>

              {errors.food && (
                <p className="text-red-500 text-xs mt-2">{errors.food}</p>
              )}

              {/* CSDD Component Selection - Required */}
              <div className="mt-6 space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  CSDD Component <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.csddComponent}
                  onChange={(e) => update("csddComponent", e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white ${
                    errors.csddComponent ? "border-red-300" : "border-gray-300"
                  }`}
                >
                  <option value="">-- Select component --</option>
                  {csddComponents.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                {errors.csddComponent && (
                  <p className="text-red-500 text-xs">{errors.csddComponent}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  This voucher amount will be added to the component's spent
                  value in the active budget (on approval).
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Amount in words
                </label>
                <input
                  readOnly
                  value={amountInWords}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Total Amount (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    readOnly
                    value={totalAmount}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 font-semibold"
                  />
                </div>

                <div className="mt-3 text-sm space-y-1">
                  <p className="text-gray-600">
                    Employee Balance:{" "}
                    <strong className="text-emerald-700">
                      ₹{employeeBalance.toLocaleString("en-IN")}
                    </strong>
                  </p>

                  <p className="text-gray-600">
                    Applied from Balance:{" "}
                    <strong className="text-amber-700">
                      ₹{usedFromEmployeeBalance.toLocaleString("en-IN")}
                    </strong>
                  </p>

                  <p className="text-gray-800">
                    Final Amount to be sanctioned:{" "}
                    <strong className="text-gray-900">
                      ₹{advanceUsed.toLocaleString("en-IN")}
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={resetForm}
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
              disabled={loading}
            >
              Reset Form
            </button>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
                disabled={loading}
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  "Submit Voucher"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
