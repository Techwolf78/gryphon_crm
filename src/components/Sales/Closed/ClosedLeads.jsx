import React, { useState, useMemo, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
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

  const filteredLeads = useMemo(() => {
    if (!currentUser) return [];
    return Object.entries(leads)
      .filter(([, lead]) => lead.phase === "closed")
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
  }, [leads, currentUser, filterType, selectedQuarter]);

  const startIdx = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredLeads.slice(startIdx, startIdx + rowsPerPage);
  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, quarterFilter]);

  const achievedValue = useMemo(() => {
    return filteredLeads.reduce((sum, [, lead]) => sum + (lead.totalCost || 0), 0);
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
    await fetchTargets(); // Re-fetch to reflect updated targets
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Closed Deals</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            {["all", "new", "renewal"].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filterType === type
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {type === "all" ? "All" : type === "new" ? "New" : "Renewals"}
              </button>
            ))}
          </div>

          <select
            value={quarterFilter}
            onChange={e => setQuarterFilter(e.target.value)}
            className="px-4 py-2 border rounded-md text-sm bg-white shadow-sm"
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


      <ClosedLeadsProgressBar
        progressPercent={0}
        achievedValue={achievedValue}
        quarterTarget={0}
        formatCurrency={formatCurrency}
      />

      <ClosedLeadsTable
        leads={currentRows}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        viewMyLeadsOnly={viewMyLeadsOnly}
      />

      {filteredLeads.length > rowsPerPage && (
        <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-t gap-4">
          <div className="text-sm text-gray-500">
            Showing <strong>{startIdx + 1}</strong> to{" "}
            <strong>{Math.min(startIdx + rowsPerPage, filteredLeads.length)}</strong> of{" "}
            <strong>{filteredLeads.length}</strong> results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md border text-sm flex items-center ${
                currentPage === 1 ? "border-gray-200 text-gray-400" : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FiChevronLeft className="mr-1" /> Prev
            </button>

            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md border text-sm flex items-center ${
                currentPage === totalPages ? "border-gray-200 text-gray-400" : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Next <FiChevronRight className="ml-1" />
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
