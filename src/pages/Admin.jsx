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
  FiClock,
  FiEdit,
  FiChevronUp,
  FiChevronDown,
  FiArrowUp,
  FiArrowDown,
  FiChevronsUp,
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
  where,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import NewUser from "../components/Admin/NewUser";
import AuditLogs from "../components/Admin/AuditLogs";
import LoginAnalytics from "../components/Admin/LoginAnalytics";
import UserAvatar from "../components/Admin/UserAvatar";
import EditUser from "../components/Admin/EditUserModle"; // New component
import AdminTour from "../components/tours/AdminTour";

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [deleteUser, setDeleteUser] = useState(null);
  const [editUser, setEditUser] = useState(null); // New state for edit
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [currentUser, setCurrentUser] = useState(null);
  const [timeReports, setTimeReports] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [loadingTime, setLoadingTime] = useState(false);
  const [sortOrder, setSortOrder] = useState(null);
  const formatTimeAgo = (date) => {
    if (!date) return "Unknown";
    
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffMonth / 12);

    if (diffSec < 60) return `Last Active ${diffSec}s ago`;
    if (diffMin < 60) return `Last Active ${diffMin}m ago`;
    if (diffHour < 24) return `Last Active ${diffHour}h ago`;
    if (diffDay < 30) return `Last Active ${diffDay}d ago`;
    if (diffMonth < 12) return `Last Active ${diffMonth}M ago`;
    return `Last Active ${diffYear}y ago`;
  }; // null, 'asc', 'desc'

  useEffect(() => {
    const cachedLogs = sessionStorage.getItem("auditLogs");
    const cachedUsers = sessionStorage.getItem("userList");

    if (cachedLogs && cachedUsers) {
      const parsedLogs = JSON.parse(cachedLogs).map(log => ({
        ...log,
        timestamp: typeof log.timestamp === 'string' ? log.timestamp : 
                  (log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : 
                   (log.timestamp?._seconds ? new Date(log.timestamp._seconds * 1000 + log.timestamp._nanoseconds / 1000000).toISOString() :
                    (log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000 + (log.timestamp.nanoseconds || 0) / 1000000).toISOString() :
                     new Date().toISOString())))
      }));
      setLogs(parsedLogs);
      setUsers(JSON.parse(cachedUsers));
      fetchTimeReports('all'); // Load time reports
      return;
    }

    handleRefresh();
  }, []);

  // Auth state listener
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [usersSnap, logsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(
          query(
            collection(db, "audit_logs"),
            orderBy("timestamp", "desc"),
            limit(50)
          )
        ),
      ]);

      const userData = await Promise.all(
        usersSnap.docs.map(async (userDoc) => {
          try {
            const userProfile = await getDoc(
              doc(db, "userprofile", userDoc.data().uid)
            );
            return {
              id: userDoc.id,
              ...userDoc.data(),
              profilePicUrl: userProfile.exists()
                ? userProfile.data().profilePicUrl
                : null,
            };
          } catch {
            // Error fetching profile - handled by returning user data without profile pic
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
        timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate().toISOString() : doc.data().timestamp,
      }));

      setUsers(userData);
      setLogs(logData);

      sessionStorage.setItem("userList", JSON.stringify(userData));
      sessionStorage.setItem("auditLogs", JSON.stringify(logData));
    } catch {
      // Refresh error - handled silently
    }
    setRefreshing(false);
    fetchTimeReports('all'); // Load time reports after refresh
  };

  const handleDeleteUserConfirm = async () => {
    if (!deleteUser) return;
    setLoadingDelete(true);
    try {
      await Promise.all([
        deleteDoc(doc(db, "users", deleteUser.id)),
        deleteDoc(doc(db, "userprofile", deleteUser.id)),
      ]);
      const updatedUsers = users.filter((u) => u.id !== deleteUser.id);
      setUsers(updatedUsers);
      sessionStorage.setItem("userList", JSON.stringify(updatedUsers));
      setDeleteUser(null);
    } catch {
      // Error deleting user - handled silently
    }
    setLoadingDelete(false);
  };

  const handleUserUpdated = () => {
    handleRefresh();
    setEditUser(null);
  };

  const cleanupStaleSessions = async () => {
    try {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
      
      // Get all active sessions
      const activeSessionsQuery = query(
        collection(db, "user_sessions"), 
        where('isActive', '==', true)
      );
      const activeSessionsSnap = await getDocs(activeSessionsQuery);
      
      const updatePromises = [];
      activeSessionsSnap.docs.forEach(docSnap => {
        const sessionData = docSnap.data();
        const lastActive = sessionData.lastActive?.toDate();
        
        // If lastActive is more than 10 minutes ago, mark as inactive
        if (lastActive && lastActive < tenMinutesAgo) {
          updatePromises.push(
            updateDoc(docSnap.ref, {
              isActive: false,
              endTime: serverTimestamp(),
              duration: Math.floor((lastActive - sessionData.startTime.toDate()) / 1000)
            })
          );
        }
      });
      
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log(`Cleaned up ${updatePromises.length} stale sessions`);
      }
    } catch (error) {
      console.error("Error cleaning up stale sessions:", error);
    }
  };

  const fetchTimeReports = async (filter = 'all') => {
    setLoadingTime(true);
    try {
      // First, clean up stale sessions (inactive sessions that haven't been updated in 10+ minutes)
      await cleanupStaleSessions();

      let q = collection(db, "user_sessions");
      if (filter === '7days') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        q = query(q, where('startTime', '>=', sevenDaysAgo));
      } else if (filter === '30days') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        q = query(q, where('startTime', '>=', thirtyDaysAgo));
      }
      const snap = await getDocs(q);
      const sessions = snap.docs.map(d => d.data());
      // Aggregate by user - get latest location for each user
      const userTotals = {};
      const userLocations = {};
      const userLastActive = {};
      const userLastEndTime = {};
      const now = new Date();
      
      sessions.forEach(s => {
        let dur = s.duration || 0;
        if (s.isActive) {
          const start = s.startTime.toDate();
          dur = Math.floor((now - start) / 1000); // current duration in seconds
        }
        if (!userTotals[s.userId]) {
          userTotals[s.userId] = 0;
          userLocations[s.userId] = s.location || { address: "Unknown" };
          userLastActive[s.userId] = s.isActive ? "Active now" : "Last session";
          userLastEndTime[s.userId] = s.endTime ? s.endTime.toDate() : null;
        } else {
          // Update location if this session has location data and current is unknown
          if (s.location && !s.location.error && userLocations[s.userId].address === "Unknown") {
            userLocations[s.userId] = s.location;
          }
          // Update active status and last end time
          if (s.isActive) {
            userLastActive[s.userId] = "Active now";
          } else if (s.endTime && (!userLastEndTime[s.userId] || s.endTime.toDate() > userLastEndTime[s.userId])) {
            userLastEndTime[s.userId] = s.endTime.toDate();
          }
        }
        userTotals[s.userId] += dur;
      });
      // Fetch user names
      const userIds = Object.keys(userTotals);
      const userNames = {};
      for (const uid of userIds) {
        try {
          const userQuery = query(collection(db, "users"), where("uid", "==", uid));
          const userSnap = await getDocs(userQuery);
          if (!userSnap.empty) {
            const userData = userSnap.docs[0].data();
            userNames[uid] = userData.name || 'Unknown';
          } else {
            userNames[uid] = 'Unknown';
          }
        } catch (error) {
          console.error("Error fetching user:", error);
          userNames[uid] = 'Unknown';
        }
      }
      const reports = Object.entries(userTotals).map(([uid, totalSeconds]) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const location = userLocations[uid];
        const lastEndTime = userLastEndTime[uid];
        const status = userLastActive[uid] === "Active now" ? "Active now" : formatTimeAgo(lastEndTime);
        return {
          userId: uid,
          name: userNames[uid] || 'Unknown',
          timeString: `${hours}h ${minutes}m ${seconds}s`,
          location: location.error ? "Location unavailable" : location.address || "Unknown",
          city: location.city || "Unknown",
          country: location.country || "Unknown",
          status: status,
          totalSeconds: totalSeconds
        };
      });
      setTimeReports(reports);
    } catch (error) {
      console.error("Error fetching time reports:", error);
      setTimeReports([]);
    }
    setLoadingTime(false);
  };

  const handleSort = () => {
    if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else if (sortOrder === 'desc') {
      setSortOrder(null);
    } else {
      setSortOrder('asc');
    }
  };

  const filteredUsers = users.filter((u) => {
    return (
      (!search ||
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())) &&
      (!roleFilter || u.role === roleFilter) &&
      (!departmentFilter || (Array.isArray(u.departments) ? u.departments.includes(departmentFilter) : u.department === departmentFilter))
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const todayLogins = logs.filter((log) => {
    if (!log.action || !log.action.trim().startsWith("Logged in")) return false;
    const today = new Date();
    const logDate = new Date(log.timestamp);
    
    if (!logDate || isNaN(logDate.getTime())) return false;
    
    return (
      logDate.getDate() === today.getDate() &&
      logDate.getMonth() === today.getMonth() &&
      logDate.getFullYear() === today.getFullYear()
    );
  }).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        data-tour="admin-header"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Manage users and view system analytics
          </p>
        </div>
        <div className="w-full sm:w-auto" data-tour="add-user-button">
          <NewUser onUserAdded={handleRefresh} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" data-tour="stats-cards">
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">
                Total Users
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {users.length}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-full bg-indigo-50 text-indigo-600">
              <FiUsers className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">
                Today's Logins
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {todayLogins}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-full bg-green-50 text-green-600">
              <FiActivity className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">
                Recent Activity
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {logs.length}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-full bg-blue-50 text-blue-600">
              <FiClock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <section
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        data-tour="user-management-section"
      >
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiUser className="text-indigo-500" />
                User Management
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                View and manage system users
              </p>
            </div>

            {/* Mobile-first filters */}
            <div className="space-y-3">
              {/* Search */}
              <div className="relative" data-tour="user-search">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Filters row */}
              <div className="flex flex-col sm:flex-row gap-3" data-tour="user-filters">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Roles</option>
                  {[...new Set(users.map((u) => u.role))].map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>

                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Departments</option>
                  {[...new Set(users.flatMap((u) => Array.isArray(u.departments) ? u.departments : (u.department ? [u.department] : [])))].map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                  <option value="HR">HR</option>
                </select>

                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                  aria-label="Refresh data"
                >
                  <FiRefreshCw
                    className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Card View / Desktop Table View */}
          <div className="block lg:hidden" data-tour="user-table">
            {/* Mobile Card Layout */}
            <div className="space-y-4">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="border border-gray-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <UserAvatar
                          photoURL={user.profilePicUrl}
                          name={user.name}
                          size={10}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-2" data-tour="user-actions">
                        <button
                          onClick={async () => {
                            try {
                              const docRef = doc(db, "users", user.id);
                              const docSnap = await getDoc(docRef);
                              if (docSnap.exists()) {
                                const fullUserData = {
                                  id: docSnap.id,
                                  ...docSnap.data(),
                                };
                                setEditUser(fullUserData);
                              }
                            } catch {
                              // Error fetching full user data - handled silently
                            }
                          }}
                          className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-50"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteUser(user)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700">
                        {user.role}
                      </span>
                      {(Array.isArray(user.departments) ? user.departments : (user.department ? [user.department] : [])).map((dept, index) => (
                        <span key={`${dept}-${index}`} className="px-2 py-1 text-xs rounded-full bg-gray-50 text-gray-700">
                          {dept}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No users found matching your criteria
                </div>
              )}
            </div>
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden lg:block" data-tour="user-table">
            <div className="overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium">Department</th>
                    <th className="px-6 py-3 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              photoURL={user.profilePicUrl}
                              name={user.name}
                              size={8}
                            />
                            <span className="font-medium text-gray-900">
                              {user.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(user.departments) ? user.departments : (user.department ? [user.department] : [])).map((dept, index) => (
                              <span key={`${dept}-${index}`} className="px-2 py-1 text-xs rounded-full bg-gray-50 text-gray-700">
                                {dept}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-2" data-tour="user-actions">
                          <button
                            onClick={async () => {
                              try {
                                const docRef = doc(db, "users", user.id);
                                const docSnap = await getDoc(docRef);
                                if (docSnap.exists()) {
                                  const fullUserData = {
                                    id: docSnap.id,
                                    ...docSnap.data(),
                                  };
                                  setEditUser(fullUserData);
                                }
                              } catch {
                                // Error fetching full user data - handled silently
                              }
                            }}
                            className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteUser(user)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No users found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-full sm:w-auto px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>

              {/* Mobile pagination - simplified */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 sm:hidden">
                  Page {currentPage} of {totalPages}
                </span>

                {/* Desktop pagination */}
                <div className="hidden sm:flex gap-1">
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
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="w-full sm:w-auto px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>

      <div data-tour="login-analytics">
        <LoginAnalytics logs={logs} />
      </div>
      <div data-tour="audit-logs">
        <AuditLogs logs={logs} />
      </div>

      {/* Time Tracking Reports */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiClock className="text-indigo-500" />
                Time Tracking Reports
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                View employee time spent in the system
                <br />
                <span className="text-xs text-gray-400">
                  Location shows last known location (may be "Unknown" for older sessions or denied permissions)
                </span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
              <button
                onClick={() => fetchTimeReports(timeFilter)}
                disabled={loadingTime}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                aria-label="Refresh time reports"
              >
                <FiRefreshCw className={`w-4 h-4 ${loadingTime ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <div className="overflow-hidden">
            {(() => {
              const sortedReports = [...timeReports].sort((a, b) => {
                if (!sortOrder) return 0;
                const aSec = a.totalSeconds;
                const bSec = b.totalSeconds;
                if (sortOrder === 'asc') {
                  return aSec - bSec;
                } else {
                  return bSec - aSec;
                }
              });
              return (
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 font-medium">Employee</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Location</th>
                      <th className="px-6 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={handleSort}>
                        <div className="flex items-center">
                          <span>Total Time</span>
                          <div className="ml-1">
                            {!sortOrder && <FiChevronsUp className="w-4 h-4 text-gray-400" />}
                            {sortOrder === 'asc' && <FiArrowUp className="w-4 h-4 text-indigo-600" />}
                            {sortOrder === 'desc' && <FiArrowDown className="w-4 h-4 text-indigo-600" />}
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedReports.length > 0 ? (
                      sortedReports.map((report) => (
                        <tr key={report.userId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            {report.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {report.status === "Active now" ? (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                {report.status}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-600">
                                {report.status}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            <div className="text-sm">
                              <div>{report.location}</div>
                              {report.city !== "Unknown" && (
                                <div className="text-xs text-gray-400">
                                  {report.city}, {report.country}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {report.timeString}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                          No time tracking data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal - Make responsive */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-xl shadow-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center gap-4 mb-4">
              <UserAvatar
                photoURL={deleteUser.profilePicUrl}
                name={deleteUser.name}
                size={12}
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-lg">Confirm User Deletion</h3>
                <p className="text-gray-500 text-sm truncate">
                  {deleteUser.email}
                </p>
              </div>
            </div>
            <p className="text-gray-700 mb-6 text-sm sm:text-base">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold">{deleteUser.name}</span>? This
              action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setDeleteUser(null)}
                className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUserConfirm}
                disabled={loadingDelete}
                className="w-full sm:w-auto px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
          </div>
        </div>
      )}

      {/* Edit User Modal - Make responsive */}
      {editUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-xl shadow-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
          >
            <EditUser
              user={editUser}
              onCancel={() => setEditUser(null)}
              onSuccess={handleUserUpdated}
            />
          </div>
        </div>
      )}

      <AdminTour userId={currentUser?.uid} />
    </div>
  );
};

export default Admin;
