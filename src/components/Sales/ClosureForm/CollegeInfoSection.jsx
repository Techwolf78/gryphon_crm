import React from "react";

const CollegeInfoSection = ({ formData, setFormData, handleChange, collegeCodeError, pincodeError, gstError }) => {
  const inputClass = "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-400";

  return (
    <section>
      <h3 className="font-semibold text-lg mb-4 text-blue-700">College / University Info</h3>

      {/* First Row: College Name, College Code, City */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <label className="w-full">
          College Name <span className="text-red-500">*</span>
          <input
            name="collegeName"
            className={inputClass + " border-gray-300"}
            required
            placeholder="Enter college or university name"
            value={formData.collegeName}
            onChange={handleChange}
          />
        </label>

        <label className="w-full">
          College Code <span className="text-red-500">*</span>
          <input
            name="collegeCode"
            className={`${inputClass} ${collegeCodeError ? "border-red-500" : "border-gray-300"}`}
            required
            placeholder="Enter college code"
            value={formData.collegeCode}
            onChange={handleChange}
          />
          {collegeCodeError && (
            <p className="text-red-500 text-xs mt-1">{collegeCodeError}</p>
          )}
        </label>

        <label className="w-full">
          City <span className="text-red-500">*</span>
          <input
            name="city"
            className={inputClass + " border-gray-300"}
            required
            placeholder="Enter city"
            value={formData.city}
            onChange={handleChange}
          />
        </label>
      </div>

      {/* Second Row: State, Pincode, Address, GST Number */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <label className="w-full">
          State <span className="text-red-500">*</span>
          <input
            name="state"
            className={inputClass + " border-gray-300"}
            required
            placeholder="Enter state"
            value={formData.state}
            onChange={handleChange}
          />
        </label>

        <label className="w-full">
          Pincode <span className="text-red-500">*</span>
          <input
            name="pincode"
            className={`${inputClass} ${pincodeError ? "border-red-500" : "border-gray-300"}`}
            required
            placeholder="Enter 6-digit pincode"
            value={formData.pincode}
            onChange={handleChange}
          />
          {pincodeError && (
            <p className="text-red-500 text-xs mt-1">{pincodeError}</p>
          )}
        </label>

        <label className="w-full">
          Address <span className="text-red-500">*</span>
          <input
            name="address"
            className={inputClass + " border-gray-300"}
            required
            placeholder="Enter full address"
            value={formData.address}
            onChange={handleChange}
          />
        </label>

        <label className="w-full">
          GST Number <span className="text-red-500">*</span>
          <input
            name="gstNumber"
            className={`${inputClass} ${gstError ? "border-red-500" : "border-gray-300"}`}
            required
            placeholder="Enter GST number"
            value={formData.gstNumber}
            onChange={handleChange}
          />
          {gstError && (
            <p className="text-red-500 text-xs mt-1">{gstError}</p>
          )}
        </label>
      </div>
    </section>
  );
};

export default CollegeInfoSection;
