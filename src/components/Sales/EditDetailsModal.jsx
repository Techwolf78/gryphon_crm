import { useState, useEffect, useMemo } from "react";
import { FiX, FiInfo, FiPlus, FiTrash2 } from "react-icons/fi";
import { universityOptions } from "./universityData";
import Select from "react-select";

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

const courseYears = {
  Engineering: ["1st", "2nd", "3rd", "4th"],
  MBA: ["1st", "2nd"],
  BBA: ["1st", "2nd", "3rd"],
  BCA: ["1st", "2nd", "3rd"],
  MCA: ["1st", "2nd", "3rd"],
  Diploma: ["1st", "2nd", "3rd"],
  BSC: ["1st", "2nd", "3rd"],
  MSC: ["1st", "2nd"],
  Others: ["1st", "2nd", "3rd", "4th"],
};

const contactMethodOptions = ["Visit", "Call", "Other"];

const stateOptions = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh", "Andaman and Nicobar Islands", "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep"
].map(s => ({ value: s, label: s }));

const cityOptions = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli", "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Howrah", "Ranchi", "Gwalior", "Jabalpur", "Coimbatore", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur", "Hubballi-Dharwad", "Tiruchirappalli", "Bareilly", "Moradabad", "Mysore", "Tiruppur", "Gurgaon", "Aligarh", "Jalandhar", "Bhubaneswar", "Salem", "Warangal", "Guntur", "Bhiwandi", "Saharanpur", "Gorakhpur", "Bikaner", "Amravati", "Noida", "Jamshedpur", "Bhilai", "Cuttack", "Firozabad", "Kochi", "Nellore", "Bhavnagar", "Dehradun", "Durgapur", "Asansol", "Rourkela", "Nanded", "Kolhapur", "Ajmer", "Akola", "Gulbarga", "Jamnagar", "Ujjain", "Loni", "Siliguri", "Jhansi", "Ulhasnagar", "Jammu", "Sangli-Miraj & Kupwad", "Mangalore", "Erode", "Belgaum", "Ambattur", "Tirunelveli", "Malegaon", "Gaya", "Tirupati", "Davanagere", "Kozhikode", "Akbarpur", "Kurnool", "Rajpur Sonarpur", "Bokaro", "South Dumdum", "Bellary", "Patiala", "Gopalpur", "Agartala", "Bhagalpur", "Muzaffarnagar", "Bhatpara", "Panihati", "Latur", "Dhule", "Tiruppur", "Rohtak", "Korba", "Bhilwara", "Berhampur", "Muzaffarpur", "Ahmednagar", "Mathura", "Kollam", "Avadi", "Kadapa", "Kamarhati", "Bilaspur", "Shahjahanpur", "Satara", "Bijapur", "Kakinada", "Rampur", "Shimoga", "Chandrapur", "Junagadh", "Thrissur", "Alwar", "Bardhaman", "Kulti", "Kakinada", "Nizamabad", "Parbhani", "Tumkur", "Khammam", "Ozhukarai", "Bihar Sharif", "Panipat", "Darbhanga", "Bally", "Aizawl", "Dewas", "Ichalkaranji", "Karnal", "Bathinda", "Jalna", "Eluru", "Kirari Suleman Nagar", "Barasat", "Purnia", "Satna", "Mau", "Sonipat", "Farrukhabad", "Sagar", "Rourkela", "Durg", "Imphal", "Ratlam", "Hapur", "Arrah", "Anantapur", "Karimnagar", "Etawah", "Ambarnath", "North Dumdum", "Bharatpur", "Begusarai", "New Delhi", "Gandhidham", "Baranagar", "Tiruvottiyur", "Pondicherry", "Sikar", "Thoothukudi", "Rewa", "Mirzapur", "Raichur", "Pali", "Ramagundam", "Silchar", "Haridwar", "Vijayanagaram", "Tenali", "Nagercoil", "Sri Ganganagar", "Karawal Nagar", "Mango", "Thanjavur", "Bulandshahr", "Uluberia", "Katni", "Sambhal", "Singrauli", "Nadiad", "Secunderabad", "Naihati", "Yamunanagar", "Bidhan Nagar", "Pallavaram", "Bidar", "Munger", "Panchkula", "Burhanpur", "Raurkela Industrial Township", "Kharagpur", "Dindigul", "Gandhinagar", "Hospet", "Nangloi Jat", "Malda", "Ongole", "Deoghar", "Chapra", "Haldia", "Khandwa", "Nandyal", "Morena", "Amroha", "Anand", "Bhind", "Bhalswa Jahangir Pur", "Madhyamgram", "Bhiwani", "Berhampore", "Ambala", "Morvi", "Fatehpur", "Raebareli", "Khora, Ghaziabad", "Chittorgarh", "Bhusawal", "Orai", "Bahraich", "Phusro", "Vellore", "Mehsana", "Raiganj", "Sirsa", "Danapur", "Serampore", "Sultan Pur Majra", "Guna", "Jaunpur", "Panvel", "Shivpuri", "Surendranagar Dudhrej", "Unnao", "Chinsurah", "Alappuzha", "Kottayam", "Machilipatnam", "Shimla", "Adoni", "Udupi", "Katihar", "Proddatur", "Mahbubnagar", "Saharsa", "Dibrugarh", "Jorhat", "Hazaribagh", "Hindupur", "Nagaon", "Sasaram", "Hajipur", "Giridih", "Bhimavaram", "Kishanganj", "Port Blair", "Adilabad", "Bongaigaon", "Itanagar", "Siliguri", "Gangtok", "Kohima", "Shillong", "Aizawl", "Imphal", "Agartala", "Daman", "Diu", "Kavaratti"
].map(c => ({ value: c, label: c }));

const universitySelectOptions = universityOptions.map((u) => ({ value: u, label: u }));

function EditDetailsModal({ show, onClose, lead, onSave }) {
  // Helper for Indian number formatting
  const formatIndianNumber = (num, decimals = 2) => {
    if (num === 0 || num === "0" || !num) return "0.00";
    const number = parseFloat(num);
    if (isNaN(number)) return num;
    
    const [integerPart, decimalPart] = number.toFixed(decimals).split('.');
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    
    let formattedInteger = lastThree;
    if (otherNumbers !== '') {
      formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    }
    
    return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  };
  const defaultLeadFields = useMemo(
    () => ({
      businessName: "",
      address: "",
      city: "",
      state: "",
      pocName: "",
      phoneNo: "",
      email: "",
      contactMethod: "Visit",
      phase: "",
      expectedClosureDate: "",
      affiliation: "",
      accreditation: "",
      manualAffiliation: "",
      manualAccreditation: "",
      courses: [
        {
          courseType: "",
          specializations: [],
          manualSpecialization: "",
          manualCourseType: "",
          passingYear: "",
          year: "", // Add this line
          studentCount: "",
          perStudentCost: "",
          courseTCV: 0,
        },
      ],
      tcv: 0, // Add this field for the total TCV
    }),
    []
  );

  // Function to determine phase based on expectedClosureDate
  const getLeadPhase = (expectedDateInput) => {
    if (!expectedDateInput) return "hot";
    const now = new Date();
    const expectedDate = new Date(expectedDateInput);
    const diffInDays = Math.ceil((expectedDate - now) / (1000 * 60 * 60 * 24));
    if (diffInDays > 45) return "cold";
    if (diffInDays > 30) return "warm";
    return "hot";
  };

  const [formData, setFormData] = useState(defaultLeadFields);

  useEffect(() => {
    if (lead) {
      const courses = lead.courses?.length
        ? lead.courses
        : defaultLeadFields.courses;

      // Create a new object with default values first
      const initialData = { ...defaultLeadFields };

      // Then apply lead values, making sure to preserve dropdown selections
      const updatedData = {
        ...initialData,
        ...lead,
        affiliation: lead.affiliation || initialData.affiliation,
        accreditation: lead.accreditation || initialData.accreditation,
        courses,
      };

      setFormData(updatedData);
    }
  }, [lead, defaultLeadFields]);

  if (!show || !lead) return null;

  // Generate year options for passing year dropdown
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

  // Handle input changes in form
  const handleChange = (key, value) => {
    let updatedData = { ...formData };

    if (key === "expectedClosureDate") {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        updatedData[key] = date.getTime();

        // Update phase automatically when expectedClosureDate changes
        updatedData.phase = getLeadPhase(date);

        setFormData(updatedData);
        return;
      }
    }

    updatedData[key] = value;
    setFormData(updatedData);
  };

  // Handle course changes
  const handleCourseChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedCourses = [...prev.courses];
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
        updatedCourse.courseTCV = count * cost;
      } else if (field === "perStudentCost") {
        updatedCourse.perStudentCost = value;
        const count = parseInt(updatedCourse.studentCount) || 0;
        const cost = parseFloat(value) || 0;
        updatedCourse.courseTCV = count * cost;
      } else if (field === "year") {
        updatedCourse.year = value;
      }

      updatedCourses[index] = updatedCourse;

      // Calculate total TCV
      const totalTCV = updatedCourses.reduce(
        (sum, course) => sum + (course.courseTCV || 0),
        0
      );

      return { ...prev, courses: updatedCourses, tcv: totalTCV };
    });
  };

  // Handle specialization checkbox changes
  const handleSpecializationChange = (e, index) => {
    const value = e.target.value;
    const isChecked = e.target.checked;

    setFormData((prev) => {
      const updatedCourses = [...prev.courses];
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
      return { ...prev, courses: updatedCourses };
    });
  };

  // Add new course
  const handleAddCourse = () => {
    setFormData((prev) => ({
      ...prev,
      courses: [
        ...prev.courses,
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
      ],
    }));
  };

  // Update the handleRemoveCourse function to properly update the total TCV
  const handleRemoveCourse = (index) => {
    if (formData.courses.length <= 1) return;

    setFormData((prev) => {
      // Get the course being removed
      const courseToRemove = prev.courses[index];
      const courseTCVToRemove = courseToRemove.courseTCV || 0;

      // Filter out the course to be removed
      const updatedCourses = prev.courses.filter((_, i) => i !== index);

      // Calculate new total TCV by subtracting the removed course's TCV
      const newTotalTCV = (prev.tcv || 0) - courseTCVToRemove;

      return {
        ...prev,
        courses: updatedCourses,
        tcv: newTotalTCV > 0 ? newTotalTCV : 0, // Ensure tcv doesn't go negative
      };
    });
  };

  const handleSave = () => {
    // Prepare base lead data (without courses and id)
    const baseLeadData = {
      businessName: formData.businessName,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      pocName: formData.pocName,
      phoneNo: formData.phoneNo,
      email: formData.email,
      contactMethod: formData.contactMethod,
      phase: formData.phase,
      expectedClosureDate:
        typeof formData.expectedClosureDate === "string"
          ? new Date(formData.expectedClosureDate).getTime()
          : formData.expectedClosureDate,
      affiliation: formData.affiliation,
      accreditation: formData.accreditation,
      manualAffiliation: formData.manualAffiliation,
      manualAccreditation: formData.manualAccreditation,
      assignedTo: formData.assignedTo,
    };

    // Get the original course (first one in array)
    const originalCourse = formData.courses[0];

    // Create array of leads to save:
    const leadsToSave = [];

    // If original lead exists (has ID), update it with original course
    if (lead?.id) {
      leadsToSave.push({
        id: lead.id, // Only include id for updates
        ...baseLeadData,
        courses: [
          {
            ...originalCourse,
            studentCount: parseInt(originalCourse.studentCount) || 0,
            perStudentCost: parseFloat(originalCourse.perStudentCost) || 0,
            courseTCV: originalCourse.courseTCV || 0,
          },
        ],
        tcv: originalCourse.courseTCV || 0,
      });
    }

    // Create new leads for any additional courses
    formData.courses.slice(1).forEach((course) => {
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

      leadsToSave.push({
        ...baseLeadData,
        courses: [
          {
            courseType: finalCourseType,
            specializations: finalSpecializations,
            passingYear: course.passingYear,
            studentCount: parseInt(course.studentCount) || 0,
            perStudentCost: parseFloat(course.perStudentCost) || 0,
            courseTCV: course.courseTCV || 0,
          },
        ],
        tcv: course.courseTCV || 0,
      });
    });

    onSave(leadsToSave);
  };

  // Convert timestamp or string to yyyy-mm-dd for date input
  const formatDateForInput = (value) => {
    if (!value) return "";
    let timestamp = value;

    if (typeof value === "string" && !isNaN(Date.parse(value))) {
      timestamp = new Date(value).getTime();
    } else if (typeof value === "string") {
      timestamp = parseInt(value);
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return (
    <div className="fixed inset-0 z-54 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-700 p-3 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FiInfo className="text-white" />
              Edit College Lead
            </h2>
            <p className="text-blue-100 text-xs mt-0.5 truncate">
              {formData.businessName || "College Information"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            aria-label="Close modal"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body/Form */}
        <div className="overflow-y-auto p-2 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="border border-gray-100 rounded-lg p-3 hover:shadow transition-shadow">
                <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                  College Name
                </label>
                <input
                  type="text"
                  value={formData.businessName || ""}
                  onChange={(e) => handleChange("businessName", e.target.value)}
                  className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="border border-gray-100 rounded-lg p-3 hover:shadow transition-shadow">
                <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address || ""}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-100 rounded-lg p-3 hover:shadow transition-shadow">
                  <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                    State
                  </label>
                  <Select
                    options={stateOptions}
                    value={stateOptions.find((opt) => opt.value === formData.state)}
                    onChange={(selected) => handleChange("state", selected ? selected.value : "")}
                    placeholder="Select State"
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
                </div>
                <div className="border border-gray-100 rounded-lg p-3 hover:shadow transition-shadow">
                  <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                    City
                  </label>
                  <Select
                    options={cityOptions}
                    value={cityOptions.find((opt) => opt.value === formData.city)}
                    onChange={(selected) => handleChange("city", selected ? selected.value : "")}
                    placeholder="Select City"
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
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="border border-gray-100 rounded-lg p-3 hover:shadow transition-shadow">
                <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.pocName || ""}
                  onChange={(e) => handleChange("pocName", e.target.value)}
                  className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-100 rounded-lg p-3 hover:shadow transition-shadow">
                  <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phoneNo || ""}
                    onChange={(e) => handleChange("phoneNo", e.target.value)}
                    className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="border border-gray-100 rounded-lg p-3 hover:shadow transition-shadow">
                  <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="border border-gray-100 rounded-lg p-3 hover:shadow transition-shadow">
                <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                  Contact Method
                </label>
                <select
                  value={formData.contactMethod || "Visit"}
                  onChange={(e) =>
                    handleChange("contactMethod", e.target.value)
                  }
                  className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {contactMethodOptions.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Accreditation & Affiliation */}
            <div className="col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* NAAC Accreditation */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    NAAC Accreditation
                  </label>
                  <select
                    value={formData.accreditation || ""}
                    onChange={(e) =>
                      handleChange("accreditation", e.target.value)
                    }
                    className="w-full p-1 border rounded"
                  >
                    <option value="">Select NAAC Grade</option>
                    {accreditationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    University Affiliation
                  </label>
                  <Select
                    options={universitySelectOptions}
                    value={universitySelectOptions.find((opt) => opt.value === formData.affiliation)}
                    onChange={(selected) => handleChange("affiliation", selected ? selected.value : "")}
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
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="col-span-2 space-y-4">
              <div className="border border-gray-100 rounded-lg p-3 hover:shadow transition-shadow">
                <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                  Expected Closure Date
                </label>
                <input
                  type="date"
                  value={formatDateForInput(formData.expectedClosureDate)}
                  onChange={(e) =>
                    handleChange("expectedClosureDate", e.target.value)
                  }
                  className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="mt-2 text-sm text-gray-600">
                  Current Phase:{" "}
                  <span className="font-medium">{formData.phase || "-"}</span>
                </div>
              </div>
            </div>

            {/* Courses Section */}
            <div className="col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Courses</h3>
                <button
                  type="button"
                  onClick={handleAddCourse}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <FiPlus className="-ml-1 mr-1 h-4 w-4" />
                  Add Course
                </button>
              </div>

              {formData.courses.map((course, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 space-y-4 relative"
                >
                  {formData.courses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCourse(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      aria-label="Remove course"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                        Course Type
                      </label>
                      <select
                        value={course.courseType || ""}
                        onChange={(e) =>
                          handleCourseChange(
                            index,
                            "courseType",
                            e.target.value
                          )
                        }
                        className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Course Type</option>
                        {Object.keys(courseSpecializations).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      {course.courseType === "Others" && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={course.manualCourseType || ""}
                            onChange={(e) =>
                              handleCourseChange(
                                index,
                                "manualCourseType",
                                e.target.value
                              )
                            }
                            placeholder="Specify course type"
                            className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                        Passing Year
                      </label>
                      <select
                        value={course.passingYear || ""}
                        onChange={(e) =>
                          handleCourseChange(
                            index,
                            "passingYear",
                            e.target.value
                          )
                        }
                        className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Passing Year</option>
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* New current year dropdown */}
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                        Current Year
                      </label>
                      <select
                        value={course.year || ""}
                        onChange={(e) =>
                          handleCourseChange(index, "year", e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={!course.courseType} // Disable if no course type selected
                      >
                        <option value="">Select Current Year</option>
                        {course.courseType &&
                          courseYears[course.courseType]?.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                      Specializations
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {course.courseType &&
                        courseSpecializations[course.courseType]?.map(
                          (spec) => (
                            <label
                              key={spec}
                              className="flex items-center space-x-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                value={spec}
                                checked={course.specializations.includes(spec)}
                                onChange={(e) =>
                                  handleSpecializationChange(e, index)
                                }
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>{spec}</span>
                            </label>
                          )
                        )}
                    </div>
                    {course.specializations.includes("Other") && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={course.manualSpecialization || ""}
                          onChange={(e) =>
                            handleCourseChange(
                              index,
                              "manualSpecialization",
                              e.target.value
                            )
                          }
                          placeholder="Specify specialization"
                          className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                        Student Count
                      </label>
                      <input
                        type="number"
                        value={course.studentCount || ""}
                        onChange={(e) =>
                          handleCourseChange(
                            index,
                            "studentCount",
                            e.target.value
                          )
                        }
                        className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                        Per Student Cost (₹)
                      </label>
                      <input
                        type="number"
                        value={course.perStudentCost || ""}
                        onChange={(e) =>
                          handleCourseChange(
                            index,
                            "perStudentCost",
                            e.target.value
                          )
                        }
                        className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
                        Course TCV (₹)
                      </label>
                      <input
                        type="text"
                        value={
                          course.courseTCV
                            ? formatIndianNumber(course.courseTCV, 2)
                            : "0.00"
                        }
                        readOnly
                        className="w-full px-2 py-1 border rounded-md bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-white p-4 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-2 py-1 text-sm sm:text-base text-gray-600 hover:text-gray-800 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-medium rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditDetailsModal;
