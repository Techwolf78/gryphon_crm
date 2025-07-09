import React from "react";
import { TrashIcon } from "@heroicons/react/outline";

const CourseForm = ({
  course,
  index,
  handleCourseChange,
  handleSpecializationChange,
  courseSpecializations,
  yearOptions,
  isFormValid,
  onRemove,
  showRemoveButton
}) => {
  return (
    <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-medium text-gray-700">Course {index + 1}</h4>
        {showRemoveButton && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Course Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course Type<span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <select
              value={course.courseType}
              onChange={(e) => handleCourseChange(index, 'courseType', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="">Select Course</option>
              {Object.keys(courseSpecializations).map((courseType) => (
                <option key={courseType} value={courseType}>
                  {courseType}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Passing Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Passing Year
          </label>
          <div className="relative">
            <select
              value={course.passingYear}
              onChange={(e) => handleCourseChange(index, 'passingYear', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="">Select Passing Year</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Course Type */}
      {course.courseType === "Others" && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Please specify Course Type
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={course.manualCourseType}
              onChange={(e) => handleCourseChange(index, 'manualCourseType', e.target.value)}
              placeholder="Enter custom course type"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !course.manualCourseType.trim() && isFormValid
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {!course.manualCourseType.trim() && isFormValid && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
          {!course.manualCourseType.trim() && isFormValid && (
            <p className="mt-1 text-sm text-red-600">
              This field is required
            </p>
          )}
        </div>
      )}

      {/* Specializations */}
      {course.courseType && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Specialization(s)
              <span className="text-red-500 ml-1">*</span>
            </label>
            <span className="text-xs text-gray-500">
              (Select multiple options)
            </span>
          </div>

          {/* Checkbox Grid */}
          <div className="flex flex-wrap gap-4 p-2 border border-gray-200 rounded-lg bg-white">
            {courseSpecializations[course.courseType].map((spec) => (
              <div key={spec} className="flex items-center">
                <input
                  type="checkbox"
                  id={`spec-${index}-${spec}`}
                  value={spec}
                  checked={course.specializations.includes(spec)}
                  onChange={(e) => handleSpecializationChange(e, index)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor={`spec-${index}-${spec}`}
                  className="ml-2 text-sm text-gray-700"
                >
                  {spec}
                </label>
              </div>
            ))}
          </div>

          {/* Other Specialization Input */}
          {course.specializations.includes("Other") && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Please specify Specialization
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={course.manualSpecialization}
                onChange={(e) => handleCourseChange(index, 'manualSpecialization', e.target.value)}
                placeholder="Enter custom specialization"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Validation Messages */}
          {course.specializations.length === 0 && isFormValid && (
            <p className="mt-1 text-sm text-red-600">
              Please select at least one specialization
            </p>
          )}
        </div>
      )}

      {/* Student Count, Per Student Cost, TCV */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Student Count
          </label>
          <div className="relative">
            <input
              type="number"
              value={course.studentCount}
              onChange={(e) => handleCourseChange(index, 'studentCount', e.target.value)}
              placeholder="e.g. 120"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Per Student Cost
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">₹</span>
            </div>
            <input
              type="number"
              value={course.perStudentCost}
              onChange={(e) => handleCourseChange(index, 'perStudentCost', e.target.value)}
              placeholder="e.g. 1500"
              className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            TCV
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">₹</span>
            </div>
            <input
              type="number"
              value={course.tcv}
              disabled
              className="w-full pl-8 pr-4 py-2.5 border border-gray-300 bg-gray-100 rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseForm;