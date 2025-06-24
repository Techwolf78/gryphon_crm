import React from "react";

function TrainingCard({ data, onClick }) {
  return (
    <div 
      onClick={onClick} 
      className="p-4 bg-white shadow-md rounded-lg cursor-pointer hover:shadow-lg transition"
    >
      <div className="text-blue-600 font-semibold">{data.projectCode}</div>
      <div className="text-gray-800">{data.collegeName}</div>
      <div className="text-sm text-gray-500">{data.course} - {data.year}</div>
      <div className="mt-2 text-green-700 font-bold">₹ {data.totalCost?.toLocaleString()}</div>
    </div>
  );
}

export default TrainingCard;
