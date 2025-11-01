import React, { useState, useEffect } from "react";
import {
  FiX,
  FiMail,
  FiSend,
  FiUser,
  FiCalendar,
  FiCheck,
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
  const [trainerCostDetails, setTrainerCostDetails] = useState({
    conveyance: 0,
    food: 0,
    lodging: 0
  });

  const [feePerHour, setFeePerHour] = useState(0);

  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [trainingFormDoc, setTrainingFormDoc] = useState(null);
  const [phaseDocData, setPhaseDocData] = useState(null);

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



useEffect(() => {
  if (!selectedTrainer || trainersData.length === 0) return;

  const trainerDetails = trainersData.filter(trainer => {
    return trainer.trainerId === selectedTrainer.trainerId || trainer.trainerId === selectedTrainer.id;
  });

  let totalConveyance = 0;
  let totalFood = 0;
  let totalLodging = 0;

  trainerDetails.forEach(detail => {
    totalConveyance += Number(detail.conveyance) || 0;
    totalFood += Number(detail.food) || 0;
    totalLodging += Number(detail.lodging) || 0;
  });

  setTrainerCostDetails({
    conveyance: totalConveyance,
    food: totalFood,
    lodging: totalLodging
  });
}, [selectedTrainer, trainersData]);



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

  // Utility: calculate hours for dayDuration
  const calculateHours = (dayDuration) => {
    if (!dayDuration) return 0;
    const pd = phaseData || phaseDocData || {};
    const { collegeStartTime, lunchStartTime, lunchEndTime, collegeEndTime } = pd;

    if (!collegeStartTime || !collegeEndTime) return dayDuration.includes("AM & PM") ? 7 : dayDuration.includes("AM") || dayDuration.includes("PM") ? 3 : 0;

    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const start = parseTime(collegeStartTime);
    const end = parseTime(collegeEndTime);
    const lunchStart = lunchStartTime && lunchEndTime ? parseTime(lunchStartTime) : null;
    const lunchEnd = lunchStartTime && lunchEndTime ? parseTime(lunchEndTime) : null;

    const lunchDuration = lunchStart && lunchEnd ? lunchEnd - lunchStart : 0;

    if (dayDuration.includes("AM & PM") || (dayDuration.includes("AM") && dayDuration.includes("PM"))) {
      return (end - start - lunchDuration) / 60;
    } else if (dayDuration.includes("AM")) {
      if (lunchStart && lunchStart <= end) {
        return (lunchStart - start) / 60;
      } else {
        return (end - start - lunchDuration) / 60;
      }
    } else if (dayDuration.includes("PM")) {
      if (lunchEnd && lunchEnd >= start) {
        return (end - lunchEnd) / 60;
      } else {
        return (end - start - lunchDuration) / 60;
      }
    }
    return 0;
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

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            let include = true;
            if (excludeDays === "Saturday" && dayOfWeek === 6) include = false;
            else if (excludeDays === "Sunday" && dayOfWeek === 0) include = false;
            else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) include = false;

            if (include) {
              assignments.push({
                id: `${detail.trainerId}_${d.toISOString().split('T')[0]}_${detail.domain}_${detail.batchCode}`,
                date: d.toISOString().split('T')[0],
                dayDuration: detail.dayDuration,
                domain: detail.domain,
                batchCode: detail.batchCode,
                trainerId: detail.trainerId,
                sourceTrainingId: training.id
              });
            }
          }
        }
      });

      assignments.sort((a, b) => new Date(a.date) - new Date(b.date));
      setTrainerAssignments(assignments);
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

  const handleViewFinancials = () => {
    setCurrentStep(3);
  };

  // ADD THIS MISSING FUNCTION
  const handleConfirmSchedule = () => {
    setCurrentStep(4);
    setErrorMessage(""); // Clear any previous errors
    setEmailData((prev) => ({
      ...prev,
      to: prev.to || "", // Keep existing email if already entered
      subject: `Training Schedule for ${
        selectedTrainer?.name || selectedTrainer?.trainerName
      } - ${trainingFormDoc?.collegeName || trainingData?.collegeName || ""}`,
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

  // Function to import email from trainer data
  const handleImportEmail = () => {
    const trainerEmail = selectedTrainer?.email || selectedTrainer?.trainerEmail || "";
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
      
      const totalHours = (() => {
        // Calculate based on dayDuration of assignments using the same calculateHours function
        return trainerAssignments.reduce((acc, assignment) => {
          return acc + calculateHours(assignment.dayDuration);
        }, 0);
      })();

      // Calculate total training days from assignments
      const totalDays = new Set(trainerAssignments.map(a => a.date)).size;

      // FIXED: Use new calculation logic (matching InvoiceModal)
      const roundToNearestWhole = (num) => Math.round(num);
      
      const trainingFees = roundToNearestWhole(totalHours * (feePerHour || 0));
      
      // Calculate expenses the same way as InitiationTrainingDetails
      // Conveyance is one-time, food and lodging are per day
      const conveyanceTotal = trainerCostDetails.conveyance || 0;
      const foodTotal = (trainerCostDetails.food || 0) * totalDays;
      const lodgingTotal = (trainerCostDetails.lodging || 0) * totalDays;
      const totalExpenses = roundToNearestWhole(conveyanceTotal + foodTotal + lodgingTotal);
      
      const totalAmount = roundToNearestWhole(trainingFees + totalExpenses);
      
      // TDS applied only on training fees (matching InvoiceModal logic)
      const tdsAmount = roundToNearestWhole(trainingFees * 0.1); // 10% TDS on training fees only
      const payableCost = roundToNearestWhole(totalAmount - tdsAmount);

      const scheduleRows = trainerAssignments
        .map((assignment) => {
          let hoursPerDay = calculateHours(assignment.dayDuration);

          const perDayCost = (feePerHour || 0) * hoursPerDay;

          return `
<tr>
  <td>${assignment.domain || "-"}</td>
  <td>${trainingFormDoc?.year || trainingData?.year || "-"}</td>
  <td>${selectedTrainer?.name || selectedTrainer?.trainerName || "-"}</td>
  <td>${formatDate(assignment.date)}</td>
  <td>${assignment.batchCode || "-"}</td>
  <td>${getTimingForSlot(assignment.dayDuration)}</td>
  <td>${hoursPerDay.toFixed(2)}</td>
  <td>₹ ${feePerHour || 0}</td>
  <td>₹ ${perDayCost.toFixed(2)}</td>
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
  start_date: trainerAssignments[0] ? formatDate(trainerAssignments[0].date) : "",
  fee_per_hour: feePerHour,
        fee_per_day:
          trainerAssignments.length > 0
            ? (() => {
                // Calculate total fee for all assignments (not average)
                const totalFee = trainerAssignments.reduce((acc, assignment) => {
                  const hours = calculateHours(assignment.dayDuration);
                  return acc + (hours * (feePerHour || 0));
                }, 0);
                return totalFee;
              })()
            : 0,
        total_cost: totalAmount,
        tds_amount: tdsAmount,
        payable_cost: payableCost,
        project_code:
          trainingFormDoc?.projectCode || trainingData?.projectCode || "",
        payment_cycle:
          trainingFormDoc?.payment_cycle ||
          trainingFormDoc?.paymentCycle ||
          "30",
      };

      await emailjs.send(
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
    <div className="fixed inset-0 bg-transparent bg-opacity-90 backdrop-blur-xl flex items-center justify-center z-500 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <FiMail className="mr-2" />
            Send Training Schedule
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {step}
                </div>
                <span
                  className={`ml-2 text-sm ${
                    currentStep >= step
                      ? "text-blue-600 font-medium"
                      : "text-gray-500"
                  }`}
                >
                  {step === 1 && "Select Trainer"}
                  {step === 2 && "Review Schedule"}
                  {step === 3 && "Financial Details"}
                  {step === 4 && "Confirm & Email"}
                  {step === 5 && "Send"}
                </span>
                {step < 5 && (
                  <div
                    className={`w-8 h-0.5 ml-4 ${
                      currentStep > step ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {errorMessage}
            </div>
          )}

          {/* Step 1: Select Trainer */}
          {currentStep === 1 && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Select Trainer
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Choose a trainer to send their schedule for this training phase
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainers.map((trainer) => (
                  <div
                    key={trainer.id}
                    onClick={() => handleTrainerSelect(trainer)}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FiUser className="text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {trainer.name || trainer.trainerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {trainer.trainerId || trainer.id}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {trainers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No trainers assigned to this training phase
                </div>
              )}
            </div>
          )}

          {/* Step 2: Review Schedule */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">
                  Schedule for{" "}
                  {selectedTrainer?.name || selectedTrainer?.trainerName}
                </h3>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Change Trainer
                </button>
              </div>

              {fetchingSchedule ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">
                    Loading schedule...
                  </span>
                </div>
              ) : trainerAssignments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left border border-gray-200 font-medium">
                          Date
                        </th>
                        <th className="px-4 py-2 text-left border border-gray-200 font-medium">
                          Day
                        </th>
                        <th className="px-4 py-2 text-left border border-gray-200 font-medium">
                          Duration
                        </th>
                        <th className="px-4 py-2 text-left border border-gray-200 font-medium">
                          Timing
                        </th>
                        <th className="px-4 py-2 text-left border border-gray-200 font-medium">
                          Hours
                        </th>
                        <th className="px-4 py-2 text-left border border-gray-200 font-medium">
                          Domain
                        </th>
                        <th className="px-4 py-2 text-left border border-gray-200 font-medium">
                          Batch
                        </th>
                        <th className="px-4 py-2 text-left border border-gray-200 font-medium">
                          College
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainerAssignments.map((assignment) => {
                        return (
                          <tr key={assignment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 border border-gray-200">
                              {formatDate(assignment.date)}
                            </td>
                            <td className="px-4 py-2 border border-gray-200">
                              {new Date(assignment.date).toLocaleDateString(
                                "en-US",
                                { weekday: "long" }
                              )}
                            </td>
                            <td className="px-4 py-2 border border-gray-200">
                              {assignment.dayDuration || "-"}
                            </td>
                            <td className="px-4 py-2 border border-gray-200">
                              {getTimingForSlot(assignment.dayDuration)}
                            </td>
                            <td className="px-4 py-2 border border-gray-200">
                              {calculateHours(assignment.dayDuration).toFixed(2)}
                            </td>

                            <td className="px-4 py-2 border border-gray-200">
                              {assignment.domain || "-"}
                            </td>
                            <td className="px-4 py-2 border border-gray-200">
                              {assignment.batchCode || "-"}
                            </td>
                            <td className="px-4 py-2 border border-gray-200">
                              {trainingFormDoc?.collegeName ||
                                trainingData?.collegeName ||
                                "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No schedule assigned for this trainer
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleViewFinancials}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Financial Details */}
          {currentStep === 3 && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Calculated Financial Details
              </h3>

              {(() => {
                // Calculate financial details using the same calculateHours function as the table
                const totalHours = trainerAssignments.reduce((acc, assignment) => {
                  return acc + calculateHours(assignment.dayDuration);
                }, 0);

                // Calculate total training days from assignments
                const totalDays = new Set(trainerAssignments.map(a => a.date)).size;

                // Round to nearest whole number (matching InvoiceModal)
                const roundToNearestWhole = (num) => Math.round(num);

                const trainingFees = roundToNearestWhole((feePerHour || 0) * totalHours);
                
                // Calculate expenses the same way as InitiationTrainingDetails
                // Conveyance is one-time, food and lodging are per day
                const conveyanceTotal = trainerCostDetails.conveyance || 0;
                const foodTotal = (trainerCostDetails.food || 0) * totalDays;
                const lodgingTotal = (trainerCostDetails.lodging || 0) * totalDays;
                const totalExpenses = roundToNearestWhole(conveyanceTotal + foodTotal + lodgingTotal);
                
                const totalAmount = roundToNearestWhole(trainingFees + totalExpenses);
                
                // TDS applied only on training fees (matching InvoiceModal logic)
                const tdsAmount = roundToNearestWhole((trainingFees * 0.1)); // 10% TDS on training fees only
                const amountBeforeGST = roundToNearestWhole(totalAmount - tdsAmount);
                
                // No GST in SendSchedule (simplified version)
                const payableCost = amountBeforeGST;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-800 mb-2">Training Details</h4>
                        <div className="space-y-1 text-sm">
                          <div>Total Days: {totalDays}</div>
                          <div>Total Hours: {totalHours.toFixed(2)}</div>
                          <div>Fee per Hour: ₹{feePerHour.toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-800 mb-2">Expenses</h4>
                        <div className="space-y-1 text-sm">
                          <div>Conveyance: ₹{conveyanceTotal.toLocaleString('en-IN')}</div>
                          <div>Food: ₹{foodTotal.toLocaleString('en-IN')} (₹{(trainerCostDetails.food || 0).toLocaleString('en-IN')} × {totalDays})</div>
                          <div>Lodging: ₹{lodgingTotal.toLocaleString('en-IN')} (₹{(trainerCostDetails.lodging || 0).toLocaleString('en-IN')} × {totalDays})</div>
                          <div className="font-medium">Total Expenses: ₹{totalExpenses.toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-800 mb-2">Cost Summary</h4>
                      <div className="space-y-1 text-sm">
                        <div>Training Fees: ₹{trainingFees.toLocaleString('en-IN')}</div>
                        <div>Total Amount: ₹{totalAmount.toLocaleString('en-IN')}</div>
                        <div>TDS (10% on Training Fees): ₹{tdsAmount.toLocaleString('en-IN')}</div>
                        <div className="font-bold text-lg">Payable Amount: ₹{payableCost.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmSchedule}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Confirm & Next
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm & Email */}
          {currentStep === 4 && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Confirm Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      name="to"
                      value={emailData.to}
                      onChange={handleInputChange}
                      required
                      className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter recipient email"
                    />
                    <button
                      type="button"
                      onClick={handleImportEmail}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-500 rounded-lg hover:from-blue-600 hover:to-blue-700 hover:border-blue-600 transition-all duration-200 text-sm font-medium whitespace-nowrap shadow-sm hover:shadow-md transform hover:scale-105 flex items-center gap-2"
                      title="Import email from trainer database"
                    >
                      <FiMail className="w-4 h-4" />
                      Import Email
                    </button>
                  </div>
                </div>

                {/* Editable Venue */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venue
                  </label>
                  <input
                    type="text"
                    name="venue"
                    value={emailData.venue}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Editable Contact Person */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={emailData.contactPerson}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Editable Contact Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    name="contactNumber"
                    value={emailData.contactNumber}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                >
                  {loading ? (
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                  ) : (
                    <FiSend className="mr-2" />
                  )}
                  Send Email
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {success && (
            <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
              <FiCheck className="mr-2" />
              Email sent successfully!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SendSchedule;
