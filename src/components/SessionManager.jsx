import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SessionManager() {
  const { logout, user, refreshSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (user.department === "L & D") return;

    let warningTimer;
    let logoutTimer;
    let lastActiveTime = Date.now();

    // Time constants
    const MINUTE = 60 * 1000;
    const WARNING_TIME = 10 * MINUTE; // 10 minutes
    const LOGOUT_TIME = 15 * MINUTE; // 15 minutes
    const MAX_SESSION_AGE = 12 * 60 * MINUTE; // Keep 12 hours max session

    const handleLogout = () => {
      setShowWarning(false);
      logout();
      navigate('/login', {
        state: { from: location, message: 'Session expired due to inactivity' }
      });
    };

    const checkSessionAge = () => {
      const sessionAge = Date.now() - lastActiveTime;
      if (sessionAge > MAX_SESSION_AGE) {
        handleLogout();
        return false;
      }
      return true;
    };

    const resetTimers = () => {
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
      lastActiveTime = Date.now();
      setShowWarning(false);

      warningTimer = setTimeout(() => {
        if (!checkSessionAge()) return;
        
        setShowWarning(true);
        logoutTimer = setTimeout(() => {
          handleLogout();
        }, 5 * MINUTE); // 5 minute warning
      }, WARNING_TIME);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only refresh if session is getting close to expiry (within 1 hour)
        const sessionAge = Date.now() - lastActiveTime;
        if (sessionAge > (11 * 60 * MINUTE)) { // 11 hours
          refreshSession().then(success => {
            if (success) resetTimers();
          });
        } else {
          // Just reset timers without refreshing
          resetTimers();
        }
      }
    };

    // Initialize
    resetTimers();
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click', 'mousemove'];
    events.forEach(event => window.addEventListener(event, resetTimers));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
      events.forEach(event => window.removeEventListener(event, resetTimers));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, logout, navigate, location, refreshSession]);

  const handleLogout = () => {
    setShowWarning(false);
    logout();
    navigate('/login', {
      state: { from: location, message: 'Session expired due to inactivity' }
    });
  };

  if (!showWarning) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 9999
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
      aria-describedby="session-warning-description"
    >
      <div
        className="relative w-full max-w-sm mx-auto bg-white rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.8)',
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
        }}
      >
        {/* Header */}
        <div className="px-8 py-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mr-4">
              <svg
                className="w-6 h-6 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div>
              <h2
                id="session-warning-title"
                className="text-xl font-semibold text-gray-900 mb-1"
                style={{
                  fontFamily: 'system-ui, -apple-system, SF Pro Display, sans-serif',
                  fontWeight: '600',
                  letterSpacing: '-0.025em'
                }}
              >
                Session Timeout
              </h2>
              <p className="text-gray-600 text-sm font-medium">
                5 minutes remaining
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          <p
            id="session-warning-description"
            className="text-gray-700 text-center text-base leading-relaxed mb-8"
            style={{
              fontFamily: 'system-ui, -apple-system, SF Pro Text, sans-serif',
              fontWeight: '400',
              lineHeight: '1.5'
            }}
          >
            Your session will expire due to inactivity.
            <br />
            Would you like to stay logged in?
          </p>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={() => {
                refreshSession().then(success => {
                  if (success) {
                    setShowWarning(false);
                  }
                });
              }}
              className="w-full px-6 py-4 bg-black text-white font-semibold rounded-2xl transition-all duration-200 transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-black/50"
              style={{
                fontFamily: 'system-ui, -apple-system, SF Pro Text, sans-serif',
                fontWeight: '600',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
              }}
            >
              Stay Logged In
            </button>

            <button
              onClick={handleLogout}
              className="w-full px-6 py-4 bg-transparent border-2 border-gray-300 text-gray-700 font-semibold rounded-2xl transition-all duration-200 transform active:scale-[0.98] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              style={{
                fontFamily: 'system-ui, -apple-system, SF Pro Text, sans-serif',
                fontWeight: '600'
              }}
            >
              Logout Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
