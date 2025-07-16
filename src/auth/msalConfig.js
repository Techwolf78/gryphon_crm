import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: "2a251889-6bec-4b99-83a0-314aba62c2b8",
    authority: "https://login.microsoftonline.com/d6642298-69f0-4366-b0bb-9d7c675d3fd3",
    redirectUri: "https://www.gryphonacademy.co.in/sync", // Must match Azure config
  },
  cache: {
    cacheLocation: "localStorage", // Optional but recommended
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);
