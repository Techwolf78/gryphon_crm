import React, { useCallback } from 'react';
import specializationOptions from './specializationOptions';

function AddJDForm({ formData, setFormData, formErrors, handleFileChange, placementUsers, isLoadingUsers }) {
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }, [formData, setFormData]);

  const handleSpecializationChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      if (checked) {
        return { ...prev, specialization: [...prev.specialization, value] };
      } else {
        return { ...prev, specialization: prev.specialization.filter(spec => spec !== value) };
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Company Info */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company Name<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="e.g. Acme Corporation"
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              formErrors.companyName ? "border-red-500" : "border-gray-300"
            }`}
          />
          {formErrors.companyName && (
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
        {formErrors.companyName && (
          <p className="mt-1 text-sm text-red-600">{formErrors.companyName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company Website
        </label>
        <input
          type="text"
          name="companyWebsite"
          value={formData.companyWebsite}
          onChange={handleChange}
          placeholder="e.g. https://company.com"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </div>

      <div className="col-span-2">
        <h3 className="text-lg font-semibold text-blue-700 mt-4">Eligibility<span className="text-red-500 ml-1">*</span></h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Course/Degree<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <select
            name="course"
            value={formData.course}
            onChange={(e) => {
              setFormData({ ...formData, course: e.target.value, specialization: [] });
            }}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white ${
              formErrors.course ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select Course</option>
            <option>Engineering</option>
            <option>MBA</option>
            <option>BBA</option>
            <option>BCA</option>
            <option>MCA</option>
            <option>BSC</option>
            <option>MSC</option>
            <option>Diploma</option>
            <option>Others</option>
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
          {formErrors.course && (
            <div className="absolute inset-y-0 right-7 pr-3 flex items-center pointer-events-none">
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
        {formErrors.course && (
          <p className="mt-1 text-sm text-red-600">{formErrors.course}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Specialization(s)<span className="text-red-500 ml-1">*</span>
        </label>
        <div className={`p-2 border rounded-lg bg-gray-50 ${
          formErrors.specialization ? "border-red-500" : "border-gray-300"
        }`}>
          {formData.course ? (
            <div className="flex flex-wrap gap-4">
              {specializationOptions[formData.course]?.map((spec) => (
                <div key={spec} className="flex items-center">
                  <input
                    type="checkbox"
                    id={spec}
                    value={spec}
                    checked={formData.specialization.includes(spec)}
                    onChange={handleSpecializationChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={spec} className="ml-2 text-sm text-gray-700">
                    {spec}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Select a course first</p>
          )}
        </div>
        {formErrors.specialization && (
          <p className="mt-1 text-sm text-red-600">{formErrors.specialization}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Passing Year<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <select
            name="passingYear"
            value={formData.passingYear}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white ${
              formErrors.passingYear ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select Year</option>
            {[2022,2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032,2034].map((yr) => (
              <option key={yr}>{yr}</option>
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
          {formErrors.passingYear && (
            <div className="absolute inset-y-0 right-7 pr-3 flex items-center pointer-events-none">
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
        {formErrors.passingYear && (
          <p className="mt-1 text-sm text-red-600">{formErrors.passingYear}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Gender<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white ${
              formErrors.gender ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select Gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Male/Female</option>
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
          {formErrors.gender && (
            <div className="absolute inset-y-0 right-7 pr-3 flex items-center pointer-events-none">
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
        {formErrors.gender && (
          <p className="mt-1 text-sm text-red-600">{formErrors.gender}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Marks Criteria<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <select
            name="marksCriteria"
            value={formData.marksCriteria}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white ${
              formErrors.marksCriteria ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select Criteria</option>
            <option>No Criteria</option>
            <option>50% & Above Throughout</option>
            <option>55% & Above Throughout</option>
            <option>60% & Above Throughout</option>
            <option>65% & Above Throughout</option>
            <option>70% & Above Throughout</option>
            <option>75% & Above Throughout</option>
            <option>80% & Above Throughout</option>
            <option>85% & Above Throughout</option>
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
          {formErrors.marksCriteria && (
            <div className="absolute inset-y-0 right-7 pr-3 flex items-center pointer-events-none">
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
        {formErrors.marksCriteria && (
          <p className="mt-1 text-sm text-red-600">{formErrors.marksCriteria}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Backlog Criteria
        </label>
        <div className="relative">
          <select
            name="backlogCriteria"
            value={formData.backlogCriteria}
            onChange={handleChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
          >
            <option value="">Select Criteria</option>
            <option>No Criteria</option>
            <option>No Active Backlog</option>
            <option>No History of Backlog</option>
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

      <div className="col-span-2">
        <h3 className="text-lg font-semibold text-blue-700 mt-4">Job Details<span className="text-red-500 ml-1">*</span></h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Job Type<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <select
            name="jobType"
            value={formData.jobType}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white ${
              formErrors.jobType ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select Type</option>
            <option>Internship</option>
            <option>Int + PPO</option>
            <option>Full Time</option>
            <option>Training + FT</option>
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
          {formErrors.jobType && (
            <div className="absolute inset-y-0 right-7 pr-3 flex items-center pointer-events-none">
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
        {formErrors.jobType && (
          <p className="mt-1 text-sm text-red-600">{formErrors.jobType}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Job Designation
        </label>
        <input
          type="text"
          name="jobDesignation"
          value={formData.jobDesignation}
          onChange={handleChange}
          placeholder="e.g. Software Engineer"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Job Location
        </label>
        <input
          type="text"
          name="jobLocation"
          value={formData.jobLocation}
          onChange={handleChange}
          placeholder="e.g. Bangalore"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Salary (CTC)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500">₹</span>
          </div>
          <input
            type="text"
            name="salary"
            value={formData.salary}
            onChange={handleChange}
            placeholder="e.g. 500000"
            className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
      </div>

      {formData.jobType === "Internship" || formData.jobType === "Int + PPO" ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internship Duration
            </label>
            <input
              type="text"
              name="internshipDuration"
              value={formData.internshipDuration}
              onChange={handleChange}
              placeholder="e.g. 6 months"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stipend
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">₹</span>
              </div>
              <input
                type="text"
                name="stipend"
                value={formData.stipend}
                onChange={handleChange}
                placeholder="e.g. 25000"
                className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>
        </>
      ) : null}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mode of Interview
        </label>
        <div className="relative">
          <select
            name="modeOfInterview"
            value={formData.modeOfInterview}
            onChange={handleChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
          >
            <option value="">Select Mode</option>
            <option>Online</option>
            <option>Offline</option>
            <option>Hybrid</option>
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Joining Period
        </label>
        <input
          type="text"
          name="joiningPeriod"
          value={formData.joiningPeriod}
          onChange={handleChange}
          placeholder="e.g. Immediate/15 days"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company Open Date<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <input
            type="date"
            name="companyOpenDate"
            value={formData.companyOpenDate}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              formErrors.companyOpenDate ? "border-red-500" : "border-gray-300"
            }`}
          />
          {formErrors.companyOpenDate && (
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
        {formErrors.companyOpenDate && (
          <p className="mt-1 text-sm text-red-600">{formErrors.companyOpenDate}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mode of Work
        </label>
        <div className="relative">
          <select
            name="modeOfWork"
            value={formData.modeOfWork}
            onChange={handleChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
          >
            <option value="">Select Mode</option>
            <option>Work From Office</option>
            <option>Work From Home</option>
            <option>Hybrid</option>
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

      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Job Description
        </label>
        <textarea
          name="jobDescription"
          value={formData.jobDescription}
          onChange={handleChange}
          rows="3"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          placeholder="Enter job description details..."
        ></textarea>
      </div>

      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload Job Files (JD, PPT, etc.)
        </label>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </div>

      <div className="col-span-2">
        <h3 className="text-lg font-semibold text-blue-700 mt-4">Internal Use Only<span className="text-red-500 ml-1">*</span></h3>
      </div>

       <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            name="source"
            value={formData.source}
            onChange={handleChange}
            placeholder="e.g. LinkedIn, Referral, etc."
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              formErrors.source ? "border-red-500" : "border-gray-300"
            }`}
          />
          {formErrors.source && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        {formErrors.source && (
          <p className="mt-1 text-sm text-red-600">{formErrors.source}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Coordinator<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-2.5 border border-gray-300 rounded-lg bg-gray-100">
              <span className="text-gray-500 text-sm">Loading coordinators...</span>
            </div>
          ) : (
            <>
              <select
                name="coordinator"
                value={formData.coordinator}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white ${
                  formErrors.coordinator ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select Coordinator</option>
                {placementUsers.map((user) => (
                  <option key={user.id} value={user.name }>
                    {user.name} 
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </>
          )}
          {formErrors.coordinator && (
            <div className="absolute inset-y-0 right-7 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        {formErrors.coordinator && (
          <p className="mt-1 text-sm text-red-600">{formErrors.coordinator}</p>
        )}
        
        {/* Available coordinators count */}
        {!isLoadingUsers && placementUsers.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            {placementUsers.length} placement coordinator(s) available
          </p>
        )}
        
        {!isLoadingUsers && placementUsers.length === 0 && (
          <p className="mt-1 text-xs text-red-500">
            No placement coordinators found. Please add users with 'placement' department.
          </p>
        )}
      </div>
    </div>
  );
}
export default AddJDForm;