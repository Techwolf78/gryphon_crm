import React, { useState } from 'react';
import { XIcon, UploadIcon } from '@heroicons/react/outline';
import { db } from '../../../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';

const ExcelUploadModal = ({ show, onClose, college, companyName }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    validateExcelFile(file);
  };

  const validateExcelFile = (file) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          setValidationResults({
            isValid: false,
            errors: ['File is empty or has no data rows'],
            stats: { totalRows: 0, validRows: 0, invalidRows: 0 }
          });
          return;
        }

        const headers = jsonData[0];
        const dataRows = jsonData.slice(1);
        
        const errors = [];
        const stats = {
          totalRows: dataRows.length,
          validRows: 0,
          invalidRows: 0
        };

        // Convert to JSON for Firebase storage
        const jsonStudents = XLSX.utils.sheet_to_json(worksheet);

        // Validate each row
        dataRows.forEach((row, index) => {
          const rowErrors = [];
          
          // Check required fields
          if (!row[0] || row[0].toString().trim() === '') {
            rowErrors.push('Student Name is required');
          }
          if (!row[1] || row[1].toString().trim() === '') {
            rowErrors.push('Enrollment No is required');
          }
          if (!row[2] || !isValidEmail(row[2])) {
            rowErrors.push('Valid Email is required');
          }

          if (rowErrors.length === 0) {
            stats.validRows++;
          } else {
            stats.invalidRows++;
            errors.push(`Row ${index + 2}: ${rowErrors.join(', ')}`);
          }
        });

        setValidationResults({
          isValid: errors.length === 0,
          errors,
          stats,
          headers,
          jsonStudents
        });
      } catch (error) {
        console.error('Error processing file:', error);
        setValidationResults({
          isValid: false,
          errors: ['Error processing file. Please check the format.'],
          stats: { totalRows: 0, validRows: 0, invalidRows: 0 }
        });
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Firebase Save Function - FIXED TIMESTAMP ISSUE
  const handleSaveToFirebase = async () => {
    if (!college || !companyName || !validationResults?.jsonStudents?.length) {
      alert('Please upload valid data first');
      return;
    }

    setIsUploading(true);

    try {
      // College code generate karo
      const collegeCode = college.replace(/\s+/g, '_').toUpperCase();
      
      console.log('🔄 Starting Firebase save...');
      console.log('College:', college);
      console.log('Company:', companyName);
      console.log('Students count:', validationResults.jsonStudents.length);

      // Field names mapping - Capital to lowercase
      const fieldMapping = {
        'STUDENT NAME': 'studentName',
        'ENROLLMENT NUMBER': 'enrollmentNo', 
        'EMAIL': 'email',
        'PHONE NUMBER': 'phone',
        'COURSE': 'course',
        'SPECIALIZATION': 'specialization',
        'CURRENT YEAR': 'currentYear',
        '10TH MARKS %': 'tenthMarks',
        '12TH MARKS %': 'twelfthMarks',
        'CGPA': 'cgpa',
        'ACTIVE BACKLOGS': 'activeBacklogs',
        'GENDER': 'gender',
        'RESUME LINK': 'resumeLink'
      };

      // Process students data - WITHOUT serverTimestamp() in array
      const processedStudents = validationResults.jsonStudents.map((student, index) => {
        const processedStudent = {};
        
        // Convert field names
        Object.keys(student).forEach(key => {
          const newKey = fieldMapping[key] || key.toLowerCase();
          processedStudent[newKey] = student[key];
        });

        // Add metadata - WITHOUT serverTimestamp() in array
        return {
          ...processedStudent,
          company: companyName,
          college: college,
          uploadDate: new Date().toISOString(), // ✅ Regular Date object
          rowIndex: index + 1,
          status: 'submitted'
        };
      });

      // Single collection "studentList" mein save karo
      const collegeDocRef = doc(db, 'studentList', collegeCode);
      
      // 🔥 FIX: Array mein serverTimestamp() nahi, sirf top level pe
      const saveData = {
        collegeName: college,
        collegeCode: collegeCode,
        company: companyName,
        lastUpdated: serverTimestamp(), // ✅ Top level pe serverTimestamp allowed
        totalStudents: processedStudents.length,
        templateFields: validationResults.headers,
        students: processedStudents, // ✅ Array mein regular data only
        uploadedAt: serverTimestamp() // ✅ Top level timestamp
      };

      console.log('📦 Data to save:', saveData);
      
      await setDoc(collegeDocRef, saveData, { merge: true });

      console.log(`✅ ${processedStudents.length} students saved to studentList/${collegeCode}`);
      alert(`✅ ${processedStudents.length} students saved successfully!\nCollection: studentList/${collegeCode}`);
      
      // Reset and close
      setUploadedFile(null);
      setValidationResults(null);
      onClose();
      
    } catch (error) {
      console.error('❌ Detailed Error saving students:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      alert('❌ Error saving student data: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    await handleSaveToFirebase();
  };

if (!show) return null;

return (
  <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-500">
    {/* Z-index bahut high kiya */}
    <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl z-[10000] transform transition-all duration-300 scale-100">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center rounded-t-xl">
        <h2 className="text-xl font-semibold text-white">
          Upload Student Data - {college}
        </h2>
        <button 
          onClick={onClose} 
          className="text-white hover:text-gray-200 transition-colors"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

        {/* Content */}
        <div className="p-6">
          {/* College & Collection Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">📁 Storage Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">College:</span> {college}
              </div>
              <div>
                <span className="font-medium">Company:</span> {companyName}
              </div>
              <div className="col-span-2">
                <span className="font-medium">Collection:</span>{' '}
                <code className="bg-blue-100 px-2 py-1 rounded text-blue-800">
                  studentList/{college ? college.replace(/\s+/g, '_').toUpperCase() : 'N/A'}
                </code>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-upload"
            />
            <label htmlFor="excel-upload" className="cursor-pointer">
              <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">
                {uploadedFile ? uploadedFile.name : 'Click to upload Excel file'}
              </p>
              <p className="text-sm text-gray-500">
                Supports .xlsx, .xls, .csv files
              </p>
            </label>
          </div>

          {/* Validation Results */}
          {validationResults && (
            <div className={`p-4 rounded-lg mb-4 ${
              validationResults.isValid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <h4 className={`font-semibold mb-2 ${
                validationResults.isValid ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {validationResults.isValid ? '✅ File is Valid' : '⚠️ Validation Warnings'}
              </h4>
              
              <div className="text-sm mb-3">
                <p>Total Rows: {validationResults.stats?.totalRows || 0}</p>
                <p className="text-green-600">Valid Rows: {validationResults.stats?.validRows || 0}</p>
                {(validationResults.stats?.invalidRows || 0) > 0 && (
                  <p className="text-yellow-600">Rows with Warnings: {validationResults.stats?.invalidRows || 0}</p>
                )}
              </div>

              {!validationResults.isValid && validationResults.errors && (
                <div className="max-h-32 overflow-y-auto">
                  {validationResults.errors.slice(0, 5).map((error, index) => (
                    <p key={index} className="text-yellow-700 text-sm mb-1">• {error}</p>
                  ))}
                  {validationResults.errors.length > 5 && (
                    <p className="text-yellow-700 text-sm">... and {validationResults.errors.length - 5} more warnings</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Detected Columns */}
          {validationResults?.headers && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <h4 className="font-semibold text-blue-800 mb-2">
                Template Columns ({validationResults.headers.length}):
              </h4>
              <div className="flex flex-wrap gap-1">
                {validationResults.headers.map((header, index) => (
                  <span key={index} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    {header}
                  </span>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                ✅ These exact columns will be preserved in database
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!uploadedFile || !validationResults || isUploading}
            className={`px-6 py-2 rounded-lg text-sm text-white flex items-center ${
              !uploadedFile || !validationResults || isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <UploadIcon className="h-4 w-4 mr-2" />
            {isUploading ? 'Saving to Database...' : `Save ${validationResults?.jsonStudents?.length || 0} Students`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcelUploadModal;