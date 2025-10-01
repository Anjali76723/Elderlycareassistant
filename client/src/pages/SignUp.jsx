// client/src/pages/SignUp.jsx
import React, { useEffect, useState, useContext, useRef } from "react";
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

  // petal animation state
  const PETAL_COUNT = 8;
  const STAGGER_MS = 120;
  const [openedCount, setOpenedCount] = useState(0);
  const timeoutsRef = useRef([]);

  // Inject CSS for visuals
  useEffect(() => {
    const id = "signup-local-styles";
    if (document.getElementById(id)) return;
    const css = `
      .signup-left-bg {
        background-image: url('/signup-left.png');
        background-repeat: no-repeat;
        background-position: center 40%;
        background-size: contain;
      }
      @keyframes bg-zoom {
        0% { transform: scale(1) translateY(0); }
        50% { transform: scale(1.03) translateY(-6px); }
        100% { transform: scale(1) translateY(0); }
      }
      .bg-zoom { animation: bg-zoom 35s ease-in-out infinite; transform-origin: center; }
      @keyframes card-enter {
        from { opacity: 0; transform: translateY(18px) scale(.995) }
        to { opacity: 1; transform: translateY(0) scale(1) }
      }
      .card-enter { animation: card-enter 420ms cubic-bezier(.2,.9,.2,1) both; }
    `;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = css;
    document.head.appendChild(style);
  }, []);

  // Petal opening animation
  useEffect(() => {
    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setOpenedCount(PETAL_COUNT);
      return;
    }

    setOpenedCount(0);
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];

    for (let i = 0; i < PETAL_COUNT; i += 1) {
      const t = setTimeout(() => {
        setOpenedCount((prev) => prev + 1);
      }, i * STAGGER_MS);
      timeoutsRef.current.push(t);
    }

    const centerDelay = PETAL_COUNT * STAGGER_MS + 80;
    const tCenter = setTimeout(() => {
      setOpenedCount((prev) => Math.max(prev, PETAL_COUNT));
    }, centerDelay);
    timeoutsRef.current.push(tCenter);

    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
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
      setUserData(res.data.user);
      navigate("/");
    } catch (error) {
      setLoading(false);
      setErr(error?.response?.data?.message || "error");
    }
  };

  // Render petals
  const renderPetals = () => {
    return Array.from({ length: PETAL_COUNT }).map((_, i) => {
      const angle = i * (360 / PETAL_COUNT);
      const isOpen = i < openedCount;
      const ellipseStyle = {
        transition:
          "transform 520ms cubic-bezier(.16,.9,.3,1), opacity 420ms ease",
        transformOrigin: "50% 75%",
        transform: isOpen ? "scale(1) translateY(0)" : "scale(0.62) translateY(20px)",
        opacity: isOpen ? 1 : 0,
        fill: `rgba(255,255,255,${0.08 + (i % 3) * 0.03})`,
      };

      return (
        <g key={i} transform={`rotate(${angle})`}>
          <ellipse cx="0" cy="-40" rx="24" ry="58" style={ellipseStyle} />
        </g>
      );
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0b1028] to-[#1b2548] py-8 px-6">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Left decorative panel */}
        <div className="relative flex flex-col items-center justify-center signup-left-bg overflow-hidden">
          <div className="absolute inset-0 bg-clip-padding bg-zoom" aria-hidden />
          <div className="relative z-10 flex flex-col items-center gap-6 py-20 px-6">
            <svg className="w-64 h-64" viewBox="-100 -100 200 200" aria-hidden>
              <g transform="translate(0,8)">
                {renderPetals()}
                <circle
                  cx="0"
                  cy="36"
                  r="22"
                  fill="#ffffff"
                  style={{
                    transition: "opacity 420ms ease, transform 420ms ease",
                    opacity: openedCount >= PETAL_COUNT ? 1 : 0,
                    transform:
                      openedCount >= PETAL_COUNT ? "scale(1)" : "scale(.8)",
                  }}
                />
              </g>
            </svg>
            <div className="text-center px-6">
              <h2 className="text-4xl font-bold text-white/95">
                Welcome — Join the family
              </h2>
              <p className="text-white/80 mt-3 max-w-md">
                Create an account to start reminders, SOS and voice features.
                Gentle, simple and friendly.
              </p>
            </div>
          </div>
        </div>

        {/* Right signup form */}
        <div className="relative z-20">
          <form
            onSubmit={handleSubmit}
            className="bg-gradient-to-b from-[#121330]/80 to-[#121330]/60 p-8 rounded-2xl shadow-xl card-enter"
          >
            <h2 className="text-3xl font-semibold text-white mb-2">Sign Up</h2>
            <p className="text-sm text-white/70 mb-6">
              Create your caregiver or elderly account
            </p>

            <label className="block mb-2 text-white">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full mb-4 p-3 rounded text-black bg-white text-lg"
            />

            <label className="block mb-2 text-white">Email</label>
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="w-full mb-4 p-3 rounded text-black bg-white text-lg"
            />

            <label className="block mb-2 text-white">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full mb-4 p-3 rounded text-black bg-white text-lg"
            >
              <option value="caregiver">Caregiver</option>
              <option value="elderly">Elderly (use PIN)</option>
            </select>

            {role === "caregiver" && (
              <>
                <label className="block mb-2 text-white">Password</label>
                <input
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mb-4 p-3 rounded text-black bg-white text-lg"
                />
              </>
            )}

            {role === "elderly" && (
              <>
                <label className="block mb-2 text-white">PIN (4 digits)</label>
                <input
                  placeholder="PIN (e.g. 1234)"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full mb-4 p-3 rounded text-black bg-white text-lg"
                />
              </>
            )}

            {err && <div className="text-red-400 mb-3">{err}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 p-4 bg-white text-black rounded text-lg font-semibold"
            >
              {loading ? "Signing up..." : "Sign Up"}
            </button>

            {/* Already have an account link */}
            <p className="mt-4 text-center text-white/80">
              Already have an account?{" "}
              <span
                onClick={() => navigate("/signin")}
                className="text-blue-400 hover:underline cursor-pointer"
              >
                Sign in
              </span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
