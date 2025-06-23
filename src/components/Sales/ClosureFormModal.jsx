import React, { useState, useEffect } from "react";
import { FaTimes, FaPlus, FaTrash } from "react-icons/fa";
const courseSpecializations = {
  Engineering: ["CS", "IT", "ENTC", "CS-Cyber Security", "Mechanical", "Civil", "Electrical", "Chemical", "Electrical", "CS-AI-ML", "CS-AI-DS", "Other"],
  MBA: ["Marketing", "Finance", "HR", "Operations", "Other"],BBA: ["International Business", "General", "Finance", "Other"],
  BCA: ["Computer Applications", "Other"],MCA: ["Computer Science", "Other"],
  Diploma: ["Mechanical", "Civil", "Electrical", "Computer", "Other"],
  BSC: ["Physics", "Chemistry", "Mathematics", "CS", "Other"], MSC: ["Physics", "Chemistry", "Mathematics", "CS", "Other"], Others: ["Other"]};
const courseYears = {
  Engineering: ["First Year", "Second Year", "Third Year", "Final Year"],
  MBA: ["First Year", "Final Year"],BBA: ["First Year", "Second Year", "Final Year"],BCA: ["First Year", "Second Year", "Final Year"], BSC: ["First Year", "Second Year", "Final Year"],MCA: ["First Year", "Final Year"],Diploma: ["First Year", "Second Year", "Final Year"],MSC: ["First Year", "Final Year"], Others: ["First Year", "Final Year"]};
const TrainingForm = ({ show, onClose, lead }) => {
  if (!show || !lead) return null;
  const [formData, setFormData] = useState({
    projectCode: "", collegeName: "",address: "",city: "",state: "",pincode: "",gstNumber: "",tpoName: "",tpoEmail: "",tpoPhone: "",trainingName: "",trainingEmail: "",trainingPhone: "",accountName: "",accountEmail: "",accountPhone: "", course: "", year: "",
    courses: [{ specialization: "", students: "" }],topics: [{ topic: "", hours: "" }],
    paymentType: "", at: "",ap: "",att: "",atp: "",attp: "",attt: "",emiMonths: "",gstType: "exclude",gstAmount: "",invoiceNumber: "",additionalNotes: ""
  });

  const [studentFile, setStudentFile] = useState(null);const [mouFile, setMouFile] = useState(null);const [withGst, setWithGst] = useState("without");

  useEffect(() => {
    if (lead) {
      setFormData((prev) => ({
        ...prev,
        collegeName: lead.businessName || "",
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || ""
      }));
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
  const inputClass = "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:ring-blue-400";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleCourseChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const updateCourseDetail = (index, field, value) => {
    const updated = [...formData.courses];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, courses: updated }));
  };
  const addCourseField = () => {
    setFormData((prev) => ({
      ...prev,
      courses: [...prev.courses, { specialization: "", students: "" }]
    }));
  };
  const removeCourseField = (index) => {
    const updated = [...formData.courses];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, courses: updated }));
  };
  const updateTopic = (index, field, value) => {
    const updated = [...formData.topics];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, topics: updated }));
  };
const addTopicField = () => {
    setFormData((prev) => ({
      ...prev,
      topics: [...prev.topics, { topic: "", hours: "" }]
    }));
  };
  const removeTopicField = (index) => {
    const updated = [...formData.topics];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, topics: updated }));
  };
  const renderCourseRows = () => (
    <div className="space-y-4">
      {/* Select Course and Year */}
      <div className="grid grid-cols-2 gap-4">
        <select
          className={inputClass}
          value={formData.course}
          onChange={(e) => handleCourseChange("course", e.target.value)}
        >
          <option value="">Select Course</option>
          {Object.keys(courseSpecializations).map((course) => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>
        <select
          className={inputClass}
          value={formData.year}
          onChange={(e) => handleCourseChange("year", e.target.value)}
        >
          <option value="">Select Year</option>
          {(courseYears[formData.course] || []).map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Specialization & Students */}
      {formData.courses.map((item, index) => (
        <div key={index} className="grid grid-cols-5 gap-4 items-center">
          <select
            className={inputClass}
            value={item.specialization}
            onChange={(e) => updateCourseDetail(index, "specialization", e.target.value)}
          >
            <option value="">Select Specialization</option>
            {(courseSpecializations[formData.course] || []).map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>

          <input
            type="number" placeholder="No. of Students" className={inputClass} value={item.students} onChange={(e) => updateCourseDetail(index, "students", e.target.value)}/>
{/* Action Buttons */}
          <div className="col-span-2 flex items-center gap-2">
            {/* Only show + on the last row */}
            {index === formData.courses.length - 1 && (
              <button
                type="button" onClick={addCourseField} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-full transition"
                title="Add Row"> <FaPlus /></button>
            )}

            {/* Show delete on all rows if more than one */}
            {formData.courses.length > 1 && (
              <button
                type="button"
                onClick={() => removeCourseField(index)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-full transition"
                title="Delete Row"
              >
                <FaTrash />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
  const renderTopicRows = () => (
    <div className="space-y-6">
      {formData.topics.map((item, index) => (
        <div
          key={index}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white shadow-md rounded-xl transition"
        >
          <select
            className="p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={item.topic}
            onChange={(e) => updateTopic(index, "topic", e.target.value)}
          >
            <option value="">Select Topic</option>
            {[
              "Soft Skills",
              "Aptitude",
              "Domain Technical",
              "Excel - Power BI",
              "Looker Studio",
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Enter Hours"
            className="p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={item.hours}
            onChange={(e) => updateTopic(index, "hours", e.target.value)}
          />

          {/* Spacer or Action Buttons */}
          <div className="md:col-span-2 flex items-center gap-3 justify-start md:justify-end">
            {index === formData.topics.length - 1 && (
              <button
                type="button" onClick={addTopicField} className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow transition" title="Add Row"  > <FaPlus /> </button>
            )}
            {formData.topics.length > 1 && (
              <button
                type="button"
                onClick={() => removeTopicField(index)}
                className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 shadow transition"
                title="Delete Row" ><FaTrash />
              </button>
            )}
          </div>
        </div>
      ))}

      <p className="text-right font-semibold mt-4 text-blue-800 text-sm md:text-base">
        Total Hours: {formData.topics.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0)}
      </p>
    </div>
  );
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-blue-100">
          <h2 className="text-xl font-bold text-gray-800">Client Onboarding Form</h2>
          <div className="flex items-center space-x-3">
            <input
              name="projectCode" value={formData.projectCode} onChange={handleChange} placeholder="Project Code" className="px-3 py-1 border rounded-md"
            />
            <button onClick={onClose} className="text-xl text-red-500 hover:text-red-700">
              <FaTimes />
            </button>
          </div>
        </div>

        <form className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Sections */}
          <section>
            <h3 className="font-semibold text-lg mb-3 text-blue-700">College / University Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="w-full">
                College Name <span className="text-red-500">*</span>
                <input
                  name="collegeName"
                  className={inputClass}
                  required
                  placeholder="Enter college or university name"
                  value={formData.collegeName}
                  onChange={handleChange}
                />
              </label>

              <label className="w-full">
                City <span className="text-red-500">*</span>
                <input
                  name="city"
                  className={inputClass}
                  required
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={handleChange}
                />
              </label>

              <label className="w-full">
                Address <span className="text-red-500">*</span>
                <input
                  name="address"
                  className={inputClass}
                  required
                  placeholder="Enter full address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </label>

              <label className="w-full">
                Pincode <span className="text-red-500">*</span>
                <input
                  name="pincode"
                  className={inputClass}
                  required
                  placeholder="Enter 6-digit pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                />
              </label>

              <label className="w-full">
                State <span className="text-red-500">*</span>
                <input
                  name="state"
                  className={inputClass}
                  required
                  placeholder="Enter state"
                  value={formData.state}
                  onChange={handleChange}
                />
              </label>

              <label className="w-full">
                GST Number <span className="text-red-500">*</span>
                <input
                  name="gstNumber"
                  className={inputClass}
                  required
                  placeholder="Enter GST number"
                  value={formData.gstNumber}
                  onChange={handleChange}
                />
              </label>
            </div>
          </section>



          <section>
            <h3 className="font-semibold text-lg mb-3 text-blue-700">POC Details</h3>
            <div className="grid grid-cols-3 gap-6">

              {/* TPO Column */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  TPO Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="tpoName"
                  className={inputClass}
                  required
                  placeholder="Enter TPO's full name"
                  value={formData.tpoName}
                  onChange={handleChange}
                />

                <label className="block text-sm font-medium text-gray-700">
                  TPO Email <span className="text-red-500">*</span>
                </label>
                <input
                  name="tpoEmail"
                  className={inputClass}
                  required
                  placeholder="Enter TPO's email"
                  value={formData.tpoEmail}
                  onChange={handleChange}
                />

                <label className="block text-sm font-medium text-gray-700">
                  TPO Phone <span className="text-red-500">*</span>
                </label>
                <input
                  name="tpoPhone"
                  className={inputClass}
                  required
                  placeholder="Enter TPO's phone number"
                  value={formData.tpoPhone}
                  onChange={handleChange}
                />
              </div>

              {/* Training Column */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Training Name</label>
                <input
                  name="trainingName"
                  className={inputClass}
                  placeholder="Enter training coordinator's name"
                  value={formData.trainingName}
                  onChange={handleChange}
                />
                <label className="block text-sm font-medium text-gray-700">Training Email</label>
                <input
                  name="trainingEmail"
                  className={inputClass}
                  placeholder="Enter training coordinator's email"
                  value={formData.trainingEmail}
                  onChange={handleChange}
                />
                <label className="block text-sm font-medium text-gray-700">Training Phone</label>
                <input
                  name="trainingPhone"
                  className={inputClass}
                  placeholder="Enter training coordinator's phone"
                  value={formData.trainingPhone}
                  onChange={handleChange}
                />
              </div>

              {/* Account Column */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Account Name</label>
                <input
                  name="accountName"
                  className={inputClass}
                  placeholder="Enter account person’s name"
                  value={formData.accountName}
                  onChange={handleChange}
                />
                <label className="block text-sm font-medium text-gray-700">Account Email</label>
                <input
                  name="accountEmail"
                  className={inputClass}
                  placeholder="Enter account person’s email"
                  value={formData.accountEmail}
                  onChange={handleChange}
                />
                <label className="block text-sm font-medium text-gray-700">Account Phone</label>
                <input
                  name="accountPhone"
                  className={inputClass}
                  placeholder="Enter account person’s phone"
                  value={formData.accountPhone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>



          <section>
            <h3 className="font-semibold text-lg mb-3 text-blue-700">Student Breakdown</h3>
            {renderCourseRows()}
            <div className="mt-4">
              <label className="block font-semibold mb-1">Upload Student Excel File:</label>
              <input
                type="file"
                accept=".xlsx, .xls"
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => setStudentFile(e.target.files[0])}
              />
            </div>
          </section>


          <section>
            <h3 className="font-semibold text-lg mb-3 text-blue-700">Training Total Hours Breakup</h3>
            {renderTopicRows()}
          </section>


          <section>
             <h3 className="font-semibold text-lg mb-4 text-blue-700">Payment Info</h3>

  {/* No. of Students, Cost per Student, Total Amount */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">Total Number of Students</label>
      <input
        type="number"
        className={`${inputClass} bg-gray-100`}
        value={formData.studentCount || 0}
        readOnly
      />
    </div>
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">Cost per Student (₹)</label>
      <input
        type="number"
        className={inputClass}
        value={formData.perStudentCost || ""}
        onChange={(e) => {
          const perStudentCost = parseFloat(e.target.value) || 0;
          const totalCost = (formData.studentCount || 0) * perStudentCost;
          setFormData((prev) => ({ ...prev, perStudentCost, totalCost }));
        }}
      />
    </div>
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">Total Amount (₹)</label>
      <input
        type="number"
        className={`${inputClass} bg-gray-100`}
        value={formData.totalCost || 0}
        readOnly
      />
    </div>
  </div>

  {/* Payment Type Dropdown */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Type</label>
      <select
        name="paymentType"
        className={inputClass}
        value={formData.paymentType || ""}
        onChange={(e) => {
          const value = e.target.value;
          setFormData((prev) => ({
            ...prev,
            paymentType: value, at: "", training: "", ap: "", att: "", atp: "", attp: "", attt: "", emiMonths: "", emiSplits: [],
          }));
        }}
      >
        <option value="">Select Payment Type</option>
        {["AT", "AP", "ATT", "ATP", "ATTP", "ATTT", "EMI"].map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">Invoice Number</label>
      <input
        name="invoiceNumber"
        className={inputClass}
        placeholder="Invoice Number"
        value={formData.invoiceNumber || ""}
        onChange={handleChange}
      />
    </div>
  </div>
  {/* Dynamic Payment Breakdown Based on Selected Type */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    {/* Example for AT */}
    {formData.paymentType === "AT" && (
      [
        { label: "Advance %", name: "at" },
        { label: "Training %", name: "training" }
      ].map(({ label, name }) => (
        <div key={name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <input
            name={name}
            className={inputClass}
            placeholder={label}
            value={formData[name] || ""}
            onChange={(e) => setFormData((prev) => ({
              ...prev,
              [name]: e.target.value,
              [`${name}Gst`]: (((parseFloat(e.target.value) || 0) / 100) * (formData.totalCost || 0)) * 0.18,
              [`${name}Total`]: (((parseFloat(e.target.value) || 0) / 100) * (formData.totalCost || 0)) * 1.18,
            }))}
          />
          <div className="text-xs text-gray-500 mt-1">
            GST: ₹{(formData[`${name}Gst`] || 0).toFixed(2)} | Total: ₹{(formData[`${name}Total`] || 0).toFixed(2)}
          </div>
        </div>
      ))
    )}
    {/* EMI Payment Plan */}
    {formData.paymentType === "EMI" && (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">No. of EMI Installments</label>
          <input
            name="emiMonths"
            type="number"
            className={inputClass}
            placeholder="Enter no. of EMIs"
            value={formData.emiMonths || ""}
            onChange={(e) => {
              const months = parseInt(e.target.value);
              if (!isNaN(months) && months > 0) {
                const split = Array(months).fill("");
                setFormData((prev) => ({ ...prev, emiMonths: months, emiSplits: split }));
              }
            }}
          />
        </div>
        <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {formData.emiSplits.map((val, i) => {
            const base = ((parseFloat(val) || 0) / 100) * (formData.totalCost || 0);
            const gst = base * 0.18;
            const total = base + gst;
            return (
              <div key={i}>
                <label className="block text-sm font-medium text-gray-700 mb-1">EMI {i + 1} %</label>
                <input
                  className={inputClass}
                  placeholder={`EMI ${i + 1} %`}
                  value={val}
                  onChange={(e) => {
                    const updated = [...formData.emiSplits];
                    updated[i] = e.target.value;
                    setFormData((prev) => ({ ...prev, emiSplits: updated }));
                  }}
                />
                <div className="text-xs text-gray-500 mt-1">
                  GST: ₹{gst.toFixed(2)} | Total: ₹{total.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </>
    )}
  </div>
            {/* MOU Upload */}
            <div className="mt-6">
              <label className="block font-semibold text-gray-700 mb-2">Upload MOU File:</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="block w-full border border-gray-300 rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => setMouFile(e.target.files[0])}
              />
            </div>
          </section>
</form>
      </div>
    </div>
  );
};
export default TrainingForm;
