import React, { useState, useEffect } from "react";
import { db, secondaryAuth } from "../../firebase";
import { AiOutlineUserAdd } from "react-icons/ai";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaUserTag,
  FaBuilding,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import emailjs from "@emailjs/browser";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const departments = ["Sales", "Placement", "L & D", "DM", "Admin"];
const roles = ["Director", "Head", "Manager", "Assistant Manager", "Executive"];

// Validation constants
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NewUser = ({ onUserAdded }) => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Executive");
  const [department, setDepartment] = useState("Sales");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportingManagers, setReportingManagers] = useState([]);
  const [selectedReportingManager, setSelectedReportingManager] = useState("");

  useEffect(() => {
    const fetchManagers = async () => {
      if (
        (role === "Assistant Manager" || role === "Executive") &&
        department === "Sales"
      ) {
        try {
          const q = query(
            collection(db, "users"),
            where("role", "==", "Manager"),
            where("department", "==", "Sales")
          );
          const querySnapshot = await getDocs(q);

          const managers = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
          }));

          setReportingManagers(managers);
        } catch (err) {
          console.error("Error fetching managers:", err);
          toast.error("Failed to load reporting managers");
        }
      } else {
        setReportingManagers([]);
        setSelectedReportingManager("");
      }
    };

    fetchManagers();
  }, [role, department]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole("Executive");
    setDepartment("Sales");
    setPassword("");
    setShowPassword(false);
    setError("");
    setSelectedReportingManager("");
    setReportingManagers([]);
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

    // Validation checks
    if (!name || !email || !password) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      setLoading(false);
      return;
    }

    if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, and one number.");
      setLoading(false);
      return;
    }

    if (!roles.includes(role) || !departments.includes(department)) {
      setError("Invalid role or department selected.");
      setLoading(false);
      return;
    }

    if (
      (role === "Assistant Manager" || role === "Executive") &&
      department === "Sales" &&
      !selectedReportingManager
    ) {
      setError("Please select a Reporting Manager.");
      setLoading(false);
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );
      
      // Update user profile with display name
      await updateProfile(userCredential.user, { displayName: name });

      // Save user data to Firestore
      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        name,
        email,
        role,
        department,
        reportingManager:
          role === "Assistant Manager" || role === "Executive"
            ? selectedReportingManager
            : null,
        createdAt: serverTimestamp(),
      });

      // Send welcome email
      try {
        await emailjs.send(
          "service_0khg6af",
          "template_sehqgo2",
          {
            name,
            email,
            password,
            role,
            department,
            reportingManager:
              role === "Assistant Manager" || role === "Executive"
                ? selectedReportingManager
                : "Not Applicable",
          },
          "CXYkFqg_8EWTsrN8M"
        );
      } catch (emailErr) {
        console.error("EmailJS Error:", emailErr);
        toast.warning("User added, but email not sent.");
      }

      // Sign out from secondary auth
      await signOut(secondaryAuth);

      // Reset form and show success
      resetForm();
      setShowForm(false);
      if (onUserAdded) onUserAdded();
      toast.success(`${name} (${role}, ${department}) added successfully!`);
    } catch (err) {
      console.error("Error adding user:", err);
      setError(err.message || "Failed to add user");
      toast.error(err.message || "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3 px-4 rounded-full font-semibold shadow transition-all duration-300 text-[#4F39F6] bg-[#DBEAFE] flex items-center justify-center gap-2 hover:bg-[#E0E7FF]"
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
            className="text-2xl font-bold text-gray-600 hover:text-red-500 transition-colors"
          >
            &times;
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 overflow-y-auto h-[calc(100%-64px)] custom-scrollbar"
        >
          {/* Name Field */}
          <div className="space-y-1">
            <label htmlFor="nameInput" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <div className="flex items-center border border-gray-300 bg-white/50 backdrop-blur rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 transition">
              <FaUser className="text-gray-400 mr-3" size={20} />
              <input
                id="nameInput"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-grow focus:outline-none bg-transparent text-black placeholder-gray-400"
                placeholder="Enter full name"
                required
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-1">
            <label htmlFor="emailInput" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="flex items-center border border-gray-300 bg-white/50 backdrop-blur rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 transition">
              <FaEnvelope className="text-gray-400 mr-3" size={20} />
              <input
                id="emailInput"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-grow focus:outline-none bg-transparent text-black placeholder-gray-400"
                placeholder="Enter email address"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label htmlFor="passwordInput" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="flex items-center border border-gray-300 bg-white/50 backdrop-blur rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 transition">
              <FaLock className="text-gray-400 mr-3" size={20} />
              <input
                id="passwordInput"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-grow focus:outline-none bg-transparent text-black placeholder-gray-400"
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="ml-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Must contain uppercase, lowercase, and number
            </p>
          </div>
                    {/* Department Field */}
          <div className="space-y-1">
            <label htmlFor="departmentSelect" className="block text-sm font-medium text-gray-700">
              Department
            </label>
            <div className="flex items-center border border-gray-300 bg-white/50 backdrop-blur rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 transition">
              <FaBuilding className="text-gray-400 mr-3" size={20} />
              <select
                id="departmentSelect"
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

          {/* Role Field */}
          <div className="space-y-1">
            <label htmlFor="roleSelect" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <div className="flex items-center border border-gray-300 bg-white/50 backdrop-blur rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 transition">
              <FaUserTag className="text-gray-400 mr-3" size={20} />
              <select
                id="roleSelect"
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



          {/* Reporting Manager Field (conditional) */}
          {(role === "Assistant Manager" || role === "Executive") && department === "Sales" && (
            <div className="space-y-1">
              <label htmlFor="managerSelect" className="block text-sm font-medium text-gray-700">
                Reporting Manager
              </label>
              <div className="flex items-center border border-gray-300 bg-white/50 backdrop-blur rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 transition">
                <FaUser className="text-gray-400 mr-3" size={20} />
                <select
                  id="managerSelect"
                  value={selectedReportingManager}
                  onChange={(e) => setSelectedReportingManager(e.target.value)}
                  className="flex-grow bg-transparent focus:outline-none text-black"
                  required
                >
                  <option value="">Select Reporting Manager</option>
                  {reportingManagers.map((manager) => (
                    <option key={manager.id} value={manager.name}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {/* Form Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 rounded-full border border-gray-300 text-gray-700 hover:bg-red-100 hover:text-red-700 transition duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 hover:bg-indigo-500 hover:text-white duration-300 ease-in-out disabled:opacity-50 flex items-center justify-center min-w-[120px]"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Adding...
                </>
              ) : (
                "Add User"
              )}
            </button>
          </div>
        </form>
      </div>

      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default NewUser;