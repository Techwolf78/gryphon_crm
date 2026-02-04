import React, { useEffect, useRef, useState } from 'react';

const Captcha = ({ onVerify, siteKey, disabled = false }) => {
  const containerRef = useRef(null);
  const [isVerified, setIsVerified] = useState(disabled);
  const hasRendered = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (disabled) {
      onVerify && onVerify('development-mode-token');
      setIsVerified(true);
      return;
    }

    if (!siteKey) {
      console.warn('CAPTCHA siteKey not configured. Skipping Turnstile initialization.');
      return;
    }

    const containerElement = containerRef.current;

    if (!window.turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const initTurnstile = () => {
      if (window.turnstile && containerElement) {
        // Remove any existing widget first
        if (containerElement.querySelector('iframe')) {
          window.turnstile.remove(containerElement);
        }
        if (!hasRendered.current) {
          hasRendered.current = true;
          window.turnstile.render(containerElement, {
            sitekey: siteKey,
            callback: (token) => {
              setIsVerified(true);
              onVerify && onVerify(token);
            },
            'error-callback': () => {
              setIsVerified(false);
            },
            'expired-callback': () => {
              setIsVerified(false);
            },
          });
        }
      }
    };

    if (window.turnstile) {
      initTurnstile();
    } else {
      intervalRef.current = setInterval(() => {
        if (window.turnstile) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          initTurnstile();
        }
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (containerElement && window.turnstile) {
        window.turnstile.remove(containerElement);
        hasRendered.current = false;
      }
    };
  }, [siteKey, onVerify, disabled]);

  return (
    <div className="captcha-container">
      {disabled ? (
        <div className="verification-status" style={{
          color: '#10b981',
          fontSize: '14px',
          padding: '8px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #d1fae5',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          Development Mode - CAPTCHA Disabled
        </div>
      ) : !siteKey ? (
        <div className="verification-status" style={{
          color: '#ef4444',
          fontSize: '14px',
          padding: '8px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" opacity="0"/>
            <path d="M13 16h-2v-6h2m0-4h-2v2h2m-1-6c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8z"/>
          </svg>
          CAPTCHA Configuration Error - Site key not found
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            className="cf-turnstile"
          />
          {isVerified && (
            <div className="verification-status" style={{
              color: '#10b981',
              fontSize: '14px',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Verified as human
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Captcha;