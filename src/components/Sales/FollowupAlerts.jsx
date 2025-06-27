const FollowupAlerts = ({
  todayFollowUps,
  showTodayFollowUpAlert,
  setShowTodayFollowUpAlert,
  reminderPopup,
  setReminderPopup,
}) => {
  return (
    <>
      {showTodayFollowUpAlert && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full bg-white border border-gray-200 rounded-xl shadow-lg transition-transform transform hover:scale-105 hover:shadow-xl duration-300 ease-in-out animate-slideInRight">
          <div className="p-4 flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full shadow-inner">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 16l4-4-4-4m4 4h8"
                  />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                📅 Today's Meetings!
              </h2>
              <p className="text-gray-700 text-sm mb-4">
                You have{" "}
                <span className="font-medium">{todayFollowUps.length}</span>{" "}
                lead(s) with a meeting scheduled for today.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowTodayFollowUpAlert(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition duration-200"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reminderPopup && (
        <div className="fixed top-24 right-6 z-50 max-w-sm w-full bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl shadow-lg animate-fadeIn">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-full">
                ⏰
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-yellow-800 font-semibold text-md">
                Meeting Reminder
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                You have a meeting with <strong>{reminderPopup.college}</strong>{" "}
                at <strong>{reminderPopup.time}</strong>
              </p>
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => setReminderPopup(null)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded-md transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FollowupAlerts;
