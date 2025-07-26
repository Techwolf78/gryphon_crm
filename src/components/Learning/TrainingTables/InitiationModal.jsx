import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const PHASE_OPTIONS = ['phase-1', 'phase-2'];
const DOMAIN_OPTIONS = ['Technical', 'Soft skills', 'Aptitude', 'Tools'];
const DAY_DURATION_OPTIONS = ['AM', 'PM'];

function InitiationModal({ training, onClose, onConfirm }) {
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Main form fields (common to both phases)
  const [trainingStartDate, setTrainingStartDate] = useState(null);
  const [trainingEndDate, setTrainingEndDate] = useState(null);
  const [collegeStartTime, setCollegeStartTime] = useState('');
  const [collegeEndTime, setCollegeEndTime] = useState('');
  const [lunchTime, setLunchTime] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  
  // Phase 2 specific fields
  const [phase2StartDate, setPhase2StartDate] = useState(null);
  const [phase2EndDate, setPhase2EndDate] = useState(null);
  
  // Table 1 data - auto-generated based on specializations
  const [table1Data, setTable1Data] = useState([]);
  
  // Table 2 data
  const [table2Data, setTable2Data] = useState([
    { 
      batchCode: '', 
      startDate: null, 
      endDate: null, 
      trainerName: '', 
      dayDuration: '', 
      cost: '', 
      travelFoodStay: '', 
      totalAmount: '', 
      totalHours: '', 
      remainingHrs: '' 
    }
  ]);

  // Effect to auto-generate Table 1 rows when domain is selected
  useEffect(() => {
    if (selectedDomain && training?.courses) {
      const generatedRows = training.courses.map(course => ({
        batch: course.specialization,
        stdCount: course.students,
        hrs: '',
        batchPerStdCount: '',
        batchCode: generateBatchCode(course.specialization),
        assignedHours: ''
      }));
      setTable1Data(generatedRows);
    } else {
      setTable1Data([]);
    }
  }, [selectedDomain, training]);

  const generateBatchCode = (specialization) => {
    if (!training?.collegeCode || !training?.year) return '';
    return `${training.collegeCode}-${specialization}-${training.year}`;
  };

  const handlePhaseChange = (phase) => {
    setSelectedPhases(prev => 
      prev.includes(phase)
        ? prev.filter(p => p !== phase)
        : [...prev, phase]
    );
    
    // Clear domain if phase-1 is deselected
    if (phase === 'phase-1' && !selectedPhases.includes(phase)) {
      setSelectedDomain('');
    }
  };

  const handleDomainChange = (domain) => {
    setSelectedDomain(domain);
  };

  const handleTable1Change = (index, field, value) => {
    const updatedData = [...table1Data];
    updatedData[index][field] = value;
    setTable1Data(updatedData);
  };

  const handleTable2Change = (index, field, value) => {
    const updatedData = [...table2Data];
    updatedData[index][field] = value;
    setTable2Data(updatedData);
  };

  const addTable2Row = () => {
    setTable2Data([
      ...table2Data,
      { 
        batchCode: '', 
        startDate: null, 
        endDate: null, 
        trainerName: '', 
        dayDuration: '', 
        cost: '', 
        travelFoodStay: '', 
        totalAmount: '', 
        totalHours: '', 
        remainingHrs: '' 
      }
    ]);
  };

  const removeTable2Row = (index) => {
    if (table2Data.length <= 1) return;
    const updatedData = [...table2Data];
    updatedData.splice(index, 1);
    setTable2Data(updatedData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedPhases.length === 0) {
      setError('Please select at least one phase');
      return;
    }
    
    if (selectedPhases.includes('phase-1') && !selectedDomain) {
      setError('Please select a domain for phase 1');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Save each selected phase
      const batchPromises = selectedPhases.map(async (phase) => {
        const phaseData = {
          details,
          createdAt: serverTimestamp(),
          createdBy: training.createdBy || {},
          trainingStartDate,
          trainingEndDate,
          collegeStartTime,
          collegeEndTime,
          lunchTime,
          table1Data,
          table2Data,
        };
        
        // Add phase-specific data
        if (phase === 'phase-1') {
          phaseData.domain = selectedDomain;
        }
        
        if (phase === 'phase-2') {
          phaseData.phase2StartDate = phase2StartDate;
          phaseData.phase2EndDate = phase2EndDate;
        }
        
        const phaseRef = doc(
          collection(db, 'trainingForms', training.id, 'trainings'),
          phase
        );
        
        return setDoc(phaseRef, phaseData);
      });
      
      await Promise.all(batchPromises);
      
      setLoading(false);
      if (onConfirm) onConfirm({ 
        phases: selectedPhases,
        details, 
        trainingStartDate,
        trainingEndDate,
        collegeStartTime,
        collegeEndTime,
        lunchTime,
        domain: selectedDomain,
        table1Data,
        table2Data,
        phase2StartDate,
        phase2EndDate
      });
      
      if (onClose) onClose();
    } catch (err) {
      console.error('Error saving phase data:', err);
      setError('Failed to save phase data');
      setLoading(false);
    }
  };

  // Add Batch handler for Phase 2
  const addBatch = () => {
    setTable2Data([
      ...table2Data,
      { 
        batchCode: '', 
        startDate: null, 
        endDate: null, 
        trainerName: '', 
        dayDuration: '', 
        cost: '', 
        travelFoodStay: '', 
        totalAmount: '', 
        totalHours: '', 
        remainingHrs: '' 
      }
    ]);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl my-8 max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Initiate Training Phase</h2>
        <form onSubmit={handleSubmit}>
          {/* Phase Selection */}
          <div className="mb-6 p-4 border rounded">
            <label className="block font-medium mb-2">Select Phase(s)</label>
            <div className="flex gap-4">
              {PHASE_OPTIONS.map((phase) => (
                <label key={phase} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedPhases.includes(phase)}
                    onChange={() => handlePhaseChange(phase)}
                    className="h-4 w-4"
                  />
                  <span className="capitalize">{phase.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {(selectedPhases.includes('phase-1') || selectedPhases.includes('phase-2')) && (
            <>
              {/* Common Fields (Main Form) */}
              <div className="mb-6 p-4 border rounded">
                <h3 className="font-medium mb-3">Training Details</h3>
                
                {/* Details */}
                <div className="mb-4">
                  <label className="block font-medium mb-1">Details</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    placeholder="Enter training details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                  />
                </div>
                
                {/* Training Dates and Times */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Training Start Date</label>
                    <DatePicker
                      selected={trainingStartDate}
                      onChange={(date) => setTrainingStartDate(date)}
                      className="w-full border rounded px-3 py-2"
                      placeholderText="Select start date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Training End Date</label>
                    <DatePicker
                      selected={trainingEndDate}
                      onChange={(date) => setTrainingEndDate(date)}
                      className="w-full border rounded px-3 py-2"
                      placeholderText="Select end date"
                      minDate={trainingStartDate}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">College Start Time</label>
                    <input
                      type="time"
                      className="w-full border rounded px-3 py-2"
                      value={collegeStartTime}
                      onChange={(e) => setCollegeStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">College End Time</label>
                    <input
                      type="time"
                      className="w-full border rounded px-3 py-2"
                      value={collegeEndTime}
                      onChange={(e) => setCollegeEndTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Lunch Time</label>
                    <input
                      type="time"
                      className="w-full border rounded px-3 py-2"
                      value={lunchTime}
                      onChange={(e) => setLunchTime(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Domain Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Domain</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={selectedDomain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                  >
                    <option value="">Select Domain</option>
                    {DOMAIN_OPTIONS.map((domain) => (
                      <option key={domain} value={domain}>{domain}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phase 1 Tables (show when domain is selected) */}
              {selectedDomain && (
                <>
                  {/* Table 1 - Auto-generated based on specializations */}
                  <div className="mb-6 p-4 border rounded">
                    <h3 className="font-medium mb-3">Batch Details</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border px-4 py-2">Batch (Specialization)</th>
                            <th className="border px-4 py-2">Std Count</th>
                            <th className="border px-4 py-2">Hrs</th>
                            <th className="border px-4 py-2">Batch per Std Count</th>
                            <th className="border px-4 py-2">Batch Code</th>
                            <th className="border px-4 py-2">Assigned Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table1Data.map((row, index) => (
                            <tr key={index}>
                              <td className="border px-4 py-2">
                                <input
                                  type="text"
                                  className="w-full px-2 py-1 bg-gray-100"
                                  value={row.batch}
                                  readOnly
                                />
                              </td>
                              <td className="border px-4 py-2">
                                <input
                                  type="number"
                                  className="w-full px-2 py-1 bg-gray-100"
                                  value={row.stdCount}
                                  readOnly
                                />
                              </td>
                              <td className="border px-4 py-2">
                                <input
                                  type="number"
                                  className="w-full px-2 py-1"
                                  value={row.hrs}
                                  onChange={(e) => handleTable1Change(index, 'hrs', e.target.value)}
                                />
                              </td>
                              <td className="border px-4 py-2">
                                <input
                                  type="number"
                                  className="w-full px-2 py-1"
                                  value={row.batchPerStdCount}
                                  onChange={(e) => handleTable1Change(index, 'batchPerStdCount', e.target.value)}
                                />
                              </td>
                              <td className="border px-4 py-2">
                                <input
                                  type="text"
                                  className="w-full px-2 py-1"
                                  value={row.batchCode}
                                  onChange={(e) => handleTable1Change(index, 'batchCode', e.target.value)}
                                />
                              </td>
                              <td className="border px-4 py-2">
                                <input
                                  type="number"
                                  className="w-full px-2 py-1"
                                  value={row.assignedHours}
                                  onChange={(e) => handleTable1Change(index, 'assignedHours', e.target.value)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Table 2 */}
                  <div className="mb-6 p-4 border rounded">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">Training Schedule</h3>
                      <button
                        type="button"
                        onClick={addBatch}
                        className="px-3 py-1 bg-blue-500 text-white rounded"
                      >
                        Add Batch
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border px-4 py-2 min-w-[140px]">Batch Code</th>
                            <th className="border px-4 py-2 min-w-[140px]">Start Date</th>
                            <th className="border px-4 py-2 min-w-[140px]">End Date</th>
                            <th className="border px-4 py-2 min-w-[160px]">Trainer Name</th>
                            <th className="border px-4 py-2 min-w-[120px]">Day Duration</th>
                            <th className="border px-4 py-2 min-w-[120px]">Cost</th>
                            <th className="border px-4 py-2 min-w-[160px]">Travel/Food/Stay</th>
                            <th className="border px-4 py-2 min-w-[140px]">Total Amount</th>
                            <th className="border px-4 py-2 min-w-[120px]">Total Hours</th>
                            <th className="border px-4 py-2 min-w-[140px]">Remaining Hrs</th>
                            <th className="border px-4 py-2 min-w-[100px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table2Data.map((row, index) => (
                            <tr key={index}>
                              <td className="border px-4 py-2 min-w-[140px]">
                                <select
                                  className="w-full px-2 py-1"
                                  value={row.batchCode}
                                  onChange={(e) => handleTable2Change(index, 'batchCode', e.target.value)}
                                >
                                  <option value="">Select Batch</option>
                                  {table1Data.map((batch, i) => (
                                    <option key={i} value={batch.batchCode}>{batch.batchCode}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="border px-4 py-2 min-w-[140px]">
                                <DatePicker
                                  selected={row.startDate}
                                  onChange={(date) => handleTable2Change(index, 'startDate', date)}
                                  className="w-full px-2 py-1"
                                  placeholderText="Select date"
                                />
                              </td>
                              <td className="border px-4 py-2 min-w-[140px]">
                                <DatePicker
                                  selected={row.endDate}
                                  onChange={(date) => handleTable2Change(index, 'endDate', date)}
                                  className="w-full px-2 py-1"
                                  placeholderText="Select date"
                                  minDate={row.startDate}
                                />
                              </td>
                              <td className="border px-4 py-2 min-w-[160px]">
                                <input
                                  type="text"
                                  className="w-full px-2 py-1"
                                  value={row.trainerName}
                                  onChange={(e) => handleTable2Change(index, 'trainerName', e.target.value)}
                                />
                              </td>
                              <td className="border px-4 py-2 min-w-[120px]">
                                <select
                                  className="w-full px-2 py-1"
                                  value={row.dayDuration}
                                  onChange={(e) => handleTable2Change(index, 'dayDuration', e.target.value)}
                                >
                                  <option value="">Select</option>
                                  {DAY_DURATION_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="border px-4 py-2 min-w-[120px]">
                                <input
                                  type="number"
                                  className="w-full px-2 py-1"
                                  value={row.cost}
                                  onChange={(e) => handleTable2Change(index, 'cost', e.target.value)}
                                />
                              </td>
                              <td className="border px-4 py-2 min-w-[160px]">
                                <input
                                  type="text"
                                  className="w-full px-2 py-1"
                                  value={row.travelFoodStay}
                                  onChange={(e) => handleTable2Change(index, 'travelFoodStay', e.target.value)}
                                />
                              </td>
                              <td className="border px-4 py-2 min-w-[140px]">
                                <input
                                  type="number"
                                  className="w-full px-2 py-1"
                                  value={row.totalAmount}
                                  onChange={(e) => handleTable2Change(index, 'totalAmount', e.target.value)}
                                />
                              </td>
                              <td className="border px-4 py-2 min-w-[120px]">
                                <input
                                  type="number"
                                  className="w-full px-2 py-1"
                                  value={row.totalHours}
                                  onChange={(e) => handleTable2Change(index, 'totalHours', e.target.value)}
                                />
                              </td>
                              <td className="border px-4 py-2 min-w-[140px]">
                                <input
                                  type="number"
                                  className="w-full px-2 py-1"
                                  value={row.remainingHrs}
                                  onChange={(e) => handleTable2Change(index, 'remainingHrs', e.target.value)}
                                />
                              </td>
                              <td className="border px-4 py-2 min-w-[100px] text-center">
                                {table2Data.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeTable2Row(index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Phase 2 Dates (only when both phases are selected) */}
              {selectedPhases.includes('phase-1') && selectedPhases.includes('phase-2') && (
                <div className="mb-6 p-4 border rounded">
                  <h3 className="font-medium mb-3">Phase 2 Dates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Phase 2 Start Date</label>
                      <DatePicker
                        selected={phase2StartDate}
                        onChange={(date) => setPhase2StartDate(date)}
                        className="w-full border rounded px-3 py-2"
                        placeholderText="Select start date"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phase 2 End Date</label>
                      <DatePicker
                        selected={phase2EndDate}
                        onChange={(date) => setPhase2EndDate(date)}
                        className="w-full border rounded px-3 py-2"
                        placeholderText="Select end date"
                        minDate={phase2StartDate}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
              disabled={loading || selectedPhases.length === 0}
            >
              {loading ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InitiationModal;