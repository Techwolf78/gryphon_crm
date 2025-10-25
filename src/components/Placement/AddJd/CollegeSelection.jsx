import React from 'react';
import { EyeIcon } from '@heroicons/react/outline';

function CollegeSelection({
  formData,
  availableColleges,
  selectedColleges,
  setSelectedColleges,
  otherCollegesInput,
  setOtherCollegesInput,
  showOtherCollegesInput,
  setShowOtherCollegesInput,
  viewStudents
}) {
  const handleCollegeSelection = (college) => {
    if (college === "Other") {
      setShowOtherCollegesInput(!showOtherCollegesInput);
      if (showOtherCollegesInput) {
        setSelectedColleges(selectedColleges.filter(c => c !== "Other"));
      }
      return;
    }

    if (selectedColleges.includes(college)) {
      setSelectedColleges(selectedColleges.filter(c => c !== college));
    } else {
      setSelectedColleges([...selectedColleges, college]);
    }
  };

  const handleOtherCollegesChange = (e) => {
    setOtherCollegesInput(e.target.value);
    // Parse the input and update selected colleges
    const colleges = e.target.value
      .split(',')
      .map(college => college.trim())
      .filter(college => college.length > 0);

    // Remove previously added manual colleges
    const filteredSelected = selectedColleges.filter(college =>
      availableColleges.includes(college) || college === "Other"
    );

    setSelectedColleges([...filteredSelected, ...colleges]);
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Select colleges to send this JD to:</h3>
      <p className="text-sm text-gray-600">
        Showing colleges for {formData.course || "selected course"} with passing year {formData.passingYear || "selected year"}
      </p>

      {availableColleges.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
            {availableColleges.map((college) => (
              <div key={college} className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={college}
                    checked={selectedColleges.includes(college)}
                    onChange={() => handleCollegeSelection(college)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={college} className="ml-2 text-sm text-gray-700">
                    {college}
                  </label>
                </div>
                {college !== "Other" && (
                  <button
                    onClick={() => viewStudents(college)}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View Students
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Other Colleges Input */}
          {showOtherCollegesInput && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter other college names (separate with commas)
              </label>
              <textarea
                value={otherCollegesInput}
                onChange={handleOtherCollegesChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="e.g. ABC College, XYZ University"
              />
              <p className="text-sm text-gray-500 mt-1">
                {otherCollegesInput.split(',').filter(c => c.trim()).length} college(s) added
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-gray-500">
            No colleges found for {formData.course} course with passing year {formData.passingYear}.
          </p>
        </div>
      )}
    </div>
  );
}

export default CollegeSelection;