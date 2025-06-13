import React, { useState } from "react";
import { ref, get, update } from "firebase/database";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { StaticTimePicker } from "@mui/x-date-pickers/StaticTimePicker";
import { realtimeDb } from "../../firebase";
import { FaRegClock } from "react-icons/fa";

const FollowUp = ({ lead, onClose }) => {
  const [date, setDate] = useState("");
  const [time, setTime] = useState(dayjs());
  const [remarks, setRemarks] = useState("");
  const [showClock, setShowClock] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!lead || !lead.id) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const followRef = ref(realtimeDb, `leads/${lead.id}/followup`);

    try {
      const snapshot = await get(followRef);
      const existing = snapshot.val() || {};

      const entries = Object.entries(existing).map(([k, v]) => ({ key: k, ...v }));
      if (entries.length >= 6) {
        entries.sort((a, b) => a.timestamp - b.timestamp);
        delete existing[entries[0].key];
      }

      const newKey = `follow${Date.now()}`;
      const formattedTime = time.format("hh:mm A");
      existing[newKey] = { date, time: formattedTime, remarks, timestamp: Date.now() };

      await update(followRef, existing);
      alert("Follow-up saved!");
      setDate("");
      setTime(dayjs());
      setRemarks("");
      onClose();
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to save.\n" + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fadeIn px-6 py-6 relative border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-2">
          📅 Schedule Follow Up
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Date Input */}
          <div className="flex flex-col">
            <label className="text-gray-600 font-medium mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="rounded-lg border px-3 py-2 text-gray-700 shadow-inner outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Time Display + Clock Icon + Conditional Picker */}
          <div className="flex flex-col">
            <label className="text-gray-600 font-medium mb-2">Time</label>
            <div className="flex items-center justify-between bg-gray-100 rounded-lg px-4 py-2 border">
              <span className="text-gray-800 text-lg font-medium">
                {time.format("hh:mm A")}
              </span>
              <button
                type="button"
                onClick={() => setShowClock(!showClock)}
                className="text-blue-600 hover:text-blue-800 text-xl"
              >
                <FaRegClock />
              </button>
            </div>

            {showClock && (
              <div className="mt-3 bg-white border rounded-xl shadow-md overflow-hidden">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <StaticTimePicker
                    displayStaticWrapperAs="mobile"
                    ampm
                    value={time}
                    onChange={(newValue) => setTime(newValue)}
                  />
                </LocalizationProvider>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div className="flex flex-col">
            <label className="text-gray-600 font-medium mb-1">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              required
              rows={4}
              className="rounded-lg border px-3 py-2 text-gray-700 shadow-inner outline-none resize-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write your notes here..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FollowUp;
