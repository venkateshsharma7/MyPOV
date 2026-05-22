// src/components/PublicPostCard.jsx
import { Link } from "react-router-dom";
import { useState } from "react";
import { apiFetch } from "../api/client";
import { CinematicPlaceholder } from "../utils/placeholderImage";
import { getMoviePath } from "../utils/movieLinks";

function PublicPostCard({ entry }) {
  const [likes, setLikes] = useState(entry.likes?.length || 0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggleLike() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to like reviews");
        return;
      }
      setLoading(true);
      const data = await apiFetch(`/entries/${entry._id}/like`, { method: "POST" });
      setLikes(data.likes);
      setLiked(data.liked);
    } catch (err) {
      console.error("Like failed:", err);
    } finally {
      setLoading(false);
    }
  }

  // Professional fallback using cinema SVG placeholder
  const getPoster = () => {
    if (entry.poster) return entry.poster;
    return CinematicPlaceholder({
      title: entry.title || "No Poster",
      width: 300,
      height: 450,
    });
  };

  const poster = getPoster();
  const moviePath = getMoviePath(entry);

  return (
    <>
      <style>{`
        .public-card {
          background: rgba(10,8,3,0.8);
          backdrop-filter: blur(4px);
          transition: all 0.25s ease;
          border: 1px solid rgba(212,175,55,0.1);
        }
        .public-card:hover {
          transform: translateY(-4px);
          border-color: rgba(212,175,55,0.4);
          box-shadow: 0 12px 24px -8px rgba(0,0,0,0.5);
        }
        .public-card-title {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600;
          letter-spacing: -0.3px;
          color: #f5f0e8;
        }
        .public-card-rating {
          font-family: 'DM Mono', monospace;
          color: #d4af37;
          font-size: 12px;
          font-weight: bold;
        }
        .public-card-review {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          line-height: 1.4;
          color: #c0bcb0;
        }
        .like-btn {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          transition: all 0.2s;
        }
        .like-btn-liked {
          color: #d4af37;
        }
        .like-btn-unliked {
          color: rgba(200,185,150,0.5);
        }
        .like-btn-unliked:hover {
          color: #d4af37;
        }
        .review-link {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.5px;
          color: rgba(212,175,55,0.6);
          transition: color 0.2s;
        }
        .review-link:hover {
          color: #d4af37;
        }
        .username-link {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: rgba(212,175,55,0.7);
          transition: color 0.2s;
        }
        .username-link:hover {
          color: #d4af37;
          text-decoration: underline;
        }
      `}</style>

      <div className="public-card rounded-lg overflow-hidden">
        <Link to={moviePath}>
          <img
            src={poster}
            alt={entry.title}
            className="w-full h-[320px] object-cover transition duration-500 hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.target.src = CinematicPlaceholder({
                title: entry.title || "No Poster",
                width: 300,
                height: 450,
              });
            }}
          />
        </Link>

        <div className="p-3">
          <p className="public-card-title text-sm font-semibold line-clamp-2">
            <Link to={moviePath} className="hover:text-[#d4af37] transition">
              {entry.title}
            </Link>
          </p>

          <p className="public-card-rating mt-1">
            Rating {entry.rating}/10
          </p>

          {entry.review && (
            <p className="public-card-review mt-2 line-clamp-2">
              {entry.review}
            </p>
          )}

          {/* Like & Review row */}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={toggleLike}
              disabled={loading}
              className={`like-btn ${liked ? "like-btn-liked" : "like-btn-unliked"}`}
            >
              {liked ? "★ Liked" : "☆ Like"}
            </button>
            <span className="text-xs text-[rgba(212,175,55,0.5)] font-mono">
              {likes}
            </span>
            <Link
              to={`/post/${entry._id}`}
              className="review-link ml-auto"
            >
              Review →
            </Link>
          </div>

          {/* User info */}
          {entry.user?.username && (
            <p className="text-xs mt-3">
              <span className="text-[rgba(200,185,150,0.4)] font-mono text-[9px] tracking-wide">
                REVIEW BY
              </span>{" "}
              <Link
                to={`/user/${entry.user.username}`}
                className="username-link"
              >
                @{entry.user.username}
              </Link>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default PublicPostCard;
