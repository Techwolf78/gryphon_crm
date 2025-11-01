import React, { useState } from "react";
import {
  EyeIcon,
  MailIcon,
  CloudDownloadIcon,
  AcademicCapIcon,
  DocumentDownloadIcon,
  UploadIcon,
  CogIcon,
} from "@heroicons/react/outline";

function CollegeSelection({
  formData,
  availableColleges,
  selectedColleges,
  setSelectedColleges,
  otherCollegesInput,
  setOtherCollegesInput,
  showOtherCollegesInput,
  setShowOtherCollegesInput,
  manualEmails,
  handleEmailChange,
  getCollegeEmail,
  collegeDetails,
  selectedTemplateFields,
  onTemplateFieldsChange 
}) {
  const [isImporting, setIsImporting] = useState(false);
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);

  const fetchCollegeEmailsFromFirebase = async () => {
    setIsImporting(true);
    try {
      console.log("Emails imported successfully");
    } catch (error) {
      console.error("Error fetching emails:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCollegeSelection = (college) => {
    if (college === "Other") {
      setShowOtherCollegesInput(!showOtherCollegesInput);
      if (showOtherCollegesInput) {
        setSelectedColleges(selectedColleges.filter((c) => c !== "Other"));
      } else {
        setSelectedColleges([...selectedColleges, "Other"]);
      }
      return;
    }

    if (selectedColleges.includes(college)) {
      setSelectedColleges(selectedColleges.filter((c) => c !== college));
    } else {
      setSelectedColleges([...selectedColleges, college]);
    }
  };

  const handleOtherCollegesChange = (e) => {
    setOtherCollegesInput(e.target.value);

    const colleges = e.target.value
      .split(",")
      .map((college) => college.trim())
      .filter((college) => college.length > 0);

    const filteredSelected = selectedColleges.filter(
      (college) => availableColleges.includes(college) || college === "Other"
    );

    setSelectedColleges([...filteredSelected, ...colleges]);
  };

  const handleEmailInputChange = (college, email) => {
    handleEmailChange(college, email);
  };

  const importAllEmails = () => {
    fetchCollegeEmailsFromFirebase();
  };

  const getCollegeDisplayInfo = (college) => {
    if (college === "Other") return null;

    const details = collegeDetails[college];
    if (!details) return null;

    return {
      specializations: details.specializations || [],
      year: details.year || "N/A",
      passingYear: details.passingYear || "N/A",
      projectCode: details.projectCode || "N/A",
    };
  };

  // Template configuration functions
  const handleTemplateFieldToggle = (field) => {
    const requiredFields = ['studentName', 'enrollmentNo', 'email', 'course', 'specialization', 'currentYear'];
    
    // Required fields can't be removed
    if (requiredFields.includes(field)) return;
    
    onTemplateFieldsChange(prev => 
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const selectAllTemplateFields = () => {
    const allFields = [
      'studentName', 'enrollmentNo', 'email', 'phone', 'course', 'specialization', 
      'currentYear', 'tenthMarks', 'twelfthMarks', 'diplomaMarks', 'cgpa', 
      'activeBacklogs', 'totalBacklogs', 'gender', 'resumeLink'
    ];
    onTemplateFieldsChange(allFields);
  };

  const selectRequiredTemplateFields = () => {
    const requiredFields = ['studentName', 'enrollmentNo', 'email', 'course', 'specialization', 'currentYear'];
    onTemplateFieldsChange(requiredFields);
  };

  const fieldLabels = {
    'studentName': 'Student Name*',
    'enrollmentNo': 'Enrollment No*',
    'email': 'Email*',
    'phone': 'Phone',
    'course': 'Course*',
    'specialization': 'Specialization*',
    'currentYear': 'Current Year*',
    'tenthMarks': '10th Marks',
    'twelfthMarks': '12th Marks',
    'diplomaMarks': 'Diploma Marks',
    'cgpa': 'CGPA',
    'activeBacklogs': 'Active Backlogs',
    'totalBacklogs': 'Total Backlogs',
    'gender': 'Gender',
    'resumeLink': 'Resume Link'
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        Select colleges to send this JD to:
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Showing colleges for{" "}
        <span className="font-semibold">
          {formData.course || "selected course"}
        </span>{" "}
        with passing year{" "}
        <span className="font-semibold">
          {formData.passingYear || "selected year"}
        </span>{" "}
        and specializations:{" "}
        <span className="font-semibold">
          {formData.specialization.join(", ") || "selected specializations"}
        </span>
      </p>

      {/* Template Configuration Section */}
      <div className="bg-white border border-purple-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <CogIcon className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              📊 Excel Template Configuration
            </h3>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowTemplateConfig(!showTemplateConfig)}
              className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
            >
              {showTemplateConfig ? 'Hide Config' : 'Show Config'}
            </button>
            <button
              onClick={selectRequiredTemplateFields}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
            >
              Minimum
            </button>
            <button
              onClick={selectAllTemplateFields}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
            >
              All Fields
            </button>
          </div>
        </div>

        {showTemplateConfig && (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Select the data fields you want colleges to provide. Required fields (*) are mandatory.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              {Object.keys(fieldLabels).map(field => (
                <label key={field} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded border border-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedTemplateFields.includes(field)}
                    onChange={() => handleTemplateFieldToggle(field)}
                    disabled={fieldLabels[field].includes('*')}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${fieldLabels[field].includes('*') ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                    {fieldLabels[field]}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-700 text-sm">
            <strong>Selected {selectedTemplateFields.length} columns:</strong> {
              selectedTemplateFields.map(field => fieldLabels[field]).join(', ')
            }
          </p>
        </div>
      </div>

      {/* Filter Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <AcademicCapIcon className="h-4 w-4 mr-1 text-blue-600" />
              <span className="text-blue-700">
                Matched Colleges:{" "}
                {availableColleges.filter((c) => c !== "Other").length} found
              </span>
            </div>
            <div className="flex items-center">
              <CogIcon className="h-4 w-4 mr-1 text-purple-600" />
              <span className="text-purple-700">
                Template Columns: {selectedTemplateFields.length} selected
              </span>
            </div>
          </div>

          <button
            onClick={importAllEmails}
            disabled={
              isImporting ||
              selectedColleges.filter((c) => c !== "Other").length === 0
            }
            className={`flex items-center px-3 py-2 text-sm rounded-lg transition ${
              isImporting ||
              selectedColleges.filter((c) => c !== "Other").length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <CloudDownloadIcon className="h-4 w-4 mr-2" />
            {isImporting ? "Importing..." : "Refresh Emails"}
          </button>
        </div>
      </div>

      {availableColleges.length > 0 ? (
        <div className="space-y-4">
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
            {availableColleges.map((college) => {
              const collegeInfo = getCollegeDisplayInfo(college);

              return (
                <div
                  key={college}
                  className={`p-4 border-b border-gray-200 ${
                    selectedColleges.includes(college) ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={college}
                        checked={selectedColleges.includes(college)}
                        onChange={() => handleCollegeSelection(college)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={college}
                        className="ml-3 text-sm font-medium text-gray-700"
                      >
                        {college}
                        {collegeInfo && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({collegeInfo.year})
                          </span>
                        )}
                      </label>
                    </div>
                    {/* <div className="flex items-center space-x-2">
                      {college !== "Other" && (
                        <>
                          <button
                            onClick={() => onDownloadTemplate(college)}
                            className="text-green-600 hover:text-green-800 text-sm flex items-center"
                            title="Download Template"
                          >
                            <DocumentDownloadIcon className="h-4 w-4 mr-1" />
                            Template
                          </button>
                          <button
                            onClick={() => onUploadExcel(college)}
                            className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
                            title="Upload Excel"
                          >
                            <UploadIcon className="h-4 w-4 mr-1" />
                            Upload
                          </button>
                          <button
                            onClick={() => viewStudents(college)}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            Students
                          </button>
                        </>
                      )}
                    </div> */}
                  </div>

                  {/* College Details */}
                  {collegeInfo && (
                    <div className="ml-7 mb-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {collegeInfo.specializations.length > 0 && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                            Specializations:{" "}
                            {collegeInfo.specializations.join(", ")}
                          </span>
                        )}
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          Year: {collegeInfo.year}
                        </span>
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          Pass: {collegeInfo.passingYear}
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Project: {collegeInfo.projectCode}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Email Input */}
                  {selectedColleges.includes(college) &&
                    college !== "Other" && (
                      <div className="ml-7 mt-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          <MailIcon className="h-3 w-3 inline mr-1" />
                          College Email
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={getCollegeEmail(college) || ""}
                            onChange={(e) =>
                              handleEmailInputChange(college, e.target.value)
                            }
                            placeholder="Enter college email"
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          />
                          {!getCollegeEmail(college) && (
                            <span className="px-3 py-2 text-xs bg-yellow-100 text-yellow-800 rounded-lg">
                              Email Required
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>

          {/* Other Colleges Input */}
          {showOtherCollegesInput && (
            <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-orange-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter other college names and emails
              </label>
              <textarea
                value={otherCollegesInput}
                onChange={handleOtherCollegesChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition mb-3"
                placeholder="e.g. ABC College, XYZ University"
              />

              {/* Manual colleges ke emails */}
              {otherCollegesInput
                .split(",")
                .map((college) => college.trim())
                .filter((college) => college.length > 0)
                .map((college) => (
                  <div key={college} className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {college} - Email
                    </label>
                    <input
                      type="email"
                      value={manualEmails[college] || ""}
                      onChange={(e) =>
                        handleEmailInputChange(college, e.target.value)
                      }
                      placeholder={`Enter email for ${college}`}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                ))}

              <p className="text-sm text-gray-500">
                {otherCollegesInput.split(",").filter((c) => c.trim()).length}{" "}
                college(s) added
              </p>
            </div>
          )}

          {/* Selected Colleges Summary */}
          {selectedColleges.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-2">
                Selected Colleges & Emails:
              </h4>
              <div className="space-y-2">
                {selectedColleges
                  .filter((college) => college !== "Other")
                  .map((college) => (
                    <div
                      key={college}
                      className="flex justify-between items-center text-sm"
                    >
                      <div className="flex items-center">
                        <span className="text-gray-700">{college}</span>
                        {collegeDetails[college]?.specializations && (
                          <span className="ml-2 text-xs text-gray-500">
                            (
                            {collegeDetails[college].specializations.join(", ")}
                            )
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-medium ${
                          getCollegeEmail(college)
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {getCollegeEmail(college) || "No email provided"}
                      </span>
                    </div>
                  ))}
              </div>
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="text-xs text-green-700">
                  Total colleges with email:{" "}
                  {
                    selectedColleges.filter(
                      (college) =>
                        college !== "Other" && getCollegeEmail(college)
                    ).length
                  }
                  /
                  {
                    selectedColleges.filter((college) => college !== "Other")
                      .length
                  }
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  Template columns: {selectedTemplateFields.length} selected
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-gray-500">
            No colleges found for {formData.course} course with passing year{" "}
            {formData.passingYear} and specializations{" "}
            {formData.specialization.join(", ")}.
          </p>
          <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-orange-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter college names and emails manually
            </label>
            <textarea
              value={otherCollegesInput}
              onChange={handleOtherCollegesChange}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition mb-3"
              placeholder="e.g. ABC College, XYZ University"
            />

            {/* Manual colleges ke emails */}
            {otherCollegesInput
              .split(",")
              .map((college) => college.trim())
              .filter((college) => college.length > 0)
              .map((college) => (
                <div key={college} className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {college} - Email
                  </label>
                  <input
                    type="email"
                    value={manualEmails[college] || ""}
                    onChange={(e) =>
                      handleEmailInputChange(college, e.target.value)
                    }
                    placeholder={`Enter email for ${college}`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CollegeSelection;