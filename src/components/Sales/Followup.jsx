import React, { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { StaticTimePicker } from "@mui/x-date-pickers/StaticTimePicker";

import {
  FaRegClock,
  FaTimes,
  FaCalendarAlt,
  FaStickyNote,
} from "react-icons/fa";

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";  // <-- fixed import here

const FollowUp = ({ lead, onClose }) => {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [time, setTime] = useState(dayjs());
  const [remarks, setRemarks] = useState("");
  const [showClock, setShowClock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pastFollowups, setPastFollowups] = useState([]);
  const [timeView, setTimeView] = useState("hours");

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
      const formattedTime = time.format("hh:mm A");

      existing[newKey] = {
        date,
        time: formattedTime,
        remarks,
        timestamp: Date.now(),
        formattedDate: dayjs(date).format("MMM D, YYYY"),
      };

      await updateDoc(docRef, { followup: existing });
      onClose();
    } catch (err) {
      console.error("Error saving followup:", err);
      alert("Failed to save follow-up.\n" + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!lead || !lead.id) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-[9999] px-4 py-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <FaCalendarAlt className="text-yellow-300" />
                Schedule Follow Up
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
              New Follow Up
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

              <div>
                <label className="block text-gray-600 font-medium mb-2">
                  Time
                </label>
                <div
                  onClick={() => {
                    setTimeView("hours");
                    setShowClock(true);
                  }}
                  className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-300 cursor-pointer hover:border-blue-400"
                >
                  <span className="text-gray-800 text-lg font-medium">
                    {time.format("hh:mm A")}
                  </span>
                  <FaRegClock className="text-blue-600 text-xl" />
                </div>

                {showClock && (
                  <div className="mt-3 bg-white border rounded-xl shadow-lg">
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <StaticTimePicker
                        displayStaticWrapperAs="mobile"
                        ampm
                        value={time}
                        onChange={(newValue) => {
                          if (timeView === "hours") {
                            setTime(newValue);
                            setTimeView("minutes");
                          } else {
                            setTime(newValue);
                            setShowClock(false);
                            setTimeView("hours");
                          }
                        }}
                        view={timeView}
                        onViewChange={(newView) => setTimeView(newView)}
                        slotProps={{
                          actionBar: { actions: [] },
                          toolbar: { hidden: true },
                        }}
                        className="time-picker"
                      />
                    </LocalizationProvider>
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
                  {loading ? "Saving..." : "Schedule Follow Up"}
                </button>
              </div>
            </form>
          </div>

          <div className="border-l border-gray-200 pl-6 md:pl-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaRegClock className="text-indigo-600" />
              Previous Followups
            </h3>

            {pastFollowups.length === 0 ? (
              <div className="bg-blue-50 rounded-xl p-5 text-center">
                <p className="text-gray-600">No previous followups recorded</p>
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
        .time-picker .MuiPickersLayout-content {
          padding: 0;
        }
        .time-picker .MuiDialogActions-root {
          display: none;
        }
        .time-picker .MuiPickersLayout-actionBar {
          margin-top: 0;
        }
        .time-picker .MuiPickersToolbar-root {
          min-height: 100px;
          padding: 16px;
        }
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
      `}</style>
    </div>
  );
};

export default FollowUp;
