// ViewInvoiceModal.jsx
import React, { useState } from "react";
import InvoiceDetailModal from "./InvoiceDetailModal ";

const ViewInvoiceModal = ({ isOpen, invoiceData, onClose, onDownload, onEdit }) => {
  if (!isOpen || !invoiceData) return null;

  const { contract, invoices } = invoiceData;
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount));
    } catch {
      return `₹${amount}`;
    }
  };

  const getDate = (dateValue) => {
    if (!dateValue) return new Date().toLocaleDateString();
    if (dateValue && typeof dateValue.toDate === 'function') {
      return dateValue.toDate().toLocaleDateString();
    }
    try {
      return new Date(dateValue).toLocaleDateString();
    } catch {
      return new Date().toLocaleDateString();
    }
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleBackToList = () => {
    setSelectedInvoice(null);
  };

  // Agar invoice select kiya hai toh InvoiceDetailModal show karo
  if (selectedInvoice) {
    return (
      <InvoiceDetailModal
        invoice={selectedInvoice}
        contract={contract}
        onClose={onClose}
        onBack={handleBackToList}
        onDownload={onDownload}
        onEdit={onEdit}
      />
    );
  }

  // Main List View
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-40">
      <div className="relative bg-white p-8 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
        >
          <i className="fas fa-times"></i>
        </button>
        
        <h2 className="text-2xl font-bold mb-6">Invoices for {contract.collegeName || "Contract"}</h2>
        
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No invoices generated yet for this contract.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice, index) => (
              <div key={invoice.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800">
                      Invoice: {invoice.invoiceNumber || `INV-${index + 1}`}
                    </h3>
                    <p className="text-gray-600">Date: {getDate(invoice.raisedDate)}</p>
                    <p className="text-gray-600">Installment: {invoice.installment}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    invoice.status === 'approved' ? 'bg-green-100 text-green-800' : 
                    invoice.status === 'raised' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {invoice.status || 'draft'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="font-semibold">Amount:</p>
                    <p className="text-green-600 font-bold">
                      {formatCurrency(invoice.amountRaised || invoice.netPayableAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">Payment Type:</p>
                    <p>{invoice.paymentType}</p>
                  </div>
                </div>
                
                {/* REMOVED DOWNLOAD AND EDIT BUTTONS FROM MAIN LIST VIEW */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewInvoice(invoice)}
                    className="flex items-center bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded text-xs"
                    title="View Invoice Details"
                  >
                    <i className="fas fa-eye mr-1"></i> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewInvoiceModal;