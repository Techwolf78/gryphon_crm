import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { FiDownload, FiLoader } from 'react-icons/fi';
import { toast } from 'react-toastify';

const ExportProjectCode = () => {
  const [projectCodes, setProjectCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchProjectCodes();
  }, []);

  const fetchProjectCodes = async () => {
    setLoading(true);
    try {
      // Fetch from trainingForms collection
      const trainingFormsRef = collection(db, 'trainingForms');
      const trainingFormsSnapshot = await getDocs(trainingFormsRef);
      
      const codes = [];
      trainingFormsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.projectCode) {
          codes.push({
            name: data.collegeName || '',
            collegeCode: data.collegeCode || '',
            course: data.course || '',
            year: data.year || '',
            trainingType: data.deliveryType || '',
            passingYear: data.passingYear || '',
            projectCode: data.projectCode,
            source: 'Sales/Training',
            createdAt: data.createdAt?.toDate?.()?.toISOString() || ''
          });
        }
      });

      // You can add more sources here, like from learning collections
      // For now, just trainingForms

      setProjectCodes(codes);
    } catch (error) {
      console.error('Error fetching project codes:', error);
      toast.error('Failed to fetch project codes');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = ['S.No', 'Name', 'College Code', 'Course', 'Year', 'Training Type', 'Passing Year', 'Project Code'];
      const csvContent = [
        headers.join(','),
        ...projectCodes.map((code, index) => [
          index + 1,
          `"${code.name}"`,
          `"${code.collegeCode}"`,
          `"${code.course}"`,
          `"${code.year}"`,
          `"${code.trainingType}"`,
          `"${code.passingYear}"`,
          `"${code.projectCode}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'project_codes_export.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Project codes exported successfully!');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export project codes');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Export Project Codes</h1>
            <button
              onClick={exportToCSV}
              disabled={loading || exporting || projectCodes.length === 0}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? <FiLoader className="animate-spin" /> : <FiDownload />}
              {exporting ? 'Exporting...' : 'Export to CSV'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <FiLoader className="animate-spin text-2xl text-blue-600" />
              <span className="ml-2 text-gray-600">Loading project codes...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">S.No</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">College Code</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Course</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Year</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Training Type</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Passing Year</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Project Code</th>
                  </tr>
                </thead>
                <tbody>
                  {projectCodes.map((code, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                      <td className="border border-gray-300 px-4 py-2">{code.name}</td>
                      <td className="border border-gray-300 px-4 py-2">{code.collegeCode}</td>
                      <td className="border border-gray-300 px-4 py-2">{code.course}</td>
                      <td className="border border-gray-300 px-4 py-2">{code.year}</td>
                      <td className="border border-gray-300 px-4 py-2">{code.trainingType}</td>
                      <td className="border border-gray-300 px-4 py-2">{code.passingYear}</td>
                      <td className="border border-gray-300 px-4 py-2">{code.projectCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {projectCodes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No project codes found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportProjectCode;