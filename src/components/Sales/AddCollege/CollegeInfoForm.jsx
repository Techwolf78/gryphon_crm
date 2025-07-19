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
      <div className="col-span-2 mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          College/University Name
          <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Acme College"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
          {!businessName.trim() && isFormValid && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-red-500"
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
      <div className="col-span-2 mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 123 Main St"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </div>

      {/* State & City side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State
          </label>
          <Select
            options={stateOptions}
            value={stateOptions.find((opt) => opt.value === state)}
            onChange={(selected) => {
              setState(selected ? selected.value : "");
              setCity(""); // Reset city when state changes
            }}
            placeholder="Search or select state"
            isClearable
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <Select
            options={cityOptions}
            value={cityOptions.find((opt) => opt.value === city)}
            onChange={(selected) => setCity(selected ? selected.value : "")}
            placeholder="Search or select city"
            isClearable
            isDisabled={!state}
          />
        </div>
      </div>
    </>
  );
};

export default CollegeInfoForm;
