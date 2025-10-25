import React, { useState } from "react";
import { XIcon } from "@heroicons/react/outline";
import StudentDataView from '../StudentListModal';

function CompanyDetails({ company, onClose, fetchStudents, students, loadingStudents }) {
  const [showStudentData, setShowStudentData] = useState(false);
  return (
    <div className="fixed inset-0 flex items-center justify-center z-54">
      <div className="fixed inset-0 bg-opacity-50 backdrop-blur" onClick={onClose}></div>

      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto z-50">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 flex justify-between items-center sticky top-0">
          <h2 className="text-lg font-semibold">Company Details</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-blue-700 transition">
            <XIcon className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Company Name</label>
                <p className="mt-1 text-gray-900">{company.companyName || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Website</label>
                <p className="mt-1 text-gray-900">{company.companyWebsite || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">College</label>
                <p className="mt-1 text-gray-900">{company.college || "-"}</p>
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Eligibility Criteria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Course</label>
                <p className="mt-1 text-gray-900">{company.course || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Specialization</label>
                <p className="mt-1 text-gray-900">{company.specialization || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Passing Year</label>
                <p className="mt-1 text-gray-900">{company.passingYear || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Marks Criteria</label>
                <p className="mt-1 text-gray-900">{company.marksCriteria || "-"}</p>
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Job Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Job Type</label>
                <p className="mt-1 text-gray-900">{company.jobType || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Designation</label>
                <p className="mt-1 text-gray-900">{company.jobDesignation || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Location</label>
                <p className="mt-1 text-gray-900">{company.jobLocation || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Salary</label>
                <p className="mt-1 text-gray-900">{company.salary ? `${company.salary} LPA` : "-"}</p>
              </div>
              {company.internshipDuration && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Internship Duration</label>
                  <p className="mt-1 text-gray-900">{company.internshipDuration} months</p>
                </div>
              )}
              {company.stipend && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Stipend</label>
                  <p className="mt-1 text-gray-900">₹{company.stipend} per month</p>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Other Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Mode of Interview</label>
                <p className="mt-1 text-gray-900">{company.modeOfInterview || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Joining Period</label>
                <p className="mt-1 text-gray-900">{company.joiningPeriod || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Mode of Work</label>
                <p className="mt-1 text-gray-900">{company.modeOfWork || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <p className="mt-1 text-gray-900 capitalize">{company.status || "-"}</p>
              </div>
            </div>
          </div>

          {company.jobDescription && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-500">Job Description</label>
              <p className="mt-1 whitespace-pre-line text-gray-900">{company.jobDescription}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-between">
          <button
            onClick={() => {
              fetchStudents();
              setShowStudentData(true);
            }}
            disabled={loadingStudents}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition ${
              loadingStudents ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loadingStudents ? "Loading..." : "View Student Data"}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
        {showStudentData && students.length > 0 && (
          <StudentDataView
            students={students}
            onClose={() => setShowStudentData(false)}
          />
        )}
      </div>
    </div>
  );
}

export default CompanyDetails;