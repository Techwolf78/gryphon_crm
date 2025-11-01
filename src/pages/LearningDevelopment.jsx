import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import TrainingTable from "../components/Learning/TrainingTables/TrainingTable";
import TrainingDetailModal from "../components/Learning/TrainingTables/TrainingDetailModal";
import FilePreviewModal from "../components/Learning/TrainingTables/FilePreviewModal";
import StudentDataPage from "../components/Learning/StudentDataPage";
import InitiationDashboard from "../components/Learning/Initiate/InitiationDashboard";
import InitiationTrainingDetails from "../components/Learning/Initiate/InitiationTrainingDetails";
import InitiationModal from "../components/Learning/Initiate/InitiationModal";
import GenerateTrainerInvoice from "../components/Learning/GenerateTrainerInvoice";
import ContractInvoiceTable from "../components/Learning/ContractInvoices/ContractInvoiceTable";
import LearningDevelopmentTour from "../components/tours/LearningDevelopmentTour";
import JDMergeModal from "../components/Learning/JD/JDMergeModal";
import OperationsConfigurationModal from "../components/Learning/JD/OperationsConfigurationModal";
import JDInitiationModal from "../components/Learning/JD/JDInitiationModal";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  CheckCircle,
  XCircle,
  Calendar,
  PlayCircle,
  DollarSign,
} from "lucide-react";
import BudgetDashboard from "../components/Budget/BudgetDashboard";

function LearningDevelopment() {
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileType, setFileType] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [modalTrainingId, setModalTrainingId] = useState(null);
  const [studentPageData, setStudentPageData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem("ld_activeTab") || "newContact";
    } catch {
      return "newContact";
    }
  });
  const [selectedInitiationTraining, setSelectedInitiationTraining] =
    useState(null);
  const [showInitiationModal, setShowInitiationModal] = useState(false);
  const [selectedTrainingForInitiation, setSelectedTrainingForInitiation] =
    useState(null);

  const [isLoading, setIsLoading] = useState(false);

  // Contract sections collapse state
  const [showActiveContracts, setShowActiveContracts] = useState(true);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

    // If current month is April or later, use current year as start of financial year
    // Otherwise use previous year
    const financialYearStart =
      currentMonth >= 4 ? currentYear : currentYear - 1;
    return `${financialYearStart}-${(financialYearStart + 1)
      .toString()
      .slice(-2)}`;
  });
  const [showJDMergeModal, setShowJDMergeModal] = useState(false);
  const [selectedJDColleges, setSelectedJDColleges] = useState([]);
  const [showOperationsConfigModal, setShowOperationsConfigModal] =
    useState(false);
  const [operationsConfig, setOperationsConfig] = useState(null);
  const [showJDInitiationModal, setShowJDInitiationModal] = useState(false);
  const [onRefreshInitiationDashboard, setOnRefreshInitiationDashboard] =
    useState(null);
  const [existingJDConfig, setExistingJDConfig] = useState(null);

  // Function to categorize trainings into active and old contracts
  const categorizeTrainings = (trainings) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

    const active = [];
    const old = [];

    trainings.forEach((training) => {
      let isActive = false;

      // Check if contract has start and end dates
      if (training.contractStartDate && training.contractEndDate) {
        try {
          // Handle different date formats
          let startDate, endDate;

          if (training.contractStartDate.toDate) {
            // Firestore Timestamp
            startDate = training.contractStartDate.toDate();
            endDate = training.contractEndDate.toDate();
          } else {
            // String or Date object
            startDate = new Date(training.contractStartDate);
            endDate = new Date(training.contractEndDate);
          }

          // Reset time to start of day for accurate comparison
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999); // End of day

          // Check if today is within the contract period
          if (today >= startDate && today <= endDate) {
            isActive = true;
          }
        } catch (error) {
          console.warn(
            "Error parsing contract dates for training:",
            training.id,
            error
          );
          // If dates can't be parsed, consider it active by default
          isActive = true;
        }
      } else {
        // If no dates specified, consider it active
        isActive = true;
      }

      if (isActive) {
        active.push(training);
      } else {
        old.push(training);
      }
    });

    return { active, old };
  };

  // Function to generate financial year options dynamically
  const generateFinancialYearOptions = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

    // Determine current financial year start
    const currentFinancialYearStart =
      currentMonth >= 4 ? currentYear : currentYear - 1;

    const options = [];

    // Add past years (go back to 2024-25 for now, can be adjusted)
    for (let i = currentFinancialYearStart - 1; i >= 2024; i--) {
      const yearOption = `${i}-${(i + 1).toString().slice(-2)}`;
      options.push(yearOption);
    }

    // Add current and future years (5 years ahead)
    for (
      let i = currentFinancialYearStart;
      i <= currentFinancialYearStart + 5;
      i++
    ) {
      const yearOption = `${i}-${(i + 1).toString().slice(-2)}`;
      options.push(yearOption);
    }

    return options.map((year) => ({
      value: year,
      label: year,
    })); // Show newest first (upside down)
  };

  // Function to filter trainings by financial year
  const filterTrainingsByFinancialYear = (trainings, financialYear) => {
    if (!financialYear) return trainings;

    const [startYear] = financialYear.split("-");
    const financialYearStart = new Date(parseInt(startYear), 3, 1); // April 1st of start year
    const financialYearEnd = new Date(
      parseInt(startYear) + 1,
      2,
      31,
      23,
      59,
      59,
      999
    ); // March 31st of next year

    return trainings.filter((training) => {
      // Check if training has creation date or contract dates within the financial year
      let trainingDate = null;

      if (training.createdAt) {
        trainingDate = training.createdAt.toDate
          ? training.createdAt.toDate()
          : new Date(training.createdAt);
      } else if (training.contractStartDate) {
        trainingDate = training.contractStartDate.toDate
          ? training.contractStartDate.toDate()
          : new Date(training.contractStartDate);
      }

      if (trainingDate) {
        return (
          trainingDate >= financialYearStart && trainingDate <= financialYearEnd
        );
      }

      return false; // If no date available, don't include
    });
  };

  // Set the refresh callback when InitiationDashboard mounts
  useEffect(() => {
    if (onRefreshInitiationDashboard) {
      setOnRefreshInitiationDashboard(onRefreshInitiationDashboard);
    }
  }, [onRefreshInitiationDashboard]);

  // Function to refresh the initiation dashboard
  const refreshInitiationDashboard = () => {
    if (onRefreshInitiationDashboard) {
      onRefreshInitiationDashboard();
    }
  };

  const navigate = useNavigate();
  const { user } = useAuth();

  // Calculate active tab index for sliding indicator
  const getActiveTabIndex = () => {
    switch (activeTab) {
      case "newContact":
        return 0;
      case "initiation":
        return 1;
      case "trainerInvoice":
        return 2;
      case "contractInvoices":
        return 3;
      case "budget":
        return 4;
      default:
        return 0;
    }
  };

  const fetchTrainings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const q = query(
        collection(db, "trainingForms"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const data = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const trainingData = { id: doc.id, ...doc.data() };

          // Check if training has been initiated by looking for phases
          try {
            const trainingsSnap = await getDocs(
              collection(db, "trainingForms", doc.id, "trainings")
            );
            trainingData.isInitiated = !trainingsSnap.empty;

            // Check if JD phase is initiated
            const jdPhaseDoc = trainingsSnap.docs.find(
              (doc) => doc.id === "JD"
            );
            trainingData.isJDInitiated = !!jdPhaseDoc;
          } catch {
            // Error checking initiation status - handled silently
            trainingData.isInitiated = false;
            trainingData.isJDInitiated = false;
          }

          return trainingData;
        })
      );

      setTrainings(data);
    } catch {
      // Error fetching trainings - handled through UI error state
      setError("Failed to load training data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "newContact") {
      fetchTrainings();
    }
  }, [activeTab]);

  // Persist active tab so it survives reloads
  useEffect(() => {
    try {
      localStorage.setItem("ld_activeTab", activeTab);
    } catch {
      // ignore storage errors
    }
  }, [activeTab]);

  const handleViewStudentData = (item) => {
    if (!item.studentFileUrl) {
      alert("No student file available.");
      return;
    }
    setStudentPageData({
      fileUrl: item.studentFileUrl,
      trainingId: item.id,
      trainingName: item.trainingName || "Training",
    });
  };

  const handleViewMouFile = (item) => {
    if (!item.mouFileUrl) {
      alert("No MOU file available.");
      return;
    }
    setFileType("mou");
    setFileUrl(item.mouFileUrl);
    setModalTrainingId(item.id);
    setShowFileModal(true);
  };

  const handleViewTrainers = () => {
    navigate("trainers");
  };

  // When Initiation button is clicked from TrainingTable
  const handleInitiateClick = (training) => {
    setSelectedTrainingForInitiation(training);
    setShowInitiationModal(true);
  };

  // Handle JD Training initiation
  const handleInitiateJD = () => {
    // TODO: Remove this toast notification and uncomment the line below when JD training is ready for production
    // toast.info("JD Training feature is still under development and not available for use yet", {
    //   position: "top-right",
    //   autoClose: 5000,
    //   hideProgressBar: false,
    //   closeOnClick: true,
    //   pauseOnHover: true,
    //   draggable: true,
    // });

    // Uncomment the line below when ready to enable JD training functionality:
    setShowJDMergeModal(true);
  };

  // Handle JD colleges selected
  const handleJDCollegesSelected = (colleges, existingConfig = null) => {
    setSelectedJDColleges(colleges);
    setExistingJDConfig(existingConfig);
    setShowJDMergeModal(false);
    setShowOperationsConfigModal(true);
  };

  // Handle operations configuration
  const handleOperationsConfigured = (config) => {
    setOperationsConfig(config);
    setExistingJDConfig((prev) =>
      prev ? { ...prev, operationsConfig: config } : null
    );
    setShowOperationsConfigModal(false);
    setShowJDInitiationModal(true);
  };

  // Handle JD editing from dashboard
  const handleEditJD = async (training) => {
    try {
      // Fetch existing JD phase data
      const jdPhaseRef = doc(
        db,
        "trainingForms",
        training.trainingId,
        "trainings",
        "JD"
      );
      const jdPhaseSnap = await getDoc(jdPhaseRef);

      if (jdPhaseSnap.exists()) {
        const jdData = jdPhaseSnap.data();

        // Extract merged colleges
        const mergedColleges = jdData.mergedColleges || [];

        // Extract operations config
        const operationsConfig = {
          totalStudents: jdData.totalStudents || 0,
          batches: jdData.batches || [],
          collegeStudentCounts: jdData.collegeStudentCounts || {},
          numBatches: jdData.numBatches || 1,
        };

        // Set state for JD editing
        setSelectedJDColleges(mergedColleges);
        setOperationsConfig(operationsConfig);

        // Open JD initiation modal in edit mode
        setShowJDInitiationModal(true);
      } else {
        alert("JD training data not found");
      }
    } catch {
      alert("Failed to load JD training data");
    }
  };

  // Handle JD initiation modal close
  const handleJDInitiationClose = () => {
    setShowJDInitiationModal(false);
    setSelectedJDColleges([]);
    setOperationsConfig(null);
    setExistingJDConfig(null);
    // Refresh trainings data
    if (activeTab === "newContact") {
      fetchTrainings();
    }
    // Also refresh initiation dashboard if needed
    refreshInitiationDashboard();
  };

  // NEW: Handle "Start Phase" button click from InitiationDashboard
  const handleStartPhase = async (training) => {
    setSelectedTrainingForInitiation(training);
    setShowInitiationModal(true);
  };

  // NEW: Handle closing InitiationModal and refresh dashboard
  const handleInitiationModalClose = () => {
    setShowInitiationModal(false);
    setSelectedTrainingForInitiation(null);
    // Optionally refresh the dashboard data here if needed
  };

  if (studentPageData) {
    return (
      <StudentDataPage
        fileUrl={studentPageData.fileUrl}
        trainingId={studentPageData.trainingId}
        trainingName={studentPageData.trainingName}
        onBack={() => setStudentPageData(null)}
      />
    );
  }

  if (showInitiationModal && selectedTrainingForInitiation) {
    return (
      <InitiationModal
        training={selectedTrainingForInitiation}
        onClose={handleInitiationModalClose}
        onConfirm={handleInitiationModalClose}
      />
    );
  }

  return (
    <>
      <LearningDevelopmentTour userId={user?.uid} />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="bg-gray-50 min-h-screen pt-0 -mt-2">
        <div
          className="flex justify-between items-center mb-1"
          data-tour="ld-header"
        >
          <h1 className="text-2xl font-bold text-blue-800">
            Training Dashboard
          </h1>
          <button
            onClick={handleViewTrainers}
            className="px-2 py-0.5 bg-blue-600 text-white font-medium rounded-full shadow-md hover:bg-blue-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 border border-gray-300 text-sm"
            data-tour="view-trainers-button"
          >
            View Trainers
          </button>
        </div>

        {/* Enhanced Tab Navigation with Sliding Indicator */}
        <div className="relative mb-0.5">
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 px-6 py-2 font-medium text-sm transition-all duration-150 ${
                activeTab === "newContact"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("newContact")}
              data-tour="new-contract-tab"
            >
              All Contracts (
              {
                filterTrainingsByFinancialYear(trainings, selectedFinancialYear)
                  .length
              }
              )
            </button>
            <button
              className={`flex-1 px-6 py-2 font-medium text-sm transition-all duration-150 ${
                activeTab === "initiation"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("initiation")}
              data-tour="trainings-tab"
            >
              Trainings
            </button>
            <button
              className={`flex-1 px-6 py-2 font-medium text-sm transition-all duration-150 ${
                activeTab === "trainerInvoice"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("trainerInvoice")}
              data-tour="trainer-invoice-tab"
            >
              Trainer Invoice
            </button>
            <button
              className={`flex-1 px-6 py-2 font-medium text-sm transition-all duration-150 ${
                activeTab === "contractInvoices"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("contractInvoices")}
              data-tour="contract-invoices-tab"
            >
              Contract Invoices
            </button>
            {/* NEW BUDGET TAB */}
            <button
              className={`flex-1 px-6 py-2 font-medium text-sm transition-all duration-150 ${
                activeTab === "budget"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("budget")}
              data-tour="budget-tab"
            >
              <div className="flex items-center justify-center gap-2">
                <DollarSign size={14} />
                <span>Budget</span>
              </div>
            </button>
          </div>
          {/* Sliding Indicator - UPDATED width */}
          <div
            className="absolute bottom-0 h-0.5 bg-blue-600 transition-transform duration-150 ease-out"
            style={{
              width: "20%", // Changed from 25% to 20% for 5 tabs
              transform: `translateX(${getActiveTabIndex() * 100}%)`,
            }}
          ></div>
        </div>

        {error && (
          <div className="mb-2 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
            {error}
            <button
              onClick={fetchTrainings}
              className="ml-4 text-blue-600 hover:text-blue-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "newContact" ? (
          isLoading ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm ring-1 ring-gray-200/60">
              {/* Desktop Header Skeleton */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 text-[11px] font-semibold tracking-wide uppercase text-gray-600 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200">
                <div className="col-span-3 flex items-center gap-1.5">
                  <div className="h-4 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-12"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-8"></div>
                </div>
                <div className="col-span-3 flex items-center gap-1.5">
                  <div className="h-4 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-12"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-12"></div>
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <div className="h-4 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-12"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-16"></div>
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <div className="h-4 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-8"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-8"></div>
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-10"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-10"></div>
                  </div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-4 opacity-0"></div>
                </div>
              </div>

              {/* Skeleton Rows */}
              <div className="divide-y divide-gray-100/80">
                {[...Array(5)].map((_, index) => (
                  <div
                    key={index}
                    className={`relative group ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                    } hover:bg-gray-50 transition-colors`}
                  >
                    {/* Mobile Card Layout Skeleton */}
                    <div className="md:hidden p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-1">
                            <div className="h-4 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-6 mr-2"></div>
                            <div className="h-5 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-20"></div>
                            {index % 3 === 0 && (
                              <div className="h-4 w-4 bg-gradient-to-r from-green-200 via-green-100 to-green-200 rounded-full animate-pulse ml-2"></div>
                            )}
                          </div>
                          <div className="flex items-center text-gray-600 text-sm">
                            <div className="h-4 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-6 mr-2"></div>
                            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-32"></div>
                          </div>
                          <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-16 mt-1 ml-8"></div>
                        </div>
                        <div className="h-8 w-8 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-full animate-pulse mt-0.5"></div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-[13px]">
                        <div className="flex items-center">
                          <div className="h-3 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-4 mr-1.5"></div>
                          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-8"></div>
                        </div>
                        <div className="flex items-center">
                          <div className="h-3 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-4 mr-1.5"></div>
                          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-12"></div>
                        </div>
                        <div className="flex items-center">
                          <div className="h-3 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-4 mr-1.5"></div>
                          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-6"></div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Grid Layout Skeleton */}
                    <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 text-[13px] items-center">
                      <div className="col-span-3 truncate">
                        <div className="flex items-center gap-2">
                          <div className="h-4 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-16"></div>
                          {index % 3 === 0 && (
                            <div className="h-4 w-4 bg-gradient-to-r from-green-200 via-green-100 to-green-200 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </div>
                      <div className="col-span-3 truncate">
                        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-24"></div>
                        <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-12 mt-0.5"></div>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5">
                        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-6"></div>
                        <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-12"></div>
                      </div>
                      <div className="col-span-2">
                        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-16"></div>
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-8"></div>
                        <div className="h-8 w-8 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Loading Text with Animation */}
              <div className="text-center py-6">
                <div className="inline-flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                  <span className="text-gray-600 font-medium">
                    Loading training data...
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Financial Year Filter and Enhanced Toggle Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-1">
                {/* Financial Year Filter */}
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">
                    Financial Year:
                  </label>
                  <select
                    value={selectedFinancialYear}
                    onChange={(e) => setSelectedFinancialYear(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {generateFinancialYearOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Enhanced Toggle Buttons */}
                <div className="relative bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg p-0.5 shadow-inner border border-gray-200/50">
                  {/* Background indicator */}
                  <div
                    className={`absolute top-0.5 bottom-0.5 rounded-md bg-gradient-to-r transition-all duration-300 ease-out shadow-sm ${
                      showActiveContracts
                        ? "left-0.5 right-1/2 from-green-400 to-green-500"
                        : "left-1/2 right-0.5 from-gray-400 to-gray-500"
                    }`}
                  ></div>

                  <div className="relative flex gap-0">
                    <button
                      onClick={() => setShowActiveContracts(true)}
                      className={`relative px-4 py-1 rounded-md font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                        showActiveContracts
                          ? "text-white drop-shadow-sm"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      <PlayCircle
                        size={12}
                        className={
                          showActiveContracts ? "text-white" : "text-green-500"
                        }
                      />
                      <span className="relative z-10">Active</span>
                      <span
                        className={`text-xs font-medium ml-1 px-1.5 py-0.5 rounded-full transition-colors duration-300 ${
                          showActiveContracts
                            ? "bg-white/20 text-white"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {
                          categorizeTrainings(
                            filterTrainingsByFinancialYear(
                              trainings,
                              selectedFinancialYear
                            )
                          ).active.length
                        }
                      </span>
                    </button>

                    <button
                      onClick={() => setShowActiveContracts(false)}
                      className={`relative px-4 py-1 pl-8 rounded-md font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                        !showActiveContracts
                          ? "text-white drop-shadow-sm"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      <CheckCircle
                        size={12}
                        className={
                          !showActiveContracts ? "text-white" : "text-gray-500"
                        }
                      />
                      <span className="relative z-10">Completed</span>
                      <span
                        className={`text-xs font-medium ml-1 px-1.5 py-0.5 rounded-full transition-colors duration-300 ${
                          !showActiveContracts
                            ? "bg-white/20 text-white"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {
                          categorizeTrainings(
                            filterTrainingsByFinancialYear(
                              trainings,
                              selectedFinancialYear
                            )
                          ).old.length
                        }
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Contracts Display */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                {showActiveContracts ? (
                  <>
                    <TrainingTable
                      trainingData={
                        categorizeTrainings(
                          filterTrainingsByFinancialYear(
                            trainings,
                            selectedFinancialYear
                          )
                        ).active
                      }
                      onRowClick={setSelectedTraining}
                      onViewStudentData={handleViewStudentData}
                      onViewMouFile={handleViewMouFile}
                      onInitiate={handleInitiateClick}
                      onInitiateJD={handleInitiateJD}
                    />
                  </>
                ) : (
                  <>
                    <TrainingTable
                      trainingData={
                        categorizeTrainings(
                          filterTrainingsByFinancialYear(
                            trainings,
                            selectedFinancialYear
                          )
                        ).old
                      }
                      onRowClick={setSelectedTraining}
                      onViewStudentData={handleViewStudentData}
                      onViewMouFile={handleViewMouFile}
                      onInitiate={handleInitiateClick}
                      onInitiateJD={handleInitiateJD}
                    />
                  </>
                )}
              </div>
            </>
          )
        ) : activeTab === "initiation" ? (
          selectedInitiationTraining ? (
            <InitiationTrainingDetails
              training={selectedInitiationTraining}
              onBack={() => setSelectedInitiationTraining(null)}
            />
          ) : (
            <InitiationDashboard
              onRowClick={setSelectedInitiationTraining}
              onStartPhase={handleStartPhase}
              onEditJD={handleEditJD}
              onRefresh={onRefreshInitiationDashboard}
            />
          )
        ) : activeTab === "trainerInvoice" ? (
          <GenerateTrainerInvoice />
        ) : activeTab === "contractInvoices" ? (
          <ContractInvoiceTable />
        ) : activeTab === "budget" ? (
          <BudgetDashboard
            department="lnd" // Set to LND department for Learning & Development
            showVendorManagement={false} // Set to true if you want vendor management
            showDepartment={false} // Set to true if you want to show department column
          />
        ) : null}
      </div>

      {selectedTraining && (
        <TrainingDetailModal
          training={selectedTraining}
          onClose={() => setSelectedTraining(null)}
        />
      )}

      {showFileModal && fileType === "mou" && (
        <FilePreviewModal
          fileUrl={fileUrl}
          type={fileType}
          trainingId={modalTrainingId}
          onClose={() => setShowFileModal(false)}
        />
      )}

      {/* JD Training Modals */}
      {showJDMergeModal && (
        <JDMergeModal
          onClose={() => setShowJDMergeModal(false)}
          onProceed={handleJDCollegesSelected}
          preSelectedColleges={selectedJDColleges}
        />
      )}

      {showOperationsConfigModal && selectedJDColleges.length > 0 && (
        <OperationsConfigurationModal
          selectedColleges={selectedJDColleges}
          onClose={() => {
            setShowOperationsConfigModal(false);
            setSelectedJDColleges([]);
            setOperationsConfig(null);
            setExistingJDConfig(null);
          }}
          onProceed={handleOperationsConfigured}
          onBack={() => {
            setShowOperationsConfigModal(false);
            setShowJDMergeModal(true);
          }}
          existingConfig={
            existingJDConfig?.operationsConfig || operationsConfig
          }
          isEditing={!!(existingJDConfig?.operationsConfig || operationsConfig)}
        />
      )}

      {showJDInitiationModal &&
        selectedJDColleges.length > 0 &&
        operationsConfig && (
          <JDInitiationModal
            training={{
              id: selectedJDColleges[0]?.id || "",
              isEdit: false, // This is a new training, not editing
              createdBy: {
                uid: user?.uid,
                email: user?.email,
                name: user?.displayName || user?.name || "Unknown",
              },
            }}
            onClose={handleJDInitiationClose}
            onConfirm={handleJDInitiationClose}
            isMerged={selectedJDColleges.length > 1}
            selectedColleges={selectedJDColleges}
            operationsConfig={operationsConfig}
            existingConfig={existingJDConfig}
            onBack={() => {
              setShowJDInitiationModal(false);
              setShowOperationsConfigModal(true);
            }}
          />
        )}
    </>
  );
}

export default LearningDevelopment;
