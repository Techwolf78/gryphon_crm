import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { FiPlus, FiTrash2, FiChevronDown, FiChevronUp, FiUser, FiClock } from 'react-icons/fi';

const DAY_DURATION_OPTIONS = ['AM', 'PM', 'AM & PM'];

const BatchDetailsTable = ({
  table1Data,
  setTable1Data,
  selectedDomain,
  topics,
  courses = [],
  commonFields
}) => {
  const [mergeModal, setMergeModal] = useState({
    open: false,
    sourceRowIndex: null,
    targetSpecialization: ''
  });
  const [trainers, setTrainers] = useState([]);
  const [expandedTrainer, setExpandedTrainer] = useState({});
  const [expandedBatch, setExpandedBatch] = useState({});

  // Color palette
  const colors = {
    primary: 'bg-indigo-600 text-white',
    secondary: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-rose-100 text-rose-800',
    info: 'bg-blue-100 text-blue-800',
    accent: 'bg-indigo-50 text-indigo-700'
  };

  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'trainers'));
        const trainerList = [];
        querySnapshot.forEach((doc) => {
          trainerList.push({ id: doc.id, ...doc.data() });
        });
        setTrainers(trainerList);
      } catch (error) {
        console.error('Error fetching trainers:', error);
      }
    };
    fetchTrainers();
  }, []);

  const getDomainHours = (domain) => {
    if (!domain || !topics) return 0;
    const domainTopic = topics.find(t => t.topic === `Domain ${domain}`);
    return domainTopic?.hours || 0;
  };

  const handleAssignedHoursChange = (rowIndex, value) => {
    const updated = [...table1Data];
    updated[rowIndex].assignedHours = Number(value);
    setTable1Data(updated);
  };

  const generateBatchCode = (specialization, index) => {
    return `${specialization}${index}`;
  };

  // When adding a batch, assignedHours for new batches should match batch 1's assignedHours
  const addBatch = (rowIndex) => {
    const updatedData = [...table1Data];
    const batches = updatedData[rowIndex].batches;
    const batch1AssignedHours = batches.length > 0 ? batches[0].assignedHours : 0;
    const newBatchIndex = batches.length;
    updatedData[rowIndex].batches.push({
      batchPerStdCount: '',
      batchCode: generateBatchCode(updatedData[rowIndex].batch, newBatchIndex + 1),
      assignedHours: batch1AssignedHours, // always match batch 1's assigned hours
      trainers: [],
    });
    setTable1Data(updatedData);
  };

  const removeBatch = (rowIndex, batchIndex) => {
    if (table1Data[rowIndex].batches.length <= 1) return;

    const updatedData = [...table1Data];
    updatedData[rowIndex].batches.splice(batchIndex, 1);

    updatedData[rowIndex].batches = updatedData[rowIndex].batches.map((batch, idx) => ({
      ...batch,
      batchCode: generateBatchCode(updatedData[rowIndex].batch, idx + 1)
    }));

    setTable1Data(updatedData);
  };

  const handleMergeBatch = (sourceRowIndex, targetSpecialization) => {
    const updatedData = [...table1Data];
    const sourceRow = updatedData[sourceRowIndex];
    const targetRowIndex = updatedData.findIndex(row => row.batch === targetSpecialization);

    if (targetRowIndex === -1) return;

    const targetRow = updatedData[targetRowIndex];

    const combinedStudents = sourceRow.stdCount + targetRow.stdCount;
    const combinedHours = sourceRow.hrs + targetRow.hrs;

    const newBatchIndex = targetRow.batches.length + 1;
    const mergedBatchCode = `${sourceRow.batch}-${targetRow.batch}-${newBatchIndex}`;

    const mergedRow = {
      ...targetRow,
      batch: `${sourceRow.batch}+${targetRow.batch}`,
      stdCount: combinedStudents,
      hrs: combinedHours,
      assignedHours: null,
      batches: [
        ...targetRow.batches,
        {
          batchPerStdCount: combinedStudents,
          batchCode: mergedBatchCode,
          isMerged: true,
          mergedFrom: `${sourceRow.batch}+${targetRow.batch}`,
          originalData: {
            source: sourceRow,
            target: targetRow
          },
          trainers: []
        }
      ]
    };

    updatedData[targetRowIndex] = mergedRow;
    updatedData.splice(sourceRowIndex, 1);

    setTable1Data(updatedData);
    setMergeModal({ open: false, sourceRowIndex: null, targetSpecialization: '' });
  };

  // When removing a batch, nothing changes for assignedHours

  // When changing assignedHours for a batch, never allow sum to exceed row.hrs
  const handleBatchChange = (rowIndex, batchIndex, field, value) => {
    const updatedData = [...table1Data];
    const currentRow = updatedData[rowIndex];

    if (field === 'batchPerStdCount') {
      const inputValue = Number(value);
      const otherBatchTotal = currentRow.batches.reduce((acc, batch, idx) => {
        return idx === batchIndex ? acc : acc + Number(batch.batchPerStdCount || 0);
      }, 0);
      const maxAllowed = currentRow.stdCount - otherBatchTotal;
      const finalValue = inputValue > maxAllowed ? maxAllowed : inputValue;
      currentRow.batches[batchIndex][field] = finalValue;
    } else if (field === 'assignedHours') {
      let val = Number(value);
      if (val > currentRow.hrs) val = currentRow.hrs;
      currentRow.batches[batchIndex][field] = val;
      // If batch 1, update all other batches to match
      if (batchIndex === 0) {
        currentRow.batches.forEach((batch, idx) => {
          if (idx !== 0) batch.assignedHours = val;
        });
      }
    } else {
      currentRow.batches[batchIndex][field] = value;
    }

    setTable1Data(updatedData);
  };

  const addTrainer = (rowIndex, batchIndex) => {
    const updated = [...table1Data];
    const batch = updated[rowIndex].batches[batchIndex];
    if (!batch.trainers) batch.trainers = [];
    batch.trainers.push({
      trainerId: '',
      trainerName: '',
      assignedHours: '',
      dayDuration: '',
      startDate: '',
      endDate: '',
      dailyHours: []
    });
    setTable1Data(updated);
  };

  const removeTrainer = (rowIndex, batchIndex, trainerIdx) => {
    const updated = [...table1Data];
    const batch = updated[rowIndex].batches[batchIndex];
    if (!batch.trainers) batch.trainers = [];
    batch.trainers.splice(trainerIdx, 1);
    setTable1Data(updated);
  };

  const getTrainingHoursPerDay = (commonFields) => {
    if (
      !commonFields.collegeStartTime ||
      !commonFields.collegeEndTime ||
      !commonFields.lunchStartTime ||
      !commonFields.lunchEndTime
    ) return 0;

    const toMinutes = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };
    const collegeStart = toMinutes(commonFields.collegeStartTime);
    const collegeEnd = toMinutes(commonFields.collegeEndTime);
    const lunchStart = toMinutes(commonFields.lunchStartTime);
    const lunchEnd = toMinutes(commonFields.lunchEndTime);

    let total = (collegeEnd - collegeStart) - (lunchEnd - lunchStart);
    return total > 0 ? +(total / 60).toFixed(2) : 0;
  };

  const handleTrainerField = (rowIndex, batchIndex, trainerIdx, field, value) => {
    const updated = [...table1Data];
    const batch = updated[rowIndex].batches[batchIndex];
    if (!batch.trainers) batch.trainers = [];
    const trainer = batch.trainers[trainerIdx];

    trainer[field] = value;

    if (['dayDuration', 'startDate', 'endDate'].includes(field)) {
      const perDay = getTrainingHoursPerDay(commonFields);
      let perDayHours = 0;
      if (trainer.dayDuration === 'AM & PM') perDayHours = perDay;
      else if (trainer.dayDuration === 'AM' || trainer.dayDuration === 'PM') perDayHours = +(perDay / 2).toFixed(2);

      const dateList = getDateListExcludingSundays(trainer.startDate, trainer.endDate);
      trainer.dailyHours = dateList.map(() => perDayHours);
      trainer.assignedHours = trainer.dailyHours.reduce((a, b) => a + Number(b || 0), 0);
    }

    if (field === 'trainerId') {
      const tr = trainers.find(t => t.trainerId === value);
      trainer.trainerName = tr?.name || '';
    }

    setTable1Data(updated);
  };

  const getAvailableSpecializations = (sourceRowIndex) => {
    return table1Data
      .filter((_, idx) => idx !== sourceRowIndex)
      .map(row => row.batch);
  };

  const handleRowAssignedHoursChange = (rowIndex, value) => {
    const updated = [...table1Data];
    updated[rowIndex].assignedHours = value;
    updated[rowIndex].batches = updated[rowIndex].batches.map(batch => ({
      ...batch,
      assignedHours: value
    }));
    setTable1Data(updated);
  };

  const getDateListExcludingSundays = (start, end) => {
    if (!start || !end) return [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dates = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      if (current.getDay() !== 0) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const toggleBatchExpansion = (rowIndex) => {
    setExpandedBatch(prev => ({
      ...prev,
      [rowIndex]: !prev[rowIndex]
    }));
  };

  const toggleTrainerExpansion = (trainerKey) => {
    setExpandedTrainer(prev => ({
      ...prev,
      [trainerKey]: !prev[trainerKey]
    }));
  };

  const handleDayHourChange = (rowIndex, batchIndex, trainerIdx, dayIdx, value) => {
    const updated = [...table1Data];
    const t = updated[rowIndex].batches[batchIndex].trainers[trainerIdx];
    if (!t.dailyHours) t.dailyHours = [];
    t.dailyHours[dayIdx] = Number(value);
    t.assignedHours = t.dailyHours.reduce((a, b) => a + Number(b || 0), 0);
    setTable1Data(updated);
  };

  const handleTotalHoursChange = (rowIndex, batchIndex, trainerIdx, value) => {
    const updated = [...table1Data];
    const t = updated[rowIndex].batches[batchIndex].trainers[trainerIdx];
    const days = t.dailyHours ? t.dailyHours.length : 0;
    let total = Number(value);

    if (days > 0) {
      const equal = Math.floor(total / days);
      const remainder = total - (equal * days);
      t.dailyHours = Array(days).fill(equal);
      t.dailyHours[days - 1] += remainder;
      t.assignedHours = t.dailyHours.reduce((a, b) => a + Number(b || 0), 0);
    } else {
      t.assignedHours = total;
    }
    setTable1Data(updated);
  };

  return (
    <div className="space-y-6">
      {/* Merge Modal */}
      {mergeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Merge Batches</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Merge with:</label>
                <select
                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                  value={mergeModal.targetSpecialization}
                  onChange={(e) => setMergeModal(prev => ({
                    ...prev,
                    targetSpecialization: e.target.value
                  }))}
                >
                  <option value="">Select specialization</option>
                  {getAvailableSpecializations(mergeModal.sourceRowIndex).map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setMergeModal({ open: false, sourceRowIndex: null, targetSpecialization: '' })}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleMergeBatch(mergeModal.sourceRowIndex, mergeModal.targetSpecialization)}
                  disabled={!mergeModal.targetSpecialization}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${mergeModal.targetSpecialization ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-300 cursor-not-allowed'} transition-colors`}
                >
                  Confirm Merge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Batch Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Batch Management</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDomain ? `${selectedDomain} domain` : 'Select a domain to configure batches'}
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {table1Data.length > 0 ? (
            table1Data.map((row, rowIndex) => {
              const totalAssignedStudents = row.batches.reduce((sum, b) => sum + Number(b.batchPerStdCount || 0), 0);
              const totalAssignedHours = row.batches.reduce((sum, b) => sum + Number(b.assignedHours || 0), 0);
              const isExpanded = expandedBatch[rowIndex];

              // Calculate remaining hours for each specialization row
              const remainingHours = Number(row.hrs) - Number(row.batches[0]?.assignedHours || 0);

              return (
                <div key={rowIndex} className="transition-all duration-200">
                  {/* Batch Header */}
                  <div 
                    className={`px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${isExpanded ? 'bg-gray-50' : ''}`}
                    onClick={() => toggleBatchExpansion(rowIndex)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.accent}`}>
                        {rowIndex + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{row.batch}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center">
                            <FiUser className="mr-1.5" /> {row.stdCount} students
                          </span>
                          <span className="flex items-center">
                            <FiClock className="mr-1.5" /> {row.hrs} hours
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        totalAssignedStudents === row.stdCount ? colors.success :
                        totalAssignedStudents > row.stdCount ? colors.danger : colors.warning
                      }`}>
                        {totalAssignedStudents}/{row.stdCount} students
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        Number(row.batches[0]?.assignedHours || 0) === Number(row.hrs) ? colors.success :
                        Number(row.batches[0]?.assignedHours || 0) > Number(row.hrs) ? colors.danger : colors.warning
                      }`}>
                        {(row.batches[0]?.assignedHours || 0)}/{row.hrs} hours
                        <span className="ml-2 text-xs text-gray-500">
                          ({remainingHours > 0 ? `${remainingHours} hrs left` : remainingHours < 0 ? `${-remainingHours} hrs extra` : 'Done'})
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          addBatch(rowIndex);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors"
                        title="Add Batch"
                        type="button"
                      >
                        <FiPlus />
                      </button>
                      {isExpanded ? (
                        <FiChevronUp className="text-gray-400" />
                      ) : (
                        <FiChevronDown className="text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Batch Content */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-6">
                      {row.batches.map((batch, batchIndex) => (
                        <div key={batchIndex} className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
                          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <span className="font-medium text-sm text-gray-700">Batch {batchIndex + 1}</span>
                            <div className="flex space-x-2">
                              {row.batches.length > 1 && (
                                <button
                                  onClick={() => removeBatch(rowIndex, batchIndex)}
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"
                                  title="Remove Batch"
                                  type="button"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="p-4 space-y-4">
                            {/* Batch Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                  Students
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                  value={batch.batchPerStdCount || ''}
                                  onChange={e => handleBatchChange(rowIndex, batchIndex, 'batchPerStdCount', e.target.value.replace(/\D/g, ''))}
                                  min="0"
                                  max={row.stdCount}
                                  placeholder="0"
                                  disabled={batch.isMerged}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                  Batch Code
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                  value={batch.batchCode || ''}
                                  onChange={e => handleBatchChange(rowIndex, batchIndex, 'batchCode', e.target.value)}
                                  disabled={batch.isMerged}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                  Assigned Hours
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                  value={batch.assignedHours ?? (batchIndex === 0 ? 0 : row.batches[0]?.assignedHours ?? 0)}
                                  onChange={e => batchIndex === 0 ? handleBatchChange(rowIndex, batchIndex, 'assignedHours', e.target.value.replace(/\D/g, '')) : undefined}
                                  min="0"
                                  max={row.hrs}
                                  placeholder="0"
                                  disabled={batchIndex !== 0}
                                />
                              </div>
                            </div>

                            {/* Trainers Section */}
                            <div>
                              <div className="flex justify-between items-center mb-3">
                                <h5 className="text-sm font-medium text-gray-700">Trainers</h5>
                                <button
                                  onClick={() => addTrainer(rowIndex, batchIndex)}
                                  className="text-xs flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
                                  type="button"
                                >
                                  <FiPlus className="mr-1" size={12} /> Add Trainer
                                </button>
                              </div>

                              {batch.trainers && batch.trainers.length > 0 && (
                                <div className="mb-2">
                                  {(() => {
                                    const assigned = Number(batch.assignedHours || 0);
                                    const trainersTotal = (batch.trainers || []).reduce((sum, t) => sum + Number(t.assignedHours || 0), 0);
                                    const percent = assigned > 0 ? Math.min(100, Math.round((trainersTotal / assigned) * 100)) : 0;
                                    const remaining = assigned - trainersTotal;
                                    return (
                                      <div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                                          <div
                                            className={`h-2.5 rounded-full transition-all duration-300 ${
                                              percent === 100
                                                ? 'bg-emerald-500'
                                                : percent > 100
                                                ? 'bg-rose-500'
                                                : 'bg-amber-500'
                                            }`}
                                            style={{ width: `${percent}%` }}
                                          />
                                        </div>
                                        <div className={`text-xs font-medium ${
                                          remaining > 0 ? 'text-amber-600' : remaining < 0 ? 'text-rose-600' : 'text-emerald-700'
                                        }`}>
                                          {remaining > 0
                                            ? `${remaining} hrs remaining to assign to trainers`
                                            : remaining < 0
                                              ? `${-remaining} hrs extra assigned to trainers`
                                              : 'All assigned hours distributed to trainers'}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}

                              {(batch.trainers || []).length > 0 ? (
                                <div className="space-y-3">
                                  {(batch.trainers || []).map((trainer, trainerIdx) => {
                                    const trainerKey = `${rowIndex}-${batchIndex}-${trainerIdx}`;
                                    const isTrainerExpanded = expandedTrainer[trainerKey];
                                    const dateList = getDateListExcludingSundays(trainer.startDate, trainer.endDate);

                                    return (
                                      <div key={trainerIdx} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            <FiUser className="text-gray-500" size={14} />
                                            <span className="text-sm font-medium">
                                              {trainer.trainerName || 'Unassigned Trainer'}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                                              {trainer.assignedHours || 0} hrs
                                            </span>
                                            <button
                                              onClick={() => toggleTrainerExpansion(trainerKey)}
                                              className="p-1 text-gray-500 hover:text-gray-700"
                                              type="button"
                                            >
                                              {isTrainerExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                                            </button>
                                          </div>
                                        </div>

                                        {isTrainerExpanded && (
                                          <div className="p-3 bg-white space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                              <div>
                                                <label className="block text-xs text-gray-500 mb-1">Trainer</label>
                                                <select
                                                  value={trainer.trainerId || ''}
                                                  onChange={e => handleTrainerField(rowIndex, batchIndex, trainerIdx, 'trainerId', e.target.value)}
                                                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                                >
                                                  <option value="">Select Trainer</option>
                                                  {trainers.map(tr => (
                                                    <option key={tr.trainerId} value={tr.trainerId}>
                                                      {tr.name} ({tr.trainerId})
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                              <div>
                                                <label className="block text-xs text-gray-500 mb-1">Duration</label>
                                                <select
                                                  value={trainer.dayDuration || ''}
                                                  onChange={e => handleTrainerField(rowIndex, batchIndex, trainerIdx, 'dayDuration', e.target.value)}
                                                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                                >
                                                  <option value="">Select</option>
                                                  {DAY_DURATION_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                  ))}
                                                </select>
                                              </div>
                                              <div>
                                                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                                                <input
                                                  type="date"
                                                  value={trainer.startDate || ''}
                                                  onChange={e => handleTrainerField(rowIndex, batchIndex, trainerIdx, 'startDate', e.target.value)}
                                                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                                                <input
                                                  type="date"
                                                  value={trainer.endDate || ''}
                                                  onChange={e => handleTrainerField(rowIndex, batchIndex, trainerIdx, 'endDate', e.target.value)}
                                                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                                />
                                              </div>
                                            </div>

                                            {/* Move Total Hours here, after all schedule fields */}
                                            <div>
                                              <label className="block text-xs text-gray-500 mb-1">Total Hours</label>
                                              <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                value={trainer.assignedHours || ''}
                                                onChange={e => handleTotalHoursChange(rowIndex, batchIndex, trainerIdx, e.target.value.replace(/\D/g, ''))}
                                                className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                                min="0"
                                                max={batch.assignedHours}
                                              />
                                            </div>

                                            {dateList.length > 0 && (
                                              <div className="mt-3">
                                                <h6 className="text-xs font-medium text-gray-700 mb-2">Daily Hours Breakdown</h6>
                                                <div className="overflow-x-auto">
                                                  <table className="w-full text-xs">
                                                    <thead className="bg-gray-50">
                                                      <tr>
                                                        <th className="px-3 py-1 text-left">Date</th>
                                                        <th className="px-3 py-1 text-left">Day</th>
                                                        <th className="px-3 py-1 text-left">Hours</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {dateList.map((date, idx) => (
                                                        <tr key={idx} className="border-b border-gray-200 last:border-0">
                                                          <td className="px-3 py-2">{date.toLocaleDateString()}</td>
                                                          <td className="px-3 py-2">{date.toLocaleDateString(undefined, { weekday: 'short' })}</td>
                                                          <td className="px-3 py-2">
                                                            <input
                                                              type="text"
                                                              inputMode="decimal"
                                                              pattern="[0-9.]*"
                                                              className="w-16 rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2"
                                                              value={trainer.dailyHours?.[idx] || ''}
                                                              onChange={e => handleDayHourChange(rowIndex, batchIndex, trainerIdx, idx, e.target.value.replace(/[^0-9.]/g, ''))}
                                                            />
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            )}

                                            <div className="flex justify-end">
                                              <button
                                                onClick={() => removeTrainer(rowIndex, batchIndex, trainerIdx)}
                                                className="text-xs flex items-center text-rose-600 hover:text-rose-800 font-medium"
                                                type="button"
                                              >
                                                <FiTrash2 className="mr-1" size={12} /> Remove Trainer
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-6 bg-gray-50 rounded-lg">
                                  <FiUser className="mx-auto text-gray-400" size={20} />
                                  <p className="text-sm text-gray-500 mt-2">No trainers assigned</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-300">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-medium text-gray-900">No batches configured</h3>
              <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                Select a domain and add batches to begin assigning students and trainers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchDetailsTable;