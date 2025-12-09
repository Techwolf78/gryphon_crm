import React from "react";
import { InformationCircleIcon } from "@heroicons/react/outline";

const JobDetailsCard = ({
  company,
  companyWebsite,
  designation,
  jobType,
  jobLocation,
  fixedSalary,
  variableSalary,
  totalCTC,
  modeOfInterview,
  passingYear,
  jobDescription,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <InformationCircleIcon className="h-6 w-6 mr-2 text-blue-500" />
        Job & Company Details
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">
            Company Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Company Name</span>
              <span className="font-medium">
                {company || "Not specified"}
              </span>
            </div>

            {/* Only show if website exists */}
            {companyWebsite && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Website</span>
                <a
                  href={
                    companyWebsite.startsWith("http")
                      ? companyWebsite
                      : `https://${companyWebsite}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {companyWebsite
                    .replace("https://", "")
                    .replace("http://", "")}
                </a>
              </div>
            )}

            {/* Only show if designation exists */}
            {designation && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Designation</span>
                <span className="font-medium">{designation}</span>
              </div>
            )}

            {/* Only show if job type exists */}
            {jobType && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Job Type</span>
                <span className="font-medium">{jobType}</span>
              </div>
            )}

            {/* Only show if job location exists */}
            {jobLocation && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Job Location</span>
                <span className="font-medium">{jobLocation}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-700 mb-3">
            Compensation Details
          </h3>
          <div className="space-y-3">
            {/* Only show if fixed salary exists */}
            {fixedSalary && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Fixed Salary</span>
                <span className="font-medium text-green-600">
                  {fixedSalary}
                </span>
              </div>
            )}

            {/* Only show if variable salary exists */}
            {variableSalary && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Variable Salary</span>
                <span className="font-medium text-green-600">
                  {variableSalary}
                </span>
              </div>
            )}

            {/* Only show if total CTC exists */}
            {totalCTC && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Total CTC</span>
                <span className="font-bold text-green-700">{totalCTC}</span>
              </div>
            )}

            {/* Only show if interview mode exists */}
            {modeOfInterview && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Interview Mode</span>
                <span className="font-medium">{modeOfInterview}</span>
              </div>
            )}

            {/* Only show if passing year exists */}
            {passingYear && (
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Passing Year</span>
                <span className="font-medium">{passingYear}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Job Description - Only show if exists */}
      {jobDescription && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold text-gray-700 mb-3">
            Job Description
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700">{jobDescription}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetailsCard;
