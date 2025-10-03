import React, { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { FiX } from "react-icons/fi";
const departments = ["Sales", "Placement", "L & D", "DM", "Admin", "CA", "HR"];
const roles = ["Director", "Head", "Manager", "Assistant Manager", "Executive"];
 
const EditUser = ({ user, onCancel, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    departments: [], // Changed from department to departments array
  });
 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
 
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "",
        departments: Array.isArray(user.departments) ? user.departments : (user.department ? [user.department] : []), // Handle both old single department and new array format
      });
    }
  }, [user]);
 
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
 
    try {
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        departments: formData.departments, // Changed from department to departments array
        updatedAt: new Date(),
      });
 
      onSuccess();
    } catch (err) {
      setError("Failed to update user: " + err.message);

    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Edit User
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>
 
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
 
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name
          </label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
 
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
 
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Departments
          </label>
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.departments.map((dept, index) => (
                <span
                  key={dept}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                >
                  {dept}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      departments: prev.departments.filter((_, i) => i !== index)
                    }))}
                    className="text-indigo-600 hover:text-indigo-800 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !formData.departments.includes(e.target.value)) {
                  setFormData(prev => ({
                    ...prev,
                    departments: [...prev.departments, e.target.value]
                  }));
                }
                e.target.value = ""; // Reset select
              }}
              className="w-full bg-transparent focus:outline-none text-black text-sm"
            >
              <option value="">Add department...</option>
              {departments.filter(dept => !formData.departments.includes(dept)).map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          {formData.departments.length === 0 && (
            <p className="text-xs text-red-600 mt-1">Please select at least one department</p>
          )}
        </div>
 
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`w-full sm:w-auto px-4 py-2 text-sm text-white rounded-lg ${
              loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};
 
export default EditUser;
 
