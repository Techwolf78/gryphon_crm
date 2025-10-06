import React, { useEffect, useState, useCallback, useRef } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import InvoiceModal from "./InvoiceModal";
import { generateInvoicePDF } from "./invoiceUtils";
import { FiSearch, FiFilter, FiRefreshCw, FiTrash2, FiUser, FiCheckCircle, FiAlertCircle, FiXCircle, FiInfo, FiClock } from "react-icons/fi";
import Header from "./Invoice/Header";
import FiltersSection from "./Invoice/FiltersSection";
import EmptyState from "./Invoice/EmptyState";
import TrainerInvoiceSkeleton from "./Invoice/TrainerInvoiceSkeleton";
import TrainerTable from "./Invoice/TrainerTable";

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
  const [businessNameFilter, setBusinessNameFilter] = useState("");
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);
  const [pdfStatus, setPdfStatus] = useState({});
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filtersDropdownOpen, setFiltersDropdownOpen] = useState(false);
  const filtersBtnRef = useRef();
  const filtersDropdownRef = useRef();
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  // 🚀 NEW: Caching and Performance State
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [cachedData, setCachedData] = useState(null);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  // 🚀 OPTIMIZED: Enhanced data fetch function with caching and performance improvements
  const fetchTrainers = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    // 📱 Use cache if data is fresh and not forcing refresh
    if (!forceRefresh && cachedData && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION) {
      console.log('🎯 Using cached data, skipping Firebase request');
      setTrainerData(cachedData.trainerData);
      setGroupedData(cachedData.groupedData);
      setExpandedPhases(cachedData.expandedPhases);
      setLoading(false);
      return;
    }
    
    console.log('🔄 Fetching fresh data from Firebase...');
    setLoading(true);
    if (forceRefresh) {
      setRefreshing(true);
    }
    
    let trainersList = [];
    try {
      // 🔥 OPTIMIZED: Add query constraints to reduce data transfer
      const trainingFormsQuery = query(
        collection(db, "trainingForms"),
        orderBy("createdAt", "desc"),
        limit(100) // Reasonable limit to prevent excessive data
      );
      
      const trainingFormsSnap = await getDocs(trainingFormsQuery);
      console.log(`📊 Fetched ${trainingFormsSnap.docs.length} training forms`);

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
                    trainer.startDate || domainData.trainingStartDate || trainer.activeDates?.[0] || "";
                  const endDate =
                    trainer.endDate || domainData.trainingEndDate || trainer.activeDates?.slice(-1)[0] || "";

                  // Collect all topics from trainer, batch, and domain levels
                  const allTopics = new Set();

                  // Add domain-level topics
                  if (domainData.topics && Array.isArray(domainData.topics)) {
                    domainData.topics.forEach(topic => allTopics.add(topic));
                  }

                  // Add trainer-level topics (from trainer.topics if available)
                  if (trainer.topics && Array.isArray(trainer.topics)) {
                    trainer.topics.forEach(topic => allTopics.add(topic));
                  }

                  // Add batch-level topics if available in the batch data
                  if (batch.topics && Array.isArray(batch.topics)) {
                    batch.topics.forEach(topic => allTopics.add(topic));
                  }

                  const trainerObj = {
                    trainerName: trainer.trainerName || "N/A",
                    trainerId: trainer.trainerId || "",
                    phase: phaseId,
                    domain: domainData.domain || domainDoc.id,
                    businessName: formData.businessName || "",
                    projectCode: formData.projectCode || "",
                    formId: formId,
                    collegeName: (formData.businessName || "").split('/')[0]?.trim() || "Unknown College",
                    startDate,
                    endDate,
                    topics: Array.from(allTopics), // All aggregated topics
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
                    // Add phase-level merged training data
                    isMergedTraining: _phaseData.isMergedTraining || false,
                    mergedColleges: _phaseData.mergedColleges || [],
                    operationsConfig: _phaseData.operationsConfig || null,
                    totalCost: _phaseData.totalCost || 0,
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
          const collegeName = trainer.collegeName;
        // For merged JD trainings, group by the merged colleges instead of individual college
       let groupingKey;
  if (trainer.isMergedTraining && trainer.domain === "JD") {
    // Sort merged colleges to ensure consistent key regardless of order
    const sortedColleges = trainer.mergedColleges
      .map(c => c.collegeName || c)
      .sort()
      .join('_');
    groupingKey = `merged_jd_${sortedColleges}_${trainer.trainerId.trim()}_${trainer.phase.trim().toLowerCase()}`;
  } else {
    // Original logic for non-merged trainings
    const isJDDomain = trainer.domain === "JD";
    groupingKey = isJDDomain
      ? `${collegeName.trim().toLowerCase()}_${trainer.trainerId.trim()}_${trainer.phase.trim().toLowerCase()}`
      : `${collegeName.trim().toLowerCase()}_${trainer.trainerId.trim()}_${trainer.phase.trim().toLowerCase()}_${trainer.projectCode.trim()}`;
  }



        if (!collegePhaseBasedGrouping[groupingKey]) {
          collegePhaseBasedGrouping[groupingKey] = {
            ...trainer,
            totalCollegeHours: trainer.assignedHours,
            allBatches: [trainer],
            earliestStartDate: trainer.startDate,
            latestEndDate: trainer.endDate,
            // Keep track of all projects for this trainer at this college and phase
            allProjects: [trainer.projectCode],
            // Keep track of all domains for this trainer at this college and phase
            allDomains: [trainer.domain],
            // For merged trainings, track all colleges involved
            allColleges: trainer.isMergedTraining ? trainer.mergedColleges.map(c => c.collegeName || c) : [trainer.collegeName],
            // Aggregate all topics from all batches
            allTopics: new Set(trainer.topics || []),
            // Store merged training info
            isMerged: trainer.isMergedTraining,
            mergedColleges: trainer.mergedColleges || [],
            operationsConfig: trainer.operationsConfig,
          };
        } else {
          // Add hours from this batch to total
          // For JD domain, don't sum hours since it's merged across projects
          if (!trainer.isMergedTraining || trainer.domain !== "JD") {
            collegePhaseBasedGrouping[groupingKey].totalCollegeHours +=
              trainer.assignedHours;
          }
          collegePhaseBasedGrouping[groupingKey].allBatches.push(trainer);

          // Update dates to show the full range
          if (
            new Date(trainer.startDate) <
            new Date(
              collegePhaseBasedGrouping[groupingKey].earliestStartDate
            )
          ) {
            collegePhaseBasedGrouping[groupingKey].earliestStartDate =
              trainer.startDate;
          }
          if (
            new Date(trainer.endDate) >
            new Date(collegePhaseBasedGrouping[groupingKey].latestEndDate)
          ) {
            collegePhaseBasedGrouping[groupingKey].latestEndDate =
              trainer.endDate;
          }

          // Add unique projects and domains
          if (
            !collegePhaseBasedGrouping[groupingKey].allProjects.includes(
              trainer.projectCode
            )
          ) {
            collegePhaseBasedGrouping[groupingKey].allProjects.push(
              trainer.projectCode
            );
          }

          if (
            !collegePhaseBasedGrouping[groupingKey].allDomains.includes(
              trainer.domain
            )
          ) {
            collegePhaseBasedGrouping[groupingKey].allDomains.push(
              trainer.domain
            );
          }

          // For merged trainings, add college if not already present
          if (trainer.isMergedTraining) {
            const collegeName = trainer.mergedColleges.map(c => c.collegeName || c).find(c => !collegePhaseBasedGrouping[groupingKey].allColleges.includes(c));
            if (collegeName && !collegePhaseBasedGrouping[groupingKey].allColleges.includes(collegeName)) {
              collegePhaseBasedGrouping[groupingKey].allColleges.push(collegeName);
            }
          }

          // Aggregate topics from this batch
          if (trainer.topics && Array.isArray(trainer.topics)) {
            trainer.topics.forEach(topic => {
              collegePhaseBasedGrouping[groupingKey].allTopics.add(topic);
            });
          }
        }
      });


      // Data grouping complete
      
      const collegePhaseBasedTrainers = Object.values(
        collegePhaseBasedGrouping
      ).map(trainer => {
        const finalTrainer = {
          ...trainer,
          topics: Array.from(trainer.allTopics), // Convert Set to Array for topics
        };

        // For merged trainings, update display fields
        if (trainer.isMerged) {
          finalTrainer.businessName = trainer.allColleges.join(", ");
          finalTrainer.collegeName = trainer.allColleges.join(", ");
          finalTrainer.projectCode = trainer.allProjects.join(", ");
        }

        return finalTrainer;
      });

      // 🔥 OPTIMIZED: Batch invoice status checks to reduce Firebase calls
      console.log('📊 Checking invoice status for trainers...');
      const updatedTrainersList = await Promise.all(
        collegePhaseBasedTrainers.map(async (trainer) => {
          try {
            let totalInvoiceCount = 0;
            let latestInvoice = null;
            let invoiceStatus = null;

            // 🚀 OPTIMIZED: Use more specific queries to reduce data transfer
            const invoiceQuery = trainer.isMerged
              ? query(
                  collection(db, "invoices"),
                  where("trainerId", "==", trainer.trainerId),
                  where("collegeName", "==", trainer.collegeName),
                  where("phase", "==", trainer.phase),
                  orderBy("createdAt", "desc"),
                  limit(5) // Limit to recent invoices only
                )
              : query(
                  collection(db, "invoices"),
                  where("trainerId", "==", trainer.trainerId),
                  where("collegeName", "==", trainer.collegeName),
                  where("phase", "==", trainer.phase),
                  orderBy("createdAt", "desc"),
                  limit(5) // Limit to recent invoices only
                );

            const querySnapshot = await getDocs(invoiceQuery);
            totalInvoiceCount = querySnapshot.size;

            if (totalInvoiceCount > 0) {
              // Find the most recent invoice (first doc due to orderBy desc)
              const latestDoc = querySnapshot.docs[0];
              latestInvoice = latestDoc.data();
              invoiceStatus = latestInvoice.status || "generated";
            }

            return {
              ...trainer,
              hasExistingInvoice: totalInvoiceCount > 0,
              invoiceCount: totalInvoiceCount,
              invoiceStatus: invoiceStatus,
            };
          } catch {
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
      
      // 💾 CACHE: Store the results with timestamp
      const cacheData = {
        trainerData: updatedTrainersList,
        groupedData: grouped,
        expandedPhases: initialExpandedState,
      };
      setCachedData(cacheData);
      setLastFetchTime(now);
      setHasInitiallyLoaded(true);
      
      console.log(`✅ Successfully cached ${updatedTrainersList.length} trainers`);
      
    } catch (error) {
      console.error('❌ Error fetching trainers:', error);
      // Don't show error immediately if we have cached data
      if (!cachedData) {
        // Handle error appropriately
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lastFetchTime, cachedData, CACHE_DURATION]);

  // 🚀 OPTIMIZED: Lazy loading - only fetch on first mount, not on every tab switch
  useEffect(() => {
    if (!hasInitiallyLoaded) {
      console.log('🚀 Initial load - fetching trainer data...');
      fetchTrainers();
    } else {
      console.log('💾 Component remounted - using existing data');
      // Component remounted but we already have data, check if cache is still valid
      const now = Date.now();
      if (lastFetchTime && (now - lastFetchTime) >= CACHE_DURATION) {
        console.log('⏰ Cache expired - fetching fresh data...');
        fetchTrainers();
      }
    }
  }, [hasInitiallyLoaded, lastFetchTime, CACHE_DURATION, fetchTrainers]);

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

  // 🔄 ENHANCED: Manual refresh with cache invalidation and visual feedback
  const handleRefreshData = () => {
    console.log('🔄 Manual refresh triggered - forcing fresh data fetch');
    fetchTrainers(true); // Force refresh
  };
  
  // 💡 NEW: Function to check cache status for UI indicators
  const getCacheStatus = () => {
    if (!lastFetchTime) return { status: 'never', message: 'Never loaded' };
    
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    const minutesAgo = Math.floor(timeSinceLastFetch / (1000 * 60));
    
    if (timeSinceLastFetch < CACHE_DURATION) {
      return { 
        status: 'fresh', 
        message: `Data cached ${minutesAgo === 0 ? 'just now' : `${minutesAgo}m ago`}`,
        isExpired: false
      };
    } else {
      return { 
        status: 'expired', 
        message: `Data is ${minutesAgo}m old (expired)`,
        isExpired: true
      };
    }
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
        trainer.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      const matchesBusinessName = businessNameFilter
        ? trainer.businessName
            .toLowerCase()
            .includes(businessNameFilter.toLowerCase())
        : true;

      return (
        matchesSearch &&
        matchesDateRange &&
        matchesProjectCode &&
        matchesBusinessName
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
  const businessNames = [
    ...new Set(trainerData.map((item) => item.businessName)),
  ].filter(Boolean);

  // Get status icon and text for download button
  const getDownloadStatus = (trainer) => {
    const statusKey = trainer.isMerged 
      ? `${trainer.trainerId}_merged_jd_${trainer.phase}_${trainer.allProjects.join('_')}`
      : `${trainer.trainerId}_${trainer.businessName}_${trainer.phase}_${trainer.projectCode}`;
    const status = pdfStatus[statusKey];
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
    startDateFilter || endDateFilter || projectCodeFilter || businessNameFilter;

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
    setBusinessNameFilter("");
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
    const statusKey = trainer.isMerged 
      ? `${trainer.trainerId}_merged_jd_${trainer.phase}_${trainer.allProjects.join('_')}`
      : `${trainer.trainerId}_${trainer.businessName}_${trainer.phase}_${trainer.projectCode}`;
    
    setDownloadingInvoice(statusKey);
    setPdfStatus((prev) => ({
      ...prev,
      [statusKey]: "downloading",
    }));

    try {
      let allInvoices = [];

      if (trainer.isMerged) {
        // For merged trainings, get the merged invoice
        const q = query(
          collection(db, "invoices"),
          where("trainerId", "==", trainer.trainerId),
          where("collegeName", "==", trainer.collegeName),
          where("phase", "==", trainer.phase)
        );

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
          allInvoices.push({ id: doc.id, ...doc.data() });
        });
      } else {
        // Original logic for non-merged trainings
        const q = query(
          collection(db, "invoices"),
          where("trainerId", "==", trainer.trainerId),
          where("collegeName", "==", trainer.collegeName),
          where("phase", "==", trainer.phase)
        );

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
          allInvoices.push({ id: doc.id, ...doc.data() });
        });
      }

      if (allInvoices.length > 0) {
        if (allInvoices.length > 1) {
          // For multiple invoices, show selection dialog
          const invoiceOptions = allInvoices.map(invoice => 
            `${invoice.billNumber} (${trainer.collegeName})`
          );
          const selectedInvoice = prompt(
            `Multiple invoices found for ${trainer.trainerName}. Please enter the invoice number you want to download:\n${invoiceOptions.join(
              "\n"
            )}`
          );

          if (selectedInvoice) {
            const selectedInvoiceData = allInvoices.find(
              inv => inv.billNumber === selectedInvoice.split(' ')[0]
            );
            if (selectedInvoiceData) {
              const success = await generateInvoicePDF(selectedInvoiceData);
              setPdfStatus((prev) => ({
                ...prev,
                [statusKey]: success ? "success" : "error",
              }));
            } else {
              alert("Invalid invoice number selected");
              setPdfStatus((prev) => ({
                ...prev,
                [statusKey]: "error",
              }));
            }
          } else {
            setPdfStatus((prev) => ({
              ...prev,
              [statusKey]: "cancelled",
            }));
          }
        } else {
          // Single invoice - download it directly
          const success = await generateInvoicePDF(allInvoices[0]);
          setPdfStatus((prev) => ({
            ...prev,
            [statusKey]: success ? "success" : "error",
          }));
        }
      } else {
        alert("No invoice found for this trainer");
        setPdfStatus((prev) => ({
          ...prev,
          [statusKey]: "not_found",
        }));
      }
    } catch {
      alert("Failed to download invoice. Please try again.");
      setPdfStatus((prev) => ({
        ...prev,
        [statusKey]: "error",
      }));
    } finally {
      setDownloadingInvoice(null);
    }
  };  // Function to handle editing an invoice
  const handleEditInvoice = async (trainer) => {
    try {
      let allInvoices = [];

      if (trainer.isMerged) {
        // For merged trainings, get the merged invoice
        const q = query(
          collection(db, "invoices"),
          where("trainerId", "==", trainer.trainerId),
          where("collegeName", "==", trainer.collegeName),
          where("phase", "==", trainer.phase)
        );

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
          allInvoices.push({ id: doc.id, ...doc.data() });
        });
      } else {
        // Original logic for non-merged trainings
        const q = query(
          collection(db, "invoices"),
          where("trainerId", "==", trainer.trainerId),
          where("collegeName", "==", trainer.collegeName),
          where("phase", "==", trainer.phase)
        );

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
          allInvoices.push({ id: doc.id, ...doc.data() });
        });
      }

      if (allInvoices.length > 0) {
        if (allInvoices.length > 1) {
          // For multiple invoices, show selection dialog
          const invoiceOptions = allInvoices.map(invoice => 
            `${invoice.billNumber} (${trainer.collegeName})`
          );
          const selectedInvoice = prompt(
            `Multiple invoices found for ${trainer.trainerName}. Please enter the invoice number you want to edit:\n${invoiceOptions.join(
              "\n"
            )}`
          );

          if (selectedInvoice) {
            const selectedInvoiceData = allInvoices.find(
              inv => inv.billNumber === selectedInvoice.split(' ')[0]
            );
            if (selectedInvoiceData) {
              setSelectedTrainer(trainer);
              setShowInvoiceModal(true);
            } else {
              alert("Invalid invoice number selected");
            }
          }
        } else {
          // Single invoice - edit it directly
          setSelectedTrainer(trainer);
          setShowInvoiceModal(true);
        }
      } else {
        alert("No invoice found for this trainer");
      }
    } catch {
      alert("Failed to find invoice. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {loading ? (
        <TrainerInvoiceSkeleton />
      ) : (
        <div className="mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <Header />
          
          {/* 💡 NEW: Cache Status Indicator */}
          {!loading && lastFetchTime && (
            <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <FiClock className={`text-sm ${
                    getCacheStatus().isExpired ? 'text-amber-500' : 'text-green-500'
                  }`} />
                  <span className={`font-medium ${
                    getCacheStatus().isExpired ? 'text-amber-700' : 'text-green-700'
                  }`}>
                    {getCacheStatus().message}
                  </span>
                  {refreshing && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <FiRefreshCw className="animate-spin text-xs" />
                      <span className="text-xs">Updating...</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleRefreshData}
                  disabled={refreshing}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    refreshing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : getCacheStatus().isExpired
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  <FiRefreshCw className={`text-xs ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>
            </div>
          )}
          
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
            businessNameFilter={businessNameFilter}
            setBusinessNameFilter={setBusinessNameFilter}
            businessNames={businessNames}
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
          />

          <div className="p-1 sm:p-2">
            {trainerData.length === 0 ? (
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
      )}
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

