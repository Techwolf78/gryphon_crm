import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, where, orderBy, limit, updateDoc, doc, getDoc, deleteDoc } from "firebase/firestore";
import InvoiceModal from "./InvoiceModal";
import EditInvoiceModal from "./Invoice/EditInvoiceModal";
import { generateInvoicePDF } from "./invoiceUtils";
import { FiSearch, FiFilter, FiRefreshCw, FiTrash2, FiUser, FiCheckCircle, FiAlertCircle, FiXCircle, FiInfo, FiClock } from "react-icons/fi";
import Header from "./Invoice/Header";
import FiltersSection from "./Invoice/FiltersSection";
import EmptyState from "./Invoice/EmptyState";
import TrainerInvoiceSkeleton from "./Invoice/TrainerInvoiceSkeleton";
import TrainerTable from "./Invoice/TrainerTable";
import { logInvoiceAction, AUDIT_ACTIONS } from "../../utils/trainerInvoiceAuditLogger";

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [expandedPhases, setExpandedPhases] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [projectCodeFilter, setProjectCodeFilter] = useState("");
  const [businessNameFilter, setBusinessNameFilter] = useState("");
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);
  const [pdfStatus, setPdfStatus] = useState({});
  const [invoiceFilter, setInvoiceFilter] = useState('active');
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
    } catch {
      // console.warn('⚠️ Failed to save cache to localStorage');
    }
  };
  
  const clearCacheFromStorage = () => {
    try {
      localStorage.removeItem('trainer_invoice_cache');
      localStorage.removeItem('trainer_invoice_last_fetch');
      localStorage.removeItem('trainer_invoice_cache_version'); // 🆕 Clear version too
    } catch {
      // console.warn('⚠️ Failed to clear cache from localStorage');
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
                  // Special handling for JD domain dates
                  let startDate = "";
                  let endDate = "";
                  
                  if (domainData.domain === "JD") {
                    // For JD trainings, try multiple possible field names
                    startDate = trainer.startDate || trainer.StartDate || trainer.start_date || trainer.Start_Date || trainer.activeDates?.[0] || "";
                    endDate = trainer.endDate || trainer.EndDate || trainer.end_date || trainer.End_Date || trainer.activeDates?.slice(-1)[0] || "";
                    
                    // If still no dates, try to get from batch or domain level
                    if (!startDate) startDate = b.startDate || b.StartDate || batch.startDate || batch.StartDate || "";
                    if (!endDate) endDate = b.endDate || b.EndDate || batch.endDate || batch.EndDate || "";
                  } else {
                    // Regular domain date extraction
                    startDate = trainer.startDate || domainData.trainingStartDate || trainer.activeDates?.[0] || "";
                    endDate = trainer.endDate || domainData.trainingEndDate || trainer.activeDates?.slice(-1)[0] || "";
                  }

                  // Generate activeDates if we have start/end dates but no activeDates (especially for JD)
                  let activeDates = trainer.activeDates || [];
                  if (!activeDates.length && startDate && endDate) {
                    try {
                      const start = new Date(startDate);
                      const end = new Date(endDate);
                      const excludeDays = _phaseData.excludeDays || "None";
                      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                        activeDates = [];
                        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                          const dayOfWeek = d.getDay();
                          let shouldInclude = true;
                          if (excludeDays === "Saturday" && dayOfWeek === 6) shouldInclude = false;
                          else if (excludeDays === "Sunday" && dayOfWeek === 0) shouldInclude = false;
                          else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) shouldInclude = false;
                          if (shouldInclude) activeDates.push(d.toISOString().split('T')[0]);
                        }
                      }
                    } catch {
                      // console.warn('Failed to generate activeDates for trainer:', trainer.trainerName);
                    }
                  }

                  // Convert Firestore timestamps to date strings if needed
                  if (activeDates.length > 0 && typeof activeDates[0] === 'object' && activeDates[0]?.toDate) {
                    activeDates = activeDates.map(ts => ts.toDate().toISOString().split('T')[0]);
                  }

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
                    collegeName: formData.collegeName || (formData.businessName || "").split('/')[0]?.trim() || "Unknown College",
                    startDate,
                    endDate,
                    topics: Array.from(allTopics), // All aggregated topics
                    batches: batch.batches || [],
                    mergedBreakdown: trainer.mergedBreakdown || [],
                    activeDates,
                    assignedHours: parseFloat(trainer.assignedHours) || 0,
                    perHourCost: parseFloat(trainer.perHourCost) || 0,
                    dailyHours: trainer.dailyHours || [],
                    dayDuration: trainer.dayDuration || "",
                    stdCount: trainer.stdCount || 0,
                    hrs: trainer.hrs || 0,
                    conveyance: parseFloat(trainer.conveyance) || 0,
                    food: parseFloat(trainer.food) || 0,
                    lodging: parseFloat(trainer.lodging) || 0,
                    excludeDays: _phaseData.excludeDays || "None",
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

      // 🔍 ENHANCE: Fetch trainer names from trainers collection to ensure correct names
      const trainerIds = [...new Set(trainersList.map(t => t.trainerId).filter(id => id))];
      const trainerNamesMap = new Map();
      const missingTrainers = new Set();

      if (trainerIds.length > 0) {
        // Batch fetch trainer details
        const trainerPromises = trainerIds.map(async (trainerId) => {
          try {
            const trainerRef = doc(db, "trainers", trainerId);
            const trainerSnap = await getDoc(trainerRef);
            if (trainerSnap.exists()) {
              const data = trainerSnap.data();
              const correctName = data.name || data.trainerName || data.displayName;
              if (correctName) {
                trainerNamesMap.set(trainerId, correctName);
              }
            } else {
              missingTrainers.add(trainerId);
            }
          } catch {
            // console.warn(`Failed to fetch trainer ${trainerId}`);
            missingTrainers.add(trainerId);
          }
        });

        await Promise.all(trainerPromises);
      }

      // Update trainer names in trainersList
      trainersList.forEach(trainer => {
        if (trainer.trainerId && trainerNamesMap.has(trainer.trainerId)) {
          // Use the correct name from database
          const dbName = trainerNamesMap.get(trainer.trainerId);
          // Check if the name from database looks valid
          if (dbName && dbName.length >= 3 && !dbName.includes("excel") && !dbName.includes("traienr") && !dbName.includes("N/A")) {
            trainer.trainerName = dbName;
          } else {
            // Database has invalid name, mark as not found
            trainer.trainerName = `Trainer ${trainer.trainerId} (Invalid Data)`;
          }
        } else if (trainer.trainerId && missingTrainers.has(trainer.trainerId)) {
          // Trainer not found in database
          trainer.trainerName = `Trainer ${trainer.trainerId} (Not Found)`;
        } else {
          // Fallback: check if current name looks corrupted
          const currentName = trainer.trainerName || "";
          if (currentName.length < 3 || currentName.includes("excel") || currentName.includes("traienr") || currentName === "N/A") {
            trainer.trainerName = `Trainer ${trainer.trainerId || 'Unknown'} (Data Issue)`;
          }
        }
      });

      // Enhanced grouping by college, trainer, phase AND payment cycle
      const collegePhaseBasedGrouping = {};

      // Helper function to determine payment cycle for a date
      const getPaymentCycle = (dateStr) => {
        if (!dateStr) return 'unknown';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // 01-12
        const day = date.getDate();
        const cycle = day <= 15 ? '1-15' : '16-31';
        return `${year}-${month}-${cycle}`;
      };

      // Helper function to get unique payment cycles for trainer assignments
      const getPaymentCyclesForTrainer = (trainer) => {
        const cycles = new Set();

        // Check activeDates if available (more precise)
        if (trainer.activeDates && trainer.activeDates.length > 0) {
          trainer.activeDates.forEach(dateStr => {
            cycles.add(getPaymentCycle(dateStr));
          });
        } else if (trainer.startDate && trainer.endDate) {
          // Fallback: check trainer's date range
          // If training spans multiple months or crosses payment cycle boundaries
          const startCycle = getPaymentCycle(trainer.startDate);
          const endCycle = getPaymentCycle(trainer.endDate);

          cycles.add(startCycle);
          if (startCycle !== endCycle) {
            cycles.add(endCycle);
          }
        }

        return Array.from(cycles).sort();
      };

      trainersList.forEach((trainer) => {
          const collegeName = trainer.collegeName;
          
        // Get payment cycles for this trainer
        const paymentCycles = getPaymentCyclesForTrainer(trainer);
        
        // For each payment cycle, create separate grouping entries
        paymentCycles.forEach(cycle => {
          // For merged JD trainings, group by the merged colleges instead of individual college
         let baseGroupingKey;
  if (trainer.isMergedTraining && trainer.domain === "JD") {
    // Sort merged colleges to ensure consistent key regardless of order
    const sortedColleges = trainer.mergedColleges
      .map(c => c.collegeName || c)
      .sort()
      .join('_');
    baseGroupingKey = `merged_jd_${sortedColleges}_${trainer.trainerId.trim()}_${trainer.phase.trim().toLowerCase()}`;
  } else {
    // Original logic for non-merged trainings
    const isJDDomain = trainer.domain === "JD";
    baseGroupingKey = isJDDomain
      ? `${collegeName.trim().toLowerCase()}_${trainer.trainerId.trim()}_${trainer.phase.trim().toLowerCase()}`
      : `${collegeName.trim().toLowerCase()}_${trainer.trainerId.trim()}_${trainer.phase.trim().toLowerCase()}_${trainer.projectCode.trim()}`;
  }

          // Add payment cycle to the grouping key
          const groupingKey = `${baseGroupingKey}_cycle_${cycle}`;

          // Filter assignments for this payment cycle
          let cycleAssignments = [];
          let hasValidDatesForCycle = false;

          if (trainer.activeDates && trainer.activeDates.length > 0) {
            // Use activeDates for precise filtering
            cycleAssignments = trainer.activeDates.filter(dateStr => getPaymentCycle(dateStr) === cycle).sort();
            hasValidDatesForCycle = cycleAssignments.length > 0;
          } else if (trainer.startDate && trainer.endDate) {
            // Fallback: check if the date range intersects with this cycle
            const startDate = new Date(trainer.startDate);
            const endDate = new Date(trainer.endDate);

            // Parse cycle format: "2025-12-1-15" -> startDay=1, endDay=15
            const cycleParts = cycle.split('-');
            const cycleStart = parseInt(cycleParts[2]); // 1 or 16
            const cycleEnd = parseInt(cycleParts[3]); // 15 or 31

            // Check if the training period overlaps with this payment cycle
            const trainingStartDay = startDate.getDate();
            const trainingEndDay = endDate.getDate();
            const trainingMonth = startDate.getMonth();
            const endMonth = endDate.getMonth();

            // Simple overlap check - if training spans the cycle boundary
            hasValidDatesForCycle = (trainingStartDay <= cycleEnd && trainingEndDay >= cycleStart) ||
                                   (trainingMonth !== endMonth); // Cross-month training

            if (hasValidDatesForCycle) {
              cycleAssignments = [trainer]; // Include the whole trainer for this cycle
            }
          }

          if (!hasValidDatesForCycle) return; // Skip this cycle if no valid dates

          if (!collegePhaseBasedGrouping[groupingKey]) {
            collegePhaseBasedGrouping[groupingKey] = {
              ...trainer,
              paymentCycle: cycle,
              totalCollegeHours: 0, // Will calculate below
              allBatches: [],
              earliestStartDate: null,
              latestEndDate: null,
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
          }

          // Calculate hours and dates for this cycle
          let cycleHours = 0;
          let cycleStartDate = null;
          let cycleEndDate = null;

          if (trainer.activeDates && trainer.activeDates.length > 0) {
            // FIXED: Count working days (excluding weekends) for proper hour allocation
            const workingDaysInCycle = cycleAssignments.filter(dateStr => {
              const date = new Date(dateStr);
              const dayOfWeek = date.getDay();
              return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
            }).length;
            
            const totalWorkingDays = trainer.activeDates.filter(dateStr => {
              const date = new Date(dateStr);
              const dayOfWeek = date.getDay();
              return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
            }).length;
            
            // Allocate hours proportionally based on working days in each cycle
            cycleHours = totalWorkingDays > 0 ? (workingDaysInCycle / totalWorkingDays) * trainer.assignedHours : 0;
            
            if (cycleAssignments.length > 0) {
              cycleStartDate = cycleAssignments[0];
              cycleEndDate = cycleAssignments[cycleAssignments.length - 1];
            }
          } else {
            // Fallback: split the trainer's total hours and date range proportionally
            const totalCycles = paymentCycles.length;
            cycleHours = trainer.assignedHours / totalCycles;

            // For date range, use the full training period for each cycle
            cycleStartDate = trainer.startDate;
            cycleEndDate = trainer.endDate;
          }

          // Add hours from this batch to total
          collegePhaseBasedGrouping[groupingKey].totalCollegeHours += cycleHours;
          
          // Update the grouping object's dates to cycle-specific dates
          collegePhaseBasedGrouping[groupingKey].startDate = cycleStartDate || trainer.startDate;
          collegePhaseBasedGrouping[groupingKey].endDate = cycleEndDate || trainer.endDate;
          
          // Create a cycle-specific trainer object
          const cycleTrainer = {
            ...trainer,
            assignedHours: cycleHours,
            startDate: cycleStartDate || trainer.startDate,
            endDate: cycleEndDate || trainer.endDate,
            activeDates: trainer.activeDates?.filter(dateStr => getPaymentCycle(dateStr) === cycle) || [],
            dailyHours: trainer.dailyHours?.slice(0, cycleAssignments.length) || [],
          };
          
          collegePhaseBasedGrouping[groupingKey].allBatches.push(cycleTrainer);

          // Update dates to show the cycle range
          if (!collegePhaseBasedGrouping[groupingKey].earliestStartDate || 
              new Date(cycleStartDate || trainer.startDate) < new Date(collegePhaseBasedGrouping[groupingKey].earliestStartDate)) {
            collegePhaseBasedGrouping[groupingKey].earliestStartDate = cycleStartDate || trainer.startDate;
          }
          if (!collegePhaseBasedGrouping[groupingKey].latestEndDate || 
              new Date(cycleEndDate || trainer.endDate) > new Date(collegePhaseBasedGrouping[groupingKey].latestEndDate)) {
            collegePhaseBasedGrouping[groupingKey].latestEndDate = cycleEndDate || trainer.endDate;
          }

          // Add unique projects and domains
          if (!collegePhaseBasedGrouping[groupingKey].allProjects.includes(trainer.projectCode)) {
            collegePhaseBasedGrouping[groupingKey].allProjects.push(trainer.projectCode);
          }

          if (!collegePhaseBasedGrouping[groupingKey].allDomains.includes(trainer.domain)) {
            collegePhaseBasedGrouping[groupingKey].allDomains.push(trainer.domain);
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
        });
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
          assignedHours: trainer.totalCollegeHours, // Use cycle-specific hours
          topics: Array.from(trainer.allTopics), // Convert Set to Array for topics
          // Calculate total allowances from all batches (per-day rate × number of training days)
          // For JD domain, take allowances only once (not summed across batches)
          totalFood: (trainer.domain === "JD") 
            ? ((trainer.allBatches[0]?.food || 0) * (trainer.allBatches[0]?.activeDates?.length || getTrainingDays(trainer.allBatches[0]?.startDate, trainer.allBatches[0]?.endDate, trainer.excludeDays)))
            : trainer.allBatches.reduce((sum, batch) => {
                const days = batch.activeDates?.length || getTrainingDays(batch.startDate, batch.endDate, trainer.excludeDays);
                return sum + ((batch.food || 0) * days);
              }, 0),
          totalLodging: (trainer.domain === "JD") 
            ? ((trainer.allBatches[0]?.lodging || 0) * (trainer.allBatches[0]?.activeDates?.length || getTrainingDays(trainer.allBatches[0]?.startDate, trainer.allBatches[0]?.endDate, trainer.excludeDays)))
            : trainer.allBatches.reduce((sum, batch) => {
                const days = batch.activeDates?.length || getTrainingDays(batch.startDate, batch.endDate, trainer.excludeDays);
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

      // 🔥 OPTIMIZED: Single bulk invoice query to reduce Firebase reads
      // Get all invoices at once instead of individual queries per trainer
      const allInvoicesQuery = query(collection(db, "invoices"));
      const allInvoicesSnap = await getDocs(allInvoicesQuery);

      // Create a map of trainer keys to invoice data for fast lookup
      const invoiceMap = new Map();
      allInvoicesSnap.docs.forEach(doc => {
        const data = doc.data();
        // Create key matching the trainer lookup logic
        const key = `${data.trainerId}_${data.collegeName}_${data.phase}_${data.paymentCycle || 'unknown'}`;
        if (!invoiceMap.has(key)) {
          invoiceMap.set(key, []);
        }
        invoiceMap.get(key).push(data);
      });

      // Now check invoice status for each trainer using the map
      const updatedTrainersList = collegePhaseBasedTrainers.map((trainer) => {
        try {
          // Use the same key as used in invoice queries
          const key = `${trainer.trainerId}_${trainer.collegeName}_${trainer.phase}_${trainer.paymentCycle || 'unknown'}`;

          const trainerInvoices = invoiceMap.get(key) || [];
          const totalInvoiceCount = trainerInvoices.length;

          let latestInvoice = null;
          let invoiceStatus = null;

          if (totalInvoiceCount > 0) {
            // Find the most recent invoice (assuming they're ordered by creation, take first)
            latestInvoice = trainerInvoices[0];
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
        } catch {
          // console.error(`🚨 Error processing trainer ${trainer.trainerName}`);
          return {
            ...trainer,
            hasExistingInvoice: false,
            invoiceCount: 0,
            invoiceStatus: null,
            invoiceData: null,
          };
        }
      });

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
      
    } catch {
      // console.error('❌ Error fetching trainers');
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
    // console.log('🚀 HANDLE GENERATE INVOICE called for trainer:', trainer?.trainerName, 'ID:', trainer?.trainerId, 'Cycle:', trainer?.paymentCycle);
    setSelectedTrainer(trainer);
    setModalMode('edit');
    setShowInvoiceModal(true);
  }, []);

  const handleViewInvoice = useCallback(async (trainer) => {
    const datesInfo = trainer?.activeDates 
      ? `Dates: ${trainer.activeDates.length} days (${trainer.earliestStartDate || 'N/A'} to ${trainer.latestEndDate || 'N/A'})`
      : `Date range: ${trainer?.earliestStartDate || 'N/A'} to ${trainer?.latestEndDate || 'N/A'}`;
    
    // console.log('👁️ HANDLE VIEW INVOICE called for trainer:', trainer?.trainerName, 'ID:', trainer?.trainerId, 'Cycle:', trainer?.paymentCycle, '|', datesInfo);

    // Log the view action
    await logInvoiceAction(AUDIT_ACTIONS.VIEW, trainer, {
      viewSource: 'dashboard',
      datesInfo
    });

    setSelectedTrainer(trainer);
    setModalMode('view');
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

      // First, try to use cached invoice data from trainer object
      if (trainer.invoiceData) {
        allInvoices = [{ id: 'cached', ...trainer.invoiceData }];
      }

      // If no cached data or we need to check for multiple invoices, do a targeted query
      if (allInvoices.length === 0 || trainer.invoiceCount > 1) {
        const q = query(
          collection(db, "invoices"),
          where("trainerId", "==", trainer.trainerId),
          where("collegeName", "==", trainer.collegeName),
          where("phase", "==", trainer.phase)
        );

        const querySnapshot = await getDocs(q);
        allInvoices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    } catch {
      // console.error('❌ Download invoice error');
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
    setSelectedTrainer(trainer);
    setShowEditModal(true);
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
        const invoiceData = invoiceDoc.data();
        
        // Update invoice to pending status and make it available for HR review
        await updateDoc(invoiceRef, {
          status: "pending",
          invoice: true, // This makes it visible to HR
          approvedDate: new Date().toISOString().split("T")[0],
          approvedBy: "Learning Department",
          updatedAt: new Date()
        });

        // Log the approval action
        await logInvoiceAction(AUDIT_ACTIONS.APPROVE, {
          ...trainer,
          ...invoiceData,
          invoiceId: invoiceDoc.id
        }, {
          approvalReason: "Approved by Learning Department for HR review",
          previousStatus: invoiceData.status,
          newStatus: "pending"
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
    } catch {
      // console.error('Error approving invoice');
      setToast({ type: 'error', message: "Failed to approve invoice" });
    }
  }, [fetchTrainers]);

  // Handle invoice deletion (for old combined invoices that need to be split)
  const handleDeleteInvoice = useCallback(async (trainer) => {
    // console.log('🗑️ HANDLE DELETE INVOICE called for trainer:', trainer?.trainerName, 'ID:', trainer?.trainerId, 'Cycle:', trainer?.paymentCycle);
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the invoice for ${trainer.trainerName} (${trainer.paymentCycle} cycle)?\n\nThis action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      // Find and delete the invoice document
      // console.log('🔍 QUERYING for invoice deletion - trainerId:', trainer.trainerId, 'collegeName:', trainer.collegeName, 'phase:', trainer.phase, 'paymentCycle:', trainer.paymentCycle);
      
      const q = query(
        collection(db, "invoices"),
        where("trainerId", "==", trainer.trainerId),
        where("collegeName", "==", trainer.collegeName),
        where("phase", "==", trainer.phase),
        where("paymentCycle", "==", trainer.paymentCycle)
      );

      const querySnapshot = await getDocs(q);
      // console.log('📋 Query results:', querySnapshot.size, 'documents found');

      if (!querySnapshot.empty) {
        const invoiceDoc = querySnapshot.docs[0];
        const invoiceRef = doc(db, "invoices", invoiceDoc.id);
        const invoiceData = invoiceDoc.data();
        // console.log('🗑️ DELETING invoice document ID:', invoiceDoc.id);

        // Log the deletion action before deleting
        await logInvoiceAction(AUDIT_ACTIONS.DELETE, {
          ...trainer,
          ...invoiceData,
          invoiceId: invoiceDoc.id
        }, {
          deleteReason: "Deleted to allow separate invoices per payment cycle",
          deletedData: invoiceData
        });

        await deleteDoc(invoiceRef);

        // Clear cache and refresh data
        clearCacheFromStorage();
        setCachedData(null);
        setLastFetchTime(null);
        await fetchTrainers(true); // Force refresh

        setToast({ type: 'success', message: `Invoice deleted successfully. You can now generate separate invoices for each payment cycle.` });
      } else {
        setToast({ type: 'error', message: "Invoice not found" });
      }
    } catch {
      // console.error('Error deleting invoice');
      setToast({ type: 'error', message: "Failed to delete invoice" });
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
            <div className="px-4 py-1 bg-linear-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
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
                
                <div className="flex items-center gap-2">
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
                handleViewInvoice={handleViewInvoice}
                handleDeleteInvoice={handleDeleteInvoice}
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
          initialMode={modalMode}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedTrainer(null);
          }}
          onInvoiceGenerated={handleInvoiceGenerated}
          onToast={setToast}
        />
      )}
      {showEditModal && selectedTrainer && (
        <EditInvoiceModal
          trainer={selectedTrainer}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTrainer(null);
          }}
          onInvoiceUpdated={handleInvoiceGenerated}
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
