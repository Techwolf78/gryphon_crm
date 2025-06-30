import React, { useState, useEffect } from "react";
import { FaEllipsisV } from "react-icons/fa";
 
function TrainingTable({ trainingData, onRowClick, onViewStudentData, onViewMouFile, onManageStudents }) {
  const [menuOpenId, setMenuOpenId] = useState(null);
 
  const toggleMenu = (id, e) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };
 
  useEffect(() => {
    if (menuOpenId !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [menuOpenId]);
 
  return (
    <div className="bg-white p-2 rounded-xl shadow overflow-x-auto">
      {/* Header Row */}
      <div className="min-w-[800px] flex items-center px-4 py-3 font-bold bg-gray-100 text-sm rounded-t-xl">
        <div className="w-1/5">Project Code</div>
        <div className="w-1/5">College</div>
        <div className="w-1/5">Students</div>
        <div className="w-1/5">Per Student Cost</div>
        <div className="w-1/5 flex justify-between items-center">
          Total Hours <span className="invisible">Action</span>
        </div>
      </div>
 
      {/* Data Rows */}
      {trainingData.map((item, index) => (
        <div
          key={item.id}
          className={`min-w-[800px] flex items-center px-4 py-3 text-sm group relative cursor-pointer transition ${
            index % 2 === 0 ? "bg-gray-50" : "bg-white"
          } hover:bg-gray-100`}
          onClick={() => onRowClick(item)}
        >
          <div className="w-1/5 font-medium text-blue-800">{item.projectCode}</div>
          <div className="w-1/5">{item.collegeName}</div>
          <div className="w-1/5">{item.studentCount}</div>
          <div className="w-1/5">₹ {item.perStudentCost?.toLocaleString()}</div>
 
          {/* Total Hours */}
          <div className="w-1/5 flex items-center relative justify-between">
            {item.totalHours !== undefined ? item.totalHours : "-"}
 
            {/* Three dots button */}
            <button
              onClick={(e) => toggleMenu(item.id, e)}
              className="text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-200 transition z-10 ml-2"
            >
              <FaEllipsisV size={18} />
            </button>
 
            {/* Dropdown Menu */}
            {menuOpenId === item.id && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 bg-white rounded-md shadow-md text-sm w-48 border z-20"
              >
                <button
                  onClick={() => {
                    onViewStudentData(item);
                    setMenuOpenId(null);
                  }}
                  disabled={!item.studentFileUrl}
                  className="w-full px-4 py-2 hover:bg-gray-100 text-left disabled:opacity-50"
                >
                  View Student Details
                </button>
                <button
                  onClick={() => {
                    onViewMouFile(item);
                    setMenuOpenId(null);
                  }}
                  disabled={!item.mouFileUrl}
                  className="w-full px-4 py-2 hover:bg-gray-100 text-left disabled:opacity-50"
                >
                  View MOU
                </button>
                <button
                  onClick={() => {
                    onManageStudents(item);
                    setMenuOpenId(null);
                  }}
                  className="w-full px-4 py-2 hover:bg-gray-100 text-left"
                >
                  Manage Students
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
 
export default TrainingTable;
 
 