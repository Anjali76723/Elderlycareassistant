// client/src/pages/CaregiverReminders.jsx
import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { userDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

export default function CaregiverReminders() {
  const { serverUrl, userData, logout } = useContext(userDataContext);
  const [elderlyEmail, setElderlyEmail] = useState("");
  const [message, setMessage] = useState("");
  const [time, setTime] = useState("");
  const [repeat, setRepeat] = useState("none");
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReminders = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/reminder/caregiver`, {
        withCredentials: true,
      });
      setReminders(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("fetchReminders error", error);
      setErr(error?.response?.data?.message || "Failed to load reminders");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setErr("");
    if (!elderlyEmail || !message || !time) {
      setErr("Please fill all fields.");
      return;
    }
    try {
      setLoading(true);
      // Keep the same payload shape as original API expects:
      await axios.post(
        `${serverUrl}/api/reminder/create`,
        { elderlyEmail, message, time, repeat },
        { withCredentials: true }
      );
      setLoading(false);
      setElderlyEmail("");
      setMessage("");
      setTime("");
      setRepeat("none");
      fetchReminders();
    } catch (error) {
      setLoading(false);
      console.error("create reminder error", error);
      setErr(error?.response?.data?.message || "Error creating reminder");
    }
  };

  return (
    <div className="min-h-screen relative bg-[url('/elder2.jpeg')] bg-cover bg-center">
      {/* dark overlay for readability */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold text-white drop-shadow-md">
            Caregiver — Manage Reminders
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/alerts")}
              className="px-4 md:px-5 py-2 rounded-lg bg-gradient-to-tr from-red-500 to-red-400 text-white font-semibold shadow-lg hover:brightness-105 transition"
            >
              Open Alerts
            </button>
            <button
              onClick={async () => {
                try {
                  await logout?.();
                } catch (e) {
                  /* ignore */
                }
                navigate("/signin");
              }}
              className="px-4 md:px-5 py-2 rounded-lg bg-white/12 text-white font-medium shadow-sm hover:bg-white/20 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* CENTERED CARD */}
        <div className="mx-auto max-w-2xl">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl transform transition-all duration-300 hover:scale-[1.007]">
            {/* Form */}
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-white/90 font-medium mb-2">Elderly Email</label>
                <input
                  value={elderlyEmail}
                  onChange={(e) => setElderlyEmail(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white text-black placeholder:text-black/50"
                  placeholder="elderly@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/90 font-medium mb-2">Repeat</label>
                <select
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white text-black"
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-white/90 font-medium mb-2">Message</label>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white text-black placeholder:text-black/50"
                  placeholder="Take medication..."
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-white/90 font-medium mb-2">Time</label>
                <input
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  type="datetime-local"
                  className="w-full p-3 rounded-lg bg-white text-black"
                  required
                />
              </div>

              {err && (
                <div className="md:col-span-2 text-sm text-red-300">
                  {err}
                </div>
              )}

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-md hover:scale-[1.01] transition disabled:opacity-60"
                >
                  {loading ? "Creating..." : "Create Reminder"}
                </button>
              </div>
            </form>
          </div>

          {/* Reminders list */}
          <div className="mt-10">
            <h2 className="text-2xl text-white font-semibold mb-4">Your Reminders</h2>
            <div className="space-y-4">
              {reminders.length === 0 ? (
                <div className="text-white/80">No reminders yet.</div>
              ) : (
                reminders.map((r) => (
                  <div key={r._id} className="bg-white/6 border border-white/6 rounded-xl p-4 text-white">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="text-lg font-medium">{r.message}</div>
                        <div className="text-sm text-white/80 mt-1">
                          Elderly: {r.elderlyEmail || (r.elderlyId ? String(r.elderlyId) : "—")}
                        </div>
                        <div className="text-sm text-white/80 mt-1">
                          {r.time ? new Date(r.time).toLocaleString() : "Time not set"}
                        </div>
                      </div>
                      <div className="text-sm text-white/70">{r.repeat !== "none" ? `Repeat: ${r.repeat}` : "One-time"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
