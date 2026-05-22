// src/components/Hero.jsx
import { Link } from "react-router-dom";
import { CinematicPlaceholder } from "../utils/placeholderImage";

function Hero({ entries = [] }) {
  const latest = entries?.[0];
  const backdrop =
    latest?.backdrop ||
    latest?.poster ||
    CinematicPlaceholder({ title: "MyPOV", width: 1200, height: 600 });

  return (
    <>
      <style>{`
        .hero-glow {
          box-shadow: 0 0 40px rgba(212,175,55,0.1);
        }
        .hero-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #d4af37, #b8960c, #d4af37);
          background-size: 200% 200%;
          color: #0a0803;
          border: none;
          border-radius: 40px;
          padding: 12px 28px;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: background-position 0.5s ease, transform 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          text-decoration: none;
        }
        .hero-btn:hover {
          background-position: 100% 0;
          transform: translateY(-2px);
        }
        .hero-btn-outline {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(212,175,55,0.4);
          color: #d4af37;
          backdrop-filter: blur(8px);
        }
        .hero-btn-outline:hover {
          background: rgba(212,175,55,0.1);
          border-color: #d4af37;
          color: #d4af37;
        }
        .latest-card {
          backdrop-filter: blur(12px);
          transition: all 0.3s ease;
        }
        .latest-card:hover {
          border-color: rgba(212,175,55,0.5);
          transform: translateY(-4px);
          box-shadow: 0 20px 35px -15px rgba(0,0,0,0.5);
        }
      `}</style>

      <section className="relative min-h-[500px] overflow-hidden">
        <img
          src={backdrop}
          alt="Featured backdrop"
          className="absolute inset-0 h-full w-full object-cover brightness-50"
          loading="eager"
          onError={(e) => {
            e.target.src = CinematicPlaceholder({ title: "MyPOV", width: 1200, height: 600 });
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-br from-[#07060a] via-[#07060a]/85 to-[#07060a]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07060a] via-transparent to-transparent" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.3)] to-transparent" />

        <div className="relative z-10 grid min-h-[500px] items-center gap-10 px-6 py-12 md:grid-cols-[1.2fr_0.8fr] md:px-10 lg:px-12">
          <div className="max-w-3xl">
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                letterSpacing: "4px",
                color: "rgba(212,175,55,0.8)",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              Cinematic Watch Journal
            </p>

            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "72px",
                fontWeight: 300,
                lineHeight: 1.1,
                color: "#f5f0e8",
                marginBottom: "20px",
              }}
              className="md:text-7xl"
            >
              My<span style={{ color: "#d4af37" }}>POV</span>
            </h1>

            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "18px",
                color: "#e2e0d4",
                lineHeight: 1.6,
                maxWidth: "550px",
                marginBottom: "32px",
              }}
            >
              Track what you watch, preserve the reviews that matter, and turn your
              taste into a library that feels personal, premium, and alive.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/log" className="hero-btn">
                Log What I Watched
              </Link>
              <Link to="/recommendations" className="hero-btn hero-btn-outline">
                Find Recommendations
              </Link>
            </div>
          </div>

          <div
            className="latest-card hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 lg:block"
            style={{
              backdropFilter: "blur(16px)",
              transition: "all 0.3s ease",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "3px",
                color: "rgba(212,175,55,0.7)",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Latest Watch
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "28px",
                fontWeight: 600,
                color: "#f5f0e8",
                marginBottom: "16px",
              }}
            >
              {latest?.title || "Your next favorite"}
            </h2>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "13px",
                lineHeight: 1.5,
                color: "#c0bcb0",
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {latest?.review ||
                "Start logging your watches to build a polished visual archive of your taste."}
            </p>
            {latest?.rating && (
              <div className="mt-4 flex items-center gap-2">
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    color: "#d4af37",
                  }}
                >
                  ★ {latest.rating}/10
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default Hero;