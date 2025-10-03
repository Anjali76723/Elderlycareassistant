// client/src/pages/CaregiverReminders.jsx
import React, { useContext, useEffect, useState, useRef } from "react";
import axios from "axios";
import { userDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from "date-fns";

// Animated background component with improved gradient and animations
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-rose-900">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/5"
            style={{
              width: `${Math.random() * 400 + 100}px`,
              height: `${Math.random() * 400 + 100}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              transform: `translate(-50%, -50%)`,
              filter: 'blur(60px)',
              animation: `pulse ${Math.random() * 15 + 15}s infinite ${Math.random() * 5}s alternate`,
            }}
          />
        ))}
      </div>
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.05; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
          100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1.5) rotate(10deg); }
        }
      `}</style>
    </div>
  );
};

// Enhanced Glass card component with better shadows and hover effects
const GlassCard = ({ children, className = "", hoverEffect = true }) => (
  <div 
    className={`relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ${
      hoverEffect ? 'hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-indigo-500/10' : ''
    } ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <div className="relative z-10 h-full">
      {children}
    </div>
  </div>
);

// Enhanced Button components with better visual feedback
const PrimaryButton = ({ children, onClick, className = "", isLoading = false, ...props }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className={`relative overflow-hidden group bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 transform hover:-translate-y-0.5 ${
      isLoading ? 'opacity-75 cursor-not-allowed' : ''
    } ${className}`}
    {...props}
  >
    <span className="relative z-10 flex items-center justify-center gap-2">
      {children}
      {isLoading && (
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
    </span>
    <span className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
  </button>
);

const SecondaryButton = ({ children, onClick, className = "", ...props }) => (
  <button
    onClick={onClick}
    className={`relative overflow-hidden group bg-white/5 border border-white/20 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 hover:border-white/30 transition-all duration-300 ${className}`}
    {...props}
  >
    <span className="relative z-10 flex items-center justify-center gap-2">
      {children}
    </span>
    <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
  </button>
);

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    active: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    upcoming: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    completed: {
      bg: 'bg-gray-500/20',
      text: 'text-gray-400',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    }
  };

  const config = statusConfig[status] || statusConfig.active;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className="mr-1.5">{config.icon}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function CaregiverReminders() {
  const { serverUrl, userData, logout } = useContext(userDataContext);
  const [elderlyEmail, setElderlyEmail] = useState("");
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [repeat, setRepeat] = useState("none");
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    console.log("Component mounted. ServerUrl:", serverUrl);
    console.log("UserData:", userData);
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
    
    console.log("Form submission started");
    console.log("Form data:", { elderlyEmail, message, selectedDate, repeat });
    
    if (!elderlyEmail || !message || !selectedDate) {
      setErr("Please fill all fields.");
      console.log("Validation failed - missing fields");
      return;
    }
    
    try {
      setLoading(true);
      // Convert selectedDate to ISO string for API
      const time = selectedDate.toISOString();
      console.log("Sending request to:", `${serverUrl}/api/reminder/create`);
      console.log("Request payload:", { elderlyEmail, message, time, repeat });
      
      const response = await axios.post(
        `${serverUrl}/api/reminder/create`,
        { elderlyEmail, message, time, repeat },
        { withCredentials: true }
      );
      
      console.log("Reminder created successfully:", response.data);
      setLoading(false);
      setElderlyEmail("");
      setMessage("");
      setSelectedDate(new Date());
      setRepeat("none");
      setErr(""); // Clear any previous errors
      fetchReminders();
      
      // Show success message
      alert("Reminder created successfully!");
    } catch (error) {
      setLoading(false);
      console.error("create reminder error", error);
      console.error("Error response:", error.response);
      console.error("Error message:", error.response?.data?.message);
      
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Error creating reminder";
      setErr(errorMessage);
    }
  };

  // Calculate reminder stats
  const stats = {
    total: reminders.length,
    active: reminders.filter(r => new Date(r.time) > new Date()).length,
    completed: reminders.filter(r => new Date(r.time) <= new Date()).length
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-rose-900 text-white">
      <AnimatedBackground />
      
      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-white/5"
            style={{
              width: `${Math.random() * 8 + 2}px`,
              height: `${Math.random() * 8 + 2}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 15 + 10}s infinite ${Math.random() * 5}s`,
              opacity: Math.random() * 0.5 + 0.1
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-10"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-pink-300">
                Caregiver Dashboard
              </h1>
              <p className="text-indigo-100/80 max-w-2xl">
                Manage medication schedules and care reminders for your loved ones with ease and confidence.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <PrimaryButton 
                onClick={() => navigate("/alerts")}
                className="flex-1 md:flex-none"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                View Alerts
              </PrimaryButton>
              
              <SecondaryButton
                onClick={async () => {
                  try {
                    await logout?.();
                  } catch (e) {
                    console.error("Logout error:", e);
                  }
                  navigate("/signin");
                }}
                className="flex-1 md:flex-none"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </SecondaryButton>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <GlassCard>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-200/80 mb-1">Total Reminders</p>
                    <h3 className="text-3xl font-bold text-white">{stats.total}</h3>
                  </div>
                  <div className="p-3 bg-indigo-500/20 rounded-xl">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center text-sm text-indigo-100/60">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
                    {stats.active} Active • {stats.completed} Completed
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-pink-200/80 mb-1">Active Reminders</p>
                    <h3 className="text-3xl font-bold text-white">{stats.active}</h3>
                  </div>
                  <div className="p-3 bg-pink-500/20 rounded-xl">
                    <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center text-sm text-pink-100/60">
                    <span className="w-2 h-2 bg-pink-400 rounded-full mr-2"></span>
                    {reminders.length > 0 ? Math.round((stats.active / reminders.length) * 100) : 0}% of total
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-rose-200/80 mb-1">Completed</p>
                    <h3 className="text-3xl font-bold text-white">{stats.completed}</h3>
                  </div>
                  <div className="p-3 bg-rose-500/20 rounded-xl">
                    <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center text-sm text-rose-100/60">
                    <span className="w-2 h-2 bg-rose-400 rounded-full mr-2"></span>
                    {reminders.length > 0 ? Math.round((stats.completed / reminders.length) * 100) : 0}% of total
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Create Reminder */}
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
            className="lg:col-span-1"
          >
            <GlassCard>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white">New Reminder</h2>
                </div>
                
                <form onSubmit={handleCreate} className="space-y-5">
                  <div>
                    <label className="block text-sm text-cyan-100/80 font-medium mb-2">Elderly Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-cyan-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        value={elderlyEmail}
                        onChange={(e) => setElderlyEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-cyan-100/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all"
                        placeholder="elderly@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-cyan-100/80 font-medium mb-2">Repeat</label>
                      <div className="relative">
                        <select
                          value={repeat}
                          onChange={(e) => setRepeat(e.target.value)}
                          className="w-full pl-3 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent appearance-none"
                        >
                          <option value="none" className="bg-gray-800">None</option>
                          <option value="daily" className="bg-gray-800">Daily</option>
                          <option value="weekly" className="bg-gray-800">Weekly</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="h-5 w-5 text-cyan-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full">
                      <label className="block text-sm text-cyan-100/80 font-medium mb-2">Date & Time</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <DatePicker
                          selected={selectedDate}
                          onChange={(date) => setSelectedDate(date)}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={1}
                          timeCaption="Time"
                          dateFormat="MMMM d, yyyy h:mm aa"
                          minDate={new Date()}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent cursor-pointer"
                          calendarClassName="bg-gray-800 border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                          timeClassName={() => "text-white hover:bg-cyan-500/20 transition-colors"}
                          popperProps={{
                            strategy: "fixed",
                            modifiers: [
                              {
                                name: "preventOverflow",
                                options: {
                                  rootBoundary: "viewport",
                                  tether: false,
                                  altAxis: true,
                                },
                              },
                              {
                                name: "flip",
                                options: {
                                  fallbackPlacements: ["bottom", "top", "right", "left"],
                                },
                              },
                            ],
                          }}
                          popperClassName="!z-[10000]"
                          withPortal
                          dayClassName={(date) => {
                            const today = new Date();
                            const isToday = date.getDate() === today.getDate() && 
                                          date.getMonth() === today.getMonth() && 
                                          date.getFullYear() === today.getFullYear();
                            const isSelected = date.getDate() === selectedDate.getDate() && 
                                             date.getMonth() === selectedDate.getMonth() && 
                                             date.getFullYear() === selectedDate.getFullYear();
                            
                            if (isSelected) return 'bg-cyan-500 text-white rounded-full';
                            if (isToday) return 'bg-cyan-500/30 text-cyan-200 rounded-full';
                            return 'text-white hover:bg-white/10 rounded-full transition-colors';
                          }}
                          renderCustomHeader={({
                            date,
                            decreaseMonth,
                            increaseMonth,
                            prevMonthButtonDisabled,
                            nextMonthButtonDisabled,
                          }) => (
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-white/10">
                              <button
                                onClick={decreaseMonth}
                                disabled={prevMonthButtonDisabled}
                                type="button"
                                className={`p-2 rounded-full transition-colors ${
                                  prevMonthButtonDisabled 
                                    ? 'text-gray-500 cursor-not-allowed' 
                                    : 'text-white hover:bg-white/10'
                                }`}
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <div className="text-white font-semibold text-lg">
                                {format(date, 'MMMM yyyy')}
                              </div>
                              <button
                                onClick={increaseMonth}
                                disabled={nextMonthButtonDisabled}
                                type="button"
                                className={`p-2 rounded-full transition-colors ${
                                  nextMonthButtonDisabled 
                                    ? 'text-gray-500 cursor-not-allowed' 
                                    : 'text-white hover:bg-white/10'
                                }`}
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          )}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-cyan-100/80 font-medium mb-2">Message</label>
                    <input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-cyan-100/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all"
                      placeholder="E.g., Take medication after breakfast"
                      required
                    />
                  </div>

                  {err && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
                      {err}
                    </div>
                  )}

                  {/* Debug info */}
                  <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-200 text-xs">
                    <strong>Debug:</strong> ServerUrl: {serverUrl || 'Not set'} | 
                    Email: {elderlyEmail || 'Empty'} | 
                    Message: {message || 'Empty'} | 
                    Date: {selectedDate?.toLocaleString() || 'Not set'}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    onClick={(e) => {
                      console.log("Submit button clicked!");
                      // Don't prevent default here, let the form handle it
                    }}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Create Reminder
                      </>
                    )}
                  </button>
                </form>
              </div>
            </GlassCard>
          </motion.div>

          {/* Right Column - Reminders List */}
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="lg:col-span-2"
          >
            <GlassCard className="h-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white">Your Reminders</h2>
                  </div>
                  <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 text-sm font-medium rounded-full">
                    {reminders.length} {reminders.length === 1 ? 'Reminder' : 'Reminders'}
                  </span>
                </div>

                <div className="space-y-4">
                  <AnimatePresence>
                    {reminders.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                      >
                        <div className="p-4 mb-4 rounded-full bg-blue-500/10">
                          <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-white mb-1">No reminders yet</h3>
                        <p className="text-cyan-100/70 max-w-md">Create your first reminder to help your loved ones stay on track with their daily activities and medications.</p>
                      </motion.div>
                    ) : (
                      reminders.map((reminder, index) => (
                        <motion.div
                          key={reminder._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-gradient-to-r from-white/5 to-white/[0.03] backdrop-blur-sm border border-white/5 rounded-xl p-5 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-cyan-500/10 rounded-lg">
                                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="text-lg font-medium text-white">{reminder.message}</h3>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-cyan-100/70">
                                    <span className="flex items-center">
                                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      {reminder.elderlyEmail || (reminder.elderlyId ? String(reminder.elderlyId) : "—")}
                                    </span>
                                    <span className="flex items-center">
                                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      {reminder.time ? new Date(reminder.time).toLocaleString() : "Time not set"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                reminder.repeat === "daily" 
                                  ? "bg-amber-500/20 text-amber-300" 
                                  : reminder.repeat === "weekly" 
                                    ? "bg-purple-500/20 text-purple-300"
                                    : "bg-gray-500/20 text-gray-300"
                              }`}>
                                {reminder.repeat !== "none" ? (
                                  <span className="flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    {reminder.repeat.charAt(0).toUpperCase() + reminder.repeat.slice(1)}
                                  </span>
                                ) : "One-time"}
                              </span>
                              
                              <button 
                                onClick={() => {
                                  setFormData({
                                    name: reminder.elderlyEmail,
                                    email: reminder.elderlyEmail,
                                    phone: "",
                                    receiveSMS: true,
                                    isPrimary: false,
                                    message: reminder.message,
                                    time: reminder.time,
                                    repeat: reminder.repeat
                                  });
                                  setEditingId(reminder._id);
                                  // Smooth scroll to form
                                  document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="p-1.5 text-cyan-100/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                title="Edit reminder"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to delete this reminder?`)) {
                                    try {
                                      setLoading(true);
                                      await axios.delete(`${serverUrl}/caregiver/reminders/${reminder._id}`, {
                                        withCredentials: true,
                                      });
                                      // Update the UI by removing the deleted reminder
                                      setReminders(reminders.filter(r => r._id !== reminder._id));
                                    } catch (error) {
                                      console.error("Error deleting reminder:", error);
                                      setErr(error?.response?.data?.message || "Failed to delete reminder. Please try again.");
                                    } finally {
                                      setLoading(false);
                                    }
                                  }
                                }}
                                disabled={loading}
                                className={`p-1.5 rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10'}`}
                                title={loading ? 'Deleting...' : 'Delete reminder'}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-12 text-center text-cyan-100/50 text-sm"
        >
          <p>Vocamate Caregiver Dashboard • {new Date().getFullYear()}</p>
        </motion.div>
      </div>
      
      <style jsx global>{`
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        /* Animations */
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.5; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
        
        /* Enhanced DatePicker Styling */
        .react-datepicker-wrapper {
          z-index: 10000 !important;
        }
        
        .react-datepicker-popper {
          z-index: 10000 !important;
          position: fixed !important;
        }
        
        .react-datepicker__tab-loop {
          z-index: 10000 !important;
        }
        
        .react-datepicker__portal {
          z-index: 10000 !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: rgba(0, 0, 0, 0.3) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        .react-datepicker__portal .react-datepicker {
          position: relative !important;
          transform: none !important;
        }
        
        .react-datepicker {
          background: rgba(31, 41, 55, 0.98) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
          backdrop-filter: blur(20px) !important;
          font-family: inherit !important;
          z-index: 10000 !important;
          position: relative !important;
        }
        
        .react-datepicker__header {
          background: rgba(31, 41, 55, 0.8) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px 12px 0 0 !important;
        }
        
        .react-datepicker__current-month {
          color: white !important;
          font-weight: 600 !important;
          font-size: 1.1rem !important;
        }
        
        .react-datepicker__day-names {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          margin-bottom: 8px !important;
        }
        
        .react-datepicker__day-name {
          color: rgba(6, 182, 212, 0.8) !important;
          font-weight: 500 !important;
          font-size: 0.875rem !important;
        }
        
        .react-datepicker__month {
          margin: 0.8rem !important;
        }
        
        .react-datepicker__day {
          color: white !important;
          border-radius: 8px !important;
          transition: all 0.2s ease !important;
          margin: 2px !important;
          width: 2rem !important;
          height: 2rem !important;
          line-height: 2rem !important;
        }
        
        .react-datepicker__day:hover {
          background: rgba(6, 182, 212, 0.2) !important;
          color: white !important;
        }
        
        .react-datepicker__day--selected {
          background: linear-gradient(135deg, #06b6d4, #0891b2) !important;
          color: white !important;
          font-weight: 600 !important;
        }
        
        .react-datepicker__day--today {
          background: rgba(6, 182, 212, 0.3) !important;
          color: #67e8f9 !important;
          font-weight: 500 !important;
        }
        
        .react-datepicker__day--disabled {
          color: rgba(255, 255, 255, 0.3) !important;
          cursor: not-allowed !important;
        }
        
        .react-datepicker__time-container {
          border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
          background: rgba(31, 41, 55, 0.95) !important;
        }
        
        .react-datepicker__time {
          background: transparent !important;
        }
        
        .react-datepicker__header--time {
          background: rgba(31, 41, 55, 0.8) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        
        .react-datepicker__time-caption {
          color: white !important;
          font-weight: 600 !important;
        }
        
        .react-datepicker__time-list {
          background: rgba(31, 41, 55, 0.95) !important;
          scrollbar-width: thin !important;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent !important;
        }
        
        .react-datepicker__time-list::-webkit-scrollbar {
          width: 6px !important;
        }
        
        .react-datepicker__time-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05) !important;
          border-radius: 3px !important;
        }
        
        .react-datepicker__time-list::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.5) !important;
          border-radius: 3px !important;
        }
        
        .react-datepicker__time-list::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.7) !important;
        }
        
        .react-datepicker__time-list-item {
          color: white !important;
          padding: 8px 12px !important;
          transition: all 0.2s ease !important;
          border-radius: 6px !important;
          margin: 2px 4px !important;
        }
        
        .react-datepicker__time-list-item:hover {
          background: rgba(6, 182, 212, 0.2) !important;
          color: white !important;
        }
        
        .react-datepicker__time-list-item--selected {
          background: linear-gradient(135deg, #06b6d4, #0891b2) !important;
          color: white !important;
          font-weight: 600 !important;
        }
        
        .react-datepicker__navigation {
          top: 16px !important;
        }
        
        .react-datepicker__navigation--previous {
          left: 16px !important;
        }
        
        .react-datepicker__navigation--next {
          right: 16px !important;
        }
        
        /* Input styling */
        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(0.7);
          cursor: pointer;
        }
        
        /* Remove number input arrows */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
