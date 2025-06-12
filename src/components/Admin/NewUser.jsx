import React, { useState, useEffect } from "react";
import { db, secondaryAuth } from "../../firebase";
import { AiOutlineUserAdd } from "react-icons/ai";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaUserTag,
  FaBuilding,
} from "react-icons/fa";
import emailjs from "@emailjs/browser";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const departments = ["Sales", "Placement", "L & D", "DM"];
const roles = ["User", "Head", "Executive", "Manager", "Assistant Manager"];

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

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setShowForm(false);
        resetForm();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (showForm) {
      setTimeout(() => {
        document.getElementById("nameInput")?.focus();
      }, 100);
    }
  }, [showForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!name || !email || !password) {
      setError("Name, email, and password are required.");
      setLoading(false);
      return;
    }

    if (!roles.includes(role) || !departments.includes(department)) {
      setError("Invalid role or department selected.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName: name });

      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        name,
        email,
        role,
        department,
        createdAt: serverTimestamp(),
      });

      try {
        await emailjs.send(
        "service_pskknsn",
        "template_hu6vhxf",
        {
          name,
          email,
          password,
          role,
          department,
        },
        "zEVWxxT-QvGIrhvTV"
      );
      } catch (emailErr) {
        console.error("EmailJS Error:", emailErr);
        toast.warning("User added, but email not sent.");
      }

      await signOut(secondaryAuth);

      resetForm();
      setShowForm(false);
      if (onUserAdded) onUserAdded();
      toast.success(`${name} (${role}, ${department}) added successfully!`);
    } catch (err) {
      console.error("Error adding user:", err);
      toast.error(err.message || "Failed to add user");
    }

    setLoading(false);
  };

  return (
    <div>
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3 px-4 rounded-full font-semibold shadow transition-all duration-300 text-[#4F39F6] bg-[#DBEAFE]  flex items-center justify-center gap-2"
      >
        <AiOutlineUserAdd className="text-2xl" />
        Add User
      </button>

      {showForm && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-40"
          onClick={() => {
            setShowForm(false);
            resetForm();
          }}
        ></div>
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white/80 backdrop-blur-xl z-[100] transform transition-transform duration-300 shadow-2xl ${
          showForm ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
          <h2 className="text-xl font-bold text-gray-800">Add New User</h2>
          <button
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
            className="text-2xl font-bold text-gray-600 hover:text-red-500"
          >
            &times;
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 overflow-y-auto h-[calc(100%-64px)] custom-scrollbar"
        >
          {/* Name */}
          <div>
            <div className="flex items-center border border-gray-300 bg-white/50 backdrop-blur rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 transition">
              <FaUser className="text-gray-400 mr-3" size={20} />
              <input
                id="nameInput"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-grow focus:outline-none bg-transparent text-black"
                placeholder="Enter full name"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <div className="flex items-center border border-gray-300 bg-white/50 backdrop-blur rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 transition">
              <FaEnvelope className="text-gray-400 mr-3" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-grow focus:outline-none bg-transparent text-black"
                placeholder="Enter email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center border border-gray-300 bg-white/50 backdrop-blur rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 transition">
              <FaLock className="text-gray-400 mr-3" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="flex-grow focus:outline-none bg-transparent text-black"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <div className="flex items-center border border-gray-300 bg-white/50 backdrop-blur rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 transition ">
              <FaUserTag className="text-gray-400 mr-3" size={20} />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex-grow bg-transparent focus:outline-none text-black"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Department */}
          <div>
            <div className="flex items-center border border-gray-300 bg-white/50 backdrop-blur rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 transition">
              <FaBuilding className="text-gray-400 mr-3" size={20} />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="flex-grow bg-transparent focus:outline-none text-black"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm font-medium">{error}</p>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              disabled={loading}
              className="px-4 py-2 bg-red-200 rounded-full border border-gray-300 text-gray-700 hover:bg-red-500 hover:text-white transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-full bg-green-200  border border-gray-300 text-gray-700 hover:bg-green-500 hover:text-white duration-300 ease-in-out disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="white"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="white"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Adding...
                </span>
              ) : (
                "Add User"
              )}
            </button>
          </div>
        </form>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default NewUser;
