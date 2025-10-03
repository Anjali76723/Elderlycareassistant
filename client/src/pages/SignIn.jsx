// client/src/pages/SignIn.jsx
import React, { useEffect, useState, useContext } from "react";
import api from "../utils/axiosConfig";
import { useNavigate } from "react-router-dom";
import { userDataContext } from "../context/UserContext";

export default function SignIn() {
  const { serverUrl, setUserData } = useContext(userDataContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [isElderly, setIsElderly] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Inject beautiful caring CSS animations
  useEffect(() => {
    const id = "signin-enhanced-styles";
    if (document.getElementById(id)) return;

    const css = `
      @keyframes gradient-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      @keyframes float-hearts {
        0% { 
          transform: translateY(0) translateX(0) scale(0.5); 
          opacity: 0; 
        }
        2% { 
          opacity: 0.7; 
        }
        5% {
          transform: translateY(-5vh) translateX(5px) scale(0.8);
          opacity: 1;
        }
        15% {
          transform: translateY(-20vh) translateX(-8px) scale(0.9);
          opacity: 1;
        }
        30% {
          transform: translateY(-40vh) translateX(10px) scale(1);
          opacity: 1;
        }
        50% { 
          transform: translateY(-60vh) translateX(-5px) scale(1.1); 
          opacity: 1; 
        }
        70% {
          transform: translateY(-80vh) translateX(8px) scale(1);
          opacity: 1;
        }
        85% {
          transform: translateY(-100vh) translateX(-10px) scale(0.9);
          opacity: 0.8;
        }
        95% {
          transform: translateY(-115vh) translateX(0) scale(0.7);
          opacity: 0.5;
        }
        100% { 
          transform: translateY(-130vh) translateX(0) scale(0.5); 
          opacity: 0; 
        }
      }

      @keyframes gentle-pulse {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.05); opacity: 0.8; }
      }

      @keyframes fade-in-up {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }

      @keyframes ripple {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(2.5); opacity: 0; }
      }

      .animated-bg {
        background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #4facfe);
        background-size: 400% 400%;
        animation: gradient-shift 15s ease infinite;
      }

      .floating-heart {
        position: fixed;
        bottom: 0;
        font-size: 24px;
        animation: float-hearts linear infinite;
        pointer-events: none;
        filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
        z-index: 1;
        will-change: transform, opacity;
      }

      .glass-card {
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        animation: fade-in-up 0.6s ease-out;
      }

      .caring-input {
        background: rgba(255, 255, 255, 0.9);
        border: 2px solid transparent;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .caring-input:focus {
        background: rgba(255, 255, 255, 1);
        border-color: #667eea;
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        outline: none;
      }

      .caring-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .caring-button:hover:not(:disabled) {
        transform: translateY(-3px);
        box-shadow: 0 15px 35px rgba(102, 126, 234, 0.4);
      }

      .caring-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -200%;
        width: 200%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        animation: shimmer 3s infinite;
      }

      .ripple-circle {
        position: absolute;
        border: 2px solid rgba(255, 255, 255, 0.6);
        border-radius: 50%;
        animation: ripple 3s infinite;
      }

      .toggle-option {
        transition: all 0.3s ease;
        cursor: pointer;
      }

      .toggle-option:hover {
        transform: scale(1.05);
      }

      .toggle-option.active {
        background: rgba(102, 126, 234, 0.3);
        border-color: #667eea;
      }

      @media (prefers-reduced-motion: reduce) {
        .animated-bg, .floating-heart, .caring-button::before, .ripple-circle {
          animation: none;
        }
        .glass-card { animation: none; }
      }
    `;
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = css;
    document.head.appendChild(s);
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      let res;
      if (isElderly) {
        res = await api.post(
          `/api/auth/pin-login`,
          { email, pin }
        );
      } else {
        res = await api.post(
          `/api/auth/signin`,
          { email, password }
        );
      }
      setLoading(false);
      // Store token in localStorage for authenticated API requests
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      setUserData(res.data.user);
      navigate("/");
    } catch (error) {
      setLoading(false);
      setErr(error?.response?.data?.message || "Login failed");
    }
  };

  // Render floating white hearts - continuously moving from bottom to top at different timestamps
  const renderFloatingHearts = () => {
    const hearts = [];
    const totalHearts = 50; // More hearts for continuous coverage
    
    for (let i = 0; i < totalHearts; i++) {
      // Each heart has different duration and delay for varied motion
      const duration = 10 + (i % 8); // Durations from 10-17 seconds
      const delay = (i * 0.4) % 15; // Stagger delays within 15 second window
      const leftPosition = (i * 7 + Math.random() * 20) % 100; // Spread across screen
      const size = 30 + (i % 5) * 6; // Sizes from 30-60px
      
      hearts.push(
        <div
          key={`heart-${i}`}
          className="floating-heart"
          style={{
            left: `${leftPosition}%`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
            animationIterationCount: 'infinite',
            fontSize: `${size}px`,
            color: 'white',
            textShadow: '0 0 20px rgba(255, 255, 255, 1), 0 0 40px rgba(255, 255, 255, 0.6)',
          }}
        >
          ♥
        </div>
      );
    }
    return hearts;
  };

  // Render decorative ripple circles
  const renderRipples = () => {
    return [1, 2, 3].map((i) => (
      <div
        key={i}
        className="ripple-circle"
        style={{
          width: '300px',
          height: '300px',
          top: '20%',
          left: '10%',
          animationDelay: `${i * 1}s`
        }}
      />
    ));
  };

  return (
    <div className="min-h-screen relative overflow-hidden animated-bg flex items-center justify-center py-8 px-4">
      {/* Floating hearts background */}
      {renderFloatingHearts()}
      
      {/* Decorative ripple circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {renderRipples()}
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* LEFT: Welcome Section */}
        <div className="hidden lg:flex flex-col items-center justify-center text-center p-8 space-y-6">
          {/* Large caring heart icon with pulse animation */}
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl" style={{ animation: 'gentle-pulse 3s ease-in-out infinite' }} />
            <div className="relative bg-white/10 backdrop-blur-md rounded-full p-12 border-2 border-white/30">
              <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Welcome text */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-white drop-shadow-lg">
              Welcome Back!
            </h1>
            <p className="text-xl text-white/90 max-w-md leading-relaxed">
              Your trusted companion for elderly care. Safe, secure, and always here for you.
            </p>
            
            {/* Feature badges */}
            <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-white font-medium">Secure Login</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                <span className="text-white font-medium">Always Alert</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Login Form */}
        <div className="w-full max-w-md mx-auto">
          <form
            onSubmit={handleSubmit}
            className="glass-card rounded-3xl p-8 space-y-6"
            aria-label="Sign in form"
          >
            {/* Header with icon */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-3">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white">Sign In</h2>
              <p className="text-white/80">Access your caring dashboard</p>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-white font-medium text-sm">Email Address</label>
              <input
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                type="email"
                className="w-full p-4 rounded-xl text-gray-800 caring-input text-base font-medium"
              />
            </div>

            {/* User Type Toggle */}
            <div className="space-y-3">
              <label className="block text-white font-medium text-sm">Login As</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsElderly(false)}
                  className={`toggle-option p-4 rounded-xl border-2 font-semibold transition-all ${
                    !isElderly 
                      ? 'active bg-white/30 border-white text-white' 
                      : 'bg-white/10 border-white/30 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    <span>Caregiver</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsElderly(true)}
                  className={`toggle-option p-4 rounded-xl border-2 font-semibold transition-all ${
                    isElderly 
                      ? 'active bg-white/30 border-white text-white' 
                      : 'bg-white/10 border-white/30 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span>Elderly</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Password Input (for Caregiver) */}
            {!isElderly && (
              <div className="space-y-2">
                <label className="block text-white font-medium text-sm">Password</label>
                <div className="relative">
                  <input
                    required
                    placeholder="Enter your password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 pr-20 rounded-xl text-gray-800 caring-input text-base font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}

            {/* PIN Input (for Elderly) */}
            {isElderly && (
              <div className="space-y-2">
                <label className="block text-white font-medium text-sm">PIN Code</label>
                <input
                  required
                  placeholder="Enter your 4-digit PIN"
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength="6"
                  className="w-full p-4 rounded-xl text-gray-800 caring-input text-base font-medium text-center tracking-widest"
                />
              </div>
            )}

            {/* Error Message */}
            {err && (
              <div className="bg-red-500/20 border border-red-400/50 text-red-100 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{err}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full p-4 rounded-xl text-white text-lg font-bold caring-button disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Footer Links */}
            <div className="pt-4 space-y-3">
              <div className="text-center">
                <span className="text-white/70 text-sm">
                  Don't have an account?{" "}
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="text-white font-semibold hover:underline text-sm"
                >
                  Sign up here
                </button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  ← Back to home
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
