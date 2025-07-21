import React, { useState, useEffect, useRef } from "react";
import { FaEllipsisV, FaUsers, FaFileContract, FaRupeeSign, FaClock, FaUniversity, FaPlay } from "react-icons/fa";
import { IoDocumentTextOutline } from "react-icons/io5";
import { MdOutlineAttachMoney } from "react-icons/md";
import InitiationModal from "./InitiationModal";


function TrainingTable({ trainingData, onRowClick, onViewStudentData, onViewMouFile, onManageStudents }) {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showInitiationModal, setShowInitiationModal] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const menuRefs = useRef({});

  const toggleMenu = (id, e) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const handleInitiateClick = (training) => {
    setSelectedTraining(training);
    setShowInitiationModal(true);
    setMenuOpenId(null);
  };

  const handleConfirmInitiation = (training) => {
    // Here you would typically make an API call to initiate the training
    console.log("Initiating training:", training);
    // Close the modal
    setShowInitiationModal(false);
    // You might want to add a toast notification here
  };
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpenId !== null) {
        const menuElement = menuRefs.current[menuOpenId];
        if (menuElement && !menuElement.contains(event.target)) {
          // Check if the click was on the three dots button of the same row
          const dotsButton = document.querySelector(`button[data-id="${menuOpenId}"]`);
          if (!dotsButton || !dotsButton.contains(event.target)) {
            setMenuOpenId(null);
          }
        }
      }
    };

    if (menuOpenId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [menuOpenId]);

  const formatCurrency = (amount) => {
    return amount ? `₹${amount.toLocaleString('en-IN')}` : '-';
  };

  // Assign ref to each menu
  const setMenuRef = (id, element) => {
    menuRefs.current[id] = element;
  };

  return (
    <div className="bg-white rounded-xl min-h-screen shadow-lg overflow-hidden border border-gray-100">
      {/* Header Row - Desktop */}
      {!isMobile && (
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 text-gray-700 font-semibold text-sm uppercase tracking-wider">
          <div className="col-span-3 flex items-center">
            <IoDocumentTextOutline className="mr-2 text-blue-500" />
            Project Code
          </div>
          <div className="col-span-3 flex items-center">
            <FaUniversity className="mr-2 text-blue-500" />
            College
          </div>
          <div className="col-span-2 flex items-center">
            <FaUsers className="mr-2 text-blue-500" />
            Students
          </div>
          <div className="col-span-2 flex items-center">
            <MdOutlineAttachMoney className="mr-2 text-blue-500" />
            Per Student
          </div>
          <div className="col-span-2 flex items-center justify-between">
            <div className="flex items-center">
              <FaClock className="mr-2 text-blue-500" />
              Hours
            </div>
            <span className="opacity-0">
              <FaEllipsisV />
            </span>
          </div>
        </div>
      )}

      {/* Data Rows */}
      <div className="divide-y divide-gray-100">
        {trainingData.map((item) => (
          <div
            key={item.id}
            className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-4 md:px-6 py-4 text-sm group relative cursor-pointer transition hover:bg-blue-50/50 ${menuOpenId === item.id ? 'bg-blue-50' : 'bg-white'
              }`}
            onClick={() => onRowClick(item)}
          >
            {/* Project Code */}
            <div className="col-span-3 flex items-center">
              {isMobile && (
                <IoDocumentTextOutline className="mr-2 text-blue-500 flex-shrink-0" />
              )}
              <div>
                {isMobile && <div className="text-xs text-gray-500 mb-1">Project Code</div>}
                <div className="font-medium text-blue-600">{item.projectCode}</div>
              </div>
            </div>

            {/* College Name */}
            <div className="col-span-3 flex items-center">
              {isMobile && (
                <FaUniversity className="mr-2 text-blue-500 flex-shrink-0" />
              )}
              <div>
                {isMobile && <div className="text-xs text-gray-500 mb-1">College</div>}
                <div className="font-medium text-gray-800 truncate">{item.collegeName}</div>
                {isMobile && item.city && (
                  <div className="text-xs text-gray-500 mt-1">{item.city}</div>
                )}
              </div>
            </div>

            {/* Students */}
            <div className="col-span-2 flex items-center">
              {isMobile && (
                <FaUsers className="mr-2 text-blue-500 flex-shrink-0" />
              )}
              <div>
                {isMobile && <div className="text-xs text-gray-500 mb-1">Students</div>}
                <div className="font-medium">
                  <span className="text-gray-800">{item.studentCount}</span>
                  {!isMobile && (
                    <span className="text-xs text-gray-500 ml-1">students</span>
                  )}
                </div>
              </div>
            </div>

            {/* Per Student Cost */}
            <div className="col-span-2 flex items-center">
              {isMobile && (
                <MdOutlineAttachMoney className="mr-2 text-blue-500 flex-shrink-0" />
              )}
              <div>
                {isMobile && <div className="text-xs text-gray-500 mb-1">Per Student </div>}
                <div className="font-medium text-gray-800">
                  {formatCurrency(item.perStudentCost)}
                </div>
              </div>
            </div>

            {/* Total Hours & Actions */}
            <div className="col-span-2 flex items-center justify-between">
              <div className="flex items-center">
                {isMobile && (
                  <FaClock className="mr-2 text-blue-500 flex-shrink-0" />
                )}
                <div>
                  {isMobile && <div className="text-xs text-gray-500 mb-1">Hours</div>}
                  <div className="font-medium text-gray-800">
                    {item.totalHours !== undefined ? item.totalHours : "-"}
                  </div>
                </div>
              </div>

              {/* Three dots button */}
              <div className="relative">
                <button
                  data-id={item.id}
                  onClick={(e) => toggleMenu(item.id, e)}
                  className={`text-gray-500 hover:text-blue-600 p-2 rounded-full transition ${menuOpenId === item.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                    }`}
                >
                  <FaEllipsisV size={16} />
                </button>

                {/* Dropdown Menu */}
                {menuOpenId === item.id && (
                  <div
                    ref={(el) => setMenuRef(item.id, el)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl text-sm w-48 border border-gray-200 z-20 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        onViewStudentData(item);
                        setMenuOpenId(null);
                      }}
                      disabled={!item.studentFileUrl}
                      className={`w-full px-4 py-3 text-left flex items-center transition ${item.studentFileUrl ? 'hover:bg-blue-50 text-gray-700' : 'text-gray-400'
                        }`}
                    >
                      <FaUsers className="mr-2 text-blue-500" />
                      View Students
                    </button>
                    <button
                      onClick={() => {
                        onViewMouFile(item);
                        setMenuOpenId(null);
                      }}
                      disabled={!item.mouFileUrl}
                      className={`w-full px-4 py-3 text-left flex items-center transition ${item.mouFileUrl ? 'hover:bg-blue-50 text-gray-700' : 'text-gray-400'
                        }`}
                    >
                      <FaFileContract className="mr-2 text-blue-500" />
                      View MOU
                    </button>
                    <button
                      onClick={() => handleInitiateClick(item)}
                      className="w-full px-4 py-3 text-left flex items-center hover:bg-blue-50 text-gray-700 transition"
                    >
                      <FaPlay className="mr-2 text-blue-500" />
                      Initiation
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {trainingData.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No training programs found</div>
          <p className="text-sm">Create a new training program to get started</p>
        </div>
      )}
      {/* Initiation Modal */}
      {showInitiationModal && selectedTraining && (
        <InitiationModal
          training={selectedTraining}
          onClose={() => setShowInitiationModal(false)}
          onConfirm={handleConfirmInitiation}
        />
      )}
    </div>
  );
}

export default TrainingTable;