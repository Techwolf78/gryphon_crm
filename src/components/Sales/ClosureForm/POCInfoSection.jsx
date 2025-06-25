import React from "react";

const POCInfoSection = ({ formData, handleChange }) => {
  const inputClass =
    "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:ring-blue-400 transition";

  return (
    <section className="p-5 bg-white rounded-xl shadow space-y-6">
      <h3 className="font-semibold text-2xl text-blue-700 border-b pb-2">POC Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TPO */}
        <div className="space-y-2">
          <label className="font-medium">TPO Name <span className="text-red-500">*</span></label>
          <input
            name="tpoName"
            className={inputClass}
            placeholder="Enter TPO's full name"
            value={formData.tpoName}
            onChange={handleChange}
            required
          />

          <label className="font-medium">TPO Email <span className="text-red-500">*</span></label>
          <input
            name="tpoEmail"
            className={inputClass}
            placeholder="Enter TPO's email"
            value={formData.tpoEmail}
            onChange={handleChange}
            required
          />

          <label className="font-medium">TPO Phone <span className="text-red-500">*</span></label>
          <input
            name="tpoPhone"
            className={inputClass}
            placeholder="Enter TPO's phone number"
            value={formData.tpoPhone}
            onChange={handleChange}
            required
          />
        </div>

        {/* Training Coordinator */}
        <div className="space-y-2">
          <label className="font-medium">Training Name</label>
          <input
            name="trainingName"
            className={inputClass}
            placeholder="Enter training coordinator's name"
            value={formData.trainingName}
            onChange={handleChange}
          />

          <label className="font-medium">Training Email</label>
          <input
            name="trainingEmail"
            className={inputClass}
            placeholder="Enter training coordinator's email"
            value={formData.trainingEmail}
            onChange={handleChange}
          />

          <label className="font-medium">Training Phone</label>
          <input
            name="trainingPhone"
            className={inputClass}
            placeholder="Enter training coordinator's phone"
            value={formData.trainingPhone}
            onChange={handleChange}
          />
        </div>

        {/* Accounts */}
        <div className="space-y-2">
          <label className="font-medium">Account Name</label>
          <input
            name="accountName"
            className={inputClass}
            placeholder="Enter account person’s name"
            value={formData.accountName}
            onChange={handleChange}
          />

          <label className="font-medium">Account Email</label>
          <input
            name="accountEmail"
            className={inputClass}
            placeholder="Enter account person’s email"
            value={formData.accountEmail}
            onChange={handleChange}
          />

          <label className="font-medium">Account Phone</label>
          <input
            name="accountPhone"
            className={inputClass}
            placeholder="Enter account person’s phone"
            value={formData.accountPhone}
            onChange={handleChange}
          />
        </div>
      </div>
    </section>
  );
};

export default POCInfoSection;
