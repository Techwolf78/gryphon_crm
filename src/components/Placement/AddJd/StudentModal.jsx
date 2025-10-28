import React from 'react';
import { XIcon, AcademicCapIcon } from '@heroicons/react/outline'; // XIcon ko import karo

function StudentModal({ viewingCollege, studentsData, isLoadingStudents, closeStudentView }) {
  if (!viewingCollege) return null;

  const students = studentsData[viewingCollege] || [];

  return (
    <div className="fixed inset-0 z-60 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Students at {viewingCollege}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Total Students: {students.length}
            </p>
          </div>
          <button
            onClick={closeStudentView}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <XIcon className="h-5 w-5" /> {/* Ab XIcon defined hai */}
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          {isLoadingStudents ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading students...</span>
            </div>
          ) : (
            <>
              {students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Specialization
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Course
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Passing Year
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student['FULL NAME OF STUDENT'] || student.accountName || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {student['EMAIL ID'] || student.accountEmail || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {student['MOBILE NO.'] || student.accountPhone || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {student.SPECIALIZATION || student.specialization || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {student.COURSE || student.course || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {student['PASSING YEAR'] || student.passingYear || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <AcademicCapIcon className="h-16 w-16 mx-auto" />
                  </div>
                  <p className="text-gray-500 text-lg">
                    No student data found for {viewingCollege}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    This college might not have any students uploaded yet.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Showing {students.length} students
          </span>
          <button
            onClick={closeStudentView}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudentModal;