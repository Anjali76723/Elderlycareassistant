// client/src/pages/SignUp.jsx
import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { userDataContext } from "../context/UserContext";

export default function SignUp() {
  const { serverUrl, setUserData } = useContext(userDataContext);
  const navigate = useNavigate();

  // form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("caregiver");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Inject beautiful CSS animations
  useEffect(() => {
    const id = "signup-enhanced-styles";
    if (document.getElementById(id)) return;
    const css = `
      @keyframes aurora-gradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      @keyframes float-particles {
        0% { transform: translateY(100vh) translateX(0) rotate(0deg); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-100vh) translateX(50px) rotate(360deg); opacity: 0; }
      }

      @keyframes slide-in-right {
        from { opacity: 0; transform: translateX(50px); }
        to { opacity: 1; transform: translateX(0); }
      }

      @keyframes glow-pulse {
        0%, 100% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.3); }
        50% { box-shadow: 0 0 40px rgba(147, 51, 234, 0.6); }
      }

      .aurora-bg {
        background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #4facfe, #a8edea);
        background-size: 400% 400%;
        animation: aurora-gradient 20s ease infinite;
      }

      .floating-particle {
        position: fixed;
        width: 6px;
        height: 6px;
        background: white;
        border-radius: 50%;
        animation: float-particles linear infinite;
        pointer-events: none;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
      }

      .glass-morph {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(25px);
        border: 1px solid rgba(255, 255, 255, 0.25);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.4);
        animation: slide-in-right 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .elegant-input {
        background: rgba(255, 255, 255, 0.95);
        border: 2px solid transparent;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .elegant-input:focus {
        background: white;
        border-color: #a78bfa;
        transform: translateY(-3px);
        box-shadow: 0 12px 30px rgba(167, 139, 250, 0.35);
        outline: none;
      }

      .gradient-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        background-size: 200% 200%;
        transition: all 0.4s ease;
        position: relative;
        overflow: hidden;
      }

      .gradient-button:hover:not(:disabled) {
        background-position: 100% 0;
        transform: translateY(-4px);
        box-shadow: 0 20px 40px rgba(102, 126, 234, 0.4);
      }

      .gradient-button::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        transition: left 0.5s;
      }

      .gradient-button:hover::after {
        left: 100%;
      }

      .role-card {
        transition: all 0.3s ease;
        cursor: pointer;
      }

      .role-card:hover {
        transform: translateY(-5px) scale(1.02);
      }

      .role-card.active {
        background: rgba(167, 139, 250, 0.25);
        border-color: #a78bfa;
        animation: glow-pulse 2s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .aurora-bg, .floating-particle, .gradient-button::after { animation: none; }
      }
    `;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = css;
    document.head.appendChild(style);
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await axios.post(
        `${serverUrl}/api/auth/signup`,
        { name, email, password, pin, role },
        { withCredentials: true }
      );
      setLoading(false);
      // Store token in localStorage for authenticated API requests
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      setUserData(res.data.user);
      navigate("/");
    } catch (error) {
      setLoading(false);
      setErr(error?.response?.data?.message || "error");
    }
  };

  // Render floating particles for aesthetic background
  const renderFloatingParticles = () => {
    const particles = [];
    for (let i = 0; i < 30; i++) {
      const duration = 15 + Math.random() * 10;
      const delay = Math.random() * 15;
      const left = Math.random() * 100;
      
      particles.push(
        <div
          key={`particle-${i}`}
          className="floating-particle"
          style={{
            left: `${left}%`,
            bottom: 0,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
        />
      );
    }
    return particles;
  };

  return (
    <div className="min-h-screen relative overflow-hidden aurora-bg flex items-center justify-center py-8 px-4">
      {/* Floating Particles */}
      {renderFloatingParticles()}

      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
        {/* Left Welcome Section */}
        <div className="hidden lg:flex flex-col items-center justify-center text-center p-10 space-y-8">
          {/* Sparkle Icon with Glow */}
          <div className="relative">
            <div className="absolute inset-0 bg-purple-400/30 rounded-full blur-3xl animate-pulse" />
            <div className="relative bg-white/15 backdrop-blur-md rounded-full p-16 border-2 border-white/40">
              <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="space-y-5">
            <h1 className="text-6xl font-extrabold text-white drop-shadow-2xl">
              Join Our Family
            </h1>
            <p className="text-2xl text-white/95 max-w-lg leading-relaxed">
              Create your account and start your journey of care, comfort, and connection.
            </p>
            
            {/* Feature Highlights */}
            <div className="grid grid-cols-2 gap-4 pt-6">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/30">
                <div className="flex items-center gap-3">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white font-semibold">Smart Reminders</span>
                </div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/30">
                <div className="flex items-center gap-3">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white font-semibold">SOS Alerts</span>
                </div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/30">
                <div className="flex items-center gap-3">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                  </svg>
                  <span className="text-white font-semibold">Voice Assistant</span>
                </div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/30">
                <div className="flex items-center gap-3">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white font-semibold">Care & Comfort</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right SignUp Form - Glassmorphism */}
        <div className="w-full max-w-lg mx-auto">
          <form
            onSubmit={handleSubmit}
            className="glass-morph rounded-3xl p-10 space-y-6"
          >
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-3xl mb-4 shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-white">Create Account</h2>
              <p className="text-white/90 text-lg">Begin your journey of care</p>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <label className="block text-white font-semibold text-sm uppercase tracking-wide">Full Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full p-4 rounded-xl text-gray-800 elegant-input text-base font-medium"
              />
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-white font-semibold text-sm uppercase tracking-wide">Email Address</label>
              <input
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                type="email"
                className="w-full p-4 rounded-xl text-gray-800 elegant-input text-base font-medium"
              />
            </div>

            {/* Role Selector - Card Style */}
            <div className="space-y-3">
              <label className="block text-white font-semibold text-sm uppercase tracking-wide">Account Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole("caregiver")}
                  className={`role-card p-5 rounded-2xl border-2 font-bold ${role === "caregiver" ? 'active' : 'bg-white/10 border-white/30 text-white/70'}`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    <span className="text-white">Caregiver</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("elderly")}
                  className={`role-card p-5 rounded-2xl border-2 font-bold ${role === "elderly" ? 'active' : 'bg-white/10 border-white/30 text-white/70'}`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white">Elderly</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Password for Caregiver */}
            {role === "caregiver" && (
              <div className="space-y-2">
                <label className="block text-white font-semibold text-sm uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input
                    required
                    placeholder="Create a strong password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 pr-24 rounded-xl text-gray-800 elegant-input text-base font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 text-sm font-bold text-purple-600 bg-purple-100 hover:bg-purple-200 rounded-lg transition-all"
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}

            {/* PIN for Elderly */}
            {role === "elderly" && (
              <div className="space-y-2">
                <label className="block text-white font-semibold text-sm uppercase tracking-wide">PIN Code (4-6 digits)</label>
                <input
                  required
                  placeholder="Create your PIN"
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength="6"
                  className="w-full p-4 rounded-xl text-gray-800 elegant-input text-base font-medium text-center tracking-widest"
                />
              </div>
            )}

            {/* Error Message */}
            {err && (
              <div className="bg-red-500/20 border-2 border-red-400/50 text-red-100 px-5 py-4 rounded-2xl text-sm flex items-center gap-3">
                <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{err}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full p-5 rounded-2xl text-white text-lg font-bold gradient-button disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                  Create Account
                </span>
              )}
            </button>

            {/* Footer Links */}
            <div className="pt-6 space-y-4">
              <div className="text-center">
                <span className="text-white/80 text-base">
                  Already have an account?{" "}
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/signin")}
                  className="text-white font-bold hover:underline text-base"
                >
                  Sign In
                </button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-white/70 hover:text-white text-sm transition-colors"
                >
                  ← Back to Home
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
