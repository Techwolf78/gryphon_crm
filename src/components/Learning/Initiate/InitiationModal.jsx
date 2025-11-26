import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { db } from "../../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  getDocs,
  collection as fbCollection,
  collection,
  onSnapshot,
  writeBatch,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";
import { auditLogTrainingOperations } from "../../../utils/learningAuditLogger";
import {
  FiChevronLeft,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiAlertTriangle,
  FiX,
  FiChevronDown,
} from "react-icons/fi";
import BatchDetailsTable from "./BatchDetailsTable";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "rc-time-picker/assets/index.css";
import TrainingConfiguration from './TrainingConfiguration';
import SubmissionChecklist from './SubmissionChecklist';

const PHASE_OPTIONS = ["phase-1", "phase-2", "phase-3"];
const DOMAIN_OPTIONS = ["Technical", "Soft skills", "Aptitude", "Tools (Excel - Power BI)", "Tools (Looker Studio)"];

// Add a color for each domain for visual clarity
const DOMAIN_COLORS = {
  Technical: "border-blue-400 bg-blue-50",
  "Soft skills": "border-green-400 bg-green-50",
  Aptitude: "border-purple-400 bg-purple-50",
  Tools: "border-yellow-400 bg-yellow-50",
  "Tools (Excel - Power BI)": "border-orange-400 bg-orange-50",
  "Tools (Looker Studio)": "border-red-400 bg-red-50",
};

function InitiationModal({ training, onClose, onConfirm }) {
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // MULTI-DOMAIN SUPPORT
  const [selectedDomains, setSelectedDomains] = useState([]); // Multiple domains
  const [table1DataByDomain, setTable1DataByDomain] = useState({}); // { domain: table1Data }

  const [topics, setTopics] = useState([]);
  const [courses, setCourses] = useState([]);
  const [currentPhase, setCurrentPhase] = useState("");
  const [commonFields, setCommonFields] = useState({
    trainingStartDate: null,
    trainingEndDate: null,
    collegeStartTime: "",
    collegeEndTime: "",
    lunchStartTime: "",
    lunchEndTime: "",
  });
  const [phase2Dates, setPhase2Dates] = useState({
    startDate: null,
    endDate: null,
  });
  const [phase3Dates, setPhase3Dates] = useState({
    startDate: "",
    endDate: "",
  });
  const [customPhaseHours, setCustomPhaseHours] = useState({
    "phase-1": "",
    "phase-2": "",
    "phase-3": "",
  });
  const [zeroHourDomains, setZeroHourDomains] = useState([]);
  const [showZeroHourWarning, setShowZeroHourWarning] = useState(false);
  const [deselectingZeroDomains, setDeselectingZeroDomains] = useState(false);
  // totalTrainingHours removed (was used only for allocation)
  const [canMergeBatches, setCanMergeBatches] = useState(false);

  // Validation state for duplicate trainers
  const [validationByDomain, setValidationByDomain] = useState({});
  // completedPhases state removed because it's not used
  const [globalTrainerAssignments, setGlobalTrainerAssignments] = useState([]);

  const [submitDisabled, setSubmitDisabled] = useState(false);

  const { user } = useAuth();

  // Checklist completion state
  const [isChecklistComplete, setIsChecklistComplete] = useState(false);

  // Global toggle for excluding days
  const [excludeDays, setExcludeDays] = useState("None");
  const [excludeDropdownOpen, setExcludeDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);

  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState(null);
  const [domainsToDelete, setDomainsToDelete] = useState([]); // Domains marked for deletion via X button

  // Original data state to preserve original values for undo functionality
  const originalTable1DataByDomain = useRef({});
  const originalTopics = useRef([]);
  const originalCustomPhaseHours = useRef({});
  const originalSelectedDomains = useRef([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Helper to generate date list, respecting excludeDays
  const getDateList = useCallback((start, end) => {
    if (!start || !end) return [];
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return [];
    const out = [];
    const cur = new Date(s);
    while (cur <= e) {
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
      
      if (shouldInclude) {
        out.push(cur.toISOString().slice(0, 10));
      }
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [excludeDays]);

  // Helper to calculate training days
  const getTrainingDays = (startDate, endDate) => {
    return getDateList(startDate, endDate).length;
  };

  const normalizeDate = (d) => {
    if (!d) return null;
    if (typeof d === "string") return d;
    if (d?.toDate) return d.toDate().toISOString().slice(0, 10);
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return null;
      return dt.toISOString().slice(0, 10);
    } catch {
      return null;
    }
  };

  // Get domain hours - use custom hours if set, otherwise default from database
  const getDomainHours = useCallback(
    (domain, phase = null) => {
      if (phase && customPhaseHours[phase] && customPhaseHours[phase] !== "") {
        return Number(customPhaseHours[phase]);
      }
      if (!domain) return 0;

      // Support for Tools subdomains:
      // - If domain is "Tools (Excel - Power BI)" or "Tools (Looker Studio)"
      //   -> return hours for the specific topic only.
      if (domain === "Tools (Excel - Power BI)") {
        const t = topics?.find(
          (x) => x?.topic?.trim()?.toLowerCase() === "Excel - Power BI".toLowerCase()
        );
        return Number(t?.hours || 0);
      }
      if (domain === "Tools (Looker Studio)") {
        const t = topics?.find(
          (x) => x?.topic?.trim()?.toLowerCase() === "Looker Studio".toLowerCase()
        );
        return Number(t?.hours || 0);
      }

      const topicMap = {
        Technical: "Domain Technical",
        NonTechnical: "Soft Skills",
        "Soft skills": "Soft Skills",
        Aptitude: "Aptitude",
      };
      const topicName = topicMap[domain] || domain;
      const topicObj = topics?.find(
        (t) => t?.topic?.trim()?.toLowerCase() === topicName?.toLowerCase()
      );
      return Number(topicObj?.hours || 0);
    },
    [customPhaseHours, topics]
  );

  const getMainPhase = useCallback(() => {
    if (selectedPhases.includes("phase-1")) return "phase-1";
    if (selectedPhases.includes("phase-2")) return "phase-2";
    if (selectedPhases.includes("phase-3")) return "phase-3";
    return null;
  }, [selectedPhases]);

  // Allocation across phases removed; remaining-hours helper removed

  useEffect(() => {
    const fetchTrainingDetails = async () => {
      if (!training?.id) return;
      const docRef = doc(db, "trainingForms", training.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setTopics(data.topics || []);
        setCourses(data.courses || []);
        
        // Store original topics for undo functionality
        originalTopics.current = JSON.parse(JSON.stringify(data.topics || []));
      }
    };
    fetchTrainingDetails();
  }, [training]);

  // Track changes for undo functionality
  useEffect(() => {
    const hasTableDataChanged = JSON.stringify(table1DataByDomain) !== JSON.stringify(originalTable1DataByDomain.current);
    const hasTopicsChanged = JSON.stringify(topics) !== JSON.stringify(originalTopics.current);
    const hasCustomHoursChanged = JSON.stringify(customPhaseHours) !== JSON.stringify(originalCustomPhaseHours.current);
    const hasSelectedDomainsChanged = JSON.stringify(selectedDomains) !== JSON.stringify(originalSelectedDomains.current);
    const hasDomainsToDeleteChanged = domainsToDelete.length > 0;
    
    setHasChanges(hasTableDataChanged || hasTopicsChanged || hasCustomHoursChanged || hasSelectedDomainsChanged || hasDomainsToDeleteChanged);
  }, [table1DataByDomain, topics, customPhaseHours, selectedDomains, domainsToDelete]);

  // Undo function to revert to original state
  const handleUndo = () => {
    if (window.confirm("Are you sure you want to undo all changes and revert to the original state? This will restore all original data including hours.")) {
      setTable1DataByDomain(JSON.parse(JSON.stringify(originalTable1DataByDomain.current)));
      setTopics(JSON.parse(JSON.stringify(originalTopics.current)));
      setCustomPhaseHours(JSON.parse(JSON.stringify(originalCustomPhaseHours.current)));
      setSelectedDomains([...originalSelectedDomains.current]);
      setDomainsToDelete([]); // Reset deletion marks
      setHasChanges(false);
      setError(null);
      setSuccess("All changes have been undone. Original state restored.");
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handlePhaseChange = (phase) => {
    setSelectedPhases((prev) => {
      const newPhases = prev.includes(phase)
        ? prev.filter((p) => p !== phase)
        : [...prev, phase];

      if (prev.includes(phase) && !newPhases.includes(phase)) {
        setCustomPhaseHours((prevHours) => ({
          ...prevHours,
          [phase]: "",
        }));
      }
      return newPhases;
    });
    setError(null);
  };

  // Update currentPhase when selectedPhases changes
  useEffect(() => {
    const mainPhase = getMainPhase();
    setCurrentPhase(mainPhase);
  }, [selectedPhases, getMainPhase]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Clear zero-hour highlighting/warning whenever the selected domains change
  useEffect(() => {
    if (selectedDomains && selectedDomains.length > 0) {
      setZeroHourDomains([]);
      setShowZeroHourWarning(false);
      setError(null);
    } else {
      setZeroHourDomains([]);
      setShowZeroHourWarning(false);
    }
  }, [selectedDomains]);

  const validateForm = () => {
    // Require at least one phase
    if (selectedPhases.length === 0) {
      setError("Please select at least one training phase");
      return false;
    }

    // Require domains
    if (selectedDomains.length === 0) {
      setError("Please select at least one domain");
      return false;
    }

    // Date validation
    if (!commonFields.trainingStartDate || !commonFields.trainingEndDate) {
      setError("Please select training start and end dates");
      return false;
    }

    if (!commonFields.collegeStartTime || !commonFields.collegeEndTime) {
      setError("Please enter college start and end times");
      return false;
    }

    // Detect selected domains that have zero configured hours (only if domains are selected)
    if (selectedDomains.length > 0) {
      const mainPhase = getMainPhase();
      const zeroDomains = selectedDomains.filter(
        (d) => Number(getDomainHours(d, mainPhase) || 0) === 0
      );
      if (zeroDomains.length > 0) {
        setZeroHourDomains(zeroDomains);
        setShowZeroHourWarning(true);
        setError(`Selected domain(s) with 0 hours: ${zeroDomains.join(", ")}.`);
        return false;
      }
    }

    return true;
  };

  // Extracted save logic so callers (auto-deselect) can pass computed domains/table data
  const submitInternal = async (
    domainsToSave = null,
    tableDataToSave = null
  ) => {
    setLoading(true);
    setError(null);
    try {
      // Assign the training to the current user only on initiation, not on edit
      if (user && !training.selectedPhase) {
        const trainingDocRef = doc(db, "trainingForms", training.id);
        await updateDoc(trainingDocRef, {
          assignedTo: {
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.name || "Unknown",
          },
        });
      }

      const serializeTable1Data = (data) => {
        return data.map((row) => {
          // Preserve merge metadata for persistent undo functionality
          const cleanedRow = { ...row };
          // Keep merge-related properties for undo functionality
          // delete cleanedRow.isMerged; // Commented out to preserve merge state
          // delete cleanedRow.mergedFrom; // Commented out to preserve merge state
          // delete cleanedRow.originalData; // Commented out to preserve merge state
          
          // Recalculate assignedHours as sum of trainer hours in batches
          let totalAssigned = 0;
          cleanedRow.batches = (row.batches || []).map((batch) => {
            const cleanedBatch = { ...batch };
            // Keep merge-related properties for batches too
            // delete cleanedBatch.isMerged; // Commented out to preserve merge state
            // delete cleanedBatch.mergedFrom; // Commented out to preserve merge state
            
            // Sum assignedHours from trainers
            let batchAssigned = 0;
            cleanedBatch.trainers = (batch.trainers || []).map((trainer) => {
              const cleanedTrainer = { ...trainer };
              delete cleanedTrainer.mergedBreakdown;
              delete cleanedTrainer.activeDates; // Derive from dates if needed
              delete cleanedTrainer.stdCount; // Remove redundant stdCount from trainer
              
              batchAssigned += Number(trainer.assignedHours || 0);
              return cleanedTrainer;
            });
            
            cleanedBatch.assignedHours = batchAssigned;
            totalAssigned += batchAssigned;
            return cleanedBatch;
          });
          
          cleanedRow.assignedHours = totalAssigned;
          // Remove hrs to avoid storing outdated total hours; domainHours in domain doc handles totals
          delete cleanedRow.hrs;
          
          return cleanedRow;
        });
      };

      const mainPhase = getMainPhase();

      // Use provided domain list (if any) to avoid setState race when auto-deselecting
      const domainsList = Array.isArray(domainsToSave)
        ? domainsToSave
        : selectedDomains;
      const tableDataLookup = tableDataToSave || table1DataByDomain;
      // Calculate denormalized data
      let totalBatches = 0;
      let totalMaxHours = 0; // Sum of all trainer assigned hours
      let totalCost = 0;
      let totalTrainingHours = 0; // Sum of all trainer assigned hours
      const domainsArray = [];
      domainsList.forEach((domain) => {
        domainsArray.push(domain);
        const tableData = tableDataLookup[domain] || [];
        // Calculate cost from all trainers and sum trainer hours
        tableData.forEach((row) => {
          if (row.batches) {
            totalBatches += row.batches.length;
            row.batches.forEach((batch) => {
              if (batch.trainers) {
                batch.trainers.forEach((trainer) => {
                  const assignedHours = Number(trainer.assignedHours || 0);
                  const perHourCost = Number(trainer.perHourCost || 0);
                  const conveyance = Number(trainer.conveyance || 0);
                  const food = Number(trainer.food || 0);
                  const lodging = Number(trainer.lodging || 0);
                  const days = getTrainingDays(trainer.startDate, trainer.endDate);
                  totalCost +=
                    assignedHours * perHourCost + conveyance + (food + lodging) * days;
                  // Add trainer hours to total training hours
                  totalTrainingHours += assignedHours;
                });
              }
            });
          }
        });
      });
      totalMaxHours = totalTrainingHours;

      const phaseLevelPromises = selectedPhases.map((phase) => {
        const phaseDocRef = doc(
          db,
          "trainingForms",
          training.id,
          "trainings",
          phase
        );
        const phaseDocData = {
          createdAt: serverTimestamp(),
          createdBy: training.createdBy || {},
          collegeName: training.collegeName || "",
          ...commonFields,
          phase,
        };

        // Always set status field using automatic logic
        let computedStatus = "Not Started";

        // Get the appropriate dates for this phase
        let startDate = null;
        let endDate = null;

        if (
          phase === "phase-2" &&
          phase2Dates?.startDate &&
          phase2Dates?.endDate
        ) {
          startDate = phase2Dates.startDate;
          endDate = phase2Dates.endDate;
        } else if (
          phase === "phase-3" &&
          phase3Dates?.startDate &&
          phase3Dates?.endDate
        ) {
          startDate = phase3Dates.startDate;
          endDate = phase3Dates.endDate;
        } else if (
          commonFields.trainingStartDate &&
          commonFields.trainingEndDate
        ) {
          startDate = commonFields.trainingStartDate;
          endDate = commonFields.trainingEndDate;
        }

        // Compute status based on batch configuration and dates
        computedStatus = "Not Started";
        const hasBatches = domainsList.length > 0; // Check if domains/batches are configured
        const hasDates = startDate && endDate;

        if (!hasBatches) {
          // No batches configured
          if (hasDates) {
            computedStatus = "Not Started"; // Dates entered but no batches
          } else {
            computedStatus = "Not Started"; // No dates or batches
          }
        } else {
          // Batches configured
          if (!hasDates) {
            computedStatus = "Initiated"; // Batches but no dates
          } else {
            // Batches and dates: Check date-based logic
            const today = new Date();
            const phaseStart = new Date(startDate);
            const phaseEnd = new Date(endDate);
            today.setHours(0, 0, 0, 0);
            phaseStart.setHours(0, 0, 0, 0);
            phaseEnd.setHours(0, 0, 0, 0);

            if (today >= phaseStart && today <= phaseEnd) {
              computedStatus = "In Progress";
            } else if (today > phaseEnd) {
              computedStatus = "Done";
            } else {
              computedStatus = "Initiated"; // Batches configured, dates in future
            }
          }
        }

        phaseDocData.status = computedStatus;

        if (phase === mainPhase) {

          phaseDocData.domainsCount = domainsList.length;

          phaseDocData.totalBatches = totalBatches;

          phaseDocData.totalHours = totalMaxHours;

          phaseDocData.totaltraininghours = totalTrainingHours;

          phaseDocData.totalCost = totalCost;

          phaseDocData.domains = domainsArray;

          phaseDocData.updatedAt = serverTimestamp();

        }

        phaseDocData.excludeDays = excludeDays;
        return setDoc(phaseDocRef, phaseDocData, { merge: true });
      });

      // Use provided domain list (if any) to avoid setState race when auto-deselecting
      const batchPromises = domainsList.map(async (domain) => {
        // Compute status for main phase (same logic as above)
        let mainPhaseStatus = "Not Started";
        let startDate = null;
        let endDate = null;

        if (
          mainPhase === "phase-2" &&
          phase2Dates?.startDate &&
          phase2Dates?.endDate
        ) {
          startDate = phase2Dates.startDate;
          endDate = phase2Dates.endDate;
        } else if (
          mainPhase === "phase-3" &&
          phase3Dates?.startDate &&
          phase3Dates?.endDate
        ) {
          startDate = phase3Dates.startDate;
          endDate = phase3Dates.endDate;
        } else if (
          commonFields.trainingStartDate &&
          commonFields.trainingEndDate
        ) {
          startDate = commonFields.trainingStartDate;
          endDate = commonFields.trainingEndDate;
        }

        // Compute status based on batch configuration and dates
        const hasBatches = domainsList.length > 0; // Check if domains/batches are configured
        const hasDates = startDate && endDate;

        if (!hasBatches) {
          // No batches configured
          if (hasDates) {
            mainPhaseStatus = "Not Started"; // Dates entered but no batches
          } else {
            mainPhaseStatus = "Not Started"; // No dates or batches
          }
        } else {
          // Batches configured
          if (!hasDates) {
            mainPhaseStatus = "Initiated"; // Batches but no dates
          } else {
            // Batches and dates: Check date-based logic
            const today = new Date();
            const phaseStart = new Date(startDate);
            const phaseEnd = new Date(endDate);
            today.setHours(0, 0, 0, 0);
            phaseStart.setHours(0, 0, 0, 0);
            phaseEnd.setHours(0, 0, 0, 0);

            if (today >= phaseStart && today <= phaseEnd) {
              mainPhaseStatus = "In Progress";
            } else if (today > phaseEnd) {
              mainPhaseStatus = "Done";
            } else {
              mainPhaseStatus = "Initiated"; // Batches configured, dates in future
            }
          }
        }

        let phaseData = {
          createdAt: serverTimestamp(),
          createdBy: training.createdBy || {},
          collegeName: training.collegeName || "",
          ...commonFields,
          phase: mainPhase,
          domain,
          domainHours: getDomainHours(domain, mainPhase),
          table1Data: serializeTable1Data(tableDataLookup[domain] || []),
          isMainPhase: true,
          customHours: customPhaseHours[mainPhase] || "",
          allSelectedPhases: selectedPhases,
          status: mainPhaseStatus, // Use computed status for main phase
        };
        if (mainPhase === "phase-2") {
          phaseData.phase2Dates = phase2Dates;
          if (phase2Dates?.startDate)
            phaseData.trainingStartDate = phase2Dates.startDate;
          if (phase2Dates?.endDate)
            phaseData.trainingEndDate = phase2Dates.endDate;
        }
        if (mainPhase === "phase-3") {
          phaseData.phase3Dates = phase3Dates;
          if (phase3Dates?.startDate)
            phaseData.trainingStartDate = phase3Dates.startDate;
          if (phase3Dates?.endDate)
            phaseData.trainingEndDate = phase3Dates.endDate;
        }
        const domainRef = doc(
          db,
          "trainingForms",
          training.id,
          "trainings",
          mainPhase,
          "domains",
          domain
        );
        await setDoc(domainRef, phaseData, { merge: true });

        // Log batch creation for each batch in this domain
        const tableData = tableDataLookup[domain] || [];
        for (const row of tableData) {
          if (row.batches) {
            for (const batch of row.batches) {
              try {
                await auditLogTrainingOperations.batchCreated({
                  trainingId: training.id,
                  collegeName: training.collegeName,
                  phase: mainPhase,
                  domain,
                  batchCode: batch.batchCode || "",
                  specialization: row.batch || row.specialization || "",
                  studentCount: row.stdCount || row.students || 0,
                  trainerCount: batch.trainers?.length || 0,
                  totalAssignedHours: batch.assignedHours || 0,
                  createdBy: user?.uid,
                  createdByName: user?.displayName || user?.name || "Unknown",
                });
              } catch (auditErr) {
                console.error("Error logging batch creation:", auditErr);
                // Don't block the main save operation
              }
            }
          }
        }
      });

      await Promise.all([...phaseLevelPromises, ...batchPromises]);

      // Log training initiation audit event
      try {
        await auditLogTrainingOperations.trainingInitiated({
          trainingId: training.id,
          collegeName: training.collegeName,
          phases: selectedPhases,
          domains: domainsList,
          totalBatches,
          totalTrainingHours,
          totalCost,
          initiatedBy: user?.uid,
          initiatedByName: user?.displayName || user?.name || "Unknown",
        });
      } catch (auditErr) {
        console.error("Error logging training initiation:", auditErr);
        // Don't block the main save operation
      }

      // Delete domains marked for deletion via X button
      const deletePromises = domainsToDelete.map(async (domain) => {
        const domainDocRef = doc(db, "trainingForms", training.id, "trainings", currentPhase, "domains", domain);
        await deleteDoc(domainDocRef);
      });
      await Promise.all(deletePromises);
      try {
        const normalizeDate = (d) => {
          if (!d) return null;
          if (typeof d === "string") {
            const asDate = new Date(d);
            if (!isNaN(asDate.getTime()))
              return asDate.toISOString().slice(0, 10);
            return d;
          }
          if (d?.toDate) return d.toDate().toISOString().slice(0, 10);
          const dt = new Date(d);
          return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
        };

        // Parse training ID to get path components
        const parts = training.id.split("-");
        if (parts.length < 6) {
          throw new Error("Invalid training ID format");
        }
        const projectCode = parts[0];
        const year = parts[1];
        const branch = parts[2];
        const specialization = parts[3];
        const phaseBase = parts[4] + "-" + parts[5];
        const phase = phaseBase + "-phase-" + mainPhase.split("-")[1];

        // 1) delete existing assignments for this training and phase
        const prefix = `${projectCode}-${year}-${branch}-${specialization}-${phase}`;
        const q = query(collection(db, "trainerAssignments"), where('__name__', '>=', prefix), where('__name__', '<', prefix + '\uf8ff'));
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // 2) collect new assignments from table data
        const assignments = [];
        const domainsListForWrite = Array.isArray(domainsToSave)
          ? domainsToSave
          : selectedDomains;
        domainsListForWrite.forEach((domain) => {
          (tableDataLookup[domain] || []).forEach((row, rowIdx) => {
            (row.batches || []).forEach((batch, batchIdx) => {
              (batch.trainers || []).forEach((tr, trainerIdx) => {
                if (!tr?.trainerId) return;
                let dateStrings = [];
                if (tr.activeDates && tr.activeDates.length > 0) {
                  dateStrings = tr.activeDates
                    .map(normalizeDate)
                    .filter(Boolean);
                } else if (tr.startDate && tr.endDate) {
                  dateStrings = getDateList(tr.startDate, tr.endDate);
                } else if (tr.startDate) {
                  const d = normalizeDate(tr.startDate);
                  if (d) dateStrings = [d];
                }
                dateStrings.forEach((dateStr) => {
                  assignments.push({
                    trainerId: tr.trainerId,
                    trainerName: tr.trainerName || tr.trainer || "",
                    date: dateStr,
                    dayDuration: tr.dayDuration || "",
                    sourceTrainingId: training.id,
                    domain,
                    batchCode: batch.batchCode || "",
                    collegeName: tr.collegeName || training.collegeName || "",
                    // Include source indices for traceability and to avoid lint unused-vars
                    sourceRowIndex: rowIdx,
                    sourceBatchIndex: batchIdx,
                    sourceTrainerIndex: trainerIdx,
                    createdAt: serverTimestamp(),
                  });
                });
              });
            });
          });
        });

        // 3) batch write new assignments with structured document IDs
        if (assignments.length > 0) {
          const wb = writeBatch(db);
          assignments.forEach((a) => {
            // Create structured document ID: {projectCode}-{year}-{branch}-{specialization}-{phase}-{trainerId}-{date}
            const docId = `${prefix}-${a.trainerId}-${a.date}`;
            
            const ref = doc(db, "trainerAssignments", docId);
            wb.set(ref, a);
          });
          await wb.commit();
        } else {
          // no assignments to write
        }
      } catch (assignmentErr) {
        console.error("Error updating trainer assignments:", assignmentErr);
        // don't block main save; surface a console warning
      }
      // --- end trainerAssignments update ---

      setSuccess("Training phases initiated successfully!");
      setLoading(false);
      setTimeout(() => {
        // Clean local state and update originals
        const cleanedTableData = {};
        selectedDomains.forEach(domain => {
          if (table1DataByDomain[domain]) cleanedTableData[domain] = table1DataByDomain[domain];
        });
        setTable1DataByDomain(cleanedTableData);
        originalSelectedDomains.current = selectedDomains;
        originalTable1DataByDomain.current = cleanedTableData;
        setDomainsToDelete([]); // Reset deletion list
        const finalDomains = Array.isArray(domainsToSave)
          ? domainsToSave
          : selectedDomains;
        const finalTableData = tableDataToSave || cleanedTableData;
        if (onConfirm)
          onConfirm({
            phases: selectedPhases,
            ...commonFields,
            domains: finalDomains,
            table1DataByDomain: finalTableData,
            mainPhase,
            ...phase2Dates,
          });
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to save phase data:", err);
      setError("Failed to save phase data. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validateForm()) {
      setSubmitDisabled(true);
      return;
    }
    await submitInternal();
  };

  const handleAutoDeselectZeroHourDomains = async () => {
    if (!zeroHourDomains || zeroHourDomains.length === 0) return;
    try {
      setDeselectingZeroDomains(true);
      // compute new selections synchronously to avoid setState timing issues
      const newSelectedDomains = selectedDomains.filter(
        (d) => !zeroHourDomains.includes(d)
      );
      const newTable1Data = { ...table1DataByDomain };
      zeroHourDomains.forEach((d) => delete newTable1Data[d]);

      // update local UI immediately
      setSelectedDomains(newSelectedDomains);
      setTable1DataByDomain(newTable1Data);
      setShowZeroHourWarning(false);
      setZeroHourDomains([]);

      // pass computed lists directly to submitInternal (no race)
      await submitInternal(newSelectedDomains, newTable1Data);
    } finally {
      setDeselectingZeroDomains(false);
    }
  };

  // Handle validation changes from BatchDetailsTable
  const handleValidationChange = useCallback((domain, validationStatus) => {
    setValidationByDomain((prev) => ({
      ...prev,
      [domain]: validationStatus,
    }));
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (!domainToDelete) return;
    setSelectedDomains(selectedDomains.filter((d) => d !== domainToDelete));
    setDomainsToDelete(prev => [...prev, domainToDelete]); // Mark for deletion
    // Keep data in table1DataByDomain for potential recovery
    setShowDeleteConfirm(false);
    setDomainToDelete(null);
  };

  // Check if there are any validation errors across all domains
  const hasValidationErrors = () => {
    return Object.values(validationByDomain).some(
      (validation) => validation?.hasErrors
    );
  };

  useEffect(() => {
    if (!error && !Object.values(validationByDomain).some((v) => v?.hasErrors)) {
      setSubmitDisabled(false);
    }
  }, [error, validationByDomain]);

  useEffect(() => {
    const checkTrainingsCollection = async () => {
      if (training?.id) {
        const trainingsSnap = await getDocs(
          fbCollection(db, "trainingForms", training.id, "trainings")
        );
        setCanMergeBatches(!trainingsSnap.empty);
      } else {
        setCanMergeBatches(false);
      }
    };
    checkTrainingsCollection();
  }, [training]);

  useEffect(() => {
    const prefillCommonFields = async () => {
      if (!training?.id) return;
      const phaseRefs = [
        doc(db, "trainingForms", training.id, "trainings", "phase-1"),
        doc(db, "trainingForms", training.id, "trainings", "phase-2"),
        doc(db, "trainingForms", training.id, "trainings", "phase-3"),
      ];
      for (const ref of phaseRefs) {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setCommonFields((prev) => ({
            ...prev,
            trainingStartDate: data.trainingStartDate || prev.trainingStartDate,
            trainingEndDate: data.trainingEndDate || prev.trainingEndDate,
            collegeStartTime: data.collegeStartTime || prev.collegeStartTime,
            collegeEndTime: data.collegeEndTime || prev.collegeEndTime,
            lunchStartTime: data.lunchStartTime || prev.lunchStartTime,
            lunchEndTime: data.lunchEndTime || prev.lunchEndTime,
          }));
          break;
        }
      }
    };
    prefillCommonFields();
  }, [training?.id]);

  useEffect(() => {
    if (!training?.id) return;
    const fetchPhaseDates = async () => {
      const phase2Ref = doc(
        db,
        "trainingForms",
        training.id,
        "trainings",
        "phase-2"
      );
      const phase2Snap = await getDoc(phase2Ref);
      if (phase2Snap.exists()) {
        const data = phase2Snap.data();
        if (data.phase2Dates) {
          setPhase2Dates({
            startDate: data.phase2Dates.startDate || "",
            endDate: data.phase2Dates.endDate || "",
          });
        } else {
          setPhase2Dates({
            startDate: data.trainingStartDate || "",
            endDate: data.trainingEndDate || "",
          });
        }
      }
      const phase3Ref = doc(
        db,
        "trainingForms",
        training.id,
        "trainings",
        "phase-3"
      );
      const phase3Snap = await getDoc(phase3Ref);
      if (phase3Snap.exists()) {
        const data = phase3Snap.data();
        if (data.phase3Dates) {
          setPhase3Dates({
            startDate: data.phase3Dates.startDate || "",
            endDate: data.phase3Dates.endDate || "",
          });
        } else {
          setPhase3Dates({
            startDate: data.trainingStartDate || "",
            endDate: data.trainingEndDate || "",
          });
        }
      }
    };
    fetchPhaseDates();
  }, [training?.id]);

  // When the main phase changes to phase-2 or phase-3, ensure the modal's
  // common start/end date fields come from that phase's specific dates so
  // the "Start Date" / "End Date" inputs show the correct values.
  useEffect(() => {
    if (!currentPhase) return;
    if (currentPhase === "phase-2") {
      setCommonFields((prev) => ({
        ...prev,
        trainingStartDate: phase2Dates?.startDate || prev.trainingStartDate,
        trainingEndDate: phase2Dates?.endDate || prev.trainingEndDate,
      }));
    } else if (currentPhase === "phase-3") {
      setCommonFields((prev) => ({
        ...prev,
        trainingStartDate: phase3Dates?.startDate || prev.trainingStartDate,
        trainingEndDate: phase3Dates?.endDate || prev.trainingEndDate,
      }));
    }
  }, [currentPhase, phase2Dates, phase3Dates]);

  useEffect(() => {
    const fetchExistingPhases = async () => {
      if (!training?.id) return;
      const trainingsSnap = await getDocs(
        collection(db, "trainingForms", training.id, "trainings")
      );
      const phases = [];
      const existingCustomHours = {};
      trainingsSnap.forEach((docSnap) => {
        if (docSnap.exists()) {
          phases.push(docSnap.id);
          const data = docSnap.data();
          if (data.customHours) {
            existingCustomHours[docSnap.id] = data.customHours;
          }
        }
      });

      // If the modal was opened via "Start Phase" and a specific phase was passed,
      // default the selection to only that phase so the user sees that single-phase form.
      // Otherwise, restore all existing phases from Firestore.
      if (training?.selectedPhase) {
        setSelectedPhases([training.selectedPhase]);
      } else {
        // Restore all existing phases from Firestore
        setSelectedPhases(phases);
      }

      if (Object.keys(existingCustomHours).length > 0) {
        setCustomPhaseHours((prev) => ({
          ...prev,
          ...existingCustomHours,
        }));
      }
    };
    fetchExistingPhases();
  }, [training?.id, training?.selectedPhase]);

  // Load phase-specific data when currentPhase is set
  useEffect(() => {
    if (!training?.id || !currentPhase) return;
    const fetchPhaseData = async () => {
      const phaseDoc = await getDoc(doc(db, "trainingForms", training.id, "trainings", currentPhase));
      if (phaseDoc.exists()) {
        const phaseData = phaseDoc.data();
        setCommonFields({
          trainingStartDate: phaseData.trainingStartDate || "",
          trainingEndDate: phaseData.trainingEndDate || "",
          collegeStartTime: phaseData.collegeStartTime || "",
          collegeEndTime: phaseData.collegeEndTime || "",
          lunchStartTime: phaseData.lunchStartTime || "",
          lunchEndTime: phaseData.lunchEndTime || "",
        });
        setSelectedDomains(phaseData.domains || []);
        // excludeDays is not stored, so keep default "None"
      }
    };
    fetchPhaseData();
  }, [training?.id, currentPhase]);

  // Load all domains for the current phase
  useEffect(() => {
    if (!training?.id || !currentPhase) return;
    const fetchPhaseDomains = async () => {
      const domainsSnap = await getDocs(
        collection(
          db,
          "trainingForms",
          training.id,
          "trainings",
          currentPhase,
          "domains"
        )
      );
      const loadedDomains = [];
      const loadedTable1Data = {};

      // For each domain in the current phase, also load other phases to compute already-used hours
      domainsSnap.forEach((docSnap) => {
        loadedDomains.push(docSnap.id);
      });

      // Backwards compatibility: if Firestore has a single "Tools" doc,
      // expand it into two UI domains: Tools (Excel - Power BI) and Tools (Looker Studio)
      if (loadedDomains.includes("Tools")) {
        // remove legacy "Tools" entry and add the two subdomains
        const idx = loadedDomains.indexOf("Tools");
        if (idx !== -1) loadedDomains.splice(idx, 1);
        loadedDomains.push("Tools (Excel - Power BI)");
        loadedDomains.push("Tools (Looker Studio)");
      }

      for (const domain of loadedDomains) {
        // If this domain is one of the Tools subdomains, attempt to read the
        // corresponding document (doc id must match the key). If it does not
        // exist (e.g. legacy single "Tools" doc existed), we'll fallback to
        // auto-generating rows from courses below.
        const currentDoc = await getDoc(
          doc(
            db,
            "trainingForms",
            training.id,
            "trainings",
            currentPhase,
            "domains",
            domain
          )
        );
        const currentData = currentDoc.exists() ? currentDoc.data() : null;

        // Build the table data for this domain taking into account used hours
        const rowsForDomain = (currentData?.table1Data || []).map((row) => {
          const totalDomainHours = getDomainHours(domain) || 0; // domain-level total

          // Restore merge state from persisted data
          const restoredRow = {
            ...row,
            hrs: totalDomainHours,
            batches: row.batches || [],
          };

          // Preserve merge metadata if it exists in the persisted data
          if (row.isMerged !== undefined) {
            restoredRow.isMerged = row.isMerged;
          }
          if (row.mergedFrom !== undefined) {
            restoredRow.mergedFrom = row.mergedFrom;
          }
          if (row.originalData !== undefined) {
            restoredRow.originalData = row.originalData;
          }

          return restoredRow;
        });

        // Start with existing saved data
        loadedTable1Data[domain] = [...rowsForDomain];

        // Add any new courses that are not already included in existing batches (considering merged batches)
        const domainHours = getDomainHours(domain, currentPhase);
        courses.forEach((course) => {
          const spec = course.specialization;
          const isAlreadyIncluded = rowsForDomain.some(row => {
            if (row.batch === spec) return true;
            if (row.batch.includes('+')) {
              const parts = row.batch.split('+');
              return parts.includes(spec);
            }
            return false;
          });
          if (!isAlreadyIncluded) {
            loadedTable1Data[domain].push({
              batch: spec,
              stdCount: course.students,
              hrs: domainHours,
              assignedHours: 0,
              batches: [
                {
                  batchPerStdCount: "",
                  batchCode: `${spec}1`,
                  assignedHours: 0,
                  trainers: [],
                },
              ],
            });
          }
        });
      }

      setSelectedDomains(loadedDomains);
      setTable1DataByDomain(loadedTable1Data);

      // Store original data for undo functionality
      originalTable1DataByDomain.current = JSON.parse(JSON.stringify(loadedTable1Data));
      originalSelectedDomains.current = [...loadedDomains];
      setHasChanges(false);
    };
    fetchPhaseDomains();
  }, [training?.id, currentPhase, courses, getDomainHours]);

  // Initialize table1Data for newly selected domains with courses
  useEffect(() => {
    setTable1DataByDomain(prev => {
      const newData = { ...prev };
      selectedDomains.forEach(domain => {
        if (!newData[domain] || newData[domain].length === 0) {
          const domainHours = getDomainHours(domain, currentPhase);
          newData[domain] = courses.map(course => ({
            batch: course.specialization,
            stdCount: course.students,
            hrs: domainHours,
            assignedHours: 0,
            batches: [
              {
                batchPerStdCount: "",
                batchCode: `${course.specialization}1`,
                assignedHours: 0,
                trainers: [],
              },
            ],
          }));
        }
      });
      return newData;
    });
  }, [selectedDomains, courses, currentPhase, getDomainHours]);

  // Load phase-specific data when currentPhase is set
  useEffect(() => {
    if (!training?.id || !currentPhase) return;
    const fetchPhaseData = async () => {
      const phaseDoc = await getDoc(doc(db, "trainingForms", training.id, "trainings", currentPhase));
      if (phaseDoc.exists()) {
        const phaseData = phaseDoc.data();
        setCommonFields({
          trainingStartDate: phaseData.trainingStartDate || "",
          trainingEndDate: phaseData.trainingEndDate || "",
          collegeStartTime: phaseData.collegeStartTime || "",
          collegeEndTime: phaseData.collegeEndTime || "",
          lunchStartTime: phaseData.lunchStartTime || "",
          lunchEndTime: phaseData.lunchEndTime || "",
        });
        setExcludeDays(phaseData.excludeDays || "None");
        setSelectedDomains(phaseData.domains || []);
      }
    };
    fetchPhaseData();
  }, [training?.id, currentPhase]);

  // Fetch global trainer assignments from other trainingForms documents so we can detect cross-college conflicts
  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    const normalizeDate = (d) => {
      if (!d) return null;
      if (typeof d === "string") return d;
      if (d?.toDate) return d.toDate().toISOString().slice(0, 10);
      try {
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return null;
        return dt.toISOString().slice(0, 10);
      } catch {
        return null;
      }
    };

    // --- REPLACED: use onSnapshot for real-time updates from centralized collection ---
    // If you use trainerAssignments collection (recommended), listen to it for realtime updates.
    const assignmentsCol = collection(db, "trainerAssignments");
    const unsubscribe = onSnapshot(
      assignmentsCol,
      (snap) => {
        try {
          const assignments = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data) return;
            const dateStr = normalizeDate(data.date);
            if (!dateStr) return;
            assignments.push({
              trainerId: data.trainerId,
              date: dateStr,
              dayDuration: data.dayDuration || "",
              sourceTrainingId: data.sourceTrainingId || "",
              domain: data.domain || "",
              collegeName: data.collegeName || "",
              batchCode: data.batchCode || "",
              trainerName: data.trainerName || "",
            });
          });
          // Filter out assignments that belong to the current college to avoid self-conflict
          const filtered = assignments.filter(
            (a) => a.collegeName !== (training?.collegeName || "")
          );
          if (!cancelled) setGlobalTrainerAssignments(filtered);
        } catch (err) {
          console.error("Error processing trainer assignments snapshot:", err);
        }
      },
      (err) => {
        console.error("Error in trainer assignments snapshot listener:", err);
      }
    );

    // Fallback: keep the previous scan-based fetch if trainerAssignments collection does not exist in older deployments.
    // (Optional) you can remove the fallback if trainerAssignments is guaranteed.
    // Cleanup
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [training?.collegeName]);

  // Compute current training assignments by domain for cross-domain duplicate detection
  const currentTrainingAssignmentsByDomain = useMemo(() => {
    const result = {};
    selectedDomains.forEach((currentDomain) => {
      const assignments = [];
      Object.entries(table1DataByDomain).forEach(([dom, tableData]) => {
        if (dom === currentDomain) return;
        tableData.forEach((row) => {
          row.batches.forEach((batch) => {
            batch.trainers.forEach((trainer) => {
              let dateStrings = [];
              if (trainer.activeDates && trainer.activeDates.length > 0) {
                dateStrings = trainer.activeDates.map(normalizeDate).filter(Boolean);
              } else if (trainer.startDate && trainer.endDate) {
                dateStrings = getDateList(trainer.startDate, trainer.endDate);
              } else if (trainer.startDate) {
                const d = normalizeDate(trainer.startDate);
                if (d) dateStrings = [d];
              }
              dateStrings.forEach((dateStr) => {
                assignments.push({
                  trainerId: trainer.trainerId,
                  trainerName: trainer.trainerName || trainer.trainer || "",
                  date: dateStr,
                  dayDuration: trainer.dayDuration || "",
                  sourceTrainingId: training.id,
                  domain: dom,
                  collegeName: trainer.collegeName || training.collegeName || "",
                  batchCode: batch.batchCode || "",
                });
              });
            });
          });
        });
      });
      result[currentDomain] = assignments;
    });
    return result;
  }, [selectedDomains, table1DataByDomain, training.id, training.collegeName, getDateList]);

  const swapTrainers = (swapData) => {

    if (!swapData || !swapData.source || !swapData.target) {
      return;
    }

    const { source, target, domain } = swapData;

    // Use the domain from swapData or fallback to first selected domain
    const currentDomain = domain || selectedDomains[0];

    if (!table1DataByDomain[currentDomain]) {
      return;
    }

    // Get current domain's table data
    const currentDomainData = [...table1DataByDomain[currentDomain]];

    // Validate that the indices exist
    if (
      !currentDomainData[source.rowIdx] ||
      !currentDomainData[source.rowIdx].batches[source.batchIdx]
    ) {
      return;
    }

    if (
      !currentDomainData[target.rowIdx] ||
      !currentDomainData[target.rowIdx].batches[target.batchIdx]
    ) {
      return;
    }

    // CROSS-BATCH SWAP: Create trainers for opposite batches
    const sourceNewTrainer = {
      ...source.trainerData,
      dayDuration: source.newTimeSlot,
    };

    const targetNewTrainer = {
      ...target.trainerData,
      dayDuration: target.newTimeSlot,
    };

    // CROSS-BATCH SWAP: Add source trainer to TARGET batch, target trainer to SOURCE batch
    currentDomainData[target.rowIdx].batches[target.batchIdx].trainers.push(
      sourceNewTrainer
    );
    currentDomainData[source.rowIdx].batches[source.batchIdx].trainers.push(
      targetNewTrainer
    );

    // Update the state with the modified data
    setTable1DataByDomain((prev) => {
      const newState = {
        ...prev,
        [currentDomain]: currentDomainData,
      };

      return newState;
    });
  };

  return (
    <>
      {/* Inline CSS to shrink the react-datepicker popup (kept in this file) */}
      <style>{`
        /* Ensure the datepicker popper overlays modal/dialogs */
        .react-datepicker-popper,
        .small-datepicker-popper,
        .react-datepicker,
        .small-datepicker {
          z-index: 99999 !important;
        }

        /* Base popup */
        .small-datepicker-popper .react-datepicker,
        .small-datepicker {
          font-size: 12px;
          width: 220px;
          box-sizing: border-box;
        }

        /* Header / month */
        .small-datepicker .react-datepicker__header {
          padding: 6px 8px;
        }
        .small-datepicker .react-datepicker__current-month,
        .small-datepicker .react-datepicker__day-name {
          font-size: 11px;
        }

        /* Day cells */
        .small-datepicker .react-datepicker__day,
        .small-datepicker .react-datepicker__day-name {
          width: 26px;
          height: 26px;
          line-height: 26px;
          margin: 2px;
          font-size: 11px;
          border-radius: 4px;
        }

        /* Navigation arrows */
        .small-datepicker .react-datepicker__navigation {
          top: 8px;
        }

        /* Time list tweaks */
        .small-datepicker .react-datepicker__time-box .react-datepicker__time {
          font-size: 11px;
          max-width: 90px;
        }
        .small-datepicker .react-datepicker__time-list {
          max-height: 160px;
          overflow: auto;
        }

        /* Responsive smaller */
        @media (max-width: 640px) {
          .small-datepicker-popper .react-datepicker { width: 180px; }
          .small-datepicker .react-datepicker__day { width: 22px; height: 22px; line-height: 22px; font-size: 10px; }
        }

        /* Remove number input spinner arrows */
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner {
          -moz-appearance: textfield;
        }

        /* Make placeholder text more visible */
        .no-spinner::placeholder {
          font-size: 11px;
          font-weight: 400;
          color: #9ca3af;
        }
      `}</style>

      <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
        {/* Page Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="mx-auto p-3">
            <div className="flex items-center justify-between">
              {/* Left: Back */}
              <div className="flex-1">
                <button
                  onClick={onClose}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors text-xs font-medium"
                  disabled={loading}
                >
                  <FiChevronLeft className="w-3 h-3 mr-1" />
                  Back to Training List
                </button>
              </div>
              {/* Center: College Name */}
              <div className="flex-1 text-center">
                <h1 className="text-sm font-semibold text-gray-800 leading-tight">
                  {training?.collegeName ? (
                      <>
                        {training.collegeName}
                        {(training.projectCode || training.collegeCode) && (
                          <span className="ml-1 text-gray-500 font-normal">
                            ({training.projectCode || training.collegeCode})
                          </span>
                        )}
                      </>
                    ) : (
                    <span className="text-gray-500 font-normal">
                      Training Setup
                    </span>
                  )}
                </h1>
                {selectedPhases?.length > 0 && (
                  <p className="mt-0.5 text-[10px] tracking-wide uppercase text-gray-400">
                    {selectedPhases.join(" • ")}
                  </p>
                )}
      
              </div>
              {/* Right: Placeholder for spacing / future actions */}
              <div className="flex-1 text-right hidden sm:block">
                {/* Reserved for future quick actions */}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto py-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Page Content */}
            <div className="p-3">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Phase Selection */}
                <div className="space-y-3">
                  <div className="pb-2 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">
                      Select Training Phases
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                      Choose which phases you want to initiate for this training
                      program.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-6 items-start">
                    <div className="flex flex-wrap gap-3 min-w-[300px]">
                      {PHASE_OPTIONS.map((phase) => {
                        return (
                          <label
                            key={phase}
                            className={`flex items-center px-3 py-2 rounded-xl border text-sm font-medium transition-all min-w-20 ${
                              selectedPhases.includes(phase)
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300"
                            } cursor-pointer`}
                          >
                            <input
                              type="checkbox"
                              className="mr-2 accent-blue-600"
                              checked={selectedPhases.includes(phase)}
                              onChange={() => handlePhaseChange(phase)}
                            />
                            <span className="capitalize">
                              {phase.replace("-", " ")}
                            </span>
                          </label>
                        );
                      })}
                    </div>
 {/* Start/End Date */}
                    <div className="flex gap-4 min-w-[200px]">
                      <div className="flex flex-col items-start">
                        <label className="text-sm font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <DatePicker
                          selected={
                            commonFields.trainingStartDate ? new Date(commonFields.trainingStartDate + "T00:00:00") : null
                          }
                          onChange={(date) => {
                            const dateStr = date
                              ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                              : "";
                            setCommonFields({
                              ...commonFields,
                              trainingStartDate: dateStr,
                            });
                          }}
                          dateFormat="yyyy-MM-dd"
                          placeholderText="Select date"
                          className="w-32 h-10 rounded border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-sm px-3"
                          calendarClassName="small-datepicker"
                          popperClassName="small-datepicker-popper"
                        />
                      </div>
                      <div className="flex flex-col items-start">
                        <label className="text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <DatePicker
                          selected={
                            commonFields.trainingEndDate ? new Date(commonFields.trainingEndDate + "T00:00:00") : null
                          }
                          onChange={(date) => {
                            const dateStr = date
                              ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                              : "";
                            setCommonFields({
                              ...commonFields,
                              trainingEndDate: dateStr,
                            });
                          }}
                          dateFormat="yyyy-MM-dd"
                          placeholderText="Select date"
                          className="w-32 h-10 rounded border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-sm px-3"
                          calendarClassName="small-datepicker"
                          popperClassName="small-datepicker-popper"
                        />
                      </div>
                    </div>
                    {/* Exclude Days Dropdown */}
                    <div className="flex flex-col items-start min-w-[250px]">
                     
                      <div className="flex flex-col">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Exclude Days
                        </label>
                        <div className="relative" ref={dropdownRef}>
                          <button
                            type="button"
                            onClick={() => setExcludeDropdownOpen(!excludeDropdownOpen)}
                            className="min-w-[140px] h-8 rounded border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-xs px-2 bg-white flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <span>{excludeDays}</span>
                            <FiChevronDown className={`w-3 h-3 transition-transform ${excludeDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {excludeDropdownOpen && (
                            <div className="absolute z-10 mt-1 min-w-[140px] bg-white border border-gray-300 rounded-xl shadow-sm">
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExcludeDays("None");
                                    setExcludeDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  None
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExcludeDays("Saturday");
                                    setExcludeDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  Saturday
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExcludeDays("Sunday");
                                    setExcludeDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  Sunday
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExcludeDays("Both");
                                    setExcludeDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  Saturday + Sunday
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>



                <TrainingConfiguration commonFields={commonFields} setCommonFields={setCommonFields} selectedPhases={selectedPhases} phase2Dates={phase2Dates} phase3Dates={phase3Dates} setPhase2Dates={setPhase2Dates} setPhase3Dates={setPhase3Dates} getMainPhase={getMainPhase} />

                {/* Training Domain + Batch Details */}
                {getMainPhase() && (
                  <>
                    {/* Domain Selection (Multi-select) */}
                    <div className="space-y-3">
                      <div className="pb-2 border-b border-gray-200">
                        <h2 className="text-base font-semibold text-gray-900">
                          Training Domains
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Select one or more domains for this training program.
                        </p>
                      </div>
                      {/* Chips for selected domains */}
                      <div className="flex flex-wrap gap-2 mb-2 min-h-8">
                        {selectedDomains.length === 0 && (
                          <span className="text-xs text-gray-400">
                            No domains selected
                          </span>
                        )}
                        {selectedDomains.map((domain) => (
                          <span
                            key={domain}
                            className="flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium"
                          >
                            {domain}
                            <button
                              type="button"
                              className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none"
                              onClick={() => {
                                setDomainToDelete(domain);
                                setShowDeleteConfirm(true);
                              }}
                              aria-label={`Remove ${domain}`}
                            >
                              <FiX className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      {/* Checkbox list for all domains in a single row */}
                      <div className="flex flex-row gap-3">
                        {DOMAIN_OPTIONS.map((domain) => {
                          const isSelected = selectedDomains.includes(domain);
                          const isZero = zeroHourDomains.includes(domain);
                          // highlight classes for zero-hour domains
                          const zeroClasses = isZero
                            ? "ring-2 ring-yellow-400 bg-yellow-50 text-yellow-800 border-yellow-300 animate-pulse"
                            : "";
                          return (
                            <label
                              key={domain}
                              title={
                                isZero
                                  ? "This domain has 0 configured hours"
                                  : undefined
                              }
                              className={`flex items-center px-2 py-1 rounded-xl cursor-pointer text-xs transition
                                ${
                                  isSelected
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-white text-gray-700 border border-gray-200 hover:bg-blue-50"
                                }
                                ${zeroClasses}
                              `}
                            >
                              <input
                                type="checkbox"
                                className="mr-2 accent-blue-600"
                                checked={isSelected}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  if (checked) {
                                    setSelectedDomains([...selectedDomains, domain]);
                                    setTable1DataByDomain((prev) => ({
                                      ...prev,
                                      [domain]: prev[domain] || [],
                                    }));
                                    // If re-selecting a domain marked for deletion, remove from deletion list
                                    setDomainsToDelete(prev => prev.filter(d => d !== domain));
                                  } else {
                                    setSelectedDomains(selectedDomains.filter((d) => d !== domain));
                                    // Keep data in table1DataByDomain for temporary deselection
                                  }
                                  // clear any previous zero-hour marks for this domain on user action
                                  setZeroHourDomains((prev) =>
                                    prev.filter((d) => d !== domain)
                                  );
                                  setShowZeroHourWarning(false);
                                  setError(null);
                                }}
                              />
                              {domain}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Batch Details Table per Domain */}
                    {selectedDomains.filter(domain => domain !== "Tools").map((domain) => {
                      const tableData = table1DataByDomain[domain] || [];
                      // Ensure we compare numeric values. Use domain-level hours as the primary source
                      // for deciding whether hours are configured. This avoids showing the "No hours" warning
                      // when the domain has hours but individual rows may temporarily show 0 due to
                      // allocations from other phases.
                      const domainHours = Number(
                        getDomainHours(domain, currentPhase) || 0
                      );
                      const allNoHours =
                        domainHours === 0 ||
                        (tableData.length > 0 &&
                          tableData.every((row) => Number(row.hrs || 0) === 0));

                      return (
                        <div
                          key={domain}
                          className={`space-y-3 mt-4 border-l-4 pl-4 rounded-xl overflow-visible ${
                            DOMAIN_COLORS[domain] ||
                            "border-gray-300 bg-gray-50"
                          }`}
                        >
                          <div className="pb-2 border-b border-gray-200 flex items-center justify-between">
                            <div>
                              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                Batch & Trainer Assignment for
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                                    DOMAIN_COLORS[domain] ||
                                    "bg-gray-100 border-gray-300"
                                  }`}
                                >
                                  {domain}
                                </span>
                              </h2>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Configure batch details and assign trainers for{" "}
                                {domain}.
                              </p>
                            </div>
                          </div>
                          <div className=" border-b border-gray-100">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex gap-4">
                                <div className="bg-blue-50 px-1.5 py-0.5 rounded-xl border border-blue-200">
                                  <span className="text-xs text-blue-600 font-medium">Domain Total Hours</span>
                                  <span className="text-sm font-semibold text-blue-800 ml-1">{getDomainHours(domain, currentPhase)}</span>
                                </div>
                              </div>
                              {/* allocation UI removed */}
                            </div>
                          </div>

                          {allNoHours ? (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs font-semibold">
                              No hours configured for <b>{domain}</b>. Please
                              set hours in the training domain setup.
                            </div>
                          ) : (
                            <BatchDetailsTable
                              table1Data={tableData}
                              setTable1Data={(data) =>
                                setTable1DataByDomain((prev) => ({
                                  ...prev,
                                  [domain]: data,
                                }))
                              }
                              selectedDomain={domain}
                              topics={topics}
                              courses={courses}
                              getDomainHours={(d) =>
                                getDomainHours(d, currentPhase)
                              }
                              commonFields={commonFields}
                              canMergeBatches={canMergeBatches}
                              mainPhase={currentPhase}
                              onSwapTrainer={swapTrainers}
                              customHours={customPhaseHours[currentPhase]}
                              onValidationChange={handleValidationChange}
                              globalTrainerAssignments={
                                globalTrainerAssignments
                              }
                              excludeDays={excludeDays}
                              showPersistentWarnings={submitDisabled}
                              training={training}
                              currentTrainingAssignments={currentTrainingAssignmentsByDomain[domain]}
                            />
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Status Messages */}
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                    <div className="flex">
                      <div className="shrink-0">
                        <FiAlertCircle className="h-4 w-4 text-red-400" />
                      </div>
                      <div className="ml-2">
                        <h3 className="text-xs font-medium text-red-800">
                          {error}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="rounded-xl bg-green-50 border border-green-200 p-3">
                    <div className="flex">
                      <div className="shrink-0">
                        <FiCheck className="h-4 w-4 text-green-400" />
                      </div>
                      <div className="ml-2">
                        <h3 className="text-xs font-medium text-green-800">
                          {success}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}

                {/* Zero-hour domains warning with auto-deselect option */}
                {showZeroHourWarning && zeroHourDomains.length > 0 && (
                  <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-medium text-yellow-800 mb-1">
                          The following selected domain(s) have 0 configured
                          hours:
                        </div>
                        <div className="text-xs text-yellow-700 font-semibold">
                          {zeroHourDomains.join(", ")}
                        </div>
                        <div className="text-xs text-yellow-700 mt-2">
                          You can either configure hours for these domains or
                          auto-deselect them to continue.
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          type="button"
                          onClick={handleAutoDeselectZeroHourDomains}
                          disabled={deselectingZeroDomains}
                          className={`inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded-xl shadow-sm hover:bg-yellow-700 disabled:opacity-70`}
                        >
                          {deselectingZeroDomains ? (
                            <>
                              <FiClock className="animate-spin -ml-1 mr-2 h-4 w-4" />
                              Processing...
                            </>
                          ) : (
                            "Deselect and Continue"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowZeroHourWarning(false);
                            setZeroHourDomains([]);
                            setError(null);
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-yellow-200 bg-white text-yellow-700 text-xs font-medium rounded-xl"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Duplicate trainers validation error */}
                {hasValidationErrors() && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <FiAlertCircle className="h-4 w-4 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-xs font-medium text-red-800 mb-1">
                          Duplicate Trainer Assignments Detected
                        </h3>
                        <div className="text-xs text-red-700">
                          {Object.entries(validationByDomain).map(
                            ([domain, validation]) => {
                              if (!validation?.hasErrors) return null;
                              return (
                                <div key={domain} className="mb-4">
                                  <strong className="text-red-800">{domain} domain:</strong>
                                  <div className="mt-2 space-y-3">
                                    {validation.errors.map((error, index) => (
                                      <div key={index} className="bg-red-100 border border-red-200 rounded-xl p-2">
                                        <pre className="whitespace-pre-wrap text-xs text-red-800 font-mono">
                                          {error.message}
                                        </pre>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                          )}
                          <p className="mt-3 font-medium text-red-800 bg-red-100 border border-red-200 rounded-xl p-2">
                            Please remove duplicate assignments or modify
                            trainer details (dates, duration) before proceeding.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


              </form>
            </div>

            {/* Page Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 rounded-b-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Undo button - only show if there are changes */}
                  {hasChanges && (
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="inline-flex items-center px-3 py-1.5 border border-yellow-300 shadow-sm text-xs font-medium rounded-xl text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      disabled={loading}
                      title="Undo all changes and revert to original state"
                    >
                      <FiX className="w-3 h-3 mr-1" />
                      Undo Changes
                    </button>
                  )}
                  {/* Trainer Calendar button moved to InitiationDashboard */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || submitDisabled || !isChecklistComplete}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-xl shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <FiClock className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Processing...
                    </>
                  ) : (
                    !isChecklistComplete ? (
                      "Complete All Requirements to Submit"
                    ) : (
                      "Submit"
                    )
                  )}
                </button>
              </div>

              {/* Submission Requirements Checklist - Below buttons */}
              <div className="mt-4">
                <SubmissionChecklist
                  selectedPhases={selectedPhases}
                  selectedDomains={selectedDomains}
                  trainingStartDate={commonFields.trainingStartDate}
                  trainingEndDate={commonFields.trainingEndDate}
                  collegeStartTime={commonFields.collegeStartTime}
                  collegeEndTime={commonFields.collegeEndTime}
                  lunchStartTime={commonFields.lunchStartTime}
                  lunchEndTime={commonFields.lunchEndTime}
                  table1DataByDomain={table1DataByDomain}
                  hasValidationErrors={hasValidationErrors()}
                  onChecklistComplete={setIsChecklistComplete}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Trainer Calendar is opened from the Initiation Dashboard now */}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Remove Domain</h3>
            <p className="text-gray-600 mb-6 text-sm">Are you sure you want to remove "{domainToDelete}"? This will permanently delete all its data.</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium text-sm hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default InitiationModal;
