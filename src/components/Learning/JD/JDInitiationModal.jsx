import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../../../firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";
import {
  FiChevronLeft,
  FiCheck,
  FiAlertCircle,
  FiX,
} from "react-icons/fi";
import JDBatchTable from "./JDBatchTable";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import TrainingConfiguration from "../Initiate/TrainingConfiguration";
import SubmissionChecklist from "../Initiate/SubmissionChecklist";

const DOMAIN_OPTIONS = ["JD"];

const DOMAIN_COLORS = {
  JD: "border-blue-400 bg-blue-50",
};

function JDInitiationModal({ training, onClose, onConfirm, isMerged = false, selectedColleges = [], operationsConfig = null, onBack = null }) {
  const [table1DataByDomain, setTable1DataByDomain] = useState({});
  const [commonFields, setCommonFields] = useState({
    trainingStartDate: null,
    trainingEndDate: null,
    collegeStartTime: "",
    collegeEndTime: "",
    lunchStartTime: "",
    lunchEndTime: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [isChecklistComplete, setIsChecklistComplete] = useState(false);

  // Validation state for duplicate trainers
  const [validationByDomain, setValidationByDomain] = useState({});

  const { user } = useAuth();

  const [customPhaseHours, setCustomPhaseHours] = useState({});

  // Add missing state variables that BatchDetailsTable expects
  const [globalTrainerAssignments] = useState([]);
  const [excludeDays] = useState("None");

  const getDomainHours = useCallback(
    () => {
      // For JD training, use custom hours or default to 8
      return customPhaseHours["JD"] && customPhaseHours["JD"] !== "" ? Number(customPhaseHours["JD"]) : 8;
    },
    [customPhaseHours]
  );

  // Handle validation changes from JDBatchTable
  const handleValidationChange = useCallback((domain, validationStatus) => {
    setValidationByDomain((prev) => ({
      ...prev,
      [domain]: validationStatus,
    }));
  }, []);

  // Check if there are any validation errors across all domains
  const hasValidationErrors = () => {
    return Object.values(validationByDomain).some((status) => status.hasErrors);
  };

  const _table1DataByDomainMemo = useMemo(() => {
    if (!operationsConfig) return {};
    
    // For JD training, always use operationsConfig.batches
    const domainHours = getDomainHours();
    const totalStudents = operationsConfig.totalStudents;
    const numBatches = operationsConfig.batches.length;
    
    // Divide students evenly among batches with rounding
    const baseStudentsPerBatch = Math.floor(totalStudents / numBatches);
    const remainder = totalStudents % numBatches;
    
    const updated = {};
    updated["JD"] = operationsConfig.batches.map((batch, index) => {
      // Add 1 extra student to the first 'remainder' batches for even distribution
      const studentsForThisBatch = baseStudentsPerBatch + (index < remainder ? 1 : 0);
      
      return {
        batch: batch.name,
        stdCount: studentsForThisBatch,
        hrs: domainHours,
        assignedHours: 0,
        batches: [{
          batchPerStdCount: "",
          batchCode: batch.code,
          assignedHours: 0,
          trainers: [],
        }],
      };
    });
    return updated;
  }, [operationsConfig, getDomainHours]);

  useEffect(() => {
    // JD training doesn't need to fetch topics/courses - uses operations config
  }, []);

  // Always start fresh - no fetching of existing data
  useEffect(() => {
    // Always use operationsConfig for fresh data
    setTable1DataByDomain(_table1DataByDomainMemo);
  }, [_table1DataByDomainMemo]);

  useEffect(() => {
    if (isMerged) {
      // For merged training, domains are fixed to ["JD"]
    }
  }, [isMerged]);

  const validateForm = () => {
    if (!commonFields.trainingStartDate || !commonFields.trainingEndDate) {
      setError("Please select training start and end dates");
      return false;
    }

    if (!commonFields.collegeStartTime || !commonFields.collegeEndTime) {
      setError("Please enter college start and end times");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validateForm()) {
      setSubmitDisabled(true);
      return;
    }
    await submitInternal();
  };

  const submitInternal = async () => {
    setLoading(true);
    setError(null);
    try {
      if (user) {
        // For merged training, update all selected colleges
        if (isMerged && selectedColleges.length > 0) {
          const updatePromises = selectedColleges.map(college => 
            updateDoc(doc(db, "trainingForms", college.id), {
              assignedTo: {
                uid: user.uid,
                email: user.email,
                name: user.displayName || user.name || "Unknown",
              },
            })
          );
          await Promise.all(updatePromises);
        } else {
          // Original logic for single college
          const trainingDocRef = doc(db, "trainingForms", training.id);
          await updateDoc(trainingDocRef, {
            assignedTo: {
              uid: user.uid,
              email: user.email,
              name: user.displayName || user.name || "Unknown",
            },
          });
        }
      }

      const serializeTable1Data = (data) => {
        return data.map((row) => {
          let totalAssigned = 0;
          const cleanedRow = { ...row };
          cleanedRow.batches = (row.batches || []).map((batch) => {
            let batchAssigned = 0;
            const cleanedBatch = { ...batch };
            cleanedBatch.trainers = (batch.trainers || []).map((trainer) => {
              batchAssigned += Number(trainer.assignedHours || 0);
              return trainer;
            });
            cleanedBatch.assignedHours = batchAssigned;
            totalAssigned += batchAssigned;
            return cleanedBatch;
          });
          cleanedRow.assignedHours = totalAssigned;
          delete cleanedRow.hrs;
          return cleanedRow;
        });
      };

      const domainsList = ["JD"];
      let totalBatches = 0;
      let totalMaxHours = 0;
      let totalCost = 0;
      let totalTrainingHours = 0;
      const domainsArray = [];
      domainsList.forEach((domain) => {
        domainsArray.push(domain);
        const tableData = table1DataByDomain[domain] || [];
        tableData.forEach((row) => {
          if (row.batches) {
            totalBatches += row.batches.length;
            row.batches.forEach((batch) => {
              if (batch.trainers) {
                batch.trainers.forEach((trainer) => {
                  const assignedHours = Number(trainer.assignedHours || 0);
                  const perHourCost = Number(trainer.perHourCost || 0);
                  totalCost += assignedHours * perHourCost;
                  totalTrainingHours += assignedHours;
                });
              }
            });
          }
        });
      });
      totalMaxHours = totalTrainingHours;

      // Cost division logic - JD training is always merged across multiple colleges
      const perStudentCost = totalCost / operationsConfig.totalStudents;
      const collegeCosts = {};
      selectedColleges.forEach(college => {
        const collegeStudentCount = operationsConfig.collegeStudentCounts[college.id] || 0;
        collegeCosts[college.id] = perStudentCost * collegeStudentCount;
      });

      const savePromises = [];

      // Always save to each selected college (JD training is always merged)
      selectedColleges.forEach(college => {
        const phaseDocRef = doc(db, "trainingForms", college.id, "trainings", "JD");
        const phaseDocData = {
          createdAt: serverTimestamp(),
          createdBy: training.createdBy || {},
          collegeName: college.collegeName || "",
          ...commonFields,
          phase: "JD",
          status: "Initiated",
          domainsCount: domainsList.length,
          totalBatches,
          totalHours: totalMaxHours,
          totaltraininghours: totalTrainingHours,
          totalCost: collegeCosts[college.id], // College-specific cost
          domains: domainsArray,
          customHours: customPhaseHours["JD"] || "",
          updatedAt: serverTimestamp(),
          isMergedTraining: true,
          operationsConfig: operationsConfig,
          mergedColleges: selectedColleges.map(c => ({
            id: c.id,
            collegeName: c.collegeName,
            projectCode: c.projectCode,
            studentCount: operationsConfig.collegeStudentCounts[c.id] || 0,
            costShare: collegeCosts[c.id]
          })),
          batches: operationsConfig.batches
        };
        savePromises.push(setDoc(phaseDocRef, phaseDocData, { merge: true }));

        // Save domain subdocument
        const domainRef = doc(db, "trainingForms", college.id, "trainings", "JD", "domains", "JD");
        const domainData = {
          createdAt: serverTimestamp(),
          createdBy: training.createdBy || {},
          collegeName: college.collegeName || "",
          ...commonFields,
          phase: "JD",
          domain: "JD",
          domainHours: getDomainHours(),
          table1Data: serializeTable1Data(table1DataByDomain["JD"] || []),
          isMainPhase: true,
          allSelectedPhases: ["JD"],
          status: "Initiated",
          customHours: customPhaseHours["JD"] || "",
        };
        savePromises.push(setDoc(domainRef, domainData, { merge: true }));
      });

      await Promise.all(savePromises);

      // --- centralized trainerAssignments update (create one doc per trainer-date for JD training) ---
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

        // For JD training, we need to create a unique training ID that represents the merged training
        // Use the first college's ID as the base and add "-JD-merged" suffix
        const baseTrainingId = selectedColleges[0]?.id || training.id;
        const jdTrainingId = `${baseTrainingId}-JD-merged`;

        // 1) delete existing assignments for this JD training
        const prefix = `${jdTrainingId}`;
        const q = query(collection(db, "trainerAssignments"), where('__name__', '>=', prefix), where('__name__', '<', prefix + '\uf8ff'));
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // 2) collect new assignments from JD table data
        const assignments = [];
        const tableData = table1DataByDomain["JD"] || [];
        tableData.forEach((row, rowIdx) => {
          (row.batches || []).forEach((batch, batchIdx) => {
            (batch.trainers || []).forEach((tr, trainerIdx) => {
              if (!tr?.trainerId) return;
              let dateStrings = [];
              if (tr.activeDates && tr.activeDates.length > 0) {
                dateStrings = tr.activeDates
                  .map(normalizeDate)
                  .filter(Boolean);
              } else if (tr.startDate && tr.endDate) {
                // For JD training, we need to generate dates considering exclude days
                const startDate = new Date(tr.startDate);
                const endDate = new Date(tr.endDate);
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                  let current = new Date(startDate);
                  while (current <= endDate) {
                    const dayOfWeek = current.getDay();
                    let shouldInclude = true;

                    if (excludeDays === "Saturday" && dayOfWeek === 6) shouldInclude = false;
                    else if (excludeDays === "Sunday" && dayOfWeek === 0) shouldInclude = false;
                    else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) shouldInclude = false;

                    if (shouldInclude) {
                      dateStrings.push(current.toISOString().slice(0, 10));
                    }
                    current.setDate(current.getDate() + 1);
                  }
                }
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
                  sourceTrainingId: jdTrainingId,
                  domain: "JD",
                  batchCode: batch.batchCode || "",
                  collegeName: selectedColleges.map(c => c.collegeName).join(", ") || training.collegeName || "",
                  // Include source indices for traceability
                  sourceRowIndex: rowIdx,
                  sourceBatchIndex: batchIdx,
                  sourceTrainerIndex: trainerIdx,
                  createdAt: serverTimestamp(),
                });
              });
            });
          });
        });

        // 3) batch write new assignments with structured document IDs
        if (assignments.length > 0) {
          const wb = writeBatch(db);
          assignments.forEach((a) => {
            // Create structured document ID: {jdTrainingId}-{trainerId}-{date}
            const docId = `${jdTrainingId}-${a.trainerId}-${a.date}`;
            
            const ref = doc(db, "trainerAssignments", docId);
            wb.set(ref, a);
          });
          await wb.commit();
        } else {
          // no assignments to write
        }
      } catch (assignmentErr) {

        // don't block main save; surface a console warning
      }
      // --- end trainerAssignments update ---

      setSuccess(training?.isEdit ? "JD Training updated successfully!" : "JD Training initiated successfully!");
      setLoading(false);
      setTimeout(() => {
        if (onConfirm) onConfirm();
        if (onClose) onClose();
      }, 1500);
    } catch {
      // Error saving JD phase data - handled through UI error state
      setError("Failed to save JD phase data. Please try again.");
      setLoading(false);
    }
  };

  // const handleValidationChange = useCallback((domain, validationStatus) => {
  //   setValidationByDomain((prev) => ({
  //     ...prev,
  //     [domain]: validationStatus,
  //   }));
  // }, []);

  useEffect(() => {
    if (!error) {
      setSubmitDisabled(false);
    }
  }, [error, validationByDomain]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Page Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="mx-auto p-3">
            <div className="flex items-center justify-between">
              {/* Left: Back */}
              <div className="flex-1">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors text-xs font-medium"
                    disabled={loading}
                  >
                    <FiChevronLeft className="w-3 h-3 mr-1" />
                    Back to Operations
                  </button>
                )}
              </div>
              {/* Center: College Name */}
              <div className="flex-1 text-center">
                <h1 className="text-sm font-semibold text-gray-800 leading-tight">
                  {selectedColleges?.length > 0 ? (
                    <>
                      {selectedColleges.length === 1 
                        ? selectedColleges[0].collegeName 
                        : `${selectedColleges.length} Colleges`
                      }
                      {selectedColleges.length === 1 && (selectedColleges[0].projectCode) && (
                        <span className="ml-1 text-gray-500 font-normal">
                          ({selectedColleges[0].projectCode})
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500 font-normal">
                      JD Training Setup
                    </span>
                  )}
                </h1>
                <p className="mt-0.5 text-[10px] tracking-wide uppercase text-gray-400">
                  JD Training Initiation
                </p>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Page Content */}
            <div className="p-3">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Selected Colleges Summary */}
                <div className="space-y-3">
                  <div className="pb-2 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">
                      Selected Colleges for JD Training
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                      Configure training details for merged colleges ({selectedColleges?.length || 0} colleges)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                    {selectedColleges.map((college) => (
                      <span
                        key={college.id}
                        className="flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium"
                      >
                        {college.collegeName}
                        {college.projectCode && (
                          <span className="ml-1 text-gray-600">
                            ({college.projectCode})
                          </span>
                        )}
                        <button
                          type="button"
                          className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none"
                          onClick={() =>
                            // Note: In a real implementation, you might want to allow removing colleges
                            // but for now, we'll keep them as read-only
                            null
                          }
                          aria-label={`College ${college.collegeName}`}
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
                    ?? Trainer costs will be divided equally among these {selectedColleges.length} colleges
                  </div>
                </div>

                <TrainingConfiguration
                  commonFields={commonFields}
                  setCommonFields={setCommonFields}
                  selectedPhases={["JD"]}
                  phase2Dates={{}}
                  phase3Dates={{}}
                  setPhase2Dates={() => {}}
                  setPhase3Dates={() => {}}
                  getMainPhase={() => "JD"}
                />

                {/* Training Domain + Batch Details */}
                <div className="space-y-3">
                  <div className="pb-2 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">
                      Training Domains
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      JD domain configuration for this training program.
                    </p>
                  </div>
                  {/* JD Domain Display */}
                  <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                    <span className="flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                      JD
                      <span className="ml-1 text-blue-600">
                        (Fixed domain for JD training)
                      </span>
                    </span>
                  </div>
                  
                  {/* Custom Hours Input for JD Phase */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Hours per Domain (Optional)
                    </label>
                    <p className="text-xs text-gray-600 mb-3">
                      Set custom hours for JD domain. Leave empty to use default 8 hours.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={customPhaseHours["JD"] || ""}
                        onChange={(e) => setCustomPhaseHours({ ...customPhaseHours, "JD": e.target.value })}
                        placeholder="Enter hours"
                        className="w-32 h-8 rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm px-2 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-sm text-gray-600">hours per domain</span>
                    </div>
                  </div>
                </div>

                {/* Batch Details Table for JD */}
                <div className="space-y-3 mt-4 border-l-4 border-blue-400 bg-blue-50 pl-4 rounded overflow-visible">
                  <div className="pb-2 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        Batch & Trainer Assignment for
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-100 border-blue-300">
                          JD
                        </span>
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Configure batch details and assign trainers for JD training.
                      </p>
                    </div>
                  </div>
                  <div className="border-b border-gray-100">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          <span className="text-xs text-blue-600 font-medium">Domain Total Hours</span>
                          <span className="text-sm font-semibold text-blue-800 ml-1">{getDomainHours()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <JDBatchTable
                    table1Data={table1DataByDomain["JD"] || []}
                    setTable1Data={(data) =>
                      setTable1DataByDomain((prev) => ({
                        ...prev,
                        "JD": data,
                      }))
                    }
                    commonFields={commonFields}
                    globalTrainerAssignments={globalTrainerAssignments}
                    excludeDays={excludeDays}
                    onValidationChange={handleValidationChange}
                    selectedDomain="JD"
                  />
                </div>

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
                          {Object.entries(validationByDomain).map(
                            ([domain, validation]) => {
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
                            }
                          )}
                          <p className="mt-2 font-medium">
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
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 rounded-b-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
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
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
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
                      "Submit JD Training"
                    )
                  )}
                </button>
              </div>

              {/* Submission Requirements Checklist - Below buttons */}
              <div className="mt-4">
                <SubmissionChecklist
                  selectedPhases={["JD"]}
                  selectedDomains={["JD"]}
                  trainingStartDate={commonFields.trainingStartDate ? 
                    (commonFields.trainingStartDate instanceof Date ? 
                      commonFields.trainingStartDate.toISOString().split('T')[0] : 
                      commonFields.trainingStartDate) : 
                    ""}
                  trainingEndDate={commonFields.trainingEndDate ? 
                    (commonFields.trainingEndDate instanceof Date ? 
                      commonFields.trainingEndDate.toISOString().split('T')[0] : 
                      commonFields.trainingEndDate) : 
                    ""}
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
    </>
  );
}

export default JDInitiationModal;
