import { useState } from 'react';

const PlacedStdCalendar = ({ placedStudents }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);

  const placedDates = placedStudents.reduce((acc, student) => {
    if (student.placedDate && student.placedDate.seconds) {
      const date = new Date(student.placedDate.seconds * 1000);
      const dateKey = date.toDateString();
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(student);
    }
    return acc;
  }, {});

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const handleDateClick = (date) => {
    if (date) {
      setSelectedDate(date);
      setShowDateModal(true);
    }
  };

  const closeDateModal = () => {
    setShowDateModal(false);
    setSelectedDate(null);
  };

  return (
    <div className="max-h-[95vh] flex flex-col m-2 w-[80vw]">
      {/* Calendar Header */}
      <div className="bg-linear-to-r from-blue-600 to-blue-500 text-white px-3 py-2 shrink-0 rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors duration-200 text-white hover:text-blue-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-xl font-bold text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors duration-200 text-white hover:text-blue-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-3 flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 gap-1 mb-3">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wide py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 auto-rows-fr mb-3">
          {/* Calendar days */}
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="min-h-6 sm:min-h-8 lg:min-h-10"></div>;
            }

            const dateKey = date.toDateString();
            const studentsOnDate = placedDates[dateKey] || [];
            const isToday = date.toDateString() === new Date().toDateString();
            const hasPlacements = studentsOnDate.length > 0;

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                className={`min-h-6 sm:min-h-8 lg:min-h-10 p-1 border rounded-md transition-all duration-200 cursor-pointer flex flex-col justify-start ${
                  isToday
                    ? 'bg-blue-100 border-blue-400 shadow-md ring-2 ring-blue-300'
                    : hasPlacements
                    ? 'bg-green-50 border-green-300 hover:bg-green-100 hover:shadow-md'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:shadow-sm'
                }`}
              >
                <div className={`text-sm font-semibold mb-2 ${
                  isToday ? 'text-blue-700' : hasPlacements ? 'text-green-700' : 'text-gray-700'
                }`}>
                  {date.getDate()}
                </div>
                <div className="flex flex-col gap-1">
                  <div className={`text-xs font-medium px-2 py-1 rounded-md text-center ${
                    hasPlacements
                      ? 'text-green-700 bg-green-100'
                      : 'text-gray-500 bg-gray-100'
                  }`}>
                    {studentsOnDate.length} placed
                  </div>
                </div>
                {isToday && !hasPlacements && (
                  <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-center mt-1">
                    Today
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
            <span className="text-sm font-medium text-gray-700">Placements</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded ring-2 ring-blue-300"></div>
            <span className="text-sm font-medium text-gray-700">Today</span>
          </div>
        </div>
      </div>

      {/* Date Details Modal */}
      {showDateModal && selectedDate && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0  bg-opacity-20 backdrop-blur-sm" onClick={closeDateModal}></div>
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden z-50 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              {(() => {
                const dateKey = selectedDate.toDateString();
                const studentsOnDate = placedDates[dateKey] || [];

                if (studentsOnDate.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-lg mb-2">No placements</div>
                      <div className="text-gray-500">No students were placed on this date</div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {studentsOnDate.length} Student{studentsOnDate.length !== 1 ? 's' : ''} Placed
                      </h3>
                      <span className="text-sm text-gray-500">
                        {selectedDate.toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <div className="grid gap-4">
                      {studentsOnDate.map((student, index) => (
                        <div key={student.id || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                {student.studentName.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold text-gray-900 truncate">
                                  {student.studentName}
                                </h4>
                                <p className="text-xs text-gray-600 truncate">
                                  {student.college}
                                </p>
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-gray-700">
                                    <span className="font-medium">Company:</span> {student.companyName}
                                  </p>
                                  <p className="text-sm text-gray-700">
                                    <span className="font-medium">Position:</span> {student.jobDesignation}
                                  </p>
                                  <p className="text-sm font-semibold text-green-600">
                                    <span className="font-medium">Package:</span> {student.salary} LPA
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacedStdCalendar;