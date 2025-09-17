import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { db } from "../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import InvoiceModal from "./InvoiceModal";
import { generateInvoicePDF } from "./invoiceUtils";
import { FiSearch, FiFilter, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import Header from "../Learning/Invoice/Header";
import FiltersSection from "../../components/Learning/Invoice/FiltersSection";
import TrainerTable from "./Invoice/TrainerTable";
import LoadingState from "./Invoice/LoadingState";
import EmptyState from "./Invoice/EmptyState";
import { FiCheckCircle } from "react-icons/fi";

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
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [filtersDropdownOpen, setFiltersDropdownOpen] = useState(false);
  const filtersBtnRef = useRef();
  const filtersDropdownRef = useRef();
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

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
            
            // Get the latest invoice status
            let invoiceStatus = null;
            let latestInvoice = null;
            
            if (invoiceCount > 0) {
              // Find the most recent invoice
              querySnapshot.forEach(doc => {
                const invoiceData = doc.data();
                if (!latestInvoice || invoiceData.createdAt > latestInvoice.createdAt) {
                  latestInvoice = invoiceData;
                }
              });
              
              invoiceStatus = latestInvoice.status || "generated";
            }

            return {
              ...trainer,
              hasExistingInvoice: invoiceCount > 0,
              invoiceCount: invoiceCount,
              invoiceStatus: invoiceStatus,
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
              invoiceStatus: null,
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

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className=" mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <Header />
        
        <FiltersSection
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filtersBtnRef={filtersBtnRef}
          isAnyFilterActive={isAnyFilterActive}
          toggleFiltersDropdown={toggleFiltersDropdown}
          filtersDropdownOpen={filtersDropdownOpen}
          filtersDropdownRef={filtersDropdownRef}
          dropdownPosition={dropdownPosition}
          projectCodeFilter={projectCodeFilter}
          setProjectCodeFilter={setProjectCodeFilter}
          projectCodes={projectCodes}
          collegeNameFilter={collegeNameFilter}
          setCollegeNameFilter={setCollegeNameFilter}
          collegeNames={collegeNames}
          startDateFilter={startDateFilter}
          setStartDateFilter={setStartDateFilter}
          endDateFilter={endDateFilter}
          setEndDateFilter={setEndDateFilter}
          clearAllFilters={clearAllFilters}
          applyFilters={applyFilters}
          showOnlyActive={showOnlyActive}
          setShowOnlyActive={setShowOnlyActive}
          handleRefreshData={handleRefreshData}
          exporting={exporting}
          setExporting={setExporting}
          filteredGroupedData={filteredGroupedData}
          searchTerm={searchTerm}
          startDateFilter={startDateFilter}
          endDateFilter={endDateFilter}
          projectCodeFilter={projectCodeFilter}
          collegeNameFilter={collegeNameFilter}
        />

        <div className="p-4 sm:p-6">
          {loading ? (
            <LoadingState />
          ) : trainerData.length === 0 ? (
            <EmptyState 
              icon={FiUser}
              title="No trainer data found"
              message="Training data will appear here once available"
            />
          ) : Object.keys(filteredGroupedData).length === 0 ? (
            <EmptyState 
              icon={FiSearch}
              title="No matching trainers"
              message="Try adjusting your filters"
            />
          ) : (
            <TrainerTable
              filteredGroupedData={filteredGroupedData}
              expandedPhases={expandedPhases}
              togglePhase={togglePhase}
              handleDownloadInvoice={handleDownloadInvoice}
              handleEditInvoice={handleEditInvoice}
              handleGenerateInvoice={handleGenerateInvoice}
              downloadingInvoice={downloadingInvoice}
              getDownloadStatus={getDownloadStatus}
              formatDate={formatDate}
            />
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