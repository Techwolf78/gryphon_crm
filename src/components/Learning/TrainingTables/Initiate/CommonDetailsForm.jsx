import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CommonFields = ({ 
  commonFields, 
  setCommonFields, 
  selectedDomain, 
  setSelectedDomain, 
  domainOptions 
}) => {
  const handleCommonFieldChange = (field, value) => {
    setCommonFields(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="mb-6 p-4 border rounded">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Training Start Date</label>
          <DatePicker
            selected={commonFields.trainingStartDate}
            onChange={(date) => handleCommonFieldChange('trainingStartDate', date)}
            className="w-full border rounded px-3 py-2"
            placeholderText="Select start date"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Training End Date</label>
          <DatePicker
            selected={commonFields.trainingEndDate}
            onChange={(date) => handleCommonFieldChange('trainingEndDate', date)}
            className="w-full border rounded px-3 py-2"
            placeholderText="Select end date"
            minDate={commonFields.trainingStartDate}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">College Start Time</label>
          <input
            type="time"
            className="w-full border rounded px-3 py-2"
            value={commonFields.collegeStartTime}
            onChange={(e) => handleCommonFieldChange('collegeStartTime', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">College End Time</label>
          <input
            type="time"
            className="w-full border rounded px-3 py-2"
            value={commonFields.collegeEndTime}
            onChange={(e) => handleCommonFieldChange('collegeEndTime', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Lunch Time</label>
          <input
            type="time"
            className="w-full border rounded px-3 py-2"
            value={commonFields.lunchTime}
            onChange={(e) => handleCommonFieldChange('lunchTime', e.target.value)}
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Domain</label>
        <select
          className="w-full border rounded px-3 py-2"
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
        >
          <option value="">Select Domain</option>
          {domainOptions.map((domain) => (
            <option key={domain} value={domain}>{domain}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default CommonFields;