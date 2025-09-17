import React from "react";

const ActionModal = ({
  bill,
  isOpen,
  onClose,
  onUpdateStatus
}) => {
  if (!isOpen || !bill) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Review Bill - {bill.trainerName}
          </h3>

          <div className="mb-4 text-sm text-gray-600">
            <p>
              <span className="font-medium">Course:</span> {bill.course} ({bill.batch})
            </p>
            <p className="mt-1">
              <span className="font-medium">College:</span> {bill.collegeName}
            </p>
            <p className="mt-1">
              <span className="font-medium">Amount:</span> ₹{bill.amount?.toLocaleString() || '0'}
            </p>
            <p className="mt-1">
              <span className="font-medium">Hours:</span> {bill.hours} @ ₹{bill.rate}/hour
            </p>
            <p className="mt-1">
              <span className="font-medium">Submitted:</span> {new Date(bill.submittedDate).toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
            <button
              onClick={() => onUpdateStatus('rejected')}
              className="flex-1 px-4 py-2.5 bg-rose-50 text-rose-700 rounded-lg font-medium hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors"
            >
              Reject
            </button>

            <button
              onClick={() => onUpdateStatus('approved')}
              className="flex-1 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg font-medium hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            >
              Approve
            </button>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 rounded-lg font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;
