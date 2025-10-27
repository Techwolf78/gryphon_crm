import React, { useState, useEffect } from "react";
import { XIcon } from "@heroicons/react/outline";
import { db } from "../../../firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import emailjs from '@emailjs/browser';
import AddJDForm from "./AddJDForm";
import CollegeSelection from "./CollegeSelection";
import StudentModal from "./StudentModal";

// EmailJS configuration
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_pskknsn',
  TEMPLATE_ID: 'template_p2as3pp', 
  PUBLIC_KEY: 'zEVWxxT-QvGIrhvTV'
};

// Academic year calculation helper
const getCurrentAcademicYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // August (7) to December (11) - same year, January to July - previous year
  if (currentMonth >= 7) {
    return `${currentYear}-${currentYear + 1}`;
  } else {
    return `${currentYear - 1}-${currentYear}`;
  }
};

// Student's current year calculation
const getStudentCurrentYear = (passingYear, course = "B.Tech") => {
  const courseDuration = course.includes("B.Tech") ? 4 : 
                        course.includes("MBA") ? 2 : 
                        course.includes("MCA") ? 3 : 4;
  
  const currentAcademicYear = getCurrentAcademicYear();
  const currentEndYear = parseInt(currentAcademicYear.split('-')[1]);
  const passingYearNum = parseInt(passingYear);
  const yearsRemaining = passingYearNum - currentEndYear;
  
  return courseDuration - yearsRemaining;
};

function AddJD({ show, onClose }) {
  const [formData, setFormData] = useState({
    companyName: "",
    companyWebsite: "",
    course: "",
    specialization: [],
    passingYear: "",
    gender: "",
    marksCriteria: "",
    otherCriteria: "",
    jobType: "",
    jobDesignation: "",
    jobLocation: "",
    salary: "",
    internshipDuration: "",
    stipend: "",
    modeOfInterview: "",
    joiningPeriod: "",
    companyOpenDate: "",
    modeOfWork: "",
    jobDescription: "",
    source: "",
    coordinator: "",
    status: "ongoing",
    createdAt: serverTimestamp(),
  });
  const [placementUsers, setPlacementUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

const fetchPlacementUsers = async () => {
  setIsLoadingUsers(true);
  try {
    const usersQuery = query(
      collection(db, "users"),
      where("department", "==", "Placement")
    );
    
    const querySnapshot = await getDocs(usersQuery);
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    setPlacementUsers(users);
  } catch (error) {
    setPlacementUsers([]);
  } finally {
    setIsLoadingUsers(false);
  }
};
  const [jobFiles, setJobFiles] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedColleges, setSelectedColleges] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [availableColleges, setAvailableColleges] = useState([]);
  const [studentsData, setStudentsData] = useState({});
  const [viewingCollege, setViewingCollege] = useState(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [otherCollegesInput, setOtherCollegesInput] = useState("");
  const [showOtherCollegesInput, setShowOtherCollegesInput] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [collegeEmails, setCollegeEmails] = useState({});
  const [manualEmails, setManualEmails] = useState({});
  const [collegeDetails, setCollegeDetails] = useState({}); // Store complete college data

  const validateStep1 = () => {
    const errors = {};
    if (!formData.companyName.trim()) errors.companyName = "Company name is required";
    if (!formData.course) errors.course = "Course is required";
    if (formData.specialization.length === 0) errors.specialization = "At least one specialization is required";
    if (!formData.passingYear) errors.passingYear = "Passing year is required";
    if (!formData.gender) errors.gender = "Gender is required";
    if (!formData.marksCriteria) errors.marksCriteria = "Marks criteria is required";
    if (!formData.jobType) errors.jobType = "Job type is required";
    if (!formData.companyOpenDate) errors.companyOpenDate = "Company open date is required";
    if (!formData.source.trim()) errors.source = "Source is required";
    if (!formData.coordinator.trim()) errors.coordinator = "Coordinator is required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileChange = (e) => {
    setJobFiles([...e.target.files]);
  };

  const handleSubmit = () => {
    if (!validateStep1()) return;
    setCurrentStep(2);
  };

const fetchFilteredColleges = async () => {
  if (!formData.course || !formData.passingYear || !formData.specialization.length) {
    setAvailableColleges(["Other"]);
    return;
  }

  try {
    const passingYearNum = parseInt(formData.passingYear);
    // Convert to Firebase passing year format (e.g., 2025 -> "2024-2025")
    const firebasePassingYear = `${passingYearNum - 1}-${passingYearNum}`;

    const colleges = new Set();
    const collegeDataMap = {};

    // Query placementData with exact matches
    const q = query(
      collection(db, "placementData"),
      where("course", "==", formData.course),
      where("passingYear", "==", firebasePassingYear)
    );

    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const collegeName = data.collegeName || data.college;
      
      if (!collegeName) return;

      // Check specialization match - koi bhi specialization match ho to show karo
      const hasMatchingSpecialization = !data.courses || 
        data.courses.some(courseItem => 
          formData.specialization.includes(courseItem.specialization)
        );

      if (hasMatchingSpecialization) {
        colleges.add(collegeName);
        // Store complete college data
        collegeDataMap[collegeName] = {
          tpoEmail: data.tpoEmail,
          specializations: data.courses?.map(c => c.specialization) || [],
          year: data.year, // Firebase ka year field use karo (1st, 2nd, etc.)
          passingYear: data.passingYear,
          projectCode: data.projectCode // Pura project code store karo
        };
      }
    });

    const finalColleges = Array.from(colleges).concat(["Other"]).sort();
    setAvailableColleges(finalColleges);
    setCollegeDetails(collegeDataMap);

    // Auto-fetch emails
    const emails = {};
    Object.keys(collegeDataMap).forEach(college => {
      if (collegeDataMap[college].tpoEmail) {
        emails[college] = collegeDataMap[college].tpoEmail;
      }
    });
    setCollegeEmails(prev => ({ ...prev, ...emails }));

  } catch (error) {
    console.error("Error fetching colleges:", error);
    setAvailableColleges(["Other"]);
  }
};


const fetchStudentsForCollege = async (college) => {
  setIsLoadingStudents(true);
  try {
    // Pehle college ka document find karo placementData me
    const placementQuery = query(
      collection(db, "placementData"),
      where("collegeName", "==", college)
    );
    
    const placementSnapshot = await getDocs(placementQuery);
    
    if (placementSnapshot.empty) {
      setStudentsData(prev => ({ ...prev, [college]: [] }));
      return;
    }

    // College ka document ID mil gaya
    const collegeDoc = placementSnapshot.docs[0];
    const collegeDocId = collegeDoc.id;
    
    // Ab students subcollection se data fetch karo
    const studentsQuery = query(
      collection(db, "placementData", collegeDocId, "students")
    );
    
    const studentsSnapshot = await getDocs(studentsQuery);
    const students = studentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Fetched ${students.length} students for ${college}:`, students);
    setStudentsData(prev => ({ ...prev, [college]: students }));
    
  } catch (error) {
    console.error("Error fetching students for college:", college, error);
    setStudentsData(prev => ({ ...prev, [college]: [] }));
  } finally {
    setIsLoadingStudents(false);
  }
};
  const viewStudents = (college) => {
    if (college === "Other" || !availableColleges.includes(college)) return;
    
    setViewingCollege(college);
    
    if (!studentsData[college]) {
      fetchStudentsForCollege(college);
    }
  };

  const closeStudentView = () => {
    setViewingCollege(null);
  };

  // College email getter function
  const getCollegeEmail = (college) => {
    if (availableColleges.includes(college) && college !== "Other") {
      return collegeEmails[college] || '';
    } else {
      return manualEmails[college] || '';
    }
  };

  // College email setter function
  const handleEmailChange = (college, email) => {
    if (availableColleges.includes(college) && college !== "Other") {
      setCollegeEmails(prev => ({
        ...prev,
        [college]: email
      }));
    } else {
      setManualEmails(prev => ({
        ...prev,
        [college]: email
      }));
    }
  };

  const sendBulkEmail = async (collegesWithTPO) => {
    try {
      const validEmails = collegesWithTPO
        .filter(({ tpoEmail }) => tpoEmail && tpoEmail.trim() !== "")
        .map(({ tpoEmail }) => tpoEmail);

      console.log('Valid Emails for BCC:', validEmails);

      if (validEmails.length === 0) {
        console.warn("No valid email addresses found");
        setSubmissionError("No valid email addresses found for selected colleges");
        return;
      }

      const collegeNames = collegesWithTPO
        .filter(({ tpoEmail }) => tpoEmail && tpoEmail.trim() !== "")
        .map(({ college }) => college)
        .join(', ');

      const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        } catch (error) {
          return dateString;
        }
      };

      const templateParams = {
        to_email: 'deepgryphon@gmail.com',
        bcc_emails: validEmails.join(','),
        subject: `Assignment Mail for ${collegeNames} - Gryphon Academy Pvt. Ltd.`,
        company_name: formData.companyName || 'Company',
        last_date: formatDate(formData.companyOpenDate),
        passing_year: formData.passingYear || 'N/A',
        course: formData.course || 'N/A',
        job_designation: formData.jobDesignation || 'Job Opening',
        job_location: formData.jobLocation || 'N/A',
        salary: formData.salary || 'N/A',
        college_names: collegeNames,
        college_count: validEmails.length
      };

      console.log('BCC Email Params:', templateParams);

      const result = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams,
        EMAILJS_CONFIG.PUBLIC_KEY
      );

      console.log('BCC Email sent successfully:', result.text);
      setEmailSent(true);
      alert(`✅ Email sent successfully to ${validEmails.length} colleges via BCC!`);

    } catch (error) {
      console.error('Error sending BCC email:', error);
      throw new Error('Failed to send email');
    }
  };

  const handleFinalSubmit = async () => {
    if (selectedColleges.length === 0 || (selectedColleges.includes("Other") && otherCollegesInput.trim() === "")) {
      setSubmissionError("Please select at least one college");
      return;
    }
    
    const collegesWithoutEmails = selectedColleges
      .filter(college => college !== "Other")
      .filter(college => !getCollegeEmail(college));
    
    if (collegesWithoutEmails.length > 0) {
      setSubmissionError(`Please provide emails for: ${collegesWithoutEmails.join(', ')}`);
      return;
    }

    console.log('Form Data:', formData);
    console.log('Selected Colleges:', selectedColleges);
    console.log('College Emails:', collegeEmails);
    console.log('Manual Emails:', manualEmails);

    setIsSubmitting(true);
    setSubmissionError(null);
    setEmailSent(false);
    
    try {
      const collegesToSubmit = selectedColleges.filter(c => c !== "Other");
      
      const collegesWithTPO = collegesToSubmit.map(college => ({
        college,
        tpoEmail: getCollegeEmail(college)
      }));

      console.log('Colleges with TPO:', collegesWithTPO);

      const promises = collegesToSubmit.map(college => {
        const companyData = {
          ...formData,
          college,
          tpoEmail: getCollegeEmail(college),
          jobFiles: jobFiles.map(file => file.name),
          updatedAt: serverTimestamp()
        };
        return addDoc(collection(db, "companies"), companyData);
      });

      await Promise.all(promises);
      
      await sendBulkEmail(collegesWithTPO);
      
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error("Error submitting JD:", error);
      setSubmissionError("Error submitting JD. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

// Placement users ke liye alag useEffect
useEffect(() => {
  if (show) {
    fetchPlacementUsers();
  }
}, [show]); // Sirf show change hone par fetch karo

// Colleges filter ke liye alag useEffect  
useEffect(() => {
  fetchFilteredColleges();
}, [formData.course, formData.passingYear, formData.specialization]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-52 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">
            {currentStep === 1 ? "Add JD Form" : "Select Colleges"}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {currentStep === 1 ? (
          <>
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(100vh-180px)]">
             <AddJDForm
  formData={formData}
  setFormData={setFormData}
  formErrors={formErrors}
  handleFileChange={handleFileChange}
  placementUsers={placementUsers}
  isLoadingUsers={isLoadingUsers}
/>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                >
                  Save & Next
                </button>
              </div>
            </div>
          </> 
        ) : (
          <>
            {/* College Selection Step */}
            <div className="p-6 overflow-y-auto max-h-[calc(100vh-180px)]">
              <CollegeSelection
                formData={formData}
                availableColleges={availableColleges}
                selectedColleges={selectedColleges}
                setSelectedColleges={setSelectedColleges}
                otherCollegesInput={otherCollegesInput}
                setOtherCollegesInput={setOtherCollegesInput}
                showOtherCollegesInput={showOtherCollegesInput}
                setShowOtherCollegesInput={setShowOtherCollegesInput}
                viewStudents={viewStudents}
                collegeEmails={collegeEmails}
                manualEmails={manualEmails}
                handleEmailChange={handleEmailChange}
                getCollegeEmail={getCollegeEmail}
                collegeDetails={collegeDetails}
                getStudentCurrentYear={getStudentCurrentYear}
              />
              
              {/* Email Status */}
              {emailSent && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm">
                    ✅ Email sent successfully to all selected colleges!
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
              >
                Back
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                >
                  Cancel
                </button>
                {submissionError && (
                  <div className="text-red-600 text-sm mr-4 flex items-center">
                    {submissionError}
                  </div>
                )}
                <button
                  onClick={handleFinalSubmit}
                  disabled={selectedColleges.length === 0 || (selectedColleges.includes("Other") && otherCollegesInput.trim() === "") || isSubmitting}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${
                    selectedColleges.length === 0 || (selectedColleges.includes("Other") && otherCollegesInput.trim() === "") || isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : `Send to ${selectedColleges.filter(c => c !== "Other").length} college(s)`}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Student Data Modal */}
        <StudentModal
          viewingCollege={viewingCollege}
          studentsData={studentsData}
          isLoadingStudents={isLoadingStudents}
          closeStudentView={closeStudentView}
        />
      </div>
    </div>
  );
}

export default AddJD;