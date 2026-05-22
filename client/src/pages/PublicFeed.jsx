// src/components/PublicFeed.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import PublicPostCard from "../components/PublicPostCard";
import { apiFetch } from "../api/client";
import { CinematicPlaceholder } from "../utils/placeholderImage";

const PAGE_SIZE = 48;

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "rating", label: "Top Rated" },
  { value: "reviews", label: "Most Reviewed" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "movie", label: "Films" },
  { value: "tv", label: "Series" },
];

function groupPostsByTitle(posts) {
  const map = new Map();
  for (const post of posts) {
    const key = post.tmdbId || post.title || post._id;
    if (!map.has(key)) {
      map.set(key, {
        key,
        title: post.title,
        poster: post.poster || null,
        type: post.type,
        tmdbId: post.tmdbId,
        year: post.year,
        reviews: [],
        totalRating: 0,
        ratingCount: 0,
        latestAt: post.createdAt || 0,
      });
    }
    const group = map.get(key);
    group.reviews.push(post);
    if (post.rating != null) {
      group.totalRating += post.rating;
      group.ratingCount += 1;
    }
    if ((post.createdAt || 0) > group.latestAt) {
      group.latestAt = post.createdAt || 0;
    }
  }
  return Array.from(map.values()).map((g) => ({
    ...g,
    avgRating: g.ratingCount > 0 ? g.totalRating / g.ratingCount : null,
  }));
}

function sortGroups(groups, sort) {
  return [...groups].sort((a, b) => {
    if (sort === "rating") return (b.avgRating ?? 0) - (a.avgRating ?? 0);
    if (sort === "reviews") return b.reviews.length - a.reviews.length;
    return (b.latestAt || 0) - (a.latestAt || 0);
  });
}

function PublicFeed() {
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedKey, setExpandedKey] = useState(null);

  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const requestSeqRef = useRef(0);
  const seenIdsRef = useRef(new Set());
  const sentinelRef = useRef(null);
  const pageRef = useRef(1);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const fetchPosts = useCallback(
    async (pageNumber = 1, reset = false) => {
      if (abortRef.current) abortRef.current.abort();
      const requestId = requestSeqRef.current + 1;
      requestSeqRef.current = requestId;
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setLoading(true);
        setError("");
        const params = new URLSearchParams({
          page: String(pageNumber),
          limit: String(PAGE_SIZE),
          sort,
        });
        if (filter !== "all") params.set("type", filter);
        if (debouncedSearch) params.set("q", debouncedSearch);

        const data = await apiFetch(`/entries/public?${params.toString()}`, {
          signal: controller.signal,
        });
        if (requestId !== requestSeqRef.current) return;

        const incoming = Array.isArray(data.posts) ? data.posts : [];
        if (reset) seenIdsRef.current.clear();
        const uniqueIncoming = incoming.filter((post) => {
          if (!post?._id || seenIdsRef.current.has(post._id)) return false;
          seenIdsRef.current.add(post._id);
          return true;
        });
        setPosts((prev) => (reset ? uniqueIncoming : [...prev, ...uniqueIncoming]));
        pageRef.current = pageNumber;
        setHasMore(Boolean(data.pagination?.hasMore));
        if (data.pagination?.total != null) setTotalCount(data.pagination.total);
      } catch (err) {
        if (err.name === "AbortError" || requestId !== requestSeqRef.current) return;
        setError(err.message || "Failed to load reviews");
      } finally {
        if (requestId === requestSeqRef.current) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    },
    [debouncedSearch, filter, sort]
  );

  useEffect(() => {
    setPosts([]);
    pageRef.current = 1;
    setHasMore(true);
    setInitialLoad(true);
    setTotalCount(null);
    setError("");
    setExpandedKey(null);
    fetchPosts(1, true);
  }, [fetchPosts]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || initialLoad || loading || !hasMore || error) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) fetchPosts(pageRef.current + 1);
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [error, fetchPosts, hasMore, initialLoad, loading]);

  function retryPage() {
    fetchPosts(posts.length ? pageRef.current : 1, posts.length === 0);
  }

  function clearSearch() {
    setSearch("");
    setDebouncedSearch("");
  }

  const groups = sortGroups(groupPostsByTitle(posts), sort);
  const uniqueTitlesCount = groups.length;

  // Global styles (cinema theme)
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Cinzel:wght@400;600&display=swap');

    .feed-card { animation: fadeSlideIn 0.35s cubic-bezier(0.22,1,0.36,1) both; }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0%, 100% { opacity: 0.3; }
      50%       { opacity: 0.6; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes expandIn {
      from { opacity: 0; transform: scaleY(0.96); }
      to   { opacity: 1; transform: scaleY(1); }
    }
    input[type="text"]:focus { outline: none; border-color: rgba(212,175,55,0.45) !important; }
    select:focus { outline: none; }
    .group-card-poster { transition: transform 0.3s cubic-bezier(0.22,1,0.36,1); }
    .group-card:hover .group-card-poster { transform: scale(1.04); }
    .group-card:hover .overlay-reveal { opacity: 1 !important; }
  `;

  return (
    <main style={styles.page}>
      <div style={styles.vignette} aria-hidden="true" />
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerTop}>
            <div>
              <div style={styles.eyebrow}>
                <span style={styles.eyebrowDot} />
                <span style={styles.eyebrowText}>Community</span>
              </div>
              <h1 style={styles.title}>Public Reviews</h1>
              <p style={styles.subtitle}>
                See what the MyPOV community is watching and thinking.
                {totalCount != null && !debouncedSearch && (
                  <span style={styles.countBadge}>
                    {formatCount(totalCount)} reviews · {formatCount(uniqueTitlesCount)} titles
                  </span>
                )}
                {debouncedSearch && groups.length > 0 && (
                  <span style={styles.searchResultBadge}>
                    {groups.length} title{groups.length === 1 ? "" : "s"} for &ldquo;{debouncedSearch}&rdquo;
                  </span>
                )}
              </p>
            </div>
          </div>

          <div style={styles.controlsBar}>
            <div style={styles.searchWrap}>
              <SearchIcon />
              <input
                type="text"
                placeholder="Search titles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
              {search && (
                <button type="button" onClick={clearSearch} style={styles.clearBtn} aria-label="Clear search">
                  ✕
                </button>
              )}
            </div>

            <div style={styles.filterGroup} aria-label="Review type filter">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilter(opt.value)}
                  style={{ ...styles.filterBtn, ...(filter === opt.value ? styles.filterBtnActive : {}) }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={styles.sortWrap}>
              <SortIcon />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={styles.sortSelect}
                aria-label="Sort reviews"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {error && (
          <div style={styles.errorBar}>
            <span style={styles.errorIcon}>!</span>
            <div style={{ flex: 1 }}>
              <p style={styles.errorTitle}>Could not load reviews</p>
              <p style={styles.errorMsg}>{error}</p>
            </div>
            <button type="button" onClick={retryPage} style={styles.retryBtn}>Retry</button>
          </div>
        )}

        {initialLoad && <FeedSkeleton />}

        {!initialLoad && !loading && groups.length === 0 && !error && (
          <EmptyState search={debouncedSearch} filter={filter} />
        )}

        {!initialLoad && groups.length > 0 && (
          <>
            <div style={styles.grid}>
              {groups.map((group, index) => (
                <GroupCard
                  key={group.key}
                  group={group}
                  index={index}
                  expanded={expandedKey === group.key}
                  onToggle={() => setExpandedKey(expandedKey === group.key ? null : group.key)}
                />
              ))}
              {loading && !initialLoad &&
                Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`paging-${i}`} delay={i * 55} />)}
            </div>

            {loading && !initialLoad && (
              <div style={styles.spinnerWrap}><Spinner /></div>
            )}

            {!hasMore && !loading && (
              <div style={styles.endOfFeed}>
                <span style={styles.endLine} />
                <span style={styles.endText}>All caught up</span>
                <span style={styles.endLine} />
              </div>
            )}
          </>
        )}

        <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
      </div>

      <style>{globalStyles}</style>
    </main>
  );
}

// ─── Group Card (cinema themed) ───────────────────────────────────────────────
function GroupCard({ group, index, expanded, onToggle }) {
  const avg = group.avgRating;
  const count = group.reviews.length;
  const stars = avg != null ? Math.round(avg * 2) / 2 : null;
  const posterUrl = group.poster || CinematicPlaceholder({ title: group.title, width: 300, height: 450 });

  return (
    <div className="feed-card" style={{ animationDelay: `${Math.min(index % 12, 11) * 40}ms` }}>
      <div
        className="group-card"
        style={styles.groupCard}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}
      >
        <div style={styles.posterWrap}>
          <img
            className="group-card-poster"
            src={posterUrl}
            alt={group.title}
            style={styles.poster}
            loading="lazy"
            onError={(e) => {
              e.target.src = CinematicPlaceholder({ title: group.title, width: 300, height: 450 });
            }}
          />
          <div className="overlay-reveal" style={styles.overlay}>
            <div style={styles.overlayInner}>
              <span style={styles.overlayViewText}>
                {count} review{count !== 1 ? "s" : ""}
              </span>
              <span style={styles.overlayChevron}>{expanded ? "▲" : "▼"}</span>
            </div>
          </div>
          {count > 1 && <div style={styles.reviewCountBadge}>{count}</div>}
          {group.type && (
            <div style={styles.typePill}>
              {group.type === "movie" ? "Film" : "Series"}
            </div>
          )}
        </div>
        <div style={styles.cardMeta}>
          <p style={styles.cardTitle} title={group.title}>{group.title}</p>
          <div style={styles.cardSubrow}>
            {group.year && <span style={styles.cardYear}>{group.year}</span>}
            {avg != null && (
              <span style={styles.ratingRow}>
                <StarIcon />
                <span style={styles.ratingNum}>{avg.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={styles.reviewsPanel}>
          <div style={styles.reviewsPanelHeader}>
            <span style={styles.reviewsPanelTitle}>
              {count} review{count !== 1 ? "s" : ""} for <em>{group.title}</em>
            </span>
            <button type="button" onClick={onToggle} style={styles.collapseBtn}>
              Close ✕
            </button>
          </div>
          <div style={styles.reviewsGrid}>
            {group.reviews.map((post) => (
              <div key={post._id} style={styles.reviewItem}>
                <PublicPostCard entry={post} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div style={styles.grid}>
      {Array.from({ length: 12 }).map((_, i) => (
        <SkeletonCard key={i} delay={i * 55} />
      ))}
    </div>
  );
}

function SkeletonCard({ delay = 0 }) {
  return (
    <div style={styles.skelCard}>
      <div style={{ ...styles.skelPoster, animationDelay: `${delay}ms` }} />
      <div style={{ padding: "10px 0 0" }}>
        <div style={{ ...styles.skel, height: 13, width: "72%", marginBottom: 7 }} />
        <div style={{ ...styles.skel, height: 10, width: "42%" }} />
      </div>
    </div>
  );
}

function EmptyState({ search, filter }) {
  const ctx = search
    ? `"${search}"`
    : filter === "movie" ? "films" : filter === "tv" ? "series" : "reviews";
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>{search ? "Search" : "No posts"}</div>
      <h2 style={styles.emptyTitle}>
        {search ? `No results for ${ctx}` : `No ${ctx} yet`}
      </h2>
      <p style={styles.emptyBody}>
        {search
          ? "Try a different title or clear your search."
          : "Be the first to share your take with the community."}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" style={{ animation: "spin 0.75s linear infinite", display: "block" }}>
      <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="2.5" />
      <path d="M11 2 a9 9 0 0 1 9 9" fill="none" stroke="#d4af37" strokeLinecap="round" strokeWidth="2.5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="#d4af37" style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
      <circle cx="6.5" cy="6.5" r="4.5" stroke="rgba(212,175,55,0.4)" strokeWidth="1.5" />
      <path d="M10.5 10.5l3 3" stroke="rgba(212,175,55,0.4)" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2 4h12M4 8h8M6 12h4" stroke="rgba(212,175,55,0.5)" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function formatCount(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

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
    maxWidth: 1200,
    margin: "0 auto",
    padding: "40px 24px 80px",
    position: "relative",
    zIndex: 1,
  },
  header: { marginBottom: 36 },
  headerTop: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  eyebrow: { display: "flex", alignItems: "center", gap: 7, marginBottom: 10 },
  eyebrowDot: {
    width: 7, height: 7, borderRadius: "50%",
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
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  countBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: "#d4af37",
    background: "rgba(212,175,55,0.12)",
    border: "1px solid rgba(212,175,55,0.3)",
    padding: "2px 9px",
    borderRadius: 20,
    letterSpacing: "0.04em",
  },
  searchResultBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(212,175,55,0.8)",
    background: "rgba(212,175,55,0.08)",
    border: "1px solid rgba(212,175,55,0.2)",
    padding: "2px 9px",
    borderRadius: 20,
  },
  controlsBar: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  searchWrap: { position: "relative", flex: "1 1 220px", minWidth: 180, maxWidth: 340 },
  searchInput: {
    width: "100%",
    padding: "9px 36px 9px 34px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(212,175,55,0.2)",
    borderRadius: 7,
    color: "#f5f0e8",
    fontSize: 13,
    fontFamily: "'DM Mono', monospace",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  clearBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "rgba(212,175,55,0.6)",
    fontSize: 13,
    cursor: "pointer",
    lineHeight: 1,
    padding: 0,
  },
  filterGroup: {
    display: "flex",
    gap: 3,
    background: "rgba(255,255,255,0.03)",
    padding: 3,
    borderRadius: 8,
    border: "1px solid rgba(212,175,55,0.15)",
    flexShrink: 0,
  },
  filterBtn: {
    padding: "7px 14px",
    borderRadius: 5,
    border: "1px solid transparent",
    background: "transparent",
    color: "rgba(212,175,55,0.6)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "1px",
    textTransform: "uppercase",
    transition: "all 0.15s ease",
  },
  filterBtnActive: {
    background: "rgba(212,175,55,0.12)",
    color: "#d4af37",
    borderColor: "rgba(212,175,55,0.3)",
  },
  sortWrap: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "7px 12px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(212,175,55,0.15)",
    borderRadius: 7,
    flexShrink: 0,
  },
  sortSelect: {
    background: "transparent",
    border: "none",
    color: "rgba(212,175,55,0.8)",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'DM Mono', monospace",
    cursor: "pointer",
    appearance: "none",
    paddingRight: 4,
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
    flexShrink: 0,
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
    gap: 22,
  },
  groupCard: {
    cursor: "pointer",
    userSelect: "none",
  },
  posterWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "2/3",
    borderRadius: 10,
    overflow: "hidden",
    background: "rgba(10,8,3,0.6)",
    border: "1px solid rgba(212,175,55,0.1)",
  },
  poster: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    borderRadius: 10,
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, rgba(7,6,10,0.9) 0%, rgba(7,6,10,0.2) 55%, transparent 100%)",
    opacity: 0,
    transition: "opacity 0.22s ease",
    display: "flex",
    alignItems: "flex-end",
    padding: "12px 10px",
    borderRadius: 10,
  },
  overlayInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  overlayViewText: {
    fontSize: 11,
    fontWeight: 700,
    color: "#d4af37",
    letterSpacing: "0.04em",
    fontFamily: "'DM Mono', monospace",
  },
  overlayChevron: {
    fontSize: 9,
    color: "rgba(212,175,55,0.8)",
  },
  reviewCountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    background: "#d4af37",
    color: "#0a0803",
    fontSize: 11,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 5px",
    lineHeight: 1,
    fontFamily: "'DM Mono', monospace",
  },
  typePill: {
    position: "absolute",
    top: 8,
    left: 8,
    padding: "3px 7px",
    borderRadius: 5,
    background: "rgba(7,6,10,0.8)",
    border: "1px solid rgba(212,175,55,0.3)",
    color: "#d4af37",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    backdropFilter: "blur(4px)",
    fontFamily: "'DM Mono', monospace",
  },
  cardMeta: { padding: "10px 2px 0" },
  cardTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: "#f5f0e8",
    fontFamily: "'Cormorant Garamond', serif",
    lineHeight: 1.3,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    letterSpacing: "-0.01em",
  },
  cardSubrow: {
    marginTop: 5,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  cardYear: {
    fontSize: 10,
    color: "rgba(212,175,55,0.6)",
    fontWeight: 600,
    fontFamily: "'DM Mono', monospace",
  },
  ratingRow: {
    display: "flex",
    alignItems: "center",
    gap: 3,
  },
  ratingNum: {
    fontSize: 11,
    fontWeight: 700,
    color: "#d4af37",
    fontFamily: "'DM Mono', monospace",
  },
  reviewsPanel: {
    marginTop: 12,
    borderRadius: 12,
    background: "rgba(10,8,3,0.5)",
    border: "1px solid rgba(212,175,55,0.15)",
    overflow: "hidden",
    animation: "expandIn 0.22s cubic-bezier(0.22,1,0.36,1) both",
    gridColumn: "1 / -1",
  },
  reviewsPanelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid rgba(212,175,55,0.1)",
  },
  reviewsPanelTitle: {
    fontSize: 12,
    color: "rgba(212,175,55,0.7)",
    fontWeight: 600,
    fontFamily: "'DM Mono', monospace",
  },
  collapseBtn: {
    background: "none",
    border: "none",
    color: "rgba(212,175,55,0.6)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.5px",
  },
  reviewsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 16,
    padding: 16,
  },
  reviewItem: {},
  skelCard: { display: "flex", flexDirection: "column" },
  skelPoster: {
    width: "100%",
    aspectRatio: "2/3",
    borderRadius: 10,
    background: "rgba(212,175,55,0.05)",
    animation: "shimmer 1.6s ease infinite",
  },
  skel: {
    borderRadius: 4,
    background: "rgba(212,175,55,0.05)",
    animation: "shimmer 1.6s ease infinite",
  },
  spinnerWrap: { display: "flex", justifyContent: "center", padding: "28px 0 0" },
  endOfFeed: { marginTop: 52, display: "flex", alignItems: "center", gap: 16 },
  endLine: { flex: 1, height: 1, background: "rgba(212,175,55,0.1)" },
  endText: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(212,175,55,0.4)",
    fontFamily: "'DM Mono', monospace",
    whiteSpace: "nowrap",
  },
  emptyState: { padding: "80px 20px", textAlign: "center" },
  emptyIcon: {
    marginBottom: 16,
    color: "rgba(212,175,55,0.5)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    fontFamily: "'DM Mono', monospace",
  },
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
};

export default PublicFeed;