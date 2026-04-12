import React, { useMemo } from "react";
import { FiArrowLeft } from "react-icons/fi";

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  if (dateStr?.toDate) return dateStr.toDate();
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (dateStr) => {
  const date = parseDate(dateStr);
  if (!date) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatScore = (score) => {
  if (score === null || score === undefined || Number.isNaN(score)) return "-";
  return score.toFixed(2);
};

const getScoreColor = (score) => {
  if (score === null || score === undefined || Number.isNaN(score)) return "text-gray-400";
  if (score >= 9) return "text-emerald-600";
  if (score >= 7) return "text-amber-600";
  return "text-rose-600";
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
  if (iterations > 0) score -= iterations;

  if (score > 10) score = 10;
  if (score < 0) score = 0;

  return Number(score.toFixed(2));
};

const UserScoreDetails = ({ tasks, selectedUser = "all", onBack }) => {
  const filteredTasks = useMemo(() => {
    const normalizedTasks = Array.isArray(tasks) ? tasks : [];
    return normalizedTasks
      .filter((task) => task && task.status === "completed")
      .filter((task) => selectedUser === "all" || task.assignedTo === selectedUser)
      .map((task) => ({
        ...task,
        score: calculateTaskScore(task),
      }))
      .sort((a, b) => {
        const aDate = parseDate(a.updatedAt) || parseDate(a.dueDate) || parseDate(a.startDate) || new Date(0);
        const bDate = parseDate(b.updatedAt) || parseDate(b.dueDate) || parseDate(b.startDate) || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
  }, [tasks, selectedUser]);

  const summary = useMemo(() => {
    const total = filteredTasks.length;
    const average = total > 0 ? filteredTasks.reduce((sum, task) => sum + task.score, 0) / total : null;
    return {
      total,
      average: average !== null ? Number(average.toFixed(2)) : null,
    };
  }, [filteredTasks]);

  return (
    <div className="p-4 bg-white rounded-3xl shadow-[0_18px_50px_rgba(15,23,42,0.06)] border border-slate-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <FiArrowLeft size={16} /> Back to Matrix
          </button>

          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Detailed Performance Dashboard</h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-6">
              View task-level score analytics for {selectedUser === "all" ? "all users" : selectedUser}. Includes completed tasks, dates, categories, classifications, and iteration-adjusted scores.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-2">Completed Tasks</p>
          <p className="text-3xl font-semibold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-2">Average Task Score</p>
          <p className="text-3xl font-semibold text-slate-900">{summary.average !== null ? summary.average.toFixed(2) : "-"}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-2">Selected User</p>
          <p className="text-3xl font-semibold text-slate-900">{selectedUser === "all" ? "All Users" : selectedUser}</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Task</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Category</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Classification</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Iterations</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Start</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Due</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Completed</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                  No completed tasks available for this selection.
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr key={task.id} className="bg-white hover:bg-slate-50">
                  <td className="px-3 py-3 text-sm font-semibold text-slate-900">{task.title || "Untitled task"}</td>
                  <td className="px-3 py-3 text-sm text-slate-600">{task.category || "-"}</td>
                  <td className="px-3 py-3 text-sm text-slate-600">{task.classification || "-"}</td>
                  <td className="px-3 py-3 text-sm text-slate-600">{task.iterations ?? 0}</td>
                  <td className="px-3 py-3 text-sm text-slate-600">{formatDate(task.startDate)}</td>
                  <td className="px-3 py-3 text-sm text-slate-600">{formatDate(task.dueDate)}</td>
                  <td className="px-3 py-3 text-sm text-slate-600">{formatDate(task.updatedAt)}</td>
                  <td className={`px-3 py-3 text-right text-sm font-semibold ${getScoreColor(task.score)}`}>{formatScore(task.score)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserScoreDetails;
