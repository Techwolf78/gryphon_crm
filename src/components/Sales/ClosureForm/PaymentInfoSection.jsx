import React, { useEffect, useState, useCallback, useMemo } from "react";

const inputClass =
  "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:ring-blue-500 transition";

const paymentFields = {
  AT: ["Advance", "Training"],
  ATP: ["Advance", "Training", "Placement"],
  ATTP: ["Advance", "Training", "Training", "Placement"],
  ATTT: ["Advance", "Training", "Training", "Training"],
  EMI: [],
};

const PaymentInfoSection = ({ formData, setFormData }) => {
  const fields = useMemo(() => paymentFields[formData.paymentType] || [], [formData.paymentType]);
  const [autoEmiSplits, setAutoEmiSplits] = useState([]);
  const [showAllInstallments, setShowAllInstallments] = useState(false);

  // Calculate all payment amounts and update form state
  const calculatePaymentAmounts = useCallback(() => {
    const baseAmount = formData.totalCost || 0;
    const gstAmount = formData.gstType === "include" ? baseAmount * 0.18 : 0;
    const netPayable = baseAmount + gstAmount;
    
    // Calculate payment splits with amounts
    let paymentDetails = [];
    
    if (formData.paymentType === "EMI" && formData.emiMonths > 0) {
      // For EMI payments
      const emiAmount = netPayable / formData.emiMonths;
      paymentDetails = Array(formData.emiMonths).fill().map((_, i) => ({
        name: `Installment ${i + 1}`,
        percentage: (100 / formData.emiMonths).toFixed(2),
        baseAmount: (baseAmount / formData.emiMonths).toFixed(2),
        gstAmount: (gstAmount / formData.emiMonths).toFixed(2),
        totalAmount: emiAmount.toFixed(2),
        dueDate: "", // You can add due date calculation here
      }));
    } else if (formData.paymentType && formData.paymentType !== "EMI") {
      // For other payment types
      paymentDetails = fields.map((label, i) => {
        const percentage = parseFloat(formData.paymentSplits?.[i] || 0);
        const splitBase = (percentage / 100) * baseAmount;
        const splitGst = (percentage / 100) * gstAmount;
        return {
          name: label,
          percentage: percentage.toFixed(2),
          baseAmount: splitBase.toFixed(2),
          gstAmount: splitGst.toFixed(2),
          totalAmount: (splitBase + splitGst).toFixed(2),
          dueDate: "", // You can add due date calculation here
        };
      });
    }

    setFormData(prev => ({
      ...prev,
      gstAmount,
      netPayableAmount: netPayable,
      paymentDetails, // This will store all payment breakdowns
      emiSplits: formData.paymentType === "EMI" && formData.emiMonths > 0 
        ? Array(formData.emiMonths).fill(netPayable / formData.emiMonths)
        : prev.emiSplits
    }));
  }, [formData.totalCost, formData.gstType, formData.paymentType, formData.emiMonths, formData.paymentSplits, fields, setFormData]);

  const handlePerStudentCostChange = (e) => {
    const perStudentCost = parseFloat(e.target.value) || 0;
    const totalCost = (formData.studentCount || 0) * perStudentCost;
    setFormData((prev) => ({ ...prev, perStudentCost, totalCost }));
  };

  const handlePaymentChange = (index, value) => {
    const splits = [...(formData.paymentSplits || [])];
    splits[index] = value;

    if (splits.length >= 2) {
      const filled = splits
        .slice(0, splits.length - 1)
        .reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
      splits[splits.length - 1] = (100 - filled).toFixed(2);
    }

    setFormData((prev) => ({ ...prev, paymentSplits: splits }));
  };

  const validatePercentageSum = () => {
    const splits =
      formData.paymentType === "EMI" ? autoEmiSplits || [] : formData.paymentSplits || [];
    const sum = splits.reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
    return sum.toFixed(2) === "100.00";
  };

  useEffect(() => {
    if (fields.length > 0 && (formData.paymentSplits || []).length !== fields.length) {
      setFormData((prev) => ({
        ...prev,
        paymentSplits: Array(fields.length).fill(""),
        gstType: "",
      }));
    }
  }, [formData.paymentType]);

  useEffect(() => {
    if (formData.paymentType === "EMI" && formData.totalCost && formData.emiMonths > 0) {
      const percentEach = 100 / formData.emiMonths;
      const basePercent = Math.floor(percentEach * 100) / 100;
      const emiArr = Array.from({ length: formData.emiMonths }, (_, i) => {
        if (i === formData.emiMonths - 1) {
          // Last installment takes the remainder to ensure sum equals 100%
          return (100 - basePercent * (formData.emiMonths - 1)).toFixed(2);
        }
        return basePercent.toFixed(2);
      });
      setAutoEmiSplits(emiArr);
    }
  }, [formData.emiMonths, formData.totalCost, formData.paymentType]);

  // Recalculate whenever relevant values change
  useEffect(() => {
    if (formData.totalCost && formData.gstType) {
      calculatePaymentAmounts();
    }
  }, [
    formData.totalCost, 
    formData.gstType, 
    formData.paymentType, 
    formData.emiMonths,
    formData.paymentSplits,
    calculatePaymentAmounts
  ]);

  return (
    <section className="p-5 bg-white rounded-xl shadow-lg space-y-6">
      <h3 className="font-semibold text-2xl text-blue-700 border-b pb-3">Payment Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block font-medium mb-1">
            Total Students <span className="text-red-500">*</span>
          </label>
          <input
            className={`${inputClass} bg-gray-100`}
            value={formData.studentCount === 0 ? "" : formData.studentCount || ""}
            readOnly
          />
        </div>
        <div>
          <label className="block font-medium mb-1">
            Cost per Student (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            className={inputClass}
            value={formData.perStudentCost || ""}
            onChange={handlePerStudentCostChange}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">
            Total Amount (₹) <span className="text-red-500">*</span>
          </label>
          <input
            className={`${inputClass} bg-gray-100`}
            value={formData.totalCost === 0 ? "" : formData.totalCost || ""}
            readOnly
          />
        </div>
      </div>

      <div>
        <label className="block font-medium mb-1">
          Payment Type <span className="text-red-500">*</span>
        </label>
        <select
          className={inputClass}
          value={formData.paymentType || ""}
          onChange={(e) => {
            const type = e.target.value;
            const newFieldCount = paymentFields[type]?.length || 0;
            setFormData((prev) => ({
              ...prev,
              paymentType: type,
              paymentSplits: Array(newFieldCount).fill(""),
              emiSplits: [],
              emiMonths: "",
              gstType: "",
              paymentDetails: [],
              gstAmount: 0,
              netPayableAmount: 0
            }));
            setAutoEmiSplits([]);
            setShowAllInstallments(false);
          }}
        >
          <option value="">Select</option>
          <option value="AT">AT - Advanced Training</option>
          <option value="ATP">ATP - Advanced Training Placement</option>
          <option value="ATTP">ATTP - Advanced Training Technical Placement</option>
          <option value="ATTT">ATTT - Advanced Technical Training & Placement</option>
          <option value="EMI">EMI - Easy Monthly Installments</option>
        </select>
      </div>

      {formData.paymentType && (
        <div>
          <label className="block font-medium mb-1">
            GST Type <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="gstType"
                value="include"
                checked={formData.gstType === "include"}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, gstType: e.target.value }))
                }
              />
              With GST
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="gstType"
                value="exclude"
                checked={formData.gstType === "exclude"}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, gstType: e.target.value }))
                }
              />
              Without GST
            </label>
          </div>
        </div>
      )}

      {formData.paymentType && formData.gstType && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg shadow-md space-y-1">
          <h4 className="font-medium text-blue-800">Payment Summary</h4>
          <p className="text-gray-700">
            Base Amount: ₹{formData.totalCost.toFixed(2)}
          </p>
          <p className="text-gray-700">
            GST ({formData.gstType === "include" ? "18%" : "0%"}): ₹
            {formData.gstAmount?.toFixed(2) || "0.00"}
          </p>
          <p className="font-semibold text-lg text-blue-900">
            Total Payable: ₹{formData.netPayableAmount?.toFixed(2) || "0.00"}
          </p>
          {formData.paymentType === "EMI" && formData.emiMonths > 0 && (
            <p className="text-gray-700">
              EMI Installments: {formData.emiMonths} × ₹
              {(formData.netPayableAmount / formData.emiMonths).toFixed(2)}
            </p>
          )}
        </div>
      )}

      {formData.paymentType && formData.gstType && formData.paymentType !== "EMI" && (
        <div className={`grid gap-4 ${fields.length <= 3 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          }`}
        >
          {fields.map((label, i) => {
            const percent = formData.paymentSplits?.[i] ?? "";
            const baseAmount = ((parseFloat(percent) || 0) / 100) * formData.totalCost;
            const gstAmount = formData.gstType === "include" ? baseAmount * 0.18 : 0;
            const totalWithGST = baseAmount + gstAmount;

            return (
              <div key={i} className="p-4 bg-gray-50 rounded-lg shadow-md space-y-2">
                <label className="block font-medium">
                  {label} % <span className="text-red-500">*</span>
                  <span className="ml-2 text-sm text-gray-500">
                    (₹{baseAmount.toFixed(2)} + ₹{gstAmount.toFixed(2)} GST = ₹{totalWithGST.toFixed(2)})
                  </span>
                </label>
                <input
                  type="number"
                  className={inputClass}
                  value={percent}
                  onChange={(e) => handlePaymentChange(i, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      )}

      {formData.paymentType === "EMI" && formData.gstType && (
        <>
          <div>
            <label className="block font-medium mb-1">
              No. of Installments <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className={inputClass}
              value={formData.emiMonths || ""}
              onChange={(e) => {
                const count = parseInt(e.target.value) || 0;
                setFormData((prev) => ({ ...prev, emiMonths: count }));
                setShowAllInstallments(false);
              }}
            />
          </div>

          {autoEmiSplits.length > 0 && (
            <div className="p-5 bg-blue-50 rounded-lg shadow-md space-y-3">
              <h4 className="text-lg font-bold text-blue-800">
                Installments Summary (1 to {formData.emiMonths})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-auto-fit gap-4">
                <p className="text-sm text-gray-700">Installments: {formData.emiMonths}</p>
                <p className="text-sm text-gray-700">Each Installment: {autoEmiSplits[0]}%</p>
                <p className="text-sm text-gray-700">
                  Base Amount: ₹{((autoEmiSplits[0] / 100) * formData.totalCost).toFixed(2)}
                </p>
                <p className="text-sm text-gray-700">
                  GST ({formData.gstType === "include" ? "18%" : "0%"}): ₹
                  {(
                    (formData.gstType === "include" ? 0.18 : 0) *
                    (autoEmiSplits[0] / 100) *
                    formData.totalCost
                  ).toFixed(2)}
                </p>
                <p className="text-sm text-gray-900 font-semibold col-span-2">
                  Total per Installment: ₹
                  {(
                    ((autoEmiSplits[0] / 100) * formData.totalCost) +
                    ((formData.gstType === "include" ? 0.18 : 0) *
                      (autoEmiSplits[0] / 100) *
                      formData.totalCost)
                  ).toFixed(2)}
                </p>
              </div>

              <button
                type="button"
                className="px-4 py-2 mt-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                onClick={() => setShowAllInstallments(!showAllInstallments)}
              >
                {showAllInstallments ? "Hide Installment Details" : "View All Installment Details"}
              </button>

              {showAllInstallments && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-auto-fit gap-4 mt-4">
                  {autoEmiSplits.map((val, i) => {
                    const percent = parseFloat(val);
                    const baseAmount = (percent / 100) * formData.totalCost;
                    const gstAmount = formData.gstType === "include" ? baseAmount * 0.18 : 0;
                    const totalWithGST = baseAmount + gstAmount;

                    return (
                      <div key={i} className="p-4 bg-white rounded-lg shadow border space-y-1">
                        <p className="font-semibold">Installment {i + 1}</p>
                        <p className="text-sm text-gray-700">
                          Amount: ₹{baseAmount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-700">
                          GST: ₹{gstAmount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-900 font-semibold">
                          Total: ₹{totalWithGST.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Calculation: {percent}% of ₹{formData.totalCost.toFixed(2)} + GST
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {formData.paymentType && formData.gstType && formData.paymentType !== "EMI" && !validatePercentageSum() && (
        <div className="text-red-600 font-semibold">Total percentage must equal 100%.</div>
      )}
    </section>
  );
};

export default PaymentInfoSection;
