// components/InvoiceModal.js
import React from "react";

const InvoiceModal = ({ invoice, onClose, onRegister,isViewOnly }) => {
  if (!invoice) return null;

    const getInvoiceTypeDisplay = () => {
    if (invoice.invoiceType) {
      return invoice.invoiceType;
    }
    return invoice.type || "Tax Invoice"; // fallback
  };

  const getInvoiceNumberDisplay = () => {
    return invoice.invoiceNumber || "N/A";
  };
  // Amount ko words mein convert karne ka function
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

  // Payment details se amounts nikalna
  const getPaymentAmounts = () => {
    if (!invoice.paymentDetails || invoice.paymentDetails.length === 0) {
      return {
        baseAmount: invoice.amount || 0,
        gstAmount: 0,
        totalAmount: invoice.amount || 0,
      };
    }

    // Pehla payment detail use karna (Advance wala)
    const payment = invoice.paymentDetails[0];
    return {
      baseAmount: payment.baseAmount || 0,
      gstAmount: payment.gstAmount || 0,
      totalAmount: payment.totalAmount || 0,
    };
  };

  const amounts = getPaymentAmounts();
  const amountInWords = convertAmountToWords(amounts.totalAmount);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-500 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
         <div className="flex justify-between items-start mb-6 border-b pb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Invoice</h3>
              <p className="text-gray-600 mt-1">
                College: {invoice.collegeName || "N/A"} | 
                Project: {invoice.projectCode || "N/A"}
              </p>
            </div>
            <div className="text-right">
              <div className="bg-blue-100 px-3 py-2 rounded-lg">
                <p className="font-bold text-blue-800 text-lg">
                  {getInvoiceTypeDisplay()}
                </p>
                <p className="text-sm text-blue-600 font-semibold">
                  {getInvoiceNumberDisplay()}
                </p>
              </div>
              {invoice.installment && (
                <p className="text-xs text-gray-500 mt-1">
                  Installment: {invoice.installment}
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
                Survey Number 128, Office No 901, Olympia, Pune Bypass, Olympia
              </p>
              <p className="text-sm">
                Business House, Baner, Pune, Maharashtra 411045
              </p>
              <p className="text-sm mt-1">
                <strong>GSTIN:</strong> 27AAJCG8035D1ZM |<strong> PAN:</strong>{" "}
                AAJCG8035D
              </p>
            </div>

            {/* College Details (Party's Details) */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-bold text-lg mb-2">
                PARTY'S NAME: -{" "}
                {invoice.collegeName || "College Name Not Available"}
              </h4>
              <p className="text-sm">
                {invoice.address || "College Address Not Available"}
              </p>
              <p className="text-sm mt-1">
                <strong>GSTIN:</strong>{" "}
                {invoice.gstNumber || "GSTIN Not Available"} |
                <strong> PLACE OF SUPPLY:</strong>{" "}
                {invoice.state || "State Not Available"}
              </p>
            </div>
          </div>

          {/* Invoice Table */}
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
                    {invoice.description || "Training Services"}
                    {invoice.additionalDetails && (
                      <div className="text-xs text-gray-600 mt-1">
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
            {invoice.projectCode && (
              <p className="text-sm mt-1">
                <strong>Project Code:</strong> {invoice.projectCode}
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
              If you have any questions concerning this invoice, use the
              following contact information: Website: www.gryphonacademy.co.in |
              Email: shashli@gryphonacademy.co.in | Phone: +91 7875895160
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
       <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
    {!isViewOnly && !invoice.registered && (
      <button
        onClick={() => {
          onRegister(invoice);
          onClose();
        }}
        className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-semibold"
      >
        Register Invoice
      </button>
    )}
    <button
      onClick={() => window.print()}
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
  );
};

export default InvoiceModal;
