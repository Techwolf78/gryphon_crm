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
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

const FollowUpCompany = ({ company, onClose }) => {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [time, setTime] = useState({
    hours: 12,
    minutes: 0,
    ampm: "AM",
  });
  const [remarks, setRemarks] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pastFollowups, setPastFollowups] = useState([]);
  const [calendarError, setCalendarError] = useState(null);
  const [showCalendarWarning, setShowCalendarWarning] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [sendInvite, setSendInvite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteFollowupKey, setDeleteFollowupKey] = useState(null);
  const [snackbar, setSnackbar] = useState("");
  const [snackbarType, setSnackbarType] = useState("success");
  const timePickerRef = useRef(null);

  const { instance, accounts } = useMsal();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const graphScopes = ["User.Read", "Calendars.ReadWrite"];

  // Replace all logInfo and logError calls with no-ops
  const logInfo = (...args) => console.log(...args);
  const logError = (...args) => console.error(...args);

  // Close time picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (timePickerRef.current && !timePickerRef.current.contains(event.target)) {
        setShowTimePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPastFollowups = useCallback(async () => {
    if (!company?.id) return;

    try {
      console.log("Fetching past follow-ups for company:", company);
      // For companies, follow-ups are stored within the company data in companyleads collection
      const lead = company; // company is passed as lead-like object
      if (!lead || !lead.batchId) return;

      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (batchDocSnap.exists()) {
        const batchData = batchDocSnap.data();
        const encodedCompanies = batchData.companies || [];
        const companyIndex = parseInt(lead.id.split('_').pop());

        if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
          let jsonString;
          try {
            const uriDecoded = atob(encodedCompanies[companyIndex]);
            jsonString = decodeURIComponent(uriDecoded);
          } catch (decodeError) {
            console.log("atob failed, trying decodeURIComponent directly");
            jsonString = decodeURIComponent(encodedCompanies[companyIndex]);
          }
          const decodedCompany = JSON.parse(jsonString);
          const followups = decodedCompany.followups || [];
          console.log("Fetched past follow-ups:", followups);
          setPastFollowups(followups);
        } else {
          console.error("Invalid company index in fetchPastFollowups:", companyIndex);
        }
      } else {
        console.error("Batch doc not found in fetchPastFollowups");
      }
    } catch (error) {
      console.error("Error fetching past follow-ups:", error);
      logError("Error fetching past follow-ups:", error);
    }
  }, [company]);

  const handleDeleteFollowup = async (followupKey) => {
    try {
      console.log("Deleting follow-up with key:", followupKey, "for company:", company);
      const lead = company;
      if (!lead || !lead.batchId) return;

      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (batchDocSnap.exists()) {
        const batchData = batchDocSnap.data();
        const encodedCompanies = batchData.companies || [];
        const companyIndex = parseInt(lead.id.split('_').pop());

        if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
          let jsonString;
          try {
            const uriDecoded = atob(encodedCompanies[companyIndex]);
            jsonString = decodeURIComponent(uriDecoded);
          } catch (decodeError) {
            console.log("atob failed, trying decodeURIComponent directly");
            jsonString = decodeURIComponent(encodedCompanies[companyIndex]);
          }
          const decodedCompany = JSON.parse(jsonString);
          const followups = decodedCompany.followups || [];
          const updatedFollowups = followups.filter(f => f.key !== followupKey);

          const updatedCompany = {
            ...decodedCompany,
            followups: updatedFollowups,
          };
          encodedCompanies[companyIndex] = btoa(JSON.stringify(updatedCompany));

          await setDoc(batchDocRef, {
            ...batchData,
            companies: encodedCompanies,
          });

          console.log("Successfully deleted follow-up");
          setPastFollowups(updatedFollowups);
          showSnackbar("Follow-up deleted successfully", "success");
        } else {
          console.error("Invalid company index in handleDeleteFollowup:", companyIndex);
        }
      } else {
        console.error("Batch doc not found in handleDeleteFollowup");
      }
    } catch (error) {
      console.error("Error deleting follow-up:", error);
      logError("Error deleting follow-up:", error);
      showSnackbar("Failed to delete follow-up", "error");
    }
    setShowDeleteConfirm(false);
    setDeleteFollowupKey(null);
  };

  useEffect(() => {
    fetchPastFollowups();
  }, [company, fetchPastFollowups]);

  const getAccessToken = async () => {
    if (accounts.length === 0) {
      throw new Error("No accounts available");
    }

    const request = {
      scopes: graphScopes,
      account: accounts[0],
    };

    try {
      const response = await instance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        const response = await instance.acquireTokenPopup(request);
        return response.accessToken;
      }
      throw error;
    }
  };

  const createCalendarEvent = async () => {
    setCalendarError(null);

    try {
      const accessToken = await getAccessToken();

      const eventDateTime = dayjs(`${date} ${get24HourTime()}`).format();
      const endDateTime = dayjs(eventDateTime).add(1, 'hour').format();

      const event = {
        subject: `Follow-up with ${company.companyName || company.name}`,
        body: {
          contentType: "HTML",
          content: remarks || "Scheduled follow-up meeting",
        },
        start: {
          dateTime: eventDateTime,
          timeZone: timezone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: timezone,
        },
        location: {
          displayName: "Virtual Meeting",
        },
        attendees: sendInvite ? [{
          emailAddress: {
            address: company.pocMail || company.email,
            name: company.pocName || company.contactPerson,
          },
          type: "required",
        }] : [],
      };

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to create calendar event");
      }

      const createdEvent = await response.json();
      logInfo("Calendar event created:", createdEvent);

      return createdEvent;
    } catch (error) {
      logError("Error creating calendar event:", error);
      setCalendarError(error.message);
      throw error;
    }
  };

  const showSnackbar = (msg, type = "success") => {
    setSnackbar(msg);
    setSnackbarType(type);
    setTimeout(() => setSnackbar(""), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Starting handleSubmit for company:", company);
      const followupData = {
        key: Date.now().toString(),
        date,
        time: getFullTimeString(),
        remarks,
        createdAt: new Date().toISOString(),
        calendarEventCreated: false,
      };

      let calendarEvent = null;

      // Always try to create calendar event (non-critical path)
      try {
        calendarEvent = await createCalendarEvent();
        followupData.calendarEventCreated = true;
        followupData.calendarEventId = calendarEvent.id;
      } catch (calendarErr) {
        logError("Calendar creation failed:", calendarErr);
        setShowCalendarWarning(true);
      }

      // Save follow-up to company data
      const lead = company;
      console.log("Lead object:", lead);
      if (!lead || !lead.batchId) {
        throw new Error("Invalid company data");
      }

      console.log("Fetching batchDoc for batchId:", lead.batchId);
      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (batchDocSnap.exists()) {
        console.log("Batch doc exists");
        const batchData = batchDocSnap.data();
        const encodedCompanies = batchData.companies || [];
        console.log("Encoded companies length:", encodedCompanies.length);
        const companyIndex = parseInt(lead.id.split('_').pop());
        console.log("Lead ID:", lead.id, "Parsed companyIndex:", companyIndex);

        if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
          console.log("Company index is valid, decoding company at index", companyIndex);
          let jsonString;
          try {
            const uriDecoded = atob(encodedCompanies[companyIndex]);
            jsonString = decodeURIComponent(uriDecoded);
          } catch (decodeError) {
            console.log("atob failed, trying decodeURIComponent directly");
            jsonString = decodeURIComponent(encodedCompanies[companyIndex]);
          }
          const decodedCompany = JSON.parse(jsonString);
          console.log("Decoded company:", decodedCompany);
          const followups = decodedCompany.followups || [];
          const updatedFollowups = [followupData, ...followups];

          const updatedCompany = {
            ...decodedCompany,
            followups: updatedFollowups,
          };
          console.log("Updated company with new followups");
          encodedCompanies[companyIndex] = btoa(JSON.stringify(updatedCompany));

          console.log("Saving updated batch data to Firestore");
          await setDoc(batchDocRef, {
            ...batchData,
            companies: encodedCompanies,
          });
          console.log("Successfully saved to Firestore");

          setPastFollowups(updatedFollowups);
          showSnackbar("Follow-up scheduled successfully!", "success");

          // Reset form
          setDate(dayjs().format("YYYY-MM-DD"));
          setTime({ hours: 12, minutes: 0, ampm: "AM" });
          setRemarks("");
          setSendInvite(false);
        } else {
          console.error("Invalid company index:", companyIndex, "for array length:", encodedCompanies.length);
          throw new Error("Company index out of bounds");
        }
      } else {
        console.error("Batch document does not exist for batchId:", lead.batchId);
        throw new Error("Batch document not found");
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      logError("Error saving follow-up:", error);
      showSnackbar("Failed to schedule follow-up", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarRetry = async () => {
    setIsRetrying(true);
    setRetryAttempts(prev => prev + 1);

    try {
      await createCalendarEvent();
      showSnackbar("Calendar event created successfully!", "success");
      setCalendarError(null);
      setShowCalendarWarning(false);
    } catch (error) {
      logError("Retry failed:", error);
      if (retryAttempts < 2) {
        showSnackbar("Retry failed, trying again...", "warning");
        setTimeout(() => handleCalendarRetry(), 2000);
      } else {
        showSnackbar("Failed to create calendar event after retries", "error");
        setIsRetrying(false);
      }
    }
  };

  const toggleTimePicker = (e) => {
    e.stopPropagation();
    setShowTimePicker(!showTimePicker);
  };

  const handleTimeChange = (field, value) => {
    setTime(prev => ({ ...prev, [field]: value }));
  };

  const increment = (field) => {
    setTime(prev => {
      const newTime = { ...prev };
      if (field === "hours") {
        newTime.hours = newTime.hours === 12 ? 1 : newTime.hours + 1;
      } else if (field === "minutes") {
        newTime.minutes = newTime.minutes === 59 ? 0 : newTime.minutes + 1;
      }
      return newTime;
    });
  };

  const decrement = (field) => {
    setTime(prev => {
      const newTime = { ...prev };
      if (field === "hours") {
        newTime.hours = newTime.hours === 1 ? 12 : newTime.hours - 1;
      } else if (field === "minutes") {
        newTime.minutes = newTime.minutes === 0 ? 59 : newTime.minutes - 1;
      }
      return newTime;
    });
  };

  const toggleAMPM = () => {
    setTime(prev => ({
      ...prev,
      ampm: prev.ampm === "AM" ? "PM" : "AM",
    }));
  };

  const formatTimeValue = (value) => {
    return value.toString().padStart(2, "0");
  };

  const getFullTimeString = () => {
    return `${formatTimeValue(time.hours)}:${formatTimeValue(time.minutes)} ${time.ampm}`;
  };

  const get24HourTime = () => {
    let hours = time.hours;
    if (time.ampm === "PM" && hours !== 12) hours += 12;
    if (time.ampm === "AM" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${time.minutes.toString().padStart(2, "0")}:00`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Schedule Follow-up</h2>
              <p className="text-blue-100 mt-1">
                Company: {company.companyName || company.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={toggleTimePicker}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center justify-between"
                  >
                    <span>{getFullTimeString()}</span>
                    <FaRegClock className="text-gray-400" />
                  </button>

                  {showTimePicker && (
                    <div
                      ref={timePickerRef}
                      className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-4"
                    >
                      <div className="grid grid-cols-3 gap-4 items-center">
                        <div className="text-center">
                          <label className="block text-xs text-gray-500 mb-1">Hours</label>
                          <div className="flex flex-col items-center">
                            <button
                              type="button"
                              onClick={() => increment("hours")}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <FaChevronUp size={12} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={time.hours}
                              onChange={(e) => handleTimeChange("hours", parseInt(e.target.value) || 1)}
                              className="w-12 text-center border-none focus:ring-0 text-lg font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => decrement("hours")}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <FaChevronDown size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="text-center">
                          <label className="block text-xs text-gray-500 mb-1">Minutes</label>
                          <div className="flex flex-col items-center">
                            <button
                              type="button"
                              onClick={() => increment("minutes")}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <FaChevronUp size={12} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={time.minutes}
                              onChange={(e) => handleTimeChange("minutes", parseInt(e.target.value) || 0)}
                              className="w-12 text-center border-none focus:ring-0 text-lg font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => decrement("minutes")}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <FaChevronDown size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="text-center">
                          <label className="block text-xs text-gray-500 mb-1">AM/PM</label>
                          <button
                            type="button"
                            onClick={toggleAMPM}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                          >
                            {time.ampm}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add notes about this follow-up..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Calendar Integration */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FaCalendarAlt className="text-blue-600" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Calendar Integration</h4>
                    <p className="text-xs text-blue-700">Meeting will be added to your Outlook calendar</p>
                  </div>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sendInvite}
                    onChange={(e) => setSendInvite(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-blue-900">Send invite to client</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <FaCalendarAlt className="mr-2" />
                    Schedule Follow-up
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Past Follow-ups */}
          {pastFollowups.length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Past Follow-ups</h3>
              <div className="space-y-3">
                {pastFollowups.map((followup) => (
                  <div key={followup.key} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <FaRegClock className="text-gray-400" size={14} />
                          <span className="text-sm font-medium text-gray-900">
                            {followup.date} at {followup.time}
                          </span>
                          {followup.calendarEventCreated && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              <FaCheckCircle className="mr-1" size={10} />
                              In Calendar
                            </span>
                          )}
                        </div>
                        {followup.remarks && (
                          <div className="flex items-start space-x-2">
                            <FaStickyNote className="text-gray-400 mt-0.5" size={14} />
                            <p className="text-sm text-gray-600">{followup.remarks}</p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setDeleteFollowupKey(followup.key);
                          setShowDeleteConfirm(true);
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <div className="flex items-center mb-4">
                <FaExclamationTriangle className="text-red-500 mr-3" size={24} />
                <h3 className="text-lg font-semibold text-gray-900">Delete Follow-up</h3>
              </div>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this follow-up? This action cannot be undone.</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteFollowup(deleteFollowupKey)}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Snackbar */}
        {snackbar && (
          <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white z-50 ${
            snackbarType === "success" ? "bg-green-500" :
            snackbarType === "error" ? "bg-red-500" :
            snackbarType === "warning" ? "bg-yellow-500" : "bg-blue-500"
          }`}>
            {snackbarType === "success" && <FaCheckCircle className="inline mr-2" />}
            {snackbarType === "error" && <FaTimesCircle className="inline mr-2" />}
            {snackbarType === "warning" && <FaExclamationTriangle className="inline mr-2" />}
            {snackbarType === "info" && <FaInfoCircle className="inline mr-2" />}
            {snackbar}
          </div>
        )}

        {/* Calendar Warning */}
        {showCalendarWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <FaExclamationTriangle className="text-yellow-500 mr-3" size={24} />
                <h3 className="text-lg font-semibold text-gray-900">Calendar Event Failed</h3>
              </div>
              <p className="text-gray-600 mb-4">
                The follow-up was saved, but we couldn't create the calendar event. Would you like to retry?
              </p>
              {calendarError && (
                <p className="text-sm text-red-600 mb-4">Error: {calendarError}</p>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCalendarWarning(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Skip
                </button>
                <button
                  onClick={handleCalendarRetry}
                  disabled={isRetrying}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {isRetrying ? "Retrying..." : "Retry"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowUpCompany;