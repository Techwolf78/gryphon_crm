import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ContractsTable from "./ContractsTable";
import Analytics from "./Analytics";
import TaskManager from "./TaskManager";
import AdmissionDashboard from "./AdmissionDashboard";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, limit } from "firebase/firestore";
import { db } from "../../firebase";
const DMTrainingForm = React.lazy(() => import("./DMTrainingForm"));
const EditDMForm = React.lazy(() => import("./EditDMForm"));
const BudgetDashboard = React.lazy(() => import("../Budget/BudgetDashboard"));

const SECTION = {
  CONTRACTS: "contracts",
  ANALYTICS: "analytics",
  TASKS: "tasks",
  ADMISSIONS: "admissions",
  BUDGET: "budget",
};

const MarketingDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [active, setActive] = useState(() => {
    const section = searchParams.get('section');
    return section && Object.values(SECTION).includes(section) ? section : SECTION.TASKS;
  });

  const handleSetActive = (newActive) => {
    setActive(newActive);
    setSearchParams({ section: newActive });
  };
  const [contracts, setContracts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingContract, setViewingContract] = useState(null);
  const [users, setUsers] = useState({});
  const [loadedUsers, setLoadedUsers] = useState(false);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    // Subscribe to digitalMarketing collection
    const q = query(collection(db, "digitalMarketing"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          title: data.projectCode || data.collegeName || "",
          client: data.collegeName || "",
          serviceType: data.course || data.deliveryType || "",
          startDate: data.contractStartDate || "",
          endDate: data.contractEndDate || "",
          notes: data.additionalNotes || "",
          raw: data,
        };
      });
      setContracts(arr);
    });

    // Subscribe to users collection (for TrainingForm usage)
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const map = {};
      snap.docs.forEach((d) => (map[d.id] = { id: d.id, ...d.data() }));
      setUsers(map);
      setLoadedUsers(true);
    });

    return () => {
      unsub();
      unsubUsers();
    };
  }, []);

  useEffect(() => {
    if (active === SECTION.TASKS && loadedUsers && tasks.length === 0) {
      // Slowly load tasks asynchronously to avoid overwhelming the server
      const tasksQuery = query(collection(db, "marketing_tasks"), orderBy("createdAt", "desc"), limit(100));
      const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
        const tasksData = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            images: data.images || (data.imageUrl ? [data.imageUrl] : []),
          };
        });
        setTasks(tasksData);
      });
      return unsubscribe;
    }
  }, [active, loadedUsers, tasks.length]);

  const totalAmount = useMemo(() => contracts.reduce((sum, c) => sum + (c.raw?.totalCost || 0), 0), [contracts]);

  

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "digitalMarketing", id));
    } catch (err) {
      console.error("Failed to delete contract:", err);
    }
  };

  const handleEdit = (contract) => {
    setEditingContract(contract.raw);
    setShowEditModal(true);
  };

  const handleView = (contract) => {
    setViewingContract(contract.raw);
    setShowViewModal(true);
  };

  const handleUpdate = async (updated) => {
    try {
      const ref = doc(db, "digitalMarketing", updated.id);
      await updateDoc(ref, {
        collegeName: updated.collegeName,
        course: updated.course,
        deliveryType: updated.deliveryType,
        studentCount: parseInt(updated.studentCount) || 0,
        totalCost: parseFloat(updated.totalCost) || 0,
        contractStartDate: updated.contractStartDate || null,
        contractEndDate: updated.contractEndDate || null,
        additionalNotes: updated.additionalNotes || "",
        lastUpdated: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to update contract:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full flex-1">
        {active !== SECTION.TASKS && (
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-blue-600">Marketing Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Add and manage contracts for marketing-related services.</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <nav className="flex space-x-1">
                <button
                  onClick={() => handleSetActive(SECTION.CONTRACTS)}
                  className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                    active === SECTION.CONTRACTS
                      ? "bg-[#1C39BB] text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  Contracts
                </button>
                {/* <button
                  onClick={() => handleSetActive(SECTION.ANALYTICS)}
                  className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                    active === SECTION.ANALYTICS
                      ? "bg-[#1C39BB] text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  Analytics
                </button> */}
                {/* <button
                  onClick={() => handleSetActive(SECTION.ADMISSIONS)}
                  className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                    active === SECTION.ADMISSIONS
                      ? "bg-[#1C39BB] text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  Admissions
                </button> */}
                <button
                  onClick={() => handleSetActive(SECTION.TASKS)}
                  className={`py-2 px-6 rounded-md font-medium text-sm transition-colors ${
                    active === SECTION.TASKS
                      ? "bg-[#1C39BB] text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  Task Manager
                </button>
                <button
                  onClick={() => handleSetActive(SECTION.BUDGET)}
                  className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                    active === SECTION.BUDGET
                      ? "bg-[#1C39BB] text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  Budget
                </button>
              </nav>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {active === SECTION.CONTRACTS && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Contracts</h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-[#1C39BB] text-white rounded-lg font-medium text-sm shadow-sm hover:bg-[#1a34a8] transition-all duration-200"
                >
                  Add Contract
                </button>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <ContractsTable contracts={contracts} onDelete={handleDelete} onUpdate={handleUpdate} onEdit={handleEdit} onView={handleView} />
              </div>

              {/* Add Contract Modal -> open TrainingForm with an empty lead */}
              {showAddModal && (
                <React.Suspense fallback={<div className="p-6">Loading form…</div>}>
                  <DMTrainingForm
                    show={true}
                    onClose={() => setShowAddModal(false)}
                    lead={{
                      id: null,
                      businessName: "",
                      address: "",
                      city: "",
                      state: "",
                      pocName: "",
                      email: "",
                      phoneNo: "",
                      assignedTo: {},
                    }}
                    users={users}
                  />
                </React.Suspense>
              )}

              {/* Edit Contract Modal */}
              {showEditModal && editingContract && (
                <React.Suspense fallback={<div className="p-6">Loading form…</div>}>
                  <EditDMForm
                    show={true}
                    onClose={() => {
                      setShowEditModal(false);
                      setEditingContract(null);
                    }}
                    existingFormData={editingContract}
                  />
                </React.Suspense>
              )}

              {/* View Contract Modal */}
              {showViewModal && viewingContract && (
                <React.Suspense fallback={<div className="p-6">Loading form…</div>}>
                  <EditDMForm
                    show={true}
                    onClose={() => {
                      setShowViewModal(false);
                      setViewingContract(null);
                    }}
                    existingFormData={viewingContract}
                    readOnly={true}
                  />
                </React.Suspense>
              )}
            </div>
          )}

          {/* {active === SECTION.ANALYTICS && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <Analytics contracts={contracts} />
            </div>
          )} */}

          {/* {active === SECTION.ADMISSIONS && (
            <div className="bg-white rounded-xl shadow-sm">
              <AdmissionDashboard />
            </div>
          )} */}

          {active === SECTION.TASKS && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <TaskManager contracts={contracts} initialTasks={tasks} onBack={() => handleSetActive(SECTION.CONTRACTS)} />
            </div>
          )}

          {active === SECTION.BUDGET && (
            <React.Suspense fallback={<div className="p-6">Loading budget...</div>}>
              <BudgetDashboard department="dm" />
            </React.Suspense>
          )}
        </div>
      </div>
      {/* {active === SECTION.TASKS && loadingTasks && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-xs w-full mx-auto">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Loading User Database</h3>
              <p className="text-gray-600 text-xs">Please wait while we prepare your workspace...</p>
            </div>
          </div>
        </div>
      )} */}
      {/* {active === SECTION.TASKS && welcomeShown && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-xs w-full mx-auto transform transition-all duration-300 ease-out scale-100 hover:scale-105">
            <div className="p-6 text-center">
              <div className="mb-4">
                <h2 id="welcome-title" className="text-xl font-bold text-gray-900 mb-1">Welcome User!</h2>
                <p className="text-gray-600 text-xs leading-relaxed">You're now ready to manage your marketing tasks efficiently.</p>
              </div>
              <button
                onClick={() => setWelcomeShown(false)}
                className="w-full bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50"
                aria-label="Continue to Task Manager"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )} */}
      {active === SECTION.CONTRACTS && (
        <footer className="bg-white border-t border-gray-200 py-2 px-4 text-center">
          <p className="text-xs text-gray-500">Total Contract Value: ₹{totalAmount.toLocaleString('en-IN')}</p>
        </footer>
      )}
    </div>
  );
};

export default MarketingDashboard;
