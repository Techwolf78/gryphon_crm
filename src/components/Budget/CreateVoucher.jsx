// FILE: /components/budget/csdd/CreateVoucher.jsx
import React, { useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth } from "firebase/auth";
import {
  Calendar,
  IndianRupee,
  User,
  Hash,
  Building,
  CreditCard,
  MapPin,
  Target,
  Users,
  Utensils,
  Home,
  Fuel,
  TrainFront,
  Package,
  FileText,
} from "lucide-react";

export default function CreateVoucher({
  department,
  fiscalYear,
  currentUser,
  currentBudget,
}) {
  const auth = getAuth();
  const defaultName = currentUser?.displayName || "";
  const defaultEmployeeId = currentUser?.email
    ? currentUser.email.split("@")[0]
    : "";

  const [form, setForm] = useState({
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

  const [loading, setLoading] = useState(false);

  const csddComponents = useMemo(() => {
    if (!currentBudget?.csddExpenses) return [];
    return Object.keys(currentBudget.csddExpenses);
  }, [currentBudget]);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const parseNum = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const totalAmount = useMemo(() => {
    const sum =
      parseNum(form.food) +
      parseNum(form.stay) +
      parseNum(form.fuel) +
      parseNum(form.toll) +
      parseNum(form.misc);
    return sum;
  }, [form.food, form.stay, form.fuel, form.toll, form.misc]);

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

  const validate = () => {
    if (!form.name.trim()) return "Employee name is required.";
    if (!form.employeeId.trim()) return "Employee ID is required.";
    if (!form.date) return "Date is required.";
    if (!form.visitPurpose.trim()) return "Visit purpose is required.";
    if (totalAmount <= 0) return "Please enter at least one expense amount.";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      alert(err);
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
      employeeId: form.employeeId.trim(),
      department: form.department || department || "",
      date: form.date,
      modeOfPayment: form.modeOfPayment,
      location: form.location,
      visitPurpose: form.visitPurpose,
      clientName: form.clientName,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      description: form.description,
      noOfPeople: parseNum(form.noOfPeople),
      breakdown: {
        food: parseNum(form.food),
        stay: parseNum(form.stay),
        fuel: parseNum(form.fuel),
        toll: parseNum(form.toll),
        misc: parseNum(form.misc),
      },
      totalAmount,
      amountInWords,
      csddComponent: form.csddComponent || null,
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
      alert("Voucher submitted successfully!");

      // Reset form
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
    } catch (err) {
      console.error("Error submitting voucher:", err);
      alert("Failed to submit voucher. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, icon: Icon, type = "text", ...props }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </label>
      <input
        type={type}
        {...props}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 placeholder-gray-400"
      />
    </div>
  );

  const ExpenseField = ({
    label,
    icon: Icon,
    value,
    onChange,
    placeholder = "0",
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </label>
      <div className="relative">
        <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="number"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
        />
      </div>
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
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          {/* EMPLOYEE & BASIC INFO */}
          <div className="mb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <InputField
                label="Full Name"
                icon={User}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Employee name"
              />
              <InputField
                label="Employee ID"
                icon={Hash}
                value={form.employeeId}
                onChange={(e) => update("employeeId", e.target.value)}
                placeholder="GA-93"
              />
              <InputField
                label="Department"
                icon={Building}
                value={form.department}
                readOnly
              />
              <InputField
                label="Voucher Date"
                icon={Calendar}
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
              />
            </div>
          </div>

          {/* PAYMENT & LOCATION */}
          <div className="mb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payment Mode
                </label>
                <select
                  value={form.modeOfPayment}
                  onChange={(e) => update("modeOfPayment", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
                >
                  <option>Online</option>
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
              <InputField
                label="Location"
                icon={MapPin}
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="City or location"
              />
              <InputField
                label="Client Name"
                icon={User}
                value={form.clientName}
                onChange={(e) => update("clientName", e.target.value)}
                placeholder="Client (optional)"
              />
            </div>
          </div>

          {/* VISIT DETAILS */}
          <div className="mb-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <InputField
                label="Visit Purpose"
                icon={Target}
                value={form.visitPurpose}
                onChange={(e) => update("visitPurpose", e.target.value)}
                placeholder="Business purpose or meeting details"
              />
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Start Date"
                  icon={Calendar}
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                />
                <InputField
                  label="End Date"
                  icon={Calendar}
                  type="date"
                  value={form.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 placeholder-gray-400"
                placeholder="Detailed description of the visit, meetings, or additional notes..."
              />
            </div>
          </div>

          {/* EXPENSE BREAKDOWN */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Expense Breakdown
              </h2>
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  Travelers: <strong>{form.noOfPeople}</strong>
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-100 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Number of People
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
                  />
                </div>

                <ExpenseField
                  label="Food & Meals"
                  icon={Utensils}
                  value={form.food}
                  onChange={(e) => update("food", e.target.value)}
                />
                <ExpenseField
                  label="Accommodation"
                  icon={Home}
                  value={form.stay}
                  onChange={(e) => update("stay", e.target.value)}
                />
                <ExpenseField
                  label="Fuel & Transport"
                  icon={Fuel}
                  value={form.fuel}
                  onChange={(e) => update("fuel", e.target.value)}
                />
                <ExpenseField
                  label="Toll & Parking"
                  icon={TrainFront}
                  value={form.toll}
                  onChange={(e) => update("toll", e.target.value)}
                />
                <ExpenseField
                  label="Miscellaneous"
                  icon={Package}
                  value={form.misc}
                  onChange={(e) => update("misc", e.target.value)}
                />
              </div>

              {/* CSDD Component Selection */}
              {csddComponents.length > 0 && (
                <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Map to Budget Component
                  </label>
                  <select
                    value={form.csddComponent}
                    onChange={(e) => update("csddComponent", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
                  >
                    <option value="">-- Select component --</option>
                    {csddComponents.map((c) => (
                      <option key={c} value={c}>
                        {c.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Optional: Link this voucher to a specific budget component
                    for tracking
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SUMMARY SECTION */}
          <div className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Summary
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Amount in Words
                </label>
                <div className="px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 min-h-[52px] flex items-center">
                  {amountInWords || "Zero"}
                </div>
              </div>

              <SummaryCard
                title="Total Amount"
                value={totalAmount}
                subtitle="Sum of all expenses"
                variant="primary"
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-4 pt-8 border-t border-gray-200">
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to clear the form? All entered data will be lost."
                  )
                ) {
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
                }
              }}
              disabled={loading}
              className="px-8 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-all duration-200 hover:shadow-sm disabled:opacity-50"
            >
              Clear Form
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading || totalAmount === 0}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 hover:shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Voucher"
              )}
            </button>
          </div>
        </div>

        {/* FOOTER NOTES */}
        <div className="text-center text-gray-500 text-sm">
          <p>
            Ensure all information is accurate and supported by relevant
            documentation.
          </p>
        </div>
      </div>
    </div>
  );
}
