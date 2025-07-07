<<<<<<< HEAD
import React, { useState } from "react";
import JDForm from "./JDForm"; // ✅ Ensure the path is correct
import MyButton from "./MyButton"; // ✅ Optional button component

function PlacementTeamTrainingList() {
  const [showJDForm, setShowJDForm] = useState(false);
=======
import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import TrainingDetailModal from "../Learning/TrainingDetailModal";
import StudentDataModal from "../Learning/StudentDataModal";
import MOUFileModal from "../Learning/MOUFileModal";
import { FiEye, FiUsers, FiFileText, FiChevronDown, FiSearch } from "react-icons/fi";
import { motion } from "framer-motion";

function PlacementTeamTrainingList() {
  const [trainingData, setTrainingData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showMouModal, setShowMouModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "trainingForms"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrainingData(data);
      setFilteredData(data);
    };
    fetchData();
  }, []);
>>>>>>> 9f18ea34a00f347f8039acb8c1133a4e6503c288

  useEffect(() => {
    const results = trainingData.filter(training =>
      Object.values(training).some(
        value => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    setFilteredData(results);
  }, [searchTerm, trainingData]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return (
      <span className="ml-1">
        {sortConfig.direction === 'ascending' ? '↑' : '↓'}
      </span>
    );
  };

  return (
<<<<<<< HEAD
    <div className="p-6">
      {/* Header and Add JD Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-800">
          Training & Closure Details (Placement View)
        </h2>
        <button
          onClick={() => setShowJDForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
        >
          + Add Job Description
        </button>
      </div>

      {/* Optional Button Demo */}
      <div className="mb-4">
        <MyButton />
      </div>

      {/* Sample Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Project Code</th>
              <th className="p-2 border">College</th>
              <th className="p-2 border">Course</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="odd:bg-white even:bg-gray-50">
              <td className="p-2 border">PRJ101</td>
              <td className="p-2 border">College A</td>
              <td className="p-2 border">MBA</td>
              <td className="p-2 border">---</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* JD Modal */}
      {showJDForm && (
        <JDForm show={showJDForm} onClose={() => setShowJDForm(false)} />
      )}
=======
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Training Programs</h1>
            <p className="text-gray-600 mt-1">Manage all training programs and associated documents</p>
          </div>
          <div className="mt-4 md:mt-0 relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search trainings..."
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div 
            whileHover={{ y: -2 }}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
          >
            <p className="text-sm text-gray-500">Total Trainings</p>
            <p className="text-2xl font-semibold text-gray-800">{trainingData.length}</p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -2 }}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
          >
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-semibold text-blue-600">{trainingData.filter(t => t.status === 'active').length}</p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -2 }}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
          >
            <p className="text-sm text-gray-500">Students</p>
            <p className="text-2xl font-semibold text-gray-800">
              {trainingData.reduce((sum, t) => sum + (parseInt(t.studentCount) || 0, 0))}
            </p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -2 }}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
          >
            <p className="text-sm text-gray-500">Total Value</p>
            <p className="text-2xl font-semibold text-green-600">
              ₹{trainingData.reduce((sum, t) => sum + (parseInt(t.totalCost) || 0), 0)}
            </p>
          </motion.div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('projectCode')}
                  >
                    <div className="flex items-center">
                      Project Code
                      {getSortIndicator('projectCode')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('collegeName')}
                  >
                    <div className="flex items-center">
                      College
                      {getSortIndicator('collegeName')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('course')}
                  >
                    <div className="flex items-center">
                      Course
                      {getSortIndicator('course')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('year')}
                  >
                    <div className="flex items-center">
                      Year
                      {getSortIndicator('year')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('totalCost')}
                  >
                    <div className="flex items-center">
                      Amount
                      {getSortIndicator('totalCost')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.length > 0 ? (
                  sortedData.map((training) => (
                    <tr key={training.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                          {training.projectCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {training.collegeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {training.course}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {training.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          training.deliveryType === 'Online' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {training.deliveryType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {training.studentCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{training.totalCost}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedTraining(training)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          aria-label="View details"
                        >
                          <FiEye className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowStudentModal(training)}
                          disabled={!training.studentFileUrl}
                          className={`p-2 rounded-lg ${training.studentFileUrl ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} transition-colors`}
                          aria-label="View student data"
                        >
                          <FiUsers className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowMouModal(training)}
                          disabled={!training.mouFileUrl}
                          className={`p-2 rounded-lg ${training.mouFileUrl ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} transition-colors`}
                          aria-label="View MOU"
                        >
                          <FiFileText className="w-4 h-4" />
                        </motion.button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                      {searchTerm ? 'No matching trainings found' : 'Loading trainings...'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination would go here */}

        {/* Modals */}
        {selectedTraining && (
          <TrainingDetailModal
            training={selectedTraining}
            onClose={() => setSelectedTraining(null)}
          />
        )}

        {showStudentModal && (
          <StudentDataModal
            fileUrl={showStudentModal.studentFileUrl}
            onClose={() => setShowStudentModal(false)}
          />
        )}

        {showMouModal && (
          <MOUFileModal
            fileUrl={showMouModal.mouFileUrl}
            onClose={() => setShowMouModal(false)}
          />
        )}
      </div>
>>>>>>> 9f18ea34a00f347f8039acb8c1133a4e6503c288
    </div>
  );
}

export default PlacementTeamTrainingList;