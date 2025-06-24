import React, { useState, useEffect, useRef } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import FollowupAlerts from "../components/Sales/FollowupAlerts";
import AddCollegeModal from "../components/Sales/AddCollege";
import FollowUp from "../components/Sales/Followup";
import TrainingForm from "../components/Sales/ClosureForm/TrainingForm";
import LeadDetailsModal from "../components/Sales/LeadDetailsModal";
import ExpectedDateModal from "../components/Sales/ExpectedDateWarning";
import LeadsTable from "../components/Sales/LeadTable";
// Add these imports at the top of your Sales.jsx
import {
  FiFilter,
  FiDownload,
  FiUpload,
  FiX,
  FiChevronDown,
} from "react-icons/fi";
import { CSVLink } from "react-csv";
import Papa from "papaparse";
import LeadFilters from "../components/Sales/LeadFilters"; // Adjust path as needed
const tabLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  closed: "Closed", // Changed from renewal to closed
};
// Updated color scheme
const tabColorMap = {
  hot: {
    active: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg",
    inactive: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
  },
  warm: {
    active: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg",
    inactive:
      "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200",
  },
  cold: {
    active: "bg-gradient-to-r from-cyan-400 to-cyan-500 text-white shadow-lg", // Changed to icy blue
    inactive:
      "bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border border-cyan-200", // Changed to icy blue
  },
  closed: {
    active: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg", // Changed to success green
    inactive:
      "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200", // Changed to success green
  },
};

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
  const [viewMyLeadsOnly, setViewMyLeadsOnly] = useState(true); // Default to true now
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [showTodayFollowUpAlert, setShowTodayFollowUpAlert] = useState(false);
  const [reminderPopup, setReminderPopup] = useState(null); // For 15 min reminders
  const remindedLeadsRef = useRef(new Set());
  const [showExpectedDateModal, setShowExpectedDateModal] = useState(false);
  const [pendingPhaseChange, setPendingPhaseChange] = useState(null); // "warm" ya "cold"
  const [leadBeingUpdated, setLeadBeingUpdated] = useState(null); // lead object
  const [expectedDate, setExpectedDate] = useState(""); // date string like "2025-06-25"
  const [filters, setFilters] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Add this function to handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Add this function to handle CSV import
  const handleImportComplete = (importedData) => {
    // Implement your import logic here
    console.log("Imported data:", importedData);
  };

  const computePhaseCounts = () => {
    const user = Object.values(users).find((u) => u.uid === currentUser?.uid);
    const counts = {
      hot: 0,
      warm: 0,
      cold: 0,
      closed: 0, // Changed from renewal to closed
    };

    if (!user) return counts;

    const isSalesDept = user.department === "Sales";
    const isHigherRole = ["Director", "Head", "Manager"].includes(user.role);
    const isLowerRole = ["Assistant Manager", "Executive"].includes(user.role);

    Object.values(leads).forEach((lead) => {
      const phase = lead.phase || "hot";
      const isOwnLead = lead.assignedTo?.uid === currentUser?.uid;

      const shouldInclude =
        isSalesDept && isHigherRole
          ? viewMyLeadsOnly
            ? isOwnLead
            : true
          : isSalesDept && isLowerRole
          ? isOwnLead
          : false;

      if (shouldInclude && counts[phase] !== undefined) {
        counts[phase]++;
      }
    });

    return counts;
  };

  const phaseCounts = computePhaseCounts();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        // Check user role and set viewMyLeadsOnly accordingly
        const userData = Object.values(users).find((u) => u.uid === user.uid);
        if (userData) {
          const isHigherRole = ["Director", "Head", "Manager"].includes(
            userData.role
          );
          // For higher roles, default to "My Leads" view
          setViewMyLeadsOnly(isHigherRole);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, [users]); // Add users as dependency

  useEffect(() => {
    const unsubLeads = onSnapshot(collection(db, "leads"), (snapshot) => {
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (id, e) => {
    e.stopPropagation();
    setDropdownOpenId((currentId) => (currentId === id ? null : id));
  };

  const updateLeadPhase = async (id, newPhase) => {
    try {
      await updateDoc(doc(db, "leads", id), { phase: newPhase });
    } catch (err) {
      console.error("Phase update failed", err);
    }
  };

  // In Sales.jsx
  const handleSaveLead = async (updatedLead) => {
    if (!updatedLead?.id) return;

    // Convert date string back to timestamp if it exists
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
  };

  const filteredLeads = Object.entries(leads).filter(([, lead]) => {
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
    const isLowerRole = ["Assistant Manager", "Executive"].includes(user.role);

    if (isSalesDept && isHigherRole) {
      return viewMyLeadsOnly
        ? phaseMatch &&
            matchesFilters &&
            lead.assignedTo?.uid === currentUser?.uid
        : phaseMatch && matchesFilters;
    }

    if (isSalesDept && isLowerRole) {
      return (
        phaseMatch &&
        matchesFilters &&
        lead.assignedTo?.uid === currentUser?.uid
      );
    }

    return false;
  });

  // Define the grid columns based on the fields we want to display
  // const gridColumns = "grid grid-cols-11 gap-4";

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

        const sortedFollowups = followupEntries.sort(
          (a, b) => b.timestamp - a.timestamp
        );
        const latest = sortedFollowups[0];
        if (latest.date !== todayStr) return false;

        const followUpDateTime = new Date(
          `${latest.date}T${convertTo24HrTime(latest.time)}`
        );
        return followUpDateTime > now;
      });

      if (matchingLeads.length > 0) {
        setTodayFollowUps(matchingLeads);
        setShowTodayFollowUpAlert(true);

        // ✅ Automatically hide after 4 seconds
        const timer = setTimeout(() => {
          setShowTodayFollowUpAlert(false);
        }, 4000);

        return () => clearTimeout(timer); // Cleanup
      }
    }
  }, [leads, loading, currentUser?.uid]);
  // Fix: include currentUser?.uid as dependency
  function convertTo24HrTime(timeStr) {
    if (!timeStr) return "00:00:00";
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:00`;
  }

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
        const followUpTime = new Date(
          `${latest.date}T${convertTo24HrTime(latest.time)}`
        );
        const reminderTime = new Date(followUpTime.getTime() - 15 * 60 * 1000);

        const isToday =
          latest.date === now.toISOString().split("T")[0] &&
          reminderTime <= now &&
          followUpTime > now;

        const alreadyReminded = remindedLeadsRef.current.has(lead.id);

        return isToday && !alreadyReminded;
      });

      if (upcomingReminder) {
        remindedLeadsRef.current.add(upcomingReminder.id); // ✅ Track shown reminders

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

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen font-sans ">
      <div className=" mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Sales Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your leads and follow-ups
            </p>

            <div className="flex items-center justify-between mt-2">
              {currentUser &&
                (() => {
                  const role = Object.values(users).find(
                    (u) => u.uid === currentUser.uid
                  )?.role;
                  const isHigherRole = ["Director", "Head", "Manager"].includes(
                    role
                  );

                  return (
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-xs font-medium px-3 py-1 rounded-full ${
                          isHigherRole
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        Viewing:{" "}
                        {isHigherRole
                          ? viewMyLeadsOnly
                            ? "My Leads Only"
                            : "All Sales Leads"
                          : "My Leads Only"}
                      </p>

                      {isHigherRole && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setViewMyLeadsOnly(true)}
                            className={`text-xs font-medium px-3 py-1 rounded-full border transition ${
                              viewMyLeadsOnly
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-blue-600 border-blue-300"
                            }`}
                          >
                            My Leads
                          </button>
                          <button
                            onClick={() => setViewMyLeadsOnly(false)}
                            className={`text-xs font-medium px-3 py-1 rounded-full border transition ${
                              !viewMyLeadsOnly
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-blue-600 border-blue-300"
                            }`}
                          >
                            My Team
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* Move the filter button here */}
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center space-x-2 px-3 py-1 rounded-full border transition-colors text-xs ${
                  isFilterOpen
                    ? "bg-blue-50 border-blue-200 text-blue-600"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <FiFilter className="w-4 h-4" />
                <span>Filters</span>
                {Object.values(filters).some(
                  (filter) =>
                    (typeof filter === "string" && filter) ||
                    (typeof filter === "object" &&
                      Object.values(filter).some(Boolean))
                ) && (
                  <span className="bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    !
                  </span>
                )}
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-all shadow-md flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clipRule="evenodd"
              />
            </svg>
            Add College
          </button>
        </div>

        <LeadFilters
          leads={leads}
          users={users}
          currentUser={currentUser}
          onFilterChange={handleFilterChange}
          onImportComplete={handleImportComplete}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {Object.keys(tabLabels).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-[1.02] ${
                activeTab === key
                  ? tabColorMap[key].active
                  : tabColorMap[key].inactive
              } ${
                activeTab === key ? "ring-2 ring-offset-2 ring-opacity-50" : ""
              } ${
                activeTab === key
                  ? key === "hot"
                    ? "ring-red-500"
                    : key === "warm"
                    ? "ring-amber-400"
                    : key === "cold"
                    ? "ring-cyan-400" // Changed to icy blue
                    : "ring-green-500" // Changed to success green
                  : ""
              }`}
            >
              {tabLabels[key]}{" "}
              <span className="ml-1 text-xs font-bold">
                ({phaseCounts[key]})
              </span>
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
            closed: "bg-gray-100", // agar zarurat ho to add karo
          }}
          borderColorMap={{
            open: "border-blue-400",
            inProgress: "border-yellow-400",
            closed: "border-gray-400", // agar zarurat ho to add karo
          }}
          setShowModal={setShowModal}
          // Add props needed for ClosedLeads
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

      <style>{`
  @keyframes slideInRight {
    0% {
      transform: translateX(100%);
      opacity: 0;
    }
    15% {
      transform: translateX(0);
      opacity: 1;
    }
    85% {
      transform: translateX(0);
      opacity: 1;
    }
    100% {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .animate-slideInRight {
    animation: slideInRight 4s ease-in-out forwards;
  }
`}</style>

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
