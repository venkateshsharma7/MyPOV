// src/components/MoviePage.jsx
import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import { searchOMDB } from "../api/omdb";
import { CinematicPlaceholder } from "../utils/placeholderImage";

function MoviePage() {
  const { key } = useParams();
  const [searchParams] = useSearchParams();
  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const title = searchParams.get("title");

  const loadMovie = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const endpoint = title
        ? `/entries/movie/${encodeURIComponent(key)}?title=${encodeURIComponent(title)}`
        : `/entries/movie/${encodeURIComponent(key)}`;
      const data = await apiFetch(endpoint);
      setMovie(data.movie);
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (err) {
      console.error("Movie page failed:", err);
      setError(err.message || "Failed to load movie");
      setMovie(null);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [key, title]);

  useEffect(() => {
    loadMovie();
  }, [loadMovie]);

  useEffect(() => {
    const details = movie?.details || {};
    const videos = Array.isArray(details.videos) ? details.videos : [];
    setActiveVideo(details.trailer || videos[0] || null);
  }, [movie?._id, movie?.id, movie?.details?.trailer?.key]);

  // --- Poster fallback (same as LogEntry) ---
  useEffect(() => {
    if (!movie || movie.poster) return;
    const fetchPoster = async () => {
      try {
        const results = await searchOMDB(movie.title);
        const match = results.find(m => m.Title?.toLowerCase() === movie.title?.toLowerCase());
        if (match && match.Poster && match.Poster !== "N/A") {
          setMovie(prev => ({ ...prev, poster: match.Poster }));
        }
      } catch (err) {
        console.warn("Poster fetch failed:", err);
      }
    };
    fetchPoster();
  }, [movie]);

  // --- Cast images fallback (via backend proxy) ---
  useEffect(() => {
    if (!movie) return;
    const details = movie.details || {};
    const hasCastImages = details.cast && details.cast.some(actor => actor.profile);
    if (hasCastImages) return;

    const fetchCast = async () => {
      try {
        const imdbId = movie.tmdbId || details.imdbId;
        const params = new URLSearchParams();
        if (imdbId) params.append("imdbId", imdbId);
        else if (movie.title) params.append("title", movie.title);
        else return;

        const data = await apiFetch(`/tmdb/cast?${params.toString()}`);
        if (data.cast && data.cast.length) {
          setMovie(prev => ({
            ...prev,
            details: { ...prev.details, cast: data.cast }
          }));
        }
      } catch (err) {
        console.warn("Cast fetch failed:", err);
      }
    };
    fetchCast();
  }, [movie]);

  // Global styles (unchanged – keep your existing CSS)
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Cinzel:wght@400;600&display=swap');
    .movie-bg { background: #07060a; }
    .glass-panel {
      background: rgba(10,8,3,0.5);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(212,175,55,0.12);
      border-radius: 20px;
      transition: all 0.2s ease;
    }
    .glass-panel:hover { border-color: rgba(212,175,55,0.4); }
    .movie-scorecard {
      background: rgba(10,8,3,0.6);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(212,175,55,0.15);
      border-radius: 16px;
    }
    .movie-scorecard:hover {
      border-color: rgba(212,175,55,0.5);
      transform: translateY(-2px);
    }
    .cinema-badge {
      background: rgba(212,175,55,0.12);
      border: 1px solid rgba(212,175,55,0.3);
      color: #d4af37;
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      padding: 4px 12px;
      border-radius: 30px;
    }
    .cinema-btn-outline {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(212,175,55,0.4);
      border-radius: 40px;
      padding: 10px 24px;
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      letter-spacing: 1.5px;
      color: #d4af37;
      text-decoration: none;
      transition: all 0.2s;
    }
    .cinema-btn-outline:hover {
      background: rgba(212,175,55,0.1);
      border-color: #d4af37;
    }
    .cinema-btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: #d4af37;
      border: 1px solid #f5e09c;
      border-radius: 40px;
      padding: 11px 24px;
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #07060a;
      text-decoration: none;
      text-transform: uppercase;
      box-shadow: 0 14px 30px rgba(212,175,55,0.22);
      transition: all 0.2s;
    }
    .cinema-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 18px 42px rgba(212,175,55,0.32);
    }
    .trailer-stage {
      position: relative;
      overflow: hidden;
      border-radius: 22px;
      border: 1px solid rgba(212,175,55,0.28);
      background: #050406;
      box-shadow: 0 24px 70px rgba(0,0,0,0.58), inset 0 0 0 1px rgba(255,255,255,0.03);
    }
    .trailer-stage::before,
    .trailer-stage::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      height: 16px;
      z-index: 2;
      pointer-events: none;
      background: repeating-linear-gradient(90deg, rgba(212,175,55,0.34) 0 10px, transparent 10px 24px);
      opacity: 0.22;
    }
    .trailer-stage::before { top: 0; }
    .trailer-stage::after { bottom: 0; }
    .trailer-frame {
      aspect-ratio: 16 / 9;
      width: 100%;
      border: 0;
      display: block;
    }
    .clip-card {
      cursor: pointer;
      border: 1px solid rgba(212,175,55,0.16);
      background: rgba(10,8,3,0.46);
      transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
    }
    .clip-card:hover,
    .clip-card-active {
      transform: translateY(-2px);
      border-color: rgba(212,175,55,0.72);
      background: rgba(212,175,55,0.09);
    }
    .fact-row {
      border-bottom: 1px solid rgba(212,175,55,0.1);
      padding: 12px 0;
    }
    .fact-row:last-child { border-bottom: none; }
    .skeleton-pulse {
      animation: pulse 1.2s infinite;
      background: rgba(212,175,55,0.05);
      border-radius: 20px;
    }
    @keyframes pulse {
      0% { opacity: 0.4; }
      50% { opacity: 0.7; }
      100% { opacity: 0.4; }
    }
  `;

  if (loading) {
    return (
      <>
        <style>{globalStyles}</style>
        <div className="movie-bg min-h-screen px-6 py-10 md:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="skeleton-pulse h-[520px]" />
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-pulse h-28" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !movie) {
    return (
      <>
        <style>{globalStyles}</style>
        <div className="movie-bg min-h-screen px-6 py-16 md:px-10">
          <div className="mx-auto max-w-2xl glass-panel p-6 text-center">
            <p className="font-mono text-sm text-red-300">Movie page unavailable</p>
            <h1 className="mt-2 font-serif text-3xl font-light">Could not load this title.</h1>
            <p className="mt-3 font-mono text-sm text-[rgba(212,175,55,0.6)]">
              {error || "The movie you're looking for does not exist."}
            </p>
          </div>
        </div>
      </>
    );
  }

  const details = movie.details || {};
  const poster = movie.poster || details.poster || CinematicPlaceholder({ title: movie.title, width: 300, height: 450 });
  const backdrop = movie.backdrop || poster;
  const releaseYear = details.year || (details.releaseDate?.slice(0, 4)) || "";
  const runtime = details.runtime ? `${details.runtime} min` : null;
  const genreNames = Array.isArray(details.genres) ? details.genres.map(g => g.name || g) : [];
  const language = details.language || movie.language || "Unknown";
  const status = details.status || "Released";
  const showType = details.type === "tv" ? "TV Series" : "Film";
  const videos = Array.isArray(details.videos) ? details.videos : [];
  const trailer = activeVideo || details.trailer || videos[0] || null;

  const avgRating = movie.avgRating || "N/A";
  const reviewCount = movie.reviewCount || 0;
  const likeCount = movie.likeCount || 0;
  const omdbRating = details.omdbRating ? `${details.omdbRating}/10` : "N/A";
  const omdbVotes = details.omdbVotes || 0;

  return (
    <>
      <style>{globalStyles}</style>
      <div className="movie-bg relative min-h-screen text-[#f5f0e8]">
        {/* Ambient gold vignette */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: "radial-gradient(ellipse 60% 60% at 25% 50%, rgba(212,175,55,0.04) 0%, transparent 70%), radial-gradient(ellipse 40% 80% at 80% 20%, rgba(120,80,200,0.06) 0%, transparent 60%)",
          }}
        />

        {/* Hero section */}
        <section className="relative z-10 min-h-[620px] overflow-hidden">
          <img
            src={backdrop}
            alt={movie.title}
            className="absolute inset-0 h-full w-full object-cover brightness-50"
            onError={(e) => {
              e.target.src = CinematicPlaceholder({ title: movie.title, width: 1200, height: 650 });
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07060a] via-[#07060a]/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07060a] via-transparent to-black/20" />

          <div className="relative z-10 mx-auto flex min-h-[620px] max-w-7xl flex-col justify-end gap-8 px-6 pb-10 pt-24 md:flex-row md:items-end md:px-10">
            <img
              src={poster}
              alt={movie.title}
              className="w-44 rounded-xl border border-[rgba(212,175,55,0.2)] object-cover shadow-2xl shadow-black/60 md:w-60"
              onError={(e) => {
                e.target.src = CinematicPlaceholder({ title: movie.title, width: 300, height: 450 });
              }}
            />

            <div className="max-w-4xl">
              <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.28em] text-[#d4af37]">{showType}</p>
              <h1 className="font-serif text-5xl font-light tracking-tight md:text-7xl">{movie.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-sm text-[#c0bcb0]">
                {releaseYear && <span>{releaseYear}</span>}
                {runtime && <span>{runtime}</span>}
                {status && <span>{status}</span>}
              </div>
              {details.tagline && (
                <p className="mt-5 max-w-3xl font-serif text-xl italic text-[#e2e0d4]">{details.tagline}</p>
              )}

              <div className="mt-6 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ScoreCard label="MyPOV Rating" value={`${avgRating}/10`} detail={`${reviewCount} reviews`} />
                <ScoreCard label="OMDb Rating" value={omdbRating} detail={`${formatCount(omdbVotes)} votes`} />
                <ScoreCard label="Likes" value={likeCount} detail="Community love" />
                <ScoreCard label="Language" value={language.toUpperCase()} detail="Original audio" />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {trailer && (
                  <a
                    href="#trailer-room"
                    className="cinema-btn-primary"
                  >
                    <span aria-hidden="true">PLAY</span>
                    Watch Trailer
                  </a>
                )}
                {details.imdbId && (
                  <a
                    href={`https://www.imdb.com/title/${details.imdbId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="cinema-btn-outline"
                  >
                    Open IMDb
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Details and reviews */}
        <section className="relative z-10 mx-auto grid max-w-7xl gap-8 px-6 pb-20 pt-8 md:grid-cols-[0.72fr_1.28fr] md:px-10">
          <aside className="space-y-5">
            <Panel title="Details">
              <Fact label="Type" value={showType} />
              <Fact label="Released" value={details.releaseDate || "Unknown"} />
              <Fact label="Runtime" value={runtime || "Unknown"} />
              <Fact label="Language" value={language.toUpperCase()} />
              <Fact label="Country" value={details.country?.join(", ") || "Unknown"} />
              {details.awards && <Fact label="Awards" value={details.awards} />}
              {details.boxOffice && <Fact label="Box Office" value={details.boxOffice} />}
            </Panel>

            {genreNames.length > 0 && (
              <Panel title="Genres">
                <div className="flex flex-wrap gap-2">
                  {genreNames.map((g, idx) => (
                    <span key={`${g}-${idx}`} className="cinema-badge">
                      {g}
                    </span>
                  ))}
                </div>
              </Panel>
            )}

            {details.directors?.length > 0 && (
              <Panel title="Directors">
                {details.directors.map((d, i) => (
                  <Fact key={i} label="Director" value={d} />
                ))}
              </Panel>
            )}

            {details.writers?.length > 0 && (
              <Panel title="Writers">
                {details.writers.map((w, i) => (
                  <Fact key={i} label="Writer" value={w} />
                ))}
              </Panel>
            )}
          </aside>

          <div className="space-y-8">
            <Panel title="Overview">
              <p className="font-mono text-base leading-8 text-[#c0bcb0]">
                {details.overview || "No description available."}
              </p>
            </Panel>

            {trailer && (
              <Panel title="Trailer + Clips">
                <div id="trailer-room" className="space-y-5 scroll-mt-24">
                  <div className="trailer-stage">
                    <iframe
                      key={trailer.key}
                      className="trailer-frame"
                      src={`${trailer.embedUrl}?rel=0&modestbranding=1`}
                      title={trailer.name || `${movie.title} trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">
                        Now Playing
                      </p>
                      <h3 className="mt-1 font-serif text-2xl font-semibold text-[#f5f0e8]">
                        {trailer.name || "Official trailer"}
                      </h3>
                    </div>
                    <a
                      href={trailer.url}
                      target="_blank"
                      rel="noreferrer"
                      className="cinema-btn-outline"
                    >
                      Open on YouTube
                    </a>
                  </div>

                  {videos.length > 1 && (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {videos.map((video) => (
                        <button
                          key={video.key}
                          type="button"
                          onClick={() => setActiveVideo(video)}
                          className={`clip-card rounded-2xl p-3 text-left ${video.key === trailer.key ? "clip-card-active" : ""}`}
                        >
                          <div className="relative overflow-hidden rounded-xl">
                            <img
                              src={video.thumbnail}
                              alt={video.name}
                              className="aspect-video w-full object-cover opacity-85"
                            />
                            <span className="absolute left-3 top-3 rounded-full bg-[#d4af37] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#07060a]">
                              {video.type || "Video"}
                            </span>
                            <span className="absolute inset-0 grid place-items-center text-3xl text-white drop-shadow-lg">
                              PLAY
                            </span>
                          </div>
                          <p className="mt-3 line-clamp-2 font-mono text-xs font-semibold leading-5 text-[#f5f0e8]">
                            {video.name}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
            )}

            {details.cast?.length > 0 && (
              <Panel title="Top Cast">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {details.cast.slice(0, 8).map((actor, idx) => (
                    <div key={idx} className="glass-panel p-3">
                      <img
                        src={actor.profile || CinematicPlaceholder({ title: actor.name, width: 185, height: 278 })}
                        alt={actor.name}
                        className="aspect-[2/3] w-full rounded-lg object-cover"
                        onError={(e) => {
                          e.target.src = CinematicPlaceholder({ title: actor.name, width: 185, height: 278 });
                        }}
                      />
                      <p className="mt-3 font-serif font-semibold text-[#f5f0e8]">{actor.name}</p>
                      <p className="mt-1 line-clamp-2 font-mono text-xs text-[rgba(212,175,55,0.6)]">
                        {actor.character}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <Panel title="MyPOV Community Reviews">
              {reviews.length === 0 ? (
                <p className="font-mono text-sm text-[rgba(212,175,55,0.5)]">No community reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <article key={review._id} className="glass-panel p-5 transition-all hover:border-[rgba(212,175,55,0.5)]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-bold text-[#d4af37]">
                            @{review.user?.username || "user"}
                          </p>
                          <p className="mt-1 font-mono text-xs text-[rgba(212,175,55,0.5)]">{review.date}</p>
                        </div>
                        <span className="rounded-md bg-[#d4af37] px-3 py-1 font-mono text-sm font-bold text-[#0a0803]">
                          {review.rating}/10
                        </span>
                      </div>
                      <p className="mt-4 font-mono text-sm leading-6 text-[#c0bcb0]">
                        {review.review || "No review written."}
                      </p>
                      <Link to={`/post/${review._id}`} className="mt-4 inline-flex font-mono text-sm font-semibold text-[#d4af37] hover:text-[#f5e09c]">
                        Open full review →
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </section>
      </div>
    </>
  );
}

// Subcomponents
function Panel({ title, children }) {
  return (
    <div className="glass-panel p-6">
      <h2 className="mb-4 font-serif text-2xl font-semibold text-[#f5f0e8]">{title}</h2>
      {children}
    </div>
  );
}

function ScoreCard({ label, value, detail }) {
  return (
    <div className="movie-scorecard p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[rgba(212,175,55,0.7)]">{label}</p>
      <p className="mt-2 font-serif text-2xl font-semibold text-[#f5f0e8]">{value}</p>
      <p className="mt-1 font-mono text-xs text-[rgba(212,175,55,0.5)]">{detail}</p>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="fact-row">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[rgba(212,175,55,0.6)]">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-[#c0bcb0]">{value}</p>
    </div>
  );
}

function formatCount(count) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

// ✅ CRITICAL: default export
export default MoviePage;
