// ClosedLeads.js
import React, { useState, useMemo, useEffect } from "react";
import { FiFilter, FiDollarSign, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import PropTypes from "prop-types";
import { db } from "../../firebase"; // your firebase.js file
import { collection, getDocs } from "firebase/firestore";

const ClosedLeads = ({ leads, viewMyLeadsOnly, currentUser }) => {
  const [filterType, setFilterType] = useState("all");
  const [quarterFilter, setQuarterFilter] = useState("current");
  const [targets, setTargets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Fetch quarterly targets from Firestore
  useEffect(() => {
    const fetchTargets = async () => {
      const snapshot = await getDocs(collection(db, "quarterly_targets"));
      const arr = snapshot.docs.map(doc => doc.data());
      setTargets(arr);
    };
    fetchTargets();
  }, []);

  // Helpers for date, quarter, FY
  const getFinancialYearFromDate = date => {
    const y = date.getFullYear();
    const m = date.getMonth();
    return m >= 3 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  };

  const getQuarter = date => {
    const m = date.getMonth() + 1;
    if (m >= 4 && m <= 6) return "Q1";
    if (m >= 7 && m <= 9) return "Q2";
    if (m >= 10 && m <= 12) return "Q3";
    return "Q4";
  };

  const getQuarterRange = (quarter, fy) => {
    const [startY, nextY] = fy.split("-").map(Number);
    switch (quarter) {
      case "Q1": return [new Date(`${startY}-04-01`), new Date(`${startY}-06-30T23:59:59`)];
      case "Q2": return [new Date(`${startY}-07-01`), new Date(`${startY}-09-30T23:59:59`)];
      case "Q3": return [new Date(`${startY}-10-01`), new Date(`${startY}-12-31T23:59:59`)];
      case "Q4": return [new Date(`${nextY}-01-01`), new Date(`${nextY}-03-31T23:59:59`)];
      default: return null;
    }
  };

  const getCumulativeTarget = (fy, upTo) => {
    const quartersOrder = ["Q1", "Q2", "Q3", "Q4"];
    const idx = quartersOrder.indexOf(upTo);
    if (idx === -1) return 0;
    return quartersOrder.slice(0, idx + 1).reduce((sum, q) => {
      const rec = targets.find(t => t.financial_year === fy && t.quarter === q);
      return sum + (rec?.target_amount || 0);
    }, 0);
  };

  // Determine selected FY and quarter
  const today = new Date();
  const currentQuarter = getQuarter(today);
  const activeQuarter = quarterFilter === "current" ? currentQuarter : quarterFilter;

  const isPY = quarterFilter.startsWith("PY_");
  const selectedFY = isPY
    ? quarterFilter.split("_")[1]
    : getFinancialYearFromDate(today);

  const filteredLeads = useMemo(() => {
    return Object.entries(leads)
      .filter(([, lead]) => lead.phase === "closed")
      .filter(([, lead]) => !viewMyLeadsOnly || lead.assignedTo?.uid === currentUser?.uid)
      .filter(([, lead]) => filterType === "all" || lead.closureType === filterType)
      .filter(([, lead]) => {
        if (activeQuarter === "all") return true;
        const range = getQuarterRange(activeQuarter, selectedFY);
        if (!range) return false;
        const d = new Date(lead.closedDate);
        return d >= range[0] && d <= range[1];
      });
  }, [leads, viewMyLeadsOnly, currentUser?.uid, filterType, activeQuarter, selectedFY]);

  const startIdx = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredLeads.slice(startIdx, startIdx + rowsPerPage);
  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);

  useEffect(() => setCurrentPage(1), [filterType, viewMyLeadsOnly, quarterFilter]);

  const achievedValue = filteredLeads.reduce((sum, [, lead]) => sum + (lead.amount || 0), 0);
  const quarterTarget = activeQuarter === "all"
    ? getCumulativeTarget(selectedFY, "Q4")
    : getCumulativeTarget(selectedFY, activeQuarter);

  const deficitValue = quarterTarget - achievedValue;
  const progressPercent = quarterTarget > 0 ? Math.min(100, (achievedValue / quarterTarget) * 100) : 0;

  const formatCurrency = amt =>
    typeof amt === "number"
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amt)
      : "-";

  const formatDate = ts =>
    ts ? new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-";

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Closed Deals</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filterType === "all"
              ? `All ${viewMyLeadsOnly ? "your" : "team"} closed deals`
              : filterType === "new"
              ? `New customer acquisitions (${viewMyLeadsOnly ? "your" : "team"})`
              : `Renewal contracts (${viewMyLeadsOnly ? "your" : "team"})`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Closure Type */}
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            {["all", "new", "renewal"].map(type => (
              <button key={type} onClick={() => setFilterType(type)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filterType === type ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
                }`}>
                {type === "all" ? "All" : type === "new" ? "New" : "Renewals"}
              </button>
            ))}
          </div>
          {/* Quarter Filter */}
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            {["current", "Q1", "Q2", "Q3", "Q4", "all"].map(q => (
              <button key={q} onClick={() => setQuarterFilter(q)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeQuarter === (q === "current" ? currentQuarter : q)
                    ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
                }`}>
                {q === "current" ? "Current" : q}
              </button>
            ))}
            {/* PY selector example */}
            <button onClick={() => setQuarterFilter(`PY_${selectedFY}`)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                quarterFilter === `PY_${selectedFY}` ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
              }`}>
              PY
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-5 bg-gray-50 border-b">
        {[
          { label: "Achieved", value: formatCurrency(achievedValue), color: "blue" },
          { label: "Target", value: formatCurrency(quarterTarget), color: "green" },
          { label: "Deficit", value: formatCurrency(deficitValue < 0 ? 0 : deficitValue), color: "red" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white p-4 rounded-lg border">
            <div className="flex items-center">
              <div className={`p-3 rounded-full bg-${color}-50 text-${color}-600`}>
                <FiDollarSign size={20} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="text-xl font-semibold text-gray-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-3 bg-gray-50 border-b">
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div style={{ width: `${progressPercent}%` }} className="bg-blue-500 h-2.5 rounded-full" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {["Institution", "Location", "Closed Date", "Amount", "Owner"].map(h => <th key={h} className="px-6 py-3">{h}</th>)}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentRows.length > 0 ? currentRows.map(([id, lead]) => (
              <tr key={id} className="hover:bg-gray-50">
                <td className="px-6 py-4 flex items-center">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                    {lead.businessName?.charAt(0) || "?"}
                  </div>
                  <div className="ml-4">
                    <div className="font-medium text-gray-900">{lead.businessName || "-"}</div>
                    <div className="text-xs text-gray-500">
                      {lead.closureType === "new"
                        ? <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-xs">New</span>
                        : <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs">Renewal</span>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{lead.city || "-"}</div>
                  <div className="text-xs text-gray-500">{lead.state || ""}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{formatDate(lead.closedDate)}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{formatCurrency(lead.amount)}</td>
                <td className="px-6 py-4 flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium">
                    {lead.assignedTo?.name?.split(" ").map(n => n[0]).join("") || "?"}
                  </div>
                  <div className="ml-3 text-sm font-medium text-gray-900">{lead.assignedTo?.name || "-"}</div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="py-12 text-center">
                  <FiFilter className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 font-medium text-gray-900">No closed deals found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {filterType === "all"
                      ? `There are currently no ${viewMyLeadsOnly ? "your" : "team"} closed deals.`
                      : `No ${filterType} ${viewMyLeadsOnly ? "your" : "team"} closed deals found.`}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredLeads.length > rowsPerPage && (
        <div className="px-6 py-4 flex justify-between items-center border-t">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{startIdx + 1}</span> to <span className="font-medium">{startIdx + currentRows.length}</span> of <span className="font-medium">{filteredLeads.length}</span> results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md border text-sm font-medium flex items-center ${
                currentPage === 1 ? "border-gray-200 text-gray-400 cursor-not-allowed" : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FiChevronLeft className="mr-1" size={16}/> Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md border text-sm font-medium flex items-center ${
                currentPage === totalPages ? "border-gray-200 text-gray-400 cursor-not-allowed" : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Next <FiChevronRight className="ml-1" size={16}/>
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
  currentUser: PropTypes.shape({ uid: PropTypes.string }).isRequired,
};

export default ClosedLeads;
