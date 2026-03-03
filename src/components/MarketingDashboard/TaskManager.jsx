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
import { FiPaperclip, FiImage, FiX, FiChevronLeft, FiChevronRight, FiEdit2, FiRefreshCw, FiAlertCircle, FiFileText } from "react-icons/fi";
import { Hourglass, CheckCircle, Clock, Users, FileText, XCircle, Circle, TrendingUp } from "lucide-react";

const flipStyles = `
  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(100px) rotateY(-45deg);
    }
    to {
      opacity: 1;
      transform: translateX(0) rotateY(0deg);
    }
  }
  
  @keyframes slideInFromLeft {
    from {
      opacity: 0;
      transform: translateX(-100px) rotateY(45deg);
    }
    to {
      opacity: 1;
      transform: translateX(0) rotateY(0deg);
    }
  }
  
  .table-flip-in {
    animation: slideInFromRight 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    transform-style: preserve-3d;
    perspective: 1200px;
  }
  
  .summary-flip-in {
    animation: slideInFromLeft 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    transform-style: preserve-3d;
    perspective: 1200px;
  }
`;

// Inject styles
if (typeof window !== 'undefined' && !document.getElementById('table-flip-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'table-flip-styles';
  styleElement.textContent = flipStyles;
  document.head.appendChild(styleElement);
}

const isPDF = (url) => {
  if (!url) return false;
  const urlStr = typeof url === 'string' ? url : '';
  return urlStr.toLowerCase().split('?')[0].endsWith('.pdf') || 
         urlStr.includes('/raw/upload/') || 
         urlStr.includes('/pdf/upload/') ||
         urlStr.startsWith('data:application/pdf');
};

const getTodayIST = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

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
  addDoc,
  runTransaction,
  query,
  orderBy,
  limit,
  getDocs,
  where,
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

const TaskCard = ({ task, getRoleDisplay, getRoleColor, handleDelete, moveTask, onImageDelete, onEditTask, isDraggable = true, user }) => {
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

  const getActionButtons = (status, task, onEditTask, user) => {
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
            { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && (
              <button
                onClick={() => moveTask(task.id, "in_progress")}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-medium shadow-sm"
              >
                Start
              </button>
            ) }
            { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && (
              <button
                onClick={() => moveTask(task.id, "cancelled")}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium shadow-sm"
              >
                Cancel
              </button>
            ) }
            { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && editButton }
          </div>
        );
      case "in_progress":
        return (
          <div className="flex gap-2">
            { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && (
              <button
                onClick={() => moveTask(task.id, "completed")}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors font-medium shadow-sm"
              >
                Complete
              </button>
            ) }
            { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && (
              <button
                onClick={() => moveTask(task.id, "not_started")}
                className="px-2 py-1 text-xs bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors font-medium shadow-sm"
              >
                Back
              </button>
            ) }
            { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && editButton }
          </div>
        );
      case "completed":
        return (
          <div className="flex gap-2">
            { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && (
              <button
                onClick={() => moveTask(task.id, "in_progress")}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-medium shadow-sm"
              >
                Reopen
              </button>
            ) }
            { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && (
              <button
                onClick={() => handleDelete(task.id)}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium shadow-sm"
              >
                Delete
              </button>
            ) }
            { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && editButton }
          </div>
        );
      case "cancelled":
        return (
          <div className="flex gap-2">
            { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && (
              <button
                onClick={() => moveTask(task.id, "not_started")}
                className="px-2 py-1 text-xs bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors font-medium shadow-sm"
              >
                Restore
              </button>
            ) }
            { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && (
              <button
                onClick={() => handleDelete(task.id)}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium shadow-sm"
              >
                Delete
              </button>
            ) }
            { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && editButton }
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
            isPDF(task.images[0]) ? (
              <div 
                onClick={() => window.open(task.images[0], '_blank')}
                className="w-full h-10 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-center gap-1 border border-gray-200"
              >
                <FiFileText className="text-red-500 w-4 h-4" />
                <span className="text-[10px] text-gray-600 font-medium">View PDF</span>
              </div>
            ) : (
              <img
                src={task.images[0]}
                alt="Task"
                className="w-full h-10 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  setCurrentImageIndex(0);
                  setShowImageModal(true);
                }}
              />
            )
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {task.images.slice(0, 4).map((image, index) => (
                <div key={index} className="relative">
                  {isPDF(image) ? (
                    <div 
                      onClick={() => window.open(image, '_blank')}
                      className="w-full h-6 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-center border border-gray-200"
                    >
                      <FiFileText className="text-red-500 w-3 h-3" />
                    </div>
                  ) : (
                    <img
                      src={image}
                      alt={`Task ${index + 1}`}
                      className="w-full h-6 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        setCurrentImageIndex(index);
                        setShowImageModal(true);
                      }}
                    />
                  )}
                  {index === 3 && task.images.length > 4 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center pointer-events-none">
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
            {isPDF(task.images[currentImageIndex]) ? (
              <div className="bg-white p-8 rounded-2xl flex flex-col items-center gap-4">
                <FiFileText className="w-16 h-16 text-red-500" />
                <p className="text-gray-900 font-medium">PDF Document</p>
                <button
                  onClick={() => window.open(task.images[currentImageIndex], '_blank')}
                  className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-medium shadow-md"
                >
                  Open PDF
                </button>
              </div>
            ) : (
              <img
                src={task.images[currentImageIndex]}
                alt={`Task ${currentImageIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
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
        {task.title || task.description}
      </h4>
      <p
        className={`text-xs mb-0.5 ${task.status === "cancelled" ? "text-gray-500" : "text-gray-600"}`}
      >
        {task.assignedTo || "Unassigned"}
      </p>
      <div className="flex justify-between mb-0.5">
        <div className="flex gap-1">
          {task.role && (
            <div
              className={`inline-flex items-center px-1 py-0 rounded-full text-xs font-medium ${getRoleColor(task.role)}`}
            >
              👤 {getRoleDisplay(task.role)}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {task.account && (
            <div className="inline-flex items-center px-1 py-0 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              🏢 {task.account}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-1">
        {getActionButtons(task.status, task, onEditTask, user)}
        {task.dueDate && task.status !== "completed" && (() => {
          const due = parseDate(task.dueDate);
          if (!due) return null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          due.setHours(0, 0, 0, 0);
          const diffTime = due - today;
          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let colorClass = "text-green-600";
          let text = `${days} days left`;
          
          if (days < 0) {
            colorClass = "text-red-500";
            text = `Overdue by ${Math.abs(days)} days`;
          } else if (days === 0) {
            colorClass = "text-orange-500";
            text = "Due Today";
          } else if (days <= 3) {
            colorClass = "text-orange-500";
          }
  
          return (
            <div className={`text-xs font-medium ${colorClass} flex items-center gap-1`}>
              <span><Hourglass size={12}/></span> {text}
            </div>
          );
        })()}
      </div>
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
  user,
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
                user={user}
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
  user,
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
                        title={task.title || task.description}
                      >
                        {task.title || task.description}
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
                    { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && (
                      <button
                        onClick={() => onEditTask(task)}
                        className="px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors font-semibold shadow-sm"
                      >
                        Edit
                      </button>
                    ) }

                    {/* Status change buttons */}
                    {task.status === "not_started" && (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && (
                      <button
                        onClick={() => moveTask(task.id, "in_progress")}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-semibold shadow-sm"
                      >
                        Start
                      </button>
                    )}
                    {task.status === "in_progress" && (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && (
                      <button
                        onClick={() => moveTask(task.id, "completed")}
                        className="px-2 py-1 text-xs bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors font-semibold shadow-sm"
                      >
                        Complete
                      </button>
                    )}
                    {(task.status === "completed" ||
                      task.status === "cancelled") && (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && (
                      <button
                        onClick={() => moveTask(task.id, "in_progress")}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-semibold shadow-sm"
                      >
                        Reopen
                      </button>
                    )}

                    { (task.assignedTo === user?.displayName || ["Director", "Head", "Admin"].includes(user?.role)) && (
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-semibold shadow-sm"
                      >
                        Delete
                      </button>
                    ) }
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

const SummaryView = ({ tasks, selectedMonth }) => {
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Filter tasks by selected month based on createdAt
  const getFilteredTasks = () => {
    if (!selectedMonth || selectedMonth === 'lifetime') return tasks;

    const [year, month] = selectedMonth.split('-');
    const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    return tasks.filter(task => {
      let taskDate = null;

      if (task.createdAt) {
        if (task.createdAt instanceof Date) {
          taskDate = task.createdAt;
        } else if (typeof task.createdAt === 'string') {
          taskDate = new Date(task.createdAt);
        } else if (task.createdAt?.toDate) {
          taskDate = task.createdAt.toDate();
        }
      }

      if (!taskDate) return false;
      return taskDate >= monthStart && taskDate <= monthEnd;
    });
  };

  const filteredTasks = getFilteredTasks();

  // Aggregate tasks by account
  const getAccountsSummary = () => {
    const accountsMap = {};

    filteredTasks.forEach(task => {
      // Check if task description/title contains "IGSB"
      const taskContent = `${task.title || ''} ${task.description || ''}`.toLowerCase();
      let account = task.account || 'Unassigned';
      
      // If IGSB is mentioned in the task, use IGSB as the account
      if (taskContent.includes('igsb')) {
        account = 'IGSB';
      }
      
      if (!accountsMap[account]) {
        accountsMap[account] = {
          total: 0,
          byMonth: {},
          byStatus: {
            not_started: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0
          },
          tasks: []
        };
      }

      accountsMap[account].total += 1;
      accountsMap[account].byStatus[task.status || 'not_started'] += 1;
      accountsMap[account].tasks.push(task);
    });

    return accountsMap;
  };

  const accountsSummary = getAccountsSummary();
  const accountsList = Object.keys(accountsSummary).sort();
  const grandTotal = Object.values(accountsSummary).reduce((sum, acc) => sum + acc.total, 0);

  const summaryCards = [
    {
      title: "Total Tasks",
      value: grandTotal,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Active Accounts",
      value: accountsList.length,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Completed",
      value: Object.values(accountsSummary).reduce((sum, acc) => sum + acc.byStatus.completed, 0),
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "In Progress",
      value: Object.values(accountsSummary).reduce((sum, acc) => sum + acc.byStatus.in_progress, 0),
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  if (selectedAccount) {
    const accountTasks = accountsSummary[selectedAccount].tasks;
    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedAccount(null)}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{selectedAccount}</h2>
            <p className="text-xs text-gray-600">{accountTasks.length} tasks</p>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider flex-1">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-32">
                  Assignee
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-20">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accountTasks.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500 text-sm">
                    No tasks for this account
                  </td>
                </tr>
              ) : (
                accountTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs font-medium text-gray-600">
                      {task.id && !isNaN(parseInt(task.id.replace("dmtask", "")))
                        ? parseInt(task.id.replace("dmtask", ""))
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {task.title || task.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {task.assignedTo ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-xs font-medium text-blue-700">
                          {task.assignedTo}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          task.status === "completed"
                            ? "bg-green-50 text-green-700"
                            : task.status === "in_progress"
                              ? "bg-orange-50 text-orange-700"
                              : task.status === "cancelled"
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {task.status || "pending"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.title}
              className={`${card.bgColor} rounded-xl p-3 border border-gray-200/50`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${card.bgColor} border border-gray-200/30`}>
                  <IconComponent className={`w-4 h-4 ${card.color}`} />
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${card.color} uppercase tracking-wide`}>
                    {card.title}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accounts Summary Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50/80 z-10 min-w-[180px]">
                  Account
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-20">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-20">
                  Done
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-20">
                  Active
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-20">
                  Pending
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-20">
                  Cancelled
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accountsList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-gray-400" />
                      <p className="text-sm text-gray-500">No tasks available</p>
                    </div>
                  </td>
                </tr>
              ) : (
                accountsList.map((account) => {
                  const data = accountsSummary[account];

                  return (
                    <tr key={account} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white hover:bg-gray-50/50 z-10 min-w-[180px]">
                        <button
                          onClick={() => setSelectedAccount(account)}
                          className="flex items-center gap-2 w-full text-blue-600 hover:text-blue-700 hover:underline transition-all"
                        >
                          <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-blue-700">
                              {account.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="truncate">{account}</span>
                        </button>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-xs font-semibold text-gray-700">
                          {data.total}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-xs font-medium text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          {data.byStatus.completed}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 text-xs font-medium text-orange-700">
                          <Clock className="w-3 h-3" />
                          {data.byStatus.in_progress}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 text-xs font-medium text-gray-700">
                          <Circle className="w-3 h-3" />
                          {data.byStatus.not_started}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-xs font-medium text-red-700">
                          <XCircle className="w-3 h-3" />
                          {data.byStatus.cancelled}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}

              {accountsList.length > 0 && (
                <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                  <td className="px-4 py-3 text-sm text-gray-900 sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-600" />
                      <span>TOTAL</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-200 text-xs font-bold text-gray-800">
                      {grandTotal}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-xs font-bold text-green-800">
                      <CheckCircle className="w-3 h-3" />
                      {Object.values(accountsSummary).reduce((sum, acc) => sum + acc.byStatus.completed, 0)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-100 text-xs font-bold text-orange-800">
                      <Clock className="w-3 h-3" />
                      {Object.values(accountsSummary).reduce((sum, acc) => sum + acc.byStatus.in_progress, 0)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-xs font-bold text-gray-800">
                      <Circle className="w-3 h-3" />
                      {Object.values(accountsSummary).reduce((sum, acc) => sum + acc.byStatus.not_started, 0)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 text-xs font-bold text-red-800">
                      <XCircle className="w-3 h-3" />
                      {Object.values(accountsSummary).reduce((sum, acc) => sum + acc.byStatus.cancelled, 0)}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const LogsView = ({ logs, loading, confirmed, onConfirm }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Delete Logs</h3>
        {!confirmed ? (
          <div className="text-center py-8">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6 max-w-md mx-auto">
              <div className="flex items-center justify-center mb-4">
                <FiAlertCircle className="w-8 h-8 text-amber-600 mr-3" />
                <h4 className="text-lg font-semibold text-amber-800">System Performance Notice</h4>
              </div>
              <p className="text-sm text-amber-700 mb-4">
                This section contains a large number of audit records. Loading may impact performance and incur database charges.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Proceed only for compliance or administrative review.
              </p>
              <button
                onClick={onConfirm}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                Load Audit Logs
              </button>
            </div>
          </div>
        ) : (
          <>
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No logs found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-700">Action</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700">Task</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700">Assigned To</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700">Deleted By</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100">
                        <td className="py-2 px-2 text-gray-900">{log.action}</td>
                        <td className="py-2 px-2 text-gray-900">{log.entityName || log.additionalData?.title || log.additionalData?.description || 'Unknown'}</td>
                        <td className="py-2 px-2 text-gray-900">{log.additionalData?.assignedTo || 'Unknown'}</td>
                        <td className="py-2 px-2 text-gray-900">{log.userName}</td>
                        <td className="py-2 px-2 text-gray-500">
                          {log.timestamp instanceof Date ? log.timestamp.toLocaleString() : 'Invalid Date'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const TaskManager = ({ onBack }) => {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const { user } = useAuth();
  const canEditDueDate = ["Admin", "Director", "Head"].includes(user?.role);
  const canAssignOthers = ["Admin", "Director", "Head"].includes(user?.role);
  const [assignedTo, setAssignedTo] = useState(canAssignOthers ? "" : user?.displayName || "");
  const [role, setRole] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [startDate, setStartDate] = useState(getTodayIST());
  const [dueDate, setDueDate] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentView, setCurrentView] = useState("kanban");
  const [logsConfirmed, setLogsConfirmed] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    user: user?.role === "Director" || user?.role === "Head" ? "" : user?.displayName || "",
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
  const [setShowNoMorePopup] = useState(false);
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
  const [showSummary, setShowSummary] = useState(false);
  const [selectedSummaryMonth, setSelectedSummaryMonth] = useState("lifetime");
  const [allTasksForSummary, setAllTasksForSummary] = useState([]);

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

  // Helper function to get all tasks from the new structure
  const getAllTasksFromData = () => {
    const allTasks = [];
    tasksData.forEach(account => {
      account.roles.forEach(role => {
        role.tasks.forEach(task => {
          if (task) {
            allTasks.push({
              account: account.account,
              role: role.name,
              task: task
            });
          }
        });
      });
    });
    return allTasks;
  };

  // Helper function to get tasks for a specific account and role
  const getTasksForAccountAndRole = (account, roleName) => {
    const accountData = tasksData.find(acc => acc.account === account);
    if (accountData) {
      const roleData = accountData.roles.find(r => r.name === roleName);
      return roleData ? roleData.tasks : [];
    }
    return [];
  };

  const allTasksFlat = getAllTasksFromData();
  const uniqueTasksList = [...new Set(allTasksFlat.map((item) => item.task))];
  const typingTasks = uniqueTasksList.slice(0, 5);
  const [placeholderText, setPlaceholderText] = useState("");
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  const uniqueAccounts = tasksData.map((item) => item.account);
  
  const rolesForAccount = selectedAccount
    ? tasksData.find(acc => acc.account === selectedAccount)?.roles.map(r => r.name) || []
    : [];
  
  const tasksForRole = selectedRole && selectedAccount
    ? getTasksForAccountAndRole(selectedAccount, selectedRole)
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

    const cachedAssignees = localStorage.getItem("dmAssignees");
    if (cachedAssignees) {
      const parsedAssignees = JSON.parse(cachedAssignees);
      setAssignees(parsedAssignees);
      const filterPreference = localStorage.getItem("dmFilterPreference") || "user";
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

    const calendarLimit = currentView === "calendar" ? 500 : currentLimit;
    
    let qConstraints = [
      orderBy("createdAt", "desc"),
      limit(calendarLimit)
    ];

    if (filters.user) {
      qConstraints = [
        where("assignedTo", "==", filters.user),
        orderBy("createdAt", "desc"),
        limit(calendarLimit)
      ];
    }

    const tasksQuery = query(
      collection(db, "marketing_tasks"),
      ...qConstraints
    );
    const unsubscribeTasks = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const tasksData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            images: data.images || (data.imageUrl ? [data.imageUrl] : []),
          };
        });
        const previousLength = tasks.length;
        const previousFilteredLength = 0; // Can't access filteredTasks here
        setTasks(tasksData);
        if (initialLoadRef.current) {
          setIsLoading(false);
          initialLoadRef.current = false;
        }
        if (loadingMore) {
          const newTasksCount = tasksData.length - previousLength;

          if (newTasksCount > 0) {
            if (loadMoreTimeoutRef.current) {
              clearTimeout(loadMoreTimeoutRef.current);
              loadMoreTimeoutRef.current = null;
            }
            setLoadingMore(false);

            const newFilteredTasks = tasksData.filter((task) => {
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
              if (taskDate && (taskDate < weekStart || taskDate > weekEnd)) return false;
              return true;
            });

            const newVisibleTasksCount = newFilteredTasks.length - previousFilteredLength;
            const message = newVisibleTasksCount > 0
              ? `${newVisibleTasksCount} tasks fetched.`
              : `${newTasksCount} tasks loaded (${newTasksCount - newVisibleTasksCount} filtered out).`;

            setToastMessage(message);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            setNoMoreTasks(false);
            setNoMoreCount(0);
          } else {
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
        }
        if (loadingMore) {
          if (loadMoreTimeoutRef.current) {
            clearTimeout(loadMoreTimeoutRef.current);
            loadMoreTimeoutRef.current = null;
          }
          setLoadingMore(false);
        }
      },
    );

    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const dmUsers = usersSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((user) => {
            const hasDM = user.departments && user.departments.includes("DM");
            const hasAdminDept = user.departments && user.departments.includes("Admin");
            return hasDM || hasAdminDept;
          })
          .map((user) => user.displayName || user.name || user.email)
          .filter(Boolean);
        setAssignees(dmUsers);
        localStorage.setItem("dmAssignees", JSON.stringify(dmUsers));
        const filterPreference = localStorage.getItem("dmFilterPreference") || "user";
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
  }, [user?.uid, user?.displayName, refreshTrigger, currentLimit, currentView, filters.user, currentWeek, filters.endDate, filters.role, filters.startDate, loadingMore, noMoreCount, tasks.length, user?.role]);

  useEffect(() => {
    if (currentView === "logs" && logsConfirmed) {
      const fetchLogs = async () => {
        setLogsLoading(true);
        try {
          const logsQuery = query(
            collection(db, "marketing_audit_logs"),
            where("action", "==", "Task Deleted"),
            orderBy("timestamp", "desc"),
            limit(100)
          );
          const logsSnapshot = await getDocs(logsQuery);
          const logsData = logsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
          }));
          setLogs(logsData);
        } catch (error) {
          console.error("Error fetching logs:", error);
          setLogs([]);
        } finally {
          setLogsLoading(false);
        }
      };
      fetchLogs();
    }
  }, [currentView, logsConfirmed]);

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
            setTimeout(() => setIsDeleting(true), 1000);
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
    );
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, currentTaskIndex, typingTasks]);

  useEffect(() => {
    return () => {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, []);

  // Fetch ALL tasks for summary view (without pagination limit)
  useEffect(() => {
    if (!showSummary) return; // Only fetch when summary is shown
    
    const fetchAllTasks = async () => {
      try {
        const tasksRef = collection(db, "marketing_tasks");
        const querySnapshot = await getDocs(tasksRef);
        const allTasks = [];
        
        querySnapshot.forEach((doc) => {
          allTasks.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        
        setAllTasksForSummary(allTasks);
      } catch (error) {
        console.error("Error fetching all tasks for summary:", error);
      }
    };
    
    fetchAllTasks();
  }, [showSummary]);

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

      let fileToUpload = file;

      // Only compress if it's an image
      if (file.type.startsWith('image/')) {
        fileToUpload = await new Promise((resolve, reject) => {
          new ImageCompressor(file, {
            quality: 0.8,
            maxWidth: 1200,
            maxHeight: 1200,
            success: resolve,
            error: reject,
          });
        });
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("upload_preset", "react_profile_upload");
      formData.append("cloud_name", "da0ypp61n");

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
    setFormError("");

    setShowForm(false);
    
    const taskTitle = title.trim();
    const taskAssignedTo = assignedTo.trim();
    const taskRole = role;
    const taskAccount = selectedAccount;
    const taskRolePlay = selectedRole;
    const taskSpecific = selectedTask;
    const taskStartDate = startDate;
    const taskDueDate = dueDate;
    
    setTitle("");
    setAssignedTo(canAssignOthers ? "" : user?.displayName || "");
    setRole("");
    setSelectedAccount("");
    setSelectedRole("");
    setSelectedTask("");
    setStartDate(getTodayIST());
    setDueDate("");
    clearImage();

    (async () => {
      try {
        const taskId = await getNextTaskId();

        let images = [];
        if (imageFile) {
          uploadImage(imageFile)
            .then((imageUrl) => {
              updateDoc(doc(db, "marketing_tasks", taskId), {
                images: [imageUrl],
              });
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
          title: taskTitle,
          description: taskTitle,
          assignedTo: taskAssignedTo,
          role: taskRole || null,
          account: taskAccount || null,
          rolePlay: taskRolePlay || null,
          task: taskSpecific || null,
          dueDate: taskDueDate || null,
          startDate: taskStartDate || getTodayIST(),
          status: "not_started",
          images,
          userId: user.uid,
          originalUserId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
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
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.assignedTo !== user?.displayName && !["Director", "Head", "Admin"].includes(user?.role)) {
      alert("You can only change the status of your own tasks.");
      return;
    }
    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );
    try {
      await moveTaskImmediate(taskId, newStatus);
    } catch (error) {
      console.error("Error updating task:", error);
    }
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

    if (
      filters.user &&
      (task.status === "not_started" || task.status === "in_progress")
    ) {
      // Skip date filter for active tasks when user filter is active
    } else if (taskDate) {
      if (currentView === "calendar") {
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
        const weekStart = new Date(currentWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        if (taskDate < weekStart || taskDate > weekEnd) return false;
      }
    }

    return true;
  });

  const getTasksByStatus = (status) => {
    return filteredTasks.filter((t) => t.status === status);
  };

  const handleEditTask = (task) => {
    if (task.assignedTo !== user?.displayName && !["Director", "Head", "Admin"].includes(user?.role)) {
      alert("You can only edit your own tasks.");
      return;
    }
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleSaveTaskDates = async (taskId, taskData) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || (task.assignedTo !== user?.displayName && !["Director", "Head", "Admin"].includes(user?.role))) {
      alert("You can only edit your own tasks.");
      return;
    }
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
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (task.assignedTo !== user?.displayName && !["Director", "Head", "Admin"].includes(user?.role)) {
      alert("You can only delete your own tasks.");
      return;
    }
    await logMarketingActivity("Task Deleted", {
      id: task.id,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      status: task.status,
      role: task.role
    });
    setTasks(tasks.filter((t) => t.id !== id));
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

  const logMarketingActivity = async (action, entityData = {}) => {
    try {
      const auditLog = {
        timestamp: serverTimestamp(),
        userId: user?.uid,
        userName: user?.displayName || user?.email || "Unknown User",
        userEmail: user?.email,
        action: action,
        module: "Marketing Dashboard",
        entityType: "task",
        entityId: entityData.id,
        entityName: entityData.title || entityData.description,
        riskLevel: "Low",
        success: true,
        additionalData: entityData
      };

      await addDoc(collection(db, "marketing_audit_logs"), auditLog);
    } catch (error) {
      console.error("Failed to log marketing activity:", error);
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
              ) : currentView === "table" ? (
                <TableSkeleton />
              ) : currentView === "logs" ? (
                <TableSkeleton />
              ) : null}
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
                      {user?.department === "Admin" && (
                        <button
                          onClick={() => {
                            setCurrentView("logs");
                            setLogsConfirmed(false);
                          }}
                          className={`px-2 py-1 text-xs font-medium rounded-xl transition-colors ${
                            currentView === "logs"
                              ? "bg-blue-500 text-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          Logs
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setIsRefreshing(true);
                        setRefreshTrigger((prev) => prev + 1);
                        setTimeout(() => setIsRefreshing(false), 800);
                      }}
                      disabled={isRefreshing}
                      className={`px-3 py-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all duration-300 text-xs font-medium shadow-sm flex items-center gap-1 ${
                        isRefreshing ? 'shadow-md' : ''
                      }`}
                    >
                      <FiRefreshCw className={`w-3 h-3 transition-transform duration-500 ease-in-out ${
                        isRefreshing ? 'rotate-180' : 'hover:rotate-90'
                      }`} />
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

                {/* Summary Back Button */}
                {currentView === "table" && showSummary && (
                  <div className="mb-4 p-2">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">Summary Analytics</h2>
                          <p className="text-xs text-gray-600 mt-0.5">View task distribution across all accounts</p>
                        </div>
                        <div className="h-12 w-px bg-gray-300 hidden sm:block"></div>
                        <div className="flex items-center gap-2">
                          <label htmlFor="monthFilter" className="text-sm font-semibold text-gray-700">
                            Filter by Month:
                          </label>
                          <select
                            id="monthFilter"
                            value={selectedSummaryMonth}
                            onChange={(e) => setSelectedSummaryMonth(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:border-gray-400 transition-colors font-medium"
                          >
                            <option value="lifetime">📅 Lifetime (All Months)</option>
                            {Array.from({ length: 12 }, (_, i) => {
                              const date = new Date();
                              date.setMonth(date.getMonth() - i);
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                              return (
                                <option key={`${year}-${month}`} value={`${year}-${month}`}>
                                  {monthName}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowSummary(false)}
                        className="px-4 py-2 bg-linear-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg text-sm font-semibold flex items-center gap-2"
                      >
                        ← Back to Table
                      </button>
                    </div>
                  </div>
                )}

                {/* Filters */}
                {currentView !== "logs" && !showSummary && (
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

                      {!showSummary && (
                        <button
                          onClick={() => {
                            if (!buttonDisabled && !noMoreTasks) {
                              setLoadingMore(true);
                              setCurrentLimit((prev) => prev + 100);
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
                      )}

                      {currentView === "table" && !showSummary && (
                        <button
                          onClick={() => setShowSummary(true)}
                          className="px-2 py-1 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                        >
                          Summary
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Task Creation Form Modal */}
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
                          <label className="block text-[10px] font-medium text-gray-500 ml-1 mb-0.5">Role (opt)</label>
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
                          <label className="block text-[10px] font-medium text-gray-500 ml-1 mb-0.5">Assignee*</label>
                          <select
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            disabled={!canAssignOthers}
                            className={`w-full px-2 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 ${!canAssignOthers ? 'cursor-not-allowed opacity-75' : ''}`}
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
                          <label className="block text-[10px] font-medium text-gray-500 ml-1 mb-0.5">Account (opt)</label>
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
                          <label className="block text-[10px] font-medium text-gray-500 ml-1 mb-0.5">Role Play (opt)</label>
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
                          <label className="block text-[10px] font-medium text-gray-500 ml-1 mb-0.5">Task (opt)</label>
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
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 ml-1 mb-0.5">Start Date</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                            placeholder="Start Date"
                          />
                        </div>
                        {canEditDueDate && (
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 ml-1 mb-0.5">Due Date</label>
                            <input
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                              placeholder="Due Date"
                            />
                          </div>
                        )}
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
                            accept="image/*,application/pdf"
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
                            disabled={uploadingImage || !title.trim() || !assignedTo.trim()}
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
                              setAssignedTo(canAssignOthers ? "" : user?.displayName || "");
                              setRole("");
                              setSelectedAccount("");
                              setSelectedRole("");
                              setSelectedTask("");
                              setStartDate(getTodayIST());
                              setDueDate("");
                              clearImage();
                              setShowForm(false);
                            }}
                            className="px-3 py-1.5 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors font-medium text-xs shadow-sm"
                          >
                            Reset
                          </button>
                          {imagePreview && (
                             isPDF(imagePreview) ? (
                               <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200 shadow-sm">
                                 <FiFileText className="text-red-500 w-5 h-5" />
                               </div>
                             ) : (
                               <img
                                 src={imagePreview}
                                 alt="Preview"
                                 className="w-10 h-10 object-cover rounded-xl border border-gray-200 shadow-sm"
                               />
                             )
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
                          user={user}
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
                          user={user}
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
                          user={user}
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
                          user={user}
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
                  user={user}
                />
              ) : currentView === "table" ? (
                <div key={showSummary ? "summary" : "table"}>
                  {showSummary ? (
                    <div className="summary-flip-in">
                      <SummaryView tasks={allTasksForSummary} selectedMonth={selectedSummaryMonth} />
                    </div>
                  ) : (
                    <div className="table-flip-in">
                      <TableView
                        tasks={filteredTasks}
                        getRoleDisplay={getRoleDisplay}
                        getRoleColor={getRoleColor}
                        handleDelete={handleDelete}
                        moveTask={moveTask}
                        onEditTask={handleEditTask}
                        user={user}
                      />
                    </div>
                  )}
                </div>
              ) : currentView === "logs" ? (
                <LogsView logs={logs} loading={logsLoading} confirmed={logsConfirmed} onConfirm={() => setLogsConfirmed(true)} />
              ) : null}
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
              user={user}
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