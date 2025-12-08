import React from "react";

const RowClickModal = ({ installment, invoice, onClose }) => {
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
    } catch {

      return "Invalid Date";
    }
  };

  const convertAmountToWords = (amount) => {
    if (!amount) return "Rupees Zero Only";

    const a = [
      "",
      "One ",
      "Two ",
      "Three ",
      "Four ",
      "Five ",
      "Six ",
      "Seven ",
      "Eight ",
      "Nine ",
      "Ten ",
      "Eleven ",
      "Twelve ",
      "Thirteen ",
      "Fourteen ",
      "Fifteen ",
      "Sixteen ",
      "Seventeen ",
      "Eighteen ",
      "Nineteen ",
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

    const num = parseInt(amount);
    if (isNaN(num)) return "Invalid Amount";
    if (num === 0) return "Zero Rupees Only";

    const convert = (n) => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + " " + a[n % 10];
      if (n < 1000)
        return a[Math.floor(n / 100)] + "Hundred " + convert(n % 100);
      if (n < 100000)
        return convert(Math.floor(n / 1000)) + "Thousand " + convert(n % 1000);
      if (n < 10000000)
        return convert(Math.floor(n / 100000)) + "Lakh " + convert(n % 100000);
      return (
        convert(Math.floor(n / 10000000)) + "Crore " + convert(n % 10000000)
      );
    };

    return "Rupees " + convert(num).trim() + " Only";
  };

  const amounts = getPaymentAmounts();
  const amountInWords = convertAmountToWords(amounts.totalAmount);
  const projectCodes = getAllProjectCodes();

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-500 p-4 no-print">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto invoice-modal-print">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Installment Details</h3>
                <p className="text-gray-600 mt-1">
                  College: {invoice?.collegeName || "N/A"}
                </p>

                {/* ✅ IMPROVED: Project Codes Display */}
                <div className="mt-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Project {projectCodes.length > 1 ? "Codes" : "Code"}:
                  </span>
                  {projectCodes.length > 0 ? (
                    projectCodes.map((projectCode, index) => (
                      <span key={index} className="text-sm text-gray-600 ml-2">
                        {projectCode}
                        {index < projectCodes.length - 1 ? ", " : ""}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-600 ml-2">N/A</span>
                  )}
                </div>

                {/* Installment Info */}
                <div className="mt-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Installment:
                  </span>
                  <span className="text-sm text-gray-600 ml-2">
                    {installment.name} ({installment.percentage}%)
                  </span>
                </div>

                {/* Invoice Date Display - Only if invoice exists */}
                {invoice && (
                  <div className="mt-2">
                    <span className="text-sm font-semibold text-gray-700">
                      Invoice Date:
                    </span>
                    <span className="text-sm text-gray-600 ml-2">
                      {formatDate(invoice.raisedDate || invoice.createdAt)}
                    </span>

                    {invoice.dueDate && (
                      <>
                        <span className="text-sm font-semibold text-gray-700 ml-4">
                          Due Date:
                        </span>
                        <span className="text-sm text-red-600 ml-2">
                          {formatDate(invoice.dueDate)}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="bg-blue-100 py-2 rounded-lg">
                  <p className="font-bold text-blue-800 text-lg">
                    {invoice?.invoiceType || "Installment Preview"}
                  </p>
                  {!invoice && (
                    <p className="text-sm text-blue-600 font-semibold">
                      Not Generated Yet
                    </p>
                  )}
                  {invoice?.invoiceNumber && (
                    <p className="text-sm text-blue-600 font-semibold">
                      {invoice.invoiceNumber}
                    </p>
                  )}
                </div>
                {installment && (
                  <p className="text-xs text-gray-500 mt-1">
                    Installment: {installment.name}
                  </p>
                )}
              </div>
            </div>

            {/* Company Details */}
            <div className="mb-6">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h4 className="font-bold text-lg mb-2">
                  Gryphon Academy Pvt. Ltd
                </h4>
                <p className="text-sm">
                  Survey Number 128, Office No 901, Olympia, Pune Bypass,
                  Olympia
                </p>
                <p className="text-sm">
                  Business House, Baner, Pune, Maharashtra 411045
                </p>
                <p className="text-sm mt-1">
                  <strong>GSTIN:</strong> 27AAJCG8035D1ZM |
                  <strong> PAN:</strong> AAJCG8035D
                </p>
              </div>

              {/* College Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-lg mb-2">
                  PARTY'S NAME: -{" "}
                  {invoice?.collegeName || "College Name Not Available"}
                </h4>

                <p className="text-sm">
                  {invoice?.address || "College Address Not Available"}
                </p>
                <p className="text-sm mt-1">
                  <strong>GSTIN:</strong>{" "}
                  {invoice?.gstNumber || "GSTIN Not Available"} |
                  <strong> PLACE OF SUPPLY:</strong>{" "}
                  {invoice?.state || "State Not Available"}
                </p>
              </div>
            </div>

            {/* Installment Table */}
            <div className="mb-6">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">
                      Description
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left">
                      HSN Code
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-right">
                      Amount (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">
                      {/* ✅ DYNAMIC DESCRIPTION GENERATION */}
                      {(() => {
                        // Common parts
                        const installmentName = installment.name || "";
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

                        // Calculate base amount and GST
                        const gstAmount = amounts.gstAmount;

                        // Generate description based on invoice type
                        if (invoice?.isMergedInvoice) {
                          // MERGED INVOICE DESCRIPTION
                          const courses = invoice.course
                            ? invoice.course.split(", ")
                            : [course];
                          const years = invoice.year
                            ? invoice.year.split(", ")
                            : [year];

                          return (
                            <div>
                              <div className="font-semibold">
                                Training Services - {installmentName}{" "}
                                {percentage && `(${percentage}%)`}
                              </div>
                              <div className="text-sm text-gray-700 mt-1">
                                As per the MOU {percentage && `${percentage}% `}
                                for {courses.join("/")} {years.join("/")} year
                                {studentCount &&
                                  ` for ${studentCount} students`}
                                {perStudentCost &&
                                  ` @${perStudentCost} per student`}
                                {gstAmount > 0 && ` + 18% GST`}
                              </div>

                              {/* Project Codes for merged invoices */}
                              {projectCodes.length > 0 && (
                                <div className="text-xs text-blue-600 mt-2">
                                  <strong>Project Codes:</strong>{" "}
                                  {projectCodes.join(", ")}
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          // INDIVIDUAL INVOICE DESCRIPTION
                          return (
                            <div>
                              <div className="font-semibold">
                                Training Services - {installmentName}{" "}
                                {percentage && `(${percentage}%)`}
                              </div>
                              <div className="text-sm text-gray-700 mt-1">
                                As per the MOU {percentage && `${percentage}% `}
                                after completion of the training {course} {year}{" "}
                                year
                                {studentCount &&
                                  ` for ${studentCount} students`}
                                {perStudentCost &&
                                  ` @${perStudentCost} per student`}
                                {gstAmount > 0 && ` + 18% GST`}
                              </div>

                              {/* Project Code for individual invoices */}
                              {projectCodes.length > 0 && (
                                <div className="text-xs text-blue-600 mt-2">
                                  <strong>Project Code:</strong>{" "}
                                  {projectCodes[0]}
                                </div>
                              )}
                            </div>
                          );
                        }
                      })()}

                      {/* Additional details if any */}
                      {invoice?.additionalDetails && (
                        <div className="text-xs text-gray-600 mt-2">
                          {invoice.additionalDetails}
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">999293</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {amounts.baseAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amount in Words */}
            <div className="mb-6 p-3 bg-gray-50 rounded">
              <p className="text-sm">
                <strong>Amount in Words:</strong> {amountInWords}
              </p>

              {/* ✅ IMPROVED: Project codes yahan bhi dikhao */}
              {projectCodes.length > 0 && (
                <p className="text-sm mt-1">
                  <strong>
                    Project {projectCodes.length > 1 ? "Codes" : "Code"}:
                  </strong>{" "}
                  {projectCodes.join(", ")}
                </p>
              )}
            </div>

            {/* GST Calculation */}
            <div className="mb-6">
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold">
                      Total (Base Amount)
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {amounts.baseAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>

                  {/* GST breakdown */}
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold">
                      Add: CGST @ 9%
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {(amounts.gstAmount / 2).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold">
                      Add: SGST @ 9%
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {(amounts.gstAmount / 2).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                        </td>
                      </tr>
                    </>
                  )}

                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold">
                      Grand Total
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-bold">
                      ₹
                      {amounts.totalAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Contact Information */}
            <div className="mb-6 p-3 bg-blue-50 rounded">
              <p className="text-sm text-center">
                If you have any questions concerning this installment, use the
                following contact information: Website: www.gryphonacademy.co.in
                | Email: shashli@gryphonacademy.co.in | Phone: +91 7875895160
              </p>
            </div>

            {/* Bank Details */}
            <div className="mb-6 p-4 border border-gray-300 rounded">
              <h5 className="font-bold mb-2">Bank Details:</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Name of Account:</strong> Gryphon Academy Private
                  Limited
                </div>
                <div>
                  <strong>Account Number:</strong> 50200080602438
                </div>
                <div>
                  <strong>IFSC Code:</strong> HDFC0000062
                </div>
                <div>
                  <strong>Bank:</strong> HDFC Bank
                </div>
                <div>
                  <strong>Account Type:</strong> Current Account
                </div>
              </div>
            </div>

            {/* Signature */}
            <div className="text-right mt-8">
              <p className="font-semibold">For Gryphon Academy Pvt. Ltd</p>
              <p className="mt-4">Authorised Signatory</p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t no-print">
              <button
                onClick={() => window.print()} // Yeh line add karo
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold"
              >
                Print/Download
              </button>
              <button
                onClick={onClose}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 font-semibold"
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
