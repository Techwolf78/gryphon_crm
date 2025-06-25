import React, { useState } from "react";
import { FaBars } from "react-icons/fa"; // Exact burger button icon

function TrainingTable({ trainingData, onRowClick }) {
  const [menuOpenId, setMenuOpenId] = useState(null);

  const toggleMenu = (id, e) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  return (
    <div className="bg-white p-2 rounded-xl shadow">

      {/* Header Row */}
      <div className="flex items-center px-4 py-3 font-bold bg-gray-100 text-sm rounded-t-xl">
        <div className="w-1/5">Project Code</div>
        <div className="w-1/5">College</div>
        <div className="w-1/5">Students</div>
        <div className="w-1/5">Per Student Cost</div>
        <div className="w-1/5 flex justify-between items-center">Total Hours <span className="invisible">Action</span></div>
      </div>

      {/* Data Rows */}
      {trainingData.map((item, index) => (
        <div
          key={item.id}
          className={`flex items-center px-4 py-3 text-sm group relative cursor-pointer transition ${
            index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
          } hover:bg-gray-100`}
          onClick={() => onRowClick(item)}
        >
          <div className="w-1/5 font-medium text-blue-800">{item.projectCode}</div>
          <div className="w-1/5">{item.collegeName}</div>
          <div className="w-1/5">{item.studentCount}</div>
          <div className="w-1/5">₹ {item.perStudentCost?.toLocaleString()}</div>
          <div className="w-1/5 flex justify-between items-center">
            {item.totalHours || "-"}

            {/* Burger Button */}
            <button
              onClick={(e) => toggleMenu(item.id, e)}
              className="text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-200 transition z-10"
            >
              <FaBars size={18} />
            </button>

            {/* Dropdown Menu */}
            {menuOpenId === item.id && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-4 top-12 bg-white rounded-md shadow-md text-sm z-20 w-32"
              >
                <button className="w-full px-4 py-2 hover:bg-gray-100 text-left">View Details</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default TrainingTable;
