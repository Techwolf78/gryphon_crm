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
  const getMergableContracts = () => {
    const contractsWithIndividualInvoices = new Set();

    // Collect all contract IDs that have individual invoices
    existingInvoices.forEach((invoice) => {
      if (!invoice.isMergedInvoice && invoice.originalInvoiceId) {
        contractsWithIndividualInvoices.add(invoice.originalInvoiceId);
      }
    });

    // Also include contracts that have proforma invoices
    existingProformas.forEach((proforma) => {
      if (proforma.originalInvoiceId) {
        contractsWithIndividualInvoices.add(proforma.originalInvoiceId);
      }
    });

    // Filter out contracts that have individual invoices
    return invoices.filter(
      (contract) => !contractsWithIndividualInvoices.has(contract.id)
    );
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "-";
    try {
      const numAmount = Number(amount);
      if (isNaN(numAmount)) return "-";

      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(numAmount);
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

  // Generate unique sequential invoice number for ALL invoice types - COMBINED COUNTING
  const generateInvoiceNumber = async (invoiceType = "Tax Invoice") => {
    const financialYear = getCurrentFinancialYear();

    // Prefix set karo based on invoice type
    let prefix = "TI";
    if (invoiceType === "Proforma Invoice") prefix = "PI";
    if (invoiceType === "Cash Invoice") prefix = "CI";

    try {
      const [invoicesSnapshot, proformaSnapshot] = await Promise.all([
        getDocs(
          query(
            collection(db, "ContractInvoices"),
            where("financialYear", "==", financialYear.year)
          )
        ),
        getDocs(
          query(
            collection(db, "ProformaInvoices"),
            where("financialYear", "==", financialYear.year)
          )
        ),
      ]);

      // Combine ALL invoices from both collections
      const allInvoices = [
        ...invoicesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        ...proformaSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      ];

      // Filter sirf CURRENT financial year ke invoices
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

          // Check if it's a proper sequential number (01, 02, etc.)
          if (/^\d+$/.test(sequentialPart)) {
            const num = parseInt(sequentialPart, 10);
            return isNaN(num) ? 0 : num;
          }

          return 0;
        })
        .filter((num) => num > 0);

      let nextInvoiceNumber = 1;

      if (invoiceNumbers.length > 0) {
        const maxInvoiceNumber = Math.max(...invoiceNumbers);
        nextInvoiceNumber = maxInvoiceNumber + 1;
      } else {
      }

      // YEH LINE CHANGE KARDI - 3 digit ki jagah 2 digit
      const invoiceNumber = nextInvoiceNumber.toString().padStart(2, "0");
      const finalInvoiceNumber = `GAPL/${financialYear.year}/${prefix}/${invoiceNumber}`;

      return finalInvoiceNumber;
    } catch (error) {
      const fallbackNumber = `GAPL/${financialYear.year}/${prefix}/01`;
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
      await updateDoc(doc(db, "ProformaInvoices", invoice.id), {
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

      alert(
        `Invoice converted to Tax Invoice successfully! Invoice Number: ${taxInvoiceNumber}`
      );

      // Modal close karo - koi modal open mat karo
      setShowModal(false);
      setSelectedContract(null);
      setSelectedInstallment(null);
      setEditInvoice(null);
    } catch (error) {
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
      // Delete the invoice from database
      await deleteDoc(doc(db, "ContractInvoices", invoice.id));

      // Update local state by removing the invoice
      setExistingInvoices((prev) =>
        prev.filter((inv) => inv.id !== invoice.id)
      );

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
      const isCashInvoice = formData.invoiceType === "Cash Invoice";
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
        // YEH LINE ADD KARO - pehle if ka closing
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

        // Cash Invoice ke liye GST zero karo
        if (formData.invoiceType === "Cash Invoice") {
          regenerateData.gstAmount = 0;
          regenerateData.netPayableAmount =
            regenerateData.baseAmount || regenerateData.netPayableAmount / 1.18;
          regenerateData.amountRaised = regenerateData.netPayableAmount;
          regenerateData.dueAmount = regenerateData.netPayableAmount;
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

        let totalAmount = selectedInstallment
          ? selectedInstallment.totalAmount
          : contract.netPayableAmount;

        let baseAmount, gstAmount;

        // Cash Invoice ke liye different calculation
        if (formData.invoiceType === "Cash Invoice") {
          baseAmount = totalAmount;
          gstAmount = 0;
          totalAmount = baseAmount;
        } else {
          // Tax/Proforma invoice ke liye normal calculation
          baseAmount = totalAmount / 1.18;
          gstAmount = totalAmount - baseAmount;
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
    } catch (err) {
      alert("Failed to register invoice");
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
    const mergableContracts = getMergableContracts();
    const merged = {};

    mergableContracts.forEach((contract) => {
      const collegeName = contract.collegeName;

      // ✅ Check if contract has valid installment structure
      if (
        !contract.paymentDetails ||
        !Array.isArray(contract.paymentDetails) ||
        contract.paymentDetails.length === 0
      ) {
        return; // Skip contracts without proper installment structure
      }

      // ✅ Installment COUNT se group karo (names/percentages se koi lena-dena nahi)
      const installmentCount = contract.paymentDetails.length;

      // ✅ Final grouping key: collegeName + installmentCount
      const key = `${collegeName}-${installmentCount}`;

      if (!merged[key]) {
        merged[key] = {
          collegeName: contract.collegeName,
          collegeCode: contract.collegeCode,
          installmentCount: installmentCount,
          contracts: [contract],
          installments: {},
        };
      } else {
        merged[key].contracts.push(contract);
      }

      // Process installments for this college+count group - EMI FIX
      contract.paymentDetails?.forEach((installment) => {
        const installmentName = installment.name;
        const installmentAmount = calculateEMIAmount(contract, installmentName);

        if (!merged[key].installments[installmentName]) {
          merged[key].installments[installmentName] = {
            name: installment.name,
            percentage: installment.percentage,
            contracts: [contract],
            totalAmount: installmentAmount, // ✅ EMI amount use karo
            courses: [contract.course],
            years: [contract.year],
            studentCounts: [contract.studentCount],
          };
        } else {
          merged[key].installments[installmentName].contracts.push(contract);
          merged[key].installments[installmentName].totalAmount +=
            installmentAmount; // ✅ EMI amount add karo
          merged[key].installments[installmentName].courses.push(
            contract.course
          );
          merged[key].installments[installmentName].years.push(contract.year);
          merged[key].installments[installmentName].studentCounts.push(
            contract.studentCount
          );
        }
      });
    });

    return Object.values(merged);
  };

  // Generate merged project code
  const generateMergedProjectCode = (mergedItem, installment) => {
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

  // Temporary EMI fix - agar data mein amounts nahi hain toh
  const calculateEMIAmount = (contract, installmentName) => {
    if (!contract.paymentDetails || !Array.isArray(contract.paymentDetails)) {
      return 0;
    }

    const installmentDetail = contract.paymentDetails.find(
      (p) => p.name === installmentName
    );

    // Pehle check karo ki installment detail mein amount hai ya nahi
    if (installmentDetail && installmentDetail.totalAmount) {
      const amount = parseFloat(installmentDetail.totalAmount);
      return isNaN(amount) ? 0 : amount;
    }

    // EMI ke liye total amount se calculate karo
    if (contract.paymentType === "EMI") {
      const totalAmount =
        parseFloat(contract.netPayableAmount) ||
        parseFloat(contract.totalCost) ||
        0;

      if (totalAmount > 0 && contract.paymentDetails.length > 0) {
        // Equal installments mein divide karo
        return totalAmount / contract.paymentDetails.length;
      }
    }

    // Percentage se calculate karo
    if (installmentDetail && installmentDetail.percentage) {
      const totalAmount =
        parseFloat(contract.netPayableAmount) ||
        parseFloat(contract.totalCost) ||
        0;
      const percentage = parseFloat(installmentDetail.percentage) || 0;

      if (totalAmount > 0 && percentage > 0) {
        return (totalAmount * percentage) / 100;
      }
    }

    // Last resort: 0 return karo
    return 0;
  };

  // Submit merged invoice - CORRECTED VERSION
  const handleMergeSubmit = async (formData) => {
    if (!selectedContractsForMerge.length || !selectedInstallmentForMerge) {
      alert("Error: No contracts selected for merge.");
      return;
    }

    try {
      const financialYear = getCurrentFinancialYear();
      const currentDate = new Date();
      const invoiceNumber = await generateInvoiceNumber(formData.invoiceType);

      // Calculate totals from all selected contracts
      let totalBaseAmount = 0;
      let totalStudentCount = 0;
      const courses = [];
      const years = [];
      let perStudentCost = 0;

      selectedContractsForMerge.forEach((contract) => {
        // Use the calculateEMIAmount function to get installment amount
        const installmentAmount = calculateEMIAmount(
          contract,
          selectedInstallmentForMerge.name
        );

        // Calculate base amount (without GST)
        const installmentBaseAmount = installmentAmount / 1.18; // Assuming 18% GST
        totalBaseAmount += installmentBaseAmount;

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

      // Calculate GST properly (18%)
      const gstRate = 0.18;
      const gstAmount = totalBaseAmount * gstRate;
      const netPayableAmount = totalBaseAmount + gstAmount;

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
          },
          selectedInstallmentForMerge
        ),
        collegeName: firstContract.collegeName,
        collegeCode: firstContract.collegeCode,
        course: [...new Set(courses)].join(", "),
        year: [...new Set(years)].join(", "),
        deliveryType: firstContract.deliveryType,
        passingYear: firstContract.passingYear,
        studentCount: totalStudentCount,
        perStudentCost: perStudentCost,
        totalCost: totalBaseAmount,
        installment: selectedInstallmentForMerge.name,
        baseAmount: totalBaseAmount,
        gstAmount: gstAmount,
        netPayableAmount: netPayableAmount,
        amountRaised: netPayableAmount,
        receivedAmount: 0,
        dueAmount: netPayableAmount,
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
            baseAmount: totalBaseAmount,
            gstAmount: gstAmount,
            totalAmount: netPayableAmount,
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
      alert(`Merged Invoice ${invoiceNumber} raised successfully!`);

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

  const individualContracts = getIndividualContracts();
  const mergedContracts = getMergedContracts();

  // Helper functions for displaying useful info
  const getUniquePaymentTypes = (contracts) => {
    const types = [
      ...new Set(contracts.map((c) => getPaymentTypeName(c.paymentType))),
    ];
    return types.join(", ");
  };

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

            {/* Export Toggle Button */}
            <button
              onClick={() => setShowExportView(!showExportView)}
              className="bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded-lg font-medium flex items-center gap-1.5"
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
                  className={`flex-1 py-3 px-4 text-center font-medium text-sm rounded-lg transition-colors ${
                    activeTab === "individual"
                      ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Individual Invoices
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold py-0.5 px-2 rounded-full">
                    {individualContracts.length}
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
                    {mergedContracts.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === "individual" ? (
              /* INDIVIDUAL VIEW TAB */
              <div className="space-y-3 mt-3">
                {individualContracts.length === 0 ? (
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
                      <p className="text-gray-500 text-xs">
                        All contracts are either merged or have individual
                        invoices generated. Switch to Merged View to see
                        available contracts.
                      </p>
                    </div>
                  </div>
                ) : (
                  individualContracts.map((invoice) => {
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
                                Project Code:{" "}
                                {invoice.projectCode || invoice.id} • Payment
                                Type: {getPaymentTypeName(invoice.paymentType)}{" "}
                                • Students: {invoice.studentCount || "N/A"} •
                                Total Amount:{" "}
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
                                              inv.installment ===
                                              installment.name
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
                                              const dueAmount =
                                                totalAmount - receivedAmount;

                                              return (
                                                <tr
                                                  key={`${index}-${invIndex}`}
                                                  className={`hover:bg-gray-50 cursor-pointer ${
                                                    isCancelled
                                                      ? "bg-red-50"
                                                      : ""
                                                  }`}
                                                  onClick={() =>
                                                    setSelectedInvoice(inv)
                                                  }
                                                >
                                                  <td className="px-4 py-2 text-sm text-gray-900">
                                                    {installment.name}
                                                    {isCancelled && (
                                                      <span className="ml-1 text-xs text-red-500">
                                                        (Cancelled)
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="px-4 py-2 text-sm text-gray-500">
                                                    {installment.percentage}%
                                                  </td>
                                                  <td className="px-4 py-2 text-sm text-gray-500 font-semibold">
                                                    {formatCurrency(
                                                      installment.totalAmount
                                                    )}
                                                  </td>
                                                  <td className="px-4 py-2 text-sm text-gray-500">
                                                    <div className="text-center">
                                                      {/* Invoice type (Tax / Cash / Proforma) */}
                                                      <div
                                                        className={`font-semibold ${
                                                          inv.invoiceType ===
                                                          "Tax Invoice"
                                                            ? "text-green-600"
                                                            : inv.invoiceType ===
                                                              "Cash Invoice"
                                                            ? "text-orange-600"
                                                            : "text-blue-600"
                                                        }`}
                                                      >
                                                        {inv.invoiceType ===
                                                        "Proforma Invoice"
                                                          ? "Proforma"
                                                          : inv.invoiceType ===
                                                            "Cash Invoice"
                                                          ? "Cash"
                                                          : "Tax"}
                                                        {isCancelled &&
                                                          inv.regenerated &&
                                                          " (Cancelled - Regenerated)"}
                                                        {!isCancelled &&
                                                          inv.regeneratedFrom &&
                                                          ` (Regenerated from ${inv.regeneratedFrom})`}
                                                      </div>

                                                      {/* Approval status sirf Tax Invoice ke liye, Cash aur Proforma ke liye nahi */}
                                                      {inv.invoiceType ===
                                                        "Tax Invoice" &&
                                                        getApprovalStatusBadge(
                                                          inv
                                                        )}

                                                      {/* Cash Invoice ke liye special badge */}
                                                      {inv.invoiceType ===
                                                        "Cash Invoice" && (
                                                        <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-800 border border-orange-300">
                                                          Cash
                                                        </span>
                                                      )}

                                                      {/* Proforma Invoice ke liye badge */}
                                                      {inv.invoiceType ===
                                                        "Proforma Invoice" && (
                                                        <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 border border-blue-300">
                                                          Proforma
                                                        </span>
                                                      )}

                                                      {/* Invoice number */}
                                                      <div className="text-xs text-gray-400 mt-0.5">
                                                        {inv.invoiceNumber ||
                                                          "N/A"}
                                                      </div>

                                                      {/* From: Proforma number niche dikhana hai */}
                                                      {inv.convertedFromProforma && (
                                                        <div className="text-xs text-purple-600 mt-0.5">
                                                          From:{" "}
                                                          {
                                                            inv.originalProformaNumber
                                                          }
                                                        </div>
                                                      )}
                                                    </div>
                                                  </td>

                                                  <td className="px-4 py-2 text-sm">
                                                    <span
                                                      className={`font-semibold ${
                                                        receivedAmount > 0
                                                          ? "text-green-600"
                                                          : "text-gray-600"
                                                      }`}
                                                    >
                                                      {formatCurrency(
                                                        receivedAmount
                                                      )}
                                                    </span>
                                                  </td>
                                                  <td className="px-4 py-2 text-sm">
                                                    <span
                                                      className={`font-semibold ${
                                                        dueAmount > 0
                                                          ? "text-red-600"
                                                          : "text-green-600"
                                                      }`}
                                                    >
                                                      {dueAmount === 0
                                                        ? "0"
                                                        : formatCurrency(
                                                            dueAmount
                                                          )}
                                                    </span>
                                                  </td>
                                                  <td className="px-4 py-2 text-sm">
                                                    <div className="flex gap-2">
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setSelectedInvoice(
                                                            inv
                                                          );
                                                        }}
                                                        className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs"
                                                      >
                                                        View
                                                      </button>
                                                      {!isCancelled &&
                                                        !inv.regeneratedFrom && (
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleCancelInvoice(
                                                                inv
                                                              );
                                                            }}
                                                            className="bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded text-xs"
                                                            title="Cancel this invoice"
                                                          >
                                                            Undo
                                                          </button>
                                                        )}
                                                      {isCancelled &&
                                                        !inv.regenerated && (
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleGenerateInvoice(
                                                                invoice,
                                                                installment,
                                                                true,
                                                                inv
                                                              );
                                                            }}
                                                            className="bg-orange-500 hover:bg-orange-700 text-white py-1 px-2 rounded text-xs"
                                                            title="Regenerate cancelled invoice"
                                                          >
                                                            Regenerate
                                                          </button>
                                                        )}
                                                      {!isCancelled &&
                                                        inv.invoiceType ===
                                                          "Proforma Invoice" && (
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleConvertToTax(
                                                                inv
                                                              );
                                                            }}
                                                            className="bg-purple-500 hover:bg-purple-700 text-white py-1 px-2 rounded text-xs"
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
                                              className="hover:bg-gray-50 cursor-pointer"
                                              onClick={() =>
                                                setRowClickModal({
                                                  isOpen: true,
                                                  invoice: null,
                                                  installment: installment,
                                                  contract: invoice,
                                                })
                                              }
                                            >
                                              <td className="px-4 py-2 text-sm text-gray-900">
                                                {installment.name}
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-500">
                                                {installment.percentage}%
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-500 font-semibold">
                                                {formatCurrency(
                                                  installment.totalAmount
                                                )}
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-500">
                                                -
                                              </td>
                                              <td className="px-4 py-2 text-sm">
                                                ₹0
                                              </td>
                                              <td className="px-4 py-2 text-sm">
                                                {formatCurrency(
                                                  installment.totalAmount
                                                )}
                                              </td>
                                              <td className="px-4 py-2 text-sm">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleGenerateInvoice(
                                                      invoice,
                                                      installment
                                                    );
                                                  }}
                                                  className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs"
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
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* MERGED VIEW TAB */
              <div className="space-y-3 mt-3">
                {mergedContracts.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
                    <div className="text-center max-w-md mx-auto">
                      <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <FontAwesomeIcon
                          icon={faObjectGroup}
                          className="w-6 h-6 text-purple-600"
                        />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        No contracts available for merging
                      </h3>
                      <p className="text-gray-500 text-xs">
                        All contracts have individual invoices generated. Switch
                        to Individual View to see them.
                      </p>
                    </div>
                  </div>
                ) : (
                  mergedContracts.map((mergedItem, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden"
                    >
                      {/* College Header */}
                      <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-bold text-white">
                                {mergedItem.collegeName}
                              </h2>
                              <span className="bg-purple-800 text-white text-xs font-semibold py-1 px-2 rounded-full">
                                {mergedItem.contracts.length} Contracts
                              </span>
                              <span className="bg-green-600 text-white text-xs font-semibold py-1 px-2 rounded-full">
                                {mergedItem.installmentCount} Installments Each
                              </span>
                            </div>
                            <p className="text-purple-100 text-sm mt-1">
                              {/* ✅ Useful information dikhao */}
                              Payment Types:{" "}
                              {getUniquePaymentTypes(mergedItem.contracts)} •
                              Total Students:{" "}
                              {getTotalStudentCount(mergedItem.contracts)} •
                              Total Amount:{" "}
                              {formatCurrency(
                                getTotalContractAmount(mergedItem.contracts)
                              )}
                            </p>
                          </div>
                          <div className="text-purple-100">
                            <button
                              onClick={() => toggleExpand(`merged-${index}`)}
                              className="text-white"
                            >
                              <FontAwesomeIcon
                                icon={
                                  expandedRows.has(`merged-${index}`)
                                    ? faChevronUp
                                    : faChevronDown
                                }
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedRows.has(`merged-${index}`) && (
                        <div className="p-4">
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
                                {Object.values(mergedItem.installments).map(
                                  (installment, idx) => {
                                    // Find existing merged invoices for this installment
                                    const existingMergedInvoices =
                                      existingInvoices.filter(
                                        (inv) =>
                                          inv.isMergedInvoice &&
                                          inv.collegeCode ===
                                            mergedItem.collegeCode &&
                                          inv.installment === installment.name
                                      );

                                    // For merged view, show each installment with its status
                                    if (existingMergedInvoices.length > 0) {
                                      // Show existing merged invoices
                                      return existingMergedInvoices.map(
                                        (inv, invIndex) => {
                                          const totalAmount =
                                            inv.amountRaised ||
                                            inv.netPayableAmount ||
                                            installment.totalAmount;
                                          const receivedAmount =
                                            inv.receivedAmount || 0;
                                          const dueAmount =
                                            totalAmount - receivedAmount;
                                          const isCancelled =
                                            inv.status === "cancelled" ||
                                            inv.approvalStatus === "cancelled";

                                          return (
                                            <tr
                                              key={`${idx}-${invIndex}`}
                                              className={`hover:bg-gray-50 cursor-pointer ${
                                                isCancelled ? "bg-red-50" : ""
                                              }`}
                                              onClick={() =>
                                                setSelectedInvoice(inv)
                                              }
                                            >
                                              <td className="px-4 py-2 text-sm text-gray-900">
                                                {installment.name}
                                                {isCancelled && (
                                                  <span className="ml-1 text-xs text-red-500">
                                                    (Cancelled)
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-500">
                                                {installment.percentage}%
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-500 font-semibold">
                                                {formatCurrency(
                                                  installment.totalAmount
                                                )}
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-500">
                                                <div className="text-center">
                                                  <div
                                                    className={`font-semibold ${
                                                      inv.invoiceType ===
                                                      "Tax Invoice"
                                                        ? "text-green-600"
                                                        : "text-blue-600"
                                                    }`}
                                                  >
                                                    {inv.invoiceType ===
                                                    "Proforma Invoice"
                                                      ? "Proforma"
                                                      : "Tax"}
                                                    {isCancelled &&
                                                      inv.regenerated &&
                                                      " (Cancelled - Regenerated)"}
                                                    {!isCancelled &&
                                                      inv.regeneratedFrom &&
                                                      ` (Regenerated from ${inv.regeneratedFrom})`}
                                                  </div>
                                                  {getApprovalStatusBadge(inv)}
                                                  <div className="text-xs text-gray-400 mt-0.5">
                                                    {inv.invoiceNumber || "N/A"}
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="px-4 py-2 text-sm">
                                                <span
                                                  className={`font-semibold ${
                                                    receivedAmount > 0
                                                      ? "text-green-600"
                                                      : "text-gray-600"
                                                  }`}
                                                >
                                                  {formatCurrency(
                                                    receivedAmount
                                                  )}
                                                </span>
                                              </td>
                                              <td className="px-4 py-2 text-sm">
                                                <span
                                                  className={`font-semibold ${
                                                    dueAmount > 0
                                                      ? "text-red-600"
                                                      : "text-green-600"
                                                  }`}
                                                >
                                                  {dueAmount === 0
                                                    ? "0"
                                                    : formatCurrency(dueAmount)}
                                                </span>
                                              </td>
                                              <td className="px-4 py-2 text-sm">
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedInvoice(inv);
                                                    }}
                                                    className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs"
                                                  >
                                                    View
                                                  </button>
                                                  {!isCancelled &&
                                                    !inv.regeneratedFrom && (
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleCancelInvoice(
                                                            inv
                                                          );
                                                        }}
                                                        className="bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded text-xs"
                                                        title="Cancel this invoice"
                                                      >
                                                        Undo
                                                      </button>
                                                    )}
                                                  {isCancelled &&
                                                    !inv.regenerated && (
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          /* Handle regenerate for merged invoice */
                                                        }}
                                                        className="bg-orange-500 hover:bg-orange-700 text-white py-1 px-2 rounded text-xs"
                                                        title="Regenerate cancelled invoice"
                                                      >
                                                        Regenerate
                                                      </button>
                                                    )}
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        }
                                      );
                                    } else {
                                      // No invoice generated yet for this merged installment
                                      return (
                                        <tr
                                          key={idx}
                                          className="hover:bg-gray-50 cursor-pointer"
                                          onClick={() =>
                                            setRowClickModal({
                                              isOpen: true,
                                              invoice: null,
                                              installment: installment,
                                              contract: mergedItem.contracts[0],
                                            })
                                          }
                                        >
                                          <td className="px-4 py-2 text-sm text-gray-900">
                                            {installment.name}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-500">
                                            {installment.percentage}%
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-500 font-semibold">
                                            {formatCurrency(
                                              installment.totalAmount
                                            )}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-500">
                                            -
                                          </td>
                                          <td className="px-4 py-2 text-sm">
                                            ₹0
                                          </td>
                                          <td className="px-4 py-2 text-sm">
                                            {formatCurrency(
                                              installment.totalAmount
                                            )}
                                          </td>
                                          <td className="px-4 py-2 text-sm">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleMergeGenerate(
                                                  mergedItem,
                                                  installment
                                                );
                                              }}
                                              className="bg-purple-500 hover:bg-purple-700 text-white py-1 px-2 rounded text-xs"
                                            >
                                              Generate Merged
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    }
                                  }
                                )}
                              </tbody>
                            </table>
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
      </div>
    </div>
  );
}
