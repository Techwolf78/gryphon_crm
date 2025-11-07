import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  updateDoc,
  doc,
  setDoc,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Suspense, lazy } from "react";
import { exportBudget } from "./utils/ExportBudget";
import { exportPurchaseOrders } from "./utils/ExportPO";
import { exportPurchaseIntents } from "./utils/ExportIntent";
import { Plus, PlusIcon } from "lucide-react";

// Lazy load components
const BudgetForm = lazy(() => import("./BudgetForm"));
const BudgetUpdateForm = lazy(() => import("./BudgetUpdateForm"));
const PurchaseIntentModal = lazy(() => import("./PurchaseIntentModal"));
const PurchaseOrderModal = lazy(() => import("./PurchaseOrderModal"));
const BudgetOverview = lazy(() => import("./BudgetOverview"));
const PurchaseIntentsList = lazy(() => import("./PurchaseIntentsList"));
const PurchaseOrdersList = lazy(() => import("./PurchaseOrdersList"));
const VendorManagement = lazy(() => import("./VendorManagement"));

// Loading component
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
);

// Budget component types organized by department
const budgetComponents = {
  sales: {
    emails: "Email Subscriptions",
    laptops: "Laptops & Hardware",
    tshirts: "T-shirts",
    printmedia: "Print Media",
    diwaligifts: "Diwali Gifts",
  },
  cr: {
    emails: "Email Subscriptions",
    laptops: "Laptops & Hardware",
    tshirts: "T-shirts & Merchandise",
    printmedia: "Print Media",
    gifts: "Diwali & Other Gifts",
  },
  lnd: {
    laptops: "Laptops & Hardware",
    printmedia: "Print Media",
    trainertshirts: "Trainer T-shirts",
    tshirts: "T-shirts & Merchandise",
  },
  hr: {
    tshirts: "T-shirts & Merchandise",
    email: "Email Subscriptions",
    laptops: "Laptops & Hardware",
    ca: "CA Consultancy",
  },
  dm: {
    laptops: "Laptops & Hardware",
    email: "Email Subscriptions",
    printmedia: "Print Media",
    tshirts: "T-shirts & Merchandise",
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
    laptops: "Laptops & Hardware",
    tshirts: "T-shirts & Merchandise",
    printmedia: "Print Media",
    diwaligifts: "Diwali Gifts",
  },
  purchase: {
    emails: "Email Subscriptions",
    pt: "Promotional Tools",
    laptops: "Laptops & Hardware",
    tshirts: "T-shirts & Merchandise",
    printmedia: "Print Media",
    diwaligifts: "Diwali Gifts",
  },
  placement: {
    emails: "Email Subscriptions",
    laptops: "Laptops & Hardware",
    tshirts: "T-shirts & Merchandise",
    printmedia: "Print Media",
    training_materials: "Training Materials",
    placement_events: "Placement Events",
    diwaligifts: "Diwali Gifts",
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

// Helper function to get current fiscal year
const getCurrentFiscalYear = () => {
  const currentYear = new Date().getFullYear();
  const nextYear = (currentYear + 1) % 100;
  return `${currentYear.toString().slice(-2)}-${nextYear
    .toString()
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

// Action Dropdown Component
const ActionDropdown = ({ budget, onEdit, onDelete, onView }) => {
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
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg
          className="w-5 h-5 text-gray-600"
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
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <div className="py-1">
            <button
              onClick={() => {
                onView(budget);
                setIsOpen(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg
                className="w-4 h-4 mr-2"
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
            <button
              onClick={() => {
                onEdit(budget);
                setIsOpen(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
            >
              <svg
                className="w-4 h-4 mr-2"
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
              className="flex items-center w-full px-4 py-2 text-sm text-emerald-600 hover:bg-gray-100"
            >
              <svg
                className="w-4 h-4 mr-2"
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
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              <svg
                className="w-4 h-4 mr-2"
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
}) {
  // State management
  const [activeTab, setActiveTab] = useState("budgets");
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [selectedBudgetForDelete, setSelectedBudgetForDelete] = useState(null);
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
  const [selectedOrder, setSelectedOrder] = useState(null);
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
    return department || "admin";
  }, [currentUserData, department]);

  const isPurchaseDepartment = useMemo(() => {
    const dept = currentUserDepartment?.toLowerCase();
    return ["purchase", "admin", "hr"].includes(dept);
  }, [currentUserDepartment]);

  const currentUserDepartmentComponents = getDepartmentComponents(
    currentUserDepartment
  );

  // Find active budget
  const activeBudget = useMemo(() => {
    return budgetHistory.find((budget) => budget.status === "active");
  }, [budgetHistory]);

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
    console.log("📦 Effective department:", currentUserDepartment);
    console.log(
      "👤 User department from Firestore:",
      currentUserData?.department
    );
    console.log("🧩 Prop department:", department);
  }, [currentUserDepartment, currentUserData, department]);

  useEffect(() => {
    if (!currentUser) return;

    // Users data - this is critical for department info
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const userData = {};
      let userCount = 0;

      snapshot.forEach((doc) => {
        userData[doc.id] = { id: doc.id, ...doc.data() };
        userCount++;
      });

      setUsers(userData);
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

    // Budget query for current department
    const budgetQuery = query(
      collection(db, "department_budgets"),
      where("department", "==", department),
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

    const intentsQuery = query(
      collection(db, "purchase_intents"),
      where("department", "==", department),
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

    const ordersQuery = query(
      collection(db, "purchase_orders"),
      where("department", "==", department),
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
  }, [currentUser, department, currentFiscalYear]);

  // Memoized calculations - FIXED: Use activeBudget instead of departmentBudget
  const budgetUtilization = useMemo(() => {
    const targetBudget = activeBudget || departmentBudget;

    if (!targetBudget) {
      // console.log("No budget available for utilization calculation");
      return {};
    }

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

  const handleCreateBudget = useCallback(
    async (budgetData) => {
      try {
        const docId = `${department}_FY-20${
          budgetData.fiscalYear || currentFiscalYear
        }`;

        const budgetWithMeta = {
          ...budgetData,
          department,
          fiscalYear: budgetData.fiscalYear || currentFiscalYear,
          ownerName: currentUser.displayName,
          status: budgetData.status || "draft",
          createdBy: currentUser.uid,
          updatedBy: currentUser.uid,
          createdAt: serverTimestamp(),
          lastUpdatedAt: serverTimestamp(),
        };

        await setDoc(doc(db, "department_budgets", docId), budgetWithMeta);
        setShowBudgetForm(false);
      } catch (error) {
        console.error("Error creating budget:", error);
        alert("Failed to create budget. Please try again.");
        throw error;
      }
    },
    [currentUser, department, currentFiscalYear]
  );

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

        // 🔹 Success message
        if (budgetData.status === "active") {
          alert(
            "Budget set to active! Other budgets for this department archived."
          );
        } else {
          alert("Budget updated successfully!");
        }
      } catch (error) {
        console.error("Error updating budget:", error);
        alert("Failed to update budget. Please try again.");
        throw error;
      }
    },
    [currentUser]
  );

  const handleDeleteBudget = useCallback(async () => {
    if (!selectedBudgetForDelete) return;

    setDeletingBudget(true);
    try {
      await deleteDoc(
        doc(db, "department_budgets", selectedBudgetForDelete.id)
      );
      setDeleteConfirm(false);
      setSelectedBudgetForDelete(null);
    } catch (error) {
      console.error("Error deleting budget:", error);
      alert("Failed to delete budget. Please try again.");
    } finally {
      setDeletingBudget(false);
    }
  }, [selectedBudgetForDelete]);

  const handleCreateIntent = useCallback(
    async (intentData) => {
      try {
        const intentWithMeta = {
          ...intentData,
          department: department, // Use department instead of deptId
          fiscalYear: currentFiscalYear,
          status: "submitted",
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
          currentApprover: "department_head",
        };

        await addDoc(collection(db, "purchase_intents"), intentWithMeta);
        setShowPurchaseIntentModal(false);
      } catch (error) {
        console.error("Error creating purchase intent:", error);
        throw error;
      }
    },
    [currentUser, department, currentFiscalYear]
  );

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
    };

    return map[department?.toLowerCase()] || department?.toUpperCase();
  };

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

  const handleCreatePurchaseOrder = useCallback(
    async (orderData) => {
      try {
        // Ensure we have an active budget
        const targetBudget = activeBudget || departmentBudget;
        if (!targetBudget || !targetBudget.id)
          throw new Error("No active budget found");

        // Generate PO Number
        const poNumber = await generatePurchaseOrderNumber(
          department,
          currentFiscalYear,
          targetBudget.id
        );

        // Basic validation
        const intentId = orderData.intentId;
        if (!intentId) throw new Error("No intent ID provided");

        // Get total amount including GST (always defined)
        const totalAmount = orderData.finalAmount;

        await runTransaction(db, async (transaction) => {
          // 1️⃣ Create Purchase Order Document
          const orderWithMeta = {
            ...orderData,
            department,
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

          // 2️⃣ Update Purchase Intent to "approved"
          const intentRef = doc(db, "purchase_intents", intentId);
          transaction.update(intentRef, {
            status: "approved",
            approvedAt: serverTimestamp(),
            approvedBy: currentUser.uid,
            poCreated: true,
            poNumber,
            updatedAt: serverTimestamp(),
          });

          // 3️⃣ Update Department Budget (spent)
          const budgetRef = doc(db, "department_budgets", targetBudget.id);
          const budgetComponent =
            orderData.budgetComponent || orderData.selectedBudgetComponent;

          const updatePayload = {
            // ⬇️ write to the v6 location
            "summary.totalSpent": increment(totalAmount),
            lastUpdatedAt: serverTimestamp(),
            updatedBy: currentUser.uid,
          };

          // 🔍 Find which section the component belongs to
          const section = targetBudget.departmentExpenses?.[budgetComponent]
            ? "departmentExpenses"
            : targetBudget.fixedCosts?.[budgetComponent]
            ? "fixedCosts"
            : targetBudget.csddExpenses?.[budgetComponent]
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

          transaction.update(budgetRef, updatePayload);
        });

        // ✅ Close modal and reset state
        setShowPurchaseOrderModal(false);
        setSelectedIntent(null);

        // ✅ Success message
        alert(
          "✅ Purchase Order created successfully! The intent has been approved and budget updated."
        );
      } catch (error) {
        console.error("❌ Error creating purchase order:", error);

        let errorMessage = "Failed to create purchase order. ";
        if (error.message.includes("No active budget found")) {
          errorMessage +=
            "Please ensure there is an active budget for this department.";
        } else if (error.message.includes("No intent ID provided")) {
          errorMessage += "Invalid purchase intent.";
        } else {
          errorMessage += "Please try again.";
        }

        alert(errorMessage);
        throw error;
      }
    },
    [currentUser, department, currentFiscalYear, activeBudget, departmentBudget]
  );

  const handleUpdatePurchaseOrder = async (updatedOrder) => {
    try {
      if (!updatedOrder?.id) throw new Error("Missing order ID");
      if (!currentUser) throw new Error("User not authenticated");

      // 🔹 Fetch current user's department safely
      const userDept =
        currentUserData?.department ||
        (currentUserData?.departments && currentUserData.departments[0]) ||
        "unknown";

      // 🔹 Allow only HR, Admin, or Purchase department users
      const allowedDepartments = ["hr", "admin", "purchase"];
      if (!allowedDepartments.includes(userDept.toLowerCase())) {
        alert(
          "❌ Only HR, Admin, or Purchase users can update purchase orders."
        );
        console.warn(
          `Unauthorized update attempt by ${currentUser.email} (${userDept})`
        );
        return;
      }

      const orderRef = doc(db, "purchase_orders", updatedOrder.id);

      const updatedData = {
        ...updatedOrder,
        lastUpdatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
      };

      await updateDoc(orderRef, updatedData);

      // ✅ Optimistic local state update for UX
      setPurchaseOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );

      alert("✅ Purchase Order updated successfully!");
    } catch (error) {
      console.error("Error updating purchase order:", error);
      alert("Failed to update purchase order. Please try again.");
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

  const tabConfig = {
    budgets: { name: "Budgets", color: "bg-sky-500" },
    intents: { name: "Purchase Intents", color: "bg-emerald-600" },
    orders: { name: "Purchase Orders", color: "bg-violet-500" },
    ...(showVendorManagement && {
      vendors: { name: "Vendor Management", color: "bg-indigo-500" },
    }),
    history: { name: "Budget History", color: "bg-gray-500" },
  };

  // Update the loading condition
  if (loading || !usersLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="ml-4 text-gray-600">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {department.charAt(0).toUpperCase() + department.slice(1)}{" "}
                Budget Dashboard
              </h1>
              <p className="text-gray-600 mt-2">FY_{currentFiscalYear}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Always show Create Budget button */}
              <button
                onClick={() => {
                  setEditingBudget(null);
                  setShowBudgetForm(true);
                }}
                className="bg-violet-700 text-white px-3 py-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_6px_rgba(0,0,0,0.4)]  active:shadow-[inset_0_4px_6px_rgba(0,0,0,0.4)] active:translate-y-0.5 flex items-center gap-2"
              >
                <Plus />
                Create Budget
              </button>

              <button
                onClick={() => setShowPurchaseIntentModal(true)}
                className="bg-sky-700 text-white px-3 py-3  rounded-xl font-semibold hover:opacity-90 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_6px_rgba(0,0,0,0.4)]  active:shadow-[inset_0_4px_6px_rgba(0,0,0,0.4)] active:translate-y-0.5 flex items-center gap-2"
              >
                <PlusIcon />
                Create Intent
              </button>
              {(activeTab === "intents" || activeTab === "orders") && (
                <button
                  onClick={() => {
                    if (activeTab === "intents") {
                      exportPurchaseIntents(
                        department,
                        currentFiscalYear,
                        purchaseIntents
                      );
                    } else if (activeTab === "orders") {
                      exportPurchaseOrders(
                        department,
                        currentFiscalYear,
                        purchaseOrders
                      );
                    }
                  }}
                  className="bg-emerald-600 text-white px-3 py-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_6px_rgba(0,0,0,0.4)] active:shadow-[inset_0_4px_6px_rgba(0,0,0,0.4)] active:translate-y-0.5 flex items-center"
                >
                  <svg
                    className="w-5 h-5 mr-2"
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
                  Export{" "}
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mt-6">
            {Object.entries(tabConfig).map(([key, tab]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === key
                    ? `${tab.color} text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_6px_rgba(0,0,0,0.4)]`
                    : "bg-gray-100 text-gray-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_4px_6px_rgba(0,0,0,0.2)] hover:bg-gray-200 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_3px_5px_rgba(0,0,0,0.3)] active:shadow-[inset_0_4px_6px_rgba(0,0,0,0.3)] active:translate-y-0.5"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content for Other Tabs */}
        <div className="bg-gray-100 rounded-2xl shadow-sm border border-gray-200 p-6">
          <Suspense fallback={<ComponentLoader />}>
            {activeTab === "budgets" && (
              <>
                {/* Budgets Table Section - Always Visible */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                      Department Budgets
                    </h2>
                  </div>

                  {budgetHistory.length > 0 ? (
                    <div className="max-w-[80vw]">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
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
                              Status
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Last Updated
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
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
                            .map((budget, index) => (
                              <tr
                                key={budget.id}
                                className={`border-b border-gray-100 ${
                                  budget.status === "active"
                                    ? "bg-green-50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_2px_4px_rgba(0,0,0,0.2)]"
                                    : ""
                                }`}
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-900">
                                      FY{budget.fiscalYear}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-semibold text-gray-900">
                                    ₹
                                    {budget.summary?.totalBudget?.toLocaleString(
                                      "en-IN"
                                    ) || "0"}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-gray-700">
                                    ₹
                                    {budget.summary?.totalSpent?.toLocaleString(
                                      "en-IN"
                                    ) || "0"}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
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
                                <td className="py-3 px-4">
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
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {budget.lastUpdatedAt
                                    ? new Date(
                                        budget.lastUpdatedAt.seconds * 1000
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </td>
                                <td className="py-3 px-4">
                                  <ActionDropdown
                                    budget={budget}
                                    onEdit={handleEditBudget}
                                    onDelete={handleDeleteBudgetClick}
                                    onView={handleViewBudget}
                                  />
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 max-w-md mx-auto">
                        <svg
                          className="w-12 h-12 text-yellow-500 mx-auto mb-4"
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
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                          No Budgets Created
                        </h3>
                        <p className="text-yellow-700 mb-4">
                          Create your first budget to get started with budget
                          management.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Budget Overview Section - Only Show Active Budget */}
                {activeBudget && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">
                        Active Budget Overview - FY{activeBudget.fiscalYear}
                      </h2>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          Active
                        </span>
                        <p className="text-sm text-gray-600">
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
              <>
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
              </>
            )}

            {activeTab === "intents" && (
              <>
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
              </>
            )}

            {activeTab === "vendors" && showVendorManagement && (
              <VendorManagement
                vendors={vendors}
                purchaseOrders={purchaseOrders}
                currentUser={currentUser}
              />
            )}

            {activeTab === "history" && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Budget Analytics - FY{currentFiscalYear}
                </h3>
                {budgetHistory.length > 0 ? (
                  <div className="grid gap-4">
                    {budgetHistory.map((budget) => (
                      <div
                        key={budget.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              FY{budget.fiscalYear} Budget
                            </h4>
                            <p className="text-sm text-gray-600">
                              {budget.department} • {budget.status}
                            </p>
                            <p className="text-sm text-gray-600">
                              Total Budget: ₹
                              {budget.summary?.totalBudget?.toLocaleString(
                                "en-IN"
                              )}
                              Spent: ₹
                              {budget.summary?.totalSpent?.toLocaleString(
                                "en-IN"
                              )}
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
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">
                      No budget history found
                    </p>
                    <p className="text-gray-400 mt-2">
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
        {/* Create Budget Form */}
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

        {/* Update Budget Form */}
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

        {showPurchaseIntentModal && (
          <PurchaseIntentModal
            show={showPurchaseIntentModal}
            onClose={() => setShowPurchaseIntentModal(false)}
            onSubmit={handleCreateIntent}
            budgetComponents={currentUserDepartmentComponents}
            componentColors={componentColors}
            currentBudget={activeBudget || departmentBudget}
            currentUser={currentUser} // Add this line
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
      {/* 🧾 View Budget Modal */}
      {viewBudgetModal && viewingBudget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="bg-emerald-700 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                View Budget - FY{viewingBudget.fiscalYear}
              </h3>
              <button
                onClick={() => {
                  setViewBudgetModal(false);
                  setViewingBudget(null);
                }}
                className="text-white hover:text-gray-200 transition"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3 text-gray-800">
              <div className="grid grid-cols-2 gap-3">
                <p>
                  <strong>Department:</strong>{" "}
                  {viewingBudget.deptName || viewingBudget.department}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      viewingBudget.status === "active"
                        ? "bg-green-100 text-green-800"
                        : viewingBudget.status === "draft"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {viewingBudget.status}
                  </span>
                </p>
                <p>
                  <strong>Total Budget:</strong> ₹
                  {viewingBudget.totalBudget?.toLocaleString("en-IN") || "0"}
                </p>
                <p>
                  <strong>Total Spent:</strong> ₹
                  {viewingBudget.totalSpent?.toLocaleString("en-IN") || "0"}
                </p>
                <p>
                  <strong>Remaining:</strong> ₹
                  {(
                    (viewingBudget.totalBudget || 0) -
                    (viewingBudget.totalSpent || 0)
                  ).toLocaleString("en-IN")}
                </p>
                <p>
                  <strong>Created By:</strong>{" "}
                  {viewingBudget.ownerName || "Unknown"}
                </p>
                <p>
                  <strong>Last Updated:</strong>{" "}
                  {viewingBudget.lastUpdatedAt
                    ? new Date(
                        viewingBudget.lastUpdatedAt.seconds * 1000
                      ).toLocaleDateString("en-IN")
                    : "N/A"}
                </p>
              </div>

              {(viewingBudget.fixedCosts ||
                viewingBudget.departmentExpenses ||
                viewingBudget.csddExpenses) && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2 text-gray-900">
                    Budget Breakdown:
                  </h4>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">
                            Category
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-gray-700">
                            Allocated (₹)
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-gray-700">
                            Spent (₹)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          "fixedCosts",
                          "departmentExpenses",
                          "csddExpenses",
                        ].map((group) =>
                          Object.entries(viewingBudget[group] || {}).map(
                            ([key, comp]) => (
                              <tr
                                key={`${group}-${key}`}
                                className="border-t border-gray-100 hover:bg-gray-50"
                              >
                                <td className="px-3 py-2 text-gray-800 capitalize">
                                  {key.replace(/_/g, " ")}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-700">
                                  {comp.allocated?.toLocaleString("en-IN") || 0}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-700">
                                  {comp.spent?.toLocaleString("en-IN") || 0}
                                </td>
                              </tr>
                            )
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => {
                  setViewBudgetModal(false);
                  setViewingBudget(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <svg
                  className="w-6 h-6 text-red-600"
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
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Budget?
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete the FY
                {selectedBudgetForDelete?.fiscalYear} budget? This action cannot
                be undone and all budget data will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteConfirm(false);
                    setSelectedBudgetForDelete(null);
                  }}
                  disabled={deletingBudget}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteBudget}
                  disabled={deletingBudget}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center"
                >
                  {deletingBudget ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
    </div>
  );
}

export default BudgetDashboard;
