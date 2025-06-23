// StudentBreakdownSection.jsx
import React from "react";
import { FaPlus, FaTrash } from "react-icons/fa";

const inputClass =
  "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:ring-blue-400";

const courseSpecializations = {
  Engineering: ["CS", "IT", "ENTC", "CS-Cyber Security", "Mechanical", "Civil", "Electrical", "Chemical", "CS-AI-ML", "CS-AI-DS", "Other"],
  MBA: ["Marketing", "Finance", "HR", "Operations", "Other"],
  BBA: ["International Business", "General", "Finance", "Other"],
  BCA: ["Computer Applications", "Other"],
  MCA: ["Computer Science", "Other"],
  Diploma: ["Mechanical", "Civil", "Electrical", "Computer", "Other"],
  BSC: ["Physics", "Chemistry", "Mathematics", "CS", "Other"],
  MSC: ["Physics", "Chemistry", "Mathematics", "CS", "Other"],
  Others: ["Other"]
};

const courseYears = {
  Engineering: ["First Year", "Second Year", "Third Year", "Final Year"],
  MBA: ["First Year", "Final Year"],
  BBA: ["First Year", "Second Year", "Final Year"],
  BCA: ["First Year", "Second Year", "Final Year"],
  BSC: ["First Year", "Second Year", "Final Year"],
  MCA: ["First Year", "Final Year"],
  Diploma: ["First Year", "Second Year", "Final Year"],
  MSC: ["First Year", "Final Year"],
  Others: ["First Year", "Final Year"]
};

const StudentBreakdownSection = ({ formData, setFormData, studentFile, setStudentFile }) => {
  const handleCourseChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateCourseDetail = (index, field, value) => {
    const updated = [...formData.courses];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, courses: updated }));
  };

  const addCourseField = () => {
    setFormData((prev) => ({
      ...prev,
      courses: [...prev.courses, { specialization: "", students: "" }]
    }));
  };

  const removeCourseField = (index) => {
    const updated = [...formData.courses];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, courses: updated }));
  };

  return (
    <section>
      <h3 className="font-semibold text-lg mb-3 text-blue-700">Student Breakdown</h3>

      <div className="grid grid-cols-2 gap-4">
        <select
          className={inputClass}
          value={formData.course}
          onChange={(e) => handleCourseChange("course", e.target.value)}
        >
          <option value="">Select Course</option>
          {Object.keys(courseSpecializations).map((course) => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>

        <select
          className={inputClass}
          value={formData.year}
          onChange={(e) => handleCourseChange("year", e.target.value)}
        >
          <option value="">Select Year</option>
          {(courseYears[formData.course] || []).map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {(formData?.courses || []).map((item, index) => (
  <div key={index} className="grid grid-cols-5 gap-4 items-center mt-4">
    <select
      className={inputClass}
      value={item.specialization}
      onChange={(e) => updateCourseDetail(index, "specialization", e.target.value)}
    >
      <option value="">Select Specialization</option>
      {(courseSpecializations[formData.course] || []).map((spec) => (
        <option key={spec} value={spec}>{spec}</option>
      ))}
    </select>

    <input
      type="number"
      placeholder="No. of Students"
      className={inputClass}
      value={item.students}
      onChange={(e) => updateCourseDetail(index, "students", e.target.value)}
    />

    <div className="col-span-2 flex items-center gap-2">
      {index === formData.courses.length - 1 && (
        <button
          type="button"
          onClick={addCourseField}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-full"
          title="Add Row"
        >
          <FaPlus />
        </button>
      )}

      {formData.courses.length > 1 && (
        <button
          type="button"
          onClick={() => removeCourseField(index)}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-full"
          title="Delete Row"
        >
          <FaTrash />
        </button>
      )}
    </div>
  </div>
))}

      <div className="mt-4">
        <label className="block font-semibold mb-1">Upload Student Excel File:</label>
        <input
          type="file"
          accept=".xlsx, .xls"
          className="block w-full text-sm text-gray-700 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          onChange={(e) => setStudentFile(e.target.files[0])}
        />
      </div>
    </section>
  );
};

export default StudentBreakdownSection;
