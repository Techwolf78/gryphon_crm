import React, { useState, useMemo, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { FiChevronLeft, FiChevronRight, FiFilter, FiCalendar } from "react-icons/fi";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import ClosedLeadsProgressBar from "./ClosedLeadsProgressBar";
import ClosedLeadsTable from "./ClosedLeadsTable";
import ClosedLeadsStats from "./ClosedLeadsStats";

const ClosedLeads = ({ leads, viewMyLeadsOnly, currentUser, users }) => {
  const [filterType, setFilterType] = useState("all");
  const [quarterFilter, setQuarterFilter] = useState("current");
  const [targets, setTargets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchTargets = useCallback(async () => {
    const snapshot = await getDocs(collection(db, "quarterly_targets"));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTargets(data);
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const getFinancialYear = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  const getQuarter = (date) => {
    const m = date.getMonth() + 1;
    if (m >= 4 && m <= 6) return "Q1";
    if (m >= 7 && m <= 9) return "Q2";
    if (m >= 10 && m <= 12) return "Q3";
    return "Q4";
  };

  const today = new Date();
  const currentQuarter = getQuarter(today);
  const selectedQuarter = quarterFilter === "current" ? currentQuarter : quarterFilter;
  const selectedFY = getFinancialYear(today);

  const currentUserObj = Object.values(users).find(u => u.uid === currentUser?.uid);
  const currentRole = currentUserObj?.role;

  const isUserInTeam = (uid) => {
    if (!uid) return false;

    if (currentRole === "Head") {
      const user = Object.values(users).find(u => u.uid === uid);
      if (!user) return false;

      // Head can see all managers and all their subordinates
      if (user.role === "Manager") return true;
      if (["Assistant Manager", "Executive"].includes(user.role) && user.reportingManager) {
        // Check if this subordinate's manager is among managers (head team)
        return Object.values(users).some(
          mgr => mgr.role === "Manager" && mgr.name === user.reportingManager
        );
      }
    }

    if (currentRole === "Manager") {
      const user = Object.values(users).find(u => u.uid === uid);
      if (!user) return false;

      if (["Assistant Manager", "Executive"].includes(user.role)) {
        return user.reportingManager === currentUserObj.name;
      }
    }

    return false;
  };

  const filteredLeads = useMemo(() => {
    if (!currentUser) return [];

    return Object.entries(leads)
      .filter(([, lead]) => lead.phase === "closed")
      .filter(([, lead]) => {
        if (viewMyLeadsOnly) {
          return lead.assignedTo?.uid === currentUser.uid;
        } else {
          return (
            lead.assignedTo?.uid !== currentUser.uid &&
            isUserInTeam(lead.assignedTo?.uid)
          );
        }
      })
      .filter(([, lead]) => {
        if (filterType === "all") return true;
        return lead.closureType === filterType;
      })
      .filter(([, lead]) => {
        if (selectedQuarter === "all") return true;
        const closedQuarter = getQuarter(new Date(lead.closedDate));
        return closedQuarter === selectedQuarter;
      })
      .sort(([, a], [, b]) => new Date(b.closedDate) - new Date(a.closedDate));
  }, [leads, currentUser, filterType, selectedQuarter, viewMyLeadsOnly, users]);


  const startIdx = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredLeads.slice(startIdx, startIdx + rowsPerPage);
  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, quarterFilter, viewMyLeadsOnly]);

  const achievedValue = useMemo(() => {
    const value = filteredLeads.reduce((sum, [, lead]) => sum + (lead.totalCost || 0), 0);
    console.log("🔥 Achieved Value (ClosedLeads):", value);
    return value;
  }, [filteredLeads]);

  const formatCurrency = (amt) =>
    typeof amt === "number"
      ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amt)
      : "-";

  const formatDate = (ts) =>
    ts
      ? new Date(ts).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      : "-";

  
  const handleTargetUpdate = async () => {
    try {
      await fetchTargets();
      
      // Option 1: If you need deficit calculation, implement it here
      // Example placeholder - replace with your actual logic:
      const calculateDeficits = async (uid, fy) => {
        console.log(`Calculating deficits for ${uid} in ${fy}`);
        // Your deficit calculation logic would go here
        return Promise.resolve();
      };
      
      await calculateDeficits(currentUser.uid, selectedFY);
      
      // Option 2: If no deficit calculation needed, just use:
      // console.log("Targets updated successfully");
      
      await fetchTargets(); // Refresh data
    } catch (error) {
      console.error("Error updating targets:", error);
    }
  };


  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Header Section */}
      <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Closed Deals</h2>
          <p className="text-sm text-gray-500 mt-1">
            {viewMyLeadsOnly ? "Your closed deals" : "Team closed deals"}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiFilter className="text-gray-400" size={16} />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white shadow-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="all">All Types</option>
              <option value="new">New Deals</option>
              <option value="renewal">Renewals</option>
            </select>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCalendar className="text-gray-400" size={16} />
            </div>
            <select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white shadow-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="current">Current Quarter</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
              <option value="all">All Quarters</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <ClosedLeadsStats
          leads={leads}
          targets={targets}
          currentUser={currentUser}
          users={users}
          selectedFY={selectedFY}
          activeQuarter={selectedQuarter}
          formatCurrency={formatCurrency}
          viewMyLeadsOnly={viewMyLeadsOnly}
          achievedValue={achievedValue}
          handleTargetUpdate={handleTargetUpdate}
        />
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4">
        <ClosedLeadsProgressBar
          progressPercent={0}
          achievedValue={achievedValue}
          quarterTarget={0}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <ClosedLeadsTable
          leads={currentRows}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          viewMyLeadsOnly={viewMyLeadsOnly}
        />
      </div>

      {/* Pagination */}
      {filteredLeads.length > rowsPerPage && (
        <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-t border-gray-100 gap-4">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-700">{startIdx + 1}</span> to{" "}
            <span className="font-medium text-gray-700">
              {Math.min(startIdx + rowsPerPage, filteredLeads.length)}
            </span>{" "}
            of <span className="font-medium text-gray-700">{filteredLeads.length}</span> results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3.5 py-1.5 rounded-lg border text-sm flex items-center transition-colors ${currentPage === 1
                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                }`}
            >
              <FiChevronLeft className="mr-1.5" size={16} />
              Previous
            </button>
            <div className="flex items-center px-3 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3.5 py-1.5 rounded-lg border text-sm flex items-center transition-colors ${currentPage === totalPages
                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                }`}
            >
              Next
              <FiChevronRight className="ml-1.5" size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
ClosedLeads.propTypes = {
  leads: PropTypes.object.isRequired,
  viewMyLeadsOnly: PropTypes.bool.isRequired,
  currentUser: PropTypes.shape({ uid: PropTypes.string }),
  users: PropTypes.object.isRequired,
};

export default ClosedLeads;
