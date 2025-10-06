import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const PublicInvoiceDetails = () => {
  const location = useLocation();
  const invoiceNumber = location.pathname.replace('/invoice/', '');
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(true);
  const [countdown, setCountdown] = useState(5);

  console.log("PublicInvoiceDetails rendered with invoiceNumber:", invoiceNumber);

  useEffect(() => {
    if (showModal) {
      const timer = setTimeout(() => setShowModal(false), 5000);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [showModal]);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching invoice for:", invoiceNumber);

        // Try to find invoice in both collections
        const collections = ["ContractInvoices", "ProformaInvoices"];

        for (const collectionName of collections) {
          try {
            const q = query(
              collection(db, collectionName),
              where("invoiceNumber", "==", invoiceNumber)
            );

            const querySnapshot = await getDocs(q);
            console.log(`Query in ${collectionName}:`, querySnapshot.docs.length, "docs found");

            if (!querySnapshot.empty) {
              const invoiceDoc = querySnapshot.docs[0];
              const invoiceData = {
                id: invoiceDoc.id,
                ...invoiceDoc.data(),
                invoiceType: collectionName === "ProformaInvoices" ? "Proforma Invoice" : "Tax Invoice"
              };
              console.log("Invoice found:", invoiceData);
              setInvoice(invoiceData);
              return;
            }
          } catch (err) {
            console.log(`Error searching in ${collectionName}:`, err);
          }
        }

        // If not found in collections, try direct document ID approach
        const contractDocRef = doc(db, "ContractInvoices", invoiceNumber);
        const proformaDocRef = doc(db, "ProformaInvoices", invoiceNumber);

        try {
          const contractDoc = await getDoc(contractDocRef);
          if (contractDoc.exists()) {
            setInvoice({
              id: contractDoc.id,
              ...contractDoc.data(),
              invoiceType: "Tax Invoice"
            });
            return;
          }
        } catch (err) {
          console.log("Error fetching from ContractInvoices:", err);
        }

        try {
          const proformaDoc = await getDoc(proformaDocRef);
          if (proformaDoc.exists()) {
            setInvoice({
              id: proformaDoc.id,
              ...proformaDoc.data(),
              invoiceType: "Proforma Invoice"
            });
            return;
          }
        } catch (err) {
          console.log("Error fetching from ProformaInvoices:", err);
        }

        setError("Invoice not found");
        console.log("Invoice not found for:", invoiceNumber);

      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError(`Failed to load invoice details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (invoiceNumber) {
      fetchInvoice();
    }
  }, [invoiceNumber]);

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
      console.error("Date parsing error:", error);
      return "Invalid Date";
    }
  };

  const getPaymentAmounts = () => {
    if (!invoice) return { baseAmount: 0, gstAmount: 0, totalAmount: 0 };

    if (invoice.baseAmount !== undefined) {
      return {
        baseAmount: invoice.baseAmount,
        gstAmount: invoice.gstAmount || 0,
        totalAmount: invoice.netPayableAmount || invoice.amountRaised || 0,
      };
    }

    if (!invoice.paymentDetails || invoice.paymentDetails.length === 0) {
      const total =
        invoice.amount || invoice.netPayableAmount || invoice.amountRaised || 0;
      const baseAmount = total / 1.18;
      const gstAmount = total - baseAmount;

      return {
        baseAmount: Math.round(baseAmount),
        gstAmount: Math.round(gstAmount),
        totalAmount: total,
      };
    }

    const payment = invoice.paymentDetails[0];
    return {
      baseAmount: payment.baseAmount || payment.totalAmount / 1.18,
      gstAmount: payment.gstAmount || invoice.gstAmount || 0,
      totalAmount:
        payment.totalAmount ||
        invoice.netPayableAmount ||
        invoice.amountRaised ||
        0,
    };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Invoice Number: {invoiceNumber}</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-6xl mb-4">📄</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Invoice Data</h1>
          <p className="text-gray-600">Unable to load invoice information.</p>
        </div>
      </div>
    );
  }

  const amounts = getPaymentAmounts();
  const amountInWords = convertAmountToWords(amounts.totalAmount);

  if (showModal) {
    return (
      <div className="fixed inset-0  flex items-center justify-center z-50 p-4">
        <div className="bg-transparent backdrop-blur-lg rounded-lg p-6 md:p-8 max-w-md w-full text-center shadow-2xl border border-white/30">
          <div className="mb-4">
            <svg className="w-12 h-12 md:w-16 md:h-16 text-green-600 mx-auto animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Invoice Verified Successfully</h2>
          <p className="text-sm md:text-base text-gray-600 mb-2">You are viewing a verified invoice.</p>
          <p className="text-sm md:text-base text-gray-600 mb-6">
            <strong>Invoice Number:</strong> {invoiceNumber}
          </p>
          <p className="text-xs text-gray-500 mb-4">This window will close automatically in {countdown} {countdown === 1 ? 'second' : 'seconds'}</p>
          <button
            onClick={() => setShowModal(false)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm md:text-base"
          >
            View Full Invoice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified Authentic Invoice
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {invoice.invoiceType || "Invoice"}
            </h1>
            <p className="text-gray-600">Invoice Number: {invoice.invoiceNumber}</p>
            <p className="text-gray-600">Date: {formatDate(invoice.raisedDate || invoice.createdAt)}</p>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Company Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">From</h3>
              <div className="text-sm text-gray-700">
                <p className="font-semibold">Gryphon Academy Pvt. Ltd</p>
                <p>Survey Number 128, Office No 901, Olympia,</p>
                <p>Business House, Baner, Pune, Maharashtra 411045</p>
                <p className="mt-2">
                  <strong>GSTIN:</strong> 27AAJCG8035D1ZM | <strong>PAN:</strong> AAJCG8035D
                </p>
              </div>
            </div>

            {/* Client Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To</h3>
              <div className="text-sm text-gray-700">
                <p className="font-semibold">{invoice.collegeName || "Client Name"}</p>
                <p>{invoice.address || "Client Address"}</p>
                <p className="mt-2">
                  <strong>GSTIN:</strong> {invoice.gstNumber || "Not Available"}
                </p>
                <p>
                  <strong>Place of Supply:</strong> {invoice.state || "Not Available"}
                </p>
              </div>
            </div>
          </div>

          {/* Invoice Table */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">HSN Code</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">
                    <div>
                      <div className="font-semibold">
                        Training Services - {invoice.installment || ""}
                        {invoice.paymentDetails?.[0]?.percentage &&
                          ` (${invoice.paymentDetails[0].percentage}%)`}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {invoice.course || ""} {invoice.year || ""} year
                        {invoice.studentCount && ` for ${invoice.studentCount} students`}
                        {amounts.gstAmount > 0 && ` + 18% GST`}
                      </div>
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-2">999293</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {amounts.baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Amount in Words</h4>
              <p className="text-sm text-gray-700">{amountInWords}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm min-w-[300px]">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-1 font-semibold">Total (Base Amount)</td>
                    <td className="border border-gray-300 px-3 py-1 text-right">
                      ₹{amounts.baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {amounts.gstAmount > 0 && (
                    <>
                      <tr>
                        <td className="border border-gray-300 px-3 py-1 font-semibold">Add: CGST @ 9%</td>
                        <td className="border border-gray-300 px-3 py-1 text-right">
                          ₹{(amounts.gstAmount / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-1 font-semibold">Add: SGST @ 9%</td>
                        <td className="border border-gray-300 px-3 py-1 text-right">
                          ₹{(amounts.gstAmount / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td className="border border-gray-300 px-3 py-1 font-semibold">Grand Total</td>
                    <td className="border border-gray-300 px-3 py-1 text-right font-bold">
                      ₹{amounts.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-600 border-t pt-4">
            <p className="mb-2">
              <strong>Authenticity Verification:</strong> This invoice is digitally verified and hosted on Gryphon Academy's official website.
            </p>
            <p>If you have any questions concerning this invoice, contact us at:</p>
            <p>Website: www.gryphonacademy.co.in | Email: shashi@gryphonacademy.co.in | Phone: +91 7875895160</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicInvoiceDetails;