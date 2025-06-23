// CollegeInfoSection.jsx
import React from "react";

const CollegeInfoSection = ({ formData, handleChange }) => {
  const inputClass =
    "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:ring-blue-400";

  return (
    <section>
      <h3 className="font-semibold text-lg mb-3 text-blue-700">
        College / University Info
      </h3>
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
  );
};

export default CollegeInfoSection;
