import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, where, orderBy, limit, updateDoc, doc } from "firebase/firestore";
import InvoiceModal from "./InvoiceModal";
import { generateInvoicePDF } from "./invoiceUtils";
import { FiSearch, FiFilter, FiRefreshCw, FiTrash2, FiUser, FiCheckCircle, FiAlertCircle, FiXCircle, FiInfo, FiClock } from "react-icons/fi";
import Header from "./Invoice/Header";
import FiltersSection from "./Invoice/FiltersSection";
import EmptyState from "./Invoice/EmptyState";
import TrainerInvoiceSkeleton from "./Invoice/TrainerInvoiceSkeleton";
import TrainerTable from "./Invoice/TrainerTable";

function GenerateTrainerInvoice() {
  // Cache duration: 5 minutes (but adaptive based on usage)
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const EXTENDED_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for heavy users
  const CACHE_VERSION = 'v2.0_college_first'; // 🆕 Version to invalidate old cache structure
  
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
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [filtersDropdownOpen, setFiltersDropdownOpen] = useState(false);
  const filtersBtnRef = useRef();
  const filtersDropdownRef = useRef();
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  // Custom toast state (like InitiationDashboard)
  const [toast, setToast] = useState(null);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000); // 3 seconds

      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  // 🧠 Cache state management
  const [cachedData, setCachedData] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  
  // 🧠 Intelligent cache management with version check
  const getAdaptiveCacheDuration = useMemo(() => {
    return () => {
      try {
        const sessionVisits = parseInt(localStorage.getItem('trainer_invoice_session_visits') || '0');
        // If user has visited multiple times in this session, extend cache duration
        const duration = sessionVisits > 3 ? EXTENDED_CACHE_DURATION : CACHE_DURATION;
        return duration;
      } catch {
        return CACHE_DURATION;
      }
    };
  }, [CACHE_DURATION, EXTENDED_CACHE_DURATION]);
  
  const trackUserVisit = () => {
    try {
      const currentVisits = parseInt(localStorage.getItem('trainer_invoice_session_visits') || '0');
      localStorage.setItem('trainer_invoice_session_visits', (currentVisits + 1).toString());
    } catch {
      // Ignore storage errors
    }
  };
  
  // 🔄 Helper functions for localStorage cache management
  const saveCacheToStorage = (data, timestamp) => {
    try {
      localStorage.setItem('trainer_invoice_cache', JSON.stringify(data));
      localStorage.setItem('trainer_invoice_last_fetch', timestamp.toString());
      localStorage.setItem('trainer_invoice_cache_version', CACHE_VERSION); // 🆕 Save version
    } catch (error) {
      console.warn('⚠️ Failed to save cache to localStorage:', error);
    }
  };
  
  const clearCacheFromStorage = () => {
    try {
      localStorage.removeItem('trainer_invoice_cache');
      localStorage.removeItem('trainer_invoice_last_fetch');
      localStorage.removeItem('trainer_invoice_cache_version'); // 🆕 Clear version too
    } catch (error) {
      console.warn('⚠️ Failed to clear cache from localStorage:', error);
    }
  };

  // 🚀 OPTIMIZED: Enhanced data fetch function with persistent caching
  const fetchTrainers = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    const adaptiveDuration = getAdaptiveCacheDuration();
    
    // 📱 Use cache if data is fresh and not forcing refresh
    if (!forceRefresh && cachedData && lastFetchTime && (now - lastFetchTime) < adaptiveDuration) {
      setTrainerData(cachedData.trainerData);
      setGroupedData(cachedData.groupedData);
      setExpandedPhases(cachedData.expandedPhases);
      setLoading(false);
      return;
    }
    
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
        // Helper function to calculate training days (matching InitiationModal logic)
        const getTrainingDays = (startDate, endDate, excludeDays = "None") => {
          if (!startDate || !endDate) return 0;
          const start = new Date(startDate);
          const end = new Date(endDate);
          if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
          
          let days = 0;
          const cur = new Date(start);
          while (cur <= end) {
            const dayOfWeek = cur.getDay(); // 0 = Sunday, 6 = Saturday
            let shouldInclude = true;
            
            if (excludeDays === "Saturday" && dayOfWeek === 6) {
              shouldInclude = false;
            } else if (excludeDays === "Sunday" && dayOfWeek === 0) {
              shouldInclude = false;
            } else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) {
              shouldInclude = false;
            }
            // If excludeDays === "None", include all days
            
            if (shouldInclude) days++;
            cur.setDate(cur.getDate() + 1);
          }
          return days;
        };

        const finalTrainer = {
          ...trainer,
          topics: Array.from(trainer.allTopics), // Convert Set to Array for topics
          // Calculate total allowances from all batches (per-day rate × number of training days)
          // For JD domain, take allowances only once (not summed across batches)
          totalFood: (trainer.domain === "JD") 
            ? ((trainer.allBatches[0]?.food || 0) * (trainer.allBatches[0]?.activeDates?.length || getTrainingDays(trainer.allBatches[0]?.startDate, trainer.allBatches[0]?.endDate)))
            : trainer.allBatches.reduce((sum, batch) => {
                const days = batch.activeDates?.length || getTrainingDays(batch.startDate, batch.endDate);
                return sum + ((batch.food || 0) * days);
              }, 0),
          totalLodging: (trainer.domain === "JD") 
            ? ((trainer.allBatches[0]?.lodging || 0) * (trainer.allBatches[0]?.activeDates?.length || getTrainingDays(trainer.allBatches[0]?.startDate, trainer.allBatches[0]?.endDate)))
            : trainer.allBatches.reduce((sum, batch) => {
                const days = batch.activeDates?.length || getTrainingDays(batch.startDate, batch.endDate);
                return sum + ((batch.lodging || 0) * days);
              }, 0),
          totalConveyance: (trainer.domain === "JD") 
            ? (trainer.allBatches[0]?.conveyance || 0) 
            : trainer.allBatches.reduce((sum, batch) => sum + (batch.conveyance || 0), 0),
          totalStudents: trainer.allBatches.reduce((sum, batch) => sum + (batch.batchPerStdCount || batch.stdCount || 0), 0),
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
      // Check invoice status for each trainer
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
                  limit(5) // Limit to recent invoices only
                )
              : query(
                  collection(db, "invoices"),
                  where("trainerId", "==", trainer.trainerId),
                  where("collegeName", "==", trainer.collegeName),
                  where("phase", "==", trainer.phase),
                  where("projectCode", "==", trainer.projectCode),
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

            const trainerWithInvoiceStatus = {
              ...trainer,
              hasExistingInvoice: totalInvoiceCount > 0,
              invoiceCount: totalInvoiceCount,
              invoiceStatus: invoiceStatus,
              invoiceData: latestInvoice, // Store full invoice data for remarks display
            };
            
            return trainerWithInvoiceStatus;
          } catch (trainerError) {
            console.error(`🚨 Error processing trainer ${trainer.trainerName}:`, trainerError);
            return {
              ...trainer,
              hasExistingInvoice: false,
              invoiceCount: 0,
              invoiceStatus: null,
              invoiceData: null,
            };
          }
        })
      );

      setTrainerData(updatedTrainersList);

      // 🔄 NEW: Group by college first, then by phase within each college
      const grouped = updatedTrainersList.reduce((acc, trainer) => {
        const collegeName = trainer.collegeName || "Unknown College";
        
        if (!acc[collegeName]) {
          acc[collegeName] = {};
        }
        
        if (!acc[collegeName][trainer.phase]) {
          acc[collegeName][trainer.phase] = [];
        }
        
        acc[collegeName][trainer.phase].push(trainer);
        return acc;
      }, {});

      setGroupedData(grouped);

      // Expand all colleges by default
      const initialExpandedState = {};
      Object.keys(grouped).forEach((college) => {
        initialExpandedState[college] = true;
        // Also expand all phases within each college
        Object.keys(grouped[college]).forEach((phase) => {
          initialExpandedState[`${college}_${phase}`] = true;
        });
      });
      setExpandedPhases(initialExpandedState);
      
      // 💾 CACHE: Store the results with timestamp in localStorage
      const cacheData = {
        trainerData: updatedTrainersList,
        groupedData: grouped,
        expandedPhases: initialExpandedState,
      };
      setCachedData(cacheData);
      setLastFetchTime(now);
      saveCacheToStorage(cacheData, now);
      
    } catch (error) {
      console.error('❌ Error fetching trainers:', error);
      // If fetch fails but we have cached data, use it
      if (!forceRefresh && cachedData) {
        setTrainerData(cachedData.trainerData);
        setGroupedData(cachedData.groupedData);
        setExpandedPhases(cachedData.expandedPhases);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lastFetchTime, cachedData, getAdaptiveCacheDuration]);

  // 🚀 OPTIMIZED: Check cache on mount, fetch if needed (with session tracking)
  useEffect(() => {
    // Track user visit for adaptive caching
    trackUserVisit();
    
    // Load lastFetchTime from localStorage immediately
    const storedLastFetch = localStorage.getItem('trainer_invoice_last_fetch');
    const storedCacheVersion = localStorage.getItem('trainer_invoice_cache_version');
    
    if (storedLastFetch && storedCacheVersion === CACHE_VERSION) {
      const parsedTime = parseInt(storedLastFetch);
      if (!isNaN(parsedTime)) {
        setLastFetchTime(parsedTime);
      }
    }
    
    // Force structure update first
    const now = Date.now();
    const adaptiveDuration = getAdaptiveCacheDuration();
    const isCacheValid = cachedData && lastFetchTime && (now - lastFetchTime) < adaptiveDuration;
    
    if (isCacheValid) {
      setTrainerData(cachedData.trainerData);
      setGroupedData(cachedData.groupedData);
      setExpandedPhases(cachedData.expandedPhases);
      setLoading(false);
      hasLoadedRef.current = true;
    } else {
      fetchTrainers().then(() => {
        hasLoadedRef.current = true;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - we only want this to run on mount

  const togglePhase = (phase) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phase]: !prev[phase],
    }));
  };

  const toggleAllColleges = () => {
    const colleges = Object.keys(filteredGroupedData);
    const allExpanded = colleges.every(college => expandedPhases[college]);
    
    const newExpandedState = {};
    colleges.forEach(college => {
      newExpandedState[college] = !allExpanded;
      // Also toggle all phases within each college
      Object.keys(filteredGroupedData[college]).forEach(phase => {
        newExpandedState[`${college}_${phase}`] = !allExpanded;
      });
    });
    
    setExpandedPhases(prev => ({
      ...prev,
      ...newExpandedState
    }));
  };

  const handleGenerateInvoice = useCallback((trainer) => {
    // 🆕 UNDO: Store the trainer's current state before generating invoice
    const trainerSnapshot = {
      trainerId: trainer.trainerId,
      collegeName: trainer.collegeName,
      phase: trainer.phase,
      hasExistingInvoice: trainer.hasExistingInvoice,
      invoiceCount: trainer.invoiceCount,
      invoiceStatus: trainer.invoiceStatus,
      timestamp: Date.now()
    };
    
    // Store in localStorage for persistence across page refreshes
    try {
      const existingSnapshots = JSON.parse(localStorage.getItem('invoice_generation_snapshots') || '[]');
      existingSnapshots.push(trainerSnapshot);
      // Keep only last 10 snapshots to avoid storage bloat
      if (existingSnapshots.length > 10) {
        existingSnapshots.shift();
      }
      localStorage.setItem('invoice_generation_snapshots', JSON.stringify(existingSnapshots));
    } catch (error) {
      console.warn('Failed to store trainer snapshot:', error);
    }
    
    setSelectedTrainer(trainer);
    setShowInvoiceModal(true);
  }, []);

  // 🎯 NEW: Handle invoice generation completion with forced refresh
  const handleInvoiceGenerated = useCallback(async () => {
    
    // Move all heavy operations to background to allow immediate modal closing
    setTimeout(async () => {
      // Clear all cache to ensure fresh data
      clearCacheFromStorage();
      setCachedData(null);
      setLastFetchTime(null);
      
      // Add a longer delay to ensure database consistency and indexing
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increased to 2 seconds
      
      await fetchTrainers(true); // Force refresh to show updated invoice status
      
    }, 0); // Execute immediately in next tick, but asynchronously
  }, [fetchTrainers]);

  // 🔄 ENHANCED: Manual refresh with cache invalidation and visual feedback
  const handleRefreshData = () => {
    clearCacheFromStorage(); // Clear localStorage cache
    setCachedData(null); // Clear state cache
    setLastFetchTime(null);
    localStorage.setItem('trainer_invoice_cache_version', CACHE_VERSION); // Ensure version is set
    fetchTrainers(true); // Force refresh
  };
  
  // 💡 NEW: Function to check cache status for UI indicators
  const getCacheStatus = useCallback(() => {
    if (!lastFetchTime) return { status: 'never', message: 'Never loaded', isExpired: false };
    
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    const minutesAgo = Math.floor(timeSinceLastFetch / (1000 * 60));
    const adaptiveDuration = getAdaptiveCacheDuration();
    const isExtended = adaptiveDuration > CACHE_DURATION;
    
    if (timeSinceLastFetch < adaptiveDuration) {
      return { 
        status: 'fresh', 
        message: `Cached ${minutesAgo === 0 ? 'just now' : `${minutesAgo}m ago`}${isExtended ? ' (extended)' : ''}`,
        isExpired: false
      };
    } else {
      return { 
        status: 'expired', 
        message: `Cache expired (${minutesAgo}m old)`,
        isExpired: true
      };
    }
  }, [lastFetchTime, getAdaptiveCacheDuration, CACHE_DURATION]);




  useEffect(() => {
    const cleanupOldSessionData = () => {
      try {
        const lastActivity = localStorage.getItem('trainer_invoice_last_activity');
        const now = Date.now();
        
        // If no activity for 1 hour, clear session data
        if (lastActivity && (now - parseInt(lastActivity)) > (60 * 60 * 1000)) {
          localStorage.removeItem('trainer_invoice_session_visits');
        }
        
        // Update last activity
        localStorage.setItem('trainer_invoice_last_activity', now.toString());
      } catch {
        // Ignore storage errors
      }
    };
    
    cleanupOldSessionData();
    
    // Optional: Clean up on page unload
    const handleBeforeUnload = () => {
      // Uncomment if you want to clear cache when user closes tab
      // clearCacheFromStorage();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
  };

  // Filter and search logic
  // 🔄 NEW: Filter data with college-first structure - MEMOIZED for performance
  const filteredGroupedData = useMemo(() => {
    return Object.keys(groupedData).reduce((acc, college) => {
      const collegePhases = {};
      
      Object.keys(groupedData[college]).forEach((phase) => {
        const filteredTrainers = groupedData[college][phase].filter((trainer) => {
          // compute invoice availability
          const invoiceAvailable = trainer.latestEndDate
            ? Date.now() >=
              new Date(trainer.latestEndDate).getTime() + 24 * 60 * 60 * 1000
            : false;

          // when showOnlyActive is true, only include trainers that either already have an invoice or are available
          if (invoiceFilter === 'active' && !trainer.hasExistingInvoice && !invoiceAvailable) {
            return false;
          }
          if (invoiceFilter === 'generated' && !trainer.hasExistingInvoice) {
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
          collegePhases[phase] = filteredTrainers;
        }
      });

      if (Object.keys(collegePhases).length > 0) {
        acc[college] = collegePhases;
      }

      return acc;
    }, {});
  }, [groupedData, invoiceFilter, searchTerm, startDateFilter, endDateFilter, projectCodeFilter, businessNameFilter]);

  // Get unique project codes for filter - MEMOIZED
  const projectCodes = useMemo(() => [
    ...new Set(trainerData.map((item) => item.projectCode)),
  ].filter(Boolean), [trainerData]);

  // Get unique college names for filter - MEMOIZED
  const businessNames = useMemo(() => [
    ...new Set(trainerData.map((item) => item.businessName)),
  ].filter(Boolean), [trainerData]);

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

  // Check if any filters are active (for badge on Filters button) - MEMOIZED
  const isAnyFilterActive = useMemo(() =>
    startDateFilter || endDateFilter || projectCodeFilter || businessNameFilter,
    [startDateFilter, endDateFilter, projectCodeFilter, businessNameFilter]
  );

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

  const handleDownloadInvoice = useCallback(async (trainer) => {
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
              setToast({ type: 'error', message: "Invalid invoice number selected" });
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
        setToast({ type: 'warning', message: "No invoice found for this trainer" });
        setPdfStatus((prev) => ({
          ...prev,
          [statusKey]: "not_found",
        }));
      }
    } catch (error) {
      console.error('❌ Download invoice error:', error);
      setToast({ type: 'error', message: "Failed to download invoice. Please try again." });
      setPdfStatus((prev) => ({
        ...prev,
        [statusKey]: "error",
      }));
    } finally {
      setDownloadingInvoice(null);
    }
  }, []);  // Function to handle editing an invoice
  const handleEditInvoice = useCallback(async (trainer) => {
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
              setToast({ type: 'error', message: "Invalid invoice number selected" });
            }
          }
        } else {
          // Single invoice - edit it directly
          setSelectedTrainer(trainer);
          setShowInvoiceModal(true);
        }
      } else {
        setToast({ type: 'warning', message: "No invoice found for this trainer" });
      }
    } catch {
      setToast({ type: 'error', message: "Failed to find invoice. Please try again." });
    }
  }, []);

  // Handle invoice approval (sets invoice=true and status=approved for HR review)
  const handleApproveInvoice = useCallback(async (trainer) => {
    try {
      // Find the invoice document
      const q = query(
        collection(db, "invoices"),
        where("trainerId", "==", trainer.trainerId),
        where("collegeName", "==", trainer.collegeName),
        where("phase", "==", trainer.phase)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const invoiceDoc = querySnapshot.docs[0];
        const invoiceRef = doc(db, "invoices", invoiceDoc.id);
        
        // Update invoice to pending status and make it available for HR review
        await updateDoc(invoiceRef, {
          status: "pending",
          invoice: true, // This makes it visible to HR
          approvedDate: new Date().toISOString().split("T")[0],
          approvedBy: "Learning Department",
          updatedAt: new Date()
        });

        // Clear cache and refresh data
        clearCacheFromStorage();
        setCachedData(null);
        setLastFetchTime(null);
        await fetchTrainers(true); // Force refresh
        
        setToast({ type: 'success', message: `Invoice approved and sent to HR for review` });
      } else {
        setToast({ type: 'error', message: "Invoice not found" });
      }
    } catch (error) {
      console.error('Error approving invoice:', error);
      setToast({ type: 'error', message: "Failed to approve invoice" });
    }
  }, [fetchTrainers]);

  return (
    <div className="min-h-screen bg-gray-50">
      {loading ? (
        <TrainerInvoiceSkeleton />
      ) : (
        <div className="mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <Header />
          
          {/* 🎯 SIMPLIFIED: Clean status with refresh button focus */}
          {!loading && lastFetchTime && (
            <div className="px-4 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${
                    getCacheStatus().isExpired ? 'text-amber-700' : 'text-green-700'
                  }`}>
                    {getCacheStatus().isExpired ? '⚠️ Data may be outdated' : '✅ Data is current'}
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
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all shadow-sm ${
                    refreshing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : getCacheStatus().isExpired
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  <FiRefreshCw className={`${refreshing ? 'animate-spin' : ''} text-xs`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
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
            showOnlyActive={invoiceFilter}
            setShowOnlyActive={setInvoiceFilter}
            exporting={exporting}
            setExporting={setExporting}
            filteredGroupedData={filteredGroupedData}
            expandedPhases={expandedPhases}
            toggleAllColleges={toggleAllColleges}
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
                handleApproveInvoice={handleApproveInvoice}
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
          onInvoiceGenerated={handleInvoiceGenerated}
          onToast={setToast}
        />
      )}
      
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
              {toast.type === 'success' && <FiCheckCircle className="text-green-600" />}
              {toast.type === 'error' && <FiXCircle className="text-red-600" />}
              {toast.type === 'warning' && <FiAlertCircle className="text-amber-600" />}
              <span>{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GenerateTrainerInvoice;
