import React, { useState, useEffect } from "react";
import gryphonLogo from "../../assets/gryphon_logo.png";
import signature from "../../assets/sign.png";

import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

const InvoiceModal = ({ invoice, onClose, onInvoiceUpdate }) => {
  const [editableInvoice, setEditableInvoice] = useState(invoice);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Invoice number conflict state
  const [invoiceNumberConflict, setInvoiceNumberConflict] = useState(false);
  const [checkingInvoiceNumber, setCheckingInvoiceNumber] = useState(false);
const [editableServiceType, setEditableServiceType] = useState(
  invoice.serviceType || "Training Services"
);
const [editableDescription, setEditableDescription] = useState(
  invoice.customDescription || ""
);
  // Custom toast state
  const [toast, setToast] = useState(null);

  // Training data state for dynamic descriptions
  const [trainingData, setTrainingData] = useState(null);

  // Editable month for EMI
  const [editableMonth, setEditableMonth] = useState('');

  // ✅ Yeh IMPORTANT fix hai - jab invoice prop change ho toh state update ho
  useEffect(() => {
    setEditableInvoice(invoice);
  }, [invoice]);

  // Fetch training data for dynamic descriptions
  useEffect(() => {
    const fetchTrainingData = async () => {
      if (invoice.projectCode) {
        try {
          const docId = invoice.projectCode.replace(/\//g, '-');
          const docRef = doc(db, 'trainingForms', docId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setTrainingData(data);
            
            // Calculate and set editable month for EMI
            if (invoice.installment?.toLowerCase().includes('installment')) {
              // Handle emiMonths as either string or array
              let monthsArray = [];
              if (Array.isArray(data.emiMonths)) {
                monthsArray = data.emiMonths;
              } else if (typeof data.emiMonths === 'string') {
                monthsArray = data.emiMonths.split(', ');
              } else {
                // Default fallback
                monthsArray = 'oct, dec, feb, apr, jun, aug, oct, dec, feb, apr, jun, aug'.split(', ');
              }
              
              const installmentNum = invoice.installment?.match(/(\d+)/)?.[1] || '1';
              const currentMonth = monthsArray[parseInt(installmentNum) - 1] || 'oct';
              setEditableMonth(invoice.emiMonth || currentMonth);
            }
          }
        } catch (error) {
          console.error("Error fetching training data:", error);
        }
      }
    };
    fetchTrainingData();
  }, [invoice.projectCode, invoice.installment, invoice.emiMonth]);

  // cleanup toast timer on unmount
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ✅ Check if place of supply is outside Maharashtra
  const isInterState = () => {
    const state = invoice.state || "";
    return !state.toLowerCase().includes("maharashtra");
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // ✅ Validation karo
      if (!editableInvoice.invoiceNumber?.trim()) {
        setToast({ type: 'error', message: "Invoice number is required!" });
        return;
      }

      if (!editableInvoice.raisedDate) {
        setToast({ type: 'error', message: "Invoice date is required!" });
        return;
      }

      // ✅ Proper date validation and parsing
      let parsedDate;
      try {
        if (typeof editableInvoice.raisedDate === 'string') {
          // Handle date string from input field (yyyy-mm-dd format)
          parsedDate = new Date(editableInvoice.raisedDate + 'T00:00:00.000Z');
        } else if (editableInvoice.raisedDate?.toDate) {
          // Handle Firestore timestamp
          parsedDate = editableInvoice.raisedDate.toDate();
        } else {
          // Handle Date object or other formats
          parsedDate = new Date(editableInvoice.raisedDate);
        }
        
        // Validate the parsed date
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch {
        console.error("Date parsing error");
        setToast({ type: 'error', message: "Invalid invoice date format. Please enter a valid date." });
        return;
      }

      const collectionName = invoice.invoiceType === "Proforma Invoice" 
        ? "ProformaInvoices" 
        : "ContractInvoices";
      
      const invoiceRef = doc(db, collectionName, invoice.id);
      
      // ✅ Proper date handling karo
      const updateData = {
        invoiceNumber: editableInvoice.invoiceNumber.trim(),
        raisedDate: parsedDate,
         serviceType: editableServiceType, // ✅ Naya field add karo
      customDescription: editableDescription // ✅ Custom description save karo
      };

      // ✅ Extra validation: check if invoice number already exists in collection
      const checkConflict = async (invoiceNumber) => {
        if (!invoiceNumber) return false;
        try {
          const collRef = collection(db, collectionName);
          const q = query(collRef, where('invoiceNumber', '==', invoiceNumber));
          const snap = await getDocs(q);
          if (snap.empty) return false;
          // If there's any doc with same invoiceNumber but different id -> conflict
          const conflict = snap.docs.some(d => d.id !== invoice.id);
          return conflict;
        } catch (err) {
          console.error('Error checking invoice number conflict', err);
          return false; // fail open - don't block save on check errors
        }
      };

      const conflictExists = await checkConflict(updateData.invoiceNumber);
      if (conflictExists) {
        setToast({ type: 'error', message: 'This invoice number is already generated for another invoice.' });
        setInvoiceNumberConflict(true);
        return;
      }

      if (invoice.installment?.toLowerCase().includes('installment')) {
        updateData.emiMonth = editableMonth;
      }
      
      console.log("Updating invoice with:", updateData);
      
      await updateDoc(invoiceRef, updateData);
      
      setIsEditing(false);
      
      // ✅ Parent component ko updated data bhejo
      if (onInvoiceUpdate) {
        const updatedInvoice = {
          ...invoice,
          ...updateData
        };
        onInvoiceUpdate(updatedInvoice);
      }
      
      setToast({ type: 'success', message: "Invoice details updated successfully!" });
      
    } catch (error) {
      console.error("Error updating invoice:", error);
      setToast({ type: 'error', message: "Failed to update invoice details: " + error.message });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleInputChange = (field, value) => {
    setEditableInvoice(prev => ({
      ...prev,
      [field]: value
    }));

    // If user is editing invoiceNumber, reset conflict warning until we re-check on blur/save
    if (field === 'invoiceNumber') {
      setInvoiceNumberConflict(false);
    }
  };

  // Check invoice number uniqueness on blur (so user gets immediate feedback)
  const handleInvoiceNumberBlur = async () => {
    const invoiceNumber = (editableInvoice.invoiceNumber || '').trim();
    if (!invoiceNumber) return;
    setCheckingInvoiceNumber(true);
    try {
      const collectionName = invoice.invoiceType === "Proforma Invoice" 
        ? "ProformaInvoices" 
        : "ContractInvoices";
      const collRef = collection(db, collectionName);
      const q = query(collRef, where('invoiceNumber', '==', invoiceNumber));
      const snap = await getDocs(q);
      if (snap.empty) {
        setInvoiceNumberConflict(false);
      } else {
        const conflict = snap.docs.some(d => d.id !== invoice.id);
        setInvoiceNumberConflict(conflict);
        if (conflict) {
          setToast({ type: 'warning', message: 'Invoice number already used by another invoice.' });
        }
      }
    } catch (err) {
      console.error('Error checking invoice number on blur', err);
    } finally {
      setCheckingInvoiceNumber(false);
    }
  };

  // Date formatting helper
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error("Date parsing error:", error);
      return '';
    }
  };

  // ✅ Reset function add karo
const handleCancelEdit = () => {
  setIsEditing(false);
  setEditableInvoice(invoice); // Original data par reset karo
  setEditableServiceType(invoice.serviceType || "Training Services");
  setEditableDescription(invoice.customDescription || "");
  if (invoice.installment?.toLowerCase().includes('installment')) {
    setEditableMonth(invoice.emiMonth || 'oct');
  }
};


  if (!invoice) return null;

  const getInvoiceTypeDisplay = () => {
    if (invoice.invoiceType) {
      return invoice.invoiceType;
    }
    return invoice.type || "Tax Invoice";
  };

  const getInvoiceNumberDisplay = () => {
    return invoice.invoiceNumber || "N/A";
  };

  const getPaymentAmounts = () => {
    if (invoice.baseAmount !== undefined) {
      return {
        baseAmount: invoice.baseAmount,
        gstAmount: invoice.gstAmount || 0,
        totalAmount: invoice.netPayableAmount || invoice.amountRaised || 0,
      };
    }

    if (!invoice.paymentDetails || invoice.paymentDetails.length === 0) {
      const total =
        invoice.amount || invoice.netPayableAmount || invoice.amountRaised || 0;
      const baseAmount = total / 1.18;
      const gstAmount = total - baseAmount;

      return {
        baseAmount: Math.round(baseAmount),
        gstAmount: Math.round(gstAmount),
        totalAmount: total,
      };
    }

    const payment = invoice.paymentDetails[0];
    return {
      baseAmount: payment.baseAmount || payment.totalAmount / 1.18,
      gstAmount: payment.gstAmount || invoice.gstAmount || 0,
      totalAmount:
        payment.totalAmount ||
        invoice.netPayableAmount ||
        invoice.amountRaised ||
        0,
    };
  };

  const getAllProjectCodes = () => {
    if (invoice.isMergedInvoice && invoice.mergedContracts) {
      return invoice.mergedContracts
        .map((contract) => contract.projectCode)
        .filter(Boolean);
    }

    if (invoice.projectCode) {
      return [invoice.projectCode];
    }

    if (
      invoice.individualProjectCodes &&
      invoice.individualProjectCodes.length > 0
    ) {
      return invoice.individualProjectCodes;
    }

    return [];
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    try {
      const date = dateString.toDate
        ? dateString.toDate()
        : new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {

      return "Invalid Date";
    }
  };

  const convertAmountToWords = (amount) => {
    if (!amount) return "Rupees Zero Only";

    const a = [
      "",
      "One ",
      "Two ",
      "Three ",
      "Four ",
      "Five ",
      "Six ",
      "Seven ",
      "Eight ",
      "Nine ",
      "Ten ",
      "Eleven ",
      "Twelve ",
      "Thirteen ",
      "Fourteen ",
      "Fifteen ",
      "Sixteen ",
      "Seventeen ",
      "Eighteen ",
      "Nineteen ",
    ];
    const b = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const num = parseInt(amount);
    if (isNaN(num)) return "Invalid Amount";
    if (num === 0) return "Zero Rupees Only";

    const convert = (n) => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + " " + a[n % 10];
      if (n < 1000)
        return a[Math.floor(n / 100)] + "Hundred " + convert(n % 100);
      if (n < 100000)
        return convert(Math.floor(n / 1000)) + "Thousand " + convert(n % 1000);
      if (n < 10000000)
        return convert(Math.floor(n / 100000)) + "Lakh " + convert(n % 100000);
      return (
        convert(Math.floor(n / 10000000)) + "Crore " + convert(n % 10000000)
      );
    };

    return "Rupees " + convert(num).trim() + " Only";
  };

  // ✅ PDF Download Function - Print modal approach
  const downloadPDF = () => {
    const downloadBtn = document.querySelector("#download-btn");
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = "Downloading...";
    downloadBtn.disabled = true;

    const printWindow = window.open("", "_blank");

    // Get the invoice content
    const invoiceContent = document.querySelector(
      ".invoice-modal-print"
    ).innerHTML;

    const invoiceHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${getInvoiceNumberDisplay()}</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <style>
    @media print {
      body { 
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        font-size: 12px;
      }
      .no-print { 
        display: none !important; 
      }
      .invoice-container {
        box-shadow: none !important;
        border: 1px solid #1f2937 !important;
        margin: 0 auto;
        width: 100%;
        transform: none !important;
      }
      .compact-table {
        margin-bottom: 8px !important;
      }
      .compact-section {
      }
      .bank-signature-container {
        position: relative;
        margin-top: 20px;
      }
      .signature-section {
        position: absolute;
        bottom: 10px;
        right: 20px;
        text-align: center;
      }
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      background: white;
    }
    .Detail {
      flex-direction: col;
      justify-content: center;
    }
    /* Compact styles */
    .compact-table table {
      font-size: 11px;
    }
    .compact-table th, 
    .compact-table td {
      padding: 4px 6px !important;
    }
    
    /* Ensure all colors print correctly */
    .bg-gray-300 { background-color: #d1d5db !important; }
    .bg-blue-50 { background-color: #eff6ff !important; }
    .bg-gray-50 { background-color: #f9fafb !important; }
    .bg-gray-100 { background-color: #f3f4f6 !important; }
    .bg-blue-600 { background-color: #2563eb !important; }
    .text-blue-800 { color: #1e40af !important; }
    .text-red-600 { color: #dc2626 !important; }
    .text-gray-800 { color: #1f2937 !important; }
    .text-gray-600 { color: #4b5563 !important; }
    .text-gray-700 { color: #374151 !important; }
    .border-gray-300 { border-color: #d1d5db !important; }
    .border-gray-800 { border-color: #1f2937 !important; }
    .border-blue-800 { border-color: #1e40af !important; }
    
    /* Clear floats */
    .clearfix::after {
      content: "";
      clear: both;
      display: table;
    }
  </style>
</head>
<body class="bg-white">
  <div class="invoice-container p-4 max-w-4xl mx-auto border border-gray-800 clearfix" style="font-size: 12px;">
    ${invoiceContent}
  </div>
  <script>
    window.onload = function() {
      const noPrintElements = document.querySelectorAll('.no-print');
      noPrintElements.forEach(el => el.remove());
      
      window.print();
      setTimeout(() => {
        window.close();
      }, 500);
    };
  </script>
</body>
</html>
`;
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();

    setTimeout(() => {
      downloadBtn.textContent = originalText;
      downloadBtn.disabled = false;
    }, 3000);
  };

  const amounts = getPaymentAmounts();
  const amountInWords = convertAmountToWords(amounts.totalAmount);
  const projectCodes = getAllProjectCodes();
  const interstate = isInterState();

  // Function to get dynamic description based on installment
  const getDynamicDescription = (invoice, trainingData) => {
    const { installment } = invoice;
    const percentage = invoice.paymentDetails?.[0]?.percentage || '30';

    if (installment?.toLowerCase().includes('advance')) {
      return `As per the MOU signed, ${percentage}% before the commencement of training.`;
    }

    // Special handling for ATTP: first Training (index 1) is after 50% completion
    if (invoice.installmentIndex === 1 && installment?.toLowerCase().includes('training')) {
      return `As per the MOU, ${percentage}% after 50% completion of training.`;
    }

    if (installment?.toLowerCase().includes('50%')) {
      return `As per the MOU, ${percentage}% after 50% completion of training.`;
    } else if (installment?.toLowerCase().includes('completion') || installment?.toLowerCase().includes('training')) {
      return `As per the MOU, ${percentage}% payment after the completion of training.`;
    } else if (installment?.toLowerCase().includes('placement') || installment?.toLowerCase().includes('companies')) {
      return `As per the MOU, balance ${percentage}% amount after placement completion.`;
    } else if (installment?.toLowerCase().includes('installment')) {
      // For EMI
      const { perStudentCost, emiMonths, studentCount: trainingStudentCount } = trainingData || {};
      const studentCount = invoice.studentCount || trainingStudentCount || 90;
      
      // Handle emiMonths as either string or array
      let monthsArray = [];
      if (Array.isArray(emiMonths)) {
        monthsArray = emiMonths;
      } else if (typeof emiMonths === 'string') {
        monthsArray = emiMonths.split(', ');
      } else {
        // Default fallback
        monthsArray = 'oct, dec, feb, apr, jun, aug, oct, dec, feb, apr, jun, aug'.split(', ');
      }
      
      const installmentNum = installment?.match(/(\d+)/)?.[1] || '1';
      const currentMonth = monthsArray[parseInt(installmentNum) - 1] || 'oct';
      
      // For merged invoices or when emiMonth is saved in invoice, use that first
      const month = invoice.emiMonth || editableMonth || currentMonth;
      const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
      return (
        <span>
          As per the MOU signed for the students of {invoice.year || '1st'} year for student count as {studentCount}, @ Rs {perStudentCost || 2000} per student + 18% GST for {capitalizedMonth} month - {installmentNum} Installment
        </span>
      );
    } else {
      return invoice.isMergedInvoice
        ? `for ${invoice.course || ""} ${invoice.year || ""} year`
        : `after completion of the training ${invoice.course || ""} ${invoice.year || ""} year`;
    }
  };

  return (
    <div>
      <div className="fixed inset-0 bg-transparent backdrop-blur-md bg-opacity-50 flex items-center justify-center z-500 p-4 no-print" onClick={onClose}>
        <div
          className="bg-white border-2 border-gray-800 shadow-2xl p-4 w-full max-w-4xl max-h-[90vh] overflow-y-auto invoice-modal-print"
          style={{ fontSize: "14px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border border-gray-300 p-2">
            {/* Header - More Compact */}
            <div className="flex justify-between items-start mb-4 border-b p-3 bg-gray-300 compact-section">
              <div></div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-800">
                  {getInvoiceTypeDisplay()}
                </h1>
              </div>
              <div className="text-left">
                {/* Invoice Number - Editable */}
                <div className="mb-1">
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        value={editableInvoice.invoiceNumber || ''}
                        onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                        onBlur={handleInvoiceNumberBlur}
                        className="text-sm text-blue-800 font-bold border border-blue-300 px-2 py-1 rounded w-48 mb-1"
                        placeholder="Enter invoice number"
                      />
                      <p className="text-xs text-gray-600">Current: {invoice.invoiceNumber}</p>
                      {checkingInvoiceNumber && (
                        <p className="text-xs text-gray-500">Checking invoice number...</p>
                      )}
                      {invoiceNumberConflict && (
                        <p className="text-xs text-red-600 mt-1">This invoice number is already generated for another invoice.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-blue-800 font-bold">
                      Invoice No. : {editableInvoice.invoiceNumber || "N/A"}
                    </p>
                  )}
                </div>
                
                {/* Invoice Date - Editable */}
                <div>
                  {isEditing ? (
                    <div>
                      <input
                        type="date"
                        value={formatDateForInput(editableInvoice.raisedDate || editableInvoice.createdAt)}
                        onChange={(e) => handleInputChange('raisedDate', e.target.value)}
                        className="text-xs border border-gray-300 px-2 py-1 rounded w-32 mb-1"
                      />
                      <p className="text-xs text-gray-600">
                        Current: {formatDate(invoice.raisedDate || invoice.createdAt)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-800">
                      Invoice Date : {formatDate(editableInvoice.raisedDate || editableInvoice.createdAt)}
                    </p>
                  )}
                </div>
                
                {/* EMI Month - Editable */}
                {isEditing && invoice.installment?.toLowerCase().includes('installment') && (
                  <div>
                    <input
                      type="text"
                      value={editableMonth}
                      onChange={(e) => setEditableMonth(e.target.value)}
                      className="text-xs border border-gray-300 px-2 py-1 rounded w-24 mb-1"
                      placeholder="Month"
                    />
                  </div>
                )}
                
                {invoice.dueDate && (
                  <p className="text-xs text-red-600">
                    Due Date : {formatDate(invoice.dueDate)}
                  </p>
                )}
                {invoice.installment && (
                  <p className="text-xs text-gray-600 mt-1">
                    {invoice.installment}
                  </p>
                )}
              </div>
            </div>
            {/* Company Details - More Compact */}
            <div className="mb-4 compact-section">
              <div className="bg-blue-50 p-3 rounded mb-3">
                <div className="flex justify-between items-center gap-3">
                  {/* Company Details - Left Side */}
                  <div className="flex-1">
                    <h4 className="font-bold text-md mb-1">
                      Gryphon Academy Pvt. Ltd
                    </h4>
                    <p className="text-xs">
                      Survey Number 128, Office No 901, Olympia, Pune Bypass,
                      Olympia
                    </p>
                    <p className="text-xs">
                      Business House, Baner, Pune, Maharashtra 411045
                    </p>
                    <p className="text-xs mt-1">
                      <strong>GSTIN:</strong> 27AAJCG8035D1ZM |{" "}
                      <strong>PAN:</strong> AAJCG8035D
                    </p>
                  </div>

                  {/* Logo - Right Side */}
                  <div className="flex-shrink-0">
                    <img
                      src={gryphonLogo}
                      alt="Gryphon Academy Logo"
                      className="h-20 w-auto object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Party Details */}
              <div className="bg-gray-50 p-3 rounded">
                <div>
                  {/* Party Details */}
                  <div>
                    <h4 className="font-bold text-md mb-1">
                      Party Name :{" "}
                      {invoice.collegeName || "College Name Not Available"}
                    </h4>
                    <p className="text-md">
                      <span className="font-bold text-md">Address : </span>
                      {invoice.address || "College Address Not Available"}
                    </p>
                    <p className="text-xs mt-1">
                      <strong>GSTIN :</strong>{" "}
                      {invoice.gstNumber || "GSTIN Not Available"} |
                      <strong> PLACE OF SUPPLY:</strong>{" "}
                      {invoice.state || "State Not Available"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Table - More Compact */}
            <div className="mb-4 compact-table">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-1 text-left">
                      Description
                    </th>
                    <th className="border border-gray-300 px-3 py-1 text-left">
                      HSN Code
                    </th>
                    <th className="border border-gray-300 px-3 py-1 text-right">
                      Amount (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-1">
                     <div>
    {/* Service Type Dropdown - Editable */}
    {isEditing ? (
      <div className="mb-2">
        <select 
          value={editableServiceType}
          onChange={(e) => setEditableServiceType(e.target.value)}
          className="text-sm border border-blue-300 px-2 py-1 rounded bg-white font-semibold"
        >
          <option value="Training Services">Training Services</option>
          <option value="Placement Services">Placement Services</option>
          <option value="Digital Marketing Services">Digital Marketing Services</option>
        </select>
        <span className="ml-2">
          - {invoice.installment || ""}
          {invoice.paymentDetails?.[0]?.percentage &&
            ` (${invoice.paymentDetails[0].percentage}%)`}
        </span>
      </div>
    ) : (
      <div className="font-semibold text-sm">
        {editableServiceType} - {invoice.installment || ""}
        {invoice.paymentDetails?.[0]?.percentage &&
          ` (${invoice.paymentDetails[0].percentage}%)`}
      </div>
    )}

    {/* Description Text - Editable */}
    {isEditing ? (
      <textarea
        value={editableDescription || getDynamicDescription(invoice, trainingData)}
        onChange={(e) => setEditableDescription(e.target.value)}
        className="w-full text-xs border border-gray-300 px-2 py-1 rounded mt-1 resize-y min-h-[60px]"
        placeholder="Enter description here..."
      />
    ) : (
      <div className="text-xs text-gray-700 mt-1">
        {editableDescription || getDynamicDescription(invoice, trainingData)}
        {invoice.studentCount && !invoice.installment?.toLowerCase().includes('installment') && ` for ${invoice.studentCount} students`}
        {amounts.gstAmount > 0 && !invoice.installment?.toLowerCase().includes('installment') && 
          ` + ${interstate ? '18% IGST' : '18% GST (9% CGST + 9% SGST)'}`
        }
      </div>
    )}

    {projectCodes.length > 0 && (
      <div className="text-xs text-blue-600 mt-1">
        <strong>
          Project{projectCodes.length > 1 ? "Codes" : "Code"}:
        </strong>{" "}
        {projectCodes.join(", ")}
      </div>
    )}
  </div>
                    </td>
                    <td className="border border-gray-300 px-3 py-1">999293</td>
                    <td className="border border-gray-300 px-3 py-1 text-right">
                      {amounts.baseAmount.toString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amount in Words - Compact */}
            <div className="mb-4 p-2 bg-gray-50 rounded compact-section">
              <p className="text-xs">
                <strong>Amount in Words:</strong> {amountInWords}
              </p>
            </div>

            {/* GST Calculation - Compact */}
            <div className="mb-4 compact-table">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-1 font-semibold">
                      Total (Base Amount)
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-right">
                      {amounts.baseAmount.toString()}
                    </td>
                  </tr>

                  {invoice.invoiceType === "Cash Invoice" ? (
                    <>
                      <tr>
                        <td className="border border-gray-300 px-3 py-1 font-semibold">
                          CGST @ 0%
                        </td>
                        <td className="border border-gray-300 px-3 py-1 text-right">
                          0.00
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-1 font-semibold">
                          SGST @ 0%
                        </td>
                        <td className="border border-gray-300 px-3 py-1 text-right">
                          0.00
                        </td>
                      </tr>
                    </>
                  ) : interstate ? (
                    // ✅ IGST for inter-state
                    <tr>
                      <td className="border border-gray-300 px-3 py-1 font-semibold">
                        Add: IGST @ 18%
                      </td>
                      <td className="border border-gray-300 px-3 py-1 text-right">
                        {amounts.gstAmount.toString()}
                      </td>
                    </tr>
                  ) : (
                    // ✅ CGST+SGST for intra-state (Maharashtra)
                    <>
                      <tr>
                        <td className="border border-gray-300 px-3 py-1 font-semibold">
                          Add: CGST @ 9%
                        </td>
                        <td className="border border-gray-300 px-3 py-1 text-right">
                          {(amounts.gstAmount / 2).toString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-1 font-semibold">
                          Add: SGST @ 9%
                        </td>
                        <td className="border border-gray-300 px-3 py-1 text-right">
                          {(amounts.gstAmount / 2).toString()}
                        </td>
                      </tr>
                    </>
                  )}

                  <tr>
                    <td className="border border-gray-300 px-3 py-1 font-semibold">
                      Grand Total
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-right font-bold">
                      ₹
                      {amounts.totalAmount.toString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Contact Information - Compact */}
            <div className="mb-4 p-2 bg-blue-50 rounded compact-section">
              <p className="text-xs text-center">
                If you have any questions concerning this invoice, use the
                following contact information: Website: www.gryphonacademy.co.in
                | Email: shashi@gryphonacademy.co.in | Phone: +91 7875895160
              </p>
            </div>

            {/* Bank Details & Signature Section - Fixed Positioning */}
            <div className="mb-4 p-3 border border-gray-300 rounded bank-signature-container">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                {/* Bank Details - Left Side */}
                <div className="flex-1">
                  <h5 className="font-bold mb-1 text-sm">Bank Details:</h5>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div>
                      <strong>Name of Account:</strong> Gryphon Academy Private
                      Limited
                    </div>
                    <div>
                      <strong>Account Number:</strong> 50200080602438
                    </div>
                    <div>
                      <strong>IFSC Code:</strong> HDFC0000052
                    </div>
                    <div>
                      <strong>Bank:</strong> HDFC Bank
                    </div>
                    <div>
                      <strong>Account Type:</strong> Current Account
                    </div>
                  </div>
                </div>

                {/* Signature - Right Side with Fixed Positioning */}
                <div className="flex-1 flex flex-col items-center signature-section">
                  <p className="font-semibold mb-2 text-sm">
                    For Gryphon Academy Pvt. Ltd
                  </p>
                  <div className="text-center">
                    <img
                      src={signature}
                      alt="Authorised Signature"
                      className="h-10 w-auto mx-auto mb-1"
                    />
                    <div className="border-t border-gray-400 w-24 mx-auto mb-1"></div>
                    <p className="text-xs text-gray-600">Digital Signature</p>
                    <p className="mt-1 font-semibold text-xs">
                      Authorised Signatory
                    </p>
                  </div>
                </div>
              </div>
            </div>

              {/* Action Buttons - IMPROVED */}
            <div className="flex justify-between items-center mt-4 pt-3 border-t no-print">
              <div>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || invoiceNumberConflict}
                      className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 font-semibold transition-colors text-sm mr-2 disabled:bg-green-400"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="bg-gray-500 text-white px-4 py-1 rounded hover:bg-gray-600 font-semibold transition-colors text-sm disabled:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEditToggle}
                    className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 font-semibold transition-colors text-sm"
                  >
                    Edit Invoice
                  </button>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  id="download-btn"
                  onClick={downloadPDF}
                  className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 font-semibold transition-colors text-sm"
                >
                  Download PDF
                </button>
                <button
                  onClick={onClose}
                  className="bg-gray-500 text-white px-4 py-1 rounded hover:bg-gray-600 font-semibold transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all duration-300 ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === 'success' && <span className="text-green-600">✓</span>}
              {toast.type === 'error' && <span className="text-red-600">✕</span>}
              {toast.type === 'warning' && <span className="text-amber-600">⚠</span>}
              <span>{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceModal;