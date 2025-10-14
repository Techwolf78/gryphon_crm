import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronUp,
  faChevronDown,
  faObjectGroup,
} from "@fortawesome/free-solid-svg-icons";
import RaiseInvoiceModal from "./RaiseInvoiceModal";
import RegenerateInvoiceModal from "./RegenerateInvoiceModal";
import InvoiceModal from "../../../components/HR/InvoiceModal";
import RowClickModal from "./RowClickModal";
import MergeInvoicesModal from "./MergeInvoicesModal ";
import InvoiceExcelExport from "./InvoiceExcelExport";

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
  const [rowClickModal, setRowClickModal] = useState({
    isOpen: false,
    invoice: null,
    installment: null,
    contract: null,
  });
  const [existingProformas, setExistingProformas] = useState([]);
  const [isRegenerateModal, setIsRegenerateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedContractsForMerge, setSelectedContractsForMerge] = useState(
    []
  );
  const [selectedInstallmentForMerge, setSelectedInstallmentForMerge] =
    useState(null);
  const [showExportView, setShowExportView] = useState(false);
  const [activeTab, setActiveTab] = useState("individual");
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState("");
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

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
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update isAllExpanded when tab or filter changes
  useEffect(() => {
    // This will be called when activeTab or selectedCollegeFilter changes
    // The actual check will happen in the toggleExpand function and toggleExpandAll function
    setIsAllExpanded(false);
  }, [activeTab, selectedCollegeFilter]);

  // Get contracts for individual view (not part of any merged invoice)
  const getIndividualContracts = () => {
    const mergedContractIds = new Set();

    // Collect all contract IDs that are part of merged invoices
    existingInvoices.forEach((invoice) => {
      if (invoice.isMergedInvoice && invoice.mergedContracts) {
        invoice.mergedContracts.forEach((contract) => {
          mergedContractIds.add(contract.id);
        });
      }
    });

    // Filter out contracts that are part of merged invoices
    return invoices.filter((contract) => !mergedContractIds.has(contract.id));
  };

  // Get contracts for merged view (not having any individual invoices)


  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "-";
    try {
      const numAmount = Number(amount);
      if (isNaN(numAmount)) return "-";

      // For amounts less than 1 lakh, show regular formatting
      if (numAmount < 100000) {
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(numAmount);
      }

      // For amounts >= 1 lakh, use lakh abbreviations
      if (numAmount >= 1000000) { // 10 Lakh and above
        return `${(numAmount / 100000).toFixed(0)} lakh`;
      } else { // 1 Lakh to 9.9 Lakh
        return `${(numAmount / 100000).toFixed(2)} lakh`;
      }
    } catch {
      return `₹${amount}`;
    }
  };

  // Helper function to format currency in Indian numbering system with abbreviations
  const formatIndianCurrency = (amount) => {
    if (!amount && amount !== 0) return "0";

    let numAmount = Number(amount);
    if (isNaN(numAmount)) return "0";

    // For amounts less than 1 lakh, show regular formatting
    if (numAmount < 100000) {
      return new Intl.NumberFormat('en-IN').format(numAmount);
    }

    // For amounts >= 1 lakh, use abbreviations
    if (numAmount >= 10000000000) { // 1000 Cr and above
      return `${(numAmount / 10000000).toFixed(1)}K Cr`;
    } else if (numAmount >= 1000000000) { // 100 Cr to 999 Cr
      return `${(numAmount / 10000000).toFixed(1)} Cr`;
    } else if (numAmount >= 100000000) { // 10 Cr to 99 Cr
      return `${(numAmount / 10000000).toFixed(1)} Cr`;
    } else if (numAmount >= 10000000) { // 1 Cr to 9.9 Cr
      return `${(numAmount / 10000000).toFixed(1)} Cr`;
    } else if (numAmount >= 1000000) { // 10 Lakh to 99 Lakh
      return `${(numAmount / 100000).toFixed(2)} Lakh`;
    } else { // 1 Lakh to 9.9 Lakh
      return `${(numAmount / 100000).toFixed(2)} Lakh`;
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
      
      // Check if all items are now expanded or collapsed
      const currentContracts = activeTab === "individual" 
        ? getFilteredContracts(individualContracts) 
        : getFilteredContracts(mergedContracts, true);
      
      const allIds = currentContracts.map((contract, index) => 
        activeTab === "individual" ? contract.id : `merged-${index}`
      );
      
      const allExpanded = allIds.every(id => newSet.has(id));
      const allCollapsed = allIds.every(id => !newSet.has(id));
      
      if (allExpanded) {
        setIsAllExpanded(true);
      } else if (allCollapsed) {
        setIsAllExpanded(false);
      }
      
      return newSet;
    });
  };

  // Toggle expand/collapse all items
  const toggleExpandAll = () => {
    const currentContracts = activeTab === "individual" 
      ? getFilteredContracts(individualContracts) 
      : getFilteredContracts(mergedContracts, true);
    
    if (isAllExpanded) {
      // Collapse all
      setExpandedRows(new Set());
      setIsAllExpanded(false);
    } else {
      // Expand all
      const allIds = currentContracts.map((contract, index) => 
        activeTab === "individual" ? contract.id : `merged-${index}`
      );
      setExpandedRows(new Set(allIds));
      setIsAllExpanded(true);
    }
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

  // Generate unique sequential invoice number for ALL invoice types - COMBINED COUNTING
// Add this state to your component
const [locallyGeneratedNumbers, setLocallyGeneratedNumbers] = useState(new Set());

const generateInvoiceNumber = async (invoiceType = "Tax Invoice") => {
  const financialYear = getCurrentFinancialYear();
  let prefix = "TI";
  if (invoiceType === "Proforma Invoice") prefix = "PI";
  if (invoiceType === "Cash Invoice") prefix = "CI";

  try {
    const [invoicesSnapshot, proformaSnapshot] = await Promise.all([
      getDocs(query(collection(db, "ContractInvoices"), 
        where("financialYear", "==", financialYear.year))),
      getDocs(query(collection(db, "ProformaInvoices"), 
        where("financialYear", "==", financialYear.year))),
    ]);

    // Combine existing invoices from database
    const allInvoices = [
      ...invoicesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      ...proformaSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    ];

    // Filter current financial year invoices
    const currentFYInvoices = allInvoices.filter((inv) => {
      if (!inv.invoiceNumber) return false;
      return inv.invoiceNumber.includes(financialYear.year);
    });

    // Extract sequential numbers from ALL invoice types
    const invoiceNumbers = currentFYInvoices
      .map((inv) => {
        const parts = inv.invoiceNumber.split("/");
        if (parts.length !== 4) return 0;
        const sequentialPart = parts[3];
        if (/^\d+$/.test(sequentialPart)) {
          const num = parseInt(sequentialPart, 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      })
      .filter((num) => num > 0);

    // Also consider locally generated numbers in this session
    const localNumbers = Array.from(locallyGeneratedNumbers)
      .map(num => parseInt(num))
      .filter(num => !isNaN(num) && num > 0);

    const allNumbers = [...invoiceNumbers, ...localNumbers];
    
    let nextInvoiceNumber = 1;
    if (allNumbers.length > 0) {
      const maxInvoiceNumber = Math.max(...allNumbers);
      nextInvoiceNumber = maxInvoiceNumber + 1;
    }

    // Update local tracking
    setLocallyGeneratedNumbers(prev => new Set([...prev, nextInvoiceNumber]));

    const invoiceNumber = nextInvoiceNumber.toString().padStart(2, "0");
    const finalInvoiceNumber = `GAPL/${financialYear.year}/${prefix}/${invoiceNumber}`;

    return finalInvoiceNumber;
  } catch {
    // Fallback with timestamp to ensure uniqueness
    const fallbackNumber = `GAPL/${financialYear.year}/${prefix}/F${Date.now().toString().slice(-2)}`;
    return fallbackNumber;
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

  const handleGenerateInvoice = (
    contract,
    installment,
    isRegenerate = false,
    existingInvoice = null
  ) => {
    if (isRegenerate && existingInvoice) {
      setEditInvoice({
        ...existingInvoice,
        receivedAmount: 0,
        dueAmount:
          existingInvoice.netPayableAmount || existingInvoice.amountRaised,
        paymentHistory: [],
        status: "registered",
        approvalStatus: "pending",
        cancelled: false,
        cancellationDate: null,
        cancellationReason: null,
      });
    } else {
      setEditInvoice(null);
    }

    setSelectedContract(contract);
    setSelectedInstallment(installment);
    setIsRegenerateModal(isRegenerate);
    setShowModal(true);
  };

  const handleConvertToTax = async (invoice) => {
    if (!invoice.id) {
      alert("Error: Invoice ID not found. Cannot convert to tax invoice.");
      return;
    }

    try {
      // DIRECT Tax Invoice generate karo - Proforma store mat karo
      const financialYear = getCurrentFinancialYear();
      const currentDate = new Date();

      // Tax Invoice ke liye number generate karo
      const taxInvoiceNumber = await generateInvoiceNumber("Tax Invoice");

      // Tax Invoice data prepare karo
      const taxInvoiceData = {
        ...invoice,
        invoiceType: "Tax Invoice",
        invoiceNumber: taxInvoiceNumber,
        convertedFromProforma: true,
        originalProformaNumber: invoice.invoiceNumber,
        conversionDate: currentDate,
        raisedDate: currentDate,
        updatedDate: currentDate,
        status: "registered",
        approvalStatus: "pending",
        financialYear: financialYear.year,
        // Payment details reset karo (fresh invoice)
        receivedAmount: 0,
        dueAmount: invoice.netPayableAmount || invoice.amountRaised,
        paymentHistory: [],
        cancelled: false,
        cancellationDate: null,
        cancellationReason: null,
      };

      const { id: _, ...taxDataWithoutId } = taxInvoiceData;

      // DIRECTLY Tax Invoice add karo ContractInvoices mein
      const docRef = await addDoc(
        collection(db, "ContractInvoices"),
        taxDataWithoutId
      );

      // Purane Proforma ko mark karo as converted
      // For merged invoices, the original is in ContractInvoices, not ProformaInvoices
      const originalCollection = invoice.isMergedInvoice ? "ContractInvoices" : "ProformaInvoices";
      await updateDoc(doc(db, originalCollection, invoice.id), {
        convertedToTax: true,
        convertedTaxInvoiceNumber: taxInvoiceNumber,
        conversionDate: currentDate,
      });

      // State update karo
      const newInvoice = {
        id: docRef.id,
        ...taxInvoiceData,
      };

      setExistingInvoices((prev) => [...prev, newInvoice]);

      // Update the original invoice state (different for merged vs individual)
      if (invoice.isMergedInvoice) {
        // For merged invoices, update existingInvoices
        setExistingInvoices((prev) =>
          prev.map((inv) =>
            inv.id === invoice.id
              ? {
                  ...inv,
                  convertedToTax: true,
                  convertedTaxInvoiceNumber: taxInvoiceNumber,
                }
              : inv
          )
        );
      } else {
        // For individual invoices, update existingProformas
        setExistingProformas((prev) =>
          prev.map((inv) =>
            inv.id === invoice.id
              ? {
                  ...inv,
                  convertedToTax: true,
                  convertedTaxInvoiceNumber: taxInvoiceNumber,
                }
              : inv
          )
        );
      }

      alert(
        `Invoice converted to Tax Invoice successfully! Invoice Number: ${taxInvoiceNumber}`
      );

      // Modal close karo - koi modal open mat karo
      setShowModal(false);
      setSelectedContract(null);
      setSelectedInstallment(null);
      setEditInvoice(null);
    } catch {
      alert("Failed to convert to tax invoice. Please try again.");
    }
  };

  // Handle cancel invoice - only for fresh invoices, delete completely
  const handleCancelInvoice = async (invoice) => {
    // Only allow undo for fresh invoices (not regenerated ones)
    if (invoice.regeneratedFrom) {
      alert(
        "Cannot undo regenerated invoices. Use Regenerate on the original cancelled invoice instead."
      );
      return;
    }

    if (
      !confirm(
        "Are you sure you want to undo this invoice generation? This will permanently delete the invoice."
      )
    ) {
      return;
    }

    try {
      // If this is a converted Tax invoice, also delete the original Proforma
      if (invoice.convertedFromProforma) {
        // Search for original proforma in both collections
        const original = [...existingInvoices, ...existingProformas].find(
          (inv) => inv.invoiceNumber === invoice.originalProformaNumber
        );
        if (original) {
          const originalCollection = original.isMergedInvoice ? "ContractInvoices" : "ProformaInvoices";
          await deleteDoc(doc(db, originalCollection, original.id));
          
          // Update local state - remove from both arrays to be safe
          setExistingInvoices((prev) => prev.filter((inv) => inv.id !== original.id));
          setExistingProformas((prev) => prev.filter((inv) => inv.id !== original.id));
        }
      }

      // Delete the invoice from database - use correct collection based on invoice type and merged status
      let collectionName = "ContractInvoices"; // Default for merged invoices and Tax/Cash invoices
      if (!invoice.isMergedInvoice && invoice.invoiceType === "Proforma Invoice") {
        collectionName = "ProformaInvoices"; // Only non-merged Proforma invoices are in ProformaInvoices
      }
      await deleteDoc(doc(db, collectionName, invoice.id));

      // Log the undo action
      await addDoc(collection(db, 'audit_logs'), {
        action: 'undo',
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        timestamp: new Date(),
        user: user?.email || 'Unknown',
        details: `Invoice ${invoice.invoiceNumber} cancelled`
      });

      // Update local state by removing the invoice from the correct array
      if (invoice.isMergedInvoice || invoice.invoiceType !== "Proforma Invoice") {
        // Merged invoices (any type) and non-Proforma invoices are in existingInvoices
        setExistingInvoices((prev) =>
          prev.filter((inv) => inv.id !== invoice.id)
        );
      } else {
        // Non-merged Proforma invoices are in existingProformas
        setExistingProformas((prev) =>
          prev.filter((inv) => inv.id !== invoice.id)
        );
      }

      alert("Invoice generation undone successfully!");
    } catch (error) {
      alert("Error undoing invoice generation: " + error.message);
    }
  };

  const handleSubmit = async (
  formData,
  contract,
  installment,
  isEdit = false,
  isRegenerate = false
) => {
  if (!contract || !installment) {
    alert("Error: Contract or installment data missing.");
    return;
  }

  try {
    const financialYear = getCurrentFinancialYear();
    const currentDate = new Date();

    // Determine collection name based on invoice type
    const isProforma = formData.invoiceType === "Proforma Invoice";
    const collectionName = isProforma
      ? "ProformaInvoices"
      : "ContractInvoices";

    if (isEdit && !isRegenerate && editInvoice) {
      // CASE 1: Proforma se Tax Invoice convert karna
      if (editInvoice.invoiceType === "Proforma Invoice" && !isProforma) {
        const updatedInvoiceNumber = await generateInvoiceNumber(
          "Tax Invoice"
        );

        // 1. Naya Tax Invoice create karo
        const taxInvoiceData = {
          ...editInvoice,
          invoiceType: "Tax Invoice",
          invoiceNumber: updatedInvoiceNumber,
          convertedFromProforma: true,
          originalProformaNumber: editInvoice.invoiceNumber,
          conversionDate: currentDate,
          raisedDate: currentDate,
          updatedDate: currentDate,
          status: "registered",
          approvalStatus: "pending",
        };

        const { id: _, ...taxDataWithoutId } = taxInvoiceData;
        const docRef = await addDoc(
          collection(db, "ContractInvoices"),
          taxDataWithoutId
        );

        // 2. Purane Proforma ko mark karo as converted
        await updateDoc(doc(db, "ProformaInvoices", editInvoice.id), {
          convertedToTax: true,
          convertedTaxInvoiceNumber: updatedInvoiceNumber,
          conversionDate: currentDate,
        });

        // 3. State update karo
        const newInvoice = {
          id: docRef.id,
          ...taxInvoiceData,
        };

        setExistingInvoices((prev) => [...prev, newInvoice]);
        setExistingProformas((prev) =>
          prev.map((inv) =>
            inv.id === editInvoice.id
              ? {
                  ...inv,
                  convertedToTax: true,
                  convertedTaxInvoiceNumber: updatedInvoiceNumber,
                }
              : inv
          )
        );

        alert(
          `Invoice converted to Tax Invoice successfully! Invoice Number: ${updatedInvoiceNumber}`
        );
      }
    } else if (isRegenerate && editInvoice) {
  // CASE 2: Regenerate invoice (same logic with collection selection)
  const newInvoiceNumber = await generateInvoiceNumber(
    formData.invoiceType
  );

  const regenerateData = {
    ...editInvoice,
    invoiceNumber: newInvoiceNumber,
    invoiceType: formData.invoiceType,
    raisedDate: currentDate,
    updatedDate: currentDate,
    status: "registered",
    approvalStatus: isProforma ? "not_required" : "pending",
    financialYear: financialYear.year,
    receivedAmount: 0,
    dueAmount: editInvoice.netPayableAmount || editInvoice.amountRaised,
    paymentHistory: [],
    cancelled: false,
    cancellationDate: null,
    cancellationReason: null,
    regeneratedFrom: editInvoice.invoiceNumber,
  };

  // ✅ Cash Invoice ke liye amounts properly set karo
  if (formData.invoiceType === "Cash Invoice") {
    // ✅ EditInvoice se baseAmount use karo (jo Firebase se aaya hai)
    const baseAmount = editInvoice.baseAmount || 
                      (editInvoice.paymentDetails && editInvoice.paymentDetails[0] && editInvoice.paymentDetails[0].baseAmount) ||
                      0;
    
    regenerateData.baseAmount = baseAmount;
    regenerateData.gstAmount = 0;
    regenerateData.netPayableAmount = baseAmount;
    regenerateData.amountRaised = baseAmount;
    regenerateData.dueAmount = baseAmount;
  }

  const { id: _, ...dataWithoutId } = regenerateData;

  const docRef = await addDoc(
    collection(db, collectionName),
    dataWithoutId
  );

  const newInvoice = {
    id: docRef.id,
    ...regenerateData,
  };

  // State update based on collection
  if (collectionName === "ContractInvoices") {
    setExistingInvoices((prev) => [...prev, newInvoice]);
  } else {
    setExistingProformas((prev) => [...prev, newInvoice]);
  }

  // Purane invoice ko mark karo as regenerated
  const oldCollection =
    editInvoice.invoiceType === "Proforma Invoice"
      ? "ProformaInvoices"
      : "ContractInvoices";
  await updateDoc(doc(db, oldCollection, editInvoice.id), {
    regenerated: true,
    regeneratedTo: newInvoiceNumber,
  });

  // State update for old invoice
  if (oldCollection === "ContractInvoices") {
    setExistingInvoices((prev) =>
      prev.map((inv) =>
        inv.id === editInvoice.id ? { ...inv, regenerated: true } : inv
      )
    );
  } else {
    setExistingProformas((prev) =>
      prev.map((inv) =>
        inv.id === editInvoice.id ? { ...inv, regenerated: true } : inv
      )
    );
  }

  alert(
    `Invoice regenerated successfully! New Invoice Number: ${newInvoiceNumber}`
  );
} else {
  // CASE 3: Naya invoice generate karna
  const invoiceNumber = await generateInvoiceNumber(formData.invoiceType);
  const selectedInstallment = contract.paymentDetails.find(
    (p) => p.name === installment.name
  );

  // ✅ Pehle check karo ki paymentDetails mein amounts hain ya nahi
  let baseAmount, gstAmount, totalAmount;

  if (selectedInstallment && selectedInstallment.baseAmount && selectedInstallment.gstAmount && selectedInstallment.totalAmount) {
    // ✅ Agar paymentDetails mein amounts hain toh wahi use karo
    baseAmount = selectedInstallment.baseAmount;
    gstAmount = selectedInstallment.gstAmount;
    totalAmount = selectedInstallment.totalAmount;
    
    // ✅ Cash Invoice ke liye amounts adjust karo
    if (formData.invoiceType === "Cash Invoice") {
      gstAmount = 0;
      totalAmount = baseAmount; // Cash mein totalAmount = baseAmount
    }
  } else {
    // ✅ Agar paymentDetails mein amounts nahi hain toh manually calculate karo
    totalAmount = selectedInstallment
      ? selectedInstallment.totalAmount
      : contract.netPayableAmount;

    // Cash Invoice ke liye different calculation
    if (formData.invoiceType === "Cash Invoice") {
      baseAmount = totalAmount;
      gstAmount = 0;
      totalAmount = baseAmount; // Cash mein totalAmount = baseAmount
    } else {
      // Tax/Proforma invoice ke liye normal calculation
      baseAmount = totalAmount / 1.18;
      gstAmount = totalAmount - baseAmount;
    }
  }

  const invoiceData = {
    ...formData,
    invoiceNumber,
    raisedDate: currentDate,
    status: "registered",
    approvalStatus: isProforma ? "not_required" : "pending",
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
    installmentIndex: contract.paymentDetails.findIndex(p => p === installment),
    baseAmount: baseAmount,
    gstAmount: gstAmount,
    netPayableAmount: totalAmount,
    amountRaised: totalAmount,
    receivedAmount: 0,
    dueAmount: totalAmount,
    paymentHistory: [],
    gstNumber: contract.gstNumber,
    gstType: contract.gstType,
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
    collection(db, collectionName),
    invoiceData
  );

  const newInvoice = {
    id: docRef.id,
    ...invoiceData,
  };

  // State update based on collection
  if (collectionName === "ContractInvoices") {
    setExistingInvoices((prev) => [...prev, newInvoice]);
  } else {
    setExistingProformas((prev) => [...prev, newInvoice]);
  }

  alert(`Invoice ${invoiceNumber} raised successfully!`);
}
    setShowModal(false);
    setSelectedContract(null);
    setSelectedInstallment(null);
    setEditInvoice(null);
  } catch (err) {
    alert(
      `Failed to ${isEdit ? "convert" : "raise"} invoice. Error: ${
        err.message
      }`
    );
  }
};
  // "Generate TI" button ke handler ko update karo
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
    } catch (error) {
      alert("Failed to register invoice: " + error.message);
    }
  };

  // Approval status badge function mein modification
  const getApprovalStatusBadge = (invoice) => {
    if (!invoice) return null;

    // Proforma invoice ke liye approval status mat show karo
    if (invoice.invoiceType === "Proforma Invoice") {
      return (
        <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 border border-blue-300">
          Proforma
        </span>
      );
    }

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

const getMergedContracts = () => {
  // Collect contract IDs that have individual invoices generated
  const individualInvoiceContractIds = new Set();
  existingInvoices.forEach((invoice) => {
    if (!invoice.isMergedInvoice && invoice.originalInvoiceId) {
      individualInvoiceContractIds.add(invoice.originalInvoiceId);
    }
  });

  // Filter contracts to only include those without any individual invoices
  const availableContracts = invoices.filter(contract => !individualInvoiceContractIds.has(contract.id));

  // Group available contracts by college AND installment count
  const allMerged = {};

  availableContracts.forEach((contract) => {
    const collegeName = contract.collegeName;
    const installmentCount = getPaymentInstallmentCount(contract.paymentType, contract.paymentDetails);

    // ✅ Final grouping key: collegeName + installmentCount (merge contracts with same college and same number of installments)
    const key = `${collegeName}-${installmentCount}`;

    if (!allMerged[key]) {
      allMerged[key] = {
        collegeName,
        installmentCount,
        paymentTypes: [contract.paymentType || 'UNKNOWN'],
        contracts: [contract],
      };
    } else {
      if (!allMerged[key].paymentTypes.includes(contract.paymentType)) {
        allMerged[key].paymentTypes.push(contract.paymentType);
      }
      allMerged[key].contracts.push(contract);
    }
  });

  const filteredMerged = Object.values(allMerged);

  return filteredMerged;
};
  // Generate merged project code
  const generateMergedProjectCode = (mergedItem) => {
    const contracts = mergedItem.contracts;
    if (contracts.length === 0) return "N/A";

    // Get unique courses and years
    const uniqueCourses = [...new Set(contracts.map((c) => c.course))].filter(
      Boolean
    );
    const uniqueYears = [...new Set(contracts.map((c) => c.year))].filter(
      Boolean
    );

    // Sort years numerically
    uniqueYears.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.replace(/\D/g, "")) || 0;
      return numA - numB;
    });

    // Format years like "1st,2nd,3rd" or "1st,3rd"
    const formattedYears = uniqueYears
      .map((year) => {
        if (year.includes("1") || year.toLowerCase().includes("first"))
          return "1st";
        if (year.includes("2") || year.toLowerCase().includes("second"))
          return "2nd";
        if (year.includes("3") || year.toLowerCase().includes("third"))
          return "3rd";
        if (year.includes("4") || year.toLowerCase().includes("fourth"))
          return "4th";
        return year;
      })
      .join(",");

    // Get first contract for base info
    const firstContract = contracts[0];
    const collegeCode = firstContract.collegeCode || "N/A";
    const deliveryType = firstContract.deliveryType || "TP";
    const financialYear = getCurrentFinancialYear().year;

    // Format courses (take first 2-3 characters if multiple)
    let formattedCourses = uniqueCourses.join("/");
    if (formattedCourses.length > 10) {
      formattedCourses = uniqueCourses.map((c) => c.substring(0, 3)).join("/");
    }

    return `${collegeCode}/${formattedCourses}/${formattedYears}/${deliveryType}/${financialYear}`;
  };

  // Handle merge invoice generation
  const handleMergeGenerate = (mergedItem, installment) => {
    setSelectedContractsForMerge(mergedItem.contracts);
    setSelectedInstallmentForMerge(installment);
    setShowMergeModal(true);
  };

const handleMergeSubmit = async (formData) => {
  if (!selectedContractsForMerge.length || !selectedInstallmentForMerge) {
    alert("Error: No contracts selected for merge.");
    return;
  }

  try {
    const financialYear = getCurrentFinancialYear();
    const currentDate = new Date();
    const invoiceNumber = await generateInvoiceNumber(formData.invoiceType);

    // ✅ YEHI IMPORTANT CHANGE HAI - BASE AMOUNT DONO CASES MEIN SAME RAHEGA
    let totalBaseAmount = 0;
    let totalStudentCount = 0;
    const courses = [];
    const years = [];
    let perStudentCost = 0;

    // ✅ Pehle sab contracts ke TOTAL amounts calculate karo (Tax Invoice ke hisab se)
    selectedContractsForMerge.forEach((contract) => {
      // Find installment at the same index position
      const installmentDetail = contract.paymentDetails?.[selectedInstallmentForMerge.idx];
      
      const installmentAmount = parseFloat(installmentDetail?.totalAmount) || 0;
      
      // ✅ YEHI LINE CHANGE KARO - HAR CONTRACT KA BASE AMOUNT CALCULATE KARO
      const contractBaseAmount = Math.round(installmentAmount / 1.18);
      totalBaseAmount += contractBaseAmount;

      if (contract.studentCount) {
        totalStudentCount += parseInt(contract.studentCount);
      }
      if (contract.course) {
        courses.push(contract.course);
      }
      if (contract.year) {
        years.push(contract.year);
      }
      if (contract.perStudentCost) {
        perStudentCost += parseFloat(contract.perStudentCost);
      }
    });

    perStudentCost = perStudentCost / selectedContractsForMerge.length;

    // Use first contract for common details
    const firstContract = selectedContractsForMerge[0];

    // ✅ Cash aur Tax ke liye alag GST calculation - BUT BASE AMOUNT SAME RAHEGA
    let gstAmount = 0;
    let netPayableAmount = 0;

    if (formData.invoiceType === "Cash Invoice") {
      // ✅ Cash Invoice: Base Amount same, GST = 0, Total = Base Amount
      gstAmount = 0;
      netPayableAmount = totalBaseAmount;
    } else {
      // ✅ Tax Invoice: Base Amount same, GST calculate karo
      const gstRate = 0.18;
      gstAmount = Math.round(totalBaseAmount * gstRate);
      netPayableAmount = totalBaseAmount + gstAmount;
    }

    // Final amount ko bhi round karo
    const finalNetPayableAmount = Math.round(netPayableAmount);

    const mergedInvoiceData = {
      ...formData,
      invoiceNumber,
      raisedDate: currentDate,
      status: "registered",
      originalInvoiceId: `merged-${Date.now()}`,
      projectCode: generateMergedProjectCode(
        {
          contracts: selectedContractsForMerge,
          collegeName: firstContract.collegeName,
          collegeCode: firstContract.collegeCode,
        }
      ),
      collegeName: firstContract.collegeName,
      collegeCode: firstContract.collegeCode,
      course: [...new Set(courses)].join(", "),
      year: [...new Set(years)].join(", "),
      deliveryType: firstContract.deliveryType,
      passingYear: firstContract.passingYear,
      studentCount: totalStudentCount,
      perStudentCost: perStudentCost,
      totalCost: totalBaseAmount, // ✅ Total cost = Base amount (GST excluded)
      installment: selectedInstallmentForMerge.name,
      installmentIndex: selectedInstallmentForMerge.idx,
      baseAmount: totalBaseAmount, // ✅ BASE AMOUNT DONO CASES MEIN SAME
      gstAmount: gstAmount,
      netPayableAmount: finalNetPayableAmount,
      amountRaised: finalNetPayableAmount,
      receivedAmount: 0,
      dueAmount: finalNetPayableAmount,
      paymentHistory: [],
      gstNumber: formData.gstNumber || firstContract.gstNumber,
      gstType: formData.gstType || firstContract.gstType || "IGST",
      tpoName: firstContract.tpoName,
      tpoEmail: firstContract.tpoEmail,
      tpoPhone: firstContract.tpoPhone,
      address: firstContract.address,
      city: firstContract.city,
      state: firstContract.state,
      pincode: firstContract.pincode,
      paymentDetails: [
        {
          ...selectedInstallmentForMerge,
          baseAmount: totalBaseAmount, // ✅ Payment details mein bhi same base amount
          gstAmount: gstAmount,
          totalAmount: finalNetPayableAmount,
        },
      ],
      contractStartDate: firstContract.contractStartDate,
      contractEndDate: firstContract.contractEndDate,
      financialYear: financialYear.year,
      academicYear: financialYear.year,
      isMergedInvoice: true,
      mergedContracts: selectedContractsForMerge.map((c) => ({
        id: c.id,
        projectCode: c.projectCode,
        course: c.course,
        year: c.year,
        studentCount: c.studentCount,
        gstNumber: c.gstNumber,
        gstType: c.gstType,
        // ✅ Individual contract amounts bhi store karo reference ke liye
        installmentAmount: parseFloat(c.paymentDetails?.[selectedInstallmentForMerge.idx]?.totalAmount) || 0,
        baseAmount: Math.round((parseFloat(c.paymentDetails?.[selectedInstallmentForMerge.idx]?.totalAmount) || 0) / 1.18)
      })),
      individualProjectCodes: selectedContractsForMerge
        .map((c) => c.projectCode)
        .filter(Boolean),
    };

    const docRef = await addDoc(
      collection(db, "ContractInvoices"),
      mergedInvoiceData
    );

    const newInvoice = {
      id: docRef.id,
      ...mergedInvoiceData,
    };

    setExistingInvoices((prev) => [...prev, newInvoice]);
    
    // ✅ Success message mein amounts clearly mention karo
    alert(
      `Merged Invoice ${invoiceNumber} raised successfully!\n` +
      `Base Amount: ${formatCurrency(totalBaseAmount)}\n` +
      `GST Amount: ${formatCurrency(gstAmount)}\n` +
      `Final Amount: ${formatCurrency(finalNetPayableAmount)}\n` +
      `Invoice Type: ${formData.invoiceType}`
    );

    // Reset modal
    setShowMergeModal(false);
    setSelectedContractsForMerge([]);
    setSelectedInstallmentForMerge(null);
  } catch (err) {
    alert(`Failed to create merged invoice. Error: ${err.message}`);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="w-full space-y-3">
          {/* Header Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="h-6 bg-gray-200 rounded w-64 mb-1 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
              </div>
              <div className="flex items-center gap-3 mt-3 lg:mt-0">
                <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-1">
            <div className="flex border-b border-gray-200">
              <div className="flex-1 py-3 px-4">
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
              <div className="flex-1 py-3 px-4">
                <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Card Skeletons */}
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
              {/* Header Skeleton */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-5 bg-blue-500 rounded w-48 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-blue-400 rounded w-96 animate-pulse"></div>
                  </div>
                  <div className="h-6 w-6 bg-blue-500 rounded animate-pulse"></div>
                </div>
              </div>

              {/* Content Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx}>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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

  const individualContracts = getIndividualContracts();
  const mergedContracts = getMergedContracts();

  // Get unique college names for filter
  const getUniqueColleges = () => {
    const colleges = new Set();
    
    // Add colleges from individual contracts
    individualContracts.forEach(contract => {
      if (contract.collegeName) {
        colleges.add(contract.collegeName);
      }
    });
    
    // Add colleges from merged contracts
    mergedContracts.forEach(mergedItem => {
      if (mergedItem.collegeName) {
        colleges.add(mergedItem.collegeName);
      }
    });
    
    return Array.from(colleges).sort();
  };

  // Filter contracts based on selected college and search term
  const getFilteredContracts = (contracts, isMerged = false) => {
    let filtered = contracts;

    // College filter
    if (selectedCollegeFilter) {
      if (isMerged) {
        filtered = filtered.filter(mergedItem => mergedItem.collegeName === selectedCollegeFilter);
      } else {
        filtered = filtered.filter(contract => contract.collegeName === selectedCollegeFilter);
      }
    }

    return filtered;
  };

  // Helper functions for displaying useful info
  const getTotalStudentCount = (contracts) => {
    return contracts.reduce((total, contract) => {
      return total + (parseInt(contract.studentCount) || 0);
    }, 0);
  };

  const getTotalContractAmount = (contracts) => {
    return contracts.reduce((total, contract) => {
      return (
        total +
        (parseFloat(contract.netPayableAmount) ||
          parseFloat(contract.totalCost) ||
          0)
      );
    }, 0);
  };

  // Fetch audit logs for undo actions
  const fetchAuditLogs = async () => {
    try {
      const q = query(
        collection(db, 'audit_logs'),
        where('action', '==', 'undo'),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAuditLogs(logs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="w-full space-y-3">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-3">
          <div className="flex items-center justify-between">
            {/* Title and Subtitle */}
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Contract Invoices - Payment Tracking
              </h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Manage invoices and track payments • Financial Year:{" "}
                {getCurrentFinancialYear().year}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Expand/Collapse All Button */}
              <button
                onClick={toggleExpandAll}
                className={`${isAllExpanded ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-1 px-2 rounded text-xs font-medium flex items-center gap-1 whitespace-nowrap`}
                title={isAllExpanded ? "Collapse all contract details" : "Expand all contract details"}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isAllExpanded ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  )}
                </svg>
                {isAllExpanded ? "Collapse All" : "Expand All"}
              </button>

              {/* College Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">College:</label>
                <select
                  value={selectedCollegeFilter}
                  onChange={(e) => setSelectedCollegeFilter(e.target.value)}
                  className="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Colleges</option>
                  {getUniqueColleges().map(college => (
                    <option key={college} value={college}>{college}</option>
                  ))}
                </select>
              </div>

              {/* Export Toggle Button */}
              <button
                onClick={() => setShowExportView(!showExportView)}
                className="bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap"
                title={showExportView ? "Return to table view" : "Switch to export view for bulk operations"}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {showExportView ? "Back to Table" : "Export"}
              </button>

              {/* Audit Logs Button */}
              <button
                onClick={() => { fetchAuditLogs(); setShowAuditModal(true); }}
                className="bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap"
                title="View audit logs for undo actions"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Audit Logs
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {showExportView ? (
          /* EXCEL EXPORT VIEW */
          <InvoiceExcelExport />
        ) : (
          <div>
            {/* Tabs Navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-1">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("individual")}
                  className={`flex-1 py-3 px-4 text-center font-medium text-sm rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === "individual"
                      ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Individual Invoices
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold py-0.5 px-2 rounded-full">
                    {getFilteredContracts(individualContracts).length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("merged")}
                  className={`flex-1 py-3 px-4 text-center font-medium text-sm rounded-lg transition-colors ${
                    activeTab === "merged"
                      ? "bg-purple-50 text-purple-700 border-b-2 border-purple-500"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Merged Invoices
                  <span className="ml-2 bg-purple-100 text-purple-800 text-xs font-semibold py-0.5 px-2 rounded-full">
                    {getFilteredContracts(mergedContracts, true).length}
                  </span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === "individual" ? (
              /* INDIVIDUAL VIEW TAB */
              <div className="space-y-3 mt-3">
                {getFilteredContracts(individualContracts).length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
                    <div className="text-center max-w-md mx-auto">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <svg
                          className="w-6 h-6 text-blue-600"
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
                        No individual contracts available
                      </h3>
                      <p className="text-gray-500 text-xs mb-4">
                        All contracts are either merged or have individual
                        invoices generated. Switch to Merged View to see
                        available contracts.
                      </p>
                      <button
                        onClick={() => setActiveTab("merged")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Switch to Merged View
                      </button>
                    </div>
                  </div>
                ) : (
                  getFilteredContracts(individualContracts).map((invoice) => {
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
                        className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-shadow duration-200"
                      >
                        {/* College Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-lg font-bold text-white truncate">
                                  {invoice.collegeName ||
                                    invoice.collegeCode ||
                                    "N/A"}
                                </h2>
                                <span className="bg-blue-800/80 text-white text-xs font-semibold py-1 px-2 rounded-full border border-blue-600/50">
                                  {generatedCount}/{totalInstallments}
                                </span>
                              </div>
                              <p className="text-blue-100 text-sm truncate">
                                Project Code:{" "}
                                {invoice.projectCode || invoice.id} • Payment
                                Type: {getPaymentTypeName(invoice.paymentType)}{" "}
                                • Students: {invoice.studentCount || "N/A"} •
                                Total Amount:{" "}
                                {formatIndianCurrency(
                                  invoice.netPayableAmount || invoice.totalCost
                                )}
                              </p>
                            </div>
                            <div className="ml-3 flex-shrink-0">
                              <button
                                onClick={() => toggleExpand(invoice.id)}
                                className="text-white hover:bg-blue-700/50 p-1 rounded-lg transition-colors duration-200"
                                title={expandedRows.has(invoice.id) ? "Collapse details" : "Expand details"}
                              >
                                <FontAwesomeIcon
                                  icon={
                                    expandedRows.has(invoice.id)
                                      ? faChevronUp
                                      : faChevronDown
                                  }
                                  className="w-5 h-5"
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Mobile Card View */}
                        <div className="block md:hidden p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50/50 rounded-lg p-3">
                              <p className="text-xs font-bold text-gray-500 mb-1">
                                Course
                              </p>
                              <p className="text-sm text-gray-900 font-medium">
                                {invoice.course || "N/A"}
                              </p>
                            </div>
                            <div className="bg-gray-50/50 rounded-lg p-3">
                              <p className="text-xs font-bold text-gray-500 mb-1">
                                Year
                              </p>
                              <p className="text-sm text-gray-900 font-medium">
                                {invoice.year || "N/A"}
                              </p>
                            </div>
                            <div className="bg-gray-50/50 rounded-lg p-3">
                              <p className="text-xs font-bold text-gray-500 mb-1">
                                Per Student Cost
                              </p>
                              <p className="text-sm text-gray-900 font-medium">
                                {formatIndianCurrency(invoice.perStudentCost)}
                              </p>
                            </div>
                            <div className="bg-gray-50/50 rounded-lg p-3">
                              <p className="text-xs font-bold text-gray-500 mb-1">
                                Generated Invoices
                              </p>
                              <p className="text-sm text-gray-900">
                                {contractInvoices.length > 0 ? (
                                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold py-1 px-2 rounded-full border border-blue-300">
                                    {generatedCount}/{totalInstallments}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-medium">
                                    0/{totalInstallments}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Desktop Grid View */}
                        <div className="hidden md:grid md:grid-cols-4 gap-4 mb-4 p-4">
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
                              {formatIndianCurrency(invoice.perStudentCost)}
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
                          <div className="border-t border-gray-100">
                            {/* Mobile Installments Cards */}
                            <div className="block md:hidden p-4 space-y-3">
                              {(() => {
                                const allInvoicesForContract =
                                  existingInvoices
                                    .filter(
                                      (inv) =>
                                        inv.originalInvoiceId === invoice.id
                                    )
                                    .concat(
                                      existingProformas.filter(
                                        (inv) =>
                                          inv.originalInvoiceId ===
                                            invoice.id &&
                                          !inv.convertedToTax
                                      )
                                    );

                                return invoice.paymentDetails?.map(
                                  (installment, index) => {
                                    const invoicesForInstallment =
                                      allInvoicesForContract.filter(
                                        (inv) =>
                                          inv.installment === installment.name &&
                                          (inv.installmentIndex === undefined || inv.installmentIndex === index)
                                      );

                                    // Sort: active first, then cancelled, by raisedDate desc
                                    invoicesForInstallment.sort((a, b) => {
                                      const aCancelled =
                                        a.status === "cancelled" ||
                                        a.approvalStatus === "cancelled";
                                      const bCancelled =
                                        b.status === "cancelled" ||
                                        b.approvalStatus === "cancelled";
                                      if (aCancelled && !bCancelled)
                                        return 1;
                                      if (bCancelled && !aCancelled)
                                        return -1;
                                      return (
                                        new Date(b.raisedDate || 0) -
                                        new Date(a.raisedDate || 0)
                                      );
                                    });

                                    if (invoicesForInstallment.length > 0) {
                                      return invoicesForInstallment.map(
                                        (inv, invIndex) => {
                                          const isCancelled =
                                            inv.status === "cancelled" ||
                                            inv.approvalStatus ===
                                              "cancelled";
                                          const totalAmount =
                                            inv.amountRaised ||
                                            inv.netPayableAmount ||
                                            installment.totalAmount;
                                          const receivedAmount =
                                            inv.receivedAmount || 0;

                                          // Calculate total TDS amount from payment history
                                          const totalTdsAmount = inv.paymentHistory?.reduce((sum, payment) => {
                                            return sum + (parseFloat(payment.tdsAmount) || 0);
                                          }, 0) || 0;

                                          // Due amount should account for TDS: totalAmount - (receivedAmount + totalTdsAmount)
                                          const dueAmount =
                                            totalAmount - (receivedAmount + totalTdsAmount);

                                          return (
                                            <div
                                              key={`${index}-${invIndex}`}
                                              className={`bg-gradient-to-r ${isCancelled ? 'from-red-50 to-red-100/50' : 'from-gray-50 to-gray-100/50'} rounded-xl p-4 border ${isCancelled ? 'border-red-200' : 'border-gray-200'} cursor-pointer hover:shadow-md transition-all duration-200`}
                                              onClick={() =>
                                                setSelectedInvoice(inv)
                                              }
                                            >
                                              <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                  <h4 className="text-sm font-semibold text-gray-900">
                                                    {installment.name}
                                                  </h4>
                                                  {isCancelled && (
                                                    <span className="bg-red-100 text-red-700 text-xs font-medium py-0.5 px-2 rounded-full border border-red-300">
                                                      Cancelled
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-right">
                                                  <div className={`text-sm font-bold ${dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {dueAmount === 0 ? "Paid" : formatIndianCurrency(dueAmount) + " Due"}
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div>
                                                  <p className="text-xs text-gray-500 mb-1">Percentage</p>
                                                  <p className="text-sm font-medium text-gray-900">{installment.percentage}%</p>
                                                </div>
                                                <div>
                                                  <p className="text-xs text-gray-500 mb-1">Amount</p>
                                                  <p className="text-sm font-semibold text-gray-900">{formatIndianCurrency(installment.totalAmount)}</p>
                                                </div>
                                              </div>

                                              <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <span className={`text-xs font-semibold py-1 px-2 rounded-full ${
                                                      inv.invoiceType === "Tax Invoice"
                                                        ? "bg-green-100 text-green-800 border border-green-300"
                                                        : inv.invoiceType === "Cash Invoice"
                                                        ? "bg-orange-100 text-orange-800 border border-orange-300"
                                                        : "bg-blue-100 text-blue-800 border border-blue-300"
                                                    }`}>
                                                      {inv.invoiceType === "Proforma Invoice" ? "Proforma" :
                                                       inv.invoiceType === "Cash Invoice" ? "Cash" : "Tax"}
                                                    </span>
                                                    {inv.invoiceType === "Tax Invoice" && getApprovalStatusBadge(inv)}
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    {inv.invoiceNumber || "N/A"}
                                                    {inv.convertedFromProforma && (
                                                      <span className="text-purple-600 block">
                                                        From: {inv.originalProformaNumber}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedInvoice(inv);
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                                  >
                                                    View
                                                  </button>
                                                  {!isCancelled && !inv.regeneratedFrom && (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCancelInvoice(inv);
                                                      }}
                                                      className="bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                                    >
                                                      Undo
                                                    </button>
                                                  )}
                                                  {!isCancelled && inv.invoiceType === "Proforma Invoice" && (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleConvertToTax(inv);
                                                      }}
                                                      className="bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                                    >
                                                      Generate TI
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }
                                      );
                                    } else {
                                      // No invoices for this installment - mobile card
                                      return (
                                        <div
                                          key={index}
                                          className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200 cursor-pointer hover:shadow-md transition-all duration-200"
                                          onClick={() =>
                                            setRowClickModal({
                                              isOpen: true,
                                              invoice: null,
                                              installment: installment,
                                              contract: invoice,
                                            })
                                          }
                                        >
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold text-gray-900">
                                              {installment.name}
                                            </h4>
                                            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium py-1 px-2 rounded-full border border-yellow-300">
                                              Not Generated
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                              <p className="text-xs text-gray-500 mb-1">Percentage</p>
                                              <p className="text-sm font-medium text-gray-900">{installment.percentage}%</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 mb-1">Amount</p>
                                              <p className="text-sm font-semibold text-gray-900">{formatIndianCurrency(installment.totalAmount)}</p>
                                            </div>
                                          </div>

                                          <div className="flex justify-end">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleGenerateInvoice(invoice, installment);
                                              }}
                                              className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-4 rounded-lg text-sm font-medium transition-colors duration-200"
                                            >
                                              Generate
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    }
                                  }
                                );
                              })()}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block p-4">
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Installment
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Percentage
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Amount
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Invoice Type
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Received Amount
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Due Amount
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {(() => {
                                      const allInvoicesForContract =
                                        existingInvoices
                                          .filter(
                                            (inv) =>
                                              inv.originalInvoiceId === invoice.id
                                          )
                                          .concat(
                                            existingProformas.filter(
                                              (inv) =>
                                                inv.originalInvoiceId ===
                                                  invoice.id &&
                                                !inv.convertedToTax
                                            )
                                          );

                                      return invoice.paymentDetails?.map(
                                        (installment, index) => {
                                          const invoicesForInstallment =
                                            allInvoicesForContract.filter(
                                              (inv) =>
                                                inv.installment === installment.name &&
                                                (inv.installmentIndex === undefined || inv.installmentIndex === index)
                                            );

                                          // Sort: active first, then cancelled, by raisedDate desc
                                          invoicesForInstallment.sort((a, b) => {
                                            const aCancelled =
                                              a.status === "cancelled" ||
                                              a.approvalStatus === "cancelled";
                                            const bCancelled =
                                              b.status === "cancelled" ||
                                              b.approvalStatus === "cancelled";
                                            if (aCancelled && !bCancelled)
                                              return 1;
                                            if (bCancelled && !aCancelled)
                                              return -1;
                                            return (
                                              new Date(b.raisedDate || 0) -
                                              new Date(a.raisedDate || 0)
                                            );
                                          });

                                          if (invoicesForInstallment.length > 0) {
                                            return invoicesForInstallment.map(
                                              (inv, invIndex) => {
                                                const isCancelled =
                                                  inv.status === "cancelled" ||
                                                  inv.approvalStatus ===
                                                    "cancelled";
                                                const totalAmount =
                                                  inv.amountRaised ||
                                                  inv.netPayableAmount ||
                                                  installment.totalAmount;
                                                const receivedAmount =
                                                  inv.receivedAmount || 0;

                                                // Calculate total TDS amount from payment history
                                                const totalTdsAmount = inv.paymentHistory?.reduce((sum, payment) => {
                                                  return sum + (parseFloat(payment.tdsAmount) || 0);
                                                }, 0) || 0;

                                                // Due amount should account for TDS: totalAmount - (receivedAmount + totalTdsAmount)
                                                const dueAmount =
                                                  totalAmount - (receivedAmount + totalTdsAmount);

                                                return (
                                                  <tr
                                                    key={`${index}-${invIndex}`}
                                                    className={`hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${isCancelled ? "bg-red-50" : ""}`}
                                                    onClick={() =>
                                                      setSelectedInvoice(inv)
                                                    }
                                                  >
                                                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                                      {installment.name}
                                                      {isCancelled && (
                                                        <span className="ml-2 text-xs text-red-500 font-medium">
                                                          (Cancelled)
                                                        </span>
                                                      )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">
                                                      {installment.percentage}%
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                                                      {formatIndianCurrency(
                                                        installment.totalAmount
                                                      )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">
                                                      <div className="text-center">
                                                        {/* Invoice type (Tax / Cash / Proforma) */}
                                                        <div
                                                          className={`font-semibold ${inv.invoiceType === "Tax Invoice" ? "text-green-600" : inv.invoiceType === "Cash Invoice" ? "text-orange-600" : "text-blue-600"}`}
                                                        >
                                                          {inv.invoiceType === "Proforma Invoice" ? "Proforma" : inv.invoiceType === "Cash Invoice" ? "Cash" : "Tax"}
                                                          {isCancelled && inv.regenerated && " (Cancelled - Regenerated)"}
                                                          {!isCancelled && inv.regeneratedFrom && ` (Regenerated from ${inv.regeneratedFrom})`}
                                                        </div>

                                                        {/* Approval status sirf Tax Invoice ke liye, Cash aur Proforma ke liye nahi */}
                                                        {inv.invoiceType === "Tax Invoice" && getApprovalStatusBadge(inv)}

                                                        {/* Cash Invoice ke liye special badge */}
                                                        {inv.invoiceType === "Cash Invoice" && (
                                                          <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-800 border border-orange-300">
                                                            Cash
                                                          </span>
                                                        )}

                                                        {/* Proforma Invoice ke liye badge */}
                                                        {inv.invoiceType === "Proforma Invoice" && (
                                                          <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 border border-blue-300">
                                                            Proforma
                                                          </span>
                                                        )}

                                                        {/* Invoice number */}
                                                        <div className="text-xs text-gray-400 mt-0.5">
                                                          {inv.invoiceNumber || "N/A"}
                                                        </div>

                                                        {/* From: Proforma number niche dikhana hai */}
                                                        {inv.convertedFromProforma && (
                                                          <div className="text-xs text-purple-600 mt-0.5">
                                                            From:{" "}
                                                            {inv.originalProformaNumber}
                                                          </div>
                                                        )}
                                                      </div>
                                                    </td>

                                                    <td className="px-4 py-3 text-sm">
                                                      <span className={`font-semibold ${receivedAmount > 0 ? "text-green-600" : "text-gray-600"}`}>
                                                        {formatIndianCurrency(receivedAmount)}
                                                      </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                      <span className={`font-semibold ${dueAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                                                        {dueAmount === 0 ? "0" : formatIndianCurrency(dueAmount)}
                                                      </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                      <div className="flex gap-2">
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedInvoice(inv);
                                                          }}
                                                          className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                                        >
                                                          View
                                                        </button>
                                                        {!isCancelled && !inv.regeneratedFrom && (
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleCancelInvoice(inv);
                                                            }}
                                                            className="bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                                            title="Cancel this invoice"
                                                          >
                                                            Undo
                                                          </button>
                                                        )}
                                                        {isCancelled && !inv.regenerated && (
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleGenerateInvoice(invoice, installment, true, inv);
                                                            }}
                                                            className="bg-orange-600 hover:bg-orange-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                                            title="Regenerate cancelled invoice"
                                                          >
                                                            Regenerate
                                                          </button>
                                                        )}
                                                        {!isCancelled && inv.invoiceType === "Proforma Invoice" && (
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleConvertToTax(inv);
                                                            }}
                                                            className="bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                                          >
                                                            Generate TI
                                                          </button>
                                                        )}
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              }
                                            );
                                          } else {
                                            // No invoices for this installment
                                            return (
                                              <tr
                                                key={index}
                                                className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                                                onClick={() =>
                                                  setRowClickModal({
                                                    isOpen: true,
                                                    invoice: null,
                                                    installment: installment,
                                                    contract: invoice,
                                                  })
                                                }
                                              >
                                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                                  {installment.name}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                  {installment.percentage}%
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                                                  {formatIndianCurrency(installment.totalAmount)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                  -
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                  ₹0
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                  {formatIndianCurrency(installment.totalAmount)}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleGenerateInvoice(invoice, installment);
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                                  >
                                                    Generate
                                                  </button>
                                                </td>
                                              </tr>
                                            );
                                          }
                                        }
                                      );
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* MERGED VIEW TAB */
              <div className="space-y-3 mt-3">
                {getFilteredContracts(mergedContracts, true).length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
                    <div className="text-center max-w-md mx-auto">
                      <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <FontAwesomeIcon
                          icon={faObjectGroup}
                          className="w-6 h-6 text-purple-600"
                        />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        No contracts in merged view
                      </h3>
                      <p className="text-gray-500 text-xs mb-4">
                        All contracts are either in individual view or have no available installments for merging.
                      </p>
                      <button
                        onClick={() => setActiveTab("individual")}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Switch to Individual View
                      </button>
                    </div>
                  </div>
                ) : (
                  getFilteredContracts(mergedContracts, true).map((mergedItem, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-shadow duration-200"
                    >
                      {/* College Header */}
                      <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h2 className="text-lg font-bold text-white truncate">
                                {mergedItem.collegeName}
                              </h2>
                              <span className="bg-purple-800/80 text-white text-xs font-semibold py-1 px-2 rounded-full border border-purple-600/50">
                                {mergedItem.contracts.length} Contracts
                              </span>
                              <span className="bg-green-600 text-white text-xs font-semibold py-1 px-2 rounded-full">
                                {mergedItem.installmentCount} Installments Each
                              </span>
                            </div>
                            <p className="text-purple-100 text-sm truncate">
                              Project Code: {generateMergedProjectCode(mergedItem)} •
                              Payment Types: {mergedItem.paymentTypes.join(", ")} •
                              Total Students:{" "}
                              {getTotalStudentCount(mergedItem.contracts)} •
                              Total Amount:{" "}
                              {formatIndianCurrency(
                                getTotalContractAmount(mergedItem.contracts)
                              )}
                            </p>
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            <button
                              onClick={() => toggleExpand(`merged-${index}`)}
                              className="text-white hover:bg-purple-700/50 p-1 rounded-lg transition-colors duration-200"
                              title={expandedRows.has(`merged-${index}`) ? "Collapse details" : "Expand details"}
                            >
                              <FontAwesomeIcon
                                icon={
                                  expandedRows.has(`merged-${index}`)
                                    ? faChevronUp
                                    : faChevronDown
                                }
                                className="w-5 h-5"
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Contract Details Cards */}
                      <div className="block md:hidden p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50/50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-500 mb-1">
                              Course
                            </p>
                            <p className="text-sm text-gray-900 font-medium">
                              {[...new Set(mergedItem.contracts.map(c => c.course))].join(", ") || "N/A"}
                            </p>
                          </div>
                          <div className="bg-gray-50/50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-500 mb-1">
                              Year
                            </p>
                            <p className="text-sm text-gray-900 font-medium">
                              {[...new Set(mergedItem.contracts.map(c => c.year))].join(", ") || "N/A"}
                            </p>
                          </div>
                          <div className="bg-gray-50/50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-500 mb-1">
                              Per Student Cost
                            </p>
                            <p className="text-sm text-gray-900 font-medium">
                              {formatIndianCurrency(
                                mergedItem.contracts.reduce((total, c) => total + (parseFloat(c.perStudentCost) || 0), 0) / mergedItem.contracts.length
                              )}
                            </p>
                          </div>
                          <div className="bg-gray-50/50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-500 mb-1">
                              Generated Merged Invoices
                            </p>
                            <p className="text-sm text-gray-900">
                              {(() => {
                                // Count total merged invoices for this group
                                const mergedInvoicesCount = existingInvoices.filter(inv => 
                                  inv.isMergedInvoice && 
                                  inv.mergedContracts &&
                                  inv.mergedContracts.length === mergedItem.contracts.length &&
                                  inv.mergedContracts.every(mc => mergedItem.contracts.some(c => c.id === mc.id))
                                ).length;

                                // Count installments that have individual invoices
                                const individualInvoicesCount = mergedItem.contracts.reduce((count, contract) => {
                                  return count + existingInvoices.filter(inv => 
                                    !inv.isMergedInvoice && 
                                    inv.originalInvoiceId === contract.id
                                  ).length;
                                }, 0);

                                const totalProcessed = mergedInvoicesCount + individualInvoicesCount;
                                const totalPossible = mergedItem.installmentCount;

                                return totalProcessed > 0 ? (
                                  <span className="bg-purple-100 text-purple-800 text-xs font-semibold py-1 px-2 rounded-full border border-purple-300">
                                    {totalProcessed}/{totalPossible}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-medium">
                                    0/{totalPossible}
                                  </span>
                                );
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Grid View */}
                      <div className="hidden md:grid md:grid-cols-4 gap-4 mb-4 p-4">
                        <div>
                          <p className="text-xs font-bold text-gray-500 mb-0.5">
                            Course
                          </p>
                          <p className="text-sm text-gray-900">
                            {[...new Set(mergedItem.contracts.map(c => c.course))].join(", ") || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 mb-0.5">
                            Year
                          </p>
                          <p className="text-sm text-gray-900">
                            {[...new Set(mergedItem.contracts.map(c => c.year))].join(", ") || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 mb-0.5">
                            Per Student Cost
                          </p>
                          <p className="text-sm text-gray-900">
                            {formatIndianCurrency(
                              mergedItem.contracts.reduce((total, c) => total + (parseFloat(c.perStudentCost) || 0), 0) / mergedItem.contracts.length
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-0.5">
                            Generated Merged Invoices
                          </p>
                          <p className="text-sm text-gray-900">
                            {(() => {
                              // Count total merged invoices for this group
                              const mergedInvoicesCount = existingInvoices.filter(inv => 
                                inv.isMergedInvoice && 
                                inv.mergedContracts &&
                                inv.mergedContracts.length === mergedItem.contracts.length &&
                                inv.mergedContracts.every(mc => mergedItem.contracts.some(c => c.id === mc.id))
                              ).length;

                              // Count installments that have individual invoices
                              const individualInvoicesCount = mergedItem.contracts.reduce((count, contract) => {
                                return count + existingInvoices.filter(inv => 
                                  !inv.isMergedInvoice && 
                                  inv.originalInvoiceId === contract.id
                                ).length;
                              }, 0);

                              const totalProcessed = mergedInvoicesCount + individualInvoicesCount;
                              const totalPossible = mergedItem.installmentCount;

                              return totalProcessed > 0 ? (
                                <span className="bg-purple-100 text-purple-800 text-xs font-semibold py-1 px-2 rounded">
                                  {totalProcessed}/{totalPossible}
                                </span>
                              ) : (
                                <span className="text-gray-400">
                                  0/{totalPossible}
                                </span>
                              );
                            })()}
                          </p>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedRows.has(`merged-${index}`) && (
                        <div className="border-t border-gray-100">
                          {/* Mobile Installments Cards */}
                          <div className="block md:hidden p-4 space-y-3">
                            {(() => {
                              // ✅ Collect installments by index across all contracts
                              const installmentsByIndex = {};

                              mergedItem.contracts.forEach(contract => {
                                contract.paymentDetails?.forEach((installment, idx) => {
                                  if (!installmentsByIndex[idx]) {
                                    installmentsByIndex[idx] = {
                                      names: new Set(),
                                      percentages: new Set(),
                                      totalAmount: 0,
                                      contracts: []
                                    };
                                  }

                                  installmentsByIndex[idx].names.add(installment.name);
                                  installmentsByIndex[idx].percentages.add(installment.percentage);
                                  installmentsByIndex[idx].totalAmount += parseFloat(installment.totalAmount) || 0;
                                  installmentsByIndex[idx].contracts.push(contract);
                                });
                              });

                              // Convert to array and sort by index
                              const sortedInstallments = Object.entries(installmentsByIndex)
                                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                .map(([idx, data]) => ({
                                  idx: parseInt(idx),
                                  name: Array.from(data.names).join('/'),
                                  percentage: Array.from(data.percentages)[0], // Take first percentage (should be same)
                                  totalAmount: data.totalAmount,
                                  contracts: data.contracts
                                }));

                              return sortedInstallments.map((installment, idx) => {
                                // Find existing merged invoices for this installment index
                                const existingMergedInvoices =
                                  existingInvoices.filter(
                                    (inv) =>
                                      inv.isMergedInvoice &&
                                      inv.installmentIndex === installment.idx &&
                                      // Check if this invoice belongs to the same group of contracts
                                      inv.mergedContracts &&
                                      inv.mergedContracts.length === mergedItem.contracts.length &&
                                      inv.mergedContracts.every(mc =>
                                        mergedItem.contracts.some(c => c.id === mc.id)
                                      )
                                  );

                                // Filter out Proforma invoices that have been converted to Tax
                                const activeInvoices = existingMergedInvoices.filter(inv => 
                                  !(inv.invoiceType === "Proforma Invoice" && inv.convertedToTax)
                                );

                                // Sort by creation date (most recent first) and take the first one
                                activeInvoices.sort((a, b) => {
                                  const aCancelled = a.status === "cancelled" || a.approvalStatus === "cancelled";
                                  const bCancelled = b.status === "cancelled" || b.approvalStatus === "cancelled";
                                  if (aCancelled && !bCancelled) return 1;
                                  if (bCancelled && !aCancelled) return -1;
                                  return new Date(b.raisedDate || 0) - new Date(a.raisedDate || 0);
                                });

                                // Take only the most recent active invoice
                                const invoiceToShow = activeInvoices[0];

                                // For merged view, show each installment with its status
                                if (invoiceToShow) {
                                  const inv = invoiceToShow;
                                  const totalAmount =
                                    inv.amountRaised ||
                                    inv.netPayableAmount ||
                                    installment.totalAmount;
                                  const receivedAmount =
                                    inv.receivedAmount || 0;

                                  // Calculate total TDS amount from payment history
                                  const totalTdsAmount = inv.paymentHistory?.reduce((sum, payment) => {
                                    return sum + (parseFloat(payment.tdsAmount) || 0);
                                  }, 0) || 0;

                                  // Due amount should account for TDS: totalAmount - (receivedAmount + totalTdsAmount)
                                  const dueAmount =
                                    totalAmount - (receivedAmount + totalTdsAmount);
                                  const isCancelled =
                                    inv.status === "cancelled" ||
                                    inv.approvalStatus === "cancelled";

                                  return (
                                    <div
                                      key={idx}
                                      className={`bg-gradient-to-r ${isCancelled ? 'from-red-50 to-red-100/50' : 'from-gray-50 to-gray-100/50'} rounded-xl p-4 border ${isCancelled ? 'border-red-200' : 'border-gray-200'} cursor-pointer hover:shadow-md transition-all duration-200`}
                                      onClick={() =>
                                        setSelectedInvoice(inv)
                                      }
                                    >
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-sm font-semibold text-gray-900">
                                            {installment.name}
                                          </h4>
                                          {isCancelled && (
                                            <span className="bg-red-100 text-red-700 text-xs font-medium py-0.5 px-2 rounded-full border border-red-300">
                                              Cancelled
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <div className={`text-sm font-bold ${dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {dueAmount === 0 ? "Paid" : formatIndianCurrency(dueAmount) + " Due"}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                          <p className="text-xs text-gray-500 mb-1">Percentage</p>
                                          <p className="text-sm font-medium text-gray-900">{installment.percentage}%</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 mb-1">Amount</p>
                                          <p className="text-sm font-semibold text-gray-900">{formatIndianCurrency(installment.totalAmount)}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs font-semibold py-1 px-2 rounded-full ${
                                              inv.invoiceType === "Tax Invoice"
                                                ? "bg-green-100 text-green-800 border border-green-300"
                                                : inv.invoiceType === "Cash Invoice"
                                                ? "bg-orange-100 text-orange-800 border border-orange-300"
                                                : "bg-blue-100 text-blue-800 border border-blue-300"
                                            }`}>
                                              {inv.invoiceType === "Proforma Invoice" ? "Proforma" :
                                               inv.invoiceType === "Cash Invoice" ? "Cash" : "Tax"}
                                            </span>
                                            {inv.invoiceType === "Tax Invoice" && getApprovalStatusBadge(inv)}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {inv.invoiceNumber || "N/A"}
                                            {inv.convertedFromProforma && (
                                              <span className="text-purple-600 block">
                                                From: {inv.originalProformaNumber}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedInvoice(inv);
                                            }}
                                            className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                          >
                                            View
                                          </button>
                                          {!isCancelled && !inv.regeneratedFrom && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleCancelInvoice(inv);
                                              }}
                                              className="bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                            >
                                              Undo
                                            </button>
                                          )}
                                          {!isCancelled && inv.invoiceType === "Proforma Invoice" && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleConvertToTax(inv);
                                              }}
                                              className="bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                            >
                                              Generate TI
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  // No invoice generated yet for this merged installment
                                  return (
                                    <div
                                      key={idx}
                                      className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200 cursor-pointer hover:shadow-md transition-all duration-200"
                                      onClick={() =>
                                        setRowClickModal({
                                          isOpen: true,
                                          invoice: null,
                                          installment: installment,
                                          contract: mergedItem.contracts[0],
                                        })
                                      }
                                    >
                                      <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-gray-900">
                                          {installment.name}
                                        </h4>
                                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium py-0.5 px-2 rounded-full border border-yellow-300">
                                          Not Generated
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                          <p className="text-xs text-gray-500 mb-1">Percentage</p>
                                          <p className="text-sm font-medium text-gray-900">{installment.percentage}%</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 mb-1">Amount</p>
                                          <p className="text-sm font-semibold text-gray-900">{formatIndianCurrency(installment.totalAmount)}</p>
                                        </div>
                                      </div>

                                      <div className="flex justify-end">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMergeGenerate(mergedItem, installment);
                                          }}
                                          className="bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-4 rounded-lg text-sm font-medium transition-colors duration-200"
                                        >
                                          Generate Merged
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }
                              });
                            })()}
                          </div>

                          {/* Desktop Table View */}
                          <div className="hidden md:block p-4">
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Installment
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Percentage
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Amount
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Invoice Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Received Amount
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Due Amount
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {(() => {
                                    // ✅ Collect installments by index across all contracts
                                    const installmentsByIndex = {};

                                    mergedItem.contracts.forEach(contract => {
                                      contract.paymentDetails?.forEach((installment, idx) => {
                                        if (!installmentsByIndex[idx]) {
                                          installmentsByIndex[idx] = {
                                            names: new Set(),
                                            percentages: new Set(),
                                            totalAmount: 0,
                                            contracts: []
                                          };
                                        }

                                        installmentsByIndex[idx].names.add(installment.name);
                                        installmentsByIndex[idx].percentages.add(installment.percentage);
                                        installmentsByIndex[idx].totalAmount += parseFloat(installment.totalAmount) || 0;
                                        installmentsByIndex[idx].contracts.push(contract);
                                      });
                                    });

                                    // Convert to array and sort by index
                                    const sortedInstallments = Object.entries(installmentsByIndex)
                                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                      .map(([idx, data]) => ({
                                      idx: parseInt(idx),
                                      name: Array.from(data.names).join('/'),
                                      percentage: Array.from(data.percentages)[0], // Take first percentage (should be same)
                                      totalAmount: data.totalAmount,
                                      contracts: data.contracts
                                    }));

                                    return sortedInstallments.map((installment, idx) => {
                                      // Find existing merged invoices for this installment index
                                      const existingMergedInvoices =
                                        existingInvoices.filter(
                                          (inv) =>
                                            inv.isMergedInvoice &&
                                            inv.installmentIndex === installment.idx &&
                                            // Check if this invoice belongs to the same group of contracts
                                            inv.mergedContracts &&
                                            inv.mergedContracts.length === mergedItem.contracts.length &&
                                            inv.mergedContracts.every(mc =>
                                              mergedItem.contracts.some(c => c.id === mc.id)
                                            )
                                        );

                                      // Filter out Proforma invoices that have been converted to Tax
                                      const activeInvoices = existingMergedInvoices.filter(inv => 
                                        !(inv.invoiceType === "Proforma Invoice" && inv.convertedToTax)
                                      );

                                      // Sort by creation date (most recent first) and take the first one
                                      activeInvoices.sort((a, b) => {
                                        const aCancelled = a.status === "cancelled" || a.approvalStatus === "cancelled";
                                        const bCancelled = b.status === "cancelled" || b.approvalStatus === "cancelled";
                                        if (aCancelled && !bCancelled) return 1;
                                        if (bCancelled && !aCancelled) return -1;
                                        return new Date(b.raisedDate || 0) - new Date(a.raisedDate || 0);
                                      });

                                      // Take only the most recent active invoice
                                      const invoiceToShow = activeInvoices[0];

                                      // For merged view, show each installment with its status
                                      if (invoiceToShow) {
                                        const inv = invoiceToShow;
                                        const totalAmount =
                                          inv.amountRaised ||
                                          inv.netPayableAmount ||
                                          installment.totalAmount;
                                        const receivedAmount =
                                          inv.receivedAmount || 0;

                                        // Calculate total TDS amount from payment history
                                        const totalTdsAmount = inv.paymentHistory?.reduce((sum, payment) => {
                                          return sum + (parseFloat(payment.tdsAmount) || 0);
                                        }, 0) || 0;

                                        // Due amount should account for TDS: totalAmount - (receivedAmount + totalTdsAmount)
                                        const dueAmount =
                                          totalAmount - (receivedAmount + totalTdsAmount);
                                        const isCancelled =
                                          inv.status === "cancelled" ||
                                          inv.approvalStatus === "cancelled";

                                        return (
                                          <tr
                                            key={idx}
                                            className={`hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${isCancelled ? "bg-red-50" : ""}`}
                                            onClick={() =>
                                              setSelectedInvoice(inv)
                                            }
                                          >
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                              {installment.name}
                                              {isCancelled && (
                                                <span className="ml-2 text-xs text-red-500 font-medium">
                                                  (Cancelled)
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                              {installment.percentage}%
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                                              {formatIndianCurrency(installment.totalAmount)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                              <div className="text-center">
                                                <div
                                                  className={`font-semibold ${inv.invoiceType === "Tax Invoice" ? "text-green-600" : inv.invoiceType === "Cash Invoice" ? "text-orange-600" : "text-blue-600"}`}
                                                >
                                                  {inv.invoiceType === "Proforma Invoice" ? "Proforma" : inv.invoiceType === "Cash Invoice" ? "Cash" : "Tax"}
                                                  {isCancelled && inv.regenerated && " (Cancelled - Regenerated)"}
                                                  {!isCancelled && inv.regeneratedFrom && ` (Regenerated from ${inv.regeneratedFrom})`}
                                                </div>

                                                {/* Approval status sirf Tax Invoice ke liye, Cash aur Proforma ke liye nahi */}
                                                {inv.invoiceType === "Tax Invoice" && getApprovalStatusBadge(inv)}

                                                {/* Cash Invoice ke liye special badge */}
                                                {inv.invoiceType === "Cash Invoice" && (
                                                  <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-800 border border-orange-300">
                                                    Cash
                                                  </span>
                                                )}

                                                {/* Proforma Invoice ke liye badge */}
                                                {inv.invoiceType === "Proforma Invoice" && (
                                                  <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 border border-blue-300">
                                                    Proforma
                                                  </span>
                                                )}

                                                <div className="text-xs text-gray-400 mt-0.5">
                                                  {inv.invoiceNumber || "N/A"}
                                                </div>

                                                {/* From: Proforma number niche dikhana hai agar converted hai */}
                                                {inv.convertedFromProforma && (
                                                  <div className="text-xs text-purple-600 mt-0.5">
                                                    From: {inv.originalProformaNumber}
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                              <span className={`font-semibold ${receivedAmount > 0 ? "text-green-600" : "text-gray-600"}`}>
                                                {formatIndianCurrency(receivedAmount)}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                              <span className={`font-semibold ${dueAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                                                {dueAmount === 0 ? "0" : formatIndianCurrency(dueAmount)}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedInvoice(inv);
                                                  }}
                                                  className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                                >
                                                  View
                                                </button>
                                                {!isCancelled && !inv.regeneratedFrom && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleCancelInvoice(inv);
                                                    }}
                                                    className="bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                                    title="Cancel this invoice"
                                                  >
                                                    Undo
                                                  </button>
                                                )}
                                                {!isCancelled && inv.invoiceType === "Proforma Invoice" && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleConvertToTax(inv);
                                                    }}
                                                    className="bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                                  >
                                                    Generate TI
                                                  </button>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      } else {
                                        // No invoice generated yet for this merged installment
                                        return (
                                          <tr
                                            key={idx}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                                            onClick={() =>
                                              setRowClickModal({
                                                isOpen: true,
                                                invoice: null,
                                                installment: installment,
                                                contract: mergedItem.contracts[0],
                                              })
                                            }
                                          >
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                              {installment.name}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                              {installment.percentage}%
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                                              {formatIndianCurrency(installment.totalAmount)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                              -
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                              ₹0
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                              {formatIndianCurrency(installment.totalAmount)}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMergeGenerate(mergedItem, installment);
                                                }}
                                                className="bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200"
                                              >
                                                Generate Merged
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
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* All your existing modals remain the same */}
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
              handleSubmit(formData, contract, installment, false, true)
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
                editInvoice?.status === "cancelled" ||
                  editInvoice?.approvalStatus === "cancelled"
              )
            }
            isEdit={!!editInvoice}
            isRegenerate={editInvoice?.approvalStatus === "cancelled"}
            editInvoice={editInvoice}
          />
        )}

        <MergeInvoicesModal
          isOpen={showMergeModal}
          contracts={selectedContractsForMerge}
          installment={selectedInstallmentForMerge}
          projectCode={
            selectedContractsForMerge.length > 0
              ? generateMergedProjectCode(
                  {
                    contracts: selectedContractsForMerge,
                    collegeName: selectedContractsForMerge[0].collegeName,
                    collegeCode: selectedContractsForMerge[0].collegeCode,
                  },
                  selectedInstallmentForMerge
                )
              : ""
          }
          onClose={() => {
            setShowMergeModal(false);
            setSelectedContractsForMerge([]);
            setSelectedInstallmentForMerge(null);
          }}
          onSubmit={handleMergeSubmit}
        />

        {selectedInvoice && (
          <InvoiceModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onRegister={(invoice) => handleRegisterInvoice(invoice)}
            onInvoiceUpdate={(updatedInvoice) => {
              // ✅ State update karo parent mein bhi
              setExistingInvoices((prev) =>
                prev.map((inv) =>
                  inv.id === updatedInvoice.id ? updatedInvoice : inv
                )
              );
              setSelectedInvoice(updatedInvoice); // Modal mein bhi update ho
            }}
            isViewOnly={true}
          />
        )}

        {rowClickModal.isOpen && (
          <RowClickModal
            installment={rowClickModal.installment}
            invoice={rowClickModal.invoice}
            contract={rowClickModal.contract}
            onClose={() =>
              setRowClickModal({
                isOpen: false,
                invoice: null,
                installment: null,
                contract: null,
              })
            }
          />
        )}

        {showAuditModal && (
          <div className="fixed inset-0 bg-transparent backdrop-blur-lg bg-opacity-60 flex items-center justify-center z-54 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[85vh] overflow-hidden border border-gray-200/60">
              {/* Compact Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Audit Logs</h2>
                      <p className="text-red-100 text-xs">Invoice cancellation history</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-md font-medium">
                      {auditLogs.length} {auditLogs.length === 1 ? 'entry' : 'entries'}
                    </span>
                    <button
                      onClick={() => setShowAuditModal(false)}
                      className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-md flex items-center justify-center transition-colors duration-200"
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Compact Content */}
              <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
                {auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">No Audit Logs</h3>
                    <p className="text-gray-500 text-sm text-center max-w-sm">
                      Invoice cancellation actions will appear here
                    </p>
                  </div>
                ) : (
                  <div className="p-4">
                    {/* Compact Table Header */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="col-span-1">#</div>
                        <div className="col-span-2">Action</div>
                        <div className="col-span-3">Invoice</div>
                        <div className="col-span-2">User</div>
                        <div className="col-span-3">Timestamp</div>
                        <div className="col-span-1">Details</div>
                      </div>
                    </div>

                    {/* Compact Log Entries */}
                    <div className="space-y-1">
                      {auditLogs.map((log, index) => (
                        <div
                          key={log.id}
                          className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150"
                        >
                          <div className="grid grid-cols-12 gap-2 items-center text-sm">
                            {/* Entry Number */}
                            <div className="col-span-1">
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                {auditLogs.length - index}
                              </span>
                            </div>

                            {/* Action */}
                            <div className="col-span-2">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-red-100 rounded-md flex items-center justify-center flex-shrink-0">
                                  <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </div>
                                <span className="font-medium text-gray-900 truncate">
                                  {log.action || 'Invoice Cancelled'}
                                </span>
                              </div>
                            </div>

                            {/* Invoice Info */}
                            <div className="col-span-3">
                              <div className="space-y-0.5">
                                <div className="font-mono text-xs text-gray-900">
                                  {log.invoiceNumber || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  ID: {log.invoiceId || 'N/A'}
                                </div>
                              </div>
                            </div>

                            {/* User */}
                            <div className="col-span-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                                <span className="text-xs text-gray-900 truncate">
                                  {log.user || 'Unknown'}
                                </span>
                              </div>
                            </div>

                            {/* Timestamp */}
                            <div className="col-span-3">
                              <div className="text-xs text-gray-600">
                                {log.timestamp?.toDate
                                  ? log.timestamp.toDate().toLocaleDateString('en-IN', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : new Date(log.timestamp).toLocaleDateString('en-IN', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                }
                              </div>
                            </div>

                            {/* Details - Now shows content inline */}
                            <div className="col-span-1">
                              {log.details ? (
                                <div className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                  <div className="truncate" title={log.details}>
                                    {log.details.length > 15 ? `${log.details.substring(0, 15)}...` : log.details}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </div>
                          </div>

                          {/* Full Details Expansion - Only if details are very long */}
                          {log.details && log.details.length > 50 && (
                            <div className="col-span-12 mt-2">
                              <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                                <div className="text-xs font-medium text-blue-700 mb-1">Full Details:</div>
                                <div className="text-xs text-blue-800 leading-relaxed">
                                  {log.details}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
