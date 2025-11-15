import React, { useState } from "react";

const inputClass = "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const numberInputClass = "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const selectClass = "w-full px-3 py-2 border rounded-lg border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

const courseOptions = ["Engineering", "MBA", "BBA", "BCA", "MCA", "Diploma", "BSC", "MSC", "Others"];

const courseYears = {
  Engineering: ["1st", "2nd", "3rd", "4th"],
  MBA: ["1st", "2nd"],
  BBA: ["1st", "2nd", "3rd"],
  BCA: ["1st", "2nd", "3rd"],
  MCA: ["1st", "2nd"],
  Diploma: ["1st", "2nd", "3rd"],
  BSC: ["1st", "2nd", "3rd"],
  MSC: ["1st", "2nd"],
  Others: ["1st", "2nd", "3rd", "4th"]
};

const deliveryTypes = [
  { value: "DM", label: "DM - Digital Marketing" }
];

const generatePassingYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 16 }, (_, i) => `${currentYear - 5 + i}-${currentYear - 4 + i}`);
};

const digitalMarketingServices = [
  "Social Media Marketing",
  "Search Engine Optimization (SEO)",
  "Search Engine Marketing (SEM/PPC)",
  "Content Marketing",
  "Email Marketing",
  "Influencer Marketing",
  "Web Design & Development",
  "Analytics & Reporting",
  "Digital Advertising",
  "Branding",
  "Video Marketing",
  "Mobile Marketing",
  "E-commerce Marketing",
  "Other"
];

const DMStudentBreakdownSection = ({ formData, setFormData }) => {
  // Add state to track when "Others"/"Other" was selected
  const [isCustomCourse, setIsCustomCourse] = useState(false);
  const [isCustomDeliveryType, setIsCustomDeliveryType] = useState(false);
  const [selectedServices, setSelectedServices] = useState(formData.selectedServices || []);
  const [customService, setCustomService] = useState("");

  const isOtherCourse = formData.course === "Others" || isCustomCourse;

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Reset custom course state when switching to predefined course
      if (field === 'course' && value !== "Others" && courseOptions.includes(value)) {
        setIsCustomCourse(false);
        updated.courses = [{ specialization: "", students: "" }];
      }
      
      return updated;
    });
  };

  const handleOtherCourseChange = (value) => {
    setIsCustomCourse(true);
    setFormData(prev => ({ ...prev, course: value }));
  };

  const handleDeliveryTypeChange = (e) => {
    const value = e.target.value;
    if (value === "Other") {
      setIsCustomDeliveryType(true);
      setFormData(prev => ({ ...prev, deliveryType: "" }));
    } else {
      setIsCustomDeliveryType(false);
      setFormData(prev => ({ ...prev, deliveryType: value }));
    }
  };

  return (
    <section>
      <div className="p-4 bg-white shadow-lg rounded-xl border border-gray-200 space-y-4">
        <h3 className="text-xl font-semibold text-blue-700 border-b border-blue-500 pb-2">Services Breakdown</h3>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="space-y-1">
            <label className="font-medium">Course <span className="text-red-500">*</span></label>
            <select 
              className={selectClass} 
              value={isCustomCourse ? "Others" : formData.course} 
              onChange={(e) => {
                if (e.target.value === "Others") {
                  setIsCustomCourse(true);
                  handleChange("course", "");
                } else {
                  setIsCustomCourse(false);
                  handleChange("course", e.target.value);
                }
              }} 
              required
            >
              <option value="">Select Course</option>
              {courseOptions.map(course => <option key={course} value={course}>{course}</option>)}
            </select>
          </div>

          {/* Show input when "Others" is selected OR when custom course is being entered */}
          {isOtherCourse && (
            <div className="space-y-1">
              <label className="font-medium">Specify Course <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className={inputClass} 
                value={isCustomCourse ? formData.course : ""} 
                onChange={(e) => handleOtherCourseChange(e.target.value)} 
                placeholder="Enter course name" 
                required 
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="font-medium">Year <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.year} onChange={(e) => handleChange("year", e.target.value)} required>
              <option value="">Select Year</option>
              {/* Fix: For custom courses, show default years */}
              {(isCustomCourse ? courseYears.Others : (courseYears[formData.course] || [])).map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-medium">Delivery Type <span className="text-red-500">*</span></label>
            <select
              className={selectClass}
              value={isCustomDeliveryType ? "Other" : formData.deliveryType}
              onChange={handleDeliveryTypeChange}
              required
            >
              <option value="">Delivery Type</option>
              {deliveryTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-medium">Passing Year <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.passingYear} onChange={(e) => handleChange("passingYear", e.target.value)} required>
              <option value="">Passing Year</option>
              {generatePassingYears().map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        </div>

        {/* Services Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="font-medium">Services <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {digitalMarketingServices.map((service) => (
                <label
                  key={service}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                    selectedServices.includes(service)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedServices.includes(service)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newServices = [...selectedServices, service];
                        setSelectedServices(newServices);
                        setFormData(prev => ({ ...prev, selectedServices: newServices }));
                      } else {
                        const newServices = selectedServices.filter(s => s !== service);
                        setSelectedServices(newServices);
                        setFormData(prev => ({ ...prev, selectedServices: newServices }));
                      }
                    }}
                  />
                  {service}
                </label>
              ))}
            </div>
          </div>

          {/* Custom Service Input */}
          <div className="space-y-2">
            <label className="font-medium">Other Services (Optional)</label>
            <input
              type="text"
              className={inputClass}
              value={customService}
              onChange={(e) => setCustomService(e.target.value)}
              placeholder="Enter custom service name"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && customService.trim()) {
                  e.preventDefault();
                  const newServices = [...selectedServices, customService.trim()];
                  setSelectedServices(newServices);
                  setFormData(prev => ({ ...prev, selectedServices: newServices }));
                  setCustomService("");
                }
              }}
            />
            <p className="text-xs text-gray-500">Press Enter to add custom service</p>
          </div>

          {/* Selected Services Display */}
          {selectedServices.length > 0 && (
            <div className="space-y-2">
              <label className="font-medium">Selected Services:</label>
              <div className="flex flex-wrap gap-2">
                {selectedServices.map((service, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {service}
                    <button
                      type="button"
                      onClick={() => {
                        const newServices = selectedServices.filter((_, i) => i !== index);
                        setSelectedServices(newServices);
                        setFormData(prev => ({ ...prev, selectedServices: newServices }));
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};

export default DMStudentBreakdownSection;