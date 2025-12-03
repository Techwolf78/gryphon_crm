import React, { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { FiX } from "react-icons/fi";
import { FaUser } from "react-icons/fa";
import { toast } from "react-toastify";
import PropTypes from "prop-types";

const departments = ["Sales", "Placement", "L & D", "DM", "Admin", "CA", "HR", "Accounts"];
const roles = ["Director", "Head", "Manager", "Assistant Manager", "Executive"];

const EditUser = ({ user, onCancel, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    departments: [], // Changed from department to departments array
    reportingManager: "",
  });
 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportingManagers, setReportingManagers] = useState([]);
 
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "",
        departments: Array.isArray(user.departments) ? user.departments : (user.department ? [user.department] : []), // Handle both old single department and new array format
        reportingManager: user.reportingManager || "",
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchManagers = async () => {
      const relevantDepartments = [];
      if (formData.departments.includes("Sales")) relevantDepartments.push("Sales");
      if (formData.departments.includes("Placement")) relevantDepartments.push("Placement");

      if (
        (formData.role === "Assistant Manager" || formData.role === "Executive") &&
        relevantDepartments.length > 0
      ) {
        try {
          // Get all managers first, then filter client-side to handle both old and new data formats
          const q = query(
            collection(db, "users"),
            where("role", "==", "Manager")
          );
          const querySnapshot = await getDocs(q);

          const managers = querySnapshot.docs
            .map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                name: data.name,
                // Handle both old format (department: string) and new format (departments: array)
                departments: Array.isArray(data.departments)
                  ? data.departments
                  : (data.department ? [data.department] : []),
              };
            })
            .filter((manager) => {
              // Check if manager belongs to any of the relevant departments
              return relevantDepartments.some(dept => manager.departments.includes(dept));
            });

          setReportingManagers(managers);
        } catch {
          // Error fetching managers - handled through toast
          toast.error("Failed to load reporting managers");
        }
      } else {
        setReportingManagers([]);
        // Don't clear reportingManager here - let it persist from backend data
        // It will be cleared when saving if not required for the current role/department combo
      }
    };

    fetchManagers();
  }, [formData.role, formData.departments]);
 
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation checks
    if (formData.departments.length === 0) {
      setError("Please select at least one department.");
      setLoading(false);
      return;
    }

    if (
      (formData.role === "Assistant Manager" || formData.role === "Executive") &&
      (formData.departments.includes("Sales") || formData.departments.includes("Placement")) &&
      !formData.reportingManager
    ) {
      setError("Please select a Reporting Manager.");
      setLoading(false);
      return;
    }
 
    try {
      const userRef = doc(db, "users", user.id);
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        departments: formData.departments, // Changed from department to departments array
        reportingManager:
          (formData.role === "Assistant Manager" || formData.role === "Executive") &&
          (formData.departments.includes("Sales") || formData.departments.includes("Placement"))
            ? formData.reportingManager
            : null,
        updatedAt: new Date(),
      };
      await updateDoc(userRef, updateData);
 
      onSuccess();
    } catch (err) {
      setError("Failed to update user: " + err.message);
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm z-30"
        onClick={onCancel}
      ></div>

      {/* Modal */}
      <div className="fixed top-24 left-1/2 transform -translate-x-1/2 w-full max-w-md mx-auto bg-white/95 backdrop-blur-xl z-40 rounded-lg shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Edit User
            </h2>
            <button
              onClick={onCancel}
              className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mb-3 p-2 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full p-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Select Role</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departments
              </label>
              <div className="border-2 border-gray-300 bg-white/60 backdrop-blur rounded-lg px-2.5 py-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400 transition-all">
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {formData.departments.map((dept, index) => (
                    <span
                      key={`${dept}-${index}`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                    >
                      {dept}
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          departments: prev.departments.filter((_, i) => i !== index)
                        }))}
                        className="text-indigo-600 hover:text-indigo-800 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {departments.filter(dept => !formData.departments.includes(dept)).map((dept) => (
                    <label key={dept} className="flex items-center space-x-1.5 cursor-pointer hover:bg-gray-50 p-0.5 rounded">
                      <input
                        type="checkbox"
                        checked={formData.departments.includes(dept)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              departments: [...prev.departments, dept]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              departments: prev.departments.filter(d => d !== dept)
                            }));
                          }
                        }}
                        className="w-3.5 h-3.5 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                      />
                      <span className="text-xs text-gray-700">{dept}</span>
                    </label>
                  ))}
                </div>
              </div>
              {formData.departments.length === 0 && (
                <p className="text-xs text-red-600 mt-1">Please select at least one department</p>
              )}
            </div>

            {/* Reporting Manager Field */}
            {(formData.role === "Assistant Manager" || formData.role === "Executive") && (formData.departments.includes("Sales") || formData.departments.includes("Placement")) && (
              <div className="space-y-1 bg-blue-50 p-2 rounded-lg border border-blue-200">
                <label htmlFor="managerSelect" className="block text-sm font-medium text-blue-800">
                  Reporting Manager <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center border-2 border-blue-300 bg-white/80 backdrop-blur rounded-lg px-2.5 py-1.5 shadow-inner focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-400 transition-all">
                  <FaUser className="text-blue-500 mr-2 shrink-0" size={14} />
                  <select
                    id="managerSelect"
                    name="reportingManager"
                    value={formData.reportingManager}
                    onChange={handleChange}
                    className="grow bg-transparent focus:outline-none text-black text-sm"
                    required
                  >
                    <option value="">Select Reporting Manager</option>
                    {formData.reportingManager && (
                      <option key="current" value={formData.reportingManager}>
                        {formData.reportingManager} (Current)
                      </option>
                    )}
                    {reportingManagers
                      .filter(manager => manager.name !== formData.reportingManager)
                      .map((manager) => (
                      <option key={manager.id} value={manager.name}>
                        {manager.name} ({manager.departments.join(", ")})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-blue-600 mt-0.5">
                  Required for Sales and Placement executives and assistant managers
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-gray-200 bg-gray-50 px-4 py-3 -mx-4 -mb-4 mt-4 rounded-b-lg">
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`w-full sm:w-auto px-3 py-1.5 text-sm text-white rounded-lg transition-colors ${
                  loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

EditUser.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
    departments: PropTypes.arrayOf(PropTypes.string),
    department: PropTypes.string, // For backward compatibility
    reportingManager: PropTypes.string,
  }).isRequired,
  onCancel: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default EditUser;
 
