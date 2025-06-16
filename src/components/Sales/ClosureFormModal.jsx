import React, { useState } from "react";

const ClosureFormModal = ({ show, onClose, lead }) => {
  if (!show || !lead) return null;

  const [formData, setFormData] = useState({
    // College Info (pre-filled)
    collegeName: lead.businessName || "",
    collegeAddress: lead.address || "",
    city: lead.city || "",
    state: lead.state || "",
    collegeEmail: lead.email || "",
    collegePhone: lead.phoneNo || "",

    // TPO Details
    tpoName: "",
    tpoDesignation: "",
    tpoPhone: "",
    tpoEmail: "",

    // Placement Coordinator
    placementCoordName: "",
    placementCoordDesignation: "",
    placementCoordPhone: "",

    // Academic Details
    academicYear: "",
    totalStudents: "",
    departments: "",
    coursesOffered: "",
    trainingStartDate: "",
    preferredTrainingDays: "",
    modeOfDelivery: "", // dropdown

    // Sales Details
    salespersonName: "",
    regionZone: "",
    closureDate: "",

    // Commercial Details
    paymentType: "", // dropdown
    totalDealValue: "",
    paymentStatus: "", // dropdown
    invoiceNumber: "",
    gstNumber: "",

    // Additional Notes
    additionalNotes: "",
  });

  // State for uploaded Excel file
  const [studentFile, setStudentFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "application/vnd.ms-excel", // .xls
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    ];

    if (!allowedTypes.includes(file.type)) {
      setFileError("Please upload a valid Excel file (.xls or .xlsx).");
      setStudentFile(null);
      e.target.value = null; // Reset input
      return;
    }

    setFileError("");
    setStudentFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!studentFile) {
      setFileError("Please upload the student data Excel file.");
      return;
    }

    // Prepare form data to send to backend
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });
    data.append("studentFile", studentFile);

    // For demonstration, log data keys and filename
    console.log("Submitting closure form data:", formData);
    console.log("Uploading file:", studentFile.name);

    // TODO: Replace below with your actual API call
    // fetch("/api/closure", {
    //   method: "POST",
    //   body: data,
    // })
    // .then(res => res.json())
    // .then(response => {
    //   console.log("Server response:", response);
    //   onClose();
    // })
    // .catch(error => console.error("Error submitting form:", error));

    onClose();
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const selectClass = inputClass;

  return (
    <div className="fixed inset-0 z-[999999] bg-black bg-opacity-50 flex justify-center items-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">College Closure Form</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition text-2xl font-bold"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          autoComplete="off"
        >
          {/* College Info */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">College Name</label>
            <input
              type="text"
              name="collegeName"
              value={formData.collegeName}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">College Address</label>
            <input
              type="text"
              name="collegeAddress"
              value={formData.collegeAddress}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">State</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">College Email</label>
            <input
              type="email"
              name="collegeEmail"
              value={formData.collegeEmail}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">College Phone</label>
            <input
              type="tel"
              name="collegePhone"
              value={formData.collegePhone}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* TPO Details */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">TPO Name</label>
            <input
              type="text"
              name="tpoName"
              value={formData.tpoName}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">TPO Designation</label>
            <input
              type="text"
              name="tpoDesignation"
              value={formData.tpoDesignation}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">TPO Phone</label>
            <input
              type="tel"
              name="tpoPhone"
              value={formData.tpoPhone}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">TPO Email</label>
            <input
              type="email"
              name="tpoEmail"
              value={formData.tpoEmail}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* Placement Coordinator */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Placement Coordinator Name</label>
            <input
              type="text"
              name="placementCoordName"
              value={formData.placementCoordName}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Placement Coordinator Designation</label>
            <input
              type="text"
              name="placementCoordDesignation"
              value={formData.placementCoordDesignation}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Placement Coordinator Phone</label>
            <input
              type="tel"
              name="placementCoordPhone"
              value={formData.placementCoordPhone}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* Academic Details */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Academic Year</label>
            <input
              type="text"
              name="academicYear"
              placeholder="e.g. 2024-2025"
              value={formData.academicYear}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Total Students</label>
            <input
              type="number"
              name="totalStudents"
              min={0}
              value={formData.totalStudents}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Departments</label>
            <input
              type="text"
              name="departments"
              placeholder="Comma separated"
              value={formData.departments}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Courses Offered</label>
            <input
              type="text"
              name="coursesOffered"
              placeholder="Comma separated"
              value={formData.coursesOffered}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Training Start Date</label>
            <input
              type="date"
              name="trainingStartDate"
              value={formData.trainingStartDate}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Preferred Training Days/Timings</label>
            <input
              type="text"
              name="preferredTrainingDays"
              placeholder="e.g. Mon-Wed 10am-12pm"
              value={formData.preferredTrainingDays}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Mode of Delivery</label>
            <select
              name="modeOfDelivery"
              value={formData.modeOfDelivery}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="">Select Mode</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          {/* Sales Details */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Salesperson Name</label>
            <input
              type="text"
              name="salespersonName"
              value={formData.salespersonName}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Region/Zone</label>
            <input
              type="text"
              name="regionZone"
              value={formData.regionZone}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Closure Date</label>
            <input
              type="date"
              name="closureDate"
              value={formData.closureDate}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* Commercial Details */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Type of Payment</label>
            <select
              name="paymentType"
              value={formData.paymentType}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="">Select Payment Type</option>
              <option value="One-time">One-time</option>
              <option value="Installment">Installment</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Total Deal Value (₹)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              name="totalDealValue"
              value={formData.totalDealValue}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Payment Status</label>
            <select
              name="paymentStatus"
              value={formData.paymentStatus}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="">Select Payment Status</option>
              <option value="Received">Received</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Invoice Number</label>
            <input
              type="text"
              name="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">GST Number</label>
            <input
              type="text"
              name="gstNumber"
              value={formData.gstNumber}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* Additional Notes */}
          <div className="md:col-span-2">
            <label className="block mb-1 font-semibold text-gray-700">Additional Notes</label>
            <textarea
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleChange}
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Upload Student Data */}
          <div className="md:col-span-2">
            <label
              htmlFor="studentFile"
              className="block mb-1 font-semibold text-gray-700"
            >
              Upload Student Data (Excel .xls or .xlsx)
            </label>
            <input
              type="file"
              id="studentFile"
              accept=".xls,.xlsx"
              onChange={handleFileChange}
              className={inputClass}
            />
            {fileError && (
              <p className="text-red-600 mt-1 text-sm">{fileError}</p>
            )}
            {studentFile && (
              <p className="mt-1 text-green-600 text-sm">
                Selected file: {studentFile.name}
              </p>
            )}
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="md:col-span-2 flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Submit Closure
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClosureFormModal;
