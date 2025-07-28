import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Phase2Dates = ({ phase2Dates, setPhase2Dates }) => {
  return (
    <div className="mb-6 p-4 border rounded">
      <h3 className="font-medium mb-3">Phase 2 Dates</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Phase 2 Start Date</label>
          <DatePicker
            selected={phase2Dates.startDate}
            onChange={(date) => setPhase2Dates(prev => ({ ...prev, startDate: date }))}
            className="w-full border rounded px-3 py-2"
            placeholderText="Select start date"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phase 2 End Date</label>
          <DatePicker
            selected={phase2Dates.endDate}
            onChange={(date) => setPhase2Dates(prev => ({ ...prev, endDate: date }))}
            className="w-full border rounded px-3 py-2"
            placeholderText="Select end date"
            minDate={phase2Dates.startDate}
          />
        </div>
      </div>
    </div>
  );
};

export default Phase2Dates;