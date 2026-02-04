import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Suspense,
  lazy,
} from "react";
// ⬇️ Keep only the Firestore imports needed for User Logic (Profile/Auth)
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// ⬇️ Import your new Service
import { DepartmentService } from "./services/DepartmentService";

import { exportBudget } from "./utils/ExportBudget";
import { exportPurchaseOrders } from "./utils/ExportPO";
import { exportPurchaseIntents } from "./utils/ExportIntent";
import { Plus, PlusIcon } from "lucide-react";
import { toast } from "react-toastify";
import { budgetComponents, componentColors } from "./config/department";

// Lazy load components
const BudgetForm = lazy(() => import("./BudgetForm"));
const BudgetUpdateForm = lazy(() => import("./BudgetUpdateForm"));
const PurchaseIntentModal = lazy(() => import("./PurchaseIntentModal"));
const PurchaseOrderModal = lazy(() => import("./PurchaseOrderModal"));
const BudgetOverview = lazy(() => import("./BudgetOverview"));
const PurchaseIntentsList = lazy(() => import("./PurchaseIntentsList"));
const PurchaseOrdersList = lazy(() => import("./PurchaseOrdersList"));
const VendorManagement = lazy(() => import("./VendorManagement"));
const ViewBudgetModal = lazy(() => import("./ViewBudgetModal"));
const ManageCSDD = lazy(()=> import("./ManageCSDD"))

// Loading component
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-4">
    <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
);

// Helper function to get department components
const getDepartmentComponents = (department) => {
  if (!department) {
    console.warn("❌ No department specified, falling back to admin");
    return budgetComponents.admin || {};
  }
  const deptKey = department.toLowerCase().trim();
  return budgetComponents[deptKey] || budgetComponents.admin || {};
};

// Action Dropdown Component (Unchanged)
const ActionDropdown = ({ budget, onEdit, onDelete, onView, onActivate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-sm"
      >
        <svg
          className="w-4 h-4 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10 text-sm">
          <div className="py-1">
            <button
              onClick={() => {
                onView(budget);
                setIsOpen(false);
              }}
              className="flex items-center w-full px-3 py-1.5 text-gray-700 hover:bg-gray-100"
            >
              <svg
                className="w-3.5 h-3.5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              View Details
            </button>
            {budget.status !== "active" && (
              <button
                onClick={() => {
                  onActivate(budget);
                  setIsOpen(false);
                }}
                className="flex items-center w-full px-3 py-1.5 text-green-600 hover:bg-gray-100"
              >
                <svg
                  className="w-3.5 h-3.5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Set as Active
              </button>
            )}
            <button
              onClick={() => {
                onEdit(budget);
                setIsOpen(false);
              }}
              className="flex items-center w-full px-3 py-1.5 text-blue-600 hover:bg-gray-100"
            >
              <svg
                className="w-3.5 h-3.5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit Budget
            </button>
            <button
              onClick={() => {
                exportBudget(budget.department, budget.fiscalYear, budget);
                setIsOpen(false);
              }}
              className="flex items-center w-full px-3 py-1.5 text-emerald-600 hover:bg-gray-100"
            >
              <svg
                className="w-3.5 h-3.5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Export Budget
            </button>
            <button
              onClick={() => {
                onDelete(budget);
                setIsOpen(false);
              }}
              className="flex items-center w-full px-3 py-1.5 text-red-600 hover:bg-gray-100"
            >
              <svg
                className="w-3.5 h-3.5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete Budget
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function BudgetDashboard({
  department,
  showVendorManagement = false,
  showDepartment = false,
  onBack,
}) {
  // State management
  const [activeTab, setActiveTab] = useState("budgets");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState(false);

  // User Logic State (Preserved Here)
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);

  const [selectedBudgetForDelete, setSelectedBudgetForDelete] = useState(null);
  const [activationConfirm, setActivationConfirm] = useState(false);
  const [budgetToActivate, setBudgetToActivate] = useState(null);

  // View budget modal
  const [viewBudgetModal, setViewBudgetModal] = useState(false);
  const [viewingBudget, setViewingBudget] = useState(null);

  // Budget state
  const [departmentBudget, setDepartmentBudget] = useState(null);
  const [budgetHistory, setBudgetHistory] = useState([]);

  // Purchase intents and orders
  const [purchaseIntents, setPurchaseIntents] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Modal states
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showBudgetUpdateForm, setShowBudgetUpdateForm] = useState(false);
  const [showPurchaseIntentModal, setShowPurchaseIntentModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: "",
    component: "",
    dateRange: { start: "", end: "" },
  });

  // Util from Service
  const currentFiscalYear = DepartmentService.getCurrentFiscalYear();

  // ==========================================
  // 1. USER LOGIC (Kept Inside Component)
  // ==========================================

  const getUserByEmail = useCallback(async (email) => {
    if (!email) return null;
    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() };
      }
      return null;
    } catch (error) {
      console.error("Error querying user by email:", error);
      return null;
    }
  }, []);

  // Auth Effect
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load User Data Profile
  useEffect(() => {
    const loadCurrentUserData = async () => {
      if (!currentUser?.email) return;
      const userData = await getUserByEmail(currentUser.email);
      setCurrentUserData(userData || null);
    };

    if (currentUser && usersLoaded) {
      loadCurrentUserData();
    }
  }, [currentUser, usersLoaded, getUserByEmail]);

  // Subscribe to Users Collection (For ready state)
  useEffect(() => {
    if (!currentUser) return;
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsersLoaded(true);
      setLoading(false);
    });
    return () => unsubUsers();
  }, [currentUser]);

  // Computed User Values
  const currentUserDepartment = useMemo(() => {
    if (currentUserData) {
      return (
        currentUserData.department ||
        (currentUserData.departments && currentUserData.departments[0]) ||
        "admin"
      );
    }
    return department || "admin";
  }, [currentUserData, department]);

  const currentUserDepartmentComponents = getDepartmentComponents(
    currentUserDepartment
  );

  // ==========================================
  // 2. DATA LOGIC (Refactored to Service)
  // ==========================================

  useEffect(() => {
    if (!currentUser) return;

    // 1. Budgets
    const unsubBudget = DepartmentService.subscribeToBudgets(
      department,
      (data) => {
        setDepartmentBudget(data[0] || null); // Most recent
        setBudgetHistory(data);
      }
    );

    // 2. Intents
    const unsubIntents = DepartmentService.subscribeToIntents(
      department,
      currentFiscalYear,
      (data) => {
        setPurchaseIntents(data);
      }
    );

    // 3. Orders
    const unsubOrders = DepartmentService.subscribeToOrders(
      department,
      currentFiscalYear,
      (data) => {
        setPurchaseOrders(data);
      }
    );

    // 4. Vendors
    const unsubVendors = DepartmentService.subscribeToVendors((data) => {
      setVendors(data);
    });

    return () => {
      unsubBudget();
      unsubIntents();
      unsubOrders();
      unsubVendors();
    };
  }, [currentUser, department, currentFiscalYear]);

  // ==========================================
  // 3. COMPUTED VALUES (UI Logic)
  // ==========================================

  const activeBudget = useMemo(() => {
    return budgetHistory.find((budget) => budget.status === "active");
  }, [budgetHistory]);

  const getComponentsForItem = useCallback(
    (item) => {
      if (item.department) {
        return getDepartmentComponents(item.department);
      }
      return currentUserDepartmentComponents;
    },
    [currentUserDepartmentComponents]
  );

  const budgetUtilization = useMemo(() => {
    const targetBudget = activeBudget || departmentBudget;
    if (!targetBudget) return {};

    const utilization = {};
    const deptComponents = currentUserDepartmentComponents;

    Object.keys(deptComponents).forEach((component) => {
      const allocated =
        targetBudget.departmentExpenses?.[component]?.allocated ||
        targetBudget.fixedCosts?.[component]?.allocated ||
        targetBudget.csddExpenses?.[component]?.allocated ||
        0;

      const spent =
        targetBudget.departmentExpenses?.[component]?.spent ||
        targetBudget.fixedCosts?.[component]?.spent ||
        targetBudget.csddExpenses?.[component]?.spent ||
        0;

      utilization[component] = {
        allocated,
        spent,
        remaining: allocated - spent,
        utilizationRate: allocated > 0 ? (spent / allocated) * 100 : 0,
      };
    });
    return utilization;
  }, [activeBudget, departmentBudget, currentUserDepartmentComponents]);

  const filteredIntents = useMemo(() => {
    return purchaseIntents.filter((intent) => {
      const matchesStatus = !filters.status || intent.status === filters.status;
      const matchesComponent =
        !filters.component || intent.budgetComponent === filters.component;

      let matchesDate = true;
      if (filters.dateRange.start || filters.dateRange.end) {
        const intentDate = intent.createdAt?.seconds
          ? new Date(intent.createdAt.seconds * 1000)
          : new Date(intent.createdAt);

        if (filters.dateRange.start)
          matchesDate =
            matchesDate && intentDate >= new Date(filters.dateRange.start);
        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && intentDate <= endDate;
        }
      }
      return matchesStatus && matchesComponent && matchesDate;
    });
  }, [purchaseIntents, filters]);

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((order) => {
      const matchesStatus = !filters.status || order.status === filters.status;
      const matchesComponent =
        !filters.component || order.budgetComponent === filters.component;

      let matchesDate = true;
      if (filters.dateRange.start || filters.dateRange.end) {
        const orderDate = order.createdAt?.seconds
          ? new Date(order.createdAt.seconds * 1000)
          : new Date(order.createdAt);

        if (filters.dateRange.start)
          matchesDate =
            matchesDate && orderDate >= new Date(filters.dateRange.start);
        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && orderDate <= endDate;
        }
      }
      return matchesStatus && matchesComponent && matchesDate;
    });
  }, [purchaseOrders, filters]);

  // ==========================================
  // 4. HANDLERS (Delegated to Service)
  // ==========================================

  const handleCreateBudget = useCallback(
    async (budgetData) => {
      try {
        await DepartmentService.createBudget(
          department,
          budgetData,
          currentUser
        );
        setShowBudgetForm(false);
        toast.success("Budget created successfully");
      } catch (error) {
        console.error("Error creating budget:", error);
        toast.error("Failed to create budget.");
      }
    },
    [currentUser, department]
  );

  const handleUpdateBudget = useCallback(
    async (budgetData, existingBudget) => {
      try {
        await DepartmentService.updateBudget(
          budgetData,
          existingBudget,
          currentUser
        );
        setShowBudgetUpdateForm(false);
        setEditingBudget(null);

        if (budgetData.status === "active") {
          toast.info("Budget set to active! Others archived.");
        } else {
          toast.success("Budget Updated Successfully");
        }
      } catch (error) {
        console.error("Error updating budget:", error);
        toast.error("Failed to update budget.");
      }
    },
    [currentUser]
  );

  const handleDeleteBudget = useCallback(async () => {
    if (!selectedBudgetForDelete) return;
    setDeletingBudget(true);
    try {
      await DepartmentService.deleteBudget(selectedBudgetForDelete.id);
      setDeleteConfirm(false);
      setSelectedBudgetForDelete(null);
      toast.success("Budget deleted successfully");
    } catch (error) {
      console.error("Error deleting budget:", error);
      toast.error("Failed to delete budget.");
    } finally {
      setDeletingBudget(false);
    }
  }, [selectedBudgetForDelete]);

  const handleActivateClick = (budget) => {
    setBudgetToActivate(budget);
    setActivationConfirm(true);
  };

  const confirmActivation = async () => {
    if (!budgetToActivate) return;
    try {
      await DepartmentService.activateBudget(budgetToActivate, currentUser);
      toast.success("Budget activated successfully");
      setActivationConfirm(false);
      setBudgetToActivate(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to activate budget");
    }
  };

  const handleCreateIntent = useCallback(
    async (intentData) => {
      try {
        await DepartmentService.createIntent(
          intentData,
          department,
          currentFiscalYear,
          currentUser
        );
        setShowPurchaseIntentModal(false);
        toast.success("Intent submitted successfully");
      } catch (error) {
        console.error("Error creating intent:", error);
        toast.error("Failed to create intent");
      }
    },
    [currentUser, department, currentFiscalYear]
  );

  const handleDeleteIntent = useCallback(async (intentId) => {
    try {
      await DepartmentService.deleteIntent(intentId);
      toast.success("Intent deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete intent");
    }
  }, []);

  const handleCreatePurchaseOrder = useCallback(
    async (orderData) => {
      try {
        // All the complexity (PO Numbers, Transactions) is now inside this Service call
        await DepartmentService.createPurchaseOrder(
          orderData,
          department,
          currentFiscalYear,
          activeBudget || departmentBudget,
          currentUser
        );

        setShowPurchaseOrderModal(false);
        setSelectedIntent(null);
        toast.success("Purchase Order created and Budget updated!");
      } catch (error) {
        console.error(error);
        toast.error(error.message || "Failed to create Purchase Order");
      }
    },
    [currentUser, department, currentFiscalYear, activeBudget, departmentBudget]
  );

  const handleUpdatePurchaseOrder = async (updatedOrder) => {
    try {
      // Permission Check (Relies on local User Data, so kept here)
      const userDept = currentUserDepartment || "unknown";
      const allowedDepartments = ["hr", "admin", "purchase"];
      if (!allowedDepartments.includes(userDept.toLowerCase())) {
        toast.warning("Only HR, Admin, or Purchase users can update POs");
        return;
      }

      await DepartmentService.updatePurchaseOrder(updatedOrder, currentUser);

      // Optimistic update
      setPurchaseOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
      toast.success("Purchase order updated");
    } catch (error) {
      console.error("Error updating PO:", error);
      toast.error("Failed to update PO");
    }
  };

  // UI Handlers (Simple state setters)
  const handleEditBudget = (budget) => {
    setEditingBudget(budget);
    setShowBudgetUpdateForm(true);
  };

  const handleDeleteBudgetClick = (budget) => {
    setSelectedBudgetForDelete(budget);
    setDeleteConfirm(true);
  };

  const handleViewBudget = (budget) => {
    setViewingBudget(budget);
    setViewBudgetModal(true);
  };

  const tabConfig = {
    budgets: { name: "Budgets", color: "bg-sky-500" },
    intents: { name: "Purchase Intents", color: "bg-emerald-600" },
    orders: { name: "Purchase Orders", color: "bg-violet-500" },
    ...(showVendorManagement && {
      vendors: { name: "Vendor Management", color: "bg-indigo-500" },
    }),
    csdd: { name: "CSDD", color: "bg-amber-600" },
    history: { name: "Budget History", color: "bg-gray-500" },
  };

  // ==========================================
  // 5. RENDER (Identical to Original)
  // ==========================================

  if (loading || !usersLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm">
        <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="ml-3 text-gray-600">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <div className=" mx-auto py-2">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mb-6">
          {onBack && (
            <div className="mb-4">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 text-xs"
              >
                <svg
                  className="w-3.5 h-3.5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span>Back to Sales</span>
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {department.charAt(0).toUpperCase() + department.slice(1)}{" "}
                Budget Dashboard
              </h1>
              <p className="text-gray-600 mt-1">FY_{currentFiscalYear}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setEditingBudget(null);
                  setShowBudgetForm(true);
                }}
                className="bg-violet-700 text-white px-3 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-[inset_0_1px_3px_rgba(255,255,255,0.3),0_3px_5px_rgba(0,0,0,0.4)] active:shadow-[inset_0_3px_5px_rgba(0,0,0,0.4)] active:translate-y-0.5 flex items-center gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Create Budget
              </button>
              <button
                onClick={() => setShowPurchaseIntentModal(true)}
                className="bg-sky-700 text-white px-3 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-[inset_0_1px_3px_rgba(255,255,255,0.3),0_3px_5px_rgba(0,0,0,0.4)] active:shadow-[inset_0_3px_5px_rgba(0,0,0,0.4)] active:translate-y-0.5 flex items-center gap-1.5 text-xs"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Create Purchase Intent
              </button>
              {(activeTab === "intents" || activeTab === "orders") && (
                <button
                  onClick={() =>
                    activeTab === "intents"
                      ? exportPurchaseIntents(
                          department,
                          currentFiscalYear,
                          purchaseIntents
                        )
                      : exportPurchaseOrders(
                          department,
                          currentFiscalYear,
                          purchaseOrders
                        )
                  }
                  className="bg-emerald-600 text-white px-3 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-[inset_0_1px_3px_rgba(255,255,255,0.3),0_3px_5px_rgba(0,0,0,0.4)] active:shadow-[inset_0_3px_5px_rgba(0,0,0,0.4)] active:translate-y-0.5 flex items-center text-xs"
                >
                  <svg
                    className="w-3.5 h-3.5 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>{" "}
                  Export
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-4">
            {Object.entries(tabConfig).map(([key, tab]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all text-xs ${
                  activeTab === key
                    ? `${tab.color} text-white shadow-[inset_0_1px_3px_rgba(255,255,255,0.3),0_3px_5px_rgba(0,0,0,0.4)]`
                    : "bg-gray-100 text-gray-700 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5),0_3px_5px_rgba(0,0,0,0.2)] hover:bg-gray-200 hover:shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.3)] active:shadow-[inset_0_3px_5px_rgba(0,0,0,0.3)] active:translate-y-0.5"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-200 text-sm">
          <Suspense fallback={<ComponentLoader />}>
            {activeTab === "budgets" && (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900">
                      Department Budgets
                    </h2>
                  </div>
                  {budgetHistory.length > 0 ? (
                    <div className="max-w-full">
                      <table className="w-full min-w-[600px] text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">
                              Fiscal Year
                            </th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">
                              Total Budget
                            </th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">
                              Total Spent
                            </th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">
                              Remaining
                            </th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">
                              Status
                            </th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">
                              Last Updated
                            </th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetHistory
                            .sort((a, b) => {
                              if (
                                a.status === "active" &&
                                b.status !== "active"
                              )
                                return -1;
                              if (
                                a.status !== "active" &&
                                b.status === "active"
                              )
                                return 1;
                              return (
                                parseInt(b.fiscalYear) - parseInt(a.fiscalYear)
                              );
                            })
                            .map((budget) => (
                              <tr
                                key={budget.id}
                                className={`border-b border-gray-100 ${
                                  budget.status === "active"
                                    ? "bg-green-50 shadow-[inset_0_1px_3px_rgba(255,255,255,0.6),0_1px_3px_rgba(0,0,0,0.2)]"
                                    : ""
                                }`}
                              >
                                <td className="py-2 px-3">
                                  <span className="font-medium text-gray-900">
                                    FY{budget.fiscalYear}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <span className="font-semibold text-gray-900">
                                    ₹
                                    {budget.summary?.totalBudget?.toLocaleString(
                                      "en-IN"
                                    ) || "0"}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <span className="text-gray-700">
                                    ₹
                                    {budget.summary?.totalSpent?.toLocaleString(
                                      "en-IN"
                                    ) || "0"}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`font-medium ${
                                      (budget.summary?.totalBudget || 0) -
                                        (budget.summary?.totalSpent || 0) >=
                                      0
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    ₹
                                    {(
                                      (budget.summary?.totalBudget || 0) -
                                      (budget.summary?.totalSpent || 0)
                                    ).toLocaleString("en-IN")}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      budget.status === "active"
                                        ? "bg-green-100 text-green-800"
                                        : budget.status === "draft"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {budget.status}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-gray-600">
                                  {budget.lastUpdatedAt
                                    ? new Date(
                                        budget.lastUpdatedAt.seconds * 1000
                                      ).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })
                                    : "N/A"}
                                </td>
                                <td className="py-2 px-3">
                                  <ActionDropdown
                                    budget={budget}
                                    onEdit={handleEditBudget}
                                    onDelete={handleDeleteBudgetClick}
                                    onView={handleViewBudget}
                                    onActivate={handleActivateClick}
                                  />
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 max-w-md mx-auto">
                        <svg
                          className="w-10 h-10 text-yellow-500 mx-auto mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                        <h3 className="text-base font-semibold text-yellow-800 mb-1.5">
                          No Budgets Created
                        </h3>
                        <p className="text-yellow-700 mb-3 text-sm">
                          Create your first budget to get started with budget
                          management.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {activeBudget && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold text-gray-900">
                        Active Budget Overview - FY{activeBudget.fiscalYear}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Active
                        </span>
                        <p className="text-xs text-gray-600">
                          Real-time budget utilization and analytics
                        </p>
                      </div>
                    </div>
                    <Suspense fallback={<ComponentLoader />}>
                      <BudgetOverview
                        departmentBudget={activeBudget}
                        budgetUtilization={budgetUtilization}
                        budgetComponents={currentUserDepartmentComponents}
                        componentColors={componentColors}
                        purchaseIntents={purchaseIntents}
                        purchaseOrders={purchaseOrders}
                        fiscalYear={currentFiscalYear}
                        userDepartment={currentUserDepartment}
                      />
                    </Suspense>
                  </div>
                )}
              </>
            )}

            {activeTab === "orders" && (
              <PurchaseOrdersList
                orders={filteredOrders}
                budgetComponents={currentUserDepartmentComponents}
                componentColors={componentColors}
                filters={filters}
                onFiltersChange={setFilters}
                currentUser={currentUser}
                departmentBudget={activeBudget || departmentBudget}
                fiscalYear={currentFiscalYear}
                userDepartment={currentUserDepartment}
                vendors={vendors}
                getComponentsForItem={getComponentsForItem}
                showDepartment={showDepartment}
                onUpdatePurchaseOrder={handleUpdatePurchaseOrder}
              />
            )}

            {activeTab === "intents" && (
              <PurchaseIntentsList
                intents={filteredIntents}
                budgetComponents={currentUserDepartmentComponents}
                componentColors={componentColors}
                onDeleteIntent={handleDeleteIntent}
                onCreatePurchaseOrder={(intent) => {
                  setSelectedIntent(intent);
                  setShowPurchaseOrderModal(true);
                }}
                filters={filters}
                onFiltersChange={setFilters}
                currentUser={currentUser}
                fiscalYear={currentFiscalYear}
                userDepartment={currentUserDepartment}
                getComponentsForItem={getComponentsForItem}
                showDepartment={showDepartment}
              />
            )}

            {activeTab === "vendors" && showVendorManagement && (
              <VendorManagement
                vendors={vendors}
                purchaseOrders={purchaseOrders}
                currentUser={currentUser}
              />
            )}

            {activeTab === "csdd" && (
              <ManageCSDD
                department={department}
                currentBudget={activeBudget || departmentBudget}
                fiscalYear={currentFiscalYear}
                currentUser={currentUser}
              />
            )}

            {activeTab === "history" && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Budget Analytics - FY{currentFiscalYear}
                </h3>
                {budgetHistory.length > 0 ? (
                  <div className="grid gap-3">
                    {budgetHistory.map((budget) => (
                      <div
                        key={budget.id}
                        className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors text-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              FY{budget.fiscalYear} Budget
                            </h4>
                            <p className="text-gray-600">
                              {budget.department} • {budget.status}
                            </p>
                            <p className="text-gray-600">
                              Total: ₹
                              {budget.summary?.totalBudget?.toLocaleString(
                                "en-IN"
                              )}{" "}
                              • Spent: ₹
                              {budget.summary?.totalSpent?.toLocaleString(
                                "en-IN"
                              )}
                            </p>
                            <p className="text-gray-600">
                              Utilization:{" "}
                              {budget.summary?.totalBudget
                                ? (
                                    (budget.summary.totalSpent /
                                      budget.summary.totalBudget) *
                                    100
                                  ).toFixed(1)
                                : 0}
                              %
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              budget.status === "active"
                                ? "bg-green-100 text-green-800"
                                : budget.status === "draft"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {budget.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-base">
                      No budget history found
                    </p>
                    <p className="text-gray-400 mt-1.5 text-sm">
                      Create a budget to get started
                    </p>
                  </div>
                )}
              </div>
            )}
          </Suspense>
        </div>
      </div>

      {/* Modals */}
      <Suspense fallback={<ComponentLoader />}>
        {showBudgetForm && (
          <BudgetForm
            show={showBudgetForm}
            onClose={() => {
              setShowBudgetForm(false);
              setEditingBudget(null);
            }}
            onSubmit={handleCreateBudget}
            budgetComponents={currentUserDepartmentComponents}
            allBudgetComponents={budgetComponents}
            currentUser={currentUser}
            department={department}
            fiscalYear={currentFiscalYear}
          />
        )}
        {showBudgetUpdateForm && editingBudget && (
          <BudgetUpdateForm
            show={showBudgetUpdateForm}
            onClose={() => {
              setShowBudgetUpdateForm(false);
              setEditingBudget(null);
            }}
            onSubmit={handleUpdateBudget}
            budgetComponents={currentUserDepartmentComponents}
            allBudgetComponents={budgetComponents}
            existingBudget={editingBudget}
            currentUser={currentUser}
            department={department}
          />
        )}
        {viewBudgetModal && viewingBudget && (
          <ViewBudgetModal
            show={viewBudgetModal}
            onClose={() => setViewBudgetModal(false)}
            budget={viewingBudget}
            componentColors={componentColors}
          />
        )}
        {showPurchaseIntentModal && (
          <PurchaseIntentModal
            show={showPurchaseIntentModal}
            onClose={() => setShowPurchaseIntentModal(false)}
            onSubmit={handleCreateIntent}
            budgetComponents={currentUserDepartmentComponents}
            componentColors={componentColors}
            currentBudget={activeBudget || departmentBudget}
            currentUser={currentUser}
            department={department}
            fiscalYear={currentFiscalYear}
          />
        )}
        {showPurchaseOrderModal && selectedIntent && (
          <PurchaseOrderModal
            show={showPurchaseOrderModal}
            onClose={() => {
              setShowPurchaseOrderModal(false);
              setSelectedIntent(null);
            }}
            onSubmit={handleCreatePurchaseOrder}
            intent={selectedIntent}
            vendors={vendors}
            budgetComponents={currentUserDepartmentComponents}
            fiscalYear={currentFiscalYear}
            currentUser={currentUser}
          />
        )}
      </Suspense>

      {/* Confirmation Modals */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50 text-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4">
              <div className="flex items-center justify-center w-10 h-10 mx-auto bg-red-100 rounded-full mb-3">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 text-center mb-1.5">
                Delete Budget?
              </h3>
              <p className="text-gray-600 text-center mb-4 text-sm">
                Are you sure you want to delete the FY{" "}
                {selectedBudgetForDelete?.fiscalYear} budget? This action cannot
                be undone and all budget data will be permanently removed.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDeleteConfirm(false);
                    setSelectedBudgetForDelete(null);
                  }}
                  disabled={deletingBudget}
                  className="flex-1 px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteBudget}
                  disabled={deletingBudget}
                  className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center text-sm"
                >
                  {deletingBudget ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    "Delete Budget"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activationConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              Activate Budget?
            </h3>
            <p className="text-gray-600 text-center mb-6 text-sm">
              Are you sure you want to activate{" "}
              <strong>FY{budgetToActivate?.fiscalYear}</strong>?<br />
              <br />
              <span className="text-red-500 font-medium">Warning:</span> This
              will automatically archive any other active budgets for the{" "}
              <strong>{budgetToActivate?.department}</strong> department.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setActivationConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmActivation}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Yes, Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetDashboard;
