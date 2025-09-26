import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  where,
  deleteDoc,
  orderBy as firestoreOrderBy,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import RaiseInvoiceModal from "./RaiseInvoiceModal";
import RegenerateInvoiceModal from "./RegenerateInvoiceModal";
import InvoiceModal from "../../../components/HR/InvoiceModal";

export default function ContractInvoiceTable() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [existingProformas, setExistingProformas] = useState([]);
  const [isRegenerateModal, setIsRegenerateModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching contract invoices...");

        // 1️⃣ Fetch training forms
        const trainingFormsSnapshot = await getDocs(
          query(collection(db, "trainingForms"), orderBy("createdAt", "desc"))
        );
        const trainingFormsData = trainingFormsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 2️⃣ Fetch ContractInvoices
        const invoicesSnapshot = await getDocs(
          collection(db, "ContractInvoices")
        );
        const invoicesData = invoicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          receivedAmount: doc.data().receivedAmount || 0,
          dueAmount:
            doc.data().dueAmount ||
            doc.data().amountRaised ||
            doc.data().netPayableAmount ||
            0,
          paymentHistory: doc.data().paymentHistory || [],
          status: doc.data().status || "registered",
        }));
        setExistingInvoices(invoicesData);

        // 3️⃣ Fetch ProformaInvoices
        const proformaSnapshot = await getDocs(
          collection(db, "ProformaInvoices")
        );
        const proformaData = proformaSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setExistingProformas(proformaData);

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

  // Get current financial year (April to March)
  const getCurrentFinancialYear = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (currentMonth >= 4) {
      const startYear = currentYear;
      const endYear = currentYear + 1;
      return {
        year: `${startYear}-${endYear.toString().slice(-2)}`,
        startYear: startYear,
        endYear: endYear,
      };
    } else {
      const startYear = currentYear - 1;
      const endYear = currentYear;
      return {
        year: `${startYear}-${endYear.toString().slice(-2)}`,
        startYear: startYear,
        endYear: endYear,
      };
    }
  };

  // Generate unique sequential invoice number for financial year
  const generateInvoiceNumber = async (invoiceType = "Tax Invoice") => {
    const financialYear = getCurrentFinancialYear();
    const prefix = invoiceType === "Tax Invoice" ? "TI" : "PI";

    try {
      const invoicesQuery = query(
        collection(db, "ContractInvoices"),
        where("financialYear", "==", financialYear.year),
        firestoreOrderBy("raisedDate", "desc")
      );

      const invoicesSnapshot = await getDocs(invoicesQuery);
      let nextInvoiceNumber = 1;

      if (!invoicesSnapshot.empty) {
        const invoicesData = invoicesSnapshot.docs.map((doc) => doc.data());
        const invoiceNumbers = invoicesData
          .filter(
            (inv) =>
              inv.invoiceNumber &&
              inv.invoiceNumber.includes(financialYear.year)
          )
          .map((inv) => {
            const parts = inv.invoiceNumber.split("/");
            return parseInt(parts[parts.length - 1]) || 0;
          });

        if (invoiceNumbers.length > 0) {
          const maxInvoiceNumber = Math.max(...invoiceNumbers);
          nextInvoiceNumber = maxInvoiceNumber + 1;
        }
      }

      const invoiceNumber = nextInvoiceNumber.toString().padStart(3, "0");
      return `GAPL/${financialYear.year}/${prefix}/${invoiceNumber}`;
    } catch (error) {
      console.error("Error generating invoice number:", error);
      const timestamp = new Date().getTime();
      return `GAPL/${financialYear.year}/${prefix}/F${timestamp}`;
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
    if (paymentDetails && Array.isArray(paymentDetails)) {
      return paymentDetails.length;
    }

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

  const handleGenerateInvoice = (contract, installment, isRegenerate = false, existingInvoice = null) => {
    if (isRegenerate && existingInvoice) {
      // Regenerate case - existing invoice data use karo but new details ke saath
      setEditInvoice({
        ...existingInvoice,
        // Reset payment status but keep other details
        receivedAmount: 0,
        dueAmount: existingInvoice.netPayableAmount || existingInvoice.amountRaised,
        paymentHistory: [],
        status: "registered",
        approvalStatus: "pending",
        cancelled: false,
        cancellationDate: null,
        cancellationReason: null
      });
    } else {
      // New generate case
      setEditInvoice(null);
    }
    
    setSelectedContract(contract);
    setSelectedInstallment(installment);
    setIsRegenerateModal(isRegenerate);
    setShowModal(true);
  };

  const handleConvertToTax = async (invoice) => {
    console.log("Converting invoice:", invoice);

    if (!invoice.id) {
      alert("Error: Invoice ID not found. Cannot convert to tax invoice.");
      return;
    }

    try {
      // 🔹 Step 1: First save the Proforma Invoice to separate collection
      const proformaInvoiceData = {
        ...invoice,
        originalInvoiceId: invoice.originalInvoiceId || invoice.id,
        convertedToTax: true,
        conversionDate: new Date(),
        type: "Proforma Invoice",
        invoiceType: "Proforma Invoice",
      };

      const { id: _, ...proformaDataWithoutId } = proformaInvoiceData;

      // Save to ProformaInvoices collection
      await addDoc(collection(db, "ProformaInvoices"), proformaDataWithoutId);
      console.log("Proforma Invoice saved successfully");

      // 🔹 Step 2: Then proceed with Tax Invoice conversion
      setEditInvoice(invoice);
      const originalContract = invoices.find(
        (inv) => inv.id === invoice.originalInvoiceId
      );
      setSelectedContract(originalContract);
      setSelectedInstallment({ name: invoice.installment });
      setShowModal(true);
    } catch (error) {
      console.error("Error saving proforma invoice:", error);
      alert("Failed to save proforma invoice. Please try again.");
    }
  };

  const handleSubmit = async (formData, contract, installment, isEdit = false, isRegenerate = false) => {
    if (!contract || !installment) {
      alert("Error: Contract or installment data missing.");
      return;
    }

    try {
      const financialYear = getCurrentFinancialYear();
      const currentDate = new Date(); // 👈 Current date capture karo

      if (isEdit && !isRegenerate && editInvoice) {
        // Convert Proforma to Tax: update the existing document with same invoice number changed to TI
        const updatedInvoiceNumber = editInvoice.invoiceNumber.replace("PI", "TI");

        const updateData = {
          invoiceType: "Tax Invoice",
          invoiceNumber: updatedInvoiceNumber,
          convertedFromProforma: true,
          originalProformaNumber: editInvoice.invoiceNumber,
          updatedDate: currentDate,
        };

        // Update the existing document in ContractInvoices
        await updateDoc(doc(db, "ContractInvoices", editInvoice.id), updateData);

        // Update local state
        setExistingInvoices((prev) =>
          prev.map((inv) =>
            inv.id === editInvoice.id ? { ...inv, ...updateData } : inv
          )
        );

        alert(`Invoice converted to Tax Invoice successfully! Invoice Number: ${updatedInvoiceNumber}`);
      } else if (isRegenerate && editInvoice) {
        // 🔹 REGENERATE CASE - Cancelled invoice ko regenerate karna
        const newInvoiceNumber = await generateInvoiceNumber(formData.invoiceType);
        
        const regenerateData = {
          ...editInvoice, // Purana data lelo
          // Naye details set karo
          invoiceNumber: newInvoiceNumber,
          invoiceType: formData.invoiceType,
          raisedDate: currentDate, // 👈 Current date use karo
          updatedDate: currentDate,
          status: "registered",
          approvalStatus: "pending",
          financialYear: financialYear.year,
          receivedAmount: 0,
          dueAmount: editInvoice.netPayableAmount || editInvoice.amountRaised,
          paymentHistory: [],
          // Cancelled status hatao
          cancelled: false,
          cancellationDate: null,
          cancellationReason: null,
          // Mark as regenerated from cancelled
          regeneratedFrom: editInvoice.invoiceNumber,
        };

        // ID remove karo for new document
        const { id: _, ...dataWithoutId } = regenerateData;

        let collectionName = "ContractInvoices";
        if (formData.invoiceType === "Proforma Invoice") {
          collectionName = "ProformaInvoices";
        }

        const docRef = await addDoc(collection(db, collectionName), dataWithoutId);
        
        const newInvoice = {
          id: docRef.id,
          ...regenerateData,
        };

        // State update karo
        if (collectionName === "ContractInvoices") {
          setExistingInvoices(prev => [...prev, newInvoice]);
        } else {
          setExistingProformas(prev => [...prev, newInvoice]);
        }

        // Mark the cancelled invoice as regenerated
        const cancelledDocRef = doc(db, collectionName, editInvoice.id);
        await updateDoc(cancelledDocRef, { regenerated: true });

        // Update local state for the cancelled invoice
        if (collectionName === "ContractInvoices") {
          setExistingInvoices(prev => prev.map(inv => 
            inv.id === editInvoice.id ? { ...inv, regenerated: true } : inv
          ));
        } else {
          setExistingProformas(prev => prev.map(inv => 
            inv.id === editInvoice.id ? { ...inv, regenerated: true } : inv
          ));
        }

        alert(`Invoice regenerated successfully! New Invoice Number: ${newInvoiceNumber}`);
      } else {
        // 🔹 New Invoice raise (same as before)
        const invoiceNumber = await generateInvoiceNumber(formData.invoiceType);
        const selectedInstallment = contract.paymentDetails.find(
          (p) => p.name === installment.name
        );

        const totalAmount = selectedInstallment
          ? selectedInstallment.totalAmount
          : contract.netPayableAmount;

        const invoiceData = {
          ...formData,
          invoiceNumber,
          raisedDate: currentDate, // 👈 Current date use karo
          status: "registered",
          originalInvoiceId: contract.id,
          projectCode: contract.projectCode,
          collegeName: contract.collegeName,
          collegeCode: contract.collegeCode,
          course: contract.course,
          year: contract.year,
          deliveryType: contract.deliveryType,
          passingYear: contract.passingYear,
          studentCount: contract.studentCount,
          perStudentCost: contract.perStudentCost,
          totalCost: contract.totalCost,
          installment: installment.name,
          netPayableAmount: totalAmount,
          amountRaised: totalAmount,
          receivedAmount: 0,
          dueAmount: totalAmount,
          paymentHistory: [],
          gstNumber: contract.gstNumber,
          gstType: contract.gstType,
          gstAmount: selectedInstallment
            ? selectedInstallment.gstAmount
            : contract.gstAmount,
          tpoName: contract.tpoName,
          tpoEmail: contract.tpoEmail,
          tpoPhone: contract.tpoPhone,
          address: contract.address,
          city: contract.city,
          state: contract.state,
          pincode: contract.pincode,
          paymentDetails: contract.paymentDetails,
          contractStartDate: contract.contractStartDate,
          contractEndDate: contract.contractEndDate,
          financialYear: financialYear.year,
          academicYear: financialYear.year,
        };

        const docRef = await addDoc(
          collection(db, "ContractInvoices"),
          invoiceData
        );

        const newInvoice = {
          id: docRef.id,
          ...invoiceData,
        };

        setExistingInvoices((prev) => [...prev, newInvoice]);
        alert(`Invoice ${invoiceNumber} raised successfully!`);
      }

      // Reset modal + selections
      setShowModal(false);
      setSelectedContract(null);
      setSelectedInstallment(null);
      setEditInvoice(null);
    } catch (err) {
      console.error("Error processing invoice:", err);
      alert(
        `Failed to ${isEdit ? "convert" : "raise"} invoice. Error: ${
          err.message
        }`
      );
    }
  };

  const handleRegisterInvoice = async (invoice) => {
    try {
      const invoiceRef = doc(db, "ContractInvoices", invoice.id);
      await updateDoc(invoiceRef, { registered: true, status: "registered" });

      setExistingInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id ? { ...inv, registered: true } : inv
        )
      );

      alert("Invoice registered successfully!");
    } catch (err) {
      console.error("Error registering invoice:", err);
      alert("Failed to register invoice");
    }
  };

  const getApprovalStatusBadge = (invoice) => {
    if (!invoice) return null;
    
    const status = invoice.approvalStatus || invoice.status;
    
    if (status === "approved") {
      return (
        <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800 border border-green-300">
          Approved
        </span>
      );
    } else if (status === "cancelled") {
      return (
        <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-800 border border-red-300">
          Cancelled
        </span>
      );
    }
    
    return (
      <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 border border-yellow-300">
        Pending
      </span>
    );
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
                Contract Invoices - Payment Tracking
              </h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Manage invoices and track payments • Financial Year:{" "}
                {getCurrentFinancialYear().year}
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-0.5">
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
                            {generatedCount}/{totalInstallments}
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            0/{totalInstallments}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {/* Expanded Content */}
                  {expandedRows.has(invoice.id) && (
                    <div className="p-4">
                      {/* Installments Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Installment
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Percentage
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Amount
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Invoice Type
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Received Amount
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Due Amount
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {(() => {
                              const allInvoicesForContract = existingInvoices
                                .filter((inv) => inv.originalInvoiceId === invoice.id)
                                .concat(
                                  existingProformas.filter(
                                    (inv) => inv.originalInvoiceId === invoice.id && !inv.convertedToTax
                                  )
                                );

                              return invoice.paymentDetails?.map((installment, index) => {
                                const invoicesForInstallment = allInvoicesForContract.filter(
                                  (inv) => inv.installment === installment.name
                                );

                                // Sort: active first, then cancelled, by raisedDate desc
                                invoicesForInstallment.sort((a, b) => {
                                  const aCancelled = a.status === 'cancelled' || a.approvalStatus === 'cancelled';
                                  const bCancelled = b.status === 'cancelled' || b.approvalStatus === 'cancelled';
                                  if (aCancelled && !bCancelled) return 1;
                                  if (bCancelled && !aCancelled) return -1;
                                  return new Date(b.raisedDate || 0) - new Date(a.raisedDate || 0);
                                });

                                if (invoicesForInstallment.length > 0) {
                                  return invoicesForInstallment.map((inv, invIndex) => {
                                    const isCancelled = inv.status === 'cancelled' || inv.approvalStatus === 'cancelled';
                                    const totalAmount =
                                      inv.amountRaised || inv.netPayableAmount || installment.totalAmount;
                                    const receivedAmount = inv.receivedAmount || 0;
                                    const dueAmount = totalAmount - receivedAmount;

                                    return (
                                      <tr
                                        key={`${index}-${invIndex}`}
                                        className={`hover:bg-gray-50 ${isCancelled ? 'bg-red-50' : ''}`}
                                      >
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                          {installment.name}
                                          {isCancelled && (
                                            <span className="ml-1 text-xs text-red-500">(Cancelled)</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-500">
                                          {installment.percentage}%
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-500 font-semibold">
                                          {formatCurrency(installment.totalAmount)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-500">
                                          <div className="text-center">
                                            {/* Invoice Type */}
                                            <div
                                              className={`font-semibold ${
                                                inv.invoiceType === "Tax Invoice"
                                                  ? "text-green-600"
                                                  : "text-blue-600"
                                              }`}
                                            >
                                              {inv.invoiceType === "Proforma Invoice" ? "Proforma" : "Tax"}
                                              {isCancelled && inv.regenerated && " (Cancelled - Regenerated)"}
                                              {!isCancelled && inv.regeneratedFrom && ` (Regenerated from ${inv.regeneratedFrom})`}
                                            </div>
                                            {getApprovalStatusBadge(inv)}
                                            {/* Invoice Number */}
                                            <div className="text-xs text-gray-400 mt-0.5">
                                              {inv.invoiceNumber || "N/A"}
                                            </div>
                                          </div>
                                        </td>

                                        <td className="px-4 py-2 text-sm">
                                          <span
                                            className={`font-semibold ${
                                              receivedAmount > 0 ? "text-green-600" : "text-gray-600"
                                            }`}
                                          >
                                            {formatCurrency(receivedAmount)}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm">
                                          <span
                                            className={`font-semibold ${
                                              dueAmount > 0 ? "text-red-600" : "text-green-600"
                                            }`}
                                          >
                                            {dueAmount === 0 ? "0" : formatCurrency(dueAmount)}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm">
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => setSelectedInvoice(inv)}
                                              className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs"
                                            >
                                              View
                                            </button>
                                            {isCancelled && !inv.regenerated && (
                                              <button
                                                onClick={() =>
                                                  handleGenerateInvoice(invoice, installment, true, inv)
                                                }
                                                className="bg-orange-500 hover:bg-orange-700 text-white py-1 px-2 rounded text-xs"
                                                title="Regenerate cancelled invoice"
                                              >
                                                Regenerate
                                              </button>
                                            )}
                                            {!isCancelled && inv.invoiceType === "Proforma Invoice" && (
                                              <button
                                                onClick={() => handleConvertToTax(inv)}
                                                className="bg-purple-500 hover:bg-purple-700 text-white py-1 px-2 rounded text-xs"
                                              >
                                                Generate TI
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  });
                                } else {
                                  // No invoices for this installment
                                  return (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-4 py-2 text-sm text-gray-900">{installment.name}</td>
                                      <td className="px-4 py-2 text-sm text-gray-500">
                                        {installment.percentage}%
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-500 font-semibold">
                                        {formatCurrency(installment.totalAmount)}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-500">-</td>
                                      <td className="px-4 py-2 text-sm">₹0</td>
                                      <td className="px-4 py-2 text-sm">
                                        {formatCurrency(installment.totalAmount)}
                                      </td>
                                      <td className="px-4 py-2 text-sm">
                                        <button
                                          onClick={() => handleGenerateInvoice(invoice, installment)}
                                          className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs"
                                        >
                                          Generate
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                }
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {isRegenerateModal ? (
        <RegenerateInvoiceModal
          isOpen={showModal}
          contract={selectedContract}
          installment={selectedInstallment}
          onClose={() => {
            setShowModal(false);
            setSelectedContract(null);
            setSelectedInstallment(null);
            setEditInvoice(null);
            setIsRegenerateModal(false);
          }}
          onSubmit={(formData, contract, installment) =>
            handleSubmit(
              formData, 
              contract, 
              installment, 
              false, 
              true
            )
          }
          editInvoice={editInvoice}
        />
      ) : (
        <RaiseInvoiceModal
          isOpen={showModal}
          contract={selectedContract}
          installment={selectedInstallment}
          onClose={() => {
            setShowModal(false);
            setSelectedContract(null);
            setSelectedInstallment(null);
            setEditInvoice(null);
            setIsRegenerateModal(false);
          }}
          onSubmit={(formData, contract, installment) =>
            handleSubmit(
              formData, 
              contract, 
              installment, 
              !!editInvoice, 
              (editInvoice?.status === 'cancelled' || editInvoice?.approvalStatus === 'cancelled')
            )
          }
          isEdit={!!editInvoice}
          isRegenerate={editInvoice?.approvalStatus === 'cancelled'}
          editInvoice={editInvoice}
        />
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onRegister={(invoice) => handleRegisterInvoice(invoice)}
          isViewOnly={true}
        />
      )}
    </div>
  );
}