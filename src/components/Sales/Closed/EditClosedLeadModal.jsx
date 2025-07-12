import React, { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { FiX, FiChevronDown, FiInfo, FiDollarSign, FiUser, FiPhone, FiMail, FiMapPin, FiCalendar, FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";

const EditClosedLeadModal = ({ lead, onClose, onSave }) => {
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeSection, setActiveSection] = useState("basic");
    const sections = ['basic', 'financial', 'course', 'contacts', 'contract'];

    useEffect(() => {
        if (lead) {
            setFormData({
                businessName: lead.businessName || "",
                projectCode: lead.projectCode || "",
                city: lead.city || "",
                state: lead.state || "",
                closedDate: lead.closedDate || "",
                totalCost: lead.totalCost || 0,
                tcv: lead.tcv || 0,
                perStudentCost: lead.perStudentCost || 0,
                studentCount: lead.studentCount || 0,
                gstAmount: lead.gstAmount || 0,
                netPayableAmount: lead.netPayableAmount || 0,
                gstNumber: lead.gstNumber || "",
                gstType: lead.gstType || "include",
                course: lead.course || "",
                year: lead.year || "",
                specialization: lead.specialization || "",
                deliveryType: lead.deliveryType || "",
                passingYear: lead.passingYear || "",
                tpoName: lead.tpoName || "",
                tpoEmail: lead.tpoEmail || "",
                tpoPhone: lead.tpoPhone || "",
                trainingName: lead.trainingName || "",
                trainingEmail: lead.trainingEmail || "",
                trainingPhone: lead.trainingPhone || "",
                contractStartDate: lead.contractStartDate || "",
                contractEndDate: lead.contractEndDate || "",
                paymentType: lead.paymentType || "",
                paymentDetails: lead.paymentDetails || [],
                collegeCode: lead.collegeCode || "",
                collegeName: lead.collegeName || "",
                address: lead.address || "",
                pincode: lead.pincode || "",
                status: lead.status || "active",
            });
        }
    }, [lead]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name.includes("Amount") || name.includes("Cost") ? parseFloat(value) || 0 : value
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

    const addPaymentDetail = () => {
        setFormData(prev => ({
            ...prev,
            paymentDetails: [
                ...prev.paymentDetails,
                { name: "", percentage: 0, baseAmount: 0, gstAmount: 0, totalAmount: 0, dueDate: "" }
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const leadRef = doc(db, "leads", lead.id);
            await updateDoc(leadRef, {
                ...formData,
                updatedAt: new Date()
            });

            if (lead.projectCode) {
                const trainingFormRef = doc(db, "trainingForms", projectCodeToDocId(lead.projectCode));
                await updateDoc(trainingFormRef, {
                    collegeName: formData.collegeName,
                    city: formData.city,
                    state: formData.state,
                    course: formData.course,
                    year: formData.year,
                    specialization: formData.specialization,
                    deliveryType: formData.deliveryType,
                    studentCount: formData.studentCount,
                    perStudentCost: formData.perStudentCost,
                    totalCost: formData.totalCost,
                    updatedAt: new Date()
                });
            }

            onSave();
            onClose();
        } catch (err) {
            console.error("Error updating documents:", err);
            setError("Failed to update lead. Please check your connection and try again.");
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-54 p-4">
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
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Acme Corporation"
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
                                                value={formData.city}
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Closed Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                name="closedDate"
                                                value={formData.closedDate}
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

                        {/* Financial Information Section */}
                        {activeSection === 'financial' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Actual TCV (₹)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                name="totalCost"
                                                value={formData.totalCost}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiDollarSign className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Projected TCV (₹)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                name="tcv"
                                                value={formData.tcv}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiDollarSign className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Per Student Cost (₹)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                name="perStudentCost"
                                                value={formData.perStudentCost}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiDollarSign className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Student Count</label>
                                        <input
                                            type="number"
                                            name="studentCount"
                                            value={formData.studentCount}
                                            onChange={handleChange}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GST Amount (₹)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                name="gstAmount"
                                                value={formData.gstAmount}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiDollarSign className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Net Payable (₹)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                name="netPayableAmount"
                                                value={formData.netPayableAmount}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiDollarSign className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                                        <input
                                            type="text"
                                            name="gstNumber"
                                            value={formData.gstNumber}
                                            onChange={handleChange}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="22AAAAA0000A1Z5"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GST Type</label>
                                        <div className="relative">
                                            <select
                                                name="gstType"
                                                value={formData.gstType}
                                                onChange={handleChange}
                                                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 appearance-none"
                                            >
                                                <option value="include">Inclusive of GST</option>
                                                <option value="exclude">Exclusive of GST</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <FiChevronDown className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Details */}
                                <div className="pt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
                                        <button
                                            type="button"
                                            onClick={addPaymentDetail}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Add Payment Split
                                        </button>
                                    </div>

                                    {formData.paymentDetails?.map((payment, index) => (
                                        <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4">
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                                                    <input
                                                        type="text"
                                                        value={payment.name}
                                                        onChange={(e) => handlePaymentDetailChange(index, "name", e.target.value)}
                                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Percentage</label>
                                                    <input
                                                        type="number"
                                                        value={payment.percentage}
                                                        onChange={(e) => handlePaymentDetailChange(index, "percentage", e.target.value)}
                                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Base Amount</label>
                                                    <input
                                                        type="number"
                                                        value={payment.baseAmount}
                                                        onChange={(e) => handlePaymentDetailChange(index, "baseAmount", e.target.value)}
                                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">GST Amount</label>
                                                    <input
                                                        type="number"
                                                        value={payment.gstAmount}
                                                        onChange={(e) => handlePaymentDetailChange(index, "gstAmount", e.target.value)}
                                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    />
                                                </div>
                                                <div className="flex items-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => removePaymentDetail(index)}
                                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Course Information Section */}
                        {activeSection === 'course' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                                    <div className="relative">
                                        <select
                                            name="course"
                                            value={formData.course}
                                            onChange={handleChange}
                                            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 appearance-none"
                                        >
                                            <option value="Engineering">Engineering</option>
                                            <option value="Pharmacy">Pharmacy</option>
                                            <option value="Management">Management</option>
                                            <option value="Other">Other</option>
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
                                            value={formData.year}
                                            onChange={handleChange}
                                            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 appearance-none"
                                        >
                                            <option value="1st">1st Year</option>
                                            <option value="2nd">2nd Year</option>
                                            <option value="3rd">3rd Year</option>
                                            <option value="4th">4th Year</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <FiChevronDown className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                                    <input
                                        type="text"
                                        name="specialization"
                                        value={formData.specialization}
                                        onChange={handleChange}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Computer Science"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Type</label>
                                    <div className="relative">
                                        <select
                                            name="deliveryType"
                                            value={formData.deliveryType}
                                            onChange={handleChange}
                                            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 appearance-none"
                                        >
                                            <option value="OT">Onsite Training</option>
                                            <option value="OL">Online Training</option>
                                            <option value="HY">Hybrid</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <FiChevronDown className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Passing Year</label>
                                    <input
                                        type="text"
                                        name="passingYear"
                                        value={formData.passingYear}
                                        onChange={handleChange}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="2020-2021"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Contacts Section */}
                        {activeSection === 'contacts' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            </div>
                        )}

                        {/* Contract Section */}
                        {activeSection === 'contract' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        )}
                    </div>

                    {/* Footer */}
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
                                    type="submit"
                                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center disabled:opacity-70"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Submitting...
                                        </span>
                                    ) : (
                                        <>
                                            <FiCheck className="mr-2" /> Resubmit
                                        </>
                                    )}
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