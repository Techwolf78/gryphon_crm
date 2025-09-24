import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  where,
  query,
} from "firebase/firestore";
import { db } from "../../firebase";
import InvoiceModal from "./InvoiceModal"; // Import the InvoiceModal

const ContractInvoicesTab = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collectionInfo, setCollectionInfo] = useState("");
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    invoice: null,
  });
  const [invoiceModal, setInvoiceModal] = useState({
    isOpen: false,
    invoice: null,
    isViewOnly: true,
  });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      const contractsRef = collection(db, "ContractInvoices");
      const snapshot = await getDocs(contractsRef);

      if (snapshot.docs.length === 0) {
        // Alternative collections check
        const alternativeCollections = [
          "invoices",
          "contracts",
          "ContractInvoices",
          "contract_invoices",
        ];

        for (const colName of alternativeCollections) {
          try {
            const altRef = collection(db, colName);
            const altSnapshot = await getDocs(altRef);
            if (altSnapshot.docs.length > 0) {
              const data = altSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                // Payment tracking fields
                receivedAmount: doc.data().receivedAmount || 0,
                dueAmount:
                  doc.data().dueAmount ||
                  doc.data().amountRaised ||
                  doc.data().netPayableAmount ||
                  doc.data().totalCost ||
                  0,
                paymentHistory: doc.data().paymentHistory || [],
                status: doc.data().status || "registered",
              }));

              const taxInvoices = data.filter(
                (invoice) => invoice.invoiceType === "Tax Invoice"
              );
              setInvoices(taxInvoices);
              return;
            }
          } catch (altError) {
            // Error accessing collection
          }
        }
      } else {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          receivedAmount: doc.data().receivedAmount || 0,
          dueAmount:
            doc.data().dueAmount ||
            doc.data().amountRaised ||
            doc.data().netPayableAmount ||
            doc.data().totalCost ||
            0,
          paymentHistory: doc.data().paymentHistory || [],
          status: doc.data().status || "registered",
        }));

        const taxInvoices = data.filter(
          (invoice) => invoice.invoiceType === "Tax Invoice"
        );
        setInvoices(taxInvoices);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Amount receive karne ka function
  const handleReceivePayment = async (invoice, receivedAmount) => {
    try {
      if (!receivedAmount || receivedAmount <= 0) {
        alert("Please enter valid amount");
        return;
      }

      if (receivedAmount > invoice.dueAmount) {
        alert(
          `Received amount cannot be more than due amount (₹${invoice.dueAmount})`
        );
        return;
      }

      const invoiceRef = doc(db, "ContractInvoices", invoice.id);
      const newReceivedAmount =
        (invoice.receivedAmount || 0) + parseFloat(receivedAmount);
      const newDueAmount = invoice.dueAmount - parseFloat(receivedAmount);

      const paymentRecord = {
        amount: parseFloat(receivedAmount),
        date: new Date().toISOString(),
        timestamp: new Date(),
      };

      const updateData = {
        receivedAmount: newReceivedAmount,
        dueAmount: newDueAmount,
        paymentHistory: [...(invoice.paymentHistory || []), paymentRecord],
        status: newDueAmount === 0 ? "received" : "partially_received",
      };

      await updateDoc(invoiceRef, updateData);

      // Local state update
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id ? { ...inv, ...updateData } : inv
        )
      );

      setPaymentModal({ isOpen: false, invoice: null });
      alert(`Payment of ₹${receivedAmount} recorded successfully!`);
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Error recording payment: " + error.message);
    }
  };

  // Invoice view handle karna
  const handleViewInvoice = (invoice) => {
    setInvoiceModal({
      isOpen: true,
      invoice: invoice,
      isViewOnly: true,
    });
  };

  // Invoice register handle karna
  const handleRegisterInvoice = (invoice) => {
    // Yahan aap register ka logic add kar sakte hain
    alert(`Invoice ${invoice.invoiceNumber} registered successfully!`);
  };

  // Status badges with new statuses
  const getStatusBadge = (invoice) => {
    const status = invoice.status;
    const dueAmount = invoice.dueAmount || 0;
    const receivedAmount = invoice.receivedAmount || 0;
    const totalAmount =
      invoice.amountRaised ||
      invoice.netPayableAmount ||
      invoice.totalCost ||
      0;

    if (status === "received" || dueAmount === 0) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          Received
        </span>
      );
    } else if (status === "partially_received" || receivedAmount > 0) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
          Partially Received
        </span>
      );
    } else if (status === "registered") {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
          Registered
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
          {status}
        </span>
      );
    }
  };

  // Payment Modal Component
  const PaymentModal = ({ invoice, onClose, onSubmit }) => {
    const [amount, setAmount] = useState("");
    const dueAmount =
      invoice.dueAmount ||
      invoice.amountRaised ||
      invoice.netPayableAmount ||
      invoice.totalCost ||
      0;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-96">
          <h3 className="text-lg font-semibold mb-4">Receive Payment</h3>

          <div className="mb-4">
            <p>
              <strong>Invoice:</strong> {invoice.invoiceNumber}
            </p>
            <p>
              <strong>College:</strong> {invoice.collegeName}
            </p>
            <p>
              <strong>Total Amount:</strong> ₹
              {invoice.amountRaised?.toLocaleString()}
            </p>
            <p>
              <strong>Due Amount:</strong> ₹{dueAmount.toLocaleString()}
            </p>
            {invoice.receivedAmount > 0 && (
              <p>
                <strong>Already Received:</strong> ₹
                {invoice.receivedAmount.toLocaleString()}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Amount Received *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter amount (max ₹${dueAmount})`}
              className="w-full p-2 border rounded"
              max={dueAmount}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button
              onClick={() => onSubmit(invoice, amount)}
              className="px-4 py-2 bg-green-500 text-white rounded"
              disabled={!amount || amount <= 0}
            >
              Record Payment
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading invoices...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
        <button
          onClick={fetchInvoices}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">
        Tax Invoices - Payment Tracking
      </h2>

      {invoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No tax invoices found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Invoice Number</th>
                <th className="px-4 py-2 border">College</th>
                <th className="px-4 py-2 border">Total Amount</th>
                <th className="px-4 py-2 border">Received Amount</th>
                <th className="px-4 py-2 border">Due Amount</th>
                <th className="px-4 py-2 border">Status</th>
                <th className="px-4 py-2 border">Payment Actions</th>
                <th className="px-4 py-2 border">View Invoice</th> {/* New Column */}
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const totalAmount =
                  invoice.amountRaised ||
                  invoice.netPayableAmount ||
                  invoice.totalCost ||
                  0;
                const receivedAmount = invoice.receivedAmount || 0;
                const dueAmount =
                  invoice.dueAmount || totalAmount - receivedAmount;
                const isFullyPaid = dueAmount === 0;

                return (
                  <tr key={invoice.id}>
                    <td className="px-4 py-2 border">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-2 border">{invoice.collegeName}</td>
                    <td className="px-4 py-2 border">
                      ₹{totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 border">
                      <span
                        className={
                          receivedAmount > 0
                            ? "text-green-600"
                            : "text-gray-600"
                        }
                      >
                        ₹{receivedAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2 border">
                      <span
                        className={
                          dueAmount > 0 ? "text-red-600" : "text-green-600"
                        }
                      >
                        ₹{dueAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2 border">
                      {getStatusBadge(invoice)}
                    </td>
                    <td className="px-4 py-2 border">
                      <button
                        onClick={() =>
                          setPaymentModal({ isOpen: true, invoice })
                        }
                        className={`px-3 py-1 rounded text-white ${
                          !invoice.registered
                            ? "bg-gray-400 cursor-not-allowed"
                            : isFullyPaid
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600"
                        }`}
                        disabled={!invoice.registered || isFullyPaid}
                      >
                        {!invoice.registered
                          ? "Not Registered"
                          : isFullyPaid
                          ? "Received"
                          : "Receivable"}
                      </button>

                      {/* Payment History Button */}
                      {invoice.paymentHistory?.length > 0 && (
                        <button
                          onClick={() => {
                            const history = invoice.paymentHistory
                              .map(
                                (p) =>
                                  `₹${p.amount} on ${new Date(
                                    p.date
                                  ).toLocaleDateString()}`
                              )
                              .join("\n");
                            alert(`Payment History:\n${history}`);
                          }}
                          className="ml-2 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          History
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2 border">
                      {/* View Invoice Button */}
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal.isOpen && (
        <PaymentModal
          invoice={paymentModal.invoice}
          onClose={() => setPaymentModal({ isOpen: false, invoice: null })}
          onSubmit={handleReceivePayment}
        />
      )}

      {/* Invoice Modal */}
      {invoiceModal.isOpen && (
        <InvoiceModal
          invoice={invoiceModal.invoice}
          onClose={() => setInvoiceModal({ isOpen: false, invoice: null, isViewOnly: true })}
          onRegister={handleRegisterInvoice}
          isViewOnly={invoiceModal.isViewOnly}
        />
      )}
    </div>
  );
};

export default ContractInvoicesTab;