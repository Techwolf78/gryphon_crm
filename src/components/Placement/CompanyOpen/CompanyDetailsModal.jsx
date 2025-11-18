import React, { useState,  } from "react";
import { XIcon } from "@heroicons/react/outline";
import StudentDataView from './StudentDataView';
import { db } from '../../../firebase';
import { collection, getDocs, } from 'firebase/firestore';

function CompanyDetails({ company, onClose }) {
  const [showStudentData, setShowStudentData] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Fetch students from Firebase
  const fetchStudents = async () => {
    if (!company?.companyName) return;
    
    setLoadingStudents(true);
    try {
      const companyCode = company.companyName.replace(/\s+/g, '_').toUpperCase();
      const uploadsCollectionRef = collection(db, 'studentList', companyCode, 'uploads');
      
      // Get all uploads for this company
      const querySnapshot = await getDocs(uploadsCollectionRef);
      
      const allStudents = [];
      querySnapshot.forEach((doc) => {
        const uploadData = doc.data();
        if (uploadData.students && Array.isArray(uploadData.students)) {
          // Add upload metadata to each student
          const studentsWithMeta = uploadData.students.map(student => ({
            ...student,
            uploadedAt: uploadData.uploadedAt,
            college: uploadData.college
          }));
          allStudents.push(...studentsWithMeta);
        }
      });
      
      setStudents(allStudents);
      console.log(`✅ Fetched ${allStudents.length} students for ${company.companyName}`);
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      alert('Error fetching student data: ' + error.message);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Filter students by college if needed
  const getFilteredStudents = () => {
    if (!company?.college) return students;
    
    return students.filter(student => 
      student.college === company.college
    );
  };

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
          {/* Company Information */}
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

          {/* Rest of your company details... */}
          {/* Eligibility Criteria */}
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

          {/* Job Details */}
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
            </div>
          </div>

        
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-between">
        

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
          >
            Close
          </button>
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