import React, { useEffect, useMemo, useState } from "react";
import { FiAward, FiInfo } from "react-icons/fi";

const CATEGORY_LABELS = [
  "Financial perspective",
  "Customer perspective",
  "Internal Process",
  "Evolving"
];

const CLASSIFICATION_LABELS = [
  "Quality",
  "Delivery",
  "Inventory",
  "Performance"
];

const CATEGORY_MAX_POINTS = {
  "Financial perspective": 12,
  "Customer perspective": 10,
  "Internal Process": 10,
  "Evolving": 8
};

const CATEGORY_WEIGHTS = {
  "Financial perspective": 0.3,
  "Customer perspective": 0.25,
  "Internal Process": 0.25,
  "Evolving": 0.2
};

const normalizeText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
};

const buildLookup = (values) =>
  values.reduce((lookup, value) => {
    lookup[normalizeText(value)] = value;
    return lookup;
  }, {});

const CATEGORY_LOOKUP = buildLookup(CATEGORY_LABELS);
const CLASSIFICATION_LOOKUP = buildLookup(CLASSIFICATION_LABELS);

const formatScore = (score) => {
  if (score === null || score === undefined || Number.isNaN(score)) return "-";
  return score.toFixed(2);
};

const getScoreColor = (score) => {
  if (score === null || score === undefined || Number.isNaN(score)) return "text-gray-400";
  if (score >= 9) return "text-emerald-600 bg-emerald-100";
  if (score >= 7) return "text-amber-600 bg-amber-100";
  return "text-rose-600 bg-rose-100";
};

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  if (dateStr?.toDate) return dateStr.toDate();
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDateOnlyUtc = (date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const inclusiveDayCount = (start, end) => {
  const startDate = getDateOnlyUtc(start);
  const endDate = getDateOnlyUtc(end);
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
  return Math.max(0, diff);
};

const calculateTaskScore = (task) => {
  if (!task || task.status !== "completed") return 0;

  const start = parseDate(task.startDate);
  const due = parseDate(task.dueDate);
  const updated = parseDate(task.updatedAt);

  if (!start || !due || !updated) return 0;

  const originalDays = Math.max(1, inclusiveDayCount(start, due));
  const daysTaken = Math.max(1, inclusiveDayCount(start, updated));

  let score = 10 * (originalDays / daysTaken);

  const iterations = Number(task.iterations) || 0;
  if (iterations > 0) {
    score -= iterations;
  }

  if (score > 10) score = 10;
  if (score < 0) score = 0;

  return Number(score.toFixed(2));
};

const getCanonicalCategory = (value) => CATEGORY_LOOKUP[normalizeText(value)] || null;
const getCanonicalClassification = (value) => CLASSIFICATION_LOOKUP[normalizeText(value)] || null;

const buildMatrix = (tasks, selectedUser) => {
  const normalizedTasks = Array.isArray(tasks) ? tasks : [];
  const filteredTasks = normalizedTasks.filter((task) => {
    if (!task || task.status !== "completed") return false;
    if (selectedUser && selectedUser !== "all" && task.assignedTo !== selectedUser) return false;
    return true;
  });

  const matrixData = CLASSIFICATION_LABELS.reduce((rows, classification) => {
    rows[classification] = CATEGORY_LABELS.reduce((cells, category) => {
      cells[category] = { sum: 0, count: 0 };
      return cells;
    }, {});
    return rows;
  }, {});

  const categoryTotals = CATEGORY_LABELS.reduce((totals, category) => {
    totals[category] = { sum: 0, count: 0 };
    return totals;
  }, {});

  filteredTasks.forEach((task) => {
    const category = getCanonicalCategory(task.category);
    const classification = getCanonicalClassification(task.classification);
    if (!category || !classification) return;

    const score = calculateTaskScore(task);

    matrixData[classification][category].sum += score;
    matrixData[classification][category].count += 1;

    categoryTotals[category].sum += score;
    categoryTotals[category].count += 1;
  });

  const matrix = CLASSIFICATION_LABELS.reduce((rows, classification) => {
    rows[classification] = CATEGORY_LABELS.reduce((cells, category) => {
      const cell = matrixData[classification][category];
      cells[category] = cell.count > 0 ? Number((cell.sum / cell.count).toFixed(2)) : null;
      return cells;
    }, {});
    return rows;
  }, {});

  const categoryAverages = CATEGORY_LABELS.reduce((averages, category) => {
    const total = categoryTotals[category];
    averages[category] = total.count > 0 ? Number((total.sum / total.count).toFixed(2)) : null;
    return averages;
  }, {});

  return { matrix, categoryAverages, completedCount: filteredTasks.length };
};

const calculateWeightedScores = (categoryAverages) => {
  const weighted = CATEGORY_LABELS.reduce((result, category) => {
    const avg = categoryAverages[category];
    const maxPoints = CATEGORY_MAX_POINTS[category] || 0;
    const weightedScore = avg !== null ? Number(((avg / 10) * maxPoints).toFixed(2)) : 0;

    result[category] = {
      average: avg,
      weightedScore,
      maxPoints,
      weight: CATEGORY_WEIGHTS[category] || 0
    };
    return result;
  }, {});

  const totalScore = Number(
    CATEGORY_LABELS.reduce((sum, category) => sum + weighted[category].weightedScore, 0).toFixed(2)
  );

  const totalMax = CATEGORY_LABELS.reduce((sum, category) => sum + (CATEGORY_MAX_POINTS[category] || 0), 0);
  const percentage = totalMax > 0 ? Number(((totalScore / totalMax) * 100).toFixed(2)) : 0;

  return { weighted, totalScore, totalMax, percentage };
};

const UserScorePanel = ({ tasks, assignees, onViewDetails }) => {
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (selectedUser !== null) return;
    if (Array.isArray(assignees) && assignees.length > 0) {
      setSelectedUser(assignees[0]);
    } else {
      setSelectedUser("all");
    }
  }, [assignees, selectedUser]);

  const activeUser = selectedUser ?? "all";

  const { matrix, categoryAverages, completedCount } = useMemo(
    () => buildMatrix(tasks, activeUser),
    [tasks, activeUser]
  );

  const { weighted, totalScore, percentage } = useMemo(
    () => calculateWeightedScores(categoryAverages),
    [categoryAverages]
  );

  const availableUsers = useMemo(() => {
    const unique = Array.isArray(assignees) ? [...new Set(assignees.filter(Boolean))] : [];
    return ["all", ...unique];
  }, [assignees]);

  return (
    <div className="p-4 bg-white rounded-3xl shadow-[0_18px_50px_rgba(15,23,42,0.06)] border border-slate-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">User Performance Matrix</h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-6">
              Select a user to view category classification scores, weighted metrics, and a final performance percentage—modeled after your Excel score matrix.
            </p>
          </div>
        </div>

        <div className="w-full max-w-xs">
          <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-1">
            Select user
          </label>
          <select
            value={activeUser}
            onChange={(event) => setSelectedUser(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:bg-white"
          >
            {availableUsers.map((user) => (
              <option key={user} value={user}>
                {user === "all" ? "All Users" : user}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Performance Matrix</h2>
              <p className="text-sm text-slate-500">Classification rows and category columns show average completed task scores.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              {completedCount} Completed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th className="sticky top-0 bg-slate-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Classification</th>
                  {CATEGORY_LABELS.map((category) => (
                    <th key={category} className="bg-slate-100 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 text-center">
                      {category.replace(" perspective", "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CLASSIFICATION_LABELS.map((classification) => (
                  <tr key={classification} className="border-t border-slate-200">
                    <td className="px-3 py-2 text-sm font-semibold text-slate-800">{classification}</td>
                    {CATEGORY_LABELS.map((category) => {
                      const cellValue = matrix[classification]?.[category];
                      return (
                        <td key={`${classification}-${category}`} className="px-2 py-2 text-center">
                          <span className={`inline-flex min-w-16 justify-center rounded-full px-2 py-1.5 text-xs font-semibold ${getScoreColor(cellValue)}`}>
                            {formatScore(cellValue)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-3xl bg-white p-3 shadow-inner shadow-slate-100/80 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Weighted Score Summary</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORY_LABELS.map((category) => (
                <div key={category} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">{category.split(" ")[0]}</p>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900">{formatScore(categoryAverages[category])}</div>
                    <div className="text-xs text-slate-500">Avg score</div>
                    <div className="text-sm font-semibold text-slate-900">{weighted[category]?.weightedScore.toFixed(2)}</div>
                    <div className="text-xs text-slate-500">Weighted</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 to-slate-800 p-4 text-white shadow-xl shadow-slate-900/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Final Summary</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight">{totalScore.toFixed(2)}</h2>
                <p className="mt-1 text-sm text-slate-300">Total weighted performance score for {activeUser === "all" ? "all users" : activeUser}.</p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="rounded-3xl bg-white/10 px-4 py-3 text-sm font-semibold text-emerald-200 ring-1 ring-white/10">
                  {percentage.toFixed(2)}%
                </div>
                <button
                  type="button"
                  onClick={() => onViewDetails?.(activeUser)}
                  className="rounded-2xl bg-white px-2 py-1 text-[10px] font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                >
                  View Detailed
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Progress</span>
                <span>{percentage.toFixed(2)}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-700/40">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                  style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                />
              </div>
            </div>
            <div className="mt-3 rounded-3xl bg-slate-900/80 p-3 text-sm text-slate-300 border border-white/10">
              <p className="font-semibold text-slate-100">Scoring distribution</p>
              <div className="mt-2 grid gap-2 text-xs text-slate-400">
                {CATEGORY_LABELS.map((category) => (
                  <div key={`weight-${category}`} className="flex items-center justify-between text-[11px]">
                    <span>{category}</span>
                    <span>{Math.round((CATEGORY_WEIGHTS[category] || 0) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Notes</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Only completed tasks are included in the matrix.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                Each task score is capped between 0 and 10 and reduced by iteration penalty.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                Empty category/classification combinations render as &quot;-&quot;.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Calculation rules</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-white p-3 border border-slate-200">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-2">Task score</p>
            <p className="text-sm text-slate-600">10 × (originalDays / daysTaken), capped to 10 and reduced by task iterations.</p>
          </div>
          <div className="rounded-3xl bg-white p-3 border border-slate-200">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-2">Weighted score</p>
            <p className="text-sm text-slate-600">Each category uses average score and max points to compute the final total percentage.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserScorePanel;
