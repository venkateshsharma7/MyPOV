import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import logo from "../assets/MyPOV_Logo.png";

/* ─── Floating dust canvas (light version for navbar backdrop) ─── */
function DustCanvasNav() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);
    let raf;

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.2,
      vx: (Math.random() - 0.5) * 0.1,
      vy: -Math.random() * 0.15 - 0.03,
      alpha: Math.random() * 0.3 + 0.05,
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
        zIndex: 0,
      }}
    />
  );
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const token = localStorage.getItem("token"); // ✅ FIX: define token

  // Load user data and listen for changes
  useEffect(() => {
    const loadUser = () => {
      try {
        const userData = JSON.parse(localStorage.getItem("user"));
        setUser(userData);
      } catch {
        setUser(null);
      }
    };

    loadUser();

    const handleStorageChange = (e) => {
      if (e.key === "user") {
        loadUser();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    const handleUserChange = () => loadUser();
    window.addEventListener("userDataChanged", handleUserChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userDataChanged", handleUserChange);
    };
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      console.log("Admin user detected:", user.username, user.role);
    }
  }, [user]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  const navLinkClass = (path) => {
    const isActive = location.pathname === path;
    return {
      color: isActive ? "#d4af37" : "#e2e0d4",
      textDecoration: "none",
      fontFamily: "'DM Mono', monospace",
      fontSize: "12px",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      padding: "8px 0",
      position: "relative",
      transition: "color 0.2s ease",
      cursor: "pointer",
      borderBottom: isActive ? "1px solid rgba(212,175,55,0.5)" : "none",
    };
  };

  const linkHoverStyle = {
    onMouseEnter: (e) => {
      e.currentTarget.style.color = "#d4af37";
      e.currentTarget.style.borderBottom = "1px solid rgba(212,175,55,0.6)";
    },
    onMouseLeave: (e) => {
      const isActive = location.pathname === e.currentTarget.getAttribute("data-path");
      e.currentTarget.style.color = isActive ? "#d4af37" : "#e2e0d4";
      e.currentTarget.style.borderBottom = isActive ? "1px solid rgba(212,175,55,0.5)" : "none";
    },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Cinzel:wght@400;600&display=swap');

        .navbar-glow {
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .user-avatar {
          transition: all 0.25s ease;
        }
        .user-avatar:hover {
          transform: scale(1.05);
          box-shadow: 0 0 12px rgba(212,175,55,0.4);
        }
        .logout-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        .logout-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }
        .logout-btn:hover::after {
          left: 100%;
        }
        .mobile-menu {
          backdrop-filter: blur(12px);
          background: rgba(7,6,10,0.95);
          border: 1px solid rgba(212,175,55,0.2);
        }
      `}</style>

      <div
        style={{
          position: "relative",
          background: "rgba(7,6,10,0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(212,175,55,0.15)",
          zIndex: 50,
        }}
        className="navbar-glow"
      >
        <DustCanvasNav />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between px-6 md:px-10 py-3 gap-3 relative z-10">
          {/* Logo + mobile toggle */}
          <div className="flex items-center justify-between">
            <Link to="/" style={{ display: "flex", alignItems: "center" }}>
              <img
                src={logo}
                alt="MyPOV"
                style={{
                  height: "52px",
                  width: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                  transition: "transform 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              />
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
              style={{
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.3)",
                borderRadius: "6px",
                padding: "8px 12px",
                color: "#d4af37",
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                letterSpacing: "1px",
                cursor: "pointer",
              }}
            >
              {mobileMenuOpen ? "CLOSE" : "MENU"}
            </button>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-5">
              <Link to="/" style={navLinkClass("/")} {...linkHoverStyle} data-path="/">
                Home
              </Link>

              {token && (
                <>
                  <Link to="/public" style={navLinkClass("/public")} {...linkHoverStyle} data-path="/public">
                    Public
                  </Link>
                  <Link to="/povs" style={navLinkClass("/povs")} {...linkHoverStyle} data-path="/povs">
                    POVs
                  </Link>
                  <Link to="/log" style={navLinkClass("/log")} {...linkHoverStyle} data-path="/log">
                    Log
                  </Link>
                  <Link to="/dashboard" style={navLinkClass("/dashboard")} {...linkHoverStyle} data-path="/dashboard">
                    Dashboard
                  </Link>
                  {user?.role === "admin" && (
                    <Link to="/admin" style={navLinkClass("/admin")} {...linkHoverStyle} data-path="/admin">
                      Admin
                    </Link>
                  )}
                  <Link to="/activity" style={navLinkClass("/activity")} {...linkHoverStyle} data-path="/activity">
                    Activity
                  </Link>
                  <Link to="/trending" style={navLinkClass("/trending")} {...linkHoverStyle} data-path="/trending">
                    Trending
                  </Link>
                  <Link to="/recommendations" style={navLinkClass("/recommendations")} {...linkHoverStyle} data-path="/recommendations">
                    Recs
                  </Link>
                  <Link to="/ai" style={navLinkClass("/ai")} {...linkHoverStyle} data-path="/ai">
                    AI Bot
                  </Link>
                  <Link to={`/taste-dna/${user?.username}`} style={navLinkClass(`/taste-dna/${user?.username}`)} {...linkHoverStyle} data-path={`/taste-dna/${user?.username}`}>
                    DNA
                  </Link>
                </>
              )}

              {!token && (
                <>
                  <Link to="/login" style={navLinkClass("/login")} {...linkHoverStyle} data-path="/login">
                    Login
                  </Link>
                  <Link to="/register" style={navLinkClass("/register")} {...linkHoverStyle} data-path="/register">
                    Register
                  </Link>
                </>
              )}
            </div>

            {token && user && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginLeft: "16px",
                  paddingLeft: "16px",
                  borderLeft: "1px solid rgba(212,175,55,0.2)",
                }}
              >
                <Link
                  to={`/user/${user.username}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  <div
                    className="user-avatar"
                    style={{
                      width: "36px",
                      height: "36px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #d4af37, #b8960c)",
                      color: "#0a0803",
                      fontFamily: "'Cinzel', serif",
                      fontWeight: "bold",
                      fontSize: "16px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    }}
                  >
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "12px",
                      color: "#e2e0d4",
                      letterSpacing: "0.5px",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#d4af37")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#e2e0d4")}
                  >
                    @{user.username}
                  </span>
                </Link>

                <button
                  onClick={logout}
                  className="logout-btn"
                  style={{
                    background: "rgba(212,175,55,0.12)",
                    border: "1px solid rgba(212,175,55,0.4)",
                    borderRadius: "20px",
                    padding: "6px 14px",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    fontWeight: "bold",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    color: "#d4af37",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(212,175,55,0.25)";
                    e.currentTarget.style.borderColor = "#d4af37";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(212,175,55,0.12)";
                    e.currentTarget.style.borderColor = "rgba(212,175,55,0.4)";
                  }}
                >
                  Exit
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div
              className="mobile-menu md:hidden flex flex-col gap-4 p-5 rounded-xl mt-2"
              style={{ animation: "fadeInUp 0.3s ease" }}
            >
              <Link to="/" style={navLinkClass("/")} onClick={() => setMobileMenuOpen(false)} data-path="/">
                Home
              </Link>
              {token ? (
                <>
                  <Link to="/public" style={navLinkClass("/public")} onClick={() => setMobileMenuOpen(false)}>Public</Link>
                  <Link to="/povs" style={navLinkClass("/povs")} onClick={() => setMobileMenuOpen(false)}>POVs</Link>
                  <Link to="/log" style={navLinkClass("/log")} onClick={() => setMobileMenuOpen(false)}>Log</Link>
                  <Link to="/dashboard" style={navLinkClass("/dashboard")} onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                  {user?.role === "admin" && (
                    <Link to="/admin" style={navLinkClass("/admin")} onClick={() => setMobileMenuOpen(false)}>Admin</Link>
                  )}
                  <Link to="/activity" style={navLinkClass("/activity")} onClick={() => setMobileMenuOpen(false)}>Activity</Link>
                  <Link to="/trending" style={navLinkClass("/trending")} onClick={() => setMobileMenuOpen(false)}>Trending</Link>
                  <Link to="/recommendations" style={navLinkClass("/recommendations")} onClick={() => setMobileMenuOpen(false)}>Recs</Link>
                  <Link to="/ai" style={navLinkClass("/ai")} onClick={() => setMobileMenuOpen(false)}>AI Bot</Link>
                  <Link to={`/taste-dna/${user?.username}`} style={navLinkClass(`/taste-dna/${user?.username}`)} onClick={() => setMobileMenuOpen(false)}>Taste DNA</Link>
                  <hr style={{ borderColor: "rgba(212,175,55,0.2)", margin: "8px 0" }} />
                  {user && (
                    <div className="flex items-center justify-between">
                      <Link to={`/user/${user.username}`} style={{ ...navLinkClass(""), color: "#e2e0d4", borderBottom: "none" }}>
                        👤 @{user.username}
                      </Link>
                      <button onClick={logout} style={{ background: "none", border: "1px solid #d4af37", borderRadius: "20px", padding: "4px 12px", color: "#d4af37", fontSize: "10px" }}>
                        Logout
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Link to="/login" style={navLinkClass("/login")} onClick={() => setMobileMenuOpen(false)}>Login</Link>
                  <Link to="/register" style={navLinkClass("/register")} onClick={() => setMobileMenuOpen(false)}>Register</Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Navbar;
