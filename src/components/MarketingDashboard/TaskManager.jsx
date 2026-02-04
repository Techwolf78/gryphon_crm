import React, { useEffect, useState, useRef } from "react";
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
import ImageCompressor from "image-compressor.js";
import { FiPaperclip, FiImage, FiX, FiChevronLeft, FiChevronRight, FiEdit2 } from "react-icons/fi";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import tasksData from "./task.js";
import {
  doc,
  serverTimestamp,
  onSnapshot,
  collection,
  updateDoc,
  deleteDoc,
  setDoc,
  runTransaction,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import EditTaskModal from "./EditTaskModal";

const SkeletonLoader = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

const HeaderSkeleton = () => (
  <div className="flex items-center justify-between mb-2">
    <div>
      <SkeletonLoader className="h-6 w-48 mb-1" />
      <SkeletonLoader className="h-3 w-64" />
    </div>
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <SkeletonLoader className="h-3 w-20" />
        <SkeletonLoader className="h-6 w-24" />
      </div>
      <SkeletonLoader className="h-8 w-32" />
      <div className="hidden md:flex items-center space-x-1">
        <SkeletonLoader className="w-1.5 h-1.5 rounded-full" />
        <SkeletonLoader className="h-3 w-24" />
      </div>
    </div>
  </div>
);

const FormSkeleton = () => (
  <div className="bg-white rounded-md shadow-sm border border-gray-200 p-3 mb-2">
    <SkeletonLoader className="h-5 w-32 mb-2" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      <div className="sm:col-span-2">
        <SkeletonLoader className="h-8 w-full" />
      </div>
      <SkeletonLoader className="h-8 w-full" />
      <SkeletonLoader className="h-8 w-full" />
      <div className="sm:col-span-2 lg:col-span-4">
        <SkeletonLoader className="h-8 w-full" />
      </div>
      <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
        <SkeletonLoader className="h-8 flex-1" />
        <SkeletonLoader className="h-8 w-16" />
        <SkeletonLoader className="h-8 w-12" />
      </div>
    </div>
  </div>
);

const TaskCardSkeleton = () => (
  <div className="bg-white p-2 rounded-md shadow-sm border border-gray-100">
    <div className="flex justify-end mb-1">
      <SkeletonLoader className="w-6 h-6 rounded-full" />
    </div>
    <SkeletonLoader className="h-4 w-full mb-1" />
    <SkeletonLoader className="h-3 w-3/4 mb-1" />
    <SkeletonLoader className="h-5 w-16 mb-1" />
    <div className="flex gap-1">
      <SkeletonLoader className="h-6 w-12" />
      <SkeletonLoader className="h-6 w-14" />
    </div>
  </div>
);

const ColumnSkeleton = () => (
  <div className="bg-gray-50 rounded-lg p-2 min-h-[250px]">
    <div className="flex items-center mb-2">
      <SkeletonLoader className="w-2 h-2 rounded-full mr-2" />
      <SkeletonLoader className="h-4 w-20 mr-auto" />
      <SkeletonLoader className="h-5 w-8 rounded-full" />
    </div>
    <div className="space-y-1">
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </div>
  </div>
);

const KanbanSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <ColumnSkeleton />
    <ColumnSkeleton />
    <ColumnSkeleton />
    <ColumnSkeleton />
  </div>
);

const CalendarSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <div className="flex items-center justify-between mb-4">
      <SkeletonLoader className="w-6 h-6" />
      <SkeletonLoader className="h-6 w-32" />
      <SkeletonLoader className="w-6 h-6" />
    </div>
    <div className="grid grid-cols-7 gap-1 mb-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <SkeletonLoader key={i} className="p-2 h-8" />
      ))}
    </div>
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <SkeletonLoader key={i} className="min-h-[100px] p-2" />
      ))}
    </div>
  </div>
);

const TableSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
    <div className="bg-gray-50 border-b border-gray-200 p-4">
      <div className="flex space-x-4">
        <SkeletonLoader className="h-4 w-16" />
        <SkeletonLoader className="h-4 w-20" />
        <SkeletonLoader className="h-4 w-12" />
        <SkeletonLoader className="h-4 w-16" />
        <SkeletonLoader className="h-4 w-20" />
        <SkeletonLoader className="h-4 w-20" />
        <SkeletonLoader className="h-4 w-16" />
      </div>
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4">
          <div className="flex items-center space-x-4">
            <SkeletonLoader className="w-8 h-8 rounded" />
            <div className="flex-1">
              <SkeletonLoader className="h-4 w-48 mb-1" />
              <SkeletonLoader className="h-3 w-24" />
            </div>
            <SkeletonLoader className="h-4 w-20" />
            <SkeletonLoader className="h-6 w-16 rounded-full" />
            <SkeletonLoader className="h-4 w-20" />
            <SkeletonLoader className="h-4 w-20" />
            <div className="flex space-x-2">
              <SkeletonLoader className="h-6 w-12 rounded" />
              <SkeletonLoader className="h-6 w-14 rounded" />
              <SkeletonLoader className="h-6 w-16 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TaskCard = ({ task, getRoleDisplay, getRoleColor, handleDelete, moveTask, onImageDelete, onEditTask, isDraggable = true }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Keyboard navigation for modal
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!showImageModal) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : task.images.length - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          setCurrentImageIndex((prev) =>
            prev < task.images.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'Escape':
          e.preventDefault();
          setShowImageModal(false);
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          if (onImageDelete) {
            onImageDelete(task.id, currentImageIndex);
            if (task.images.length === 1) {
              setShowImageModal(false);
            } else if (currentImageIndex >= task.images.length - 1) {
              setCurrentImageIndex(task.images.length - 2);
            }
          }
          break;
      }
    };

    if (showImageModal) {
      document.addEventListener("keydown", handleKeyPress);
      return () => document.removeEventListener("keydown", handleKeyPress);
    }
  }, [showImageModal, currentImageIndex, task.images, task.id, onImageDelete]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
  });

  const style = isDraggable ? {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  } : {};

  const getStatusStyles = (status) => {
    switch (status) {
      case "completed":
        return { opacity: 0.75, textDecoration: "line-through" };
      case "cancelled":
        return { opacity: 0.6, color: "#6B7280" };
      default:
        return {};
    }
  };

  const getActionButtons = (status, task, onEditTask) => {
    const editButton = (
      <button
        onClick={() => onEditTask(task)}
        className="px-2 py-1 text-xs text-gray-800 rounded-full hover:opacity-80 transition-colors font-medium shadow-sm"
        style={{ backgroundColor: "#E6E6FA" }}
      >
        Edit
      </button>
    );

    switch (status) {
      case "not_started":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => moveTask(task.id, "in_progress")}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-medium shadow-sm"
            >
              Start
            </button>
            <button
              onClick={() => moveTask(task.id, "cancelled")}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium shadow-sm"
            >
              Cancel
            </button>
            {editButton}
          </div>
        );
      case "in_progress":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => moveTask(task.id, "completed")}
              className="px-2 py-1 text-xs bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors font-medium shadow-sm"
            >
              Complete
            </button>
            <button
              onClick={() => moveTask(task.id, "not_started")}
              className="px-2 py-1 text-xs bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors font-medium shadow-sm"
            >
              Back
            </button>
            {editButton}
          </div>
        );
      case "completed":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => moveTask(task.id, "in_progress")}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-medium shadow-sm"
            >
              Reopen
            </button>
            <button
              onClick={() => handleDelete(task.id)}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium shadow-sm"
            >
              Delete
            </button>
            {editButton}
          </div>
        );
      case "cancelled":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => moveTask(task.id, "not_started")}
              className="px-2 py-1 text-xs bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors font-medium shadow-sm"
            >
              Restore
            </button>
            <button
              onClick={() => handleDelete(task.id)}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium shadow-sm"
            >
              Delete
            </button>
            {editButton}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={isDraggable ? setNodeRef : undefined}
      style={style}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
      className={`bg-white p-1.5 rounded-2xl shadow-lg ${isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"} hover:shadow-xl transition-all duration-200 relative`}
    >
      {task.images && task.images.length > 0 && (
        <div className="mb-0.5">
          {task.images.length === 1 ? (
            <img
              src={task.images[0]}
              alt="Task"
              className="w-full h-10 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                setCurrentImageIndex(0);
                setShowImageModal(true);
              }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {task.images.slice(0, 4).map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`Task ${index + 1}`}
                    className="w-full h-6 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setCurrentImageIndex(index);
                      setShowImageModal(true);
                    }}
                  />
                  {index === 3 && task.images.length > 4 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-xs">
                        +{task.images.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {showImageModal && task.images && task.images.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-54 p-4">
          <div className="relative max-w-4xl max-h-[90vh] overflow-y-auto">
            <img
              src={task.images[currentImageIndex]}
              alt={`Task ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
            {task.images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev > 0 ? prev - 1 : task.images.length - 1,
                    )
                  }
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
                >
                  <FiChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev < task.images.length - 1 ? prev + 1 : 0,
                    )
                  }
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
                >
                  <FiChevronRight className="w-6 h-6" />
                </button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 rounded-full px-3 py-1 text-sm">
                  {currentImageIndex + 1} / {task.images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <h4
        className="font-medium text-gray-900 mb-0.5 pr-6 text-xs"
        style={getStatusStyles(task.status)}
      >
        {task.description || task.title}
      </h4>
      <p
        className={`text-xs mb-0.5 ${task.status === "cancelled" ? "text-gray-500" : "text-gray-600"}`}
      >
        {task.assignedTo || "Unassigned"}
      </p>
      {task.role && (
        <div
          className={`inline-flex items-center px-1 py-0 rounded-full text-xs font-medium ${getRoleColor(task.role)} mb-0.5`}
        >
          👤 {getRoleDisplay(task.role)}
        </div>
      )}
      {getActionButtons(task.status, task, onEditTask)}
    </div>
  );
};

const Column = ({ id, title, color, bgColor, tasks, children }) => {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      className={`${bgColor} rounded-2xl p-2 min-h-[200px] transition-colors shadow-sm`}
    >
      <h3 className="font-semibold text-gray-900 mb-2 flex items-center text-sm">
        <div className={`w-3 h-3 ${color} rounded-full mr-3`}></div>
        {title}
        <span
          className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${
            color === "bg-gray-400"
              ? "bg-gray-200 text-gray-700"
              : color === "bg-blue-500"
                ? "bg-blue-200 text-blue-700"
                : color === "bg-green-500"
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



const CalendarView = ({
  tasks,
  getRoleDisplay,
  getRoleColor,
  handleDelete,
  moveTask,
  onImageDelete,
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
                    title={task.description || task.title}
                  >
                    {task.description || task.title}
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
              <TaskCard
                key={task.id}
                task={task}
                getRoleDisplay={getRoleDisplay}
                getRoleColor={getRoleColor}
                handleDelete={handleDelete}
                moveTask={moveTask}
                onImageDelete={onImageDelete}
                onEditTask={onEditTask}
                isDraggable={false}
              />
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

const TableView = ({
  tasks,
  getRoleDisplay,
  getRoleColor,
  handleDelete,
  moveTask,
  onEditTask,
}) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'not_started':
        return <span className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full font-semibold shadow-sm whitespace-nowrap">Backlog</span>;
      case 'in_progress':
        return <span className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-full font-semibold shadow-sm whitespace-nowrap">In Progress</span>;
      case 'completed':
        return <span className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-full font-semibold shadow-sm whitespace-nowrap">Done</span>;
      case 'cancelled':
        return <span className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-full font-semibold shadow-sm whitespace-nowrap">On hold</span>;
      default:
        return (
          <span className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full font-semibold shadow-sm whitespace-nowrap">
            {status}
          </span>
        );
    }
  };



  const formatDate = (dateString) => {
    const date = parseDate(dateString);
    if (!date || isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
      <div className="overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-2 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ID
              </th>
              <th className="px-2 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[250px]">
                Task
              </th>
              <th className="px-2 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-10">
                Role
              </th>
              <th className="px-2 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-2 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-2 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-2 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <tr
                key={task.id}
                className="hover:bg-gray-50/30 transition-colors duration-150"
              >
                <td className="px-2 py-4 text-sm text-gray-900 font-medium">
                  {task.id && !isNaN(parseInt(task.id.replace("dmtask", "")))
                    ? parseInt(task.id.replace("dmtask", ""))
                    : "-"}
                </td>
                <td className="px-2 py-4 min-w-[250px]">
                  <div className="flex items-center">
                    {task.images && task.images.length > 0 && (
                      <div className="w-10 h-10 rounded-2xl overflow-hidden mr-4 shrink-0 shadow-sm border border-gray-100">
                        <img
                          src={task.images[0]}
                          alt="Task"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-sm font-medium text-gray-900 wrap-break-word"
                        title={task.description || task.title}
                      >
                        {task.description || task.title}
                      </div>
                      {task.images && task.images.length > 1 && (
                        <div className="text-xs text-gray-500 mt-1">
                          +{task.images.length - 1} more images
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-4 text-sm text-gray-900 font-medium">
                  {task.assignedTo || "Unassigned"}
                </td>
                <td className="px-4 py-4 w-10">
                  {task.role && (
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getRoleColor(task.role)} shadow-sm`}
                    >
                      {getRoleDisplay(task.role)}
                    </span>
                  )}
                </td>
                <td className="px-2 py-4">{getStatusBadge(task.status)}</td>
                <td className="px-2 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">
                  {formatDate(task.startDate)}
                </td>
                <td className="px-2 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">
                  {formatDate(task.dueDate)}
                </td>
                <td className="px-2 py-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onEditTask(task)}
                      className="px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors font-semibold shadow-sm"
                    >
                      Edit
                    </button>

                    {/* Status change buttons */}
                    {task.status === "not_started" && (
                      <button
                        onClick={() => moveTask(task.id, "in_progress")}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-semibold shadow-sm"
                      >
                        Start
                      </button>
                    )}
                    {task.status === "in_progress" && (
                      <button
                        onClick={() => moveTask(task.id, "completed")}
                        className="px-2 py-1 text-xs bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors font-semibold shadow-sm"
                      >
                        Complete
                      </button>
                    )}
                    {(task.status === "completed" ||
                      task.status === "cancelled") && (
                      <button
                        onClick={() => moveTask(task.id, "in_progress")}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-semibold shadow-sm"
                      >
                        Reopen
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(task.id)}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-semibold shadow-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td
                  colSpan="8"
                  className="px-2 py-12 text-center text-gray-500"
                >
                  <div className="text-sm font-medium">No tasks found</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Create your first task to get started
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TaskManager = ({ onBack }) => {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [role, setRole] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentView, setCurrentView] = useState("kanban"); // "kanban", "calendar", or "table"
  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    user:
      user?.role === "Director" || user?.role === "Head"
        ? ""
        : user?.displayName || "",
    startDate: "",
    endDate: "",
    role: "",
  });
  const initialLoadRef = useRef(true);
  const fileInputRef = useRef(null);
  const loadMoreTimeoutRef = useRef(null);
  const [currentLimit, setCurrentLimit] = useState(100);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [noMoreCount, setNoMoreCount] = useState(0);
  const [noMoreTasks, setNoMoreTasks] = useState(false);
  const [showNoMorePopup, setShowNoMorePopup] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [calendarCurrentDate, setCalendarCurrentDate] = useState(new Date());

  const roleAbbreviations = {
    "Video Editor": "VE",
    "Graphic Designer": "GD",
    Manager: "MG",
    Developer: "DEV",
    "Content Writer": "CW",
  };

  const getNextTaskId = async () => {
    const counterRef = doc(db, "counters", "task_counter");
    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const nextId = counterDoc.exists() ? counterDoc.data().next_id : 1;
      transaction.set(counterRef, { next_id: nextId + 1 }, { merge: true });
      return `dmtask${nextId.toString().padStart(4, "0")}`;
    });
  };

  const uniqueTasksList = [...new Set(tasksData.map((item) => item.task))];
  const typingTasks = uniqueTasksList.slice(0, 5);
  const [placeholderText, setPlaceholderText] = useState("");
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  const uniqueAccounts = [...new Set(tasksData.map((item) => item.account))];
  const rolesForAccount = selectedAccount
    ? [
        ...new Set(
          tasksData
            .filter((item) => item.account === selectedAccount)
            .map((item) => item.role),
        ),
      ]
    : [];
  const tasksForRole = selectedRole
    ? [
        ...new Set(
          tasksData
            .filter(
              (item) =>
                item.account === selectedAccount && item.role === selectedRole,
            )
            .map((item) => item.task),
        ),
      ]
    : [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    if (!user?.uid) {
      setTasks([]);
      return;
    }

    // Load cached assignees
    const cachedAssignees = localStorage.getItem("dmAssignees");
    if (cachedAssignees) {
      const parsedAssignees = JSON.parse(cachedAssignees);
      setAssignees(parsedAssignees);
      // Set default filter based on user preference
      const filterPreference =
        localStorage.getItem("dmFilterPreference") || "user";
      const userName = user?.displayName;
      if (
        filterPreference === "user" &&
        userName &&
        parsedAssignees.includes(userName) &&
        user?.role !== "Director" &&
        user?.role !== "Head"
      ) {
        setFilters((prev) => ({ ...prev, user: userName }));
      }
    }

    // Set up limited real-time listener for tasks
    const calendarLimit = currentView === "calendar" ? 500 : currentLimit;
    const tasksQuery = query(
      collection(db, "marketing_tasks"),
      orderBy("createdAt", "desc"),
      limit(calendarLimit),
    );
    const unsubscribeTasks = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const tasksData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            // Migrate old imageUrl format to new images array format if needed
            images: data.images || (data.imageUrl ? [data.imageUrl] : []),
          };
        });
        const previousLength = tasks.length;
        const previousFilteredLength = filteredTasks.length;
        setTasks(tasksData);
        if (initialLoadRef.current) {
          setIsLoading(false);
          initialLoadRef.current = false;
        }
        if (loadingMore) {
          const newTasksCount = tasksData.length - previousLength;

          // Only process when we actually have new tasks loaded
          if (newTasksCount > 0) {
            // Clear the timeout since tasks were loaded
            if (loadMoreTimeoutRef.current) {
              clearTimeout(loadMoreTimeoutRef.current);
              loadMoreTimeoutRef.current = null;
            }
            setLoadingMore(false);

            // Calculate how many new tasks are visible after filtering
            const newFilteredTasks = tasksData.filter((task) => {
              if (filters.user && task.assignedTo !== filters.user)
                return false;
              if (filters.role && task.role !== filters.role) return false;
              if (filters.startDate && task.startDate) {
                const taskStart = new Date(task.startDate);
                const filterStart = new Date(filters.startDate);
                if (taskStart < filterStart) return false;
              }
              if (filters.endDate && task.dueDate) {
                const taskEnd = new Date(task.dueDate);
                const filterEnd = new Date(filters.endDate);
                if (taskEnd > filterEnd) return false;
              }
              // Week filter
              const weekStart = new Date(currentWeek);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              weekEnd.setHours(23, 59, 59, 999);
              let taskDate = null;
              if (task.dueDate) {
                taskDate = new Date(task.dueDate);
              } else if (task.createdAt) {
                taskDate = task.createdAt?.toDate
                  ? task.createdAt.toDate()
                  : new Date(task.createdAt);
              }
              if (taskDate && (taskDate < weekStart || taskDate > weekEnd))
                return false;
              return true;
            });

            const newVisibleTasksCount =
              newFilteredTasks.length - previousFilteredLength;

            const message =
              newVisibleTasksCount > 0
                ? `${newVisibleTasksCount} tasks fetched.`
                : `${newTasksCount} tasks loaded (${newTasksCount - newVisibleTasksCount} filtered out).`;

            setToastMessage(message);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            setNoMoreTasks(false);
            setNoMoreCount(0);
          } else {
            // If no new tasks were loaded, it means no more tasks available
            // Clear the timeout since we determined no more tasks
            if (loadMoreTimeoutRef.current) {
              clearTimeout(loadMoreTimeoutRef.current);
              loadMoreTimeoutRef.current = null;
            }
            setLoadingMore(false);
            setNoMoreTasks(true);
            const newCount = noMoreCount + 1;
            setNoMoreCount(newCount);
            if (newCount >= 4) {
              setButtonDisabled(true);
              setCountdown(10);
            }
          }
          // If newTasksCount === 0 and tasksData.length < currentLimit,
          // it means the data is still loading, so we don't do anything yet
        }
      },
      (error) => {
        console.error("Error loading tasks from Firestore:", error);
        setTasks([]);
        setIsLoading(false);
        if (loadingMore) {
          // Clear the timeout on error
          if (loadMoreTimeoutRef.current) {
            clearTimeout(loadMoreTimeoutRef.current);
            loadMoreTimeoutRef.current = null;
          }
          setLoadingMore(false);
        }
      },
    );

    // Fetch users once and cache
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const dmUsers = usersSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((user) => {
            const hasDM = user.departments && user.departments.includes("DM");
            const hasAdminDept =
              user.departments && user.departments.includes("Admin");
            return hasDM || hasAdminDept;
          })
          .map((user) => user.displayName || user.name || user.email)
          .filter(Boolean);
        setAssignees(dmUsers);
        localStorage.setItem("dmAssignees", JSON.stringify(dmUsers));
        // Set default filter based on user preference
        const filterPreference =
          localStorage.getItem("dmFilterPreference") || "user";
        const userName = user?.displayName;
        if (
          filterPreference === "user" &&
          userName &&
          dmUsers.includes(userName) &&
          user?.role !== "Director" &&
          user?.role !== "Head"
        ) {
          setFilters((prev) => ({ ...prev, user: userName }));
        }
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };

    if (!cachedAssignees || JSON.parse(cachedAssignees || "[]").length === 0) {
      fetchUsers();
    }

    return () => {
      unsubscribeTasks();
    };
  }, [user?.uid, user?.displayName, refreshTrigger, currentLimit, currentView]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && buttonDisabled) {
      setButtonDisabled(false);
    }
  }, [countdown, buttonDisabled]);

  useEffect(() => {
    const currentTask = typingTasks[currentTaskIndex];
    if (!currentTask) return;
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          setPlaceholderText(currentTask.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
          if (charIndex + 1 === currentTask.length) {
            setTimeout(() => setIsDeleting(true), 1000); // pause before deleting
          }
        } else {
          setPlaceholderText(currentTask.substring(0, charIndex - 1));
          setCharIndex(charIndex - 1);
          if (charIndex - 1 === 0) {
            setIsDeleting(false);
            setCurrentTaskIndex((currentTaskIndex + 1) % typingTasks.length);
          }
        }
      },
      isDeleting ? 50 : 100,
    ); // faster deleting
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, currentTaskIndex, typingTasks]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, []);

  const goToPreviousWeek = () => {
    setCurrentWeek((prev) => {
      const newWeek = new Date(prev);
      newWeek.setDate(prev.getDate() - 7);
      return newWeek;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeek((prev) => {
      const newWeek = new Date(prev);
      newWeek.setDate(prev.getDate() + 7);
      return newWeek;
    });
  };

  const goToNextMonth = () => {
    setCalendarCurrentDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToPreviousMonth = () => {
    setCalendarCurrentDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const formatWeekRange = (weekStart) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString("en-GB")} - ${end.toLocaleDateString("en-GB")}`;
  };

  const uploadImage = async (file) => {
    if (!file) return null;

    try {
      setUploadingImage(true);

      // Compress the image
      const compressedFile = await new Promise((resolve, reject) => {
        new ImageCompressor(file, {
          quality: 0.8,
          maxWidth: 1200,
          maxHeight: 1200,
          success: resolve,
          error: reject,
        });
      });

      // Create FormData for Cloudinary upload
      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("upload_preset", "react_profile_upload");
      formData.append("cloud_name", "da0ypp61n");

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/da0ypp61n/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Please enter a task description.");
      return;
    }
    if (!assignedTo.trim()) {
      setFormError("Please select an assignee.");
      return;
    }
    setFormError(""); // Clear any previous error

    // Close modal and clear form immediately
    setShowForm(false);
    setTitle("");
    setAssignedTo("");
    setRole("");
    setSelectedAccount("");
    setSelectedRole("");
    setSelectedTask("");
    clearImage();

    // Do the rest asynchronously in background
    (async () => {
      try {
        const taskId = await getNextTaskId();

        let images = [];
        if (imageFile) {
          // Upload image asynchronously
          uploadImage(imageFile)
            .then((imageUrl) => {
              // Update the task in DB with the image
              updateDoc(doc(db, "marketing_tasks", taskId), {
                images: [imageUrl],
              });
              // Update in local state
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === taskId ? { ...t, images: [imageUrl] } : t,
                ),
              );
            })
            .catch((error) => {
              console.error("Error uploading image:", error);
            });
        }

        const taskData = {
          description: title.trim(),
          assignedTo: assignedTo.trim(),
          role: role || null,
          account: selectedAccount || null,
          rolePlay: selectedRole || null,
          task: selectedTask || null,
          status: "not_started",
          images,
          userId: user.uid,
          createdAt: serverTimestamp(),
        };

        const docRef = doc(db, "marketing_tasks", taskId);

        const newTask = { ...taskData, id: taskId };
        setTasks((prev) => [newTask, ...prev]);

        await setDoc(docRef, { ...taskData, id: taskId });
      } catch (error) {
        console.error("Error creating task:", error);
        alert("Failed to create task. Please try again.");
      }
    })();
  };

  const moveTaskImmediate = async (taskId, newStatus) => {
    const taskRef = doc(db, "marketing_tasks", taskId);
    await updateDoc(taskRef, { status: newStatus });
  };

  const moveTask = async (taskId, newStatus) => {
    // Update local state immediately
    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );
    // Update Firestore immediately
    try {
      await moveTaskImmediate(taskId, newStatus);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const getTasksByStatus = (status) => {
    return filteredTasks.filter((t) => t.status === status);
  };

  const filteredTasks = tasks.filter((task) => {
    if (filters.user && task.assignedTo !== filters.user) return false;
    if (filters.role && task.role !== filters.role) return false;
    if (filters.startDate && task.startDate) {
      const taskStart = new Date(task.startDate);
      const filterStart = new Date(filters.startDate);
      if (taskStart < filterStart) return false;
    }
    if (filters.endDate && task.dueDate) {
      const taskEnd = new Date(task.dueDate);
      const filterEnd = new Date(filters.endDate);
      if (taskEnd > filterEnd) return false;
    }

    // Date filtering based on current view
    let taskDate = null;
    if (task.startDate) {
      taskDate = new Date(task.startDate);
    } else if (task.dueDate) {
      taskDate = new Date(task.dueDate);
    } else if (task.createdAt) {
      taskDate = task.createdAt?.toDate
        ? task.createdAt.toDate()
        : new Date(task.createdAt);
    }

    // New Rule: If User Filter is active AND task is active (not started/in progress),
    // SHOW IT regardless of date (Persistent Backlog)
    if (
      filters.user &&
      (task.status === "not_started" || task.status === "in_progress")
    ) {
      // Do nothing here to skip the date check return false below
      // implicitly "return true" at the end unless other filters failed above
    } else if (taskDate) {
      if (currentView === "calendar") {
        // For calendar view, filter by current month
        const monthStart = new Date(
          calendarCurrentDate.getFullYear(),
          calendarCurrentDate.getMonth(),
          1,
        );
        const monthEnd = new Date(
          calendarCurrentDate.getFullYear(),
          calendarCurrentDate.getMonth() + 1,
          0,
        );
        monthEnd.setHours(23, 59, 59, 999);
        if (taskDate < monthStart || taskDate > monthEnd) return false;
      } else {
        // For kanban and table views, filter by current week
        const weekStart = new Date(currentWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        if (taskDate < weekStart || taskDate > weekEnd) return false;
      }
    }

    return true;
  });

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleSaveTaskDates = async (taskId, taskData) => {
    try {
      await updateDoc(doc(db, "marketing_tasks", taskId), taskData);
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, ...taskData } : t)));
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteImmediate = async (id) => {
    await deleteDoc(doc(db, "marketing_tasks", id));
  };

  const handleDelete = async (id) => {
    // Update local state immediately
    setTasks(tasks.filter((t) => t.id !== id));
    // Update Firestore immediately
    try {
      await handleDeleteImmediate(id);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleImageDelete = async (taskId, imageIndex) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.images) return;
    const updatedImages = task.images.filter(
      (_, index) => index !== imageIndex,
    );
    try {
      await updateDoc(doc(db, "marketing_tasks", taskId), {
        images: updatedImages,
      });
      setTasks(
        tasks.map((t) =>
          t.id === taskId ? { ...t, images: updatedImages } : t,
        ),
      );
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  const getRoleDisplay = (role) => {
    return roleAbbreviations[role] || role || "—";
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "Video Editor":
        return "bg-purple-100 text-purple-800 border border-purple-200";
      case "Graphic Designer":
        return "bg-orange-100 text-orange-800 border border-orange-200";
      case "Manager":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "Developer":
        return "bg-teal-100 text-teal-800 border border-teal-200";
      case "Content Writer":
        return "bg-pink-100 text-pink-800 border border-pink-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // If dropping on a column
    if (
      overId === "not_started" ||
      overId === "in_progress" ||
      overId === "completed" ||
      overId === "cancelled"
    ) {
      const task = tasks.find((t) => String(t.id) === activeId);
      if (task && task.status !== overId) {
        await moveTask(activeId, overId);
      }
    }

    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-gray-50 min-h-screen p-1">
        <div className="mx-auto w-auto">
          {isLoading ? (
            <>
              <div className="text-center mb-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">
                  Loading Tasks
                </h2>
                <p className="text-sm text-gray-600">
                  Wait while we fetch your tasks...
                </p>
              </div>
              <div className="mb-2">
                <HeaderSkeleton />
                <FormSkeleton />
              </div>
              {currentView === "kanban" ? (
                <KanbanSkeleton />
              ) : currentView === "calendar" ? (
                <CalendarSkeleton />
              ) : (
                <TableSkeleton />
              )}
            </>
          ) : (
            <>
              <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 mb-0.5">
                      Task Management
                    </h1>
                    <p className="text-gray-600 text-xs">
                      Organize and track your marketing tasks with ease
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center space-x-1">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                        <span>Real-time updates</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                      <button
                        onClick={() => setCurrentView("kanban")}
                        className={`px-2 py-1 text-xs font-medium rounded-xl transition-colors ${
                          currentView === "kanban"
                            ? "bg-blue-500 text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Kanban
                      </button>
                      <button
                        onClick={() => setCurrentView("calendar")}
                        className={`px-2 py-1 text-xs font-medium rounded-xl transition-colors ${
                          currentView === "calendar"
                            ? "bg-blue-500 text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Calendar
                      </button>
                      <button
                        onClick={() => setCurrentView("table")}
                        className={`px-2 py-1 text-xs font-medium rounded-xl transition-colors ${
                          currentView === "table"
                            ? "bg-blue-500 text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Table
                      </button>
                    </div>
                    <button
                      onClick={() => setRefreshTrigger((prev) => prev + 1)}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors text-xs font-medium shadow-sm"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={() => {
                        setShowForm(true);
                        setFormError("");
                      }}
                      className="px-3 py-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors text-xs font-medium shadow-sm"
                    >
                      New Task
                    </button>
                    <button
                      onClick={onBack}
                      className="px-3 py-1.5 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-xs font-medium shadow-sm"
                    >
                      ← Back
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="mb-2 bg-white rounded-xl p-2 shadow-sm border border-gray-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      Filters:
                    </span>
                    <select
                      value={filters.user}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setFilters((prev) => ({ ...prev, user: newValue }));
                        // Save preference: 'all' if empty, 'user' if specific user
                        localStorage.setItem(
                          "dmFilterPreference",
                          newValue === "" ? "all" : "user",
                        );
                      }}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Users</option>
                      {assignees.map((assignee) => (
                        <option key={assignee} value={assignee}>
                          {assignee}
                        </option>
                      ))}
                    </select>
                    {currentView === "calendar" ? (
                      <>
                        <button
                          onClick={goToPreviousMonth}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center"
                        >
                          <FiChevronLeft />
                        </button>
                        <span className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded-lg">
                          {calendarCurrentDate.toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                        <button
                          onClick={goToNextMonth}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center"
                        >
                          <FiChevronRight />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={goToPreviousWeek}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center"
                        >
                          <FiChevronLeft />
                        </button>
                        <span className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded-lg">
                          {formatWeekRange(currentWeek)}
                        </span>
                        <button
                          onClick={goToNextWeek}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center"
                        >
                          <FiChevronRight />
                        </button>
                      </>
                    )}
                    <select
                      value={filters.role}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          role: e.target.value,
                        }))
                      }
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Roles</option>
                      <option value="Video Editor">Video Editor</option>
                      <option value="Graphic Designer">Graphic Designer</option>
                      <option value="Manager">Manager</option>
                      <option value="Developer">Developer</option>
                      <option value="Content Writer">Content Writer</option>
                    </select>
                    <button
                      onClick={() =>
                        setFilters({
                          user: "",
                          startDate: "",
                          endDate: "",
                          role: "",
                        })
                      }
                      disabled={filters.user === "" && filters.role === ""}
                      className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                        filters.user === "" && filters.role === ""
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-gray-500 text-white hover:bg-gray-600"
                      }`}
                    >
                      Clear Filters
                    </button>

                    {/* Task Count Display */}
                    <div className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium">
                      {filteredTasks.length} tasks
                    </div>

                    <button
                      onClick={() => {
                        if (!buttonDisabled && !noMoreTasks) {
                          setLoadingMore(true);
                          setCurrentLimit((prev) => prev + 100);
                          // Set timeout to show "no more tasks" popup after 5 seconds if no tasks loaded
                          loadMoreTimeoutRef.current = setTimeout(() => {
                            if (loadingMore) {
                              setLoadingMore(false);
                              setShowNoMorePopup(true);
                              setNoMoreTasks(true);
                            }
                          }, 5000);
                        }
                      }}
                      disabled={buttonDisabled || noMoreTasks}
                      className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                        buttonDisabled || noMoreTasks
                          ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }`}
                    >
                      {noMoreTasks
                        ? "No More Tasks"
                        : buttonDisabled
                          ? `Load More Tasks :${countdown}`
                          : "Load More Tasks"}
                    </button>
                  </div>
                </div>

                {/* Task Creation Form - Now a Modal */}
                {showForm && (
                  <div className="fixed inset-0 bg-transparent backdrop-blur-sm bg-opacity-20 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-lg p-4 max-w-lg w-full mx-4">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Create New Task
                        </h2>
                        <button
                          onClick={() => setShowForm(false)}
                          className="text-gray-500 hover:text-gray-700 text-2xl font-light"
                        >
                          ×
                        </button>
                      </div>
                      {formError && (
                        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                          {formError}
                        </div>
                      )}
                      <form
                        onSubmit={handleAdd}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2"
                      >
                        <div>
                          <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                          >
                            <option value="">Select role (opt)</option>
                            <option value="Video Editor">Video Editor</option>
                            <option value="Graphic Designer">
                              Graphic Designer
                            </option>
                            <option value="Manager">Manager</option>
                            <option value="Developer">Developer</option>
                            <option value="Content Writer">
                              Content Writer
                            </option>
                          </select>
                        </div>
                        <div>
                          <select
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                          >
                            <option value="">Select assignee*</option>
                            {assignees.map((assignee) => (
                              <option key={assignee} value={assignee}>
                                {assignee}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <select
                            value={selectedAccount}
                            onChange={(e) => {
                              setSelectedAccount(e.target.value);
                              setSelectedRole("");
                              setSelectedTask("");
                            }}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                          >
                            <option value="">Select account (opt)</option>
                            {uniqueAccounts.map((acc) => (
                              <option key={acc} value={acc}>
                                {acc}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <select
                            value={selectedRole}
                            onChange={(e) => {
                              setSelectedRole(e.target.value);
                              setSelectedTask("");
                            }}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                            disabled={!selectedAccount}
                          >
                            <option value="">Select role play (opt)</option>
                            {rolesForAccount.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <select
                            value={selectedTask}
                            onChange={(e) => setSelectedTask(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                            disabled={!selectedRole}
                          >
                            <option value="">Select task (opt)</option>
                            {tasksForRole.map((task) => (
                              <option key={task} value={task}>
                                {task}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-4">
                          <textarea
                            value={title}
                            onChange={(e) => {
                              if (e.target.value.length <= 150) {
                                setTitle(e.target.value);
                              }
                            }}
                            placeholder={placeholderText}
                            className="w-full px-2 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 resize-none"
                            rows="3"
                            required
                          />
                          <div className="text-xs text-gray-500 mt-1 text-right">
                            {title.length}/150
                          </div>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors file:mr-2 file:py-1 file:px-2 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 bg-gray-50"
                          />
                          {imagePreview && (
                            <button
                              type="button"
                              onClick={clearImage}
                              className="px-2 py-1 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors shadow-sm"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
                          <button
                            type="submit"
                            disabled={uploadingImage}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs shadow-sm"
                          >
                            {uploadingImage ? (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Uploading...
                              </div>
                            ) : (
                              "Create"
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTitle("");
                              setAssignedTo("");
                              setRole("");
                              setSelectedAccount("");
                              setSelectedRole("");
                              setSelectedTask("");
                              clearImage();
                              setShowForm(false);
                            }}
                            className="px-3 py-1.5 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors font-medium text-xs shadow-sm"
                          >
                            Reset
                          </button>
                          {imagePreview && (
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-10 h-10 object-cover rounded-xl border border-gray-200 shadow-sm"
                            />
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>

              {/* Conditional View Rendering */}
              {currentView === "kanban" ? (
                <>
                  {/* Kanban Board */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Column
                      id="not_started"
                      title="Backlog"
                      color="bg-gray-400"
                      bgColor="bg-gray-50"
                      tasks={getTasksByStatus("not_started")}
                    >
                      {getTasksByStatus("not_started").map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          getRoleDisplay={getRoleDisplay}
                          getRoleColor={getRoleColor}
                          handleDelete={handleDelete}
                          moveTask={moveTask}
                          onImageDelete={handleImageDelete}
                          onEditTask={handleEditTask}
                        />
                      ))}
                    </Column>

                    <Column
                      id="in_progress"
                      title="In Progress"
                      color="bg-blue-500"
                      bgColor="bg-blue-50"
                      tasks={getTasksByStatus("in_progress")}
                    >
                      {getTasksByStatus("in_progress").map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          getRoleDisplay={getRoleDisplay}
                          getRoleColor={getRoleColor}
                          handleDelete={handleDelete}
                          moveTask={moveTask}
                          onImageDelete={handleImageDelete}
                          onEditTask={handleEditTask}
                        />
                      ))}
                    </Column>

                    <Column
                      id="completed"
                      title="Done"
                      color="bg-green-500"
                      bgColor="bg-green-50"
                      tasks={getTasksByStatus("completed")}
                    >
                      {getTasksByStatus("completed").map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          getRoleDisplay={getRoleDisplay}
                          getRoleColor={getRoleColor}
                          handleDelete={handleDelete}
                          moveTask={moveTask}
                          onImageDelete={handleImageDelete}
                          onEditTask={handleEditTask}
                        />
                      ))}
                    </Column>

                    <Column
                      id="cancelled"
                      title="On hold"
                      color="bg-red-500"
                      bgColor="bg-red-50"
                      tasks={getTasksByStatus("cancelled")}
                    >
                      {getTasksByStatus("cancelled").map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          getRoleDisplay={getRoleDisplay}
                          getRoleColor={getRoleColor}
                          handleDelete={handleDelete}
                          moveTask={moveTask}
                          onImageDelete={handleImageDelete}
                          onEditTask={handleEditTask}
                        />
                      ))}
                    </Column>
                  </div>
                </>
              ) : currentView === "calendar" ? (
                <CalendarView
                  tasks={filteredTasks}
                  getRoleDisplay={getRoleDisplay}
                  getRoleColor={getRoleColor}
                  handleDelete={handleDelete}
                  moveTask={moveTask}
                  onImageDelete={handleImageDelete}
                  onEditTask={handleEditTask}
                  currentDate={calendarCurrentDate}
                  onDateChange={(direction) => {
                    if (direction === 1) goToNextMonth();
                    else goToPreviousMonth();
                  }}
                />
              ) : (
                <TableView
                  tasks={filteredTasks}
                  getRoleDisplay={getRoleDisplay}
                  getRoleColor={getRoleColor}
                  handleDelete={handleDelete}
                  moveTask={moveTask}
                  onEditTask={handleEditTask}
                />
              )}
            </>
          )}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              getRoleDisplay={getRoleDisplay}
              getRoleColor={getRoleColor}
              handleDelete={handleDelete}
              moveTask={moveTask}
              onImageDelete={handleImageDelete}
              onEditTask={handleEditTask}
            />
          ) : null}
        </DragOverlay>
      </div>

      {loadingMore && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-xs w-full mx-auto">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Loading Tasks
              </h3>
              <p className="text-gray-600 text-xs">
                Please wait while we fetch more tasks...
              </p>
            </div>
          </div>
        </div>
      )}

      {showNoMorePopup && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-xs w-full mx-auto">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-linear-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                No More Tasks
              </h3>
              <p className="text-gray-600 text-xs">
                All available tasks have been loaded.
              </p>
              <button
                onClick={() => setShowNoMorePopup(false)}
                className="mt-4 px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 opacity-100 transition-opacity duration-300">
            <span className="text-sm">{toastMessage}</span>
          </div>
        </div>
      )}

      <EditTaskModal
        task={editingTask}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTaskDates}
        assignees={assignees}
        tasksData={tasksData}
      />
    </DndContext>
  );
};

export default TaskManager;
