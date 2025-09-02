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

const departments = ["Sales", "Placement", "L & D", "DM", "Admin", "HR"];
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
        className={`fixed top-0 right-0 h-full w-full sm:w-[380px] lg:w-[420px] xl:w-[450px] bg-white/95 backdrop-blur-xl z-[100] transform transition-transform duration-300 shadow-2xl ${
          showForm ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-300 bg-white/80 backdrop-blur-sm">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Add New User</h2>
            <p className="text-xs text-gray-500 mt-0.5">Fill in the details below</p>
          </div>
          <button
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
            className="text-xl font-bold text-gray-600 hover:text-red-500 transition-colors p-1.5 hover:bg-gray-100 rounded-full"
            aria-label="Close form"
          >
            &times;
          </button>
        </div>

        {/* Compact Form */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto h-[calc(100%-80px)]"
        >
          {/* Compact Name Field */}
          <div className="space-y-1.5">
            <label htmlFor="nameInput" className="block text-sm font-medium text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center border-2 border-gray-300 bg-white/60 backdrop-blur rounded-lg px-3 py-2.5 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400 transition-all">
              <FaUser className="text-gray-400 mr-2.5 flex-shrink-0" size={16} />
              <input
                id="nameInput"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-grow focus:outline-none bg-transparent text-black placeholder-gray-400 text-sm"
                placeholder="Enter full name"
                required
                autoComplete="name"
              />
            </div>
          </div>

          {/* Compact Email Field */}
          <div className="space-y-1.5">
            <label htmlFor="emailInput" className="block text-sm font-medium text-gray-700">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center border-2 border-gray-300 bg-white/60 backdrop-blur rounded-lg px-3 py-2.5 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400 transition-all">
              <FaEnvelope className="text-gray-400 mr-2.5 flex-shrink-0" size={16} />
              <input
                id="emailInput"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-grow focus:outline-none bg-transparent text-black placeholder-gray-400 text-sm"
                placeholder="Enter email address"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Compact Password Field */}
          <div className="space-y-1.5">
            <label htmlFor="passwordInput" className="block text-sm font-medium text-gray-700">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center border-2 border-gray-300 bg-white/60 backdrop-blur rounded-lg px-3 py-2.5 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400 transition-all">
              <FaLock className="text-gray-400 mr-2.5 flex-shrink-0" size={16} />
              <input
                id="passwordInput"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-grow focus:outline-none bg-transparent text-black placeholder-gray-400 text-sm"
                placeholder={`Min ${MIN_PASSWORD_LENGTH} characters`}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="ml-2 p-1 text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5 mt-1.5">
              <p className="text-xs text-gray-600 font-medium mb-1">Password Requirements:</p>
              <ul className="text-xs text-gray-500 space-y-0.5">
                <li className={`flex items-center ${password.length >= MIN_PASSWORD_LENGTH ? 'text-green-600' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${password.length >= MIN_PASSWORD_LENGTH ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  At least {MIN_PASSWORD_LENGTH} characters
                </li>
                <li className={`flex items-center ${/[A-Z]/.test(password) ? 'text-green-600' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${/[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  One uppercase letter
                </li>
                <li className={`flex items-center ${/[a-z]/.test(password) ? 'text-green-600' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${/[a-z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  One lowercase letter
                </li>
                <li className={`flex items-center ${/\d/.test(password) ? 'text-green-600' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${/\d/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  One number
                </li>
              </ul>
            </div>
          </div>

          {/* Compact Department & Role Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Department Field */}
            <div className="space-y-1.5">
              <label htmlFor="departmentSelect" className="block text-sm font-medium text-gray-700">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center border-2 border-gray-300 bg-white/60 backdrop-blur rounded-lg px-3 py-2.5 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400 transition-all">
                <FaBuilding className="text-gray-400 mr-2.5 flex-shrink-0" size={16} />
                <select
                  id="departmentSelect"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="flex-grow bg-transparent focus:outline-none text-black text-sm"
                  required
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
            <div className="space-y-1.5">
              <label htmlFor="roleSelect" className="block text-sm font-medium text-gray-700">
                Role <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center border-2 border-gray-300 bg-white/60 backdrop-blur rounded-lg px-3 py-2.5 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400 transition-all">
                <FaUserTag className="text-gray-400 mr-2.5 flex-shrink-0" size={16} />
                <select
                  id="roleSelect"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex-grow bg-transparent focus:outline-none text-black text-sm"
                  required
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Compact Reporting Manager Field */}
          {(role === "Assistant Manager" || role === "Executive") && department === "Sales" && (
            <div className="space-y-1.5 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <label htmlFor="managerSelect" className="block text-sm font-medium text-blue-800">
                Reporting Manager <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center border-2 border-blue-300 bg-white/80 backdrop-blur rounded-lg px-3 py-2.5 shadow-inner focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-400 transition-all">
                <FaUser className="text-blue-500 mr-2.5 flex-shrink-0" size={16} />
                <select
                  id="managerSelect"
                  value={selectedReportingManager}
                  onChange={(e) => setSelectedReportingManager(e.target.value)}
                  className="flex-grow bg-transparent focus:outline-none text-black text-sm"
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
              <p className="text-xs text-blue-600 mt-1">
                Required for Sales executives and assistant managers
              </p>
            </div>
          )}

          {/* Compact Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium flex items-start">
              <svg className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Compact Form Buttons */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2 bg-gray-100 rounded-lg border border-gray-300 text-gray-700 hover:bg-red-100 hover:text-red-700 transition duration-200 disabled:opacity-50 font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center justify-center min-w-[120px] font-medium text-sm shadow-lg transition-all duration-300"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
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
                  Adding User...
                </>
              ) : (
                <>
                  <AiOutlineUserAdd className="mr-2" size={16} />
                  Add User
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Enhanced Toast Container for mobile */}
      <ToastContainer 
        position="top-center"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        className="mt-16 sm:mt-4"
        toastClassName="text-sm sm:text-base"
      />
    </div>
  );
};

export default NewUser;