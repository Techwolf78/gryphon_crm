import React from "react";

const fileInputClass =
  "block w-full text-sm text-gray-700 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100";

const MOUUploadSection = ({ mouFile, setMouFile, mouFileError }) => {
  return (
    <section className="p-5 bg-white rounded-xl shadow space-y-4">
      <h3 className="font-semibold text-2xl text-blue-700 border-b pb-2">MOU Upload</h3>

      <div>
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
    </section>
  );
};

export default MOUUploadSection;
