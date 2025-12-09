import React from "react";

const TemplateInformationCard = ({ templateFields, fieldLabels }) => {
  return (
    <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          Template Information
        </h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            templateFields.length > 0
              ? "bg-purple-100 text-purple-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {templateFields.length > 0 ? "Custom Template" : "Standard Template"}
        </span>
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
        {templateFields.length > 0 ? (
          <div>
            <p className="text-gray-700 mb-4">
              Your custom template includes{" "}
              <strong>{templateFields.length} specific columns</strong> as
              requested:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {templateFields.map((field, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                >
                  <div className="text-xs text-gray-500 mb-1">
                    Column {index + 1}
                  </div>
                  <div
                    className="font-medium text-sm truncate"
                    title={fieldLabels[field] || field}
                  >
                    {fieldLabels[field] || field}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-700 mb-4">
              The template includes all necessary columns for student data
              submission:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-700 mb-2">
                  Basic Information
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Student Name</li>
                  <li>• Email</li>
                  <li>• Phone Number</li>
                  <li>• Gender</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-700 mb-2">
                  Academic Details
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 10th Details</li>
                  <li>• 12th Details</li>
                  <li>• Course Specific Fields</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-700 mb-2">
                  Additional Information
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Category</li>
                  <li>• Date of Birth</li>
                  <li>• Special Fields</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateInformationCard;
