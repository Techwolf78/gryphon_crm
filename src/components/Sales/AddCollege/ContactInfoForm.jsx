const ContactInfoForm = ({
  pocName,
  setPocName,
  phoneNo,
  setPhoneNo,
  email,
  setEmail,
  expectedClosureDate,
  setExpectedClosureDate,
  contactMethod,
  setContactMethod,
  isFormValid
}) => {
  return (
    <>
      {/* POC Name */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          POC Name<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={pocName}
            onChange={(e) => setPocName(e.target.value)}
            placeholder="e.g. John Doe"
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
              !pocName.trim() && isFormValid ? "border-red-500" : ""
            }`}
          />
          {!pocName.trim() && isFormValid && (
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

      {/* Phone Number */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Phone No.<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <input
            type="tel"
            value={phoneNo}
            onChange={(e) => setPhoneNo(e.target.value)}
            placeholder="e.g. +91 9876543210"
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
              !phoneNo.trim() && isFormValid ? "border-red-500" : ""
            }`}
          />
          {!phoneNo.trim() && isFormValid && (
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

      {/* Email - Full width on mobile, two columns on larger screens */}
      <div className="col-span-full lg:col-span-2">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. contact@college.com"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </div>

      {/* Expected Closure Date & Contact Method - Side by side on larger screens */}
      <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Expected Closure Date */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Expected Closure Date
          </label>
          <input
            type="date"
            value={expectedClosureDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setExpectedClosureDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        {/* Contact Method */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Contact Method<span className="text-red-500 ml-1">*</span>
          </label>
          <div className="flex items-center space-x-4 mt-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="Visit"
                checked={contactMethod === "Visit"}
                onChange={(e) => setContactMethod(e.target.value)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
              />
              <span className="ml-2 text-xs text-gray-700">Visit</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="Call"
                checked={contactMethod === "Call"}
                onChange={(e) => setContactMethod(e.target.value)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
              />
              <span className="ml-2 text-xs text-gray-700">Call</span>
            </label>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactInfoForm;