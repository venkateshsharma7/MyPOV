// src/components/PostPage.jsx
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchGenres } from "../api/genre";
import { apiFetch } from "../api/client";
import { CinematicPlaceholder } from "../utils/placeholderImage";
import { getMoviePath } from "../utils/movieLinks";

function PostPage() {
  const { id } = useParams();
  const isLoggedIn = Boolean(localStorage.getItem("token"));
  const [entry, setEntry] = useState(null);
  const [genreNames, setGenreNames] = useState([]);

  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    loadEntry();
    setComments([]);
    setCommentPage(1);
    setHasMoreComments(true);
    setCommentError("");
  }, [id]);

  useEffect(() => {
    loadComments(commentPage, commentPage === 1);
  }, [id, commentPage]);

  function resolveGenreName(genre, genreMap) {
    if (typeof genre === "string") {
      return genreMap[genre] || genre;
    }

    if (genre && typeof genre === "object") {
      return genre.name || genreMap[genre.id] || genre.id || "";
    }

    return "";
  }

  async function loadEntry() {
    try {
      const entryData = await apiFetch(`/entries/${id}`);
      setEntry(entryData);
      let genreMap = {};
      try {
        genreMap = await fetchGenres();
      } catch (err) {
        console.warn("Genre lookup failed:", err);
      }
      const names = (entryData.genres || [])
        .map((genre) => resolveGenreName(genre, genreMap))
        .filter(Boolean);
      setGenreNames(names);
    } catch (err) {
      console.error("PostPage error:", err);
    }
  }

  async function loadComments(page, reset = false) {
    try {
      setLoadingComments(true);
      const data = await apiFetch(`/comments/${id}?page=${page}`);
      setComments(prev => reset ? (data.comments || []) : [...prev, ...(data.comments || [])]);
      setHasMoreComments(data.pagination?.hasMore || false);
    } catch (err) {
      console.error("Comments load failed:", err);
    } finally {
      setLoadingComments(false);
    }
  }

  async function addComment() {
    if (!newComment.trim()) return;
    if (!isLoggedIn) {
      setCommentError("Login to post a comment");
      return;
    }
    try {
      setCommentError("");
      const data = await apiFetch(`/comments/${id}`, {
        method: "POST",
        body: JSON.stringify({ text: newComment })
      });
      setComments(prev => [data, ...prev]);
      setNewComment("");
    } catch (err) {
      console.error("Comment failed:", err);
      setCommentError(err.message || "Failed to post comment");
    }
  }

  // Global styles (same as Login)
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Cinzel:wght@400;600&display=swap');

    .post-bg {
      background: #07060a;
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
    .cinema-badge {
      background: rgba(212,175,55,0.12);
      border: 1px solid rgba(212,175,55,0.3);
      color: #d4af37;
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 30px;
    }
    .cinema-btn-gold {
      background: linear-gradient(135deg, #d4af37, #b8960c);
      color: #0a0803;
      border: none;
      font-family: 'Cinzel', serif;
      font-size: 12px;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 10px 20px;
      border-radius: 40px;
      cursor: pointer;
      transition: transform 0.2s, opacity 0.2s;
    }
    .cinema-btn-gold:hover {
      transform: translateY(-2px);
    }
    .comment-input {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(212,175,55,0.2);
      border-radius: 12px;
      padding: 12px 16px;
      color: #f5f0e8;
      font-family: 'DM Mono', monospace;
      font-size: 13px;
      transition: border-color 0.2s;
    }
    .comment-input:focus {
      outline: none;
      border-color: rgba(212,175,55,0.6);
    }
    .skeleton {
      background: rgba(255,255,255,0.03);
      animation: pulse 1.2s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.4; }
      50% { opacity: 0.7; }
      100% { opacity: 0.4; }
    }
  `;

  if (!entry) {
    return (
      <>
        <style>{globalStyles}</style>
        <div className="post-bg min-h-screen px-6 py-10">
          <div className="mx-auto max-w-4xl">
            <div className="skeleton h-[500px] rounded-2xl mb-8" />
            <div className="skeleton h-64 rounded-2xl" />
          </div>
        </div>
      </>
    );
  }

  const backdrop = entry.backdrop || entry.poster || CinematicPlaceholder({ title: entry.title, width: 1200, height: 500 });
  const poster = entry.poster || CinematicPlaceholder({ title: entry.title, width: 300, height: 450 });
  const moviePath = getMoviePath(entry);

  return (
    <>
      <style>{globalStyles}</style>
      <div className="post-bg relative min-h-screen text-[#f5f0e8]">
        {/* Ambient gold vignette */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: "radial-gradient(ellipse 60% 60% at 25% 50%, rgba(212,175,55,0.04) 0%, transparent 70%), radial-gradient(ellipse 40% 80% at 80% 20%, rgba(120,80,200,0.06) 0%, transparent 60%)",
          }}
        />

        {/* Hero section with backdrop */}
        <div className="relative z-10 h-[520px] overflow-hidden">
          <img
            src={backdrop}
            alt={entry.title}
            className="absolute w-full h-full object-cover brightness-50"
            onError={(e) => {
              e.target.src = CinematicPlaceholder({ title: entry.title, width: 1200, height: 500 });
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07060a] via-[#07060a]/70 to-transparent" />

          <div className="relative z-10 flex flex-col md:flex-row items-end h-full px-6 md:px-10 pb-10 gap-6">
            <img
              src={poster}
              alt={entry.title}
              className="w-44 md:w-56 rounded-xl border border-[rgba(212,175,55,0.2)] shadow-2xl"
              onError={(e) => {
                e.target.src = CinematicPlaceholder({ title: entry.title, width: 300, height: 450 });
              }}
            />
            <div className="flex-1">
              <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight mb-3">
                {entry.title}
              </h1>
              {entry.user?.username && (
                <p className="font-mono text-sm text-[rgba(212,175,55,0.7)] mb-3">
                  Review by <span className="text-[#d4af37] font-bold">@{entry.user.username}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="cinema-badge">⭐ {entry.rating}/10</span>
                <span className="cinema-badge">🎬 {entry.type === "tv" ? "TV Show" : "Movie"}</span>
                <span className="cinema-badge">📅 {entry.date}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {genreNames.map(g => (
                  <span key={g} className="cinema-badge bg-opacity-5">{g}</span>
                ))}
              </div>
              <Link to={moviePath} className="cinema-btn-gold mt-5 inline-flex no-underline">
                Visit Movie Page
              </Link>
            </div>
          </div>
        </div>

        {/* Review section */}
        <div className="relative z-10 px-6 md:px-10 py-10 max-w-4xl">
          <h2 className="font-serif text-3xl font-semibold text-[#f5f0e8] mb-5 border-l-4 border-[#d4af37] pl-4">
            Review
          </h2>
          <div className="glass-card p-6">
            <p className="font-mono text-base leading-relaxed text-[#c0bcb0] whitespace-pre-wrap">
              {entry.review || "No review written."}
            </p>
          </div>
        </div>

        {/* Comments section */}
        <div className="relative z-10 px-6 md:px-10 pb-20 max-w-4xl">
          <h3 className="font-serif text-2xl font-semibold text-[#f5f0e8] mb-5">
            Comments
          </h3>

          <div className="space-y-4 mb-6">
            {comments.length === 0 && !loadingComments && (
              <p className="font-mono text-sm text-[rgba(212,175,55,0.5)]">No comments yet. Start the conversation.</p>
            )}
            {comments.map(c => (
              <div key={c._id} className="glass-card p-4">
                <p className="font-mono text-sm text-[#d4af37] font-bold">@{c.user.username}</p>
                <p className="font-mono text-sm text-[#c0bcb0] mt-1">{c.text}</p>
              </div>
            ))}
          </div>

          {loadingComments && (
            <p className="font-mono text-sm text-[rgba(212,175,55,0.6)] mb-4">Loading comments...</p>
          )}

          {hasMoreComments && !loadingComments && (
            <button
              onClick={() => setCommentPage(prev => prev + 1)}
              className="cinema-btn-gold mb-6"
            >
              Load More Comments
            </button>
          )}

          {isLoggedIn ? (
            <>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write your thoughts..."
                className="comment-input w-full mb-3"
                rows="3"
              />

              <button
                onClick={addComment}
                className="cinema-btn-gold"
              >
                Post Comment
              </button>
            </>
          ) : (
            <Link to="/login" className="cinema-btn-gold inline-flex no-underline">
              Login to Comment
            </Link>
          )}

          {commentError && (
            <p className="font-mono text-sm text-red-400 mt-3">{commentError}</p>
          )}
        </div>
      </div>
    </>
  );
}

export default PostPage;
