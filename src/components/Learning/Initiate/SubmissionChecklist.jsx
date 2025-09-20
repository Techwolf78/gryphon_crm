import React, { useState } from 'react';
import { FiCheck, FiX, FiChevronDown, FiChevronUp, FiInfo } from 'react-icons/fi';

const SubmissionChecklist = ({
  selectedPhases,
  selectedDomains,
  trainingStartDate,
  trainingEndDate,
  collegeStartTime,
  collegeEndTime,
  lunchStartTime,
  lunchEndTime,
  totalAssignedHours,
  table1DataByDomain,
  batchMismatch,
  hasValidationErrors,
  onChecklistComplete
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const checklistItems = [
    {
      id: 'phases',
      label: 'Training Phases',
      description: 'Select at least one phase',
      isComplete: selectedPhases && selectedPhases.length > 0
    },
    {
      id: 'domains',
      label: 'Training Domains',
      description: 'Select at least one domain',
      isComplete: selectedDomains && selectedDomains.length > 0
    },
    {
      id: 'dates',
      label: 'Training Dates',
      description: 'Set start and end dates',
      isComplete: trainingStartDate && trainingEndDate && trainingStartDate.trim() !== '' && trainingEndDate.trim() !== ''
    },
    {
      id: 'schedule',
      label: 'Daily Schedule',
      description: 'Configure college timings',
      isComplete: collegeStartTime && collegeEndTime && lunchStartTime && lunchEndTime &&
                  collegeStartTime.trim() !== '' && collegeEndTime.trim() !== '' &&
                  lunchStartTime.trim() !== '' && lunchEndTime.trim() !== ''
    },
    {
      id: 'assignedHours',
      label: 'Domain Hours',
      description: 'Assign hours to domains',
      isComplete: totalAssignedHours && totalAssignedHours > 0
    },
    {
      id: 'batchCreation',
      label: 'Batch Setup',
      description: 'Create batches for domains',
      isComplete: selectedDomains && selectedDomains.length > 0 && selectedDomains.every(domain => {
        const tableData = table1DataByDomain?.[domain];
        return tableData && tableData.length > 0 && tableData.some(row => row.batches && row.batches.length > 0);
      })
    },
    {
      id: 'trainerAssignment',
      label: 'Trainer Assignment',
      description: 'Assign trainers to batches',
      isComplete: selectedDomains && selectedDomains.length > 0 && selectedDomains.every(domain => {
        const tableData = table1DataByDomain?.[domain];
        return tableData && tableData.length > 0 && tableData.every(row =>
          row.batches && row.batches.length > 0 && row.batches.every(batch =>
            batch.trainers && batch.trainers.length > 0
          )
        );
      })
    },
    {
      id: 'validationErrors',
      label: 'Validation Check',
      description: 'No conflicts or errors',
      isComplete: !hasValidationErrors && !batchMismatch
    }
  ];

  const completedCount = checklistItems.filter(item => item.isComplete).length;
  const totalCount = checklistItems.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);
  const isAllComplete = completedCount === totalCount;

  // Notify parent component about completion status
  React.useEffect(() => {
    if (onChecklistComplete) {
      onChecklistComplete(isAllComplete);
    }
  }, [isAllComplete, onChecklistComplete]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Ultra-Compact Header - Always Visible */}
      <div
        className="p-2 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
              isAllComplete ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {isAllComplete ? (
                <FiCheck className="w-3 h-3 text-green-600" />
              ) : (
                <FiInfo className="w-3 h-3 text-blue-600" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-900 leading-tight">
                Setup Progress
              </div>
              <div className="text-[10px] text-gray-500 leading-tight">
                {completedCount}/{totalCount} done
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Compact Progress Bar */}
            <div className="flex items-center space-x-1">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isAllComplete ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium ${
                isAllComplete ? 'text-green-600' : 'text-gray-600'
              }`}>
                {completionPercentage}%
              </span>
            </div>

            {/* Expand/Collapse Icon */}
            {isExpanded ? (
              <FiChevronUp className="w-3 h-3 text-gray-400" />
            ) : (
              <FiChevronDown className="w-3 h-3 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Ultra-Compact Expandable Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-1.5 bg-gray-50">
          <div className="grid grid-cols-4 gap-1">
            {checklistItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center space-x-1.5 p-1.5 rounded border transition-all duration-200 ${
                  item.isComplete
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className={`flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                  item.isComplete
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}>
                  {item.isComplete ? (
                    <FiCheck className="w-2 h-2 text-white" />
                  ) : (
                    <div className="w-1 h-1 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[10px] font-medium leading-tight ${
                    item.isComplete ? 'text-green-800' : 'text-gray-700'
                  }`}>
                    {item.label}
                  </div>
                  <div className={`text-[9px] leading-tight ${
                    item.isComplete ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {item.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Ultra-Compact Status Message */}
          <div className="mt-1.5 p-1.5 rounded bg-white border">
            {isAllComplete ? (
              <div className="flex items-center space-x-1">
                <FiCheck className="w-3 h-3 text-green-600 flex-shrink-0" />
                <span className="text-[11px] font-medium text-green-800 leading-tight">
                  Ready to submit!
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <FiInfo className="w-3 h-3 text-blue-600 flex-shrink-0" />
                <span className="text-[11px] text-gray-700 leading-tight">
                  {totalCount - completedCount} more to complete
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionChecklist;