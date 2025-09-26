import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import InvoiceModal from "./InvoiceModal";

const ContractInvoicesTab = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

      if (snapshot.docs.length > 0) {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          receivedAmount: doc.data().receivedAmount || 0,
          dueAmount: doc.data().dueAmount || 0,
          paymentHistory: doc.data().paymentHistory || [],
          status: doc.data().status || "pending",
          approvalStatus: doc.data().approvalStatus || "pending", // ✅ APPROVAL STATUS
          approved: doc.data().approved || false, // ✅ APPROVED FIELD ADD KARO
        }));

        const taxInvoices = data.filter(
          (invoice) => invoice.invoiceType === "Tax Invoice"
        );
        setInvoices(taxInvoices);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ APPROVE INVOICE FUNCTION
  const handleApproveInvoice = async (invoice) => {
    try {
      const invoiceRef = doc(db, "ContractInvoices", invoice.id);
      await updateDoc(invoiceRef, {
        approved: true,
        approvedAt: new Date().toISOString(),
        approvedBy: "Admin", // Tum isme current user ka name daal sakte ho
        approvalStatus: "approved",
      });

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? { ...inv, approved: true, approvalStatus: "approved" }
            : inv
        )
      );

      alert("✅ Invoice approved successfully!");
    } catch (error) {
      console.error("Error approving invoice:", error);
      alert("❌ Error approving invoice: " + error.message);
    }
  };

  // Cancel Invoice
  const handleCancelInvoice = async (invoice) => {
    try {
      const invoiceRef = doc(db, "ContractInvoices", invoice.id);
      await updateDoc(invoiceRef, {
        approvalStatus: "cancelled",
        cancelledAt: new Date().toISOString(),
        status: "cancelled",
        approved: false, // ✅ CANCEL HONE PAR APPROVED FALSE HO JAYEGA
      });

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? { 
                ...inv, 
                approvalStatus: "cancelled", 
                status: "cancelled",
                approved: false 
              }
            : inv
        )
      );

      alert("❌ Invoice cancelled successfully!");
    } catch (error) {
      console.error("Error cancelling invoice:", error);
      alert("❌ Error cancelling invoice: " + error.message);
    }
  };

  // Payment receive function
  const handleReceivePayment = async (invoice, receivedAmount) => {
    try {
      if (!receivedAmount || receivedAmount <= 0) {
        alert("Please enter valid amount");
        return;
      }

      if (receivedAmount > invoice.dueAmount) {
        alert(`Received amount cannot be more than due amount (₹${invoice.dueAmount})`);
        return;
      }

      const invoiceRef = doc(db, "ContractInvoices", invoice.id);
      const newReceivedAmount = (invoice.receivedAmount || 0) + parseFloat(receivedAmount);
      const newDueAmount = invoice.dueAmount - parseFloat(receivedAmount);

      const paymentRecord = {
        amount: parseFloat(receivedAmount),
        date: new Date().toISOString(),
        timestamp: new Date(),
      };

      let newStatus = invoice.status;
      if (newDueAmount === 0) {
        newStatus = "received";
      } else if (newReceivedAmount > 0) {
        newStatus = "partially_received";
      }

      const updateData = {
        receivedAmount: newReceivedAmount,
        dueAmount: newDueAmount,
        paymentHistory: [...(invoice.paymentHistory || []), paymentRecord],
        status: newStatus,
      };

      await updateDoc(invoiceRef, updateData);

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

  const handleViewInvoice = (invoice) => {
    setInvoiceModal({
      isOpen: true,
      invoice: invoice,
      isViewOnly: true,
    });
  };

  // ✅ UPDATED STATUS BADGES - APPROVAL STATUS BHI SHOW KARO
  const getStatusBadge = (invoice) => {
    const status = invoice.status;
    const approvalStatus = invoice.approvalStatus;

    // Pehle approval status check karo
    if (approvalStatus === "cancelled") {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
          Cancelled
        </span>
      );
    } else if (invoice.approved) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          Approved
        </span>
      );
    } else if (approvalStatus === "pending") {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
          Pending Approval
        </span>
      );
    }

    // Fir payment status check karo
    if (status === "received") {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
          Received
        </span>
      );
    } else if (status === "partially_received") {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
          Partially Received
        </span>
      );
    } else if (status === "registered") {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
          Registered
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
          Pending
        </span>
      );
    }
  };

  // Payment Modal Component
  const PaymentModal = ({ invoice, onClose, onSubmit }) => {
    const [amount, setAmount] = useState("");
    const dueAmount = invoice.dueAmount || 0;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-96">
          <h3 className="text-lg font-semibold mb-4">Receive Payment</h3>
          <div className="mb-4">
            <p><strong>Invoice:</strong> {invoice.invoiceNumber}</p>
            <p><strong>College:</strong> {invoice.collegeName}</p>
            <p><strong>Total Amount:</strong> ₹{invoice.amountRaised?.toLocaleString()}</p>
            <p><strong>Due Amount:</strong> ₹{dueAmount.toLocaleString()}</p>
            {invoice.receivedAmount > 0 && (
              <p><strong>Already Received:</strong> ₹{invoice.receivedAmount.toLocaleString()}</p>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Amount Received *</label>
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
            <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
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
        <button onClick={fetchInvoices} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Tax Invoices - Approval & Payment Tracking</h2>

      {invoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No tax invoices found.</div>
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
                <th className="px-4 py-2 border">Approval Actions</th>
                <th className="px-4 py-2 border">Payment Actions</th>
                <th className="px-4 py-2 border">View Invoice</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const totalAmount = invoice.amountRaised || 0;
                const receivedAmount = invoice.receivedAmount || 0;
                const dueAmount = invoice.dueAmount || totalAmount - receivedAmount;
                const isFullyPaid = dueAmount === 0;
                const isApproved = invoice.approved;

                return (
                  <tr key={invoice.id}>
                    <td className="px-4 py-2 border font-semibold">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-2 border">{invoice.collegeName}</td>
                    <td className="px-4 py-2 border">₹{totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-2 border">
                      <span className={receivedAmount > 0 ? "text-green-600" : "text-gray-600"}>
                        ₹{receivedAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2 border">
                      <span className={dueAmount > 0 ? "text-red-600" : "text-green-600"}>
                        ₹{dueAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2 border">
                      {getStatusBadge(invoice)}
                    </td>
                    <td className="px-4 py-2 border">
                      <div className="flex flex-col gap-1">
                        {/* ✅ APPROVE BUTTON - SIRF JAB APPROVED NA HO AUR CANCELLED NA HO */}
                        {!isApproved && invoice.approvalStatus !== "cancelled" && (
                          <button
                            onClick={() => handleApproveInvoice(invoice)}
                            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                          >
                            Approve
                          </button>
                        )}
                        
                        {/* ✅ CANCEL BUTTON - SIRF JAB CANCELLED NA HO */}
                        {invoice.approvalStatus !== "cancelled" && (
                          <button
                            onClick={() => handleCancelInvoice(invoice)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                          >
                            Cancel
                          </button>
                        )}
                        
                        {invoice.approvalStatus === "cancelled" && (
                          <span className="text-red-600 text-xs font-semibold">✗ Cancelled</span>
                        )}
                        
                        {isApproved && (
                          <span className="text-green-600 text-xs font-semibold">✓ Approved</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 border">
                      {/* ✅ PAYMENT ACTIONS - SIRF APPROVED INVOICES KE LIYE */}
                      {isApproved && !isFullyPaid ? (
                        <button
                          onClick={() => setPaymentModal({ isOpen: true, invoice })}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Receivable
                        </button>
                      ) : isApproved && isFullyPaid ? (
                        <span className="text-green-600 text-xs font-semibold">Received</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Approve First</span>
                      )}

                      {invoice.paymentHistory?.length > 0 && (
                        <button
                          onClick={() => {
                            const history = invoice.paymentHistory
                              .map((p) => `₹${p.amount} on ${new Date(p.date).toLocaleDateString()}`)
                              .join("\n");
                            alert(`Payment History:\n${history}`);
                          }}
                          className="ml-2 px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
                        >
                          History
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2 border">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-xs"
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

      {paymentModal.isOpen && (
        <PaymentModal
          invoice={paymentModal.invoice}
          onClose={() => setPaymentModal({ isOpen: false, invoice: null })}
          onSubmit={handleReceivePayment}
        />
      )}

      {invoiceModal.isOpen && (
        <InvoiceModal
          invoice={invoiceModal.invoice}
          onClose={() => setInvoiceModal({ isOpen: false, invoice: null, isViewOnly: true })}
          onRegister={() => {}}
          isViewOnly={invoiceModal.isViewOnly}
        />
      )}
    </div>
  );
};

export default ContractInvoicesTab;