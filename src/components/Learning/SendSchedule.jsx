import React, { useState, useEffect } from "react";
import {
  FiX,
  FiMail,
  FiSend,
  FiUser,
  FiCalendar,
  FiCheck,
  FiSearch,
} from "react-icons/fi";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import emailjs from "@emailjs/browser";

function SendSchedule({
  training,
  trainingData,
  phaseData,
  onClose,
  trainersData = [],
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [trainerAssignments, setTrainerAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingSchedule, setFetchingSchedule] = useState(false);
  const [emailData, setEmailData] = useState({
    to: "",
    venue: "",
    contactPerson: "",
    contactNumber: "",
  });

  const [feePerHour, setFeePerHour] = useState(0);

  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [selectAll, setSelectAll] = useState(true);

  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [trainingFormDoc, setTrainingFormDoc] = useState(null);
  const [phaseDocData, setPhaseDocData] = useState(null);
  const [paymentCycle, setPaymentCycle] = useState("30");

  const [searchTerm, setSearchTerm] = useState("");

  const calculateExpensesForSelected = (selectedAssignmentsData) => {
    const uniqueDetails = new Set();
    let conveyance = 0;
    let food = 0;
    let lodging = 0;

    selectedAssignmentsData.forEach(assignment => {
      const detail = trainersData.find(d => 
        d.trainerId === assignment.trainerId &&
        d.domain === assignment.domain && 
        d.batchCode === assignment.batchCode && 
        new Date(d.startDate) <= new Date(assignment.date) && 
        new Date(assignment.date) <= new Date(d.endDate)
      );
      if (detail) {
        const detailKey = `${detail.trainerId}_${detail.domain}_${detail.batchCode}_${detail.startDate}_${detail.endDate}`;
        if (!uniqueDetails.has(detailKey)) {
          uniqueDetails.add(detailKey);
          conveyance += Number(detail.conveyance) || 0;
        }
        // Add per day
        food += Number(detail.food) || 0;
        lodging += Number(detail.lodging) || 0;
      }
    });

    return { conveyance, food, lodging };
  };

  // Utility: format date
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};



  // Utility: get timing string for dayDuration
  const getTimingForSlot = (slot) => {
    if (!slot) return "-";
    const s = String(slot).toUpperCase();
    const pd = phaseData || phaseDocData || {};
    const { collegeStartTime, lunchStartTime, lunchEndTime, collegeEndTime } = pd || {};

    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    if (s.includes("AM & PM") || (s.includes("AM") && s.includes("PM"))) {
      if (collegeStartTime && collegeEndTime)
        return `${collegeStartTime} - ${collegeEndTime}`;
      return "AM & PM";
    }
    if (s.includes("AM")) {
      if (collegeStartTime && lunchStartTime && parseTime(lunchStartTime) <= parseTime(collegeEndTime))
        return `${collegeStartTime} - ${lunchStartTime}`;
      else if (collegeStartTime && collegeEndTime)
        return `${collegeStartTime} - ${collegeEndTime}`;
      return "AM";
    }
    if (s.includes("PM")) {
      if (lunchEndTime && collegeEndTime)
        return `${lunchEndTime} - ${collegeEndTime}`;
      return "PM";
    }
    return slot;
  };

  useEffect(() => {
    if (!selectedTrainer) return;
    const fetchFee = async () => {
      try {
        // First try to get fee from trainersData (training assignment data)
        const trainerDetails = trainersData.find(trainer => 
          trainer.trainerId === selectedTrainer.trainerId || trainer.id === selectedTrainer.id
        );
        if (trainerDetails?.perHourCost) {
          setFeePerHour(trainerDetails.perHourCost);
          return;
        }

        // Fallback: fetch from Firestore trainers collection
        const trainerQuery = query(
          collection(db, "trainers"),
          where(
            "trainerId",
            "==",
            selectedTrainer.trainerId || selectedTrainer.id
          )
        );
        const trainerSnap = await getDocs(trainerQuery);
        if (!trainerSnap.empty) {
          const trainerData = trainerSnap.docs[0].data();
          setFeePerHour(trainerData.charges || trainerData.feePerHour || 0);
        } else {
          const tDocRef = doc(db, "trainers", selectedTrainer.id);
          const tDocSnap = await getDoc(tDocRef);
          if (tDocSnap.exists())
            setFeePerHour(
              tDocSnap.data().charges || tDocSnap.data().feePerHour || 0
            );
        }
      } catch (err) {
        console.error("Error fetching trainer fee data:", err);
      }
    };
    fetchFee();
  }, [selectedTrainer, trainersData]);

  // ---------- Fetch trainers assigned to this training ----------
  useEffect(() => {
    const fetchAssignedTrainers = async () => {
      if (!training?.id) return;
      try {
        const q = query(
          collection(db, "trainerAssignments"),
          where("sourceTrainingId", "==", training.id)
        );
        const assignmentsSnap = await getDocs(q);

        const trainerIds = new Set();
        assignmentsSnap.forEach((doc) => {
          const data = doc.data();
          if (data.trainerId) trainerIds.add(data.trainerId);
        });

        const assignedTrainers = [];
        for (const trainerId of trainerIds) {
          try {
            const trainerQuery = query(
              collection(db, "trainers"),
              where("trainerId", "==", trainerId)
            );
            const trainerSnap = await getDocs(trainerQuery);
            trainerSnap.forEach((doc) => {
              assignedTrainers.push({ id: doc.id, ...doc.data() });
            });
            if (trainerSnap.empty) {
              try {
                const docRef = doc(db, "trainers", trainerId);
                const single = await getDoc(docRef);
                if (single.exists())
                  assignedTrainers.push({ id: single.id, ...single.data() });
              } catch {
                // ignore
              }
            }
          } catch (err) {
            console.error("Error loading individual trainer data:", err);
          }
        }

        setTrainers(assignedTrainers);
      } catch (err) {
        console.error("Error fetching assigned trainers:", err);
        setErrorMessage("Failed to load trainers");
      }
    };

    // If trainersData is provided as prop, use it instead of fetching
    if (trainersData && trainersData.length > 0) {
      // Extract unique trainers from trainersData
      const trainerMap = new Map();
      
      trainersData.forEach(trainer => {
        const trainerId = trainer.trainerId || trainer.id;
        if (!trainerMap.has(trainerId)) {
          trainerMap.set(trainerId, {
            id: trainer.id || trainerId,
            trainerId: trainerId,
            name: trainer.trainerName || trainer.name,
            trainerName: trainer.trainerName || trainer.name,
            email: trainer.email || trainer.trainerEmail,
            trainerEmail: trainer.email || trainer.trainerEmail,
            ...trainer
          });
        }
      });
      
      setTrainers(Array.from(trainerMap.values()));
    } else {
      // Fallback to fetching from Firestore
      fetchAssignedTrainers();
    }
  }, [training?.id, trainersData]);

  // ---------- Fetch trainingForms doc and the phase doc ----------
  useEffect(() => {
    const fetchTrainingFormAndPhase = async () => {
      if (!training?.id) return;
      try {
        const tfDocRef = doc(db, "trainingForms", training.id);
        const tfSnap = await getDoc(tfDocRef);
        if (tfSnap.exists()) setTrainingFormDoc(tfSnap.data());
        else setTrainingFormDoc(null);

        const phase = training.selectedPhase || "phase-1";
        const phaseDocRef = doc(
          db,
          "trainingForms",
          training.id,
          "trainings",
          phase
        );
        const phaseSnap = await getDoc(phaseDocRef);
        if (phaseSnap.exists()) setPhaseDocData(phaseSnap.data());
        else setPhaseDocData(null);
      } catch (err) {
        console.error("Error fetching training form and phase data:", err);
        setErrorMessage("Failed to load training details");
      }
    };

    fetchTrainingFormAndPhase();
  }, [training?.id, training?.selectedPhase]);

  // Initialize payment cycle from form or training data when available
  useEffect(() => {
    const initialPaymentCycle = trainingFormDoc?.payment_cycle || trainingFormDoc?.paymentCycle || trainingData?.payment_cycle || trainingData?.paymentCycle;
    if (initialPaymentCycle) setPaymentCycle(String(initialPaymentCycle));
  }, [trainingFormDoc, trainingData]);

  // ---------- Fetch trainer-specific assignments ----------
  const fetchTrainerSchedule = async (trainerId) => {
    setFetchingSchedule(true);
    try {
      // Instead of fetching from Firestore, generate assignments based on trainersData
      // to match the display in InitiationTrainingDetails
      const trainerDetails = trainersData.filter(trainer => 
        trainer.trainerId === trainerId || trainer.id === trainerId
      );

      const assignments = [];
      trainerDetails.forEach(detail => {
        if (detail.startDate && detail.endDate && detail.dayDuration) {
          const start = new Date(detail.startDate);
          const end = new Date(detail.endDate);
          const excludeDays = phaseData?.excludeDays || "None";

          // First, calculate the number of training days
          let days = 0;
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            let include = true;
            if (excludeDays === "Saturday" && dayOfWeek === 6) include = false;
            else if (excludeDays === "Sunday" && dayOfWeek === 0) include = false;
            else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) include = false;
            if (include) days++;
          }

          // Calculate hours per day
          const hoursPerDay = days > 0 ? (detail.assignedHours || 0) / days : 0;

          // Now generate assignments for each day
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            let include = true;
            if (excludeDays === "Saturday" && dayOfWeek === 6) include = false;
            else if (excludeDays === "Sunday" && dayOfWeek === 0) include = false;
            else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) include = false;

            if (include) {
              assignments.push({
                id: `${detail.trainerId}_${d.toISOString().split('T')[0]}_${detail.domain}_${detail.batchCode}_${detail.dayDuration}`,
                date: d.toISOString().split('T')[0],
                dayDuration: detail.dayDuration,
                domain: detail.domain,
                batchCode: detail.batchCode,
                trainerId: detail.trainerId,
                sourceTrainingId: training.id,
                assignedHours: hoursPerDay,
                rate: detail.perHourCost || 0
              });
            }
          }
        }
      });

      assignments.sort((a, b) => new Date(a.date) - new Date(b.date));
      setTrainerAssignments(assignments);
      setSelectedAssignments(assignments.map(a => a.id)); // Select all by default
      setSelectAll(true);
    } catch (err) {
      console.error("Error generating trainer schedule:", err);
      setErrorMessage("Failed to generate trainer schedule");
    } finally {
      setFetchingSchedule(false);
    }
  };

  const handleTrainerSelect = (trainer) => {
    setSelectedTrainer(trainer);
    setCurrentStep(2);
    fetchTrainerSchedule(trainer.trainerId || trainer.id);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedAssignments([]);
      setSelectAll(false);
    } else {
      setSelectedAssignments(trainerAssignments.map(a => a.id));
      setSelectAll(true);
    }
    setErrorMessage(""); // Clear any previous errors
  };

  const handleAssignmentToggle = (assignmentId) => {
    setSelectedAssignments(prev => {
      const newSelected = prev.includes(assignmentId) 
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId];
      
      // Update selectAll state based on whether all assignments are selected
      setSelectAll(newSelected.length === trainerAssignments.length);
      
      return newSelected;
    });
    setErrorMessage(""); // Clear any previous errors
  };

  const handleViewFinancials = () => {
    if (selectedAssignments.length === 0) {
      setErrorMessage("Please select at least one session to proceed.");
      return;
    }
    setCurrentStep(3);
  };

  // ADD THIS MISSING FUNCTION
  const handleConfirmSchedule = () => {
    setCurrentStep(4);
    setErrorMessage(""); // Clear any previous errors
    setEmailData((prev) => ({
      ...prev,
      to: prev.to || "", // Keep existing email if already entered
      subject: `Assignment Mail for ${
        trainingFormDoc?.collegeName || trainingData?.collegeName || ""
      } - Gryphon Academy Pvt. Ltd.`,
      message: `Dear ${
        selectedTrainer?.name || selectedTrainer?.trainerName
      },\n\nPlease find your training schedule details below:\n\nCollege: ${
        trainingFormDoc?.collegeName || trainingData?.collegeName
      }\nCourse: ${trainingFormDoc?.course || trainingData?.course} - ${
        trainingFormDoc?.year || trainingData?.year
      }\nPhase: ${
        training?.selectedPhase || "phase-1"
      }\n\nYour schedule has been confirmed. Please review the details attached.\n\nBest regards,\nTraining Team`,
    }));
  };

  // ADD THIS MISSING FUNCTION
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmailData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentCycleChange = (e) => {
    setPaymentCycle(e.target.value);
  };

  // Function to import email from trainer data
  const handleImportEmail = async () => {
    // First try to get email from selectedTrainer (if already loaded)
    let trainerEmail = selectedTrainer?.email || selectedTrainer?.trainerEmail || "";
    
    if (!trainerEmail && selectedTrainer?.trainerId) {
      // If not available, fetch from Firestore trainers collection
      try {
        const trainerQuery = query(
          collection(db, "trainers"),
          where("trainerId", "==", selectedTrainer.trainerId)
        );
        const trainerSnap = await getDocs(trainerQuery);
        if (!trainerSnap.empty) {
          const trainerData = trainerSnap.docs[0].data();
          trainerEmail = trainerData.email || "";
        }
      } catch (err) {
        console.error("Error fetching trainer email:", err);
      }
    }
    
    setEmailData((prev) => ({ ...prev, to: trainerEmail }));
  };

  // ---------- Send Email ----------
  const handleSendEmail = async () => {
    if (!emailData.to.trim()) {
      setErrorMessage("Please enter recipient email or click 'Import Email' to load from trainer data");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      
      // Filter to only selected assignments
      const selectedAssignmentsData = trainerAssignments.filter(a => selectedAssignments.includes(a.id));
      
      const totalHours = (() => {
        // Calculate based on assigned hours from selected assignments
        return selectedAssignmentsData.reduce((acc, assignment) => {
          return acc + (assignment.assignedHours || 0);
        }, 0);
      })();

      // Calculate total training days from selected assignments
      const totalDays = new Set(selectedAssignmentsData.map(a => a.date)).size;

      // FIXED: Use new calculation logic (matching InvoiceModal)
      const roundToNearestWhole = (num) => Math.round(num);
      
      const trainingFees = roundToNearestWhole(totalHours * feePerHour);
      
      // Calculate expenses the same way as InitiationTrainingDetails
      // Conveyance is one-time, food and lodging are already totals from assignments
      const { conveyance: conveyanceTotal, food: foodTotal, lodging: lodgingTotal } = calculateExpensesForSelected(selectedAssignmentsData);
      const totalExpenses = roundToNearestWhole(conveyanceTotal + foodTotal + lodgingTotal);
      
      const totalAmount = roundToNearestWhole(trainingFees + totalExpenses);
      
      // TDS applied only on training fees (matching InvoiceModal logic)
      const tdsAmount = roundToNearestWhole(trainingFees * 0.1); // 10% TDS on training fees only
      const payableCost = roundToNearestWhole(totalAmount - tdsAmount);

      const scheduleRows = selectedAssignmentsData
        .map((assignment) => {
          let hoursPerDay = assignment.assignedHours || 0;

          return `
<tr>
  <td>${assignment.domain || "-"}</td>
  <td>${trainingFormDoc?.year || trainingData?.year || "-"}</td>
  <td>${selectedTrainer?.name || selectedTrainer?.trainerName || "-"}</td>
  <td>${formatDate(assignment.date)}</td>
  <td>${assignment.batchCode || "-"}</td>
  <td>${getTimingForSlot(assignment.dayDuration)}</td>
  <td>${hoursPerDay.toFixed(2)}</td>
  <td>₹ ${assignment.rate || 0}</td>
</tr>`;
        })
        .join("");

      const templateParams = {
  to_email: emailData.to,
  email: emailData.to, // Dono fields set karein
  salutation: selectedTrainer?.salutation || "Dear",
  trainer_last_name: (selectedTrainer?.name || selectedTrainer?.trainerName || "").split(" ").slice(-1).join(" "),
  college_name: trainingFormDoc?.collegeName || trainingData?.collegeName || "",
  venue_address: emailData.venue,
  contact_person: emailData.contactPerson,
  contact_number: emailData.contactNumber,
  
  conveyance: conveyanceTotal,
  food: foodTotal,
  lodging: lodgingTotal,
  total_expenses: totalExpenses,

  schedule_rows: scheduleRows,
  total_days: totalDays,
  total_hours: totalHours,
  start_date: selectedAssignmentsData.length > 0 ? formatDate(selectedAssignmentsData[0].date) : "",
  fee_per_hour: feePerHour,
        fee_per_day:
          selectedAssignmentsData.length > 0
            ? (() => {
                // Calculate total fee for selected assignments (not average)
                const totalFee = selectedAssignmentsData.reduce((acc, assignment) => {
                  const hours = assignment.assignedHours || 0;
                  return acc + (hours * (assignment.rate || 0));
                }, 0);
                return totalFee;
              })()
            : 0,
        total_cost: totalAmount,
        tds_amount: tdsAmount,
        payable_cost: payableCost,
        project_code:
          trainingFormDoc?.projectCode || trainingData?.projectCode || "",
        payment_cycle: paymentCycle || trainingFormDoc?.payment_cycle || trainingFormDoc?.paymentCycle || "30",
      };      await emailjs.send(
        "service_75e50yr",
        "template_c7rfyrl",
        templateParams,
        "8E18_R6lWdplPsFtQ"
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err) {
      console.error("Error sending email:", err);
      setErrorMessage("Failed to send email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI ----------
  return (
    <div className="fixed inset-0  bg-opacity-25 backdrop-blur-sm flex items-center justify-center p-4 z-54">
      <div className="bg-white rounded-2xl shadow-xl w-[80vw] max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Send Training Schedule</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <FiX size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-center space-x-1">
            {[
              { step: 1, label: "Trainer", icon: FiUser },
              { step: 2, label: "Schedule", icon: FiCalendar },
              { step: 3, label: "Details", icon: FiCheck },
              { step: 4, label: "Send", icon: FiMail }
            ].map((item, index) => {
              const IconComponent = item.icon;
              const isActive = currentStep >= item.step;
              const isCurrent = currentStep === item.step;

              return (
                <div key={item.step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-2 ring-blue-200 ring-offset-1' : ''}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                  </div>
                  {index < 3 && (
                    <div
                      className={`w-8 h-px mx-1 transition-colors ${
                        currentStep > item.step ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              {errorMessage}
            </div>
          )}

          {/* Step 1: Select Trainer */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Select Trainer</h3>
                  <p className="text-sm text-gray-600">Choose a trainer to send their schedule</p>
                </div>

                {/* Search Input */}
                {trainers.length > 0 && (
                  <div className="relative w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiSearch className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search trainers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}
              </div>

              {trainers.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                  {trainers
                    .filter((trainer) => {
                      if (!searchTerm) return true;
                      const name = (trainer.name || trainer.trainerName || "").toLowerCase();
                      const id = (trainer.trainerId || trainer.id || "").toLowerCase();
                      const search = searchTerm.toLowerCase();
                      return name.includes(search) || id.includes(search);
                    })
                    .map((trainer) => (
                      <div
                        key={trainer.id}
                        onClick={() => handleTrainerSelect(trainer)}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all active:scale-95"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                              <FiUser className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {trainer.name || trainer.trainerName}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {trainer.trainerId || trainer.id}
                              </div>
                            </div>
                          </div>
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <FiCheck className="w-3 h-3 text-blue-600" />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiUser className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-sm font-medium text-gray-900 mb-1">No Trainers</h4>
                  <p className="text-xs text-gray-500">No trainers assigned to this training</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Review Schedule */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Schedule for {selectedTrainer?.name || selectedTrainer?.trainerName}</h3>
                  <p className="text-xs text-gray-600">Select sessions to include</p>
                </div>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Change
                </button>
              </div>

              {fetchingSchedule ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading...</span>
                </div>
              ) : trainerAssignments.length > 0 ? (
                <div className="space-y-3">
                  {/* Selection Controls */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleSelectAll}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          selectAll
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-blue-600 border border-blue-300'
                        }`}
                      >
                        {selectAll ? 'Deselect All' : 'Select All'}
                      </button>
                      <span className="text-xs text-gray-600">
                        {selectedAssignments.length} of {trainerAssignments.length} selected
                      </span>
                    </div>
                  </div>

                  {/* Schedule List */}
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {trainerAssignments.map((assignment) => {
                      const isSelected = selectedAssignments.includes(assignment.id);
                      return (
                        <div
                          key={assignment.id}
                          className={`bg-white border rounded-xl p-3 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleAssignmentToggle(assignment.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleAssignmentToggle(assignment.id)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                  {formatDate(assignment.date)}
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    assignment.dayDuration?.toLowerCase().includes('am') 
                                      ? 'bg-blue-100 text-blue-700' 
                                      : assignment.dayDuration?.toLowerCase().includes('pm')
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {assignment.dayDuration?.toLowerCase().includes('am') ? 'AM' : 
                                     assignment.dayDuration?.toLowerCase().includes('pm') ? 'PM' : 
                                     assignment.dayDuration}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(assignment.date).toLocaleDateString("en-US", { weekday: "short" })} • {getTimingForSlot(assignment.dayDuration)} • {assignment.assignedHours}h
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">{assignment.domain}</div>
                              <div className="text-xs text-gray-500">{assignment.batchCode}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiCalendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <h4 className="text-sm font-medium text-gray-900 mb-1">No Schedule</h4>
                  <p className="text-xs text-gray-500">No schedule assigned</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleViewFinancials}
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Financial Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Financial Overview</h3>
                <p className="text-xs text-gray-600">Review costs for selected sessions</p>
              </div>

              {(() => {
                // Filter assignments to only selected ones
                const selectedAssignmentsData = trainerAssignments.filter(a => selectedAssignments.includes(a.id));

                // Calculate financial details using only selected assignments
                const totalHours = selectedAssignmentsData.reduce((acc, assignment) => {
                  return acc + (assignment.assignedHours || 0);
                }, 0);

                // Calculate total training days from selected assignments
                const totalDays = new Set(selectedAssignmentsData.map(a => a.date)).size;

                // Round to nearest whole number (matching InvoiceModal)
                const roundToNearestWhole = (num) => Math.round(num);

                const trainingFees = roundToNearestWhole(totalHours * feePerHour);

                // Calculate expenses the same way as InitiationTrainingDetails
                // Conveyance is one-time, food and lodging are already totals from assignments
                const { conveyance: conveyanceTotal, food: foodTotal, lodging: lodgingTotal } = calculateExpensesForSelected(selectedAssignmentsData);
                const totalExpenses = roundToNearestWhole(conveyanceTotal + foodTotal + lodgingTotal);

                const totalAmount = roundToNearestWhole(trainingFees + totalExpenses);

                // TDS applied only on training fees (matching InvoiceModal logic)
                const tdsAmount = roundToNearestWhole((trainingFees * 0.1)); // 10% TDS on training fees only
                const amountBeforeGST = roundToNearestWhole(totalAmount - tdsAmount);

                // No GST in SendSchedule (simplified version)
                const payableCost = amountBeforeGST;

                return (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 rounded-xl p-2 border border-blue-200">
                        <div className="flex items-center justify-between mb-1">
                          <FiCalendar className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            Days
                          </span>
                        </div>
                        <div className="text-lg font-bold text-blue-900">{totalDays}</div>
                        <div className="text-xs text-blue-700">Sessions</div>
                      </div>

                      <div className="bg-green-50 rounded-xl p-2 border border-green-200">
                        <div className="flex items-center justify-between mb-1">
                          <FiCheck className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                            Hours
                          </span>
                        </div>
                        <div className="text-lg font-bold text-green-900">{totalHours.toFixed(1)}</div>
                        <div className="text-xs text-green-700">Training</div>
                      </div>

                      <div className="bg-purple-50 rounded-xl p-2 border border-purple-200">
                        <div className="flex items-center justify-between mb-1">
                          <FiUser className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                            Selected
                          </span>
                        </div>
                        <div className="text-lg font-bold text-purple-900">{selectedAssignments.length}</div>
                        <div className="text-xs text-purple-700">Sessions</div>
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="rounded-xl p-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FiMail className="w-4 h-4 text-blue-600" />
                        Cost Breakdown
                      </h4>
                      <div className="space-y-2">
                        {/* Training Fees Breakdown */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">Training Fees</span>
                            <span className="text-sm font-semibold text-gray-900">₹{trainingFees.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="ml-3 text-xs text-gray-500">
                            {totalHours.toFixed(1)}h × ₹{feePerHour.toLocaleString('en-IN')}/hr
                          </div>
                        </div>

                        {/* Expenses Breakdown */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">Expenses</span>
                            <span className="text-sm font-medium text-gray-800">₹{totalExpenses.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="ml-3 space-y-0.5">
                            {conveyanceTotal > 0 && (
                              <div className="text-xs text-gray-500">
                                Conveyance: ₹{conveyanceTotal.toLocaleString('en-IN')}
                              </div>
                            )}
                            {foodTotal > 0 && (
                              <div className="text-xs text-gray-500">
                                Food: ₹{foodTotal.toLocaleString('en-IN')}
                              </div>
                            )}
                            {lodgingTotal > 0 && (
                              <div className="text-xs text-gray-500">
                                Lodging: ₹{lodgingTotal.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center py-1">
                          <span className="text-xs text-gray-600">TDS (10%)</span>
                          <span className="text-sm font-medium text-orange-600">-₹{tdsAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-800">Net Payable</span>
                            <span className="text-lg font-bold text-green-600">₹{payableCost.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ready Alert */}
                    <div className="bg-green-50 rounded-xl p-2 border border-green-200">
                      <div className="flex items-center gap-2">
                        <FiCheck className="w-4 h-4 text-green-600" />
                        <div>
                          <h5 className="text-sm font-medium text-green-800">Ready to Send</h5>
                          <p className="text-xs text-green-700">
                            {selectedAssignments.length} session{selectedAssignments.length !== 1 ? 's' : ''} • ₹{payableCost.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmSchedule}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors text-sm font-medium"
                >
                  Confirm & Send
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm & Email */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Send Training Schedule</h3>
                <p className="text-xs text-gray-600">Configure email and send to trainer</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Email Configuration */}
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FiMail className="w-4 h-4 text-blue-600" />
                      Email Details
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            name="to"
                            value={emailData.to}
                            onChange={handleInputChange}
                            required
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="trainer@example.com"
                          />
                          <button
                            type="button"
                            onClick={handleImportEmail}
                            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                            title="Import email from trainer data"
                          >
                            Import
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Venue Address
                        </label>
                        <input
                          type="text"
                          name="venue"
                          value={emailData.venue}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="College/Training Center Address"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Contact Person
                          </label>
                          <input
                            type="text"
                            name="contactPerson"
                            value={emailData.contactPerson}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Coordinator Name"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Contact Number
                          </label>
                          <input
                            type="text"
                            name="contactNumber"
                            value={emailData.contactNumber}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="+91 XXXXX XXXXX"
                          />
                        </div>
                        
                        {/* Payment Cycle radio buttons */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Payment Cycle
                          </label>
                          <div className="flex items-center gap-4 mt-1">
                            <label className="inline-flex items-center space-x-2 text-xs">
                              <input
                                type="radio"
                                name="paymentCycle"
                                value="30"
                                checked={paymentCycle === '30'}
                                onChange={handlePaymentCycleChange}
                                className="form-radio h-4 w-4 text-blue-600"
                              />
                              <span>30 days</span>
                            </label>
                            <label className="inline-flex items-center space-x-2 text-xs">
                              <input
                                type="radio"
                                name="paymentCycle"
                                value="45"
                                checked={paymentCycle === '45'}
                                onChange={handlePaymentCycleChange}
                                className="form-radio h-4 w-4 text-blue-600"
                              />
                              <span>45 days</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Send Button */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <button
                      onClick={handleSendEmail}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <FiSend className="w-4 h-4" />
                          Send Schedule
                        </>
                      )}
                    </button>
                    <p className="text-xs text-green-700 mt-2 text-center">
                      Includes schedule, costs & contact details
                    </p>
                  </div>
                </div>

                {/* Preview Summary */}
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FiCalendar className="w-4 h-4 text-purple-600" />
                      Summary
                    </h4>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-gray-600">Trainer</span>
                        <span className="text-sm font-medium text-gray-900">{selectedTrainer?.name || selectedTrainer?.trainerName}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-gray-600">Sessions</span>
                        <span className="text-sm font-medium text-gray-900">{selectedAssignments.length}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-gray-600">Total Hours</span>
                        <span className="text-sm font-medium text-gray-900">
                          {trainerAssignments.filter(a => selectedAssignments.includes(a.id)).reduce((acc, a) => acc + (a.assignedHours || 0), 0).toFixed(1)}h
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-t border-gray-200 pt-2">
                        <span className="text-sm font-semibold text-gray-800">Amount</span>
                        <span className="text-lg font-bold text-green-600">
                          ₹{(() => {
                            const selectedData = trainerAssignments.filter(a => selectedAssignments.includes(a.id));
                            const totalHours = selectedData.reduce((acc, a) => acc + (a.assignedHours || 0), 0);
                            const trainingFees = Math.round(totalHours * feePerHour);
                            const { conveyance, food, lodging } = calculateExpensesForSelected(selectedData);
                            const expenses = Math.round(conveyance + food + lodging);
                            const total = trainingFees + expenses;
                            const tds = Math.round(trainingFees * 0.1);
                            return (total - tds).toLocaleString('en-IN');
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Email Preview */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h5 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <FiMail className="w-4 h-4" />
                      Email Preview
                    </h5>
                    <div className="text-xs text-blue-700 space-y-1">
                      <p><strong>Subject:</strong> Assignment Mail for {trainingFormDoc?.collegeName || trainingData?.collegeName || ""} - Gryphon Academy Pvt. Ltd.</p>
                      <p><strong>To:</strong> {emailData.to || 'trainer@example.com'}</p>
                      <p><strong>Payment Cycle:</strong> {paymentCycle} days</p>
                      <p className="mt-2">
                        Includes detailed schedule table, financial breakdown, venue information, and contact details.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Schedule Sent!</h3>
              <p className="text-sm text-gray-600 mb-4">
                Training schedule sent to {selectedTrainer?.name || selectedTrainer?.trainerName}
              </p>
              <div className="bg-green-50 rounded-xl p-3 border border-green-200 inline-block">
                <div className="flex items-center gap-2 text-green-700">
                  <FiMail className="w-4 h-4" />
                  <span className="text-sm font-medium">Email sent to: {emailData.to}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SendSchedule;
