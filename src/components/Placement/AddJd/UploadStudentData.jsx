import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import ExcelUploadModal from "./ExcelUploadModal";
import HeaderSection from "./HeaderSection";
import JobDetailsCard from "./JobDetailsCard";
import EligibilityCriteriaCard from "./EligibilityCriteriaCard";
import QuickActionsPanel from "./QuickActionsPanel";
import GoogleFormManager from "./GoogleFormManager";
import TemplateInformationCard from "./TemplateInformationCard";

const UploadStudentData = () => {
  const [searchParams] = useSearchParams();
  const [college, setCollege] = useState("");
  const [company, setCompany] = useState("");
  const [course, setCourse] = useState("");
  const [templateFields, setTemplateFields] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
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
  const [responses, setResponses] = useState([]);
  const [responseSummary, setResponseSummary] = useState(null);
  const [showResponses, setShowResponses] = useState(false);
  const [isFetchingResponses, setIsFetchingResponses] = useState(false);

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

  // Parse URL parameters
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header Section */}
        <HeaderSection college={college} company={company} course={course} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Details Card */}
            <JobDetailsCard
              company={company}
              companyWebsite={companyWebsite}
              designation={designation}
              jobType={jobType}
              jobLocation={jobLocation}
              fixedSalary={fixedSalary}
              variableSalary={variableSalary}
              totalCTC={totalCTC}
              modeOfInterview={modeOfInterview}
              passingYear={passingYear}
              jobDescription={jobDescription}
            />

            {/* Eligibility Criteria Card */}
            <EligibilityCriteriaCard
              course={course}
              genderEligibility={genderEligibility}
              marksCriteria={marksCriteria}
              backlogCriteria={backlogCriteria}
            />
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions Panel */}
            <GoogleFormManager
              college={college}
              company={company}
              course={course}
              designation={designation}
              templateFields={templateFields}
              fieldLabels={fieldLabels}
              isFetchingResponses={isFetchingResponses}
              onSetResponses={setResponses}
              onSetResponseSummary={setResponseSummary}
              onSetShowResponses={setShowResponses}
              onSetIsFetchingResponses={setIsFetchingResponses}
            />
            <QuickActionsPanel
              onDownloadTemplate={downloadTemplate}
              onShowUploadModal={() => setShowUploadModal(true)}
            />

            {/* Google Form Manager - Handles form creation and response fetching */}
            
          </div>
        </div>

        {/* Responses Section (Full Width) */}
        {showResponses && responses.length > 0 && (
          <div id="responses-section" className="mt-6 bg-white rounded-2xl shadow-lg p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex items-center">
                <svg className="h-6 w-6 text-blue-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-lg md:text-xl font-bold text-gray-800">Form Responses</h3>
              </div>
              <div className="flex flex-row md:flex-row md:items-center gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Total Responses</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">{responses.length}</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      const ws = XLSX.utils.json_to_sheet(
                        responses.map((response) => {
                          const row = {};
                          if (responseSummary?.questionStats) {
                            Object.keys(responseSummary.questionStats).forEach((question) => {
                              const answer = response.answers?.[question];
                              if (Array.isArray(answer?.answer)) {
                                row[question] = answer.answer.join(", ");
                              } else {
                                row[question] = answer?.answer || "-";
                              }
                            });
                          }
                          return row;
                        })
                      );
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Responses");
                      XLSX.writeFile(wb, "form-responses.xlsx");
                    }}
                    className="flex flex-col items-center gap-1 p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-all duration-200"
                    title="Download responses as Excel file"
                  >
                    <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span className="text-xs font-medium">Download</span>
                  </button>
                  <button
                    onClick={() => {
                      try {
                          const responseData = responses.map((response) => {
                            const row = {};
                            if (responseSummary?.questionStats) {
                              Object.keys(responseSummary.questionStats).forEach((question) => {
                                const answer = response.answers?.[question];
                                if (Array.isArray(answer?.answer)) {
                                  row[question] = answer.answer.join(", ");
                                } else {
                                  row[question] = answer?.answer || "-";
                                }
                              });
                            }
                            return row;
                          });
                          const ws = XLSX.utils.json_to_sheet(responseData);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, "Responses");
                          const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
                          const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                          const file = new File([blob], "form-responses.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                          window.autoUploadFile = file;
                          setShowUploadModal(true);
                        } catch (error) {
                          console.error("Error preparing responses:", error);
                          alert("❌ Error preparing responses: " + error.message);
                        }
                      }}
                      className="flex flex-col items-center gap-1 p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-all duration-200"
                      title="Submit responses to the system"
                    >
                      <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span className="text-xs font-medium">Submit</span>
                    </button>
                </div>
              </div>
            </div>

            {/* Responses Table with Scrollbar */}
            {responses.length > 0 ? (
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200 overflow-x-auto">
                <div className="overflow-y-auto max-h-96">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 flex-shrink-0">#</th>
                        {responseSummary?.questionStats &&
                          Object.keys(responseSummary.questionStats).map((question) => (
                            <th key={question} className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                              {question.substring(0, 20)}
                              {question.length > 20 ? "..." : ""}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((response, index) => (
                        <tr key={response.id || index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-600 flex-shrink-0">{index + 1}</td>
                          {responseSummary?.questionStats &&
                            Object.keys(responseSummary.questionStats).map((question) => {
                              const answer = response.answers?.[question];
                              let displayText = "";
                              if (answer) {
                                if (Array.isArray(answer.answer)) {
                                  displayText = answer.answer.join(", ");
                                } else {
                                  displayText = String(answer.answer);
                                }
                              } else {
                                displayText = "-";
                              }
                              return (
                                <td key={question} className="px-2 sm:px-4 py-2 sm:py-3 text-gray-700" title={displayText}>
                                  <div className="truncate max-w-xs">
                                    {displayText.length > 30 ? displayText.substring(0, 30) + "..." : displayText}
                                  </div>
                                </td>
                              );
                            })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : !isFetchingResponses ? (
              <div className="bg-white p-4 sm:p-6 rounded-lg text-center">
                <p className="text-gray-600 mb-2 text-sm sm:text-base">📭 No responses yet for this form.</p>
                <p className="text-xs sm:text-sm text-gray-500">Share your form URL to collect responses, then refresh to see them here.</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Template Information Card */}
        <TemplateInformationCard
          templateFields={templateFields}
          fieldLabels={fieldLabels}
        />

        {/* Upload Modal */}
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
    </div>
  );
};

export default UploadStudentData;