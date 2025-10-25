import React, { useState, useEffect } from "react";
import { XIcon } from "@heroicons/react/outline";
import { db } from "../../../firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import AddJDForm from "./AddJDForm";
import CollegeSelection from "./CollegeSelection";
import StudentModal from "./StudentModal";

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

  const fetchStudentsForCollege = async (college) => {
    setIsLoadingStudents(true);
    try {
      // First, find the training form document ID for this college
      const trainingFormQuery = query(
        collection(db, "trainingForms"),
        where("collegeName", "==", college)
      );
      
      const trainingFormSnapshot = await getDocs(trainingFormQuery);
      if (trainingFormSnapshot.empty) {
        setStudentsData(prev => ({ ...prev, [college]: [] }));
        return;
      }

      const trainingFormId = trainingFormSnapshot.docs[0].id;
      
      // Now fetch students for this training form
      const studentsQuery = query(
        collection(db, "trainingForms", trainingFormId, "students")
      );
      
      const studentsSnapshot = await getDocs(studentsQuery);
      const students = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
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
    
    // Fetch students if not already fetched
    if (!studentsData[college]) {
      fetchStudentsForCollege(college);
    }
  };

  const closeStudentView = () => {
    setViewingCollege(null);
  };

  const generateEmailContent = () => {
    const emailSubject = `Job Opportunity: ${formData.companyName}`;
    
    // Plain text format with Outlook-supported bold syntax
    const emailBody = `
Job Opportunity Details
*Company Name:* ${formData.companyName || 'N/A'}
*Website:* ${formData.companyWebsite || 'N/A'}

Eligibility Criteria
*Course:* ${formData.course || 'N/A'}
*Specialization:* ${formData.specialization.join(', ') || 'N/A'}
*Passing Year:* ${formData.passingYear || 'N/A'}
*Marks Criteria:* ${formData.marksCriteria || 'N/A'}
*Gender:* ${formData.gender || 'N/A'}

Job Details
*Job Type:* ${formData.jobType || 'N/A'}
*Designation:* ${formData.jobDesignation || 'N/A'}
*Location:* ${formData.jobLocation || 'N/A'}
*Salary:* ${formData.salary || 'N/A'}
${formData.internshipDuration ? `*Internship Duration:* ${formData.internshipDuration}` : ''}
${formData.stipend ? `*Stipend:* ${formData.stipend}` : ''}

Additional Information
*Mode of Interview:* ${formData.modeOfInterview || 'N/A'}
*Joining Period:* ${formData.joiningPeriod || 'N/A'}
*Mode of Work:* ${formData.modeOfWork || 'N/A'}

Selection Process ${formData.modeOfInterview}:
1. Application Form Submission
2. Online Assessment Test (Communication & Aptitude)
3. Interview Round - Technical
4. Interview Round - HR
5. Result Declaration

${formData.jobDescription ? `
Job Description
${formData.jobDescription.replace(/\n/g, '\n')}
` : ''}

*Please share the detailed list of eligible and interested students 
as per the attached excel sheet format along with their respective 
resumes in a zip folder by 10th July 2025 by 2:00 pm.*
    `;

    return { subject: emailSubject, body: emailBody };
  };

  const openOutlookEmail = (college, tpoEmail) => {
    const { subject, body } = generateEmailContent();
    
    // Create the mailto link with TPO email if available
    const mailtoLink = `https://outlook.office365.com/mail/deeplink/compose?to=${encodeURIComponent(tpoEmail || '')}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open in a new tab
    window.open(mailtoLink, '_blank');
  };

  const handleFinalSubmit = async () => {
    if (selectedColleges.length === 0 || (selectedColleges.includes("Other") && otherCollegesInput.trim() === "")) {
      setSubmissionError("Please select at least one college");
      return;
    }
    
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      // Filter out the "Other" option and only keep actual college names
      const collegesToSubmit = selectedColleges.filter(c => c !== "Other");
      
      // First, fetch TPO emails for all selected colleges
      const collegesWithTPO = await Promise.all(
        collegesToSubmit.map(async (college) => {
          try {
            // Query the trainingForms collection to find the college
            const trainingFormQuery = query(
              collection(db, "trainingForms"),
              where("collegeName", "==", college)
            );
            
            const trainingFormSnapshot = await getDocs(trainingFormQuery);
            if (trainingFormSnapshot.empty) {
              return { college, tpoEmail: null };
            }
            
            // Get the TPO email from the first matching document
            const tpoEmail = trainingFormSnapshot.docs[0].data().tpoEmail || null;
            return { college, tpoEmail };
          } catch (error) {
            console.error("Error fetching TPO for college:", college, error);
            return { college, tpoEmail: null };
          }
        })
      );

      // Submit company data to Firestore
      const promises = collegesToSubmit.map(college => {
        const companyData = {
          ...formData,
          college,
          jobFiles: jobFiles.map(file => file.name),
          updatedAt: serverTimestamp()
        };
        return addDoc(collection(db, "companies"), companyData);
      });

      await Promise.all(promises);
      
      // Open Outlook email for each selected college in new tabs
      collegesWithTPO.forEach(({ college, tpoEmail }) => {
        openOutlookEmail(college, tpoEmail);
      });
      
      onClose();
    } catch (error) {
      console.error("Error submitting JD:", error);
      setSubmissionError("Error submitting JD. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchColleges = async () => {
      if (formData.course && formData.passingYear) {
        try {
          const passingYearNum = parseInt(formData.passingYear);
          if (isNaN(passingYearNum)) {

            return;
          }
          
          const yearStart = (passingYearNum - 1).toString().slice(-2);
          const yearEnd = passingYearNum.toString().slice(-2);
          const passingYearFormat1 = `${yearStart}-${yearEnd}`;
          const passingYearFormat2 = `20${yearStart}-20${yearEnd}`;

          const queries = [
            query(
              collection(db, "trainingForms"),
              where("course", "==", formData.course),
              where("passingYear", "==", passingYearFormat1)
            ),
            query(
              collection(db, "trainingForms"),
              where("course", "==", formData.course),
              where("passingYear", "==", passingYearFormat2)
            )
          ];

          const colleges = new Set();
          
          for (const q of queries) {
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              const collegeName = data.collegeName || data.college || doc.id.split("-")[0];
              if (collegeName) {
                colleges.add(collegeName);
              }
            });
          }

          const finalColleges = Array.from(colleges)
            .concat(["Other"]) // Add "Other" option
            .sort();
          
          setAvailableColleges(finalColleges);

        } catch (error) {
          console.error("Error fetching colleges:", error);
          setAvailableColleges(["Other"]); // Just show "Other" option if fetch fails
        }
      } else {
        setAvailableColleges(["Other"]); // Just show "Other" option if no course/year selected
      }
    };

    fetchColleges();
  }, [formData.course, formData.passingYear]);

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
              />
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
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : `Submit to ${selectedColleges.filter(c => c !== "Other").length} college(s)`}
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
