// src/components/Trending.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { CinematicPlaceholder } from "../utils/placeholderImage";
import { getMoviePath } from "../utils/movieLinks";

const MEDAL_COLORS = ["#d4af37", "#b0b8c1", "#cd7f32"]; // gold, silver, bronze

function Trending() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const prevMoviesRef = useRef([]);
  const moviesRef = useRef([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/trending");
      const incoming = Array.isArray(data) ? data : [];
      prevMoviesRef.current = moviesRef.current;
      moviesRef.current = incoming;
      setMovies(incoming);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Failed to load trending movies");
    } finally {
      setLoading(false);
    }
  }

  function getPoster(movie) {
    if (movie?.poster) return movie.poster;
    if (movie?.poster_path) return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    return null;
  }

  function getTitle(movie) {
    return movie?.title || movie?.name || "Untitled";
  }

  function getType(movie) {
    return movie?.type === "tv" ? "Series" : "Film";
  }

  function getRankDelta(movie, index) {
    const prev = prevMoviesRef.current;
    if (!prev.length) return null;
    const prevIndex = prev.findIndex((m) => (m._id || m.id) === (movie._id || movie.id));
    if (prevIndex === -1) return "new";
    return prevIndex - index;
  }

  const formatTime = (date) => {
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Global styles (cinema theme)
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Cinzel:wght@400;600&display=swap');

    .trending-row {
      transition: background 0.2s ease;
    }
    .trending-row:hover {
      background: rgba(212,175,55,0.06) !important;
    }
    .trending-movie-link {
      color: inherit;
      text-decoration: none;
    }
    .trending-movie-link:hover {
      color: #d4af37;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes shimmer {
      0% { opacity: 0.3; }
      50% { opacity: 0.6; }
      100% { opacity: 0.3; }
    }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 640px) {
      .desktop-only { display: none !important; }
      .mobile-reviews-bar { display: flex !important; }
      .trending-row {
        grid-template-columns: 44px 64px 1fr !important;
        padding: 14px 14px !important;
      }
      .trending-col-headers {
        display: none !important;
      }
    }
    @media (min-width: 641px) {
      .mobile-reviews-bar { display: none !important; }
    }
  `;

  return (
    <main style={styles.page}>
      {/* Gold vignette (Login style) */}
      <div style={styles.vignette} aria-hidden="true" />

      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerTop}>
            <div>
              <div style={styles.eyebrow}>
                <span style={styles.eyebrowDot} />
                <span style={styles.eyebrowText}>MyPOV Charts</span>
              </div>
              <h1 style={styles.title}>Trending</h1>
              <p style={styles.subtitle}>
                Titles generating the most buzz in the community right now.
                {lastUpdated && (
                  <span style={styles.updateTime}> · Updated {formatTime(lastUpdated)}</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              style={{
                ...styles.refreshBtn,
                ...(loading ? styles.refreshBtnDisabled : {}),
              }}
            >
              <RefreshIcon spinning={loading} />
              {loading ? "Updating" : "Refresh"}
            </button>
          </div>
        </header>

        {error && (
          <div style={styles.errorBar}>
            <span style={styles.errorIcon}>!</span>
            <div>
              <p style={styles.errorTitle}>Couldn't load the chart</p>
              <p style={styles.errorMsg}>{error}</p>
            </div>
          </div>
        )}

        <section style={styles.chart}>
          <div style={styles.colHeaders}>
            <span style={styles.colRank}>#</span>
            <span />
            <span style={styles.colTitle}>Title</span>
            <span style={styles.colReviews}>Reviews</span>
          </div>

          {loading ? (
            <ChartSkeleton />
          ) : movies.length === 0 && !error ? (
            <EmptyState />
          ) : (
            movies.map((movie, index) => {
              const delta = getRankDelta(movie, index);
              const poster = getPoster(movie);
              const isTop3 = index < 3;
              const posterUrl = poster || CinematicPlaceholder({ title: getTitle(movie), width: 100, height: 150 });
              const moviePath = getMoviePath(movie);

              return (
                <article
                  key={movie._id || movie.id || `${getTitle(movie)}-${index}`}
                  style={styles.row}
                  onMouseEnter={() => setHighlightedId(movie._id || movie.id)}
                  onMouseLeave={() => setHighlightedId(null)}
                  data-highlighted={highlightedId === (movie._id || movie.id) ? "true" : "false"}
                  className="trending-row"
                >
                  <div style={styles.rankCell}>
                    <span
                      style={{
                        ...styles.rankNumber,
                        color: isTop3 ? MEDAL_COLORS[index] : "#6b7280",
                        fontSize: isTop3 ? "24px" : "16px",
                        fontWeight: isTop3 ? 700 : 600,
                      }}
                    >
                      {index + 1}
                    </span>
                    {delta !== null && <DeltaBadge delta={delta} />}
                  </div>

                  <Link to={moviePath} style={styles.posterWrap} className="trending-movie-link">
                    <img
                      src={posterUrl}
                      alt={getTitle(movie)}
                      style={styles.poster}
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = CinematicPlaceholder({ title: getTitle(movie), width: 100, height: 150 });
                      }}
                    />
                    {isTop3 && (
                      <span
                        style={{
                          ...styles.topBadge,
                          background: MEDAL_COLORS[index],
                          boxShadow: `0 0 8px ${MEDAL_COLORS[index]}`,
                        }}
                      />
                    )}
                  </Link>

                  <div style={styles.infoCell}>
                    <Link to={moviePath} className="trending-movie-link">
                      <h2 style={styles.movieTitle}>{getTitle(movie)}</h2>
                    </Link>
                    <div style={styles.metaRow}>
                      <span style={styles.typePill}>{getType(movie)}</span>
                      {movie.year && <span style={styles.metaItem}>{movie.year}</span>}
                      {movie.rating && (
                        <span style={styles.ratingChip}>
                          <StarIcon /> {movie.rating}
                        </span>
                      )}
                    </div>
                    {movie.genres?.length > 0 && (
                      <div style={styles.genreRow}>
                        {movie.genres.slice(0, 3).map((g) => (
                          <span key={g} style={styles.genreTag}>
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link to={moviePath} style={styles.moviePageLink} className="trending-movie-link">
                      Movie Page
                    </Link>
                    <div style={styles.mobileReviews} className="mobile-reviews-bar">
                      <ReviewBar count={movie.reviews || 0} max={movies[0]?.reviews || 1} />
                      <span style={styles.mobileReviewCount}>
                        {formatReviews(movie.reviews || 0)}
                      </span>
                    </div>
                  </div>

                  <div style={styles.reviewsCell} className="desktop-only">
                    <p style={styles.reviewCount}>{formatReviews(movie.reviews || 0)}</p>
                    <p style={styles.reviewLabel}>reviews</p>
                    <ReviewBar count={movie.reviews || 0} max={movies[0]?.reviews || 1} />
                  </div>
                </article>
              );
            })
          )}
        </section>

        <footer style={styles.footer}>
          <span>Rankings update in real time · Powered by MyPOV community</span>
        </footer>
      </div>

      <style>{globalStyles}</style>
    </main>
  );
}

// ─── Subcomponents (cinema theme) ────────────────────────────────────────────
function ReviewBar({ count, max }) {
  const pct = max > 0 ? Math.min(100, (count / max) * 100) : 0;
  return (
    <div style={styles.barTrack}>
      <div style={{ ...styles.barFill, width: `${pct}%` }} />
    </div>
  );
}

function DeltaBadge({ delta }) {
  if (delta === "new") {
    return <span style={styles.deltaNew}>NEW</span>;
  }
  if (delta > 0) {
    return <span style={{ ...styles.deltaChip, ...styles.deltaUp }}>▲{delta}</span>;
  }
  if (delta < 0) {
    return <span style={{ ...styles.deltaChip, ...styles.deltaDown }}>▼{Math.abs(delta)}</span>;
  }
  return <span style={styles.deltaNeutral}>–</span>;
}

function EmptyState() {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>🎬</div>
      <h2 style={styles.emptyTitle}>No trending titles yet</h2>
      <p style={styles.emptyBody}>Once reviews start rolling in, the most active titles will chart here.</p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{ ...styles.row, pointerEvents: "none" }}>
          <div style={styles.rankCell}>
            <div style={{ ...styles.skel, width: 24, height: 24, borderRadius: "50%" }} />
          </div>
          <div style={styles.posterWrap}>
            <div style={{ ...styles.skelPoster, animationDelay: `${i * 80}ms` }} />
          </div>
          <div style={styles.infoCell}>
            <div style={{ ...styles.skel, width: "60%", height: 16, marginBottom: 8 }} />
            <div style={{ ...styles.skel, width: "35%", height: 12 }} />
          </div>
          <div style={{ ...styles.reviewsCell, alignItems: "flex-end" }} className="desktop-only">
            <div style={{ ...styles.skel, width: 40, height: 20, marginBottom: 6 }} />
            <div style={{ ...styles.skel, width: 80, height: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

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

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="#d4af37" style={{ display: "inline-block", marginRight: 3, verticalAlign: "middle" }}>
      <path d="M8 1l1.85 3.74L14 5.47l-3 2.92.71 4.13L8 10.27l-3.71 2.25.71-4.13L2 5.47l4.15-.73z" />
    </svg>
  );
}

function formatReviews(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
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
    maxWidth: 860,
    margin: "0 auto",
    padding: "40px 20px 60px",
    position: "relative",
    zIndex: 1,
  },
  header: { marginBottom: 32 },
  headerTop: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
  },
  eyebrow: { display: "flex", alignItems: "center", gap: 7, marginBottom: 10 },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#d4af37",
    display: "inline-block",
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
    lineHeight: 1.5,
  },
  updateTime: { color: "rgba(212,175,55,0.4)" },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "9px 18px",
    background: "rgba(212,175,55,0.1)",
    border: "1px solid rgba(212,175,55,0.4)",
    borderRadius: 40,
    color: "#d4af37",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "1px",
    fontFamily: "'DM Mono', monospace",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  refreshBtnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  errorBar: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "14px 18px",
    background: "rgba(220,38,38,0.08)",
    border: "1px solid rgba(220,38,38,0.2)",
    borderRadius: 12,
    marginBottom: 20,
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
  chart: {
    border: "1px solid rgba(212,175,55,0.12)",
    borderRadius: 20,
    overflow: "hidden",
    background: "rgba(10,8,3,0.5)",
    backdropFilter: "blur(8px)",
  },
  colHeaders: {
    display: "grid",
    gridTemplateColumns: "64px 72px 1fr 120px",
    padding: "12px 20px",
    background: "rgba(7,6,10,0.8)",
    borderBottom: "1px solid rgba(212,175,55,0.1)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "rgba(212,175,55,0.6)",
    fontFamily: "'DM Mono', monospace",
  },
  colRank: {},
  colTitle: {},
  colReviews: { textAlign: "right" },
  row: {
    display: "grid",
    gridTemplateColumns: "64px 72px 1fr 120px",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid rgba(212,175,55,0.07)",
    gap: 0,
    cursor: "default",
    animation: "fadeSlideIn 0.3s ease both",
  },
  rankCell: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  rankNumber: { lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  posterWrap: { display: "block", position: "relative", width: 52, height: 76, flexShrink: 0, marginRight: 16 },
  poster: { width: 52, height: 76, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(212,175,55,0.2)" },
  topBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: "2px solid #07060a",
  },
  infoCell: { paddingRight: 16, minWidth: 0 },
  movieTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: "#f5f0e8",
    fontFamily: "'Cormorant Garamond', serif",
    lineHeight: 1.35,
    letterSpacing: "-0.01em",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  metaRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 7 },
  typePill: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#d4af37",
    background: "rgba(212,175,55,0.12)",
    border: "1px solid rgba(212,175,55,0.3)",
    padding: "2px 7px",
    borderRadius: 20,
  },
  metaItem: { fontSize: 11, color: "rgba(212,175,55,0.6)", fontFamily: "'DM Mono', monospace" },
  ratingChip: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: 11,
    fontWeight: 600,
    color: "#d4af37",
    background: "rgba(212,175,55,0.1)",
    padding: "2px 7px",
    borderRadius: 20,
    gap: 3,
  },
  genreRow: { display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" },
  genreTag: {
    fontSize: 9,
    color: "rgba(212,175,55,0.6)",
    padding: "1px 6px",
    border: "1px solid rgba(212,175,55,0.15)",
    borderRadius: 12,
    fontFamily: "'DM Mono', monospace",
  },
  moviePageLink: {
    display: "inline-flex",
    marginTop: 8,
    fontSize: 10,
    color: "#d4af37",
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontFamily: "'DM Mono', monospace",
  },
  mobileReviews: { display: "none", alignItems: "center", gap: 8, marginTop: 10 },
  mobileReviewCount: { fontSize: 12, fontWeight: 700, color: "#d4af37", fontFamily: "'DM Mono', monospace" },
  reviewsCell: { textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  reviewCount: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#d4af37",
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
    fontFamily: "'Cinzel', serif",
  },
  reviewLabel: {
    margin: 0,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "rgba(212,175,55,0.5)",
  },
  barTrack: { width: 80, height: 3, background: "rgba(212,175,55,0.15)", borderRadius: 2, overflow: "hidden" },
  barFill: { height: "100%", background: "linear-gradient(90deg, #b8960c, #d4af37)", borderRadius: 2, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" },
  deltaChip: { fontSize: 9, fontWeight: 800, padding: "2px 4px", borderRadius: 4, letterSpacing: "0.05em", fontFamily: "'DM Mono', monospace" },
  deltaUp: { color: "#4ade80", background: "rgba(74,222,128,0.12)" },
  deltaDown: { color: "#f87171", background: "rgba(248,113,113,0.12)" },
  deltaNew: {
    fontSize: 8,
    fontWeight: 800,
    color: "#d4af37",
    background: "rgba(212,175,55,0.15)",
    padding: "2px 4px",
    borderRadius: 4,
    letterSpacing: "0.08em",
  },
  deltaNeutral: { fontSize: 12, color: "rgba(212,175,55,0.4)" },
  emptyState: { padding: "64px 20px", textAlign: "center" },
  emptyIcon: { fontSize: 40, marginBottom: 16 },
  emptyTitle: { margin: "0 0 8px", fontSize: 22, fontWeight: 300, color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif" },
  emptyBody: { margin: 0, fontSize: 13, color: "rgba(212,175,55,0.5)", fontFamily: "'DM Mono', monospace", maxWidth: 320, marginLeft: "auto", marginRight: "auto" },
  footer: { marginTop: 20, textAlign: "center", fontSize: 10, color: "rgba(212,175,55,0.3)", letterSpacing: "0.04em", fontFamily: "'DM Mono', monospace" },
  skel: { borderRadius: 4, background: "rgba(212,175,55,0.08)", animation: "shimmer 1.6s ease infinite" },
  skelPoster: { width: 52, height: 76, borderRadius: 8, background: "rgba(212,175,55,0.08)", animation: "shimmer 1.6s ease infinite" },
};

export default Trending;
