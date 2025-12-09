import React from "react";

const EligibilityCriteriaCard = ({
  course,
  genderEligibility,
  marksCriteria,
  backlogCriteria,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Eligibility Criteria
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Course - Always show */}
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Course</p>
          <p className="font-semibold">{course || "Not specified"}</p>
        </div>

        {/* Gender Eligibility - Only show if exists */}
        {genderEligibility && (
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Gender Eligibility</p>
            <p className="font-semibold">{genderEligibility}</p>
          </div>
        )}

        {/* Marks Criteria - Only show if exists */}
        {marksCriteria && (
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Marks Criteria</p>
            <p className="font-semibold">{marksCriteria}</p>
          </div>
        )}

        {/* Backlog Criteria - Only show if exists */}
        {backlogCriteria && (
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Backlog Criteria</p>
            <p className="font-semibold">{backlogCriteria}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EligibilityCriteriaCard;
