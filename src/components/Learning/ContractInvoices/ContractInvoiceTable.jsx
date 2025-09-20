import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc,  } from "firebase/firestore";
import { db } from "../../../firebase";
import RaiseInvoiceModal from "./RaiseInvoiceModal";
import ViewInvoiceModal from "./ViewInvoiceModal";

export default function ContractInvoiceTable() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);
  const [paymentType, setPaymentType] = useState("");
  const [existingInvoices, setExistingInvoices] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching contract invoices...");

        // Fetch training forms
        const trainingFormsQuery = query(
          collection(db, "trainingForms"),
          orderBy("createdAt", "desc")
        );
        const trainingFormsSnapshot = await getDocs(trainingFormsQuery);
        
        const trainingFormsData = trainingFormsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch existing invoices to check what's already been generated
        const invoicesQuery = query(collection(db, "ContractInvoices"));
        const invoicesSnapshot = await getDocs(invoicesQuery);
        
        const invoicesData = invoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setExistingInvoices(invoicesData);
        setInvoices(trainingFormsData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount));
    } catch {
      return `₹${amount}`;
    }
  };

  const generateInvoiceNumber = (paymentType, installment) => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `INV-${paymentType}-${installment || 'MAIN'}-${timestamp}-${random}`;
  };

const getNextInstallment = (invoice) => {
  if (!invoice || !invoice.paymentDetails) return null;
  
  // Get all existing invoices for this contract
  const contractInvoices = existingInvoices.filter(
    inv => inv.originalInvoiceId === invoice.id
  );
  
  // Find the first installment that hasn't been generated yet
  const availableInstallment = invoice.paymentDetails.find(payment => {
    return !contractInvoices.some(inv => inv.installment === payment.name);
  });
  
return availableInstallment ? availableInstallment.name : null;};
  const handleRaiseInvoice = (invoice) => {
    const nextInstallment = getNextInstallment(invoice);
    
    if (!nextInstallment) {
      alert(`All installments for this contract have already been generated.`);
      return;
    }
    
    setSelectedInvoice(invoice);
    setPaymentType(invoice.paymentType);
    setShowModal(true);
  };

  const handleViewInvoice = (invoice) => {
    // Get all invoices for this contract to show in view modal
    const contractInvoices = existingInvoices.filter(
      inv => inv.originalInvoiceId === invoice.id
    );
    
    setViewInvoice({
      contract: invoice,
      invoices: contractInvoices
    });
  };

const handleEditInvoice = (invoice) => {
  // Pehle original contract (trainingForm) find karo
  const originalContract = invoices.find(inv => inv.id === invoice.originalInvoiceId);
  
  if (originalContract) {
    setEditInvoice({
      ...invoice,
      // Original contract data add karo
      ...originalContract
    });
    setPaymentType(invoice.paymentType);
    setShowModal(true);
  } else {
    alert("Original contract not found!");
  }
};

// ContractInvoiceTable.js mein handleDownloadInvoice function ko update karo
const handleDownloadInvoice = (invoice) => {
  // Create a printable HTML content
  const invoiceContent = `
    <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber || invoice.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .invoice-header { text-align: center; margin-bottom: 20px; }
          .invoice-details { margin-bottom: 20px; }
          .invoice-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .invoice-table th { background-color: #f2f2f2; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <h1>INVOICE</h1>
          <h2>${invoice.invoiceNumber || 'N/A'}</h2>
        </div>
        
        <div class="invoice-details">
          <p><strong>Date:</strong> ${new Date(invoice.raisedDate?.toDate?.() || invoice.raisedDate || new Date()).toLocaleDateString()}</p>
          <p><strong>College:</strong> ${invoice.collegeName || 'N/A'}</p>
          <p><strong>Project Code:</strong> ${invoice.projectCode || 'N/A'}</p>
          <p><strong>Installment:</strong> ${invoice.installment || 'N/A'}</p>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${invoice.installment || 'Invoice'} Amount</td>
              <td>${formatCurrency(invoice.amountRaised || invoice.netPayableAmount)}</td>
            </tr>
            <tr>
              <td>GST (${invoice.gstType || 'N/A'})</td>
              <td>${formatCurrency(invoice.gstAmount)}</td>
            </tr>
            <tr class="total-row">
              <td>Total Amount</td>
              <td>${formatCurrency((invoice.amountRaised || invoice.netPayableAmount) + (invoice.gstAmount || 0))}</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(invoiceContent);
  printWindow.document.close();
  
  // Print dialog automatically open karega
  printWindow.print();
};
  const handleApproveInvoice = async (invoice) => {
    try {
      const invoiceRef = doc(db, "trainingForms", invoice.id);
      await updateDoc(invoiceRef, {
        status: 'approved'
      });
      
      // Update local state
      setInvoices(prevInvoices => 
        prevInvoices.map(inv => 
          inv.id === invoice.id ? {...inv, status: 'approved'} : inv
        )
      );
      
      alert("Invoice approved successfully!");
    } catch (err) {
      console.error("Error approving invoice:", err);
      alert("Failed to approve invoice. Please try again.");
    }
  };

const handleSubmit = async (formData, invoice,isEdit) => {
  if (!invoice) return;
  
  try {
    if (isEdit) {
      // Edit mode - existing invoice update karo
      const invoiceRef = doc(db, "ContractInvoices", invoice.id);
      await updateDoc(invoiceRef, {
        ...formData,
        updatedDate: new Date()
      });
      
      // Update local state
      setExistingInvoices(prev => 
        prev.map(inv => 
          inv.id === invoice.id ? {...inv, ...formData} : inv
        )
      );
      
      alert("Invoice updated successfully!");
    } else {
      // Create mode - naya invoice banao
      const invoiceNumber = generateInvoiceNumber(formData.paymentType, formData.installment);
      
      // Find the selected installment details
      const selectedInstallment = invoice.paymentDetails.find(p => p.name === formData.installment);
      
      const invoiceData = {
        ...formData,
        invoiceNumber,
        raisedDate: new Date(),
        status: 'raised',
        originalInvoiceId: invoice.id,
        projectCode: invoice.projectCode,
        collegeName: invoice.collegeName,
        collegeCode: invoice.collegeCode,
        course: invoice.course,
        year: invoice.year,
        deliveryType: invoice.deliveryType,
        passingYear: invoice.passingYear,
        studentCount: invoice.studentCount,
        perStudentCost: invoice.perStudentCost,
        totalCost: invoice.totalCost,
        netPayableAmount: selectedInstallment ? selectedInstallment.totalAmount : invoice.netPayableAmount,
        gstNumber: invoice.gstNumber,
        gstType: invoice.gstType,
        gstAmount: selectedInstallment ? selectedInstallment.gstAmount : invoice.gstAmount,
        tpoName: invoice.tpoName,
        tpoEmail: invoice.tpoEmail,
        tpoPhone: invoice.tpoPhone,
        address: invoice.address,
        city: invoice.city,
        state: invoice.state,
        pincode: invoice.pincode,
        paymentDetails: invoice.paymentDetails,
        contractStartDate: invoice.contractStartDate,
        contractEndDate: invoice.contractEndDate
      };
      
      // Create a new invoice document for the installment
      await addDoc(collection(db, "ContractInvoices"), invoiceData);
      
      // Update existing invoices list
      const newInvoice = { id: `${Date.now()}`, ...invoiceData };
      setExistingInvoices(prev => [...prev, newInvoice]);
      
      alert(`Invoice ${invoiceNumber} raised successfully!`);
    }
    
    setShowModal(false);
    setSelectedInvoice(null);
    setEditInvoice(null);
    setPaymentType("");
    
  } catch (err) {
    console.error("Error processing invoice:", err);
    alert(`Failed to ${isEdit ? 'update' : 'raise'} invoice. Please try again.`);
  }
};
  const getPaymentTypeName = (type) => {
    switch(type) {
      case "AT": return "AT";
      case "ATP": return "ATP";
      case "ATTP": return "ATTP";
      case "ATTT": return "ATTT";
      case "EMI": return "EMI";
      default: return type || "N/A";
    }
  };
const getPaymentInstallmentCount = (paymentType, paymentDetails) => {
  // Always use actual paymentDetails length from Firebase
  if (paymentDetails && Array.isArray(paymentDetails)) {
    return paymentDetails.length;
  }
  
  // Fallback only if paymentDetails is not available
  switch(paymentType) {
    case "AT": return 2;
    case "ATP": return 3;
    case "ATTP": return 4;
    case "ATTT": return 4;
    case "EMI": return 12;
    default: return 1;
  }
};

const getGeneratedInvoicesDisplay = (contractInvoices, invoice) => {
  const totalInstallments = getPaymentInstallmentCount(invoice.paymentType, invoice.paymentDetails);
  const generatedCount = contractInvoices.length;
  
  return `${generatedCount}/${totalInstallments}`;
};
  const getInstallmentName = (installment) => {
    if (!installment) return "N/A";
    
    // Convert installment name to short form
    const shortForms = {
      "Advance": "A",
      "Tax": "T",
      "Payment": "P",
      "Installment": "I"
    };
    
    // Split the installment name and get first letters
    return installment
      .split(" ")
      .map(word => shortForms[word] || word.charAt(0))
      .join("");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Contract Invoices</h2>
        <p className="text-gray-600 mt-1">Manage and view contract invoices</p>
      </div>

      <div className="p-6">
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No contract invoices</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first contract invoice.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
           <table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Project Code
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        College
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Payment Type
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Students Count
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Per Student Cost
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Total Amount
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Generated Invoices
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Actions
      </th>
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    {invoices.map((invoice) => {
      const contractInvoices = existingInvoices.filter(
        inv => inv.originalInvoiceId === invoice.id
      );
      
      const nextInstallment = getNextInstallment(invoice);
      
      return (
        <React.Fragment key={invoice.id}>
          <tr className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {invoice.projectCode || invoice.id}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {invoice.collegeName || invoice.collegeCode || "N/A"}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
              {getPaymentTypeName(invoice.paymentType)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {invoice.studentCount || "N/A"}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
              {formatCurrency(invoice.perStudentCost)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
              {formatCurrency(invoice.netPayableAmount || invoice.totalCost)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  {contractInvoices.length > 0 ? (
    <div className="flex items-center gap-2">
      <span className="bg-blue-100 text-blue-800 text-xs font-semibold py-1 px-2 rounded">
        {getGeneratedInvoicesDisplay(contractInvoices, invoice)}
      </span>
    
    </div>
  ) : (
<span className="text-gray-400">0/{getPaymentInstallmentCount(invoice.paymentType, invoice.paymentDetails)}</span>  )}
</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex space-x-2">
              <button
                onClick={() => handleRaiseInvoice(invoice)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
                disabled={!nextInstallment}
                title={nextInstallment ? `Generate ${nextInstallment} Invoice` : 'All invoices generated'}
              >
                {nextInstallment ? `Generate ${getInstallmentName(nextInstallment)}` : 'All Generated'}
              </button>
              <button
                onClick={() => handleViewInvoice(invoice)}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs"
                title="View All Invoices"
              >
                <i className="fas fa-eye"></i> View
              </button>
            </td>
          </tr>
        </React.Fragment>
      );
    })}
  </tbody>
</table>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      <RaiseInvoiceModal
        isOpen={showModal}
        invoice={selectedInvoice || editInvoice}
        paymentType={paymentType}
        existingInvoices={existingInvoices}
        onClose={() => {
          setShowModal(false);
          setSelectedInvoice(null);
          setEditInvoice(null);
          setPaymentType("");
        }}
  onSubmit={(formData, invoice) => handleSubmit(formData, invoice, !!editInvoice)} // <--- pass isEdit
        isEdit={!!editInvoice}
      />

      {/* View Invoice Modal */}
     <ViewInvoiceModal
  isOpen={!!viewInvoice}
  invoiceData={viewInvoice}
  onClose={() => setViewInvoice(null)}
  onDownload={handleDownloadInvoice}
  onEdit={handleEditInvoice}
/>
    </div>
  );
}