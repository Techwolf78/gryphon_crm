import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  getDocs,
  collection as fbCollection,
  collection,
} from "firebase/firestore";
import {
  FiChevronLeft,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiX,
} from "react-icons/fi";
import BatchDetailsTable from "./BatchDetailsTable";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "rc-time-picker/assets/index.css";

// helper: generate time options in HH:mm at given step (15 minutes)
function generateTimeOptions(step = 15) {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      opts.push(`${hh}:${mm}`);
    }
  }
  return opts;
}
const TIME_OPTIONS = generateTimeOptions(15);

const PHASE_OPTIONS = ["phase-1", "phase-2", "phase-3"];
const DOMAIN_OPTIONS = ["Technical", "Soft skills", "Aptitude", "Tools"];

// Add a color for each domain for visual clarity
const DOMAIN_COLORS = {
  Technical: "border-blue-400 bg-blue-50",
  "Soft skills": "border-green-400 bg-green-50",
  Aptitude: "border-purple-400 bg-purple-50",
  Tools: "border-yellow-400 bg-yellow-50",
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

  // Get domain hours - use custom hours if set, otherwise default from database
  const getDomainHours = useCallback((domain, phase = null) => {
    if (phase && customPhaseHours[phase] && customPhaseHours[phase] !== "") {
      return Number(customPhaseHours[phase]);
    }
    if (!domain) return 0;
    const topicMap = {
      Technical: "Domain Technical",
      NonTechnical: "Soft Skills",
      "Soft skills": "Soft Skills",
      Aptitude: "Aptitude",
      Tools: "Tools",
    };
    const topicName = topicMap[domain] || domain;
    const topicObj = topics?.find(
      (t) => t?.topic?.trim()?.toLowerCase() === topicName?.toLowerCase()
    );
    return topicObj?.hours || 0;
  }, [customPhaseHours, topics]);

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
      }
    };
    fetchTrainingDetails();
  }, [training]);

  // Auto-generate table1Data for new domains
  useEffect(() => {
    if (courses.length === 0 || topics.length === 0) return;
    setTable1DataByDomain((prev) => {
      const updated = { ...prev };
      selectedDomains.forEach((domain) => {
        if (!updated[domain] || updated[domain].length === 0) {
          const domainHours = getDomainHours(domain, getMainPhase());
          updated[domain] = courses.map((course) => ({
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
      return updated;
    });
  }, [selectedDomains, courses, topics, getDomainHours, getMainPhase]);

  // Allocation logic removed — table rows are managed by domain hours and loaded data

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
    if (selectedPhases.length === 0) {
      setError("Please select at least one phase");
      return false;
    }
    if (selectedDomains.length === 0) {
      setError("Please select at least one domain");
      return false;
    }
    if (!commonFields.trainingStartDate || !commonFields.trainingEndDate) {
      setError("Please select training start and end dates");
      return false;
    }
    if (!commonFields.collegeStartTime || !commonFields.collegeEndTime) {
      setError("Please enter college start and end times");
      return false;
    }

    // Detect selected domains that have zero configured hours
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

    return true;
  };

  // Extracted save logic so callers (auto-deselect) can pass computed domains/table data
  const submitInternal = async (domainsToSave = null, tableDataToSave = null) => {
    setLoading(true);
    setError(null);
    try {
      const serializeTable1Data = (data) => {
        return data.map((row) => ({
          ...row,
          batches: (row.batches || []).map((batch) => ({
            ...batch,
            trainers: (batch.trainers || []).map((trainer) => ({
              ...trainer,
              mergedBreakdown: trainer.mergedBreakdown || [],
              activeDates: (trainer.activeDates || []).map((date) =>
                typeof date === "string"
                  ? date
                  : date?.toISOString?.().slice(0, 10) || ""
              ),
            })),
          })),
        }));
      };

      const mainPhase = getMainPhase();

      const phaseLevelPromises = selectedPhases.map((phase) => {
        const phaseDocRef = doc(db, "trainingForms", training.id, "trainings", phase);
        const phaseDocData = {
          createdAt: serverTimestamp(),
          createdBy: training.createdBy || {},
          ...commonFields,
          phase,
        };
        if (phase === "phase-2") phaseDocData.phase2Dates = phase2Dates;
        if (phase === "phase-3") phaseDocData.phase3Dates = phase3Dates;
        if (phase2Dates?.startDate && phase === "phase-2") {
          phaseDocData.trainingStartDate = phase2Dates.startDate;
        }
        if (phase2Dates?.endDate && phase === "phase-2") {
          phaseDocData.trainingEndDate = phase2Dates.endDate;
        }
        if (phase3Dates?.startDate && phase === "phase-3") {
          phaseDocData.trainingStartDate = phase3Dates.startDate;
        }
        if (phase3Dates?.endDate && phase === "phase-3") {
          phaseDocData.trainingEndDate = phase3Dates.endDate;
        }
        return setDoc(phaseDocRef, phaseDocData, { merge: true });
      });

      // Use provided domain list (if any) to avoid setState race when auto-deselecting
      const domainsList = Array.isArray(domainsToSave) ? domainsToSave : selectedDomains;
      const tableDataLookup = tableDataToSave || table1DataByDomain;
      const batchPromises = domainsList.map(async (domain) => {
        let phaseData = {
          createdAt: serverTimestamp(),
          createdBy: training.createdBy || {},
          ...commonFields,
          phase: mainPhase,
          domain,
          domainHours: getDomainHours(domain, mainPhase),
          table1Data: serializeTable1Data(tableDataLookup[domain] || []),
          isMainPhase: true,
          customHours: customPhaseHours[mainPhase] || "",
          allSelectedPhases: selectedPhases,
        };
        if (mainPhase === "phase-2") {
          phaseData.phase2Dates = phase2Dates;
          if (phase2Dates?.startDate) phaseData.trainingStartDate = phase2Dates.startDate;
          if (phase2Dates?.endDate) phaseData.trainingEndDate = phase2Dates.endDate;
        }
        if (mainPhase === "phase-3") {
          phaseData.phase3Dates = phase3Dates;
          if (phase3Dates?.startDate) phaseData.trainingStartDate = phase3Dates.startDate;
          if (phase3Dates?.endDate) phaseData.trainingEndDate = phase3Dates.endDate;
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
        return setDoc(domainRef, phaseData, { merge: true });
      });

      await Promise.all([...phaseLevelPromises, ...batchPromises]);

      setSuccess("Training phases initiated successfully!");
      setLoading(false);
      setTimeout(() => {
        const finalDomains = Array.isArray(domainsToSave) ? domainsToSave : selectedDomains;
        const finalTableData = tableDataToSave || table1DataByDomain;
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
      console.error("Error saving phase data:", err);
      setError("Failed to save phase data. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validateForm()) return;
    await submitInternal();
  };

  const handleAutoDeselectZeroHourDomains = async () => {
    if (!zeroHourDomains || zeroHourDomains.length === 0) return;
    try {
      setDeselectingZeroDomains(true);
      // compute new selections synchronously to avoid setState timing issues
      const newSelectedDomains = selectedDomains.filter((d) => !zeroHourDomains.includes(d));
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
    setValidationByDomain(prev => ({
      ...prev,
      [domain]: validationStatus
    }));
  }, []);

  // Check if there are any validation errors across all domains
  const hasValidationErrors = () => {
    return Object.values(validationByDomain).some(validation => validation?.hasErrors);
  };

  const canProceedToNextStep = () => !hasValidationErrors();

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

  // Load all domains for the current phase
  useEffect(() => {
    if (!training?.id || !currentPhase) return;

    const fetchPhaseDomains = async () => {
      const domainsSnap = await getDocs(
        collection(db, "trainingForms", training.id, "trainings", currentPhase, "domains")
      );
      const loadedDomains = [];
      const loadedTable1Data = {};

      // helper to sum assigned hours in a saved row
      const sumAssignedInRow = (row) => {
        let sum = 0;
        if (row.assignedHours) sum += Number(row.assignedHours || 0);
        if (row.batches && row.batches.length > 0) {
          row.batches.forEach((b) => {
            sum += Number(b.assignedHours || 0);
            // trainers' assignedHours are usually part of batch-level allocation, skip to avoid double-counting
          });
        }
        return sum;
      };

      // For each domain in the current phase, also load other phases to compute already-used hours
      domainsSnap.forEach((docSnap) => {
        loadedDomains.push(docSnap.id);
      });

      for (const domain of loadedDomains) {
        const currentDoc = await getDoc(
          doc(db, "trainingForms", training.id, "trainings", currentPhase, "domains", domain)
        );
        const currentData = currentDoc.exists() ? currentDoc.data() : null;

        // compute used hours across other phases for each specialization
        const usedBySpec = {}; // specialization -> usedHours
        for (const phase of PHASE_OPTIONS) {
          if (phase === currentPhase) continue; // we only want prior/other phases' usage
          const otherDoc = await getDoc(
            doc(db, "trainingForms", training.id, "trainings", phase, "domains", domain)
          );
          if (!otherDoc.exists()) continue;
          const otherData = otherDoc.data();
          const rows = otherData.table1Data || [];
          rows.forEach((r) => {
            const spec = r.batch || r.specialization || "";
            const used = sumAssignedInRow(r);
            usedBySpec[spec] = (usedBySpec[spec] || 0) + Number(used || 0);
          });
        }

        // Build the table data for this domain taking into account used hours
        const rowsForDomain = (currentData?.table1Data || []).map((row) => {
          const spec = row.batch || row.specialization || "";
          const totalDomainHours = getDomainHours(domain) || 0; // domain-level total
          const used = Number(usedBySpec[spec] || 0);
          const remaining = Math.max(0, totalDomainHours - used);

          // Adjust row.hrs and batches assignedHours to not exceed remaining
          const adjustedBatches = (row.batches || []).map((b) => ({
            ...b,
            assignedHours: Math.min(Number(b.assignedHours || 0), remaining),
          }));

          return {
            ...row,
            hrs: remaining,
            assignedHours: Math.min(Number(row.assignedHours || 0), remaining),
            batches: adjustedBatches,
          };
        });

        // if there is no table data in current phase but courses exist, fallback to auto-generated rows
        if ((!rowsForDomain || rowsForDomain.length === 0) && courses.length > 0) {
          const domainHours = getDomainHours(domain, currentPhase);
          loadedTable1Data[domain] = courses.map(course => ({
            batch: course.specialization,
            stdCount: course.students,
            hrs: Math.max(0, domainHours - (usedBySpec[course.specialization] || 0)),
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
        } else {
          loadedTable1Data[domain] = rowsForDomain;
        }
      }

      setSelectedDomains(loadedDomains);
      setTable1DataByDomain(loadedTable1Data);
    };
    fetchPhaseDomains();
  }, [training?.id, currentPhase, courses, getDomainHours]);

  const swapTrainers = (swapData) => {
    console.log("🔄 [INITIATION MODAL] swapTrainers called with:", {
      swapData: swapData,
      selectedDomainsLength: selectedDomains.length,
      table1DataByDomainKeys: Object.keys(table1DataByDomain),
    });
    
    if (!swapData || !swapData.source || !swapData.target) {
      console.error("❌ [INITIATION MODAL] Missing swap data:", { swapData });
      return;
    }

    const { source, target, domain } = swapData;

    // Use the domain from swapData or fallback to first selected domain
    const currentDomain = domain || selectedDomains[0];
    
    console.log("🔄 [INITIATION MODAL] Processing cross-batch swap for domain:", {
      currentDomain,
      sourceTrainer: source.trainerData?.trainerName,
      targetTrainer: target.trainerData?.trainerName,
      sourceOriginalBatch: table1DataByDomain[currentDomain]?.[source.rowIdx]?.batch,
      targetOriginalBatch: table1DataByDomain[currentDomain]?.[target.rowIdx]?.batch,
    });
    
    if (!table1DataByDomain[currentDomain]) {
      console.error("❌ [INITIATION MODAL] No table data found for domain:", currentDomain);
      return;
    }

    // Get current domain's table data
    const currentDomainData = [...table1DataByDomain[currentDomain]];
    
    // Validate that the indices exist
    if (!currentDomainData[source.rowIdx] || 
        !currentDomainData[source.rowIdx].batches[source.batchIdx]) {
      console.error("❌ [INITIATION MODAL] Invalid source batch path:", source);
      return;
    }

    if (!currentDomainData[target.rowIdx] || 
        !currentDomainData[target.rowIdx].batches[target.batchIdx]) {
      console.error("❌ [INITIATION MODAL] Invalid target batch path:", target);
      return;
    }

    console.log("🔄 [INITIATION MODAL] Performing CROSS-BATCH trainer swap...");

    // CROSS-BATCH SWAP: Create trainers for opposite batches
    const sourceNewTrainer = {
      ...source.trainerData,
      dayDuration: source.newTimeSlot
    };

    const targetNewTrainer = {
      ...target.trainerData,
      dayDuration: target.newTimeSlot
    };

    console.log("🔄 [INITIATION MODAL] Cross-batch swap details:", {
      sourceTrainerMoving: {
        name: sourceNewTrainer.trainerName,
        fromBatch: currentDomainData[source.rowIdx].batch,
        toBatch: currentDomainData[target.rowIdx].batch,
        originalTimeSlot: source.trainerData.dayDuration,
        newTimeSlot: sourceNewTrainer.dayDuration,
      },
      targetTrainerMoving: {
        name: targetNewTrainer.trainerName,
        fromBatch: currentDomainData[target.rowIdx].batch,
        toBatch: currentDomainData[source.rowIdx].batch,
        originalTimeSlot: target.trainerData.dayDuration,
        newTimeSlot: targetNewTrainer.dayDuration,
      }
    });

    // CROSS-BATCH SWAP: Add source trainer to TARGET batch, target trainer to SOURCE batch
    currentDomainData[target.rowIdx].batches[target.batchIdx].trainers.push(sourceNewTrainer);
    currentDomainData[source.rowIdx].batches[source.batchIdx].trainers.push(targetNewTrainer);

    console.log("✅ [INITIATION MODAL] Cross-batch trainers added successfully:", {
      sourceTrainerAddedTo: `${currentDomainData[target.rowIdx].batch} batch (${currentDomainData[target.rowIdx].batches[target.batchIdx].batchCode})`,
      targetTrainerAddedTo: `${currentDomainData[source.rowIdx].batch} batch (${currentDomainData[source.rowIdx].batches[source.batchIdx].batchCode})`,
      sourceBatchTrainerCount: currentDomainData[source.rowIdx].batches[source.batchIdx].trainers.length,
      targetBatchTrainerCount: currentDomainData[target.rowIdx].batches[target.batchIdx].trainers.length,
    });

    // Update the state with the modified data
    setTable1DataByDomain(prev => {
      const newState = {
        ...prev,
        [currentDomain]: currentDomainData
      };
      
      console.log("📊 [INITIATION MODAL] table1DataByDomain updated with cross-batch swap:", {
        domain: currentDomain,
        crossBatchSwapCompleted: {
          sourceBatch: {
            batchCode: newState[currentDomain][source.rowIdx].batches[source.batchIdx].batchCode,
            trainerCount: newState[currentDomain][source.rowIdx].batches[source.batchIdx].trainers.length,
            specialization: newState[currentDomain][source.rowIdx].batch,
          },
          targetBatch: {
            batchCode: newState[currentDomain][target.rowIdx].batches[target.batchIdx].batchCode,
            trainerCount: newState[currentDomain][target.rowIdx].batches[target.batchIdx].trainers.length,
            specialization: newState[currentDomain][target.rowIdx].batch,
          }
        }
      });
      
      return newState;
    });

    console.log("✅ [INITIATION MODAL] Cross-batch trainer swap completed successfully - trainers swapped batches and time slots");
  };

  useEffect(() => {
    console.log("Updated trainingStartDate in state:", commonFields.trainingStartDate);
    console.log("Updated trainingEndDate in state:", commonFields.trainingEndDate);
  }, [commonFields.trainingStartDate, commonFields.trainingEndDate]);

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
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Page Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="mx-auto p-3 ">
            <div className="flex justify-between items-start">
              <div>
                <button
                  onClick={onClose}
                  className="mb-1 flex items-center text-blue-600 hover:text-blue-800 transition-colors text-xs"
                  disabled={loading}
                >
                  <FiChevronLeft className="w-3 h-3 mr-1" />
                  Back to Training List
                </button>
                <h1 className="text-lg font-bold text-gray-900">
                  Initiate Training
                </h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  {training?.collegeName} • {training?.collegeCode}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto py-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Page Content */}
            <div className="p-3">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Phase Selection */}
                <div className="space-y-3">
                  <div className="pb-2 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">
                      Select Training Phases
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Choose which phases you want to initiate for this training program.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {/* Left: Phase Selection */}
                    <div>
                      <div className="flex flex-row space-x-2">
                        {PHASE_OPTIONS.map((phase) => (
                          <div
                            key={phase}
                            onClick={() => handlePhaseChange(phase)}
                            className={`flex items-center px-2 py-1.5 rounded border cursor-pointer text-xs font-medium transition-all
                              ${selectedPhases.includes(phase)
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-200 bg-white hover:border-gray-300"}
                            `}
                            style={{ maxWidth: 120 }}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-2
                                ${selectedPhases.includes(phase)
                                  ? "bg-blue-500 border-blue-500"
                                  : "bg-white border-gray-300"}
                            `}
                            >
                              {selectedPhases.includes(phase) && (
                                <FiCheck className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="capitalize">{phase.replace("-", " ")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Right: Start/End Date */}
                    <div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">
                            Start Date
                          </label>
                          <DatePicker
                            selected={
                              commonFields.trainingStartDate
                                ? new Date(commonFields.trainingStartDate + "T00:00:00")
                                : null
                            }
                            onChange={(date) => {
                              setCommonFields({
                                ...commonFields,
                                trainingStartDate: date
                                  ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                  : "",
                              });
                            }}
                            dateFormat="yyyy-MM-dd"
                            placeholderText="Select date"
                            /* changed: fixed width and height */
                            className="w-56 h-10 rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs px-2"
                            calendarClassName="small-datepicker"
                            popperClassName="small-datepicker-popper"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">
                            End Date
                          </label>
                          <DatePicker
                            selected={
                              commonFields.trainingEndDate
                                ? new Date(commonFields.trainingEndDate + "T00:00:00")
                                : null
                            }
                            onChange={(date) => {
                              setCommonFields({
                                ...commonFields,
                                trainingEndDate: date
                                  ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                  : "",
                              });
                            }}
                            dateFormat="yyyy-MM-dd"
                            placeholderText="Select date"
                            className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                            calendarClassName="small-datepicker"
                            popperClassName="small-datepicker-popper"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Training Configuration */}
                <div className="space-y-3">
                  <div className="pb-2 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">
                      Training Configuration
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Set up the basic timing and schedule configuration for the training.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        College Start Time
                      </label>
                      <select
                        value={commonFields.collegeStartTime || ""}
                        onChange={(e) =>
                          setCommonFields({
                            ...commonFields,
                            collegeStartTime: e.target.value,
                          })
                        }
                      >
                        <option value="">Select time</option>
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        College End Time
                      </label>
                      <select
                        value={commonFields.collegeEndTime || ""}
                        onChange={(e) =>
                          setCommonFields({
                            ...commonFields,
                            collegeEndTime: e.target.value,
                          })
                        }
                      >
                        <option value="">Select time</option>
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Lunch Start Time
                      </label>
                      <select
                        value={commonFields.lunchStartTime || ""}
                        onChange={(e) =>
                          setCommonFields({
                            ...commonFields,
                            lunchStartTime: e.target.value,
                          })
                        }
                      >
                        <option value="">Select time</option>
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Lunch End Time
                      </label>
                      <select
                        value={commonFields.lunchEndTime || ""}
                        onChange={(e) =>
                          setCommonFields({
                            ...commonFields,
                            lunchEndTime: e.target.value,
                          })
                        }
                      >
                        <option value="">Select time</option>
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Phase 2 and Phase 3 Dates in Same Row */}
                  {(selectedPhases.includes("phase-2") || selectedPhases.includes("phase-3")) &&
                    selectedPhases.length > 1 && (
                      <div className="space-y-2 pt-2 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Phase 2 Dates */}
                          {selectedPhases.includes("phase-2") && getMainPhase() !== "phase-2" && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                Phase 2 Dates
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                                    Phase 2 Start Date
                                  </label>
                                  <input
                                    type="date"
                                    value={phase2Dates.startDate || ""}
                                    onChange={(e) =>
                                      setPhase2Dates({
                                        ...phase2Dates,
                                        startDate: e.target.value,
                                      })
                                    }
                                    className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                                    Phase 2 End Date
                                  </label>
                                  <input
                                    type="date"
                                    value={phase2Dates.endDate || ""}
                                    onChange={(e) =>
                                      setPhase2Dates({
                                        ...phase2Dates,
                                        endDate: e.target.value,
                                      })
                                    }
                                    className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Phase 3 Dates */}
                          {selectedPhases.includes("phase-3") && getMainPhase() !== "phase-3" && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                Phase 3 Dates
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                                    Phase 3 Start Date
                                  </label>
                                  <input
                                    type="date"
                                    value={phase3Dates?.startDate || ""}
                                    onChange={(e) =>
                                      setPhase3Dates({
                                        ...phase3Dates,
                                        startDate: e.target.value,
                                      })
                                    }
                                    className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                                    Phase 3 End Date
                                  </label>
                                  <input
                                    type="date"
                                    value={phase3Dates?.endDate || ""}
                                    onChange={(e) =>
                                      setPhase3Dates({
                                        ...phase3Dates,
                                        endDate: e.target.value,
                                      })
                                    }
                                    className="w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>

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
                      <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                        {selectedDomains.length === 0 && (
                          <span className="text-xs text-gray-400">No domains selected</span>
                        )}
                        {selectedDomains.map(domain => (
                          <span
                            key={domain}
                            className="flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium"
                          >
                            {domain}
                            <button
                              type="button"
                              className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none"
                              onClick={() =>
                                setSelectedDomains(selectedDomains.filter(d => d !== domain))
                              }
                              aria-label={`Remove ${domain}`}
                            >
                              <FiX className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      {/* Checkbox list for all domains in a single row */}
                      <div className="flex flex-row gap-3">
                        {DOMAIN_OPTIONS.map(domain => {
                          const isSelected = selectedDomains.includes(domain);
                          const isZero = zeroHourDomains.includes(domain);
                          // highlight classes for zero-hour domains
                          const zeroClasses = isZero
                            ? "ring-2 ring-yellow-400 bg-yellow-50 text-yellow-800 border-yellow-300 animate-pulse"
                            : "";
                          return (
                            <label
                              key={domain}
                              title={isZero ? "This domain has 0 configured hours" : undefined}
                              className={`flex items-center px-2 py-1 rounded cursor-pointer text-xs transition
                                ${isSelected
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"}
                                ${zeroClasses}
                              `}
                            >
                              <input
                                type="checkbox"
                                className="mr-2 accent-blue-600"
                                checked={isSelected}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedDomains([...selectedDomains, domain]);
                                    setTable1DataByDomain(prev => ({
                                      ...prev,
                                      [domain]: prev[domain] || [],
                                    }));
                                  } else {
                                    setSelectedDomains(selectedDomains.filter(d => d !== domain));
                                  }
                                  // clear any previous zero-hour marks for this domain on user action
                                  setZeroHourDomains(prev => prev.filter(d => d !== domain));
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
                    {selectedDomains.map(domain => {
                      const tableData = table1DataByDomain[domain] || [];
                      const allNoHours = tableData.length > 0 && tableData.every(row => row.hrs === 0);

                      return (
                        <div
                          key={domain}
                          className={`space-y-3 mt-4 border-l-4 pl-4 rounded ${DOMAIN_COLORS[domain] || "border-gray-300 bg-gray-50"}`}
                        >
                          <div className="pb-2 border-b border-gray-200 flex items-center justify-between">
                            <div>
                              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                Batch & Trainer Assignment for
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase ${DOMAIN_COLORS[domain] || "bg-gray-100 border-gray-300"}`}
                                >
                                  {domain}
                                </span>
                              </h2>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Configure batch details and assign trainers for {domain}.
                              </p>
                            </div>
                          </div>
                          <div className=" border-b border-gray-100">
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-xs text-gray-700">
                                Domain total hours: <span className="font-semibold">{getDomainHours(domain, currentPhase)}</span>
                              </div>
                              {/* allocation UI removed */}
                            </div>
                          </div>

                          {allNoHours ? (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs font-semibold">
                              No hours configured for <b>{domain}</b>. Please set hours in the training domain setup.
                            </div>
                          ) : (
                            <BatchDetailsTable
                              table1Data={tableData}
                              setTable1Data={data =>
                                setTable1DataByDomain(prev => ({ ...prev, [domain]: data }))
                              }
                              selectedDomain={domain}
                              topics={topics}
                              courses={courses}
                              getDomainHours={d => getDomainHours(d, currentPhase)}
                              commonFields={commonFields}
                              canMergeBatches={canMergeBatches}
                              mainPhase={currentPhase}
                              onSwapTrainer={swapTrainers}
                              customHours={customPhaseHours[currentPhase]}
                              onValidationChange={(validationStatus) => handleValidationChange(domain, validationStatus)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Status Messages */}
                {error && (
                  <div className="rounded bg-red-50 border border-red-200 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
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
                  <div className="rounded bg-green-50 border border-green-200 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
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
                  <div className="rounded bg-yellow-50 border border-yellow-200 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-medium text-yellow-800 mb-1">
                          The following selected domain(s) have 0 configured hours:
                        </div>
                        <div className="text-xs text-yellow-700 font-semibold">
                          {zeroHourDomains.join(", ")}
                        </div>
                        <div className="text-xs text-yellow-700 mt-2">
                          You can either configure hours for these domains or auto-deselect them to continue.
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          type="button"
                          onClick={handleAutoDeselectZeroHourDomains}
                          disabled={deselectingZeroDomains}
                          className={`inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded shadow-sm hover:bg-yellow-700 disabled:opacity-70`}
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
                          className="inline-flex items-center px-3 py-1.5 border border-yellow-200 bg-white text-yellow-700 text-xs font-medium rounded"
                        >
                          Cancel
                        </button>
                       </div>
                     </div>
                   </div>
                 )}

                {/* Duplicate trainers validation error */}
                {hasValidationErrors() && (
                  <div className="rounded bg-red-50 border border-red-200 p-3">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <FiAlertCircle className="h-4 w-4 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-xs font-medium text-red-800 mb-1">
                          Duplicate Trainer Assignments Detected
                        </h3>
                        <div className="text-xs text-red-700">
                          {Object.entries(validationByDomain).map(([domain, validation]) => {
                            if (!validation?.hasErrors) return null;
                            return (
                              <div key={domain} className="mb-2">
                                <strong>{domain} domain:</strong>
                                <ul className="list-disc ml-4 mt-1">
                                  {validation.errors.map((error, index) => (
                                    <li key={index}>{error.message}</li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                          <p className="mt-2 font-medium">
                            Please remove duplicate assignments or modify trainer details (dates, duration) before proceeding.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Page Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 rounded-b-lg">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !canProceedToNextStep()}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <FiClock className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Processing...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default InitiationModal;