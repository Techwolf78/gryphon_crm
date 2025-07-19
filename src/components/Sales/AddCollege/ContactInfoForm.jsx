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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          POC Name<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={pocName}
            onChange={(e) => setPocName(e.target.value)}
            placeholder="e.g. John Doe"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
          {!pocName.trim() && isFormValid && (
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

      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone No.<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={phoneNo}
            onChange={(e) => setPhoneNo(e.target.value)}
            placeholder="e.g. +91 9876543210"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
          {!phoneNo.trim() && isFormValid && (
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

      {/* Email */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. contact@college.com"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </div>

      {/* Expected Closure Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expected Closure Date
        </label>
        <div className="relative">
          <input
            type="date"
            value={expectedClosureDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setExpectedClosureDate(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Contact Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contact Method<span className="text-red-500 ml-1">*</span>
        </label>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="Visit"
              checked={contactMethod === "Visit"}
              onChange={(e) => setContactMethod(e.target.value)}
              className="form-radio text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">Visit</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="Call"
              checked={contactMethod === "Call"}
              onChange={(e) => setContactMethod(e.target.value)}
              className="form-radio text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">Call</span>
          </label>
        </div>
      </div>
    </>
  );
};

export default ContactInfoForm;