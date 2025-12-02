import React, { useCallback, useState } from 'react';
import specializationOptions from './specializationOptions';
import { parseSalaryInput, parseStipendInput, formatSalary, formatStipend } from "../../../utils/salaryUtils";

function AddJDForm({ formData, setFormData, formErrors, handleFileChange, onClose, placementUsers, isLoadingUsers, jobFiles, setJobFiles }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [otherRound, setOtherRound] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setHasUnsavedChanges(true);

    // Parse salary and stipend inputs
    let processedValue = value;
    if (name === 'salary' || name === 'fixedSalary' || name === 'variableSalary') {
      processedValue = parseSalaryInput(value);
    } else if (name === 'stipend') {
      processedValue = parseStipendInput(value);
    }

    setFormData({ ...formData, [name]: processedValue });

    // Validate minimum amounts
    const newValidationErrors = { ...validationErrors };
    if ((name === 'salary' || name === 'fixedSalary') && processedValue !== null && processedValue < 100000) {
      newValidationErrors[name] = 'Minimum salary is 1 LPA (₹1,00,000)';
    } else if (name === 'salary' || name === 'fixedSalary') {
      delete newValidationErrors[name];
    }

    if (name === 'variableSalary' && processedValue !== null && processedValue < 0) {
      newValidationErrors.variableSalary = 'Variable salary cannot be negative';
    } else if (name === 'variableSalary') {
      delete newValidationErrors.variableSalary;
    }

    if (name === 'stipend' && processedValue !== null && processedValue < 1000) {
      newValidationErrors.stipend = 'Minimum stipend is ₹1,000/month';
    } else if (name === 'stipend') {
      delete newValidationErrors.stipend;
    }

    setValidationErrors(newValidationErrors);
  }, [formData, setFormData, validationErrors]);

  const handleSpecializationChange = (e) => {
    const { value, checked } = e.target;
    setHasUnsavedChanges(true);
    setFormData(prev => {
      if (checked) {
        return { ...prev, specialization: [...prev.specialization, value] };
      } else {
        return { ...prev, specialization: prev.specialization.filter(spec => spec !== value) };
      }
    });
  };

  // Hiring Rounds handler
  const handleHiringRoundsChange = (e) => {
    const { value, checked } = e.target;
    setHasUnsavedChanges(true);
    
    if (value === 'Others' && checked) {
      // If Others is selected, clear other rounds and add only Others
      setFormData(prev => ({ 
        ...prev, 
        hiringRounds: ['Others'],
        otherRound: otherRound 
      }));
    } else if (value === 'Others' && !checked) {
      // If Others is deselected, clear both
      setFormData(prev => ({ 
        ...prev, 
        hiringRounds: prev.hiringRounds.filter(round => round !== 'Others'),
        otherRound: ''
      }));
      setOtherRound('');
    } else {
      // For regular rounds
      setFormData(prev => {
        if (checked) {
          // Remove Others if any other round is selected
          const filteredRounds = prev.hiringRounds.filter(round => round !== 'Others');
          return { 
            ...prev, 
            hiringRounds: [...filteredRounds, value],
            otherRound: filteredRounds.includes('Others') ? prev.otherRound : ''
          };
        } else {
          return { ...prev, hiringRounds: prev.hiringRounds.filter(round => round !== value) };
        }
      });
    }
  };

  // Other Round input handler
  const handleOtherRoundChange = (e) => {
    const value = e.target.value;
    setOtherRound(value);
    setHasUnsavedChanges(true);
    setFormData(prev => ({ ...prev, otherRound: value }));
  };

  const handleClose = useCallback(() => {
    if (
      hasUnsavedChanges &&
      !window.confirm("You have unsaved changes. Are you sure you want to close?")
    ) {
      return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  return (
    <div className="space-y-4">
      {/* Company Information */}
      <div className="bg-gray-50/50 p-3 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <div className="w-1 h-4 bg-blue-500 rounded-full mr-2"></div>
          Company Information
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white p-3 border border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Company Name*</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="e.g. Acme Corporation"
              className={`w-full px-3 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.companyName ? "border-red-500" : "border-gray-300"
              }`}
            />
            {formErrors.companyName && (
              <p className="mt-1 text-sm text-red-600">{formErrors.companyName}</p>
            )}
          </div>
          <div className="bg-white p-3 border border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Website</label>
            <input
              type="text"
              name="companyWebsite"
              value={formData.companyWebsite}
              onChange={handleChange}
              placeholder="e.g. https://company.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Eligibility Criteria */}
      <div className="bg-gray-50/50 p-3 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <div className="w-1 h-4 bg-green-500 rounded-full mr-2"></div>
          Eligibility Criteria
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Course/Degree*</label>
              <select
                name="course"
                value={formData.course}
                onChange={(e) => {
                  setHasUnsavedChanges(true);
                  setFormData({ ...formData, course: e.target.value, specialization: [] });
                }}
                className={`w-full px-3 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${
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
              {formErrors.course && (
                <p className="mt-1 text-sm text-red-600">{formErrors.course}</p>
              )}
            </div>
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Passing Year*</label>
              <select
                name="passingYear"
                value={formData.passingYear}
                onChange={handleChange}
                className={`w-full px-3 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${
                  formErrors.passingYear ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select Year</option>
                {[2022,2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032,2034].map((yr) => (
                  <option key={yr}>{yr}</option>
                ))}
              </select>
              {formErrors.passingYear && (
                <p className="mt-1 text-sm text-red-600">{formErrors.passingYear}</p>
              )}
            </div>
          </div>
          <div className="bg-white p-3 border border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Specialization(s)*</label>
            <div className={`p-2 border bg-gray-50 ${
              formErrors.specialization ? "border-red-500" : "border-gray-300"
            }`}>
              {formData.course ? (
                <div className="flex flex-wrap gap-3">
                  {specializationOptions[formData.course]?.map((spec) => (
                    <div key={spec} className="flex items-center">
                      <input
                        type="checkbox"
                        id={spec}
                        value={spec}
                        checked={formData.specialization.includes(spec)}
                        onChange={handleSpecializationChange}
                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor={spec} className="ml-2 text-xs text-gray-700">
                        {spec}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-xs">Select a course first</p>
              )}
            </div>
            {formErrors.specialization && (
              <p className="mt-1 text-sm text-red-600">{formErrors.specialization}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Gender*</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full px-3 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${
                  formErrors.gender ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Male/Female</option>
              </select>
              {formErrors.gender && (
                <p className="mt-1 text-sm text-red-600">{formErrors.gender}</p>
              )}
            </div>
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Marks Criteria*</label>
              <select
                name="marksCriteria"
                value={formData.marksCriteria}
                onChange={handleChange}
                className={`w-full px-3 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${
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
              {formErrors.marksCriteria && (
                <p className="mt-1 text-sm text-red-600">{formErrors.marksCriteria}</p>
              )}
            </div>
          </div>
          <div className="bg-white p-3 border border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Backlog Criteria</label>
            <select
              name="backlogCriteria"
              value={formData.backlogCriteria}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select Criteria</option>
              <option>No Criteria</option>
              <option>No Active Backlog</option>
              <option>No History of Backlog</option>
            </select>
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="bg-gray-50/50 p-3 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <div className="w-1 h-4 bg-purple-500 rounded-full mr-2"></div>
          Job Details
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Job Type*</label>
              <select
                name="jobType"
                value={formData.jobType}
                onChange={handleChange}
                className={`w-full px-3 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${
                  formErrors.jobType ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select Type</option>
                <option>Internship</option>
                <option>Int + PPO</option>
                <option>Full Time</option>
                <option>Training + FT</option>
              </select>
              {formErrors.jobType && (
                <p className="mt-1 text-sm text-red-600">{formErrors.jobType}</p>
              )}
            </div>
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Job Designation</label>
              <input
                type="text"
                name="jobDesignation"
                value={formData.jobDesignation}
                onChange={handleChange}
                placeholder="e.g. Software Engineer"
                className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Job Location</label>
              <input
                type="text"
                name="jobLocation"
                value={formData.jobLocation}
                onChange={handleChange}
                placeholder="e.g. Bangalore"
                className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Mode of Work</label>
              <select
                name="modeOfWork"
                value={formData.modeOfWork}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Select Mode</option>
                <option>Work From Office</option>
                <option>Work From Home</option>
                <option>Hybrid</option>
              </select>
            </div>
          </div>

          {/* Compensation Fields - Dynamic based on Job Type */}
          {(formData.jobType === "Internship" || formData.jobType === "Int + PPO" || formData.jobType === "Training + FT") && (
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Stipend (per month)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">₹</span>
                </div>
                <input
                  type="text"
                  name="stipend"
                  value={formData.stipend || ''}
                  onChange={handleChange}
                  placeholder="e.g. 25000"
                  className="w-full pl-8 px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {formData.stipend && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-xs text-gray-500">({formatStipend(formData.stipend)})</span>
                  </div>
                )}
              </div>
              {validationErrors.stipend && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.stipend}</p>
              )}
            </div>
          )}



          {formData.jobType !== "Internship" && (
            <div className="bg-white p-3 border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Fixed Salary (CTC)*</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">₹</span>
                    </div>
                    <input
                      type="text"
                      name="fixedSalary"
                      value={formData.fixedSalary || ''}
                      onChange={handleChange}
                      placeholder="e.g. 400000"
                      className="w-full pl-8 px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {formData.fixedSalary && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-xs text-gray-500">({formatSalary(formData.fixedSalary)})</span>
                      </div>
                    )}
                  </div>
                  {validationErrors.fixedSalary && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.fixedSalary}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Variable Salary (CTC)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">₹</span>
                    </div>
                    <input
                      type="text"
                      name="variableSalary"
                      value={formData.variableSalary || ''}
                      onChange={handleChange}
                      placeholder="e.g. 100000"
                      className="w-full pl-8 px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {formData.variableSalary && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-xs text-gray-500">({formatSalary(formData.variableSalary)})</span>
                      </div>
                    )}
                  </div>
                  {validationErrors.variableSalary && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.variableSalary}</p>
                  )}
                </div>
              </div>
              {(formData.fixedSalary || formData.variableSalary) && (
                <div className="mt-2 text-sm text-gray-600">
                  Total CTC: ₹{formatSalary((parseFloat(formData.fixedSalary) || 0) + (parseFloat(formData.variableSalary) || 0))}
                </div>
              )}
            </div>
          )}



          {/* Hiring Rounds */}
          <div className="bg-white p-3 border border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Hiring Rounds</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                'Resume Screening',
                'GD (Group Discussion)',
                'CR (Coding Round)',
                'TI (Technical Interview)',
                'HR Round',
                'PI (Personal Interview)'
              ].map((round) => (
                <div key={round} className="flex items-center">
                  <input
                    type="checkbox"
                    id={round}
                    value={round}
                    checked={formData.hiringRounds?.includes(round) || false}
                    onChange={handleHiringRoundsChange}
                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor={round} className="ml-2 text-xs text-gray-700">
                    {round}
                  </label>
                </div>
              ))}

              {/* Others option */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="others"
                  value="Others"
                  checked={formData.hiringRounds?.includes('Others') || false}
                  onChange={handleHiringRoundsChange}
                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="others" className="ml-2 text-xs text-gray-700">
                  Others
                </label>
              </div>
            </div>

            {/* Other Round Input */}
            {formData.hiringRounds?.includes('Others') && (
              <div className="mt-3">
                <input
                  type="text"
                  value={otherRound}
                  onChange={handleOtherRoundChange}
                  placeholder="e.g. Aptitude Test, Case Study, etc."
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Additional fields */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Mode of Interview</label>
              <select
                name="modeOfInterview"
                value={formData.modeOfInterview}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Select Mode</option>
                <option>Online</option>
                <option>Offline</option>
                <option>Hybrid</option>
              </select>
            </div>
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Joining Period</label>
              <input
                type="text"
                name="joiningPeriod"
                value={formData.joiningPeriod}
                onChange={handleChange}
                placeholder="e.g. Immediate/15 days"
                className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Company Open Date*</label>
              <input
                type="date"
                name="companyOpenDate"
                value={formData.companyOpenDate}
                onChange={handleChange}
                className={`w-full px-3 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.companyOpenDate ? "border-red-500" : "border-gray-300"
                }`}
              />
              {formErrors.companyOpenDate && (
                <p className="mt-1 text-sm text-red-600">{formErrors.companyOpenDate}</p>
              )}
            </div>
          </div>

          {formData.jobType === "Internship" || formData.jobType === "Int + PPO" || formData.jobType === "Training + FT" ? (
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Internship Duration</label>
              <input
                type="text"
                name="internshipDuration"
                value={formData.internshipDuration}
                onChange={handleChange}
                placeholder="e.g. 6 months"
                className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          ) : null}

          <div className="bg-white p-3 border border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Job Description</label>
            <textarea
              name="jobDescription"
              value={formData.jobDescription}
              onChange={handleChange}
              rows={3}
              placeholder="Enter job description details..."
              className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="bg-white p-3 border border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Upload Job Files (JD, PPT, etc.)</label>
            <input
              type="file"
              multiple
              onChange={(e) => {
                setHasUnsavedChanges(true);
                handleFileChange(e);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {jobFiles && jobFiles.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-600 mb-2">Selected files:</p>
                <div className="space-y-1">
                  {Array.from(jobFiles).map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-xs">
                      <span className="text-gray-700 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedFiles = Array.from(jobFiles).filter((_, i) => i !== index);
                          setJobFiles(updatedFiles);
                        }}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>      {/* Internal Use Only */}
      <div className="bg-gray-50/50 p-3 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <div className="w-1 h-4 bg-orange-500 rounded-full mr-2"></div>
          Internal Use Only
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Source*</label>
              <input
                type="text"
                name="source"
                value={formData.source}
                onChange={handleChange}
                placeholder="e.g. LinkedIn, Referral, etc."
                className={`w-full px-3 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.source ? "border-red-500" : "border-gray-300"
                }`}
              />
              {formErrors.source && (
                <p className="mt-1 text-sm text-red-600">{formErrors.source}</p>
              )}
            </div>
            <div className="bg-white p-3 border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Coordinator*</label>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-2 border border-gray-300 bg-gray-100">
                  <span className="text-gray-500 text-sm">Loading coordinators...</span>
                </div>
              ) : (
                <select
                  name="coordinator"
                  value={formData.coordinator}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${
                    formErrors.coordinator ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Select Coordinator</option>
                  {placementUsers.map((user) => (
                    <option key={user.id} value={user.name}>
                      {user.name}
                    </option>
                  ))}
                </select>
              )}
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
        </div>
      </div>

      {/* Cancel Button */}
      <div className="flex justify-end pt-3">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default AddJDForm;