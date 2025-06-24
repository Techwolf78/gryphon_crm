import React from "react";
import { FaPlus, FaTrash } from "react-icons/fa";

const inputClass =
  "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:ring-blue-400";

const courseOptions = [
  "Engineering",
  "MBA",
  "BBA",
  "BCA",
  "MCA",
  "Diploma",
  "BSC",
  "MSC",
  "Others",
];

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
  Engineering: ["1st", "2nd", "3rd", "4th"],
  MBA: ["1st", "2nd"],
  BBA: ["1st", "2nd", "3rd"],
  BCA: ["1st", "2nd", "3rd"],
  BSC: ["1st", "2nd", "3rd"],
  MCA: ["1st", "2nd"],
  Diploma: ["1st", "2nd", "3rd"],
  MSC: ["1st", "2nd"],
  Others: ["1st", "2nd"],
};

const deliveryTypes = [
  { value: "TP", label: "TP - Training Placement" },
  { value: "OT", label: "OT - Only Training" },
  { value: "IP", label: "IP - Induction Program" },
  { value: "DM", label: "DM - Digital Mraketing" },
  { value: "SNS", label: "SNS - SNS" },
];

const generatePassingYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 10; i++) {
    years.push(`${i}-${i + 1}`);
  }
  return years;
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
      courses: [...prev.courses, { specialization: "", students: "", othersSpecText: "", deliveryType: "", passingYear: "" }]
    }));
  };

  const removeCourseField = (index) => {
    const updated = [...formData.courses];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, courses: updated }));
  };

  const isOtherCourse = formData.course === "Others";

  return (
    <section>
      <h3 className="font-semibold text-lg mb-3 text-blue-700">Student Breakdown</h3>

      {/* Course, Year, Delivery Type, Passing Year */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <select
          className={inputClass}
          value={formData.course}
          onChange={(e) => handleCourseChange("course", e.target.value)}
        >
          <option value="">Select Course</option>
          {courseOptions.map((course) => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>

        {isOtherCourse && (
          <input
            type="text"
            placeholder="Specify Other Course"
            className={inputClass}
            value={formData.otherCourseText || ""}
            onChange={(e) => handleCourseChange("otherCourseText", e.target.value)}
          />
        )}

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

        <select
          className={inputClass}
          value={formData.deliveryType || ""}
          onChange={(e) => handleCourseChange("deliveryType", e.target.value)}
        >
          <option value="">Delivery Type</option>
          {deliveryTypes.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>

        <select
          className={inputClass}
          value={formData.passingYear || ""}
          onChange={(e) => handleCourseChange("passingYear", e.target.value)}
        >
          <option value="">Passing Year</option>
          {generatePassingYears().map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Specialization Breakdown */}
      {(formData?.courses || []).map((item, index) => {
        const isOthersSpec = item.specialization === "Other";

        return (
          <div key={index} className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center mt-4">

            {/* Specialization */}
            <select
              className={inputClass}
              value={item.specialization}
              onChange={(e) => updateCourseDetail(index, "specialization", e.target.value)}
            >
              <option value="">Specialization</option>
              {(courseSpecializations[formData.course] || []).map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>

            {/* Specify Others */}
            {isOthersSpec && (
              <input
                type="text"
                placeholder="Specify Other Specialization"
                className={inputClass}
                value={item.othersSpecText || ""}
                onChange={(e) => updateCourseDetail(index, "othersSpecText", e.target.value)}
              />
            )}

            {/* Student Count */}
            <input
              type="number"
              placeholder="No. of Students"
              className={inputClass}
              value={item.students}
              disabled={isOthersSpec && !item.othersSpecText}
              onChange={(e) => updateCourseDetail(index, "students", e.target.value)}
            />

            {/* Add/Remove Buttons */}
            <div className="flex items-center gap-2 col-span-2">
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
        );
      })}

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
