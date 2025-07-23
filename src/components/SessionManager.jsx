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
        logoutTimer = setTimeout(handleLogout, 5 * MINUTE); // 5 minute warning
      }, WARNING_TIME);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!checkSessionAge()) return;
        
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

  const handleLogout = () => {
    setShowWarning(false);
    logout();
    navigate('/login', {
      state: { from: location, message: 'Session expired due to inactivity' }
    });
  };

  if (!showWarning) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#e74c3c' }}>
          ⚠️ Session Expiring
        </h3>
        <p style={{ margin: '0 0 2rem 0', color: '#666' }}>
          Your session will expire in 5 minutes due to inactivity. 
          Would you like to stay logged in?
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => {
              refreshSession().then(success => {
                if (success) {
                  setShowWarning(false);
                  // Reset timers will be called by the event listeners
                }
              });
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Stay Logged In
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}