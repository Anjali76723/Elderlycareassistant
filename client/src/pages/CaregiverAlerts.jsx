// client/src/pages/CaregiverAlerts.jsx
import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { userDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

export default function CaregiverAlerts() {
  const { serverUrl, socket, logout } = useContext(userDataContext);
  const [alerts, setAlerts] = useState([]);
  const navigate = useNavigate();

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/emergency/list`, { withCredentials: true });
      setAlerts(res.data || []);
    } catch (err) {
      console.error("fetchAlerts error:", err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onEmergency = ({ alert }) => {
      setAlerts((prev) => [alert, ...prev]);

      try {
        const utter = new SpeechSynthesisUtterance(
          `Emergency from ${alert.elderlyId ? alert.elderlyId : "an elderly person"}. ${alert.message}`
        );
        utter.lang = "en-IN";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } catch (e) {
        console.warn("TTS error on caregiver side", e);
      }

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("🚨 Emergency Alert", { body: alert.message || "Emergency" });
      }
    };

    const onUpdate = ({ alert }) => {
      setAlerts((prev) => prev.map((a) => (a._id === alert._id ? alert : a)));
    };

    socket.on("emergency", onEmergency);
    socket.on("emergency-update", onUpdate);

    return () => {
      socket.off("emergency", onEmergency);
      socket.off("emergency-update", onUpdate);
    };
  }, [socket]);

  const acknowledge = async (id) => {
    try {
      await axios.post(`${serverUrl}/api/emergency/ack/${id}`, {}, { withCredentials: true });
      setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, status: "acknowledged" } : a)));
    } catch (err) {
      console.error("acknowledge error:", err);
    }
  };

  const resolve = async (id) => {
    try {
      await axios.post(`${serverUrl}/api/emergency/resolve/${id}`, {}, { withCredentials: true });
      setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, status: "resolved" } : a)));
    } catch (err) {
      console.error("resolve error:", err);
    }
  };

  return (
    <div className="min-h-screen relative bg-[url('/elder2.jpeg')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {/* header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🚨</span>
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md">Emergency Alerts</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/caregiver/reminders")}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md transition transform hover:-translate-y-0.5 text-sm"
            >
              Reminders
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white shadow transition text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Alerts list */}
        <div className="space-y-5">
          {alerts.length === 0 && (
            <div className="p-4 md:p-5 rounded-lg bg-white/6 border border-white/8 backdrop-blur-sm text-white/90">
              <div className="text-lg font-medium">No alerts yet</div>
              <div className="text-sm text-white/70 mt-1">
                Alerts will appear here when received from elderly users.
              </div>
            </div>
          )}

          {alerts.map((a) => (
            <article
              key={a._id}
              className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 md:p-5 rounded-lg bg-white/6 border border-white/6 backdrop-blur-sm shadow-sm transition transform hover:-translate-y-0.5"
              role="region"
              aria-labelledby={`alert-${a._id}`}
            >
              <div className="flex-1 min-w-0">
                <h2 id={`alert-${a._id}`} className="text-lg md:text-xl font-semibold text-white truncate">
                  {a.message || "No message"}
                </h2>
                <p className="text-sm text-white/75 mt-1">{a.location?.address || "No location"}</p>

                <div className="flex items-center gap-3 mt-3">
                  <span className="text-sm text-white/80">
                    <span className="font-semibold">Status:</span>{" "}
                    <span className="capitalize">
                      {a.status}
                    </span>
                  </span>
                  {a.createdAt && (
                    <span className="text-xs text-white/60 ml-2">
                      • {new Date(a.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {a.status === "open" && (
                  <button
                    onClick={() => acknowledge(a._id)}
                    className="px-4 py-2 rounded-md bg-gradient-to-r from-amber-500 to-orange-400 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-sm font-medium"
                  >
                    Acknowledge
                  </button>
                )}
                {a.status !== "resolved" && (
                  <button
                    onClick={() => resolve(a._id)}
                    className="px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-green-400 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-sm font-medium"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
