import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import RaiseInvoiceModal from "./RaiseInvoiceModal";
import InvoiceDetailModal from "./InvoiceDetailModal";

export default function ContractInvoiceTable() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);
  const [paymentType, setPaymentType] = useState("");
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);

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

        const trainingFormsData = trainingFormsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch existing invoices to check what's already been generated
        const invoicesQuery = query(collection(db, "ContractInvoices"));
        const invoicesSnapshot = await getDocs(invoicesQuery);

        const invoicesData = invoicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
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
    if (!amount && amount !== 0) return "-";
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(Number(amount));
    } catch {
      return `₹${amount}`;
    }
  };

  const getDate = (dateValue) => {
    if (!dateValue) return new Date().toLocaleDateString();
    if (dateValue && typeof dateValue.toDate === "function") {
      return dateValue.toDate().toLocaleDateString();
    }
    try {
      return new Date(dateValue).toLocaleDateString();
    } catch {
      return new Date().toLocaleDateString();
    }
  };

  const toggleExpand = (id) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const generateInvoiceNumber = (paymentType, installment) => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `INV-${paymentType}-${installment || "MAIN"}-${timestamp}-${random}`;
  };

  const getNextInstallment = (invoice) => {
    if (!invoice || !invoice.paymentDetails) return null;

    // Get all existing invoices for this contract
    const contractInvoices = existingInvoices.filter(
      (inv) => inv.originalInvoiceId === invoice.id
    );

    // Find the first installment that hasn't been generated yet
    const availableInstallment = invoice.paymentDetails.find((payment) => {
      return !contractInvoices.some((inv) => inv.installment === payment.name);
    });

    return availableInstallment ? availableInstallment.name : null;
  };

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

  const handleEditInvoice = (invoice) => {
    // Find the original contract for this invoice
    const originalContract = invoices.find(
      (inv) => inv.id === invoice.originalInvoiceId
    );
    setSelectedInvoiceDetail({
      invoice,
      contract: originalContract,
      initialEditMode: true,
    });
  };

  const handleViewInvoiceDetail = (invoice) => {
    // Find the original contract for this invoice
    const originalContract = invoices.find(
      (inv) => inv.id === invoice.originalInvoiceId
    );
    setSelectedInvoiceDetail({
      invoice,
      contract: originalContract,
      initialEditMode: false,
    });
  };

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
            <h2>${invoice.invoiceNumber || "N/A"}</h2>
          </div>
          
          <div class="invoice-details">
            <p><strong>Date:</strong> ${new Date(
              invoice.raisedDate?.toDate?.() || invoice.raisedDate || new Date()
            ).toLocaleDateString()}</p>
            <p><strong>College:</strong> ${invoice.collegeName || "N/A"}</p>
            <p><strong>Project Code:</strong> ${
              invoice.projectCode || "N/A"
            }</p>
            <p><strong>Installment:</strong> ${invoice.installment || "N/A"}</p>
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
                <td>${invoice.installment || "Invoice"} Amount</td>
                <td>${formatCurrency(
                  invoice.amountRaised || invoice.netPayableAmount
                )}</td>
              </tr>
              <tr>
                <td>GST (${invoice.gstType || "N/A"})</td>
                <td>${formatCurrency(invoice.gstAmount)}</td>
              </tr>
              <tr class="total-row">
                <td>Total Amount</td>
                <td>${formatCurrency(
                  (invoice.amountRaised || invoice.netPayableAmount) +
                    (invoice.gstAmount || 0)
                )}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(invoiceContent);
    printWindow.document.close();

    // Print dialog automatically open karega
    printWindow.print();
  };

  const handleApproveInvoice = async (invoice) => {
    try {
      const invoiceRef = doc(db, "trainingForms", invoice.id);
      await updateDoc(invoiceRef, {
        status: "approved",
      });

      // Update local state
      setInvoices((prevInvoices) =>
        prevInvoices.map((inv) =>
          inv.id === invoice.id ? { ...inv, status: "approved" } : inv
        )
      );

      alert("Invoice approved successfully!");
    } catch (err) {
      console.error("Error approving invoice:", err);
      alert("Failed to approve invoice. Please try again.");
    }
  };

  const handleSubmit = async (formData, invoice, isEdit) => {
    if (!invoice) return;

    try {
      if (isEdit) {
        // Edit mode - existing invoice update karo
        const invoiceRef = doc(db, "ContractInvoices", invoice.id);
        await updateDoc(invoiceRef, {
          ...formData,
          updatedDate: new Date(),
        });

        // Update local state
        setExistingInvoices((prev) =>
          prev.map((inv) =>
            inv.id === invoice.id ? { ...inv, ...formData } : inv
          )
        );

        alert("Invoice updated successfully!");
      } else {
        // Create mode - naya invoice banao
        const invoiceNumber = generateInvoiceNumber(
          formData.paymentType,
          formData.installment
        );

        // Find the selected installment details
        const selectedInstallment = invoice.paymentDetails.find(
          (p) => p.name === formData.installment
        );

        const invoiceData = {
          ...formData,
          invoiceNumber,
          raisedDate: new Date(),
          status: "raised",
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
          netPayableAmount: selectedInstallment
            ? selectedInstallment.totalAmount
            : invoice.netPayableAmount,
          gstNumber: invoice.gstNumber,
          gstType: invoice.gstType,
          gstAmount: selectedInstallment
            ? selectedInstallment.gstAmount
            : invoice.gstAmount,
          tpoName: invoice.tpoName,
          tpoEmail: invoice.tpoEmail,
          tpoPhone: invoice.tpoPhone,
          address: invoice.address,
          city: invoice.city,
          state: invoice.state,
          pincode: invoice.pincode,
          paymentDetails: invoice.paymentDetails,
          contractStartDate: invoice.contractStartDate,
          contractEndDate: invoice.contractEndDate,
        };

        // Create a new invoice document for the installment
        await addDoc(collection(db, "ContractInvoices"), invoiceData);

        // Update existing invoices list
        const newInvoice = { id: `${Date.now()}`, ...invoiceData };
        setExistingInvoices((prev) => [...prev, newInvoice]);

        alert(`Invoice ${invoiceNumber} raised successfully!`);
      }

      setShowModal(false);
      setSelectedInvoice(null);
      setEditInvoice(null);
      setPaymentType("");
    } catch (err) {
      console.error("Error processing invoice:", err);
      alert(
        `Failed to ${isEdit ? "update" : "raise"} invoice. Please try again.`
      );
    }
  };

  const getPaymentTypeName = (type) => {
    switch (type) {
      case "AT":
        return "AT";
      case "ATP":
        return "ATP";
      case "ATTP":
        return "ATTP";
      case "ATTT":
        return "ATTT";
      case "EMI":
        return "EMI";
      default:
        return type || "N/A";
    }
  };

  const getPaymentInstallmentCount = (paymentType, paymentDetails) => {
    // Always use actual paymentDetails length from Firebase
    if (paymentDetails && Array.isArray(paymentDetails)) {
      return paymentDetails.length;
    }

    // Fallback only if paymentDetails is not available
    switch (paymentType) {
      case "AT":
        return 2;
      case "ATP":
        return 3;
      case "ATTP":
        return 4;
      case "ATTT":
        return 4;
      case "EMI":
        return 12;
      default:
        return 1;
    }
  };

  const getGeneratedInvoicesDisplay = (contractInvoices, invoice) => {
    const totalInstallments = getPaymentInstallmentCount(
      invoice.paymentType,
      invoice.paymentDetails
    );
    const generatedCount = contractInvoices.length;

    return `${generatedCount}/${totalInstallments}`;
  };

  const getInstallmentName = (installment) => {
    if (!installment) return "N/A";

    // Convert installment name to short form
    const shortForms = {
      Advance: "A",
      Tax: "T",
      Payment: "P",
      Installment: "I",
    };

    // Split the installment name and get first letters
    return installment
      .split(" ")
      .map((word) => shortForms[word] || word.charAt(0))
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
    <div className="min-h-screen bg-gray-50/50">
      <div className="w-full space-y-3">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Contract Invoices
              </h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Manage and view contract invoices
              </p>
            </div>
          </div>
        </div>

        {/* Training Tables */}
        {invoices.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
            <div className="text-center max-w-md mx-auto">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <svg
                  className="w-6 h-6 text-gray-400"
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
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                No contract invoices
              </h3>
              <p className="text-gray-500 text-xs">
                Get started by creating your first contract invoice.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => {
              const contractInvoices = existingInvoices.filter(
                (inv) => inv.originalInvoiceId === invoice.id
              );

              const nextInstallment = getNextInstallment(invoice);
              const totalInstallments = getPaymentInstallmentCount(
                invoice.paymentType,
                invoice.paymentDetails
              );
              const generatedCount = contractInvoices.length;

              return (
                <div
                  key={invoice.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden"
                >
                  {/* College Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-white">
                            {invoice.collegeName ||
                              invoice.collegeCode ||
                              "N/A"}
                          </h2>
                          <span className="bg-blue-800 text-white text-xs font-semibold py-1 px-2 rounded-full">
                            {generatedCount}/{totalInstallments}
                          </span>
                        </div>
                        <p className="text-blue-100 text-sm mt-1">
                          Project Code: {invoice.projectCode || invoice.id} •
                          Payment Type:{" "}
                          {getPaymentTypeName(invoice.paymentType)} • Students:{" "}
                          {invoice.studentCount || "N/A"} • Total Amount:{" "}
                          {formatCurrency(
                            invoice.netPayableAmount || invoice.totalCost
                          )}
                        </p>
                      </div>
                      <div className="text-blue-100">
                        <button
                          onClick={() => toggleExpand(invoice.id)}
                          className="text-white"
                        >
                          <FontAwesomeIcon
                            icon={
                              expandedRows.has(invoice.id)
                                ? faChevronUp
                                : faChevronDown
                            }
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedRows.has(invoice.id) && (
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs  font-bold text-gray-500 mb-0.5">
                            Course
                          </p>
                          <p className="text-sm text-gray-900">
                            {invoice.course || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 mb-0.5">
                            Year
                          </p>
                          <p className="text-sm text-gray-900">
                            {invoice.year || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 mb-0.5">
                            Per Student Cost
                          </p>
                          <p className="text-sm text-gray-900">
                            {formatCurrency(invoice.perStudentCost)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-0.5">
                            Generated Invoices
                          </p>
                          <p className="text-sm text-gray-900">
                            {contractInvoices.length > 0 ? (
                              <span className="bg-blue-100 text-blue-800 text-xs font-semibold py-1 px-2 rounded">
                                {getGeneratedInvoicesDisplay(
                                  contractInvoices,
                                  invoice
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400">
                                0/
                                {getPaymentInstallmentCount(
                                  invoice.paymentType,
                                  invoice.paymentDetails
                                )}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => handleRaiseInvoice(invoice)}
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-xs"
                          disabled={!nextInstallment}
                          title={
                            nextInstallment
                              ? `Generate ${nextInstallment} Invoice`
                              : "All invoices generated"
                          }
                        >
                          {nextInstallment
                            ? `Generate ${getInstallmentName(nextInstallment)}`
                            : "All Generated"}
                        </button>
                      </div>

                      {/* Invoices Table */}
                      {contractInvoices.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Invoice
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Type
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Date
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Installment
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Amount
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Status
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {contractInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {inv.invoiceNumber || `INV-${inv.id}`}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">
                                    {inv.invoiceType || "Tax Invoice"}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">
                                    {getDate(inv.raisedDate)}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">
                                    {inv.installment}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 font-semibold">
                                    {formatCurrency(
                                      inv.amountRaised || inv.netPayableAmount
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    <span
                                      className={`px-2 py-1 rounded text-xs ${
                                        inv.status === "approved"
                                          ? "bg-green-100 text-green-800"
                                          : inv.status === "raised"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {inv.status || "draft"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          handleViewInvoiceDetail(inv)
                                        }
                                        className="bg-gray-500 hover:bg-gray-700 text-white py-1 px-2 rounded text-xs"
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDownloadInvoice(inv)
                                        }
                                        className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs"
                                      >
                                        Download
                                      </button>
                                      <button
                                        onClick={() => handleEditInvoice(inv)}
                                        className="bg-yellow-500 hover:bg-yellow-700 text-white py-1 px-2 rounded text-xs"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
        onSubmit={(formData, invoice) =>
          handleSubmit(formData, invoice, !!editInvoice)
        }
        isEdit={!!editInvoice}
      />

      {/* Invoice Detail Modal */}
      {selectedInvoiceDetail && (
        <InvoiceDetailModal
          invoice={selectedInvoiceDetail.invoice}
          contract={selectedInvoiceDetail.contract}
          onClose={() => setSelectedInvoiceDetail(null)}
          onDownload={handleDownloadInvoice}
          initialEditMode={selectedInvoiceDetail.initialEditMode || false}
        />
      )}
    </div>
  );
}
