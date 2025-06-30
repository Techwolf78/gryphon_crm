import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { collection, doc, onSnapshot, updateDoc, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { debounce } from 'lodash';
import FollowupAlerts from "../components/Sales/FollowupAlerts";
import AddCollegeModal from "../components/Sales/AddCollege";
import FollowUp from "../components/Sales/Followup";
import TrainingForm from "../components/Sales/ClosureForm/TrainingForm";
import LeadDetailsModal from "../components/Sales/EditDetailsModal";
import ExpectedDateModal from "../components/Sales/ExpectedDateWarning";
import LeadsTable from "../components/Sales/LeadTable";
import LeadFilters from "../components/Sales/LeadFilters";

const tabLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  closed: "Closed",
};

const tabColorMap = {
  hot: {
    active: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg",
    inactive: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
  },
  warm: {
    active: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg",
    inactive: "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200",
  },
  cold: {
    active: "bg-gradient-to-r from-cyan-400 to-cyan-500 text-white shadow-lg",
    inactive: "bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border border-cyan-200",
  },
  closed: {
    active: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg",
    inactive: "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200",
  },
};

function Sales() {
  // State management
  const [activeTab, setActiveTab] = useState("hot");
  const [users, setUsers] = useState({});
  const [dropdownOpenId, setDropdownOpenId] = useState(null);
  const dropdownRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leads, setLeads] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [showTodayFollowUpAlert, setShowTodayFollowUpAlert] = useState(false);
  const [reminderPopup, setReminderPopup] = useState(null);
  const remindedLeadsRef = useRef(new Set());
  const [showExpectedDateModal, setShowExpectedDateModal] = useState(false);
  const [pendingPhaseChange, setPendingPhaseChange] = useState(null);
  const [leadBeingUpdated, setLeadBeingUpdated] = useState(null);
  const [expectedDate, setExpectedDate] = useState("");
  
  // Filter state with debouncing
  const [rawFilters, setRawFilters] = useState({});
  const [filters, setFilters] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // View mode state with localStorage persistence
  const [viewMyLeadsOnly, setViewMyLeadsOnly] = useState(() => {
    const saved = localStorage.getItem('viewMyLeadsOnly');
    return saved !== null ? JSON.parse(saved) : null;
  });
  const [isViewModeLoading, setIsViewModeLoading] = useState(true);

  // Persist view mode to localStorage
  useEffect(() => {
    if (viewMyLeadsOnly !== null) {
      localStorage.setItem('viewMyLeadsOnly', JSON.stringify(viewMyLeadsOnly));
    }
  }, [viewMyLeadsOnly]);

  // Debounce the filter updates
  useEffect(() => {
    const debounced = debounce(() => {
      setFilters(rawFilters);
    }, 300);
    debounced();
    return () => debounced.cancel();
  }, [rawFilters]);

  // Memoized computations
  const computePhaseCounts = useCallback(() => {
    const user = Object.values(users).find((u) => u.uid === currentUser?.uid);
    const counts = { hot: 0, warm: 0, cold: 0, closed: 0 };

    if (!user) return counts;

    const isSalesDept = user.department === "Sales";
    const isHigherRole = ["Director", "Head", "Manager"].includes(user.role);
    const isLowerRole = ["Assistant Manager", "Executive"].includes(user.role);

    Object.values(leads).forEach((lead) => {
      const phase = lead.phase || "hot";
      const isOwnLead = lead.assignedTo?.uid === currentUser?.uid;
      let shouldInclude = false;

      if (isSalesDept && isHigherRole) {
        if (viewMyLeadsOnly) {
          shouldInclude = isOwnLead;
        } else {
          if (user.role === "Manager") {
            const subordinates = Object.values(users).filter(
              (u) => u.reportingManager === user.name &&
              ["Assistant Manager", "Executive"].includes(u.role)
            );
            const teamUids = subordinates.map((u) => u.uid);
            shouldInclude = teamUids.includes(lead.assignedTo?.uid);
          } else {
            shouldInclude = true;
          }
        }
      } else if (isSalesDept && isLowerRole) {
        shouldInclude = isOwnLead;
      }

      if (shouldInclude && counts[phase] !== undefined) {
        counts[phase]++;
      }
    });

    return counts;
  }, [users, currentUser, leads, viewMyLeadsOnly]);

  const phaseCounts = useMemo(() => computePhaseCounts(), [computePhaseCounts]);

  // Filter leads with memoization
  const filteredLeads = useMemo(() => {
    return Object.entries(leads).filter(([, lead]) => {
      const phaseMatch = (lead.phase || "hot") === activeTab;
      const user = Object.values(users).find((u) => u.uid === currentUser?.uid);
      if (!user) return false;

      // Apply additional filters
      const matchesFilters =
        (!filters.city || lead.city?.includes(filters.city)) &&
        (!filters.assignedTo || lead.assignedTo?.uid === filters.assignedTo) &&
        (!filters.dateRange?.start ||
          lead.createdAt >= new Date(filters.dateRange.start).getTime()) &&
        (!filters.dateRange?.end ||
          lead.createdAt <= new Date(filters.dateRange.end).getTime()) &&
        (!filters.pocName ||
          lead.pocName?.toLowerCase().includes(filters.pocName.toLowerCase())) &&
        (!filters.phoneNo || lead.phoneNo?.includes(filters.phoneNo)) &&
        (!filters.email ||
          lead.email?.toLowerCase().includes(filters.email.toLowerCase()));

      const isSalesDept = user.department === "Sales";
      const isHigherRole = ["Director", "Head", "Manager"].includes(user.role);

      if (isSalesDept && isHigherRole) {
        if (viewMyLeadsOnly) {
          return phaseMatch && matchesFilters && lead.assignedTo?.uid === currentUser?.uid;
        } else {
          const currentUserData = Object.values(users).find((u) => u.uid === currentUser?.uid);
          if (!currentUserData) return false;

          if (currentUserData.role === "Manager") {
            const subordinates = Object.values(users).filter(
              (u) => u.reportingManager === currentUserData.name &&
              ["Assistant Manager", "Executive"].includes(u.role)
            );
            const teamUids = subordinates.map((u) => u.uid);
            return phaseMatch && matchesFilters && teamUids.includes(lead.assignedTo?.uid);
          }
          return phaseMatch && matchesFilters;
        }
      }
      return false;
    });
  }, [leads, activeTab, users, currentUser, viewMyLeadsOnly, filters]);

  // Auth state listener
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const userData = Object.values(users).find((u) => u.uid === user.uid);
        if (userData) {
          const isHigherRole = ["Director", "Head", "Manager"].includes(userData.role);
          // Only set initial value if no preference exists
          if (viewMyLeadsOnly === null) {
            setViewMyLeadsOnly(isHigherRole);
          }
        }
        setIsViewModeLoading(false);
      } else {
        setCurrentUser(null);
        setIsViewModeLoading(false);
      }
    });
    return () => unsubscribe();
  }, [users, viewMyLeadsOnly]);

  // Firestore data subscriptions with query constraints
  useEffect(() => {
    const leadsQuery = query(
      collection(db, "leads"),
      where("phase", "in", ["hot", "warm", "cold", "closed"]),
      orderBy("createdAt", "desc"),
      limit(500)
    );

    const unsubLeads = onSnapshot(leadsQuery, (snapshot) => {
      const data = {};
      snapshot.forEach((doc) => {
        data[doc.id] = { id: doc.id, ...doc.data() };
      });
      setLeads(data);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const data = {};
      snapshot.forEach((doc) => {
        data[doc.id] = { id: doc.id, ...doc.data() };
      });
      setUsers(data);
    });

    return () => {
      unsubLeads();
      unsubUsers();
    };
  }, []);

  // Click outside dropdown handler
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Today's follow-ups check
  useEffect(() => {
    if (!loading && Object.keys(leads).length > 0) {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      const matchingLeads = Object.values(leads).filter((lead) => {
        if (lead.assignedTo?.uid !== currentUser?.uid) return false;
        if ((lead.phase || "hot") !== "hot") return false;
        if (!lead.followup) return false;

        const followupEntries = Object.values(lead.followup);
        if (followupEntries.length === 0) return false;

        const sortedFollowups = followupEntries.sort((a, b) => b.timestamp - a.timestamp);
        const latest = sortedFollowups[0];
        if (latest.date !== todayStr) return false;

        const followUpDateTime = new Date(`${latest.date}T${convertTo24HrTime(latest.time)}`);
        return followUpDateTime > now;
      });

      if (matchingLeads.length > 0) {
        setTodayFollowUps(matchingLeads);
        setShowTodayFollowUpAlert(true);
        const timer = setTimeout(() => setShowTodayFollowUpAlert(false), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [leads, loading, currentUser?.uid]);

  // Reminder interval
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const upcomingReminder = Object.values(leads).find((lead) => {
        if (lead.assignedTo?.uid !== currentUser?.uid) return false;
        if ((lead.phase || "hot") !== "hot") return false;
        if (!lead.followup) return false;

        const entries = Object.values(lead.followup);
        if (entries.length === 0) return false;

        const latest = entries.sort((a, b) => b.timestamp - a.timestamp)[0];
        const followUpTime = new Date(`${latest.date}T${convertTo24HrTime(latest.time)}`);
        const reminderTime = new Date(followUpTime.getTime() - 15 * 60 * 1000);

        const isToday = latest.date === now.toISOString().split("T")[0] &&
          reminderTime <= now && followUpTime > now;
        const alreadyReminded = remindedLeadsRef.current.has(lead.id);

        return isToday && !alreadyReminded;
      });

      if (upcomingReminder) {
        remindedLeadsRef.current.add(upcomingReminder.id);
        setReminderPopup({
          leadId: upcomingReminder.id,
          college: upcomingReminder.businessName,
          time: Object.values(upcomingReminder.followup).sort(
            (a, b) => b.timestamp - a.timestamp
          )[0].time,
        });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [leads, currentUser]);

  // Helper functions
  const convertTo24HrTime = (timeStr) => {
    if (!timeStr) return "00:00:00";
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
  };

  const toggleDropdown = useCallback((id, e) => {
    e.stopPropagation();
    setDropdownOpenId((currentId) => (currentId === id ? null : id));
  }, []);

  const updateLeadPhase = useCallback(async (id, newPhase) => {
    try {
      await updateDoc(doc(db, "leads", id), { phase: newPhase });
    } catch (err) {
      console.error("Phase update failed", err);
    }
  }, []);

  const handleSaveLead = useCallback(async (updatedLead) => {
    if (!updatedLead?.id) return;

    if (updatedLead.createdAt && typeof updatedLead.createdAt === "string") {
      updatedLead.createdAt = new Date(updatedLead.createdAt).getTime();
    }

    const { ...dataToUpdate } = updatedLead;

    try {
      await updateDoc(doc(db, "leads", updatedLead.id), dataToUpdate);
      setShowDetailsModal(false);
      setSelectedLead(null);
    } catch (error) {
      console.error("Failed to update lead", error);
    }
  }, []);

  const handleImportComplete = useCallback((importedData) => {
    console.log("Imported data:", importedData);
  }, []);

  const handleTabChange = useCallback((tab) => setActiveTab(tab), []);

  // View Mode Toggle Component
  const ViewModeToggle = ({ isHigherRole }) => {
    if (!isHigherRole) return null;

    return (
      <div className="flex gap-2">
        <button
          onClick={() => setViewMyLeadsOnly(true)}
          className={`text-xs font-medium px-3 py-1 rounded-full border transition ${
            viewMyLeadsOnly
              ? "bg-blue-600 text-white border-blue-600 shadow-md"
              : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
          }`}
          aria-label="Show only my leads"
        >
          My Leads
        </button>
        <button
          onClick={() => setViewMyLeadsOnly(false)}
          className={`text-xs font-medium px-3 py-1 rounded-full border transition ${
            !viewMyLeadsOnly
              ? "bg-blue-600 text-white border-blue-600 shadow-md"
              : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
          }`}
          aria-label="Show my team's leads"
        >
          My Team
        </button>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen font-sans">
      <div className="mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sales Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your leads and follow-ups</p>

            <div className="flex items-center justify-between mt-2">
              {currentUser && (() => {
                const role = Object.values(users).find((u) => u.uid === currentUser.uid)?.role;
                const isHigherRole = ["Director", "Head", "Manager"].includes(role);

                return isViewModeLoading ? (
                  <div className="h-8 w-48 bg-gray-100 rounded-full animate-pulse"></div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-medium px-3 py-1 rounded-full ${
                      isHigherRole ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      Viewing: {isHigherRole 
                        ? viewMyLeadsOnly ? "My Leads Only" : "All Sales Leads" 
                        : "My Leads Only"}
                    </p>
                    <ViewModeToggle isHigherRole={isHigherRole} />
                  </div>
                );
              })()}

              <LeadFilters
                filteredLeads={filteredLeads}
                handleImportComplete={handleImportComplete}
                filters={rawFilters}
                setFilters={setRawFilters}
                isFilterOpen={isFilterOpen}
                setIsFilterOpen={setIsFilterOpen}
                users={users}
                leads={leads}
              />
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-all shadow-md flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            Add College
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {Object.keys(tabLabels).map((key) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-[1.02] ${
                activeTab === key ? tabColorMap[key].active : tabColorMap[key].inactive
              } ${activeTab === key ? "ring-2 ring-offset-2 ring-opacity-50" : ""} ${
                activeTab === key
                  ? key === "hot"
                    ? "ring-red-500"
                    : key === "warm"
                    ? "ring-amber-400"
                    : key === "cold"
                    ? "ring-cyan-400"
                    : "ring-green-500"
                  : ""
              }`}
            >
              {tabLabels[key]} <span className="ml-1 text-xs font-bold">({phaseCounts[key]})</span>
            </button>
          ))}
        </div>

        <LeadsTable
          loading={loading}
          activeTab={activeTab}
          filteredLeads={filteredLeads}
          users={users}
          dropdownOpenId={dropdownOpenId}
          setDropdownOpenId={setDropdownOpenId}
          toggleDropdown={toggleDropdown}
          setSelectedLead={setSelectedLead}
          setShowFollowUpModal={setShowFollowUpModal}
          setShowDetailsModal={setShowDetailsModal}
          setShowClosureModal={setShowClosureModal}
          updateLeadPhase={updateLeadPhase}
          dropdownRef={dropdownRef}
          setShowExpectedDateModal={setShowExpectedDateModal}
          setPendingPhaseChange={setPendingPhaseChange}
          setLeadBeingUpdated={setLeadBeingUpdated}
          gridColumns="grid grid-cols-11 gap-4"
          headerColorMap={{
            open: "bg-blue-100",
            inProgress: "bg-yellow-100",
            closed: "bg-gray-100",
          }}
          borderColorMap={{
            open: "border-blue-400",
            inProgress: "border-yellow-400",
            closed: "border-gray-400",
          }}
          setShowModal={setShowModal}
          leads={leads}
          viewMyLeadsOnly={viewMyLeadsOnly}
          currentUser={currentUser}
        />
      </div>

      <AddCollegeModal show={showModal} onClose={() => setShowModal(false)} />

      <LeadDetailsModal
        show={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        lead={selectedLead}
        onSave={handleSaveLead}
      />

      {showClosureModal && selectedLead && (
        <TrainingForm
          show={showClosureModal}
          onClose={() => setShowClosureModal(false)}
          lead={selectedLead}
        />
      )}
      {showFollowUpModal && selectedLead && (
        <FollowUp
          onClose={() => setShowFollowUpModal(false)}
          lead={selectedLead}
        />
      )}

      <FollowupAlerts
        todayFollowUps={todayFollowUps}
        showTodayFollowUpAlert={showTodayFollowUpAlert}
        setShowTodayFollowUpAlert={setShowTodayFollowUpAlert}
        reminderPopup={reminderPopup}
        setReminderPopup={setReminderPopup}
      />

      <ExpectedDateModal
        show={showExpectedDateModal}
        onClose={() => {
          setShowExpectedDateModal(false);
          setExpectedDate("");
          setLeadBeingUpdated(null);
          setPendingPhaseChange(null);
        }}
        expectedDate={expectedDate}
        setExpectedDate={setExpectedDate}
        leadBeingUpdated={leadBeingUpdated}
        setLeadBeingUpdated={setLeadBeingUpdated}
        pendingPhaseChange={pendingPhaseChange}
        setPendingPhaseChange={setPendingPhaseChange}
      />
    </div>
  );
}

export default Sales;