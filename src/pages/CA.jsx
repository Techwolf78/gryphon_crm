import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import InvoiceModal from "../components/HR/InvoiceModal";

const Register = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
          status: doc.data().status || "pending",
          amount: doc.data().amountRaised || 0,
          registered: doc.data().registered || false,
          approvalStatus: doc.data().approvalStatus || "pending",
          approved: doc.data().approved || false, // ✅ APPROVED FIELD ADD KARO
          collegeAddress: doc.data().collegeAddress || "NA",
          collegeGSTIN: doc.data().collegeGSTIN || "NA",
          collegeState: doc.data().collegeState || "NA",
          description: doc.data().description || "NA",
          additionalDetails: doc.data().additionalDetails || "NA",
          projectCode: doc.data().projectCode || "NA",
        }));

        const allTaxInvoices = data.filter(
          (invoice) => 
            invoice.invoiceType === "Tax Invoice" || 
            invoice.invoiceType === "Cash Invoice" ||
            invoice.invoiceType === undefined
        );
        
        setInvoices(allTaxInvoices);
      } else {
        setInvoices([]);
      }
    } catch {
      // Error fetching invoices - handled through UI error state
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (invoice) => {
    try {
      if (!invoice.id) {
        throw new Error("Invoice ID is missing");
      }

      // ✅ PEHLE CHECK KARO KI INVOICE APPROVED HAI YA NAHI
      if (!invoice.approved) {
        alert("❌ This invoice is not approved yet! Please get approval first.");
        return;
      }

      // Check if invoice is cancelled
      if (invoice.approvalStatus === "cancelled") {
        alert("❌ Cannot register a cancelled invoice!");
        return;
      }

      const invoiceRef = doc(db, "ContractInvoices", invoice.id);
      await updateDoc(invoiceRef, {
        registered: true,
        registeredAt: new Date().toISOString(),
        status: "registered",
      });

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? { ...inv, registered: true, status: "registered" }
            : inv
        )
      );

      alert("✅ Invoice registered successfully!");
    } catch {
      // Error registering invoice - handled through alert
      alert("❌ Error registering invoice: " + error.message);
    }
  };

  const handleView = (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedInvoice(null);
  };

  const getRowBackgroundColor = (invoice) => {
    if (invoice.approvalStatus === "cancelled") {
      return "bg-red-50 border-l-4 border-l-red-400";
    }
    if (invoice.approved) {
      return "bg-green-50 border-l-4 border-l-green-400";
    }
    return "";
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading all invoices...</div>;
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
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">All Invoices</h2>
          <p className="text-sm text-gray-600 mt-1">
            Showing all invoices - Only approved invoices can be registered
          </p>
        </div>
        <button
          onClick={fetchInvoices}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Refresh
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No invoices found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-3 border border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Invoice Number
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  College
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Approval Status
                </th>
                <th className="px-4 py-3 border border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr 
                  key={invoice.id} 
                  className={`hover:bg-gray-100 transition-colors ${getRowBackgroundColor(invoice)}`}
                >
                  <td className="px-4 py-3 border border-gray-200 font-semibold">
                    {invoice.invoiceNumber || "N/A"}
                    {invoice.approvalStatus === "cancelled" && (
                      <span className="ml-2 text-red-600 text-xs">(CANCELLED)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200">
                    {invoice.collegeName || "N/A"}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 font-semibold">
                    ₹{invoice.amount?.toLocaleString() || "0"}
                  </td>
                  <td className="px-4 py-3 border border-gray-200">
                    {/* ✅ APPROVAL STATUS BADGE */}
                    {invoice.approvalStatus === "cancelled" ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                        Cancelled
                      </span>
                    ) : invoice.approved ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        ✓ Approved
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        Pending Approval
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(invoice)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                      >
                        View
                      </button>
                      
                      {/* ✅ REGISTER BUTTON - SIRF APPROVED INVOICES KE LIYE */}
                      {invoice.approvalStatus !== "cancelled" && 
                       !invoice.registered && 
                       invoice.approved && (
                        <button
                          onClick={() => handleRegister(invoice)}
                          className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                        >
                          Register
                        </button>
                      )}
                      
                      {/* ✅ APPROVAL PENDING MESSAGE */}
                      {invoice.approvalStatus !== "cancelled" && 
                       !invoice.registered && 
                       !invoice.approved && (
                        <span className="px-3 py-1 rounded text-sm bg-yellow-100 text-yellow-800 border border-yellow-300">
                          Waiting for Approval
                        </span>
                      )}
                      
                      {invoice.registered && (
                        <span className="px-3 py-1 rounded text-sm bg-green-100 text-green-800 border border-green-300">
                          ✓ Registered
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={closeModal}
          onRegister={handleRegister}
        />
      )}
    </div>
  );
};

export default Register;