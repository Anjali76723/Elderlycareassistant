// client/src/pages/CaregiverAlerts.jsx
import React, { useContext, useEffect, useState, useRef } from "react";
import axios from "axios";
import { userDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, AnimateSharedLayout } from "framer-motion";

// Animated background component
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-900/80 via-purple-900/80 to-indigo-900/80">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/5"
            style={{
              width: `${Math.random() * 300 + 100}px`,
              height: `${Math.random() * 300 + 100}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              transform: `translate(-50%, -50%)`,
              filter: 'blur(40px)',
              animation: `pulse ${Math.random() * 20 + 20}s infinite alternate`,
            }}
          />
        ))}
      </div>
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1.5); }
        }
      `}</style>
    </div>
  );
};

// Enhanced Glass card component with better shadows and hover effects
const GlassCard = ({ children, className = "", hoverEffect = true }) => (
  <div 
    className={`relative backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ${
      hoverEffect ? 'hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-rose-500/10' : ''
    } ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
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
    className={`relative overflow-hidden group bg-gradient-to-r from-rose-600 to-pink-600 text-white font-medium px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-rose-500/30 transition-all duration-300 transform hover:-translate-y-0.5 ${
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
    <span className="absolute inset-0 bg-gradient-to-r from-rose-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
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

// Alert status badge component
const AlertStatusBadge = ({ status }) => {
  const statusConfig = {
    open: {
      bg: 'bg-rose-500/20',
      text: 'text-rose-300',
      dot: 'bg-rose-400',
      label: 'Open'
    },
    acknowledged: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-300',
      dot: 'bg-amber-400',
      label: 'Acknowledged'
    },
    resolved: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-300',
      dot: 'bg-emerald-400',
      label: 'Resolved'
    }
  };

  const config = statusConfig[status] || statusConfig.open;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot} mr-1.5`}></span>
      {config.label}
    </span>
  );
};

export default function CaregiverAlerts() {
  const { serverUrl, socket, logout } = useContext(userDataContext);
  const [alerts, setAlerts] = useState(() => {
    // Initialize with cached alerts from localStorage
    try {
      const cachedAlerts = localStorage.getItem('caregiverAlerts');
      return cachedAlerts ? JSON.parse(cachedAlerts) : [];
    } catch (err) {
      console.warn("Failed to load cached alerts:", err);
      return [];
    }
  });
  const [loadingButtons, setLoadingButtons] = useState(new Set());
  const navigate = useNavigate();

  // Helper function to update alerts and cache them
  const updateAlertsAndCache = (newAlerts) => {
    setAlerts(newAlerts);
    try {
      localStorage.setItem('caregiverAlerts', JSON.stringify(newAlerts));
    } catch (err) {
      console.warn("Failed to cache alerts:", err);
    }
  };

  // Helper function to clear cached alerts
  const clearAlertsCache = () => {
    try {
      localStorage.removeItem('caregiverAlerts');
    } catch (err) {
      console.warn("Failed to clear alerts cache:", err);
    }
  };

  // Enhanced logout function that clears cache
  const handleLogout = () => {
    clearAlertsCache();
    logout();
  };

  const fetchAlerts = async () => {
    try {
      console.log("Fetching alerts from:", `${serverUrl}/api/emergency/list`);
      const res = await axios.get(`${serverUrl}/api/emergency/list`, { withCredentials: true });
      console.log("Received alerts:", res.data?.length || 0, "alerts");
      
      if (res.data && Array.isArray(res.data)) {
        updateAlertsAndCache(res.data);
        console.log("Successfully set alerts:", res.data.length);
      } else {
        console.warn("Invalid alerts data received:", res.data);
        // Don't clear cached alerts if API returns invalid data
      }
    } catch (err) {
      console.error("fetchAlerts error:", err);
      if (err.response) {
        console.error("Error response:", err.response.status, err.response.data);
      }
      // Don't clear alerts on error, keep existing ones
      if (err.response?.status === 401) {
        console.error("Authentication error - user may need to log in again");
      }
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    // Set up periodic refresh to ensure data consistency
    const refreshInterval = setInterval(() => {
      fetchAlerts();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear cached alerts when component unmounts or user logs out
  useEffect(() => {
    return () => {
      // Don't clear cache on unmount, only clear when explicitly logging out
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onEmergency = ({ alert }) => {
      if (!alert || !alert._id) {
        console.warn("Received invalid emergency alert:", alert);
        return;
      }

      setAlerts((prev) => {
        // Check if alert already exists to prevent duplicates
        const exists = prev.find(a => a._id === alert._id);
        let newAlerts;
        if (exists) {
          console.log("Alert already exists, updating instead of adding");
          newAlerts = prev.map((a) => (a._id === alert._id ? alert : a));
        } else {
          newAlerts = [alert, ...prev];
        }
        
        // Cache the updated alerts
        try {
          localStorage.setItem('caregiverAlerts', JSON.stringify(newAlerts));
        } catch (err) {
          console.warn("Failed to cache alerts:", err);
        }
        
        return newAlerts;
      });

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
      if (!alert || !alert._id) {
        console.warn("Received invalid alert update:", alert);
        return;
      }
      
      setAlerts((prev) => {
        const updated = prev.map((a) => (a._id === alert._id ? alert : a));
        console.log(`Updated alert ${alert._id} status to ${alert.status}`);
        
        // Cache the updated alerts
        try {
          localStorage.setItem('caregiverAlerts', JSON.stringify(updated));
        } catch (err) {
          console.warn("Failed to cache alerts:", err);
        }
        
        return updated;
      });
    };

    socket.on("emergency", onEmergency);
    socket.on("emergency-update", onUpdate);

    return () => {
      socket.off("emergency", onEmergency);
      socket.off("emergency-update", onUpdate);
    };
  }, [socket]);

  const acknowledge = async (id) => {
    setLoadingButtons(prev => new Set(prev).add(`ack-${id}`));
    try {
      const response = await axios.post(`${serverUrl}/api/emergency/ack/${id}`, {}, { withCredentials: true });
      // Update the alert in state with the response data
      if (response.data && response.data.alert) {
        const updatedAlerts = alerts.map((a) => (a._id === id ? response.data.alert : a));
        updateAlertsAndCache(updatedAlerts);
      } else {
        // Fallback to manual update
        const updatedAlerts = alerts.map((a) => (a._id === id ? { ...a, status: "acknowledged" } : a));
        updateAlertsAndCache(updatedAlerts);
      }
      console.log("Alert acknowledged successfully");
    } catch (err) {
      console.error("acknowledge error:", err);
      // Optionally show user feedback
      alert("Failed to acknowledge alert. Please try again.");
    } finally {
      setLoadingButtons(prev => {
        const newSet = new Set(prev);
        newSet.delete(`ack-${id}`);
        return newSet;
      });
    }
  };

  const resolve = async (id) => {
    setLoadingButtons(prev => new Set(prev).add(`resolve-${id}`));
    try {
      const response = await axios.post(`${serverUrl}/api/emergency/resolve/${id}`, {}, { withCredentials: true });
      // Update the alert in state with the response data
      if (response.data && response.data.alert) {
        const updatedAlerts = alerts.map((a) => (a._id === id ? response.data.alert : a));
        updateAlertsAndCache(updatedAlerts);
      } else {
        // Fallback to manual update
        const updatedAlerts = alerts.map((a) => (a._id === id ? { ...a, status: "resolved" } : a));
        updateAlertsAndCache(updatedAlerts);
      }
      console.log("Alert resolved successfully");
    } catch (err) {
      console.error("resolve error:", err);
      // Optionally show user feedback
      alert("Failed to resolve alert. Please try again.");
    } finally {
      setLoadingButtons(prev => {
        const newSet = new Set(prev);
        newSet.delete(`resolve-${id}`);
        return newSet;
      });
    }
  };

  // Add floating particles effect
  const particles = useRef([]);
  
  // Initialize particles
  useEffect(() => {
    particles.current = Array.from({ length: 20 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.1,
      angle: Math.random() * Math.PI * 2,
    }));
  }, []);

  // Calculate alert statistics
  const stats = {
    total: alerts.length,
    open: alerts.filter(a => a.status === 'open').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-rose-900 via-purple-900 to-indigo-900 text-white">
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

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-10"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-300 to-pink-300">
                Emergency Alerts
              </h1>
              <p className="text-rose-100/80 max-w-2xl">
                Monitor and manage emergency alerts in real-time with instant notifications and quick actions.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <PrimaryButton 
                onClick={() => navigate("/caregiver/reminders")}
                className="flex-1 md:flex-none"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                View Reminders
              </PrimaryButton>
              
              <SecondaryButton
                onClick={handleLogout}
                className="flex-1 md:flex-none"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </SecondaryButton>
            </div>
          </div>
        </motion.header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-rose-200/80 mb-1">Total Alerts</p>
                  <h3 className="text-3xl font-bold text-white">{stats.total}</h3>
                </div>
                <div className="p-3 bg-rose-500/20 rounded-xl">
                  <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center text-sm text-rose-100/60">
                  <span className="w-2 h-2 bg-rose-400 rounded-full mr-2"></span>
                  {stats.open} Active • {stats.acknowledged + stats.resolved} Handled
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-200/80 mb-1">Acknowledged</p>
                  <h3 className="text-3xl font-bold text-white">{stats.acknowledged}</h3>
                </div>
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center text-sm text-amber-100/60">
                  <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
                  {stats.total > 0 ? Math.round((stats.acknowledged / stats.total) * 100) : 0}% of total
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-200/80 mb-1">Resolved</p>
                  <h3 className="text-3xl font-bold text-white">{stats.resolved}</h3>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center text-sm text-emerald-100/60">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                  {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}% of total
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Alerts List */}
        <GlassCard>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-xl">
                  <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Recent Alerts</h2>
                  <p className="text-sm text-rose-100/60">Monitor and respond to emergency situations</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-rose-500/20 text-rose-300 text-sm font-medium rounded-full flex items-center">
                  <span className="w-2 h-2 bg-rose-400 rounded-full mr-2"></span>
                  {alerts.length} {alerts.length === 1 ? 'Alert' : 'Alerts'}
                </div>
                <button 
                  onClick={fetchAlerts}
                  className="p-1.5 text-rose-100/60 hover:text-rose-100 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Refresh alerts"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {alerts.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="p-5 mb-5 rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/10">
                      <svg className="w-12 h-12 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No active alerts</h3>
                    <p className="text-rose-100/70 max-w-sm">
                      All clear! You'll be notified immediately when a new emergency alert is received.
                    </p>
                  </motion.div>
                ) : (
                  alerts.map((alert, index) => (
                    <motion.article
                      key={alert._id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        transition: { 
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                          delay: index * 0.05
                        }
                      }}
                      exit={{ 
                        opacity: 0, 
                        x: -20,
                        transition: { duration: 0.2 }
                      }}
                      className={`relative overflow-hidden group ${
                        alert.status === 'open' 
                          ? 'bg-gradient-to-r from-rose-500/10 to-rose-500/5 border-l-4 border-rose-500' 
                          : alert.status === 'acknowledged'
                            ? 'bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-l-4 border-amber-500'
                            : 'bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-l-4 border-emerald-500'
                      } rounded-xl p-5 backdrop-blur-sm hover:shadow-lg transition-all duration-300`}
                      role="region"
                      aria-labelledby={`alert-${alert._id}`}
                    >
                      {/* Animated background on hover */}
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                        alert.status === 'open' ? 'bg-gradient-to-r from-rose-500/5 to-transparent' :
                        alert.status === 'acknowledged' ? 'bg-gradient-to-r from-amber-500/5 to-transparent' :
                        'bg-gradient-to-r from-emerald-500/5 to-transparent'
                      }`}></div>
                      
                      <div className="relative z-10">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`p-2.5 rounded-xl ${
                              alert.status === 'open' 
                                ? 'bg-rose-500/20 text-rose-400' 
                                : alert.status === 'acknowledged'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {alert.status === 'open' ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                ) : alert.status === 'acknowledged' ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                                )}
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <h3 id={`alert-${alert._id}`} className="text-lg font-semibold text-white">
                                  {alert.message || "Emergency Alert"}
                                </h3>
                                <AlertStatusBadge status={alert.status} />
                              </div>
                            
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-rose-100/70">
                                {alert.elderlyId && (
                                  <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Elderly ID: {String(alert.elderlyId).substring(0, 8)}...
                                  </span>
                                )}
                                
                                {alert.location?.address && (
                                  <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {alert.location.address.length > 30 
                                      ? `${alert.location.address.substring(0, 30)}...` 
                                      : alert.location.address}
                                  </span>
                                )}
                                
                                {alert.createdAt && (
                                  <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {new Date(alert.createdAt).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {alert.status === "open" && (
                              <PrimaryButton
                                onClick={() => acknowledge(alert._id)}
                                isLoading={loadingButtons.has(`ack-${alert._id}`)}
                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-amber-500/30"
                              >
                                {loadingButtons.has(`ack-${alert._id}`) ? "Acknowledging..." : "Acknowledge"}
                              </PrimaryButton>
                            )}
                            
                            {alert.status !== "resolved" ? (
                              <PrimaryButton
                                onClick={() => resolve(alert._id)}
                                isLoading={loadingButtons.has(`resolve-${alert._id}`)}
                                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:shadow-emerald-500/30"
                              >
                                {loadingButtons.has(`resolve-${alert._id}`) ? "Resolving..." : "Mark as Resolved"}
                              </PrimaryButton>
                            ) : (
                              <motion.div 
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 font-medium border border-emerald-500/30 cursor-default"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                ✓ Resolved
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Bottom border animation on hover */}
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                        alert.status === 'open' ? 'bg-rose-500' :
                        alert.status === 'acknowledged' ? 'bg-amber-500' :
                        'bg-emerald-500'
                      } transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
                    </motion.article>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </GlassCard>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-12 text-center text-rose-100/50 text-sm"
        >
          <p>Vocamate Caregiver Alerts • {new Date().getFullYear()}</p>
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
        
        /* Pulsing animation for critical alerts */
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(236, 72, 153, 0); }
          100% { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0); }
        }
        
        .pulse-alert {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
}
