// client/src/pages/ElderlyHome.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { userDataContext } from "../context/UserContext";
import axios from "axios";

export default function ElderlyHome() {
  // preserve existing behavior
  const { userData, socket, serverUrl, logout } = useContext(userDataContext);

  const [currentReminder, setCurrentReminder] = useState(null);
  const [newsHeadlines, setNewsHeadlines] = useState([]);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [listening, setListening] = useState(false);
  const [sendingEmergency, setSendingEmergency] = useState(false);

  // Bhajan modal state
  const [showBhajanModal, setShowBhajanModal] = useState(false);
  const [bhajanQuery, setBhajanQuery] = useState("bhajan");

  const synthRef = useRef(window.speechSynthesis);
  const recognitionRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const lastEmergencyAtRef = useRef(0);

  // Speak helper returns Promise and respects stopRequested flag
  const speakText = (text, lang = "en-IN") => {
    return new Promise((resolve) => {
      try {
        if (!text) return resolve();
        const synth = synthRef.current;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;

        isSpeakingRef.current = true;
        stopRequestedRef.current = false;

        u.onend = () => {
          isSpeakingRef.current = false;
          resolve();
        };
        u.onerror = (e) => {
          console.warn("utterance error", e);
          isSpeakingRef.current = false;
          resolve();
        };

        // cancel queued speech before speaking
        try { synth.cancel(); } catch (e) {}
        synth.speak(u);
      } catch (err) {
        console.error("speakText error", err);
        isSpeakingRef.current = false;
        resolve();
      }
    });
  };

  const stopSpeaking = () => {
    try {
      stopRequestedRef.current = true;
      const synth = synthRef.current;
      if (synth) synth.cancel();
    } catch (e) {
      console.warn("stopSpeaking error", e);
    } finally {
      isSpeakingRef.current = false;
      safeRestart(400);
    }
  };

  const safeRestart = (delay = 700) => {
    if (!recognitionRef.current) return;
    clearTimeout(restartTimeoutRef.current);
    restartTimeoutRef.current = setTimeout(() => {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // ignore invalid state
      }
    }, delay);
  };

  // NOTE: default emergency message changed to "Help me" per your request
  const sendEmergency = async (message = "Help me", sentVia = "voice") => {
    const now = Date.now();
    if (now - lastEmergencyAtRef.current < 30 * 1000) {
      await speakText("Emergency already sent. Please wait a moment.", "en-IN");
      safeRestart();
      return;
    }
    setSendingEmergency(true);
    lastEmergencyAtRef.current = now;
    try {
      const res = await axios.post(`${serverUrl}/api/emergency/alert`, { message, sentVia }, { withCredentials: true });
      console.log("sendEmergency response:", res.data);
      await speakText("Help is on the way. Your caregiver has been notified.", "en-IN");
    } catch (err) {
      console.error("sendEmergency error", err);
      await speakText("Sorry, I could not send the alert. Try again.", "en-IN");
    } finally {
      setSendingEmergency(false);
      safeRestart();
    }
  };

  // socket listener for reminders (unchanged)
  useEffect(() => {
    if (!socket) return;
    const onReminder = (payload) => {
      setCurrentReminder(payload);
      stopSpeaking();
      speakText(payload.message || "You have a reminder.", "hi-IN").then(() => safeRestart());
    };
    socket.on("reminder", onReminder);
    return () => socket.off("reminder", onReminder);
  }, [socket]);

  const ack = async (action, snoozeMinutes = 10) => {
    if (!currentReminder) return;
    try {
      await axios.post(`${serverUrl}/api/reminder/ack/${currentReminder.id}`, { action, snoozeMinutes }, { withCredentials: true });
      setCurrentReminder(null);
    } catch (err) {
      console.error(err);
      await speakText("Could not update reminder.", "en-IN");
    } finally {
      safeRestart();
    }
  };

  const speakNewsFull = async (headlineList = newsHeadlines) => {
    if (!headlineList || headlineList.length === 0) {
      await speakText("No news available right now.", "en-IN");
      safeRestart();
      return;
    }

    try { recognitionRef.current?.stop(); } catch (e) {}

    await speakText(`Reading ${headlineList.length} headlines.`, "en-IN");

    for (let i = 0; i < headlineList.length; i++) {
      if (stopRequestedRef.current) break;
      const h = headlineList[i];
      const source = h.source ? `Source ${h.source}.` : "";
      const published = h.publishedAt ? `Published on ${new Date(h.publishedAt).toLocaleString()}.` : "";
      const sentence = `${i + 1}. ${h.title}. ${source} ${published}`;
      await speakText(sentence, "en-IN");
      if (stopRequestedRef.current) break;
      await new Promise((r) => setTimeout(r, 120));
    }

    safeRestart();
  };

  const speakWeatherFull = async (w = weatherInfo) => {
    if (!w || !w.city) {
      await speakText("Weather information not available.", "en-IN");
      safeRestart();
      return;
    }

    try { recognitionRef.current?.stop(); } catch (e) {}
    const sentence = `Weather in ${w.city}. ${w.description}. Temperature ${Math.round(w.temp)} degrees Celsius. Feels like ${Math.round(w.feels_like)} degrees. Humidity ${w.humidity} percent. Wind speed ${Math.round(w.wind_speed || 0)} meters per second.`;
    await speakText(sentence, "en-IN");
    safeRestart();
  };

  // Recognition setup (unchanged except emergency keyword)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      if (!isSpeakingRef.current) safeRestart(500);
    };
    recognition.onerror = (err) => {
      console.warn("recognition error", err);
      setListening(false);
      safeRestart(600);
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim().toLowerCase();
      console.log("transcript:", transcript);

      if (isSpeakingRef.current) {
        safeRestart(600);
        return;
      }

      // Emergency trigger: "help me" (exact words) OR contains "sos" or contains "emergency"
      // (you asked to keep "help me" to trigger emergency)
      if (transcript === "help me" || transcript.includes("help me") || transcript.includes("sos") || transcript.includes("emergency")) {
        try { recognition.stop(); } catch (e) {}
        await speakText("I heard you. Sending an emergency alert now.", "en-IN");
        await sendEmergency("Help me", "voice");
        return;
      }

      // News
      if (transcript.includes("news") || transcript.includes("headline") || transcript.includes("samachar")) {
        try {
          const res = await axios.get(`${serverUrl}/api/assistant/news?pageSize=6`, { withCredentials: true });
          const headlines = res.data.headlines || [];
          setNewsHeadlines(headlines);

          if (!headlines.length) {
            await speakText("Sorry, I could not find any news right now.", "en-IN");
            safeRestart();
          } else {
            await speakNewsFull(headlines);
          }
        } catch (err) {
          console.error("news fetch error", err);
          await speakText("Sorry, I could not fetch the news.", "en-IN");
          safeRestart();
        }
        return;
      }

      // Weather
      if (transcript.includes("weather") || transcript.includes("mausam")) {
        try {
          const getPos = () =>
            new Promise((resolve) => {
              if (!navigator.geolocation) return resolve(null);
              navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                () => resolve(null),
                { maximumAge: 600000, timeout: 5000 }
              );
            });
          const loc = await getPos();
          let res;
          if (loc) {
            res = await axios.get(`${serverUrl}/api/assistant/weather?lat=${loc.lat}&lon=${loc.lon}`, { withCredentials: true });
          } else {
            const match = transcript.match(/weather in ([a-z\s]+)/);
            const city = match ? match[1].trim() : null;
            const cityParam = city ? `?city=${encodeURIComponent(city)}` : "";
            res = await axios.get(`${serverUrl}/api/assistant/weather${cityParam}`, { withCredentials: true });
          }
          const w = res.data;
          setWeatherInfo(w);
          await speakWeatherFull(w);
        } catch (err) {
          console.error("weather fetch error", err);
          await speakText("Sorry, I could not fetch weather right now.", "en-IN");
          safeRestart();
        }
        return;
      }

      // BHAVAN/ BHAJAN
      if (transcript.includes("bhajan") || transcript.includes("bhakti") || transcript.includes("kirtan") || transcript.includes("shabad")) {
        try { recognition.stop(); } catch (e) {}
        await speakText("Opening bhajans for you. Use the Open YouTube button in the popup.", "en-IN");
        setBhajanQuery("bhajan");
        setShowBhajanModal(true);
        safeRestart();
        return;
      }

      safeRestart(500);
    };

    recognitionRef.current = recognition;
    clearTimeout(restartTimeoutRef.current);
    restartTimeoutRef.current = setTimeout(() => {
      try { recognition.start(); } catch (e) {}
    }, 600);

    return () => {
      clearTimeout(restartTimeoutRef.current);
      try { recognition.stop(); } catch (e) {}
      recognitionRef.current = null;
    };
  }, [serverUrl]);

  if (!userData) return <div className="p-6">Loading...</div>;

  const openYouTubeTop = (query = "bhajan") => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      const evt = new MouseEvent("click", { view: window, bubbles: true, cancelable: true });
      a.dispatchEvent(evt);
      a.remove();
      return true;
    } catch (e) {
      console.warn("openYouTubeTop anchor method failed", e);
    }
    try {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (w) { try { w.focus(); } catch (e) {} return true; }
    } catch (e) { console.warn("openYouTubeTop window.open failed", e); }
    try { window.location.href = url; return true; } catch (e) { console.warn("final fallback failed", e); }
    return false;
  };

  return (
    <div className="relative w-full min-h-screen text-white">
      {/* Background image and overlay kept from your existing UI */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center transform-gpu will-change-transform motion-safe:animate-bg-slow-zoom"
        style={{ backgroundImage: "url('/elder2.jpeg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-[#02023d]/50 to-[#030353]/50 backdrop-blur-sm" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold drop-shadow-md">Hello {userData.name}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-lg shadow-md transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Reminder card */}
        {currentReminder ? (
          <div className="glass-card p-6 rounded-xl shadow-lg motion-safe:animate-card-enter">
            <h2 className="text-3xl mb-4 font-semibold text-white">Reminder</h2>
            <p className="text-2xl mb-4 text-white/95">{currentReminder.message}</p>
            <div className="flex gap-4">
              <button onClick={() => ack("taken")} className="flex-1 p-4 bg-green-600 hover:bg-green-500 text-white rounded text-xl transition">Taken ✓</button>
              <button onClick={() => ack("snooze", 10)} className="flex-1 p-4 bg-yellow-500 hover:bg-yellow-400 text-black rounded text-xl transition">Snooze 10m ⏰</button>
            </div>
          </div>
        ) : (
          <div className="glass-card p-6 rounded-xl shadow-lg motion-safe:animate-card-enter text-center">
            <div className="text-lg text-white/90">No active reminders right now.</div>
          </div>
        )}

        {/* News */}
        {newsHeadlines.length > 0 && (
          <div className="glass-card p-6 rounded-xl shadow-lg motion-safe:animate-card-enter">
            <h2 className="text-2xl font-semibold mb-3 text-white">Top Headlines</h2>
            <ol className="list-decimal ml-6 space-y-4 text-white/95">
              {newsHeadlines.map((h, i) => (
                <li key={i} className="p-4 bg-white/10 rounded-lg">
                  <div className="text-xl font-semibold mb-2">{h.title}</div>
                  <div className="text-sm text-white/70 mb-3">{h.source} • {h.publishedAt ? new Date(h.publishedAt).toLocaleString() : ""}</div>
                  <div className="flex gap-3">
                    <button onClick={() => { try { synthRef.current.cancel(); } catch(e){}; speakText(h.title); }} className="px-4 py-2 rounded bg-blue-600 text-white">Read aloud</button>
                    {h.url && <button onClick={() => window.open(h.url, "_blank")} className="px-4 py-2 rounded bg-white/90 text-black">Open article</button>}
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex gap-4">
              <button onClick={() => { stopRequestedRef.current = false; speakNewsFull(); }} className="px-6 py-3 rounded bg-blue-600 text-white text-lg">Repeat</button>
              <button onClick={() => stopSpeaking()} className="px-6 py-3 rounded bg-red-500 text-white text-lg">Stop</button>
            </div>
          </div>
        )}

        {/* Weather */}
        {weatherInfo && weatherInfo.city && (
          <div className="glass-card p-6 rounded-xl shadow-lg motion-safe:animate-card-enter">
            <h2 className="text-2xl font-semibold mb-2 text-white">Weather — {weatherInfo.city}</h2>
            <div className="text-xl mb-2 text-white/95">{weatherInfo.description}, {Math.round(weatherInfo.temp)}°C</div>
            <div className="text-xl text-white/95">Feels like {Math.round(weatherInfo.feels_like)} °C</div>
            <div className="text-lg mt-2 text-white/70">Humidity: {weatherInfo.humidity}% • Wind: {weatherInfo.wind_speed} m/s</div>
            <div className="mt-4">
              <button onClick={() => { try { synthRef.current.cancel(); } catch(e){}; speakText(`Weather in ${weatherInfo.city}. ${weatherInfo.description}. Temperature ${Math.round(weatherInfo.temp)} degrees Celsius.`); }} className="px-6 py-3 rounded bg-blue-600 text-white text-lg">Read Weather</button>
            </div>
          </div>
        )}

        {/* Bhajan modal */}
        {showBhajanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white w-full max-w-3xl h-[40vh] rounded-lg overflow-hidden relative p-6 flex flex-col items-center justify-center">
              <button onClick={() => setShowBhajanModal(false)} className="absolute top-3 right-3 px-3 py-1 bg-red-600 text-white rounded">Close</button>
              <h2 className="text-2xl font-semibold mb-4">Bhajans</h2>
              <p className="text-center mb-4">We will open bhajans in YouTube (new tab).</p>
              <div className="flex gap-4">
                <button onClick={() => { openYouTubeTop(bhajanQuery); setShowBhajanModal(false); }} className="px-6 py-3 rounded bg-blue-600 text-white text-lg">Open YouTube</button>
                <button onClick={() => setShowBhajanModal(false)} className="px-6 py-3 rounded bg-gray-300 text-black">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

     {/* SOS floating button */}
<button
  className="fixed bottom-8 right-8 z-50 sos-button motion-safe:sos-pulse"
  onClick={() => sendEmergency("Help me", "button")}
  disabled={sendingEmergency}
  aria-label="Send SOS emergency"
  title="Send emergency alert"
>
  {/* you can replace text with an icon + label */}
  <span className="sos-label">SOS</span>
</button>




      {/* mic indicator */}
      <div className="fixed bottom-8 left-8 bg-black/50 px-3 py-2 rounded text-white z-50">
        {listening ? "🎤 Listening..." : "Mic off"}
      </div>
    </div>
  );
}
