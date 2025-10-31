import React, { useEffect, useMemo, useState } from "react";
import Joyride, { STATUS, EVENTS } from "react-joyride";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

const STORAGE_KEY = (userId, tourKey) => `tour:${userId || "anon"}:${tourKey}`;

const getTourStatus = async (userId, tourKey) => {
  // Check localStorage first
  const localStatus = localStorage.getItem(STORAGE_KEY(userId, tourKey));
  if (localStatus) {
    return localStatus;
  }

  // If no localStorage, check Firestore
  if (userId) {
    try {
      const docRef = doc(db, "hrtour", userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const firestoreStatus = data[tourKey];
        
        // Cache in localStorage for future use
        if (firestoreStatus) {
          localStorage.setItem(STORAGE_KEY(userId, tourKey), firestoreStatus);
        }
        
        return firestoreStatus || null;
      }
    } catch (error) {
      console.error("Error getting tour status from Firestore:", error);
    }
  }

  return null;
};

const setTourStatus = async (userId, tourKey, status) => {
  // Update localStorage
  localStorage.setItem(STORAGE_KEY(userId, tourKey), status);

  // Update Firestore
  if (userId) {
    try {
      const docRef = doc(db, "hrtour", userId);
      await setDoc(docRef, { [tourKey]: status }, { merge: true });
    } catch (error) {
      console.error("Error setting tour status in Firestore:", error);
    }
  }
};

export default function HRBillsTour({ userId, enabled = true }) {
  const tourKey = "hr-bills"; // unique per section/page
  const [completed, setCompleted] = useState(false);
  const [run, setRun] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTourStatus = async () => {
      try {
        const status = await getTourStatus(userId, tourKey);
        const isCompleted = status === "done";
        setCompleted(isCompleted);
        setRun(enabled && !isCompleted);
      } catch (error) {

        setRun(enabled); // Default to showing tour if error
      } finally {
        setLoading(false);
      }
    };

    checkTourStatus();
  }, [userId, enabled]);

  const steps = useMemo(
    () => [
      {
        target: '[data-tour="hr-header"]',
        content: "Welcome to the Trainer Bill Approvals page! This is where you manage and approve trainer payment requests. Let's take a quick tour of the features.",
        disableBeacon: true,
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="total-bills-card"]',
        content: "This shows the total number of bills submitted by trainers. It gives you an overview of the workload.",
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="approved-bills-card"]',
        content: "These are bills that have been approved and processed for payment.",
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="pending-bills-card"]',
        content: "These bills are waiting for your review and approval decision.",
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="rejected-bills-card"]',
        content: "Bills that were rejected, usually with specific remarks explaining the reason.",
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="financial-summary-card"]',
        content: "Here you can see the financial breakdown - total amounts, approved amounts, pending amounts, and rejected amounts.",
        placement: "left",
      },
      {
        target: '[data-tour="quick-actions-card"]',
        content: "Quick action buttons for exporting data or viewing detailed reports.",
        placement: "left",
      },
      {
        target: '[data-tour="search-input"]',
        content: "Search for specific bills by trainer name, course, batch, or college name.",
        placement: "bottom",
      },
      {
        target: '[data-tour="filter-button"]',
        content: "Filter bills by status - All, Pending, Approved, Rejected, or On Hold.",
        placement: "bottom",
      },
      {
        target: '[data-tour="refresh-button"]',
        content: "Refresh the data to see the latest bill submissions and updates.",
        placement: "bottom",
      },
      {
        target: '[data-tour="view-details"]',
        content: "Click the View button to see detailed information about the trainer and bill, including payment details and trainer profile.",
      },
      {
        target: '[data-tour="approve-bill"]',
        content: "Approve the trainer bill by clicking the Approve button. This will mark it as approved and ready for payment.",
      },
      {
        target: '[data-tour="reject-bill"]',
        content: "Reject the bill and add remarks by clicking the Reject button. You'll be prompted to provide a reason for rejection.",
      },
    ],
    []
  );

  const handleCallback = async (data) => {
    const { status, type } = data;

    // If user finishes or skips, persist completion so it never shows again
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      try {
        await setTourStatus(userId, tourKey, "done");
        setCompleted(true);
        setRun(false);
      } catch (error) {
        console.error("Error setting tour completion status:", error);
      }
    }

    // If a target is missing (e.g., conditional UI), continue gracefully
    if (type === EVENTS.TARGET_NOT_FOUND) {
      // Force next step to skip missing targets
      return { action: 'next' };
    }
  };

  if (loading || completed || !enabled) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose={false}
      scrollToFirstStep={false}
      spotlightPadding={6}
      locale={{
        back: "Back",
        last: "Finish",
        next: "Next",
        skip: "Skip",
      }}
      styles={{
        options: { zIndex: 10000 },
      }}
      callback={handleCallback}
    />
  );
}
