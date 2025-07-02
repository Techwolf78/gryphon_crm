import React, { useState } from "react";
import { XIcon } from "@heroicons/react/outline";

function AddJD({ show, onClose }) {
  const [formData, setFormData] = useState({
    companyName: "",
    companyWebsite: "",
    course: "",
    specialization: "",
    passingYear: "",
    gender: "",
    marksCriteria: "",
    otherCriteria: "",
    jobType: "",
    jobDesignation: "",
    jobLocation: "",
    salary: "",
    internshipDuration: "",
    stipend: "",
    modeOfInterview: "",
    joiningPeriod: "",
    modeOfWork: "",
    jobDescription: "",
    source: "",
    coordinator: "",
  });

  const [jobFiles, setJobFiles] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setJobFiles([...e.target.files]);
  };

  const handleSubmit = () => {
    console.log("Form submitted", formData, jobFiles);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-start justify-center bg-transparent bg-opacity-50 z-54 pt-16 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg mt-8 mb-16">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Add JD Form</h2>
          <button onClick={onClose}><XIcon className="h-5 w-5 text-white" /></button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Company Name</label>
            <input name="companyName" value={formData.companyName} onChange={handleChange} className="w-full p-2 border rounded-md" />
          </div>

          <div>
            <label className="block mb-1 font-medium">Company Website</label>
            <input name="companyWebsite" value={formData.companyWebsite} onChange={handleChange} className="w-full p-2 border rounded-md" />
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mt-4">Eligibility</h3>
          </div>

          <div>
            <label className="block mb-1 font-medium">Course/Degree</label>
            <select name="course" value={formData.course} onChange={handleChange} className="w-full p-2 border rounded-md">
              <option value="">Select</option>
              <option>MBA</option>
              <option>BTech</option>
              <option>BCA</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Specialization</label>
            <select name="specialization" value={formData.specialization} onChange={handleChange} className="w-full p-2 border rounded-md">
              <option value="">Select</option>
              <option>Marketing</option>
              <option>Finance</option>
              <option>CS</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Passing Year</label>
            <select name="passingYear" value={formData.passingYear} onChange={handleChange} className="w-full p-2 border rounded-md">
              <option value="">Select</option>
              {[2023, 2024, 2025].map((yr) => (
                <option key={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Gender</label>
            <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border rounded-md">
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Any</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Marks Criteria</label>
            <select name="marksCriteria" value={formData.marksCriteria} onChange={handleChange} className="w-full p-2 border rounded-md">
              <option value="">Select</option>
              <option>Above 60%</option>
              <option>Above 70%</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Other Criteria</label>
            <textarea name="otherCriteria" value={formData.otherCriteria} onChange={handleChange} className="w-full p-2 border rounded-md" />
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mt-4">Job Details</h3>
          </div>

          <div>
            <label className="block mb-1 font-medium">Job Type</label>
            <select name="jobType" value={formData.jobType} onChange={handleChange} className="w-full p-2 border rounded-md">
              <option>Intern</option>
              <option>Int + PPO</option>
              <option>Full Time</option>
              <option>Training + FT</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Job Designation</label>
            <input name="jobDesignation" value={formData.jobDesignation} onChange={handleChange} className="w-full p-2 border rounded-md" />
          </div>

          <div>
            <label className="block mb-1 font-medium">Job Location</label>
            <input name="jobLocation" value={formData.jobLocation} onChange={handleChange} className="w-full p-2 border rounded-md" />
          </div>

          <div>
            <label className="block mb-1 font-medium">Salary (LPA)</label>
            <input name="salary" type="number" value={formData.salary} onChange={handleChange} className="w-full p-2 border rounded-md" />
          </div>

          <div>
            <label className="block mb-1 font-medium">Internship Duration (months)</label>
            <select name="internshipDuration" value={formData.internshipDuration} onChange={handleChange} className="w-full p-2 border rounded-md">
              <option value="">Select</option>
              {["1", "2", "3", "6"].map((month) => (
                <option key={month}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Stipend (Monthly)</label>
            <input name="stipend" type="number" value={formData.stipend} onChange={handleChange} className="w-full p-2 border rounded-md" />
          </div>

          <div>
            <label className="block mb-1 font-medium">Mode of Interview</label>
            <select name="modeOfInterview" value={formData.modeOfInterview} onChange={handleChange} className="w-full p-2 border rounded-md">
              <option>Online</option>
              <option>Offline</option>
              <option>Campus Drive</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Joining Period (Month & Year)</label>
            <input name="joiningPeriod" value={formData.joiningPeriod} onChange={handleChange} placeholder="e.g. Aug 2025" className="w-full p-2 border rounded-md" />
          </div>

          <div>
            <label className="block mb-1 font-medium">Mode of Work</label>
            <select name="modeOfWork" value={formData.modeOfWork} onChange={handleChange} className="w-full p-2 border rounded-md">
              <option>WFO</option>
              <option>WFH</option>
              <option>Hybrid</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block mb-1 font-medium">Job Description</label>
            <textarea name="jobDescription" value={formData.jobDescription} onChange={handleChange} className="w-full p-2 border rounded-md" rows={4} />
          </div>

          <div className="col-span-2">
            <label className="block mb-1 font-medium">Upload JD Files</label>
            <input type="file" multiple onChange={handleFileChange} className="w-full p-2 border rounded-md" />
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mt-4">Internal Use Only</h3>
          </div>

          <div>
            <label className="block mb-1 font-medium">Source</label>
            <input name="source" value={formData.source} onChange={handleChange} className="w-full p-2 border rounded-md" />
          </div>

          <div>
            <label className="block mb-1 font-medium">Coordinator</label>
            <input name="coordinator" value={formData.coordinator} onChange={handleChange} className="w-full p-2 border rounded-md" />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-4 px-6 py-4 bg-gray-100 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded bg-white border hover:bg-gray-200">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}

export default AddJD;
