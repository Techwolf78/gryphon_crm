
import React, { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { FiX, FiChevronDown, FiInfo, FiDollarSign, FiPercent, FiUser, FiPhone, FiCreditCard, FiMail, FiMapPin, FiCalendar, FiArrowLeft, FiArrowRight, FiCheck, FiPlus, FiTrash2 } from "react-icons/fi";

const EditClosedLeadModal = ({ lead, onClose, onSave }) => {
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeSection, setActiveSection] = useState("basic");
    const [showConfirmation, setShowConfirmation] = useState(false); // New state for confirmation dialog
    const sections = ['basic', 'contacts', 'course', 'topics', 'financial',];
    useEffect(() => {
        if (lead) {
            const initialStudentCount = lead.courses?.reduce((sum, course) => sum + (course.students || 0), 0) || 0;
            setFormData({
                ...lead,
                businessName: lead.collegeName || "",
                projectCode: lead.projectCode || "",
                city: lead.city || "",
                state: lead.state || "",
                totalCost: lead.totalCost || 0,
                tcv: lead.tcv || 0,
                perStudentCost: lead.perStudentCost || 0,
                studentCount: lead.studentCount || 0,
                gstAmount: lead.gstAmount || 0,
                netPayableAmount: lead.netPayableAmount || 0,
                gstNumber: lead.gstNumber || "",
                gstType: lead.gstType || "include",
                course: lead.course || "", // Changed from array to string
                courses: lead.courses || [{
                    specialization: "",
                    students: 0,
                    othersSpecText: ""
                }],
                year: lead.year || "",
                deliveryType: lead.deliveryType || "",
                passingYear: lead.passingYear || "",
                tpoName: lead.tpoName || "",
                tpoEmail: lead.tpoEmail || "",
                tpoPhone: lead.tpoPhone || "",
                trainingName: lead.trainingName || "",
                trainingEmail: lead.trainingEmail || "",
                trainingPhone: lead.trainingPhone || "",
                accountName: lead.accountName || "",
                accountEmail: lead.accountEmail || "",
                accountPhone: lead.accountPhone || "",
                contractStartDate: lead.contractStartDate || "",
                contractEndDate: lead.contractEndDate || "",
                paymentType: lead.paymentType || "",
                paymentDetails: lead.paymentDetails || [],
                collegeCode: lead.collegeCode || "",
                collegeName: lead.collegeName || "",
                address: lead.address || "",
                pincode: lead.pincode || "",
                status: lead.status || "active",
                topics: lead.topics || [{
                    topic: "",
                    hours: ""
                }],
                totalHours: lead.totalHours || 0,
                studentFileUrl: lead.studentFileUrl || "",
                mouFileUrl: lead.mouFileUrl || "",
                otherCourseText: lead.otherCourseText || ""
            });
        }
    }, [lead]);

    const courseOptions = ["Engineering", "MBA", "BBA", "BCA", "MCA", "Diploma", "BSC", "MSC", "Others"];
    const courseYears = {
        Engineering: ["1st", "2nd", "3rd", "4th"],
        MBA: ["1st", "2nd"],
        BBA: ["1st", "2nd", "3rd"],
        BCA: ["1st", "2nd", "3rd"],
        BSC: ["1st", "2nd", "3rd"],
        MCA: ["1st", "2nd"],
        Diploma: ["1st", "2nd", "3rd"],
        MSC: ["1st", "2nd"],
        Others: ["1st", "2nd"]
    };

    const deliveryTypes = [
        { value: "TP", label: "TP - Training Placement" },
        { value: "OT", label: "OT - Only Training" },
        { value: "IP", label: "IP - Induction Program" },
        { value: "DM", label: "DM - Digital Marketing" },
        { value: "SNS", label: "SNS - SNS" }
    ];

    const courseSpecializations = {
        Engineering: ["CS", "IT", "ENTC", "CS-Cyber Security", "Mechanical", "Civil", "Electrical", "Chemical", "CS-AI-ML", "CS-AI-DS", "Other"],
        MBA: ["Marketing", "Finance", "HR", "Operations", "Other"],
        BBA: ["International Business", "General", "Finance", "Other"],
        BCA: ["Computer Applications", "Other"],
        MCA: ["Computer Science", "Other"],
        Diploma: ["Mechanical", "Civil", "Electrical", "Computer", "Other"],
        BSC: ["Physics", "Chemistry", "Mathematics", "CS", "Other"],
        MSC: ["Physics", "Chemistry", "Mathematics", "CS", "Other"],
        Others: ["Other"]
    };
    const topicOptions = ["Soft Skills", "Aptitude", "Domain Technical", "Excel - Power BI", "Looker Studio"]

    const generatePassingYears = () => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 16 }, (_, i) => `${currentYear - 5 + i}-${currentYear - 4 + i}`);
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name.includes("Amount") || name.includes("Cost") || name.includes("Hours") ?
                parseFloat(value) || 0 :
                value
        }));
    };

    const handlePaymentDetailChange = (index, field, value) => {
        const updatedPaymentDetails = [...formData.paymentDetails];
        updatedPaymentDetails[index][field] = field === "percentage" || field === "baseAmount" || field === "gstAmount" || field === "totalAmount"
            ? parseFloat(value) || 0
            : value;

        setFormData(prev => ({
            ...prev,
            paymentDetails: updatedPaymentDetails
        }));
    };

    const handleCourseChange = (index, field, value) => {
        const updatedCourses = [...formData.courses];
        updatedCourses[index][field] = field === "students" ? parseInt(value) || 0 : value;

        const totalStudents = updatedCourses.reduce((sum, course) => sum + (course.students || 0), 0);
        const totalAmount = (formData.perStudentCost || 0) * totalStudents;

        setFormData(prev => ({
            ...prev,
            courses: updatedCourses,
            studentCount: totalStudents, // Ensure this is always updated
            totalCost: totalAmount,
            paymentDetails: prev.paymentDetails.map(payment => {
                const paymentAmount = totalAmount * ((payment.percentage || 0) / 100);
                const gstRate = prev.gstType === 'include' ? 0.18 : 0;
                const baseAmount = prev.gstType === 'include'
                    ? paymentAmount / (1 + gstRate)
                    : paymentAmount;
                const gstAmount = baseAmount * gstRate;

                return {
                    ...payment,
                    totalAmount: paymentAmount,
                    baseAmount: baseAmount,
                    gstAmount: gstAmount
                };
            })
        }));
    };
    const handleTopicChange = (index, field, value) => {
        const updatedTopics = [...formData.topics];
        updatedTopics[index][field] = field === "hours" ? parseInt(value) || 0 : value;

        // Calculate new total hours - fixed the calculation
        const total = updatedTopics.reduce((sum, topic) => sum + (parseInt(topic.hours) || 0), 0);

        setFormData(prev => ({
            ...prev,
            topics: updatedTopics,
            totalHours: total
        }));
    };


    const addPaymentDetail = () => {
        setFormData(prev => ({
            ...prev,
            paymentDetails: [
                ...prev.paymentDetails,
                { name: "", percentage: 0, baseAmount: 0, gstAmount: 0, totalAmount: 0, dueDate: "" }
            ]
        }));
    };

    const addCourse = () => {
        setFormData(prev => {
            const newCourses = [
                ...prev.courses,
                { specialization: "", students: 0, othersSpecText: "" }
            ];
            const totalStudents = newCourses.reduce((sum, course) => sum + (course.students || 0), 0);

            return {
                ...prev,
                courses: newCourses,
                studentCount: totalStudents // Update with new total
            };
        });
    };
    const addTopic = () => {
        setFormData(prev => ({
            ...prev,
            topics: [
                ...prev.topics,
                { topic: "", hours: "" }
            ]
        }));
    };

    const removePaymentDetail = (index) => {
        const updatedPaymentDetails = [...formData.paymentDetails];
        updatedPaymentDetails.splice(index, 1);
        setFormData(prev => ({
            ...prev,
            paymentDetails: updatedPaymentDetails
        }));
    };

    const removeCourse = (index) => {
        setFormData(prev => {
            const updatedCourses = [...prev.courses];
            const removedStudents = updatedCourses[index].students || 0;
            updatedCourses.splice(index, 1);

            const totalStudents = updatedCourses.reduce((sum, course) => sum + (course.students || 0), 0);

            return {
                ...prev,
                courses: updatedCourses,
                studentCount: totalStudents // Update with new total
            };
        });
    };
    const removeTopic = (index) => {
        const updatedTopics = [...formData.topics];
        updatedTopics.splice(index, 1);

        // Calculate new total hours - fixed the calculation
        const total = updatedTopics.reduce((sum, topic) => sum + (parseInt(topic.hours) || 0), 0);

        setFormData(prev => ({
            ...prev,
            topics: updatedTopics,
            totalHours: total
        }));
    };

    const calculateTotalHours = () => {
        const total = formData.topics.reduce((sum, topic) => sum + (parseInt(topic.hours) || 0), 0);
        setFormData(prev => ({
            ...prev,
            totalHours: total
        }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const leadRef = doc(db, "trainingForms", lead.id);

            // Recalculate to be absolutely sure

            console.log("Stored studentCount:", formData.studentCount);
            console.log("Calculated from courses:",
                formData.courses.reduce((sum, c) => sum + (c.students || 0), 0));
            const totalAmount = (formData.perStudentCost || 0) * totalStudents;
            // Create complete update object with all fields
            const updateData = {
                accountEmail: formData.accountEmail || "",
                accountName: formData.accountName || "",
                accountPhone: formData.accountPhone || "",
                additionalNotes: formData.additionalNotes || "",
                address: formData.address || "",
                businessName: formData.businessName || "",
                city: formData.city || "",
                collegeCode: formData.collegeCode || "",
                collegeName: formData.collegeName || "",
                contractEndDate: formData.contractEndDate || "",
                contractStartDate: formData.contractStartDate || "",
                course: formData.course || "",
                courses: formData.courses.map(course => ({
                    specialization: course.specialization || "",
                    students: course.students || 0,
                    othersSpecText: course.othersSpecText || ""
                })),
                createdAt: lead.createdAt || new Date(), // Preserve original creation date
                createdBy: lead.createdBy || null, // Preserve original creator
                deliveryType: formData.deliveryType || "",
                emiMonths: formData.emiMonths || 0,
                emiSplits: formData.emiSplits || [],
                gstAmount: formData.gstAmount || 0,
                gstNumber: formData.gstNumber || "",
                gstType: formData.gstType || "include",
                invoiceNumber: formData.invoiceNumber || "",
                lastUpdated: new Date(),
                mouFileUrl: formData.mouFileUrl || "",
                netPayableAmount: formData.netPayableAmount || 0,
                otherCourseText: formData.otherCourseText || "",
                passingYear: formData.passingYear || "",
                paymentDetails: formData.paymentDetails.map(payment => ({
                    name: payment.name || "",
                    percentage: payment.percentage || 0,
                    baseAmount: payment.baseAmount || 0,
                    gstAmount: payment.gstAmount || 0,
                    totalAmount: payment.totalAmount || 0,
                    dueDate: payment.dueDate || ""
                })),
                paymentSplits: formData.paymentSplits || [],
                paymentType: formData.paymentType || "",
                perStudentCost: formData.perStudentCost || 0,
                pincode: formData.pincode || "",
                projectCode: formData.projectCode || "",
                splitTotal: formData.splitTotal || 0,
                state: formData.state || "",
                status: formData.status || "active",
                studentCount: totalStudents, // Calculated value
                studentFileUrl: formData.studentFileUrl || "",
                tcv: formData.tcv || 0,
                topics: formData.topics.map(topic => ({
                    topic: topic.topic || "",
                    hours: topic.hours || "0"
                })),
                totalCost: totalAmount, // Calculated value
                totalHours: formData.totalHours || 0,
                tpoEmail: formData.tpoEmail || "",
                tpoName: formData.tpoName || "",
                tpoPhone: formData.tpoPhone || "",
                trainingEmail: formData.trainingEmail || "",
                trainingName: formData.trainingName || "",
                trainingPhone: formData.trainingPhone || "",
                updatedAt: new Date(),
                year: formData.year || ""
            };

            console.log("Full update payload:", updateData); // Debug log

            // First update - main document
            await updateDoc(leadRef, updateData);

            // Second update - training form document (if projectCode exists)
            if (lead.projectCode) {
                const projectDocId = projectCodeToDocId(lead.projectCode);
                const trainingFormRef = doc(db, "trainingForms", projectDocId);

                const docSnap = await getDoc(trainingFormRef);
                if (docSnap.exists()) {
                    await updateDoc(trainingFormRef, updateData);
                } else {
                    console.warn("Training form document not found:", projectDocId);
                    setError("Training form data not found in Firestore!");
                    return;
                }
            }

            onSave();
            onClose();
        } catch (err) {
            console.error("Error updating documents:", err);
            setError(err.message || "Failed to update lead. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    const projectCodeToDocId = (projectCode) => projectCode.replace(/\//g, "-");

    const goToNextSection = () => {
        const currentIndex = sections.indexOf(activeSection);
        if (currentIndex < sections.length - 1) {
            setActiveSection(sections[currentIndex + 1]);
        }
    };

    const goToPrevSection = () => {
        const currentIndex = sections.indexOf(activeSection);
        if (currentIndex > 0) {
            setActiveSection(sections[currentIndex - 1]);
        }
    };

    if (!lead) return null;


    return (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-54 p-4">
            {/* Confirmation Dialog - Add this at the beginning of your return statement */}
            {showConfirmation && (
                <div className="fixed inset-0  bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-60">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Confirm Submission</h3>
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <FiX className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-gray-600 mb-6">Are you sure you want to submit these changes? This action cannot be undone.</p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loading}
                            >
                                {loading ? 'Submitting...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-semibold">Edit Lead Details</h2>
                            <p className="text-blue-100 text-sm mt-1">
                                {lead.projectCode} • Last updated: {new Date(lead.updatedAt?.toDate() || new Date()).toLocaleDateString()}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-blue-100 hover:text-white transition-colors p-1 rounded-full"
                            disabled={loading}
                        >
                            <FiX className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex mt-6 space-x-1">
                        {sections.map((section) => (
                            <button
                                key={section}
                                onClick={() => setActiveSection(section)}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSection === section
                                    ? 'bg-white text-blue-800'
                                    : 'text-blue-200 hover:text-white hover:bg-blue-700'
                                    }`}
                            >
                                {section.charAt(0).toUpperCase() + section.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
                    <div className="p-6 space-y-8">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                                <div className="flex items-center">
                                    <FiInfo className="h-5 w-5 text-red-500 mr-2" />
                                    <p className="text-red-700 text-sm">{error}</p>
                                </div>
                            </div>
                        )}
                        {/* Basic Information Section */}
                        {activeSection === 'basic' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="businessName"
                                                value={formData.businessName}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 cursor-not-allowed"
                                                placeholder="Acme Corporation"
                                                disabled
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiUser className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Code</label>
                                        <input
                                            type="text"
                                            name="projectCode"
                                            value={formData.projectCode}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 cursor-not-allowed"
                                            disabled
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">College Code</label>
                                        <input
                                            type="text"
                                            name="collegeCode"
                                            value={formData.collegeCode}
                                            onChange={handleChange}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="TST"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="123 College Street"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiMapPin className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                            <input
                                                type="text"
                                                name="city"
                                                value={formData.city }
                                                onChange={handleChange}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Mumbai"
                                                
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                            <input
                                                type="text"
                                                name="state"
                                                value={formData.state}
                                                onChange={handleChange}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Maharashtra"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                        <input
                                            type="text"
                                            name="pincode"
                                            value={formData.pincode}
                                            onChange={handleChange}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="400001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Contract Start Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                name="contractStartDate"
                                                value={formData.contractStartDate}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiCalendar className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Contract End Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                name="contractEndDate"
                                                value={formData.contractEndDate}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiCalendar className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>


                                </div>
                            </div>
                        )}
                        {/* Financial Section */}
                        {activeSection === 'financial' && (
                            <div className="space-y-6">
                                {/* Student Count and Cost Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Total Students (readonly) */}
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <label className="block text-sm font-medium text-blue-700 mb-1">Total Students</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.courses?.reduce((sum, course) => sum + (parseInt(course.students) || 0), 0) || 0}
                                                className="block w-full pl-10 pr-3 py-2 border border-blue-300 rounded-lg shadow-sm bg-blue-100"
                                                readOnly
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiUser className="h-5 w-5 text-blue-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cost Per Student (editable) */}
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <label className="block text-sm font-medium text-blue-700 mb-1">Cost Per Student (₹)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.perStudentCost || 0}
                                                onChange={(e) => {
                                                    const perStudentCost = parseFloat(e.target.value) || 0;
                                                    const totalStudents = formData.courses?.reduce((sum, course) => sum + (parseInt(course.students) || 0), 0) || 0;
                                                    const totalAmount = perStudentCost * totalStudents;

                                                    setFormData(prev => ({
                                                        ...prev,
                                                        perStudentCost,
                                                        totalCost: totalAmount,
                                                        paymentDetails: prev.paymentDetails.map(payment => {
                                                            const paymentAmount = totalAmount * ((payment.percentage || 0) / 100);
                                                            const gstRate = prev.gstType === 'include' ? 0.18 : 0;
                                                            const baseAmount = prev.gstType === 'include'
                                                                ? paymentAmount / (1 + gstRate)
                                                                : paymentAmount;
                                                            const gstAmount = baseAmount * gstRate;

                                                            return {
                                                                ...payment,
                                                                totalAmount: paymentAmount,
                                                                baseAmount: baseAmount,
                                                                gstAmount: gstAmount
                                                            };
                                                        })
                                                    }));
                                                }}
                                                className="block w-full pl-10 pr-3 py-2 border border-blue-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiDollarSign className="h-5 w-5 text-blue-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Total Amount (auto-calculated) */}
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <label className="block text-sm font-medium text-green-700 mb-1">
                                            Total Amount ({formData.gstType === 'include' ? 'incl. GST' : 'excl. GST'})
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.totalCost.toFixed(2)}
                                                readOnly
                                                className="block w-full pl-10 pr-3 py-2 border border-green-300 rounded-lg shadow-sm bg-green-100"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiDollarSign className="h-5 w-5 text-green-400" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-green-600 mt-1">
                                            {formData.gstType === 'include' ? (
                                                `(Base: ₹${(formData.totalCost / 1.18).toFixed(2)} + GST: ₹${(formData.totalCost * 0.18 / 1.18).toFixed(2)})`
                                            ) : (
                                                "GST will be added separately"
                                            )}
                                        </p>
                                    </div>
                                </div>
                                {/* Payment Breakdown */}
                                {formData.paymentDetails?.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-gray-900">Payment Breakdown</h3>

                                        {formData.paymentDetails.map((payment, index) => {
                                            const totalAmount = parseFloat(payment.totalAmount) || 0;
                                            const baseAmount = parseFloat(payment.baseAmount) || 0;
                                            const gstAmount = parseFloat(payment.gstAmount) || 0;

                                            return (
                                                <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        {/* Payment Name (editable) */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Name</label>
                                                            <input
                                                                type="text"
                                                                value={payment.name}
                                                                onChange={(e) => handlePaymentDetailChange(index, "name", e.target.value)}
                                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                                placeholder="e.g., Advance, Installment"
                                                            />
                                                        </div>

                                                        {/* Percentage (editable) */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Percentage (%)</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={payment.percentage || 0}
                                                                    onChange={(e) => {
                                                                        let newPercentage = parseInt(e.target.value) || 0;

                                                                        // Validate the new percentage
                                                                        if (newPercentage < 0) {
                                                                            newPercentage = 0;
                                                                        } else if (newPercentage > 100) {
                                                                            newPercentage = 100;
                                                                        }

                                                                        // Calculate how much we can actually adjust
                                                                        const currentTotal = formData.paymentDetails.reduce((sum, p) => sum + (p.percentage || 0), 0);
                                                                        const otherPaymentsTotal = currentTotal - (payment.percentage || 0);
                                                                        const maxAllowed = 100 - otherPaymentsTotal;

                                                                        if (newPercentage > maxAllowed) {
                                                                            newPercentage = maxAllowed;
                                                                        }

                                                                        // Update all payment details
                                                                        const newDetails = [...formData.paymentDetails];
                                                                        newDetails[index].percentage = newPercentage;

                                                                        // Calculate remaining percentage to distribute
                                                                        let remaining = 100 - newPercentage;
                                                                        const otherPayments = newDetails.filter((_, i) => i !== index);

                                                                        // Distribute remaining percentage proportionally to other payments
                                                                        if (otherPayments.length > 0) {
                                                                            const otherPaymentsTotal = otherPayments.reduce((sum, p) => sum + (p.percentage || 0), 0);
                                                                            const scaleFactor = remaining / otherPaymentsTotal;

                                                                            newDetails.forEach((p, i) => {
                                                                                if (i !== index) {
                                                                                    newDetails[i].percentage = Math.round(p.percentage * scaleFactor);
                                                                                }
                                                                            });

                                                                            // Fix any rounding errors by adjusting the last payment
                                                                            const finalTotal = newDetails.reduce((sum, p) => sum + (p.percentage || 0), 0);
                                                                            if (finalTotal !== 100) {
                                                                                newDetails[newDetails.length - 1].percentage += (100 - finalTotal);
                                                                            }
                                                                        }

                                                                        // Recalculate all amounts
                                                                        const totalCost = formData.perStudentCost *
                                                                            formData.courses?.reduce((sum, course) => sum + (parseInt(course.students) || 0), 0);

                                                                        newDetails.forEach(payment => {
                                                                            const paymentAmount = totalCost * ((payment.percentage || 0) / 100);
                                                                            const gstRate = formData.gstType === 'include' ? 0.18 : 0;
                                                                            const baseAmount = formData.gstType === 'include'
                                                                                ? paymentAmount / (1 + gstRate)
                                                                                : paymentAmount;
                                                                            const gstAmount = baseAmount * gstRate;

                                                                            payment.totalAmount = paymentAmount;
                                                                            payment.baseAmount = baseAmount;
                                                                            payment.gstAmount = gstAmount;
                                                                        });

                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            paymentDetails: newDetails,
                                                                            totalCost: totalCost
                                                                        }));
                                                                    }}
                                                                    min="0"
                                                                    max="100"
                                                                    step="1"
                                                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                                />
                                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                    <FiPercent className="h-5 w-5 text-gray-400" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Amount Display */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Amount ({formData.gstType === 'include' ? 'incl. GST' : 'excl. GST'})
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={`₹${totalAmount.toFixed(2)}`}
                                                                readOnly
                                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                                                            />
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {formData.gstType === 'include' ? (
                                                                    `(Base: ₹${baseAmount.toFixed(2)} + GST: ₹${gstAmount.toFixed(2)})`
                                                                ) : (
                                                                    "GST will be added separately"
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Percentage Summary */}
                                        <div className="bg-yellow-50 p-3 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">Total Percentage:</span>
                                                <span className={`font-bold ${formData.paymentDetails.reduce((sum, payment) => sum + (parseFloat(payment.percentage) || 0), 0) !== 100
                                                    ? 'text-red-600'
                                                    : 'text-green-600'
                                                    }`}>
                                                    {formData.paymentDetails.reduce((sum, payment) => sum + (parseFloat(payment.percentage) || 0), 0)}%
                                                </span>
                                            </div>
                                            {error && (
                                                <div className="mt-2 text-red-600 text-sm">{error}</div>
                                            )}
                                        </div>

                                        {/* Total Payable Summary */}
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">Total Payable:</span>
                                                <span className="font-bold text-lg">
                                                    ₹{formData.paymentDetails.reduce((sum, payment) => sum + (parseFloat(payment.totalAmount) || 0), 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-blue-600 mt-1">
                                                {formData.gstType === 'include' ? (
                                                    `Includes GST of ₹${formData.paymentDetails.reduce((sum, payment) => sum + (parseFloat(payment.gstAmount) || 0), 0).toFixed(2)}`
                                                ) : (
                                                    "GST will be added to payments separately"
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Course Information Section */}
                        {activeSection === 'course' && (
                            <div className="space-y-6">
                                {/* First row with course, year, delivery type, and passing year (disabled) */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                                        <div className="relative">
                                            <select
                                                name="course"
                                                value={formData.course || ""}
                                                onChange={handleChange}
                                                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Select Course</option>
                                                {courseOptions.map(option => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <FiChevronDown className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>


                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                                        <div className="relative">
                                            <select
                                                name="year"
                                                value={formData.year || ""}
                                                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 cursor-not-allowed"
                                                disabled
                                            >
                                                <option value="">{formData.year || "Not specified"}</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <FiChevronDown className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Type</label>
                                        <div className="relative">
                                            <select
                                                name="deliveryType"
                                                value={formData.deliveryType || ""}
                                                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 cursor-not-allowed"
                                                disabled
                                            >
                                                <option value="">{formData.deliveryType || "Not specified"}</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <FiChevronDown className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Passing Year</label>
                                        <div className="relative">
                                            <select
                                                name="passingYear"
                                                value={formData.passingYear || ""}
                                                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 cursor-not-allowed"
                                                disabled
                                            >
                                                <option value="">{formData.passingYear || "Not specified"}</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <FiChevronDown className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Specialization and student count fields */}
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Course Specializations</h3>

                                    {formData.courses?.map((course, index) => {
                                        const isOthersSpec = course.specialization === "Other";
                                        // Get specializations based on the selected course
                                        const currentSpecializations = formData.course ?
                                            (courseSpecializations[formData.course] || []) :
                                            [];

                                        return (
                                            <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4">
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Specialization</label>
                                                        <select
                                                            value={course.specialization}
                                                            onChange={(e) => handleCourseChange(index, "specialization", e.target.value)}
                                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                        >
                                                            <option value="">Select Specialization</option>
                                                            {currentSpecializations.map(spec => (
                                                                <option key={spec} value={spec}>{spec}</option>
                                                            ))}
                                                        </select>
                                                    </div>


                                                    {isOthersSpec && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-500 mb-1">Other Specialization</label>
                                                            <input
                                                                type="text"
                                                                value={course.othersSpecText}
                                                                onChange={(e) => handleCourseChange(index, "othersSpecText", e.target.value)}
                                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                                placeholder="Enter specialization"
                                                            />
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">No. of Students</label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                value={course.students}
                                                                onChange={(e) => handleCourseChange(index, "students", e.target.value)}
                                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"

                                                            />
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <FiUser className="h-5 w-5 text-gray-400" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        {index === formData.courses.length - 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={addCourse}
                                                                className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors"
                                                                title="Add specialization"
                                                            >
                                                                <FiPlus className="h-5 w-5" />
                                                            </button>
                                                        )}
                                                        {formData.courses.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeCourse(index)}
                                                                className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50 transition-colors"
                                                                title="Remove specialization"
                                                            >
                                                                <FiTrash2 className="h-5 w-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Total students count */}
                                    <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                                        <label className="block text-sm font-medium text-blue-700 mb-1">Total Students</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.courses?.reduce((sum, course) => sum + (parseInt(course.students) || 0), 0)}
                                                className="block w-full pl-10 pr-3 py-2 border border-blue-300 rounded-lg shadow-sm bg-blue-100 focus:ring-blue-500 focus:border-blue-500"
                                                readOnly
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiUser className="h-5 w-5 text-blue-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Contacts Section */}
                        {/* Contacts Section */}
                        {activeSection === 'contacts' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* TPO Column */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-medium text-gray-900">TPO Details</h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="tpoName"
                                                value={formData.tpoName}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="John Doe"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiUser className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                name="tpoEmail"
                                                value={formData.tpoEmail}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="tpo@college.edu"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiMail className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <div className="relative">
                                            <input
                                                type="tel"
                                                name="tpoPhone"
                                                value={formData.tpoPhone}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="9876543210"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiPhone className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Training Column */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-medium text-gray-900">Training Coordinator</h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="trainingName"
                                                value={formData.trainingName}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Jane Smith"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiUser className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                name="trainingEmail"
                                                value={formData.trainingEmail}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="coordinator@training.com"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiMail className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <div className="relative">
                                            <input
                                                type="tel"
                                                name="trainingPhone"
                                                value={formData.trainingPhone}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="9876543210"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiPhone className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Account Column */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-medium text-gray-900">Account Details</h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="accountName"
                                                value={formData.accountName}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Account Holder Name"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiUser className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                name="accountEmail"
                                                value={formData.accountEmail}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="account@college.edu"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiMail className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <div className="relative">
                                            <input
                                                type="tel"
                                                name="accountPhone"
                                                value={formData.accountPhone}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="9876543210"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiPhone className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Topics Section */}
                        {activeSection === 'topics' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-gray-900">Training Topics</h3>
                                    <button
                                        type="button"
                                        onClick={addTopic}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Add Topic
                                    </button>
                                </div>

                                {formData.topics?.map((topic, index) => (
                                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Topic</label>
                                                <div className="relative">
                                                    <select
                                                        value={topic.topic}
                                                        onChange={(e) => handleTopicChange(index, "topic", e.target.value)}
                                                        className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
                                                    >
                                                        <option value="">Select Topic</option>
                                                        {topicOptions.map(option => (
                                                            <option key={option} value={option}>{option}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                        <FiChevronDown className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Hours</label>
                                                <input
                                                    type="number"
                                                    value={topic.hours}
                                                    onChange={(e) => handleTopicChange(index, "hours", e.target.value)}
                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    min="0"
                                                />
                                            </div>

                                            <div className="flex items-end">
                                                <button
                                                    type="button"
                                                    onClick={() => removeTopic(index)}
                                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <label className="block text-sm font-medium text-blue-700 mb-1">Total Training Hours</label>
                                    <input
                                        type="number"
                                        name="totalHours"
                                        value={formData.totalHours}
                                        className="block w-full px-3 py-2 border border-blue-300 rounded-lg shadow-sm bg-blue-100 focus:ring-blue-500 focus:border-blue-500"
                                        readOnly
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer - Modify the submit button to show confirmation */}
                    <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            {loading ? "Saving changes..." : `Section ${sections.indexOf(activeSection) + 1} of ${sections.length}`}
                        </div>
                        <div className="flex space-x-3">
                            {activeSection !== sections[0] && (
                                <button
                                    type="button"
                                    onClick={goToPrevSection}
                                    className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                                    disabled={loading}
                                >
                                    <FiArrowLeft className="mr-2" /> Back
                                </button>
                            )}

                            {activeSection !== sections[sections.length - 1] ? (
                                <button
                                    type="button"
                                    onClick={goToNextSection}
                                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                                    disabled={loading}
                                >
                                    Next <FiArrowRight className="ml-2" />
                                </button>
                            ) : (
                                <button
                                    type="button" // Changed from "submit" to "button"
                                    onClick={() => setShowConfirmation(true)} // Show confirmation instead of submitting directly
                                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center disabled:opacity-70"
                                    disabled={loading}
                                >
                                    <FiCheck className="mr-2" /> Save Changes
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

        </div>
    );
};

export default EditClosedLeadModal;