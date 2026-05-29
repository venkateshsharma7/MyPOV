// src/components/Activity.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { CinematicPlaceholder } from "../utils/placeholderImage";
import { getMoviePath } from "../utils/movieLinks";

// TMDB image base URL
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const POSTER_SIZE = "w154";    // fits the 50x75 thumbnail
const BACKDROP_SIZE = "w300";   // for larger previews if needed

// Activity type config (cinema themed)
const ACTIVITY_CONFIG = {
  log: { icon: "Film", label: "logged", color: "#d4af37" },
  pov: { icon: "POV", label: "shared a POV on", color: "#d4af37" },
  review: { icon: "✍️", label: "wrote a review", color: "#d4af37" },
  rating: { icon: "⭐", label: "rated", color: "#d4af37" },
  like: { icon: "❤️", label: "liked", color: "#e05050" },
  comment: { icon: "💬", label: "commented on", color: "#60a0e0" },
  follow: { icon: "➕", label: "started following", color: "#70c070" },
  watchlist: { icon: "📋", label: "added to watchlist", color: "#d4af37" },
};

// Helper: get image URL from TMDB or full URL
const getImageUrl = (posterPath, title = "Movie") => {
  if (!posterPath) return CinematicPlaceholder({ title, width: 100, height: 150 });
  if (posterPath.startsWith("http")) return posterPath;
  return `${TMDB_IMAGE_BASE}/${POSTER_SIZE}${posterPath}`;
};

function Activity() {
  const [activities, setActivities] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const observerRef = useRef(null);
  const loadingRef = useRef(false);

  const loadActivities = useCallback(async (cursor = null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const url = cursor ? `/activity?cursor=${cursor}` : "/activity";
      const data = await apiFetch(url);
      const newActivities = (data.activities || []).filter(
        (activity) => activity?.user && activity?.entryId && activity?.movieTitle
      );
      setActivities((prev) => (cursor ? [...prev, ...newActivities] : newActivities));
      setNextCursor(data.nextCursor || null);
      setHasMore(!!data.nextCursor);
    } catch (err) {
      console.error("Activity fetch failed:", err);
      setError(err.message || "Failed to load activity feed.");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Infinite scroll observer
  const lastActivityRef = useCallback(
    (node) => {
      if (loading || !hasMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadActivities(nextCursor);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, nextCursor, loadActivities]
  );

  const handleLike = () => {};

  // Group consecutive activities (same user, same target, same type)
  const groupedActivities = [];
  for (let i = 0; i < activities.length; i++) {
    const current = activities[i];
    const next = activities[i + 1];
    if (
      next &&
      current.user?._id &&
      current.user._id === next.user?._id &&
      current.targetId === next.targetId &&
      current.type === next.type
    ) {
      if (!groupedActivities.length || groupedActivities[groupedActivities.length - 1].user?._id !== current.user._id) {
        groupedActivities.push({ ...current, groupedCount: 2 });
      } else {
        groupedActivities[groupedActivities.length - 1].groupedCount++;
      }
      i++; // skip next
    } else {
      groupedActivities.push({ ...current, groupedCount: 1 });
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Cinzel:wght@400;600&display=swap');

        .activity-bg {
          background: #07060a;
          min-height: 100vh;
        }
        .activity-header {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
          letter-spacing: -0.5px;
          color: #f5f0e8;
          border-bottom: 1px solid rgba(212,175,55,0.3);
          display: inline-block;
          padding-bottom: 8px;
        }
        .activity-card {
          background: rgba(10,8,3,0.5);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(212,175,55,0.12);
          border-radius: 20px;
          transition: all 0.2s ease;
        }
        .activity-card:hover {
          border-color: rgba(212,175,55,0.5);
          background: rgba(10,8,3,0.7);
          transform: translateX(4px);
        }
        .activity-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d4af37, #b8960c);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-family: 'Cinzel', serif;
          color: #0a0803;
          font-size: 18px;
          flex-shrink: 0;
        }
        .activity-user {
          font-family: 'DM Mono', monospace;
          font-weight: 600;
          color: #d4af37;
          text-decoration: none;
        }
        .activity-user:hover {
          text-decoration: underline;
        }
        .activity-action {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #c0bcb0;
        }
        .activity-target {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600;
          color: #f5f0e8;
        }
        .activity-poster {
          width: 50px;
          height: 75px;
          object-fit: cover;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .like-button {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .like-button:hover { transform: scale(1.05); }
        .skeleton-card {
          animation: pulse 1.2s infinite;
          background: rgba(255,255,255,0.03);
          border-radius: 20px;
          border: 1px solid rgba(212,175,55,0.1);
        }
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 0.7; }
          100% { opacity: 0.4; }
        }
      `}</style>

      <div className="activity-bg px-6 md:px-10 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="activity-header text-4xl md:text-5xl mb-8">Activity Feed</h1>

          {error && (
            <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-5 text-center mb-6">
              <p className="font-mono text-red-300 text-sm">{error}</p>
              <button
                onClick={() => loadActivities()}
                className="mt-3 px-4 py-1.5 rounded-full border border-[#d4af37] text-[#d4af37] text-xs font-mono hover:bg-[#d4af37]/10"
              >
                Retry
              </button>
            </div>
          )}

          <div className="space-y-4">
            {groupedActivities.map((activity, idx) => {
              if (!activity?.user || !activity?.entryId || !activity?.movieTitle) {
                return null;
              }
              const isLast = idx === groupedActivities.length - 1;
              const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.rating;
              // TMDB image logic
              const posterUrl = getImageUrl(activity.poster_path || activity.poster, activity.movieTitle);
              const moviePath = getMoviePath(activity);
              
              return (
                <div
                  key={activity._id || idx}
                  ref={isLast ? lastActivityRef : null}
                  className="activity-card p-4 flex gap-4"
                >
                  {/* Avatar */}
                  <Link to={`/user/${activity.user.username}`} className="flex-shrink-0">
                    <div className="activity-avatar">
                      {activity.user.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <Link to={`/user/${activity.user.username}`} className="activity-user text-sm">
                        @{activity.user.username}
                      </Link>
                      <span className="activity-action">{config.label}</span>
                      <Link to={moviePath} className="activity-target text-base">
                        “{activity.movieTitle}”
                      </Link>
                      {activity.groupedCount > 1 && (
                        <span className="text-xs font-mono text-[rgba(212,175,55,0.6)]">
                          +{activity.groupedCount - 1} more
                        </span>
                      )}
                    </div>

                    {activity.review && (
                      <p className="mt-2 text-xs font-mono text-[#c0bcb0] border-l-2 border-[rgba(212,175,55,0.3)] pl-3">
                        “{activity.review.substring(0, 140)}”
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={() => handleLike(activity._id, activity.liked)}
                        className={`like-button flex items-center gap-1 ${activity.liked ? "text-[#d4af37]" : "text-gray-500"}`}
                      >
                        {activity.liked ? "❤️ Liked" : "🤍 Like"}
                        <span className="text-xs">{activity.likeCount || 0}</span>
                      </button>
                      <Link
                        to={`/post/${activity.entryId}`}
                        className="like-button text-gray-500 hover:text-[#d4af37]"
                      >
                        💬 Discuss
                      </Link>
                      <span className="text-[10px] font-mono text-[rgba(212,175,55,0.4)]">
                        {new Date(activity.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Poster thumbnail (TMDB) */}
                  <Link to={moviePath} className="flex-shrink-0">
                    <img
                      src={posterUrl}
                      alt={activity.movieTitle}
                      className="activity-poster"
                      onError={(e) => {
                        e.target.src = CinematicPlaceholder({ title: activity.movieTitle, width: 100, height: 150 });
                      }}
                    />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Loading skeletons */}
          {loading && activities.length === 0 && (
            <div className="space-y-4 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-card h-28" />
              ))}
            </div>
          )}

          {loading && activities.length > 0 && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!hasMore && activities.length > 0 && (
            <p className="text-center text-[rgba(212,175,55,0.4)] font-mono text-xs mt-10">
              ✦ End of the reel ✦
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default Activity;
