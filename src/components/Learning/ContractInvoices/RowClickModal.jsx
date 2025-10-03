import React from "react";
import {
  X,
  Building2,
  Calendar,
  FileText,
  CreditCard,
  Phone,
  Mail,
  Globe,
  MapPin,
  Hash,
  IndianRupee,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";

const RowClickModal = ({ installment, invoice, contract, onClose }) => {
  if (!installment) return null;

  const getPaymentAmounts = () => {
    const totalAmount = installment.totalAmount || 0;
    const baseAmount = totalAmount / 1.18;
    const gstAmount = totalAmount - baseAmount;

    return {
      baseAmount: Math.round(baseAmount),
      gstAmount: Math.round(gstAmount),
      totalAmount: totalAmount,
    };
  };

  // ✅ IMPROVED: Get all project codes for merged invoices
  const getAllProjectCodes = () => {
    // Agar merged invoice hai toh merged contracts se project codes lo
    if (invoice?.isMergedInvoice && invoice?.mergedContracts) {
      return invoice.mergedContracts
        .map((contract) => contract.projectCode)
        .filter(Boolean);
    }

    // Agar individual project code hai toh woh return karo
    if (invoice?.projectCode) {
      return [invoice.projectCode];
    }

    // Agar individualProjectCodes array mein hai (merged invoice ke liye backup)
    if (
      invoice?.individualProjectCodes &&
      invoice.individualProjectCodes.length > 0
    ) {
      return invoice.individualProjectCodes;
    }

    return [];
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    try {
      const date = dateString.toDate
        ? dateString.toDate()
        : new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid Date";
    }
  };

  const amounts = getPaymentAmounts();
  const projectCodes = getAllProjectCodes();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-54 p-4 transition-all duration-300"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Container */}
        <div
          className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 px-3 py-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="p-1 bg-blue-100 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <h1
                    id="modal-title"
                    className="text-lg font-bold text-slate-800 tracking-tight"
                  >
                    Installment Details
                  </h1>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{invoice?.collegeName || "College Name Not Available"}</span>
                  </div>

                  {/* Project Codes */}
                  {projectCodes.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Hash className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                      <div>
                        <span className="font-medium text-slate-700">
                          Project {projectCodes.length > 1 ? "Codes" : "Code"}:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {projectCodes.map((code, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded border border-blue-200"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Installment Info */}
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">
                      {installment.name} ({installment.percentage}%)
                    </span>
                  </div>

                  {/* Invoice Status */}
                  {invoice && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500">Invoice Date:</span>
                        <span className="font-medium text-slate-700">
                          {formatDate(invoice.raisedDate || invoice.createdAt)}
                        </span>
                      </div>

                      {invoice.dueDate && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs text-slate-500">Due Date:</span>
                          <span className="font-medium text-amber-700">
                            {formatDate(invoice.dueDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors duration-200 group"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                </button>

                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                    invoice?.invoiceType === "Cash Invoice"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}>
                    {invoice?.invoiceType || "Installment Preview"}
                  </div>

                  {!invoice && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                      <AlertCircle className="w-3 h-3" />
                      <span>Not Generated Yet</span>
                    </div>
                  )}

                  {invoice?.invoiceNumber && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3" />
                      <span className="font-mono">{invoice.invoiceNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(80vh-100px)]">
            <div className="p-3 space-y-3">
              {/* Company & College Details */}
              <div className="grid md:grid-cols-2 gap-3">
                {/* Company Details */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800">
                      Gryphon Academy Pvt. Ltd
                    </h3>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p>Survey Number 128, Office No 901</p>
                    <p>Olympia, Pune Bypass, Business House</p>
                    <p>Baner, Pune, Maharashtra 411045</p>

                    <div className="flex flex-wrap gap-3 pt-2 border-t border-blue-200">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-slate-700">GSTIN:</span>
                        <span className="font-mono text-xs">27AAJCG8035D1ZM</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-slate-700">PAN:</span>
                        <span className="font-mono text-xs">AAJCG8035D</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* College Details */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg">
                      <MapPin className="w-4 h-4 text-slate-600" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800">
                      Billing Address
                    </h3>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p className="font-medium text-slate-800">
                      {invoice?.collegeName || contract?.collegeName || "College Name Not Available"}
                    </p>
                    <p>{invoice?.address || contract?.address || "College Address Not Available"}</p>

                    <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-slate-700">GSTIN:</span>
                        <span className="font-mono text-xs">
                          {invoice?.gstNumber || contract?.gstNumber || "GSTIN Not Available"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-slate-700">State:</span>
                        <span>{invoice?.state || contract?.state || "State Not Available"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Installment Table */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-600" />
                    Service Details
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">
                          HSN Code
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 border-b border-slate-200">
                          Amount (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-slate-50 transition-colors duration-150">
                        <td className="px-4 py-3 border-b border-slate-100">
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-800 text-sm">
                              Training Services - {installment.name}{" "}
                              {installment.percentage && `(${installment.percentage}%)`}
                            </div>

                            <div className="text-xs text-slate-600 leading-relaxed">
                              {(() => {
                                const percentage = installment.percentage || "";
                                const course = invoice?.course || "";
                                const year = invoice?.year || "";
                                const studentCount = invoice?.studentCount || "";
                                const perStudentCost = invoice?.perStudentCost
                                  ? new Intl.NumberFormat("en-IN", {
                                      style: "currency",
                                      currency: "INR",
                                      maximumFractionDigits: 0,
                                    }).format(Number(invoice.perStudentCost))
                                  : "";

                                if (invoice?.isMergedInvoice) {
                                  const courses = invoice.course
                                    ? invoice.course.split(", ")
                                    : [course];
                                  const years = invoice.year
                                    ? invoice.year.split(", ")
                                    : [year];

                                  return (
                                    <>
                                      As per the MOU {percentage && `${percentage}% `}for{" "}
                                      {courses.join("/")} {years.join("/")} year
                                      {studentCount && ` for ${studentCount} students`}
                                      {perStudentCost && ` @${perStudentCost} per student`}
                                      {amounts.gstAmount > 0 && ` + 18% GST`}
                                    </>
                                  );
                                } else {
                                  return (
                                    <>
                                      As per the MOU {percentage && `${percentage}% `}after completion of the training{" "}
                                      {course} {year} year
                                      {studentCount && ` for ${studentCount} students`}
                                      {perStudentCost && ` @${perStudentCost} per student`}
                                      {amounts.gstAmount > 0 && ` + 18% GST`}
                                    </>
                                  );
                                }
                              })()}
                            </div>

                            {projectCodes.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {projectCodes.map((code, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded"
                                  >
                                    {code}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-b border-slate-100">
                          <span className="font-mono text-xs text-slate-600">999293</span>
                        </td>
                        <td className="px-4 py-3 border-b border-slate-100 text-right">
                          <span className="font-semibold text-slate-800 text-sm">
                            {amounts.baseAmount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="grid md:grid-cols-1 gap-3">
                {/* GST Calculation */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800">
                      Tax Breakdown
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-100">
                    <div className="px-4 py-3 flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Base Amount</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        ₹{amounts.baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {invoice?.invoiceType === "Cash Invoice" ? (
                      <>
                        <div className="px-4 py-3 flex justify-between items-center">
                          <span className="text-slate-600 text-sm">CGST @ 0%</span>
                          <span className="text-slate-500 text-sm">₹0.00</span>
                        </div>
                        <div className="px-4 py-3 flex justify-between items-center">
                          <span className="text-slate-600 text-sm">SGST @ 0%</span>
                          <span className="text-slate-500 text-sm">₹0.00</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="px-4 py-3 flex justify-between items-center">
                          <span className="text-slate-600 text-sm">CGST @ 9%</span>
                          <span className="text-slate-800 text-sm">
                            ₹{(amounts.gstAmount / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="px-4 py-3 flex justify-between items-center">
                          <span className="text-slate-600 text-sm">SGST @ 9%</span>
                          <span className="text-slate-800 text-sm">
                            ₹{(amounts.gstAmount / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="px-4 py-3 flex justify-between items-center bg-slate-50">
                      <span className="font-semibold text-slate-800 text-sm">Grand Total</span>
                      <span className="text-lg font-bold text-blue-600">
                        ₹{amounts.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact & Bank Details */}
              <div className="grid md:grid-cols-2 gap-3">
                {/* Contact Information */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800">
                      Contact Information
                    </h3>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      <a
                        href="https://www.gryphonacademy.co.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        www.gryphonacademy.co.in
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                      <a
                        href="mailto:shashli@gryphonacademy.co.in"
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        shashli@gryphonacademy.co.in
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-blue-500" />
                      <a
                        href="tel:+917875895160"
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        +91 7875895160
                      </a>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-blue-200">
                    For any questions concerning this installment, please contact us using the information above.
                  </p>
                </div>

                {/* Bank Details */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-600" />
                      Bank Details
                    </h3>
                  </div>

                  <div className="p-3 space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-xs font-medium text-slate-600">Account Name</span>
                        <span className="text-xs text-slate-800 font-medium">Gryphon Academy Private Limited</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-xs font-medium text-slate-600">Account Number</span>
                        <span className="text-xs text-slate-800 font-mono">50200080602438</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-xs font-medium text-slate-600">IFSC Code</span>
                        <span className="text-xs text-slate-800 font-mono">HDFC0000062</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-xs font-medium text-slate-600">Bank</span>
                        <span className="text-xs text-slate-800">HDFC Bank</span>
                      </div>

                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs font-medium text-slate-600">Account Type</span>
                        <span className="text-xs text-slate-800">Current Account</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-3 py-2">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RowClickModal;