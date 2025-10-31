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

  // If no localStorage, check Firestore tickets collection
  if (userId) {
    try {
      const docRef = doc(db, "tickets", userId);
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
      // Silent error handling
    }
  }

  return null;
};

const setTourStatus = async (userId, tourKey, status) => {
  // Update localStorage
  localStorage.setItem(STORAGE_KEY(userId, tourKey), status);

  // Update Firestore tickets collection
  if (userId) {
    try {
      const docRef = doc(db, "tickets", userId);
      await setDoc(docRef, { [tourKey]: status }, { merge: true });
    } catch {
      // Silent error handling
    }
  }
};

export default function NotificationsTour({ userId, hasNotifications, notificationCount, onViewNotifications }) {
  const tourKey = "notifications-last-viewed-count";
  const [run, setRun] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTourStatus = async () => {
      try {
        const lastViewedCount = await getTourStatus(userId, tourKey);
        const lastCount = lastViewedCount ? parseInt(lastViewedCount) : 0;
        
        // Show tour if there are notifications and count is higher than last viewed
        const shouldShow = hasNotifications && notificationCount > lastCount;
        setRun(shouldShow);
      } catch {
        setRun(hasNotifications); // Default to showing if error
      } finally {
        setLoading(false);
      }
    };

    if (hasNotifications) {
      checkTourStatus();
    } else {
      setRun(false);
      setLoading(false);
    }
  }, [userId, hasNotifications, notificationCount]);

  const steps = useMemo(
    () => [
      {
        target: '[data-tour="notifications-button"]',
        content: "You have new notifications! Click here to view your latest updates and support tickets.",
        disableBeacon: true,
        placement: "bottom",
        disableScrolling: true,
      },
    ],
    []
  );

  const handleCallback = async (data) => {
    const { status, type } = data;

    if (status === STATUS.FINISHED) {
      // User clicked "View" - open notifications and update last viewed count
      if (onViewNotifications) {
        onViewNotifications();
      }
      // Store current notification count as last viewed
      await setTourStatus(userId, tourKey, notificationCount.toString());
      setRun(false);
    } else if (status === STATUS.SKIPPED) {
      // User clicked "Skip" - just update last viewed count to current
      await setTourStatus(userId, tourKey, notificationCount.toString());
      setRun(false);
    }

    // If a target is missing, continue gracefully
    if (type === EVENTS.TARGET_NOT_FOUND) {
      // Continue gracefully
    }
  };

  if (loading || !hasNotifications || !run) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={false}
      showProgress={false}
      showSkipButton={true}
      disableOverlayClose={true}
      hideCloseButton={true}
      scrollToFirstStep={false}
      scrollToSteps={false}
      spotlightPadding={6}
      locale={{
        back: "Back",
        last: "View",
        next: "Next",
        skip: "Skip",
      }}
      styles={{
        options: { zIndex: 10000 },
        buttonNext: {
          backgroundColor: '#4F46E5',
        },
        buttonSkip: {
          color: '#6B7280',
        },
      }}
      callback={handleCallback}
    />
  );
}