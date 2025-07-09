import React from "react";
import { FaEye } from "react-icons/fa";
 
const MOUUploadSection = ({
  mouFile,
  setMouFile,
  mouFileError,
  contractStartDate,
  setContractStartDate,
  contractEndDate,
  setContractEndDate,
}) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type !== "application/pdf") {
      e.target.value = "";
      return;
    }
    setMouFile(file);
  };
 
  const handlePreview = () => {
    if (mouFile) {
      window.open(URL.createObjectURL(mouFile), '_blank');
    }
  };
 
  return (
    <section className="p-6 bg-white rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 pb-2 border-b border-blue-700 mb-6">
        <h3 className="text-2xl font-semibold text-blue-700">MOU Details</h3>
      </div>
 
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Compact File Upload with Preview */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
<<<<<<< HEAD
            Signed MOU 
=======
            Signed MOU
>>>>>>> 8a424917b919a81b190f338e698109a50924d08f
          </label>
          <div className="flex gap-2">
            <label className="h-[42px] flex-1 flex items-center justify-center w-full p-2 border border-gray-200 rounded-lg cursor-pointer bg-blue-700 hover:border-blue-300  transition-colors">
              <div className="flex items-center justify-center gap-2 w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-lg text-white truncate max-w-[100px]">
                  {mouFile ? mouFile.name : "Choose file"}
                </span>
              </div>
              <input
                type="file"
                name="mouFile"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {mouFile && (
              <button
                type="button"
                onClick={handlePreview}
                className="h-[42px] w-[42px] flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                title="Preview MOU"
              >
                <FaEye className="h-4 w-4" />
              </button>
            )}
          </div>
          {mouFileError && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {mouFileError}
            </p>
          )}
        </div>
 
        {/* Contract Dates - Consistent height */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date <span className="text-red-500">*</span>
          </label>
          <div className="relative h-[42px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <input
              name="contractStartDate"
              type="date"
              className="w-full h-full pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              value={contractStartDate}
              onChange={(e) => setContractStartDate(e.target.value)}
              required
            />
          </div>
        </div>
 
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date <span className="text-red-500">*</span>
          </label>
          <div className="relative h-[42px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <input
              name="contractEndDate"
              type="date"
              className="w-full h-full pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              value={contractEndDate}
              onChange={(e) => setContractEndDate(e.target.value)}
              required
              min={contractStartDate}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
 
export default MOUUploadSection;
 