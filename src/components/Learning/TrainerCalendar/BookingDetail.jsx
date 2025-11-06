import React from 'react';
import { FiX } from 'react-icons/fi';

function BookingDetail({ booking, onClose }) {
  if (!booking) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Booking details"
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40"
    >
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Booking Details</h3>
            <p className="text-sm text-gray-500 mt-1">{formatDate(booking.dateISO)}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close booking details"
            className="text-gray-500 p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <FiX />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Training Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Batch Code:</span>
                  <span className="font-medium text-gray-900">{booking.batchCode || booking.domain || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium text-gray-900">{booking.dayDuration || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">College:</span>
                  <span className="font-medium text-gray-900">{booking.collegeName || '—'}</span>
                </div>
                {booking.sourceTrainingId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Project Code:</span>
                    <span className="font-medium text-gray-900">{booking.sourceTrainingId}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Trainer Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Trainer:</span>
                  <span className="font-medium text-gray-900">{booking.trainerName || booking.trainerId || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trainer ID:</span>
                  <span className="font-medium text-gray-900">{booking.trainerId || '—'}</span>
                </div>
              </div>
            </div>

            {booking._conflict && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-red-800">Conflict Detected</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  This booking conflicts with another booking for the same trainer and time slot.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingDetail;
