import React, { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../../firebase";
import tasksData from "./task.js";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  query,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { FiEdit2, FiTrash2, FiPlus, FiChevronDown, FiChevronUp, FiCopy, FiCheck, FiX, FiSearch } from "react-icons/fi";
import { Folder, Users, FileText, PlusCircle, Trash, Edit, Check, X } from "lucide-react";

const TaskAdminPanel = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRoles, setExpandedRoles] = useState({});
  
  // Modal states
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [activeRoleForTask, setActiveRoleForTask] = useState(null);

  // Edit states
  const [editingRole, setEditingRole] = useState(null);
  const [editRoleName, setEditRoleName] = useState("");
  
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskName, setEditTaskName] = useState("");

  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e) => {
      if (isResizing && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;
        if (newWidth > 200 && newWidth < 600) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const logAdminActivity = async (action, entityName, details = {}) => {
    try {
      const auditLog = {
        timestamp: serverTimestamp(),
        userId: user?.uid,
        userName: user?.displayName || user?.email || "Unknown User",
        userEmail: user?.email,
        action: action,
        module: "Marketing Dashboard Admin",
        entityType: "task_template",
        entityName: entityName,
        riskLevel: "Low",
        success: true,
        additionalData: details
      };

      await addDoc(collection(db, "marketing_audit_logs"), auditLog);
    } catch (error) {
      console.error("Failed to log admin activity:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "dmtaskadmin"));
        const querySnapshot = await getDocs(q);
        const accountsList = [];
        
        querySnapshot.forEach((doc) => {
          accountsList.push({ id: doc.id, ...doc.data() });
        });

        // Seed data if empty
        if (accountsList.length === 0) {
          console.log("Seeding data from task.js...");
          for (const item of tasksData) {
            const docRef = doc(db, "dmtaskadmin", item.account);
            await setDoc(docRef, {
              account: item.account,
              roles: item.roles.map(r => ({
                roleId: `r_${Math.random().toString(36).substr(2, 9)}`,
                name: r.name,
                tasks: r.tasks.map(t => ({
                  taskId: `t_${Math.random().toString(36).substr(2, 9)}`,
                  name: t
                }))
              }))
            });
            accountsList.push({ id: item.account, account: item.account, roles: item.roles });
          }
        }

        setAccounts(accountsList);
        if (accountsList.length > 0) {
          setSelectedAccount(accountsList[0]);
        }
      } catch (error) {
        console.error("Error fetching tasks admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleRole = (roleId) => {
    setExpandedRoles(prev => ({
      ...prev,
      [roleId]: !prev[roleId]
    }));
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) return;
    
    // Check for duplicate
    const accountExists = accounts.some(acc => acc.account.toLowerCase() === newAccountName.trim().toLowerCase());
    if (accountExists) {
      alert("An account with this name already exists.");
      return;
    }
    
    try {
      const docRef = doc(db, "dmtaskadmin", newAccountName.trim());
      const newData = {
        account: newAccountName.trim(),
        roles: []
      };
      await setDoc(docRef, newData);
      setAccounts(prev => [...prev, { id: newAccountName.trim(), ...newData }]);
      setNewAccountName("");
      setShowAddAccount(false);
      setSelectedAccount({ id: newAccountName.trim(), ...newData });
      await logAdminActivity("Admin: Account Added", newAccountName.trim());
    } catch (error) {
      console.error("Error adding account:", error);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim() || !selectedAccount) return;
    
    // Check for duplicate
    const roleExists = selectedAccount.roles.some(role => role.name.toLowerCase() === newRoleName.trim().toLowerCase());
    if (roleExists) {
      alert("A role with this name already exists for this account.");
      return;
    }
    
    try {
      const updatedRoles = [
        ...selectedAccount.roles,
        {
          roleId: `r_${Math.random().toString(36).substr(2, 9)}`,
          name: newRoleName.trim(),
          tasks: []
        }
      ];
      
      const docRef = doc(db, "dmtaskadmin", selectedAccount.id);
      await updateDoc(docRef, { roles: updatedRoles });
      
      const updatedAccount = { ...selectedAccount, roles: updatedRoles };
      setSelectedAccount(updatedAccount);
      setAccounts(prev => prev.map(acc => acc.id === selectedAccount.id ? updatedAccount : acc));
      setNewRoleName("");
      setShowAddRole(false);
      await logAdminActivity("Admin: Role Added", newRoleName.trim(), { account: selectedAccount.account });
    } catch (error) {
      console.error("Error adding role:", error);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim() || !selectedAccount || !activeRoleForTask) return;
    
    // Check for duplicate
    const currentRole = selectedAccount.roles.find(r => r.roleId === activeRoleForTask.roleId);
    const taskExists = currentRole?.tasks.some(task => task.name.toLowerCase() === newTaskName.trim().toLowerCase());
    if (taskExists) {
      alert("A task with this name already exists for this role.");
      return;
    }
    
    try {
      const updatedRoles = selectedAccount.roles.map(role => {
        if (role.roleId === activeRoleForTask.roleId) {
          return {
            ...role,
            tasks: [
              ...role.tasks,
              {
                taskId: `t_${Math.random().toString(36).substr(2, 9)}`,
                name: newTaskName.trim()
              }
            ]
          };
        }
        return role;
      });
      
      const docRef = doc(db, "dmtaskadmin", selectedAccount.id);
      await updateDoc(docRef, { roles: updatedRoles });
      
      const updatedAccount = { ...selectedAccount, roles: updatedRoles };
      setSelectedAccount(updatedAccount);
      setAccounts(prev => prev.map(acc => acc.id === selectedAccount.id ? updatedAccount : acc));
      setNewTaskName("");
      setShowAddTask(false);
      setActiveRoleForTask(null);
      await logAdminActivity("Admin: Task Added", newTaskName.trim(), { account: selectedAccount.account, role: activeRoleForTask.name });
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const handleEditRole = async (roleId) => {
    if (!editRoleName.trim() || !selectedAccount) return;
    
    try {
      const updatedRoles = selectedAccount.roles.map(role => {
        if (role.roleId === roleId) {
          return { ...role, name: editRoleName.trim() };
        }
        return role;
      });
      
      const docRef = doc(db, "dmtaskadmin", selectedAccount.id);
      await updateDoc(docRef, { roles: updatedRoles });
      
      const updatedAccount = { ...selectedAccount, roles: updatedRoles };
      setSelectedAccount(updatedAccount);
      setAccounts(prev => prev.map(acc => acc.id === selectedAccount.id ? updatedAccount : acc));
      setEditingRole(null);
      setEditRoleName("");
      await logAdminActivity("Admin: Role Edited", editRoleName.trim(), { account: selectedAccount.account });
    } catch (error) {
      console.error("Error editing role:", error);
    }
  };

  const handleEditTask = async (roleId, taskId) => {
    if (!editTaskName.trim() || !selectedAccount) return;
    
    try {
      const updatedRoles = selectedAccount.roles.map(role => {
        if (role.roleId === roleId) {
          const updatedTasks = role.tasks.map(task => {
            if (task.taskId === taskId) {
              return { ...task, name: editTaskName.trim() };
            }
            return task;
          });
          return { ...role, tasks: updatedTasks };
        }
        return role;
      });
      
      const docRef = doc(db, "dmtaskadmin", selectedAccount.id);
      await updateDoc(docRef, { roles: updatedRoles });
      
      const updatedAccount = { ...selectedAccount, roles: updatedRoles };
      setSelectedAccount(updatedAccount);
      setAccounts(prev => prev.map(acc => acc.id === selectedAccount.id ? updatedAccount : acc));
      setEditingTask(null);
      setEditTaskName("");
      await logAdminActivity("Admin: Task Edited", editTaskName.trim(), { account: selectedAccount.account });
    } catch (error) {
      console.error("Error editing task:", error);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm("Are you sure you want to delete this role and all its tasks?")) return;
    
    try {
      const roleToDelete = selectedAccount.roles.find(role => role.roleId === roleId);
      const updatedRoles = selectedAccount.roles.filter(role => role.roleId !== roleId);
      
      const docRef = doc(db, "dmtaskadmin", selectedAccount.id);
      await updateDoc(docRef, { roles: updatedRoles });
      
      const updatedAccount = { ...selectedAccount, roles: updatedRoles };
      setSelectedAccount(updatedAccount);
      setAccounts(prev => prev.map(acc => acc.id === selectedAccount.id ? updatedAccount : acc));
      if (roleToDelete) {
        await logAdminActivity("Admin: Role Deleted", roleToDelete.name, { account: selectedAccount.account });
      }
    } catch (error) {
      console.error("Error deleting role:", error);
    }
  };

  const handleDeleteTask = async (roleId, taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    try {
      const updatedRoles = selectedAccount.roles.map(role => {
        if (role.roleId === roleId) {
          return {
            ...role,
            tasks: role.tasks.filter(task => task.taskId !== taskId)
          };
        }
        return role;
      });
      
      const role = selectedAccount.roles.find(r => r.roleId === roleId);
      const taskToDelete = role?.tasks.find(t => t.taskId === taskId);
      
      const docRef = doc(db, "dmtaskadmin", selectedAccount.id);
      await updateDoc(docRef, { roles: updatedRoles });
      
      const updatedAccount = { ...selectedAccount, roles: updatedRoles };
      setSelectedAccount(updatedAccount);
      setAccounts(prev => prev.map(acc => acc.id === selectedAccount.id ? updatedAccount : acc));
      if (taskToDelete) {
        await logAdminActivity("Admin: Task Deleted", taskToDelete.name, { account: selectedAccount.account, role: role.name });
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.account.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={containerRef} className="flex flex-col lg:flex-row h-[calc(100vh-12rem)] bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Left Sidebar - Accounts */}
      <div 
        className="w-full lg:w-auto border-b lg:border-b-0 lg:border-r border-gray-100 bg-gray-50/50 flex flex-col"
        style={{ width: isDesktop ? `${sidebarWidth}px` : '100%' }}
      >
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Folder size={16} className="text-indigo-600" />
              Accounts
            </h3>
            <button
              onClick={() => setShowAddAccount(true)}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Add Account"
            >
              <PlusCircle size={18} />
            </button>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
            />
            <FiSearch className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Loading accounts...</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No accounts found</div>
          ) : (
            filteredAccounts.map(acc => (
              <div
                key={acc.id}
                onClick={() => setSelectedAccount(acc)}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedAccount?.id === acc.id
                    ? "bg-indigo-50 border border-indigo-100 shadow-sm"
                    : "hover:bg-white hover:shadow-sm border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{acc.account}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {acc.roles?.length || 0} roles
                    </p>
                  </div>
                  {selectedAccount?.id === acc.id && (
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resizer */}
      <div 
        className="hidden lg:block w-1 hover:w-1.5 bg-gray-200 hover:bg-indigo-500 cursor-col-resize transition-all duration-150"
        onMouseDown={startResizing}
      />

      {/* Main Canvas - Roles & Tasks */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedAccount ? (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Folder size={18} className="text-indigo-600" />
                  {selectedAccount.account} Setup
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Manage roles and tasks for this account</p>
              </div>
              
              <button
                onClick={() => setShowAddRole(true)}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle size={14} />
                Add Role
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {selectedAccount.roles?.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No roles defined for this account. Click "Add Role" to get started.
                </div>
              ) : (
                selectedAccount.roles?.map(role => (
                  <div key={role.roleId} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    {/* Role Header */}
                    <div className="flex items-center justify-between p-3 bg-gray-50/80">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          onClick={() => toggleRole(role.roleId)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {expandedRoles[role.roleId] ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                        </button>
                        
                        {editingRole === role.roleId ? (
                          <div className="flex items-center gap-1 flex-1 max-w-sm">
                            <input
                              type="text"
                              value={editRoleName}
                              onChange={(e) => setEditRoleName(e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-indigo-500 rounded focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditRole(role.roleId)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <FiCheck size={16} />
                            </button>
                            <button
                              onClick={() => { setEditingRole(null); setEditRoleName(""); }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <FiX size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 truncate">
                            <Users size={14} className="text-gray-500" />
                            {role.name}
                            <span className="text-xs font-normal text-gray-500">
                              ({role.tasks?.length || 0} tasks)
                            </span>
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setActiveRoleForTask(role);
                            setShowAddTask(true);
                          }}
                          className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors font-medium flex items-center gap-1"
                        >
                          <PlusCircle size={12} />
                          Add Task
                        </button>
                        <button
                          onClick={() => {
                            setEditingRole(role.roleId);
                            setEditRoleName(role.name);
                          }}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded transition-colors"
                          title="Edit Role Name"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.roleId)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white rounded transition-colors"
                          title="Delete Role"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Tasks List */}
                    {expandedRoles[role.roleId] && (
                      <div className="p-3 bg-white">
                        {role.tasks?.length === 0 ? (
                          <div className="text-xs text-gray-500 italic py-2 text-center">
                            No tasks for this role
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {role.tasks?.map(task => (
                              <div
                                key={task.taskId}
                                className="group flex items-center justify-between p-2 text-xs bg-gray-50 hover:bg-indigo-50/50 border border-gray-100 rounded-lg hover:border-indigo-100 transition-all duration-200"
                              >
                                {editingTask === task.taskId ? (
                                  <div className="flex items-center gap-1 w-full">
                                    <input
                                      type="text"
                                      value={editTaskName}
                                      onChange={(e) => setEditTaskName(e.target.value)}
                                      className="w-full px-1.5 py-0.5 text-xs border border-indigo-500 rounded focus:outline-none"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleEditTask(role.roleId, task.taskId)}
                                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    >
                                      <FiCheck size={12} />
                                    </button>
                                    <button
                                      onClick={() => { setEditingTask(null); setEditTaskName(""); }}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <FiX size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-medium text-gray-700 truncate flex-1 flex items-center gap-1.5">
                                      <FileText size={10} className="text-gray-400" />
                                      {task.name}
                                    </span>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          setEditingTask(task.taskId);
                                          setEditTaskName(task.name);
                                        }}
                                        className="p-1 text-gray-500 hover:text-indigo-600 rounded"
                                        title="Edit Task"
                                      >
                                        <Edit size={10} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTask(role.roleId, task.taskId)}
                                        className="p-1 text-gray-500 hover:text-red-600 rounded"
                                        title="Delete Task"
                                      >
                                        <Trash size={10} />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Folder size={48} className="text-gray-300 mb-4" />
            <p className="text-sm font-medium">Select an account from the sidebar or add a new one.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Add New Account</h3>
            <input
              type="text"
              placeholder="Enter account name (e.g., ICEM)"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowAddAccount(false); setNewAccountName(""); }}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAccount}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Add Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {showAddRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Add Role to {selectedAccount?.account}</h3>
            <input
              type="text"
              placeholder="Enter role name (e.g., Social Media)"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowAddRole(false); setNewRoleName(""); }}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Add Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Add Task to {activeRoleForTask?.name}</h3>
            <input
              type="text"
              placeholder="Enter task name (e.g., Pre Training)"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowAddTask(false); setNewTaskName(""); setActiveRoleForTask(null); }}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskAdminPanel;
