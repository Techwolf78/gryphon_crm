import React, { useState, useEffect, useCallback } from "react";
import { XIcon } from "@heroicons/react/outline";
import { db } from "../../../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import emailjs from "@emailjs/browser";
import AddJDForm from "./AddJDForm";
import CollegeSelection from "./CollegeSelection";
import TemplateDownloadModal from "./TemplateDownloadModal";
import ExcelUploadModal from "./ExcelUploadModal";

// EmailJS configuration
const EMAILJS_CONFIG = {
  SERVICE_ID: "service_pskknsn",
  TEMPLATE_ID: "template_p2as3pp",
  PUBLIC_KEY: "zEVWxxT-QvGIrhvTV",
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
  const courseDuration = course.includes("B.Tech")
    ? 4
    : course.includes("MBA")
    ? 2
    : course.includes("MCA")
    ? 3
    : 4;

  const currentAcademicYear = getCurrentAcademicYear();
  const currentEndYear = parseInt(currentAcademicYear.split("-")[1]);
  const passingYearNum = parseInt(passingYear);
  const yearsRemaining = passingYearNum - currentEndYear;

  return courseDuration - yearsRemaining;
};

function AddJD({ show, onClose, company }) {
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
    hiringRounds: [], 
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
        where("departments", "array-contains", "Placement")
      );

      const querySnapshot = await getDocs(usersQuery);
      const users = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPlacementUsers(users);
    } catch {
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
  const [otherCollegesInput, setOtherCollegesInput] = useState("");
  const [showOtherCollegesInput, setShowOtherCollegesInput] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [collegeEmails, setCollegeEmails] = useState({});
  const [manualEmails, setManualEmails] = useState({});
  const [collegeDetails, setCollegeDetails] = useState({});

  // New states for template and upload
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedTemplateFields, setSelectedTemplateFields] = useState([
    "studentName",
    "enrollmentNo",
    "email",
    "phone",
    "course",
    "specialization",
    "currentYear",
    "tenthMarks",
    "twelfthMarks",
    "cgpa",
    "activeBacklogs",
    "gender",
  ]);
  const [selectedCollegeForUpload, setSelectedCollegeForUpload] =
    useState(null);

  const validateStep1 = () => {
    const errors = {};
    if (!formData.companyName.trim())
      errors.companyName = "Company name is required";
    if (!formData.course) errors.course = "Course is required";
    if (formData.specialization.length === 0)
      errors.specialization = "At least one specialization is required";
    if (!formData.passingYear) errors.passingYear = "Passing year is required";
    if (!formData.gender) errors.gender = "Gender is required";
    if (!formData.marksCriteria)
      errors.marksCriteria = "Marks criteria is required";
    if (!formData.jobType) errors.jobType = "Job type is required";
    if (!formData.companyOpenDate)
      errors.companyOpenDate = "Company open date is required";
    if (!formData.source.trim()) errors.source = "Source is required";
    if (!formData.coordinator.trim())
      errors.coordinator = "Coordinator is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setJobFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const handleSubmit = () => {
    if (!validateStep1()) return;
    if (company) {
      // For editing, skip college selection and submit directly
      handleFinalSubmit();
    } else {
      // For new JD, go to college selection
      setCurrentStep(2);
    }
  };

  const fetchFilteredColleges = useCallback(async () => {
    if (
      !formData.course ||
      !formData.passingYear ||
      !formData.specialization.length
    ) {
      setAvailableColleges(["Other"]);
      return;
    }

    try {
      const passingYearNum = parseInt(formData.passingYear);
      const firebasePassingYear = `${passingYearNum - 1}-${passingYearNum}`;

      const colleges = new Set();
      const collegeDataMap = {};

      const q = query(
        collection(db, "trainingForms"),
        where("course", "==", formData.course.toUpperCase()),
        where("passingYear", "==", firebasePassingYear)
      );

      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const collegeName = data.collegeName || data.college;

        if (!collegeName) return;

        const hasMatchingSpecialization =
          !data.courses ||
          data.courses.some((courseItem) =>
            formData.specialization.includes(courseItem.specialization)
          );

        if (hasMatchingSpecialization) {
          colleges.add(collegeName);
          collegeDataMap[collegeName] = {
            tpoEmail: data.tpoEmail,
            specializations: data.courses?.map((c) => c.specialization) || [],
            year: data.year,
            passingYear: data.passingYear,
            projectCode: data.projectCode,
          };
        }
      });

      const finalColleges = Array.from(colleges).concat(["Other"]).sort();
      setAvailableColleges(finalColleges);
      setCollegeDetails(collegeDataMap);

      const emails = {};
      Object.keys(collegeDataMap).forEach((college) => {
        if (collegeDataMap[college].tpoEmail) {
          emails[college] = collegeDataMap[college].tpoEmail;
        }
      });
      setCollegeEmails((prev) => ({ ...prev, ...emails }));
    } catch (error) {
      console.error("Error fetching colleges:", error);
      setAvailableColleges(["Other"]);
    }
  }, [formData.course, formData.passingYear, formData.specialization]);

  const handleDownloadTemplate = (college) => {
    setSelectedCollegeForUpload(college);
    setShowTemplateModal(true);
  };

  // Excel upload handler
  const handleUploadExcel = (college) => {
    setSelectedCollegeForUpload(college);
    setShowUploadModal(true);
  };

  const getCollegeEmail = (college) => {
    if (availableColleges.includes(college) && college !== "Other") {
      return collegeEmails[college] || "";
    } else {
      return manualEmails[college] || "";
    }
  };

  const handleEmailChange = (college, email) => {
    if (availableColleges.includes(college) && college !== "Other") {
      setCollegeEmails((prev) => ({
        ...prev,
        [college]: email,
      }));
    } else {
      setManualEmails((prev) => ({
        ...prev,
        [college]: email,
      }));
    }
  };

  const sendBulkEmail = async (collegesWithTPO, templateFields) => {
    try {
      const validEmails = collegesWithTPO
        .filter(({ tpoEmail }) => tpoEmail && tpoEmail.trim() !== "")
        .map(({ tpoEmail }) => tpoEmail);

      if (validEmails.length === 0) {
        setSubmissionError(
          "No valid email addresses found for selected colleges"
        );
        return;
      }

      // Validate required form data
      if (!formData.companyName || !formData.course || !formData.passingYear) {
        throw new Error("Missing required form data: company name, course, or passing year");
      }

      const formatDate = (dateString) => {
        if (!dateString) return "TBD";
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        } catch {
          return dateString || "TBD";
        }
      };

      // Create template fields with styling
      const fieldNames = {
        studentName: "Student Name*",
        enrollmentNo: "Enrollment Number*",
        email: "Email Address*",
        phone: "Phone Number",
        course: "Course*",
        specialization: "Specialization*",
        currentYear: "Current Year*",
        tenthMarks: "10th Marks (%)",
        twelfthMarks: "12th Marks (%)",
        diplomaMarks: "Diploma Marks (%)",
        cgpa: "CGPA",
        activeBacklogs: "Active Backlogs",
        totalBacklogs: "Total Backlogs",
        gender: "Gender",
        resumeLink: "Resume Link",
      };

      const requiredFields = [
        "studentName",
        "enrollmentNo",
        "email",
        "course",
        "specialization",
        "currentYear",
      ];

      const templateFieldsHTML = templateFields
        .map((field) => {
          const isRequired = requiredFields.includes(field);
          const fieldName = fieldNames[field] || field;
          return `<span class="field-item ${
            isRequired ? "required-field" : "optional-field"
          }">${fieldName}</span>`;
        })
        .join("");

      // Send individual emails to each college
      const emailPromises = collegesWithTPO
        .filter(({ tpoEmail }) => tpoEmail && tpoEmail.trim() !== "")
        .map(async ({ college, tpoEmail }) => {
          const templateParams = {
            to_email: "deepgryphon@gmail.com",
            subject: `Student Data Submission Required - ${formData.companyName || 'Company'}`,
            company_name: formData.companyName || 'Company',
            last_date: formatDate(formData.companyOpenDate) || 'TBD',
            passing_year: formData.passingYear || 'TBD',
            course: formData.course || 'TBD',
            job_designation: formData.jobDesignation || formData.jobTitle || 'TBD',
            job_location: formData.jobLocation || 'TBD',
            salary: formData.salary || formData.stipend || 'TBD',
            college_count: validEmails.length,
            college_name: college || 'College',
            template_fields: templateFieldsHTML || 'No fields specified',
            field_count: templateFields.length || 0,
            upload_link: `http://localhost:5173/upload-student-data?college=${encodeURIComponent(
              college || 'College'
            )}&company=${encodeURIComponent(
              formData.companyName || 'Company'
            )}&course=${encodeURIComponent(
              formData.course || 'Course'
            )}&fields=${encodeURIComponent(JSON.stringify(templateFields || []))}`,
            coordinator_name: formData.coordinator || 'Coordinator',
            coordinator_phone: "+91-9876543210",
            bcc: tpoEmail,
          };

          console.log("Sending email with params:", templateParams);

          return emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            templateParams,
            EMAILJS_CONFIG.PUBLIC_KEY
          );
        });

      await Promise.all(emailPromises);

      console.log("All emails sent successfully");
      setEmailSent(true);
      alert(
        `✅ Emails sent successfully to ${emailPromises.length} colleges with template configuration!`
      );
    } catch (error) {
      console.error("Error sending emails:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to send emails";
      if (error.status === 412) {
        errorMessage = "Email template parameters are invalid. Please check all required fields are filled.";
      } else if (error.status === 400) {
        errorMessage = "Invalid email configuration. Please contact support.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setSubmissionError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const handleFinalSubmit = async () => {
    // First validate the form data
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

    if (Object.keys(errors).length > 0) {
      setSubmissionError("Please go back and fill all required fields in the form");
      setCurrentStep(1); // Go back to form step
      setFormErrors(errors);
      return;
    }

    if (
      selectedColleges.length === 0 ||
      (selectedColleges.includes("Other") && otherCollegesInput.trim() === "")
    ) {
      setSubmissionError("Please select at least one college");
      return;
    }

    const collegesWithoutEmails = selectedColleges
      .filter((college) => college !== "Other")
      .filter((college) => !getCollegeEmail(college));

    if (collegesWithoutEmails.length > 0) {
      setSubmissionError(
        `Please provide emails for: ${collegesWithoutEmails.join(", ")}`
      );
      return;
    }

    console.log("Selected Template Fields:", selectedTemplateFields);
    console.log("Form Data:", formData);

    setIsSubmitting(true);
    setSubmissionError(null);
    setEmailSent(false);

    try {
      const collegesToSubmit = selectedColleges.filter((c) => c !== "Other");

      const collegesWithTPO = collegesToSubmit.map((college) => ({
        college,
        tpoEmail: getCollegeEmail(college),
      }));

      if (company) {
        // Editing existing company - update the document
        const companyRef = doc(db, "companies", company.id);
        const companyData = {
          ...formData,
          college: collegesToSubmit[0], // For editing, use the first selected college
          tpoEmail: getCollegeEmail(collegesToSubmit[0]),
          templateFields: selectedTemplateFields,
          jobFiles: jobFiles.map((file) => file.name),
          updatedAt: serverTimestamp(),
        };
        await updateDoc(companyRef, companyData);
        
        alert("JD updated successfully!");
      } else {
        // Creating new company - save to database with template fields
        const promises = collegesToSubmit.map((college) => {
          const companyData = {
            ...formData,
            college,
            tpoEmail: getCollegeEmail(college),
            templateFields: selectedTemplateFields, // ✅ Save selected columns
            jobFiles: jobFiles.map((file) => file.name),
            updatedAt: serverTimestamp(),
          };
          return addDoc(collection(db, "companies"), companyData);
        });

        await Promise.all(promises);

        // Send emails with template fields info
        await sendBulkEmail(collegesWithTPO, selectedTemplateFields);
      }

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

  useEffect(() => {
    if (show && company) {
      // Pre-fill form with company data for editing
      setFormData(prev => ({
        companyName: company.companyName || company.name || "",
        companyWebsite: company.companyUrl || company.companyWebsite || "",
        course: company.course || "",
        specialization: Array.isArray(company.specialization) ? company.specialization : 
                       (company.specialization ? [company.specialization] : []),
        passingYear: company.passingYear || "",
        gender: company.gender || "",
        marksCriteria: company.marksCriteria || "",
        otherCriteria: company.otherCriteria || "",
        jobType: company.jobType || "",
        jobDesignation: company.jobDesignation || "",
        jobLocation: company.jobLocation || "",
        salary: company.salary || "",
        hiringRounds: company.hiringRounds || [],
        internshipDuration: company.internshipDuration || "",
        stipend: company.stipend || "",
        modeOfInterview: company.modeOfInterview || "",
        joiningPeriod: company.joiningPeriod || "",
        companyOpenDate: company.companyOpenDate || "",
        modeOfWork: company.modeOfWork || "",
        jobDescription: company.jobDescription || "",
        source: company.source || "",
        coordinator: company.coordinator || "",
        status: company.status || "ongoing",
        createdAt: company.createdAt || serverTimestamp(),
      }));
      
      // Set selected colleges if editing
      if (company.college) {
        setSelectedColleges([company.college]);
      }
    } else if (!show) {
      // Reset form when modal closes
      setFormData({
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
        hiringRounds: [], 
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
      setCurrentStep(1);
      setSelectedColleges([]);
      setFormErrors({});
      setSubmissionError(null);
      setEmailSent(false);
      setJobFiles([]); // Reset job files
    }
  }, [show, company]);

  useEffect(() => {
    if (show) {
      fetchPlacementUsers();
    }
  }, [show]);

  useEffect(() => {
    fetchFilteredColleges();
  }, [formData.course, formData.passingYear, formData.specialization, fetchFilteredColleges]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-52 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl shadow-2xl overflow-hidden h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gray-50/50 border-b border-gray-100 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {currentStep === 1 ? (company ? "Edit JD Form" : "Add JD Form") : "Select Colleges"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none p-1"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {currentStep === 1 ? (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <AddJDForm
                formData={formData}
                setFormData={setFormData}
                formErrors={formErrors}
                handleFileChange={handleFileChange}
                onClose={onClose}
                placementUsers={placementUsers}
                isLoadingUsers={isLoadingUsers}
                jobFiles={jobFiles}
                setJobFiles={setJobFiles}
              />
            </div>

            <div className="bg-gray-50/50 border-t border-gray-100 px-4 py-3 flex justify-end sticky bottom-0 z-10">
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {company ? "Update JD" : "Save & Next"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <CollegeSelection
                formData={formData}
                availableColleges={availableColleges}
                selectedColleges={selectedColleges}
                setSelectedColleges={setSelectedColleges}
                otherCollegesInput={otherCollegesInput}
                setOtherCollegesInput={setOtherCollegesInput}
                showOtherCollegesInput={showOtherCollegesInput}
                setShowOtherCollegesInput={setShowOtherCollegesInput}
                collegeEmails={collegeEmails}
                manualEmails={manualEmails}
                handleEmailChange={handleEmailChange}
                getCollegeEmail={getCollegeEmail}
                collegeDetails={collegeDetails}
                getStudentCurrentYear={getStudentCurrentYear}
                onDownloadTemplate={handleDownloadTemplate}
                onUploadExcel={handleUploadExcel}
                selectedTemplateFields={selectedTemplateFields}
                onTemplateFieldsChange={setSelectedTemplateFields}
              />

              {emailSent && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200">
                  <p className="text-green-700 text-sm">
                    ✅ Email sent successfully to all selected colleges!
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50/50 border-t border-gray-100 px-4 py-3 flex justify-between items-center sticky bottom-0 z-10">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                ← Back
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  disabled={
                    selectedColleges.length === 0 ||
                    (selectedColleges.includes("Other") &&
                      otherCollegesInput.trim() === "") ||
                    isSubmitting
                  }
                  className={`px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    selectedColleges.length === 0 ||
                    (selectedColleges.includes("Other") &&
                      otherCollegesInput.trim() === "") ||
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isSubmitting
                    ? "Submitting..."
                    : company
                    ? "Update JD"
                    : `Send to ${
                        selectedColleges.filter((c) => c !== "Other").length
                      } college(s)`}
                </button>
              </div>
            </div>
          </>
        )}

       

        {/* Template Download Modal */}
        <TemplateDownloadModal
          show={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          college={selectedCollegeForUpload}
          formData={formData}
          selectedFields={selectedTemplateFields}
          onFieldsChange={setSelectedTemplateFields}
        />

        {/* Excel Upload Modal */}
        <ExcelUploadModal
          show={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          college={selectedCollegeForUpload}
          companyName={formData.companyName}
        />
      </div>
    </div>
  );
}

export default AddJD;
