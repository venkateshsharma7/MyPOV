// src/components/Recommendations.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { CinematicPlaceholder } from "../utils/placeholderImage";
import { getMoviePath } from "../utils/movieLinks";

const RECOMMENDATIONS_CACHE_KEY = "mypov:recommendations";
const RECOMMENDATIONS_CACHE_TTL = 10 * 60 * 1000;

function Recommendations() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadingRef = useRef(false);

  const load = useCallback(async ({ force = false } = {}) => {
    if (loadingRef.current) return;

    try {
      const cached = sessionStorage.getItem(RECOMMENDATIONS_CACHE_KEY);
      if (!force && cached) {
        const parsed = JSON.parse(cached);
        if (
          Array.isArray(parsed.movies) &&
          Date.now() - Number(parsed.cachedAt || 0) < RECOMMENDATIONS_CACHE_TTL
        ) {
          setMovies(parsed.movies);
          setError("");
          setLoading(false);
          return;
        }
      }
    } catch {
      sessionStorage.removeItem(RECOMMENDATIONS_CACHE_KEY);
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError("");
      const data = await apiFetch("/recommendations");
      const nextMovies = Array.isArray(data) ? data : [];
      setMovies(nextMovies);
      sessionStorage.setItem(
        RECOMMENDATIONS_CACHE_KEY,
        JSON.stringify({
          movies: nextMovies,
          cachedAt: Date.now(),
        })
      );
    } catch (err) {
      console.error("Recommendation error:", err);
      setMovies([]);
      setError(err.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function getPoster(movie) {
    if (movie?.poster) return movie.poster;
    if (movie?.poster_path) return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    if (movie?.image?.medium) return movie.image.medium;
    if (movie?.image?.original) return movie.image.original;
    return null; // will use placeholder
  }

  // Global styles (cinema theme)
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Cinzel:wght@400;600&display=swap');

    .rec-card {
      transition: all 0.25s ease;
      cursor: pointer;
    }
    .rec-card:hover {
      transform: translateY(-4px);
    }
    .rec-card:hover .rec-poster {
      box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 0 2px rgba(212,175,55,0.4);
    }
    .rec-title {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `;

  return (
    <>
      <style>{globalStyles}</style>
      <div style={styles.page}>
        {/* Gold vignette (Login style) */}
        <div style={styles.vignette} aria-hidden="true" />

        <div style={styles.container}>
          <div style={styles.header}>
            <div>
              <div style={styles.eyebrow}>
                <span style={styles.eyebrowDot} />
                <span style={styles.eyebrowText}>Curated for you</span>
              </div>
              <h1 style={styles.title}>Recommended For You</h1>
              <p style={styles.subtitle}>
                Based on your watch history and ratings.
                {!loading && movies.length > 0 && (
                  <span style={styles.countChip}>{movies.length} titles</span>
                )}
              </p>
            </div>
            <button
              onClick={() => load({ force: true })}
              disabled={loading}
              style={{
                ...styles.refreshBtn,
                ...(loading ? styles.refreshBtnDisabled : {}),
              }}
            >
              <RefreshIcon spinning={loading} />
              {loading ? "Loading" : "Refresh"}
            </button>
          </div>

          {loading && (
            <div style={styles.loadingWrap}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Generating smart recommendations...</p>
            </div>
          )}

          {error && (
            <div style={styles.errorBar}>
              <span style={styles.errorIcon}>!</span>
              <div>
                <p style={styles.errorTitle}>Could not load recommendations</p>
                <p style={styles.errorMsg}>{error}</p>
              </div>
              <button onClick={() => load({ force: true })} style={styles.retryBtn}>Retry</button>
            </div>
          )}

          {!loading && !error && movies.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🎬</div>
              <h2 style={styles.emptyTitle}>No recommendations yet</h2>
              <p style={styles.emptyBody}>
                Log more movies or shows to get personalised suggestions.
              </p>
            </div>
          )}

          {!loading && movies.length > 0 && (
            <div style={styles.grid}>
              {movies.map((movie) => {
                const title = movie.title || movie.name || "Untitled";
                const posterUrl = getPoster(movie) || CinematicPlaceholder({ title, width: 300, height: 450 });
                return (
                  <Link
                    key={movie._id || movie.id}
                    to={getMoviePath(movie)}
                    className="rec-card"
                    style={styles.card}
                  >
                    <img
                      src={posterUrl}
                      alt={title}
                      className="rec-poster"
                      style={styles.poster}
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = CinematicPlaceholder({ title, width: 300, height: 450 });
                      }}
                    />
                    <p className="rec-title" style={styles.titleText}>
                      {title}
                    </p>
                    {movie.year && <p style={styles.yearText}>{movie.year}</p>}
                    {movie.confidence && (
                      <p style={styles.confidenceText}>
                        {Math.round(movie.confidence * 100)}% taste match
                        {movie.aiEnhanced && (
                          <span style={styles.aiChip}>
                            {movie.aiProvider === "gemini" ? "Gemini refined" : "AI refined"}
                          </span>
                        )}
                      </p>
                    )}
                    {movie.reasons?.length > 0 && (
                      <div style={styles.reasonWrap}>
                        {movie.reasons.slice(0, 2).map((reason) => (
                          <span key={reason} style={styles.reasonPill}>
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                    <p style={styles.moviePageText}>Movie Page</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function RefreshIcon({ spinning }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      style={{
        display: "inline-block",
        marginRight: 6,
        animation: spinning ? "spin 0.8s linear infinite" : "none",
        verticalAlign: "middle",
      }}
    >
      <path d="M13.5 2.5A7 7 0 1 0 14.5 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <polyline points="14.5,2 14.5,6 10.5,6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Styles (cinema theme) ────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "#07060a",
    color: "#f5f0e8",
    fontFamily: "'DM Mono', monospace",
    position: "relative",
    overflowX: "hidden",
  },
  vignette: {
    position: "fixed",
    inset: 0,
    background: "radial-gradient(ellipse 60% 60% at 25% 50%, rgba(212,175,55,0.04) 0%, transparent 70%), radial-gradient(ellipse 40% 80% at 80% 20%, rgba(120,80,200,0.06) 0%, transparent 60%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "40px 24px 80px",
    position: "relative",
    zIndex: 1,
  },
  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 36,
  },
  eyebrow: { display: "flex", alignItems: "center", gap: 7, marginBottom: 10 },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#d4af37",
    boxShadow: "0 0 8px rgba(212,175,55,0.6)",
  },
  eyebrowText: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "#d4af37",
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 42,
    fontWeight: 300,
    letterSpacing: "-0.03em",
    margin: 0,
    color: "#f5f0e8",
    lineHeight: 1,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 13,
    color: "rgba(212,175,55,0.6)",
    fontFamily: "'DM Mono', monospace",
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  countChip: {
    fontSize: 11,
    fontWeight: 700,
    color: "#d4af37",
    background: "rgba(212,175,55,0.12)",
    border: "1px solid rgba(212,175,55,0.3)",
    padding: "2px 9px",
    borderRadius: 20,
    letterSpacing: "0.04em",
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 18px",
    background: "rgba(212,175,55,0.1)",
    border: "1px solid rgba(212,175,55,0.4)",
    borderRadius: 40,
    color: "#d4af37",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "1px",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  },
  refreshBtnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "2px solid rgba(212,175,55,0.15)",
    borderTopColor: "#d4af37",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 13,
    color: "rgba(212,175,55,0.6)",
    fontFamily: "'DM Mono', monospace",
  },
  errorBar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 18px",
    background: "rgba(220,38,38,0.08)",
    border: "1px solid rgba(220,38,38,0.2)",
    borderRadius: 12,
    marginBottom: 24,
  },
  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "rgba(220,38,38,0.15)",
    color: "#fca5a5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 800,
  },
  errorTitle: { margin: 0, fontSize: 13, fontWeight: 700, color: "#fca5a5", fontFamily: "'DM Mono', monospace" },
  errorMsg: { margin: "3px 0 0", fontSize: 12, color: "rgba(252,165,165,0.7)", fontFamily: "'DM Mono', monospace" },
  retryBtn: {
    padding: "6px 14px",
    background: "transparent",
    border: "1px solid rgba(220,38,38,0.4)",
    borderRadius: 30,
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.5px",
  },
  emptyState: { padding: "80px 20px", textAlign: "center" },
  emptyIcon: { fontSize: 40, marginBottom: 16 },
  emptyTitle: {
    margin: "0 0 8px",
    fontSize: 22,
    fontWeight: 300,
    color: "#f5f0e8",
    fontFamily: "'Cormorant Garamond', serif",
  },
  emptyBody: {
    margin: 0,
    fontSize: 13,
    color: "rgba(212,175,55,0.5)",
    fontFamily: "'DM Mono', monospace",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(156px, 1fr))",
    gap: 24,
  },
  card: {
    display: "block",
    cursor: "pointer",
    transition: "transform 0.2s",
    color: "inherit",
    textDecoration: "none",
  },
  poster: {
    width: "100%",
    aspectRatio: "2/3",
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.15)",
    transition: "box-shadow 0.2s, border-color 0.2s",
  },
  titleText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: 600,
    color: "#f5f0e8",
    fontFamily: "'Cormorant Garamond', serif",
    lineHeight: 1.3,
  },
  yearText: {
    marginTop: 4,
    fontSize: 10,
    color: "rgba(212,175,55,0.6)",
    fontFamily: "'DM Mono', monospace",
  },
  moviePageText: {
    marginTop: 7,
    fontSize: 10,
    color: "#d4af37",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  confidenceText: {
    marginTop: 7,
    fontSize: 11,
    color: "rgba(245,240,232,0.72)",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
  },
  aiChip: {
    display: "inline-flex",
    marginLeft: 7,
    border: "1px solid rgba(120,180,255,0.35)",
    borderRadius: 999,
    color: "#9fc8ff",
    fontSize: 9,
    padding: "2px 6px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  reasonWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  reasonPill: {
    border: "1px solid rgba(212,175,55,0.22)",
    borderRadius: 999,
    color: "rgba(212,175,55,0.78)",
    fontFamily: "'DM Mono', monospace",
    fontSize: 9,
    lineHeight: 1.3,
    padding: "4px 7px",
  },
};

// Add spin keyframe globally (once)
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

export default Recommendations;
