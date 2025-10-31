import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import MsalProviderWrapper from "./context/MsalProviderWrapper";
import { msalInstance } from "./auth/msalConfig";

// Global error handlers for production safety
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default browser behavior (logging to console)
  event.preventDefault();

  // Show user-friendly error message
  if (window.toast) {
    window.toast.error('An unexpected error occurred. Please refresh the page.', {
      position: "top-right",
      autoClose: 5000,
    });
  }
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Don't prevent default behavior for regular errors
});

// Handle React errors that escape error boundaries
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && event.error.message.includes('React')) {
    console.error('React error escaped error boundary:', event.error);
  }
});

// Initialize MSAL instance properly
msalInstance.initialize().then(() => {
  // Handle redirect promise for popup/redirect flows
  msalInstance.handleRedirectPromise().then(() => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <MsalProviderWrapper>
          <App />
        </MsalProviderWrapper>
      </StrictMode>
    );
  });
}).catch(() => {
  // MSAL initialization failed - fallback render without MSAL
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
