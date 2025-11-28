import React, { useState,  } from "react";
import { XIcon } from "@heroicons/react/outline";
import StudentDataView from './StudentDataView';
import { formatSalary } from "../../../utils/salaryUtils";

function CompanyDetails({ company, onClose }) {
  const [showStudentData, setShowStudentData] = useState(false);
  const students = [];

  // Filter students by college if needed
  const getFilteredStudents = () => {
    if (!company?.college) return students;
    
    return students.filter(student => 
      student.college === company.college
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-54">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-white shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto z-50 mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-3 py-2 flex justify-between items-center z-10">
          <h2 className="text-base font-semibold text-gray-900">Company Details</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
          >
            <XIcon className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="p-3 space-y-3">
          {/* Company Information */}
          <div className="bg-gray-50/50 p-2 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <div className="w-1 h-4 bg-blue-500 rounded-full mr-2"></div>
              Company Information
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="bg-white p-2 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Company Name</label>
                <p className="text-gray-900 font-medium text-sm">{company.companyName || "—"}</p>
              </div>
              <div className="bg-white p-2 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Website</label>
                <p className="text-gray-900 font-medium text-sm">{company.companyWebsite || "—"}</p>
              </div>
              <div className="bg-white p-2 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">College</label>
                <p className="text-gray-900 font-medium text-sm">{company.college || "—"}</p>
              </div>
            </div>
          </div>

          {/* Eligibility Criteria */}
          <div className="bg-gray-50/50 p-2 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <div className="w-1 h-4 bg-green-500 rounded-full mr-2"></div>
              Eligibility Criteria
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 border border-gray-100">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Course</label>
                  <p className="text-gray-900 font-medium text-sm">{company.course || "—"}</p>
                </div>
                <div className="bg-white p-2 border border-gray-100">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Passing Year</label>
                  <p className="text-gray-900 font-medium text-sm">{company.passingYear || "—"}</p>
                </div>
              </div>
              <div className="bg-white p-2 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Specialization</label>
                <p className="text-gray-900 font-medium text-sm">{company.specialization || "—"}</p>
              </div>
              <div className="bg-white p-2 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Marks Criteria</label>
                <p className="text-gray-900 font-medium text-sm">{company.marksCriteria || "—"}</p>
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="bg-gray-50/50 p-2 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <div className="w-1 h-4 bg-purple-500 rounded-full mr-2"></div>
              Job Details
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 border border-gray-100">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Job Type</label>
                  <p className="text-gray-900 font-medium text-sm">{company.jobType || "—"}</p>
                </div>
                <div className="bg-white p-2 border border-gray-100">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Location</label>
                  <p className="text-gray-900 font-medium text-sm">{company.jobLocation || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 border border-gray-100">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Designation</label>
                  <p className="text-gray-900 font-medium text-sm">{company.jobDesignation || "—"}</p>
                </div>
                <div className="bg-white p-2 border border-gray-100">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Salary</label>
                  <p className="text-gray-900 font-medium text-sm">{company.salary ? formatSalary(company.salary) : "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50/80 px-3 py-2 border-t border-gray-100">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white text-gray-700 border border-gray-200 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Student Data Modal */}
        {showStudentData && (
          <StudentDataView
            students={getFilteredStudents()}
            onClose={() => setShowStudentData(false)}
            companyName={company.companyName}
            collegeName={company.college}
          />
        )}
      </div>
    </div>
  );
}

export default CompanyDetails;