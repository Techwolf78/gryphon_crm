import React, { useState } from "react";
import ViewRequests from "./ViewRequests";

export default function CsddCostsPanel({
  department,
  fiscalYear,
  currentUser,
  currentBudget,
}) {
  const [activeTab, setActiveTab] = useState("submitted");

  return (
    <div className="space-y-6">
      {/* REQUESTS VIEW */}
      <div>
        <ViewRequests
          department={department}
          fiscalYear={fiscalYear}
          currentUser={currentUser}
          currentBudget={currentBudget}
          filter={activeTab} // 👈 NEW FILTER PROP
        />
      </div>
    </div>
  );
}
