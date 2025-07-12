import React, { useState, useEffect } from "react";
import { XIcon, EyeIcon } from "@heroicons/react/outline";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";

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

  const specializationOptions = {
    Engineering: [
      "CS",
      "IT",
      "ENTC",
      "CS-Cyber Security",
      "Mechanical",
      "Civil",
      "Electrical",
      "Chemical",
      "CS-AI-ML",
      "CS-AI-DS",
      "Other",
    ],
    MBA: [
      "Marketing",
      "Finance",
      "HR",
      "Operations",
      "Supply Chain",
      "Business Analyst",
      "Other",
    ],
    BBA: [
      "Marketing",
      "Finance",
      "HR",
      "Operations",
      "Supply Chain",
      "Business Analyst",
      "Other",
    ],
    BCA: ["Computer Applications", "Other"],
    MCA: ["Computer Science", "Other"],
    Diploma: ["Mechanical", "Civil", "Electrical", "Computer", "Other"],
    BSC: ["Physics", "Chemistry", "Mathematics", "CS", "Other"],
    MSC: ["Physics", "Chemistry", "Mathematics", "CS", "Other"],
    Other: ["Other"],
  };

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSpecializationChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      if (checked) {
        return { ...prev, specialization: [...prev.specialization, value] };
      } else {
        return { ...prev, specialization: prev.specialization.filter(item => item !== value) };
      }
    });
  };

  const handleFileChange = (e) => {
    setJobFiles([...e.target.files]);
  };

  const handleSubmit = () => {
    if (!validateStep1()) return;
    setCurrentStep(2);
  };

  const handleCollegeSelection = (college) => {
    if (selectedColleges.includes(college)) {
      setSelectedColleges(selectedColleges.filter(c => c !== college));
    } else {
      setSelectedColleges([...selectedColleges, college]);
    }
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
        console.log(`No training form found for college: ${college}`);
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
      console.error(`Error fetching students for ${college}:`, error);
      setStudentsData(prev => ({ ...prev, [college]: [] }));
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const viewStudents = (college) => {
    setViewingCollege(college);
    
    // Fetch students if not already fetched
    if (!studentsData[college]) {
      fetchStudentsForCollege(college);
    }
  };

  const closeStudentView = () => {
    setViewingCollege(null);
  };

  const sendEmail = () => {
    const emailSubject = `Job Opportunity: ${formData.companyName}`;
    
    let emailBody = `
      <h2>Job Opportunity Details</h2>
      <p><strong>Company Name:</strong> ${formData.companyName}</p>
      <p><strong>Website:</strong> ${formData.companyWebsite || 'N/A'}</p>
      
      <h3>Eligibility Criteria</h3>
      <p><strong>Course:</strong> ${formData.course}</p>
      <p><strong>Specialization:</strong> ${formData.specialization.join(', ')}</p>
      <p><strong>Passing Year:</strong> ${formData.passingYear}</p>
      <p><strong>Marks Criteria:</strong> ${formData.marksCriteria}</p>
      
      <h3>Job Details</h3>
      <p><strong>Job Type:</strong> ${formData.jobType}</p>
      <p><strong>Designation:</strong> ${formData.jobDesignation || 'N/A'}</p>
      <p><strong>Location:</strong> ${formData.jobLocation || 'N/A'}</p>
      <p><strong>Salary:</strong> ${formData.salary || 'N/A'}</p>
      ${formData.internshipDuration ? `<p><strong>Internship Duration:</strong> ${formData.internshipDuration}</p>` : ''}
      ${formData.stipend ? `<p><strong>Stipend:</strong> ${formData.stipend}</p>` : ''}
      
      <h3>Additional Information</h3>
      <p><strong>Mode of Interview:</strong> ${formData.modeOfInterview || 'N/A'}</p>
      <p><strong>Joining Period:</strong> ${formData.joiningPeriod || 'N/A'}</p>
      <p><strong>Mode of Work:</strong> ${formData.modeOfWork || 'N/A'}</p>
      
      ${formData.jobDescription ? `
      <h3>Job Description</h3>
      <p>${formData.jobDescription.replace(/\n/g, '<br>')}</p>
      ` : ''}
      
      <p><strong>Coordinator:</strong> ${formData.coordinator}</p>
      <p><strong>Colleges Selected:</strong> ${selectedColleges.join(', ')}</p>
    `;

    const mailtoLink = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    try {
      window.location.href = mailtoLink;
    } catch (e) {
      console.error("Error opening email client:", e);
      const emailWindow = window.open("", "_blank");
      emailWindow.document.write(`
        <html>
          <head>
            <title>${emailSubject}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
              h2, h3 { color: #2c3e50; }
              strong { color: #34495e; }
            </style>
          </head>
          <body>
            ${emailBody}
            <p><button onclick="window.close()">Close</button></p>
          </body>
        </html>
      `);
    }
  };

  const handleFinalSubmit = async () => {
    if (selectedColleges.length === 0) {
      alert("Please select at least one college");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const promises = selectedColleges.map(college => {
        const companyData = {
          ...formData,
          college,
          jobFiles: jobFiles.map(file => file.name),
          updatedAt: serverTimestamp()
        };
        return addDoc(collection(db, "companies"), companyData);
      });

      await Promise.all(promises);
      sendEmail();
      onClose();
    } catch (error) {
      console.error("Error adding documents: ", error);
      alert("Error submitting JD. Please try again.");
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
            console.error('Invalid passing year:', formData.passingYear);
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
          let totalDocs = 0;

          for (const q of queries) {
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
              totalDocs++;
              const data = doc.data();
              const collegeName = data.collegeName || data.college || doc.id.split("-")[0];
              if (collegeName) {
                colleges.add(collegeName);
              }
            });
          }

          const finalColleges = Array.from(colleges)
            .concat(["Other", "Multiple"])
            .sort();
          
          setAvailableColleges(finalColleges);

        } catch (error) {
          console.error('[ERROR] Fetch failed:', error);
          setAvailableColleges(["Other", "Multiple"]);
        }
      } else {
        setAvailableColleges(["Other", "Multiple"]);
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Info */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="e.g. Acme Corporation"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.companyName ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {formErrors.companyName && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  {formErrors.companyName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.companyName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Website
                  </label>
                  <input
                    type="text"
                    name="companyWebsite"
                    value={formData.companyWebsite}
                    onChange={handleChange}
                    placeholder="e.g. https://company.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>

                <div className="col-span-2">
                  <h3 className="text-lg font-semibold text-blue-700 mt-4">Eligibility<span className="text-red-500 ml-1">*</span></h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course/Degree<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="course"
                      value={formData.course}
                      onChange={(e) => {
                        setFormData({ ...formData, course: e.target.value, specialization: [] });
                      }}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white ${
                        formErrors.course ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select Course</option>
                      <option>Engineering</option>
                      <option>MBA</option>
                      <option>BBA</option>
                      <option>BCA</option>
                      <option>MCA</option>
                      <option>BSC</option>
                      <option>MSC</option>
                      <option>Diploma</option>
                      <option>Others</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    {formErrors.course && (
                      <div className="absolute inset-y-0 right-7 pr-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  {formErrors.course && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.course}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization(s)<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className={`p-2 border rounded-lg bg-gray-50 ${
                    formErrors.specialization ? "border-red-500" : "border-gray-300"
                  }`}>
                    {formData.course ? (
                      <div className="flex flex-wrap gap-4">
                        {specializationOptions[formData.course]?.map((spec) => (
                          <div key={spec} className="flex items-center">
                            <input
                              type="checkbox"
                              id={spec}
                              value={spec}
                              checked={formData.specialization.includes(spec)}
                              onChange={handleSpecializationChange}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={spec} className="ml-2 text-sm text-gray-700">
                              {spec}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Select a course first</p>
                    )}
                  </div>
                  {formErrors.specialization && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.specialization}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Passing Year<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="passingYear"
                      value={formData.passingYear}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white ${
                        formErrors.passingYear ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select Year</option>
                      {[2022,2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032,2034].map((yr) => (
                        <option key={yr}>{yr}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    {formErrors.passingYear && (
                      <div className="absolute inset-y-0 right-7 pr-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  {formErrors.passingYear && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.passingYear}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white ${
                        formErrors.gender ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select Gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Male/Female</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    {formErrors.gender && (
                      <div className="absolute inset-y-0 right-7 pr-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  {formErrors.gender && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.gender}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marks Criteria<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="marksCriteria"
                      value={formData.marksCriteria}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white ${
                        formErrors.marksCriteria ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select Criteria</option>
                      <option>No Criteria</option>
                      <option>50% & Above Throughout</option>
                      <option>55% & Above Throughout</option>
                      <option>60% & Above Throughout</option>
                      <option>65% & Above Throughout</option>
                      <option>70% & Above Throughout</option>
                      <option>75% & Above Throughout</option>
                      <option>80% & Above Throughout</option>
                      <option>85% & Above Throughout</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    {formErrors.marksCriteria && (
                      <div className="absolute inset-y-0 right-7 pr-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  {formErrors.marksCriteria && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.marksCriteria}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Backlog Criteria
                  </label>
                  <div className="relative">
                    <select
                      name="backlogCriteria"
                      value={formData.backlogCriteria}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    >
                      <option value="">Select Criteria</option>
                      <option>No Criteria</option>
                      <option>No Active Backlog</option>
                      <option>No History of Backlog</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <h3 className="text-lg font-semibold text-blue-700 mt-4">Job Details<span className="text-red-500 ml-1">*</span></h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Type<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="jobType"
                      value={formData.jobType}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white ${
                        formErrors.jobType ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select Type</option>
                      <option>Internship</option>
                      <option>Int + PPO</option>
                      <option>Full Time</option>
                      <option>Training + FT</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    {formErrors.jobType && (
                      <div className="absolute inset-y-0 right-7 pr-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  {formErrors.jobType && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.jobType}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Designation
                  </label>
                  <input
                    type="text"
                    name="jobDesignation"
                    value={formData.jobDesignation}
                    onChange={handleChange}
                    placeholder="e.g. Software Engineer"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Location
                  </label>
                  <input
                    type="text"
                    name="jobLocation"
                    value={formData.jobLocation}
                    onChange={handleChange}
                    placeholder="e.g. Bangalore"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary (CTC)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span>
                    </div>
                    <input
                      type="text"
                      name="salary"
                      value={formData.salary}
                      onChange={handleChange}
                      placeholder="e.g. 500000"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internship/Training Duration
                  </label>
                  <input
                    type="text"
                    name="internshipDuration"
                    value={formData.internshipDuration}
                    onChange={handleChange}
                    placeholder="e.g. 6 months"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stipend
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span>
                    </div>
                    <input
                      type="text"
                      name="stipend"
                      value={formData.stipend}
                      onChange={handleChange}
                      placeholder="e.g. 15000"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode of Interview
                  </label>
                  <div className="relative">
                    <select
                      name="modeOfInterview"
                      value={formData.modeOfInterview}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    >
                      <option value="">Select Mode</option>
                      <option>Online</option>
                      <option>Offline</option>
                      <option>Online/Offline</option>
                      <option>Campus Drive </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Joining Period
                  </label>
                  <input
                    type="text"
                    name="joiningPeriod"
                    value={formData.joiningPeriod}
                    onChange={handleChange}
                    placeholder="e.g. MM/YYYY"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Open Date (dd/mm/yyyy)<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="companyOpenDate"
                      value={formData.companyOpenDate}
                      onChange={handleChange}
                      placeholder="e.g. 15/08/2025"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.companyOpenDate ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {formErrors.companyOpenDate && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  {formErrors.companyOpenDate && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.companyOpenDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode of Work
                  </label>
                  <div className="relative">
                    <select
                      name="modeOfWork"
                      value={formData.modeOfWork}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    >
                      <option value="">Select Mode</option>
                      <option>Work From Office</option>
                      <option>Work From Home</option>
                      <option>Hybrid</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Description
                  </label>
                  <textarea
                    name="jobDescription"
                    value={formData.jobDescription}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Enter job description details..."
                  ></textarea>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Job Files (JD, PPT, etc.)
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>

                <div className="col-span-2">
                  <h3 className="text-lg font-semibold text-blue-700 mt-4">Internal Use Only<span className="text-red-500 ml-1">*</span></h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                      placeholder="e.g. LinkedIn, Referral, etc."
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.source ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {formErrors.source && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  {formErrors.source && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.source}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coordinator<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="coordinator"
                      value={formData.coordinator}
                      onChange={handleChange}
                      placeholder="e.g. John Doe"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.coordinator ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {formErrors.coordinator && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  {formErrors.coordinator && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.coordinator}</p>
                  )}
                </div>
              </div>
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
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Select colleges to send this JD to:</h3>
                <p className="text-sm text-gray-600">
                  Showing colleges for {formData.course || "selected course"} with passing year {formData.passingYear || "selected year"}
                </p>
              </div>

              {availableColleges.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                    {availableColleges.map((college) => (
                      <div key={college} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={college}
                            checked={selectedColleges.includes(college)}
                            onChange={() => handleCollegeSelection(college)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={college} className="ml-2 text-sm text-gray-700">
                            {college}
                          </label>
                        </div>
                        <button
                          onClick={() => viewStudents(college)}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Students
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Other College Input */}
                  {selectedColleges.includes("Other") && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enter other college names (separate multiple with commas)
                      </label>
                      <textarea
                        value={formData.otherColleges || ""}
                        onChange={(e) => {
                          const otherColleges = e.target.value;
                          setFormData({...formData, otherColleges});
                          
                          if (otherColleges.trim()) {
                            const collegesToAdd = otherColleges
                              .split(",")
                              .map(college => college.trim())
                              .filter(college => college.length > 0);
                            
                            setSelectedColleges(prev => [
                              ...prev.filter(c => c !== "Other"),
                              ...collegesToAdd
                            ]);
                          }
                        }}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="e.g. ABC College, XYZ University"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {formData.otherColleges?.split(",").filter(c => c.trim()).length || 0} 
                        colleges added
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-gray-500">
                    No colleges found for {formData.course} course with passing year {formData.passingYear}.
                    You can still select "Other" or "Multiple" options.
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
                <button
                  onClick={handleFinalSubmit}
                  disabled={selectedColleges.length === 0 || isSubmitting}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${
                    selectedColleges.length === 0 || isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : `Submit to ${selectedColleges.length} college(s)`}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Student Data Modal */}
        {viewingCollege && (
          <div className="fixed inset-0 z-60 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">
                  Students at {viewingCollege}
                </h2>
                <button
                  onClick={closeStudentView}
                  className="text-white hover:text-gray-200 focus:outline-none"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-grow">
                {isLoadingStudents ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    {studentsData[viewingCollege]?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Phone
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Specialization
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {studentsData[viewingCollege].map((student) => (
                              <tr key={student.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {student.accountName || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {student.accountEmail || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {student.accountPhone || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {student.specialization || 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          No student data found for {viewingCollege}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button
                  onClick={closeStudentView}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddJD;