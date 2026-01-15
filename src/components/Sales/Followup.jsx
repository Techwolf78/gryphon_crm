import React, { useState, useEffect, useCallback, useRef } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

import {
  FaRegClock,
  FaTimes,
  FaCalendarAlt,
  FaStickyNote,
  FaChevronUp,
  FaChevronDown,
  FaTrash,
  FaExclamationTriangle,
  FaCheckCircle,        // <-- Add
  FaTimesCircle,        // <-- Add
  FaInfoCircle,         // <-- Add
} from "react-icons/fa";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

const FollowUp = ({ lead, onClose }) => {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [time, setTime] = useState({
    hours: 12,
    minutes: 0,
    ampm: "AM",
  });
  const [remarks, setRemarks] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [pastFollowups, setPastFollowups] = useState([]);
  const [calendarError, setCalendarError] = useState(null);
  const [showCalendarWarning, setShowCalendarWarning] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retrySuccess, setRetrySuccess] = useState(false);
  const [sendInvite, setSendInvite] = useState(false); // <-- Add this line
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteFollowupKey, setDeleteFollowupKey] = useState(null);
  const [snackbar, setSnackbar] = useState("");
  const [snackbarType, setSnackbarType] = useState("success"); // "success" | "error" | "warning" | "info"
  const timePickerRef = useRef(null);

  const { instance, accounts } = useMsal();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const graphScopes = ["User.Read", "Calendars.ReadWrite"];



  // Replace all logInfo and logError calls with no-ops
  const logInfo = () => {};
  const logError = () => {};

  // Close time picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        timePickerRef.current &&
        !timePickerRef.current.contains(event.target)
      ) {
        setShowTimePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchPastFollowups = useCallback(async () => {
    if (!lead?.id) return;
    try {
      const docRef = doc(db, "leads", lead.id);
      const snapshot = await getDoc(docRef);
      const leadData = snapshot.data() || {};
      const existing = leadData.followup || {};

      const entries = Object.entries(existing)
        .map(([key, value]) => ({
          key,
          ...value,
          timestamp: value.timestamp,
          datetime: new Date(value.timestamp),
          relativeTime: dayjs(value.timestamp).fromNow(),
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      setPastFollowups(entries);
    } catch (err) {
      logError("Error fetching past followups:", err);
    }
  }, [lead?.id]);

  const handleDeleteFollowup = async (followupKey) => {
    if (!lead?.id) return;

    try {
      const docRef = doc(db, "leads", lead.id);
      const snapshot = await getDoc(docRef);
      const leadData = snapshot.data() || {};
      const existing = leadData.followup || {};

      const followupToDelete = existing[followupKey];

      // Delete from Microsoft Calendar if calendarEventId exists
      if (followupToDelete?.calendarEventId) {
        try {
          const accessToken = await getAccessToken();
          const response = await fetch(
            `https://graph.microsoft.com/v1.0/me/events/${followupToDelete.calendarEventId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (response.ok) {
            logInfo("Calendar event deleted successfully");
          } else if (response.status === 404) {
            logInfo("Calendar event was already deleted or not found");
          } else {
            logError("Failed to delete calendar event:", response.status);
          }
        } catch (calendarErr) {
          logError("Error deleting calendar event:", calendarErr);
          // Continue with CRM deletion even if calendar deletion fails
        }
      }

      // Delete from CRM database
      delete existing[followupKey];
      await updateDoc(docRef, { followup: existing });
      fetchPastFollowups();

      setSnackbar("Meeting deleted successfully from both CRM and calendar!");
      setSnackbarType("error");
      setTimeout(() => setSnackbar(""), 3000); // Hide after 3 seconds
    } catch (err) {
      logError("Error deleting followup:", err);
      setSnackbar("Failed to delete follow-up. Please try again.");
      setSnackbarType("error");
      setTimeout(() => setSnackbar(""), 3000);
    }
  };

  useEffect(() => {
    if (lead?.id) {
      setDate(dayjs().format("YYYY-MM-DD"));
      fetchPastFollowups();
    }
  }, [lead, fetchPastFollowups]);

  const getAccessToken = async () => {
    try {
      const allAccounts = instance.getAllAccounts();

      if (allAccounts.length === 0) {
        const loginResponse = await instance.loginPopup({
          scopes: graphScopes,
          prompt: "select_account",
        });
        instance.setActiveAccount(loginResponse.account);
        return loginResponse.accessToken;
      }

      const activeAccount = instance.getActiveAccount();
      if (!activeAccount && allAccounts.length > 0) {
        instance.setActiveAccount(allAccounts[0]);
      }

      const response = await instance.acquireTokenSilent({
        scopes: graphScopes,
        account: instance.getActiveAccount() || allAccounts[0],
      });

      return response.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        const response = await instance.acquireTokenPopup({
          scopes: graphScopes,
        });
        instance.setActiveAccount(response.account);
        return response.accessToken;
      } else {
        logError("Token acquisition failed:", err);
        throw err;
      }
    }
  };

  const createCalendarEvent = async () => {
    setCalendarError(null);
    try {
      setIsCreatingEvent(true);

      // Get current form values (important for retry scenarios)
      const currentRemarks = remarks.trim();
      const currentBusinessName = lead?.businessName?.trim();

      // Validation with better error messages
      if (!currentBusinessName) {
        throw new Error("Business name is missing from lead data");
      }

      if (!currentRemarks) {
        throw new Error(
          "Meeting notes are required. Please add meeting details before creating calendar event."
        );
      }

      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error("Failed to obtain access token");
      }

      const time24 = get24HourTime();
      const eventStart = dayjs(`${date} ${time24}`);
      const eventEnd = eventStart.add(30, "minute");

      // Improved date validation - allow same day if time is in future
      const now = dayjs();
      if (!eventStart.isValid()) {
        throw new Error("Invalid date format selected");
      }

      // More flexible date validation
      if (eventStart.isBefore(now.subtract(1, "minute"))) {
        const timeDiff = now.diff(eventStart, "minutes");
        if (timeDiff > 0) {
          throw new Error(
            `Selected time is ${timeDiff} minutes in the past. Please select a future time.`
          );
        }
      }

      // Enhanced event object with better formatting
      const event = {
        subject: `Meeting: ${currentBusinessName}`,
        body: {
          contentType: "HTML",
          content: `
    <div>
      <h3>Scheduled Follow-up from ${currentBusinessName}</h3>
      <p><strong>Contact Person:</strong> ${lead.pocName || "N/A"}</p>
      ${lead.email ? `<p><strong>Email:</strong> ${lead.email}</p>` : ""}
      ${lead.phone ? `<p><strong>Phone:</strong> ${lead.phone}</p>` : ""}
      <p><strong>Date:</strong> ${dayjs(date).format("MMM D, YYYY")}</p>
      <p><strong>Time:</strong> ${getFullTimeString()} (${timezone})</p>
      <hr>
      <p>A representative from our team will contact or visit you at the scheduled time.</p>
    </div>
  `,
        },
        start: {
          dateTime: eventStart.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: eventEnd.toISOString(),
          timeZone: timezone,
        },
        attendees:
          sendInvite && lead.email
            ? [
                {
                  emailAddress: {
                    address: lead.email,
                    name: lead.pocName || "Client",
                  },
                  type: "required",
                },
              ]
            : [],
        isReminderOn: true,
        reminderMinutesBeforeStart: 15,
        categories: ["Business Meeting", "CRM"],
        importance: "normal",
      };

      logInfo("Creating calendar event:", {
        subject: event.subject,
        start: event.start.dateTime,
        end: event.end.dateTime,
        timezone: event.start.timeZone,
      });

      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      logInfo("Graph API Response Status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        logError("Graph API Error Details:", errorData);

        // Enhanced error handling with more specific messages
        switch (response.status) {
          case 401:
            throw new Error(
              "Microsoft 365 session expired. Please refresh the page and try again."
            );
          case 403:
            throw new Error(
              "Calendar permission denied. Please contact your administrator to grant calendar access."
            );
          case 429:
            throw new Error(
              "Too many calendar requests. Please wait 30 seconds and try again."
            );
          case 400: {
            const graphError =
              errorData.error?.message || "Invalid request data";
            throw new Error(`Calendar service error: ${graphError}`);
          }
          case 404:
            throw new Error(
              "Microsoft 365 calendar service not available. Please check your account setup."
            );
          case 500:
          case 502:
          case 503:
            throw new Error(
              "Microsoft 365 service temporarily unavailable. Please try again in a few minutes."
            );
          default:
            throw new Error(
              `Calendar service error (${response.status}). Please try again or contact support.`
            );
        }
      }

      const createdEvent = await response.json();

      if (!createdEvent?.id) {
        throw new Error(
          "Calendar event was created but verification failed. Please check your calendar manually."
        );
      }

      logInfo("Event successfully created:", {
        id: createdEvent.id,
        subject: createdEvent.subject,
        start: createdEvent.start?.dateTime,
      });

      return {
        success: true,
        eventId: createdEvent.id,
        event: createdEvent,
        webLink: createdEvent.webLink,
      };
    } catch (err) {
      logError("Calendar event creation failed:", err);
      setCalendarError(err.message);

      return { success: false, error: err.message };
    } finally {
      setIsCreatingEvent(false);
    }
  };

  // 1. Add a helper for showing snackbar messages with type
  const showSnackbar = (msg, type = "success") => {
    setSnackbar(msg);
    setSnackbarType(type);
    setTimeout(() => setSnackbar(""), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lead?.id) return;

    setLoading(true);
    setCalendarError(null);
    setRetryAttempts(0);
    let calendarResult = null;

    try {
      // Input validation
      if (!remarks.trim()) {
        showSnackbar("Please enter meeting remarks before saving.", "warning");
        setLoading(false);
        return;
      }

      // Save to Firebase first (critical path)
      const docRef = doc(db, "leads", lead.id);
      const snapshot = await getDoc(docRef);
      const leadData = snapshot.data() || {};
      const existing = leadData.followup || {};

      // Limit to 10 follow-ups
      const entries = Object.entries(existing);
      if (entries.length >= 10) {
        const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        delete existing[sorted[0][0]];
      }

      const newKey = `follow${Date.now()}`;
      const formattedTime = getFullTimeString();

      // Create proper datetime for scheduled meeting
      const scheduledDateTime = dayjs(
        `${date} ${get24HourTime()}`
      ).toISOString();
      const scheduledTimestamp = dayjs(`${date} ${get24HourTime()}`).valueOf();

      // Filter out undefined values to prevent Firebase errors
      const followupData = {
        date,
        time: formattedTime // Display time like "03:00 PM"
          , time24: get24HourTime() // 24-hour format for parsing
          , scheduledDateTime // ISO string for precise datetime
          , scheduledTimestamp // Timestamp for the actual meeting time
          , remarks: remarks.trim()
          , timestamp: Date.now() // Creation timestamp
          , formattedDate: dayjs(date).format("MMM D, YYYY")
          , createdBy: accounts[0]?.username || "Unknown",
        // Add lead info for alerts - filter out undefined values
        businessName: lead.businessName || null,
      };

      // Only add these fields if they exist and are not undefined
      if (lead.pocName !== undefined && lead.pocName !== null) {
        followupData.pocName = lead.pocName;
      }
      if (lead.email !== undefined && lead.email !== null) {
        followupData.email = lead.email;
      }
      if (lead.phone !== undefined && lead.phone !== null) {
        followupData.phone = lead.phone;
      }

      existing[newKey] = followupData;

      await updateDoc(docRef, { followup: existing });
      logInfo("Follow-up saved to Firebase");

      // Try calendar event creation (non-critical path)
      calendarResult = await createCalendarEvent();

      if (calendarResult?.success && calendarResult?.eventId) {
        existing[newKey].calendarEventId = calendarResult.eventId;
        existing[newKey].calendarWebLink = calendarResult.webLink;
        await updateDoc(docRef, { followup: existing });
        logInfo("Calendar event ID saved to follow-up record");
      }

      await fetchPastFollowups();

      // Handle success/failure appropriately
      if (calendarResult?.success) {
        // Reset form
        setRemarks("");
        setDate(dayjs().format("YYYY-MM-DD"));
        setTime({ hours: 12, minutes: 0, ampm: "AM" });
        showSnackbar("Meeting scheduled successfully in your calendar!", "success");
        setTimeout(() => {
          onClose();
        }, 1200); // Wait 1.2 seconds before closing
      } else {
        // Keep form data for retry, but show warning
        setShowCalendarWarning(true);
        // Don't close modal - let user retry with same data
      }
    } catch (err) {
      logError("Error saving follow-up:", err);
      showSnackbar("Failed to save follow-up. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarRetry = async () => {
    setIsRetrying(true);
    setRetrySuccess(false);
    setCalendarError(null);

    // Validate that we still have the required data for retry
    if (!remarks.trim()) {
      setCalendarError(
        "Cannot retry: Meeting notes are missing. Please enter meeting details and try again."
      );
      setIsRetrying(false);
      return;
    }

    try {
      const result = await createCalendarEvent();

      if (result?.success) {
        setRetrySuccess(true);
        setShowCalendarWarning(false);
        setRetryAttempts(0);

        // Update the existing follow-up record with calendar info
        try {
          const docRef = doc(db, "leads", lead.id);
          const snapshot = await getDoc(docRef);
          const leadData = snapshot.data() || {};
          const existing = leadData.followup || {};

          // Find the most recent follow-up and add calendar info
          const entries = Object.entries(existing);
          if (entries.length > 0) {
            const sorted = entries.sort(
              (a, b) => b[1].timestamp - a[1].timestamp
            );
            const latestKey = sorted[0][0];
            existing[latestKey].calendarEventId = result.eventId;
            existing[latestKey].calendarWebLink = result.webLink;
            await updateDoc(docRef, { followup: existing });
            await fetchPastFollowups();
          }
        } catch (updateErr) {
          logError("Failed to update follow-up with calendar info:", updateErr);
        }

        // Show success and close
        setTimeout(() => {
          showSnackbar("✅ Calendar event created successfully!", "success");
          // Reset form and close
          setRemarks("");
          setDate(dayjs().format("YYYY-MM-DD"));
          setTime({ hours: 12, minutes: 0, ampm: "AM" });
          onClose();
        }, 1000);
      } else {
        // Retry failed
        setRetryAttempts((prev) => prev + 1);
        setCalendarError(result.error || "Retry failed - unknown error");

        // If too many attempts, suggest manual creation
        if (retryAttempts >= 2) {
          setCalendarError(
            `Failed after ${
              retryAttempts + 1
            } attempts. The issue might be with Microsoft 365 service. Please try creating the calendar event manually.`
          );
        }
      }
    } catch (error) {
      setRetryAttempts((prev) => prev + 1);
      setCalendarError(error.message || "Retry failed unexpectedly");
    } finally {
      setIsRetrying(false);
    }
  };

  const toggleTimePicker = (e) => {
    e.stopPropagation();
    setShowTimePicker(!showTimePicker);
  };

  const handleTimeChange = (field, value) => {
    setTime((prev) => {
      let newValue = Number(value);

      if (field === "hours") {
        if (newValue > 12) newValue = 1;
        if (newValue < 1) newValue = 12;
        if (isNaN(newValue)) newValue = 12;
      }

      if (field === "minutes") {
        if (newValue > 59) newValue = 0;
        if (newValue < 0) newValue = 55;
        if (isNaN(newValue)) newValue = 0;
        newValue = Math.round(newValue / 5) * 5;
      }

      return {
        ...prev,
        [field]: newValue,
      };
    });
  };

  const increment = (field) => {
    if (field === "hours") {
      const newValue = time.hours === 12 ? 1 : time.hours + 1;
      handleTimeChange("hours", newValue);
    } else {
      const newValue = time.minutes === 55 ? 0 : time.minutes + 5;
      handleTimeChange("minutes", newValue);
    }
  };

  const decrement = (field) => {
    if (field === "hours") {
      const newValue = time.hours === 1 ? 12 : time.hours - 1;
      handleTimeChange("hours", newValue);
    } else {
      const newValue = time.minutes === 0 ? 55 : time.minutes - 5;
      handleTimeChange("minutes", newValue);
    }
  };

  const toggleAMPM = () => {
    setTime((prev) => ({
      ...prev,
      ampm: prev.ampm === "AM" ? "PM" : "AM",
    }));
  };

  const formatTimeValue = (value) => {
    return value < 10 ? `0${value}` : value;
  };

  const getFullTimeString = () => {
    return `${formatTimeValue(time.hours)}:${formatTimeValue(time.minutes)} ${
      time.ampm
    }`;
  };

  const get24HourTime = () => {
    let hours = time.hours;
    if (time.ampm === "PM" && hours < 12) hours += 12;
    if (time.ampm === "AM" && hours === 12) hours = 0;
    return `${formatTimeValue(hours)}:${formatTimeValue(time.minutes)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-9999 px-2 py-2">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto animate-modalIn">
        <div className="bg-linear-to-r from-blue-600 to-indigo-700 text-white p-3">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FaCalendarAlt className="text-yellow-300 text-sm" />
                Schedule Meeting
              </h2>
              <p className="text-blue-100 mt-0.5 text-sm">
                {lead.businessName} • {lead.pocName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-lg transition"
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Calendar Warning Banner */}
        {showCalendarWarning && (
          <div
            className={`border-l-4 p-3 m-3 rounded-lg transition-all duration-300 ${
              retrySuccess
                ? "bg-green-50 border-green-400"
                : retryAttempts >= 3
                ? "bg-red-50 border-red-400"
                : "bg-amber-50 border-amber-400"
            }`}
          >
            <div className="flex items-start">
              {retrySuccess ? (
                <div className="flex items-center text-green-600 mr-2">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Success!
                </div>
              ) : (
                <FaExclamationTriangle
                  className={`mr-2 mt-0.5 text-sm ${
                    retryAttempts >= 3 ? "text-red-400" : "text-amber-400"
                  }`}
                />
              )}

              <div className="flex-1">
                <p
                  className={`font-medium text-sm ${
                    retrySuccess
                      ? "text-green-800"
                      : retryAttempts >= 3
                      ? "text-red-800"
                      : "text-amber-800"
                  }`}
                >
                  {retrySuccess
                    ? "Calendar event created successfully!"
                    : retryAttempts >= 3
                    ? "Multiple retry attempts failed"
                    : "Follow-up saved, but calendar event creation failed"}
                </p>

                <div className="text-xs mt-1">
                  {retrySuccess ? (
                    <p className="text-green-700">
                      The meeting has been added to your Microsoft 365 calendar.
                    </p>
                  ) : (
                    <>
                      <p
                        className={
                          retryAttempts >= 3 ? "text-red-700" : "text-amber-700"
                        }
                      >
                        {calendarError || "Unable to create calendar event"}
                      </p>
                      {retryAttempts > 0 && (
                        <p className="text-gray-600 text-xs mt-0.5">
                          Attempt {retryAttempts + 1} of 3
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {!retrySuccess && (
                <div className="flex flex-col gap-1 ml-2">
                  {retryAttempts < 3 ? (
                    <button
                      onClick={handleCalendarRetry}
                      disabled={isRetrying}
                      className="bg-amber-600 text-white px-3 py-1.5 rounded text-xs hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 min-w-20 justify-center"
                    >
                      {isRetrying ? (
                        <>
                          <svg
                            className="animate-spin h-3 w-3"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Retrying...
                        </>
                      ) : (
                        `Retry${
                          retryAttempts > 0
                            ? ` (${3 - retryAttempts} left)`
                            : ""
                        }`
                      )}
                    </button>
                  ) : (
                    <div className="text-center">
                      <p className="text-red-600 text-xs mb-1">
                        Max retries reached
                      </p>
                      <button
                        onClick={() => {
                          const calendarUrl = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
                            `Meeting: ${lead.businessName}`
                          )}&body=${encodeURIComponent(remarks)}`;
                          window.open(calendarUrl, "_blank");
                        }}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                      >
                        Create Manually
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowCalendarWarning(false);
                      setRetryAttempts(0);
                      setCalendarError(null);
                      onClose();
                    }}
                    className={`px-3 py-1.5 rounded text-xs transition ${
                      retryAttempts >= 3
                        ? "text-red-600 hover:bg-red-100"
                        : "text-amber-600 hover:bg-amber-100"
                    }`}
                  >
                    {retryAttempts >= 3 ? "Close" : "Skip & Close"}
                  </button>
                </div>
              )}
            </div>

            {/* Progress indicator for retries */}
            {(isRetrying || retryAttempts > 0) && !retrySuccess && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Retry Progress</span>
                  <span>{retryAttempts}/3 attempts</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      retryAttempts >= 3 ? "bg-red-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${(retryAttempts / 3) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-2 md:p-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FaStickyNote className="text-indigo-600 text-sm" />
              New Meeting
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-600 font-medium mb-1.5 text-sm">
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  min={dayjs().format("YYYY-MM-DD")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="relative" ref={timePickerRef}>
                <label className="block text-gray-600 font-medium mb-1.5 text-sm">
                  Time *
                </label>
                <div
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-300 cursor-pointer hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200"
                  onClick={toggleTimePicker}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && toggleTimePicker(e)}
                >
                  <span className="text-gray-800 text-sm font-medium">
                    {getFullTimeString()}
                  </span>
                  <FaRegClock className="text-blue-600 text-sm" />
                </div>

                {showTimePicker && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <div className="flex items-center justify-center space-x-4">
                      {/* Hours */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => increment("hours")}
                          className="p-1.5 rounded-full hover:bg-gray-100 transition"
                          aria-label="Increase hours"
                        >
                          <FaChevronUp className="text-xs" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={time.hours}
                          onChange={(e) =>
                            handleTimeChange("hours", e.target.value)
                          }
                          className="w-12 text-center text-lg font-medium border-0 focus:ring-0"
                          aria-label="Hours"
                        />
                        <button
                          type="button"
                          onClick={() => decrement("hours")}
                          className="p-1.5 rounded-full hover:bg-gray-100 transition"
                          aria-label="Decrease hours"
                        >
                          <FaChevronDown className="text-xs" />
                        </button>
                        <span className="text-xs text-gray-500 mt-1">
                          Hours
                        </span>
                      </div>

                      <span className="text-lg font-bold">:</span>

                      {/* Minutes */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => increment("minutes")}
                          className="p-1.5 rounded-full hover:bg-gray-100 transition"
                          aria-label="Increase minutes"
                        >
                          <FaChevronUp className="text-xs" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="55"
                          step="5"
                          value={time.minutes}
                          onChange={(e) =>
                            handleTimeChange("minutes", e.target.value)
                          }
                          className="w-12 text-center text-lg font-medium border-0 focus:ring-0"
                          aria-label="Minutes"
                        />
                        <button
                          type="button"
                          onClick={() => decrement("minutes")}
                          className="p-1.5 rounded-full hover:bg-gray-100 transition"
                          aria-label="Decrease minutes"
                        >
                          <FaChevronDown className="text-xs" />
                        </button>
                        <span className="text-xs text-gray-500 mt-1">
                          Minutes
                        </span>
                      </div>

                      {/* AM/PM */}
                      <div className="flex flex-col items-center ml-2">
                        <button
                          type="button"
                          onClick={toggleAMPM}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition text-sm"
                          aria-label={`Switch to ${
                            time.ampm === "AM" ? "PM" : "AM"
                          }`}
                        >
                          {time.ampm}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1.5 text-sm">
                  Meeting Notes *
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  required
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                  placeholder="Meeting agenda, discussion points, objectives..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {remarks.length}/500 characters
                </p>
              </div>

              {/* --- Add this block for the checkbox --- */}
              <div>
                <label className="inline-flex items-center mt-2">
                  <input
                    type="checkbox"
                    checked={sendInvite}
                    onChange={(e) => setSendInvite(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                    disabled={!lead.email}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Send calendar invite to client{" "}
                    {lead.email ? `(${lead.email})` : "(no email available)"}
                  </span>
                </label>
              </div>
              {/* --- End checkbox block --- */}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || isCreatingEvent || !remarks.trim()}
                  className="bg-linear-to-r from-blue-600 to-indigo-700 hover:opacity-90 text-white px-5 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading
                    ? "Saving..."
                    : isCreatingEvent
                    ? "Creating Event..."
                    : "Schedule Meeting"}
                </button>
              </div>
            </form>
          </div>

          <div className="border-l border-gray-200 pl-4 lg:pl-6">
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FaRegClock className="text-indigo-600 text-sm" />
              Previous Meetings ({pastFollowups.length})
            </h3>

            {pastFollowups.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <FaCalendarAlt className="mx-auto text-2xl mb-2 opacity-50" />
                <p className="text-sm">No previous meetings</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto px-1 sm:px-0">
                {pastFollowups.map((followup, index) => (
                  <div
                    key={followup.key}
                    className="bg-white border border-gray-200 rounded-lg p-3 relative hover:shadow-md transition"
                  >
                    <button
                      onClick={() => {
                        setDeleteFollowupKey(followup.key);
                        setShowDeleteConfirm(true);
                      }}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition"
                      title="Delete this meeting"
                      aria-label="Delete meeting"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-medium text-gray-800 text-sm">
                          {followup.formattedDate ||
                            dayjs(followup.date).format("MMM D, YYYY")}
                        </span>
                        <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                          {followup.time}
                        </span>
                        {followup.calendarEventId && (
                          <span className="bg-green-100 text-green-600 text-xs font-medium px-2 py-0.5 rounded-full">
                            📅 In Calendar
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-xs line-clamp-2">
                        {followup.remarks}
                      </p>
                      <div className="mt-2 flex justify-between items-center">
                        <div>
                          {index === 0 ? (
                            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                              Latest
                            </span>
                          ) : (
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                              {followup.relativeTime}
                            </span>
                          )}
                        </div>
                        {followup.createdBy && (
                          <span className="text-xs text-gray-400">
                            by {followup.createdBy}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-10000">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
              <h2 className="text-lg font-bold mb-2">Cancel Meeting?</h2>
              <p className="mb-4 text-gray-700">
                Are you sure you want to cancel this meeting? This will also
                remove it from your calendar.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm"
                >
                  No, Keep Meeting
                </button>
                <button
                  onClick={async () => {
                    setShowDeleteConfirm(false);
                    await handleDeleteFollowup(deleteFollowupKey);
                    setDeleteFollowupKey(null);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Yes, Cancel Meeting
                </button>
              </div>
            </div>
          </div>
        )}

        {snackbar && (
          <div
            className="fixed bottom-6 right-6 z-12000 flex items-end"
            aria-live="polite"
            aria-atomic="true"
          >
            <div
              className={`
        px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fadeIn min-w-[260px]
        ${
          snackbarType === "success"
            ? "bg-green-600 text-white"
            : snackbarType === "error"
            ? "bg-red-600 text-white"
            : snackbarType === "warning"
            ? "bg-yellow-500 text-white"
            : "bg-blue-600 text-white"
        }
      `}
            >
              {/* Custom icon for delete success */}
              {snackbarType === "error" && snackbar === "Meeting deleted successfully from both CRM and calendar!" ? (
                <FaTrash className="w-5 h-5 text-white" />
              ) : snackbarType === "success" ? (
                <FaCheckCircle className="w-5 h-5 text-white" />
              ) : snackbarType === "error" ? (
                <FaTimesCircle className="w-5 h-5 text-white" />
              ) : snackbarType === "warning" ? (
                <FaExclamationTriangle className="w-5 h-5 text-white" />
              ) : snackbarType === "info" ? (
                <FaInfoCircle className="w-5 h-5 text-white" />
              ) : null}
              <span className="flex-1">{snackbar}</span>
              <button
                onClick={() => setSnackbar("")}
                className="ml-2 text-white/80 hover:text-white focus:outline-none"
                aria-label="Close notification"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .animate-modalIn {
          animation: modalIn 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.97) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeInRight 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default FollowUp;
