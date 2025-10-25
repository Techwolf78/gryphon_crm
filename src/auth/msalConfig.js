import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

const isProduction = import.meta.env.PROD;
const basePath = "/sync"; // Define your base path

export const msalConfig = {
  auth: {
    clientId: "2a251889-6bec-4b99-83a0-314aba62c2b8",
    authority: "https://login.microsoftonline.com/d6642298-69f0-4366-b0bb-9d7c675d3fd3",
    redirectUri: isProduction 
      ? `${window.location.origin}${basePath}/dashboard/sales`
      : "http://localhost:5173/dashboard/sales",
    postLogoutRedirectUri: isProduction 
      ? `${window.location.origin}${basePath}/`
      : "http://localhost:5173"
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        // Never log PII
        if (containsPii) return;
        
        // Suppress ALL console logs in both development and production
        return;
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Error
    }
  }
};

export const msalInstance = new PublicClientApplication(msalConfig);
