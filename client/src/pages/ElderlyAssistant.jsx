// client/src/pages/ElderlyAssistant.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { userDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

export default function ElderlyAssistant() {
  const { serverUrl, userData } = useContext(userDataContext);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Tap a button or Start Listening");
  const [headlines, setHeadlines] = useState([]);
  const [weather, setWeather] = useState(null);
  const synthRef = useRef(window.speechSynthesis);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (userData) {
      // initial greeting — cancel any previous speech, then speak
      try { synthRef.current.cancel(); } catch (e) {}
      speak(`Hello ${userData.name}. Say news, weather or bhajans, or press a button.`);
    }
    return () => synthRef.current.cancel();
    // eslint-disable-next-line
  }, []);

  // Speak text (no aggressive cancel inside this function)
  const speak = (text, lang = "hi-IN") => {
    try {
      if (!text) return;
      const ut = new SpeechSynthesisUtterance(text);
      ut.lang = lang;
      synthRef.current.speak(ut);
    } catch (e) {
      console.error("TTS error", e);
    }
  };

  // Speak headlines sequentially (await between them)
  const speakHeadlines = async (items) => {
    if (!items || items.length === 0) {
      speak("Sorry, no news found right now.");
      return;
    }

    // clear any existing speech so we start fresh
    try { synthRef.current.cancel(); } catch (e) {}

    // Intro
    await speakAndWait(`Here are the top ${items.length} headlines.`);

    // Speak each headline in order
    for (let i = 0; i < items.length; i++) {
      const h = items[i];
      // await so they play sequentially
      await speakAndWait(`Headline ${i + 1}: ${h.title}`);
    }
  };

  // Speak and return a promise resolved on utterance end
  const speakAndWait = (text, lang = "hi-IN") => {
    return new Promise((resolve) => {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.onend = () => setTimeout(resolve, 350); // small pause after each
        synthRef.current.speak(u);
      } catch (e) {
        console.error("speakAndWait error", e);
        // resolve immediately if TTS fails so UI doesn't hang
        resolve();
      }
    });
  };

  const fetchNews = async (count = 5) => {
    setStatus("Fetching headlines...");
    try {
      const res = await axios.get(`${serverUrl}/api/assistant/news?pageSize=${count}`, { withCredentials: true });
      const items = res.data.headlines || [];
      setHeadlines(items);
      setStatus(`Showing ${items.length} headlines`);

      // speak them (speakHeadlines cancels and queues correctly)
      await speakHeadlines(items);
    } catch (err) {
      console.error("fetchNews error", err);
      setStatus("Failed to fetch news");
      // ensure speech queue cleared and speak error
      try { synthRef.current.cancel(); } catch (e) {}
      speak("Sorry, I could not fetch news right now.");
    }
  };

  const fetchWeather = async (city) => {
    setStatus("Fetching weather...");
    try {
      const url = `${serverUrl}/api/assistant/weather` + (city ? `?city=${encodeURIComponent(city)}` : "");
      const res = await axios.get(url, { withCredentials: true });
      const w = res.data.weather;
      setWeather(w);
      setStatus(`Weather for ${w?.city || city}`);

      // cancel any ongoing TTS and then announce weather
      try { synthRef.current.cancel(); } catch (e) {}
      if (w) {
        await speakAndWait(`Weather in ${w.city}. ${w.description}. Temperature ${Math.round(w.temp)} degrees Celsius. Humidity ${w.humidity} percent.`);
      } else {
        speak("Sorry, no weather information available.");
      }
    } catch (err) {
      console.error("fetchWeather error", err);
      setStatus("Failed to fetch weather");
      try { synthRef.current.cancel(); } catch (e) {}
      speak("Sorry, I could not fetch weather right now.");
    }
  };
 const openBhajans = (query = "bhajan") => {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  // 1) anchor click with _blank
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
    return;
  } catch (e) {
    console.warn("anchor click failed", e);
  }

  // 2) try top.open
  try {
    if (window.top && window.top !== window) {
      const w = window.top.open(url, "_blank", "noopener,noreferrer");
      if (w) { try { w.focus(); } catch (e) {} return; }
    }
  } catch (e) {
    console.warn("top.open failed", e);
  }

  // 3) fallback to window.open
  try { const w2 = window.open(url, "_blank", "noopener,noreferrer"); if (w2) { try { w2.focus(); } catch(e){} return; } } catch(e){}

  // 4) final fallback: navigate current tab
  try { window.location.href = url; } catch (e) { console.warn("all attempts failed", e); }
};


  
  // Voice recognition for commands on this page
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setStatus("Listening...");
    };

    recognition.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim().toLowerCase();
      setStatus(`Heard: ${transcript}`);
      handleCommand(transcript);
    };

    recognition.onend = () => {
      setListening(false);
      setStatus("Stopped listening");
    };

    recognition.onerror = (err) => {
      console.warn("recognition error", err);
      setListening(false);
      setStatus("Recognition error");
      speak("Sorry, I couldn't hear you. Try again.");
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) { console.warn(e); }
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch (e) {}
    setListening(false);
  };

  const handleCommand = (text) => {
    if (text.includes("news") || text.includes("headline")) {
      fetchNews(5);
      return;
    }
    if (text.includes("weather")) {
      const m = text.match(/weather in ([a-zA-Z\s]+)/);
      const city = m ? m[1].trim() : undefined;
      fetchWeather(city);
      return;
    }
    if (text.includes("bhajan") || text.includes("bhakti") || text.includes("kirtan")) {
      // open bhajans (no TTS before opening)
      openBhajans();
      return;
    }
    speak("I did not understand. Say news, weather, or bhajans.");
  };

  // UI
  return (
    <div className="min-h-screen p-6 bg-gradient-to-t from-[#02023d] to-[#030353] text-white flex flex-col items-center gap-6">
      <h1 className="text-3xl font-semibold">Voice Assistant</h1>
      <p className="text-lg">{status}</p>

      <div className="flex gap-3">
        <button onClick={() => fetchNews(5)} className="px-6 py-4 bg-white text-black rounded-lg text-xl">Speak Top News</button>
        <button onClick={() => fetchWeather()} className="px-6 py-4 bg-white text-black rounded-lg text-xl">Weather</button>
        <button onClick={openBhajans} className="px-6 py-4 bg-yellow-400 text-black rounded-lg text-xl">Play Bhajans</button>
      </div>

      <div className="mt-4">
        {!listening ? (
          <button onClick={startListening} className="px-8 py-4 bg-green-600 rounded-lg text-xl">Start Listening</button>
        ) : (
          <button onClick={stopListening} className="px-8 py-4 bg-red-600 rounded-lg text-xl">Stop Listening</button>
        )}
      </div>

      <div className="w-full max-w-3xl mt-6 space-y-4">
        {headlines.length > 0 && (
          <div className="bg-white text-black p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-3">Top Headlines</h2>
            <ol className="list-decimal ml-6 space-y-4">
              {headlines.map((h, i) => (
                <li key={i} className="p-4 bg-gray-100 rounded-lg">
                  <div className="text-xl font-semibold mb-2">{h.title}</div>
                  <div className="text-sm text-gray-700 mb-3">{h.source} • {new Date(h.publishedAt).toLocaleString()}</div>
                  <div className="flex gap-3">
                    <button onClick={() => { try { synthRef.current.cancel(); } catch(e){}; speak(h.title); }} className="px-4 py-2 rounded bg-blue-600 text-white">Read aloud</button>
                    <button onClick={() => window.open(h.url, "_blank")} className="px-4 py-2 rounded bg-gray-300 text-black">Open article</button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {weather && (
          <div className="bg-white text-black p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-2">Weather — {weather.city}</h2>
            <div className="text-xl mb-2">{weather.description}</div>
            <div className="text-xl">Temp: {Math.round(weather.temp)} °C — Feels like {Math.round(weather.feels_like)} °C</div>
            <div className="text-lg mt-2">Humidity: {weather.humidity}% • Wind: {weather.wind_speed} m/s</div>
            <div className="mt-4">
              <button onClick={() => { try { synthRef.current.cancel(); } catch(e){}; speak(`Weather in ${weather.city}. ${weather.description}. Temperature ${Math.round(weather.temp)} degrees Celsius.`); }} className="px-6 py-3 rounded bg-blue-600 text-white text-lg">Read Weather</button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto">
        <button onClick={() => navigate("/")} className="text-white/80 underline">Back to Home</button>
      </div>
    </div>
  );
}
