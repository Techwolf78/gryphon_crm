import React, { useEffect, useState, useCallback } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import InvoiceModal from "./InvoiceModal";
import {
  FiUser,
  FiBook,
  FiCalendar,
  FiDollarSign,
  FiChevronDown,
  FiChevronUp,
  FiFileText,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiDownload,
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
  FiInfo,
  FiLayers,
} from "react-icons/fi";

// Enhanced PDF generation function with robust error handling
export const generateInvoicePDF = async (invoiceData) => {
  try {
    // Dynamically import jsPDF
    const { default: jsPDF } = await import("jspdf");

    // Initialize the document
    const doc = new jsPDF();

    let autoTableAvailable = false;

    try {
      // Try to dynamically import autoTable
      const autoTableModule = await import("jspdf-autotable");
      // Apply the autoTable plugin to jsPDF
      if (autoTableModule.default) {
        // Use the correct way to apply autoTable based on version
        if (typeof doc.autoTable !== "function") {
          jsPDF.API.autoTable = autoTableModule.default;
        }
        autoTableAvailable = true;
      }
    } catch (autoTableError) {
      console.warn(
        "AutoTable plugin failed to load, using fallback table rendering",
        autoTableError
      );
      autoTableAvailable = false;
    }

    // Add the invoice header
    doc.setFontSize(20);
    doc.text("INVOICE", 105, 15, { align: "center" });

    // Bill details
    doc.setFontSize(12);
    doc.text(`Bill Number: ${invoiceData.billNumber}`, 15, 25);
    doc.text(`Date: ${invoiceData.billingDate}`, 15, 32);

    // Trainer details
    doc.text(`Trainer: ${invoiceData.trainerName}`, 15, 45);
    doc.text(`Project Code: ${invoiceData.projectCode}`, 15, 52);
    doc.text(`Domain: ${invoiceData.domain}`, 15, 59);

    // Calculate amounts
    const trainingAmount = invoiceData.totalHours * invoiceData.trainingRate;
    const conveyance = invoiceData.conveyance || 0;
    const food = invoiceData.food || 0;
    const lodging = invoiceData.lodging || 0;
    const subTotal = trainingAmount + conveyance + food + lodging;
    const tdsAmount = (subTotal * (invoiceData.tds || 0)) / 100;
    const adhocAdjustment = invoiceData.adhocAdjustment || 0;
    const netPayable = subTotal - tdsAmount + adhocAdjustment;

    // Check if autoTable is available and working
    if (autoTableAvailable && typeof doc.autoTable === "function") {
      try {
        // Use autoTable for the charges table
        doc.autoTable({
          startY: 70,
          head: [["Description", "Quantity", "Rate", "Amount"]],
          body: [
            [
              "Training Hours",
              invoiceData.totalHours,
              invoiceData.trainingRate,
              trainingAmount.toFixed(2),
            ],
            ["Conveyance", "-", "-", conveyance.toFixed(2)],
            ["Food", "-", "-", food.toFixed(2)],
            ["Lodging", "-", "-", lodging.toFixed(2)],
            ["Sub Total", "", "", subTotal.toFixed(2)],
            ["TDS Deduction", `${invoiceData.tds}%`, "", tdsAmount.toFixed(2)],
            ["Adhoc Adjustment", "", "", adhocAdjustment.toFixed(2)],
            ["Net Payable", "", "", netPayable.toFixed(2)],
          ],
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] },
        });
      } catch (autoTableError) {
        console.warn("AutoTable failed, using fallback:", autoTableError);
        autoTableAvailable = false;
        // Continue with fallback rendering
      }
    }

    // If autoTable is not available or failed, use manual table
    if (!autoTableAvailable) {
      console.log("Using fallback table rendering");
      let yPosition = 70;

      // Table headers
      doc.setFontSize(10);
      doc.text("Description", 15, yPosition);
      doc.text("Quantity", 80, yPosition);
      doc.text("Rate", 120, yPosition);
      doc.text("Amount", 160, yPosition);
      yPosition += 10;

      // Draw a line under headers
      doc.line(15, yPosition, 190, yPosition);
      yPosition += 10;

      // Table rows
      const rows = [
        [
          "Training Hours",
          invoiceData.totalHours,
          invoiceData.trainingRate,
          trainingAmount.toFixed(2),
        ],
        ["Conveyance", "-", "-", conveyance.toFixed(2)],
        ["Food", "-", "-", food.toFixed(2)],
        ["Lodging", "-", "-", lodging.toFixed(2)],
        ["Sub Total", "", "", subTotal.toFixed(2)],
        ["TDS Deduction", `${invoiceData.tds}%`, "", tdsAmount.toFixed(2)],
        ["Adhoc Adjustment", "", "", adhocAdjustment.toFixed(2)],
        ["Net Payable", "", "", netPayable.toFixed(2)],
      ];

      rows.forEach((row) => {
        doc.text(row[0], 15, yPosition);
        doc.text(String(row[1]), 80, yPosition);
        doc.text(String(row[2]), 120, yPosition);
        doc.text(String(row[3]), 160, yPosition);
        yPosition += 10;
      });

      // Set finalY for bank details placement
      doc.lastAutoTable = { finalY: yPosition };
    }

    // Bank details
    const finalY =
      typeof doc.lastAutoTable !== "undefined"
        ? doc.lastAutoTable.finalY + 10
        : 150;
    doc.setFontSize(12);
    doc.text("Bank Details:", 15, finalY);
    doc.text(`Bank Name: ${invoiceData.bankName || ""}`, 15, finalY + 7);
    doc.text(
      `Account Number: ${invoiceData.accountNumber || ""}`,
      15,
      finalY + 14
    );
    doc.text(`IFSC Code: ${invoiceData.ifscCode || ""}`, 15, finalY + 21);
    doc.text(`PAN Number: ${invoiceData.panNumber || ""}`, 15, finalY + 28);

    // Save the PDF - Create a blob URL for download
    const pdfBlob = doc.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Create a temporary download link
    const downloadLink = document.createElement("a");
    downloadLink.href = blobUrl;
    downloadLink.download = `Invoice_${invoiceData.billNumber || "NA"}.pdf`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Revoke the blob URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 100);

    return true;
  } catch (error) {
    console.error("PDF generation failed:", error);

    // Show user-friendly error message
    alert(
      "Failed to generate PDF. Please try again or check the console for details."
    );
    return false;
  }
};

function GenerateTrainerInvoice() {
  const [trainerData, setTrainerData] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDomain, setFilterDomain] = useState("");
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);
  const [pdfStatus, setPdfStatus] = useState({});

  const handleDownloadInvoice = async (trainer) => {
    setDownloadingInvoice(
      `${trainer.trainerId}_${trainer.collegeName}_${trainer.phase}`
    );
    setPdfStatus((prev) => ({
      ...prev,
      [`${trainer.trainerId}_${trainer.collegeName}_${trainer.phase}`]:
        "downloading",
    }));

    try {
      // Find invoices for this trainer, college, and phase combination
      const q = query(
        collection(db, "invoices"),
        where("trainerId", "==", trainer.trainerId),
        where("collegeName", "==", trainer.collegeName),
        where("phase", "==", trainer.phase)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // If multiple invoices, show selection dialog
        if (querySnapshot.size > 1) {
          const invoiceNumbers = querySnapshot.docs.map(
            (doc) => doc.data().billNumber
          );
          const selectedInvoice = prompt(
            `Multiple invoices found for ${trainer.trainerName} at ${
              trainer.collegeName
            } (${
              trainer.phase
            }). Please enter the invoice number you want to download:\n${invoiceNumbers.join(
              "\n"
            )}`
          );

          if (selectedInvoice) {
            const selectedDoc = querySnapshot.docs.find(
              (doc) => doc.data().billNumber === selectedInvoice
            );
            if (selectedDoc) {
              const invoiceData = selectedDoc.data();
              const success = await generateInvoicePDF(invoiceData);
              setPdfStatus((prev) => ({
                ...prev,
                [`${trainer.trainerId}_${trainer.collegeName}_${trainer.phase}`]:
                  success ? "success" : "error",
              }));
            } else {
              alert("Invalid invoice number selected");
              setPdfStatus((prev) => ({
                ...prev,
                [`${trainer.trainerId}_${trainer.collegeName}_${trainer.phase}`]:
                  "error",
              }));
            }
          } else {
            setPdfStatus((prev) => ({
              ...prev,
              [`${trainer.trainerId}_${trainer.collegeName}_${trainer.phase}`]:
                "cancelled",
            }));
          }
        } else {
          // Single invoice - download it directly
          const success = await generateInvoicePDF(
            querySnapshot.docs[0].data()
          );
          setPdfStatus((prev) => ({
            ...prev,
            [`${trainer.trainerId}_${trainer.collegeName}_${trainer.phase}`]:
              success ? "success" : "error",
          }));
        }
      } else {
        alert("No invoice found for this trainer at this college and phase");
        setPdfStatus((prev) => ({
          ...prev,
          [`${trainer.trainerId}_${trainer.collegeName}_${trainer.phase}`]:
            "not_found",
        }));
      }
    } catch (error) {
      console.error("Error downloading invoice:", error);
      alert("Failed to download invoice. Please try again.");
      setPdfStatus((prev) => ({
        ...prev,
        [`${trainer.trainerId}_${trainer.collegeName}_${trainer.phase}`]:
          "error",
      }));
    } finally {
      setDownloadingInvoice(null);
    }
  };

  // Enhanced data fetch function with proper college+phase based grouping
  const fetchTrainers = useCallback(async () => {
    setLoading(true);
    let trainersList = [];
    try {
      const trainingFormsSnap = await getDocs(collection(db, "trainingForms"));

      for (const formDoc of trainingFormsSnap.docs) {
        const formId = formDoc.id;
        const formData = formDoc.data();

        const trainingsSnap = await getDocs(
          collection(db, `trainingForms/${formId}/trainings`)
        );

        for (const phaseDoc of trainingsSnap.docs) {
          const phaseId = phaseDoc.id;
          const phaseData = phaseDoc.data();

          const domainsSnap = await getDocs(
            collection(
              db,
              `trainingForms/${formId}/trainings/${phaseId}/domains`
            )
          );

          for (const domainDoc of domainsSnap.docs) {
            const domainData = domainDoc.data();

            (domainData.table1Data || []).forEach((batch) => {
              (batch.batches || []).forEach((b) => {
                (b.trainers || []).forEach((trainer) => {
                  const startDate =
                    trainer.startDate || trainer.activeDates?.[0] || "";
                  const endDate =
                    trainer.endDate || trainer.activeDates?.slice(-1)[0] || "";

                  const trainerObj = {
                    trainerName: trainer.trainerName || "N/A",
                    trainerId: trainer.trainerId || "",
                    phase: phaseId,
                    domain: domainData.domain || domainDoc.id,
                    collegeName: formData.collegeName || "",
                    projectCode: formData.projectCode || "",
                    startDate,
                    endDate,
                    topics: domainData.topics || [],
                    batches: batch.batches || [],
                    mergedBreakdown: trainer.mergedBreakdown || [],
                    activeDates: trainer.activeDates || [],
                    assignedHours: parseFloat(trainer.assignedHours) || 0,
                    perHourCost: parseFloat(trainer.perHourCost) || 0,
                    dailyHours: trainer.dailyHours || [],
                    dayDuration: trainer.dayDuration || "",
                    stdCount: trainer.stdCount || 0,
                    hrs: trainer.hrs || 0,
                  };

                  trainersList.push(trainerObj);
                });
              });
            });
          }
        }
      }

      // Enhanced grouping by college, trainer AND phase
      const collegePhaseBasedGrouping = {};

      trainersList.forEach((trainer) => {
        // Create a unique key for each trainer-college-phase combination
        const collegePhaseKey = `${trainer.collegeName}_${trainer.trainerId}_${trainer.phase}`;

        if (!collegePhaseBasedGrouping[collegePhaseKey]) {
          collegePhaseBasedGrouping[collegePhaseKey] = {
            ...trainer,
            totalCollegeHours: trainer.assignedHours,
            allBatches: [trainer],
            earliestStartDate: trainer.startDate,
            latestEndDate: trainer.endDate,
            // Keep track of all projects for this trainer at this college and phase
            allProjects: [trainer.projectCode],
            // Keep track of all domains for this trainer at this college and phase
            allDomains: [trainer.domain],
          };
        } else {
          // Add hours from this batch to total
          collegePhaseBasedGrouping[collegePhaseKey].totalCollegeHours +=
            trainer.assignedHours;
          collegePhaseBasedGrouping[collegePhaseKey].allBatches.push(trainer);

          // Update dates to show the full range
          if (
            new Date(trainer.startDate) <
            new Date(
              collegePhaseBasedGrouping[collegePhaseKey].earliestStartDate
            )
          ) {
            collegePhaseBasedGrouping[collegePhaseKey].earliestStartDate =
              trainer.startDate;
          }
          if (
            new Date(trainer.endDate) >
            new Date(collegePhaseBasedGrouping[collegePhaseKey].latestEndDate)
          ) {
            collegePhaseBasedGrouping[collegePhaseKey].latestEndDate =
              trainer.endDate;
          }

          // Add unique projects and domains
          if (
            !collegePhaseBasedGrouping[collegePhaseKey].allProjects.includes(
              trainer.projectCode
            )
          ) {
            collegePhaseBasedGrouping[collegePhaseKey].allProjects.push(
              trainer.projectCode
            );
          }

          if (
            !collegePhaseBasedGrouping[collegePhaseKey].allDomains.includes(
              trainer.domain
            )
          ) {
            collegePhaseBasedGrouping[collegePhaseKey].allDomains.push(
              trainer.domain
            );
          }
        }
      });

      const collegePhaseBasedTrainers = Object.values(
        collegePhaseBasedGrouping
      );

      // Check invoices for each trainer-college-phase combination
      const updatedTrainersList = await Promise.all(
        collegePhaseBasedTrainers.map(async (trainer) => {
          try {
            const q = query(
              collection(db, "invoices"),
              where("trainerId", "==", trainer.trainerId),
              where("collegeName", "==", trainer.collegeName),
              where("phase", "==", trainer.phase)
            );

            const querySnapshot = await getDocs(q);
            const invoiceCount = querySnapshot.size;

            return {
              ...trainer,
              hasExistingInvoice: invoiceCount > 0,
              invoiceCount: invoiceCount,
            };
          } catch (error) {
            console.error(
              "Error checking invoice for trainer:",
              trainer.trainerId,
              error
            );
            return {
              ...trainer,
              hasExistingInvoice: false,
              invoiceCount: 0,
            };
          }
        })
      );

      setTrainerData(updatedTrainersList);

      // Group by phase
      const grouped = updatedTrainersList.reduce((acc, trainer) => {
        if (!acc[trainer.phase]) acc[trainer.phase] = [];
        acc[trainer.phase].push(trainer);
        return acc;
      }, {});

      setGroupedData(grouped);

      // Expand all phases by default
      const initialExpandedState = {};
      Object.keys(grouped).forEach((phase) => {
        initialExpandedState[phase] = true;
      });
      setExpandedPhases(initialExpandedState);
    } catch (error) {
      console.error("Error fetching trainer data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  const togglePhase = (phase) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phase]: !prev[phase],
    }));
  };

  const handleGenerateInvoice = (trainer) => {
    setSelectedTrainer(trainer);
    setShowInvoiceModal(true);
  };

  const handleRefreshData = () => {
    fetchTrainers();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
  };

  // Filter and search logic
  const filteredGroupedData = Object.keys(groupedData).reduce((acc, phase) => {
    const filteredTrainers = groupedData[phase].filter((trainer) => {
      const matchesSearch =
        trainer.trainerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trainer.trainerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trainer.collegeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trainer.projectCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDomain = filterDomain
        ? trainer.domain === filterDomain
        : true;

      return matchesSearch && matchesDomain;
    });

    if (filteredTrainers.length > 0) {
      acc[phase] = filteredTrainers;
    }

    return acc;
  }, {});

  // Get unique domains for filter
  const domains = [...new Set(trainerData.map((item) => item.domain))].filter(
    Boolean
  );

  // Get status icon and text for download button
  const getDownloadStatus = (trainerId, collegeName, phase) => {
    const status = pdfStatus[`${trainerId}_${collegeName}_${phase}`];
    if (!status) return null;

    switch (status) {
      case "downloading":
        return (
          <span className="text-blue-500 text-xs flex items-center mt-1">
            <FiRefreshCw className="animate-spin mr-1" /> Downloading...
          </span>
        );
      case "success":
        return (
          <span className="text-green-600 text-xs flex items-center mt-1">
            <FiCheckCircle className="mr-1" /> Downloaded!
          </span>
        );
      case "error":
        return (
          <span className="text-red-500 text-xs flex items-center mt-1">
            <FiAlertCircle className="mr-1" /> Failed. Try again.
          </span>
        );
      case "cancelled":
        return (
          <span className="text-gray-500 text-xs flex items-center mt-1">
            <FiXCircle className="mr-1" /> Cancelled
          </span>
        );
      case "not_found":
        return (
          <span className="text-amber-500 text-xs flex items-center mt-1">
            <FiInfo className="mr-1" /> No invoice found
          </span>
        );
      default:
        return null;
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterDomain("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Trainer Invoice Generator
              </h1>
              <p className="text-blue-100 opacity-90">
                Generate and manage invoices for trainers
              </p>
            </div>
            <button
              onClick={handleRefreshData}
              className="mt-4 md:mt-0 flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-all px-4 py-2 rounded-lg backdrop-blur-sm"
              aria-label="Refresh data"
            >
              <FiRefreshCw className="text-sm" />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Search
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="search"
                  type="text"
                  placeholder="Search trainers, colleges, IDs..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search trainers"
                />
              </div>
            </div>

            <div className="w-full md:w-56">
              <label
                htmlFor="domain-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Domain
              </label>
              <select
                id="domain-filter"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                aria-label="Filter by domain"
              >
                <option value="">All Domains</option>
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-auto">
              <button
                onClick={clearFilters}
                className="w-full md:w-auto px-4 py-2.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Clear filters"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Active filters indicator */}
          {(searchTerm || filterDomain) && (
            <div className="mt-3 flex items-center text-sm text-gray-500">
              <span className="mr-2">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                  Search: {searchTerm}
                </span>
              )}
              {filterDomain && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Domain: {filterDomain}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-500">Loading trainer data...</p>
            </div>
          ) : trainerData.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FiUser className="mx-auto text-4xl text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">
                No trainer data found
              </h3>
              <p className="text-gray-500">
                Training data will appear here once available
              </p>
            </div>
          ) : Object.keys(filteredGroupedData).length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FiSearch className="mx-auto text-4xl text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">
                No matching trainers
              </h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search or filter criteria
              </p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.keys(filteredGroupedData).map((phase) => (
                <div
                  key={phase}
                  className="border border-gray-200 rounded-lg overflow-hidden transition-all hover:shadow-sm"
                >
                  {/* Phase Header */}
                  <div
                    className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => togglePhase(phase)}
                    aria-expanded={expandedPhases[phase]}
                  >
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      {expandedPhases[phase] ? (
                        <FiChevronUp className="text-gray-500" />
                      ) : (
                        <FiChevronDown className="text-gray-500" />
                      )}
                      {phase.toUpperCase()} Trainers
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full ml-2">
                        {filteredGroupedData[phase].length}{" "}
                        {filteredGroupedData[phase].length === 1
                          ? "trainer"
                          : "trainers"}
                      </span>
                    </h3>
                    <span className="text-sm text-gray-500">
                      {expandedPhases[phase] ? "Collapse" : "Expand"}
                    </span>
                  </div>

                  {/* Trainer Table */}
                  {expandedPhases[phase] && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Trainer
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              College & Projects
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Domains
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Dates & Hours
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredGroupedData[phase].map((item, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-gray-50/50 transition-colors"
                            >
                              <td className="px-4 sm:px-6 py-4">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <FiUser className="text-blue-600" />
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {item.trainerName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      ID: {item.trainerId}
                                    </div>
                                    <div className="text-xs text-blue-600 mt-1">
                                      Phase: {item.phase}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <div className="text-sm text-gray-900 font-medium max-w-xs truncate">
                                  {item.collegeName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {item.allProjects.join(", ")}
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {item.allDomains.join(", ")}
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <FiCalendar className="text-gray-400 flex-shrink-0" />
                                  <span>
                                    {formatDate(item.earliestStartDate)} -{" "}
                                    {formatDate(item.latestEndDate)}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center">
                                  <FiDollarSign className="text-gray-400 mr-1 flex-shrink-0" />
                                  <span>
                                    {item.totalCollegeHours} hrs •{" "}
                                    {item.perHourCost
                                      ? `₹${item.perHourCost}/hr`
                                      : "Rate not set"}
                                  </span>
                                </div>
                                {item.allBatches.length > 1 && (
                                  <div className="text-xs text-blue-600 mt-1 flex items-center">
                                    <FiLayers className="mr-1" />
                                    {item.allBatches.length} batches combined
                                  </div>
                                )}
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <div className="flex flex-col gap-2 min-w-[180px]">
                                  {!item.hasExistingInvoice ? (
                                    <button
                                      onClick={() =>
                                        handleGenerateInvoice(item)
                                      }
                                      className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      disabled={
                                        !item.perHourCost ||
                                        item.perHourCost === 0
                                      }
                                      aria-label={`Generate invoice for ${item.trainerName}`}
                                    >
                                      <FiFileText className="mr-2" />
                                     View Invoices
                                    </button>
                                  ) : (
                                    <div className="flex flex-col">
                                      {/* YEH NAYA BUTTON ADD KARO - Generated wala */}
                                      <button
                                        className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-yellow-800 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors cursor-default mb-2"
                                        aria-label={`Invoice already generated for ${item.trainerName}`}
                                      >
                                        <FiCheckCircle className="mr-2" />
                                        Generated
                                      </button>

                                      {/* Download button (existing code) */}
                                      <button
                                        onClick={() =>
                                          handleDownloadInvoice(item)
                                        }
                                        className="inline-flex items-center justify-center px-3 py-2 border border-gray-200 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                        disabled={
                                          downloadingInvoice ===
                                          `${item.trainerId}_${item.collegeName}_${item.phase}`
                                        }
                                        aria-label={`Download invoice for ${item.trainerName}`}
                                      >
                                        <FiDownload className="mr-2" />
                                        {downloadingInvoice ===
                                        `${item.trainerId}_${item.collegeName}_${item.phase}`
                                          ? "Downloading..."
                                          : item.invoiceCount > 1
                                          ? `Download (${item.invoiceCount})`
                                          : "Download Invoice"}
                                      </button>
                                      {getDownloadStatus(
                                        item.trainerId,
                                        item.collegeName,
                                        item.phase
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showInvoiceModal && selectedTrainer && (
        <InvoiceModal
          trainer={selectedTrainer}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedTrainer(null);
            fetchTrainers(); // Refresh data after generating invoice
          }}
          onInvoiceGenerated={fetchTrainers} // Refresh after generation
        />
      )}
    </div>
  );
}

export default GenerateTrainerInvoice;
