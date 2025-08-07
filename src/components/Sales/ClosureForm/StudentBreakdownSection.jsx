import React, { useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import FileUploader from "../ClosureForm/FileUploader";

const inputClass = "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const selectClass = "w-full px-3 py-2 border rounded-lg border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

const courseOptions = ["Engineering", "MBA", "BBA", "BCA", "MCA", "Diploma", "BSC", "MSC", "Others"];
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

const generatePassingYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 16 }, (_, i) => `${currentYear - 5 + i}-${currentYear - 4 + i}`);
};

const StudentBreakdownSection = ({ formData, setFormData, studentFile, setStudentFile, studentFileError }) => {
  // Add state to track when "Others"/"Other" was selected
  const [isCustomCourse, setIsCustomCourse] = useState(false);
  const [customSpecializations, setCustomSpecializations] = useState([]);
  const [isCustomDeliveryType, setIsCustomDeliveryType] = useState(false);

  const isOtherCourse = formData.course === "Others" || isCustomCourse;
  
  // Fix: If it's a custom course, always show "Other" option for specializations
  const currentSpecializations = isCustomCourse 
    ? ["Other"] 
    : (courseSpecializations[formData.course] || []);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Reset custom course state when switching to predefined course
      if (field === 'course' && value !== "Others" && courseOptions.includes(value)) {
        setIsCustomCourse(false);
        updated.courses = [{ specialization: "", students: "" }];
      }
      
      return updated;
    });
  };

  const handleOtherCourseChange = (value) => {
    setIsCustomCourse(true);
    setFormData(prev => ({ ...prev, course: value }));
  };

  const updateCourseDetail = (index, field, value) => {
    const updated = [...formData.courses];
    updated[index][field] = value;
    
    // Track custom specializations
    if (field === 'specialization' && value === 'Other') {
      setCustomSpecializations(prev => {
        const newArray = [...prev];
        newArray[index] = true;
        return newArray;
      });
    } else if (field === 'specialization' && value !== 'Other') {
      setCustomSpecializations(prev => {
        const newArray = [...prev];
        newArray[index] = false;
        return newArray;
      });
    }
    
    setFormData(prev => ({ ...prev, courses: updated }));
  };

  const handleOtherSpecializationChange = (index, value) => {
    const updated = [...formData.courses];
    updated[index].specialization = value;
    setFormData(prev => ({ ...prev, courses: updated }));
  };

  const addCourseField = () => {
    setFormData(prev => ({ ...prev, courses: [...prev.courses, { specialization: "", students: "" }] }));
  };

  const removeCourseField = (index) => {
    const updated = [...formData.courses];
    updated.splice(index, 1);
    setFormData(prev => ({ ...prev, courses: updated }));
  };

  const handleDeliveryTypeChange = (e) => {
    const value = e.target.value;
    if (value === "Other") {
      setIsCustomDeliveryType(true);
      setFormData(prev => ({ ...prev, deliveryType: "" }));
    } else {
      setIsCustomDeliveryType(false);
      setFormData(prev => ({ ...prev, deliveryType: value }));
    }
  };

  return (
    <section>
      <div className="p-5 bg-white shadow-lg rounded-xl border border-gray-200 space-y-4">
        <h3 className="text-2xl font-semibold text-blue-700 border-b border-blue-500 pb-2">Student Breakdown</h3>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="space-y-1">
            <label className="font-medium">Course <span className="text-red-500">*</span></label>
            <select 
              className={selectClass} 
              value={isCustomCourse ? "Others" : formData.course} 
              onChange={(e) => {
                if (e.target.value === "Others") {
                  setIsCustomCourse(true);
                  handleChange("course", "");
                } else {
                  setIsCustomCourse(false);
                  handleChange("course", e.target.value);
                }
              }} 
              required
            >
              <option value="">Select Course</option>
              {courseOptions.map(course => <option key={course} value={course}>{course}</option>)}
            </select>
          </div>

          {/* Show input when "Others" is selected OR when custom course is being entered */}
          {isOtherCourse && (
            <div className="space-y-1">
              <label className="font-medium">Specify Course <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className={inputClass} 
                value={isCustomCourse ? formData.course : ""} 
                onChange={(e) => handleOtherCourseChange(e.target.value)} 
                placeholder="Enter course name" 
                required 
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="font-medium">Year <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.year} onChange={(e) => handleChange("year", e.target.value)} required>
              <option value="">Select Year</option>
              {/* Fix: For custom courses, show default years */}
              {(isCustomCourse ? courseYears.Others : (courseYears[formData.course] || [])).map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-medium">Delivery Type <span className="text-red-500">*</span></label>
            <select
              className={selectClass}
              value={isCustomDeliveryType ? "Other" : formData.deliveryType}
              onChange={handleDeliveryTypeChange}
              required
            >
              <option value="">Delivery Type</option>
              {deliveryTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              <option value="Other">Other</option>
            </select>
          </div>

          {isCustomDeliveryType && (
            <div className="space-y-1">
              <label className="font-medium">Specify Delivery Type <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={inputClass}
                value={formData.deliveryType}
                onChange={e => setFormData(prev => ({ ...prev, deliveryType: e.target.value }))}
                placeholder="Enter delivery type"
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="font-medium">Passing Year <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.passingYear} onChange={(e) => handleChange("passingYear", e.target.value)} required>
              <option value="">Passing Year</option>
              {generatePassingYears().map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {(formData.courses || []).map((item, index) => {
            const isCustomSpec = customSpecializations[index] || false;
            return (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="font-medium">Specialization <span className="text-red-500">*</span></label>
                  <select 
                    className={selectClass} 
                    value={isCustomSpec ? "Other" : item.specialization} 
                    onChange={(e) => {
                      if (e.target.value === "Other") {
                        updateCourseDetail(index, "specialization", "");
                        setCustomSpecializations(prev => {
                          const newArray = [...prev];
                          newArray[index] = true;
                          return newArray;
                        });
                      } else {
                        updateCourseDetail(index, "specialization", e.target.value);
                        setCustomSpecializations(prev => {
                          const newArray = [...prev];
                          newArray[index] = false;
                          return newArray;
                        });
                      }
                    }} 
                    required
                  >
                    <option value="">Select Specialization</option>
                    {currentSpecializations.map(spec => <option key={spec} value={spec}>{spec}</option>)}
                  </select>
                </div>

                {/* Show input when "Other" is selected OR when custom specialization is being entered */}
                {isCustomSpec && (
                  <div className="space-y-1">
                    <label className="font-medium">Specify Specialization <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      className={inputClass} 
                      value={item.specialization} 
                      onChange={(e) => handleOtherSpecializationChange(index, e.target.value)} 
                      placeholder="Enter specialization" 
                      required 
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-medium">No. of Students <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    className={inputClass}
                    value={item.students}
                    min="1"
                    onChange={(e) => updateCourseDetail(index, "students", Math.max(1, e.target.value))}
                    required
                  />
                </div>

                <div className="flex items-end gap-2">
                  {index === formData.courses.length - 1 && (
                    <button
                      type="button"
                      onClick={addCourseField}
                      className="flex items-center gap-2 text-blue-600 font-medium cursor-pointer hover:text-blue-800"
                    >
                      <FaPlus /> Add
                    </button>
                  )}
                  {formData.courses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCourseField(index)}
                      className="flex items-center gap-2 text-red-600 font-medium cursor-pointer hover:text-red-800"
                    >
                      <FaTrash /> Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <FileUploader
          onFileUpload={(file) => setStudentFile(file)}
          onFileClear={() => setStudentFile(null)}
          fileError={studentFileError}
          initialFileName={studentFile?.name || ""}
        />
      </div>
    </section>
  );
};

export default StudentBreakdownSection;
