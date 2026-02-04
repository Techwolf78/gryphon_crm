import React, { useMemo } from "react";

const BudgetDetailTable = ({ budget }) => {
  if (!budget) return null;

  // Helper to format currency
  const formatCurrency = (amount) =>
    `₹${(amount || 0).toLocaleString("en-IN")}`;

  // Helper to process a section's data for the table
  const processSection = (categoryName, data) => {
    if (!data) return [];
    return Object.entries(data).map(([key, val], index) => ({
      category: index === 0 ? categoryName : "", // Only show category on first row
      description: key.replace(/_/g, " ").toUpperCase(),
      allocated: val?.allocated || 0,
      spent: val?.spent || 0,
      remaining: (val?.allocated || 0) - (val?.spent || 0),
      percent:
        val?.allocated > 0
          ? ((val.spent / val.allocated) * 100).toFixed(2) + "%"
          : "0%",
      isFirstRow: index === 0, // Used for styling borders if needed
    }));
  };

  // 1. Prepare Data
  const fixedRows = processSection("Fixed Costs", budget.fixedCosts);
  const deptRows = processSection("Department Expenses", budget.departmentExpenses);
  const csddRows = processSection("CSDD Expenses", budget.csddExpenses);

  // Combine all rows for rendering
  const allRows = [...fixedRows, ...deptRows, ...csddRows];

  // 2. Calculate Totals (Grand Total)
  const totals = useMemo(() => {
    const summary = budget.summary || { totalBudget: 0, totalSpent: 0 };
    const totalAllocated = summary.totalBudget;
    const totalSpent = summary.totalSpent;
    const totalRemaining = totalAllocated - totalSpent;
    const totalPercent =
      totalAllocated > 0
        ? ((totalSpent / totalAllocated) * 100).toFixed(2) + "%"
        : "0%";

    return { totalAllocated, totalSpent, totalRemaining, totalPercent };
  }, [budget]);

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200 mt-6">
      {/* Title Header matching Excel Title */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 text-center">
        <h3 className="text-lg font-bold text-gray-900 uppercase">
          {budget.department} Budget {budget.fiscalYear ? `FY-${budget.fiscalYear}` : ""}
        </h3>
      </div>

      <table className="w-full text-sm text-left">
        <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300">
          <tr>
            <th className="py-3 px-4 border-r border-gray-200">Category</th>
            <th className="py-3 px-4 border-r border-gray-200">Description</th>
            <th className="py-3 px-4 text-right border-r border-gray-200">Amount Approved</th>
            <th className="py-3 px-4 text-center border-r border-gray-200">Spent %</th>
            <th className="py-3 px-4 text-right border-r border-gray-200">Amount Spent</th>
            <th className="py-3 px-4 text-right">Amount Remaining</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {allRows.length > 0 ? (
            allRows.map((row, index) => (
              <tr 
                key={`${row.description}-${index}`} 
                className="hover:bg-gray-50 transition-colors"
              >
                {/* Category Column */}
                <td className="py-3 px-4 font-bold text-gray-800 border-r border-gray-100 bg-gray-50/50 align-top">
                  {row.category}
                </td>

                {/* Description */}
                <td className="py-3 px-4 text-gray-700 border-r border-gray-100 font-medium">
                  {row.description}
                </td>

                {/* Allocated */}
                <td className="py-3 px-4 text-right text-gray-900 border-r border-gray-100">
                  {formatCurrency(row.allocated)}
                </td>

                {/* Spent % */}
                <td className="py-3 px-4 text-center border-r border-gray-100">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                      parseFloat(row.percent) > 90
                        ? "bg-red-100 text-red-700"
                        : parseFloat(row.percent) > 50
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {row.percent}
                  </span>
                </td>

                {/* Spent */}
                <td className="py-3 px-4 text-right text-gray-600 border-r border-gray-100">
                  {formatCurrency(row.spent)}
                </td>

                {/* Remaining */}
                <td className={`py-3 px-4 text-right font-medium ${row.remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(row.remaining)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="py-8 text-center text-gray-500 italic">
                No expense items found in this budget.
              </td>
            </tr>
          )}

          {/* TOTAL ROW (Matches Excel "Total" row style) */}
          <tr className="bg-yellow-100/50 border-t-2 border-gray-300 font-bold text-gray-900">
            <td className="py-4 px-4 uppercase border-r border-gray-300">Total</td>
            <td className="py-4 px-4 border-r border-gray-300"></td>
            <td className="py-4 px-4 text-right border-r border-gray-300">
              {formatCurrency(totals.totalAllocated)}
            </td>
            <td className="py-4 px-4 text-center border-r border-gray-300">
              {totals.totalPercent}
            </td>
            <td className="py-4 px-4 text-right border-r border-gray-300">
              {formatCurrency(totals.totalSpent)}
            </td>
            <td className={`py-4 px-4 text-right ${totals.totalRemaining < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {formatCurrency(totals.totalRemaining)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default BudgetDetailTable;