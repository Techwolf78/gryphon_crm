import React, { useState, useEffect } from "react";
import stateCityData from "../Sales/stateCityData";
import { auth, db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { XIcon } from "@heroicons/react/outline";

const courseSpecializations = {
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
  MBA: ["Marketing", "Finance", "HR", "Operations", "Other"],
  BBA: ["International Business", "General", "Finance", "Other"],
  BCA: ["Computer Applications", "Other"],
  MCA: ["Computer Science", "Other"],
  Diploma: ["Mechanical", "Civil", "Electrical", "Computer", "Other"],
  BSC: ["Physics", "Chemistry", "Mathematics", "CS", "Other"],
  MSC: ["Physics", "Chemistry", "Mathematics", "CS", "Other"],
  Others: ["Other"],
};

// Add options for affiliation and accreditation
const affiliationOptions = [
  "UGC",
  "AICTE",
  "NAAC",
  "NBA",
  "State University",
  "Private",
  "Autonomous",
  "Other",
];

const accreditationOptions = [
  "A+",
  "A",
  "B+",
  "B",
  "C",
  "Not Accredited",
  "Applied For",
  "Other",
];

function AddCollegeModal({ show, onClose }) {
  const [contactMethod, setContactMethod] = useState("Visit");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [pocName, setPocName] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [expectedClosureDate, setExpectedClosureDate] = useState("");
  const [courseType, setCourseType] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [studentCount, setStudentCount] = useState("");
  const [perStudentCost, setPerStudentCost] = useState("");
  const [tcv, setTcv] = useState(0);
  const [manualSpecialization, setManualSpecialization] = useState("");
  const [manualCourseType, setManualCourseType] = useState("");
  // New fields
  const [passingYear, setPassingYear] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [accreditation, setAccreditation] = useState("");
  const [manualAffiliation, setManualAffiliation] = useState("");
  const [manualAccreditation, setManualAccreditation] = useState("");

  useEffect(() => {
    const count = parseInt(studentCount) || 0;
    const cost = parseFloat(perStudentCost) || 0;
    setTcv(count * cost);
  }, [studentCount, perStudentCost]);

  const getLeadPhase = (expectedDateInput) => {
    if (!expectedDateInput) return "cold";
    const now = new Date();
    const expectedDate = new Date(expectedDateInput);
    const diffInDays = Math.ceil((expectedDate - now) / (1000 * 60 * 60 * 24));
    if (diffInDays > 45) return "cold";
    if (diffInDays > 30) return "warm";
    return "hot";
  };

  // Generate year options dynamically
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];

    // Create options for current year -5 to current year +5
    for (let i = -5; i <= 5; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      years.push(`${startYear}-${endYear}`);
    }

    return years;
  };

  const yearOptions = generateYearOptions();

  const handleClose = () => {
    setBusinessName("");
    setAddress("");
    setPocName("");
    setPhoneNo("");
    setEmail("");
    setState("");
    setCity("");
    setExpectedClosureDate("");
    setCourseType("");
    setSpecialization("");
    setStudentCount("");
    setPerStudentCost("");
    setTcv(0);
    setPassingYear("");
    setAffiliation("");
    setAccreditation("");
    setManualAffiliation("");
    setManualAccreditation("");
    onClose();
  };

  const handleAddBusiness = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add a lead.");
      return;
    }

    let expectedClosureTimestamp = null;
    if (expectedClosureDate) {
      const d = new Date(expectedClosureDate);
      if (!isNaN(d.getTime())) {
        expectedClosureTimestamp = d.getTime();
      }
    }

    const phase = getLeadPhase(expectedClosureTimestamp);
    const timestamp = Date.now();

    const finalCourseType =
      courseType === "Others" && manualCourseType.trim()
        ? manualCourseType.trim()
        : courseType;

    const finalSpecialization =
      specialization === "Other" && manualSpecialization.trim()
        ? manualSpecialization.trim()
        : specialization;

    const finalAffiliation =
      affiliation === "Other" && manualAffiliation.trim()
        ? manualAffiliation.trim()
        : affiliation;

    const finalAccreditation =
      accreditation === "Other" && manualAccreditation.trim()
        ? manualAccreditation.trim()
        : accreditation;

    const newLead = {
      businessName,
      address,
      pocName,
      phoneNo,
      email,
      state,
      city,
      expectedClosureDate: expectedClosureTimestamp,
      courseType: finalCourseType,
      specialization: finalSpecialization,
      studentCount: parseInt(studentCount),
      perStudentCost: parseFloat(perStudentCost),
      tcv,
      phase,
      passingYear: passingYear || null,
      affiliation: finalAffiliation || null,
      accreditation: finalAccreditation || null,
      assignedTo: {
        uid: user.uid,
        name: user.displayName?.trim() || "No Name Provided",
        email: user.email || "No Email Provided",
      },
      createdAt: timestamp,
      lastUpdatedBy: user.uid,
      lastUpdatedAt: timestamp,
      firestoreTimestamp: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "leads"), newLead);
      alert("Lead added successfully.");
      handleClose();
    } catch (error) {
      console.error("Error adding lead:", error);
      alert("Failed to add lead. Please try again.");
    }
  };

  const isFormValid =
    businessName.trim() &&
    pocName.trim() &&
    phoneNo.trim() &&
    state &&
    city &&
    ((courseType !== "Others" && courseType) ||
      (courseType === "Others" && manualCourseType.trim())) &&
    ((specialization !== "Other" && specialization) ||
      (specialization === "Other" && manualSpecialization.trim()));

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-52 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">
            Add College/University
          </h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-180px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* College Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                College/University Name<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme College"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                {!businessName.trim() && isFormValid && (
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
            </div>

            {/* Address */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Main St"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            {/* POC Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                POC Name<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={pocName}
                  onChange={(e) => setPocName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                {!pocName.trim() && isFormValid && (
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
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone No.<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phoneNo}
                  onChange={(e) => setPhoneNo(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                {!phoneNo.trim() && isFormValid && (
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
            </div>

            {/* Email */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. contact@college.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <select
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    setCity("");
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="">Select State</option>
                  {Object.keys(stateCityData).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
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
                {!state && isFormValid && (
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
            </div>

            {/* City */}
            {state && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  >
                    <option value="">Select City</option>
                    {stateCityData[state].map((ct) => (
                      <option key={ct} value={ct}>
                        {ct}
                      </option>
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
                  {!city && isFormValid && (
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
              </div>
            )}

            {/* Expected Closure Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Closure Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={expectedClosureDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setExpectedClosureDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Passing Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passing Year
              </label>
              <div className="relative">
                <select
                  value={passingYear}
                  onChange={(e) => setPassingYear(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="">Select Passing Year</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
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
              </div>
            </div>

            {/* Course Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Type<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <select
                  value={courseType}
                  onChange={(e) => {
                    setCourseType(e.target.value);
                    setSpecialization("");
                    setManualSpecialization("");
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="">Select Course</option>
                  {Object.keys(courseSpecializations).map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
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
                {!courseType && isFormValid && (
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
            </div>

            {courseType === "Others" && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Please specify Course Type
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualCourseType}
                    onChange={(e) => setManualCourseType(e.target.value)}
                    placeholder="Enter custom course type"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      !manualCourseType.trim() && isFormValid
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {!manualCourseType.trim() && isFormValid && (
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
                {!manualCourseType.trim() && isFormValid && (
                  <p className="mt-1 text-sm text-red-600">
                    This field is required
                  </p>
                )}
              </div>
            )}

            {/* Specialization */}
            {courseType && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialization<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <select
                    value={specialization}
                    onChange={(e) => {
                      setSpecialization(e.target.value);
                      setManualSpecialization("");
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  >
                    <option value="">Select Specialization</option>
                    {courseSpecializations[courseType].map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
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
                  {!specialization && isFormValid && (
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

                {specialization === "Other" && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Please specify Specialization
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={manualSpecialization}
                        onChange={(e) =>
                          setManualSpecialization(e.target.value)
                        }
                        placeholder="Enter custom specialization"
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          !manualSpecialization.trim() && isFormValid
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {!manualSpecialization.trim() && isFormValid && (
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
                    {!manualSpecialization.trim() && isFormValid && (
                      <p className="mt-1 text-sm text-red-600">
                        This field is required
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Accreditation */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Accreditation
              </label>
              <div className="relative">
                <select
                  value={accreditation}
                  onChange={(e) => {
                    setAccreditation(e.target.value);
                    setManualAccreditation("");
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="">Select Accreditation</option>
                  {accreditationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
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
              </div>

              {accreditation === "Other" && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Please specify Accreditation
                  </label>
                  <input
                    type="text"
                    value={manualAccreditation}
                    onChange={(e) => setManualAccreditation(e.target.value)}
                    placeholder="Enter custom accreditation"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Affiliation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Affiliation
              </label>
              <div className="relative">
                <select
                  value={affiliation}
                  onChange={(e) => {
                    setAffiliation(e.target.value);
                    setManualAffiliation("");
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="">Select Affiliation</option>
                  {affiliationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
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
              </div>

              {affiliation === "Other" && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Please specify Affiliation
                  </label>
                  <input
                    type="text"
                    value={manualAffiliation}
                    onChange={(e) => setManualAffiliation(e.target.value)}
                    placeholder="Enter custom affiliation"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
              <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Contact Method<span className="text-red-500 ml-1">*</span>
  </label>
  <div className="flex items-center space-x-4">
    <label className="flex items-center">
      <input
        type="radio"
        value="Visit"
        checked={contactMethod === "Visit"}
        onChange={(e) => setContactMethod(e.target.value)}
        className="form-radio text-blue-600"
      />
      <span className="ml-2 text-sm text-gray-700">Visit</span>
    </label>
    <label className="flex items-center">
      <input
        type="radio"
        value="Call"
        checked={contactMethod === "Call"}
        onChange={(e) => setContactMethod(e.target.value)}
        className="form-radio text-blue-600"
      />
      <span className="ml-2 text-sm text-gray-700">Call</span>
    </label>
  </div>
</div>
            {/* Student Count, Per Student Cost, TCV */}
            <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Count
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={studentCount}
                    onChange={(e) => setStudentCount(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Per Student Cost
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">₹</span>
                  </div>
                  <input
                    type="number"
                    value={perStudentCost}
                    onChange={(e) => setPerStudentCost(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TCV
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">₹</span>
                  </div>
                  <input
                    type="number"
                    value={tcv}
                    disabled
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 bg-gray-100 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleAddBusiness}
              disabled={!isFormValid}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${
                isFormValid
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Add College Lead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddCollegeModal;