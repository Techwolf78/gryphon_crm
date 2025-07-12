import { useEffect, useState, useCallback, useRef } from 'react'; // Added useRef here
import { motion, AnimatePresence } from 'framer-motion';


// Custom hook for escape key
const useEscapeKey = (callback) => {
  useEffect(() => {
    const handleKeyDown = (e) => e.key === 'Escape' && callback();
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callback]);
};

// Custom hook for click outside
const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, callback]);
};

// Shared alert component
const AlertBase = ({
  icon,
  color = 'indigo',
  title,
  children,
  onClose,
  actions,
  autoDismiss = false,
  autoDismissTime = 4000,
  position = 'top-6 right-6',
}) => {
  const alertRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);

  // Handle auto dismissal
  useEffect(() => {
    if (!autoDismiss || isHovered) return;

    const timer = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - 100 / (autoDismissTime / 100)));
    }, 100);

    const timeout = setTimeout(() => {
      onClose();
    }, autoDismissTime);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [autoDismiss, autoDismissTime, isHovered, onClose]);

  useClickOutside(alertRef, onClose);

  return (
    <motion.div
      ref={alertRef}
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
      className={`fixed ${position} z-54 max-w-sm w-full`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      role="alert"
      aria-live="assertive"
    >
      <div className={`bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-200 relative`}>
        {/* Progress bar for auto-dismiss */}
        {autoDismiss && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
            <div
              className={`h-full bg-${color}-500 transition-all duration-100`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        
        {/* Colored top border */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${color}-500 to-${color}-600`}></div>
        
        <div className="p-5 flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className={`flex items-center justify-center w-11 h-11 bg-gradient-to-br from-${color}-100 to-${color}-200 rounded-xl shadow-inner`}>
              {icon}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h2 className={`text-lg font-semibold text-${color}-900 mb-1`}>
                {title}
              </h2>
              <button
                onClick={onClose}
                className={`text-${color}-400 hover:text-${color}-600 transition-colors`}
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            
            <div className={`text-${color}-800 text-sm mb-4`}>
              {children}
            </div>
            
            {/* Actions */}
            {actions && (
              <div className="flex justify-end gap-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FollowupAlerts = ({
  todayFollowUps,
  showTodayFollowUpAlert,
  setShowTodayFollowUpAlert,
  reminderPopup,
  setReminderPopup,
}) => {
  const [alerts, setAlerts] = useState([]);
  const [snoozedAlerts, setSnoozedAlerts] = useState([]);

  // Handle escape key for all alerts
  const handleCloseAll = useCallback(() => {
    setShowTodayFollowUpAlert(false);
    setReminderPopup(null);
    setAlerts([]);
  }, [setShowTodayFollowUpAlert, setReminderPopup]);

  useEscapeKey(handleCloseAll);

  // Snooze functionality
  const handleSnooze = useCallback((alert) => {
    const snoozeTime = 5 * 60 * 1000; // 5 minutes
    setSnoozedAlerts(prev => [...prev, alert]);
    
    setTimeout(() => {
      setAlerts(prev => [...prev, alert]);
      setSnoozedAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, snoozeTime);
    
    if (alert.type === 'reminder') {
      setReminderPopup(null);
    }
  }, [setReminderPopup]);

  // View meetings action
  const handleViewMeetings = useCallback(() => {
    setShowTodayFollowUpAlert(false);
    // In a real app, you would navigate to meetings view
    console.log('Navigating to meetings view');
  }, [setShowTodayFollowUpAlert]);

  // Join meeting action
  const handleJoinMeeting = useCallback(() => {
    // In a real app, this would launch the meeting URL
    console.log('Joining meeting:', reminderPopup?.meetingUrl);
    setReminderPopup(null);
  }, [reminderPopup, setReminderPopup]);

  // Dismiss all action
  const handleDismissAll = useCallback(() => {
    handleCloseAll();
  }, [handleCloseAll]);

  return (
    <>
      <AnimatePresence>
        {/* Today's Follow-ups Alert */}
        {showTodayFollowUpAlert && (
          <AlertBase
            icon={
              <svg className={`w-6 h-6 text-indigo-600`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            color="indigo"
            title="Today's Meetings"
            onClose={() => setShowTodayFollowUpAlert(false)}
            autoDismiss={true}
            actions={
              <>
                <button
                  onClick={() => setShowTodayFollowUpAlert(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg transition-colors"
                >
                  Remind me later
                </button>
                <button
                  onClick={handleViewMeetings}
                  className="px-4 py-2 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all transform hover:scale-[1.02]"
                >
                  View meetings
                </button>
              </>
            }
          >
            <p>
              You have{' '}
              <span className="font-medium text-indigo-600">
                {todayFollowUps.length}
              </span>{' '}
              {todayFollowUps.length === 1 ? 'meeting' : 'meetings'} scheduled for today.
            </p>
          </AlertBase>
        )}

        {/* Reminder Popup */}
        {reminderPopup && (
          <AlertBase
            icon={
              <svg className={`w-6 h-6 text-amber-600`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color={reminderPopup.urgent ? 'red' : 'amber'}
            title={reminderPopup.urgent ? 'Meeting NOW!' : 'Meeting Starting Soon'}
            onClose={() => setReminderPopup(null)}
            autoDismiss={!reminderPopup.urgent}
            position="top-24 right-6"
            actions={
              <>
                <button
                  onClick={() => handleSnooze({
                    id: `snooze-${reminderPopup.college}`,
                    type: 'reminder',
                    data: reminderPopup
                  })}
                  className="px-4 py-2 text-sm font-medium text-amber-700 hover:text-amber-900 rounded-lg transition-colors"
                >
                  Snooze (5 min)
                </button>
                <button
                  onClick={handleJoinMeeting}
                  className={`px-4 py-2 bg-gradient-to-br ${reminderPopup.urgent ? 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : 'from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600'} text-white text-sm font-medium rounded-lg shadow-sm transition-all transform hover:scale-[1.02]`}
                >
                  {reminderPopup.urgent ? 'Join NOW' : 'Join now'}
                </button>
              </>
            }
          >
            <p>
              Your meeting with{' '}
              <span className="font-medium">{reminderPopup.college}</span> {reminderPopup.urgent ? 'is happening now' : `starts at ${reminderPopup.time}`}.
            </p>
            {reminderPopup.meetingUrl && (
              <p className="mt-1 text-xs">
                Meeting URL: <span className="underline">{reminderPopup.meetingUrl}</span>
              </p>
            )}
          </AlertBase>
        )}

        {/* Multiple Alerts Support */}
        {alerts.length > 0 && (
          <AlertBase
            icon={
              <svg className={`w-6 h-6 text-purple-600`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }
            color="purple"
            title={`${alerts.length} Pending Notifications`}
            onClose={handleDismissAll}
            position="top-40 right-6"
            actions={
              <button
                onClick={handleDismissAll}
                className="px-4 py-2 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all transform hover:scale-[1.02]"
              >
                Dismiss All
              </button>
            }
          >
            <p>
              You have {alerts.length} pending {alerts.length === 1 ? 'notification' : 'notifications'}.
            </p>
          </AlertBase>
        )}
      </AnimatePresence>
    </>
  );
};

export default FollowupAlerts;