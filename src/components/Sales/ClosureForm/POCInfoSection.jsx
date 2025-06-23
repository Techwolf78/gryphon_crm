import React from "react";

const POCInfoSection = ({ formData, handleChange }) => {
  const inputClass =
    "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:ring-blue-400";

  return (
    <section>
      <h3 className="font-semibold text-lg mb-3 text-blue-700">POC Details</h3>
      <div className="grid grid-cols-3 gap-6">
        {/* TPO Column */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            TPO Name <span className="text-red-500">*</span>
          </label>
          <input
            name="tpoName"
            className={inputClass}
            required
            placeholder="Enter TPO's full name"
            value={formData.tpoName || ""}
            onChange={handleChange}
          />

          <label className="block text-sm font-medium text-gray-700">
            TPO Email <span className="text-red-500">*</span>
          </label>
          <input
            name="tpoEmail"
            className={inputClass}
            required
            placeholder="Enter TPO's email"
            value={formData.tpoEmail || ""}
            onChange={handleChange}
          />

          <label className="block text-sm font-medium text-gray-700">
            TPO Phone <span className="text-red-500">*</span>
          </label>
          <input
            name="tpoPhone"
            className={inputClass}
            required
            placeholder="Enter TPO's phone number"
            value={formData.tpoPhone || ""}
            onChange={handleChange}
          />
        </div>

        {/* Training Column */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Training Name
          </label>
          <input
            name="trainingName"
            className={inputClass}
            placeholder="Enter training coordinator's name"
            value={formData.trainingName || ""}
            onChange={handleChange}
          />

          <label className="block text-sm font-medium text-gray-700">
            Training Email
          </label>
          <input
            name="trainingEmail"
            className={inputClass}
            placeholder="Enter training coordinator's email"
            value={formData.trainingEmail || ""}
            onChange={handleChange}
          />

          <label className="block text-sm font-medium text-gray-700">
            Training Phone
          </label>
          <input
            name="trainingPhone"
            className={inputClass}
            placeholder="Enter training coordinator's phone"
            value={formData.trainingPhone || ""}
            onChange={handleChange}
          />
        </div>

        {/* Account Column */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Account Name
          </label>
          <input
            name="accountName"
            className={inputClass}
            placeholder="Enter account person’s name"
            value={formData.accountName || ""}
            onChange={handleChange}
          />

          <label className="block text-sm font-medium text-gray-700">
            Account Email
          </label>
          <input
            name="accountEmail"
            className={inputClass}
            placeholder="Enter account person’s email"
            value={formData.accountEmail || ""}
            onChange={handleChange}
          />

          <label className="block text-sm font-medium text-gray-700">
            Account Phone
          </label>
          <input
            name="accountPhone"
            className={inputClass}
            placeholder="Enter account person’s phone"
            value={formData.accountPhone || ""}
            onChange={handleChange}
          />
        </div>
      </div>
    </section>
  );
};

export default POCInfoSection;
