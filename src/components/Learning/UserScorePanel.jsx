import React, { useMemo } from "react";
import { FiAward, FiInfo } from "react-icons/fi";

const UserScorePanel = ({ tasks, assignees }) => {
  // Parsing dates to match LDTaskManager sync logic
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    if (dateStr.toDate) return dateStr.toDate();
    return new Date(dateStr);
  };

  const calculateScore = (task) => {
    if (task.status !== "completed") return 0;

    const start = parseDate(task.startDate);
    const due = parseDate(task.dueDate);
    const updated = parseDate(task.updatedAt);

    if (!start || !due || !updated) return 0;

    // 1. Calculate Original Days
    const originalTime = due.getTime() - start.getTime();
    const originalDays = Math.max(1, Math.ceil(originalTime / (1000 * 60 * 60 * 24)));

    // 2. Calculate Days Taken
    const takenTime = updated.getTime() - start.getTime();
    const daysTaken = Math.max(1, Math.ceil(takenTime / (1000 * 60 * 60 * 24)));

    // 3. Base Score = 10 * (Original / Taken)
    let score = 10 * (originalDays / daysTaken);

    // 4. Iteration Penalty
    // If iterations field doesn't exist, assume 0
    const iterations = parseInt(task.iterations || 0);
    if (iterations > 0) {
      score -= iterations;
    }

    // 5. Final Limits (Capped at 10, Min 0)
    if (score > 10) score = 10;
    if (score < 0) score = 0;

    return parseFloat(score.toFixed(2));
  };

  const userScores = useMemo(() => {
    const scores = {};
    
    // Sort assignees to handle potential duplicates or just normalize
    const uniqueAssignees = [...new Set(assignees)];
    
    uniqueAssignees.forEach(user => {
      const userTasks = tasks.filter(t => t.assignedTo === user && t.status === "completed");
      const totalScore = userTasks.reduce((sum, task) => sum + calculateScore(task), 0);
      const avgScore = userTasks.length > 0 ? totalScore / userTasks.length : 0;
      
      scores[user] = {
        total: totalScore.toFixed(1),
        avg: avgScore.toFixed(1),
        count: userTasks.length
      };
    });
    
    return Object.entries(scores).sort((a, b) => b[1].avg - a[1].avg);
  }, [tasks, assignees]);

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="mb-8 p-4 bg-purple-50/50 rounded-lg border border-purple-100 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-purple-900 uppercase tracking-wider mb-1">Performance Scoreboard</h2>
          <p className="text-xs text-purple-600 italic">Scores are calculated based on time efficiency and iteration accuracy.</p>
        </div>
        <div className="bg-white p-2 rounded-lg border border-purple-100 shadow-sm flex items-center gap-2">
            <FiAward className="text-purple-600 text-xl" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">Live Metrics</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userScores.map(([user, data]) => (
          <div key={user} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                    {user?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-sm leading-tight">{user}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{data.count} Tasks Completed</p>
                  </div>
               </div>
               <div className="text-right">
                  <div className="text-xl font-black text-purple-600 leading-none">{data.avg}</div>
                  <div className="text-[8px] font-black text-purple-300 uppercase">Avg Score</div>
               </div>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-gray-400">TOTAL POINTS:</span>
                    <span className="font-black text-gray-700">{data.total}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (parseFloat(data.avg) * 10))}%` }}
                    />
                </div>
            </div>
          </div>
        ))}
        {userScores.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-300 gap-4">
             <FiInfo size={40} className="animate-bounce" />
             <p className="text-xs font-bold uppercase tracking-[0.2em]">No performance data available yet</p>
          </div>
        )}
      </div>
      
      <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100 italic">
          <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">Scoring Rules:</h4>
          <ul className="text-[10px] text-gray-500 space-y-1 ml-2">
            <li>• Base Score = 10 × (Estimated Days / Actual Days Taken)</li>
            <li>• Maximum score per task is capped at 10.0</li>
            <li>• Each iteration logic penalty reduces score by 1 point</li>
            <li>• Only "Completed" tasks contribute to the scoreboard</li>
          </ul>
      </div>
    </div>
  );
};

export default UserScorePanel;
