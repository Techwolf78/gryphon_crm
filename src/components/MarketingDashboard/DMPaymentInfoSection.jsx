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

const DMPaymentInfoSection = ({ formData, setFormData, readOnly = false }) => {
  const fields = useMemo(() => paymentFields[formData.paymentType] || [], [formData.paymentType]);
  const [autoEmiSplits, setAutoEmiSplits] = useState([]);
  const [showAllInstallments, setShowAllInstallments] = useState(false);
  const [totalAmountDisplay, setTotalAmountDisplay] = useState('');
  const [isTotalAmountFocused, setIsTotalAmountFocused] = useState(false);

  // Function to format number with Indian commas
  const formatIndianNumber = (num) => {
    if (!num || num === 0) return '';
    const str = num.toString();
    const lastThree = str.substring(str.length - 3);
    const otherNumbers = str.substring(0, str.length - 3);
    if (otherNumbers !== '') {
      return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    } else {
      return lastThree;
    }
  };

  // Function to convert number to words (Indian format)
  const numberToWords = (num) => {
    if (!num || num === 0) return '';
    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (num) => {
      if (num === 0) return '';
      if (num < 20) return a[num];
      if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + a[num % 10] : '');
      if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + inWords(num % 100) : '');
      if (num < 100000) return inWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + inWords(num % 1000) : '');
      if (num < 10000000) return inWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + inWords(num % 100000) : '');
      return inWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + inWords(num % 10000000) : '');
    };

    return inWords(num) + ' Rupees';
  };

  // Update display when formData.totalCost changes
  useEffect(() => {
    if (!isTotalAmountFocused) {
      setTotalAmountDisplay(formatIndianNumber(formData.totalCost));
    }
  }, [formData.totalCost, isTotalAmountFocused]);

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
        ? Array(formData.emiMonths).fill(parseFloat((netPayable / formData.emiMonths).toFixed(2)))
        : prev.emiSplits
    }));
  }, [formData.totalCost, formData.gstType, formData.paymentType, formData.emiMonths, formData.paymentSplits, fields, setFormData]);

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
  }, [formData.paymentType, fields.length, formData.paymentSplits, setFormData]);

  useEffect(() => {
    if (formData.paymentType === "EMI" && formData.totalCost && formData.emiMonths > 0) {
      const percentEach = (100 / formData.emiMonths).toFixed(2);
      const emiArr = Array.from({ length: formData.emiMonths }, () => percentEach);
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
    <section className="p-4 bg-white rounded-xl shadow-lg space-y-4">
      <h3 className="font-semibold text-xl text-blue-700 border-b pb-3">Payment Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block font-medium mb-1">
            Total Amount (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`${inputClass} w-80`}
            value={isTotalAmountFocused ? (formData.totalCost || '') : totalAmountDisplay}
            onFocus={() => {
              setIsTotalAmountFocused(true);
              setTotalAmountDisplay(formData.totalCost || '');
            }}
            onBlur={() => {
              setIsTotalAmountFocused(false);
              setTotalAmountDisplay(formatIndianNumber(formData.totalCost));
            }}
            onChange={(e) => {
              const value = e.target.value.replace(/,/g, ''); // Remove commas for parsing
              const numValue = parseFloat(value) || 0;
              setFormData(prev => ({ ...prev, totalCost: numValue }));
              if (isTotalAmountFocused) {
                setTotalAmountDisplay(value);
              }
            }}
            required
          />
          {formData.totalCost > 0 && (
            <p className="text-green-600 text-xs mt-1">{numberToWords(formData.totalCost)}</p>
          )}
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
          disabled={readOnly}
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
                disabled={readOnly}
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
                disabled={readOnly}
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
                  disabled={readOnly}
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
              disabled={readOnly}
            />
          </div>

          {autoEmiSplits.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg shadow-md space-y-3">
              <h4 className="text-lg font-bold text-blue-800">
                Installments Summary (1 to {formData.emiMonths})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-auto-fit gap-4">
                <p className="text-sm text-gray-700">Installments: {formData.emiMonths}</p>
                <p className="text-sm text-gray-700">Each Installment: {autoEmiSplits[0]}%</p>
                <p className="text-sm text-gray-700">
                  Base Amount: ₹{(formData.totalCost / formData.emiMonths).toFixed(2)}
                </p>
                <p className="text-sm text-gray-700">
                  GST ({formData.gstType === "include" ? "18%" : "0%"}): ₹
                  {(formData.gstAmount / formData.emiMonths).toFixed(2)}
                </p>
                <p className="text-sm text-gray-900 font-semibold col-span-2">
                  Total per Installment: ₹{(formData.netPayableAmount / formData.emiMonths).toFixed(2)}
                </p>
              </div>

              <button
                type="button"
                className="px-4 py-2 mt-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                onClick={() => setShowAllInstallments(!showAllInstallments)}
                disabled={readOnly}
              >
                {showAllInstallments ? "Hide Installment Details" : "View All Installment Details"}
              </button>

              {showAllInstallments && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-auto-fit gap-4 mt-4">
                  {formData.paymentDetails.map((detail, i) => (
                    <div key={i} className="p-4 bg-white rounded-lg shadow border space-y-1">
                      <p className="font-semibold">Installment {i + 1}</p>
                      <p className="text-sm text-gray-700">
                        Amount: ₹{detail.baseAmount}
                      </p>
                      <p className="text-sm text-gray-700">
                        GST: ₹{detail.gstAmount}
                      </p>
                      <p className="text-sm text-gray-900 font-semibold">
                        Total: ₹{detail.totalAmount}
                      </p>
                      <p className="text-xs text-gray-500">
                        Calculation: {detail.percentage}% of ₹{formData.totalCost.toFixed(2)} + GST
                      </p>
                    </div>
                  ))}
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

export default DMPaymentInfoSection;