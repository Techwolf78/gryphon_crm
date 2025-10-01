import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../../../firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  updateDoc,
  collection,
  getDocs,
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
import TrainingConfiguration from "./TrainingConfiguration";
import SubmissionChecklist from "./SubmissionChecklist";

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
  // const [validationByDomain, setValidationByDomain] = useState({});

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

  useEffect(() => {
    // JD training doesn't need to fetch topics/courses - uses operations config
  }, []);

  // Load existing JD phase data when editing
  useEffect(() => {
    const fetchExistingJDPhase = async () => {
      if (!training?.id || !training?.isEdit) return;
      
      const jdPhaseRef = doc(db, "trainingForms", training.id, "trainings", "JD");
      const jdPhaseSnap = await getDoc(jdPhaseRef);
      
      if (jdPhaseSnap.exists()) {
        const jdPhaseData = jdPhaseSnap.data();
        
        // Helper function to convert Firestore Timestamp to Date object for form
        const convertTimestampToDate = (timestamp) => {
          if (!timestamp) return null;
          if (timestamp instanceof Date) return timestamp;
          if (typeof timestamp === 'string') return new Date(timestamp);
          if (timestamp && typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
          }
          return null;
        };
        
        // Load common fields from existing JD phase
        setCommonFields({
          trainingStartDate: convertTimestampToDate(jdPhaseData.trainingStartDate),
          trainingEndDate: convertTimestampToDate(jdPhaseData.trainingEndDate),
          collegeStartTime: jdPhaseData.collegeStartTime || "",
          collegeEndTime: jdPhaseData.collegeEndTime || "",
          lunchStartTime: jdPhaseData.lunchStartTime || "",
          lunchEndTime: jdPhaseData.lunchEndTime || "",
        });
        
        // Load custom hours if available
        if (jdPhaseData.customHours) {
          setCustomPhaseHours({ "JD": jdPhaseData.customHours });
        }
        
        // For merged training, domains are fixed to ["JD"]
        if (isMerged) {
          // No need to set selectedDomains
        } else {
          // Load domains from existing JD phase
          const domainsSnap = await getDocs(
            collection(db, "trainingForms", training.id, "trainings", "JD", "domains")
          );
          
          const loadedDomains = [];
          const loadedTable1Data = {};
          
          domainsSnap.forEach((docSnap) => {
            const domainId = docSnap.id;
            const domainData = docSnap.data();
            loadedDomains.push(domainId);
            loadedTable1Data[domainId] = domainData.table1Data || [];
          });
          
          // No need to set selectedDomains
          setTable1DataByDomain(loadedTable1Data);
        }
      }
    };
    
    fetchExistingJDPhase();
  }, [training?.id, training?.isEdit, isMerged]);

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
  }, [error]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              JD Training Initiation - Merged Colleges ({selectedColleges?.length || 0} colleges)
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={onBack}
                disabled={!onBack}
                className={`flex items-center px-3 py-1 rounded text-sm font-medium transition-colors ${
                  onBack 
                    ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' 
                    : 'text-gray-400 cursor-not-allowed'
                }`}
                title={onBack ? "Back to Operations" : "Back button not available"}
              >
                <FiChevronLeft className="w-4 h-4 mr-1" />
                Back
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Training Domains
              </label>
              <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded">
                <span className="text-sm font-medium text-blue-900">JD</span>
                <span className="text-xs text-blue-700">(Fixed domain for JD training)</span>
              </div>
              
              {/* Custom Hours Input for JD Phase */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
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
                    className="w-32 rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm py-1 px-2"
                  />
                  <span className="text-sm text-gray-600">hours per domain</span>
                </div>
              </div>
            </div>

            {["JD"].map((domain) => (
              <div key={domain} className="border p-4 rounded">
                <h4 className="font-medium mb-2">{domain} Configuration</h4>
                <JDBatchTable
                  table1Data={table1DataByDomain[domain] || []}
                  setTable1Data={(data) =>
                    setTable1DataByDomain((prev) => ({
                      ...prev,
                      [domain]: data,
                    }))
                  }
                  commonFields={commonFields}
                  globalTrainerAssignments={globalTrainerAssignments}
                  excludeDays={excludeDays}
                />
              </div>
            ))}

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            {success && (
              <div className="text-green-600 text-sm">{success}</div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
                disabled={loading || submitDisabled || !isChecklistComplete}
              >
                {loading ? "Processing..." : (training?.isEdit ? "Update JD Training" : "Submit JD Training")}
              </button>
            </div>

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
              hasValidationErrors={false}
              onChecklistComplete={setIsChecklistComplete}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

export default JDInitiationModal;
