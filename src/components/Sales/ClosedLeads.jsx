// ClosedLeads.js
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  FiFilter,
  FiDollarSign,
  FiChevronLeft,
  FiChevronRight,
  FiLoader,
} from "react-icons/fi";
import PropTypes from "prop-types";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import TargetWithEdit from "./TargetWithEdit";

const ClosedLeads = ({ leads, viewMyLeadsOnly, currentUser, users }) => {
  const [filterType, setFilterType] = useState("all");
  const [quarterFilter, setQuarterFilter] = useState("current");
  const [targets, setTargets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const rowsPerPage = 10;

  // Fetch quarterly targets from Firestore
  useEffect(() => {
    const fetchTargets = async () => {
      try {
        setLoadingTargets(true);
        const snapshot = await getDocs(collection(db, "quarterly_targets"));
        const arr = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTargets(arr);
      } catch (error) {
        console.error("Error fetching targets:", error);
      } finally {
        setLoadingTargets(false);
      }
    };
    fetchTargets();
  }, []);

  // Helpers for date, quarter, FY
  const getFinancialYearFromDate = useCallback((date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    return m >= 3 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  }, []);

  const getQuarter = useCallback((date) => {
    const m = date.getMonth() + 1;
    if (m >= 4 && m <= 6) return "Q1";
    if (m >= 7 && m <= 9) return "Q2";
    if (m >= 10 && m <= 12) return "Q3";
    return "Q4";
  }, []);

  const getQuarterRange = useCallback((quarter, fy) => {
    const [startY, nextY] = fy.split("-").map(Number);
    switch (quarter) {
      case "Q1":
        return [
          new Date(`${startY}-04-01`),
          new Date(`${startY}-06-30T23:59:59`),
        ];
      case "Q2":
        return [
          new Date(`${startY}-07-01`),
          new Date(`${startY}-09-30T23:59:59`),
        ];
      case "Q3":
        return [
          new Date(`${startY}-10-01`),
          new Date(`${startY}-12-31T23:59:59`),
        ];
      case "Q4":
        return [
          new Date(`${nextY}-01-01`),
          new Date(`${nextY}-03-31T23:59:59`),
        ];
      default:
        return null;
    }
  }, []);

const getCumulativeTarget = useCallback(
  (fy, upTo) => {
    const quartersOrder = ["Q1", "Q2", "Q3", "Q4"];
    const idx = quartersOrder.indexOf(upTo);
    if (idx === -1) return 0;

    // Calculate base target (sum of targets up to the specified quarter)
    const baseTarget = quartersOrder.slice(0, idx + 1).reduce((sum, q) => {
      const rec = targets.find(
        (t) => t.financial_year === fy && t.quarter === q
      );
      return sum + (rec?.target_amount || 0);
    }, 0);

    // If it's Q1, just return the base target (no previous quarter to carry deficit from)
    if (idx === 0) return baseTarget;

    // Calculate deficit from previous quarters
    let carriedDeficit = 0;
    for (let i = 0; i < idx; i++) {
      const quarter = quartersOrder[i];
      const range = getQuarterRange(quarter, fy);
      if (!range) continue;

      // Calculate achieved for this quarter
      const quarterAchieved = Object.entries(leads)
        .filter(([, lead]) => lead.phase === "closed")
        .filter(
          ([, lead]) =>
            !viewMyLeadsOnly || lead.assignedTo?.uid === currentUser?.uid
        )
        .filter(([, lead]) => {
          const d = new Date(lead.closedDate);
          return d >= range[0] && d <= range[1];
        })
        .reduce((sum, [, lead]) => sum + (lead.totalCost || 0), 0);

      // Get this quarter's target
      const quarterTarget = targets.find(
        (t) => t.financial_year === fy && t.quarter === quarter
      )?.target_amount || 0;

      // Add any deficit to carriedDeficit
      const deficit = quarterTarget - quarterAchieved;
      if (deficit > 0) {
        carriedDeficit += deficit;
      }
    }

    return baseTarget + carriedDeficit;
  },
  [targets, leads, viewMyLeadsOnly, currentUser?.uid, getQuarterRange]
);

  // Determine selected FY and quarter
  const today = new Date();
  const currentQuarter = getQuarter(today);
  const activeQuarter =
    quarterFilter === "current" ? currentQuarter : quarterFilter;

  const isPY = quarterFilter.startsWith("PY_");
  const selectedFY = isPY
    ? quarterFilter.split("_")[1]
    : getFinancialYearFromDate(today);

  const filteredLeads = useMemo(() => {
    return Object.entries(leads)
      .filter(([, lead]) => lead.phase === "closed")
      .filter(
        ([, lead]) =>
          !viewMyLeadsOnly || lead.assignedTo?.uid === currentUser?.uid
      )
      .filter(
        ([, lead]) => filterType === "all" || lead.closureType === filterType
      )
      .filter(([, lead]) => {
        if (activeQuarter === "all") return true;
        const range = getQuarterRange(activeQuarter, selectedFY);
        if (!range) return false;
        const d = new Date(lead.closedDate);
        return d >= range[0] && d <= range[1];
      })
      .sort(([, a], [, b]) => new Date(b.closedDate) - new Date(a.closedDate));
  }, [
    leads,
    viewMyLeadsOnly,
    currentUser?.uid,
    filterType,
    activeQuarter,
    selectedFY,
    getQuarterRange,
  ]);

  const startIdx = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredLeads.slice(startIdx, startIdx + rowsPerPage);
  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, viewMyLeadsOnly, quarterFilter]);

  const achievedValue = useMemo(
    () =>
      filteredLeads.reduce((sum, [, lead]) => sum + (lead.totalCost || 0), 0),
    [filteredLeads]
  );

const quarterTarget = useMemo(
  () =>
    activeQuarter === "all"
      ? getCumulativeTarget(selectedFY, "Q4")
      : getCumulativeTarget(selectedFY, activeQuarter),
  [activeQuarter, selectedFY, getCumulativeTarget]
);

  const deficitValue = quarterTarget - achievedValue;
  const progressPercent =
    quarterTarget > 0
      ? Math.min(100, (achievedValue / quarterTarget) * 100)
      : 0;

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

  const handleTargetUpdate = (updatedTarget) => {
    setTargets((prev) =>
      prev.map((t) =>
        t.financial_year === updatedTarget.financial_year &&
        t.quarter === updatedTarget.quarter
          ? updatedTarget
          : t
      )
    );
  };

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
              ? `New customer acquisitions (${
                  viewMyLeadsOnly ? "your" : "team"
                })`
              : `Renewal contracts (${viewMyLeadsOnly ? "your" : "team"})`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Closure Type */}
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            {["all", "new", "renewal"].map((type) => (
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
          {/* Quarter Filter Dropdown */}
          <div className="relative">
            <select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8"
            >
              <option value="current">Current Quarter</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
              <option value="all">All Quarters</option>
              <option value={`PY_${getFinancialYearFromDate(today)}`}>
                Previous Year
              </option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-5 bg-gray-50 border-b">
        {[
          {
            label: "Achieved",
            value: formatCurrency(achievedValue),
            color: "blue",
          },
          {
            label: "Target",
            value: loadingTargets ? (
              <FiLoader className="animate-spin" />
            ) : (
              <TargetWithEdit
                value={quarterTarget}
                fy={selectedFY}
                quarter={activeQuarter === "all" ? "Q4" : activeQuarter}
                currentUser={currentUser}
                users={users}
                onUpdate={handleTargetUpdate}
              />
            ),
            color: "green",
          },
          {
            label: "Deficit",
            value: formatCurrency(deficitValue < 0 ? 0 : deficitValue),
            color: "red",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div
                className={`p-3 rounded-full bg-${color}-50 text-${color}-600`}
              >
                <FiDollarSign size={20} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <div className="text-xl font-semibold text-gray-900">
                  {value}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-3 bg-gray-50 border-b">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            {progressPercent.toFixed(1)}%
          </span>
          <span className="text-sm text-gray-500">
            {formatCurrency(achievedValue)} of {formatCurrency(quarterTarget)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            style={{ width: `${progressPercent}%` }}
            className={`h-2.5 rounded-full ${
              progressPercent >= 100 ? "bg-green-500" : "bg-blue-500"
            }`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Institution",
                "Location",
                "Closed Date",
                "Amount",
                "Owner",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentRows.length > 0 ? (
              currentRows.map(([id, lead]) => (
                <tr key={id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium flex-shrink-0">
                        {lead.businessName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900 truncate max-w-xs">
                          {lead.businessName || "-"}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {lead.closureType === "new" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              New
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Renewal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {lead.city || "-"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {lead.state || ""}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(lead.closedDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {formatCurrency(lead.totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium flex-shrink-0">
                        {lead.assignedTo?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "?"}
                      </div>
                      <div className="ml-3 text-sm font-medium text-gray-900 truncate max-w-xs">
                        {lead.assignedTo?.name || "-"}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="py-12 text-center">
                  <FiFilter className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 font-medium text-gray-900">
                    No closed deals found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {filterType === "all"
                      ? `There are currently no ${
                          viewMyLeadsOnly ? "your" : "team"
                        } closed deals.`
                      : `No ${filterType} ${
                          viewMyLeadsOnly ? "your" : "team"
                        } closed deals found.`}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredLeads.length > rowsPerPage && (
        <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-t gap-4">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{startIdx + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(startIdx + rowsPerPage, filteredLeads.length)}
            </span>{" "}
            of <span className="font-medium">{filteredLeads.length}</span>{" "}
            results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md border text-sm font-medium flex items-center transition-colors ${
                currentPage === 1
                  ? "border-gray-200 text-gray-400 cursor-not-allowed"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FiChevronLeft className="mr-1" size={16} /> Previous
            </button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-md text-sm font-medium ${
                      currentPage === pageNum
                        ? "bg-blue-500 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <span className="px-2">...</span>
              )}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-8 h-8 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  {totalPages}
                </button>
              )}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md border text-sm font-medium flex items-center transition-colors ${
                currentPage === totalPages
                  ? "border-gray-200 text-gray-400 cursor-not-allowed"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Next <FiChevronRight className="ml-1" size={16} />
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
