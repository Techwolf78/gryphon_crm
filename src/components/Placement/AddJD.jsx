import React, { useState } from "react";
import { XIcon } from "@heroicons/react/outline";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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
    status: "ongoing",
    createdAt: serverTimestamp(),
  });

  const [jobFiles, setJobFiles] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedColleges, setSelectedColleges] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const specializationOptions = {
    "B.Tech/BE": [
      "CS/IT", "AIDS", "AI", "AIML", "CYBER", "DS", "ENCS", "MECH",
      "CIV", "ELEC", "ETC", "ECE", "ENTC", "CHEM","OTHER"
    ],
    "MBA/PGDM": [
      "FIN", "MAR", "HR", "OSCM", "BA", "GEN", "IT", "AGRI", "PHARMA", "FINTECH","OTHER"
    ]
  };

  const colleges = [
    "ABC College of Engineering",
    "XYZ Institute of Technology",
    "PQR Business School",
    "LMN Polytechnic",
    "DEF University",
    "GHI Institute of Management",
    "JKL Technical Campus",
    "MNO College of Computer Science"
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setJobFiles([...e.target.files]);
  };

  const handleSubmit = () => {
    setCurrentStep(2);
  };

  const handleCollegeSelection = (college) => {
    if (selectedColleges.includes(college)) {
      setSelectedColleges(selectedColleges.filter(c => c !== college));
    } else {
      setSelectedColleges([...selectedColleges, college]);
    }
  };

  const handleFinalSubmit = async () => {
    if (selectedColleges.length === 0) return;
    
    setIsSubmitting(true);
    try {
      // Create a batch of documents to add
      const promises = selectedColleges.map(college => {
        const companyData = {
          ...formData,
          college, // Add the specific college to each entry
          jobFiles: jobFiles.map(file => file.name),
          updatedAt: serverTimestamp()
        };
        return addDoc(collection(db, "companies"), companyData);
      });

      // Wait for all documents to be added
      await Promise.all(promises);
      
      onClose(); // Close the modal
    } catch (error) {
      console.error("Error adding documents: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-start justify-center bg-transparent bg-opacity-50 z-54 pt-16 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg mt-8 mb-16">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {currentStep === 1 ? "Add JD Form" : "Select Colleges"}
          </h2>
          <button onClick={onClose}><XIcon className="h-5 w-5 text-white" /></button>
        </div>

        {currentStep === 1 ? (
          <>
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
                <select
                  name="course"
                  value={formData.course}
                  onChange={(e) => {
                    setFormData({ ...formData, course: e.target.value, specialization: "" });
                  }}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select</option>
                  <option>B.Tech/BE</option>
                  <option>MBA/PGDM</option>
                  <option>GRAD</option>
                  <option>DIPLOMA/PolyTech</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium">Specialization</label>
                <select
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select</option>
                  {(specializationOptions[formData.course] || []).map((spec) => (
                    <option key={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium">Passing Year</label>
                <select name="passingYear" value={formData.passingYear} onChange={handleChange} className="w-full p-2 border rounded-md">
                  <option value="">Select</option>
                  {[2025, 2026, 2027].map((yr) => (
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
                  <option>Male/Female</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium">Marks Criteria</label>
                <select name="marksCriteria" value={formData.marksCriteria} onChange={handleChange} className="w-full p-2 border rounded-md">
                  <option value="">Select</option>
                  <option>No Criteria</option>
                  <option>50% & Above Throughout</option>
                  <option>60% & Above Throughout</option>
                  <option>70% & Above Throughout</option>
                  <option>80% & Above Throughout</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Backlog Criteria</label>
                <select name="marksCriteria" value={formData.marksCriteria} onChange={handleChange} className="w-full p-2 border rounded-md">
                  <option value="">Select</option>
                  <option>No Criteria</option>
                  <option>No Active Backlog</option>
                  <option>No History of backlog</option>
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
                  <option>Internship</option>
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
                  {"1 2 3 4 5 6 7 8 9 10 11 12".split(" ").map((month) => (
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
                   <option>Online/Offline</option>
                  <option>Campus Drive</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium">Joining Period (dd/mm/yyyy)</label>
                <input
                  name="joiningPeriod"
                  value={formData.joiningPeriod}
                  onChange={handleChange}
                  placeholder="e.g. 15/08/2025"
                  className="w-full p-2 border rounded-md"
                  pattern="\d{2}/\d{2}/\d{4}"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Company Open date (dd/mm/yyyy)</label>
                <input
                  name="joiningPeriod"
                  value={formData.joiningPeriod}
                  onChange={handleChange}
                  placeholder="e.g. 15/08/2025"
                  className="w-full p-2 border rounded-md"
                  pattern="\d{2}/\d{2}/\d{4}"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Mode of Work</label>
                <select name="modeOfWork" value={formData.modeOfWork} onChange={handleChange} className="w-full p-2 border rounded-md">
                  <option>Select</option>
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
              <button onClick={handleSubmit} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                Save & Next
              </button>
            </div>
          </>
        ) : (
          <>
            {/* College Selection Step */}
            <div className="px-6 py-4">
              <h3 className="text-lg font-semibold mb-4">Select colleges to send this JD to:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {colleges.map((college) => (
                  <div key={college} className="flex items-center">
                    <input
                      type="checkbox"
                      id={college}
                      checked={selectedColleges.includes(college)}
                      onChange={() => handleCollegeSelection(college)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <label htmlFor={college} className="ml-2">
                      {college}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex justify-between px-6 py-4 bg-gray-100 border-t">
              <button 
                onClick={() => setCurrentStep(1)} 
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Back
              </button>
              <div className="flex gap-4">
                <button 
                  onClick={onClose} 
                  className="px-4 py-2 rounded bg-white border hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFinalSubmit} 
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  disabled={selectedColleges.length === 0 || isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : `Submit to ${selectedColleges.length} college(s)`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AddJD;