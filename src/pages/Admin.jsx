import React, { useEffect, useState } from "react";
import {
  FiSearch,
  FiUser,
  FiUsers,
  FiHome,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiAlertCircle,
  FiCalendar,
  FiActivity,
  FiClock
} from "react-icons/fi";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  limit,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { motion } from "framer-motion";
import NewUser from "../components/Admin/NewUser";
import AuditLogs from "../components/Admin/AuditLogs";
import LoginAnalytics from "../components/Admin/LoginAnalytics";
import UserAvatar from "../components/Admin/UserAvatar";

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [deleteUser, setDeleteUser] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const cachedLogs = sessionStorage.getItem("auditLogs");
    const cachedUsers = sessionStorage.getItem("userList");

    if (cachedLogs && cachedUsers) {
      setLogs(JSON.parse(cachedLogs));
      setUsers(JSON.parse(cachedUsers));
      return;
    }

    handleRefresh();
  }, []);

const handleRefresh = async () => {
  setRefreshing(true);
  try {
    const [usersSnap, logsSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(query(collection(db, "audit_logs"), orderBy("date", "desc"), limit(50)))
    ]);

    const userData = await Promise.all(
      usersSnap.docs.map(async (userDoc) => {
        try {
          const userProfile = await getDoc(doc(db, "userprofile", userDoc.data().uid));
          return {
            id: userDoc.id,
            ...userDoc.data(),
            profilePicUrl: userProfile.exists() ? userProfile.data().profilePicUrl : null,
          };
        } catch (error) {
          console.error(`Error fetching profile for user ${userDoc.id}:`, error);
          return {
            id: userDoc.id,
            ...userDoc.data(),
            profilePicUrl: null,
          };
        }
      })
    );

    const logData = logsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setUsers(userData);
    setLogs(logData);

    sessionStorage.setItem("userList", JSON.stringify(userData));
    sessionStorage.setItem("auditLogs", JSON.stringify(logData));
  } catch (error) {
    console.error("Refresh error:", error);
  }
  setRefreshing(false);
};

  const handleDeleteUserConfirm = async () => {
    if (!deleteUser) return;
    setLoadingDelete(true);
    try {
      await Promise.all([
        deleteDoc(doc(db, "users", deleteUser.id)),
        deleteDoc(doc(db, "userprofile", deleteUser.id))
      ]);
      const updatedUsers = users.filter((u) => u.id !== deleteUser.id);
      setUsers(updatedUsers);
      sessionStorage.setItem("userList", JSON.stringify(updatedUsers));
      setDeleteUser(null);
    } catch (error) {
      console.error("Error deleting user:", error);
    }
    setLoadingDelete(false);
  };

  const filteredUsers = users.filter((u) => {
    return (
      (!search ||
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())) &&
      (!roleFilter || u.role === roleFilter) &&
      (!departmentFilter || u.department === departmentFilter)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const todayLogins = logs.filter((log) => {
    if (log.action !== "Logged in") return false;
    const today = new Date();
    const logDate = log.date?.toDate ? log.date.toDate() : new Date(log.date);
    return (
      logDate.getDate() === today.getDate() &&
      logDate.getMonth() === today.getMonth() &&
      logDate.getFullYear() === today.getFullYear()
    );
  }).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage users and view system analytics</p>
        </div>
        <NewUser onUserAdded={handleRefresh} />
      </motion.header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{users.length}</p>
            </div>
            <div className="p-3 rounded-full bg-indigo-50 text-indigo-600">
              <FiUsers className="w-6 h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today's Logins</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{todayLogins}</p>
            </div>
            <div className="p-3 rounded-full bg-green-50 text-green-600">
              <FiActivity className="w-6 h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Recent Activity</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{logs.length}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-50 text-blue-600">
              <FiClock className="w-6 h-6" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* User Management Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiUser className="text-indigo-500" />
                User Management
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                View and manage system users
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center bg-gray-50 rounded-lg p-1">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-1 text-sm bg-transparent border-none focus:ring-0"
                >
                  <option value="">All Roles</option>
                  {[...new Set(users.map((u) => u.role))].map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center bg-gray-50 rounded-lg p-1">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-3 py-1 text-sm bg-transparent border-none focus:ring-0"
                >
                  <option value="">All Depts</option>
                  {[...new Set(users.map((u) => u.department))].map((dep) => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Refresh data"
              >
                <FiRefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Department</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <UserAvatar photoURL={user.profilePicUrl} name={user.name} size={8} />
                          <span className="font-medium text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{user.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setDeleteUser(user)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                          aria-label={`Delete user ${user.name}`}
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No users found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 text-sm rounded-lg ${
                        currentPage === pageNum
                          ? "bg-indigo-600 text-white"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </motion.section>

        <LoginAnalytics logs={logs} />
        <AuditLogs logs={logs} />


      {/* Delete Confirmation Modal */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-lg max-w-md w-full p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <UserAvatar photoURL={deleteUser.profilePicUrl} name={deleteUser.name} size={12} />
              <div>
                <h3 className="font-semibold text-lg">Confirm User Deletion</h3>
                <p className="text-gray-500 text-sm">{deleteUser.email}</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to permanently delete <span className="font-semibold">{deleteUser.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteUser(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUserConfirm}
                disabled={loadingDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loadingDelete ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FiTrash2 />
                    Delete User
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Admin;