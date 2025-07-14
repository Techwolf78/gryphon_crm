import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SessionManager() {
  const { logout, user, refreshSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    let warningTimer;
    let logoutTimer;
    let lastActiveTime = Date.now();

    // Time constants
    const MINUTE = 60 * 1000;
    const WARNING_TIME = 10 * MINUTE;
    const LOGOUT_TIME = 15 * MINUTE;
    const MAX_SESSION_AGE = 12 * 60 * MINUTE; // 12 hours max session

    const handleLogout = () => {
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

      warningTimer = setTimeout(() => {
        if (!checkSessionAge()) return;
        
        const shouldRefresh = window.confirm(
          'Your session will expire in 5 minutes. Click OK to stay logged in.'
        );
        
        if (shouldRefresh) {
          refreshSession().then(success => {
            if (success) resetTimers();
          });
        } else {
          handleLogout();
        }

        logoutTimer = setTimeout(handleLogout, 5 * MINUTE);
      }, WARNING_TIME);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if session expired while tab was inactive
        if (!checkSessionAge()) return;
        
        // Verify session with server
        refreshSession().then(success => {
          if (success) resetTimers();
        });
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

  return null;
}