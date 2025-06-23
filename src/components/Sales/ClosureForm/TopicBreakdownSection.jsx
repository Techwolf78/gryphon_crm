// TopicBreakdownSection.jsx
import React from "react";
import { FaPlus, FaTrash } from "react-icons/fa";

const TopicBreakdownSection = ({ formData, setFormData }) => {
  const inputClass =
    "p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none";

  const updateTopic = (index, field, value) => {
    const updated = [...formData.topics];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, topics: updated }));
  };

  const addTopicField = () => {
    setFormData((prev) => ({
      ...prev,
      topics: [...prev.topics, { topic: "", hours: "" }]
    }));
  };

  const removeTopicField = (index) => {
    const updated = [...formData.topics];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, topics: updated }));
  };

  return (
    <section>
      <h3 className="font-semibold text-lg mb-3 text-blue-700">Training Total Hours Breakup</h3>
      <div className="space-y-6">
       {(formData?.topics || []).map((item, index) => (


          <div
            key={index}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white shadow-md rounded-xl"
          >
            <select
              className={inputClass}
              value={item.topic}
              onChange={(e) => updateTopic(index, "topic", e.target.value)}
            >
              <option value="">Select Topic</option>
              {["Soft Skills", "Aptitude", "Domain Technical", "Excel - Power BI", "Looker Studio"].map(
                (t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                )
              )}
            </select>

            <input
              type="number"
              placeholder="Enter Hours"
              className={inputClass}
              value={item.hours}
              onChange={(e) => updateTopic(index, "hours", e.target.value)}
            />

            <div className="md:col-span-2 flex items-center gap-3 justify-start md:justify-end">
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

        <p className="text-right font-semibold mt-4 text-blue-800 text-sm md:text-base">
          Total Hours: {formData.topics.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0)}
        </p>
      </div>
    </section>
  );
};

export default TopicBreakdownSection;
