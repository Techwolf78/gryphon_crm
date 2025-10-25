
import React from "react";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "../auth/msalConfig";

const MsalProviderWrapper = ({ children }) => {
  return (
    <MsalProvider instance={msalInstance}>
      {children}
    </MsalProvider>
  );
};

export default MsalProviderWrapper;
