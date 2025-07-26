import React, { useState, useEffect } from 'react';
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
    
    const totalAssigned = table2Data
      .filter(row => row.batchCode === batchCode)
      .reduce((sum, row) => sum + (parseFloat(row.totalHours) || 0), 0);
      
    return (batchRow.hrs || 0) - totalAssigned;
  };

  const calculateDurationHours = (start, end, duration) => {
    if (!start || !end || !duration) return 0;
    const dayCount = differenceInBusinessDays(new Date(end), new Date(start)) + 1;
    return dayCount * HOURS_PER_SESSION[duration];
  };

  const handleChange = (index, field, value) => {
    const updated = [...table2Data];
    updated[index][field] = value;

    const { startDate, endDate, dayDuration, trainerId, travelFoodStay } = updated[index];
    const selectedTrainer = trainers.find(t => t.trainerId === trainerId);

    const totalHours = calculateDurationHours(startDate, endDate, dayDuration);
    updated[index].totalHours = totalHours;

    if (selectedTrainer) {
      const costPerHour = selectedTrainer.charges || 0;
      const travel = parseFloat(updated[index].travel) || 0;
      const foodStay = parseFloat(travelFoodStay) || 0;
      updated[index].cost = costPerHour * totalHours;
      updated[index].totalAmount = updated[index].cost + foodStay + travel;
    }

    // Update remaining hours for all rows with this batch code
    updated.forEach(row => {
      if (row.batchCode === updated[index].batchCode) {
        row.remainingHrs = calculateRemainingHours(row.batchCode);
      }
    });

    setTable2Data(updated);
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
  };

  if (loading) return <div>Loading trainers...</div>;

  return (
    <div className="mb-6 p-4 border rounded">
      <div className="flex justify-between mb-3">
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
              <th className="border px-2 py-1">Batch Code</th>
              <th className="border px-2 py-1">Start Date</th>
              <th className="border px-2 py-1">End Date</th>
              <th className="border px-2 py-1">Trainer</th>
              <th className="border px-2 py-1">Day Duration</th>
              <th className="border px-2 py-1">Cost</th>
              <th className="border px-2 py-1">Travel</th>
              <th className="border px-2 py-1">Food/Stay</th>
              <th className="border px-2 py-1">Total Amount</th>
              <th className="border px-2 py-1">Total Hours</th>
              <th className="border px-2 py-1">Remaining Hrs</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {table2Data.map((row, index) => (
              <tr key={index}>
                <td className="border px-2 py-1">
                  <select 
                    value={row.batchCode} 
                    onChange={e => handleChange(index, 'batchCode', e.target.value)} 
                    className="w-full px-1"
                  >
                    <option value="">Select</option>
                    {getAllBatchCodes().map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </td>
                <td className="border px-2 py-1">
                  <DatePicker 
                    selected={row.startDate} 
                    onChange={date => handleChange(index, 'startDate', date)} 
                    className="w-full px-1" 
                  />
                </td>
                <td className="border px-2 py-1">
                  <DatePicker 
                    selected={row.endDate} 
                    onChange={date => handleChange(index, 'endDate', date)} 
                    className="w-full px-1" 
                    minDate={row.startDate} 
                  />
                </td>
                <td className="border px-2 py-1">
                  <select 
                    value={row.trainerId} 
                    onChange={e => {
                      handleChange(index, 'trainerId', e.target.value);
                      const t = trainers.find(t => t.trainerId === e.target.value);
                      handleChange(index, 'trainerName', t?.name || '');
                    }} 
                    className="w-full px-1"
                  >
                    <option value="">Select</option>
                    {trainers.map(tr => (
                      <option key={tr.trainerId} value={tr.trainerId}>
                        {tr.name} ({tr.trainerId})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border px-2 py-1">
                  <select 
                    value={row.dayDuration} 
                    onChange={e => handleChange(index, 'dayDuration', e.target.value)} 
                    className="w-full px-1"
                  >
                    <option value="">Select</option>
                    {DAY_DURATION_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td className="border px-2 py-1">
                  <input type="number" className="w-full px-1 bg-gray-100" value={row.cost} readOnly />
                </td>
                <td className="border px-2 py-1">
                  <input 
                    type="number" 
                    value={row.travel} 
                    onChange={e => handleChange(index, 'travel', e.target.value)} 
                    className="w-full px-1" 
                  />
                </td>
                <td className="border px-2 py-1">
                  <input 
                    type="number" 
                    value={row.travelFoodStay} 
                    onChange={e => handleChange(index, 'travelFoodStay', e.target.value)} 
                    className="w-full px-1" 
                  />
                </td>
                <td className="border px-2 py-1">
                  <input type="number" className="w-full px-1 bg-gray-100" value={row.totalAmount} readOnly />
                </td>
                <td className="border px-2 py-1">
                  <input type="number" className="w-full px-1 bg-gray-100" value={row.totalHours} readOnly />
                </td>
                <td className="border px-2 py-1">
                  <input 
                    type="number" 
                    className={`w-full px-1 bg-gray-100 ${row.remainingHrs < 0 ? 'text-red-500' : ''}`} 
                    value={row.remainingHrs} 
                    readOnly 
                  />
                </td>
                <td className="border px-2 py-1 text-center">
                  {table2Data.length > 1 && (
                    <button 
                      onClick={() => removeRow(index)} 
                      className="text-red-500 hover:underline"
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
  );
};

export default TrainingScheduleTable;