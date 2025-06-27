import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";
import FilePreviewModal from "./FilePreviewModal";

function TrainingDetailModal({ training, onClose }) {
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showMouModal, setShowMouModal] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-54">
      <div className="bg-white p-6 rounded-lg w-full max-w-5xl relative overflow-y-auto max-h-[90vh]">

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-3 right-3 text-red-500">
          <FaTimes size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4 text-blue-800">Training Details</h2>

        {/* Training Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
          <div><strong>Project Code:</strong> {training.projectCode}</div>
          <div><strong>College:</strong> {training.collegeName}</div>
          <div><strong>Course:</strong> {training.course}</div>
          <div><strong>Year:</strong> {training.year}</div>
          <div><strong>Delivery Type:</strong> {training.deliveryType}</div>
          <div><strong>Total Students:</strong> {training.studentCount}</div>
          <div><strong>Per Student Cost:</strong> ₹{training.perStudentCost}</div>
          <div><strong>Total Cost:</strong> ₹{training.totalCost}</div>
          <div><strong>Total Hours:</strong> {training.totalHours}</div>
          <div><strong>GST:</strong> {training.gstNumber}</div>
          <div><strong>POC Email:</strong> {training.trainingEmail}</div>
          <div><strong>Created At:</strong> {training.createdAt?.toDate().toLocaleString()}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setShowStudentModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            disabled={!training.studentFileUrl}
          >
            View Student Data
          </button>

          <button
            onClick={() => setShowMouModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            disabled={!training.mouFileUrl}
          >
            View MOU File
          </button>
        </div>

        {/* Student Data Modal */}
        {showStudentModal && (
          <FilePreviewModal
            fileUrl={training.studentFileUrl}
            type="student"
            onClose={() => setShowStudentModal(false)}
          />
        )}

        {/* MOU File Modal */}
        {showMouModal && (
          <FilePreviewModal
            fileUrl={training.mouFileUrl}
            type="mou"
            onClose={() => setShowMouModal(false)}
          />
        )}
      </div>
    </div>
  );
}

export default TrainingDetailModal;
