// src/pages/Admin.jsx
import React, { useEffect, useState } from "react";
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
// At top, add import:
import NewUser from "../components/Admin/NewUser";

import AuditLogs from "../components/Admin/AuditLogs";
import LoginAnalytics from "../components/Admin/LoginAnalytics";

const Admin = () => {
  const [showNotification, setShowNotification] = useState(true);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [deleteUser, setDeleteUser] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    const cachedLogs = sessionStorage.getItem("auditLogs");
    const cachedUsers = sessionStorage.getItem("userList");

    if (cachedLogs && cachedUsers) {
      setLogs(JSON.parse(cachedLogs));
      setUsers(JSON.parse(cachedUsers));
      return;
    }

    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const logsSnap = await getDocs(
          query(
            collection(db, "audit_logs"),
            orderBy("date", "desc"),
            limit(50)
          )
        );

        const userData = usersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const logData = logsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setUsers(userData);
        setLogs(logData);

        sessionStorage.setItem("userList", JSON.stringify(userData));
        sessionStorage.setItem("auditLogs", JSON.stringify(logData));
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

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

  const handleCancelDelete = () => {
    setDeleteUser(null);
  };

  const handleRefresh = () => {
    sessionStorage.removeItem("userList");
    sessionStorage.removeItem("auditLogs");
    window.location.reload();
  };

  return (
    <div className="space-y-8  mx-auto">
      {showNotification && (
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-4 flex justify-between items-center rounded shadow">
          <span>
            🚧 Admin Dashboard is under development. Data is for demo purposes.
          </span>
          <button
            onClick={() => setShowNotification(false)}
            className="text-xl font-bold hover:text-yellow-900"
            aria-label="Close notification"
          >
            &times;
          </button>
        </div>
      )}

      {/* Add User Button on top-left */}
      <div className="flex justify-between items-center mb-4">
        <NewUser onUserAdded={handleRefresh} />

        {/* Refresh Button on top-right */}
        <button
          onClick={handleRefresh}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Dashboard Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm text-gray-500 uppercase tracking-wide">
            Total Users
          </h3>
          <p className="text-3xl font-bold text-gray-900">{users.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm text-gray-500 uppercase tracking-wide">
            Active Sessions
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {users.filter((user) => user.status === "Active").length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm text-gray-500 uppercase tracking-wide">
            Logins Today
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {
              logs.filter((log) => {
                const today = new Date();
                const logDate = new Date(log.date);
                return (
                  log.action === "Logged in" &&
                  logDate.getDate() === today.getDate() &&
                  logDate.getMonth() === today.getMonth() &&
                  logDate.getFullYear() === today.getFullYear()
                );
              }).length
            }
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm text-gray-500 uppercase tracking-wide">
            Errors Logged
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {
              logs.filter((log) => log.action?.toLowerCase().includes("error"))
                .length
            }
          </p>
        </div>
      </section>

      {/* User Management */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          User Management
        </h2>
        <div className="overflow-x-auto rounded-lg shadow border bg-white">
          <table className="w-full text-left text-sm divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                <th className="p-3 font-medium text-gray-700">Name</th>
                <th className="p-3 font-medium text-gray-700">Email</th>
                <th className="p-3 font-medium text-gray-700">Role</th>
                <th className="p-3 font-medium text-gray-700">Department</th>
                <th className="p-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">{u.department}</td>
                  <td className="p-3">
                    <button
                      onClick={() => setDeleteUser(u)}
                      className="text-red-600 hover:text-red-800 transition"
                      aria-label={`Delete ${u.name}`}
                      title={`Delete ${u.name}`}
                    >
                      <FontAwesomeIcon icon={faTrash} size="lg" />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Login Analytics */}
      <LoginAnalytics logs={logs} />

      {/* Audit Logs */}
      <AuditLogs logs={logs} />

      {/* Delete Confirmation Modal */}
      {deleteUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-transparent"
          aria-modal="true"
          role="dialog"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3
              id="modal-title"
              className="text-lg font-semibold text-gray-900 mb-4"
            >
              Confirm Deletion
            </h3>
            <p id="modal-description" className="mb-6 text-gray-700">
              Are you sure you want to delete user{" "}
              <strong>{deleteUser.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition"
                disabled={loadingDelete}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUserConfirm}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loadingDelete}
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
