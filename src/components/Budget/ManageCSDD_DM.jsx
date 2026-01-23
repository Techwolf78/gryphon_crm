import React, { useState, useEffect, useMemo, Suspense, lazy } from "react";
import {
  LayoutDashboard,
  ArrowLeft,
  Layers,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  doc,
  getDoc,
  getDocs, // Added for fetching all clients
  collection, // Added for fetching collection
  updateDoc,
  serverTimestamp,
  setDoc,
  deleteField,
} from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";

// Lazy Load your Form Modal
const ClientComponentForm = lazy(() => import("./ClientComponentForm"));

// ============================================================================
// UI COMPONENT: Client Grid Card (Updated 2x2 Layout)
// ============================================================================
const ClientCard = ({ client, forecastAmount, onClick }) => {
  // Utilization based on Actual Spend vs Allocated

  // Calculate specific metrics
  const allocated = client.allocated || 0;
  const spent = client.spent || 0;
  const planned = forecastAmount || 0;
  const remaining = allocated - spent; // Cash remaining
  const unassigned = allocated - planned; // Budget yet to be planned
  const spentPercentage =
    allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer relative group flex flex-col h-full"
      onClick={() => onClick(client)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3
            className="text-lg font-bold text-gray-900 line-clamp-1"
            title={client.name}
          >
            {client.name}
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-1">{client.key}</p>
        </div>
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
          <LayoutDashboard className="w-5 h-5" />
        </div>
      </div>

      {/* 2x2 Grid for Metrics */}
      <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-4">
        {/* 1. Allocated */}
        <div className="p-2 rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
            Allocated
          </p>
          <p className="text-sm font-bold text-gray-900">
            ₹{allocated.toLocaleString("en-IN")}
          </p>
        </div>

        {/* 2. Forecast / Planned (Fetched from sub-docs) */}
        <div className="p-2  rounded-lg text-right">
          <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold mb-1">
            Planned
          </p>
          <p className="text-sm font-bold text-blue-700">
            ₹{planned.toLocaleString("en-IN")}
          </p>
        </div>

        {/* 3. Spent (Actual) */}
        <div className="p-2  rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mb-1">
            Spent
          </p>
          <p className="text-sm font-bold text-emerald-700">
            ₹{spent.toLocaleString("en-IN")}
          </p>
        </div>

        {/* 4. Remaining (Allocated - Spent) */}
        <div
          className={`p-2 rounded-lg text-right ${remaining == 0 ? "bg-emerald-50" : ""}`}
        >
          <p
            className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${remaining < 0 ? "text-red-600" : "text-indigo-600"}`}
          >
            Remaining
          </p>
          <p
            className={`text-sm font-bold ${remaining < 0 ? "text-red-700" : "text-indigo-700"}`}
          >
            ₹{remaining.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-auto pt-2 border-t border-gray-100 flex justify-between items-center">
        <span className="text-[10px] text-gray-400">
          {unassigned < 0 ? "Over-planned" : "Available to plan"}:
          <span
            className={
              unassigned < 0
                ? "text-red-500 font-bold ml-1"
                : "text-gray-600 ml-1"
            }
          >
            ₹{Math.abs(unassigned).toLocaleString()}
          </span>
        </span>

        {/* Mini Pie or Bar for Utilization */}
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${remaining < 0 ? "bg-red-500" : "bg-indigo-500"}`}
              style={{ width: `${spentPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ... [ClientSheetView remains unchanged] ...
const ClientSheetView = ({
  client,
  clientData,
  onBack,
  onOpenModal,
  onDeleteComponent,
}) => {
  // Convert client_components object to array for display
  const componentsArray = useMemo(() => {
    if (!clientData?.client_components) return [];
    return Object.entries(clientData.client_components).map(([key, data]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      key: key,
      allocated: data.allocated || 0,
      spent: data.spent || 0,
      remaining: (data.allocated || 0) - (data.spent || 0),
    }));
  }, [clientData]);

  const totalPlanned = componentsArray.reduce(
    (sum, c) => sum + Number(c.allocated || 0),
    0,
  );
  const totalActual = componentsArray.reduce(
    (sum, c) => sum + Number(c.spent || 0),
    0,
  );
  const unassigned = client.allocated - totalPlanned;

  return (
    <div className="animate-fade-in-up h-full flex flex-col min-h-[600px]">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 transition-all border border-transparent hover:border-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {client.name} Budget Sheet
            </h2>
            <div className="flex gap-3 text-xs mt-1 items-center">
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-mono border border-gray-200">
                FY 25-26
              </span>
              <span
                className={`px-2 py-0.5 rounded font-medium ${unassigned < 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
              >
                {unassigned < 0
                  ? `Over-allocated by ₹${Math.abs(unassigned).toLocaleString()}`
                  : `₹${unassigned.toLocaleString()} Available to Plan`}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                {clientData?.owner_name || "No Owner"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenModal}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-all flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Component
        </button>
      </div>

      {/* --- TOP SUMMARY CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">
              Total Budget
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ₹{client.allocated.toLocaleString()}
            </p>
          </div>
          <LayoutDashboard className="w-8 h-8 text-gray-200" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">
              Total Forecast (Planned)
            </p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              ₹{totalPlanned.toLocaleString()}
            </p>
          </div>
          <Layers className="w-8 h-8 text-blue-100" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">
              Actual Spend (POs)
            </p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              ₹{totalActual.toLocaleString()}
            </p>
          </div>
          <TrendingUp className="w-8 h-8 text-emerald-100" />
        </div>
      </div>

      {/* --- THE SHEET (Data Table) --- */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-16">
                  Sr.
                </th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Component
                </th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                  Forecast Amount
                </th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                  Total Spend
                </th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                  Remaining
                </th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-24 text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {componentsArray.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-gray-400">
                    <Layers className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No components found.</p>
                    <p className="text-xs mt-1">
                      Click "Add Component" to start.
                    </p>
                  </td>
                </tr>
              ) : (
                componentsArray.map((comp, index) => {
                  return (
                    <tr
                      key={comp.id}
                      className={`hover:bg-gray-50/80 transition-colors group `}
                    >
                      <td className="py-3 px-4 text-sm text-gray-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900 flex items-center gap-2">
                        {comp.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 text-right font-mono font-medium">
                        ₹{Number(comp.allocated).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 text-right font-mono">
                        ₹{Number(comp.spent || 0).toLocaleString()}
                      </td>
                      <td
                        className={`py-3 px-4 text-sm text-right font-mono font-bold ${comp.remaining < 0 ? "text-red-600" : "text-emerald-600"}`}
                      >
                        ₹{comp.remaining.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteComponent(comp.key);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-100 group-hover:opacity-100"
                            title="Delete Component"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Footer Totals */}
            {componentsArray.length > 0 && (
              <tfoot className="bg-gray-50 border-t border-gray-200 font-bold text-gray-900">
                <tr>
                  <td
                    colSpan="2"
                    className="py-3 px-4 text-right text-xs uppercase text-gray-500 tracking-wider"
                  >
                    Total
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm">
                    ₹{totalPlanned.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm">
                    ₹{totalActual.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-indigo-600">
                    ₹{(totalPlanned - totalActual).toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN CONTROLLER
// ============================================================================
export default function ManageCSDD_DM({ currentBudget, fiscalYear }) {
  const [activeView, setActiveView] = useState("GRID");
  const [selectedClient, setSelectedClient] = useState(null);
  const [showCompModal, setShowCompModal] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(false);

  // New State: Map to hold forecast data for all clients { clientKey: forecastAmount }
  const [clientForecasts, setClientForecasts] = useState({});
  const [isFetchingForecasts, setIsFetchingForecasts] = useState(false);

  // 1. Prepare Client List (Read from Main Budget)
  const clientBudgets = useMemo(() => {
    if (!currentBudget?.csddExpenses) return [];
    return Object.entries(currentBudget.csddExpenses)
      .filter(([_, val]) => typeof val === "object" && val.type === "client")
      .map(([key, val]) => ({
        key,
        name: val.client_name,
        allocated: Number(val.allocated || 0),
        spent: Number(val.spent || 0),
        // Remaining in Parent Doc is usually Allocated - Spent
        remaining: Number(val.allocated || 0) - Number(val.spent || 0),
      }));
  }, [currentBudget]);

  // --------------------------------------------------------------------------
  // NEW: Fetch All Sub-Documents for Dashboard View
  // --------------------------------------------------------------------------
  useEffect(() => {
    const fetchAllForecasts = async () => {
      if (!currentBudget?.id) return;

      setIsFetchingForecasts(true);
      try {
        // Fetch the entire collection of clients for this budget
        const querySnapshot = await getDocs(
          collection(
            db,
            "department_budgets",
            currentBudget.id,
            "csdd_clients",
          ),
        );

        const forecasts = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Use summary.totalAllocated if available, otherwise 0
          const totalPlanned = Object.values(
            data.client_components || {},
          ).reduce((sum, c) => sum + Number(c.allocated || 0), 0);

          forecasts[doc.id] = totalPlanned;
        });

        setClientForecasts(forecasts);
      } catch (error) {
        console.error("Error fetching client forecasts:", error);
      } finally {
        setIsFetchingForecasts(false);
      }
    };

    fetchAllForecasts();
  }, [currentBudget]);

  // 2. Load Specific Client Data (Detail View)
  const loadClientData = async (clientKey) => {
    if (!currentBudget?.id) return;

    setLoading(true);
    try {
      const clientDocRef = doc(
        db,
        "department_budgets",
        currentBudget.id,
        "csdd_clients",
        clientKey,
      );

      const clientDoc = await getDoc(clientDocRef);

      if (clientDoc.exists()) {
        setClientData(clientDoc.data());
      } else {
        // Clean State (No Dummy Data)
        const initialData = {
          createdBy: "system",
          createdAt: new Date(),
          updatedAt: new Date(),
          client_components: {}, // Empty
          client_name:
            clientBudgets.find((c) => c.key === clientKey)?.name || "Unknown",
          owner_name: "direc2",
          status: "active",
          budgetRef: `dm_FY-${fiscalYear}`,
        };
        setClientData(initialData);
      }
    } catch (error) {
      console.error("Error loading client data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle client selection
  const handleClientSelect = async (client) => {
    setSelectedClient(client);
    await loadClientData(client.key);
    setActiveView("DETAIL");
  };

  // 4. Action: Save Budget (Parent Controller)
  const handleCreateOrUpdateBudget = async (documentData) => {
    try {
      const clientDocRef = doc(
        db,
        "department_budgets",
        currentBudget.id,
        "csdd_clients",
        selectedClient.key,
      );

      const existingDoc = await getDoc(clientDocRef);
      const hasExistingData = existingDoc.exists();

      const payload = {
        ...documentData,
        updatedAt: serverTimestamp(),
        createdAt: hasExistingData
          ? existingDoc.data().createdAt
          : serverTimestamp(),
        createdBy: hasExistingData
          ? existingDoc.data().createdBy
          : "current_user_id",
      };

      await setDoc(clientDocRef, payload, { merge: true });
      await loadClientData(selectedClient.key);

      // Update the local forecast map so the dashboard updates instantly upon return
      const plannedTotal = Object.values(
        documentData.client_components || {},
      ).reduce((sum, c) => sum + Number(c.allocated || 0), 0);

      setClientForecasts((prev) => ({
        ...prev,
        [selectedClient.key]: plannedTotal,
      }));

      toast.success(`Budget for ${selectedClient.name} saved successfully.`);
    } catch (error) {
      console.error("Error saving budget allocation:", error);
      toast.error("Failed to save budget allocation.");
    }
  };

  const handleDeleteComponent = async (componentKey) => {
    if (!window.confirm("Are you sure you want to delete this component?"))
      return;
    if (!selectedClient || !currentBudget?.id || !clientData) return;

    try {
      const clientDocRef = doc(
        db,
        "department_budgets",
        currentBudget.id,
        "csdd_clients",
        selectedClient.key,
      );

      await updateDoc(clientDocRef, {
        [`client_components.${componentKey}`]: deleteField(), // ✅ REAL DELETE
        updatedAt: serverTimestamp(),
      });

      await loadClientData(selectedClient.key);

      toast.success("Component deleted successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete component.");
    }
  };

  // 5. Render
  if (clientBudgets.length === 0) {
    return (
      <div className="p-12 bg-white rounded-xl border border-gray-200 shadow-sm text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          No Client Allocations
        </h2>
        <p className="text-gray-500">
          Please add Client Allocations in the main Budget settings.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[600px] bg-gray-50/50 p-6 rounded-xl">
      <Suspense
        fallback={
          <div className="flex justify-center h-64 items-center">
            <Loader2 className="animate-spin text-indigo-600" />
          </div>
        }
      >
        {activeView === "DETAIL" && selectedClient ? (
          <>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
              </div>
            ) : (
              <>
                <ClientSheetView
                  client={selectedClient}
                  clientData={clientData}
                  onBack={() => {
                    setSelectedClient(null);
                    setClientData(null);
                    setActiveView("GRID");
                  }}
                  onOpenModal={() => setShowCompModal(true)}
                  onDeleteComponent={handleDeleteComponent}
                />
                <ClientComponentForm
                  show={showCompModal}
                  onClose={() => setShowCompModal(false)}
                  onSubmit={handleCreateOrUpdateBudget}
                  client={selectedClient}
                  existingData={clientData}
                />
              </>
            )}
          </>
        ) : (
          <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  DM Client Budget Management
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  FY {fiscalYear} • Select a client to manage their budget sheet
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Total Clients
                </p>
                <div className="flex items-center gap-3 justify-end">
                  {isFetchingForecasts && (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  )}
                  <p className="text-2xl font-bold text-gray-900">
                    {clientBudgets.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {clientBudgets.map((client) => (
                <ClientCard
                  key={client.key}
                  client={client}
                  forecastAmount={clientForecasts[client.key] || 0} // Pass the fetched forecast
                  onClick={handleClientSelect}
                />
              ))}
            </div>
          </div>
        )}
      </Suspense>
    </div>
  );
}
