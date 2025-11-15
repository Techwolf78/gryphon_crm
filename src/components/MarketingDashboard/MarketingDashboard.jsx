import React, { useState, useEffect, useMemo } from "react";
import ContractsTable from "./ContractsTable";
import Analytics from "./Analytics";
import TaskManager from "./TaskManager";
import AdmissionDashboard from "./AdmissionDashboard";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
const DMTrainingForm = React.lazy(() => import("./DMTrainingForm"));
const EditDMForm = React.lazy(() => import("./EditDMForm"));

const SECTION = {
  CONTRACTS: "contracts",
  ANALYTICS: "analytics",
  TASKS: "tasks",
  ADMISSIONS: "admissions",
};

const MarketingDashboard = () => {
  const [active, setActive] = useState(SECTION.CONTRACTS);
  const [contracts, setContracts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingContract, setViewingContract] = useState(null);
  const [users, setUsers] = useState({});

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
    });

    return () => {
      unsub();
      unsubUsers();
    };
  }, []);

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
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">Marketing Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Add and manage contracts for marketing-related services.</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <nav className="flex space-x-1">
              <button
                onClick={() => setActive(SECTION.CONTRACTS)}
                className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                  active === SECTION.CONTRACTS
                    ? "bg-[#1C39BB] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Contracts
              </button>
              <button
                onClick={() => setActive(SECTION.ANALYTICS)}
                className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                  active === SECTION.ANALYTICS
                    ? "bg-[#1C39BB] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActive(SECTION.ADMISSIONS)}
                className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                  active === SECTION.ADMISSIONS
                    ? "bg-[#1C39BB] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Admissions
              </button>
              <button
                onClick={() => setActive(SECTION.TASKS)}
                className={`py-2 px-6 rounded-md font-medium text-sm transition-colors ${
                  active === SECTION.TASKS
                    ? "bg-[#1C39BB] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Task Manager
              </button>
            </nav>
          </div>
        </div>

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

          {active === SECTION.ANALYTICS && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <Analytics contracts={contracts} />
            </div>
          )}

          {active === SECTION.ADMISSIONS && (
            <div className="bg-white rounded-xl shadow-sm">
              <AdmissionDashboard />
            </div>
          )}

          {active === SECTION.TASKS && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <TaskManager contracts={contracts} />
            </div>
          )}
        </div>
      </div>
      {active === SECTION.CONTRACTS && (
        <footer className="bg-white border-t border-gray-200 py-2 px-4 text-center">
          <p className="text-xs text-gray-500">Total Contract Value: ₹{totalAmount.toLocaleString('en-IN')}</p>
        </footer>
      )}
    </div>
  );
};

export default MarketingDashboard;
