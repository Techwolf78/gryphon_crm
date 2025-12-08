import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  DocumentDownloadIcon,
  UploadIcon,
  AcademicCapIcon,
  OfficeBuildingIcon,
  BookOpenIcon,
  InformationCircleIcon,
  ExclamationIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  DocumentIcon,
  ExternalLinkIcon,
  RefreshIcon,
} from "@heroicons/react/outline";
import ExcelUploadModal from "./ExcelUploadModal";
import * as XLSX from "xlsx";
import { db } from "../../../firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

const UploadStudentData = () => {
  const [searchParams] = useSearchParams();
  const [college, setCollege] = useState("");
  const [company, setCompany] = useState("");
  const [course, setCourse] = useState("");
  const [templateFields, setTemplateFields] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [formResponseMessage, setFormResponseMessage] = useState("");
  const [scriptUrl, setScriptUrl] = useState("https://script.google.com/macros/s/AKfycbzVrslbDJJPIMqWV9r8_550XGw1XKDYeqIlnHdK94j11n-kAB2c8w1O0D6yYrlQz9CzIA/exec");
  const [storedFormUrl, setStoredFormUrl] = useState("");
  const [storedEditUrl, setStoredEditUrl] = useState("");
  const [isLoadingForm, setIsLoadingForm] = useState(false);

  // Upload list / job details state
  
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [designation, setDesignation] = useState("");
  const [jobType, setJobType] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [fixedSalary, setFixedSalary] = useState("");
  const [variableSalary, setVariableSalary] = useState("");
  const [totalCTC, setTotalCTC] = useState("");
  const [modeOfInterview, setModeOfInterview] = useState("");
  const [passingYear, setPassingYear] = useState("");
  const [genderEligibility, setGenderEligibility] = useState("");
  const [marksCriteria, setMarksCriteria] = useState("");
  const [backlogCriteria, setBacklogCriteria] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  useEffect(() => {
    try {
      const collegeParam = searchParams.get("college");
      const companyParam = searchParams.get("company");
      const courseParam = searchParams.get("course");
      const fieldsParam = searchParams.get("fields");

      // Basic decoding with error handling
      if (collegeParam) {
        try {
          setCollege(decodeURIComponent(collegeParam));
        } catch {
          setCollege(collegeParam); // Use raw value if decoding fails
        }
      }

      if (companyParam) {
        try {
          setCompany(decodeURIComponent(companyParam));
        } catch {
          setCompany(companyParam);
        }
      }

      if (courseParam) {
        try {
          setCourse(decodeURIComponent(courseParam));
        } catch {
          setCourse(courseParam);
        }
      }

      // ✅ FIX: Safely decode JSON fields
      if (fieldsParam) {
        try {
          // First decode the URI component
          const decodedFields = decodeURIComponent(fieldsParam);
          // Then parse JSON
          const fields = JSON.parse(decodedFields);
          setTemplateFields(fields);
        } catch (error) {
          console.error("Error parsing template fields:", error);
          // Try alternative parsing
          try {
            // Remove any extra encoding
            const cleanFields = fieldsParam
              .replace(/\\"/g, '"')
              .replace(/\\u0022/g, '"');
            const fields = JSON.parse(cleanFields);
            setTemplateFields(fields);
          } catch (e) {
            console.error("Alternative parsing also failed:", e);
            // Set default fields
            setTemplateFields([
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
          }
        }
      }

      // Read job details with safe decoding
      const decodeSafe = (param) => {
        if (!param) return "";
        try {
          return decodeURIComponent(param);
        } catch {
          return param.replace(/%20/g, " ").replace(/%25/g, "%");
        }
      };

      setCompanyWebsite(decodeSafe(searchParams.get("companyWebsite")));      
      setDesignation(decodeSafe(searchParams.get("designation")));
      setJobType(decodeSafe(searchParams.get("jobType")));
      setJobLocation(decodeSafe(searchParams.get("jobLocation")));
      setFixedSalary(decodeSafe(searchParams.get("fixedSalary")));
      setVariableSalary(decodeSafe(searchParams.get("variableSalary")));
      setTotalCTC(decodeSafe(searchParams.get("totalCTC")));
      setModeOfInterview(decodeSafe(searchParams.get("modeOfInterview")));
      setPassingYear(decodeSafe(searchParams.get("passingYear")));
      setGenderEligibility(decodeSafe(searchParams.get("genderEligibility")));
      setMarksCriteria(decodeSafe(searchParams.get("marksCriteria")));
      setBacklogCriteria(decodeSafe(searchParams.get("backlogCriteria")));
      setJobDescription(decodeSafe(searchParams.get("jobDescription")));
    } catch (error) {
      console.error("Error processing URL parameters:", error);
      // Set default values
      setTemplateFields([
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
    }
  }, [searchParams]);

  // Field labels mapping
  const fieldLabels = {
    studentName: "STUDENT NAME",
    enrollmentNo: "ENROLLMENT NUMBER",
    email: "EMAIL",
    phone: "PHONE NUMBER",
    course: "COURSE",
    specialization: "SPECIALIZATION",
    currentYear: "CURRENT YEAR",
    tenthMarks: "10TH MARKS %",
    twelfthMarks: "12TH MARKS %",
    diplomaMarks: "DIPLOMA MARKS %",
    cgpa: "CGPA",
    activeBacklogs: "ACTIVE BACKLOGS",
    totalBacklogs: "TOTAL BACKLOGS",
    gender: "GENDER",
    resumeLink: "RESUME LINK",
  };

  const downloadTemplate = () => {
    try {
      let templateData = [];

      if (templateFields && templateFields.length > 0) {
        const headers = templateFields.map(
          (field) => fieldLabels[field] || field.toUpperCase()
        );
        templateData = [headers];
      } else if (course?.includes("MBA") || course?.includes("PGDM")) {
        templateData = [
          [
            "STUDENT NAME",
            "EMAIL",
            "PHONE NUMBER",
            "GENDER",
            "DATE OF BIRTH",
            "CATEGORY",
            "10TH SCHOOL NAME",
            "10TH BOARD",
            "10TH PASSING YEAR",
            "10TH MARKS %",
            "12TH SCHOOL NAME",
            "12TH BOARD",
            "12TH PASSING YEAR",
            "12TH MARKS %",
            "12TH STREAM",
            "GRADUATION COURSE",
            "GRADUATION SPECIALIZATION",
            "GRADUATION COLLEGE",
            "GRADUATION UNIVERSITY",
            "GRADUATION PASSING YEAR",
            "GRADUATION MARKS %",
          ],
        ];
      } else if (course?.includes("MCA") || course?.includes("MSC")) {
        templateData = [
          [
            "STUDENT NAME",
            "EMAIL",
            "PHONE NUMBER",
            "GENDER",
            "DATE OF BIRTH",
            "CATEGORY",
            "10TH SCHOOL NAME",
            "10TH BOARD",
            "10TH PASSING YEAR",
            "10TH MARKS %",
            "12TH SCHOOL NAME",
            "12TH BOARD",
            "12TH PASSING YEAR",
            "12TH MARKS %",
            "12TH STREAM",
            "GRADUATION COURSE",
            "GRADUATION SPECIALIZATION",
            "GRADUATION COLLEGE",
            "GRADUATION UNIVERSITY",
            "GRADUATION PASSING YEAR",
            "GRADUATION MARKS %",
            "PROGRAMMING LANGUAGES KNOWN",
            "INTERNSHIP DETAILS",
          ],
        ];
      } else if (
        course?.includes("B.Tech") ||
        course?.includes("BE") ||
        course?.includes("Engineering")
      ) {
        templateData = [
          [
            "STUDENT NAME",
            "EMAIL",
            "PHONE NUMBER",
            "GENDER",
            "DATE OF BIRTH",
            "CATEGORY",
            "10TH SCHOOL NAME",
            "10TH BOARD",
            "10TH PASSING YEAR",
            "10TH MARKS %",
            "12TH SCHOOL NAME",
            "12TH BOARD",
            "12TH PASSING YEAR",
            "12TH MARKS %",
            "12TH STREAM",
            "DIPLOMA COURSE",
            "DIPLOMA SPECIALIZATION",
            "DIPLOMA COLLEGE",
            "DIPLOMA UNIVERSITY",
            "DIPLOMA PASSING YEAR",
            "DIPLOMA MARKS %",
          ],
        ];
      } else if (course?.includes("Diploma")) {
        templateData = [
          [
            "STUDENT NAME",
            "EMAIL",
            "PHONE NUMBER",
            "GENDER",
            "DATE OF BIRTH",
            "CATEGORY",
            "10TH SCHOOL NAME",
            "10TH BOARD",
            "10TH PASSING YEAR",
            "10TH MARKS %",
            "12TH SCHOOL NAME",
            "12TH BOARD",
            "12TH PASSING YEAR",
            "12TH MARKS %",
            "12TH STREAM",
            "ROLE APPLIED FOR",
          ],
        ];
      } else {
        templateData = [
          [
            "STUDENT NAME",
            "EMAIL",
            "PHONE NUMBER",
            "GENDER",
            "DATE OF BIRTH",
            "CATEGORY",
            "10TH SCHOOL NAME",
            "10TH BOARD",
            "10TH PASSING YEAR",
            "10TH MARKS %",
            "12TH SCHOOL NAME",
            "12TH BOARD",
            "12TH PASSING YEAR",
            "12TH MARKS %",
            "12TH STREAM",
            "ROLE APPLIED FOR",
          ],
        ];
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, ws, "Student Data");
      // Build a safe filename (fall back to generic names if missing)
      const rawName = `${company || "Company"}_${
        college || "College"
      }_Student_Template.xlsx`;
      const fileName = rawName.replace(/\s+/g, "_").replace(/[^\w\-.]/g, "");
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Error downloading template:", error);
      alert("Error downloading template. Please try again.");
    }
  };

  const handleCreateGoogleForm = () => {
    if (templateFields.length === 0) {
      alert("No template fields available. Please check the form configuration.");
      return;
    }

    if (!scriptUrl.trim()) {
      alert("Please configure your Apps Script URL");
      return;
    }

    setIsCreatingForm(true);
    setFormResponseMessage("");

    // Prepare questions from template fields
    const questions = templateFields.map((field) => ({
      title: fieldLabels[field] || field,
      type: "text",
      options: [],
      required: true,
    }));

    // Prepare form data
    const formData = {
      title: `${company || "Company"} - ${college || "College"} Student Data Form`,
      description: `Student data submission form for ${designation || "Position"} at ${company || "Company"}. All fields are required.`,
      questions: questions,
    };

    // Create unique callback name
    const callbackName = "jsonp_callback_" + Date.now();

    // Clean URL (remove any existing query parameters)
    let cleanScriptUrl = scriptUrl.split("?")[0];

    // Encode data as URL parameter
    const encodedData = encodeURIComponent(JSON.stringify(formData));
    const url = `${cleanScriptUrl}?data=${encodedData}&callback=${callbackName}`;

    // Create script element
    const script = document.createElement("script");
    script.src = url;

    // Define the callback function
    window[callbackName] = (response) => {
      // Clean up
      document.head.removeChild(script);
      delete window[callbackName];

      setIsCreatingForm(false);

      if (response.success) {
        const message = `✅ Google Form Created Successfully!\n\n📋 Form Title: ${formData.title}\n🔗 Form URL: ${response.formUrl}\n✏️ Edit URL: ${response.editUrl}`;
        setFormResponseMessage(message);

        // Open form in new tab
        window.open(response.formUrl, "_blank");

        // Copy form URL to clipboard
        navigator.clipboard
          .writeText(response.formUrl)
          .then(() => {
            console.log("Form URL copied to clipboard");
          })
          .catch((err) => {
            console.error("Failed to copy URL: ", err);
          });
      } else {
        setFormResponseMessage(
          `❌ Error: ${response.error || "Failed to create form"}`
        );
      }
    };

    // Set timeout for error handling
    setTimeout(() => {
      if (window[callbackName]) {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
        delete window[callbackName];
        setIsCreatingForm(false);
        setFormResponseMessage(
          "❌ Request timed out. Please check your Apps Script URL and try again."
        );
      }
    }, 30000); // 30 second timeout

    // Error handling
    script.onerror = () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      if (window[callbackName]) delete window[callbackName];
      setIsCreatingForm(false);
      setFormResponseMessage(
        "❌ Failed to connect to Apps Script. Please check your URL and internet connection."
      );
    };

    // Add script to page
    document.head.appendChild(script);
  };

  // Generate document ID from company and college
  const generateFormDocId = () => {
    const companySlug = (company || "company").toLowerCase().replace(/\s+/g, "_");
    const collegeSlug = (college || "college").toLowerCase().replace(/\s+/g, "_");
    return `form_${companySlug}_${collegeSlug}`;
  };

  // Save form URLs to Firestore
  const saveFormToFirebase = async (formUrl, editUrl) => {
    try {
      const docId = generateFormDocId();
      const docRef = doc(db, "PlacementForms", docId);

      await setDoc(docRef, {
        company,
        college,
        course,
        formUrl,
        editUrl,
        templateFields,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setStoredFormUrl(formUrl);
      setStoredEditUrl(editUrl);
      return true;
    } catch (error) {
      console.error("Error saving form to Firebase:", error);
      throw error;
    }
  };

  // Retrieve form URLs from Firestore
  const fetchFormFromFirebase = async () => {
    try {
      setIsLoadingForm(true);
      const docId = generateFormDocId();
      const docRef = doc(db, "PlacementForms", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoredFormUrl(data.formUrl);
        setStoredEditUrl(data.editUrl);
        return data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching form from Firebase:", error);
      return null;
    } finally {
      setIsLoadingForm(false);
    }
  };

  // Check for stored form on component mount
  useEffect(() => {
    if (college && company) {
      fetchFormFromFirebase();
    }
  }, [college, company]);

  // Update handleCreateGoogleForm to save to Firebase after success
  const handleCreateGoogleFormWithStorage = () => {
    if (templateFields.length === 0) {
      alert("No template fields available. Please check the form configuration.");
      return;
    }

    if (!scriptUrl.trim()) {
      alert("Please configure your Apps Script URL");
      return;
    }

    setIsCreatingForm(true);
    setFormResponseMessage("");

    // Prepare questions from template fields
    const questions = templateFields.map((field) => ({
      title: fieldLabels[field] || field,
      type: "text",
      options: [],
      required: true,
    }));

    // Prepare form data
    const formData = {
      title: `${company || "Company"} - ${college || "College"} Student Data Form`,
      description: `Student data submission form for ${designation || "Position"} at ${company || "Company"}. All fields are required.`,
      questions: questions,
    };

    // Create unique callback name
    const callbackName = "jsonp_callback_" + Date.now();

    // Clean URL (remove any existing query parameters)
    let cleanScriptUrl = scriptUrl.split("?")[0];

    // Encode data as URL parameter
    const encodedData = encodeURIComponent(JSON.stringify(formData));
    const url = `${cleanScriptUrl}?data=${encodedData}&callback=${callbackName}`;

    // Create script element
    const script = document.createElement("script");
    script.src = url;

    // Define the callback function
    window[callbackName] = async (response) => {
      // Clean up
      document.head.removeChild(script);
      delete window[callbackName];

      setIsCreatingForm(false);

      if (response.success) {
        try {
          // Save to Firebase
          await saveFormToFirebase(response.formUrl, response.editUrl);

          const message = `✅ Google Form Created Successfully!\n\n📋 Form Title: ${formData.title}\n🔗 Form URL: ${response.formUrl}\n✏️ Edit URL: ${response.editUrl}\n\n💾 Saved to database`;
          setFormResponseMessage(message);

          // Open form in new tab
          window.open(response.formUrl, "_blank");

          // Copy form URL to clipboard
          navigator.clipboard
            .writeText(response.formUrl)
            .then(() => {
              console.log("Form URL copied to clipboard");
            })
            .catch((err) => {
              console.error("Failed to copy URL: ", err);
            });
        } catch (error) {
          const message = `✅ Google Form Created Successfully!\n\n📋 Form Title: ${formData.title}\n🔗 Form URL: ${response.formUrl}\n✏️ Edit URL: ${response.editUrl}\n\n⚠️ Note: Could not save to database`;
          setFormResponseMessage(message);
          console.error("Error saving to Firebase:", error);
        }
      } else {
        setFormResponseMessage(
          `❌ Error: ${response.error || "Failed to create form"}`
        );
      }
    };

    // Set timeout for error handling
    setTimeout(() => {
      if (window[callbackName]) {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
        delete window[callbackName];
        setIsCreatingForm(false);
        setFormResponseMessage(
          "❌ Request timed out. Please check your Apps Script URL and try again."
        );
      }
    }, 30000); // 30 second timeout

    // Error handling
    script.onerror = () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      if (window[callbackName]) delete window[callbackName];
      setIsCreatingForm(false);
      setFormResponseMessage(
        "❌ Failed to connect to Apps Script. Please check your URL and internet connection."
      );
    };

    // Add script to page
    document.head.appendChild(script);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
            <h1 className="text-3xl font-bold mb-4">
              Student Data Submission Portal
            </h1>
            <p className="text-blue-100 mb-6">
              Upload student information for placement process
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center">
                  <AcademicCapIcon className="h-6 w-6 mr-3" />
                  <div>
                    <p className="text-sm text-blue-100">College</p>
                    <p className="font-semibold truncate">
                      {college || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center">
                  <OfficeBuildingIcon className="h-6 w-6 mr-3" />
                  <div>
                    <p className="text-sm text-blue-100">Company</p>
                    <p className="font-semibold truncate">
                      {company || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center">
                  <BookOpenIcon className="h-6 w-6 mr-3" />
                  <div>
                    <p className="text-sm text-blue-100">Course</p>
                    <p className="font-semibold truncate">
                      {course || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Details Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <InformationCircleIcon className="h-6 w-6 mr-2 text-blue-500" />
                Job & Company Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">
                    Company Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Company Name</span>
                      <span className="font-medium">
                        {company || "Not specified"}
                      </span>
                    </div>

                    {/* Only show if website exists */}
                    {companyWebsite && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Website</span>
                        <a
                          href={
                            companyWebsite.startsWith("http")
                              ? companyWebsite
                              : `https://${companyWebsite}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {companyWebsite
                            .replace("https://", "")
                            .replace("http://", "")}
                        </a>
                      </div>
                    )}

                    {/* Only show if designation exists */}
                    {designation && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Designation</span>
                        <span className="font-medium">{designation}</span>
                      </div>
                    )}

                    {/* Only show if job type exists */}
                    {jobType && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Job Type</span>
                        <span className="font-medium">{jobType}</span>
                      </div>
                    )}

                    {/* Only show if job location exists */}
                    {jobLocation && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Job Location</span>
                        <span className="font-medium">{jobLocation}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">
                    Compensation Details
                  </h3>
                  <div className="space-y-3">
                    {/* Only show if fixed salary exists */}
                    {fixedSalary && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Fixed Salary</span>
                        <span className="font-medium text-green-600">
                          {fixedSalary}
                        </span>
                      </div>
                    )}

                    {/* Only show if variable salary exists */}
                    {variableSalary && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Variable Salary</span>
                        <span className="font-medium text-green-600">
                          {variableSalary}
                        </span>
                      </div>
                    )}

                    {/* Only show if total CTC exists */}
                    {totalCTC && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Total CTC</span>
                        <span className="font-bold text-green-700">
                          {totalCTC}
                        </span>
                      </div>
                    )}

                    {/* Only show if interview mode exists */}
                    {modeOfInterview && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Interview Mode</span>
                        <span className="font-medium">{modeOfInterview}</span>
                      </div>
                    )}

                    {/* Only show if passing year exists */}
                    {passingYear && (
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Passing Year</span>
                        <span className="font-medium">{passingYear}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Description - Only show if exists */}
              {jobDescription && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold text-gray-700 mb-3">
                    Job Description
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{jobDescription}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Eligibility Criteria Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Eligibility Criteria
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Course - Always show */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Course</p>
                  <p className="font-semibold">{course || "Not specified"}</p>
                </div>

                {/* Gender Eligibility - Only show if exists */}
                {genderEligibility && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Gender Eligibility</p>
                    <p className="font-semibold">{genderEligibility}</p>
                  </div>
                )}

                {/* Marks Criteria - Only show if exists */}
                {marksCriteria && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Marks Criteria</p>
                    <p className="font-semibold">{marksCriteria}</p>
                  </div>
                )}

                {/* Backlog Criteria - Only show if exists */}
                {backlogCriteria && (
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Backlog Criteria</p>
                    <p className="font-semibold">{backlogCriteria}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Upload Process */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                Quick Actions
              </h2>

              <div className="space-y-6">
                <button
                  onClick={downloadTemplate}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-md transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex items-center">
                    <DocumentDownloadIcon className="h-6 w-6 mr-3" />
                    <div className="text-left">
                      <p className="font-semibold">Download Template</p>
                      <p className="text-sm text-blue-100">Excel format</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5" />
                </button>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl shadow-md transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex items-center">
                    <UploadIcon className="h-6 w-6 mr-3" />
                    <div className="text-left">
                      <p className="font-semibold">Upload Data</p>
                      <p className="text-sm text-green-100">
                        Submit student list
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5" />
                </button>

                {/* Show Form URL if available, otherwise show Generate button */}
                {storedFormUrl ? (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(storedFormUrl);
                      alert("Form URL copied to clipboard!");
                    }}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-md transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <ExternalLinkIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="font-semibold">Copy Form Link</p>
                        <p className="text-sm text-blue-100 truncate">
                          {storedFormUrl.substring(0, 50)}...
                        </p>
                      </div>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 flex-shrink-0 ml-2" />
                  </button>
                ) : (
                  <button
                    onClick={handleCreateGoogleFormWithStorage}
                    disabled={isCreatingForm || templateFields.length === 0}
                    className={`w-full flex items-center justify-between p-4 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg ${
                      isCreatingForm || templateFields.length === 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                    }`}
                  >
                    <div className="flex items-center">
                      <DocumentIcon className="h-6 w-6 mr-3" />
                      <div className="text-left">
                        <p className="font-semibold">
                          {isCreatingForm ? "Creating Form..." : "Generate Google Form"}
                        </p>
                        <p className={`text-sm ${isCreatingForm || templateFields.length === 0 ? "text-gray-500" : "text-orange-100"}`}>
                          {templateFields.length === 0
                            ? "No template fields"
                            : `${templateFields.length} questions`}
                        </p>
                      </div>
                    </div>
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Stored Form URLs - Show if available */}
              {storedFormUrl && storedEditUrl && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center mb-4">
                    <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
                    <h3 className="font-semibold text-green-800">
                      Google Form Already Created
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Form URL</p>
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={storedFormUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline truncate flex-1"
                        >
                          {storedFormUrl}
                        </a>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(storedFormUrl)
                          }
                          className="text-gray-500 hover:text-gray-700 flex-shrink-0"
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Edit URL</p>
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={storedEditUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline truncate flex-1"
                        >
                          {storedEditUrl}
                        </a>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(storedEditUrl)
                          }
                          className="text-gray-500 hover:text-gray-700 flex-shrink-0"
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => window.open(storedFormUrl, "_blank")}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                        Open Form
                      </button>
                      <button
                        onClick={() => window.open(storedEditUrl, "_blank")}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                        Edit Form
                      </button>
                      <button
                        onClick={() => fetchFormFromFirebase()}
                        disabled={isLoadingForm}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Response Message */}
              {formResponseMessage && (
                <div className={`mt-4 p-4 rounded-lg ${
                  formResponseMessage.includes("✅")
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}>
                  {formResponseMessage.split("\n").map((line, index) => (
                    <p
                      key={index}
                      className={`text-sm ${
                        formResponseMessage.includes("✅")
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600 text-center">
                  Need help?{" "}
                  <Link
                    to="/"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Contact Support
                  </Link>
                </p>
              </div>
            </div>

            {/* Instructions Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Instructions
              </h2>

              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700">
                      Download Template
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Get the Excel template with required columns
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700">
                      Fill Student Data
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Enter accurate student information
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-purple-600 font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700">Upload File</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Submit the completed Excel file
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes Card */}
          </div>
        </div>

        {/* Template Details Card (Full Width) */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Template Information
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                templateFields.length > 0
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {templateFields.length > 0
                ? "Custom Template"
                : "Standard Template"}
            </span>
          </div>

          <div className="bg-gray-50 rounded-xl p-6">
            {templateFields.length > 0 ? (
              <div>
                <p className="text-gray-700 mb-4">
                  Your custom template includes{" "}
                  <strong>{templateFields.length} specific columns</strong> as
                  requested:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {templateFields.map((field, index) => (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        Column {index + 1}
                      </div>
                      <div
                        className="font-medium text-sm truncate"
                        title={fieldLabels[field] || field}
                      >
                        {fieldLabels[field] || field}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-700 mb-4">
                  The template includes all necessary columns for student data
                  submission:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Basic Information
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Student Name</li>
                      <li>• Email</li>
                      <li>• Phone Number</li>
                      <li>• Gender</li>
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Academic Details
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 10th Details</li>
                      <li>• 12th Details</li>
                      <li>• Course Specific Fields</li>
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Additional Information
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Category</li>
                      <li>• Date of Birth</li>
                      <li>• Special Fields</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Backdrop and Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowUploadModal(false)}
          />

          <div className="relative z-50 w-full max-w-2xl">
            <ExcelUploadModal
              show={showUploadModal}
              onClose={() => setShowUploadModal(false)}
              college={college}
              companyName={company}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadStudentData;