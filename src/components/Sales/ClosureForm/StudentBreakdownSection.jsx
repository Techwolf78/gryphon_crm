// Acknowledged. Starting with updated StudentBreakdownSection with all fields mandatory and red asterisk added.
// Will send full updated component now.

import React from "react";
import { FaPlus, FaTrash } from "react-icons/fa";

const inputClass = "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const selectClass = "w-full px-3 py-2 border rounded-lg border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const fileInputClass = "block w-full text-sm text-gray-700 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100";

const courseOptions = ["Engineering", "MBA", "BBA", "BCA", "MCA", "Diploma", "BSC", "MSC", "Others"];

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
  Others: ["1st", "2nd"]
};

const deliveryTypes = [
  { value: "TP", label: "TP - Training Placement" },
  { value: "OT", label: "OT - Only Training" },
  { value: "IP", label: "IP - Induction Program" },
  { value: "DM", label: "DM - Digital Marketing" },
  { value: "SNS", label: "SNS - SNS" }
];

const generatePassingYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 16 }, (_, i) => `${currentYear - 5 + i}-${currentYear - 4 + i}`);
};

const StudentBreakdownSection = ({ formData, setFormData, studentFile, setStudentFile, studentFileError }) => {
  const handleCourseChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateCourseDetail = (index, field, value) => {
    const updated = [...formData.courses];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, courses: updated }));
  };

  const addCourseField = () => {
    setFormData((prev) => ({ ...prev, courses: [...prev.courses, { specialization: "", othersSpecText: "", students: "" }] }));
  };

  const removeCourseField = (index) => {
    const updated = [...formData.courses];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, courses: updated }));
  };

  const isOtherCourse = formData.course === "Others";

  return (
    <section>
      <div className="p-5 bg-white shadow-lg rounded-xl border border-gray-200 space-y-4">
        <div className="flex justify-between items-center border-b-2 border-blue-500 pb-2">
          <h3 className="text-2xl font-semibold text-blue-700">Student Breakdown</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="space-y-1">
            <label className="font-medium">Course <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.course} onChange={(e) => handleCourseChange("course", e.target.value)} required>
              <option value="">Select Course</option>
              {courseOptions.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>

          {isOtherCourse && (
            <div className="space-y-1">
              <label className="font-medium">Other Course <span className="text-red-500">*</span></label>
              <input type="text" className={inputClass} value={formData.otherCourseText || ""} onChange={(e) => handleCourseChange("otherCourseText", e.target.value)} required />
            </div>
          )}

          <div className="space-y-1">
            <label className="font-medium">Year <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.year} onChange={(e) => handleCourseChange("year", e.target.value)} required>
              <option value="">Select Year</option>
              {(courseYears[formData.course] || []).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-medium">Delivery Type <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.deliveryType} onChange={(e) => handleCourseChange("deliveryType", e.target.value)} required>
              <option value="">Delivery Type</option>
              {deliveryTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-medium">Passing Year <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.passingYear} onChange={(e) => handleCourseChange("passingYear", e.target.value)} required>
              <option value="">Passing Year</option>
              {generatePassingYears().map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {(formData?.courses || []).map((item, index) => {
            const isOthersSpec = item.specialization === "Other";
            return (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="font-medium">Specialization <span className="text-red-500">*</span></label>
                  <select className={selectClass} value={item.specialization} onChange={(e) => updateCourseDetail(index, "specialization", e.target.value)} required>
                    <option value="">Select Specialization</option>
                    {(courseSpecializations[formData.course] || []).map((spec) => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                {isOthersSpec && (
                  <div className="space-y-1">
                    <label className="font-medium">Other Specialization <span className="text-red-500">*</span></label>
                    <input type="text" className={inputClass} value={item.othersSpecText || ""} onChange={(e) => updateCourseDetail(index, "othersSpecText", e.target.value)} required />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-medium">No. of Students <span className="text-red-500">*</span></label>
                  <input type="number" className={inputClass} value={item.students} disabled={isOthersSpec && !item.othersSpecText} onChange={(e) => updateCourseDetail(index, "students", e.target.value)} required />
                </div>

                <div className="flex items-end gap-2">
                  {index === formData.courses.length - 1 && (
                    <button type="button" onClick={addCourseField} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-full">
                      <FaPlus />
                    </button>
                  )}
                  {formData.courses.length > 1 && (
                    <button type="button" onClick={() => removeCourseField(index)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-full">
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1">
          <label className="font-medium">Upload Student Excel File <span className="text-red-500">*</span></label>
          <input type="file" accept=".xlsx, .xls" className={fileInputClass} onChange={(e) => setStudentFile(e.target.files[0])} required />
          {studentFileError && <p className="text-red-500 text-sm mt-1">{studentFileError}</p>}
        </div>
      </div>
    </section>
  );
};

export default StudentBreakdownSection;
