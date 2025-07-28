import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { differenceInBusinessDays } from 'date-fns';

const DAY_DURATION_OPTIONS = ['AM', 'PM', 'AM & PM'];

const HOURS_PER_SESSION = {
  'AM': 3,
  'PM': 3,
  'AM & PM': 6
};

const TrainingScheduleTable = ({ table2Data, setTable2Data, table1Data }) => {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'trainers'));
        const trainerList = [];
        querySnapshot.forEach((doc) => {
          trainerList.push({ id: doc.id, ...doc.data() });
        });
        setTrainers(trainerList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching trainers:', error);
        setLoading(false);
      }
    };
    fetchTrainers();
  }, []);

  const getAllBatchCodes = () => {
    return table1Data.flatMap(row => row.batches?.map(batch => batch.batchCode) || []);
  };

  const calculateRemainingHours = (batchCode) => {
    const batchRow = table1Data.find(row => 
      row.batches?.some(batch => batch.batchCode === batchCode)
    );

    if (!batchRow) return 0;

    const assigned = batchRow.assignedHours || 0;

    const totalAssigned = table2Data
      .filter(row => row.batchCode === batchCode)
      .reduce((sum, row) => sum + (parseFloat(row.totalHours) || 0), 0);

    return assigned - totalAssigned;
  };

  const calculateDurationHours = (start, end, duration) => {
    if (!start || !end || !duration) return 0;
    const dayCount = differenceInBusinessDays(new Date(end), new Date(start)) + 1;
    return dayCount * HOURS_PER_SESSION[duration];
  };

  const handleChange = (index, field, value) => {
    if (isUpdatingRef.current) return; // Prevent recursive updates
    
    isUpdatingRef.current = true;
    
    try {
      const updated = [...table2Data];
      updated[index][field] = value;

      const row = updated[index];
      const { startDate, endDate, dayDuration, batchCode } = row;
      
      // Get the current trainerId (either the new value or existing one)
      const currentTrainerId = field === 'trainerId' ? value : row.trainerId;

      // 1. Set trainerName if trainerId is selected
      if (field === 'trainerId') {
        const trainer = trainers.find(t => t.trainerId === value);
        updated[index].trainerName = trainer?.name || '';
      }

      // 2. Set cost when dayDuration and trainer are selected
      if ((field === 'dayDuration' || field === 'trainerId') && currentTrainerId && dayDuration) {
        const trainer = trainers.find(t => t.trainerId === currentTrainerId);
        if (trainer?.charges) {
          const cost = trainer.charges * (dayDuration === 'AM & PM' ? 1 : 0.5);
          updated[index].cost = cost;
        }
      }

      // 3. Set totalHours and remainingHrs
      if (startDate && endDate && dayDuration && batchCode) {
        const hours = calculateDurationHours(startDate, endDate, dayDuration);
        updated[index].totalHours = hours;

        const sameBatchRows = updated.filter((r, i) => r.batchCode === batchCode && i !== index);
        const totalSoFar = sameBatchRows.reduce((sum, r) => sum + (parseFloat(r.totalHours) || 0), 0);
        
        const batchRow = table1Data.find(row =>
          row.batches?.some(batch => batch.batchCode === batchCode)
        );
        const assigned = batchRow?.assignedHours || 0;

        const finalRemaining = assigned - totalSoFar - hours;
        updated[index].remainingHrs = Math.max(finalRemaining, 0);
      }

      // 4. Recalculate totalAmount
      const cost = parseFloat(updated[index].cost) || 0;
      const travel = parseFloat(updated[index].travel) || 0;
      const food = parseFloat(updated[index].travelFoodStay) || 0;
      updated[index].totalAmount = cost + travel + food;

      setTable2Data(updated);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const addBatch = () => {
    setTable2Data([...table2Data, {
      batchCode: '',
      startDate: null,
      endDate: null,
      trainerName: '',
      trainerId: '',
      dayDuration: '',
      cost: '',
      travel: '',
      travelFoodStay: '',
      totalAmount: '',
      totalHours: '',
      remainingHrs: ''
    }]);
  };

  const removeRow = (index) => {
    if (table2Data.length <= 1) return;
    const updated = [...table2Data];
    updated.splice(index, 1);
    setTable2Data(updated);
    if (expandedRow === index) setExpandedRow(null);
  };

  const getRowStatus = (row) => {
    const requiredFields = ['batchCode', 'startDate', 'endDate', 'trainerId', 'dayDuration'];
    const filledFields = requiredFields.filter(field => row[field]);
    
    if (filledFields.length === requiredFields.length) return 'complete';
    if (filledFields.length > 0) return 'partial';
    return 'empty';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading trainers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Training Schedule</h2>
          <p className="text-gray-500 mt-1">Manage and assign training sessions to your teams</p>
        </div>
        <button
          onClick={addBatch}
          className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Schedule
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-800">Scheduled Sessions</h3>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {table2Data.length} {table2Data.length === 1 ? 'session' : 'sessions'}
              </span>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trainer
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table2Data.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <h4 className="mt-4 text-sm font-medium text-gray-700">No sessions scheduled</h4>
                      <p className="mt-1 text-sm text-gray-500">Add your first training session to get started</p>
                    </div>
                  </td>
                </tr>
              )}

              {table2Data.map((row, index) => {
                const status = getRowStatus(row);
                const isExpanded = expandedRow === index;

                return (
                  <React.Fragment key={index}>
                    <tr 
                      className={`hover:bg-gray-50 transition-colors ${
                        status === 'complete' ? 'bg-green-50' : 
                        status === 'partial' ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select 
                          value={row.batchCode} 
                          onChange={e => handleChange(index, 'batchCode', e.target.value)} 
                          className="block w-full min-w-[120px] px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="">Select Batch</option>
                          {getAllBatchCodes().map(code => (
                            <option key={code} value={code}>{code}</option>
                          ))}
                        </select>
                        {row.batchCode && (
                          <div className="text-xs text-gray-500 mt-1">
                            Remaining: {calculateRemainingHours(row.batchCode)} hrs
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <DatePicker 
                            selected={row.startDate} 
                            onChange={date => {
                              try {
                                handleChange(index, 'startDate', date);
                              } catch (error) {
                                console.error('Date change error:', error);
                              }
                            }} 
                            className="block w-28 px-2 py-1.5 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholderText="Start"
                            dateFormat="dd/MM/yy"
                          />
                          <span className="text-gray-400">-</span>
                          <DatePicker 
                            selected={row.endDate} 
                            onChange={date => {
                              try {
                                handleChange(index, 'endDate', date);
                              } catch (error) {
                                console.error('Date change error:', error);
                              }
                            }} 
                            className="block w-28 px-2 py-1.5 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            minDate={row.startDate}
                            placeholderText="End"
                            dateFormat="dd/MM/yy"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select 
                          value={row.trainerId} 
                          onChange={e => handleChange(index, 'trainerId', e.target.value)} 
                          className="block w-full min-w-[180px] px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="">Select Trainer</option>
                          {trainers.map(tr => (
                            <option key={tr.trainerId} value={tr.trainerId}>
                              {tr.name} ({tr.trainerId})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <select 
                            value={row.dayDuration} 
                            onChange={e => handleChange(index, 'dayDuration', e.target.value)} 
                            className="block w-24 px-2 py-1.5 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="">Duration</option>
                            {DAY_DURATION_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            row.remainingHrs < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {row.totalHours || 0}h
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{parseFloat(row.totalAmount || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : index)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            aria-label={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                            </svg>
                          </button>
                          {table2Data.length > 1 && (
                            <button 
                              onClick={() => removeRow(index)} 
                              className="p-1.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                              aria-label="Remove session"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan="6" className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Details</h4>
                              <div>
                                <p className="text-sm text-gray-500">Batch Code</p>
                                <p className="text-sm font-medium text-gray-900">{row.batchCode || 'Not selected'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Remaining Hours</p>
                                <p className={`text-sm font-medium ${
                                  row.remainingHrs < 0 ? 'text-red-600' : 'text-gray-900'
                                }`}>
                                  {row.remainingHrs || 0} hours
                                </p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Training Details</h4>
                              <div>
                                <p className="text-sm text-gray-500">Duration</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {row.dayDuration || 'Not selected'} ({HOURS_PER_SESSION[row.dayDuration] || 0}h/day)
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Total Hours</p>
                                <p className="text-sm font-medium text-gray-900">{row.totalHours || 0} hours</p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Breakdown</h4>
                              <div className="flex justify-between">
                                <p className="text-sm text-gray-500">Training Cost</p>
                                <p className="text-sm font-medium text-gray-900">₹{parseFloat(row.cost || 0).toLocaleString()}</p>
                              </div>
                              <div className="flex justify-between">
                                <p className="text-sm text-gray-500">Travel</p>
                                <input 
                                  type="number" 
                                  value={row.travel} 
                                  onChange={e => handleChange(index, 'travel', e.target.value)} 
                                  className="w-24 px-2 py-1 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="flex justify-between">
                                <p className="text-sm text-gray-500">Food/Stay</p>
                                <input 
                                  type="number" 
                                  value={row.travelFoodStay} 
                                  onChange={e => handleChange(index, 'travelFoodStay', e.target.value)} 
                                  className="w-24 px-2 py-1 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="flex justify-between pt-2 border-t border-gray-200">
                                <p className="text-sm font-medium text-gray-700">Total Amount</p>
                                <p className="text-sm font-medium text-blue-600">₹{parseFloat(row.totalAmount || 0).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 p-3 rounded-lg bg-blue-50 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Hours</p>
              <p className="text-xl font-semibold text-gray-800">
                {table2Data.reduce((sum, row) => sum + (parseFloat(row.totalHours) || 0), 0)} hrs
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 p-3 rounded-lg bg-green-50 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Cost</p>
              <p className="text-xl font-semibold text-gray-800">
                ₹{table2Data.reduce((sum, row) => sum + (parseFloat(row.totalAmount) || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 p-3 rounded-lg bg-purple-50 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Trainers Assigned</p>
              <p className="text-xl font-semibold text-gray-800">
                {new Set(table2Data.filter(row => row.trainerId).map(row => row.trainerId)).size}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingScheduleTable;