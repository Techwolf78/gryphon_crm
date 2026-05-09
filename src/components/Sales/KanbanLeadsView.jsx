import React, { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import LeadDetailsModal from "./LeadDetailsModal";

// ─── Phase configuration ─────────────────────────────────────────────
const PHASES = [
  {
    id: "hot",
    label: "Hot",
    color: "bg-red-500",
    bgColor: "bg-red-50",
    badgeBg: "bg-red-200 text-red-700",
  },
  {
    id: "warm",
    label: "Warm",
    color: "bg-amber-500",
    bgColor: "bg-amber-50",
    badgeBg: "bg-amber-200 text-amber-700",
  },
  {
    id: "cold",
    label: "Cold",
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    badgeBg: "bg-blue-200 text-blue-700",
  },
];

// ─── Skeleton Loaders ─────────────────────────────────────────────────
const CardSkeleton = () => (
  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-start justify-between mb-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 w-4 bg-gray-200 rounded"></div>
    </div>
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="flex gap-2 mb-2">
      <div className="h-5 bg-gray-200 rounded-full w-16"></div>
      <div className="h-5 bg-gray-200 rounded-full w-12"></div>
    </div>
    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
  </div>
);

const KanbanSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
    {PHASES.map((phase) => (
      <div
        key={phase.id}
        className={`${phase.bgColor} rounded-2xl p-3 border ${phase.borderColor}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
          <div className="h-5 w-8 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    ))}
  </div>
);

// ─── Draggable Lead Card ──────────────────────────────────────────────
const LeadCard = ({
  id,
  lead,
  users,
  phaseConfig,
  canDrag,
  onClick,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      disabled: !canDrag,
    });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const assignedUserName = lead.assignedTo?.uid && users[lead.assignedTo.uid]?.name
    ? users[lead.assignedTo.uid].name
    : lead.assignedTo?.name || "Unassigned";

  const getLatestFollowup = () => {
    const followData = lead.followup || {};
    const entries = Object.entries(followData).sort(
      (a, b) => b[1].timestamp - a[1].timestamp
    );
    if (entries.length === 0) return null;
    return entries[0][1];
  };

  const formatDate = (dateValue) => {
    if (dateValue && typeof dateValue.toDate === "function") {
      return dateValue.toDate().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    }
    if (dateValue && typeof dateValue === "number") {
      return new Date(dateValue).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    }
    return null;
  };

  const formatCurrency = (amount) => {
    const numAmount = Number(amount);
    if (!numAmount) return null;
    if (numAmount > 10000000) {
      const crores = numAmount / 10000000;
      let str = crores.toFixed(2).replace(/\.?0+$/, "");
      return `₹${str} cr`;
    }
    return `₹${numAmount.toLocaleString("en-IN")}`;
  };

  const latestFollowup = getLatestFollowup();
  const expectedDate = lead.expectedClosureDate
    ? formatDate(lead.expectedClosureDate)
    : null;
  const tcvDisplay = formatCurrency(lead.tcv);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      className={`bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 relative ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
      onClick={() => {
        if (!isDragging) onClick(lead);
      }}
    >
      {/* Top Row: Business Name + Contact Method */}
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 flex-1">
          {lead.businessName || "Untitled"}
        </h4>
        {lead.contactMethod && (
          <span className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ml-2 shrink-0">
            {lead.contactMethod.toLowerCase()}
          </span>
        )}
      </div>

      {/* POC Name */}
      {lead.pocName && (
        <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {lead.pocName}
        </p>
      )}

      {/* Metrics & Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {tcvDisplay && (
          <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
            {tcvDisplay}
          </span>
        )}
        {lead.city && (
          <span className="inline-flex items-center text-[10px] text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
            📍 {lead.city}
          </span>
        )}
        {lead.courses?.[0]?.courseType && (
          <span className="inline-flex items-center text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
            🎓 {lead.courses[0].courseType}
          </span>
        )}
      </div>

      {/* Footer: Assigned + Dates */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="w-5 h-5 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
            {assignedUserName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-gray-700 font-medium truncate">
              {assignedUserName}
            </span>
            {latestFollowup?.date && (
              <span className="text-[9px] text-gray-400 truncate">
                Follow: {latestFollowup.date}
              </span>
            )}
          </div>
        </div>
        
        {expectedDate && (
          <div className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
             🎯 {expectedDate}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Drag Overlay Card (visual clone while dragging) ──────────────────
const DragOverlayCard = ({ lead, users }) => {
  const assignedUserName =
    lead.assignedTo?.uid && users[lead.assignedTo.uid]?.name
      ? users[lead.assignedTo.uid].name
      : lead.assignedTo?.name || "Unassigned";

  const formatCurrency = (amount) => {
    const numAmount = Number(amount);
    if (!numAmount) return null;
    if (numAmount > 10000000) {
      const crores = numAmount / 10000000;
      let str = crores.toFixed(2).replace(/\.?0+$/, "");
      return `₹${str} cr`;
    }
    return `₹${numAmount.toLocaleString("en-IN")}`;
  };

  return (
    <div className="bg-white rounded-xl p-3 shadow-2xl border-2 border-blue-300 transform rotate-2 scale-105 w-64 opacity-95">
      <h4 className="font-semibold text-gray-900 text-xs leading-tight line-clamp-1 mb-1">
        {lead.businessName || "Untitled"}
      </h4>
      {lead.pocName && (
        <p className="text-[11px] text-gray-500 mb-1.5">{lead.pocName}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-gray-500">{assignedUserName}</span>
        {lead.tcv && (
          <span className="text-[9px] font-bold text-green-700">
            {formatCurrency(lead.tcv)}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Droppable Column ─────────────────────────────────────────────────
const KanbanColumn = ({ phase, leads, children, tcvTotal }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: phase.id,
  });

  const formatCurrency = (amount) => {
    const numAmount = Number(amount);
    if (!numAmount) return "₹0";
    if (numAmount > 10000000) {
      const crores = numAmount / 10000000;
      let str = crores.toFixed(2).replace(/\.?0+$/, "");
      return `₹${str} cr`;
    }
    return `₹${numAmount.toLocaleString("en-IN")}`;
  };

  return (
    <div
      className={`${phase.bgColor} rounded-2xl p-2 min-h-[200px] transition-colors shadow-sm flex flex-col ${isOver ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}
    >
      <h3 className="font-semibold text-gray-900 mb-2 flex items-center text-sm">
        <div className={`w-3 h-3 ${phase.color} rounded-full mr-3`}></div>
        {phase.label}
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${phase.badgeBg}`}>
          {leads.length}
        </span>
      </h3>
      {tcvTotal > 0 && (
        <div className="mb-2 px-1">
          <span className="text-gray-500 text-[10px] font-medium">
            TCV: {formatCurrency(tcvTotal)}
          </span>
        </div>
      )}
      <div ref={setNodeRef} className="space-y-1.5 flex-1 overflow-y-auto max-h-[65vh] min-h-[180px] scrollbar-thin">
        {children}
        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-xs font-medium">No leads</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Kanban View Component ───────────────────────────────────────
export default function KanbanLeadsView({
  loading,
  allVisibleLeads,
  users,
  currentUser,
  setSelectedLead,
  setShowClosureModal,
  setShowExpectedDateModal,
  setPendingPhaseChange,
  setLeadBeingUpdated,
  setShowModal,
  showTCV,
}) {
  const [activeId, setActiveId] = useState(null);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  // Get current user data for permission checks
  const currentUserData = useMemo(() => {
    return Object.values(users).find((u) => u.uid === currentUser?.uid);
  }, [users, currentUser]);

  // Check if user can drag (change phase of) a lead
  const canDragLead = useCallback(
    (lead) => {
      if (!currentUserData) return false;
      const isOwnLead = lead.assignedTo?.uid === currentUser?.uid;
      const isAdmin = currentUserData.department === "Admin";
      const isHigherRole = ["Director", "Head", "Manager"].includes(
        currentUserData.role
      );
      // Own leads or admin/higher roles can drag
      return isOwnLead || isAdmin || isHigherRole;
    },
    [currentUserData, currentUser]
  );

  // Group leads by phase
  const leadsByPhase = useMemo(() => {
    const grouped = { hot: [], warm: [], cold: [], closed: [] };
    allVisibleLeads.forEach(([id, lead]) => {
      const phase = lead.phase || "hot";
      if (grouped[phase]) {
        grouped[phase].push({ id, ...lead });
      }
    });
    // Sort each phase by createdAt descending
    Object.keys(grouped).forEach((phase) => {
      grouped[phase].sort((a, b) => {
        const dateA = a.openedDate || a.createdAt || 0;
        const dateB = b.openedDate || b.createdAt || 0;
        return (dateB || 0) - (dateA || 0);
      });
    });
    return grouped;
  }, [allVisibleLeads]);

  // Compute TCV per phase
  const tcvByPhase = useMemo(() => {
    const tcv = { hot: 0, warm: 0, cold: 0, closed: 0 };
    Object.entries(leadsByPhase).forEach(([phase, leads]) => {
      tcv[phase] = leads.reduce((sum, lead) => sum + (lead.tcv || 0), 0);
    });
    return tcv;
  }, [leadsByPhase]);

  // Find the lead being dragged
  const activeLead = useMemo(() => {
    if (!activeId) return null;
    for (const leads of Object.values(leadsByPhase)) {
      const found = leads.find((l) => l.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, leadsByPhase]);

  // ─── DnD Handlers ────────────────────────────────────────────────
  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || !active) return;

      const leadId = active.id;
      const targetPhase = over.id;

      // Find the lead's current phase
      let currentPhase = null;
      let draggedLead = null;
      for (const [phase, leads] of Object.entries(leadsByPhase)) {
        const found = leads.find((l) => l.id === leadId);
        if (found) {
          currentPhase = phase;
          draggedLead = found;
          break;
        }
      }

      if (!currentPhase || currentPhase === targetPhase || !draggedLead) return;

      // Check permission
      if (!canDragLead(draggedLead)) return;

      // Moving to closed requires closure form (if from hot)
      if (targetPhase === "closed" && currentPhase === "hot") {
        setSelectedLead({ ...draggedLead });
        setShowClosureModal(true);
        return;
      }

      // Moving from hot to warm/cold requires expected date
      const isFromHotToWarmOrCold =
        currentPhase === "hot" &&
        (targetPhase === "warm" || targetPhase === "cold");

      if (isFromHotToWarmOrCold) {
        setLeadBeingUpdated(draggedLead);
        setPendingPhaseChange(targetPhase);
        setShowExpectedDateModal(true);
        return;
      }

      // Regular phase change
      try {
        await updateDoc(doc(db, "leads", leadId), { phase: targetPhase });
      } catch (err) {
        console.error("Failed to update phase:", err);
      }
    },
    [
      leadsByPhase,
      canDragLead,
      setSelectedLead,
      setShowClosureModal,
      setLeadBeingUpdated,
      setPendingPhaseChange,
      setShowExpectedDateModal,
    ]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // ─── Loading State ───────────────────────────────────────────────
  if (loading) {
    return <KanbanSkeleton />;
  }

  // ─── Empty State ─────────────────────────────────────────────────
  const totalLeads = Object.values(leadsByPhase).reduce(
    (sum, leads) => sum + leads.length,
    0
  );

  if (totalLeads === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mx-auto text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No leads found
        </h3>
        <p className="mt-1 text-gray-500">
          Get started by adding a new college
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Add College
        </button>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2 overflow-x-auto">
          {PHASES.map((phase) => (
            <KanbanColumn
              key={phase.id}
              phase={phase}
              leads={leadsByPhase[phase.id]}
              tcvTotal={showTCV ? tcvByPhase[phase.id] : 0}
            >
              {leadsByPhase[phase.id].map((lead) => (
                <LeadCard
                  key={lead.id}
                  id={lead.id}
                  lead={lead}
                  users={users}
                  phaseConfig={phase}
                  canDrag={canDragLead(lead)}
                  onClick={(l) => setSelectedLeadForDetails(l)}
                />
              ))}
            </KanbanColumn>
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activeLead ? (
            <DragOverlayCard lead={activeLead} users={users} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Lead Details Modal */}
      {selectedLeadForDetails && (
        <LeadDetailsModal
          selectedLead={selectedLeadForDetails}
          onClose={() => setSelectedLeadForDetails(null)}
          users={users}
          activeTab={selectedLeadForDetails.phase || "hot"}
        />
      )}
    </>
  );
}
