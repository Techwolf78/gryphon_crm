import React, { useState, useEffect, useContext } from "react";
import { FaTimes } from "react-icons/fa";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { AuthContext } from "../../../context/AuthContext";

import CollegeInfoSection from "./CollegeInfoSection";
import POCInfoSection from "./POCInfoSection";
import StudentBreakdownSection from "./StudentBreakdownSection";
import TopicBreakdownSection from "./TopicBreakdownSection";
import PaymentInfoSection from "./PaymentInfoSection";
import MOUUploadSection from "./MOUUploadSection";

const TrainingForm = ({ show, onClose, lead, users }) => {
  const { currentUser } = useContext(AuthContext);


  const [formData, setFormData] = useState({
    projectCode: "",
    collegeName: lead?.businessName || "",
    collegeCode: "",
    address: lead?.address || "",
    city: lead?.city || "",
    state: lead?.state || "",
    pincode: "",
    gstNumber: "",

    tpoName: "",
    tpoEmail: "",
    tpoPhone: "",
    trainingName: "",
    trainingEmail: "",
    trainingPhone: "",
    accountName: "",
    accountEmail: "",
    accountPhone: "",

    course: "",
    otherCourseText: "",
    year: "",
    deliveryType: "",
    passingYear: "",
    studentList: [],
    courses: [{ specialization: "", othersSpecText: "", students: "" }],

    topics: [{ topic: "", hours: "" }],

    paymentType: "",
    gstType: "include",
    perStudentCost: 0,
    totalCost: 0,
    studentCount: 0,

    paymentSplits: [],
    emiMonths: 0,
    emiSplits: [],

    invoiceNumber: "",
    additionalNotes: "",
    splitTotal: 0,
  });

  const [collegeCodeError, setCollegeCodeError] = useState("");
  const [pincodeError, setPincodeError] = useState("");
  const [gstError, setGstError] = useState("");
  const [studentFile, setStudentFile] = useState(null);
  const [mouFile, setMouFile] = useState(null);

  useEffect(() => {
    const totalStudents = formData.courses.reduce(
      (sum, item) => sum + (parseInt(item.students) || 0),
      0
    );
    setFormData((prev) => ({
      ...prev,
      studentCount: totalStudents,
      totalCost: totalStudents * (parseFloat(prev.perStudentCost) || 0),
    }));
  }, [formData.courses, formData.perStudentCost]);

  useEffect(() => {
    if (
      formData.collegeCode &&
      formData.course &&
      formData.year &&
      formData.deliveryType &&
      formData.passingYear
    ) {
      const passYear = formData.passingYear.split("-");
      const shortPassYear = `${passYear[0].slice(-2)}-${passYear[1].slice(-2)}`;

      const coursePart = formData.course === "Engineering" ? "ENGG" : formData.course;

      const code = `${formData.collegeCode}/${coursePart}/${formData.year}/${formData.deliveryType}/${shortPassYear}`;
      setFormData((prev) => ({ ...prev, projectCode: code }));
    }
  }, [formData.collegeCode, formData.course, formData.year, formData.deliveryType, formData.passingYear]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "collegeCode") {
      const isValid = /^[A-Z]*$/.test(value);
      setCollegeCodeError(isValid ? "" : "Only uppercase letters (A-Z) allowed");
    }

    if (name === "pincode") {
      const isValid = /^[0-9]{0,6}$/.test(value);
      setPincodeError(
        value && !isValid ? "Pincode must be up to 6 digits only" : ""
      );
    }

    if (name === "gstNumber") {
      const isValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value);
      setGstError(
        value && !isValid ? "Invalid GST number format" : ""
      );
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const assignedUser = users?.[lead?.assignedTo?.uid] || {};

      await addDoc(collection(db, "trainingForms"), {
        projectCode: formData.projectCode,
        collegeName: formData.collegeName,
        collegeCode: formData.collegeCode,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        gstNumber: formData.gstNumber,
        tpoName: formData.tpoName,
        tpoEmail: formData.tpoEmail,
        tpoPhone: formData.tpoPhone,
        trainingName: formData.trainingName,
        trainingEmail: formData.trainingEmail,
        trainingPhone: formData.trainingPhone,
        accountName: formData.accountName,
        accountEmail: formData.accountEmail,
        accountPhone: formData.accountPhone,
        course: formData.course,
        otherCourseText: formData.otherCourseText,
        year: formData.year,
        deliveryType: formData.deliveryType,
        passingYear: formData.passingYear,
        studentCount: formData.studentCount,
        perStudentCost: formData.perStudentCost,
        totalCost: formData.totalCost,
        paymentType: formData.paymentType,
        gstType: formData.gstType,
        invoiceNumber: formData.invoiceNumber,
        additionalNotes: formData.additionalNotes,
        splitTotal: formData.splitTotal,
        paymentSplits: [...formData.paymentSplits],
        emiSplits: [...formData.emiSplits],
        courses: [...formData.courses],
        topics: [...formData.topics],
        createdAt: serverTimestamp(),
        createdBy: {
          email: lead?.assignedTo?.email || assignedUser?.email || "Unknown",
          uid: lead?.assignedTo?.uid || "",
          name: lead?.assignedTo?.name || assignedUser?.name || ""
        }
      });

      alert("Form submitted successfully!");
      onClose();
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Something went wrong. Please try again.");
    }
  };

    if (!show || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-blue-100">
          <h2 className="text-xl font-bold text-gray-800">Client Onboarding Form</h2>
          <div className="flex items-center space-x-3 w-[450px]">
            <input
              name="projectCode"
              value={formData.projectCode}
              placeholder="Project Code"
              className="px-4 py-2 border rounded-lg text-base w-full font-semibold text-blue-700 bg-gray-100 cursor-not-allowed shadow-sm"
              readOnly
            />
            <button onClick={onClose} className="text-xl text-red-500 hover:text-red-700">
              <FaTimes />
            </button>
          </div>
        </div>

        <form className="flex-1 overflow-y-auto p-6 space-y-6 text-sm" onSubmit={handleSubmit}>
          <CollegeInfoSection 
            formData={formData} 
            setFormData={setFormData} 
            handleChange={handleChange} 
            collegeCodeError={collegeCodeError} 
            pincodeError={pincodeError} 
            gstError={gstError} 
          />
          <POCInfoSection formData={formData} handleChange={handleChange} />
          <StudentBreakdownSection formData={formData} setFormData={setFormData} studentFile={studentFile} setStudentFile={setStudentFile} />
          <TopicBreakdownSection formData={formData} setFormData={setFormData} />
          <PaymentInfoSection formData={formData} setFormData={setFormData} />
          <MOUUploadSection mouFile={mouFile} setMouFile={setMouFile} />

          <div className="pt-4">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Submit
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.98);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TrainingForm;
