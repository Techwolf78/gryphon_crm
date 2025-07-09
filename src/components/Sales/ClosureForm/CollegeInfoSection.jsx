import React from "react";

const CollegeInfoSection = ({ formData, setFormData, handleChange, collegeCodeError, pincodeError, gstError }) => {
  const inputClass = "w-full px-3 py-2  border-gray-300 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <section className="p-5  bg-white rounded-xl shadow space-y-6">
      <h3 className="font-semibold text-2xl text-blue-700 border-b pb-2">College Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* College Name */}
        <div>
          <label className="font-medium block mb-1">
            College Name <span className="text-red-500">*</span>
          </label>
          <input
            name="collegeName"
            className={inputClass}
            placeholder="Enter College Name"
            value={formData.collegeName}
            onChange={handleChange}
            required
          />
        </div>

        {/* College Code */}
        <div>
          <label className="font-medium block mb-1">
            College Code <span className="text-red-500">*</span>
          </label>
          <input
            name="collegeCode"
            className={inputClass}
            placeholder="Enter College Code (UPPERCASE)"
            value={formData.collegeCode}
            onChange={handleChange}
            required
          />
          {collegeCodeError && (
            <p className="text-red-500 text-sm mt-1">{collegeCodeError}</p>
          )}
        </div>

        {/* GST Number */}
        <div>
          <label className="font-medium block mb-1">
            GST Number 
          </label>
          <input
            name="gstNumber"
            className={inputClass}
            placeholder="Enter GST Number"
            value={formData.gstNumber}
            onChange={handleChange}
          />
          
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Address */}
        <div>
          <label className="font-medium block mb-1">
            Address <span className="text-red-500">*</span>
          </label>
          <input
            name="address"
            className={inputClass}
            placeholder="Enter Address"
            value={formData.address}
            onChange={handleChange}
            required
          />
        </div>

        {/* City */}
        <div>
          <label className="font-medium block mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input
            name="city"
            className={inputClass}
            placeholder="Enter City"
            value={formData.city}
            onChange={handleChange}
            required
          />
        </div>

        {/* State */}
        <div>
          <label className="font-medium block mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <input
            name="state"
            className={inputClass}
            placeholder="Enter State"
            value={formData.state}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pincode */}
        <div>
          <label className="font-medium block mb-1">
            Pincode <span className="text-red-500">*</span>
          </label>
          <input
            name="pincode"
            className={inputClass}
            placeholder="Enter Pincode"
            value={formData.pincode}
            onChange={handleChange}
            required
          />
          {pincodeError && (
            <p className="text-red-500 text-sm mt-1">{pincodeError}</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default CollegeInfoSection;
