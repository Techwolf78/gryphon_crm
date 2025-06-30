import React from "react";
import { FaTimes } from "react-icons/fa";
 
function TrainingDetailModal({ training, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-5xl relative overflow-y-auto max-h-[90vh] shadow-xl">
       
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-red-600"
        >
          <FaTimes size={20} />
        </button>
 
        {/* Heading */}
        <h2 className="text-2xl font-bold mb-6 text-blue-800">
          Training Details
        </h2>
 
        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
          <div><strong>Project Code:</strong> {training.projectCode}</div>
          <div><strong>College:</strong> {training.collegeName}</div>
          <div><strong>Course:</strong> {training.course}</div>
          <div><strong>Year:</strong> {training.year}</div>
          <div><strong>Delivery Type:</strong> {training.deliveryType}</div>
          <div><strong>Total Students:</strong> {training.studentCount}</div>
          <div><strong>Per Student Cost:</strong> ₹{training.perStudentCost?.toLocaleString()}</div>
          <div><strong>Total Cost:</strong> ₹{training.totalCost?.toLocaleString()}</div>
          <div><strong>Total Hours:</strong> {training.totalHours}</div>
          <div><strong>GST:</strong> {training.gstNumber}</div>
          <div><strong>POC Email:</strong> {training.trainingEmail}</div>
          <div>
            <strong>Created At:</strong>{" "}
            {training.createdAt?.toDate().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
 
export default TrainingDetailModal;
 
 