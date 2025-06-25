import React, { useState, useEffect } from "react";
import stateCityData from "../Sales/stateCityData";
import { auth, db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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

function AddCollegeModal({ show, onClose }) {
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

    const newLead = {
      businessName,
      address,
      pocName,
      phoneNo,
      email,
      state,
      city,
      expectedClosureDate: expectedClosureTimestamp,
      courseType,
      specialization,
      studentCount: parseInt(studentCount),
      perStudentCost: parseFloat(perStudentCost),
      tcv,
      phase,
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
    courseType &&
    specialization;

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-52 bg-black/40 backdrop-blur-sm flex items-center justify-center px-2 py-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg p-6 sm:p-8 overflow-y-auto max-h-[95vh]">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Add New College Lead
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* College Name */}
          <div className="col-span-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              College Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Acme College"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Address */}
          <div className="col-span-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* POC Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              POC Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={pocName}
              onChange={(e) => setPocName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Phone No.<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
              placeholder="e.g. +91 9876543210"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Email */}
          <div className="col-span-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. contact@college.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* State */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              State<span className="text-red-500">*</span>
            </label>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setCity("");
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select State</option>
              {Object.keys(stateCityData).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          {state && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                City<span className="text-red-500">*</span>
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Select City</option>
                {stateCityData[state].map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Expected Closure Date */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Expected Closure Date
            </label>
            <input
              type="date"
              value={expectedClosureDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setExpectedClosureDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Course Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Course Type<span className="text-red-500">*</span>
            </label>
            <select
              value={courseType}
              onChange={(e) => {
                setCourseType(e.target.value);
                setSpecialization("");
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select Course</option>
              {Object.keys(courseSpecializations).map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          {/* Specialization */}
          {courseType && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Specialization<span className="text-red-500">*</span>
              </label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Select Specialization</option>
                {courseSpecializations[courseType].map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student Count, Per Student Cost, TCV */}
          <div className="col-span-1 md:col-span-2 flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Student Count
              </label>
              <input
                type="number"
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value)}
                placeholder="e.g. 120"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Per Student Cost
              </label>
              <input
                type="number"
                value={perStudentCost}
                onChange={(e) => setPerStudentCost(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                TCV
              </label>
              <input
                type="number"
                value={tcv}
                disabled
                className="w-full px-4 py-2 border border-gray-300 bg-gray-100 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={handleClose}
            className="text-sm text-gray-600 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleAddBusiness}
            disabled={!isFormValid}
            className={`px-6 py-2.5 rounded-lg font-semibold text-white transition ${
              isFormValid
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Add Business
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddCollegeModal;
