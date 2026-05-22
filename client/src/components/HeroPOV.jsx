// src/components/HeroPOV.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CinematicPlaceholder } from "../utils/placeholderImage";
import { getMoviePath } from "../utils/movieLinks";

function HeroPOV({ entries = [] }) {
  const navigate = useNavigate();

  const featured = useMemo(
    () => entries.find((entry) => entry.pov === true),
    [entries]
  );

  if (!featured) {
    return null;
  }

  const image =
    featured.backdrop ||
    featured.poster ||
    CinematicPlaceholder({ title: featured.title || "MyPOV", width: 1200, height: 600 });
  const moviePath = getMoviePath(featured);

  return (
    <>
      <style>{`
        .pov-card {
          transition: all 0.7s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        }
        .pov-card:hover img {
          transform: scale(1.05);
        }
        .pov-card:hover .pov-overlay {
          background: linear-gradient(to right, rgba(7,6,10,0.95), rgba(7,6,10,0.7) 60%, transparent);
        }
        .pov-badge {
          font-family: 'DM Mono', monospace;
          background: rgba(212,175,55,0.15);
          border: 1px solid rgba(212,175,55,0.4);
          backdrop-filter: blur(4px);
        }
        .pov-title {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
          letter-spacing: -0.5px;
          color: #f5f0e8;
        }
        .pov-rating {
          font-family: 'DM Mono', monospace;
          background: #d4af37;
          color: #0a0803;
          font-weight: bold;
          border-radius: 40px;
          padding: 4px 12px;
          font-size: 12px;
          letter-spacing: 0.5px;
        }
        .pov-date {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: rgba(200,185,150,0.6);
          letter-spacing: 1px;
        }
        .pov-review {
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          line-height: 1.5;
          color: #e2e0d4;
        }
        @keyframes povFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pov-content {
          animation: povFadeIn 0.8s ease forwards;
        }
      `}</style>

      <button
        type="button"
        className="pov-card group relative block h-[420px] w-full overflow-hidden text-left md:h-[540px]"
        onClick={() => navigate(`/post/${featured._id || featured.id}`)}
        style={{ cursor: "pointer", background: "#07060a" }}
      >
        <img
          src={image}
          alt={featured.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-700"
          style={{ transition: "transform 0.7s ease" }}
          loading="eager"
          onError={(e) => {
            e.target.src = CinematicPlaceholder({ title: featured.title || "MyPOV", width: 1200, height: 600 });
          }}
        />

        <div
          className="pov-overlay absolute inset-0 transition duration-500"
          style={{
            background: "linear-gradient(to right, rgba(7,6,10,0.9), rgba(7,6,10,0.5) 70%, transparent)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(7,6,10,0.8), transparent 50%, rgba(7,6,10,0.2))",
          }}
        />

        <div className="relative z-10 flex h-full items-end p-6 md:p-10 lg:p-12">
          <div className="pov-content max-w-2xl">
            <span
              className="pov-badge mb-5 inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em]"
              style={{
                fontFamily: "'DM Mono', monospace",
                background: "rgba(212,175,55,0.12)",
                border: "1px solid rgba(212,175,55,0.4)",
                backdropFilter: "blur(4px)",
                color: "#d4af37",
                letterSpacing: "2px",
              }}
            >
              Featured POV
            </span>

            <h1
              className="pov-title mb-4 text-4xl tracking-tight md:text-6xl"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 300,
                color: "#f5f0e8",
                letterSpacing: "-0.5px",
              }}
            >
              {featured.title}
            </h1>

            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="pov-rating">
                ★ {featured.rating || "Unrated"}/10
              </span>
              <span className="pov-date">{featured.date}</span>
            </div>

            <p
              className="pov-review line-clamp-3 text-base leading-7 md:text-lg"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "13px",
                lineHeight: "1.5",
                color: "#c0bcb0",
              }}
            >
              {featured.review || "No review written yet."}
            </p>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                navigate(moviePath);
              }}
              className="mt-5 inline-flex rounded-full border border-[#d4af37]/50 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#d4af37] transition hover:bg-[#d4af37]/10"
            >
              Visit Movie Page
            </span>
          </div>
        </div>
      </button>
    </>
  );
}

export default HeroPOV;
