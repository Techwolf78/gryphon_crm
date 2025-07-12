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

    // Convert minutes to milliseconds
    const MINUTE = 60 * 1000;
    const WARNING_TIME = 10 * MINUTE; // Show warning after 10 minutes
    const LOGOUT_TIME = 15 * MINUTE; // Total session time (15 minutes)
    const TIME_BETWEEN_WARNING_AND_LOGOUT = LOGOUT_TIME - WARNING_TIME; // 5 minutes

    const resetTimers = () => {
      // Clear existing timers
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);

      // Set warning to appear after 10 minutes
      warningTimer = setTimeout(() => {
        const shouldRefresh = window.confirm(
          `Your session will expire in ${TIME_BETWEEN_WARNING_AND_LOGOUT / MINUTE} minutes due to inactivity. Click OK to stay logged in.`
        );
        
        if (shouldRefresh) {
          refreshSession();
          resetTimers();
        } else {
          handleLogout();
        }

        // Set logout to happen at the full session time (15 minutes total)
        logoutTimer = setTimeout(handleLogout, TIME_BETWEEN_WARNING_AND_LOGOUT);
      }, WARNING_TIME);
    };

    const handleLogout = () => {
      logout();
      navigate('/login', {
        state: { from: location, message: 'Session expired due to inactivity' }
      });
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const refreshed = await refreshSession();
          if (!refreshed) throw new Error('Session refresh failed');
          resetTimers();
        } catch (error) {
          console.error('Connection check failed:', error);
          handleLogout();
        }
      }
    };

    // Set up event listeners
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click', 'mousemove'];
    events.forEach(event => {
      window.addEventListener(event, resetTimers);
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize timers
    resetTimers();

    // Cleanup
    return () => {
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimers);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, logout, navigate, location, refreshSession]);

  return null;
}