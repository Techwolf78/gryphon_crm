import React from "react";
import { FiChevronDown, FiChevronUp, FiTrash2, FiPlus, FiUser, FiClock } from "react-icons/fi";
import TrainerSection from "./TrainerSection";

const BatchRow = ({
  row,
  rowIndex,
  expanded,
  toggleBatchExpansion,
  setMergeModal,
  setTable1Data,
  table1Data,
  selectedDomain,
  commonFields,
  maxAssignableHours,
  onAssignedHoursChange,
  canMergeBatches,
  courses,
  trainers,
  getColorsForBatch,
}) => {
  const totalAssignedStudents = row.batches.reduce(
    (sum, b) => sum + Number(b.batchPerStdCount || 0),
    0
  );
  const totalAssignedHours =
    row.batches.length > 0 ? Number(row.batches[0].assignedHours || 0) : 0;

  // Add/Remove batch logic
  const generateBatchCode = (specialization, index) => `${specialization}${index}`;
  const addBatch = () => {
    const updatedData = [...table1Data];
    const batches = updatedData[rowIndex].batches;
    const newBatchIndex = batches.length;
    const firstBatchHours = batches[0]?.assignedHours || 0;
    batches.push({
      batchPerStdCount: "",
      batchCode: generateBatchCode(updatedData[rowIndex].batch, newBatchIndex + 1),
      assignedHours: firstBatchHours,
      trainers: [],
    });
    batches.forEach((batch) => {
      batch.assignedHours = firstBatchHours;
    });
    setTable1Data(updatedData);
  };
  const removeBatch = (batchIndex) => {
    if (row.batches.length <= 1) return;
    const updatedData = [...table1Data];
    updatedData[rowIndex].batches.splice(batchIndex, 1);
    updatedData[rowIndex].batches = updatedData[rowIndex].batches.map(
      (batch, idx) => ({
        ...batch,
        batchCode: generateBatchCode(updatedData[rowIndex].batch, idx + 1),
      })
    );
    setTable1Data(updatedData);
  };

  if (row.hrs === 0) {
    return (
      <div
        className="px-4 py-4 border-b border-gray-100 bg-yellow-50 rounded flex items-center space-x-3"
      >
        <div className="w-7 h-7 rounded-full bg-yellow-200 text-yellow-800 flex items-center justify-center text-xs font-bold">
          {rowIndex + 1}
        </div>
        <div>
          <div className="font-medium text-sm text-yellow-800">
            {row.batch}
          </div>
          <div className="text-xs text-yellow-700 mt-1">
            No hours configured for this specialization. Please set hours in the training domain setup.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="transition-all duration-200">
      {/* Batch Header */}
      <div
        className={`px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
          expanded ? "bg-gray-50" : ""
        }`}
        onClick={() => toggleBatchExpansion(rowIndex)}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center ${
              getColorsForBatch(row.batch, courses).accent
            } text-xs`}
          >
            {rowIndex + 1}
          </div>
          <div>
            <h4
              className={`font-medium text-xs ${
                getColorsForBatch(row.batch, courses).text
              }`}
            >
              {row.batch}
            </h4>
            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-0.5">
              <span className="flex items-center">
                <FiUser className="mr-1" /> {row.stdCount} students
              </span>
              <span className="flex items-center">
                <FiClock className="mr-1" /> {row.hrs} hours
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              getColorsForBatch(row.batch, courses).badge
            }`}
          >
            {totalAssignedStudents}/{row.stdCount} students
          </div>
          <div
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              getColorsForBatch(row.batch, courses).badge
            }`}
          >
            {totalAssignedHours}/{row.hrs} hours
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {expanded ? (
            <FiChevronUp className="text-gray-500" size={18} />
          ) : (
            <FiChevronDown className="text-gray-500" size={18} />
          )}
        </div>
      </div>
      {/* Expanded Batch Content */}
      {expanded && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 space-y-3">
          {row.batches.map((batch, batchIndex) => (
            <TrainerSection
              key={batchIndex}
              batch={batch}
              batchIndex={batchIndex}
              row={row}
              rowIndex={rowIndex}
              removeBatch={removeBatch}
              setTable1Data={setTable1Data}
              table1Data={table1Data}
              selectedDomain={selectedDomain}
              commonFields={commonFields}
              maxAssignableHours={maxAssignableHours}
              onAssignedHoursChange={onAssignedHoursChange}
              courses={courses}
              trainers={trainers}
              getColorsForBatch={getColorsForBatch}
            />
          ))}
          {/* --- Add Batch Button at the bottom --- */}
          <div className="flex justify-end mt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                addBatch();
              }}
              className={`flex items-center px-2 py-1 rounded border border-indigo-500 bg-indigo-50 text-indigo-700 text-xs font-medium shadow-sm hover:bg-indigo-100 hover:border-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                getColorsForBatch(row.batch, courses).text
              }`}
              title={`Add Batch to ${row.batch}`}
              aria-label={`Add Batch to ${row.batch}`}
              data-testid={`add-batch-bottom-${row.batch}`}
              type="button"
            >
              <FiPlus className="mr-1" size={12} /> Add Batch
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchRow;