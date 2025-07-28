import React from 'react';

const PhaseSelection = ({ phases, selectedPhases, onChange }) => {
  return (
    <div className="mb-6 p-4 border rounded">
      <label className="block font-medium mb-2">Select Phase(s)</label>
      <div className="flex gap-4">
        {phases.map((phase) => (
          <label key={phase} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedPhases.includes(phase)}
              onChange={() => onChange(phase)}
              className="h-4 w-4"
            />
            <span className="capitalize">{phase.replace('-', ' ')}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default PhaseSelection;