import { useState, useEffect } from "react";
import { universityOptions } from "./universityData";
import { auth, db } from "../../firebase";
import { collection, addDoc, serverTimestamp,query, where, getDocs, } from "firebase/firestore";
import { XIcon, PlusIcon } from "@heroicons/react/outline";
import CourseForm from "./AddCollege/CourseForm";
import CollegeInfoForm from "./AddCollege/CollegeInfoForm";
import ContactInfoForm from "./AddCollege/ContactInfoForm";
import Select from "react-select";

function capitalizeWords(str) {
  return str.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
}

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
try {
  // Duplicate check ke liye query banate hai
const leadsRef = collection(db, "leads");
const q = query(
  leadsRef,
  where("businessName", "==", businessName.trim()),
  where("address", "==", address.trim()),
  where("state", "==", state),
  where("city", "==", city),
  where("pocName", "==", pocName.trim()),
  where("phoneNo", "==", phoneNo.trim()),
  where("email", "==", email.trim())
);

const querySnapshot = await getDocs(q);

let isDuplicate = false;

querySnapshot.forEach((doc) => {
  const data = doc.data();
  const dbCourses = data.courses || [];

  courses.forEach((newCourse) => {
    // Prepare new course values
    const finalCourseType =
      newCourse.courseType === "Others" && newCourse.manualCourseType.trim()
        ? newCourse.manualCourseType.trim()
        : newCourse.courseType;

    let finalSpecializations = [...newCourse.specializations];
    if (
      newCourse.specializations.includes("Other") &&
      newCourse.manualSpecialization.trim()
    ) {
      finalSpecializations = finalSpecializations
        .filter((item) => item !== "Other")
        .concat(newCourse.manualSpecialization.trim());
    }

    dbCourses.forEach((dbCourse) => {
      // Type check
      const isTypeMatch = dbCourse.courseType === finalCourseType;

      // Specializations check (order-independent)
      const dbSpecs = dbCourse.specializations || [];
      const newSpecs = finalSpecializations || [];
      const isSpecsMatch =
        dbSpecs.length === newSpecs.length &&
        dbSpecs.every((spec) => newSpecs.includes(spec));

      // Year check
      const isYearMatch = (dbCourse.year || "") === (newCourse.year || "");

      // Passing year check
      const isPassingYearMatch =
        (dbCourse.passingYear || "") === (newCourse.passingYear || "");

      // Student count check
      const isStudentCountMatch =
        (parseInt(dbCourse.studentCount) || 0) ===
        (parseInt(newCourse.studentCount) || 0);

      if (
        isTypeMatch &&
        isSpecsMatch &&
        isYearMatch &&
        isPassingYearMatch &&
        isStudentCountMatch
      ) {
        isDuplicate = true;
      }
    });
  });
});

if (isDuplicate) {
  alert("Duplicate found with matching courses and fields. Please check the details.");
  setLoading(false);
  return;
}

} catch (error) {
  console.error("Error checking duplicate:", error);
  alert("Something went wrong while checking duplicate.");
  setLoading(false);
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

  // Prepare university options for react-select
  const universitySelectOptions = universityOptions.map((u) => ({
    value: u,
    label: u,
  }));

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-52 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-lg shadow-2xl overflow-hidden">
        {/* Modal Header - More compact */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">
            Add College/University
          </h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body - Improved spacing and responsiveness */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          <div className="space-y-4">
            {/* College Info Section */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-3">College Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <CollegeInfoForm
                  businessName={businessName}
                  setBusinessName={val => setBusinessName(capitalizeWords(val))}
                  address={address}
                  setAddress={val => setAddress(capitalizeWords(val))}
                  state={state}
                  setState={setState}
                  city={city}
                  setCity={setCity}
                  isFormValid={isFormValid}
                />
              </div>
            </div>

            {/* Contact Info Section */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <ContactInfoForm
                  pocName={pocName}
                  setPocName={val => setPocName(capitalizeWords(val))}
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
              </div>
            </div>

            {/* Accreditation & Affiliation Section */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Accreditation & Affiliation</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Accreditation */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    NAAC Accreditation
                  </label>
                  <div className="relative">
                    <select
                      value={accreditation}
                      onChange={(e) => {
                        setAccreditation(e.target.value);
                        setManualAccreditation("");
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    >
                      <option value="">Select Accreditation</option>
                      {accreditationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
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
                      <input
                        type="text"
                        value={manualAccreditation}
                        onChange={e => setManualAccreditation(capitalizeWords(e.target.value))}
                        placeholder="Enter custom accreditation"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Affiliation */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    University Affiliation
                  </label>
                  <div className="space-y-2">
                    <Select
                      options={universitySelectOptions}
                      value={universitySelectOptions.find((opt) => opt.value === affiliation)}
                      onChange={(selected) => {
                        setAffiliation(selected ? selected.value : "");
                        setManualAffiliation("");
                      }}
                      placeholder="Search university"
                      isClearable
                      styles={{
                        control: (provided) => ({
                          ...provided,
                          minHeight: '34px',
                          fontSize: '14px'
                        }),
                        option: (provided) => ({
                          ...provided,
                          fontSize: '14px'
                        })
                      }}
                    />
                    {affiliation === "Other" && (
                      <input
                        type="text"
                        value={manualAffiliation}
                        onChange={e => setManualAffiliation(capitalizeWords(e.target.value))}
                        placeholder="Enter university name"
                        className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          !manualAffiliation.trim() && isFormValid
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Courses Section */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                <h3 className="text-sm font-medium text-gray-900">Courses</h3>
                <button
                  type="button"
                  onClick={handleAddCourse}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 self-start sm:self-auto"
                >
                  <PlusIcon className="-ml-1 mr-1 h-3 w-3" />
                  Add Course
                </button>
              </div>

              <div className="space-y-4">
                {courses.map((course, index) => (
                  <div key={index} className="bg-white p-3 rounded-md border border-gray-200">
                    <CourseForm
                      course={course}
                      index={index}
                      handleCourseChange={(idx, field, value) => {
                        if (field === "manualCourseType" || field === "manualSpecialization") {
                          handleCourseChange(idx, field, capitalizeWords(value));
                        } else {
                          handleCourseChange(idx, field, value);
                        }
                      }}
                      handleSpecializationChange={handleSpecializationChange}
                      courseSpecializations={courseSpecializations}
                      yearOptions={yearOptions}
                      isFormValid={isFormValid}
                      onRemove={() => handleRemoveCourse(index)}
                      showRemoveButton={courses.length > 1}
                    />
                  </div>
                ))}
              </div>

              {/* Total Contract Value Display - More compact */}
              <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Total Contract Value (TCV)
                    </span>
                    <p className="text-xs text-gray-500">
                      Sum of all course values
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-lg font-semibold text-blue-600">
                      ₹{tcv.toLocaleString()}
                    </span>
                    <p className="text-xs text-gray-500">
                      {courses.filter((c) => c.courseTCV > 0).length} course(s)
                    </p>
                  </div>
                </div>
                {courses.filter((c) => c.courseTCV > 0).length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    <details className="cursor-pointer">
                      <summary className="font-medium">View Breakdown</summary>
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                        {courses
                          .filter((c) => c.courseTCV > 0)
                          .map((course, idx) => (
                            <li key={idx} className="text-xs">
                              {course.courseType || course.manualCourseType}: ₹
                              {course.courseTCV.toLocaleString()}
                            </li>
                          ))}
                      </ul>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer - More compact */}
        <div className="bg-gray-50 px-4 py-3 flex flex-col sm:flex-row sm:justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={handleAddBusiness}
            disabled={!isFormValid || loading}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition order-1 sm:order-2 ${
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
  );
}

export default AddCollegeModal;
