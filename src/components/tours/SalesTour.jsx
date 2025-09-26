import React, { useEffect, useMemo, useState, useRef } from "react";
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

export default function SalesTour({ userId, enabled = true }) {
  const tourKey = "sales"; // unique per section/page
  const [completed, setCompleted] = useState(false);
  const [run, setRun] = useState(false);
  const [loading, setLoading] = useState(true);
  const joyrideRef = useRef(null);

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
        target: '[data-tour="sales-header"]',
        content: "Welcome to the Sales Dashboard! This is your central hub for managing leads, tracking follow-ups, and closing deals.",
        disableBeacon: true,
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="add-college-button"]',
        content: "Click here to add a new college or institution as a potential lead to your sales pipeline.",
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="view-mode-toggle"]',
        content: "Toggle between viewing only your leads or all leads in your team/sales department.",
        placement: "bottom",
        disableScrolling: true,
      },
      {
        target: '[data-tour="lead-filters"]',
        content: "Use these filters to narrow down leads by city, assigned person, date range, or contact details.",
        placement: "bottom",
        disableScrolling: true,
      },
   {
    target: '[data-tour="phase-tabs"]',
    content: "Filter your pipeline by clicking these phase tabs. Quickly see which leads are Hot, which need a Warm follow-up, which are Cold for long-term nurturing, and which you've successfully Closed.",
    placement: "bottom",
    disableScrolling: true,
},
      {
        target: '[data-tour="hot-leads-tab"]',
        content: "Hot leads require immediate attention and follow-up. These are your highest priority prospects.",
        placement: "bottom",
      },
      {
        target: '[data-tour="warm-leads-tab"]',
        content: "Warm leads need regular follow-up and nurturing. Keep the conversation going with these prospects.",
        placement: "bottom",
      },
      {
        target: '[data-tour="cold-leads-tab"]',
        content: "Cold leads are long-term prospects. Touch base occasionally but don't overwhelm them.",
        placement: "bottom",
      },
      {
        target: '[data-tour="closed-leads-tab"]',
        content: "Closed leads are closed clients. Review these for insights and learning.",
        placement: "bottom",
      },
      {
        target: 'button[data-tour="lead-actions"]',
        content: "For each lead, click this actions button to view details, schedule follow-ups, assign to team members, move between phases, or mark as closed.",
        placement: "left",
        disableScrolling: true,
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

    // Prevent tour from ending prematurely on missing targets
    if (type === EVENTS.TOUR_END && status !== STATUS.FINISHED && status !== STATUS.SKIPPED) {
      // Tour ended unexpectedly
    }

    // When going back from tab steps (6-9) to top elements (0-4), scroll to top
    if (type === EVENTS.STEP_BEFORE && index >= 0 && index <= 4 && step) {
      const topTargets = [
        '[data-tour="sales-header"]',
        '[data-tour="add-college-button"]',
        '[data-tour="view-mode-toggle"]',
        '[data-tour="lead-filters"]',
        '[data-tour="phase-tabs"]'
      ];
      if (topTargets.includes(step.target)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    // When going back from tab steps (5-8) to tab steps (5-8), scroll to show tabs
    if (type === EVENTS.STEP_BEFORE && index >= 5 && index <= 8 && step) {
      const tabTargets = [
        '[data-tour="hot-leads-tab"]',
        '[data-tour="warm-leads-tab"]',
        '[data-tour="cold-leads-tab"]',
        '[data-tour="closed-leads-tab"]'
      ];
      if (tabTargets.includes(step.target)) {
        // Scroll to a position that shows the tabs area
        const tabsElement = document.querySelector('[data-tour="phase-tabs"]');
        if (tabsElement) {
          tabsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

    // When moving to the lead actions step, scroll to top to show the first leads
    if (type === EVENTS.STEP_BEFORE && index === 9) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading || completed || !enabled) return null;

  return (
    <Joyride
      ref={joyrideRef}
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
