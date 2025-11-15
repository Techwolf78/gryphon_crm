import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaTimes } from "react-icons/fa";
import {
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  getDoc,
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

const DMTrainingForm = ({
  show,
  onClose,
  lead,
  users,
  existingFormData,
}) => {
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
    year: "",
    deliveryType: "",
    passingYear: "",
    studentList: [],
    courses: [{ specialization: "", students: "" }], // Remove specializationText
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
  const [contractStartDate, setContractStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [contractEndDate, setContractEndDate] = useState(() => {
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
  });
  const [duplicateProjectCode, setDuplicateProjectCode] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isEdit = !!existingFormData;

  const checkDuplicateProjectCode = useCallback(async (projectCode) => {
    try {
      const sanitizedProjectCode = projectCode.replace(/\//g, "-");
      const formRef = doc(db, "digitalMarketing", sanitizedProjectCode);
      const existingDoc = await getDoc(formRef);
      return existingDoc.exists();
    } catch {
      return false;
    }
  }, []);

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
    }) && !duplicateProjectCode; // Also check for duplicate project code

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
    contractEndDate,
    duplicateProjectCode
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
    } else if (lead) {
      // fallback agar existingFormData nahi diya
      setFormData((prev) => ({
        ...prev,
        collegeName: lead.businessName || "",
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || "",
        studentCount: lead.studentCount || 0,
        totalCost: lead.totalCost || 0,
        perStudentCost: lead.perStudentCost || 0,
        course: lead.courseType || "",
        tpoName: lead.pocName || "",
        tpoEmail: lead.email || "",
        tpoPhone: lead.phoneNo || "",
      }));
      if (lead.contractStartDate) {
        setContractStartDate(lead.contractStartDate);
      }
      if (lead.contractEndDate) {
        setContractEndDate(lead.contractEndDate);
      }
    }
  }, [existingFormData, lead]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const { collegeCode, course, year, deliveryType, passingYear } = formData;
    if (collegeCode && course && year && deliveryType && passingYear) {
      const passYear = passingYear.split("-");
      const shortPassYear = `${passYear[0].slice(-2)}-${passYear[1].slice(-2)}`;
      const coursePart = course === "Engineering" ? "ENGG" : course;
      const code = `${collegeCode}/${coursePart}/${year}/${deliveryType}/${shortPassYear}`;
      setFormData((prev) => ({ ...prev, projectCode: code }));
      
      if (!isEdit && !isSubmitting && !isSubmitted) {
        checkDuplicateProjectCode(code).then((isDuplicate) => {
          setDuplicateProjectCode(isDuplicate);
        }).catch(() => {
          setDuplicateProjectCode(false);
        });
      } else {
        setDuplicateProjectCode(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.collegeCode,
    formData.course,
    formData.year,
    formData.deliveryType,
    formData.passingYear,
    isEdit,
    checkDuplicateProjectCode,
    isSubmitting,
    isSubmitted
  ]);

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
      // Clear duplicate error when college code changes
      if (duplicateProjectCode) {
        setDuplicateProjectCode(false);
      }
    }
    if (name === "pincode") {
      setPincodeError(
        validatePincode(value) ? "" : "Pincode must be up to 6 digits only"
      );
    }
    // Clear duplicate error when fields that affect project code change
    if (["course", "year", "deliveryType", "passingYear"].includes(name) && duplicateProjectCode) {
      setDuplicateProjectCode(false);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, [duplicateProjectCode]);

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

  const isEditMode = !!existingFormData;

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

    setIsSubmitting(true);
    setDuplicateProjectCode(false); // Clear any previous duplicate error

    try {
      const rawProjectCode = formData.projectCode;

      if (!isEditMode) {
        const isDuplicate = await checkDuplicateProjectCode(rawProjectCode);
        if (isDuplicate) {
          setDuplicateProjectCode(true);
          setIsSubmitting(false);
          return;
        }
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
            // Update lead if exists
           if (lead?.id) {
            const leadRef = doc(db, "leads", lead.id);
            await updateDoc(leadRef, {
                phase: "closed",
                closureType: closureType,
                closedDate: new Date().toISOString(),
                totalCost: formData.totalCost,
                perStudentCost: formData.perStudentCost,
                contractStartDate,
                contractEndDate,
                projectCode: rawProjectCode
            });
            }
 
            // Upload files (if they exist)
            const [mouUrl] = await Promise.all([
                mouFile ? uploadFileToCloudinary(mouFile, "training-forms/mou-files") : null
            ]);
 
            const assignedUser = users?.[lead?.assignedTo?.uid] || {};
            const formDataWithoutStudents = formData; // No need to remove studentList anymore

            // No more cleaning - use data as-is
            const paymentDetails = formData.paymentDetails.map(detail => ({
              ...detail,
              baseAmount: parseFloat(detail.baseAmount),
              gstAmount: parseFloat(detail.gstAmount),
              totalAmount: parseFloat(detail.totalAmount),
              percentage: parseFloat(detail.percentage),
            }));

            const sanitizedProjectCode = rawProjectCode.replace(/\//g, "-");

            const formDocData = {
              ...formDataWithoutStudents, // Direct use without cleaning
              paymentDetails,
              mouFileUrl: mouUrl,
              contractStartDate,
              contractEndDate,
              totalCost: parseFloat(formData.totalCost),
              perStudentCost: parseFloat(formData.perStudentCost),
              gstAmount: parseFloat(formData.gstAmount),
              netPayableAmount: parseFloat(formData.netPayableAmount),
              studentCount: parseInt(formData.studentCount),
              createdAt: serverTimestamp(),
              createdBy: {
                email: lead?.assignedTo?.email || assignedUser?.email || "Unknown",
                uid: lead?.assignedTo?.uid || "",
                name: lead?.assignedTo?.name || assignedUser?.name || "",
              },
              status: closureType,
              lastUpdated: serverTimestamp()
            };
            try {
              await setDoc(doc(db, "digitalMarketing", sanitizedProjectCode), formDocData);
              await setDoc(doc(db, "placementData", sanitizedProjectCode), formDocData);
            } catch (error) {
              console.error("Error saving training form:", error);
            }

            setHasUnsavedChanges(false);
            setIsSubmitted(true);
            setTimeout(onClose, 1000);
        } catch (err) {
          console.error("Error submitting training form:", err);
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
 
    if (!show || !lead) return null;
 
    return (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center px-4 z-54">
            <div className="bg-white w-full max-w-7xl h-[98vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-fadeIn">
                <div className="flex justify-between items-center px-4 py-2 border-b bg-blue-100">
                    <h2 className="text-xl font-bold text-blue-800">Digital Marketing Onboarding Form</h2>
                    <div className="flex items-center space-x-3 w-[450px]">
                        <input
                            name="projectCode"
                            value={formData.projectCode}
                            placeholder="Project Code"
                            className={`px-3 py-1 border rounded-lg text-base w-full font-semibold ${duplicateProjectCode ? "text-red-600 bg-red-50 border-red-300" : "text-blue-700 bg-gray-100"
                                } cursor-not-allowed`}
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
                    {duplicateProjectCode && (
                        <div className="absolute top-16 right-6 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg shadow-lg max-w-xs">
                            <div className="font-medium">Project Code Already Exists!</div>
                            <div className="text-sm mt-1">Please change the college code, course, year, or delivery type to generate a unique project code.</div>
                        </div>
                    )}
                </div>
                <form className="flex-1 overflow-y-auto p-4 space-y-4" onSubmit={handleSubmit} noValidate>
                    <DMCollegeInfoSection
                        formData={formData}
                        setFormData={setFormData}
                        handleChange={handleChange}
                        collegeCodeError={collegeCodeError}
                        pincodeError={pincodeError}
                        isEdit ={isEdit}
                     
                        
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
                            {isSubmitting ? "Submitting..." : "Submit"}
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
DMTrainingForm.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  lead: PropTypes.object,
  users: PropTypes.object,
  existingFormData: PropTypes.object, // Add this
};

export default DMTrainingForm;