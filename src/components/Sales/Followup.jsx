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
} from "react-icons/fa";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

const FollowUp = ({ lead, onClose }) => {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  // To this:
  const [time, setTime] = useState({
    hours: 0, // 0 for 00:00 AM
    minutes: 0, // 00 minutes
    ampm: "AM", // AM period
  });
  const [remarks, setRemarks] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pastFollowups, setPastFollowups] = useState([]);
  const timePickerRef = useRef(null);

  const { instance, accounts } = useMsal();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const graphScopes = ["User.Read", "Calendars.ReadWrite"];

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
      console.error("Error fetching past followups:", err);
    }
  }, [lead?.id]);

  useEffect(() => {
    if (lead?.id) {
      setDate(dayjs().format("YYYY-MM-DD"));
      fetchPastFollowups();
    }
  }, [lead, fetchPastFollowups]);

  const getAccessToken = async () => {
    try {
      const response = await instance.acquireTokenSilent({
        scopes: graphScopes,
        account: accounts[0],
      });
      return response.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        const response = await instance.acquireTokenPopup({
          scopes: graphScopes,
        });
        return response.accessToken;
      } else {
        throw err;
      }
    }
  };

  const createCalendarEvent = async () => {
    try {
      if (!accounts[0]) {
        await instance.loginPopup({ scopes: graphScopes });
      }

      const accessToken = await getAccessToken();
      const time24 = get24HourTime();
      const eventStart = dayjs(`${date} ${time24}`);
      const eventEnd = eventStart.add(30, "minute");

      const event = {
        subject: `${lead.businessName} - Meeting`,
        body: {
          contentType: "HTML",
          content: remarks,
        },
        start: {
          dateTime: eventStart.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: eventEnd.toISOString(),
          timeZone: timezone,
        },
        attendees: lead.email
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
        reminderMinutesBeforeStart: 10,
      };

      await fetch("https://graph.microsoft.com/v1.0/me/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      console.log("Event created in Microsoft 365 calendar.");
    } catch (err) {
      console.error("Failed to create calendar event:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lead?.id) return;
    setLoading(true);

    try {
      const docRef = doc(db, "leads", lead.id);
      const snapshot = await getDoc(docRef);
      const leadData = snapshot.data() || {};
      const existing = leadData.followup || {};

      const entries = Object.entries(existing);
      if (entries.length >= 6) {
        const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        delete existing[sorted[0][0]];
      }

      const newKey = `follow${Date.now()}`;
      const formattedTime = getFullTimeString();

      existing[newKey] = {
        date,
        time: formattedTime,
        remarks,
        timestamp: Date.now(),
        formattedDate: dayjs(date).format("MMM D, YYYY"),
      };

      await updateDoc(docRef, { followup: existing });
      await createCalendarEvent();
      onClose();
    } catch (err) {
      console.error("Error saving followup:", err);
      alert("Failed to save follow-up.\n" + err.message);
    } finally {
      setLoading(false);
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
        // Handle looping for direct input
        if (newValue > 12) newValue = 1;
        if (newValue < 1) newValue = 12;
        if (isNaN(newValue)) newValue = 12;
      }

      if (field === "minutes") {
        // Handle looping for direct input
        if (newValue > 59) newValue = 0;
        if (newValue < 0) newValue = 55;
        if (isNaN(newValue)) newValue = 0;
        // Round to nearest 5
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
      // For hours: 1→2→...→12→1→2...
      const newValue = time.hours === 12 ? 1 : time.hours + 1;
      handleTimeChange("hours", newValue);
    } else {
      // For minutes: 0→5→...→55→0→5...
      const newValue = time.minutes === 55 ? 0 : time.minutes + 5;
      handleTimeChange("minutes", newValue);
    }
  };

  const decrement = (field) => {
    if (field === "hours") {
      // For hours: 12→11→...→1→12→11...
      const newValue = time.hours === 1 ? 12 : time.hours - 1;
      handleTimeChange("hours", newValue);
    } else {
      // For minutes: 0→55→50→...→5→0→55...
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-[9999] px-4 py-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <FaCalendarAlt className="text-yellow-300" />
                Schedule Meeting
              </h2>
              <p className="text-blue-100 mt-1">
                {lead.businessName} • {lead.pocName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-xl transition"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaStickyNote className="text-indigo-600" />
              New Meeting
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-gray-600 font-medium mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                />
              </div>

              <div className="relative" ref={timePickerRef}>
                <label className="block text-gray-600 font-medium mb-2">
                  Time
                </label>
                <div
                  className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-300 cursor-pointer hover:border-blue-400"
                  onClick={toggleTimePicker}
                >
                  <span className="text-gray-800 text-lg font-medium">
                    {getFullTimeString()}
                  </span>
                  <FaRegClock className="text-blue-600 text-xl" />
                </div>

                {showTimePicker && (
                  <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-4">
                    <div className="flex items-center justify-center space-x-6">
                      {/* Hours */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => increment("hours")}
                          className="p-2 rounded-full hover:bg-gray-100"
                        >
                          <FaChevronUp />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={time.hours}
                          onChange={(e) =>
                            handleTimeChange("hours", e.target.value)
                          }
                          className="w-16 text-center text-xl font-medium border-0 focus:ring-0"
                        />
                        <button
                          type="button"
                          onClick={() => decrement("hours")}
                          className="p-2 rounded-full hover:bg-gray-100"
                        >
                          <FaChevronDown />
                        </button>
                        <span className="text-sm text-gray-500 mt-1">
                          Hours
                        </span>
                      </div>

                      <span className="text-xl font-bold">:</span>

                      {/* Minutes */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => increment("minutes")}
                          className="p-2 rounded-full hover:bg-gray-100"
                        >
                          <FaChevronUp />
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
                          className="w-16 text-center text-xl font-medium border-0 focus:ring-0"
                        />
                        <button
                          type="button"
                          onClick={() => decrement("minutes")}
                          className="p-2 rounded-full hover:bg-gray-100"
                        >
                          <FaChevronDown />
                        </button>
                        <span className="text-sm text-gray-500 mt-1">
                          Minutes
                        </span>
                      </div>

                      {/* AM/PM */}
                      <div className="flex flex-col items-center ml-4">
                        <button
                          type="button"
                          onClick={toggleAMPM}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                        >
                          {time.ampm}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-2">
                  Remarks
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  required
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="Meeting notes, discussion points, next steps..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:opacity-90 text-white px-6 py-2.5 rounded-xl"
                >
                  {loading ? "Saving..." : "Schedule Meeting"}
                </button>
              </div>
            </form>
          </div>

          <div className="border-l border-gray-200 pl-6 md:pl-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaRegClock className="text-indigo-600" />
              Previous Meetings
            </h3>

            {pastFollowups.length === 0 ? (
              <div className="bg-blue-50 rounded-xl p-2 text-center text-base">
                <p className="text-gray-600">No previous meetings recorded</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {pastFollowups.map((followup, index) => (
                  <div
                    key={followup.key}
                    className="bg-white border border-gray-200 rounded-xl p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">
                          {followup.formattedDate ||
                            dayjs(followup.date).format("MMM D, YYYY")}
                        </span>
                        <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
                          {followup.time}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-2">{followup.remarks}</p>
                      <div className="mt-4">
                        {index === 0 ? (
                          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                            Latest
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                            {followup.relativeTime}
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
      </div>

      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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
      `}</style>
    </div>
  );
};

export default FollowUp;
