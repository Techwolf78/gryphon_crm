import React, { useState, useEffect } from "react";
import {
  FiX,
  FiMail,
  FiSend,
  FiUser,
  FiCalendar,
  FiCheck,
} from "react-icons/fi";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import emailjs from "@emailjs/browser";

function SendSchedule({
  training,
  trainingData,
  phaseData,
  domainsData,
  onClose,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [trainerAssignments, setTrainerAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingSchedule, setFetchingSchedule] = useState(false);
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    message: "",
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // ✅ Fetch trainers
  useEffect(() => {
    const fetchAssignedTrainers = async () => {
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

    if (training?.id) fetchAssignedTrainers();
  }, [training?.id]);

  // ✅ Fetch trainer assignments
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
    fetchTrainerSchedule(trainer.id);
  };

  const handleConfirmSchedule = () => {
    setCurrentStep(3);
    setEmailData({
      to: selectedTrainer?.email || "",
      subject: `Training Schedule for ${selectedTrainer.name} - ${trainingData?.collegeName}`,
      message: `Dear ${selectedTrainer.name},\n\nPlease find your training schedule details below:\n\nCollege: ${trainingData?.collegeName}\nCourse: ${trainingData?.course} - ${trainingData?.year}\nPhase: ${training?.selectedPhase}\n\nYour schedule has been confirmed. Please review the details attached.\n\nBest regards,\nTraining Team`,
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmailData((prev) => ({ ...prev, [name]: value }));
  };

const handleSendEmail = async () => {
  if (!emailData.to.trim()) {
    setError("Please enter recipient email");
    return;
  }

  setLoading(true);
  setError("");

  try {
    // Fetch trainer's rate from the trainers collection
    let feePerHour = 0;

    if (selectedTrainer) {
      try {
        const trainerQuery = query(
          collection(db, "trainers"),
          where("trainerId", "==", selectedTrainer.trainerId || selectedTrainer.id)
        );
        const trainerSnap = await getDocs(trainerQuery);

        if (!trainerSnap.empty) {
          const trainerData = trainerSnap.docs[0].data();
          feePerHour = trainerData.charges || 0;
        }
      } catch (err) {
        console.error("Error fetching trainer rate:", err);
      }
    }

    // Calculate total hours by summing all assignment hours
    const totalHours = trainerAssignments.reduce(
      (acc, assignment) => acc + (parseFloat(assignment.hours) || 0),
      0
    );

    // Calculate financial details
    const totalCost = totalHours * feePerHour;
    const tdsAmount = totalCost * 0.1; // 10% TDS
    const payableCost = totalCost - tdsAmount;
console.log("Fee per Hour:", feePerHour);
console.log("Total Cost:", totalCost);
console.log("TDS (10%):", tdsAmount);
console.log("Payable Amount:", payableCost);
    // Generate schedule rows with correct per-session cost
    const scheduleRows = trainerAssignments
      .map(
        (assignment) => `
    <tr>
      <td>${assignment.domain || "-"}</td>
      <td>${trainingData?.year || "-"}</td>
      <td>${selectedTrainer?.name || "-"}</td>
      <td>${formatDate(assignment.date)}</td>
      <td>${assignment.batchCode || "-"}</td>
      <td>${getTimingForSlot(assignment.dayDuration)}</td>
      <td>${assignment.hours || "0"}</td>
      <td>₹ ${feePerHour}</td>
      <td>₹ ${feePerHour * (parseFloat(assignment.hours) || 0)}</td>
    </tr>`
      )
      .join("");

    const templateParams = {
      to_email: emailData.to,
      // ... other template parameters
      schedule_rows: scheduleRows,
      total_days: trainerAssignments.length,
      total_hours: totalHours,
      start_date: trainerAssignments[0]
        ? formatDate(trainerAssignments[0].date)
        : "",
      fee_per_hour: feePerHour,
      total_cost: totalCost,
      tds_amount: tdsAmount,
      payable_cost: payableCost,
      // ... other template parameters
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
    }, 3000);
  } catch (err) {
    console.error("Error sending email:", err);
    setError("Failed to send email. Please try again.");
  } finally {
    setLoading(false);
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

  const getTimingForSlot = (slot) => {
    if (!slot) return "-";
    const s = String(slot).toUpperCase();
    const { collegeStartTime, lunchStartTime, lunchEndTime, collegeEndTime } =
      phaseData || {};

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
                            {assignment.domain || "-"}
                          </td>
                          <td className="px-4 py-2 border border-gray-200">
                            {assignment.batchCode || "-"}
                          </td>
                          <td className="px-4 py-2 border border-gray-200">
                            {assignment.collegeName || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No assignments found for this trainer in the selected phase
                </div>
              )}

              {trainerAssignments.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleConfirmSchedule}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <FiCheck className="mr-2" />
                    Confirm Schedule
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm & Email Setup */}
          {currentStep === 3 && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Confirm Schedule & Setup Email
              </h3>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center text-green-800">
                  <FiCheck className="mr-2" />
                  <span className="font-medium">
                    Schedule Confirmed for {selectedTrainer?.name}
                  </span>
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Total assignments: {trainerAssignments.length}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Email *
                  </label>
                  <input
                    type="email"
                    name="to"
                    value={emailData.to}
                    onChange={handleInputChange}
                    placeholder="Enter recipient email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={emailData.subject}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={emailData.message}
                    onChange={handleInputChange}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Proceed to Send
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Send Email */}
          {currentStep === 4 && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Send Email
              </h3>

              {success && (
                <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  Email sent successfully!
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-gray-800 mb-2">
                  Email Preview
                </h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>
                    <strong>To:</strong> {emailData.to}
                  </p>
                  <p>
                    <strong>Subject:</strong> {emailData.subject}
                  </p>
                  <div className="mt-3 p-3 bg-white rounded border">
                    <pre className="whitespace-pre-wrap text-sm">
                      {emailData.message}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <FiSend className="mr-2" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SendSchedule;