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
import {
  useDroppable,
} from "@dnd-kit/core";
import {
  useDraggable,
} from "@dnd-kit/core";
import ImageCompressor from "image-compressor.js";
import { FiPaperclip, FiImage, FiX, FiChevronLeft, FiChevronRight, FiEdit2 } from "react-icons/fi";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import {
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot
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

const TaskCard = ({ task, getRoleDisplay, getRoleColor, handleDelete, moveTask, onImageDelete, onEditTask }) => {
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
        case 'ArrowRight':
          e.preventDefault();
          setCurrentImageIndex((prev) => (prev < task.images.length - 1 ? prev + 1 : 0));
          break;
        case 'Escape':
          e.preventDefault();
          setShowImageModal(false);
          break;
        case 'Delete':
        case 'Backspace':
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
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
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

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'completed':
        return { opacity: 0.75, textDecoration: 'line-through' };
      case 'cancelled':
        return { opacity: 0.6, color: '#6B7280' };
      default:
        return {};
    }
  };

  const getActionButtons = (status, task, onEditTask) => {
    const editButton = (
      <button
        onClick={() => onEditTask(task)}
        className="px-2 py-1 text-xs text-gray-800 rounded-full hover:opacity-80 transition-colors font-medium shadow-sm"
        style={{ backgroundColor: '#E6E6FA' }}
      >
        Edit
      </button>
    );

    switch (status) {
      case 'not_started':
        return (
          <div className="flex gap-2">
            <button
              onClick={() => moveTask(task.id, 'in_progress')}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-medium shadow-sm"
            >
              Start
            </button>
            <button
              onClick={() => moveTask(task.id, 'cancelled')}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium shadow-sm"
            >
              Cancel
            </button>
            {editButton}
          </div>
        );
      case 'in_progress':
        return (
          <div className="flex gap-2">
            <button
              onClick={() => moveTask(task.id, 'completed')}
              className="px-2 py-1 text-xs bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors font-medium shadow-sm"
            >
              Complete
            </button>
            <button
              onClick={() => moveTask(task.id, 'not_started')}
              className="px-2 py-1 text-xs bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors font-medium shadow-sm"
            >
              Back
            </button>
            {editButton}
          </div>
        );
      case 'completed':
        return (
          <div className="flex gap-2">
            <button
              onClick={() => moveTask(task.id, 'in_progress')}
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
      case 'cancelled':
        return (
          <div className="flex gap-2">
            <button
              onClick={() => moveTask(task.id, 'not_started')}
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
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-white p-2 rounded-2xl shadow-lg cursor-grab active:cursor-grabbing hover:shadow-xl transition-all duration-200 relative"
    >
      {task.images && task.images.length > 0 && (
        <div className="mb-1">
          {task.images.length === 1 ? (
            <img
              src={task.images[0]}
              alt="Task"
              className="w-full h-16 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
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
                    className="w-full h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setCurrentImageIndex(index);
                      setShowImageModal(true);
                    }}
                  />
                  {index === 3 && task.images.length > 4 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-xs">+{task.images.length - 4}</span>
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
                  onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : task.images.length - 1))}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
                >
                  <FiChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev < task.images.length - 1 ? prev + 1 : 0))}
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
        className="font-medium text-gray-900 mb-1 pr-6 text-sm"
        style={getStatusStyles(task.status)}
      >
        {task.title}
      </h4>
      <p className={`text-xs mb-1 ${task.status === 'cancelled' ? 'text-gray-500' : 'text-gray-600'}`}>
        {task.assignedTo || 'Unassigned'}
      </p>
      {task.role && (
        <div className={`inline-flex items-center px-1 py-0 rounded-full text-xs font-medium ${getRoleColor(task.role)} mb-1`}>
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
    <div className={`${bgColor} rounded-2xl p-2 min-h-[200px] transition-colors shadow-sm`}>
      <h3 className="font-semibold text-gray-900 mb-2 flex items-center text-sm">
        <div className={`w-3 h-3 ${color} rounded-full mr-3`}></div>
        {title}
        <span className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${
          color === 'bg-gray-400' ? 'bg-gray-200 text-gray-700' :
          color === 'bg-blue-500' ? 'bg-blue-200 text-blue-700' :
          color === 'bg-green-500' ? 'bg-green-200 text-green-700' :
          'bg-red-200 text-red-700'
        }`}>
          {tasks.length}
        </span>
      </h3>
      <div ref={setNodeRef} className="space-y-1.5 min-h-[180px]">
        {children}
      </div>
    </div>
  );
};

const CalendarView = ({ tasks, userFilter, getRoleDisplay, getRoleColor, handleDelete, moveTask, onImageDelete, onEditTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const filteredTasks = userFilter
    ? tasks.filter(t => t.assignedTo === userFilter)
    : tasks;

  const getTasksForDate = (date) => {
    return filteredTasks.filter(task => {
      // If task has start and due dates, check if the date falls within the range
      if (task.startDate && task.dueDate) {
        const startDate = new Date(task.startDate);
        const dueDate = new Date(task.dueDate);
        const checkDate = new Date(date);
        return checkDate >= startDate && checkDate <= dueDate;
      }
      // Otherwise, use creation date (fallback)
      const taskDate = new Date(parseInt(task.id));
      return taskDate.toDateString() === date.toDateString();
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

  const navigateMonth = (direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = getDaysInMonth(currentDate);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-3">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
        >
          ‹
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          {formatMonthYear(currentDate)}
        </h2>
        <button
          onClick={() => navigateMonth(1)}
          className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
        >
          ›
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} className="p-3 bg-gray-50 rounded-xl"></div>;
          }

          const dayTasks = getTasksForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

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
                    title={task.title}
                  >
                    {task.title}
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
          <div className="space-y-2 max-h-48 overflow-y-auto">
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

const TaskManager = ({ onBack }) => {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [role, setRole] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [currentView, setCurrentView] = useState("kanban"); // "kanban" or "calendar"
  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading] = useState(true);
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const roleAbbreviations = {
    'Video Editor': 'VE',
    'Graphic Designer': 'GD',
    'Manager': 'MG',
    'Developer': 'DEV',
    'Content Writer': 'CW',
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    if (!user?.uid) {
      setTasks([]);
      // setIsLoading(false); // Commented out for testing - keeps loading true
      return;
    }

    // setIsLoading(true); // Commented out for testing - keeps loading true

    // Set up real-time listener for tasks
    const tasksRef = doc(db, "marketing_tasks", user.uid);
    const unsubscribe = onSnapshot(tasksRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        let tasksData = data.tasks || [];

        // Migrate old imageUrl format to new images array format
        tasksData = tasksData.map(task => {
          if (task.imageUrl && !task.images) {
            return { ...task, images: [task.imageUrl] };
          }
          return task;
        });

        setTasks(tasksData);
      } else {
        setTasks([]);
      }
      // setIsLoading(false); // Commented out for testing - keeps loading true
    }, (error) => {
      console.error("Error loading tasks from Firestore:", error);
      setTasks([]);
      // setIsLoading(false); // Commented out for testing - keeps loading true
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const persist = async (next) => {
    if (!user?.uid) {
      console.warn("No user logged in, cannot save tasks");
      return;
    }

    setTasks(next);

    try {
      const tasksRef = doc(db, "marketing_tasks", user.uid);
      await setDoc(tasksRef, {
        tasks: next,
        lastUpdated: serverTimestamp(),
        userId: user.uid
      }, { merge: true });
    } catch (e) {
      console.error("Error saving tasks to Firestore:", e);
    }
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
      formData.append('file', compressedFile);
      formData.append('upload_preset', 'react_profile_upload');
      formData.append('cloud_name', 'da0ypp61n');

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/da0ypp61n/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
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
    if (!title.trim()) return;

    try {
      let images = [];
      if (imageFile) {
        const imageUrl = await uploadImage(imageFile);
        images = [imageUrl];
      }

      const t = {
        id: `${Date.now()}`,
        title: title.trim(),
        assignedTo: assignedTo.trim(),
        role: role || null,
        status: 'not_started',
        images,
      };

      const next = [t, ...tasks];
      await persist(next);
      setTitle("");
      setAssignedTo("");
      setRole("");
      clearImage();
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Failed to create task. Please try again.");
    }
  };

  const moveTask = async (taskId, newStatus) => {
    const next = tasks.map(t => String(t.id) === String(taskId) ? { ...t, status: newStatus } : t);
    await persist(next);
  };

  const getTasksByStatus = (status) => {
    let filteredTasks = tasks.filter(t => t.status === status);
    if (userFilter) {
      filteredTasks = filteredTasks.filter(t => t.assignedTo === userFilter);
    }
    return filteredTasks;
  };

  const getUniqueAssignees = () => {
    const assignees = tasks.map(t => t.assignedTo).filter(Boolean);
    return [...new Set(assignees)].sort();
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleSaveTaskDates = async (taskId, taskData) => {
    const next = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, ...taskData };
      }
      return t;
    });
    await persist(next);
  };

  const handleDelete = async (id) => {
    const next = tasks.filter(t => t.id !== id);
    await persist(next);
  };

  const handleImageDelete = async (taskId, imageIndex) => {
    const next = tasks.map(t => {
      if (t.id === taskId && t.images) {
        const updatedImages = t.images.filter((_, index) => index !== imageIndex);
        return { ...t, images: updatedImages };
      }
      return t;
    });
    await persist(next);
  };

  const getRoleDisplay = (role) => {
    return roleAbbreviations[role] || role || "—";
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Video Editor':
        return 'bg-purple-100 text-purple-800';
      case 'Graphic Designer':
        return 'bg-pink-100 text-pink-800';
      case 'Manager':
        return 'bg-blue-100 text-blue-800';
      case 'Developer':
        return 'bg-green-100 text-green-800';
      case 'Content Writer':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    if (overId === 'not_started' || overId === 'in_progress' || overId === 'completed' || overId === 'cancelled') {
      const task = tasks.find(t => String(t.id) === activeId);
      if (task && task.status !== overId) {
        await moveTask(activeId, overId);
      }
    }

    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

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
                <h2 className="text-xl font-bold text-gray-800 mb-1">Coming Soon! 🚀</h2>
                <p className="text-sm text-gray-600">Our developers are crafting something amazing! 👨‍💻✨</p>
              </div>
              <div className="mb-2">
                <HeaderSkeleton />
                <FormSkeleton />
              </div>
              {currentView === "kanban" ? <KanbanSkeleton /> : <CalendarSkeleton />}
            </>
          ) : (
            <>
              <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 mb-0.5">Task Management</h1>
                    <p className="text-gray-600 text-xs">Organize and track your marketing tasks with ease</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center space-x-1">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                        <span>Real-time updates</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 font-medium">Filter by User:</label>
                      <select
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm"
                      >
                        <option value="">All Users</option>
                        {getUniqueAssignees().map(assignee => (
                          <option key={assignee} value={assignee}>{assignee}</option>
                        ))}
                      </select>
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
                    </div>
                    <button
                      onClick={onBack}
                      className="px-3 py-1.5 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-xs font-medium shadow-sm"
                    >
                      ← Back
                    </button>
                  </div>
                </div>

                {/* Task Creation Form */}
                <div className="bg-white rounded-2xl shadow-lg p-3 mb-3">
                  <h2 className="text-base font-semibold text-gray-900 mb-2">Create New Task</h2>
                  <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <input
                        value={title}
                        onChange={(e)=>setTitle(e.target.value)}
                        placeholder="Task title..."
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                        required
                      />
                    </div>
                    <div>
                      <select
                        value={role}
                        onChange={(e)=>setRole(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                      >
                        <option value="">Select role (opt)</option>
                        <option value="Video Editor">Video Editor</option>
                        <option value="Graphic Designer">Graphic Designer</option>
                        <option value="Manager">Manager</option>
                        <option value="Developer">Developer</option>
                        <option value="Content Writer">Content Writer</option>
                      </select>
                    </div>
                    <div>
                      <input
                        value={assignedTo}
                        onChange={(e)=>setAssignedTo(e.target.value)}
                        placeholder="Assignee..."
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                      />
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
                        onClick={()=>{setTitle(""); setAssignedTo(""); setRole(""); clearImage()}}
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

              {/* Conditional View Rendering */}
              {currentView === "kanban" ? (
                <>
                  {/* Kanban Board */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Column
                      id="not_started"
                      title="Not Started"
                      color="bg-gray-400"
                      bgColor="bg-gray-50"
                      tasks={getTasksByStatus('not_started')}
                    >
                      {getTasksByStatus('not_started').map(t => (
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
                      tasks={getTasksByStatus('in_progress')}
                    >
                      {getTasksByStatus('in_progress').map(t => (
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
                      title="Completed"
                      color="bg-green-500"
                      bgColor="bg-green-50"
                      tasks={getTasksByStatus('completed')}
                    >
                      {getTasksByStatus('completed').map(t => (
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
                      title="Cancelled"
                      color="bg-red-500"
                      bgColor="bg-red-50"
                      tasks={getTasksByStatus('cancelled')}
                    >
                      {getTasksByStatus('cancelled').map(t => (
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
              ) : (
                <CalendarView
                  tasks={tasks}
                  userFilter={userFilter}
                  getRoleDisplay={getRoleDisplay}
                  getRoleColor={getRoleColor}
                  handleDelete={handleDelete}
                  moveTask={moveTask}
                  onImageDelete={handleImageDelete}
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

      <EditTaskModal
        task={editingTask}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTaskDates}
      />
    </DndContext>
  );
};

export default TaskManager;
