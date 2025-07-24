import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: "2a251889-6bec-4b99-83a0-314aba62c2b8",
    authority: "https://login.microsoftonline.com/d6642298-69f0-4366-b0bb-9d7c675d3fd3",
    redirectUri: window.location.origin + "/dashboard/sales",
    postLogoutRedirectUri: window.location.origin
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        // Only log errors in production
        if (level === LogLevel.Error) {
          console.error(message);
        }
      }
    }
  }
};

export const msalInstance = new PublicClientApplication(msalConfig);