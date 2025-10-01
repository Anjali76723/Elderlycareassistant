// client/src/pages/SignIn.jsx
import React, { useEffect, useRef, useState, useContext } from "react";
import axios from "axios";
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

  // petal animation state (same pattern as SignUp for visual consistency)
  const PETAL_COUNT = 8;
  const STAGGER_MS = 110;
  const [openedCount, setOpenedCount] = useState(0);
  const timeoutsRef = useRef([]);

  // inject small component-specific CSS so you don't need to modify global CSS
  useEffect(() => {
    const id = "signin-local-styles";
    if (document.getElementById(id)) return;

    const css = `
      /* left background image if present in public/ */
      .signin-left-bg {
        background-image: url('/signin-left.png');
        background-repeat: no-repeat;
        background-position: center 42%;
        background-size: contain;
      }

      /* slow subtle movement */
      @keyframes float-y {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
        100% { transform: translateY(0px); }
      }
      .float-slow { animation: float-y 6s ease-in-out infinite; }

      /* bloom for form card */
      @keyframes card-bloom {
        0% { opacity: 0; transform: translateY(18px) scale(.98); }
        60% { opacity: 1; transform: translateY(-6px) scale(1.01); }
        100% { transform: translateY(0) scale(1); }
      }
      .card-bloom { animation: card-bloom 520ms cubic-bezier(.2,.9,.2,1) both; }

      /* input underline / focus */
      .input-anim {
        transition: box-shadow .18s ease, transform .14s ease;
      }
      .input-anim:focus {
        box-shadow: 0 8px 24px rgba(2,6,23,0.28);
        transform: translateY(-2px);
      }

      /* suave button */
      .cta-btn {
        transition: transform .12s ease, box-shadow .12s ease;
      }
      .cta-btn:hover { transform: translateY(-3px); box-shadow: 0 14px 28px rgba(16,24,40,0.16); }

      /* subtle petal transition handled inline for transform/opacity */
      /* reduced motion: open all petals at once */
      @media (prefers-reduced-motion: reduce) {
        .float-slow { animation: none; }
      }
    `;
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = css;
    document.head.appendChild(s);
  }, []);

  // open petals staggered
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setOpenedCount(PETAL_COUNT);
      return;
    }

    setOpenedCount(0);
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];

    for (let i = 0; i < PETAL_COUNT; i++) {
      const t = setTimeout(() => setOpenedCount((p) => p + 1), i * STAGGER_MS);
      timeoutsRef.current.push(t);
    }
    // after petals, ensure full center shows
    const tEnd = setTimeout(() => setOpenedCount((p) => Math.max(p, PETAL_COUNT)), PETAL_COUNT * STAGGER_MS + 80);
    timeoutsRef.current.push(tEnd);

    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      let res;
      if (isElderly) {
        res = await axios.post(
          `${serverUrl}/api/auth/pin-login`,
          { email, pin },
          { withCredentials: true }
        );
      } else {
        res = await axios.post(
          `${serverUrl}/api/auth/signin`,
          { email, password },
          { withCredentials: true }
        );
      }
      setLoading(false);
      setUserData(res.data.user);
      navigate("/");
    } catch (error) {
      setLoading(false);
      setErr(error?.response?.data?.message || "Login failed");
    }
  };

  // Render petals (same visual family as SignUp)
  const renderPetals = () => {
    return Array.from({ length: PETAL_COUNT }).map((_, i) => {
      const angle = i * (360 / PETAL_COUNT);
      const isOpen = i < openedCount;
      const ellipseStyle = {
        transition: "transform 480ms cubic-bezier(.16,.9,.3,1), opacity 300ms ease",
        transformOrigin: "50% 75%",
        transform: isOpen ? "scale(1) translateY(0)" : "scale(0.6) translateY(22px)",
        opacity: isOpen ? 0.95 : 0,
        fill: `rgba(255,255,255,${0.06 + ((i % 3) * 0.03)})`,
      };

      return (
        <g key={i} transform={`rotate(${angle})`}>
          <ellipse cx="0" cy="-40" rx="30" ry="62" style={ellipseStyle} />
        </g>
      );
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0b1028] to-[#1b2548] py-8 px-6">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* LEFT: decoration */}
        <div className="relative flex flex-col items-center justify-center signin-left-bg overflow-hidden">
          {/* subtle moving overlay */}
          <div className="absolute inset-0 opacity-40 filter blur-sm float-slow" aria-hidden />
          <div className="relative z-10 flex flex-col items-center gap-6 py-16 px-6">
            {/* atom/flower svg */}
            <svg className="w-72 h-72" viewBox="-110 -110 220 220" aria-hidden>
              <g transform="translate(0,8)">
                {renderPetals()}
                <circle
                  cx="0"
                  cy="36"
                  r="28"
                  fill="#ffffff"
                  style={{
                    transition: "opacity 380ms ease, transform 380ms ease",
                    opacity: openedCount >= PETAL_COUNT ? 1 : 0,
                    transform: openedCount >= PETAL_COUNT ? "scale(1)" : "scale(.84)",
                  }}
                />
                {/* a tiny soft highlight */}
                <circle
                  cx="-6"
                  cy="26"
                  r="10"
                  fill="rgba(255,255,255,0.08)"
                  style={{
                    transition: "opacity 480ms ease",
                    opacity: openedCount >= PETAL_COUNT ? 1 : 0,
                  }}
                />
              </g>
            </svg>

            <div className="text-center px-6">
              <h2 className="text-4xl font-bold text-white/95">Welcome back</h2>
              <p className="text-white/80 mt-3 max-w-md">
                Sign in to manage reminders, SOS, and voice features. Simple and friendly.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: form */}
        <div className="relative z-20">
          <form
            onSubmit={handleSubmit}
            className="bg-gradient-to-b from-[#121330]/80 to-[#121330]/60 p-8 rounded-2xl shadow-xl card-bloom"
            aria-label="Sign in"
          >
            <h2 className="text-3xl font-semibold text-white mb-2">Sign In</h2>
            <p className="text-sm text-white/70 mb-4">Sign in as caregiver or elderly (PIN).</p>

            <label className="block mb-2 text-white">Email</label>
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="w-full mb-4 p-3 rounded text-black bg-white text-lg input-anim"
            />

            <div className="mb-3 flex items-center gap-4">
              <label className="inline-flex items-center text-white">
                <input
                  type="radio"
                  checked={!isElderly}
                  onChange={() => setIsElderly(false)}
                  className="mr-2"
                />
                Caregiver
              </label>
              <label className="inline-flex items-center text-white">
                <input
                  type="radio"
                  checked={isElderly}
                  onChange={() => setIsElderly(true)}
                  className="mr-2"
                />
                Elderly (PIN)
              </label>
            </div>

            {!isElderly && (
              <>
                <label className="block mb-2 text-white">Password</label>
                <div className="relative">
                  <input
                    placeholder="Password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full mb-4 p-3 rounded text-black bg-white text-lg input-anim"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-3 text-sm text-slate-600 bg-white/0 px-2 py-1 rounded"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </>
            )}

            {isElderly && (
              <>
                <label className="block mb-2 text-white">PIN</label>
                <input
                  placeholder="PIN (e.g. 1234)"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full mb-4 p-3 rounded text-black bg-white text-lg input-anim"
                />
              </>
            )}

            {err && <div className="text-red-400 mb-3">{err}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 p-4 bg-white text-black rounded text-lg font-semibold cta-btn"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="mt-4 flex justify-between items-center text-sm">
              <p className="text-white/80">
                Don't have an account?{" "}
                <span
                  onClick={() => navigate("/signup")}
                  className="text-blue-400 hover:underline cursor-pointer"
                >
                  Sign up
                </span>
              </p>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-white/60 hover:text-white text-sm"
              >
                Back home
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
