import React from "react";
import { FaPlus, FaTrash } from "react-icons/fa";

const inputClass = "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const numberInputClass = "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const TopicBreakdownSection = ({ formData, setFormData }) => {

  const updateTopic = (index, field, value) => {
    const updated = [...formData.topics];
    updated[index][field] = value;
    const totalHours = updated.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);

    setFormData((prev) => ({
      ...prev,
      topics: updated,
      totalHours: totalHours
    }));
  };

  const addTopicField = () => {
    const updated = [...formData.topics, { topic: "", hours: "" }];
    const totalHours = updated.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);

    setFormData((prev) => ({
      ...prev,
      topics: updated,
      totalHours: totalHours
    }));
  };

  const removeTopicField = (index) => {
    const updated = [...formData.topics];
    updated.splice(index, 1);
    const totalHours = updated.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);

    setFormData((prev) => ({
      ...prev,
      topics: updated,
      totalHours: totalHours
    }));
  };

  return (
    <section>
      <div className="p-5 bg-white shadow-lg rounded-xl border border-gray-200 space-y-4">
        
        {/* Title Row with Total Hours on Right */}
        <div className="flex justify-between items-center border-b border-blue-500 pb-2">
          <h3 className="text-2xl font-semibold text-blue-700">Training Total Hours Breakup</h3>
          <p className="font-semibold text-blue-800 text-sm md:text-base">
            Total Hours: {formData.totalHours || 0}
          </p>
        </div>

        {/* Dynamic Rows */}
        <div className="space-y-4">
          {(formData?.topics || []).map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div className="w-full">
                <label className="block font-medium mb-1">
                  Topic <span className="text-red-500">*</span>
                </label>
                <select
                  className={inputClass}
                  value={item.topic}
                  onChange={(e) => updateTopic(index, "topic", e.target.value)}
                  required
                >
                  <option value="">Select Topic</option>
                  {["Soft Skills", "Aptitude", "Domain Technical", "Excel - Power BI", "Looker Studio"].map(
                    (t) => (
                      <option key={t} value={t}>{t}</option>
                    )
                  )}
                </select>
              </div>

              <div className="w-full">
                <label className="block font-medium mb-1">
                  Hours <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Enter Hours"
                  className={numberInputClass}
                  value={item.hours}
                  onChange={(e) => updateTopic(index, "hours", e.target.value)}
                  required
                  min="1"
                />
              </div>

              <div className="flex items-end gap-2 md:col-span-2 justify-start md:justify-end pt-1">
                {index === formData.topics.length - 1 && (
                  <button
                    type="button"
                    onClick={addTopicField}
                    className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow"
                    title="Add Row"
                  >
                    <FaPlus />
                  </button>
                )}
                {formData.topics.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTopicField(index)}
                    className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 shadow"
                    title="Delete Row"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default TopicBreakdownSection;
