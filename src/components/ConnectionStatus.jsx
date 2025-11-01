import React, { useState, useEffect } from 'react';
import { getConnectionStatus, forceConnectionCheck } from '../utils/firebaseUtils';

const ConnectionStatus = ({ onRetry }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState(Date.now());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-retry when connection is restored
      if (onRetry) {
        setTimeout(() => onRetry(), 1000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connection check
    const checkInterval = setInterval(async () => {
      const status = getConnectionStatus();
      setIsOnline(status.isOnline);
      setLastCheck(status.lastCheck);
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkInterval);
    };
  }, [onRetry]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const connected = await forceConnectionCheck();
      setIsOnline(connected);
      setLastCheck(Date.now());

      if (connected && onRetry) {
        onRetry();
      }
    } catch (error) {
      console.error('Manual connection check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  if (isOnline) {
    return null; // Don't show anything when online
  }

  return (
    <div className="fixed top-4 right-4 z-64 max-w-sm">
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-800">Connection Lost</h4>
            <p className="text-xs text-red-600">
              You're offline. Some features may not work properly.
            </p>
          </div>
          <button
            onClick={handleManualCheck}
            disabled={isChecking}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs rounded-md transition-colors flex items-center space-x-1"
          >
            {isChecking ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Checking...</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Retry</span>
              </>
            )}
          </button>
        </div>
        <div className="mt-2 text-xs text-red-500">
          Last checked: {new Date(lastCheck).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;