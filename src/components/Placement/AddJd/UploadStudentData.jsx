import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DocumentDownloadIcon, UploadIcon, AcademicCapIcon, OfficeBuildingIcon } from '@heroicons/react/outline';
import ExcelUploadModal from './ExcelUploadModal';
import * as XLSX from 'xlsx';

const UploadStudentData = () => {
  const [searchParams] = useSearchParams();
  const [college, setCollege] = useState('');
  const [company, setCompany] = useState('');
  const [course, setCourse] = useState('');
  const [email, setEmail] = useState('');
  const [templateFields, setTemplateFields] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    const collegeParam = searchParams.get('college');
    const companyParam = searchParams.get('company');
    const courseParam = searchParams.get('course');
    const emailParam = searchParams.get('email');
    const fieldsParam = searchParams.get('fields');
    
    if (collegeParam) setCollege(decodeURIComponent(collegeParam));
    if (companyParam) setCompany(decodeURIComponent(companyParam));
    if (courseParam) setCourse(decodeURIComponent(courseParam));
    if (emailParam) setEmail(decodeURIComponent(emailParam));
    
    // ✅ Dynamic template fields from URL
    if (fieldsParam) {
      try {
        const fields = JSON.parse(decodeURIComponent(fieldsParam));
        setTemplateFields(fields);
      } catch (error) {
        console.error('Error parsing template fields:', error);
      }
    }
  }, [searchParams]);

  // Field labels mapping
  const fieldLabels = {
    'studentName': 'STUDENT NAME',
    'enrollmentNo': 'ENROLLMENT NUMBER',
    'email': 'EMAIL',
    'phone': 'PHONE NUMBER',
    'course': 'COURSE',
    'specialization': 'SPECIALIZATION',
    'currentYear': 'CURRENT YEAR',
    'tenthMarks': '10TH MARKS %',
    'twelfthMarks': '12TH MARKS %',
    'diplomaMarks': 'DIPLOMA MARKS %',
    'cgpa': 'CGPA',
    'activeBacklogs': 'ACTIVE BACKLOGS',
    'totalBacklogs': 'TOTAL BACKLOGS',
    'gender': 'GENDER',
    'resumeLink': 'RESUME LINK'
  };

  const downloadTemplate = () => {
    try {
      let templateData = [];
      
      // ✅ Agar template fields URL se mile to dynamic template banayo
      if (templateFields && templateFields.length > 0) {
        // Selected fields ke headers banayo
        const headers = templateFields.map(field => fieldLabels[field] || field.toUpperCase());
        templateData = [headers];
        
        console.log('Downloading dynamic template with fields:', templateFields);
        console.log('Headers:', headers);
      } 
      // ✅ Agar template fields nahi mile to course ke hisaab se default template
      else if (course?.includes('MBA') || course?.includes('PGDM')) {
        templateData = [
          ['STUDENT NAME', 'EMAIL', 'PHONE NUMBER', 'GENDER', 'DATE OF BIRTH', 'CATEGORY', 
           '10TH SCHOOL NAME', '10TH BOARD', '10TH PASSING YEAR', '10TH MARKS %',
           '12TH SCHOOL NAME', '12TH BOARD', '12TH PASSING YEAR', '12TH MARKS %', '12TH STREAM',
           'GRADUATION COURSE', 'GRADUATION SPECIALIZATION', 'GRADUATION COLLEGE', 'GRADUATION UNIVERSITY', 
           'GRADUATION PASSING YEAR', 'GRADUATION MARKS %']
        ];
      } else if (course?.includes('MCA') || course?.includes('MSC')) {
        templateData = [
          ['STUDENT NAME', 'EMAIL', 'PHONE NUMBER', 'GENDER', 'DATE OF BIRTH', 'CATEGORY',
           '10TH SCHOOL NAME', '10TH BOARD', '10TH PASSING YEAR', '10TH MARKS %',
           '12TH SCHOOL NAME', '12TH BOARD', '12TH PASSING YEAR', '12TH MARKS %', '12TH STREAM',
           'GRADUATION COURSE', 'GRADUATION SPECIALIZATION', 'GRADUATION COLLEGE', 'GRADUATION UNIVERSITY', 
           'GRADUATION PASSING YEAR', 'GRADUATION MARKS %',
           'PROGRAMMING LANGUAGES KNOWN', 'INTERNSHIP DETAILS']
        ];
      } else if (course?.includes('B.Tech') || course?.includes('BE') || course?.includes('Engineering')) {
        templateData = [
          ['STUDENT NAME', 'EMAIL', 'PHONE NUMBER', 'GENDER', 'DATE OF BIRTH', 'CATEGORY',
           '10TH SCHOOL NAME', '10TH BOARD', '10TH PASSING YEAR', '10TH MARKS %',
           '12TH SCHOOL NAME', '12TH BOARD', '12TH PASSING YEAR', '12TH MARKS %', '12TH STREAM',
           'DIPLOMA COURSE', 'DIPLOMA SPECIALIZATION', 'DIPLOMA COLLEGE', 'DIPLOMA UNIVERSITY', 
           'DIPLOMA PASSING YEAR', 'DIPLOMA MARKS %']
        ];
      } else if (course?.includes('Diploma')) {
        templateData = [
          ['STUDENT NAME', 'EMAIL', 'PHONE NUMBER', 'GENDER', 'DATE OF BIRTH', 'CATEGORY',
           '10TH SCHOOL NAME', '10TH BOARD', '10TH PASSING YEAR', '10TH MARKS %',
           '12TH SCHOOL NAME', '12TH BOARD', '12TH PASSING YEAR', '12TH MARKS %', '12TH STREAM',
           'ROLE APPLIED FOR']
        ];
      } else {
        templateData = [
          ['STUDENT NAME', 'EMAIL', 'PHONE NUMBER', 'GENDER', 'DATE OF BIRTH', 'CATEGORY',
           '10TH SCHOOL NAME', '10TH BOARD', '10TH PASSING YEAR', '10TH MARKS %',
           '12TH SCHOOL NAME', '12TH BOARD', '12TH PASSING YEAR', '12TH MARKS %', '12TH STREAM',
           'ROLE APPLIED FOR']
        ];
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Student Data');
      
      // Generate file name
      const fileName = `${company}_${college}_Student_Template.xlsx`;
      
      // Download
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Error downloading template. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Student Data Submission Portal
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              {college && (
                <div className="flex items-center justify-center">
                  <AcademicCapIcon className="h-5 w-5 mr-2 text-blue-600" />
                  <span className="font-semibold">College:</span>
                  <span className="ml-1">{college}</span>
                </div>
              )}
              {company && (
                <div className="flex items-center justify-center">
                  <OfficeBuildingIcon className="h-5 w-5 mr-2 text-green-600" />
                  <span className="font-semibold">Company:</span>
                  <span className="ml-1">{company}</span>
                </div>
              )}
              {course && (
                <div className="flex items-center justify-center">
                  <DocumentDownloadIcon className="h-5 w-5 mr-2 text-purple-600" />
                  <span className="font-semibold">Course:</span>
                  <span className="ml-1">{course}</span>
                </div>
              )}
            </div>
            
            {/* ✅ Dynamic Template Info */}
            {templateFields.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Template Configuration:</strong> {templateFields.length} columns selected
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">📋 Submission Instructions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold text-lg">1</span>
              </div>
              <h3 className="font-semibold mb-2">Download Template</h3>
              <p className="text-sm text-gray-600">
                {templateFields.length > 0 
                  ? `Get template with ${templateFields.length} specific columns` 
                  : 'Get the Excel template with pre-defined columns'
                }
              </p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold text-lg">2</span>
              </div>
              <h3 className="font-semibold mb-2">Fill Student Data</h3>
              <p className="text-sm text-gray-600">Enter student information in the template</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold text-lg">3</span>
              </div>
              <h3 className="font-semibold mb-2">Upload File</h3>
              <p className="text-sm text-gray-600">Submit the completed Excel file</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-6 text-gray-800">
              {templateFields.length > 0 
                ? `Custom Template Ready (${templateFields.length} columns)` 
                : 'Ready to Submit Student Data?'
              }
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={downloadTemplate}
                className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-md"
              >
                <DocumentDownloadIcon className="h-5 w-5 mr-2" />
                {templateFields.length > 0 
                  ? `Download Custom Template` 
                  : 'Download Excel Template'
                }
              </button>
              
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition shadow-md"
              >
                <UploadIcon className="h-5 w-5 mr-2" />
                Upload Student Data
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mt-4">
              Need help? <Link to="/" className="text-blue-600 hover:underline">Contact Support</Link>
            </p>
          </div>
        </div>

        {/* Template Format Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            {templateFields.length > 0 ? '📊 Custom Template Format' : '📊 Template Format'}
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            {templateFields.length > 0 ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Your custom template includes the following <strong>{templateFields.length} columns</strong>:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {templateFields.map((field, index) => (
                    <div key={index} className="bg-white px-3 py-2 rounded border text-sm">
                      {fieldLabels[field] || field}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Your template will include columns for:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Student basic information (Name, Email, Phone, etc.)</li>
                  <li>10th and 12th standard details</li>
                  {course?.includes('MBA') || course?.includes('PGDM') ? (
                    <li>Graduation details for MBA/PGDM applicants</li>
                  ) : course?.includes('MCA') || course?.includes('MSC') ? (
                    <li>Graduation details + Technical skills for MCA/MSc applicants</li>
                  ) : course?.includes('B.Tech') || course?.includes('BE') ? (
                    <li>Diploma details for Engineering applicants</li>
                  ) : (
                    <li>Role applied for (Job applications)</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
          <h4 className="font-semibold text-yellow-800 mb-3">⚠️ Important Notes:</h4>
          <ul className="text-sm text-yellow-700 space-y-2">
            <li>• Use only the provided Excel template format</li>
            <li>• Do not modify column headers or structure</li>
            <li>• Ensure all student contact details are accurate</li>
            <li>• Verify email addresses and phone numbers before submission</li>
            <li>• Only submit data for eligible and interested students</li>
            <li>• File should be in .xlsx format</li>
            {templateFields.length > 0 && (
              <li>• <strong>This template is customized with specific columns as requested</strong></li>
            )}
          </ul>
        </div>
      </div>

      {/* Upload Modal */}
       <div className={`fixed inset-0 z-50 ${showUploadModal ? 'block' : 'hidden'}`}>
        <ExcelUploadModal
          show={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          college={college}
          companyName={company}
        />
      </div>
    </div>
  );
};

export default UploadStudentData;