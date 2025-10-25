import React from "react";
import { FiTrash2 } from "react-icons/fi";

function DeleteConfirmationModal({ assignment, onConfirm, onCancel }) {
  if (!assignment) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Delete trainer assignment confirmation"
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <FiTrash2 className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Trainer Assignment
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete the trainer assignment for{' '}
              <span className="font-medium text-gray-900">
                {assignment.trainerName || assignment.trainerId}
              </span>{' '}
              on{' '}
              <span className="font-medium text-gray-900">
                {assignment.dateISO}
              </span>
              ?
            </p>
            <p className="text-xs text-gray-500 mb-6">
              This action cannot be undone. The trainer assignment will be permanently removed.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Delete Assignment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmationModal;
