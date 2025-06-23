import React from "react";

const MOUUploadSection = ({ mouFile, setMouFile }) => {
  return (
    <section>
      <h3 className="font-semibold text-lg mb-4 text-blue-700">MOU Upload</h3>
      <label className="block font-semibold mb-1">Upload MOU File</label>
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        className="block w-full border border-gray-300 rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        onChange={(e) => setMouFile(e.target.files[0])}
      />
    </section>
  );
};

export default MOUUploadSection ;
