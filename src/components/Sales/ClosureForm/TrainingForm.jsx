 
import React, { useState, useEffect, useContext, useCallback } from "react";
import { FaTimes } from "react-icons/fa";
import { collection, serverTimestamp, doc, updateDoc, writeBatch, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { AuthContext } from "../../../context/AuthContext";
import CollegeInfoSection from "./CollegeInfoSection";
import POCInfoSection from "./POCInfoSection";
import StudentBreakdownSection from "./StudentBreakdownSection";
import TopicBreakdownSection from "./TopicBreakdownSection";
import PaymentInfoSection from "./PaymentInfoSection";
import MOUUploadSection from "./MOUUploadSection";
import PropTypes from "prop-types";
import syncLogo from "../../../assets/SYNC-logo.png";
import * as XLSX from "xlsx-js-style";
 
const validateCollegeCode = (value) => /^[A-Z]*$/.test(value);
const validatePincode = (value) => /^[0-9]{0,6}$/.test(value);
const validateGST = (value) =>
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value);
 
const TrainingForm = ({
    show,
    onClose,
    lead,
    users,
    existingFormData,
    isLoading
}) => {
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
        splitTotal: 0
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
    const [duplicateProjectCode, setDuplicateProjectCode] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);
    const isEdit = !!existingFormData; 
 
    // Check if all required fields are filled
    useEffect(() => {
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
            contractEndDate
        ];
 
        // Validate payment splits if payment type is not EMI
        if (formData.paymentType === "EMI") {
            requiredFields.push(formData.emiMonths > 0);
        } else {
            const splitsValid = formData.paymentSplits.length > 0 &&
                formData.paymentSplits.reduce((acc, val) => acc + (parseFloat(val) || 0), 0) === 100;
            requiredFields.push(splitsValid);
        }
 
        // Validate student count
        requiredFields.push(formData.studentCount > 0);
 
        const isValid = requiredFields.every(field => {
            if (typeof field === 'boolean') return field;
            return field && field.toString().trim() !== '';
        });
 
        setIsFormValid(isValid);
    }, [formData, contractStartDate, contractEndDate]);
 
useEffect(() => {
  if (existingFormData) {
    setFormData((prev) => ({
      ...prev,
      ...existingFormData
    }));
    setContractStartDate(existingFormData.contractStartDate || "");
    setContractEndDate(existingFormData.contractEndDate || "");
  } else if (lead) {
    // fallback agar existingFormData nahi diya
    setFormData((prev) => ({
      ...prev,
      collegeName: lead.businessName || "",
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      studentCount: lead.studentCount || 0,
      totalCost: (lead.studentCount || 0) * (lead.perStudentCost || 0),
      perStudentCost: lead.perStudentCost || 0,
      course: lead.courseType || "",
      tpoName: lead.pocName || "",
      tpoEmail: lead.email || "",
      tpoPhone: lead.phoneNo || "",
    }));
    setContractStartDate(lead.contractStartDate || "");
    setContractEndDate(lead.contractEndDate || "");
  }
}, [existingFormData, lead]);

 
 
    // Rest of your existing useEffect hooks remain the same...
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
                perStudentCost: lead.perStudentCost || 0,
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
            setDuplicateProjectCode(false); // Reset duplicate flag when project code changes
        }
    }, [
        formData.collegeCode,
        formData.course,
        formData.year,
        formData.deliveryType,
        formData.passingYear,
        [formData.projectCode]
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
 
            const sum = formData.paymentSplits.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
            if (typeof sum !== 'number' || isNaN(sum)) {
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
        if (name === "gstNumber") {
            setGstError(value && !validateGST(value) ? "Invalid GST number format" : "");
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
 
    const uploadStudentsToFirestore = async (studentList, formId) => {
        try {
            if (!studentList || studentList.length === 0) return;
 
            const batch = writeBatch(db);
            const studentsCollectionRef = collection(db, "trainingForms", formId, "students");
 
            studentList.forEach((student) => {
                const docRef = doc(studentsCollectionRef);
                batch.set(docRef, student);
            });
 
            await batch.commit();
        } catch (error) {
            console.error("Error uploading students:", error);
            throw error;
        }
    };
 
    const handleStudentFile = (file) => {
        setStudentFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(sheet);
                setFormData((prev) => ({ ...prev, studentList: jsonData }));
            };
            reader.readAsArrayBuffer(file);
        } else {
            setFormData((prev) => ({ ...prev, studentList: [] }));
        }
    };
 
    const checkDuplicateProjectCode = async (projectCode) => {
        try {
            const sanitizedProjectCode = projectCode.replace(/\//g, "-");
            const formRef = doc(db, "trainingForms", sanitizedProjectCode);
            const existingDoc = await getDoc(formRef);
            return existingDoc.exists();
        } catch (error) {
            console.error("Error checking duplicate project code:", error);
            return false;
        }
    };
 const isEditMode = !!existingFormData;

 
    const handleSubmit = async (e) => {
        e.preventDefault();
 
        // Basic form validation
        if (!e.target.checkValidity()) {
            const firstInvalid = e.target.querySelector(':invalid');
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
                closureType: closureType, // dynamic
                closedDate: new Date().toISOString(),
                totalCost: formData.totalCost,
                perStudentCost: formData.perStudentCost,
                contractStartDate,
                contractEndDate,
                projectCode: rawProjectCode
            });
            }
 
            // Upload files (if they exist)
            const [studentUrl, mouUrl] = await Promise.all([
                studentFile ? uploadFileToCloudinary(studentFile, "training-forms/student-files") : null,
                mouFile ? uploadFileToCloudinary(mouFile, "training-forms/mou-files") : null
            ]);
 
            const assignedUser = users?.[lead?.assignedTo?.uid] || {};
            const { studentList, ...formDataWithoutStudents } = formData;
 
            // Prepare payment details for Firestore
            const paymentDetails = formData.paymentDetails.map(detail => ({
                ...detail,
                baseAmount: parseFloat(detail.baseAmount),
                gstAmount: parseFloat(detail.gstAmount),
                totalAmount: parseFloat(detail.totalAmount),
                percentage: parseFloat(detail.percentage),
            }));
 
            const sanitizedProjectCode = rawProjectCode.replace(/\//g, "-");
 
            // Save form data
            await setDoc(doc(db, "trainingForms", sanitizedProjectCode), {
                ...formDataWithoutStudents,
                paymentDetails,
                studentFileUrl: studentUrl,
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
                status: "active",
                lastUpdated: serverTimestamp()
            });
 
            // Upload students (if student list exists)
            if (studentList && studentList.length > 0) {
                await uploadStudentsToFirestore(studentList, sanitizedProjectCode);
            }
 
            setHasUnsavedChanges(false);
            setTimeout(onClose, 1000);
        } catch (err) {
            console.error("Error submitting form: ", err);
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
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-fadeIn">
                <div className="flex justify-between items-center px-6 py-4 border-b bg-blue-100">
                    <h2 className="text-2xl font-bold text-blue-800">Client Onboarding Form</h2>
                    <div className="flex items-center space-x-3 w-[450px]">
                        <input
                            name="projectCode"
                            value={formData.projectCode}
                            placeholder="Project Code"
                            className={`px-4 py-2 border rounded-lg text-base w-full font-semibold ${duplicateProjectCode ? "text-red-600 bg-red-50 border-red-300" : "text-blue-700 bg-gray-100"
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
                        <div className="absolute top-16 right-6 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg shadow-lg">
                            This project code already exists!
                        </div>
                    )}
                </div>
                <form className="flex-1 overflow-y-auto p-6 space-y-6" onSubmit={handleSubmit} noValidate>
                    <CollegeInfoSection
                        formData={formData}
                        setFormData={setFormData}
                        handleChange={handleChange}
                        collegeCodeError={collegeCodeError}
                        pincodeError={pincodeError}
                        gstError={gstError}
                        isEdit ={isEdit}
                     
                        
                    />
                    <POCInfoSection formData={formData} handleChange={handleChange} />
                    <StudentBreakdownSection
                        formData={formData}
                        setFormData={setFormData}
                        studentFile={studentFile}
                        setStudentFile={handleStudentFile}
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
TrainingForm.propTypes = {
    show: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    lead: PropTypes.object,
    users: PropTypes.object,
    existingFormData: PropTypes.object, // Add this
    isLoading: PropTypes.bool, // Add this
};
 
export default TrainingForm;
 