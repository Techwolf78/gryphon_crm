import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import InvoiceModal from "./InvoiceModal";
import { generateInvoicePDF } from "./invoiceUtils";
import InvoiceExcelExporter from "./Initiate/InvoiceExcelExporter";
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
  FiClock,
  FiAlertCircle,
  FiXCircle,
  FiInfo,
  FiLayers,
  FiTrash2,
  FiFile,
} from "react-icons/fi";
import { FaEye } from "react-icons/fa";







function GenerateTrainerInvoice() {
  const [trainerData, setTrainerData] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [projectCodeFilter, setProjectCodeFilter] = useState("");
  const [collegeNameFilter, setCollegeNameFilter] = useState("");
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);
  const [pdfStatus, setPdfStatus] = useState({});
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null); // State for editing invoice
  const [exporting, setExporting] = useState(false);

  // Combined filters dropdown state
  const [filtersDropdownOpen, setFiltersDropdownOpen] = useState(false);
  const filtersBtnRef = useRef();
  const filtersDropdownRef = useRef();
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });



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


  // Function to handle editing an invoice
  const handleEditInvoice = async (trainer) => {
    try {
      // Find the invoice for this trainer
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
            }). Please enter the invoice number you want to edit:\n${invoiceNumbers.join(
              "\n"
            )}`
          );

          if (selectedInvoice) {
            const selectedDoc = querySnapshot.docs.find(
              (doc) => doc.data().billNumber === selectedInvoice
            );
            if (selectedDoc) {
              const invoiceData = selectedDoc.data();
              setEditingInvoice({ ...invoiceData, id: selectedDoc.id });
              setSelectedTrainer(trainer);
              setShowInvoiceModal(true);
            } else {
              alert("Invalid invoice number selected");
            }
          }
        } else {
          // Single invoice - edit it directly
          const invoiceData = querySnapshot.docs[0].data();
          setEditingInvoice({ ...invoiceData, id: querySnapshot.docs[0].id });
          setSelectedTrainer(trainer);
          setShowInvoiceModal(true);
        }
      } else {
        alert("No invoice found for this trainer at this college and phase");
      }
    } catch (error) {
      console.error("Error finding invoice for editing:", error);
      alert("Failed to find invoice. Please try again.");
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
          const _phaseData = phaseDoc.data();

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
                    conveyance: parseFloat(trainer.conveyance) || 0,
                    food: parseFloat(trainer.food) || 0,
                    lodging: parseFloat(trainer.lodging) || 0,
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
    setEditingInvoice(null); // Reset editing state
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
      // compute invoice availability
      const invoiceAvailable = trainer.latestEndDate
        ? Date.now() >=
          new Date(trainer.latestEndDate).getTime() + 24 * 60 * 60 * 1000
        : false;

      // when showOnlyActive is true, only include trainers that either already have an invoice or are available
      if (showOnlyActive && !trainer.hasExistingInvoice && !invoiceAvailable) {
        return false;
      }
      const matchesSearch =
        trainer.trainerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trainer.trainerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trainer.collegeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trainer.projectCode.toLowerCase().includes(searchTerm.toLowerCase());

      // Date range filter
      const matchesDateRange =
        (!startDateFilter ||
          new Date(trainer.earliestStartDate) >= new Date(startDateFilter)) &&
        (!endDateFilter ||
          new Date(trainer.latestEndDate) <= new Date(endDateFilter));

      // Project code filter
      const matchesProjectCode = projectCodeFilter
        ? trainer.projectCode
            .toLowerCase()
            .includes(projectCodeFilter.toLowerCase())
        : true;

      // College name filter
      const matchesCollegeName = collegeNameFilter
        ? trainer.collegeName
            .toLowerCase()
            .includes(collegeNameFilter.toLowerCase())
        : true;

      return (
        matchesSearch &&
        matchesDateRange &&
        matchesProjectCode &&
        matchesCollegeName
      );
    });

    if (filteredTrainers.length > 0) {
      acc[phase] = filteredTrainers;
    }

    return acc;
  }, {});

  // Get unique project codes for filter
  const projectCodes = [
    ...new Set(trainerData.map((item) => item.projectCode)),
  ].filter(Boolean);

  // Get unique college names for filter
  const collegeNames = [
    ...new Set(trainerData.map((item) => item.collegeName)),
  ].filter(Boolean);

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

  // Check if any filters are active (for badge on Filters button)
  const isAnyFilterActive =
    startDateFilter || endDateFilter || projectCodeFilter || collegeNameFilter;

  // Handle filters dropdown toggle with always downward positioning
  const toggleFiltersDropdown = () => {
    if (filtersDropdownOpen) {
      setFiltersDropdownOpen(false);
    } else {
      const rect = filtersBtnRef.current.getBoundingClientRect();
      const dropdownWidth = 320; // Approximate width
      let top = rect.bottom + window.scrollY + 8; // Always position below the button
      let left = rect.left + window.scrollX - dropdownWidth; // Left side (aligned to button's left edge)

      // Adjust for left overflow only
      if (left < 16) {
        // Minimum left margin
        left = 16;
      }

      setDropdownPosition({ top, left });
      setFiltersDropdownOpen(true);
    }
  };

  // Apply filters and close dropdown
  const applyFilters = () => {
    setFiltersDropdownOpen(false);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setStartDateFilter("");
    setEndDateFilter("");
    setProjectCodeFilter("");
    setCollegeNameFilter("");
    setFiltersDropdownOpen(false);
  };

  // Close dropdowns on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        filtersDropdownRef.current &&
        !filtersDropdownRef.current.contains(event.target) &&
        !filtersBtnRef.current.contains(event.target)
      ) {
        setFiltersDropdownOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setFiltersDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [filtersDropdownOpen]);

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className=" mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl font-bold mb-2">Trainer Invoice</h1>
              <p className="text-blue-100 opacity-90">
                Generate and manage invoices for trainers
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 mb-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
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

            {/* Combined Filters Button */}
            <div className="relative">
              <button
                ref={filtersBtnRef}
                onClick={toggleFiltersDropdown}
                className={`inline-flex items-center px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  isAnyFilterActive ? "ring-2 ring-blue-500/20" : ""
                }`}
                aria-label="Open filters"
              >
                <FiFilter className="w-4 h-4 mr-1" />
                Filters
                {isAnyFilterActive && (
                  <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </button>
              {filtersDropdownOpen &&
                createPortal(
                  <div
                    ref={filtersDropdownRef}
                    className="z-50 w-full max-w-sm md:max-w-md bg-white border border-gray-200 rounded-xl shadow-xl py-4 px-4 flex flex-col space-y-4 animate-fade-in transition-opacity duration-200"
                    style={{
                      position: "absolute",
                      top: dropdownPosition.top,
                      left: dropdownPosition.left,
                      maxHeight: "80vh",
                      overflowY: "auto",
                    }}
                  >
                    {/* Project Code Filter */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <FiBook className="w-4 h-4 mr-1" />
                        Project Code
                      </label>
                      <select
                        value={projectCodeFilter}
                        onChange={(e) => setProjectCodeFilter(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      >
                        <option value="">All Project Codes</option>
                        {projectCodes.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* College Name Filter */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <FiUser className="w-4 h-4 mr-1" />
                        College Name
                      </label>
                      <select
                        value={collegeNameFilter}
                        onChange={(e) => setCollegeNameFilter(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      >
                        <option value="">All Colleges</option>
                        {collegeNames.map((college) => (
                          <option key={college} value={college}>
                            {college}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date Filter */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <FiCalendar className="w-4 h-4 mr-1" />
                        Date Range
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={startDateFilter}
                          onChange={(e) => setStartDateFilter(e.target.value)}
                          className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          placeholder="Start Date"
                        />
                        <input
                          type="date"
                          value={endDateFilter}
                          onChange={(e) => setEndDateFilter(e.target.value)}
                          className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          placeholder="End Date"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-between gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={clearAllFilters}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                      >
                        <FiTrash2 className="w-4 h-4 mr-1" />
                        Clear All
                      </button>
                      <button
                        onClick={applyFilters}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all"
                      >
                        Apply
                      </button>
                    </div>
                  </div>,
                  document.body
                )}
            </div>

            {/* Active-only toggle (label - switch - status) and Refresh Button */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">
                Only active invoices
              </span>

              <button
                role="switch"
                aria-checked={showOnlyActive}
                onClick={() => setShowOnlyActive((s) => !s)}
                className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none ${
                  showOnlyActive ? "bg-blue-600" : "bg-gray-300"
                }`}
                aria-label="Toggle show only active invoices"
              >
                <span
                  className={`inline-block h-5 w-5 transform bg-white rounded-full transition-transform ${
                    showOnlyActive ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>

              <span
                className={`text-sm font-medium ${
                  showOnlyActive ? "text-blue-600" : "text-gray-500"
                }`}
              >
                {showOnlyActive ? "ON" : "OFF"}
              </span>

              <InvoiceExcelExporter 
  db={db} 
  exporting={exporting} 
  setExporting={setExporting} 
/>

              <button
                onClick={handleRefreshData}
                className="inline-flex items-center px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <FiRefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>

          {/* Active filters indicator */}
          {(searchTerm ||
            startDateFilter ||
            endDateFilter ||
            projectCodeFilter ||
            collegeNameFilter) && (
            <div className="mt-3 flex flex-wrap items-center text-sm text-gray-500">
              <span className="mr-2">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2 mb-2">
                  Search: {searchTerm}
                </span>
              )}
              {projectCodeFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-2 mb-2">
                  Project Code: {projectCodeFilter}
                </span>
              )}
              {collegeNameFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2 mb-2">
                  College: {collegeNameFilter}
                </span>
              )}
              {startDateFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mr-2 mb-2">
                  Start Date: {startDateFilter}
                </span>
              )}
              {endDateFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 mr-2 mb-2">
                  End Date: {endDateFilter}
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
                          {filteredGroupedData[phase].map((item, idx) => {
                            const invoiceAvailable = item.latestEndDate
                              ? Date.now() >=
                                new Date(item.latestEndDate).getTime() +
                                  24 * 60 * 60 * 1000
                              : false;
                            const availableOn = item.latestEndDate
                              ? new Date(
                                  new Date(item.latestEndDate).getTime() +
                                    24 * 60 * 60 * 1000
                                ).toISOString()
                              : null;

                            return (
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
                                  <div className="flex flex-col gap-2">
                                    {item.hasExistingInvoice ? (
                                      <>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() =>
                                              handleDownloadInvoice(item)
                                            }
                                            disabled={
                                              downloadingInvoice ===
                                              `${item.trainerId}_${item.collegeName}_${item.phase}`
                                            }
                                            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all"
                                          >
                                            <FiDownload className="w-4 h-4 mr-1" />
                                            Download
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleEditInvoice(item)
                                            }
                                            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all"
                                          >
                                            <FaEye className="w-4 h-4 mr-1" />
                                            View
                                          </button>
                                        </div>
                                        {getDownloadStatus(
                                          item.trainerId,
                                          item.collegeName,
                                          item.phase
                                        )}
                                        <div className="text-xs text-green-600 flex items-center">
                                          <FiCheckCircle className="mr-1" />
                                          Invoice generated ({item.invoiceCount}
                                          )
                                        </div>
                                      </>
                                    ) : invoiceAvailable ? (
                                      <button
                                        onClick={() =>
                                          handleGenerateInvoice(item)
                                        }
                                        className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all"
                                      >
                                        <FiFileText className="w-4 h-4 mr-1" />
                                        Generate Invoice
                                      </button>
                                    ) : (
                                      <div className="text-center">
                                        <div className="text-xs text-amber-600 flex items-center justify-center mb-1">
                                          <FiClock className="mr-1" />
                                          Available on{" "}
                                          {availableOn
                                            ? formatDate(availableOn)
                                            : "N/A"}
                                        </div>
                                        <button
                                          disabled
                                          className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                                        >
                                          <FiFileText className="w-4 h-4 mr-1" />
                                          Generate Invoice
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
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
          }}
          onInvoiceGenerated={fetchTrainers}
        />
      )}
    </div>
  );
}

export default GenerateTrainerInvoice;
