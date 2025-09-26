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
      console.error("Error fetching tour status from Firestore:", error);
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
      console.error("Error saving tour status to Firestore:", error);
    }
  }
};

export default function LearningDevelopmentTour({ userId, enabled = true }) {
  const tourKey = "learning-development"; // unique per section/page
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
        console.error("Error checking tour status:", error);
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
        target: '[data-tour="ld-header"]',
        content: "Welcome to the Learning Development Dashboard! This is your central hub for managing training programs, contracts, and trainer invoices.",
        disableBeacon: true,
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="view-trainers-button"]',
        content: "Click here to view and manage all trainers in your system.",
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="new-contract-tab"]',
        content: "This tab shows new training contracts that need to be initiated. Each row represents a training program submitted by colleges.",
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="trainings-tab"]',
        content: "View and manage ongoing training programs that have been initiated and are in progress.",
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="trainer-invoice-tab"]',
        content: "Generate and manage invoices for trainer payments based on completed training sessions.",
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="training-actions"]',
        content: "For each training contract, you can view student data, check MOU files, or start the training program.",
        placement: "left",
      },
    ],
    []
  );

  const handleCallback = async (data) => {
    const { status, type, index, step } = data;

    // If user finishes or skips, persist completion so it never shows again
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      try {
        await setTourStatus(userId, tourKey, "done");
        setCompleted(true);
        setRun(false);
      } catch (error) {
        console.error("Error saving tour completion:", error);
      }
    }

    // If a target is missing (e.g., conditional UI), continue gracefully
    if (type === EVENTS.TARGET_NOT_FOUND) {
      // Continue gracefully without logging
    }

    // When going back from the last step (index 5) to step 5 (index 4), scroll to top to show tabs
    if (type === EVENTS.STEP_BEFORE && index === 4 && step && step.target === '[data-tour="trainer-invoice-tab"]') {
      // Scroll to top to ensure the tabs are visible when going back
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
