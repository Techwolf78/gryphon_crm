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
import ChangeTrainerDashboard from "./ChangeTrainerDashboard";
import TrainerCalendar from "../TrainerCalendar/TrainerCalendar";

const PHASE_LABELS = {
  "phase-1": "Phase 1",
  "phase-2": "Phase 2",
  "phase-3": "Phase 3",
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

// Helper to group trainings by college
function groupByCollege(trainings) {
  const map = {};
  trainings.forEach((t) => {
    const codeForDisplay = t.projectCode || t.collegeCode || '';
    const key = `${t.collegeName} (${codeForDisplay})`;
    if (!map[key]) {
      map[key] = { phases: [], tcv: t.tcv || 0, totalCost: 0, totalNetPayable: 0, hasGST: false };
    }
    map[key].phases.push(t);
    map[key].totalCost += t.totalCost || 0;
    if (t.originalFormData?.gstType === "include") {
      map[key].totalNetPayable += t.originalFormData?.netPayableAmount || 0;
      map[key].hasGST = true;
    }
  });
  // Calculate health
  Object.keys(map).forEach((key) => {
    const { tcv, totalCost } = map[key];
    map[key].health = tcv > 0 ? ((tcv - totalCost) / tcv) * 100 : 0;
    console.log(
      `College: ${key}, TCV: ${tcv}, Total Cost: ${totalCost}, Health: ${map[
        key
      ].health.toFixed(2)}%`
    );
  });
  return map;
}

const Dashboard = ({ onRowClick, onStartPhase }) => {
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
    if ((user?.department || "").toLowerCase() === "admin") {
      return availableUsers.filter((u) => {
        const departmentFilter = (u.department || "").toLowerCase();
        const isLdUser =
          departmentFilter === "l & d" || departmentFilter.includes("learning");
        const isAdminUser = departmentFilter === "admin";
        return isLdUser || isAdminUser;
      });
    }

    // Otherwise, show only L&D users
    return availableUsers.filter((u) => {
      const departmentFilter = (u.department || "").toLowerCase();
      return (
        departmentFilter === "l & d" || departmentFilter.includes("learning")
      );
    });
  }, [availableUsers, user?.department]);

  const defaultSelectedUserFilter = useMemo(() => {
    if (user?.role === "Director") {
      return "all";
    } else if (user?.role === "Head") {
      return user.uid;
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
            where("department", "==", "L & D")
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
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData(true); // Force refresh
    setRefreshing(false);
  };

  // Filter trainings based on search, phase, and date
  const filteredTrainings = trainings.filter((training) => {
    const matchesSearch =
      searchTerm === "" ||
      training.collegeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ( (training.projectCode || training.collegeCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ) ||
      training.domain.toLowerCase().includes(searchTerm.toLowerCase());

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
  const trainingsForHealth = filteredByStatus.filter(
    (t) => t.computedStatus !== "Not Started"
  );
  console.log(
    `Trainings for Health:`,
    trainingsForHealth.map((t) => ({
      college: `${t.collegeName} (${t.collegeCode})`,
      cost: t.totalCost,
      status: t.computedStatus,
    }))
  );
  const totalTrainingCost = trainingsForHealth.reduce(
    (acc, t) => acc + (t.totalCost || 0),
    0
  );
  const collegesForHealth = new Set(
    trainingsForHealth.map((t) => `${t.collegeName} (${t.collegeCode})`)
  );
  const totalTcv = Object.entries(grouped)
    .filter(([key]) => collegesForHealth.has(key))
    .reduce((acc, [, data]) => acc + (data.tcv || 0), 0);
  // const overallHealth = totalTcv > 0 ? ((totalTcv - totalTrainingCost) / totalTcv * 100) : 0;
  const overallHealth =
    Object.keys(grouped).length > 0
      ? Object.values(grouped).reduce((acc, data) => acc + data.health, 0) /
        Object.keys(grouped).length
      : 0;
  console.log(
    `Overall Health Calculation: Total TCV: ${totalTcv}, Total Training Cost: ${totalTrainingCost}, Overall Health: ${overallHealth.toFixed(
      2
    )}%`
  );

  // Health counts
  const healthCounts = useMemo(() => {
    const counts = {
      all: Object.keys(grouped).length,
      low: 0,
      medium: 0,
      high: 0,
    };
    Object.values(grouped).forEach((data) => {
      if (data.health < 20) counts.low++;
      else if (data.health <= 50) counts.medium++;
      else counts.high++;
    });
    return counts;
  }, [grouped]);

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

  // Edit button handler - reopens initiation modal in edit mode for the specific phase
  const handleEditPhase = (e, training) => {
    e.stopPropagation();
    const trainingForModal = {
      id: training.trainingId,
      selectedPhase: training.phaseId,
      collegeName: training.collegeName,
      projectCode: training.projectCode || training.collegeCode,
      ...training.originalFormData,
      isEdit: true, // optional flag consumers can use to open modal in edit mode
    };
    if (onStartPhase) onStartPhase(trainingForModal);
  };

  // Change trainer handler - opens change trainer modal for specific phase
  const handleChangeTrainer = (e, training) => {
    e.stopPropagation(); // Prevent row click
    setSelectedTrainingForChange(training);
    setChangeTrainerModalOpen(true);
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

      // Clear cache since data changed
      try {
        localStorage.removeItem(
          `ld_initiation_trainings_${selectedUserFilter || user?.uid}`
        );
      } catch {
        // Error clearing cache
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
    } catch {
      // Failed to update status
      fetchData();
    }
  };

  const handleUndo = async () => {
    if (!toast) return;
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
        } catch {
          // Error clearing cache
        }
      } catch {
        // Failed to undo status
        fetchData();
      }
    }

    setToast(null);
  };

  const handleUndoAssignment = async () => {
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
      } catch {
        // Error clearing cache
      }
    } catch {
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
    } catch {
      // ignore storage errors
    }
  }, [activeStatusTab]);

  // Persist active health tab
  useEffect(() => {
    try {
      localStorage.setItem("ld_initiation_activeHealthTab", activeHealthTab);
    } catch {
      // ignore storage errors
    }
  }, [activeHealthTab]);

  // Persist selected user filter
  useEffect(() => {
    try {
      localStorage.setItem(
        "ld_initiation_selectedUserFilter",
        selectedUserFilter
      );
    } catch {
      // ignore storage errors
    }
  }, [selectedUserFilter]);

  // Persist date filter
  useEffect(() => {
    try {
      localStorage.setItem("ld_initiation_dateFilterStart", dateFilterStart);
      localStorage.setItem("ld_initiation_dateFilterEnd", dateFilterEnd);
    } catch {
      // ignore storage errors
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
      } catch {
        // ignore storage errors
      }
    } catch {
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
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
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
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search colleges or domains..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-full sm:w-52"
                />
              </div>

              {/* Combined Filters Button */}
              <div className="relative">
                <button
                  ref={filtersBtnRef}
                  onClick={toggleFiltersDropdown}
                  className={`inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    isAnyFilterActive ? "ring-2 ring-blue-500/20" : ""
                  }`}
                  aria-label="Open filters"
                >
                  <FiFilter className="w-4 h-4 mr-1" />
                  Filters
                  {isAnyFilterActive && (
                    <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </button>
                {filtersDropdownOpen &&
                  createPortal(
                    <div
                      ref={filtersDropdownRef}
                      className="z-54 w-full max-w-xs md:max-w-sm bg-white border border-gray-200 rounded-lg shadow-xl py-2 px-3 flex flex-col space-y-2 animate-fade-in transition-opacity duration-200"
                      style={{
                        position: "absolute",
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        maxHeight: "80vh", // Prevent vertical overflow
                        overflowY: "auto", // Scroll if needed
                      }}
                    >
                      {/* Phase Filter */}
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                          <FiFilter className="w-3 h-3 mr-1" />
                          Phase
                        </label>
                        <select
                          value={filterPhase}
                          onChange={(e) => setFilterPhase(e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        >
                          <option value="all">All Phases</option>
                          <option value="phase-1">Phase 1</option>
                          <option value="phase-2">Phase 2</option>
                          <option value="phase-3">Phase 3</option>
                        </select>
                      </div>

                      {/* Date Filter */}
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                          <FiCalendar className="w-3 h-3 mr-1" />
                          Date Range
                        </label>
                        <div className="space-y-1">
                          <div className="flex gap-1">
                            <div className="flex-1">
                              <div className="text-gray-900 text-[10px] font-medium mb-0.5">
                                Start Date
                              </div>
                              <input
                                type="date"
                                value={dateFilterStart}
                                onChange={(e) =>
                                  setDateFilterStart(e.target.value)
                                }
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                placeholder="Start Date"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="text-gray-900 text-[10px] font-medium mb-0.5">
                                End Date
                              </div>
                              <input
                                type="date"
                                value={dateFilterEnd}
                                onChange={(e) =>
                                  setDateFilterEnd(e.target.value)
                                }
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                placeholder="End Date"
                              />
                            </div>
                          </div>
                          <div className="text-blue-600 text-[10px] mt-1 leading-tight font-medium bg-blue-50 px-2 py-1 rounded border-l-2 border-blue-400">
                            🎯 Filter trainings by their start dates within the
                            selected range
                          </div>
                        </div>
                      </div>

                      {/* User Filter */}
                      {(user?.role === "Director" || user?.role === "Head") &&
                        availableUsers.length > 1 && (
                          <div>
                            <label className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                              <FiUser className="w-3 h-3 mr-1" />
                              User
                            </label>
                            <select
                              value={selectedUserFilter}
                              onChange={(e) =>
                                setSelectedUserFilter(e.target.value)
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            >
                              <option value="all">All Users</option>
                              {availableUsers.map((userOption) => (
                                <option
                                  key={userOption.uid}
                                  value={userOption.uid}
                                >
                                  {userOption.name ||
                                    userOption.email ||
                                    userOption.uid}{" "}
                                  {userOption.department
                                    ? `(${userOption.department.toLowerCase()})`
                                    : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                      {/* Health Filter */}
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                          <FiTrendingUp className="w-3 h-3 mr-1" />
                          Health
                        </label>
                        <select
                          value={activeHealthTab}
                          onChange={(e) => setActiveHealthTab(e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        >
                          <option value="all">
                            All Health ({healthCounts.all || 0})
                          </option>
                          <option value="low">
                            Low (&lt;20%) ({healthCounts.low || 0})
                          </option>
                          <option value="medium">
                            Medium (20-50%) ({healthCounts.medium || 0})
                          </option>
                          <option value="high">
                            High (&gt;50%) ({healthCounts.high || 0})
                          </option>
                        </select>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row justify-between gap-1 pt-1 border-t border-gray-100">
                        <button
                          onClick={clearAllFilters}
                          className="flex-1 inline-flex items-center justify-center px-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-all"
                        >
                          <FiTrash2 className="w-3 h-3 mr-1" />
                          Clear All
                        </button>
                        <button
                          onClick={applyFilters}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-all"
                        >
                          Apply
                        </button>
                      </div>
                    </div>,
                    document.body
                  )}
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiRefreshCw
                  className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
            <div className="mt-2 lg:mt-0 flex items-center gap-3">
              <div className="flex items-center">
                <InitiationDashboardExportButton trainings={trainings} />
              </div>
              <div className="w-px h-6 bg-gray-300"></div>
              <button
                type="button"
                onClick={() => {
                  setTrainerCalendarTraining(null);
                  setShowTrainerCalendar(true);
                }}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
              >
                <FiCalendar className="mr-2 w-4 h-4" /> Trainer Calendar
              </button>
            </div>
          </div>

          {/* Status Tabs (Not Started, Initiated, Hold, In Progress, Done) */}
          <div className="mt-3">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
              {Object.keys(STATUS_LABELS).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveStatusTab(key)}
                  className={`py-2 rounded-xl text-sm font-semibold transition-all ${
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

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 text-xs">Loading training data...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">
                      Total Colleges
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {Object.keys(filteredGrouped).length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FiBookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Replaced Active Phases with Total Hours */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">
                      Total Hours
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {trainings
                        .filter((t) => t.computedStatus !== "Not Started")
                        .reduce((acc, t) => acc + (t.totalHours || 0), 0)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <FiClock className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
              </div>

              {/* Replaced Total Batches with Total Cost */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">
                      Total Cost
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      ₹
                      {trainings
                        .filter((t) => t.computedStatus !== "Not Started")
                        .reduce((acc, t) => acc + (t.totalCost || 0), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <FiDollarSign className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
              </div>

              {/* Overall Health */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">
                      Overall Health
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {overallHealth.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <FiTrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Training Tables */}
            {Object.keys(filteredGrouped).length > 0 ? (
              Object.entries(filteredGrouped).map(([college, data]) => {
                const { phases, health } = data;
                return (
                  <div
                    key={college}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden"
                  >
                    {/* College Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-white">
                            {college}
                          </h2>
                          <p className="text-blue-100 text-sm mt-1">
                            {phases.length} phase
                            {phases.length !== 1 ? "s" : ""} configured • TCV: ₹
                            {data.tcv.toLocaleString()} • Training Cost: ₹
                            {data.totalCost.toLocaleString()} • Health: {health.toFixed(1)}% • Total Contract Amount (including GST): ₹
                            {data.hasGST ? data.totalNetPayable.toLocaleString() : "NA"}
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
                            const canEdit =
                              training.domainsCount > 0 ||
                              training.isEdit === true;

                            // Get assigned user details
                            const assignedUser =
                              training.originalFormData?.assignedTo;
                            const assignedDisplay =
                              assignedUser?.name ||
                              assignedUser?.email ||
                              assignedUser?.uid ||
                              "Unassigned";

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
                                          {training.trainingStartDate} -{" "}
                                          {training.trainingEndDate}
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
                                                  {(
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
                        const canEdit =
                          training.domainsCount > 0 || training.isEdit === true;

                        // Get assigned user details
                        const assignedUser =
                          training.originalFormData?.assignedTo;
                        const assignedDisplay =
                          assignedUser?.name ||
                          assignedUser?.email ||
                          assignedUser?.uid ||
                          "Unassigned";

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
                                        {training.trainingStartDate} -{" "}
                                        {training.trainingEndDate}
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
        includeSundays={false}
      />
      {/* Undo toast */}
      {toast && (
        <div className="fixed right-4 bottom-6 z-50">
          {toast.type === "assignment" ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-fade-in">
              <FiUser className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800 font-medium">
                {toast.message}
              </span>
              <button
                onClick={handleUndoAssignment}
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold underline hover:no-underline transition-colors"
              >
                Undo
              </button>
              <button
                onClick={() => {
                  if (toast.timer) clearTimeout(toast.timer);
                  setToast(null);
                }}
                className="text-sm text-blue-400 hover:text-blue-600 ml-1"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2 flex items-center gap-3">
              <span className="text-sm text-gray-700">Moved to</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  (STATUS_UI[toast.status] && STATUS_UI[toast.status].pill) ||
                  "bg-gray-100 text-gray-700"
                }`}
              >
                {toast.status}
              </span>
              <button
                onClick={handleUndo}
                className="text-sm text-blue-600 font-semibold"
              >
                Undo
              </button>
              <button
                onClick={() => {
                  if (toast.timer) clearTimeout(toast.timer);
                  setToast(null);
                }}
                className="text-sm text-gray-400"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
