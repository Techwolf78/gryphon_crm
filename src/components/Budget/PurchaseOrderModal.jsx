import { useState, useEffect } from "react";

const PurchaseOrderModal = ({
  show,
  onClose,
  onSubmit,
  intent,
  vendors,
  budgetComponents,
}) => {
  const [formData, setFormData] = useState({
    vendorId: "",
    finalPrice: 0, // This is the BASE PRICE (before tax)
    terms: "",
    deliveryDate: "",
    paymentTerms: "net30",
    notes: "",
  });
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [includeGST, setIncludeGST] = useState(false);

  // 🔹 Logic to get BASE Total (Excl. GST) from Intent
  const calculateBaseIntentTotal = () => {
    if (!intent) return 0;

    // Use specific baseTotal field if available (from new intents created with the updated modal)
    if (intent.baseTotal) return intent.baseTotal;

    // Fallback 1: Sum up the items (Qty * Unit Price usually equals base)
    if (intent.requestedItems && intent.requestedItems.length > 0) {
      return intent.requestedItems.reduce((total, item) => {
        return total + (item.estTotal || 0);
      }, 0);
    }

    // Fallback 2: If we only have estimatedTotal and includeGST is true, reverse calc to get base
    if (intent.includeGST && intent.estimatedTotal) {
      return intent.estimatedTotal / 1.18;
    }

    return intent.estimatedTotal || 0;
  };

  const intentBaseTotal = calculateBaseIntentTotal();
  const intentGrandTotal = intent?.estimatedTotal || intentBaseTotal;

  // Order Calculations
  const gstRate = 0.18; // 18%
  const gstAmount = includeGST ? formData.finalPrice * gstRate : 0;
  const finalTotalWithGST = formData.finalPrice + gstAmount;

  useEffect(() => {
    if (intent) {
      // 🔹 Initialize price with BASE amount to avoid double taxation
      setFormData((prev) => ({
        ...prev,
        finalPrice: intentBaseTotal,
      }));

      // 🔹 Sync GST checkbox state from Intent
      setIncludeGST(!!intent.includeGST);
    }
  }, [intent, intentBaseTotal]);

  useEffect(() => {
    if (formData.vendorId) {
      const vendor = vendors.find((v) => v.id === formData.vendorId);
      setSelectedVendor(vendor || null);
    } else {
      setSelectedVendor(null);
    }
  }, [formData.vendorId, vendors]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedVendor) {
      alert("Please select a vendor before submitting.");
      return;
    }

    const submissionData = {
      ...formData,
      intentId: intent.id,
      items: intent.requestedItems || [],
      budgetComponent: intent.selectedBudgetComponent || intent.budgetComponent,
      department: intent.deptId || intent.department,
      estimatedTotal: intentGrandTotal,
      ownerName: intent.ownerName,
      title: intent.title,
      description: intent.description,
      vendorDetails: {
        vendorId: selectedVendor.id,
        name: selectedVendor.name || selectedVendor.businessName || "-",
        contactPerson: selectedVendor.contactPerson || "-",
        phone: selectedVendor.phone || "-",
        email: selectedVendor.email || "-",
        category: selectedVendor.category || "-",
        address:
          `${selectedVendor?.address?.city || ""} ${
            selectedVendor?.address?.state || ""
          }`.trim() || "-",
      },
      gstDetails: includeGST
        ? {
            cgst: 9,
            sgst: 9,
            gstAmount,
            totalWithGST: finalTotalWithGST,
          }
        : null,
      finalAmount: finalTotalWithGST,
    };

    onSubmit(submissionData);
  };

  if (!show || !intent) return null;

  useEffect(() => {
    const preventScrollChange = (e) => {
      if (
        document.activeElement.type === "number" &&
        document.activeElement.contains(e.target)
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", preventScrollChange, { passive: false });
    return () => window.removeEventListener("wheel", preventScrollChange);
  }, []);

  return (
    <div className="mt-10 fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Create Purchase Order
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto max-h-[70vh]"
        >
          {/* Intent Summary */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              🧾 <span className="ml-2">Purchase Intent Summary</span>
            </h3>

            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between items-center">
                <p className="font-medium text-gray-800">Title:</p>
                <p className="text-gray-600 font-semibold truncate max-w-[60%]">
                  {intent.title}
                </p>
              </div>

              <div className="flex justify-between items-center">
                <p className="font-medium text-gray-800">Description:</p>
                <p className="text-gray-600 font-semibold mt-0.5">
                  {intent.description || "No description provided"}
                </p>
              </div>

              <div className="flex justify-between items-center">
                <p className="font-medium text-gray-800">Budget Component:</p>
                <p className="text-gray-600 font-semibold ">
                  {budgetComponents[intent.selectedBudgetComponent] ||
                    budgetComponents[intent.budgetComponent] ||
                    "N/A"}
                </p>
              </div>

              <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                <p className="font-medium text-gray-800">Original Estimate:</p>
                <p className="text-green-700 font-semibold">
                  ₹{intentGrandTotal.toLocaleString("en-In")}
                  {intent.includeGST && (
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      (Incl. GST)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Items from Intent */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Requested Items ({intent.requestedItems?.length || 0})
            </h3>
            <div className="space-y-2">
              {intent.requestedItems?.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-start p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.description}</p>
                    <p className="text-xs text-gray-600">
                      Category: {item.category}
                    </p>
                    <p className="text-xs text-gray-600">
                      {item.quantity} × ₹
                      {item.estPricePerUnit?.toLocaleString("en-In")}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-right">
                    <div>₹{item.estTotal?.toLocaleString("en-In")}</div>
                    <div className="text-xs text-gray-500 font-normal">
                      Item #{item.sno}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vendor Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Vendor *
            </label>
            <select
              value={formData.vendorId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, vendorId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}{" "}
                  {vendor.contactPerson && `- ${vendor.contactPerson}`}
                </option>
              ))}
            </select>

            {/* 🛑 THIS IS THE UI BLOCK THAT WAS TRUNCATED BEFORE */}
            {selectedVendor && (
              <div className="mt-3 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        {selectedVendor.businessName || selectedVendor.name}
                      </h3>
                      {selectedVendor.rating && (
                        <div className="flex items-center bg-white px-2 py-1 rounded-full border border-blue-200 text-xs font-medium text-blue-700">
                          <span className="text-amber-500 mr-1">⭐</span>
                          {selectedVendor.rating}/5
                        </div>
                      )}
                    </div>

                    {selectedVendor.category && (
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full mb-2">
                        {selectedVendor.category}
                      </span>
                    )}
                  </div>

                  {selectedVendor.isPreferred && (
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Preferred
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-700">
                      <svg
                        className="w-4 h-4 mr-2 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="font-medium">
                        {selectedVendor.contactPerson}
                      </span>
                    </div>

                    <div className="flex items-center text-gray-700">
                      <svg
                        className="w-4 h-4 mr-2 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span>{selectedVendor.phone}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {selectedVendor.email && (
                      <div className="flex items-center text-gray-700">
                        <svg
                          className="w-4 h-4 mr-2 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="truncate">{selectedVendor.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional vendor information */}
                {(selectedVendor.website || selectedVendor.paymentTerms) && (
                  <div className="mt-3 pt-3 border-t border-blue-200/50">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {selectedVendor.website && (
                        <a
                          href={selectedVendor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-1 bg-white text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
                        >
                          <svg
                            className="w-3 h-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                          Website
                        </a>
                      )}
                      {selectedVendor.paymentTerms && (
                        <span className="inline-flex items-center px-2 py-1 bg-white text-gray-600 rounded-lg border border-gray-200">
                          <svg
                            className="w-3 h-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                            />
                          </svg>
                          {selectedVendor.paymentTerms}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pricing and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Final Negotiated Base Price (Excl. GST) *
              </label>
              <input
                type="number"
                value={formData.finalPrice}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    finalPrice: parseFloat(e.target.value) || 0,
                  }))
                }
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="mt-1 text-sm text-gray-600">
                {/* Compare Base to Base for accurate savings calculation */}
                {formData.finalPrice !== intentBaseTotal && (
                  <span
                    className={
                      formData.finalPrice < intentBaseTotal
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {formData.finalPrice < intentBaseTotal
                      ? "Savings: "
                      : "Overage: "}
                    ₹
                    {Math.abs(
                      formData.finalPrice - intentBaseTotal
                    ).toLocaleString("en-In")}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                id="po-gst"
                type="checkbox"
                checked={includeGST}
                onChange={(e) => setIncludeGST(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="po-gst"
                className="text-sm text-gray-700 font-medium"
              >
                Include GST (9% CGST + 9% SGST)
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <select
                value={formData.paymentTerms}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    paymentTerms: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="net15">Net 15</option>
                <option value="net30">Net 30</option>
                <option value="net45">Net 45</option>
                <option value="net60">Net 60</option>
                <option value="uponDelivery">Upon Delivery</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryDate: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms & Conditions
              </label>
              <input
                type="text"
                value={formData.terms}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, terms: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., 1-year warranty, installation included"
              />
            </div>
          </div>

          {/* Totals Section */}
          <div className="mt-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex justify-between">
              <span>Base Amount:</span>
              <span>₹{formData.finalPrice.toLocaleString("en-IN")}</span>
            </div>
            {includeGST && (
              <>
                <div className="flex justify-between text-gray-500">
                  <span>CGST (9%):</span>
                  <span>
                    ₹{(formData.finalPrice * 0.09).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>SGST (9%):</span>
                  <span>
                    ₹{(formData.finalPrice * 0.09).toLocaleString("en-IN")}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t border-gray-300 pt-2 mt-2 font-semibold text-gray-900">
              <span>Total (Incl. GST):</span>
              <span>₹{finalTotalWithGST.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              Create Purchase Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseOrderModal;
