import React, { useState } from "react";
import { db, secondaryAuth } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const departments = [
  "Sales",
  "Marketing",
  "Learning Development",
  "Placement",
  "Executive",
  "Admin",
  "Manager",
];

const roles = ["User", "Admin", "Sales", "Manager", "Executive"];

const NewUser = ({ onUserAdded }) => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("User");
  const [department, setDepartment] = useState("Sales");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole("User");
    setDepartment("Sales");
    setPassword("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!name || !email || !password) {
      setError("Name, email, and password are required.");
      setLoading(false);
      return;
    }

    try {
      // Create user using secondary auth instance
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      // Add user to Firestore
      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        name,
        email,
        role,
        department,
        createdAt: serverTimestamp(),
      });

      // Clean up session from secondary app
      await signOut(secondaryAuth);

      resetForm();
      setShowForm(false);
      if (onUserAdded) onUserAdded();
      alert("User added successfully!");
    } catch (err) {
      console.error("Error adding user:", err);
      setError(err.message || "Failed to add user");
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col space-y-3 max-w-md w-full">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="self-start px-5 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
          aria-label="Add New User"
        >
          ➕ Add New User
        </button>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-md space-y-5"
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Add New User
          </h3>

          <div>
            <label className="block mb-1 text-gray-700 font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-700 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-700 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-700 font-medium">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-gray-700 font-medium">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              disabled={loading}
              className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition focus:outline-none"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add User"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default NewUser;
