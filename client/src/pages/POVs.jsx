// src/components/POVs.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { CinematicPlaceholder } from "../utils/placeholderImage";
import { getMoviePath } from "../utils/movieLinks";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 48;
const SORT_OPTIONS = [
  { value: "recent",  label: "Recent"      },
  { value: "rating",  label: "Top Rated"   },
  { value: "title",   label: "A → Z"       },
];
const TYPE_OPTIONS = [
  { value: "all",   label: "All"     },
  { value: "movie", label: "Films"   },
  { value: "tv",    label: "Series"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sortEntries(entries, sort) {
  return [...entries].sort((a, b) => {
    if (sort === "rating")  return (b.rating ?? 0) - (a.rating ?? 0);
    if (sort === "title")   return (a.title ?? "").localeCompare(b.title ?? "");
    return new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0);
  });
}

function filterEntries(entries, type, query) {
  return entries.filter(e => {
    const matchesType  = type === "all" || e.type === type;
    const matchesQuery = !query || (e.title ?? "").toLowerCase().includes(query.toLowerCase());
    return matchesType && matchesQuery;
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
function POVs() {
  const [all,            setAll]            = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [error,          setError]          = useState("");
  const [sort,           setSort]           = useState("recent");
  const [type,           setType]           = useState("all");
  const [search,         setSearch]         = useState("");
  const [debouncedSearch,setDebouncedSearch]= useState("");
  const [page,           setPage]           = useState(1);
  const [hasMore,        setHasMore]        = useState(false);
  const [selected,       setSelected]       = useState(null);
  const [hovered,        setHovered]        = useState(null);

  const debounceRef  = useRef(null);
  const sentinelRef  = useRef(null);
  const abortRef     = useRef(null);

  // Debounce search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Load data
  const load = useCallback(async (reset = true) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      reset ? setLoading(true) : setLoadingMore(true);
      setError("");

      const params = new URLSearchParams({ page: reset ? 1 : page + 1, limit: PAGE_SIZE });
      const data   = await apiFetch(`/entries?${params}`, { signal: ctrl.signal });
      const list   = Array.isArray(data) ? data : (Array.isArray(data?.entries) ? data.entries : []);
      const povs   = list.filter(e => e.pov === true);

      if (reset) {
        setAll(povs);
        setPage(1);
      } else {
        setAll(prev => [...prev, ...povs]);
        setPage(p => p + 1);
      }
      setHasMore(povs.length === PAGE_SIZE);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError("Could not load POVs. Check your connection and try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page]);

  useEffect(() => { load(true); }, []);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loading || loadingMore || !hasMore) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) load(false); },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loading, loadingMore, hasMore, load]);

  const filtered = filterEntries(all, type, debouncedSearch);
  const sorted   = sortEntries(filtered, sort);

  // Global styles (cinema theme)
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Cinzel:wght@400;600&display=swap');

    .pov-card {
      display: flex;
      flex-direction: column;
      animation: povFadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both;
    }
    @keyframes povFadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes drawerIn {
      from { opacity: 0; transform: translateY(20px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes backdropIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes shimmer {
      0%, 100% { opacity: 0.3; }
      50%       { opacity: 0.6; }
    }
    input:focus, select:focus { outline: none; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 2px; }
  `;

  // Loading skeleton
  if (loading) return (
    <div style={s.page}>
      <PageHeader
        total={0} sort={sort} setSort={setSort}
        type={type} setType={setType}
        search={search} setSearch={setSearch}
        loading={true}
      />
      <div style={s.grid}>
        {Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} delay={i * 40} />)}
      </div>
      <style>{globalStyles}</style>
    </div>
  );

  // Error full page
  if (error && all.length === 0) return (
    <div style={s.page}>
      <div style={s.errorFullPage}>
        <div style={s.errorEyebrow}>⚠ Error</div>
        <h2 style={s.errorHeading}>Something went wrong</h2>
        <p style={s.errorBody}>{error}</p>
        <button style={s.retryBtn} onClick={() => load(true)}>Try again</button>
      </div>
      <style>{globalStyles}</style>
    </div>
  );

  return (
    <div style={s.page}>
      {/* Gold vignette (Login style) */}
      <div style={s.vignette} aria-hidden="true" />
      <div style={s.noise} aria-hidden="true" />

      <PageHeader
        total={sorted.length}
        sort={sort} setSort={setSort}
        type={type} setType={setType}
        search={search} setSearch={setSearch}
        loading={false}
      />

      {sorted.length === 0 && !loading && (
        <div style={s.emptyWrap}>
          <div style={s.emptyIconRing}><QuoteIcon /></div>
          <h2 style={s.emptyTitle}>
            {debouncedSearch ? `Nothing matched "${debouncedSearch}"` : "No POV posts yet"}
          </h2>
          <p style={s.emptyBody}>
            {debouncedSearch ? "Try a different title, or clear the search." : "Mark entries as POV to showcase your strongest takes here."}
          </p>
          {debouncedSearch && (
            <button style={s.clearBtn} onClick={() => { setSearch(""); setDebouncedSearch(""); }}>
              Clear search
            </button>
          )}
        </div>
      )}

      {sorted.length > 0 && (
        <div style={s.grid}>
          {sorted.map((entry, i) => (
            <EntryCard
              key={entry._id}
              entry={entry}
              index={i}
              isHovered={hovered === entry._id}
              isSelected={selected === entry._id}
              onHover={() => setHovered(entry._id)}
              onLeave={() => setHovered(null)}
              onClick={() => setSelected(selected === entry._id ? null : entry._id)}
            />
          ))}
          {loadingMore && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`more-${i}`} delay={i * 50} />)}
        </div>
      )}

      {error && all.length > 0 && (
        <div style={s.errorBanner}>
          <span style={s.errorBannerText}>{error}</span>
          <button style={s.retryBannerBtn} onClick={() => load(false)}>Retry</button>
        </div>
      )}

      {!hasMore && !loading && sorted.length > 0 && (
        <div style={s.eof}>
          <span style={s.eofLine} /><span style={s.eofText}>All caught up</span><span style={s.eofLine} />
        </div>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />

      {selected && (() => {
        const entry = all.find(e => e._id === selected);
        return entry ? <DetailDrawer entry={entry} onClose={() => setSelected(null)} /> : null;
      })()}

      <style>{globalStyles}</style>
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────
function PageHeader({ total, sort, setSort, type, setType, search, setSearch, loading }) {
  return (
    <header style={s.header}>
      <div style={s.headerInner}>
        <div style={s.eyebrow}>
          <span style={s.eyebrowPip} />
          <span style={s.eyebrowText}>Point of View</span>
        </div>
        <h1 style={s.title}>My POVs</h1>
        <p style={s.subtitle}>
          Unfiltered takes. Strong opinions. These are the films and series that moved the needle.
          {!loading && total > 0 && <span style={s.countChip}>{total} {total === 1 ? "entry" : "entries"}</span>}
        </p>
        <div style={s.controls}>
          <div style={s.searchWrap}>
            <SearchIcon />
            <input type="text" placeholder="Search titles…" value={search} onChange={e => setSearch(e.target.value)} style={s.searchInput} />
            {search && <button onClick={() => setSearch("")} style={s.clearX}>✕</button>}
          </div>
          <div style={s.pills} role="group">
            {TYPE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setType(opt.value)} style={{ ...s.pill, ...(type === opt.value ? s.pillActive : {}) }}>
                {opt.label}
              </button>
            ))}
          </div>
          <div style={s.sortWrap}>
            <SortIcon />
            <select value={sort} onChange={e => setSort(e.target.value)} style={s.sortSelect}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Entry Card ───────────────────────────────────────────────────────────────
function EntryCard({ entry, index, isHovered, isSelected, onHover, onLeave, onClick }) {
  const delay = `${Math.min(index % 12, 11) * 45}ms`;
  const stars = entry.rating != null ? Math.round(entry.rating * 2) / 2 : null;
  // Use CinematicPlaceholder as initial fallback, plus onError
  const posterUrl = entry.poster || CinematicPlaceholder({ title: entry.title, width: 300, height: 450 });

  return (
    <div className="pov-card" style={{ animationDelay: delay }} onMouseEnter={onHover} onMouseLeave={onLeave}>
      <div style={{ ...s.posterWrap, ...(isSelected ? s.posterWrapSelected : {}) }} onClick={onClick} role="button" tabIndex={0}>
        <img
          src={posterUrl}
          alt={entry.title}
          style={{ ...s.poster, transform: isHovered ? "scale(1.06)" : "scale(1)" }}
          loading="lazy"
          onError={(e) => {
            e.target.src = CinematicPlaceholder({ title: entry.title, width: 300, height: 450 });
          }}
        />
        <div style={{ ...s.overlay, opacity: isHovered || isSelected ? 1 : 0 }}>
          <div style={s.overlayContent}>
            {stars != null && (
              <div style={s.overlayRating}>
                <StarIcon size={12} color="#d4af37" />
                <span style={s.overlayRatingNum}>{stars.toFixed(1)}</span>
              </div>
            )}
            <span style={s.overlayTap}>{isSelected ? "Close ↑" : "View ↓"}</span>
          </div>
        </div>
        <div style={s.typeBadge}>{entry.type === "movie" ? "Film" : "Series"}</div>
        {entry.rating != null && (
          <div style={s.ratingBadge}>
            <StarIcon size={9} color="#0a0803" />
            <span style={s.ratingBadgeNum}>{entry.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div style={s.meta}>
        <p style={s.metaTitle}>{entry.title}</p>
        <p style={s.metaYear}>{entry.year ?? "—"}</p>
      </div>
      {isSelected && entry.review && (
        <div style={s.miniReview}>
          <div style={s.miniReviewAccent} />
          <p style={s.miniReviewText}>{entry.review.length > 200 ? `${entry.review.slice(0, 200)}…` : entry.review}</p>
        </div>
      )}
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({ entry, onClose }) {
  const posterUrl = entry.poster || CinematicPlaceholder({ title: entry.title, width: 300, height: 450 });
  const moviePath = getMoviePath(entry);
  return (
    <div style={s.drawerBackdrop} onClick={onClose}>
      <div style={s.drawer} onClick={e => e.stopPropagation()} role="dialog">
        <button style={s.drawerClose} onClick={onClose}>✕</button>
        <div style={s.drawerBody}>
          <img
            src={posterUrl}
            alt={entry.title}
            style={s.drawerPoster}
            onError={(e) => {
              e.target.src = CinematicPlaceholder({ title: entry.title, width: 300, height: 450 });
            }}
          />
          <div style={s.drawerContent}>
            <div style={s.drawerEyebrow}>{entry.type === "movie" ? "Film" : "Series"} {entry.year ? ` · ${entry.year}` : ""}</div>
            <h2 style={s.drawerTitle}>{entry.title}</h2>
            {entry.rating != null && (
              <div style={s.drawerRating}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const fill = entry.rating / 2;
                  const full = i < Math.floor(fill);
                  const half = !full && i < fill;
                  return <StarIcon key={i} size={16} color={full || half ? "#d4af37" : "rgba(212,175,55,0.2)"} />;
                })}
                <span style={s.drawerRatingNum}>{entry.rating.toFixed(1)} / 10</span>
              </div>
            )}
            <p style={s.drawerReview}>{entry.review || "No written review yet."}</p>
            <Link to={moviePath} style={s.drawerMovieLink}>
              Visit Movie Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard({ delay = 0 }) {
  return (
    <div style={s.skel}>
      <div style={{ ...s.skelPoster, animationDelay: `${delay}ms` }} />
      <div style={s.skelMeta}>
        <div style={{ ...s.skelLine, width: "70%", marginBottom: 6 }} />
        <div style={{ ...s.skelLine, width: "40%", height: 10 }} />
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function StarIcon({ size = 11, color = "#d4af37" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} style={{ flexShrink: 0 }}>
      <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7z" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,0.6)" strokeWidth="1.5">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
      <circle cx="6.5" cy="6.5" r="4.5" stroke="rgba(212,175,55,0.4)" strokeWidth="1.5" />
      <path d="M10.5 10.5l3 3" stroke="rgba(212,175,55,0.4)" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
      <path d="M2 4h12M4 8h8M6 12h4" stroke="rgba(212,175,55,0.5)" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

// ─── Cinema Styles ────────────────────────────────────────────────────────────
const s = {
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
  noise: {
    position: "fixed",
    inset: 0,
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
    backgroundSize: "128px",
    pointerEvents: "none",
    zIndex: 0,
    opacity: 0.4,
  },
  header: {
    position: "relative",
    zIndex: 2,
  },
  headerInner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "52px 32px 36px",
  },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  eyebrowPip: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#d4af37",
    boxShadow: "0 0 10px rgba(212,175,55,0.5)",
  },
  eyebrowText: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    color: "#d4af37",
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: "clamp(40px, 6vw, 68px)",
    fontWeight: 300,
    letterSpacing: "-0.02em",
    margin: "0 0 14px",
    color: "#f5f0e8",
    lineHeight: 1.0,
  },
  subtitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    color: "rgba(212,175,55,0.5)",
    margin: "0 0 28px",
    lineHeight: 1.6,
    maxWidth: 560,
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
    padding: "3px 10px",
    borderRadius: 20,
    letterSpacing: "0.05em",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  searchWrap: {
    position: "relative",
    flex: "1 1 220px",
    minWidth: 180,
    maxWidth: 320,
  },
  searchInput: {
    width: "100%",
    padding: "10px 36px 10px 36px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(212,175,55,0.2)",
    borderRadius: 8,
    color: "#f5f0e8",
    fontSize: 12,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.5px",
    transition: "border-color 0.15s",
  },
  clearX: {
    position: "absolute",
    right: 11,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "rgba(212,175,55,0.5)",
    fontSize: 12,
    cursor: "pointer",
  },
  pills: {
    display: "flex",
    gap: 3,
    background: "rgba(255,255,255,0.03)",
    padding: 3,
    borderRadius: 9,
    border: "1px solid rgba(212,175,55,0.15)",
    flexShrink: 0,
  },
  pill: {
    padding: "7px 15px",
    borderRadius: 6,
    border: "1px solid transparent",
    background: "transparent",
    color: "rgba(212,175,55,0.6)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  pillActive: {
    background: "rgba(212,175,55,0.12)",
    color: "#d4af37",
    borderColor: "rgba(212,175,55,0.3)",
  },
  sortWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 13px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(212,175,55,0.15)",
    borderRadius: 8,
    flexShrink: 0,
  },
  sortSelect: {
    background: "transparent",
    border: "none",
    color: "rgba(212,175,55,0.8)",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "1px",
    cursor: "pointer",
    appearance: "none",
  },
  grid: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 32px 80px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(152px, 1fr))",
    gap: 24,
    position: "relative",
    zIndex: 1,
  },
  posterWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "2/3",
    borderRadius: 10,
    overflow: "hidden",
    background: "rgba(10,8,3,0.6)",
    cursor: "pointer",
    transition: "box-shadow 0.25s ease, transform 0.25s ease",
    boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
    border: "1px solid rgba(212,175,55,0.1)",
  },
  posterWrapSelected: {
    boxShadow: "0 0 0 2px rgba(212,175,55,0.6), 0 8px 32px rgba(0,0,0,0.7)",
    transform: "translateY(-2px)",
  },
  poster: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, rgba(7,6,10,0.95) 0%, rgba(7,6,10,0.3) 50%, transparent 100%)",
    transition: "opacity 0.22s ease",
    display: "flex",
    alignItems: "flex-end",
    padding: "14px 12px",
  },
  overlayContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  overlayRating: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  overlayRatingNum: {
    fontSize: 12,
    fontWeight: 700,
    color: "#d4af37",
    letterSpacing: "0.5px",
  },
  overlayTap: {
    fontSize: 9,
    fontWeight: 700,
    color: "rgba(212,175,55,0.8)",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  typeBadge: {
    position: "absolute",
    top: 9,
    left: 9,
    padding: "3px 7px",
    borderRadius: 5,
    background: "rgba(7,6,10,0.8)",
    border: "1px solid rgba(212,175,55,0.3)",
    color: "#d4af37",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    backdropFilter: "blur(4px)",
  },
  ratingBadge: {
    position: "absolute",
    top: 9,
    right: 9,
    display: "flex",
    alignItems: "center",
    gap: 3,
    padding: "3px 7px",
    borderRadius: 5,
    background: "#d4af37",
    color: "#0a0803",
  },
  ratingBadgeNum: {
    fontSize: 10,
    fontWeight: 800,
  },
  meta: {
    padding: "10px 2px 0",
  },
  metaTitle: {
    margin: "0 0 4px",
    fontSize: 13,
    fontWeight: 600,
    color: "#f5f0e8",
    fontFamily: "'Cormorant Garamond', serif",
    lineHeight: 1.3,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  metaYear: {
    margin: 0,
    fontSize: 10,
    color: "rgba(212,175,55,0.6)",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.5px",
  },
  miniReview: {
    marginTop: 10,
    display: "flex",
    gap: 10,
  },
  miniReviewAccent: {
    width: 2,
    borderRadius: 2,
    background: "#d4af37",
    flexShrink: 0,
  },
  miniReviewText: {
    margin: 0,
    fontSize: 11,
    color: "rgba(212,175,55,0.7)",
    fontFamily: "'DM Mono', monospace",
    lineHeight: 1.5,
    fontStyle: "italic",
  },
  drawerBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(7,6,10,0.85)",
    zIndex: 100,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    animation: "backdropIn 0.2s ease both",
    backdropFilter: "blur(8px)",
  },
  drawer: {
    width: "100%",
    maxWidth: 680,
    background: "#0a0803",
    border: "1px solid rgba(212,175,55,0.2)",
    borderBottom: "none",
    borderRadius: "20px 20px 0 0",
    padding: "28px 28px 48px",
    animation: "drawerIn 0.3s cubic-bezier(0.22,1,0.36,1) both",
    position: "relative",
    maxHeight: "85vh",
    overflowY: "auto",
  },
  drawerClose: {
    position: "absolute",
    top: 18,
    right: 18,
    background: "rgba(212,175,55,0.1)",
    border: "1px solid rgba(212,175,55,0.3)",
    color: "#d4af37",
    borderRadius: "50%",
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    transition: "all 0.15s",
  },
  drawerBody: {
    display: "flex",
    gap: 24,
    alignItems: "flex-start",
  },
  drawerPoster: {
    width: 110,
    aspectRatio: "2/3",
    objectFit: "cover",
    borderRadius: 8,
    flexShrink: 0,
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    border: "1px solid rgba(212,175,55,0.2)",
  },
  drawerContent: {
    flex: 1,
    paddingTop: 4,
  },
  drawerEyebrow: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#d4af37",
    fontFamily: "'DM Mono', monospace",
    marginBottom: 8,
  },
  drawerTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 24,
    fontWeight: 600,
    color: "#f5f0e8",
    margin: "0 0 14px",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  drawerRating: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    marginBottom: 16,
  },
  drawerRatingNum: {
    fontSize: 13,
    fontWeight: 700,
    color: "#d4af37",
    marginLeft: 4,
    fontFamily: "'DM Mono', monospace",
  },
  drawerReview: {
    margin: 0,
    fontSize: 13,
    color: "#c0bcb0",
    lineHeight: 1.7,
    fontFamily: "'DM Mono', monospace",
  },
  drawerMovieLink: {
    display: "inline-flex",
    marginTop: 18,
    border: "1px solid rgba(212,175,55,0.45)",
    borderRadius: 999,
    padding: "9px 14px",
    color: "#d4af37",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.1em",
    textDecoration: "none",
    textTransform: "uppercase",
    fontFamily: "'DM Mono', monospace",
  },
  emptyWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "100px 24px",
    textAlign: "center",
    position: "relative",
    zIndex: 1,
  },
  emptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "rgba(212,175,55,0.06)",
    border: "1px solid rgba(212,175,55,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 300,
    color: "#f5f0e8",
    margin: "0 0 10px",
    letterSpacing: "-0.02em",
  },
  emptyBody: {
    fontSize: 13,
    color: "rgba(212,175,55,0.5)",
    fontFamily: "'DM Mono', monospace",
    margin: "0 0 22px",
    maxWidth: 340,
    lineHeight: 1.6,
  },
  clearBtn: {
    padding: "8px 18px",
    borderRadius: 30,
    background: "rgba(212,175,55,0.1)",
    border: "1px solid rgba(212,175,55,0.3)",
    color: "#d4af37",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "1px",
  },
  errorFullPage: {
    minHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 40,
    position: "relative",
    zIndex: 1,
  },
  errorEyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "#d4af37",
    marginBottom: 12,
    fontFamily: "'DM Mono', monospace",
  },
  errorHeading: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 28,
    fontWeight: 300,
    color: "#f5f0e8",
    margin: "0 0 10px",
  },
  errorBody: {
    fontSize: 13,
    color: "rgba(212,175,55,0.6)",
    margin: "0 0 24px",
    maxWidth: 380,
    lineHeight: 1.6,
    fontFamily: "'DM Mono', monospace",
  },
  retryBtn: {
    padding: "10px 24px",
    borderRadius: 40,
    background: "rgba(212,175,55,0.12)",
    border: "1px solid rgba(212,175,55,0.4)",
    color: "#d4af37",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Cinzel', serif",
    letterSpacing: "2px",
    textTransform: "uppercase",
  },
  errorBanner: {
    maxWidth: 1280,
    margin: "0 auto 32px",
    padding: "0 32px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: "rgba(212,175,55,0.7)",
    fontFamily: "'DM Mono', monospace",
  },
  retryBannerBtn: {
    padding: "5px 12px",
    borderRadius: 30,
    background: "transparent",
    border: "1px solid rgba(212,175,55,0.3)",
    color: "#d4af37",
    fontSize: 10,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
  },
  skel: {
    display: "flex",
    flexDirection: "column",
  },
  skelPoster: {
    width: "100%",
    aspectRatio: "2/3",
    borderRadius: 10,
    background: "rgba(212,175,55,0.05)",
    animation: "shimmer 1.7s ease infinite",
  },
  skelMeta: { padding: "10px 2px 0" },
  skelLine: {
    height: 12,
    borderRadius: 4,
    background: "rgba(212,175,55,0.05)",
    animation: "shimmer 1.7s ease infinite",
  },
  eof: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "40px 32px 80px",
    display: "flex",
    alignItems: "center",
    gap: 18,
    position: "relative",
    zIndex: 1,
  },
  eofLine: {
    flex: 1,
    height: "1px",
    background: "rgba(212,175,55,0.15)",
  },
  eofText: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "rgba(212,175,55,0.4)",
    fontFamily: "'DM Mono', monospace",
    whiteSpace: "nowrap",
  },
};

export default POVs;
