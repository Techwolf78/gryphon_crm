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
    } catch {
      // Ignore error
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
    } catch {
      // Ignore error
    }
  }
};

export default function TrainersDashboardTour({ userId, enabled = true }) {
  const tourKey = "trainers-dashboard"; // unique per section/page
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
      } catch {

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
        target: '[data-tour="trainers-header"]',
        content: "Welcome to the Trainers Management Dashboard! Here you can view, add, edit, and manage all trainers in your system.",
        disableBeacon: true,
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="trainers-search"]',
        content: "Use this search bar to quickly find trainers by name, ID, or domain. The search works across all trainer information.",
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="add-trainer-button"]',
        content: "Click here to add a new trainer to your system. You can import multiple trainers at once or add them individually.",
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="trainers-table"]',
        content: "This table displays all your trainers with their details including ID, name, domain, specializations, charges, and contact information.",
        placement: "top",
        disableScrolling: true,
        spotlightClicks: false,
        floaterProps: {
          disableFlip: true,
          disableShift: true,
        },
      },
      {
        target: '[data-tour="trainer-id-column"]',
        content: "Trainer IDs are automatically generated and can be sorted. Click the arrow next to 'ID' to sort trainers by their ID number.",
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="trainer-actions"]',
        content: "For each trainer, you can edit their information or delete them from the system. Click on any row to view detailed trainer information.",
        placement: "left",
        disableScrolling: true,
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
      } catch {
        // Ignore error
      }
    }

    // If a target is missing (e.g., conditional UI), continue gracefully
    if (type === EVENTS.TARGET_NOT_FOUND) {
      // Continue gracefully without logging
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
      scrollToSteps={false}
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
