// ContractInvoicesTab.js (Updated)
import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import InvoiceModal from "../components/HR/InvoiceModal"; // Naya component import karo

const Register = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collectionInfo, setCollectionInfo] = useState("");
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
          amount:
            doc.data().amountRaised ||
            doc.data().netPayableAmount ||
            doc.data().totalCost ||
            doc.data().amount ||
            0,
          registered: doc.data().registered || false,
          // Naye fields add karo modal ke liye
          collegeAddress: doc.data().collegeAddress || "NA",
          collegeGSTIN: doc.data().collegeGSTIN || "NA",
          collegeState: doc.data().collegeState || "NA",
          description: doc.data().description || "NA",
          additionalDetails: doc.data().additionalDetails || "NA",
          projectCode: doc.data().projectCode || "NA",
        }));

        const taxInvoices = data.filter(
          (invoice) =>
            invoice.invoiceType === "Tax Invoice" ||
            invoice.invoiceType === undefined
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

  const handleRegister = async (invoice) => {
    try {
      if (!invoice.id) {
        throw new Error("Invoice ID is missing");
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
    } catch (error) {
      console.error("Error registering invoice:", error);
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Tax Invoices</h2>
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
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Invoice Number</th>
                <th className="px-4 py-2 border">College</th>
                <th className="px-4 py-2 border">Amount</th>
                <th className="px-4 py-2 border">Status</th>
                <th className="px-4 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border font-semibold">
                    {invoice.invoiceNumber || "N/A"}
                  </td>
                  <td className="px-4 py-2 border">
                    {invoice.collegeName || "N/A"}
                  </td>
                  <td className="px-4 py-2 border font-semibold">
                    ₹{invoice.amount?.toLocaleString() || "0"}
                  </td>
                  <td className="px-4 py-2 border">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        invoice.registered
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {invoice.registered ? "Registered" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-2 border">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(invoice)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                      >
                        View Invoice
                      </button>
                      {!invoice.registered && (
                        <button
                          onClick={() => handleRegister(invoice)}
                          className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                        >
                          Register
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Use the new InvoiceModal component */}
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
