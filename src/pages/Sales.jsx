import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { FaEllipsisV, FaTimes } from "react-icons/fa";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import FollowupAlerts from "../components/Sales/FollowupAlerts";
import AddCollegeModal from "../components/Sales/AddCollege";
import FollowUp from "../components/Sales/Followup";
import ClosureFormModal from "../components/Sales/ClosureFormModal";
import LeadDetailsModal from "../components/Sales/LeadDetailsModal";
import DropdownActions from "../components/Sales/DropdownAction";
import ClosedLeads from "../components/Sales/ClosedLeads";

// Constants
const TAB_CONFIG = {
  hot: {
    label: "Hot",
    activeClass: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg",
    inactiveClass: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
    borderClass: "border-l-4 border-red-500",
    headerClass: "bg-red-50 text-red-800 border-b border-red-200",
    ringClass: "ring-red-500"
  },
  warm: {
    label: "Warm",
    activeClass: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg",
    inactiveClass: "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200",
    borderClass: "border-l-4 border-amber-400",
    headerClass: "bg-amber-50 text-amber-800 border-b border-amber-200",
    ringClass: "ring-amber-400"
  },
  cold: {
    label: "Cold",
    activeClass: "bg-gradient-to-r from-cyan-400 to-cyan-500 text-white shadow-lg",
    inactiveClass: "bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border border-cyan-200",
    borderClass: "border-l-4 border-cyan-400",
    headerClass: "bg-cyan-50 text-cyan-800 border-b border-cyan-200",
    ringClass: "ring-cyan-400"
  },
  closed: {
    label: "Closed",
    activeClass: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg",
    inactiveClass: "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200",
    borderClass: "border-l-4 border-green-500",
    headerClass: "bg-green-50 text-green-800 border-b border-green-200",
    ringClass: "ring-green-500"
  }
};

const GRID_COLUMNS = "grid grid-cols-9 gap-4";

function Sales() {
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
  const [viewMyLeadsOnly, setViewMyLeadsOnly] = useState(true);
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [showTodayFollowUpAlert, setShowTodayFollowUpAlert] = useState(false);
  const [reminderPopup, setReminderPopup] = useState(null);
  const remindedLeadsRef = useRef(new Set());

  // Memoized phase counts
  const phaseCounts = useMemo(() => {
    const counts = { hot: 0, warm: 0, cold: 0, closed: 0 };
    const user = Object.values(users).find(u => u.uid === currentUser?.uid);
    if (!user) return counts;

    const isSalesDept = user.department === "Sales";
    const isHigherRole = ["Director", "Head", "Manager"].includes(user.role);
    const isLowerRole = ["Assistant Manager", "Executive"].includes(user.role);

    Object.values(leads).forEach(lead => {
      const phase = lead.phase || "hot";
      const isOwnLead = lead.assignedTo?.uid === currentUser?.uid;
      const shouldInclude = isSalesDept && 
        (isHigherRole ? (viewMyLeadsOnly ? isOwnLead : true) : isLowerRole && isOwnLead);

      if (shouldInclude && counts[phase] !== undefined) {
        counts[phase]++;
      }
    });

    return counts;
  }, [users, currentUser, leads, viewMyLeadsOnly]);

  // Auth state listener
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setCurrentUser(user);
        const userData = Object.values(users).find(u => u.uid === user.uid);
        if (userData) {
          const isHigherRole = ["Director", "Head", "Manager"].includes(userData.role);
          setViewMyLeadsOnly(isHigherRole);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return unsubscribe;
  }, [users]);

  // Firestore listeners
  useEffect(() => {
    const unsubLeads = onSnapshot(collection(db, "leads"), snapshot => {
      const data = {};
      snapshot.forEach(doc => {
        data[doc.id] = { id: doc.id, ...doc.data() };
      });
      setLeads(data);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), snapshot => {
      const data = {};
      snapshot.forEach(doc => {
        data[doc.id] = { id: doc.id, ...doc.data() };
      });
      setUsers(data);
    });

    return () => {
      unsubLeads();
      unsubUsers();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Today's follow-ups check
  useEffect(() => {
    if (!loading && Object.keys(leads).length > 0) {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      const matchingLeads = Object.values(leads).filter(lead => {
        if (lead.assignedTo?.uid !== currentUser?.uid) return false;
        if ((lead.phase || "hot") !== "hot") return false;
        if (!lead.followup) return false;

        const latest = Object.values(lead.followup).sort((a, b) => b.timestamp - a.timestamp)[0];
        if (!latest || latest.date !== todayStr) return false;

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

  // 15-minute reminder check
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const upcomingReminder = Object.values(leads).find(lead => {
        if (lead.assignedTo?.uid !== currentUser?.uid) return false;
        if ((lead.phase || "hot") !== "hot") return false;
        if (!lead.followup) return false;

        const latest = Object.values(lead.followup).sort((a, b) => b.timestamp - a.timestamp)[0];
        if (!latest) return false;

        const followUpTime = new Date(`${latest.date}T${convertTo24HrTime(latest.time)}`);
        const reminderTime = new Date(followUpTime.getTime() - 15 * 60 * 1000);
        const isToday = latest.date === now.toISOString().split("T")[0] && 
                        reminderTime <= now && 
                        followUpTime > now;

        return isToday && !remindedLeadsRef.current.has(lead.id);
      });

      if (upcomingReminder) {
        remindedLeadsRef.current.add(upcomingReminder.id);
        const latestFollowup = Object.values(upcomingReminder.followup).sort((a, b) => b.timestamp - a.timestamp)[0];
        setReminderPopup({
          leadId: upcomingReminder.id,
          college: upcomingReminder.businessName,
          time: latestFollowup.time
        });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [leads, currentUser]);

  // Helper functions
  const convertTo24HrTime = timeStr => {
    if (!timeStr) return "00:00:00";
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
  };

  const formatDate = useCallback(ms => 
    new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    }), []);

  const getLatestFollowup = useCallback(lead => {
    const followData = lead.followup || {};
    const latest = Object.entries(followData).sort((a, b) => a[1].timestamp - b[1].timestamp).pop();
    if (!latest) return "-";
    const { date = "-", time = "", remarks = "" } = latest[1];
    return `${date} ${time} - ${remarks}`;
  }, []);

  const toggleDropdown = useCallback((id, e) => {
    e.stopPropagation();
    setDropdownOpenId(currentId => currentId === id ? null : id);
  }, []);

  const updateLeadPhase = useCallback(async (id, newPhase) => {
    try {
      await updateDoc(doc(db, "leads", id), { phase: newPhase });
    } catch (err) {
      console.error("Phase update failed", err);
    }
  }, []);

  const handleSaveLead = useCallback(async updatedLead => {
    if (!updatedLead?.id) return;
    try {
      const { id, ...dataToUpdate } = updatedLead;
      await updateDoc(doc(db, "leads", id), dataToUpdate);
      setShowDetailsModal(false);
      setSelectedLead(null);
    } catch (error) {
      console.error("Failed to update lead", error);
    }
  }, []);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return Object.entries(leads).filter(([, lead]) => {
      const phaseMatch = (lead.phase || "hot") === activeTab;
      const user = Object.values(users).find(u => u.uid === currentUser?.uid);
      if (!user) return false;

      const isSalesDept = user.department === "Sales";
      const isHigherRole = ["Director", "Head", "Manager"].includes(user.role);
      const isLowerRole = ["Assistant Manager", "Executive"].includes(user.role);

      if (isSalesDept && isHigherRole) {
        return viewMyLeadsOnly ? phaseMatch && lead.assignedTo?.uid === currentUser?.uid : phaseMatch;
      }
      if (isSalesDept && isLowerRole) {
        return phaseMatch && lead.assignedTo?.uid === currentUser?.uid;
      }
      return false;
    });
  }, [leads, activeTab, users, currentUser, viewMyLeadsOnly]);

  // User role info
  const userRoleInfo = useMemo(() => {
    if (!currentUser) return null;
    const userData = Object.values(users).find(u => u.uid === currentUser.uid);
    if (!userData) return null;
    
    const isHigherRole = ["Director", "Head", "Manager"].includes(userData.role);
    return { isHigherRole, role: userData.role };
  }, [currentUser, users]);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen font-sans">
      <div className="mx-auto p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sales Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your leads and follow-ups</p>
            
            {userRoleInfo && (
              <div className="flex items-center gap-2 mt-2">
                <p className={`text-xs font-medium px-3 py-1 rounded-full ${
                  userRoleInfo.isHigherRole ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                }`}>
                  Viewing: {userRoleInfo.isHigherRole ? (viewMyLeadsOnly ? "My Leads Only" : "All Sales Leads") : "My Leads Only"}
                </p>

                {userRoleInfo.isHigherRole && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMyLeadsOnly(true)}
                      className={`text-xs font-medium px-3 py-1 rounded-full border transition ${
                        viewMyLeadsOnly ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-300"
                      }`}
                    >
                      My Leads
                    </button>
                    <button
                      onClick={() => setViewMyLeadsOnly(false)}
                      className={`text-xs font-medium px-3 py-1 rounded-full border transition ${
                        !viewMyLeadsOnly ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-300"
                      }`}
                    >
                      My Team
                    </button>
                  </div>
                )}
              </div>
            )}
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
          {Object.keys(TAB_CONFIG).map(key => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-[1.02] ${
                activeTab === key ? TAB_CONFIG[key].activeClass : TAB_CONFIG[key].inactiveClass
              } ${activeTab === key ? "ring-2 ring-offset-2 ring-opacity-50" : ""} ${
                activeTab === key ? TAB_CONFIG[key].ringClass : ""
              }`}
            >
              {TAB_CONFIG[key].label} <span className="ml-1 text-xs font-bold">({phaseCounts[key]})</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto md:overflow-visible">
          <div className="w-auto space-y-3">
            {/* Grid Header */}
            <div className={`${GRID_COLUMNS} ${TAB_CONFIG[activeTab].headerClass} text-sm font-medium px-5 py-4 rounded-xl mb-3`}>
              {["College Name", "City", "Contact Name", "Phone No.", "Email ID", "Opened Date", "Follow-Ups", "Assigned To", "Actions"].map((header, i) => (
                <div key={i} className="font-semibold">{header}</div>
              ))}
            </div>

            {/* Grid Rows */}
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : activeTab === "closed" ? (
                <ClosedLeads leads={leads} users={users} />
              ) : filteredLeads.length === 0 ? (
                <EmptyState setShowModal={setShowModal} />
              ) : (
                filteredLeads.map(([id, lead]) => (
                  <LeadRow 
                    key={id}
                    id={id}
                    lead={lead}
                    activeTab={activeTab}
                    dropdownOpenId={dropdownOpenId}
                    toggleDropdown={toggleDropdown}
                    formatDate={formatDate}
                    getLatestFollowup={getLatestFollowup}
                    users={users}
                    dropdownRef={dropdownRef}
                    setDropdownOpenId={setDropdownOpenId}
                    setSelectedLead={setSelectedLead}
                    setShowFollowUpModal={setShowFollowUpModal}
                    setShowDetailsModal={setShowDetailsModal}
                    setShowClosureModal={setShowClosureModal}
                    updateLeadPhase={updateLeadPhase}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <AddCollegeModal show={showModal} onClose={() => setShowModal(false)} />
      <LeadDetailsModal show={showDetailsModal} onClose={() => setShowDetailsModal(false)} lead={selectedLead} onSave={handleSaveLead} />
      <ClosureFormModal show={showClosureModal} onClose={() => setShowClosureModal(false)} lead={selectedLead} />
      
      {showFollowUpModal && selectedLead && (
        <FollowUp onClose={() => setShowFollowUpModal(false)} lead={selectedLead} />
      )}

      <FollowupAlerts
        todayFollowUps={todayFollowUps}
        showTodayFollowUpAlert={showTodayFollowUpAlert}
        setShowTodayFollowUpAlert={setShowTodayFollowUpAlert}
        reminderPopup={reminderPopup}
        setReminderPopup={setReminderPopup}
      />
    </div>
  );
}

const EmptyState = ({ setShowModal }) => (
  <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H3V7zm0 4h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z" />
    </svg>
    <h3 className="mt-4 text-lg font-medium text-gray-900">No leads found</h3>
    <p className="mt-1 text-gray-500">Get started by adding a new college</p>
    <button onClick={() => setShowModal(true)} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
      Add College
    </button>
  </div>
);

const LeadRow = ({
  id,
  lead,
  activeTab,
  dropdownOpenId,
  toggleDropdown,
  formatDate,
  getLatestFollowup,
  users,
  dropdownRef,
  setDropdownOpenId,
  setSelectedLead,
  setShowFollowUpModal,
  setShowDetailsModal,
  setShowClosureModal,
  updateLeadPhase
}) => (
  <div className="relative group cursor-pointer">
    <div className={`${GRID_COLUMNS} gap-4 p-5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-300 ${TAB_CONFIG[activeTab].borderClass}`}>
      {["businessName", "city", "pocName", "phoneNo", "email", "createdAt"].map((field, i) => (
        <div key={i} className="break-words whitespace-normal text-sm text-gray-700 min-w-0">
          {field === "createdAt" ? formatDate(lead[field]) : lead[field] || "-"}
        </div>
      ))}
      <div className="break-words whitespace-normal text-sm text-gray-700 min-w-0">
        {getLatestFollowup(lead)}
      </div>
      <div className="break-words whitespace-normal text-sm text-gray-700 min-w-0">
        {lead.assignedTo?.uid && users[lead.assignedTo.uid]?.name ? users[lead.assignedTo.uid].name : lead.assignedTo?.name || "-"}
      </div>
      <div className="flex justify-center items-center">
        <button
          onClick={(e) => toggleDropdown(id, e)}
          className={`text-gray-500 hover:text-gray-700 focus:outline-none transition p-2 rounded-full hover:bg-gray-100 ${
            dropdownOpenId === id ? "bg-gray-200 text-gray-900 shadow-inner" : ""
          }`}
          aria-expanded={dropdownOpenId === id}
          aria-haspopup="true"
          aria-label={dropdownOpenId === id ? "Close actions menu" : "Open actions menu"}
        >
          {dropdownOpenId === id ? (
            <FaTimes size={16} className="text-gray-900 transition-transform" />
          ) : (
            <FaEllipsisV size={16} className="text-gray-500 hover:text-gray-700 transition" />
          )}
        </button>
      </div>
    </div>
    {dropdownOpenId === id && (
      <DropdownActions
        leadId={id}
        leadData={lead}
        closeDropdown={() => setDropdownOpenId(null)}
        setSelectedLead={setSelectedLead}
        setShowFollowUpModal={setShowFollowUpModal}
        setShowDetailsModal={setShowDetailsModal}
        setShowClosureModal={setShowClosureModal}
        updateLeadPhase={updateLeadPhase}
        activeTab={activeTab}
        dropdownRef={dropdownRef}
        users={users}
      />
    )}
  </div>
);

export default Sales;