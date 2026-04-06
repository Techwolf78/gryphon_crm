import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import {
  FiPaperclip,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiRefreshCw,
  FiAlertCircle,
  FiFileText,
  FiPlus,
  FiTrash2,
  FiCalendar,
  FiList,
  FiGrid,
  FiArrowLeft,
  FiArrowRight,
  FiMoreVertical,
  FiUser
} from "react-icons/fi";
import { Hourglass, CheckCircle, Clock, Users, FileText, XCircle, Circle, TrendingUp, Layout, Calendar as CalendarIcon, List } from "lucide-react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  runTransaction,
  getDocs
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { ldTaskCategories } from "./ldTaskData";

// --- Helper Functions ---

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  if (dateStr.toDate) return dateStr.toDate();
  if (typeof dateStr === 'string') {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [p1, p2, p3] = parts.map(Number);
      if (p1 > 31) { // YYYY-MM-DD
        return new Date(p1, p2 - 1, p3);
      } else if (p3 > 31) { // DD-MM-YYYY
        return new Date(p3, p2 - 1, p1);
      }
    }
    return new Date(dateStr);
  }
  return null;
};

// Predefined task descriptions
const taskDescriptions = [
  "Coordinate and schedule training batches for optimal resource utilization",
  "Allocate trainers to sessions based on expertise and availability",
  "Prepare and organize course materials for upcoming sessions",
  "Track and maintain student attendance records",
  "Manage certification process and documentation",
  "Collect and analyze feedback from training sessions",
  "Monitor live sessions for quality and engagement",
  "Conduct comprehensive quality audits of training programs",
  "Review and evaluate trainer performance metrics",
  "Design curriculum structure and learning objectives",
  "Create assessments and evaluation criteria",
  "Update Learning Management System with new content",
  "Map and organize educational resources",
  "Generate daily operational reports",
  "Prepare weekly status updates for stakeholders",
  "Facilitate communication with internal stakeholders",
  "Maintain comprehensive documentation and records"
];

// Flatten all tasks for title dropdown
const allTasks = ldTaskCategories.flatMap(category => category.tasks);
import { toast } from "react-toastify";

// --- UI Components ---

const Column = ({ id, title, tasks, children }) => {
  const { setNodeRef } = useDroppable({ id });

  const statusColors = {
    not_started: "bg-gray-400",
    in_progress: "bg-blue-500",
    completed: "bg-green-500",
    cancelled: "bg-red-500"
  };

  const statusBgColors = {
    not_started: "bg-gray-50",
    in_progress: "bg-blue-50",
    completed: "bg-green-50",
    cancelled: "bg-red-50"
  };

  return (
    <div
      className={`${statusBgColors[id] || "bg-gray-50"} rounded-2xl p-2 min-h-[200px] transition-colors shadow-sm`}
    >
      <h3 className="font-semibold text-gray-900 mb-2 flex items-center text-sm">
        <div className={`w-3 h-3 ${statusColors[id] || "bg-gray-400"} rounded-full mr-3`}></div>
        {title}
        <span
          className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${
            id === "not_started"
              ? "bg-gray-200 text-gray-700"
              : id === "in_progress"
                ? "bg-blue-200 text-blue-700"
                : id === "completed"
                  ? "bg-green-200 text-green-700"
                  : "bg-red-200 text-red-700"
          }`}
        >
          {tasks.length}
        </span>
      </h3>
      <div ref={setNodeRef} className="space-y-1.5 min-h-[180px]">
        {children}
      </div>
    </div>
  );
};

const TaskCard = ({
  task,
  handleDelete,
  moveTask,
  onEditTask,
  user
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : "auto",
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const canEdit = ["Admin", "Director", "Direc2", "Head"].includes(user?.role) || task.assignedTo === user?.displayName;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";
  const overdueDays = Math.floor((new Date() - new Date(task.dueDate)) / (1000 * 60 * 60 * 24));

  const getActionButtons = (status) => {
    switch (status) {
      case "not_started":
        return (
          <>
            <button onClick={() => moveTask(task.id, "in_progress")} className="px-1.5 py-0.5 text-[8px] font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors uppercase shadow-sm">Start</button>
            <button onClick={() => moveTask(task.id, "cancelled")} className="px-1.5 py-0.5 text-[8px] font-bold bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors uppercase">Cancel</button>
          </>
        );
      case "in_progress":
        return (
          <>
            <button onClick={() => moveTask(task.id, "completed")} className="px-1.5 py-0.5 text-[8px] font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors uppercase shadow-sm">Complete</button>
            <button onClick={() => moveTask(task.id, "not_started")} className="px-1.5 py-0.5 text-[8px] font-bold bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors uppercase">Back</button>
          </>
        );
      case "completed":
        return (
          <>
            <button onClick={() => moveTask(task.id, "in_progress")} className="px-1.5 py-0.5 text-[8px] font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors uppercase shadow-sm">Reopen</button>
            <button onClick={() => handleDelete(task.id)} className="px-1.5 py-0.5 text-[8px] font-bold bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors uppercase">Delete</button>
          </>
        );
      case "cancelled":
        return (
          <>
            <button onClick={() => moveTask(task.id, "not_started")} className="px-1.5 py-0.5 text-[8px] font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors uppercase shadow-sm">Restore</button>
            <button onClick={() => handleDelete(task.id)} className="px-1.5 py-0.5 text-[8px] font-bold bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors uppercase">Delete</button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white p-3 rounded-2xl shadow-lg cursor-grab active:cursor-grabbing hover:shadow-xl transition-all duration-200 relative ${
        isDragging ? "shadow-2xl scale-105" : ""
      }`}
    >
      <div className="flex justify-between items-start mb-1">
         <span className="text-[10px] font-mono text-gray-400">{task.customId}</span>
         {isOverdue && (
           <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
             {Math.abs(overdueDays)}d Overdue
           </span>
         )}
         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
           {canEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
              >
                <FiEdit2 size={10} />
              </button>
           )}
           {canEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              >
                <FiTrash2 size={10} />
              </button>
           )}
         </div>
      </div>

      <h4 className="font-semibold text-gray-900 mb-1 pr-6 text-xs leading-tight line-clamp-2">
        {task.title}
      </h4>

      <div className="flex flex-wrap gap-1 mb-1.5">
        <div className="flex items-center text-[9px] text-gray-500 font-medium bg-gray-50 px-1 py-0.5 rounded border border-gray-100">
          <Users size={9} className="mr-0.5" />
          {task.assignedTo || "Unassigned"}
        </div>
      </div>

      <p className="text-[10px] text-gray-400 line-clamp-3 mb-2">
        {task.description}
      </p>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50 gap-1">
        <div className="flex flex-wrap gap-1 items-center">
          {getActionButtons(task.status)}
          {canEdit && (
             <button
                onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                className="px-1.5 py-0.5 text-[8px] font-bold bg-gray-50 text-gray-400 rounded hover:bg-gray-100 transition-all uppercase"
              >
                Edit
              </button>
          )}
        </div>
      </div>
    </div>
  );
};

const TableView = ({ tasks, handleDelete, onEditTask, user, moveTask, handleCopyTask }) => {
  const getActionButtons = (task, canEdit) => {
    const baseButtons = [
      { label: "Edit", onClick: () => onEditTask(task), className: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
      { label: "Copy", onClick: () => handleCopyTask(task), className: "bg-purple-50 text-purple-600 hover:bg-purple-100" },
    ];

    if (!canEdit) return baseButtons;

    switch (task.status) {
      case "not_started":
        return [
          ...baseButtons,
          { label: "Start", onClick: () => moveTask(task.id, "in_progress"), className: "bg-green-50 text-green-600 hover:bg-green-100" },
          { label: "Delete", onClick: () => handleDelete(task.id), className: "bg-red-50 text-red-600 hover:bg-red-100" }
        ];
      case "in_progress":
        return [
          ...baseButtons,
          { label: "Complete", onClick: () => moveTask(task.id, "completed"), className: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" },
          { label: "Delete", onClick: () => handleDelete(task.id), className: "bg-red-50 text-red-600 hover:bg-red-100" }
        ];
      case "completed":
        return [
          ...baseButtons,
          { label: "Reopen", onClick: () => moveTask(task.id, "in_progress"), className: "bg-orange-50 text-orange-600 hover:bg-orange-100" },
          { label: "Delete", onClick: () => handleDelete(task.id), className: "bg-red-50 text-red-600 hover:bg-red-100" }
        ];
      case "cancelled":
        return [
          ...baseButtons,
          { label: "Reopen", onClick: () => moveTask(task.id, "in_progress"), className: "bg-orange-50 text-orange-600 hover:bg-orange-100" },
          { label: "Delete", onClick: () => handleDelete(task.id), className: "bg-red-50 text-red-600 hover:bg-red-100" }
        ];
      default:
        return baseButtons;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking ID</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Information</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Assignee</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timeline</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Control Panel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {tasks.map(task => {
              const canEdit = ["Admin", "Director", "Head"].includes(user?.role) || task.assignedTo === user?.displayName;
              const actionButtons = getActionButtons(task, canEdit);
              return (
                <tr key={task.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-5">
                     <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">{task.customId}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-black text-slate-800 leading-tight">{task.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{task.role}</span>
                       <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                       <div className="text-[10px] text-slate-400 font-medium line-clamp-1 max-w-[200px]">{task.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-linear-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-xs text-slate-600 font-black shadow-xs">
                        {task.assignedTo?.charAt(0)}
                      </div>
                      <span className="text-[10px] text-slate-600 font-black tracking-tight">{task.assignedTo}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                     <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-slate-600 font-black text-[11px]">
                          <FiCalendar size={12} className="text-slate-300" />
                          {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 px-1 uppercase tracking-tighter">Submission Limit</span>
                     </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black border uppercase tracking-widest inline-block ${
                      task.status === "completed" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      task.status === "in_progress" ? "bg-blue-50 text-blue-600 border-blue-100" :
                      task.status === "cancelled" ? "bg-rose-50 text-rose-600 border-rose-100" :
                      "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {task.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-1">
                      {actionButtons.map(btn => (
                        <button key={btn.label} onClick={btn.onClick} className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${btn.className}`}>
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CalendarView = ({
  tasks,
  onEditTask,
  currentDate,
  onDateChange,
}) => {
  const [selectedDate, setSelectedDate] = useState(null);

  const getTasksForDate = (date) => {
    return tasks.filter((task) => {
      // If task has start and due dates, check if the date falls within the range
      if (task.startDate && task.dueDate) {
        const startDate = parseDate(task.startDate);
        const dueDate = parseDate(task.dueDate);
        const checkDate = new Date(date);
        return startDate && dueDate && checkDate >= startDate && checkDate <= dueDate;
      }
      // Otherwise, use due date if available, otherwise use creation date
      let taskDate = null;
      if (task.dueDate) {
        taskDate = parseDate(task.dueDate);
      } else if (task.createdAt) {
        taskDate = task.createdAt?.toDate
          ? task.createdAt.toDate()
          : new Date(task.createdAt);
      }
      return taskDate && taskDate.toDateString() === date.toDateString();
    });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = getDaysInMonth(currentDate);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-3">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onDateChange(-1)}
          className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
        >
          ‹
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          {formatMonthYear(currentDate)}
        </h2>
        <button
          onClick={() => onDateChange(1)}
          className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
        >
          ›
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-gray-600"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return (
              <div key={index} className="p-3 bg-gray-50 rounded-xl"></div>
            );
          }

          const dayTasks = getTasksForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected =
            selectedDate && date.toDateString() === selectedDate.toDateString();

          return (
            <div
              key={index}
              className={`min-h-20 p-1.5 border border-gray-200 rounded-xl cursor-pointer transition-all duration-200 ${
                isToday ? 'bg-blue-50 border-blue-300 shadow-sm' :
                isSelected ? 'bg-blue-100 border-blue-400 shadow-md' :
                'bg-white hover:bg-gray-50 hover:shadow-sm'
              }`}
              onClick={() => setSelectedDate(date)}
            >
              <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                {date.getDate()}
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    className={`text-xs p-1 rounded truncate ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      task.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                    title={task.title || task.description}
                  >
                    {task.title || task.description}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-gray-500 font-medium">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Date Tasks */}
      {selectedDate && (
        <div className="mt-3 p-3 bg-gray-50 rounded-2xl shadow-inner">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Tasks for {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h3>
          <div className="space-y-2">
            {getTasksForDate(selectedDate).map(task => (
              <div
                key={task.id}
                className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onEditTask(task)}
              >
                <div className="text-sm font-medium text-gray-900">{task.title}</div>
                <div className="text-xs text-gray-600">{task.description}</div>
                <div className="text-xs text-gray-500 mt-1">Assigned to: {task.assignedTo}</div>
                <div className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                  task.status === 'completed' ? 'bg-green-100 text-green-800' :
                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  task.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {task.status.replace('_', ' ')}
                </div>
              </div>
            ))}
            {getTasksForDate(selectedDate).length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">No tasks for this date</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main LDTaskManager Component ---

const LDTaskManager = ({ onBack }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [currentView, setCurrentView] = useState("kanban");
  const [assignees, setAssignees] = useState([]);  
  const [currentDate, setCurrentDate] = useState(new Date());
  // Filters
  const [filterUser, setFilterUser] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const resetFilters = () => {
    setFilterUser("all");
    setDateRange({ start: "", end: "" });
  };

  const handleLoadMoreTasks = () => {
    toast.info("All tasks are already loaded in real-time snapshot.");
  };

  const filteredTasks = tasks.filter(task => {
    const userMatch = filterUser === "all" || task.assignedTo === filterUser;
    let dateMatch = true;
    if (dateRange.start && dateRange.end) {
      const taskDate = new Date(task.dueDate);
      dateMatch = taskDate >= new Date(dateRange.start) && taskDate <= new Date(dateRange.end);
    }
    return userMatch && dateMatch;
  });
  // Form states
  const [formData, setFormData] = useState({
    title: allTasks[0] || "",
    description: taskDescriptions[0] || "",
    assignedTo: "",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    status: "not_started"
  });

  useEffect(() => {
    const q = query(collection(db, "learning_tasks"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(taskList);
      setLoading(false);
    });

    const fetchUsers = async () => {
      const qUsers = query(collection(db, "users"));
      const snapshot = await getDocs(qUsers);
      const ldUsers = snapshot.docs.map(d => ({id: d.id, ...d.data()}))
        .filter(u => u.department === "L & D" || u.department === "Admin")
        .map(u => u.displayName || u.name);
      setAssignees(ldUsers || []);
    };
    fetchUsers();

    return unsubscribe;
  }, []);

  const getNextTaskId = async () => {
    const counterRef = doc(db, "counters", "ldtask_counter");
    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const nextId = counterDoc.exists() ? counterDoc.data().next_id : 1;
      transaction.set(counterRef, { next_id: nextId + 1 }, { merge: true });
      return `ldtask${nextId.toString().padStart(4, "0")}`;
    });
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.assignedTo || !formData.dueDate) {
       toast.error("MISSING DATA");
       return;
    }
    try {
      if (editingTask) {
        await updateDoc(doc(db, "learning_tasks", editingTask.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success("Task Updated");
      } else {
        const taskId = await getNextTaskId();
        await addDoc(collection(db, "learning_tasks"), {
          ...formData,
          customId: taskId,
          createdBy: user.displayName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Task Initialized");
      }
      setShowAddModal(false);
      resetForm();
    } catch {
      toast.error("Operation Failed");
    }
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm("Purge this task forever?")) {
      try {
        await deleteDoc(doc(db, "learning_tasks", id));
        toast.success("Task Purged");
      } catch {
        toast.error("Purge Failed");
      }
    }
  };

  const moveTask = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, "learning_tasks", taskId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch {
       console.error("Move Failed");
    }
  };

  const handleCopyTask = (task) => {
    setFormData({
      title: task.title,
      description: task.description,
      role: task.role,
      assignedTo: task.assignedTo,
      startDate: task.startDate,
      dueDate: task.dueDate,
      status: "not_started"
    });
    setEditingTask(null);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: allTasks[0] || "",
      description: taskDescriptions[0] || "",
      assignedTo: "",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      status: "not_started"
    });
    setEditingTask(null);
  };

  const getTasksByStatus = (status) => filteredTasks.filter(t => t.status === status);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    if (["not_started", "in_progress", "completed", "cancelled"].includes(over.id)) {
      moveTask(active.id, over.id);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="bg-gray-50 min-h-screen space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div>
                <h2 className="text-2xl font-bold text-gray-900">Task Management</h2>
             </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                <button onClick={() => setCurrentView("kanban")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 font-bold text-[10px] uppercase ${currentView === "kanban" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}><Layout size={14} /> Kanban</button>
                <button onClick={() => setCurrentView("calendar")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 font-bold text-[10px] uppercase ${currentView === "calendar" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}><CalendarIcon size={14} /> Calendar</button>
                <button onClick={() => setCurrentView("table")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 font-bold text-[10px] uppercase ${currentView === "table" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}><List size={14} /> Table</button>
                <button onClick={() => setCurrentView("logs")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 font-bold text-[10px] uppercase ${currentView === "logs" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}><FiFileText size={14} /> Logs</button>
             </div>
             
             <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold text-[10px]">
                <FiRefreshCw size={14} /> Refresh
             </button>
             
             <button
                onClick={() => { resetForm(); setShowAddModal(true); }}
                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-all font-bold text-[10px] uppercase shadow-sm"
              >
                <FiPlus strokeWidth={3} size={14} /> New Task
             </button>
             <button onClick={onBack} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold text-[10px]">
               <FiArrowLeft size={16} /> Back
             </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Filters:</span>
           </div>
           
           <select 
             value={filterUser} 
             onChange={(e) => setFilterUser(e.target.value)}
             className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
           >
              <option value="all">All Users</option>
              {assignees.map(u => <option key={u} value={u}>{u}</option>)}
           </select>

           <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="bg-transparent text-[10px] font-bold outline-none"
              />
              <span className="text-gray-300">-</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="bg-transparent text-[10px] font-bold outline-none"
              />
           </div>

           <button 
             onClick={resetFilters}
             className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase"
           >
             Clear Filters
           </button>

           <div className="ml-auto flex items-center gap-2">
              <div className="text-[10px] font-bold text-gray-400 uppercase">
                {filteredTasks.length} tasks
              </div>
              <button
                onClick={handleLoadMoreTasks}
                className="px-3 py-1 text-[10px] font-bold bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-all uppercase"
              >
                Load More Tasks
              </button>
           </div>
        </div>

        {/* Dynamic Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-300 gap-6">
            <div className="relative w-12 h-12">
               <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">Syncing...</span>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {currentView === "kanban" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Column id="not_started" title="Backlog" tasks={getTasksByStatus("not_started")}>
                  {getTasksByStatus("not_started").map(t => <TaskCard key={t.id} task={t} handleDelete={handleDeleteTask} moveTask={moveTask} onEditTask={(task) => { setEditingTask(task); setFormData(task); setShowAddModal(true); }} user={user} />)}
                </Column>
                <Column id="in_progress" title="In Progress" tasks={getTasksByStatus("in_progress")}>
                  {getTasksByStatus("in_progress").map(t => <TaskCard key={t.id} task={t} handleDelete={handleDeleteTask} moveTask={moveTask} onEditTask={(task) => { setEditingTask(task); setFormData(task); setShowAddModal(true); }} user={user} />)}
                </Column>
                <Column id="completed" title="Done" tasks={getTasksByStatus("completed")}>
                  {getTasksByStatus("completed").map(t => <TaskCard key={t.id} task={t} handleDelete={handleDeleteTask} moveTask={moveTask} onEditTask={(task) => { setEditingTask(task); setFormData(task); setShowAddModal(true); }} user={user} />)}
                </Column>
                <Column id="cancelled" title="On hold" tasks={getTasksByStatus("cancelled")}>
                  {getTasksByStatus("cancelled").map(t => <TaskCard key={t.id} task={t} handleDelete={handleDeleteTask} moveTask={moveTask} onEditTask={(task) => { setEditingTask(task); setFormData(task); setShowAddModal(true); }} user={user} />)}
                </Column>
              </div>
            )}
            {currentView === "table" && <TableView tasks={tasks} handleDelete={handleDeleteTask} onEditTask={(task) => { setEditingTask(task); setFormData(task); setShowAddModal(true); }} user={user} moveTask={moveTask} handleCopyTask={handleCopyTask} />}
            {currentView === "calendar" && <CalendarView 
              tasks={filteredTasks} 
              onEditTask={(task) => { setEditingTask(task); setFormData(task); setShowAddModal(true); }} 
              currentDate={currentDate} 
              onDateChange={(delta) => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + delta);
                setCurrentDate(newDate);
              }} 
            />}
          </div>
        )}

        {/* Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900">{editingTask ? "Edit Task" : "New Task"}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"><FiX size={18} /></button>
              </div>
              <form onSubmit={handleSaveTask} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Title *</label>
                    <select required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition-all font-semibold text-gray-900 text-sm">
                      {allTasks.map(task => <option key={task} value={task}>{task}</option>)}
                    </select>
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Assigned To *</label>
                    <select required value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition-all font-semibold text-gray-900 text-sm">
                      <option value="">Resource Selection</option>
                      {assignees.map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date *</label>
                    <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition-all font-semibold text-gray-900 text-sm" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Due Date *</label>
                    <input required type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition-all font-semibold text-gray-900 text-sm" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description *</label>
                    <select required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition-all text-gray-700 text-sm">
                      {taskDescriptions.map(desc => <option key={desc} value={desc}>{desc}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-6 py-2 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-lg transition-all font-bold text-xs uppercase">Cancel</button>
                  <button type="submit" className="flex-1 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all font-bold text-xs uppercase shadow-sm">Save Task</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
};

export default LDTaskManager;
