import React, { useState, useEffect, useCallback } from 'react';
import { XIcon } from "@heroicons/react/outline";

// Dummy data for demonstration
const dummyData = [
  {
    id: '1',
    studentName: 'Rahul Sharma',
    college: 'IIT Delhi',
    companyName: 'Google',
    jobDesignation: 'Software Engineer',
    salary: '28',
    placedDate: { seconds: Date.now() / 1000 - 86400 * 30 }, // 30 days ago
    course: 'B.Tech Computer Science',
    specialization: 'Machine Learning'
  },
  {
    id: '2',
    studentName: 'Priya Patel',
    college: 'IIT Bombay',
    companyName: 'Microsoft',
    jobDesignation: 'Product Manager',
    salary: '32',
    placedDate: { seconds: Date.now() / 1000 - 86400 * 15 }, // 15 days ago
    course: 'B.Tech Information Technology',
    specialization: 'Data Science'
  },
  {
    id: '3',
    studentName: 'Amit Kumar',
    college: 'IIT Delhi',
    companyName: 'Amazon',
    jobDesignation: 'System Engineer',
    salary: '24',
    placedDate: { seconds: Date.now() / 1000 - 86400 * 7 }, // 7 days ago
    course: 'B.Tech Computer Science',
    specialization: 'Cyber Security'
  },
  {
    id: '4',
    studentName: 'Sneha Reddy',
    college: 'IIT Madras',
    companyName: 'Adobe',
    jobDesignation: 'UI/UX Designer',
    salary: '18',
    placedDate: { seconds: Date.now() / 1000 - 86400 * 45 }, // 45 days ago
    course: 'B.Des',
    specialization: 'Digital Design'
  },
  {
    id: '5',
    studentName: 'Vikram Singh',
    college: 'IIT Kanpur',
    companyName: 'Flipkart',
    jobDesignation: 'Data Analyst',
    salary: '16',
    placedDate: { seconds: Date.now() / 1000 - 86400 * 20 }, // 20 days ago
    course: 'B.Tech Computer Science',
    specialization: 'Data Analytics'
  },
  {
    id: '6',
    studentName: 'Kavita Jain',
    college: 'IIT Bombay',
    companyName: 'Goldman Sachs',
    jobDesignation: 'Business Analyst',
    salary: '22',
    placedDate: { seconds: Date.now() / 1000 - 86400 * 10 }, // 10 days ago
    course: 'B.Tech Information Technology',
    specialization: 'Finance'
  },
  {
    id: '7',
    studentName: 'Rohit Verma',
    college: 'IIT Delhi',
    companyName: 'Netflix',
    jobDesignation: 'DevOps Engineer',
    salary: '26',
    placedDate: { seconds: Date.now() / 1000 - 86400 * 25 }, // 25 days ago
    course: 'B.Tech Computer Science',
    specialization: 'Cloud Computing'
  },
  {
    id: '8',
    studentName: 'Anjali Gupta',
    college: 'IIT Madras',
    companyName: 'Tesla',
    jobDesignation: 'Software Engineer',
    salary: '30',
    placedDate: { seconds: Date.now() / 1000 - 86400 * 5 }, // 5 days ago
    course: 'B.Tech Electrical Engineering',
    specialization: 'Embedded Systems'
  }
];

const PlacedStudent = ({ show, onClose }) => {
  const [placedStudents, setPlacedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  const fetchPlacedStudents = useCallback(() => {
    setLoading(true);
    try {
      // For now, using dummy data instead of Firebase
      // Simulate API delay
      setTimeout(() => {
        setPlacedStudents(dummyData);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching placed students:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (show) {
      fetchPlacedStudents();
    }
  }, [show, fetchPlacedStudents]);

  const filteredStudents = placedStudents.filter(student => {
    const matchesSearch = !searchTerm ||
      student.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.college?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCompany = !selectedCompany || student.companyName === selectedCompany;

    return matchesSearch && matchesCompany;
  });

  const uniqueCompanies = [...new Set(placedStudents.map(student => student.companyName).filter(Boolean))];

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-54">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden z-54">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-blue-500 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Placed Students</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-blue-700 transition-colors duration-200"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Stats Section */}
        <div className="px-6 py-4 bg-linear-to-r from-blue-50 to-indigo-50 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{placedStudents.length}</div>
              <div className="text-sm text-gray-600">Total Placed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {placedStudents.length > 0 ? Math.round(placedStudents.reduce((sum, student) => sum + parseFloat(student.salary || 0), 0) / placedStudents.length) : 0}
              </div>
              <div className="text-sm text-gray-600">Avg Package (LPA)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{new Set(placedStudents.map(s => s.companyName)).size}</div>
              <div className="text-sm text-gray-600">Companies</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{new Set(placedStudents.map(s => s.college)).size}</div>
              <div className="text-sm text-gray-600">Colleges</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by student name, company, or college..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="md:w-64">
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">All Companies</option>
                {uniqueCompanies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading placed students...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No placed students found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedCompany ? 'Try adjusting your filters.' : 'Students will appear here once they are marked as placed.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-y-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salary
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Placed Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student, index) => (
                      <tr key={student.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-linear-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                              {student.studentName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                              <div className="text-sm text-gray-500">{student.college}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{student.companyName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{student.jobDesignation}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-blue-600">{student.salary} LPA</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {student.placedDate ? new Date(student.placedDate.seconds * 1000).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            }) : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse"></div>
                            Placed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {filteredStudents.length} of {placedStudents.length} placed students
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlacedStudent;
