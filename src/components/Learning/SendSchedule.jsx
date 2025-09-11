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

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

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
    console.log("Checking trainer:", trainer.trainerId, trainer.id, "against", selectedTrainer.trainerId, selectedTrainer.id);
    return trainer.trainerId === selectedTrainer.trainerId || trainer.trainerId === selectedTrainer.id;
  });

  console.log("Matched trainer details:", trainerDetails);

  let totalConveyance = 0;
  let totalFood = 0;
  let totalLodging = 0;

  trainerDetails.forEach(detail => {
    console.log("Detail values:", detail.conveyance, detail.food, detail.lodging);
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

    if (s.includes("AM & PM") || (s.includes("AM") && s.includes("PM"))) {
      if (collegeStartTime && collegeEndTime)
        return `${collegeStartTime} - ${collegeEndTime}`;
      return "AM & PM";
    }
    if (s.includes("AM")) {
      if (collegeStartTime && lunchStartTime)
        return `${collegeStartTime} - ${lunchStartTime}`;
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
    if ((trainingFormDoc || trainingData) && selectedTrainer) {
      setEmailData((prev) => ({
        ...prev,
        to: "", // Keep empty by default
        venue:
          trainingFormDoc?.address ||
          trainingFormDoc?.venue ||
          trainingFormDoc?.accountName ||
          trainingData?.venue ||
          "",
        contactPerson:
          trainingFormDoc?.tpoName ||
          trainingFormDoc?.contactPerson ||
          trainingFormDoc?.createdBy?.name ||
          trainingData?.contactPerson ||
          "",
        contactNumber:
          trainingFormDoc?.tpoPhone ||
          trainingFormDoc?.trainingPhone ||
          trainingFormDoc?.accountPhone ||
          trainingData?.trainingPhone ||
          trainingData?.tpoPhone ||
          "",
      }));
    }
  }, [trainingFormDoc, trainingData, selectedTrainer]);

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
            console.warn(`Error fetching trainer ${trainerId}:`, err);
          }
        }

        setTrainers(assignedTrainers);
      } catch (err) {
        console.error("Error fetching assigned trainers:", err);
        setError("Failed to load trainers");
      }
    };

    fetchAssignedTrainers();
  }, [training?.id]);

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
        console.error("Error fetching training form/phase doc:", err);
        setError("Failed to load training details");
      }
    };

    fetchTrainingFormAndPhase();
  }, [training?.id, training?.selectedPhase]);

  // ---------- Fetch trainer-specific assignments ----------
  const fetchTrainerSchedule = async (trainerId) => {
    setFetchingSchedule(true);
    try {
      const q = query(
        collection(db, "trainerAssignments"),
        where("trainerId", "==", trainerId),
        where("sourceTrainingId", "==", training.id)
      );
      const assignmentsSnap = await getDocs(q);
      const assignments = [];
      assignmentsSnap.forEach((doc) =>
        assignments.push({ id: doc.id, ...doc.data() })
      );
      assignments.sort((a, b) => new Date(a.date) - new Date(b.date));
      setTrainerAssignments(assignments);
    } catch (err) {
      console.error("Error fetching trainer assignments:", err);
      setError("Failed to fetch trainer schedule");
    } finally {
      setFetchingSchedule(false);
    }
  };

  const handleTrainerSelect = (trainer) => {
    setSelectedTrainer(trainer);
    setCurrentStep(2);
    fetchTrainerSchedule(trainer.trainerId || trainer.id);
  };

  // ADD THIS MISSING FUNCTION
  const handleConfirmSchedule = () => {
    setCurrentStep(3);
    setError(""); // Clear any previous errors
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
      setError("Please enter recipient email or click 'Import Email' to load from trainer data");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let feePerHour = 0;
      if (selectedTrainer) {
        try {
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
            feePerHour = trainerData.charges || trainerData.feePerHour || 0;
          } else {
            const tDocRef = doc(db, "trainers", selectedTrainer.id);
            const tDocSnap = await getDoc(tDocRef);
            if (tDocSnap.exists())
              feePerHour =
                tDocSnap.data().charges || tDocSnap.data().feePerHour || 0;
          }
        } catch (err) {
          console.error("Error fetching trainer rate:", err);
        }
      }
      
      const totalHours = (() => {
        // Find the trainer's assigned hours from trainersData
        const trainerDetails = trainersData.find(trainer =>
          trainer.trainerId === selectedTrainer.trainerId ||
          trainer.trainerId === selectedTrainer.id ||
          trainer.id === selectedTrainer.trainerId ||
          trainer.id === selectedTrainer.id
        );

        if (trainerDetails && trainerDetails.assignedHours) {
          return trainerDetails.assignedHours;
        }

        // Fallback: Calculate from assignment data
        return trainerAssignments.reduce((acc, assignment) => {
          return acc + (assignment.assignedHours || 0);
        }, 0);
      })();

      // FIXED: Include expenses in total cost calculation
      const trainingFees = totalHours * (feePerHour || 0);
      const totalExpenses = trainerCostDetails.conveyance + trainerCostDetails.food + trainerCostDetails.lodging;
      const totalCost = trainingFees + totalExpenses;
      const tdsAmount = totalCost * 0.1; // 10% TDS
      const payableCost = totalCost - tdsAmount;

      const scheduleRows = trainerAssignments
        .map((assignment) => {
          // Find the trainer's assigned hours from trainersData
          const trainerDetails = trainersData.find(trainer =>
            trainer.trainerId === selectedTrainer.trainerId ||
            trainer.trainerId === selectedTrainer.id ||
            trainer.id === selectedTrainer.trainerId ||
            trainer.id === selectedTrainer.id
          );

          let hoursPerDay = 0;
          if (trainerDetails && trainerDetails.assignedHours) {
            const totalAssignments = trainerAssignments.length;
            hoursPerDay = totalAssignments > 0 ? trainerDetails.assignedHours / totalAssignments : 0;
          } else {
            // Fallback: Calculate from assignment data
            const totalAssignments = trainerAssignments.length;
            const totalAssignedHours = trainerAssignments.reduce((acc, assign) => {
              return acc + (assign.assignedHours || 0);
            }, 0);
            hoursPerDay = totalAssignments > 0 ? totalAssignedHours / totalAssignments : 0;
          }

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
        salutation: selectedTrainer?.salutation || "Dear",
        trainer_last_name: (
          selectedTrainer?.name ||
          selectedTrainer?.trainerName ||
          ""
        ).split(" ").slice(-1).join(" "),
        college_name: trainingFormDoc?.collegeName || trainingData?.collegeName || "",
        venue_address: emailData.venue,
        contact_person: emailData.contactPerson,
        contact_number: emailData.contactNumber,

        conveyance: trainerCostDetails.conveyance,
        food: trainerCostDetails.food,
        lodging: trainerCostDetails.lodging,
        total_expenses: totalExpenses,

        schedule_rows: scheduleRows,
        total_days: trainerAssignments.length,
        total_hours: totalHours,
        start_date: trainerAssignments[0]
          ? formatDate(trainerAssignments[0].date)
          : "",
        fee_per_hour: feePerHour,
        fee_per_day:
          trainerAssignments.length > 0
            ? (() => {
                // Find the trainer's assigned hours from trainersData
                const trainerDetails = trainersData.find(trainer =>
                  trainer.trainerId === selectedTrainer.trainerId ||
                  trainer.trainerId === selectedTrainer.id ||
                  trainer.id === selectedTrainer.trainerId ||
                  trainer.id === selectedTrainer.id
                );

                let hoursPerDay = 0;
                if (trainerDetails && trainerDetails.assignedHours) {
                  hoursPerDay = trainerDetails.assignedHours / trainerAssignments.length;
                } else {
                  const totalAssignedHours = trainerAssignments.reduce((acc, assign) => {
                    return acc + (assign.assignedHours || 0);
                  }, 0);
                  hoursPerDay = totalAssignedHours / trainerAssignments.length;
                }

                return feePerHour * hoursPerDay;
              })()
            : 0,
        total_cost: totalCost,
        tds_amount: tdsAmount,
        payable_cost: payableCost,
        project_code:
          trainingFormDoc?.projectCode || trainingData?.projectCode || "",
        payment_cycle:
          trainingFormDoc?.payment_cycle ||
          trainingFormDoc?.paymentCycle ||
          "30",
      };

      console.log("Sending email with params:", templateParams);

      await emailjs.send(
        "service_pskknsn",
        "template_p2as3pp",
        templateParams,
        "zEVWxxT-QvGIrhvTV"
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err) {
      console.error("Error sending email:", err);
      setError("Failed to send email. Please try again.");
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
            {[1, 2, 3, 4].map((step) => (
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
                  {step === 3 && "Confirm & Email"}
                  {step === 4 && "Send"}
                </span>
                {step < 4 && (
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
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
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
                      {trainerAssignments.map((assignment) => (
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
                            {(() => {
                              // Find the trainer's assigned hours from trainersData
                              const trainerDetails = trainersData.find(trainer =>
                                trainer.trainerId === selectedTrainer.trainerId ||
                                trainer.trainerId === selectedTrainer.id ||
                                trainer.id === selectedTrainer.trainerId ||
                                trainer.id === selectedTrainer.id
                              );

                              if (trainerDetails && trainerDetails.assignedHours) {
                                // Calculate hours per day based on trainer's total assigned hours divided by number of days
                                const totalAssignments = trainerAssignments.length;
                                const hoursPerDay = totalAssignments > 0 ? trainerDetails.assignedHours / totalAssignments : 0;
                                return hoursPerDay.toFixed(2);
                              }

                              // Fallback: Calculate from assignment data
                              const totalAssignments = trainerAssignments.length;
                              const totalAssignedHours = trainerAssignments.reduce((acc, assignment) => {
                                return acc + (assignment.assignedHours || 0);
                              }, 0);
                              const hoursPerDay = totalAssignments > 0 ? totalAssignedHours / totalAssignments : 0;
                              return hoursPerDay.toFixed(2);
                            })()}
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
                      ))}
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
                  onClick={handleConfirmSchedule}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Confirm & Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm Email */}
          {/* Step 3: Confirm Email */}
          {currentStep === 3 && (
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
                      className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition-colors text-sm whitespace-nowrap"
                      title="Import email from trainer"
                    >
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
                  onClick={() => setCurrentStep(2)}
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
