import { useState, useEffect } from "react";

const ViewPurchaseOrderModal = ({
  show,
  onClose,
  order,
  vendorData,
  budgetComponents,
  onExport,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(order);

  useEffect(() => {
    if (order) setFormData(order);
  }, [order]);

  if (!show || !order) return null;

  // 🔹 Handle input updates
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVendorChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      vendorDetails: {
        ...prev.vendorDetails,
        [field]: value,
      },
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...(formData.items || [])];
    updatedItems[index][field] = value;
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const handleSave = () => {
    const subtotal = formData.items.reduce(
      (sum, item) => sum + (parseFloat(item.estTotal || item.finalAmount) || 0),
      0
    );
    const gstRate = 0.18;
    const gstAmount = subtotal * gstRate;
    const totalWithGST = subtotal + gstAmount;

    const updatedData = {
      ...formData,
      gstDetails: {
        gstAmount,
        totalWithGST,
      },
    };

    setFormData(updatedData);
    onUpdate(updatedData);
    setIsEditing(false);
  };

  const vendor = formData.vendorDetails || vendorData || {};
  useEffect(() => {
    const preventScrollChange = (e) => {
      if (
        document.activeElement.type === "number" &&
        document.activeElement.contains(e.target)
      ) {
        e.preventDefault(); // stop value change
      }
    };

    window.addEventListener("wheel", preventScrollChange, { passive: false });

    return () => window.removeEventListener("wheel", preventScrollChange);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[1000]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Purchase Order -{" "}
            {formData.poNumber || `PO-${order.id?.slice(-6).toUpperCase()}`}
          </h2>

          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="
                    px-4 py-2
                    bg-sky-200 text-black rounded-lg font-semibold
                    shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_6px_rgba(0,0,0,0.25)]
                    hover:bg-sky-300
                    active:shadow-[inset_0_4px_6px_rgba(0,0,0,0.35),0_2px_3px_rgba(255,255,255,0.4)]
                    active:translate-y-0.5
                    transition-all duration-150 ease-in-out
                "
              >
                Edit
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-4 py-2
                    bg-emerald-500 text-white rounded-lg font-semibold
                    shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_6px_rgba(0,0,0,0.25)]
                    hover:bg-emerald-700
                    active:shadow-[inset_0_4px_6px_rgba(0,0,0,0.35),0_2px_3px_rgba(255,255,255,0.4)]
                    active:translate-y-0.5
                    transition-all duration-150 ease-in-out"
              >
                Save
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-8">
          {/* 🏢 Company Header */}
          <div className="text-center pb-3">
            <div className="flex justify-evenly items-center">
              <div>
                <img
                  src="/gryphon_logo.png"
                  alt="Logo"
                  className="mx-auto h-20 mb-2"
                />
              </div>
              <div>
                <h3 className="font-bold text-black text-xl">
                  GRYPHON ACADEMY PRIVATE LIMITED
                </h3>
                <p className="text-md text-black font-semibold">
                  www.gryphonacademy.co.in
                </p>
                <p className="text-sm text-gray-600 max-w-md">
                  9th Floor, Olympia Business House, Baner, Pune - 411045
                </p>
                <p className="font-semibold mt-2">--- Purchase Order ---</p>
              </div>
              <div></div>
            </div>

            {/* 📅 Date & PO Number */}
            <div className="flex flex-col justify-between items-left px-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-700">Date:</p>
                {isEditing ? (
                  <input
                    type="date"
                    value={
                      formData.approvedAt
                        ? new Date(
                            formData.approvedAt.seconds
                              ? formData.approvedAt.seconds * 1000 // Firestore Timestamp
                              : typeof formData.approvedAt === "number"
                              ? formData.approvedAt // ms timestamp
                              : formData.approvedAt // Date or ISO string
                          )
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      handleChange("approvedAt", new Date(e.target.value))
                    }
                    className="border border-dashed border-gray-900 rounded-lg px-2 py-2 text-sm"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">
                    {formData.approvedAt
                      ? new Date(
                          formData.approvedAt.seconds * 1000
                        ).toLocaleDateString("en-IN")
                      : new Date().toLocaleDateString("en-IN")}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-700">PO No.:</p>
                <p className="font-semibold text-gray-900">
                  {formData.poNumber ||
                    `PO-${order.id?.slice(-6).toUpperCase()}`}
                </p>
              </div>
            </div>
          </div>

          {/* Vendor Info */}
          <div className="px-4">
            <div className="overflow-hidden ">
              <table className="w-full border-collapse text-sm ">
                <tbody>
                  {[
                    ["Vendor Name", "contactPerson", vendor.contactPerson],
                    ["Business Name", "name", vendor.name],
                    ["Email", "email", vendor.email],
                    ["Phone", "phone", vendor.phone],
                  ].map(([label, field, value], idx) => (
                    <tr
                      key={field}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border font-semibold border-gray-900  text-gray-700 px-3  w-1/4">
                        {label}
                      </td>
                      <td className="border border-gray-900 px-3 py-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={value || ""}
                            onChange={(e) =>
                              handleVendorChange(field, e.target.value)
                            }
                            className="border border-dashed border-gray-900 rounded-lg px-2 py-1 text-sm w-full"
                          />
                        ) : (
                          <p className="text-sm text-gray-800">
                            {value || "—"}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Requested By / Department */}
          <div className="px-4">
            <div className="overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {[
                    ["Requested By", "ownerName", formData.ownerName],
                    [
                      "Business Name",
                      "Business Name",
                      "Gryphon Academy Pvt Ltd",
                    ],
                    ["Address", "companyAddress", " Baner, Pune "],
                    [
                      "City, State, Zip Code",
                      "companyAddress",
                      " Maharashtra ",
                    ],
                    [
                      "Phone",
                      "requesterPhone",
                      formData.phone || "+91 9767019581",
                    ],
                  ].map(([label, field, value], idx) => (
                    <tr
                      key={field}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border font-semibold border-gray-900 text-gray-700 px-3 py-1 w-1/4">
                        {label}
                      </td>
                      <td className="border border-gray-900 px-3 py-1">
                        {isEditing && field !== "department" ? (
                          <input
                            type="text"
                            value={value || ""}
                            onChange={(e) =>
                              handleChange(field, e.target.value)
                            }
                            className="border border-dashed border-gray-900 rounded-lg px-2 py-1 text-sm w-full"
                          />
                        ) : (
                          <p className="text-sm text-gray-800">
                            {value || "—"}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Items + GST Table */}
          <div className="px-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left border border-gray-900">
                      S.N.
                    </th>
                    <th className="px-3 py-2 text-left border border-gray-900">
                      Category
                    </th>
                    <th className="px-3 py-2 text-left border border-gray-900">
                      Description
                    </th>
                    <th className="px-3 py-2 text-right border border-gray-900">
                      Qty
                    </th>
                    <th className="px-3 py-2 text-right border border-gray-900">
                      Unit Price
                    </th>
                    <th className="px-3 py-2 text-right border border-gray-900">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(formData.items || []).map((item, i) => {
                    const quantity = parseFloat(item.quantity || 0);
                    const unitPrice = parseFloat(item.estPricePerUnit || 0);
                    const itemTotal = quantity * unitPrice;

                    return (
                      <tr key={i}>
                        {/* S.N. */}
                        <td className="px-3 py-2 border border-gray-900">
                          {i + 1}
                        </td>

                        {/* Category */}
                        <td className="px-3 py-2 border border-gray-900">
                          {budgetComponents[formData.budgetComponent] ||
                            formData.budgetComponent}
                        </td>

                        {/* Description */}
                        <td className="px-3 py-2 border border-gray-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                handleItemChange(
                                  i,
                                  "description",
                                  e.target.value
                                )
                              }
                              className="border border-dashed border-gray-900 rounded px-2 py-1 w-full"
                            />
                          ) : (
                            item.description
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="px-3 py-2 text-right border border-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              value={item.quantity || ""}
                              min="0"
                              onChange={(e) => {
                                const newQty = parseFloat(e.target.value) || 0;
                                const newTotal = newQty * unitPrice;

                                setFormData((prev) => {
                                  const updated = [...prev.items];
                                  updated[i] = {
                                    ...updated[i],
                                    quantity: newQty,
                                    estTotal: newTotal,
                                    finalAmount: newTotal,
                                  };
                                  return { ...prev, items: updated };
                                });
                              }}
                              className="border border-dashed border-gray-900 rounded px-2 py-1 w-20 text-right"
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>

                        {/* Unit Price */}
                        <td className="px-3 py-2 text-right border border-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              value={item.estPricePerUnit || ""}
                              min="0"
                              step="0.01"
                              onChange={(e) => {
                                const newPrice =
                                  parseFloat(e.target.value) || 0;
                                const newTotal = quantity * newPrice;

                                setFormData((prev) => {
                                  const updated = [...prev.items];
                                  updated[i] = {
                                    ...updated[i],
                                    estPricePerUnit: newPrice,
                                    estTotal: newTotal,
                                    finalAmount: newTotal,
                                  };
                                  return { ...prev, items: updated };
                                });
                              }}
                              className="border border-dashed border-gray-900 rounded px-2 py-1 w-24 text-right"
                            />
                          ) : (
                            `₹${unitPrice.toLocaleString("en-IN")}`
                          )}
                        </td>

                        {/* Total */}
                        <td className="px-3 py-2 text-right border border-gray-900">
                          ₹
                          {(
                            item.finalAmount ||
                            item.estTotal ||
                            itemTotal
                          ).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}

                  {/* GST Summary Rows */}
                  {formData.gstDetails && (
                    <>
                      <tr className="bg-gray-50 font-medium">
                        <td className="border border-gray-900 px-3 py-2 text-center"></td>
                        <td className="border border-gray-900 px-3 py-2"></td>
                        <td className="border border-gray-900 px-3 py-2 text-gray-600">
                          SGST
                        </td>
                        <td className="border border-gray-900 px-3 py-2 text-right">
                          9%
                        </td>
                        <td className="border border-gray-900 px-3 py-2 text-right">
                          ₹
                          {(formData.gstDetails.gstAmount / 2).toLocaleString(
                            "en-IN"
                          )}
                        </td>
                        <td className="border border-gray-900 px-3 py-2 text-right">
                          ₹
                          {(formData.gstDetails.gstAmount / 2).toLocaleString(
                            "en-IN"
                          )}
                        </td>
                      </tr>

                      <tr className="bg-gray-50 font-medium">
                        <td className="border border-gray-900 px-3 py-2 text-center"></td>
                        <td className="border border-gray-900 px-3 py-2"></td>
                        <td className="border border-gray-900 px-3 py-2 text-gray-600">
                          CGST
                        </td>
                        <td className="border border-gray-900 px-3 py-2 text-right">
                          9%
                        </td>
                        <td className="border border-gray-900 px-3 py-2 text-right">
                          ₹
                          {(formData.gstDetails.gstAmount / 2).toLocaleString(
                            "en-IN"
                          )}
                        </td>
                        <td className="border border-gray-900 px-3 py-2 text-right">
                          ₹
                          {(formData.gstDetails.gstAmount / 2).toLocaleString(
                            "en-IN"
                          )}
                        </td>
                      </tr>

                      <tr className="bg-gray-100 font-semibold">
                        <td
                          colSpan="5"
                          className="text-right px-3 py-2 border-t-2 border-gray-900"
                        >
                          Grand Total (Incl. GST)
                        </td>
                        <td className="text-right px-3 py-2 border-t-2 border-gray-900">
                          ₹
                          {formData.gstDetails.totalWithGST?.toLocaleString(
                            "en-IN"
                          )}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature Boxes */}
          <div className="px-4">
            <div className="px-4 mt-6">
              <div className="grid grid-cols-5 text-center text-xs border border-gray-900">
                {Array(5)
                  .fill()
                  .map((_, index) => (
                    <div
                      key={`sig-top-${index}`}
                      className="border-r border-gray-900 py-10 last:border-r-0"
                    ></div>
                  ))}
                {[
                  "Dept. Head",
                  "HR",
                  "Delivery Head",
                  "Co-Founder",
                  "Founder & Director",
                ].map((role, index) => (
                  <div
                    key={`sig-bottom-${index}`}
                    className="border-t border-r  border-gray-900 py-2 font-medium text-gray-800 last:border-r-0"
                  >
                    {role}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="flex justify-between items-center mt-4 text-sm px-4">
            <div>
              <p>Payment Date: ___________________</p>
            </div>
            <div>
              <p>Payment Terms: ___________________</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
          <button
            onClick={onClose}
            className="
    px-5 py-2
    bg-white text-gray-700 border border-gray-300 rounded-lg font-medium
    shadow-[inset_0_-1px_2px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.6)]
    hover:bg-gray-50
    active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25),inset_0_-1px_1px_rgba(255,255,255,0.5)]
    active:translate-y-[0.5px]
    transition-all duration-150 ease-in-out
  "
          >
            Close
          </button>
          <button
            onClick={() => onExport(formData)}
            className="
    px-4 py-2
    bg-rose-500 text-white rounded-lg font-semibold
    shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,0,0,0.2)]
    hover:bg-rose-600
    active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_2px_rgba(255,255,255,0.3)]
    active:translate-y-[0.5px]
    transition-all duration-150 ease-in-out
  "
          >
            Export to PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPurchaseOrderModal;
