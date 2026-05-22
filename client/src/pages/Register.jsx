import { useState, useEffect, useRef } from "react";
import { register } from "../api/auth";
import { useNavigate, Link } from "react-router-dom";

// Same poster array as Login (8 posters for smooth scrolling)
const POSTERS = [
  "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  "https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg",
  "https://image.tmdb.org/t/p/w500/9Gtg2DzBhmYamXBS1hKAhiwbBKS.jpg",
  "https://image.tmdb.org/t/p/w500/k9tv1rXZbOhH7eiCk378x61kNQ1.jpg",
  "https://image.tmdb.org/t/p/w500/xBHvZcjRiWyobQ9kxBhO6B2dtRI.jpg",
  "https://image.tmdb.org/t/p/w500/6CoRTJTmijhBLJTUNoVSUNxZMEI.jpg",
  "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
  "https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
];

/* ─── Floating dust particle canvas (identical) ───────────────── */
function DustCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);
    let raf;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -Math.random() * 0.25 - 0.05,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    function draw() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,175,55,${p.alpha})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
      });
      raf = requestAnimationFrame(draw);
    }

    draw();
    const ro = new ResizeObserver(() => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}

/* ─── Animated poster strip (identical) ───────────────────────── */
function PosterStrip({ posters, direction = 1, speed = 0.35 }) {
  const trackRef = useRef(null);
  const posRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf;
    const CARD_W = 160 + 12;
    const total = CARD_W * posters.length;

    function animate() {
      posRef.current -= speed * direction;
      if (posRef.current <= -total) posRef.current += total;
      if (posRef.current > 0) posRef.current -= total;
      track.style.transform = `translateY(${posRef.current}px)`;
      raf = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(raf);
  }, [direction, speed, posters.length]);

  const doubled = [...posters, ...posters];

  return (
    <div style={{ overflow: "hidden", height: "100%", position: "relative" }}>
      <div
        ref={trackRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          willChange: "transform",
        }}
      >
        {doubled.map((src, i) => (
          <div
            key={i}
            style={{
              width: "160px",
              aspectRatio: "2/3",
              borderRadius: "10px",
              overflow: "hidden",
              flexShrink: 0,
              boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
            }}
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Gold divider (identical) ────────────────────────────────── */
function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "0" }}>
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, rgba(212,175,55,0.3))" }} />
      <span style={{ color: "rgba(212,175,55,0.5)", fontSize: "10px", letterSpacing: "4px", textTransform: "uppercase" }}>or</span>
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, rgba(212,175,55,0.3))" }} />
    </div>
  );
}

/* ─── Stylish input (identical) ───────────────────────────────── */
function CinemaInput({ type, value, onChange, placeholder, autoComplete, children }) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "8px",
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${focused ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.08)"}`,
        transition: "border-color 0.2s ease",
      }}
    >
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: "14px 16px",
          background: "transparent",
          border: "none",
          outline: "none",
          color: "#f5f0e8",
          fontSize: "14px",
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.03em",
          boxSizing: "border-box",
        }}
      />
      {children}
    </div>
  );
}

/* ─── Main Register Component (styled exactly like Login) ──────── */
export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    adminCode: "",
    showPassword: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const updateField = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const username = form.username.trim();
    const email = form.email.trim();
    const password = form.password;

    if (!username || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      const res = await register({ username, email, password, adminCode: form.adminCode });
      if (res?.user) {
        // Store token and user data immediately after registration
        if (res.token) {
          localStorage.setItem("token", res.token);
        }
        localStorage.setItem("user", JSON.stringify(res.user));
        // Notify components about the updated user data
        window.dispatchEvent(new CustomEvent("userDataChanged"));
        navigate("/");
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Google Fonts & global styles (identical to Login) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Cinzel:wght@400;600&display=swap');

        .cinema-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #d4af37, #b8960c, #d4af37);
          background-size: 200% 200%;
          color: #0a0803;
          border: none;
          border-radius: 8px;
          padding: 14px;
          font-family: 'Cinzel', serif;
          font-size: 13px;
          letter-spacing: 3px;
          text-transform: uppercase;
          cursor: pointer;
          transition: background-position 0.5s ease, opacity 0.2s;
          width: 100%;
          font-weight: 600;
        }
        .cinema-btn:hover:not(:disabled) { background-position: 100% 0; }
        .cinema-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .cinema-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
          pointer-events: none;
        }

        .signin-panel {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .signin-panel.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .error-shake {
          animation: shake 0.4s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }

        .loading-dots::after {
          content: '';
          animation: dots 1.2s steps(3, end) infinite;
        }
        @keyframes dots {
          0% { content: ''; }
          33% { content: '.'; }
          66% { content: '..'; }
          100% { content: '...'; }
        }

        input::placeholder { color: rgba(200,185,150,0.3); }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          background: "#07060a",
          color: "#f5f0e8",
          overflow: "hidden",
          fontFamily: "'Cormorant Garamond', serif",
          position: "relative",
        }}
      >
        {/* ── Ambient gold vignette ── */}
        <div style={{
          position: "fixed",
          inset: 0,
          background: "radial-gradient(ellipse 60% 60% at 25% 50%, rgba(212,175,55,0.04) 0%, transparent 70%), radial-gradient(ellipse 40% 80% at 80% 20%, rgba(120,80,200,0.06) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }} />

        {/* ══════════════════ LEFT PANEL (posters + dust) ══════════════════ */}
        <div
          style={{
            display: "none",
            position: "relative",
            width: "52%",
            overflow: "hidden",
          }}
          className="lg-flex"
        >
          <style>{`
            @media (min-width: 1024px) { .lg-flex { display: flex !important; } }
          `}</style>

          {/* Dark overlay */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 3,
            background: "linear-gradient(to right, rgba(7,6,10,0.1) 0%, rgba(7,6,10,0.5) 85%, rgba(7,6,10,1) 100%), linear-gradient(to bottom, rgba(7,6,10,0.7) 0%, transparent 30%, transparent 70%, rgba(7,6,10,0.7) 100%)",
          }} />

          <DustCanvas />

          {/* Three scrolling poster columns */}
          <div style={{
            display: "flex",
            gap: "12px",
            padding: "0 24px",
            height: "100vh",
            alignItems: "flex-start",
            flex: 1,
            opacity: 0.75,
          }}>
            <PosterStrip posters={POSTERS.slice(0, 4)} direction={1} speed={0.3} />
            <PosterStrip posters={POSTERS.slice(2, 6)} direction={-1} speed={0.45} />
            <PosterStrip posters={POSTERS.slice(4, 8)} direction={1} speed={0.28} />
          </div>

          {/* Side text badge */}
          <div style={{
            position: "absolute",
            bottom: "48px",
            left: "32px",
            zIndex: 10,
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(212,175,55,0.2)",
              borderRadius: "6px",
              padding: "10px 16px",
              backdropFilter: "blur(12px)",
            }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#d4af37", boxShadow: "0 0 8px #d4af37" }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "rgba(212,175,55,0.8)", letterSpacing: "2px", textTransform: "uppercase" }}>
                Your next obsession awaits
              </span>
            </div>
          </div>
        </div>

        {/* ══════════════════ RIGHT PANEL (registration form) ══════════════════ */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          position: "relative",
          zIndex: 10,
        }}>
          <div
            className={`signin-panel${mounted ? " visible" : ""}`}
            style={{ width: "100%", maxWidth: "400px" }}
          >
            {/* ── Brand & welcome ── */}
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
              }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "18px",
                  letterSpacing: "4px",
                  color: "#d4af37",
                  textTransform: "uppercase",
                }}>
                  MyPOV
                </span>
              </div>

              <h1 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "38px",
                fontWeight: 300,
                letterSpacing: "-0.5px",
                lineHeight: 1.1,
                margin: "0 0 10px",
                color: "#f5f0e8",
              }}>
                Join the<br />
                <em style={{ fontStyle: "italic", color: "rgba(212,175,55,0.85)" }}>audience.</em>
              </h1>

              <p style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                color: "rgba(200,185,150,0.4)",
                letterSpacing: "2px",
                textTransform: "uppercase",
                margin: 0,
              }}>
                Create your account
              </p>
            </div>

            {/* ── Gold rule ── */}
            <div style={{
              height: "1px",
              background: "linear-gradient(to right, transparent, rgba(212,175,55,0.4), transparent)",
              marginBottom: "40px",
            }} />

            {/* ── Form ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Username */}
              <div>
                <label style={{
                  display: "block",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "2px",
                  color: "rgba(212,175,55,0.6)",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}>
                  Username
                </label>
                <CinemaInput
                  type="text"
                  value={form.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  placeholder="your_username"
                  autoComplete="username"
                />
              </div>

              {/* Email */}
              <div>
                <label style={{
                  display: "block",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "2px",
                  color: "rgba(212,175,55,0.6)",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}>
                  Email Address
                </label>
                <CinemaInput
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>

              {/* Password with show/hide */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "2px",
                    color: "rgba(212,175,55,0.6)",
                    textTransform: "uppercase",
                  }}>
                    Password
                  </label>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    color: "rgba(200,185,150,0.35)",
                    letterSpacing: "0.5px",
                  }}>
                    (min. 6 chars)
                  </span>
                </div>
                <CinemaInput
                  type={form.showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                >
                  <button
                    type="button"
                    onClick={() => updateField("showPassword", !form.showPassword)}
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      color: "rgba(200,185,150,0.35)",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      padding: 0,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => e.target.style.color = "rgba(212,175,55,0.7)"}
                    onMouseLeave={(e) => e.target.style.color = "rgba(200,185,150,0.35)"}
                  >
                    {form.showPassword ? "hide" : "show"}
                  </button>
                </CinemaInput>
              </div>

              {/* Admin registration code (optional) */}
              <div>
                <label style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "2px",
                  color: "rgba(212,175,55,0.6)",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "8px",
                }}>
                  Admin code
                </label>
                <CinemaInput
                  type="text"
                  value={form.adminCode}
                  onChange={(e) => updateField("adminCode", e.target.value)}
                  placeholder="Optional secret code"
                  autoComplete="off"
                />
              </div>

              {/* Error display */}
              {error && (
                <div
                  className="error-shake"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "rgba(180,40,40,0.12)",
                    border: "1px solid rgba(220,60,60,0.25)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#e05050", flexShrink: 0 }} />
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px",
                    color: "rgba(220,130,130,0.9)",
                    letterSpacing: "0.5px",
                  }}>
                    {error}
                  </span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="cinema-btn"
              >
                {loading ? (
                  <span className="loading-dots">Creating account</span>
                ) : (
                  "Begin the journey"
                )}
              </button>
            </div>

            {/* ── Divider & social login (same as Login) ── */}
            <div style={{ margin: "28px 0" }}>
              <Divider />
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "28px" }}>
              {["Continue with Google", "Continue with Apple"].map((label) => (
                <button
                  key={label}
                  type="button"
                  style={{
                    flex: 1,
                    padding: "12px 8px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "8px",
                    color: "rgba(200,185,150,0.5)",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "border-color 0.2s, color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)";
                    e.currentTarget.style.color = "rgba(212,175,55,0.7)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.color = "rgba(200,185,150,0.5)";
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Link to login page ── */}
            <p style={{
              textAlign: "center",
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              color: "rgba(200,185,150,0.3)",
              letterSpacing: "0.5px",
              margin: 0,
            }}>
              Already have an account?{" "}
              <Link
                to="/login"
                style={{
                  color: "rgba(212,175,55,0.7)",
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(212,175,55,0.25)",
                  paddingBottom: "1px",
                  transition: "color 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = "#d4af37";
                  e.target.style.borderBottomColor = "#d4af37";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "rgba(212,175,55,0.7)";
                  e.target.style.borderBottomColor = "rgba(212,175,55,0.25)";
                }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}