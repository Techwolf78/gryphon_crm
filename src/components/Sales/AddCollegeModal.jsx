import { useState, useEffect } from "react";
import { universityOptions } from "./universityData";
import { auth, db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { XIcon, PlusIcon } from "@heroicons/react/outline";
import CourseForm from "./AddCollege/CourseForm";
import CollegeInfoForm from "./AddCollege/CollegeInfoForm";
import ContactInfoForm from "./AddCollege/ContactInfoForm";

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
  Others: ["Other"],
};

const accreditationOptions = [
  "A++",
  "A+",
  "A",
  "B++",
  "B+",
  "B",
  "C",
  "D",
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
  const [affiliation, setAffiliation] = useState("");
  const [accreditation, setAccreditation] = useState("");
  const [manualAffiliation, setManualAffiliation] = useState("");
  const [manualAccreditation, setManualAccreditation] = useState("");
  const [tcv, setTcv] = useState(0); // Changed from totalContractValue to tcv
  const [loading, setLoading] = useState(false);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const [courses, setCourses] = useState([
    {
      courseType: "",
      specializations: [],
      manualSpecialization: "",
      manualCourseType: "",
      passingYear: "",
      studentCount: "",
      perStudentCost: "",
      courseTCV: 0, // Changed from tcv to courseTCV
    },
  ]);

  // Update the useEffect calculation
  useEffect(() => {
    const total = courses.reduce(
      (sum, course) => sum + (course.courseTCV || 0),
      0
    );
    setTcv(total); // Changed from setTotalContractValue to setTcv
  }, [courses]);

  const getLeadPhase = (expectedDateInput) => {
    if (!expectedDateInput) return "cold";
    const now = new Date();
    const expectedDate = new Date(expectedDateInput);
    const diffInDays = Math.ceil((expectedDate - now) / (1000 * 60 * 60 * 24));
    if (diffInDays > 45) return "cold";
    if (diffInDays > 30) return "warm";
    return "hot";
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -5; i <= 5; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      years.push(`${startYear}-${endYear}`);
    }
    return years;
  };

  const yearOptions = generateYearOptions();

  const handleSpecializationChange = (e, index) => {
    const value = e.target.value;
    const isChecked = e.target.checked;

    setCourses((prev) => {
      const updatedCourses = [...prev];
      const course = { ...updatedCourses[index] };

      if (value === "Other") {
        if (isChecked) {
          course.specializations = [...course.specializations, "Other"];
        } else {
          course.specializations = course.specializations.filter(
            (item) => item !== "Other"
          );
          course.manualSpecialization = "";
        }
      } else {
        if (isChecked) {
          course.specializations = [...course.specializations, value];
        } else {
          course.specializations = course.specializations.filter(
            (item) => item !== value
          );
        }
      }

      updatedCourses[index] = course;
      return updatedCourses;
    });
  };

  const handleAddCourse = () => {
    setCourses((prev) => [
      ...prev,
      {
        courseType: "",
        specializations: [],
        manualSpecialization: "",
        manualCourseType: "",
        passingYear: "",
        studentCount: "",
        perStudentCost: "",
        courseTCV: 0, // Changed from tcv to courseTCV
      },
    ]);
  };

  const handleRemoveCourse = (index) => {
    if (courses.length <= 1) return;
    setCourses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCourseChange = (index, field, value) => {
    setCourses((prev) => {
      const updatedCourses = [...prev];
      const updatedCourse = { ...updatedCourses[index] };

      if (field === "courseType") {
        updatedCourse.courseType = value;
        updatedCourse.specializations = [];
        updatedCourse.manualSpecialization = "";
      } else if (field === "manualSpecialization") {
        updatedCourse.manualSpecialization = value;
      } else if (field === "manualCourseType") {
        updatedCourse.manualCourseType = value;
      } else if (field === "passingYear") {
        updatedCourse.passingYear = value;
      } else if (field === "studentCount") {
        updatedCourse.studentCount = value;
        const count = parseInt(value) || 0;
        const cost = parseFloat(updatedCourse.perStudentCost) || 0;
        updatedCourse.courseTCV = count * cost; // Changed from tcv to courseTCV
      } else if (field === "perStudentCost") {
        updatedCourse.perStudentCost = value;
        const count = parseInt(updatedCourse.studentCount) || 0;
        const cost = parseFloat(value) || 0;
        updatedCourse.courseTCV = count * cost; // Changed from tcv to courseTCV
      } else if (field === "year") {
        updatedCourse.year = value;
      }

      updatedCourses[index] = updatedCourse;
      return updatedCourses;
    });
  };

  const handleClose = () => {
    setBusinessName("");
    setAddress("");
    setPocName("");
    setPhoneNo("");
    setEmail("");
    setState("");
    setCity("");
    setExpectedClosureDate("");
    setCourses([
      {
        courseType: "",
        specializations: [],
        manualSpecialization: "",
        manualCourseType: "",
        passingYear: "",
        studentCount: "",
        perStudentCost: "",
        courseTCV: 0, // Changed from tcv to courseTCV
      },
    ]);
    setAffiliation("");
    setAccreditation("");
    setManualAffiliation("");
    setManualAccreditation("");
    setTcv(0);
    onClose();
  };

  const handleAddBusiness = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add a lead.");
      return;
    }

    setLoading(true); // Start loading

    let expectedClosureTimestamp = null;
    if (expectedClosureDate) {
      const d = new Date(expectedClosureDate);
      if (!isNaN(d.getTime())) {
        expectedClosureTimestamp = d.getTime();
      }
    }

    const phase = getLeadPhase(expectedClosureTimestamp);
    const timestamp = Date.now();

    const finalAffiliation =
      affiliation === "Other" && manualAffiliation.trim()
        ? manualAffiliation.trim()
        : affiliation;

    const finalAccreditation =
      accreditation === "Other" && manualAccreditation.trim()
        ? manualAccreditation.trim()
        : accreditation;

    // Create an array of promises for adding each course as a separate lead
    const addLeadPromises = courses.map((course) => {
      // Process course data
      const finalCourseType =
        course.courseType === "Others" && course.manualCourseType.trim()
          ? course.manualCourseType.trim()
          : course.courseType;

      let finalSpecializations = [...course.specializations];

      if (
        course.specializations.includes("Other") &&
        course.manualSpecialization.trim()
      ) {
        finalSpecializations = finalSpecializations
          .filter((item) => item !== "Other")
          .concat(course.manualSpecialization.trim());
      }

      // Create a new lead object for this course
      const newLead = {
        businessName,
        address,
        pocName,
        phoneNo,
        email,
        state,
        city,
        expectedClosureDate: expectedClosureTimestamp,
        courses: [
          {
            courseType: finalCourseType,
            specializations: finalSpecializations,
            passingYear: course.passingYear || null,
            year: course.year || null, // Add this line
            studentCount: parseInt(course.studentCount) || 0,
            perStudentCost: parseFloat(course.perStudentCost) || 0,
            courseTCV: course.courseTCV || 0,
          },
        ], // Note: courses is now an array with just one course
        tcv: course.courseTCV || 0, // TCV is just for this single course
        phase,
        affiliation: finalAffiliation || null,
        accreditation: finalAccreditation || null,
        contactMethod,
        assignedTo: {
          uid: user.uid,
          name: user.displayName?.trim() || "No Name Provided",
          email: user.email || "No Email Provided",
        },
createdAt: timestamp, // store actual time as number
        openedDate: serverTimestamp(), // Set openedDate as well if needed
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: user.uid,
        firestoreTimestamp: serverTimestamp(),
      };

      return addDoc(collection(db, "leads"), newLead);
    });

    try {
      const addPromise = Promise.all(addLeadPromises); // Create all leads
      const delayPromise = sleep(2000); // Wait at least 2 sec

      await Promise.all([addPromise, delayPromise]);

      setLoading(false);
      handleClose();
    } catch (error) {
      console.error("Error adding leads:", error);
      alert("Failed to add some leads. Please try again.");
      setLoading(false);
    }
  };

  const isFormValid =
    businessName.trim() &&
    pocName.trim() &&
    phoneNo.trim() &&
    state &&
    city &&
    (affiliation !== "Other" ||
      (affiliation === "Other" && manualAffiliation.trim()));

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
            <CollegeInfoForm
              businessName={businessName}
              setBusinessName={setBusinessName}
              address={address}
              setAddress={setAddress}
              state={state}
              setState={setState}
              city={city}
              setCity={setCity}
              isFormValid={isFormValid}
            />

            <ContactInfoForm
              pocName={pocName}
              setPocName={setPocName}
              phoneNo={phoneNo}
              setPhoneNo={setPhoneNo}
              email={email}
              setEmail={setEmail}
              expectedClosureDate={expectedClosureDate}
              setExpectedClosureDate={setExpectedClosureDate}
              contactMethod={contactMethod}
              setContactMethod={setContactMethod}
              isFormValid={isFormValid}
            />

            {/* Accreditation */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NAAC Accrediation
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
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                University Affiliation
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
                  <option value="">Select University</option>
                  {universityOptions.map((university) => (
                    <option key={university} value={university}>
                      {university}
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
                    Please specify University Name
                    {affiliation === "Other" &&
                      !manualAffiliation.trim() &&
                      isFormValid && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={manualAffiliation}
                      onChange={(e) => setManualAffiliation(e.target.value)}
                      placeholder="Enter university name"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        affiliation === "Other" &&
                        !manualAffiliation.trim() &&
                        isFormValid
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {affiliation === "Other" &&
                      !manualAffiliation.trim() &&
                      isFormValid && (
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
                  {affiliation === "Other" &&
                    !manualAffiliation.trim() &&
                    isFormValid && (
                      <p className="mt-1 text-sm text-red-600">
                        Please specify the university name
                      </p>
                    )}
                </div>
              )}
            </div>

            {/* Courses Section */}
            <div className="col-span-2">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-gray-900">Courses</h3>
                <button
                  type="button"
                  onClick={handleAddCourse}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="-ml-1 mr-1 h-4 w-4" />
                  Add Course
                </button>
              </div>

              {courses.map((course, index) => (
                <div key={index} className="mb-6 border-b border-gray-200 pb-6">
                  <CourseForm
                    course={course}
                    index={index}
                    handleCourseChange={handleCourseChange}
                    handleSpecializationChange={handleSpecializationChange}
                    courseSpecializations={courseSpecializations}
                    yearOptions={yearOptions}
                    isFormValid={isFormValid}
                    onRemove={() => handleRemoveCourse(index)}
                    showRemoveButton={courses.length > 1}
                  />
                </div>
              ))}

              {/* Total Contract Value Display - Enhanced */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-lg font-medium text-gray-700">
                      Total Contract Value (TCV)
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      Sum of all course values
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-semibold text-blue-600">
                      ₹{tcv.toLocaleString()}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      {courses.filter((c) => c.courseTCV > 0).length} course(s)
                      included
                    </p>
                  </div>
                </div>
                {courses.filter((c) => c.courseTCV > 0).length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Breakdown:</p>
                    <ul className="list-disc pl-5 mt-1">
                      {courses
                        .filter((c) => c.courseTCV > 0)
                        .map((course, idx) => (
                          <li key={idx}>
                            {course.courseType || course.manualCourseType}: ₹
                            {course.courseTCV.toLocaleString()}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
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
              disabled={!isFormValid || loading}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${
                isFormValid && !loading
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {loading ? "Adding..." : "Add College Lead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddCollegeModal;
