import React from "react";
import Select from "react-select";
import stateCityData from "../stateCityData";

const CollegeInfoSection = ({
  formData,
  setFormData,
  handleChange,
  collegeCodeError,
  pincodeError,
  isEdit,
}) => {
  const inputClass =
    "w-full px-3 py-2 border-gray-300 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  const stateOptions = Object.keys(stateCityData).map((state) => ({
    value: state,
    label: state,
  }));

  const cityOptions =
    formData.state && stateCityData[formData.state]
      ? stateCityData[formData.state].map((city) => ({
          value: city,
          label: city,
        }))
      : [];

  return (
    <section className="p-4 bg-white rounded-xl shadow space-y-4">
      <h3 className="font-semibold text-xl text-blue-700 border-b pb-2">
        College Information
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            disabled={isEdit} // ✅ disable when editing
          />
        </div>

        {/* College Name Short Form */}
        <div>
          <label className="font-medium block mb-1">
            College Name Short Form <span className="text-red-500">*</span>
          </label>
          <input
            name="collegeCode"
            className={inputClass}
            placeholder="ICEM"
            value={formData.collegeCode}
            onChange={handleChange}
            required
            disabled={isEdit} // ✅ disable when editing
          />
          {collegeCodeError && (
            <p className="text-red-500 text-sm mt-1">{collegeCodeError}</p>
          )}
        </div>

        {/* GST Number */}
        <div>
          <label className="font-medium block mb-1">GST Number</label>
          <input
            name="gstNumber"
            className={inputClass}
            placeholder="Enter GST Number"
            value={formData.gstNumber}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* State */}
        <div>
          <label className="font-medium block mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <Select
            options={stateOptions}
            value={stateOptions.find((opt) => opt.value === formData.state)}
            onChange={(selected) => {
              setFormData((prev) => ({
                ...prev,
                state: selected ? selected.value : "",
                city: null, // Reset city when state changes
              }));
            }}
            placeholder="Select state"
            isClearable
            styles={{
              control: (provided) => ({
                ...provided,
                minHeight: '34px',
                fontSize: '14px',
                borderRadius: '6px'
              }),
              placeholder: (provided) => ({
                ...provided,
                fontSize: '14px'
              }),
              option: (provided) => ({
                ...provided,
                fontSize: '14px'
              }),
              input: (provided) => ({
                ...provided,
                fontSize: '14px'
              }),
              singleValue: (provided) => ({
                ...provided,
                fontSize: '14px'
              })
            }}
          />
        </div>

        {/* City */}
        <div>
          <label className="font-medium block mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <Select
            options={cityOptions}
            value={formData.city ? cityOptions.find((opt) => opt.value === formData.city) : null}
            onChange={(selected) =>
              setFormData((prev) => ({
                ...prev,
                city: selected ? selected.value : null,
              }))
            }
            placeholder="Select city"
            isClearable
            isDisabled={!formData.state}
            styles={{
              control: (provided, state) => ({
                ...provided,
                minHeight: '34px',
                fontSize: '14px',
                borderRadius: '6px',
                backgroundColor: state.isDisabled ? '#f9fafb' : provided.backgroundColor
              }),
              placeholder: (provided) => ({
                ...provided,
                fontSize: '14px'
              }),
              option: (provided) => ({
                ...provided,
                fontSize: '14px'
              }),
              input: (provided) => ({
                ...provided,
                fontSize: '14px'
              }),
              singleValue: (provided) => ({
                ...provided,
                fontSize: '14px'
              })
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
