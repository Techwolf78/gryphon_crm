import React, { useState, useEffect, useCallback } from 'react';
import Joyride from 'react-joyride';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from "../../firebase";

const AdminTour = ({ userId }) => {
  const [run, setRun] = useState(false);

  const steps = [
    {
      target: '[data-tour="admin-header"]',
      content: 'Welcome to the Admin Dashboard! This is your central hub for managing users and monitoring system activity.',
      placement: 'bottom',
      disableBeacon: true,
      disableScrolling: true,
    },
    {
      target: '[data-tour="add-user-button"]',
      content: 'Click here to add new users to the system. You can create accounts for different departments and roles.',
      placement: 'bottom',
      disableScrolling: true,
    },
    {
      target: '[data-tour="stats-cards"]',
      content: 'These cards show key metrics: total users, today\'s login count, and recent system activity.',
      placement: 'bottom',
      disableScrolling: true,
    },
    {
      target: '[data-tour="user-management-section"]',
      content: 'The User Management section allows you to view, search, and manage all system users.',
      placement: 'right',
      disableScrolling: true,
    },
    {
      target: '[data-tour="user-search"]',
      content: 'Use this search bar to quickly find users by name or email address.',
      placement: 'bottom',
      disableScrolling: true,
    },
    {
      target: '[data-tour="user-filters"]',
      content: 'Filter users by role and department to organize your view. Use the refresh button to update data.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="login-analytics"]',
      content: 'View detailed login analytics to understand user activity patterns and system usage.',
      placement: 'top',
    },
    {
      target: '[data-tour="audit-logs"]',
      content: 'The Audit Logs section tracks all system activities for security and compliance monitoring.',
      placement: 'top',
    },
  ];

  const getTourStatus = useCallback(async () => {
    if (!userId) return false;

    try {
      const localStorageKey = `adminTourCompleted_${userId}`;
      const localCompleted = localStorage.getItem(localStorageKey);

      if (localCompleted === 'true') {
        return true;
      }

      const docRef = doc(db, 'hrtour', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const adminTourCompleted = data.adminTourCompleted;
        if (adminTourCompleted) {
          localStorage.setItem(localStorageKey, 'true');
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking tour status:', error);
      return false;
    }
  }, [userId]);

  const setTourStatus = async (completed) => {
    if (!userId) return;

    try {
      const localStorageKey = `adminTourCompleted_${userId}`;
      localStorage.setItem(localStorageKey, completed.toString());

      const docRef = doc(db, 'hrtour', userId);
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};

      await setDoc(docRef, {
        ...existingData,
        adminTourCompleted: completed,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Error setting tour status:', error);
    }
  };

  useEffect(() => {
    const checkTourStatus = async () => {
      const hasCompleted = await getTourStatus();
      if (!hasCompleted) {
        setRun(true);
      }
    };

    if (userId) {
      checkTourStatus();
    }
  }, [userId, getTourStatus]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;

    if (status === 'finished' || status === 'skipped') {
      setRun(false);
      setTourStatus(true);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      callback={handleJoyrideCallback}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      scrollToFirstStep={false}
      spotlightPadding={6}
      styles={{
        options: {
          primaryColor: '#4F46E5',
          textColor: '#374151',
          backgroundColor: '#FFFFFF',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
        },
        tooltip: {
          borderRadius: 8,
          fontSize: 14,
        },
        tooltipContent: {
          padding: '20px 16px',
        },
        buttonNext: {
          backgroundColor: '#4F46E5',
          fontSize: 14,
          borderRadius: 6,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#6B7280',
          fontSize: 14,
          marginRight: 8,
        },
        buttonSkip: {
          color: '#6B7280',
          fontSize: 14,
        },
        buttonClose: {
          height: 14,
          width: 14,
          right: 16,
          top: 16,
        },
      }}
      locale={{
        back: 'Previous',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        open: 'Open the dialog',
        skip: 'Skip tour',
      }}
    />
  );
};

export default AdminTour;
