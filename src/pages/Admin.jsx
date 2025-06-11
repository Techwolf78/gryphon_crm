import React, { useEffect, useState } from "react";
import {
  FaSearch,
  FaUserShield,
  FaBuilding,
  FaPlus,
  FaSyncAlt,
  FaTrash,
} from "react-icons/fa";

import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import NewUser from "../components/Admin/NewUser";
import AuditLogs from "../components/Admin/AuditLogs";
import LoginAnalytics from "../components/Admin/LoginAnalytics";

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
  const itemsPerPage = 5;

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
      const usersSnap = await getDocs(collection(db, "users"));
      const logsSnap = await getDocs(
        query(collection(db, "audit_logs"), orderBy("date", "desc"), limit(50))
      );

      const userData = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const logData = logsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

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
      await deleteDoc(doc(db, "users", deleteUser.id));
      const updatedUsers = users.filter((u) => u.id !== deleteUser.id);
      setUsers(updatedUsers);
      sessionStorage.setItem("userList", JSON.stringify(updatedUsers));
      setDeleteUser(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user. Please try again.");
    }
    setLoadingDelete(false);
  };

  const handleCancelDelete = () => setDeleteUser(null);

  const filteredUsers = users.filter((u) => {
    return (
      (!search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())) &&
      (!roleFilter || u.role === roleFilter) &&
      (!departmentFilter || u.department === departmentFilter)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-10">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-blue-900 tracking-tight">
          Admin Dashboard
        </h1>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-100 to-blue-300 p-6 rounded-2xl shadow-lg text-blue-900">
          <h3 className="uppercase text-sm font-semibold">Total Users</h3>
          <p className="text-4xl font-bold">{users.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-green-300 p-6 rounded-2xl shadow-lg text-green-900">
          <h3 className="uppercase text-sm font-semibold">Logins Today</h3>
          <p className="text-4xl font-bold">
            {logs.filter((log) => {
              const today = new Date();
              const logDate = log.date?.toDate ? log.date.toDate() : new Date(log.date);
              return (
                log.action === "Logged in" &&
                logDate.getDate() === today.getDate() &&
                logDate.getMonth() === today.getMonth() &&
                logDate.getFullYear() === today.getFullYear()
              );
            }).length}
          </p>
        </div>
        <div className="flex items-center justify-end">
          <NewUser onUserAdded={handleRefresh} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-semibold text-gray-800">User Management</h2>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="relative flex-1 min-w-[150px]">
              <FaSearch className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full px-4 py-2 text-sm shadow rounded"
              />
            </div>
            <div className="relative flex-1 min-w-[150px]">
              <FaUserShield className="absolute left-3 top-3 text-gray-500" />
              <select
                className="pl-10 pr-4 py-2 w-full text-sm shadow rounded"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                {[...new Set(users.map((u) => u.role))].map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 min-w-[150px]">
              <FaBuilding className="absolute left-3 top-3 text-gray-500" />
              <select
                className="pl-10 pr-4 py-2 w-full text-sm shadow rounded"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">All Departments</option>
                {[...new Set(users.map((u) => u.department))].map((dep) => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleRefresh}
              className={`p-2 bg-[#DBEAFE] text-[#4F39F6] rounded-full ${refreshing ? "animate-spin" : ""}`}
              title="Refresh"
            >
              <FaSyncAlt size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-xl shadow border">
          <table className="w-full text-sm text-left">
            <thead className="bg-blue-50 text-gray-600">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Department</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedUsers.length ? (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-3">{u.name}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.role}</td>
                    <td className="p-3">{u.department}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setDeleteUser(u)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 pt-4 flex-wrap">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded border ${
                page === currentPage ? "bg-blue-600 text-white" : "bg-white text-blue-600"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      </section>

      <LoginAnalytics logs={logs} />
      <AuditLogs logs={logs} />

      {deleteUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="mb-6">
              Are you sure you want to delete <strong>{deleteUser.name}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUserConfirm}
                disabled={loadingDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {loadingDelete ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
