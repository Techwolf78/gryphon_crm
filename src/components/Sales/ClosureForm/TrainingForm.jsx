import React, { useState, useEffect, useContext, useCallback } from "react";
import { FaTimes } from "react-icons/fa";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { AuthContext } from "../../../context/AuthContext";
import CollegeInfoSection from "./CollegeInfoSection";
import POCInfoSection from "./POCInfoSection";
import StudentBreakdownSection from "./StudentBreakdownSection";
import TopicBreakdownSection from "./TopicBreakdownSection";
import PaymentInfoSection from "./PaymentInfoSection";
import MOUUploadSection from "./MOUUploadSection";
import { toast } from "react-toastify";
import PropTypes from "prop-types";

// Validation functions
const validateCollegeCode = (value) => /^[A-Z]*$/.test(value);
const validatePincode = (value) => /^[0-9]{0,6}$/.test(value);
const validateGST = (value) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value);

const TrainingForm = ({ show, onClose, lead, users }) => {
  const { currentUser } = useContext(AuthContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
  const [studentFileError, setStudentFileError] = useState("");
  const [mouFileError, setMouFileError] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");

  useEffect(() => {
    if (lead) {
      setFormData((prev) => ({
        ...prev,
        collegeName: lead.businessName || "",
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || "",
        studentCount: lead.studentCount || 0,
        totalCost: (lead.studentCount || 0) * (lead.perStudentCost || 0),
        course: lead.courseType || "",
        tpoName: lead.pocName || "",
        tpoEmail: lead.email || "",
        tpoPhone: lead.phoneNo || "",
      }));
      setContractStartDate(lead.contractStartDate || "");
      setContractEndDate(lead.contractEndDate || "");
    }
  }, [lead]);

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
    const { collegeCode, course, year, deliveryType, passingYear } = formData;
    if (collegeCode && course && year && deliveryType && passingYear) {
      const passYear = passingYear.split("-");
      const shortPassYear = `${passYear[0].slice(-2)}-${passYear[1].slice(-2)}`;
      const coursePart = course === "Engineering" ? "ENGG" : course;
      const code = `${collegeCode}/${coursePart}/${year}/${deliveryType}/${shortPassYear}`;
      setFormData((prev) => ({ ...prev, projectCode: code }));
    }
  }, [formData.collegeCode, formData.course, formData.year, formData.deliveryType, formData.passingYear]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setHasUnsavedChanges(true);

    if (name === "collegeCode") {
      setCollegeCodeError(validateCollegeCode(value) ? "" : "Only uppercase letters (A-Z) allowed");
    }
    if (name === "pincode") {
      setPincodeError(validatePincode(value) ? "" : "Pincode must be up to 6 digits only");
    }
    if (name === "gstNumber") {
      setGstError(value && !validateGST(value) ? "Invalid GST number format" : "");
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const uploadFileToCloudinary = async (file, folderName) => {
    const url = "https://api.cloudinary.com/v1_1/da0ypp61n/raw/upload";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "react_profile_upload");
    formData.append("folder", folderName);

    const res = await fetch(url, { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok || !data.secure_url) {
      throw new Error(data.error?.message || "File upload failed");
    }
    return data.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!studentFile) {
      setStudentFileError("Please upload the Student Excel file.");
      setIsSubmitting(false);
      return;
    }
    if (!mouFile) {
      setMouFileError("Please upload the MOU file.");
      setIsSubmitting(false);
      return;
    }
    if (!contractStartDate || !contractEndDate) {
      toast.error("Please select both Contract Start Date and End Date.");
      setIsSubmitting(false);
      return;
    }

    try {
      const toastId = toast.loading("Submitting form and uploading files...");

      const [studentUrl, mouUrl] = await Promise.all([
        uploadFileToCloudinary(studentFile, "training-forms/student-files"),
        uploadFileToCloudinary(mouFile, "training-forms/mou-files"),
      ]);

      if (lead?.id) {
        const leadRef = doc(db, "leads", lead.id);
        await updateDoc(leadRef, {
          phase: "closed",
          closureType: "new",
          closedDate: new Date().toISOString(),
          totalCost: formData.totalCost,
          contractStartDate,
          contractEndDate,
        });
      }

      const assignedUser = users?.[lead?.assignedTo?.uid] || {};

      await addDoc(collection(db, "trainingForms"), {
        ...formData,
        studentFileUrl: studentUrl,
        mouFileUrl: mouUrl,
        contractStartDate,
        contractEndDate,
        createdAt: serverTimestamp(),
        createdBy: {
          email: lead?.assignedTo?.email || assignedUser?.email || "Unknown",
          uid: lead?.assignedTo?.uid || "",
          name: lead?.assignedTo?.name || assignedUser?.name || "",
        },
      });

      toast.update(toastId, {
        render: "Form submitted successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      setHasUnsavedChanges(false);
      setTimeout(onClose, 1000);
    } catch (err) {
      console.error("Error submitting form: ", err);
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && !window.confirm("You have unsaved changes. Are you sure you want to close?")) {
      return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  if (!show || !lead) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center px-4 z-54">
      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-blue-100">
          <h2 className="text-2xl font-bold text-blue-800">Client Onboarding Form</h2>
          <div className="flex items-center space-x-3 w-[450px]">
            <input
              name="projectCode"
              value={formData.projectCode}
              placeholder="Project Code"
              className="px-4 py-2 border rounded-lg text-base w-full font-semibold text-blue-700 bg-gray-100 cursor-not-allowed"
              readOnly
            />
            <button onClick={handleClose} className="text-xl text-red-500 hover:text-red-700" aria-label="Close form">
              <FaTimes />
            </button>
          </div>
        </div>

        <form className="flex-1 overflow-y-auto p-6 space-y-6" onSubmit={handleSubmit}>
          <CollegeInfoSection
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            collegeCodeError={collegeCodeError}
            pincodeError={pincodeError}
            gstError={gstError}
          />
          <POCInfoSection formData={formData} handleChange={handleChange} />
          <StudentBreakdownSection
            formData={formData}
            setFormData={setFormData}
            studentFile={studentFile}
            setStudentFile={setStudentFile}
            studentFileError={studentFileError}
          />
          <TopicBreakdownSection formData={formData} setFormData={setFormData} />
          <PaymentInfoSection formData={formData} setFormData={setFormData} />
          <MOUUploadSection
            mouFile={mouFile}
            setMouFile={setMouFile}
            mouFileError={mouFileError}
            contractStartDate={contractStartDate}
            setContractStartDate={setContractStartDate}
            contractEndDate={contractEndDate}
            setContractEndDate={setContractEndDate}
            docId={lead?.id}
          />

          <div className="pt-4 flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

TrainingForm.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  lead: PropTypes.object,
  users: PropTypes.object,
};

export default TrainingForm;
