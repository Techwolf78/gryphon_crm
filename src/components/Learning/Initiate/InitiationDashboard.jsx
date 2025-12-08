import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteField,
  query,
  where,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";
import {
  FiPlay,
  FiEdit,
  FiCalendar,
  FiUsers,
  FiBookOpen,
  FiMoreVertical,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiUserCheck,
  FiX,
  FiCircle,
  FiClock,
  FiPause,
  FiCheckCircle,
  FiUser,
  FiTrash2, // Added for Clear All icon
  FiDollarSign,
  FiTrendingUp,
  FiCornerLeftDown,
} from "react-icons/fi";
import InitiationDashboardExportButton from './InitiationDashboardExportButton';
import InitiationDashboardReportButton from './InitiationDashboardReportButton';
import ChangeTrainerDashboard from "./ChangeTrainerDashboard";
import TrainerCalendar from "../TrainerCalendar/TrainerCalendar";
import { auditLogTrainingOperations } from "../../../utils/learningAuditLogger";

const PHASE_LABELS = {
  "phase-1": "Phase 1",
  "phase-2": "Phase 2",
  "phase-3": "Phase 3",
};

const COLLEGE_CODE_MAPPING = {
  "Sanjivani College Of Engineering": "SCOE",
  "Indira College Of Engineering And Management": "ICEM",
  "Indira Institute Of Management Pune": "IGI",
  "Ramachandran International Institute Of Management": "RIIM",
  "IFEEL - Institute For Future Education Entrepreneurship And Mangement": "IFEEL",
  "P.R. Pote Patil College Of Engineering": "PRPCOE",
  "D Y Patil Kolhapur , Bawada": "DYPB",
  "Nagpur Institute Of Technology": "NIT",
  "YSPM'S Yashoda Technical Campus": "YSPM",
  "Shri Ramdeobaba College of Engineering and Management": "RCOEM",
  "Sharda University": "SUD",
  "Dnyanshree Institute of Engineering And Technology": "DIET",
  "Ideal Institute Of Technology Kakinada": "IITK",
  "International School Of Management Excellence": "ISME",
  "Indira University - Pune": "IU",
  "Mauli College Of Engineering And Technology": "MCOET",
  "Sri Eshwar College Of Engineering": "SECE",
  "Sharad Institute Of Technology": "SITCOE",
  "Sanjivani University": "SU",
  "India Global School Of Business": "IGSB",
  "Indira Global School Of Business": "IGSB",
  // Add more as needed
};

const STATUS_LABELS = {
  all: "All",
  "Not Started": "Not Started",
  Initiated: "Initiated",
  Hold: "Hold",
  "In Progress": "In Progress",
  Done: "Done",
};
const STATUS_UI = {
  "Not Started": {
    pill: "bg-gray-100 text-gray-700",
    icon: "text-gray-700",
    tabActive:
      "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg",
    tabInactive:
      "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200",
  },
  Initiated: {
    pill: "bg-yellow-100 text-yellow-700",
    icon: "text-yellow-700",
    tabActive:
      "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg",
    tabInactive:
      "bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200",
  },
  Hold: {
    pill: "bg-orange-100 text-orange-700",
    icon: "text-orange-700",
    tabActive:
      "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg",
    tabInactive:
      "bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200",
  },
  "In Progress": {
    pill: "bg-blue-100 text-blue-700",
    icon: "text-blue-700",
    tabActive:
      "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg",
    tabInactive:
      "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200",
  },
  Done: {
    pill: "bg-green-100 text-green-700",
    icon: "text-green-700",
    tabActive:
      "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg",
    tabInactive:
      "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200",
  },
};

const STATUS_ICON_MAP = {
  "Not Started": FiCircle,
  Initiated: FiClock,
  Hold: FiPause,
  "In Progress": FiPlay,
  Done: FiCheckCircle,
};

// Helper function to format Firestore timestamps
function formatDate(input) {
  if (!input && input !== 0) return "";
  
  let date;
  
  // Handle Firestore Timestamp
  if (typeof input === "object" && input !== null && typeof input.toDate === "function") {
    date = input.toDate();
  } 
  // Handle Firestore Timestamp as plain object (seconds/nanoseconds)
  else if (typeof input === "object" && input !== null && input.seconds !== undefined && input.nanoseconds !== undefined) {
    date = new Date(input.seconds * 1000 + input.nanoseconds / 1000000);
  }
  // Handle timestamp (number)
  else if (typeof input === "number") {
    date = new Date(input);
  }
  // Handle string date
  else if (typeof input === "string") {
    date = new Date(input);
    if (isNaN(date.getTime())) return input; // Return original if invalid
  }
  // Handle Date object
  else if (input instanceof Date) {
    date = input;
  } else {
    return "";
  }
  
  // Validate date
  if (isNaN(date.getTime())) return "";
  
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

// Helper to group trainings by college
function groupByCollege(trainings) {
  const map = {};
  trainings.forEach((t) => {
    const codeForDisplay = t.projectCode || t.collegeCode || '';
    const key = `${t.collegeName} (${codeForDisplay})`;
    if (!map[key]) {
      map[key] = { phases: [], tcv: t.tcv || 0, totalCost: 0, totalNetPayable: 0, hasGST: false, netPayableAdded: false };
    }
    map[key].phases.push(t);
    map[key].totalCost += t.totalCost || 0;
    if (t.originalFormData?.gstType === "include" && !map[key].netPayableAdded) {
      map[key].totalNetPayable += t.originalFormData?.netPayableAmount || 0;
      map[key].hasGST = true;
      map[key].netPayableAdded = true;
    }
  });
  
  // Calculate health: show cost% of TCV (higher % = higher cost utilization)
  Object.keys(map).forEach((key) => {
    const { tcv, totalCost } = map[key];
    // If TCV is zero, default to 0 to avoid NaN
    map[key].health = tcv > 0 ? (totalCost / tcv) * 100 : 0;
  });
  return map;
}

const InitiationDashboard = ({ onRowClick, onStartPhase, onRefresh }) => {
  const [showTrainerCalendar, setShowTrainerCalendar] = useState(false);
  const [trainerCalendarTraining, setTrainerCalendarTraining] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPhase, setFilterPhase] = useState("all");
  const [activeStatusTab, setActiveStatusTab] = useState(() => {
    try {
      return localStorage.getItem("ld_initiation_activeStatusTab") || "all";
    } catch {
      return "all";
    }
  });
  const [activeHealthTab, setActiveHealthTab] = useState(() => {
    try {
      return localStorage.getItem("ld_initiation_activeHealthTab") || "all";
    } catch {
      return "all";
    }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [changeTrainerModalOpen, setChangeTrainerModalOpen] = useState(false);
  const [selectedTrainingForChange, setSelectedTrainingForChange] =
    useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef();
  const actionBtnRefs = useRef({});
  // Assign To dropdown state
  const [assignDropdownOpenId, setAssignDropdownOpenId] = useState(null);
  const assignDropdownRef = useRef();

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTrainingForDelete, setSelectedTrainingForDelete] = useState(null);

  // Assign training to another user
  const handleAssignToUser = async (training, userOption) => {
    try {
      // Save previous assignment for undo
      const prevAssignedUser = training.originalFormData?.assignedTo;

      // Optimistically update UI - update all trainings with the same trainingId
      setTrainings((prev) =>
        prev.map((t) =>
          t.trainingId === training.trainingId
            ? {
                ...t,
                originalFormData: {
                  ...t.originalFormData,
                  assignedTo: userOption,
                },
              }
            : t
        )
      );

      // Update Firestore - update the parent trainingForms document to assign the entire training
      const trainingDocRef = doc(db, "trainingForms", training.trainingId);
      await updateDoc(trainingDocRef, {
        assignedTo: userOption,
      });

      // Log training assignment change
      try {
        await auditLogTrainingOperations.trainingAssigned(
          training.trainingId,
          training.collegeName,
          prevAssignedUser,
          userOption
        );
      } catch (auditErr) {
        console.error("Error logging training assignment:", auditErr);
        // Don't block the main operation
      }

      // Remove all trainings from current user view if not "all" and user changed
      if (
        selectedUserFilter !== "all" &&
        userOption.uid !== selectedUserFilter
      ) {
        setTrainings((prev) =>
          prev.filter((t) => t.trainingId !== training.trainingId)
        );
      }

      setAssignDropdownOpenId(null);
      setOpenDropdownId(null);

      // Show assignment toast
      if (toast && toast.timer) {
        clearTimeout(toast.timer);
      }
      const timer = setTimeout(() => setToast(null), 6000);
      setToast({
        type: "assignment",
        message: `Assigned to ${
          userOption.name || userOption.email || userOption.uid
        }`,
        trainingId: training.trainingId,
        prevAssignedUser,
        newAssignedUser: userOption,
        timer,
      });
    } catch {
      // fallback
      fetchData();
    }
  };
  const [selectedUserFilter, setSelectedUserFilter] = useState(() => {
    try {
      return localStorage.getItem("ld_initiation_selectedUserFilter") || "";
    } catch {
      return "";
    }
  });
  const [availableUsers, setAvailableUsers] = useState([]);

  // Combined filters dropdown state
  const [filtersDropdownOpen, setFiltersDropdownOpen] = useState(false);
  const filtersBtnRef = useRef();
  const filtersDropdownRef = useRef();

  // Date filter state (moved from separate modal)
  const [dateFilterStart, setDateFilterStart] = useState(() => {
    try {
      return localStorage.getItem("ld_initiation_dateFilterStart") || "";
    } catch {
      return "";
    }
  });
  const [dateFilterEnd, setDateFilterEnd] = useState(() => {
    try {
      return localStorage.getItem("ld_initiation_dateFilterEnd") || "";
    } catch {
      return "";
    }
  });

  const { user } = useAuth();

  // Filter L&D users for assignment (include Admin users if current user is Admin)
  const ldUsers = useMemo(() => {
    // If current user is Admin, show both L&D and Admin users
    if (String(user?.department || "").toLowerCase() === "admin") {
      return availableUsers.filter((u) => {
        const departmentFilter = String(u.department || "").toLowerCase();
        const isLdUser =
          departmentFilter === "l & d" || departmentFilter.includes("learning");
        const isAdminUser = departmentFilter === "admin";
        return isLdUser || isAdminUser;
      });
    }

    // Otherwise, show only L&D users
    return availableUsers.filter((u) => {
      const departmentFilter = String(u.department || "").toLowerCase();
      return (
        departmentFilter === "l & d" || departmentFilter.includes("learning")
      );
    });
  }, [availableUsers, user?.department]);

  const defaultSelectedUserFilter = useMemo(() => {
    if (user?.role === "Director" || user?.role === "Head") {
      return "all";
    } else {
      return user?.uid || "";
    }
  }, [user]);

  const [toast, setToast] = useState(null);
  const getPhaseStatus = (training) => {
    // If status is stored in Firestore, use it (manual override)
    if (training.status) {
      // Special case: If no batches configured, ignore stored status and recompute
      const hasBatches = training.domainsCount > 0;
      if (!hasBatches) {
        // Don't use stored status, fall through to automatic logic
        // Also, update Firestore to remove the stored status since it's inconsistent
        const trainingDocRef = doc(
          db,
          "trainingForms",
          training.trainingId,
          "trainings",
          training.phaseId
        );
        updateDoc(trainingDocRef, { status: deleteField() }).catch(() => {
          // ignore error
        });
      } else {
        const style =
          (STATUS_UI[training.status] && STATUS_UI[training.status].pill) ||
          "bg-gray-100 text-gray-700";
        return { status: training.status, style };
      }
    }

    // If manual status is set, use it
    if (training.manualStatus) {
      const style =
        (STATUS_UI[training.manualStatus] &&
          STATUS_UI[training.manualStatus].pill) ||
        "bg-gray-100 text-gray-700";
      return { status: training.manualStatus, style };
    }

    // Check for hold status
    if (training.status === "hold" || training.isOnHold) {
      const style =
        (STATUS_UI["Hold"] && STATUS_UI["Hold"].pill) ||
        "bg-gray-100 text-gray-700";
      return { status: "Hold", style };
    }

    // Determine status based on batch configuration and dates
    let statusStr = null;
    const hasBatches = training.domainsCount > 0; // Or check for domain data if needed
    const hasDates = training.trainingStartDate && training.trainingEndDate;

    if (!hasBatches) {
      // No batches configured
      if (hasDates) {
        statusStr = "Not Started"; // Dates entered but no batches
      } else {
        statusStr = "Not Started"; // No dates or batches
      }
    } else {
      // Batches configured
      if (!hasDates) {
        statusStr = "Initiated"; // Batches but no dates
      } else {
        // Batches and dates: Check date-based logic
        const today = new Date();
        const startDate = new Date(training.trainingStartDate);
        const endDate = new Date(training.trainingEndDate);
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        if (today >= startDate && today <= endDate) {
          statusStr = "In Progress";
        } else if (today > endDate) {
          statusStr = "Done";
        } else {
          statusStr = "Initiated"; // Batches configured, dates in future
        }
      }
    }

    const style =
      (STATUS_UI[statusStr] && STATUS_UI[statusStr].pill) ||
      "bg-gray-100 text-gray-700";
    return { status: statusStr, style };
  };
  // Fetch all trainingForms and their phases
  const fetchData = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);

      const cacheKey = `ld_initiation_trainings_${
        selectedUserFilter || user?.uid
      }`;
      const cacheExpiry = 5 * 60 * 1000; // 5 minutes

      if (!forceRefresh) {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < cacheExpiry) {
              setTrainings(data);
              setLoading(false);
              return;
            }
          }
        } catch {
          // ignore cache errors
        }
      }

      let q;
      if (selectedUserFilter === "all") {
        // For "All Users", fetch all trainings and filter by availableUsers client-side
        q = query(collection(db, "trainingForms"));
      } else if (selectedUserFilter) {
        q = query(
          collection(db, "trainingForms"),
          where("assignedTo.uid", "==", selectedUserFilter)
        );
      } else if (user) {
        q = query(
          collection(db, "trainingForms"),
          where("assignedTo.uid", "==", user.uid)
        );
      } else {
        // Fallback: If no user, fetch nothing (or handle as needed)
        setTrainings([]);
        setLoading(false);
        return;
      }

      const formsSnap = await getDocs(q);
      const allTrainings = [];

      for (const formDoc of formsSnap.docs) {
        const formData = formDoc.data();
        const phasesSnap = await getDocs(
          collection(db, "trainingForms", formDoc.id, "trainings")
        );

        for (const phaseDoc of phasesSnap.docs) {
          const phaseData = phaseDoc.data();

          // If "all" is selected, filter by availableUsers UIDs client-side
          if (selectedUserFilter === "all") {
            const assignedUid = formData.assignedTo?.uid;
            if (
              !assignedUid ||
              !availableUsers.some((u) => u.uid === assignedUid)
            ) {
              continue; // Skip if not assigned to an available user
            }
          }

          // Use denormalized fields to avoid fetching domains subcollection
          const domainsCount = phaseData.domainsCount || 0;
          const totalBatches = phaseData.totalBatches || 0;
          const domains = phaseData.domains || []; // Assuming domains is an array of domain names
          const domainString = Array.isArray(domains)
            ? domains.join(", ")
            : domains;
          const totalHours = phaseData.totalHours || 0;
          const totalCost = phaseData.totalCost || 0;

          const training = {
            id: `${formDoc.id}_${phaseDoc.id}`,
            trainingId: formDoc.id,
            phaseId: phaseDoc.id,
            collegeName: formData.collegeName,
            // prefer projectCode when available; fall back to collegeCode for compatibility
            projectCode: formData.projectCode || formData.collegeCode,
            collegeCode: formData.projectCode || formData.collegeCode,
            domain: domainString || "-",
            domainsCount: domainsCount,
            totalHours: totalHours,
            totalCost: totalCost,
            table1Data: Array(totalBatches).fill({}), // For batch count display
            tcv: formData.totalCost || 0,
            mergedColleges: phaseData.mergedColleges || null, // Add merged colleges info
            ...phaseData,
            // Include original form data for phase initiation
            originalFormData: formData,
          };
          training.computedStatus = getPhaseStatus(training).status;
          allTrainings.push(training);
        }
      }

      // Cache the data
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: allTrainings,
            timestamp: Date.now(),
          })
        );
      } catch {
        // ignore storage errors
      }

      setTrainings(allTrainings);
      setLoading(false);
    },
    [user, selectedUserFilter, availableUsers]
  ); // Add availableUsers to dependencies

  // Fetch available users based on current user's permissions
  useEffect(() => {
    const fetchAvailableUsers = async () => {
      if (!user) return;

      try {
        let q;

        // Directors and Heads can see the filter, but it should only show L&D and Admin users
        if (user.role === "Director" || user.role === "Head") {
          q = query(collection(db, "users")); // Fetch all users, then filter client-side
        }
        // L&D department users can see all L&D users (including themselves)
        else if (user.department === "L & D") {
          q = query(
            collection(db, "users"),
            where("departments", "array-contains", "L & D")
          );
        }
        // Everyone else can only see themselves (no filter dropdown)
        else {
          q = query(collection(db, "users"), where("uid", "==", user.uid));
        }

        const usersSnap = await getDocs(q);
        let users = usersSnap.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));

        // For Directors and Heads, filter to only include L&D and Admin departments
        if (user.role === "Director" || user.role === "Head") {
          users = users.filter(
            (u) => u.department === "L & D" || u.department === "Admin"
          );
        }

        setAvailableUsers(users);

        // Set default selected user filter based on role if not already set
        if (!selectedUserFilter) {
          setSelectedUserFilter(defaultSelectedUserFilter);
        }
      } catch {
        // Error fetching available users
      }
    };

    fetchAvailableUsers();
  }, [user, selectedUserFilter, defaultSelectedUserFilter]); // Add defaultSelectedUserFilter to dependencies

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // selectedUserFilter changed
  }, [selectedUserFilter]);

  // Refresh data handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true); // Force refresh
    setRefreshing(false);
  }, [fetchData]);

  // Set the onRefresh callback when component mounts
  useEffect(() => {
    if (onRefresh) {
      onRefresh(() => handleRefresh);
    }
  }, [onRefresh, handleRefresh]);

  // Filter trainings based on search, phase, and date
  const filteredTrainings = trainings.filter((training) => {
    const matchesSearch =
      searchTerm === "" ||
      String(training.collegeName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String((training.projectCode || training.collegeCode || "")).toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(training.domain || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPhase =
      filterPhase === "all" || training.phaseId === filterPhase;

    // Date filter based on trainingStartDate
    let matchesDate = true;
    if (dateFilterStart && dateFilterEnd) {
      const startDate = new Date(dateFilterStart);
      const endDate = new Date(dateFilterEnd);
      const trainingStart = training.trainingStartDate
        ? new Date(training.trainingStartDate)
        : null;
      if (trainingStart) {
        matchesDate = trainingStart >= startDate && trainingStart <= endDate;
      } else {
        matchesDate = false; // Exclude if no start date
      }
    }

    return matchesSearch && matchesPhase && matchesDate;
  });

  // Status-aware filtering: compute status counts and filter by active tab
  const filteredTrainingsBase = filteredTrainings;

  const statusCounts = useMemo(() => {
    const counts = {
      all: filteredTrainingsBase.length,
      "Not Started": 0,
      Initiated: 0,
      Hold: 0,
      "In Progress": 0,
      Done: 0,
    };
    filteredTrainingsBase.forEach((t) => {
      const s = t.computedStatus;
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [filteredTrainingsBase]);

  const filteredByStatus = useMemo(() => {
    if (activeStatusTab === "all") return filteredTrainingsBase;
    return filteredTrainingsBase.filter(
      (t) => t.computedStatus === activeStatusTab
    );
  }, [filteredTrainingsBase, activeStatusTab]);

  // Group trainings by college
  const grouped = groupByCollege(filteredByStatus);

  // Calculate overall health
  const overallHealth =
    Object.keys(grouped).length > 0
      ? Object.values(grouped).reduce((acc, data) => acc + data.health, 0) /
        Object.keys(grouped).length
      : 0;
  // Filter grouped by health tab
  const filteredGrouped = useMemo(() => {
    if (activeHealthTab === "all") return grouped;
    const filtered = {};
    Object.entries(grouped).forEach(([college, data]) => {
      let include = false;
      if (activeHealthTab === "low" && data.health < 20) include = true;
      else if (
        activeHealthTab === "medium" &&
        data.health >= 20 &&
        data.health <= 50
      )
        include = true;
      else if (activeHealthTab === "high" && data.health > 50) include = true;
      if (include) filtered[college] = data;
    });
    return filtered;
  }, [grouped, activeHealthTab]);

  // Check if any filters are active (for badge on Filters button)
  const isAnyFilterActive =
    filterPhase !== "all" ||
    (dateFilterStart && dateFilterEnd) ||
    selectedUserFilter !== defaultSelectedUserFilter ||
    activeHealthTab !== "all";

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
    setFilterPhase("all");
    setDateFilterStart("");
    setDateFilterEnd("");
    setSelectedUserFilter(defaultSelectedUserFilter);
    setActiveHealthTab("all");
    setFiltersDropdownOpen(false);
  };

  const handleStartPhase = (e, training) => {
    e.stopPropagation(); // Prevent row click

    // Prepare training data for InitiationModal
    const trainingForModal = {
      id: training.trainingId,
      selectedPhase: training.phaseId,
      collegeName: training.collegeName,
      projectCode: training.projectCode || training.collegeCode,
      ...training.originalFormData,
    };

    if (onStartPhase) {
      onStartPhase(trainingForModal);
    }
  };

  // Edit button handler - shows popup for JD training only
  const handleEditPhase = (e, training) => {
    e.stopPropagation();

    // Only allow editing for JD training - show toast instead of opening form
    if (training.phaseId === "JD") {
      // Clear any existing toast timer
      if (toast && toast.timer) {
        clearTimeout(toast.timer);
      }
      const timer = setTimeout(() => setToast(null), 6000);
      setToast({
        type: "jd_edit_restricted",
        message: "JD training edit functionality is not available from here. Please use the dedicated JD training interface.",
        timer,
      });
      return;
    }

    // For other phases, open the initiation modal for editing
    const trainingForModal = {
      id: training.trainingId,
      selectedPhase: training.phaseId,
      collegeName: training.collegeName,
      projectCode: training.projectCode || training.collegeCode,
      ...training.originalFormData,
    };

    if (onStartPhase) {
      onStartPhase(trainingForModal);
    }
  };

  // Change trainer handler - opens change trainer modal for specific phase
  const handleChangeTrainer = (e, training) => {
    e.stopPropagation(); // Prevent row click
    setSelectedTrainingForChange(training);
    setChangeTrainerModalOpen(true);
  };

  // Delete training handler
  const handleDeleteTraining = async (training) => {
    try {
      // Helper function to delete all documents in a collection
      const deleteCollection = async (collectionRef) => {
        const snapshot = await getDocs(collectionRef);
        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
        await batch.commit();
      };

      // Start a batch for atomic operations
      const batch = writeBatch(db);
      
      // 1. Delete known subcollections under the phase document
      const phaseDocRef = doc(db, "trainingForms", training.trainingId, "trainings", training.phaseId);
      
      // Delete domains subcollection
      const domainsRef = collection(phaseDocRef, "domains");
      await deleteCollection(domainsRef);
      
      // Delete batches subcollection (if exists)
      const batchesRef = collection(phaseDocRef, "batches");
      await deleteCollection(batchesRef);
      
      // 2. Delete the phase document itself
      batch.delete(phaseDocRef);
      
      // 3. Delete trainer assignments for this specific phase
      const parts = training.trainingId.split("-");
      if (parts.length >= 6) {
        const projectCode = parts[0];
        const year = parts[1];
        const branch = parts[2];
        const specialization = parts[3];
        const phaseBase = parts[4] + "-" + parts[5];
        
        const phaseNumber = training.phaseId.split("-")[1]; // "1" for "phase-1"
        const phase = phaseBase + "-phase-" + phaseNumber;
        
        const prefix = `${projectCode}-${year}-${branch}-${specialization}-${phase}`;
        
        const q = query(collection(db, "trainerAssignments"), where('__name__', '>=', prefix), where('__name__', '<', prefix + '\uf8ff'));
        const snap = await getDocs(q);
        
        const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      } else {
        // No training phases to delete
      }
      
      // Commit all deletions
      await batch.commit();
      
      // Log training deletion
      try {
        await auditLogTrainingOperations.trainingDeleted(
          training.trainingId,
          training.collegeName,
          training.phaseId,
          "User initiated deletion"
        );
      } catch (auditErr) {
        console.error("Error logging training deletion:", auditErr);
        // Don't block the main operation
      }
      
      // Update local state
      setTrainings(prev => prev.filter(t => t.id !== training.id));
      
      // Clear cache
      try {
        localStorage.removeItem(`ld_initiation_trainings_${selectedUserFilter || user?.uid}`);
      } catch (cacheError) {
        console.error("Error clearing cache:", cacheError);
      }
      
      setShowDeleteConfirm(false);
      setSelectedTrainingForDelete(null);
    } catch (error) {
      console.error("Failed to delete training:", error);
      // Optionally show error toast or alert
      alert("Failed to delete training. Please try again.");
      setShowDeleteConfirm(false);
      setSelectedTrainingForDelete(null);
    }
  };

  // Move a phase to a specific status (manual override). Updates Firestore and local state optimistically.
  const moveToStatus = async (training, newStatus) => {
    try {
      // Save previous status for undo
      const prevStatus = training.status || getPhaseStatus(training).status;

      // Optimistic UI update
      setTrainings((prev) =>
        prev.map((t) =>
          t.id === training.id ? { ...t, status: newStatus } : t
        )
      );

      // Persist status to Firestore: training.trainingId -> trainings -> training.phaseId
      const trainingDocRef = doc(
        db,
        "trainingForms",
        training.trainingId,
        "trainings",
        training.phaseId
      );
      updateDoc(trainingDocRef, { status: newStatus }).catch(() => {
        // Failed to update status
        // rollback on error
        fetchData();
      });

      // Log training status change
      try {
        await auditLogTrainingOperations.trainingStatusChanged(
          training.trainingId,
          training.collegeName,
          training.phaseId,
          prevStatus,
          newStatus,
          "Manual status override"
        );
      } catch (auditErr) {
        console.error("Error logging training status change:", auditErr);
        // Don't block the main operation
      }

      // Clear cache since data changed
      try {
        localStorage.removeItem(
          `ld_initiation_trainings_${selectedUserFilter || user?.uid}`
        );
      } catch (cacheError) {
        console.error("Error clearing cache:", cacheError);
      }

      // Show undo toast
      if (toast && toast.timer) {
        clearTimeout(toast.timer);
      }
      const timer = setTimeout(() => setToast(null), 6000);
      setToast({
        status: newStatus,
        message: `Moved to ${newStatus}`,
        trainingId: training.id,
        prevStatus,
        timer,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      // Failed to update status
      fetchData();
    }
  };

  const handleUndo = async () => {
    if (!toast) return;
    
    // Only allow undo for certain toast types
    if (toast.type === "jd_edit_restricted") {
      setToast(null);
      return;
    }
    
    const { trainingId, prevStatus, timer } = toast;
    if (timer) clearTimeout(timer);

    // Optimistically revert locally
    setTrainings((prev) =>
      prev.map((t) => (t.id === trainingId ? { ...t, status: prevStatus } : t))
    );

    // Find training to get ids for Firestore
    const t = trainings.find((x) => x.id === trainingId);
    if (t) {
      const trainingDocRef = doc(
        db,
        "trainingForms",
        t.trainingId,
        "trainings",
        t.phaseId
      );
      try {
        updateDoc(trainingDocRef, { status: prevStatus });

        // Clear cache since data changed
        try {
          localStorage.removeItem(
            `ld_initiation_trainings_${selectedUserFilter || user?.uid}`
          );
        } catch (cacheError) {
          console.error("Error clearing cache:", cacheError);
        }
      } catch (error) {
        console.error("Failed to undo status:", error);
        // Failed to undo status
        fetchData();
      }
    }

    setToast(null);
  };

  const _handleUndoAssignment = async () => {
    if (!toast) return;
    const { trainingId, prevAssignedUser, timer } = toast;
    if (timer) clearTimeout(timer);

    // Optimistically revert locally
    setTrainings((prev) =>
      prev.map((t) =>
        t.trainingId === trainingId
          ? {
              ...t,
              originalFormData: {
                ...t.originalFormData,
                assignedTo: prevAssignedUser,
              },
            }
          : t
      )
    );

    // Update Firestore to revert assignment
    const trainingDocRef = doc(db, "trainingForms", trainingId);
    try {
      await updateDoc(trainingDocRef, {
        assignedTo: prevAssignedUser,
      });

      // Clear cache since data changed
      try {
        localStorage.removeItem(
          `ld_initiation_trainings_${selectedUserFilter || user?.uid}`
        );
      } catch (cacheError) {
        console.error("Error clearing cache:", cacheError);
      }
    } catch (error) {
      console.error("Failed to undo assignment:", error);
      // Failed to undo assignment
      fetchData();
    }

    setToast(null);
  };

  // cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toast && toast.timer) clearTimeout(toast.timer);
    };
  }, [toast]);

  // Persist active status tab so it survives reloads
  useEffect(() => {
    try {
      localStorage.setItem("ld_initiation_activeStatusTab", activeStatusTab);
    } catch (error) {
      console.error("Error persisting active status tab:", error);
    }
  }, [activeStatusTab]);

  // Persist active health tab
  useEffect(() => {
    try {
      localStorage.setItem("ld_initiation_activeHealthTab", activeHealthTab);
    } catch (error) {
      console.error("Error persisting active health tab:", error);
    }
  }, [activeHealthTab]);

  // Persist selected user filter
  useEffect(() => {
    try {
      localStorage.setItem(
        "ld_initiation_selectedUserFilter",
        selectedUserFilter
      );
    } catch (error) {
      console.error("Error persisting selected user filter:", error);
    }
  }, [selectedUserFilter]);

  // Persist date filter
  useEffect(() => {
    try {
      localStorage.setItem("ld_initiation_dateFilterStart", dateFilterStart);
      localStorage.setItem("ld_initiation_dateFilterEnd", dateFilterEnd);
    } catch (error) {
      console.error("Error persisting date filter:", error);
    }
  }, [dateFilterStart, dateFilterEnd]);

  // Revert manual override so automatic date logic applies again
  const revertToAutomatic = async (training) => {
    try {
      // Compute the automatic status
      const computedStatus = getPhaseStatus({
        ...training,
        status: undefined,
      }).status;

      // Optimistic UI update: set to computed status
      setTrainings((prev) =>
        prev.map((t) =>
          t.id === training.id ? { ...t, status: computedStatus } : t
        )
      );

      // Remove status field in Firestore to use automatic logic
      const trainingDocRef = doc(
        db,
        "trainingForms",
        training.trainingId,
        "trainings",
        training.phaseId
      );
      await updateDoc(trainingDocRef, { status: deleteField() });

      // Clear cache since data changed
      try {
        localStorage.removeItem(
          `ld_initiation_trainings_${selectedUserFilter || user?.uid}`
        );
      } catch (cacheError) {
        console.error("Error clearing cache:", cacheError);
      }
    } catch (error) {
      console.error("Failed to revert to automatic status:", error);
      fetchData();
    }
  };

  // Close dropdowns on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        (!openDropdownId ||
          !actionBtnRefs.current[openDropdownId] ||
          !actionBtnRefs.current[openDropdownId].contains(event.target))
      ) {
        setOpenDropdownId(null);
      }
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
        setOpenDropdownId(null);
        setFiltersDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDropdownId, filtersDropdownOpen]);

  // Full-page takeover view for Trainer Calendar (like other detail pages)
  if (showTrainerCalendar) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <TrainerCalendar
          embedded
          onBack={() => setShowTrainerCalendar(false)}
          initialTrainerId={trainerCalendarTraining?.trainerId || ""}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="w-full space-y-3">
        {loading ? (
          <div className="space-y-3">
            {/* Header Skeleton */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-3">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                <div>
                  <div className="h-6 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-48 mb-1"></div>
                  <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-64"></div>
                </div>

                {/* Controls Skeleton */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Search Skeleton */}
                  <div className="relative">
                    <div className="h-9 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded-xl animate-pulse w-full sm:w-52"></div>
                  </div>

                  {/* Filters Button Skeleton */}
                  <div className="h-9 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded-xl animate-pulse w-20"></div>

                  {/* Refresh Button Skeleton */}
                  <div className="h-9 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded-xl animate-pulse w-20"></div>
                </div>

                <div className="mt-2 lg:mt-0 flex items-center gap-3">
                  <div className="h-9 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-24"></div>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <div className="h-9 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded-lg animate-pulse w-32"></div>
                </div>
              </div>

              {/* Status Tabs Skeleton */}
              <div className="mt-3">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
                  {[...Array(6)].map((_, index) => (
                    <div key={index} className="h-10 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Statistics Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-4 h-full">
                  <div className="flex items-center justify-between h-full">
                    <div className="flex-1 min-w-0">
                      <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-20 mb-2"></div>
                      <div className="h-7 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-12"></div>
                    </div>
                    <div className="w-10 h-10 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg animate-pulse shrink-0 ml-3"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Training Tables Skeleton */}
            {[...Array(3)].map((_, collegeIndex) => (
              <div key={collegeIndex} className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
                {/* College Header Skeleton */}
                <div className="bg-linear-to-r from-blue-600 to-blue-700 px-4 py-3 min-h-12">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="h-5 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-48 mb-1"></div>
                      <div className="h-4 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse w-full max-w-md"></div>
                    </div>
                    <div className="w-6 h-6 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-pulse shrink-0 ml-3"></div>
                  </div>
                </div>

                {/* Desktop Table Skeleton */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/50">
                      <tr>
                        {[...Array(7)].map((_, headerIndex) => (
                          <th key={headerIndex} className="px-4 py-3 text-left">
                            <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-16"></div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {[...Array(2)].map((_, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-blue-50/30">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded-lg animate-pulse mr-3 shrink-0"></div>
                              <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-16"></div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-24"></div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-20"></div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-4 h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse mr-2 shrink-0"></div>
                              <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-8"></div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="h-6 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded-full animate-pulse w-20"></div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-4 h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse mr-2 shrink-0"></div>
                              <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-16"></div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="h-8 w-8 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded-full animate-pulse ml-auto"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card Skeleton */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {[...Array(2)].map((_, cardIndex) => (
                    <div key={cardIndex} className="p-4 hover:bg-blue-50/30">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="w-8 h-8 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded-xl animate-pulse mr-2 shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-16 mb-1"></div>
                            <div className="h-5 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded-full animate-pulse w-20"></div>
                          </div>
                        </div>
                        <div className="w-4 h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse shrink-0 ml-2"></div>
                      </div>

                      <div className="space-y-2">
                        {[...Array(4)].map((_, fieldIndex) => (
                          <div key={fieldIndex}>
                            <div className="h-3 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-12 mb-1"></div>
                            <div className={`h-3 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse ${fieldIndex === 0 ? 'w-24' : fieldIndex === 1 ? 'w-32' : fieldIndex === 2 ? 'w-16' : 'w-20'}`}></div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <div className="flex-1 h-8 bg-linear-to-r from-green-200 via-green-100 to-green-200 rounded-lg animate-pulse"></div>
                        <div className="flex-1 h-8 bg-linear-to-r from-amber-200 via-amber-100 to-amber-200 rounded-lg animate-pulse"></div>
                        <div className="flex-1 h-8 bg-linear-to-r from-red-200 via-red-100 to-red-200 rounded-lg animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Loading Text with Animation */}
            <div className="text-center py-6">
              <div className="inline-flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-gray-600 font-medium">Loading training data...</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-2.5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                <div>
                  <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                    Training Status
                  </h1>
                  <p className="text-gray-600 text-xs mt-0.5">
                    Manage and monitor training phases across all colleges
                  </p>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Search */}
                  <div className="relative">
                    <FiSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Search colleges or domains..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-full sm:w-48"
                    />
                  </div>

                  {/* Combined Filters Button */}
                  <div className="relative">
                    <button
                      ref={filtersBtnRef}
                      onClick={toggleFiltersDropdown}
                      className={`inline-flex items-center px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all ${
                        isAnyFilterActive ? "ring-1 ring-blue-500/20" : ""
                      }`}
                      aria-label="Open filters"
                    >
                      <FiFilter className="w-3.5 h-3.5 mr-1" />
                      Filters
                      {isAnyFilterActive && (
                        <span className="ml-1 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      )}
                    </button>

                    {/* Filters Dropdown */}
                    {filtersDropdownOpen && (
                      <div
                        ref={filtersDropdownRef}
                        className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50"
                      >
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Phase
                              </label>
                              <select
                                value={filterPhase}
                                onChange={(e) => setFilterPhase(e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                              >
                                <option value="all">All Phases</option>
                                <option value="phase-1">Phase 1</option>
                                <option value="phase-2">Phase 2</option>
                                <option value="phase-3">Phase 3</option>
                                <option value="JD">JD</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Health
                              </label>
                              <select
                                value={activeHealthTab}
                                onChange={(e) => setActiveHealthTab(e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                              >
                                <option value="all">All</option>
                                <option value="low">Low (&lt;20%)</option>
                                <option value="medium">Medium</option>
                                <option value="high">High (&gt;50%)</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Assigned To
                            </label>
                            <select
                              value={selectedUserFilter}
                              onChange={(e) => setSelectedUserFilter(e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                              <option value={defaultSelectedUserFilter}>
                                {defaultSelectedUserFilter === "all" ? "All Users" : "Me"}
                              </option>
                              {availableUsers
                                .filter((u) => u.uid !== user?.uid)
                                .map((u) => (
                                  <option key={u.uid} value={u.uid}>
                                    {u.name || u.email || u.uid}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={dateFilterStart}
                                onChange={(e) => setDateFilterStart(e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                End Date
                              </label>
                              <input
                                type="date"
                                value={dateFilterEnd}
                                onChange={(e) => setDateFilterEnd(e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-1">
                            <button
                              onClick={clearAllFilters}
                              className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1"
                            >
                              Clear All
                            </button>
                            <button
                              onClick={applyFilters}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiRefreshCw
                      className={`w-3.5 h-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>
                </div>
                <div className="mt-2 lg:mt-0 flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <InitiationDashboardExportButton trainings={trainings} />
                    <InitiationDashboardReportButton trainings={trainings} />
                  </div>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <button
                    type="button"
                    onClick={() => {
                      setTrainerCalendarTraining(null);
                      setShowTrainerCalendar(true);
                    }}
                    className="inline-flex items-center px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                  >
                    <FiCalendar className="mr-1.5 w-3.5 h-3.5" /> Calendar
                  </button>
                </div>
              </div>

              {/* Status Tabs (Not Started, Initiated, Hold, In Progress, Done) */}
              <div className="mt-2">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-1.5 mb-2">
                  {Object.keys(STATUS_LABELS).map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveStatusTab(key)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                        activeStatusTab === key
                          ? key !== "all" && STATUS_UI[key]
                            ? STATUS_UI[key].tabActive
                            : "bg-blue-600 text-white shadow-md"
                          : key !== "all" &&
                            STATUS_UI[key] &&
                            STATUS_UI[key].tabInactive
                          ? STATUS_UI[key].tabInactive
                          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {STATUS_LABELS[key]}{" "}
                      <span className="ml-1 text-xs font-bold">
                        ({statusCounts[key] || 0})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200/50 p-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-medium">
                      Total Colleges
                    </p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {Object.keys(filteredGrouped).length}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FiBookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Replaced Active Phases with Total Hours */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200/50 p-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-medium">
                      Total Hours
                    </p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {trainings
                        .reduce((acc, t) => acc + (t.totaltraininghours || 0), 0)}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <FiClock className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>
              </div>

              {/* Replaced Total Batches with Total Cost */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200/50 p-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-medium">
                      Total Cost
                    </p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      ₹
                      {trainings
                        .reduce((acc, t) => acc + (t.totalCost || 0), 0)
                        .toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <FiDollarSign className="w-4 h-4 text-yellow-600" />
                  </div>
                </div>
              </div>

              {/* Overall Health */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200/50 p-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-medium">
                      Overall Health
                    </p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {overallHealth.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <FiTrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Training Tables */}
            {Object.keys(filteredGrouped).length > 0 ? (
              Object.entries(filteredGrouped).map(([college, data]) => {
                const { phases, health } = data;
                
                // Check if this is a merged training (any phase has mergedColleges)
                const mergedTraining = phases.find(p => p.mergedColleges);
                let mergedCollegeCodes = [];
                if (mergedTraining && Array.isArray(mergedTraining.mergedColleges)) {
                  mergedCollegeCodes = mergedTraining.mergedColleges.map(c => COLLEGE_CODE_MAPPING[c.collegeName] || c.collegeName).filter(Boolean);
                }
                const displayCollegeName = mergedTraining ? 
                  `${college} (Merged: ${mergedCollegeCodes.join(", ") || "Multiple Colleges"})` : 
                  college;
                
                return (
                  <div
                    key={college}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden"
                  >
                    {/* College Header */}
                    <div className="bg-linear-to-r from-blue-600 to-blue-700 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-white">
                            {displayCollegeName}
                          </h2>
                          <p className="text-blue-100 text-sm mt-1">
                            {phases.length} phase
                            {phases.length !== 1 ? "s" : ""} configured • TCV: ₹
                            {data.tcv.toLocaleString('en-IN')} • Training Cost: ₹
                            {data.totalCost.toLocaleString('en-IN')} • Health: <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${health <= 20 ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                              {health <= 20 ? "✓" : "⚠"} {health.toFixed(1)}%
                            </span> • Total Contract Amount ({data.hasGST ? 'GST applied' : 'GST not applied'}): ₹
                            {data.hasGST ? data.totalNetPayable.toLocaleString('en-IN') : data.tcv.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="text-blue-100">
                          <FiBookOpen className="w-6 h-6" />
                        </div>
                      </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Phase
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Domain
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Timeline
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Batches
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Training Cost
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Assigned
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {phases.map((training) => {
                            const status = getPhaseStatus(training);
                            const canEdit = true; // Allow editing for all phases

                            // Get assigned user details
                            const assignedUser =
                              training.originalFormData?.assignedTo;
                            const assignedDisplay =
                              assignedUser?.name ||
                              assignedUser?.email ||
                              assignedUser?.uid ||
                              "Unassigned";

                            // Check if this training is part of a merge
                            const isMerged = training.mergedColleges && training.mergedColleges.length > 0;

                            return (
                              <tr
                                key={training.id}
                                className="hover:bg-blue-50/30 cursor-pointer transition-all group"
                                onClick={() =>
                                  onRowClick &&
                                  onRowClick({
                                    ...training,
                                    id: training.trainingId,
                                    selectedPhase: training.phaseId,
                                  })
                                }
                              >
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                      <span className="text-blue-600 font-semibold text-sm">
                                        {training.phaseId.replace("phase-", "")}
                                      </span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                      {PHASE_LABELS[training.phaseId] ||
                                        training.phaseId}
                                      {isMerged && (
                                        <span className="ml-2 text-xs text-blue-600 font-medium">
                                          (Merged)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  <div
                                    className="text-sm text-gray-900 max-w-xs truncate"
                                    title={training.domain}
                                  >
                                    {training.domain || (
                                      <span className="text-gray-400 italic">
                                        No domain specified
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  <div className="space-y-1">
                                    {training.trainingStartDate &&
                                    training.trainingEndDate ? (
                                      <div className="flex items-center text-xs text-gray-600">
                                        <FiCalendar className="w-3 h-3 mr-1" />
                                        <span>
                                          {formatDate(training.trainingStartDate)} -{" "}
                                          {formatDate(training.trainingEndDate)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">
                                        Dates not set
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <FiUsers className="w-4 h-4 text-gray-400 mr-2" />
                                    <span className="text-sm font-medium text-gray-900">
                                      {training.table1Data
                                        ? training.table1Data.length
                                        : 0}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    ₹{training.totalCost ? training.totalCost.toLocaleString('en-IN') : '0'}
                                  </div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.style}`}
                                  >
                                    {status.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <FiUser className="w-4 h-4 text-gray-400 mr-2" />
                                    <span className="text-sm text-gray-900">
                                      {assignedDisplay}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-right">
                                  <div className="relative flex items-center justify-end gap-1 transition-opacity">
                                    <button
                                      className="p-1 rounded-full hover:bg-gray-100"
                                      ref={(el) =>
                                        (actionBtnRefs.current[training.id] =
                                          el)
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (openDropdownId === training.id) {
                                          setOpenDropdownId(null);
                                        } else {
                                          // Calculate position for portal dropdown
                                          const rect =
                                            e.currentTarget.getBoundingClientRect();
                                          setDropdownPosition({
                                            top:
                                              rect.bottom + window.scrollY + 4,
                                            left:
                                              rect.right - 160 + window.scrollX, // 160px = dropdown width
                                          });
                                          setOpenDropdownId(training.id);
                                        }
                                      }}
                                      title="Actions"
                                    >
                                      {openDropdownId === training.id ? (
                                        <FiX className="w-5 h-5 text-red-500" />
                                      ) : (
                                        <FiMoreVertical className="w-5 h-5" />
                                      )}
                                    </button>
                                    {openDropdownId === training.id &&
                                      createPortal(
                                        <div
                                          ref={dropdownRef}
                                          className="z-50 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 flex flex-col"
                                          style={{
                                            position: "absolute",
                                            top: dropdownPosition.top,
                                            left: dropdownPosition.left,
                                          }}
                                        >
                                          {training.domainsCount === 0 ? (
                                            <button
                                              onClick={(e) => {
                                                handleStartPhase(e, training);
                                                setOpenDropdownId(null);
                                              }}
                                              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                            >
                                              <FiPlay className="w-4 h-4 mr-2 text-green-600" />
                                              <span>Start</span>
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-default bg-transparent"
                                              onClick={(e) =>
                                                e.preventDefault()
                                              }
                                              tabIndex={-1}
                                            >
                                              <FiBookOpen className="w-4 h-4 mr-2 text-blue-600" />
                                              <span>View Details</span>
                                            </button>
                                          )}

                                          {canEdit && (
                                            <button
                                              onClick={(e) => {
                                                handleEditPhase(e, training);
                                                setOpenDropdownId(null);
                                              }}
                                              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                            >
                                              <FiEdit className="w-4 h-4 mr-2 text-amber-500" />
                                              <span>Edit</span>
                                            </button>
                                          )}

                                          {(() => {
                                            const status =
                                              getPhaseStatus(training);
                                            return (
                                              status.status === "In Progress"
                                            );
                                          })() && (
                                            <button
                                              onClick={(e) => {
                                                handleChangeTrainer(
                                                  e,
                                                  training
                                                );
                                                setOpenDropdownId(null);
                                              }}
                                              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                            >
                                              <FiEdit className="w-4 h-4 mr-2 text-red-500" />
                                              <span>Change trainer</span>
                                            </button>
                                          )}

                                          {/* Assign To feature */}
                                          <div
                                            className="relative group"
                                            onMouseEnter={() => {
                                              setAssignDropdownOpenId(
                                                training.id
                                              );
                                            }}
                                            onMouseLeave={() =>
                                              setAssignDropdownOpenId(null)
                                            }
                                          >
                                            <button
                                              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors w-full"
                                              style={{
                                                justifyContent: "space-between",
                                              }}
                                              tabIndex={-1}
                                            >
                                              <span>
                                                <FiCornerLeftDown className="w-4 h-4 mr-2 text-blue-500 inline" />
                                                Assign
                                              </span>
                                            </button>
                                            {/* Dropdown for users */}
                                            {assignDropdownOpenId ===
                                              training.id && (
                                              <div
                                                ref={assignDropdownRef}
                                                className="absolute left-[-220px] top-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-60"
                                                style={{ minWidth: 200 }}
                                              >
                                                <div className="px-3 py-1 text-xs text-gray-500">
                                                  {String(
                                                    user?.department || ""
                                                  ).toLowerCase() === "admin"
                                                    ? "L&D & Admin Users"
                                                    : "L&D Users"}
                                                </div>
                                                {ldUsers.length === 0 && (
                                                  <div className="px-3 py-2 text-sm text-gray-400">
                                                    No users found
                                                  </div>
                                                )}
                                                {(() => {
                                                  const assignedUser =
                                                    training.originalFormData
                                                      ?.assignedTo;
                                                  const filteredUsers =
                                                    ldUsers.filter(
                                                      (userOption) =>
                                                        userOption.uid !==
                                                        assignedUser?.uid
                                                    );
                                                  return filteredUsers.length ===
                                                    0 ? (
                                                    <div className="px-3 py-2 text-sm text-gray-400">
                                                      No other users available
                                                    </div>
                                                  ) : (
                                                    filteredUsers.map(
                                                      (userOption) => (
                                                        <button
                                                          key={userOption.uid}
                                                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAssignToUser(
                                                              training,
                                                              userOption
                                                            );
                                                          }}
                                                        >
                                                          <FiUser className="w-4 h-4 mr-2 text-blue-500" />
                                                          <span>
                                                            {userOption.name ||
                                                              userOption.email ||
                                                              userOption.uid}
                                                          </span>
                                                          {userOption.department && (
                                                            <span className="ml-1 text-xs text-gray-400">
                                                              (
                                                              {
                                                                userOption.department
                                                              }
                                                              )
                                                            </span>
                                                          )}
                                                        </button>
                                                      )
                                                    )
                                                  );
                                                })()}
                                              </div>
                                            )}
                                          </div>

                                          {/* Move To (manual override) */}
                                          <div className="border-t border-gray-100 mt-1" />
                                          <div className="px-2 pt-1 text-xs text-gray-500">
                                            Move to
                                          </div>
                                          {(() => {
                                            const currentStatus =
                                              getPhaseStatus(training).status;
                                            return Object.keys(STATUS_LABELS)
                                              .filter(
                                                (k) =>
                                                  k !== "all" &&
                                                  k !== currentStatus
                                              )
                                              .map((s) => {
                                                const Icon = STATUS_ICON_MAP[s];
                                                return (
                                                  <button
                                                    key={s}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      moveToStatus(training, s);
                                                      setOpenDropdownId(null);
                                                    }}
                                                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                  >
                                                    {Icon && (
                                                      <Icon
                                                        className={`w-4 h-4 mr-2 ${
                                                          (STATUS_UI[s] &&
                                                            STATUS_UI[s]
                                                              .icon) ||
                                                          "text-gray-700"
                                                        }`}
                                                      />
                                                    )}
                                                    <span>{s}</span>
                                                  </button>
                                                );
                                              });
                                          })()}

                                          {training.status ? (
                                            <>
                                              <div className="border-t border-gray-50 my-1" />
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  revertToAutomatic(training);
                                                  setOpenDropdownId(null);
                                                }}
                                                className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                              >
                                                <span>Revert to automatic</span>
                                              </button>
                                            </>
                                          ) : null}

                                          {/* Delete Training */}
                                          <div className="border-t border-gray-100 mt-1" />
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedTrainingForDelete(training);
                                              setShowDeleteConfirm(true);
                                              setOpenDropdownId(null);
                                            }}
                                            className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                          >
                                            <FiTrash2 className="w-4 h-4 mr-2" />
                                            <span>Delete</span>
                                          </button>
                                        </div>,
                                        document.body
                                      )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden divide-y divide-gray-100">
                      {phases.map((training) => {
                        const status = getPhaseStatus(training);
                        const canEdit = true; // Allow editing for all phases

                        // Get assigned user details
                        const assignedUser =
                          training.originalFormData?.assignedTo;
                        const assignedDisplay =
                          assignedUser?.name ||
                          assignedUser?.email ||
                          assignedUser?.uid ||
                          "Unassigned";

                        // Check if this training is part of a merge
                        const isMerged = training.mergedColleges && training.mergedColleges.length > 0;

                        return (
                          <div
                            key={training.id}
                            className="p-3 hover:bg-blue-50/30 cursor-pointer transition-all"
                            onClick={() =>
                              onRowClick &&
                              onRowClick({
                                ...training,
                                id: training.trainingId,
                                selectedPhase: training.phaseId,
                              })
                            }
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mr-2">
                                  <span className="text-blue-600 font-bold text-sm">
                                    {training.phaseId.replace("phase-", "")}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="text-xs font-semibold text-gray-900">
                                    {PHASE_LABELS[training.phaseId] ||
                                      training.phaseId}
                                    {isMerged && (
                                      <span className="ml-1 text-xs text-blue-600 font-medium">
                                        (Merged)
                                      </span>
                                    )}
                                  </h3>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${status.style}`}
                                  >
                                    {status.status}
                                  </span>
                                </div>
                              </div>
                              <button className="text-gray-400 hover:text-gray-600">
                                <FiMoreVertical className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-0.5">
                                  Domain
                                </p>
                                <p className="text-xs text-gray-900 truncate">
                                  {training.domain || (
                                    <span className="text-gray-400 italic">
                                      No domain specified
                                    </span>
                                  )}
                                </p>
                              </div>

                              {training.trainingStartDate &&
                                training.trainingEndDate && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-0.5">
                                      Timeline
                                    </p>
                                    <div className="flex items-center text-xs text-gray-600">
                                      <FiCalendar className="w-3 h-3 mr-1" />
                                      <span>
                                        {formatDate(training.trainingStartDate)} -{" "}
                                        {formatDate(training.trainingEndDate)}
                                      </span>
                                    </div>
                                  </div>
                                )}

                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-0.5">
                                  Batches
                                </p>
                                <div className="flex items-center">
                                  <FiUsers className="w-4 h-4 text-gray-400 mr-2" />
                                  <span className="text-xs font-medium text-gray-900">
                                    {training.table1Data
                                      ? training.table1Data.length
                                      : 0}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-0.5">
                                  Training Cost
                                </p>
                                <p className="text-xs text-gray-900">
                                  ₹{training.totalCost ? training.totalCost.toLocaleString('en-IN') : '0'}
                                </p>
                              </div>

                              {/* New Assigned section */}
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-0.5">
                                  Assigned
                                </p>
                                <div className="flex items-center">
                                  <FiUser className="w-4 h-4 text-gray-400 mr-2" />
                                  <span className="text-xs text-gray-900">
                                    {assignedDisplay}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
                              {training.domainsCount === 0 ? (
                                <button
                                  onClick={(e) => handleStartPhase(e, training)}
                                  className="flex-1 inline-flex items-center justify-center px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                                >
                                  <FiPlay className="w-3 h-3 mr-1" />
                                  Start Phase
                                </button>
                              ) : (
                                <button className="flex-1 text-blue-600 hover:text-blue-800 text-xs font-medium py-1">
                                  View Details
                                </button>
                              )}

                              {canEdit && (
                                <button
                                  onClick={(e) => handleEditPhase(e, training)}
                                  className="flex-1 inline-flex items-center justify-center px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                                >
                                  <FiEdit className="w-3 h-3 mr-1" />
                                  Edit
                                </button>
                              )}

                              {/* Change Trainer Button - Show for in-progress trainings */}
                              {(() => {
                                const status = getPhaseStatus(training);
                                return status.status === "In Progress";
                              })() && (
                                <button
                                  onClick={(e) =>
                                    handleChangeTrainer(e, training)
                                  }
                                  className="flex-1 inline-flex items-center justify-center px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                                  title="Trainer"
                                >
                                  <FiEdit className="w-3 h-3 mr-1" />
                                  <span className="mr-1">Trainer</span>
                                  <FiUserCheck className="w-3 h-3" />
                                </button>
                              )}

                              {/* Delete Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTrainingForDelete(training);
                                  setShowDeleteConfirm(true);
                                }}
                                className="flex-1 inline-flex items-center justify-center px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                              >
                                <FiTrash2 className="w-3 h-3 mr-1" />
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Empty State */
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
                <div className="text-center max-w-md mx-auto">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <FiBookOpen className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    No trainings found
                  </h3>
                  <p className="text-gray-500 text-xs">
                    {searchTerm ||
                    filterPhase !== "all" ||
                    (dateFilterStart && dateFilterEnd) ||
                    activeStatusTab !== "all" ||
                    activeHealthTab !== "all"
                      ? "Try adjusting your search or filters"
                      : "Get started by creating your first training program"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change Trainer Modal */}
      <ChangeTrainerDashboard
        isOpen={changeTrainerModalOpen}
        onClose={() => {
          setChangeTrainerModalOpen(false);
          setSelectedTrainingForChange(null);
        }}
        selectedTraining={selectedTrainingForChange}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <FiTrash2 className="w-6 h-6 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Training
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this training phase? This action
              cannot be undone and will remove all associated data including
              domains, batches, and trainer assignments.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTraining(selectedTrainingForDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start">
              <div className="shrink-0">
                {toast.type === "jd_edit_restricted" ? (
                  <FiX className="w-5 h-5 text-red-500" />
                ) : (
                  <FiCheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {toast.message}
                </p>
                {toast.type !== "assignment" && toast.type !== "jd_edit_restricted" && toast.status && (
                  <p className="text-xs text-gray-500 mt-1">
                    Status changed to {toast.status}
                  </p>
                )}
              </div>
              {toast.type !== "jd_edit_restricted" && (
                <div className="ml-3 shrink-0">
                  <button
                    onClick={toast.type === "assignment" ? _handleUndoAssignment : handleUndo}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Undo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InitiationDashboard;
