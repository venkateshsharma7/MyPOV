// src/components/LogEntry.jsx
import { useState } from "react";
import { searchOMDB } from "../api/omdb";
import { apiFetch } from "../api/client";
import { CinematicPlaceholder } from "../utils/placeholderImage";

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const STAR_LABELS = {
  1: "Unwatchable",
  2: "Terrible",
  3: "Bad",
  4: "Below average",
  5: "Average",
  6: "Decent",
  7: "Good",
  8: "Great",
  9: "Excellent",
  10: "Masterpiece",
};

export default function LogEntry() {
  const [title, setTitle] = useState("");
  const [tmdbId, setTmdbId] = useState(null);
  const [poster, setPoster] = useState("");
  const [backdrop, setBackdrop] = useState("");
  const [rating, setRating] = useState("");
  const [review, setReview] = useState("");
  const [date, setDate] = useState("");
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [genres, setGenres] = useState([]);
  const [type, setType] = useState("movie");
  const [language, setLanguage] = useState("");
  const [isPOV, setIsPOV] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [movieDetails, setMovieDetails] = useState(null);

  async function handleSearch(e) {
    const q = e.target.value;
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const data = await searchOMDB(q);
      const unique = data.filter(
        (m, i, s) => i === s.findIndex((x) => x.Title === m.Title)
      );
      setResults(unique.slice(0, 6));
    } catch (err) {
      console.error("Search failed:", err);
    }
  }

  async function selectMovie(movie) {
    setTitle(movie.Title || "");
    setTmdbId(null);
    setType(movie.Type === "series" ? "tv" : "movie");
    setLanguage("");
    const posterUrl = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : "";
    setPoster(posterUrl);
    setBackdrop("");
    setGenres([]);
    setResults([]);
    setQuery("");
    // Set basic details immediately
    setMovieDetails({
      year: movie.Year || "—",
      type: movie.Type === "series" ? "TV Series" : "Film",
      poster: posterUrl,
      title: movie.Title || "",
      imdbID: movie.imdbID || "",
      plot: null,
      runtime: null,
      imdbRating: null,
      director: null,
      actors: null,
      genre: null,
    });
    // Fetch enriched details if we have an imdbID
    if (movie.imdbID) {
      try {
        const API = import.meta.env.VITE_API_URL;
        const res = await fetch(`${API}/tmdb/omdb-detail?id=${movie.imdbID}`);
        if (res.ok) {
          const d = await res.json();
          if (d.Response !== "False") {
            setMovieDetails({
              year: d.Year || movie.Year || "—",
              type: d.Type === "series" ? "TV Series" : "Film",
              poster: d.Poster && d.Poster !== "N/A" ? d.Poster : posterUrl,
              title: d.Title || movie.Title || "",
              imdbID: movie.imdbID,
              plot: d.Plot && d.Plot !== "N/A" ? d.Plot : null,
              runtime: d.Runtime && d.Runtime !== "N/A" ? d.Runtime : null,
              imdbRating: d.imdbRating && d.imdbRating !== "N/A" ? d.imdbRating : null,
              director: d.Director && d.Director !== "N/A" ? d.Director : null,
              actors: d.Actors && d.Actors !== "N/A" ? d.Actors : null,
              genre: d.Genre && d.Genre !== "N/A" ? d.Genre : null,
            });
            if (d.Poster && d.Poster !== "N/A") setPoster(d.Poster);
          }
        }
      } catch (err) {
        console.error("Failed to fetch movie details:", err);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title || !rating || !date) {
      setError("Please fill in all required fields");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await apiFetch("/entries", {
        method: "POST",
        body: JSON.stringify({
          title,
          tmdbId,
          rating: Number(rating),
          review,
          date,
          type,
          genres,
          language,
          pov: isPOV,
          isPublic,
          poster,
          backdrop,
        }),
      });
      setSaved(true);
      setTitle("");
      setTmdbId(null);
      setPoster("");
      setBackdrop("");
      setRating("");
      setReview("");
      setDate("");
      setGenres([]);
      setLanguage("");
      setType("movie");
      setIsPOV(false);
      setIsPublic(false);
      setMovieDetails(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Save failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Global styles (cinema theme)
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Cinzel:wght@400;600&display=swap');

    .log-page {
      background: #07060a;
      min-height: 100vh;
    }
    .glass-card {
      background: rgba(10,8,3,0.5);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(212,175,55,0.12);
      border-radius: 20px;
      transition: all 0.2s ease;
    }
    .glass-card:hover {
      border-color: rgba(212,175,55,0.4);
    }
    .cinema-input {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(212,175,55,0.2);
      border-radius: 12px;
      padding: 14px 16px;
      color: #f5f0e8;
      font-family: 'DM Mono', monospace;
      font-size: 13px;
      transition: border-color 0.2s;
      width: 100%;
      box-sizing: border-box;
    }
    .cinema-input:focus {
      outline: none;
      border-color: rgba(212,175,55,0.6);
    }
    .cinema-btn-gold {
      background: linear-gradient(135deg, #d4af37, #b8960c);
      color: #0a0803;
      border: none;
      font-family: 'Cinzel', serif;
      font-size: 13px;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 14px 24px;
      border-radius: 40px;
      cursor: pointer;
      transition: transform 0.2s, opacity 0.2s;
      width: 100%;
      font-weight: 600;
    }
    .cinema-btn-gold:hover:not(:disabled) {
      transform: translateY(-2px);
    }
    .cinema-btn-gold:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .search-dropdown {
      background: rgba(10,8,3,0.95);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(212,175,55,0.2);
      border-radius: 12px;
      overflow: hidden;
    }
    .search-result {
      cursor: pointer;
      transition: background 0.15s;
    }
    .search-result:hover {
      background: rgba(212,175,55,0.1);
    }
    .checkbox-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(212,175,55,0.15);
      border-radius: 12px;
      transition: all 0.2s;
    }
    .checkbox-card:hover {
      background: rgba(212,175,55,0.05);
      border-color: rgba(212,175,55,0.3);
    }
    @keyframes slideInCard {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .movie-side-card {
      animation: slideInCard 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
  `;

  return (
    <div className="log-page">
      <style>{globalStyles}</style>

      {/* Fixed gold vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 25% 50%, rgba(212,175,55,0.04) 0%, transparent 70%), radial-gradient(ellipse 40% 80% at 80% 20%, rgba(120,80,200,0.06) 0%, transparent 60%)",
        }}
      />

      {/* Backdrop blur (if chosen) */}
      {backdrop && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `url(${backdrop})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.08,
            filter: "blur(40px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: movieDetails ? 1000 : 560,
          margin: "0 auto",
          padding: "60px 28px 80px",
          display: "flex",
          gap: 40,
          alignItems: "flex-start",
          transition: "max-width 0.4s ease",
        }}
      >
        {/* Form column */}
        <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#d4af37",
              display: "block",
              marginBottom: 10,
              fontWeight: 500,
            }}
          >
            Film Journal
          </span>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 38,
              fontWeight: 300,
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "#f5f0e8",
            }}
          >
            Log entry
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {/* Search field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(212,175,55,0.7)",
                fontWeight: 500,
              }}
            >
              Title
            </label>
            <div style={{ position: "relative" }}>
              <svg
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 16,
                  height: 16,
                  color: "rgba(212,175,55,0.4)",
                  pointerEvents: "none",
                }}
                viewBox="0 0 20 20"
                fill="none"
              >
                <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search for a movie or TV show…"
                value={query}
                onChange={handleSearch}
                className="cinema-input"
                style={{ paddingLeft: 42 }}
              />
            </div>

            {results.length > 0 && (
              <div className="search-dropdown">
                {results.map((movie) => (
                  <div
                    key={movie.imdbID}
                    className="search-result"
                    onClick={() => selectMovie(movie)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "10px 14px",
                    }}
                  >
                    <img
                      src={
                        movie.Poster && movie.Poster !== "N/A"
                          ? movie.Poster
                          : CinematicPlaceholder({ title: movie.Title, width: 40, height: 60 })
                      }
                      style={{ width: 32, height: 48, objectFit: "cover", borderRadius: 4 }}
                      alt=""
                    />
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#f5f0e8" }}>
                        {movie.Title}{" "}
                        <span style={{ color: "rgba(212,175,55,0.5)", fontSize: 12 }}>
                          ({movie.Year || "—"})
                        </span>
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(212,175,55,0.5)" }}>
                        {movie.Type === "series" ? "TV Series" : "Film"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected film preview */}
          {(poster || title) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(212,175,55,0.15)",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <img
                src={poster || CinematicPlaceholder({ title, width: 52, height: 78 })}
                style={{ width: 52, height: 78, objectFit: "cover", borderRadius: 6 }}
                alt={title}
                onError={(e) => {
                  e.target.src = CinematicPlaceholder({ title, width: 52, height: 78 });
                }}
              />
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 500,
                    color: "#f5f0e8",
                    fontFamily: "'Cormorant Garamond', serif",
                  }}
                >
                  {title}
                </p>
                <div
                  style={{
                    display: "inline-flex",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#d4af37",
                    background: "rgba(212,175,55,0.1)",
                    border: "1px solid rgba(212,175,55,0.3)",
                    borderRadius: 30,
                    padding: "3px 10px",
                    marginTop: 6,
                  }}
                >
                  {type === "tv" ? "TV Series" : "Film"}
                </div>
              </div>
            </div>
          )}

          {/* Type toggle (only when no poster but title selected) */}
          {!poster && title && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(212,175,55,0.7)",
                }}
              >
                Type
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {["movie", "tv"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    style={{
                      padding: "9px 20px",
                      fontSize: 12,
                      borderRadius: 30,
                      border:
                        type === t
                          ? "1px solid rgba(212,175,55,0.5)"
                          : "1px solid rgba(255,255,255,0.1)",
                      background:
                        type === t ? "rgba(212,175,55,0.15)" : "transparent",
                      color: type === t ? "#d4af37" : "rgba(255,255,255,0.6)",
                      cursor: "pointer",
                      fontFamily: "'DM Mono', monospace",
                      transition: "all 0.15s",
                    }}
                  >
                    {t === "movie" ? "Film" : "TV Series"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rating */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(212,175,55,0.7)",
              }}
            >
              Rating
              {rating && (
                <span
                  style={{
                    textTransform: "none",
                    letterSpacing: 0,
                    fontSize: 11,
                    color: "#d4af37",
                    marginLeft: 6,
                  }}
                >
                  — {STAR_LABELS[rating]}
                </span>
              )}
            </label>
            <div style={{ display: "flex", gap: 4 }}>
              {RATINGS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRating(r === Number(rating) ? "" : r)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 24,
                    cursor: "pointer",
                    padding: "2px 3px",
                    lineHeight: 1,
                    transition: "color 0.1s, transform 0.1s",
                    color: Number(rating) >= r ? "#d4af37" : "rgba(255,255,255,0.2)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.15)";
                    e.currentTarget.style.color = "#d4af37";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    if (Number(rating) >= r) e.currentTarget.style.color = "#d4af37";
                    else e.currentTarget.style.color = "rgba(255,255,255,0.2)";
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Review */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(212,175,55,0.7)",
              }}
            >
              Review <span style={{ textTransform: "none", letterSpacing: 0, color: "rgba(212,175,55,0.4)" }}>(optional)</span>
            </label>
            <textarea
              placeholder="What did you think? No spoilers…"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="cinema-input"
              rows={4}
            />
          </div>

          {/* Date */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(212,175,55,0.7)",
              }}
            >
              Date watched
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="cinema-input"
              style={{ width: "fit-content" }}
            />
          </div>

          {/* Checkboxes (POV & Public) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="checkbox-card" style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", padding: "12px 16px" }}>
              <input
                type="checkbox"
                checked={isPOV}
                onChange={(e) => setIsPOV(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#d4af37", cursor: "pointer" }}
              />
              <div>
                <div style={{ fontSize: 14, color: "#f5f0e8", fontWeight: 500 }}>POV view</div>
                <div style={{ fontSize: 12, color: "rgba(212,175,55,0.5)", fontFamily: "'DM Mono', monospace" }}>
                  Mark as a personal pick
                </div>
              </div>
            </label>
            <label className="checkbox-card" style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", padding: "12px 16px" }}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#d4af37", cursor: "pointer" }}
              />
              <div>
                <div style={{ fontSize: 14, color: "#f5f0e8", fontWeight: 500 }}>Post publicly</div>
                <div style={{ fontSize: 12, color: "rgba(212,175,55,0.5)", fontFamily: "'DM Mono', monospace" }}>
                  Share with followers
                </div>
              </div>
            </label>
          </div>

          {/* Submit button */}
          <button type="submit" disabled={loading} className="cinema-btn-gold">
            {loading ? (
              <span style={{ display: "inline-flex", gap: 3 }}>
                <span>.</span><span>.</span><span>.</span>
              </span>
            ) : (
              "Save entry"
            )}
          </button>

          {saved && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontSize: 13,
                color: "#4ade80",
                padding: "10px 14px",
                background: "rgba(74,222,128,0.06)",
                border: "1px solid rgba(74,222,128,0.15)",
                borderRadius: 12,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#4ade80" strokeWidth="1.5" />
                <path d="M5 8l2 2 4-4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Entry saved to your journal
            </div>
          )}

          {error && (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#f87171",
                padding: "10px 14px",
                background: "rgba(248,113,113,0.06)",
                border: "1px solid rgba(248,113,113,0.15)",
                borderRadius: 12,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {error}
            </p>
          )}
        </form>
        </div>{/* end form column */}

        {/* Side movie card */}
        {movieDetails && (
          <div className="movie-side-card" style={{
            width: 260,
            flexShrink: 0,
            position: "sticky",
            top: 60,
            alignSelf: "flex-start",
          }}>
            <div className="glass-card" style={{ overflow: "hidden" }}>
              {/* Poster */}
              <div style={{ position: "relative" }}>
                <img
                  src={movieDetails.poster || CinematicPlaceholder({ title: movieDetails.title, width: 260, height: 370 })}
                  alt={movieDetails.title}
                  style={{ width: "100%", height: 370, objectFit: "cover", display: "block" }}
                  onError={(e) => { e.target.src = CinematicPlaceholder({ title: movieDetails.title, width: 260, height: 370 }); }}
                />
                {/* Type badge */}
                <div style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  background: "rgba(10,8,3,0.8)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(212,175,55,0.3)",
                  borderRadius: 30,
                  padding: "4px 10px",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#d4af37",
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {movieDetails.type}
                </div>
                {/* IMDB rating badge */}
                {movieDetails.imdbRating && (
                  <div style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: "rgba(212,175,55,0.15)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(212,175,55,0.4)",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 13,
                    color: "#d4af37",
                    fontFamily: "'DM Mono', monospace",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}>
                    ★ {movieDetails.imdbRating}
                  </div>
                )}
                {/* Gradient overlay */}
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 80,
                  background: "linear-gradient(to top, rgba(10,8,3,0.95), transparent)",
                }} />
              </div>

              {/* Details section */}
              <div style={{ padding: "16px 18px 20px" }}>
                <h3 style={{
                  margin: "0 0 4px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 20,
                  fontWeight: 500,
                  color: "#f5f0e8",
                  lineHeight: 1.2,
                }}>
                  {movieDetails.title}
                </h3>
                <p style={{
                  margin: "0 0 12px",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  color: "rgba(212,175,55,0.6)",
                  letterSpacing: "0.06em",
                }}>
                  {movieDetails.year}
                  {movieDetails.runtime && <span> · {movieDetails.runtime}</span>}
                </p>

                {movieDetails.genre && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                    {movieDetails.genre.split(", ").map((g) => (
                      <span key={g} style={{
                        fontSize: 10,
                        padding: "3px 8px",
                        borderRadius: 20,
                        background: "rgba(212,175,55,0.08)",
                        border: "1px solid rgba(212,175,55,0.2)",
                        color: "rgba(212,175,55,0.8)",
                        fontFamily: "'DM Mono', monospace",
                        letterSpacing: "0.06em",
                      }}>
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {movieDetails.plot && (
                  <p style={{
                    margin: "0 0 12px",
                    fontSize: 12,
                    color: "rgba(245,240,232,0.6)",
                    lineHeight: 1.6,
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: "italic",
                  }}>
                    {movieDetails.plot.length > 120 ? movieDetails.plot.slice(0, 120) + "…" : movieDetails.plot}
                  </p>
                )}

                {movieDetails.director && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "rgba(212,175,55,0.5)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>Dir. </span>
                    <span style={{ fontSize: 12, color: "rgba(245,240,232,0.75)", fontFamily: "'DM Mono', monospace" }}>{movieDetails.director}</span>
                  </div>
                )}

                {movieDetails.actors && (
                  <div>
                    <span style={{ fontSize: 10, color: "rgba(212,175,55,0.5)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>Cast </span>
                    <span style={{ fontSize: 11, color: "rgba(245,240,232,0.55)", fontFamily: "'DM Mono', monospace" }}>
                      {movieDetails.actors.split(", ").slice(0, 3).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}