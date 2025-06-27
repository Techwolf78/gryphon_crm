import React from "react";

const fileInputClass =
  "block w-full text-sm text-gray-700 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100";

const inputClass =
  "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const MOUUploadSection = ({
  mouFile,
  setMouFile,
  mouFileError,
  contractStartDate,
  setContractStartDate,
  contractEndDate,
  setContractEndDate,
}) => {
  return (
    <section className="p-5 bg-white rounded-xl shadow space-y-4">
      <h3 className="font-semibold text-2xl text-blue-700 border-b pb-2">MOU Upload</h3>

      <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-4 md:space-y-0">
        
        {/* File Upload */}
        <div className="flex-1">
          <label className="block font-medium mb-1">
            Upload Signed MOU <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".pdf"
            className={fileInputClass}
            onChange={(e) => setMouFile(e.target.files[0])}
          />
          {mouFileError && (
            <p className="text-red-500 text-sm mt-1">{mouFileError}</p>
          )}
        </div>

        {/* Contract Start Date */}
        <div className="flex-1">
          <label className="block font-medium mb-1">
            Contract Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className={inputClass}
            value={contractStartDate}
            onChange={(e) => setContractStartDate(e.target.value)}
          />
        </div>

        {/* Contract End Date */}
        <div className="flex-1">
          <label className="block font-medium mb-1">
            Contract End Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className={inputClass}
            value={contractEndDate}
            onChange={(e) => setContractEndDate(e.target.value)}
          />
        </div>
      </div>
    </section>
  );
};

export default MOUUploadSection;
