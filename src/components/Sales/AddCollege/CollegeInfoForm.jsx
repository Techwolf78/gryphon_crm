import Select from "react-select";
import stateCityData from "../stateCityData";

const CollegeInfoForm = ({
  businessName,
  setBusinessName,
  address,
  setAddress,
  state,
  setState,
  city,
  setCity,
  isFormValid,
}) => {
  const stateOptions = Object.keys(stateCityData).map((state) => ({
    value: state,
    label: state,
  }));

  const cityOptions =
    state && stateCityData[state]
      ? stateCityData[state].map((city) => ({
          value: city,
          label: city,
        }))
      : [];

  return (
    <>
      {/* College Name */}
      <div className="col-span-full lg:col-span-2 mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          College/University Name
          <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Acme College"
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
              !businessName.trim() && isFormValid ? "border-red-500" : ""
            }`}
          />
          {!businessName.trim() && isFormValid && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="col-span-full lg:col-span-2 mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Address
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 123 Main St"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </div>

      {/* State & City side by side */}
      <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <Select
            options={stateOptions}
            value={stateOptions.find((opt) => opt.value === state)}
            onChange={(selected) => {
              setState(selected ? selected.value : "");
              setCity(""); // Reset city when state changes
            }}
            placeholder="Search state"
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
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <Select
            options={cityOptions}
            value={cityOptions.find((opt) => opt.value === city)}
            onChange={(selected) => setCity(selected ? selected.value : "")}
            placeholder="Search city"
            isClearable
            isDisabled={!state}
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
    </>
  );
};

export default CollegeInfoForm;
