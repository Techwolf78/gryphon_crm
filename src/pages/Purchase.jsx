import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  collection,
  onSnapshot,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  updateDoc,
  doc,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Suspense, lazy } from "react";
import { exportBudget } from "../components/Budget/utils/ExportBudget";
import { exportPurchaseOrders } from "../components/Budget/utils/ExportPO";
import { exportPurchaseIntents } from "../components/Budget/utils/ExportIntent";
import ViewBudgetModal from "../components/Budget/ViewBudgetModal";
import { toast } from "react-toastify";
import {
  BarChart4,
  Edit,
  LucideEye,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";

// Lazy load components
const BudgetUpdateForm = lazy(() =>
  import("../components/Budget/BudgetUpdateForm")
);
const PurchaseOrderModal = lazy(() =>
  import("../components/Budget/PurchaseOrderModal")
);
const BudgetOverview = lazy(() =>
  import("../components/Budget/BudgetOverview")
);
const PurchaseIntentsList = lazy(() =>
  import("../components/Budget/PurchaseIntentsList")
);
const PurchaseOrdersList = lazy(() =>
  import("../components/Budget/PurchaseOrdersList")
);
const VendorManagement = lazy(() =>
  import("../components/Budget/VendorManagement")
);
const ExpensesPanel = lazy(() => import("../components/Budget/ExpensesPanel"));

// Loading component
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-4">
    <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
);

// Budget component types organized by department
const budgetComponents = {
  sales: {
    emails: "Email Subscriptions",
    laptops: "Laptops",
    tshirts: "T-shirts",
    printmedia: "Print Media",
    diwaligifts: "Diwali Gifts",
  },
  cr: {
    emails: "Email Subscriptions",
    laptops: "Laptops",
    tshirts: "T-shirts",
    printmedia: "Print Media",
    gifts: "Diwali & Other Gifts",
  },
  lnd: {
    laptops: "Laptops",
    printmedia: "Print Media",
    trainertshirts: "Trainer T-shirts",
    tshirts: "T-shirts",
  },
  hr: {
    tshirts: "T-shirts",
    email: "Email Subscriptions",
    laptops: "Laptops",
    ca: "CA Consultancy",
  },
  dm: {
    laptops: "Laptops",
    email: "Email Subscriptions",
    printmedia: "Print Media",
    tshirts: "T-shirts",
    trademarks: "Trademarks / Domains",
    adobe: "Adobe Creative Cloud",
    envato: "Envato Subscription",
    canva: "Canva Pro",
    softwareinstallation: "Software Installation",
    simcard: "SIM Card / Network Tools",
    elevenlabs: "Eleven Labs Subscription",
    performancemarketing: "Performance Marketing",
  },
  admin: {
    emails: "Email Subscriptions",
    pt: "Promotional Tools",
    laptops: "Laptops",
    tshirts: "T-shirts",
    printmedia: "Print Media",
    diwaligifts: "Diwali Gifts",
  },
  purchase: {
    emails: "Email Subscriptions",
    pt: "Promotional Tools",
    laptops: "Laptops",
    tshirts: "T-shirts",
    printmedia: "Print Media",
    diwaligifts: "Diwali Gifts",
  },
  placement: {
    emails: "Email Subscriptions",
    laptops: "Laptops",
    tshirts: "T-shirts",
    printmedia: "Print Media",
    training_materials: "Training Materials",
    placement_events: "Placement Events",
    corporate_gifts: "Corporate Gifts",
    travel_expenses: "Travel Expenses",
  },
  management: {
    emails: "Email Subscriptions",
  },
};

// Component colors mapping
const componentColors = {
  emails: "bg-blue-100 text-blue-800 border-blue-200",
  pt: "bg-purple-100 text-purple-800 border-purple-200",
  laptops: "bg-sky-100 text-sky-800 border-sky-200",
  tshirts: "bg-indigo-100 text-indigo-800 border-indigo-200",
  printmedia: "bg-cyan-100 text-cyan-800 border-cyan-200",
  diwaligifts: "bg-pink-100 text-pink-800 border-pink-200",
  gifts: "bg-orange-100 text-orange-800 border-orange-200",
  trainertshirts: "bg-green-100 text-green-800 border-green-200",
  esic: "bg-red-100 text-red-800 border-red-200",
  email: "bg-blue-100 text-blue-800 border-blue-200",
  ca: "bg-gray-100 text-gray-800 border-gray-200",
  trademarks: "bg-yellow-100 text-yellow-800 border-yellow-200",
  adobe: "bg-red-100 text-red-800 border-red-200",
  envato: "bg-green-100 text-green-800 border-green-200",
  canva: "bg-blue-100 text-blue-800 border-blue-200",
  softwareinstallation: "bg-purple-100 text-purple-800 border-purple-200",
  simcard: "bg-indigo-100 text-indigo-800 border-indigo-200",
  elevenlabs: "bg-amber-100 text-amber-800 border-amber-200",
  performancemarketing: "bg-pink-100 text-pink-800 border-pink-200",
  training_materials: "bg-teal-100 text-teal-800 border-teal-200",
  placement_events: "bg-violet-100 text-violet-800 border-violet-200",
  corporate_gifts: "bg-rose-100 text-rose-800 border-rose-200",
  travel_expenses: "bg-lime-100 text-lime-800 border-lime-200",
};

// Indian Fiscal Year → April 1 to March 31
const getCurrentFiscalYear = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0 = Jan, 3 = April

  // If month < 3, we are before April → fiscal year belongs to previous year
  const fyStartYear = month >= 3 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;

  // Return in "YY-YY" format
  return `${fyStartYear.toString().slice(-2)}-${fyEndYear
    .toString()
    .slice(-2)
    .padStart(2, "0")}`;
};

// Helper function to get department components
const getDepartmentComponents = (department) => {
  if (!department) {
    console.warn("❌ No department specified, falling back to admin");
    return budgetComponents.admin || {};
  }

  // Convert department to lowercase and handle variations
  const deptKey = department.toLowerCase().trim();
  const components = budgetComponents[deptKey];

  if (!components) {
    console.warn(
      `❌ No components found for department: ${department}, falling back to admin`
    );
    return budgetComponents.admin || {};
  }

  return components;
};

// Action Dropdown Component (Updated from BudgetDashboard)
const ActionDropdown = ({ budget, onEdit, onDelete, onView, onSelect }) => {
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
        <div className="absolute right-0 mt-1 w-fit bg-white rounded-lg shadow-lg border border-gray-200 z-10 text-sm">
          <div className="py-1">
            <button
              onClick={() => {
                onSelect(budget);
                setIsOpen(false);
              }}
              className="flex items-center w-full px-3 py-1.5 text-green-600 hover:bg-gray-100 whitespace-nowrap"
            >
              <BarChart4 className="w-3.5 h-3.5 mr-2" />
              Change Overview
            </button>
            <button
              onClick={() => {
                onView(budget);
                setIsOpen(false);
              }}
              className="flex items-center w-full px-3 py-1.5 text-gray-700 hover:bg-gray-100 whitespace-nowrap"
            >
              <LucideEye className="w-3.5 h-3.5 mr-2" />
              View Details
            </button>
            <button
              onClick={() => {
                onEdit(budget);
                setIsOpen(false);
              }}
              className="flex items-center w-full px-3 py-1.5 text-blue-600 hover:bg-gray-100 whitespace-nowrap"
            >
              <Edit className="w-3.5 h-3.5 mr-2" />
              Edit Budget
            </button>
            <button
              onClick={() => {
                exportBudget(budget.department, budget.fiscalYear, budget);
                setIsOpen(false);
              }}
              className="flex items-center w-full px-3 py-1.5 text-emerald-600 hover:bg-gray-100 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              Export Budget
            </button>
            <button
              onClick={() => {
                onDelete(budget);
                setIsOpen(false);
              }}
              className="flex items-center w-full px-3 py-1.5 text-red-600 hover:bg-gray-100 whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete Budget
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Department code mapping for PO generation
const getDepartmentCode = (department) => {
  const map = {
    lnd: "T",
    dm: "DM",
    sales: "Sales",
    cr: "CR",
    hr: "HR&Admin",
    admin: "MAN",
    management: "MAN",
    placement: "CR", // Placement falls under CR
    purchase: "PUR",
  };

  return map[department?.toLowerCase()] || department?.toUpperCase();
};

// PO Number generation function
const generatePurchaseOrderNumber = async (
  department,
  fiscalYear,
  budgetId
) => {
  const deptCode = getDepartmentCode(department);
  const prefix = department?.toLowerCase() === "dm" ? "ICEM" : "GA";

  const budgetRef = doc(db, "department_budgets", budgetId);

  // Run a transaction to safely increment the counter
  const nextNumber = await runTransaction(db, async (transaction) => {
    const budgetDoc = await transaction.get(budgetRef);

    if (!budgetDoc.exists()) {
      throw new Error("Budget document not found!");
    }

    const currentCount = budgetDoc.data().poCounter || 0;
    const newCount = currentCount + 1;

    transaction.update(budgetRef, { poCounter: increment(1) });

    return newCount;
  });

  return `${prefix}/${fiscalYear}/${deptCode}/${nextNumber
    .toString()
    .padStart(2, "0")}`;
};

function Purchase() {
  // State management
  const [activeTab, setActiveTab] = useState(() => {
    // Read from localStorage on initialization, fallback to "budgets"
    return localStorage.getItem("purchase-dashboard-active-tab") || "budgets";
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [selectedBudgetForDelete, setSelectedBudgetForDelete] = useState(null);
  const [selectedBudgetForOverview, setSelectedBudgetForOverview] =
    useState(null);

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
  const [showBudgetUpdateForm, setShowBudgetUpdateForm] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: "",
    component: "",
    dateRange: { start: "", end: "" },
  });

  const currentFiscalYear = getCurrentFiscalYear();

  // Add this helper function to query users by email
  const getUserByEmail = useCallback(async (email) => {
    if (!email) return null;

    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error querying user by email:", error);
      return null;
    }
  }, []);

  // Updated department and components
  const currentUserDepartment = useMemo(() => {
    if (currentUserData) {
      const department =
        currentUserData.department ||
        (currentUserData.departments && currentUserData.departments[0]) ||
        "admin";
      return department;
    }
    return "admin";
  }, [currentUserData]);

  const currentUserDepartmentComponents = getDepartmentComponents(
    currentUserDepartment
  );

  // Find active budget
  const activeBudget = useMemo(() => {
    return budgetHistory.find((budget) => budget.status === "active");
  }, [budgetHistory]);

  // Set selected budget to active budget by default
  useEffect(() => {
    if (budgetHistory.length > 0 && !selectedBudgetForOverview) {
      const defaultBudget = activeBudget || budgetHistory[0];
      setSelectedBudgetForOverview(defaultBudget);
    }
  }, [budgetHistory, activeBudget, selectedBudgetForOverview]);

  // Add this function to get components for any intent/order
  const getComponentsForItem = useCallback(
    (item) => {
      if (item.department) {
        return getDepartmentComponents(item.department);
      }
      return currentUserDepartmentComponents;
    },
    [currentUserDepartmentComponents]
  );

  // Effect to load user data by email
  useEffect(() => {
    const loadCurrentUserData = async () => {
      if (!currentUser?.email) {
        return;
      }
      const userData = await getUserByEmail(currentUser.email);

      if (userData) {
        setCurrentUserData(userData);
      } else {
        setCurrentUserData(null);
      }
    };

    if (currentUser && usersLoaded) {
      loadCurrentUserData();
    }
  }, [currentUser, usersLoaded, getUserByEmail]);

  // Update the auth effect
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleDeleteIntent = useCallback(async (intentId) => {
    try {
      await deleteDoc(doc(db, "purchase_intents", intentId));
    } catch (error) {
      console.error("Error deleting purchase intent:", error);
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Users data - this is critical for department info
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const userData = {};

      snapshot.forEach((doc) => {
        userData[doc.id] = { id: doc.id, ...doc.data() };
      });

      setUsersLoaded(true);

      // Debug: Check if we can find current user by email
      if (currentUser?.email) {
        let foundUser = null;
        Object.values(userData).forEach((user) => {
          if (user.email === currentUser.email) {
            foundUser = user;
          }
        });

        if (foundUser) {
          setCurrentUserData(foundUser);
        }
      }

      setLoading(false);
    });

    // Budget query for ALL departments (purchase can see all)
    const budgetQuery = query(
      collection(db, "department_budgets"),
      orderBy("fiscalYear", "desc")
    );

    const unsubBudget = onSnapshot(budgetQuery, (snapshot) => {
      const budgets = [];
      snapshot.forEach((doc) => {
        budgets.push({ id: doc.id, ...doc.data() });
      });
      // Set current budget (most recent)
      setDepartmentBudget(budgets[0] || null);
      // Set all budgets for the table
      setBudgetHistory(budgets);
    });

    // Get ALL purchase intents (no department filter)
    const intentsQuery = query(
      collection(db, "purchase_intents"),
      where("fiscalYear", "==", currentFiscalYear),
      orderBy("createdAt", "desc")
    );

    const unsubIntents = onSnapshot(intentsQuery, (snapshot) => {
      const intents = [];
      snapshot.forEach((doc) => {
        intents.push({ id: doc.id, ...doc.data() });
      });
      setPurchaseIntents(intents);
    });

    // Get ALL purchase orders (no department filter)
    const ordersQuery = query(
      collection(db, "purchase_orders"),
      where("fiscalYear", "==", currentFiscalYear),
      orderBy("createdAt", "desc")
    );

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const orders = [];
      snapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      setPurchaseOrders(orders);
    });

    const unsubVendors = onSnapshot(collection(db, "vendors"), (snapshot) => {
      const vendorData = [];
      snapshot.forEach((doc) => {
        vendorData.push({ id: doc.id, ...doc.data() });
      });
      setVendors(vendorData);
    });

    return () => {
      unsubUsers();
      unsubBudget();
      unsubIntents();
      unsubOrders();
      unsubVendors();
    };
  }, [currentUser, currentFiscalYear]);

  // Memoized calculations - UPDATED: Use selectedBudgetForOverview and v6 schema
  const budgetUtilization = useMemo(() => {
    const targetBudget =
      selectedBudgetForOverview || activeBudget || departmentBudget;

    if (!targetBudget) {
      return {};
    }

    const utilization = {};
    const deptComponents = getDepartmentComponents(targetBudget.department);

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
  }, [selectedBudgetForOverview, activeBudget, departmentBudget]);

  const filteredIntents = useMemo(() => {
    const filtered = purchaseIntents.filter((intent) => {
      const matchesStatus = !filters.status || intent.status === filters.status;
      const matchesComponent =
        !filters.component || intent.budgetComponent === filters.component;

      // Fix date filtering - handle both timestamp and Date objects
      let matchesDate = true;
      if (filters.dateRange.start || filters.dateRange.end) {
        const intentDate = intent.createdAt?.seconds
          ? new Date(intent.createdAt.seconds * 1000)
          : new Date(intent.createdAt);

        if (filters.dateRange.start) {
          const startDate = new Date(filters.dateRange.start);
          matchesDate = matchesDate && intentDate >= startDate;
        }
        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end);
          endDate.setHours(23, 59, 59, 999); // Include entire end day
          matchesDate = matchesDate && intentDate <= endDate;
        }
      }

      return matchesStatus && matchesComponent && matchesDate;
    });

    return filtered;
  }, [purchaseIntents, filters]);

  const filteredOrders = useMemo(() => {
    const filtered = purchaseOrders.filter((order) => {
      const matchesStatus = !filters.status || order.status === filters.status;
      const matchesComponent =
        !filters.component || order.budgetComponent === filters.component;

      // Fix date filtering
      let matchesDate = true;
      if (filters.dateRange.start || filters.dateRange.end) {
        const orderDate = order.createdAt?.seconds
          ? new Date(order.createdAt.seconds * 1000)
          : new Date(order.createdAt);

        if (filters.dateRange.start) {
          const startDate = new Date(filters.dateRange.start);
          matchesDate = matchesDate && orderDate >= startDate;
        }
        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && orderDate <= endDate;
        }
      }

      return matchesStatus && matchesComponent && matchesDate;
    });

    return filtered;
  }, [purchaseOrders, filters]);

  const handleUpdateBudget = useCallback(
    async (budgetData, existingBudget) => {
      if (!existingBudget || !existingBudget.id) {
        console.error("No existing budget provided for update");
        return;
      }

      try {
        const budgetRef = doc(db, "department_budgets", existingBudget.id);

        // 🔹 If this budget is being activated, archive all others in same department
        if (budgetData.status === "active") {
          const budgetsQuery = query(
            collection(db, "department_budgets"),
            where("department", "==", existingBudget.department)
          );
          const snapshot = await getDocs(budgetsQuery);

          const archivePromises = [];
          snapshot.forEach((docSnapshot) => {
            if (docSnapshot.id !== existingBudget.id) {
              const otherBudgetRef = doc(
                db,
                "department_budgets",
                docSnapshot.id
              );
              archivePromises.push(
                updateDoc(otherBudgetRef, {
                  status: "archived",
                  lastUpdatedAt: serverTimestamp(),
                  updatedBy: currentUser.uid,
                })
              );
            }
          });

          if (archivePromises.length > 0) await Promise.all(archivePromises);
        }

        // 🔹 Update the existing budget with v6 schema
        const updateData = {
          ...budgetData,
          lastUpdatedAt: serverTimestamp(),
          updatedBy: currentUser.uid,
        };

        await updateDoc(budgetRef, updateData);
        setShowBudgetUpdateForm(false);
        setEditingBudget(null);

        // Update selected budget if it was the one being edited
        if (selectedBudgetForOverview?.id === existingBudget.id) {
          setSelectedBudgetForOverview({ ...existingBudget, ...updateData });
        }

        // 🔹 Success message
        if (budgetData.status === "active") {
          toast.info("Budget set to active — all other budgets archived.");
        } else {
          toast.success("Budget updated successfully!");
        }
      } catch (error) {
        console.error("Error updating budget:", error);
        toast.error("Failed to update budget. Please try again.");
        throw error;
      }
    },
    [currentUser, selectedBudgetForOverview]
  );

  const handleDeleteBudget = useCallback(async () => {
    if (!selectedBudgetForDelete) return;

    setDeletingBudget(true);
    try {
      await deleteDoc(
        doc(db, "department_budgets", selectedBudgetForDelete.id)
      );

      // If the deleted budget was the selected overview, clear it
      if (selectedBudgetForOverview?.id === selectedBudgetForDelete.id) {
        setSelectedBudgetForOverview(null);
      }

      setDeleteConfirm(false);
      setSelectedBudgetForDelete(null);
    } catch (error) {
      console.error("Error deleting budget:", error);
      toast.error("Failed to delete budget. Please try again.");
    } finally {
      setDeletingBudget(false);
    }
  }, [selectedBudgetForDelete, selectedBudgetForOverview]);

  const handleCreatePurchaseOrder = useCallback(
    async (orderData) => {
      try {
        // Ensure we have an intent with department
        const intentId = orderData.intentId;
        if (!intentId) throw new Error("No intent ID provided");

        // Use transaction to ensure all operations succeed or fail together
        await runTransaction(db, async (transaction) => {
          // 1️⃣ Get the intent to know which department it belongs to
          const intentRef = doc(db, "purchase_intents", intentId);
          const intentDoc = await transaction.get(intentRef);

          if (!intentDoc.exists()) {
            throw new Error("Purchase intent not found");
          }

          const intent = intentDoc.data();
          const intentDepartment = intent.department;

          if (!intentDepartment) {
            throw new Error("No department found in purchase intent");
          }

          // 2️⃣ Find the ACTIVE budget for the INTENT'S department
          const budgetsQuery = query(
            collection(db, "department_budgets"),
            where("department", "==", intentDepartment),
            where("status", "==", "active")
          );

          const budgetsSnapshot = await getDocs(budgetsQuery);
          if (budgetsSnapshot.empty) {
            throw new Error(
              `No active budget found for ${intentDepartment} department`
            );
          }

          const targetBudget = budgetsSnapshot.docs[0];
          const targetBudgetRef = doc(
            db,
            "department_budgets",
            targetBudget.id
          );

          // 3️⃣ Generate PO Number
          const poNumber = await generatePurchaseOrderNumber(
            intentDepartment,
            currentFiscalYear,
            targetBudget.id
          );

          // Get total amount including GST
          const totalAmount = orderData.finalAmount;

          // 4️⃣ Create Purchase Order Document
          const orderWithMeta = {
            ...orderData,
            department: intentDepartment,
            fiscalYear: currentFiscalYear,
            poNumber,
            status: "approved",
            createdBy: currentUser.uid,
            createdAt: serverTimestamp(),
            purchaseDeptApproved: true,
            approvedAt: serverTimestamp(),
            approvedBy: currentUser.displayName || currentUser.uid,
            totalCost: totalAmount,
          };

          const poRef = doc(collection(db, "purchase_orders"));
          transaction.set(poRef, orderWithMeta);

          // 5️⃣ Update Purchase Intent to "approved"
          transaction.update(intentRef, {
            status: "approved",
            approvedAt: serverTimestamp(),
            approvedBy: currentUser.uid,
            poCreated: true,
            poNumber,
            updatedAt: serverTimestamp(),
          });

          // 6️⃣ Update Department Budget (spent) using v6 schema
          const budgetComponent =
            orderData.budgetComponent || intent.budgetComponent;

          const updatePayload = {
            "summary.totalSpent": increment(totalAmount),
            lastUpdatedAt: serverTimestamp(),
            updatedBy: currentUser.uid,
          };

          // Find which section the component belongs to
          const budgetData = targetBudget.data();
          const section = budgetData.departmentExpenses?.[budgetComponent]
            ? "departmentExpenses"
            : budgetData.fixedCosts?.[budgetComponent]
            ? "fixedCosts"
            : budgetData.csddExpenses?.[budgetComponent]
            ? "csddExpenses"
            : null;

          if (section) {
            updatePayload[`${section}.${budgetComponent}.spent`] =
              increment(totalAmount);
          } else {
            console.warn(
              `⚠️ Budget component "${budgetComponent}" not found in any section.`
            );
          }

          transaction.update(targetBudgetRef, updatePayload);
        });

        // ✅ Close modal and reset state
        setShowPurchaseOrderModal(false);
        setSelectedIntent(null);

        // ✅ Success message
        toast.success("Purchase Order created successfully!");
      } catch (error) {
        console.error("❌ Error creating purchase order:", error);

        let errorMessage = "Failed to create purchase order. ";
        if (error.message.includes("No active budget found")) {
          errorMessage +=
            "Please ensure there is an active budget for the intent's department.";
        } else if (error.message.includes("No intent ID provided")) {
          errorMessage += "Invalid purchase intent.";
        } else if (error.message.includes("Purchase intent not found")) {
          errorMessage += "The purchase intent was not found.";
        } else if (error.message.includes("No department found")) {
          errorMessage += "The purchase intent has no department specified.";
        } else {
          errorMessage += "Please try again.";
        }

        toast.error(errorMessage);
        throw error;
      }
    },
    [currentUser, currentFiscalYear]
  );

  const handleUpdatePurchaseOrder = async (updatedOrder) => {
    try {
      if (!updatedOrder?.id) throw new Error("Missing order ID");

      const orderRef = doc(db, "purchase_orders", updatedOrder.id);

      const updatedData = {
        ...updatedOrder,
        lastUpdatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
      };

      await updateDoc(orderRef, updatedData);

      // Optional: Update local state instantly for better UX
      setPurchaseOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );

      toast.success("Purchase Order updated successfully!");
    } catch (error) {
      console.error("Error updating purchase order:", error);
      toast.error("Failed to update purchase order. Please try again.");
    }
  };

  const handleApproveIntent = useCallback(
    async (intentId, notes = "") => {
      try {
        await updateDoc(doc(db, "purchase_intents", intentId), {
          status: "approved",
          approvedAt: serverTimestamp(),
          approvedBy: currentUser.uid,
          approvalNotes: notes,
        });
      } catch (error) {
        console.error("Error approving intent:", error);
        throw error;
      }
    },
    [currentUser]
  );

  const handleApproveOrder = async (order) => {
    if (!order || !order.id) {
      console.error("Invalid order object:", order);
      return;
    }

    try {
      const orderRef = doc(db, "purchase_orders", order.id);
      await updateDoc(orderRef, {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: currentUser?.uid,
      });
    } catch (error) {
      console.error("Error approving order:", error);
    }
  };

  // Action handlers for budget table
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

  // NEW: Handle budget selection for overview
  const handleSelectBudgetForOverview = useCallback((budget) => {
    setSelectedBudgetForOverview(budget);
  }, []);

  // 🔄 Auto-sync selectedBudgetForOverview when Firestore updates
  useEffect(() => {
    if (!selectedBudgetForOverview || budgetHistory.length === 0) return;

    const updatedVersion = budgetHistory.find(
      (b) => b.id === selectedBudgetForOverview.id
    );

    // Only update if something changed
    if (updatedVersion && updatedVersion !== selectedBudgetForOverview) {
      setSelectedBudgetForOverview(updatedVersion);
    }
  }, [budgetHistory, selectedBudgetForOverview]);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("purchase-dashboard-active-tab", activeTab);
  }, [activeTab]);

  const handleExpenseSubmit = async (expenseData, fiscalYear) => {
    try {
      await runTransaction(db, async (transaction) => {
        // 1️⃣ READ PHASE — gather all docs first
        const docsToUpdate = [];

        for (const entry of expenseData.entries) {
          const dept = entry.department.toLowerCase();
          const amount = Number(entry.amount) || 0;
          if (amount <= 0) continue;

          const budgetId = `${dept}_FY-20${fiscalYear}`;
          const budgetRef = doc(db, "department_budgets", budgetId);
          const snap = await transaction.get(budgetRef); // READ

          if (!snap.exists()) {
            console.warn(`⚠️ No budget found for ${dept}, skipping`);
            continue;
          }

          docsToUpdate.push({ budgetRef, amount, dept });
        }

        // 2️⃣ WRITE PHASE — apply updates AFTER all reads
        for (const { budgetRef, amount } of docsToUpdate) {
          const { expenseSection, expenseType, createdBy } = expenseData;

          const fieldPath =
            expenseSection === "fixedCosts"
              ? `fixedCosts.${expenseType}.spent`
              : `departmentExpenses.${expenseType}.spent`;

          const updatePayload = {
            [fieldPath]: increment(amount),
            "summary.totalSpent": increment(amount),
            lastUpdatedAt: serverTimestamp(),
            updatedBy: createdBy,
          };

          transaction.update(budgetRef, updatePayload);
        }
      });
      toast.success("Expense deducted successfully across all departments!");
    } catch (error) {
      console.error("❌ Error applying expense:", error);
      toast.success("Failed to record expense. Please try again.");
      throw error;
    }
  };

  const tabConfig = {
    budgets: { name: "Budgets", color: "bg-sky-500" },
    intents: { name: "Purchase Intents", color: "bg-emerald-600" },
    orders: { name: "Purchase Orders", color: "bg-violet-500" },
    vendors: { name: "Vendor Management", color: "bg-indigo-500" },
    history: { name: "Budget History", color: "bg-gray-500" },
    expenses: { name: "Manage Expenses", color: "bg-orange-500" },
  };

  // Update the loading condition
  if (loading || !usersLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm">
        <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="ml-3 text-gray-600">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 text-sm">
      <div className=" mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Purchase Dashboard
              </h1>
              <p className="text-gray-600 mt-1">FY_{currentFiscalYear}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(activeTab === "intents" || activeTab === "orders") && (
                <button
                  onClick={() => {
                    if (activeTab === "intents") {
                      exportPurchaseIntents(
                        "all", // Export all departments for purchase
                        currentFiscalYear,
                        purchaseIntents
                      );
                    } else if (activeTab === "orders") {
                      exportPurchaseOrders(
                        "all", // Export all departments for purchase
                        currentFiscalYear,
                        purchaseOrders
                      );
                    }
                  }}
                  className="bg-emerald-600 text-white px-3 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-[inset_0_1px_3px_rgba(255,255,255,0.3),0_3px_5px_rgba(0,0,0,0.4)] active:shadow-[inset_0_3px_5px_rgba(0,0,0,0.4)] active:translate-y-0.5 flex items-center text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-2" />
                  Export
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
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
        <div className="bg-white rounded-xl border border-gray-200 p-2">
          <Suspense fallback={<ComponentLoader />}>
            {activeTab === "budgets" && (
              <>
                {/* Budgets Table Section - Always Visible */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900">
                      All Department Budgets
                    </h2>
                    <p className="text-xs text-gray-600">
                      {budgetHistory.length} budget(s) found across all
                      departments
                    </p>
                  </div>

                  {budgetHistory.length > 0 ? (
                    <div className="max-w-full">
                      <table className="w-full min-w-[700px] text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">
                              Department
                            </th>
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
                              // Sort active budgets first, then by fiscal year (newest first)
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

                              // If both have same status, sort by fiscal year (newest first)
                              const yearA = parseInt(
                                a.fiscalYear.split("-")[0]
                              );
                              const yearB = parseInt(
                                b.fiscalYear.split("-")[0]
                              );
                              return yearB - yearA;
                            })
                            .map((budget) => (
                              <tr
                                key={budget.id}
                                className={`border-b border-gray-100 ${
                                  budget.status === "active"
                                    ? "bg-green-50 shadow-[inset_0_1px_3px_rgba(255,255,255,0.6),0_1px_3px_rgba(0,0,0,0.2)]"
                                    : budget.id ===
                                      selectedBudgetForOverview?.id
                                    ? "bg-blue-50"
                                    : ""
                                }`}
                              >
                                <td className="py-2 px-3">
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-900">
                                      {budget.department
                                        .charAt(0)
                                        .toUpperCase() +
                                        budget.department.slice(1)}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-900">
                                      FY{budget.fiscalYear}
                                    </span>
                                    {budget.id ===
                                      selectedBudgetForOverview?.id && (
                                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                        Selected
                                      </span>
                                    )}
                                  </div>
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
                                      ).toLocaleDateString("en-IN")
                                    : "N/A"}
                                </td>
                                <td className="py-2 px-3">
                                  <ActionDropdown
                                    budget={budget}
                                    onEdit={handleEditBudget}
                                    onDelete={handleDeleteBudgetClick}
                                    onView={handleViewBudget}
                                    onSelect={handleSelectBudgetForOverview}
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
                        <TriangleAlert className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-yellow-800 mb-1.5">
                          No Budgets Found
                        </h3>
                        <p className="text-yellow-700 mb-3 text-sm">
                          No budgets have been created for any department yet.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Budget Overview Section - Show Selected Budget */}
                {selectedBudgetForOverview && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold text-gray-900">
                        Budget Overview - FY
                        {selectedBudgetForOverview.fiscalYear} (
                        {selectedBudgetForOverview.department
                          .charAt(0)
                          .toUpperCase() +
                          selectedBudgetForOverview.department.slice(1)}
                        )
                      </h2>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedBudgetForOverview.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {selectedBudgetForOverview.status}
                        </span>
                        <p className="text-xs text-gray-600">
                          Real-time budget utilization and analytics
                        </p>
                      </div>
                    </div>
                    <Suspense fallback={<ComponentLoader />}>
                      <BudgetOverview
                        departmentBudget={selectedBudgetForOverview}
                        budgetUtilization={budgetUtilization}
                        budgetComponents={getDepartmentComponents(
                          selectedBudgetForOverview.department
                        )}
                        componentColors={componentColors}
                        purchaseIntents={purchaseIntents}
                        purchaseOrders={purchaseOrders}
                        fiscalYear={currentFiscalYear}
                        userDepartment={selectedBudgetForOverview.department}
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
                showDepartment={true} // Show department column for purchase view
                onUpdatePurchaseOrder={handleUpdatePurchaseOrder}
                onApproveOrder={handleApproveOrder}
              />
            )}

            {activeTab === "intents" && (
              <PurchaseIntentsList
                intents={filteredIntents}
                budgetComponents={currentUserDepartmentComponents}
                componentColors={componentColors}
                onDeleteIntent={handleDeleteIntent}
                onApproveIntent={handleApproveIntent}
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
                showDepartment={true} // Show department column for purchase view
              />
            )}

            {activeTab === "vendors" && (
              <VendorManagement
                vendors={vendors}
                purchaseOrders={purchaseOrders}
                currentUser={currentUser}
              />
            )}

            {activeTab === "history" && (
              <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-linear-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <BarChart4 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        Budget Analytics
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Comprehensive budget performance overview across all
                        departments
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/40">
                      <span className="text-sm font-medium text-gray-600">
                        Fiscal Year:
                      </span>
                      <span className="ml-2 font-bold text-gray-900">
                        FY{currentFiscalYear}
                      </span>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/40">
                      <span className="text-sm font-medium text-gray-600">
                        Total Budgets:
                      </span>
                      <span className="ml-2 font-bold text-gray-900">
                        {budgetHistory.length}
                      </span>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/40">
                      <span className="text-sm font-medium text-gray-600">
                        Active Budgets:
                      </span>
                      <span className="ml-2 font-bold text-emerald-600">
                        {
                          budgetHistory.filter((b) => b.status === "active")
                            .length
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {budgetHistory.length > 0 ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50/80 border-b border-gray-200/50">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Department
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Fiscal Year
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Total Budget
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Total Spent
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Remaining
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Utilization
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetHistory
                            .sort((a, b) => {
                              // Sort active budgets first, then by fiscal year (newest first)
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

                              // If both have same status, sort by fiscal year (newest first)
                              const yearA = parseInt(
                                a.fiscalYear.split("-")[0]
                              );
                              const yearB = parseInt(
                                b.fiscalYear.split("-")[0]
                              );
                              return yearB - yearA;
                            })
                            .map((budget) => {
                              const utilizationRate = budget.summary
                                ?.totalBudget
                                ? (budget.summary.totalSpent /
                                    budget.summary.totalBudget) *
                                  100
                                : 0;

                              const getUtilizationColor = (rate) => {
                                if (rate >= 80) return "bg-red-500";
                                if (rate >= 60) return "bg-orange-500";
                                if (rate >= 40) return "bg-yellow-500";
                                if (rate >= 20) return "bg-blue-500";
                                return "bg-emerald-500";
                              };

                              const getDepartmentColor = (dept) => {
                                const colors = {
                                  placement: "from-purple-500 to-purple-600",
                                  lnd: "from-blue-500 to-blue-600",
                                  dm: "from-green-500 to-green-600",
                                  sales: "from-indigo-500 to-indigo-600",
                                  hr: "from-pink-500 to-pink-600",
                                  purchase: "from-cyan-500 to-cyan-600",
                                  admin: "from-gray-500 to-gray-600",
                                  management: "from-slate-500 to-slate-600",
                                  cr: "from-violet-500 to-violet-600",
                                };
                                return (
                                  colors[dept] || "from-gray-500 to-gray-600"
                                );
                              };

                              return (
                                <tr
                                  key={budget.id}
                                  className={`border-b border-gray-100/50 hover:bg-gray-50/50 transition-colors ${
                                    budget.status === "active"
                                      ? "bg-emerald-50/30"
                                      : ""
                                  }`}
                                >
                                  {/* Department */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-8 h-8 bg-linear-to-br ${getDepartmentColor(
                                          budget.department
                                        )} rounded-lg flex items-center justify-center shadow-sm`}
                                      >
                                        <span className="text-white font-bold text-xs uppercase">
                                          {budget.department.substring(0, 2)}
                                        </span>
                                      </div>
                                      <span className="font-medium text-gray-900 capitalize">
                                        {budget.department}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Fiscal Year */}
                                  <td className="py-3 px-4">
                                    <span className="font-semibold text-gray-900">
                                      FY{budget.fiscalYear}
                                    </span>
                                  </td>

                                  {/* Total Budget */}
                                  <td className="py-3 px-4">
                                    <span className="font-bold text-gray-900">
                                      ₹
                                      {budget.summary?.totalBudget?.toLocaleString(
                                        "en-IN"
                                      ) || "0"}
                                    </span>
                                  </td>

                                  {/* Total Spent */}
                                  <td className="py-3 px-4">
                                    <span className="text-gray-700">
                                      ₹
                                      {budget.summary?.totalSpent?.toLocaleString(
                                        "en-IN"
                                      ) || "0"}
                                    </span>
                                  </td>

                                  {/* Remaining */}
                                  <td className="py-3 px-4">
                                    <span
                                      className={`font-semibold ${
                                        (budget.summary?.totalBudget || 0) -
                                          (budget.summary?.totalSpent || 0) >=
                                        0
                                          ? "text-emerald-600"
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

                                  {/* Utilization */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 min-w-20">
                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                          <div
                                            className={`h-2 rounded-full ${getUtilizationColor(
                                              utilizationRate
                                            )} transition-all duration-500`}
                                            style={{
                                              width: `${Math.min(
                                                utilizationRate,
                                                100
                                              )}%`,
                                            }}
                                          ></div>
                                        </div>
                                      </div>
                                      <span className="text-xs font-bold text-gray-900 min-w-8">
                                        {utilizationRate.toFixed(0)}%
                                      </span>
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td className="py-3 px-4">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                        budget.status === "active"
                                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                          : budget.status === "draft"
                                          ? "bg-amber-100 text-amber-800 border-amber-200"
                                          : "bg-gray-100 text-gray-800 border-gray-200"
                                      }`}
                                    >
                                      {budget.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl p-12 text-center shadow-lg">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-amber-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-amber-800 mb-2">
                      No Budget History Found
                    </h3>
                    <p className="text-amber-700 text-sm leading-relaxed max-w-md mx-auto">
                      No budgets have been created yet. Start by creating your
                      first budget to see analytics and performance insights
                      here.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "expenses" && (
              <ExpensesPanel
                allDepartments={Object.keys(budgetComponents)}
                activeBudgets={budgetHistory.filter(
                  (b) => b.status === "active"
                )}
                getDepartmentComponents={getDepartmentComponents}
                currentUser={currentUser}
                onExpenseSubmit={(data) =>
                  handleExpenseSubmit(data, currentFiscalYear)
                }
              />
            )}
          </Suspense>
        </div>
      </div>

      {/* Modals */}
      <Suspense fallback={<ComponentLoader />}>
        {/* Update Budget Form */}
        {showBudgetUpdateForm && editingBudget && (
          <BudgetUpdateForm
            show={showBudgetUpdateForm}
            onClose={() => {
              setShowBudgetUpdateForm(false);
              setEditingBudget(null);
            }}
            onSubmit={handleUpdateBudget}
            budgetComponents={getDepartmentComponents(editingBudget.department)}
            allBudgetComponents={budgetComponents}
            existingBudget={editingBudget}
            currentUser={currentUser}
            department={editingBudget.department}
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
            budgetComponents={getDepartmentComponents(
              selectedIntent.department
            )}
            fiscalYear={currentFiscalYear}
            currentUser={currentUser}
          />
        )}
      </Suspense>

      {/* 🧾 View Budget Modal */}
      {viewBudgetModal && viewingBudget && (
        <ViewBudgetModal
          show={viewBudgetModal}
          onClose={() => {
            setViewBudgetModal(false);
            setViewingBudget(null);
          }}
          budget={viewingBudget}
          componentColors={componentColors}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50 text-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4">
              <div className="flex items-center justify-center w-10 h-10 mx-auto bg-red-100 rounded-full mb-3">
                <TriangleAlert className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 text-center mb-1.5">
                Delete Budget?
              </h3>
              <p className="text-gray-600 text-center mb-4 text-xs">
                Are you sure you want to delete the FY
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
                  className="flex-1 px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteBudget}
                  disabled={deletingBudget}
                  className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center text-xs"
                >
                  {deletingBudget ? (
                    <>
                      <Trash2 />
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
    </div>
  );
}

export default Purchase;
