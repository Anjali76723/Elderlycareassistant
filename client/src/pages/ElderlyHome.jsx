// client/src/pages/ElderlyHome.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { userDataContext } from "../context/UserContext";
import api from "../utils/axiosConfig";
import debugAPI, { debugAPI as testDebugAPI } from "../utils/debugAxios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CaregiverDebugger from '../components/CaregiverDebugger';
import SimpleTest from '../components/SimpleTest';

export default function ElderlyHome() {
  // Get context values
  const { userData, socket, serverUrl, logout } = useContext(userDataContext);

  const [currentReminder, setCurrentReminder] = useState(null);
  const [newsHeadlines, setNewsHeadlines] = useState([]);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [listening, setListening] = useState(false);
  const [sendingEmergency, setSendingEmergency] = useState(false);

  // Modal states
  const [showBhajanModal, setShowBhajanModal] = useState(false);
  const [bhajanQuery, setBhajanQuery] = useState("bhajan");
  const [showCaregiverModal, setShowCaregiverModal] = useState(false);
  const [caregivers, setCaregivers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    receiveSMS: true,
    isPrimary: false
  });
  const [editingId, setEditingId] = useState(null);

  const synthRef = useRef(window.speechSynthesis);
  const recognitionRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const lastEmergencyAtRef = useRef(0);

  // Inject beautiful calming CSS for elderly-friendly design
  useEffect(() => {
    const id = "elderly-home-styles";
    if (document.getElementById(id)) return;
    const css = `
      @keyframes soft-gradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      @keyframes gentle-float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }

      @keyframes soft-glow {
        0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
        50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.6); }
      }

      @keyframes pulse-gentle {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.9; }
      }

      .calm-gradient-bg {
        background: linear-gradient(-45deg, #ffecd2, #fcb69f, #a8edea, #fed6e3, #c3cfe2);
        background-size: 400% 400%;
        animation: soft-gradient 20s ease infinite;
      }

      .soft-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border: 2px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 15px 45px rgba(0, 0, 0, 0.1);
        transition: all 0.4s ease;
      }

      .soft-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      }

      .action-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .action-button:hover:not(:disabled) {
        transform: translateY(-3px) scale(1.02);
        box-shadow: 0 15px 35px rgba(102, 126, 234, 0.4);
      }

      .action-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        transition: left 0.5s;
      }

      .action-button:hover::before {
        left: 100%;
      }

      .sos-button-new {
        background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
        animation: pulse-gentle 2s ease-in-out infinite;
        box-shadow: 0 10px 30px rgba(255, 107, 107, 0.4);
      }

      .sos-button-new:hover {
        animation: none;
        transform: scale(1.1);
        box-shadow: 0 15px 40px rgba(255, 107, 107, 0.6);
      }

      @media (prefers-reduced-motion: reduce) {
        .calm-gradient-bg, .action-button::before, .sos-button-new { animation: none; }
      }
    `;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = css;
    document.head.appendChild(style);
  }, []);

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
        // Ignore errors when starting recognition
      }
    }, delay);
  };

  // Send emergency alert to caregivers
  const sendEmergency = async (message = "Help me", sentVia = "voice") => {
    const now = Date.now();
    if (now - lastEmergencyAtRef.current < 30 * 1000) {
      await speakText("Emergency already sent. Please wait a moment.", "en-IN");
      return;
    }
    
    setSendingEmergency(true);
    lastEmergencyAtRef.current = now;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get user location if available
      let location = null;
      try {
        if (navigator.geolocation) {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        }
      } catch (geoErr) {
        console.warn("Could not get location:", geoErr);
      }

      const response = await api.post('/api/emergency/alert', { message, location, sentVia });
      
      console.log("sendEmergency response:", response.data);
      
      if (response.data.message === "alert created" || response.data.alert) {
        await speakText("Help is on the way. Your caregivers have been notified.", "en-IN");
        setSendingEmergency(false);
      } else {
        throw new Error('Failed to send alert');
      }
    } catch (err) {
      console.error("sendEmergency error", err);
      await speakText("Sorry, I could not send the alert. " + (err.response?.data?.message || 'Please try again.'), "en-IN");
    } finally {
      setSendingEmergency(false);
      safeRestart();
    }
  };

  const ack = async (action, snoozeMinutes = 10) => {
    if (!currentReminder) return;
    try {
      await api.post(`/api/reminder/ack/${currentReminder.id}`, { action, snoozeMinutes });
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
      const source = h.source ? `From ${h.source}.` : "";
      
      // Format the published date in a more natural way
      let published = "";
      if (h.publishedAt) {
        try {
          const pubDate = new Date(h.publishedAt);
          if (!isNaN(pubDate.getTime())) {
            const now = new Date();
            const diffHours = Math.floor((now - pubDate) / (1000 * 60 * 60));
            
            if (diffHours < 24) {
              // If less than 24 hours old, say "X hours ago"
              published = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago.`;
            } else {
              // Otherwise, say the full date
              const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              };
              published = `on ${pubDate.toLocaleString('en-IN', options)}.`;
            }
          }
        } catch (e) {
          console.error("Error formatting date:", e);
        }
      }
      
      const sentence = `${i + 1}. ${h.title}. ${source} ${published}`.replace(/\s+/g, ' ').trim();
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
          console.log("Fetching news from:", `/api/assistant/news?pageSize=20`);
          const res = await api.get('/api/assistant/news?pageSize=20');
          
          console.log("News API response:", res.data);
          
          if (!res.data || !res.data.headlines) {
            console.error("Unexpected API response format:", res.data);
            throw new Error("Unexpected response format from news API");
          }
          
          let headlines = Array.isArray(res.data.headlines) ? res.data.headlines : [];
          
          if (headlines.length === 0) {
            console.log("No headlines found in the response");
          } else {
            console.log(`Received ${headlines.length} headlines before filtering`);
          }
          
          // Helper function to filter headlines by time range with better logging
          const filterHeadlinesByTimeRange = (hours) => {
            const timeAgo = new Date();
            timeAgo.setHours(timeAgo.getHours() - hours);
            
            console.log(`Filtering for news in the last ${hours} hours (since ${timeAgo.toISOString()})`);
            
            const filtered = headlines.filter(headline => {
              try {
                if (!headline.publishedAt) {
                  console.log("No publishedAt date for headline:", headline.title);
                  return false;
                }
                
                const publishedDate = new Date(headline.publishedAt);
                const isRecent = !isNaN(publishedDate.getTime()) && publishedDate >= timeAgo;
                
                if (!isRecent) {
                  console.log(`Article too old (${publishedDate.toISOString()}):`, headline.title);
                }
                
                return isRecent;
              } catch (e) {
                console.warn("Error processing headline:", headline?.title, "Error:", e);
                return false;
              }
            });
            
            console.log(`Found ${filtered.length} articles in the last ${hours} hours`);
            return filtered;
          };
          
          // First, show all articles without time filtering to see what we get
          let filteredHeadlines = [...headlines];
          console.log(`Total headlines received: ${filteredHeadlines.length}`);
          
          // Log all received headlines with their dates for debugging
          filteredHeadlines.forEach((h, i) => {
            console.log(`[${i}] ${h.publishedAt} - ${h.title}`);
          });
          
          // Only apply time filtering if we have many articles
          if (filteredHeadlines.length > 10) {
            // Try to get news from last 24 hours
            filteredHeadlines = filterHeadlinesByTimeRange(24);
            
            // If not enough recent news, be more lenient
            if (filteredHeadlines.length < 5) {
              console.log("Not enough recent news, expanding to last 7 days");
              filteredHeadlines = filterHeadlinesByTimeRange(24 * 7); // Last 7 days
              
              // If still not enough, just take the most recent 10 articles
              if (filteredHeadlines.length === 0) {
                console.log("No recent news found, showing most recent articles");
                filteredHeadlines = headlines
                  .filter(h => h.publishedAt && h.title)
                  .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
                  .slice(0, 10);
              }
            }
          }
          
          // If still no news, take the most recent 6 articles regardless of date
          if (filteredHeadlines.length === 0) {
            console.log("No recent news found, showing most recent articles");
            filteredHeadlines = headlines
              .filter(h => h.publishedAt) // Only include articles with a valid date
              .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
              .slice(0, 6);
          }
          
          headlines = filteredHeadlines;
          
          // Sort by publishedAt date (most recent first)
          headlines = headlines.sort((a, b) => {
            try {
              const dateA = new Date(a.publishedAt || 0);
              const dateB = new Date(b.publishedAt || 0);
              return dateB - dateA;
            } catch (e) {
              console.error("Error sorting dates:", e);
              return 0;
            }
          });
          
          // Limit to 6 most recent articles
          headlines = headlines.slice(0, 6);
          
          console.log(`Setting ${headlines.length} headlines to state`);
          setNewsHeadlines(headlines);

          if (!headlines.length) {
            console.log("No news articles found");
            await speakText("I couldn't find any recent news articles. I'll try to fetch the latest available news for you.", "en-IN");
            // Try one more time with no date restrictions
            headlines = res.data.headlines
              .filter(h => h.publishedAt && h.title)
              .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
              .slice(0, 6);
            
            if (!headlines.length) {
              await speakText("I'm sorry, but I couldn't fetch any news at the moment. Please try again later.", "en-IN");
              safeRestart();
              return;
            }
          } else {
            console.log("Speaking news headlines");
            await speakNewsFull(headlines);
          }
        } catch (err) {
          console.error("News fetch error:", err);
          console.error("Error details:", {
            message: err.message,
            response: err.response?.data,
            status: err.response?.status,
            config: {
              url: err.config?.url,
              method: err.config?.method,
              timeout: err.config?.timeout
            }
          });
          await speakText("I'm having trouble fetching the latest news. Please check your internet connection and try again.", "en-IN");
        } finally {
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
            res = await api.get(`/api/assistant/weather?lat=${loc.lat}&lon=${loc.lon}`);
          } else {
            const match = transcript.match(/weather in ([a-z\s]+)/);
            const city = match ? match[1].trim() : null;
            const cityParam = city ? `?city=${encodeURIComponent(city)}` : "";
            res = await api.get(`/api/assistant/weather${cityParam}`);
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

  // Socket.io reminder listener
  useEffect(() => {
    if (!socket) {
      console.log("🔌 ElderlyHome: No socket available for reminder listening");
      return;
    }

    console.log("🔌 ElderlyHome: Setting up reminder listener on socket:", socket.id);
    console.log("👤 ElderlyHome: User data:", userData);

    const handleReminder = (reminder) => {
      console.log("🔔 ElderlyHome: Received reminder:", reminder);
      console.log("🔔 ElderlyHome: Current time:", new Date().toISOString());
      setCurrentReminder(reminder);
      
      // Speak the reminder
      speakText(`Reminder: ${reminder.message}`, "en-IN");
      
      // Auto-dismiss after 2 minutes if not acknowledged
      const timeoutId = setTimeout(() => {
        console.log("⏰ ElderlyHome: Auto-dismissing reminder after 2 minutes");
        setCurrentReminder(null);
      }, 2 * 60 * 1000);
      
      return () => clearTimeout(timeoutId);
    };

    // Listen for reminder events
    socket.on("reminder", handleReminder);
    console.log("✅ ElderlyHome: Reminder listener attached");

    // Add connection status logging
    socket.on("connect", () => {
      console.log("🔌 ElderlyHome: Socket connected, ID:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("🔌 ElderlyHome: Socket disconnected");
    });

    // Cleanup
    return () => {
      console.log("🧹 ElderlyHome: Cleaning up reminder listener");
      socket.off("reminder", handleReminder);
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [socket, userData]);

  // DEBUG: Manual test function to simulate reminder
  const testReminder = () => {
    console.log("🧪 Testing manual reminder trigger");
    const testReminderData = {
      id: "test-123",
      message: "Test reminder - take your medication",
      time: new Date().toISOString(),
      meta: {}
    };
    setCurrentReminder(testReminderData);
    speakText(`Test reminder: ${testReminderData.message}`, "en-IN");
  };

  // Fetch caregivers with enhanced debugging
  const fetchCaregivers = async () => {
    try {
      console.log("📥 === FETCHING CAREGIVERS START ===");
      console.log("📥 API Base URL:", debugAPI.defaults.baseURL);
      console.log("📥 User ID:", userData?._id);
      setIsLoading(true);
      
      const response = await debugAPI.get('/api/caregivers');
      console.log("✅ Caregivers fetch response:", response);
      console.log("✅ Caregivers data:", response.data);
      
      if (response.data && Array.isArray(response.data)) {
        setCaregivers(response.data);
        console.log("✅ Caregivers set in state:", response.data.length, "caregivers");
        console.log("✅ Caregiver details:", response.data.map(c => ({ id: c._id, name: c.name, email: c.email })));
      } else {
        console.error('❌ Unexpected response format:', response.data);
        toast.error('Error loading caregivers. Please try again.');
      }
    } catch (error) {
      console.error('❌ === FETCH CAREGIVERS ERROR ===');
      console.error('❌ Error object:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('token');
        logout();
      } else if (error.code === 'NETWORK_ERROR') {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load caregivers');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle form submission with enhanced debugging
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🔧 === CAREGIVER FORM SUBMISSION START ===");
    console.log("🔧 Form data:", formData);
    console.log("🔧 Environment:", import.meta.env.VITE_API_URL);
    console.log("🔧 User data:", userData);
    
    try {
      // Validate required fields
      if (!formData.name || !formData.email || !formData.phone) {
        toast.error('Please fill in all required fields (name, email, phone)');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address');
        return;
      }

      // Validate phone format
      const phoneRegex = /^\+?\d{8,15}$/;
      const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        toast.error('Please enter a valid phone number (e.g., +919876543210)');
        return;
      }

      console.log("✅ Form validation passed");

      // Use debug API for better error tracking
      if (editingId) {
        console.log("📝 Updating caregiver:", editingId);
        const response = await debugAPI.put(`/api/caregivers/${editingId}`, formData);
        console.log("✅ Update response:", response.data);
        toast.success('Caregiver updated successfully');
      } else {
        console.log("➕ Adding new caregiver with debugAPI");
        console.log("📤 Request URL:", `${debugAPI.defaults.baseURL}/api/caregivers`);
        console.log("📤 Request data:", formData);
        
        const response = await debugAPI.post('/api/caregivers', formData);
        console.log("✅ Caregiver added successfully:", response.data);
        toast.success('Caregiver added successfully');
      }
      
      // Reset form and refresh list
      setFormData({
        name: '',
        email: '',
        phone: '',
        receiveSMS: true,
        isPrimary: false
      });
      setEditingId(null);
      
      // Refresh the caregiver list
      await fetchCaregivers();
      
    } catch (error) {
      console.error('❌ === CAREGIVER SUBMISSION ERROR ===');
      console.error('❌ Error object:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      console.error('❌ Error message:', error.message);
      console.error('❌ Request config:', error.config);
      
      let errorMessage = 'Failed to save caregiver';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
        localStorage.removeItem('token');
        logout();
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Invalid data provided';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      toast.error(errorMessage);
    }
  };

  // Handle edit action
  const handleEdit = (caregiver) => {
    setFormData({
      name: caregiver.name,
      email: caregiver.email,
      phone: caregiver.phone,
      receiveSMS: caregiver.receiveSMS,
      isPrimary: caregiver.isPrimary
    });
    setEditingId(caregiver._id);
  };

  // Handle delete action
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this caregiver?')) {
      try {
        console.log("🗑️ Deleting caregiver:", id);
        await api.delete(`/api/caregivers/${id}`);
        toast.success('Caregiver removed successfully');
        fetchCaregivers();
      } catch (error) {
        console.error('❌ Error deleting caregiver:', error);
        if (error.response?.status === 401) {
          toast.error('Session expired. Please log in again.');
          logout();
        } else {
          toast.error(error.response?.data?.message || 'Failed to remove caregiver');
        }
      }
    }
  };

  // Send test SMS
  const sendTestSMS = async (id) => {
    try {
      console.log("📱 Sending test SMS to caregiver:", id);
      await api.post(`/api/caregivers/${id}/test-sms`, {});
      toast.success('Test SMS sent successfully');
    } catch (error) {
      console.error('❌ Error sending test SMS:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        logout();
      } else {
        toast.error(error.response?.data?.message || 'Failed to send test SMS');
      }
    }
  };

  // Load caregivers when modal opens
  useEffect(() => {
    if (showCaregiverModal) {
      fetchCaregivers();
    }
  }, [showCaregiverModal]);

  // Debug function to test everything
  const runCompleteDebug = async () => {
    console.log('🚀 === RUNNING COMPLETE DEBUG ANALYSIS ===');
    
    // Test API connectivity
    const result = await testDebugAPI();
    console.log('🚀 Debug API test result:', result);
    
    // Test current authentication
    const token = localStorage.getItem('token');
    console.log('🚀 Current token:', token ? 'Present' : 'Missing');
    console.log('🚀 User data:', userData);
    
    // Test environment
    console.log('🚀 Environment variables:');
    console.log('  - VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('  - NODE_ENV:', import.meta.env.NODE_ENV);
    console.log('  - MODE:', import.meta.env.MODE);
    
    toast.info('Debug analysis complete - check console for details');
  };

  if (!userData) return <div className="p-6">Loading...</div>;

  // Helper function to show relative time (e.g., "2 hours ago")
  const getRelativeTime = (dateString) => {
    if (!dateString) return "";
    const now = new Date();
    const publishedDate = new Date(dateString);
    const diffMs = now - publishedDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return publishedDate.toLocaleDateString();
  };

  // Function to manually refresh news
  const refreshNews = async () => {
    try {
      const res = await api.get('/api/assistant/news?pageSize=20');
      let headlines = res.data.headlines || [];
      
      // Filter news from the last 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      headlines = headlines.filter(headline => {
        const publishedDate = new Date(headline.publishedAt || 0);
        return publishedDate >= twentyFourHoursAgo;
      });
      
      // Sort by publishedAt date (most recent first)
      headlines = headlines.sort((a, b) => {
        const dateA = new Date(a.publishedAt || 0);
        const dateB = new Date(b.publishedAt || 0);
        return dateB - dateA;
      });
      
      // Limit to 6 most recent articles
      headlines = headlines.slice(0, 6);
      
      setNewsHeadlines(headlines);
      if (headlines.length > 0) {
        await speakText(`Updated with ${headlines.length} latest headlines from the last 24 hours`, "en-IN");
      }
    } catch (err) {
      console.error("news refresh error", err);
      await speakText("Could not refresh news.", "en-IN");
    }
  };

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
    <div className="relative w-full min-h-screen calm-gradient-bg">
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Header Section - Beautiful & Calming */}
        <div className="soft-card rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-xl">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Hello, {userData.name}!</h1>
              <p className="text-xl text-gray-600 mt-2">Welcome to your caring companion</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCaregiverModal(true)}
              className="px-6 py-4 action-button text-white rounded-2xl text-lg font-bold shadow-xl flex items-center gap-3 transition-all"
            >
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 12.094A5.973 5.973 0 004 15v1H1v-1a3 3 0 013.75-2.906z" />
              </svg>
              Caregivers
            </button>
            <button
              onClick={runCompleteDebug}
              className="px-6 py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-2xl text-lg font-bold shadow-xl flex items-center gap-3 transition-all"
            >
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Debug API
            </button>
            <button
              onClick={logout}
              className="px-6 py-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-2xl text-lg font-bold shadow-xl flex items-center gap-3 transition-all"
            >
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* Reminder card */}
        {currentReminder ? (
          <div className="soft-card p-10 rounded-3xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-gray-800">Reminder</h2>
            </div>
            <p className="text-3xl mb-8 text-gray-700 leading-relaxed">{currentReminder.message}</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => ack("taken")} className="p-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl text-2xl font-bold transition shadow-lg flex items-center justify-center gap-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Taken
              </button>
              <button onClick={() => ack("snooze", 10)} className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-2xl font-bold transition shadow-lg flex items-center justify-center gap-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Snooze 10m
              </button>
            </div>
          </div>
        ) : (
          <div className="soft-card p-10 rounded-3xl text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-2xl font-semibold text-gray-700">No active reminders right now</div>
            <p className="text-lg text-gray-500 mt-2">You're all set! Enjoy your day</p>
          </div>
        )}

        {/* News Section */}
        {newsHeadlines.length > 0 && (
          <div className="soft-card p-10 rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                    <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
                  </svg>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">Latest News</h2>
              </div>
              <span className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-lg font-bold rounded-full shadow-lg animate-pulse">LIVE</span>
            </div>
            <div className="space-y-6">
              {newsHeadlines.map((h, i) => (
                <div key={i} className="p-6 bg-gradient-to-r from-white/80 to-white/60 rounded-2xl border-2 border-gray-200 hover:border-blue-300 transition-all shadow-md hover:shadow-xl">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold text-xl">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-gray-800 mb-3 leading-relaxed">{h.title}</div>
                      <div className="flex items-center gap-3 text-base text-gray-600">
                        <span className="font-semibold">{h.source}</span>
                        {h.publishedAt && (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            <span className="text-green-600 font-medium">{getRelativeTime(h.publishedAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { try { synthRef.current.cancel(); } catch(e){}; speakText(h.title); }} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-lg transition shadow-lg flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      Read Aloud
                    </button>
                    {h.url && <button onClick={() => window.open(h.url, "_blank")} className="px-6 py-3 rounded-xl bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-300 font-bold text-lg transition shadow-lg">Open Article</button>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4 flex-wrap justify-center">
              <button onClick={refreshNews} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xl font-bold transition shadow-xl flex items-center gap-3">
                <svg className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Refresh News
              </button>
              <button onClick={() => { stopRequestedRef.current = false; speakNewsFull(); }} className="px-8 py-4 rounded-2xl action-button text-white text-xl font-bold shadow-xl">Repeat All</button>
              <button onClick={() => stopSpeaking()} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xl font-bold transition shadow-xl">Stop Reading</button>
            </div>
          </div>
        )}

        {/* Weather Section */}
        {weatherInfo && weatherInfo.city && (
          <div className="soft-card p-10 rounded-3xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-gray-800">Weather in {weatherInfo.city}</h2>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl border-2 border-blue-200">
                <div className="text-lg text-gray-600 mb-2">Temperature</div>
                <div className="text-5xl font-bold text-gray-800">{Math.round(weatherInfo.temp)}°C</div>
                <div className="text-xl text-gray-600 mt-2">{weatherInfo.description}</div>
              </div>
              <div className="p-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl border-2 border-purple-200">
                <div className="text-lg text-gray-600 mb-2">Feels Like</div>
                <div className="text-5xl font-bold text-gray-800">{Math.round(weatherInfo.feels_like)}°C</div>
                <div className="text-xl text-gray-600 mt-2">Humidity: {weatherInfo.humidity}%</div>
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => { 
                  try { synthRef.current.cancel(); } catch(e){}; 
                  speakText(`Weather in ${weatherInfo.city}. ${weatherInfo.description}. Temperature ${Math.round(weatherInfo.temp)} degrees Celsius.`); 
                }} 
                className="px-8 py-4 rounded-2xl action-button text-white text-xl font-bold shadow-xl flex items-center gap-3"
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                Read Weather
              </button>
              <button 
                onClick={stopSpeaking} 
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xl font-bold transition shadow-xl"
              >
                Stop
              </button>
            </div>
          </div>
        )}

        {/* Bhajan Modal - Enhanced */}
        {showBhajanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/30 transform transition-all duration-300 scale-95 hover:scale-100">
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-400 via-pink-500 to-blue-400"></div>
              
              {/* Close Button */}
              <button 
                onClick={() => setShowBhajanModal(false)} 
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Modal Content */}
              <div className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center shadow-inner">
                  <svg className="w-12 h-12 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" />
                  </svg>
                </div>
                
                <h2 className="text-3xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Spiritual Harmony</h2>
                <p className="text-gray-600 mb-8 text-lg">Immerse yourself in divine melodies and spiritual peace</p>
                
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={bhajanQuery}
                      onChange={(e) => setBhajanQuery(e.target.value)}
                      placeholder="Search for bhajans, kirtans, or shabads..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    {['Morning Bhajans', 'Evening Aarti', 'Hanuman Chalisa', 'Gayatri Mantra'].map((item) => (
                      <button
                        key={item}
                        onClick={() => setBhajanQuery(item)}
                        className="px-4 py-3 bg-white/80 hover:bg-white text-gray-700 rounded-xl border border-gray-200 hover:border-purple-300 transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" />
                        </svg>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mt-8 flex justify-center gap-4">
                  <button 
                    onClick={() => { 
                      openYouTubeTop(bhajanQuery || 'devotional bhajans'); 
                      setShowBhajanModal(false); 
                    }} 
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Play on YouTube
                  </button>
                  <button 
                    onClick={() => setShowBhajanModal(false)} 
                    className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 rounded-xl font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                
                <p className="text-sm text-gray-400 mt-6">We'll open YouTube in a new tab for your spiritual journey</p>
              </div>
              
              {/* Decorative Bottom */}
              <div className="h-2 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-blue-400/30 mt-8"></div>
            </div>
          </div>
        )}

        {/* Caregiver Management Modal - Enhanced */}
        {showCaregiverModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="relative w-full max-w-5xl max-h-[90vh] bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-blue-100/50 transform transition-all duration-300 scale-95 hover:scale-100">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-teal-500 to-cyan-500 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Caregiver Management</h2>
                    <p className="text-teal-100 mt-1">Manage your trusted caregivers and their notification preferences</p>
                  </div>
                  <button
                    onClick={() => setShowCaregiverModal(false)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Stats Bar */}
                <div className="mt-6 flex flex-wrap gap-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 flex-1 min-w-[150px] border border-white/20">
                    <p className="text-xs text-teal-100">Total Caregivers</p>
                    <p className="text-2xl font-bold text-white">{caregivers.length}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 flex-1 min-w-[150px] border border-white/20">
                    <p className="text-xs text-teal-100">Primary Contact</p>
                    <p className="text-2xl font-bold text-white">
                      {caregivers.filter(c => c.isPrimary).length}
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 flex-1 min-w-[150px] border border-white/20">
                    <p className="text-xs text-teal-100">SMS Alerts</p>
                    <p className="text-2xl font-bold text-white">
                      {caregivers.filter(c => c.receiveSMS).length}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Main Content */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Left Side - Form */}
                <div className="w-full md:w-1/3 p-6 border-r border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingId ? 'Edit Caregiver' : 'Add New Caregiver'}
                    </h3>
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            name: '',
                            email: '',
                            phone: '',
                            receiveSMS: true,
                            isPrimary: false
                          });
                          setEditingId(null);
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        + Add New
                      </button>
                    )}
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="john@example.com"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          </svg>
                        </div>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="+1 (555) 123-4567"
                          required
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Include country code (e.g., +1 for US)</p>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <label className="flex items-center space-x-3">
                        <div className={`relative flex items-center h-5 w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${formData.receiveSMS ? 'bg-indigo-600' : 'bg-gray-300'}`}
                             onClick={() => handleInputChange({ target: { name: 'receiveSMS', checked: !formData.receiveSMS, type: 'checkbox' }})}>
                          <span className={`${formData.receiveSMS ? 'translate-x-5' : 'translate-x-0'} inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out`} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Enable SMS Alerts</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <div className={`relative flex items-center h-5 w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${formData.isPrimary ? 'bg-indigo-600' : 'bg-gray-300'}`}
                             onClick={() => handleInputChange({ target: { name: 'isPrimary', checked: !formData.isPrimary, type: 'checkbox' }})}>
                          <span className={`${formData.isPrimary ? 'translate-x-5' : 'translate-x-0'} inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out`} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Set as Primary Contact</span>
                      </label>
                    </div>
                    
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            {editingId ? 'Update Caregiver' : 'Add Caregiver'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
                
                {/* Right Side - List */}
                <div className="flex-1 overflow-y-auto bg-teal-50/30 p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-teal-900">Your Caregivers</h3>
                      <p className="text-sm text-teal-600">Manage your trusted caregivers and their permissions</p>
                    </div>
                    <div className="relative w-full md:w-72">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-teal-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search caregivers..."
                        className="block w-full pl-10 pr-3 py-2.5 text-sm border border-teal-100 rounded-xl bg-white/70 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent placeholder-teal-400 text-teal-800 transition-all"
                      />
                    </div>
                  </div>
                  
                  {isLoading && caregivers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white/50 rounded-2xl border border-teal-100">
                      <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-teal-500 mb-4"></div>
                      <p className="text-teal-700 font-medium">Loading your caregivers...</p>
                      <p className="text-sm text-teal-600 mt-1">Please wait a moment</p>
                    </div>
                  ) : caregivers.length === 0 ? (
                    <div className="text-center py-16 bg-white/70 rounded-2xl border-2 border-dashed border-teal-200">
                      <div className="mx-auto w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <h4 className="mt-2 text-lg font-semibold text-teal-800">No caregivers added yet</h4>
                      <p className="mt-1 text-sm text-teal-600 max-w-md mx-auto">Add your first caregiver to help manage your care and receive important updates</p>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            name: '',
                            email: '',
                            phone: '',
                            receiveSMS: true,
                            isPrimary: caregivers.length === 0 // Auto-set as primary if first caregiver
                          });
                          setEditingId(null);
                        }}
                        className="mt-5 inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 transition-all transform hover:-translate-y-0.5"
                      >
                        <svg className="-ml-1 mr-2 h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Your First Caregiver
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                      {caregivers.map((caregiver) => (
                        <div key={caregiver._id} className="group bg-white/90 backdrop-blur-sm rounded-xl border border-teal-100 overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-teal-200">
                          {/* Card Header */}
                          <div className="px-5 pt-5 pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
                                  {caregiver.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-4">
                                  <div className="flex items-center">
                                    <h4 className="text-lg font-semibold text-teal-900 group-hover:text-teal-800 transition-colors">
                                      {caregiver.name}
                                    </h4>
                                    {caregiver.isPrimary && (
                                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                        <svg className="-ml-0.5 mr-1 h-3 w-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Primary Contact
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-teal-600 mt-0.5">Caregiver</p>
                                </div>
                              </div>
                              
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => {
                                    setFormData({
                                      name: caregiver.name,
                                      email: caregiver.email,
                                      phone: caregiver.phone,
                                      receiveSMS: caregiver.receiveSMS,
                                      isPrimary: caregiver.isPrimary
                                    });
                                    setEditingId(caregiver._id);
                                    document.querySelector('.bg-white')?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                  className="p-2 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors"
                                  title="Edit caregiver"
                                >
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to remove ${caregiver.name} as a caregiver?`)) {
                                      handleDelete(caregiver._id);
                                    }
                                  }}
                                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Remove caregiver"
                                >
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                                {caregiver.receiveSMS && (
                                  <button
                                    onClick={() => sendTestSMS(caregiver._id)}
                                    className="p-2 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                                    title="Send test SMS"
                                  >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Card Body */}
                          <div className="px-5 pb-4">
                            <div className="space-y-3">
                              <div className="flex items-start">
                                <svg className="h-5 w-5 text-teal-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <div className="ml-3">
                                  <p className="text-sm text-teal-900 break-all">{caregiver.email}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start">
                                <svg className="h-5 w-5 text-teal-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <div className="ml-3">
                                  <p className="text-sm text-teal-900">{caregiver.phone || 'Not provided'}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center pt-2">
                                <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  caregiver.receiveSMS 
                                    ? 'bg-teal-100 text-teal-800' 
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  <svg className={`-ml-0.5 mr-1.5 h-2 w-2 ${
                                    caregiver.receiveSMS ? 'text-teal-400' : 'text-gray-400'
                                  }`} fill="currentColor" viewBox="0 0 8 8">
                                    <circle cx="4" cy="4" r="3" />
                                  </svg>
                                  {caregiver.receiveSMS ? 'Receiving SMS Alerts' : 'SMS Alerts Off'}
                                </div>
                                
                                {caregiver.lastNotified && (
                                  <div className="ml-auto text-xs text-teal-600">
                                    Last notified: {new Date(caregiver.lastNotified).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Footer */}
              <div className="bg-teal-50/50 px-6 py-4 border-t border-teal-100 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-teal-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm text-teal-700">
                      <span className="font-semibold">{caregivers.length}</span> {caregivers.length === 1 ? 'caregiver' : 'caregivers'} registered
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCaregiverModal(false)}
                      className="px-5 py-2.5 border border-teal-200 rounded-xl text-sm font-medium text-teal-700 bg-white hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-300 transition-all duration-200"
                    >
                      Close Panel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Scroll to form
                        document.querySelector('.bg-white')?.scrollIntoView({ behavior: 'smooth' });
                        // Reset form if needed
                        if (editingId) {
                          setFormData({
                            name: '',
                            email: '',
                            phone: '',
                            receiveSMS: true,
                            isPrimary: false
                          });
                          setEditingId(null);
                        }
                      }}
                      className="px-5 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Add New Caregiver
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

     {/* SOS Emergency Button - Large & Prominent */}
<button
  className="fixed bottom-10 right-10 z-50 w-28 h-28 rounded-full sos-button-new text-white font-black text-2xl shadow-2xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50"
  onClick={() => sendEmergency("Help me", "button")}
  disabled={sendingEmergency}
  aria-label="Send SOS emergency"
  title="Send emergency alert"
>
  <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
  <span className="text-xl">SOS</span>
</button>

      {/* Voice Assistant Indicator - Calm Design */}
      <div className="fixed bottom-10 left-10 bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4 rounded-2xl text-white z-50 shadow-2xl flex items-center gap-3">
        {listening ? (
          <>
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            <span className="text-lg font-bold">🎤 Listening...</span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 bg-gray-400 rounded-full" />
            <span className="text-lg font-semibold">Voice Assistant Ready</span>
          </>
        )}
      </div>
      
      {/* Debug Components - Remove these after testing */}
      <CaregiverDebugger />
      <SimpleTest />
    </div>
  );
}

