import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaTimes } from "react-icons/fa";
import {
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import DMCollegeInfoSection from "./DMCollegeInfoSection";
import DMPOCInfoSection from "./DMPOCInfoSection";
import DMStudentBreakdownSection from "./DMStudentBreakdownSection";
import DMPaymentInfoSection from "./DMPaymentInfoSection";
import DMMOUUploadSection from "./DMMOUUploadSection";
import PropTypes from "prop-types";
import syncLogo from "../../assets/SYNC-logo.png";

const validateCollegeCode = (value) => /^[A-Z]*$/.test(value);
const validatePincode = (value) => /^[0-9]{0,6}$/.test(value);

const EditDMForm = ({
  show,
  onClose,
  existingFormData,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [formData, setFormData] = useState({
    projectCode: "",
    collegeName: "",
    collegeCode: "",
    address: "",
    city: "",
    state: "",
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
    year: "",
    deliveryType: "",
    passingYear: "",
    studentList: [],
    courses: [{ specialization: "", students: "" }],
    paymentType: "",
    gstType: "",
    perStudentCost: 0,
    totalCost: 0,
    studentCount: 0,
    paymentSplits: [],
    emiMonths: 0,
    emiSplits: [],
    gstAmount: 0,
    netPayableAmount: 0,
    paymentDetails: [],
    invoiceNumber: "",
    additionalNotes: "",
    splitTotal: 0,
  });
  const [collegeCodeError, setCollegeCodeError] = useState("");
  const [pincodeError, setPincodeError] = useState("");
  const [mouFile, setMouFile] = useState(null);
  const [mouFileError] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);

  // Check if all required fields are filled
  const isFormValidComputed = useMemo(() => {
    const requiredFields = [
      formData.projectCode,
      formData.collegeName,
      formData.collegeCode,
      formData.address,
      formData.city,
      formData.state,
      formData.pincode,
      formData.tpoName,
      formData.tpoEmail,
      formData.tpoPhone,
      formData.course,
      formData.year,
      formData.deliveryType,
      formData.passingYear,
      formData.paymentType,
      formData.gstType,
      contractStartDate,
      contractEndDate,
    ];

    // Validate payment splits if payment type is not EMI
    if (formData.paymentType === "EMI") {
      requiredFields.push(formData.emiMonths > 0);
    } else {
      const splitsValid =
        formData.paymentSplits.length > 0 &&
        formData.paymentSplits.reduce(
          (acc, val) => acc + (parseFloat(val) || 0),
          0
        ) === 100;
      requiredFields.push(splitsValid);
    }

    const isValid = requiredFields.every((field) => {
      if (typeof field === "boolean") return field;
      return field && field.toString().trim() !== "";
    });

    return isValid;
  }, [
    formData.projectCode,
    formData.collegeName,
    formData.collegeCode,
    formData.address,
    formData.city,
    formData.state,
    formData.pincode,
    formData.tpoName,
    formData.tpoEmail,
    formData.tpoPhone,
    formData.course,
    formData.year,
    formData.deliveryType,
    formData.passingYear,
    formData.paymentType,
    formData.gstType,
    formData.emiMonths,
    formData.paymentSplits,
    contractStartDate,
    contractEndDate
  ]);

  useEffect(() => {
    setIsFormValid(isFormValidComputed);
  }, [isFormValidComputed]);

  useEffect(() => {
    if (existingFormData) {
      setFormData(prev => ({ ...prev, ...existingFormData }));
      if (existingFormData.contractStartDate) {
        setContractStartDate(existingFormData.contractStartDate);
      }
      if (existingFormData.contractEndDate) {
        setContractEndDate(existingFormData.contractEndDate);
      }
    }
  }, [existingFormData]);

  const validatePaymentSection = () => {
    if (!formData.paymentType) {
      return false;
    }

    if (!formData.gstType) {
      return false;
    }

    if (formData.paymentType === "EMI") {
      if (!formData.emiMonths || formData.emiMonths <= 0) {
        return false;
      }
    } else {
      if (!formData.paymentSplits || formData.paymentSplits.length === 0) {
        return false;
      }

      const sum = formData.paymentSplits.reduce(
        (acc, val) => acc + (parseFloat(val) || 0),
        0
      );
      if (typeof sum !== "number" || isNaN(sum)) {
        return false;
      }
      if (Math.abs(sum - 100) > 0.01) {
        return false;
      }

      if (sum.toFixed(2) !== "100.00") {
        return false;
      }
    }

    return true;
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setHasUnsavedChanges(true);
    if (name === "collegeCode") {
      setCollegeCodeError(
        validateCollegeCode(value) ? "" : "Only uppercase letters (A-Z) allowed"
      );
    }
    if (name === "pincode") {
      setPincodeError(
        validatePincode(value) ? "" : "Pincode must be up to 6 digits only"
      );
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const uploadFileToCloudinary = async (file, folderName) => {
    if (!file) return null;
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

    // Basic form validation
    if (!e.target.checkValidity()) {
      const firstInvalid = e.target.querySelector(":invalid");
      if (firstInvalid) {
        firstInvalid.focus();
      }
      return;
    }

    // Payment section validation
    if (!validatePaymentSection()) {
      return;
    }

    // Contract dates validation
    if (!contractStartDate || !contractEndDate) {
      return;
    }

    // Calculate closureType based on contract end date
    const today = new Date();
    const endDate = new Date(contractEndDate);
    const diffTime = endDate - today;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    let closureType = "new";
    if (diffDays <= 90 && diffDays >= 0) {
        closureType = "renewal";
    }

    setIsSubmitting(true);

    try {
      const rawProjectCode = formData.projectCode;

      // Upload files (if they exist)
      const [mouUrl] = await Promise.all([
        mouFile ? uploadFileToCloudinary(mouFile, "training-forms/mou-files") : null
      ]);

      const formDataWithoutStudents = formData;

      const paymentDetails = formData.paymentDetails.map(detail => ({
        ...detail,
        baseAmount: parseFloat(detail.baseAmount),
        gstAmount: parseFloat(detail.gstAmount),
        totalAmount: parseFloat(detail.totalAmount),
        percentage: parseFloat(detail.percentage),
      }));

      const sanitizedProjectCode = rawProjectCode.replace(/\//g, "-");

      const updateData = {
        ...formDataWithoutStudents,
        paymentDetails,
        mouFileUrl: mouUrl,
        contractStartDate,
        contractEndDate,
        totalCost: parseFloat(formData.totalCost),
        perStudentCost: parseFloat(formData.perStudentCost),
        gstAmount: parseFloat(formData.gstAmount),
        netPayableAmount: parseFloat(formData.netPayableAmount),
        studentCount: parseInt(formData.studentCount),
        status: closureType,
        lastUpdated: serverTimestamp()
      };

      await updateDoc(doc(db, "digitalMarketing", sanitizedProjectCode), updateData);
      await updateDoc(doc(db, "placementData", sanitizedProjectCode), updateData);

      setHasUnsavedChanges(false);
      setTimeout(onClose, 1000);
    } catch (err) {
      console.error("Error updating training form:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = useCallback(() => {
    if (
      hasUnsavedChanges &&
      !window.confirm("You have unsaved changes. Are you sure you want to close?")
    ) {
      return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  if (!show || !existingFormData) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center px-4 z-54">
      <div className="bg-white w-full max-w-7xl h-[98vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-fadeIn">
        <div className="flex justify-between items-center px-4 py-2 border-b bg-blue-100">
          <h2 className="text-xl font-bold text-blue-800">Edit Digital Marketing Contract</h2>
          <div className="flex items-center space-x-3 w-[450px]">
            <input
              name="projectCode"
              value={formData.projectCode}
              placeholder="Project Code"
              className="px-3 py-1 border rounded-lg text-base w-full font-semibold text-blue-700 bg-gray-100 cursor-not-allowed"
              readOnly
            />
            <button
              onClick={handleClose}
              className="text-xl text-red-500 hover:text-red-700"
              aria-label="Close form"
            >
              <FaTimes />
            </button>
          </div>
        </div>
        <form className="flex-1 overflow-y-auto p-4 space-y-4" onSubmit={handleSubmit} noValidate>
          <DMCollegeInfoSection
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            collegeCodeError={collegeCodeError}
            pincodeError={pincodeError}
            isEdit={true}
          />
          <DMPOCInfoSection formData={formData} handleChange={handleChange} />
          <DMStudentBreakdownSection
            formData={formData}
            setFormData={setFormData}
          />
          <DMPaymentInfoSection formData={formData} setFormData={setFormData} />
          <DMMOUUploadSection
            mouFile={mouFile}
            setMouFile={setMouFile}
            mouFileError={mouFileError}
            contractStartDate={contractStartDate}
            setContractStartDate={setContractStartDate}
            contractEndDate={contractEndDate}
            setContractEndDate={setContractEndDate}
          />
          <div className="pt-2 flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1 border border-gray-300 rounded-lg hover:bg-gray-100"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-1 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
        {isSubmitting && (
          <div className="absolute inset-0 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
            <div className="relative w-24 h-24 animate-spin-slow">
              <img
                src={syncLogo}
                alt="Loading"
                className="absolute inset-0 w-16 h-16 m-auto z-10"
              />
              <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

EditDMForm.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  existingFormData: PropTypes.object.isRequired,
};

export default EditDMForm;