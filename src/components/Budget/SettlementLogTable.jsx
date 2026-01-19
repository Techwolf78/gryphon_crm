// FILE: /components/budget/csdd/SettlementLogTable.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  limit, // 1. Import limit
} from "firebase/firestore";
import { db } from "../../firebase";
import { Download, Calendar, Filter, ChevronDown } from "lucide-react"; // Added ChevronDown for UI
import { exportSettlementLogs } from "./utils/exportSettlementRecords";

export default function SettlementLogTable({ budgetId, isHR = true }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(20); // 2. State for pagination

  // Default: Start of current month to End of current month
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });

  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  // 3. Reset limit when filters change
  useEffect(() => {
    setLimitCount(20);
  }, [startDate, endDate, budgetId, isHR]);

  useEffect(() => {
    setLoading(true); // Show loading when fetching more
    let q;

    const startTs = new Date(startDate);
    startTs.setHours(0, 0, 0, 0);

    const endTs = new Date(endDate);
    endTs.setHours(23, 59, 59, 999);

    if (isHR) {
      // === HR GLOBAL VIEW ===
      q = query(
        collectionGroup(db, "settlement_logs"),
        where("timestamp", ">=", Timestamp.fromDate(startTs)),
        where("timestamp", "<=", Timestamp.fromDate(endTs)),
        orderBy("timestamp", "desc"),
        limit(limitCount), // 4. Apply Limit
      );
    } else if (budgetId) {
      // === SPECIFIC BUDGET VIEW ===
      q = query(
        collection(db, "department_budgets", budgetId, "settlement_logs"),
        orderBy("timestamp", "desc"),
        limit(limitCount), // 4. Apply Limit
      );
    } else {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedLogs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLogs(fetchedLogs);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching logs:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [budgetId, isHR, startDate, endDate, limitCount]); // Added limitCount dependency

  // --- Handlers ---
  const handleExport = () => {
    let title = "Settlement Logs";
    if (isHR) {
      title = `Settlements Audit (${startDate} to ${endDate})`;
    } else {
      title = `Budget Settlement History`;
    }
    exportSettlementLogs(logs, title);
  };

  const handleLoadMore = () => {
    setLimitCount((prev) => prev + 20);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-fadeIn flex flex-col h-full">
      {/* Header & Controls */}
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            {isHR ? "Global Settlement Audit" : "Settlement History"}
          </h3>
          <p className="text-sm text-gray-500">
            {isHR
              ? "Viewing records across all departments"
              : "Viewing records for this budget cycle"}
          </p>
        </div>

        {/* Controls: Date Range & Export */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {isHR && (
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div className="flex flex-col">
                <label className="text-[10px] text-gray-400 font-medium uppercase leading-none">
                  From
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm font-medium text-gray-700 bg-transparent border-none p-0 focus:ring-0 cursor-pointer outline-none"
                />
              </div>
              <div className="w-px h-8 bg-gray-200 mx-2"></div>
              <div className="flex flex-col">
                <label className="text-[10px] text-gray-400 font-medium uppercase leading-none">
                  To
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm font-medium text-gray-700 bg-transparent border-none p-0 focus:ring-0 cursor-pointer outline-none"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg 
                       hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-[42px]"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Data Table */}
      {logs.length === 0 && !loading ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-900 font-medium">No records found</p>
          <p className="text-gray-500 text-sm mt-1">
            {isHR
              ? "Try adjusting the date range."
              : "No settlements have been recorded yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold border-b">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3">Context</th>
                  <th className="px-6 py-3">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    {/* Date */}
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {log.timestamp?.toDate().toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Employee */}
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {log.employeeName}
                      <div className="text-xs text-gray-400 font-normal">
                        ID: {log.employeeId}
                      </div>
                    </td>

                    {/* Action Mode Badge */}
                    <td className="px-6 py-4">
                      {log.mode === "return" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Refunded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                          Carried Fwd
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 text-right font-mono font-medium text-gray-700">
                      ₹{Number(log.amount).toLocaleString("en-IN")}
                    </td>

                    {/* Context */}
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      <span className="bg-gray-100 px-2 py-1 rounded text-gray-600">
                        {log.component || "N/A"}
                      </span>
                      {isHR && log.budgetId && (
                        <div
                          className="mt-1 text-[10px] text-gray-400 truncate max-w-[100px]"
                          title={log.budgetId}
                        >
                          {log.budgetId}
                        </div>
                      )}
                    </td>

                    {/* Admin */}
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {log.performedByName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. Load More Button */}
          {logs.length >= limitCount && (
            <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {loading ? "Loading..." : "Load More Records"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Footer Info */}
      <div className="px-6 py-3 bg-white border-t border-gray-200 text-xs text-gray-500 flex justify-between">
        <span>Showing {logs.length} records</span>
        {isHR && <span>Filter by date range to refine search</span>}
      </div>
    </div>
  );
}
