import React, { useState, useEffect, useCallback } from "react";
import { XIcon } from "@heroicons/react/outline";
import { toast } from "react-toastify";
import { db, storage } from "../../../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ref, getDownloadURL, deleteObject, uploadBytesResumable } from "firebase/storage";
import emailjs from "@emailjs/browser";
import AddJDForm from "./AddJDForm";
import CollegeSelection from "./CollegeSelection";
import TemplateDownloadModal from "./TemplateDownloadModal";
import ExcelUploadModal from "./ExcelUploadModal";
import specializationOptions from './specializationOptions';

const EMAILJS_CONFIG = {
  SERVICE_ID: "service_sl0i7kr",
  TEMPLATE_ID: "template_q0oarab",
  PUBLIC_KEY: "V5rET66jxvg4gqulO",
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

function AddJD({ show, onClose, company, fetchCompanies }) {
  const [formData, setFormData] = useState({
    companyName: "",
    companyWebsite: "",
    course: "",
    specialization: [],
    otherSpecializations: "",
    passingYear: "",
    gender: "",
    marksCriteria: "",
    backlogCriteria: "",
    otherCriteria: "",
    jobType: "",
    jobDesignation: "",
    jobLocation: "",
    fixedSalary: "",
    variableSalary: "",
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
  const [uploadedFileUrls, setUploadedFileUrls] = useState([]);
  const [fileUploadProgress, setFileUploadProgress] = useState({});

  const handleFileChange = async (event) => {
    const newFiles = Array.from(event.target.files);

    // Separate stored files from current jobFiles
    const storedFiles = jobFiles ? jobFiles.filter(file => file.isStored) : [];
    const currentNewFiles = jobFiles ? jobFiles.filter(file => !file.isStored) : [];

    // Combine stored files with newly selected files
    const allFiles = [...storedFiles, ...currentNewFiles, ...newFiles.map(file => ({ name: file.name, file: file, isNew: true }))];
    setJobFiles(allFiles);

    // Only upload the newly selected files
    const filesToUpload = newFiles;
    if (filesToUpload.length === 0) return;

    const uploadPromises = filesToUpload.map(async (file, index) => {
      const storageRef = ref(storage, `jobFiles/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setFileUploadProgress(prev => ({
              ...prev,
              [storedFiles.length + currentNewFiles.length + index]: progress
            }));
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({ name: file.name, url: downloadURL });
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    });

    try {
      const newlyUploadedFiles = await Promise.all(uploadPromises);
      // Combine existing uploaded URLs with new ones
      setUploadedFileUrls(prev => [...prev, ...newlyUploadedFiles]);
      setFileUploadProgress({});
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files. Please try again.');
    }
  };

  const removeFile = async (index) => {
    const fileToRemove = jobFiles[index];
    const updatedFiles = jobFiles.filter((_, i) => i !== index);
    setJobFiles(updatedFiles);

    // If it's a stored file, delete from storage
    if (fileToRemove.isStored && fileToRemove.url) {
      try {
        // Extract the file path from the URL
        const url = new URL(fileToRemove.url);
        const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
        const fileRef = ref(storage, path);
        await deleteObject(fileRef);
      } catch (error) {
        console.error('Error deleting file from storage:', error);
      }
    }

    // Remove from uploaded URLs if it exists there
    if (fileToRemove.url) {
      setUploadedFileUrls(prev => prev.filter(f => f.url !== fileToRemove.url));
    }
  };

  // Check if any files are still uploading
  const isUploading = () => {
    return Object.values(fileUploadProgress).some(progress => progress < 100);
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedColleges, setSelectedColleges] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [availableColleges, setAvailableColleges] = useState([]);
  const [studentsData, setStudentsData] = useState({});
  const [_viewingCollege, _setViewingCollege] = useState(null);
  const [_isLoadingStudents, _setIsLoadingStudents] = useState(false);
  const [otherCollegesInput, setOtherCollegesInput] = useState("");
  const [showOtherCollegesInput, setShowOtherCollegesInput] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [collegeEmails, setCollegeEmails] = useState({});
  const [manualEmails, setManualEmails] = useState({});
  const [collegeDetails, setCollegeDetails] = useState({});
  const [saveStatus, setSaveStatus] = useState(null); // null, 'saving', 'saved'

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
    if (formData.jobType !== "Internship" && !formData.fixedSalary)
      errors.fixedSalary = "Fixed salary is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateStep1()) return;
    setCurrentStep(2);
  };

  const handleSave = async () => {
    if (!validateStep1()) return;

    setSaveStatus("saving");
    try {
      // Compute total salary
      const totalSalary =
        (parseFloat(formData.fixedSalary) || 0) +
        (parseFloat(formData.variableSalary) || 0);
      const updatedFormData = { 
        ...formData, 
        salary: totalSalary.toString(),
        jobFiles: uploadedFileUrls // Always store the current uploaded file URLs
      };

      if (company && company.id) {
        // Update existing company
        await updateDoc(doc(db, "companies", company.id), {
          ...updatedFormData,
          updatedAt: serverTimestamp(),
        });
        toast.success("Company updated successfully!");
        setSaveStatus("saved");
        setTimeout(() => {
          setSaveStatus(null);
          onClose(); // Close modal after successful update
        }, 1500);
      } else {
        // Create new company (though this might not be typical without colleges)
        await addDoc(collection(db, "companies"), {
          ...updatedFormData,
          status: "ongoing",
          createdAt: serverTimestamp(),
        });
        toast.success("Company saved successfully!");
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(null), 3000);
      }

      // Refresh companies list
      if (fetchCompanies) {
        fetchCompanies();
      }
    } catch (error) {
      console.error("Error saving company:", error);
      toast.error("Failed to save company. Please try again.");
      setSaveStatus(null);
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
        collection(db, "placementData"),
        where("course", "==", formData.course),
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

  const fetchStudentsForCollege = async (college) => {
    _setIsLoadingStudents(true);
    try {
      const placementQuery = query(
        collection(db, "placementData"),
        where("collegeName", "==", college)
      );

      const placementSnapshot = await getDocs(placementQuery);

      if (placementSnapshot.empty) {
        setStudentsData((prev) => ({ ...prev, [college]: [] }));
        return;
      }

      const collegeDoc = placementSnapshot.docs[0];
      const collegeDocId = collegeDoc.id;

      const studentsQuery = query(
        collection(db, "placementData", collegeDocId, "students")
      );

      const studentsSnapshot = await getDocs(studentsQuery);
      const students = studentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log(
        `Fetched ${students.length} students for ${college}:`,
        students
      );
      setStudentsData((prev) => ({ ...prev, [college]: students }));
    } catch (error) {
      console.error("Error fetching students for college:", college, error);
      setStudentsData((prev) => ({ ...prev, [college]: [] }));
    } finally {
      _setIsLoadingStudents(false);
    }
  };

  const viewStudents = (college) => {
    if (college === "Other" || !availableColleges.includes(college)) return;

    _setViewingCollege(college);

    if (!studentsData[college]) {
      fetchStudentsForCollege(college);
    }
  };

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

      // Format salary and stipend values for display
      const formatSalaryValue = (value) => {
        if (!value || value === 0 || value === "0") return "Not Specified";
        const num = parseFloat(value);
        if (num >= 100000) {
          return `₹${(num / 100000).toFixed(1)} LPA`;
        }
        return `₹${num.toLocaleString()}`;
      };

      const formatStipendValue = (value) => {
        if (!value || value === 0 || value === "0") return "Not Specified";
        const num = parseFloat(value);
        return `₹${num.toLocaleString()}/month`;
      };

      const fixedSalaryDisplay = formatSalaryValue(formData.fixedSalary);
      const variableSalaryDisplay = formatSalaryValue(formData.variableSalary);
      const totalSalaryDisplay = formatSalaryValue(formData.salary);
      const stipendDisplay = formatStipendValue(formData.stipend);
      // --- BEGIN: Salary / Stipend HTML section (add here) ---
      const salarySectionHTML =
        formData.jobType === "Internship" || formData.jobType === "Int + PPO"
          ? `
      <p><strong>Stipend:</strong> ${stipendDisplay}${
              formData.internshipDuration
                ? ` <span>(${formData.internshipDuration})</span>`
                : ""
            }</p>
      <p><strong>Fixed Salary:</strong> ${fixedSalaryDisplay}</p>
      <p><strong>Variable Salary:</strong> ${variableSalaryDisplay}</p>
      <p><strong>Total CTC:</strong> ${totalSalaryDisplay}</p>
    `
          : `
      <p><strong>Fixed Salary:</strong> ${fixedSalaryDisplay}</p>
      <p><strong>Variable Salary:</strong> ${variableSalaryDisplay}</p>
      <p><strong>Total CTC:</strong> ${totalSalaryDisplay}</p>
    `;
      // --- END ---

      // Send individual emails to each college
      const fileNames = uploadedFileUrls.length
        ? uploadedFileUrls.map((file) => file.name)
        : jobFiles && jobFiles.length
        ? jobFiles.map((file) => file.name || file)
        : [];

      const jobFilesHTML = uploadedFileUrls.length
        ? `<p><strong>Job Files:</strong></p><p>${uploadedFileUrls.map(file => `<a href="${file.url}" target="_blank" rel="noopener noreferrer">${file.name}</a>`).join('<br>')}</p>`
        : "<p><strong>Job Files:</strong> Not provided</p>";

      const emailPromises = collegesWithTPO
        .filter(({ tpoEmail }) => tpoEmail && tpoEmail.trim() !== "")
        .map(async ({ college, tpoEmail }) => {
          const templateParams = {
            to_email: tpoEmail,
            company_name: formData.companyName,
            company_website: formData.companyWebsite || "Not provided",
            job_designation: formData.jobDesignation,
            job_location: formData.jobLocation,

            // Salary Fields
            fixed_salary: fixedSalaryDisplay,
            variable_salary: variableSalaryDisplay,
            total_salary: totalSalaryDisplay,
            stipend: stipendDisplay,

            // HTML block for salary/stipend
            salary_section: salarySectionHTML,

            salary_info:
              formData.jobType === "Internship" || formData.jobType === "Int + PPO"
                ? `Stipend: ${stipendDisplay} | Fixed: ${fixedSalaryDisplay} | Variable: ${variableSalaryDisplay} | Total: ${totalSalaryDisplay}`
                : `Fixed: ${fixedSalaryDisplay} | Variable: ${variableSalaryDisplay} | Total: ${totalSalaryDisplay}`,

            job_type: formData.jobType,
            mode_of_interview: formData.modeOfInterview,
            course: formData.course,
            passing_year: formData.passingYear,
            Gender: formData.gender,
            marks_criteria: formData.marksCriteria,
            backlog_criteria: formData.backlogCriteria,
            other_criteria: formData.otherCriteria || "None",
            internship_duration: formData.internshipDuration || "Not specified",
            mode_of_work: formData.modeOfWork || "Not specified",
            joining_period: formData.joiningPeriod || "Not specified",
            company_open_date: formData.companyOpenDate || "Not specified",
            source: formData.source || "Not specified",
            coordinator: formData.coordinator || "Not specified",
            college_count: validEmails.length,
            college_name: college,
            template_fields: templateFieldsHTML,
            field_count: templateFields.length,
            hiring_rounds_html: formData.hiringRounds
              .map((round) => `<li>${round}</li>`)
              .join(""),

            // ✅ FIXED: Complete URL with ALL job details parameters
            upload_link: `${
              window.location.origin
            }/sync/upload-student-data?college=${encodeURIComponent(
              college
            )}&company=${encodeURIComponent(
              formData.companyName
            )}&course=${encodeURIComponent(
              formData.course
            )}&fields=${encodeURIComponent(
              JSON.stringify(templateFields)
            )}&companyWebsite=${encodeURIComponent(
              formData.companyWebsite || ""
            )}&designation=${encodeURIComponent(
              formData.jobDesignation || ""
            )}&jobType=${encodeURIComponent(
              formData.jobType || ""
            )}&jobLocation=${encodeURIComponent(
              formData.jobLocation || ""
            )}&fixedSalary=${encodeURIComponent(
              formData.fixedSalary || ""
            )}&variableSalary=${encodeURIComponent(
              formData.variableSalary || ""
            )}&totalCTC=${encodeURIComponent(
              formData.salary || ""
            )}&modeOfInterview=${encodeURIComponent(
              formData.modeOfInterview || ""
            )}&passingYear=${encodeURIComponent(
              formData.passingYear || ""
            )}&genderEligibility=${encodeURIComponent(
              formData.gender || ""
            )}&marksCriteria=${encodeURIComponent(
              formData.marksCriteria || ""
            )}&backlogCriteria=${encodeURIComponent(
              formData.backlogCriteria || ""
            )}&jobDescription=${encodeURIComponent(
              formData.jobDescription || ""
            )}`,

            company_files_link: `${
              window.location.origin
            }/sync/company-files?company=${encodeURIComponent(
              formData.companyName
            )}&college=${encodeURIComponent(college)}`,
            coordinator_name: formData.coordinator,
            coordinator_phone: "+91-9876543210",
            job_description: formData.jobDescription || "Not specified",
            job_description_html: formData.jobDescription
              ? `<p><strong>Job Description:</strong><br>${formData.jobDescription}</p>`
              : "<p><strong>Job Description:</strong> Not specified</p>",
            job_files: uploadedFileUrls.length
              ? uploadedFileUrls.map(file => `${file.name}: ${file.url}`).join("\n")
              : fileNames.join(", "),
            job_files_html: jobFilesHTML,
          };

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
      throw new Error("Failed to send emails");
    }
  };

  const handleFinalSubmit = async () => {
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

      // Compute total salary
      const totalSalary =
        (parseFloat(formData.fixedSalary) || 0) +
        (parseFloat(formData.variableSalary) || 0);
      const updatedFormData = { ...formData, salary: totalSalary.toString() };

      const collegesWithTPO = collegesToSubmit.map((college) => ({
        college,
        tpoEmail: getCollegeEmail(college),
      }));

      // Save to database with template fields
      const promises = collegesToSubmit.map((college) => {
        const companyData = {
          ...updatedFormData,
          college,
          tpoEmail: getCollegeEmail(college),
          templateFields: selectedTemplateFields, // ✅ Save selected columns
          jobFiles: uploadedFileUrls, // Store the actual file URLs
          updatedAt: serverTimestamp(),
        };

        // If editing an existing company, update it instead of creating new
        if (company && company.id) {
          // Find the existing company document for this college and update it
          return setDoc(doc(db, "companies", company.id), {
            ...companyData,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } else {
          // Create new company document
          return addDoc(collection(db, "companies"), companyData);
        }
      });

      await Promise.all(promises);

      // Send emails with template fields info
      await sendBulkEmail(collegesWithTPO, selectedTemplateFields);

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
      const specializationArray = Array.isArray(company.specialization)
        ? company.specialization
        : company.specialization
        ? [company.specialization]
        : [];
      
      // Separate standard and custom specializations
      const standardSpecs = specializationArray.filter(spec => 
        specializationOptions[company.course]?.includes(spec) || spec === 'Other'
      );
      const customSpecs = specializationArray.filter(spec => 
        !specializationOptions[company.course]?.includes(spec) && spec !== 'Other'
      );
      
      setFormData((prev) => ({
        ...prev,
        companyName: company.companyName || company.name || "",
        companyWebsite: company.companyUrl || company.companyWebsite || "",
        course: company.course || "",
        specialization: standardSpecs.concat(customSpecs),
        otherSpecializations: customSpecs.join(', '),
        passingYear: company.passingYear || "",
        gender: company.gender || "",
        marksCriteria: company.marksCriteria || "",
        backlogCriteria: company.backlogCriteria || "",
        otherCriteria: company.otherCriteria || "",
        jobType: company.jobType || "",
        jobDesignation: company.jobDesignation || "",
        jobLocation: company.jobLocation || "",
        fixedSalary: company.fixedSalary || "",
        variableSalary: company.variableSalary || "",
        salary: company.salary || "",
        hiringRounds: Array.isArray(company.hiringRounds)
          ? company.hiringRounds
          : company.hiringRounds
          ? [company.hiringRounds]
          : [],
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
      // If company has jobFiles (from DB as array of file objects), set state for display
      if (company.jobFiles && company.jobFiles.length) {
        // Convert stored file objects to a format that can be displayed
        const storedFiles = company.jobFiles.map((file, index) => ({
          name: typeof file === 'string' ? file : (file.name || `File ${index + 1}`),
          url: file.url || null,
          isStored: true // Mark as stored file
        }));
        setJobFiles(storedFiles);
        // Also normalize uploadedFileUrls to ensure consistent object format
        const normalizedUrls = company.jobFiles.map((file, index) => ({
          name: typeof file === 'string' ? file : (file.name || `File ${index + 1}`),
          url: typeof file === 'string' ? null : (file.url || null)
        }));
        setUploadedFileUrls(normalizedUrls);
      }
    } else if (!show) {
      // Reset form when modal closes
      setFormData({
        companyName: "",
        companyWebsite: "",
        course: "",
        specialization: [],
        otherSpecializations: "",
        passingYear: "",
        gender: "",
        marksCriteria: "",
        backlogCriteria: "",
        otherCriteria: "",
        jobType: "",
        jobDesignation: "",
        jobLocation: "",
        fixedSalary: "",
        variableSalary: "",
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
      setJobFiles([]);
      setUploadedFileUrls([]);
      setCurrentStep(1);
      setSelectedColleges([]);
      setFormErrors({});
      setSubmissionError(null);
      setEmailSent(false);
      setSaveStatus(null);
    }
  }, [show, company]);

  useEffect(() => {
    if (show) {
      fetchPlacementUsers();
    }
  }, [show]);

  useEffect(() => {
    fetchFilteredColleges();
  }, [
    formData.course,
    formData.passingYear,
    formData.specialization,
    fetchFilteredColleges,
  ]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-52 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">
            {currentStep === 1
              ? company
                ? "Edit JD Form"
                : "Add JD Form"
              : "Select Colleges"}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        {/* code */}
        {currentStep === 1 ? (
          <>
            <div className="p-6 overflow-y-auto max-h-[calc(100vh-180px)]">
              <AddJDForm
                formData={formData}
                setFormData={setFormData}
                formErrors={formErrors}
                handleFileChange={handleFileChange}
                removeFile={removeFile}
                jobFiles={jobFiles}
                onClose={onClose}
                placementUsers={placementUsers}
                isLoadingUsers={isLoadingUsers}
                fileUploadProgress={fileUploadProgress}
              />
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                >
                  Cancel
                </button>
                {company && (
                  <button
                    onClick={handleSave}
                    disabled={saveStatus === "saving" || saveStatus === "saved" || isUploading()}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saveStatus === "saving"
                      ? "Saving..."
                      : saveStatus === "saved"
                      ? "Saved!"
                      : isUploading()
                      ? "Uploading..."
                      : "Update"}
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={isUploading()}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${
                    isUploading()
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isUploading() ? "Uploading files..." : (company ? "Update & Next" : "Save & Next")}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
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
                onDownloadTemplate={handleDownloadTemplate}
                onUploadExcel={handleUploadExcel}
                selectedTemplateFields={selectedTemplateFields}
                onTemplateFieldsChange={setSelectedTemplateFields}
              />

              {emailSent && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm">
                    ✅ Email sent successfully to all selected colleges!
                  </p>
                </div>
              )}
            </div>

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
                  disabled={
                    selectedColleges.length === 0 ||
                    (selectedColleges.includes("Other") &&
                      otherCollegesInput.trim() === "") ||
                    isSubmitting
                  }
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${
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