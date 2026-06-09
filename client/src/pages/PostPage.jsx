// src/components/PostPage.jsx
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchGenres } from "../api/genre";
import { apiFetch } from "../api/client";
import { CinematicPlaceholder } from "../utils/placeholderImage";
import { getMoviePath } from "../utils/movieLinks";
import ShareImageCard from "../components/ShareImageCard";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function toDateInputValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function getShortReview(review, maxLength = 180) {
  const text = String(review || "No written review.").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(localStorage.getItem("token"));
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?._id || currentUser?.id;

  const [entry, setEntry] = useState(null);
  const [genreNames, setGenreNames] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    rating: "",
    review: "",
    date: "",
    pov: false,
    isPublic: false,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [entryActionError, setEntryActionError] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [showShareCard, setShowShareCard] = useState(false);

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
    setIsEditing(false);
    setEntryActionError("");
    setShareStatus("");
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
      setEntryActionError(err.message || "Failed to load review");
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

  function openEditForm() {
    if (!entry) return;
    setEntryActionError("");
    setEditForm({
      rating: entry.rating ?? "",
      review: entry.review || "",
      date: toDateInputValue(entry.date),
      pov: Boolean(entry.pov),
      isPublic: Boolean(entry.isPublic),
    });
    setIsEditing(true);
  }

  async function saveReviewEdit() {
    const rating = Number(editForm.rating);
    if (!rating || rating < 1 || rating > 10) {
      setEntryActionError("Rating must be between 1 and 10.");
      return;
    }
    if (!editForm.date) {
      setEntryActionError("Pick a watched date before saving.");
      return;
    }

    try {
      setSavingEdit(true);
      setEntryActionError("");
      const updated = await apiFetch(`/entries/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          rating,
          review: editForm.review,
          date: editForm.date,
          pov: editForm.pov,
          isPublic: editForm.isPublic,
        }),
      });
      setEntry(updated);
      setIsEditing(false);
    } catch (err) {
      console.error("Review update failed:", err);
      setEntryActionError(err.message || "Failed to update review");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteReview() {
    if (!window.confirm("Delete this review permanently? This cannot be undone.")) return;

    try {
      setEntryActionError("");
      await apiFetch(`/entries/${id}`, { method: "DELETE" });
      navigate("/");
    } catch (err) {
      console.error("Review delete failed:", err);
      setEntryActionError(err.message || "Failed to delete review");
    }
  }

  function buildShareData() {
    if (!entry) return { title: "MyPOV review", text: "", url: "" };
    const url = `${window.location.origin}/post/${entry._id || id}`;
    const review = getShortReview(entry.review);
    const text = `I rated ${entry.title} ${entry.rating}/10 on MyPOV.\n\n"${review}"\n\n${url}`;

    return {
      title: `${entry.title} review on MyPOV`,
      text,
      url,
    };
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  async function shareReview() {
    const shareData = buildShareData();
    setShareStatus("");

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("Share sheet opened.");
        return;
      }

      await copyTextToClipboard(shareData.text);
      setShareStatus("Review share text copied.");
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Share failed:", err);
        setShareStatus("Could not share this review.");
      }
    }
  }

  async function copyShareText() {
    try {
      await copyTextToClipboard(buildShareData().text);
      setShareStatus("Review share text copied.");
    } catch (err) {
      console.error("Copy failed:", err);
      setShareStatus("Could not copy review text.");
    }
  }

  function openShareWindow(type) {
    const { text, url } = buildShareData();
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);
    const links = {
      x: `https://twitter.com/intent/tweet?text=${encodedText}`,
      whatsapp: `https://wa.me/?text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    };

    window.open(links[type], "_blank", "width=720,height=640,noreferrer");
  }

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
    .cinema-btn-gold,
    .cinema-btn-muted,
    .cinema-btn-danger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 38px;
      font-family: 'Cinzel', serif;
      font-size: 12px;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 10px 20px;
      border-radius: 40px;
      cursor: pointer;
      transition: transform 0.2s, opacity 0.2s, border-color 0.2s;
      text-decoration: none;
      white-space: nowrap;
    }
    .cinema-btn-gold {
      background: linear-gradient(135deg, #d4af37, #b8960c);
      color: #0a0803;
      border: none;
    }
    .cinema-btn-muted {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(212,175,55,0.35);
      color: #d4af37;
    }
    .cinema-btn-danger {
      background: rgba(160,40,40,0.12);
      border: 1px solid rgba(248,113,113,0.42);
      color: #fca5a5;
    }
    .cinema-btn-gold:hover,
    .cinema-btn-muted:hover,
    .cinema-btn-danger:hover {
      transform: translateY(-2px);
    }
    .cinema-btn-gold:disabled,
    .cinema-btn-muted:disabled {
      cursor: not-allowed;
      opacity: 0.55;
      transform: none;
    }
    .comment-input,
    .review-edit-input {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(212,175,55,0.2);
      border-radius: 12px;
      padding: 12px 16px;
      color: #f5f0e8;
      font-family: 'DM Mono', monospace;
      font-size: 13px;
      transition: border-color 0.2s;
    }
    .comment-input:focus,
    .review-edit-input:focus {
      outline: none;
      border-color: rgba(212,175,55,0.6);
    }
    .review-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }
    .share-card {
      background: linear-gradient(135deg, rgba(212,175,55,0.13), rgba(255,255,255,0.03));
      border: 1px solid rgba(212,175,55,0.22);
      border-radius: 18px;
      padding: 18px;
    }
    .share-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }
    .share-chip {
      border: 1px solid rgba(212,175,55,0.3);
      background: rgba(7,6,10,0.45);
      color: #d4af37;
      border-radius: 999px;
      padding: 7px 12px;
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      cursor: pointer;
    }
    .edit-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 14px;
      margin-bottom: 14px;
    }
    .edit-label {
      display: grid;
      gap: 6px;
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      color: rgba(212,175,55,0.7);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }
    .edit-checks {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin: 14px 0 18px;
      font-family: 'DM Mono', monospace;
      font-size: 12px;
      color: #c0bcb0;
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
            {entryActionError && (
              <div className="glass-card mb-6 p-5 text-center">
                <p className="font-mono text-sm text-red-300">{entryActionError}</p>
              </div>
            )}
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
  const entryUserId = entry?.user?._id || entry?.user?.id || entry?.user;
  const canManageEntry = Boolean(
    isLoggedIn &&
    currentUserId &&
    entryUserId &&
    String(currentUserId) === String(entryUserId)
  );

  return (
    <>
      <style>{globalStyles}</style>
      <div className="post-bg relative min-h-screen text-[#f5f0e8]">
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: "radial-gradient(ellipse 60% 60% at 25% 50%, rgba(212,175,55,0.04) 0%, transparent 70%), radial-gradient(ellipse 40% 80% at 80% 20%, rgba(120,80,200,0.06) 0%, transparent 60%)",
          }}
        />

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
                <span className="cinema-badge">Rating {entry.rating}/10</span>
                <span className="cinema-badge">{entry.type === "tv" ? "TV Show" : "Movie"}</span>
                <span className="cinema-badge">{entry.date}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {genreNames.map(g => (
                  <span key={g} className="cinema-badge bg-opacity-5">{g}</span>
                ))}
              </div>
              <div className="review-toolbar">
                <Link to={moviePath} className="cinema-btn-gold">
                  Visit Movie Page
                </Link>
                <button type="button" onClick={shareReview} className="cinema-btn-muted">
                  Share Review
                </button>
                <button type="button" onClick={() => setShowShareCard(true)} className="cinema-btn-muted">
                  Share Image
                </button>
                {canManageEntry && (
                  <>
                    <button type="button" onClick={openEditForm} className="cinema-btn-muted">
                      Edit Review
                    </button>
                    <button type="button" onClick={deleteReview} className="cinema-btn-danger">
                      Delete Review
                    </button>
                  </>
                )}
              </div>
              {shareStatus && (
                <p className="mt-3 font-mono text-xs text-[rgba(212,175,55,0.72)]">{shareStatus}</p>
              )}
              {entryActionError && (
                <p className="mt-3 font-mono text-xs text-red-300">{entryActionError}</p>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 px-6 md:px-10 py-10 max-w-4xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-3xl font-semibold text-[#f5f0e8] border-l-4 border-[#d4af37] pl-4">
              Review
            </h2>
            <button type="button" onClick={shareReview} className="cinema-btn-muted">
              Share
            </button>
          </div>

          {isEditing ? (
            <div className="glass-card p-6">
              <div className="edit-grid">
                <label className="edit-label">
                  Rating
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={editForm.rating}
                    onChange={(e) => setEditForm(prev => ({ ...prev, rating: e.target.value }))}
                    className="review-edit-input"
                  />
                </label>
                <label className="edit-label">
                  Watched Date
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                    className="review-edit-input"
                  />
                </label>
              </div>
              <label className="edit-label">
                Review
                <textarea
                  value={editForm.review}
                  onChange={(e) => setEditForm(prev => ({ ...prev, review: e.target.value }))}
                  className="review-edit-input min-h-[180px]"
                  rows="7"
                  maxLength="5000"
                />
              </label>
              <div className="edit-checks">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.isPublic}
                    onChange={(e) => setEditForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                  />
                  Public review
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.pov}
                    onChange={(e) => setEditForm(prev => ({ ...prev, pov: e.target.checked }))}
                  />
                  Mark as POV
                </label>
              </div>
              <div className="review-toolbar">
                <button
                  type="button"
                  onClick={saveReviewEdit}
                  disabled={savingEdit}
                  className="cinema-btn-gold"
                >
                  {savingEdit ? "Saving" : "Save Review"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={savingEdit}
                  className="cinema-btn-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card p-6">
              <p className="font-mono text-base leading-relaxed text-[#c0bcb0] whitespace-pre-wrap">
                {entry.review || "No review written."}
              </p>
            </div>
          )}

          <div className="share-card mt-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">
              Social Preview
            </p>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl font-semibold text-[#f5f0e8]">{entry.title}</h3>
                <p className="mt-1 font-mono text-sm text-[#d4af37]">{entry.rating}/10 on MyPOV</p>
              </div>
              <span className="cinema-badge">{entry.type === "tv" ? "Series" : "Film"}</span>
            </div>
            <p className="mt-4 font-mono text-sm leading-6 text-[#c0bcb0]">
              "{getShortReview(entry.review)}"
            </p>
            <div className="share-actions">
              <button type="button" onClick={shareReview} className="share-chip">Share</button>
              <button type="button" onClick={() => setShowShareCard(true)} className="share-chip">📸 Share Image</button>
              <button type="button" onClick={copyShareText} className="share-chip">Copy Text</button>
              <button type="button" onClick={() => openShareWindow("x")} className="share-chip">X</button>
              <button type="button" onClick={() => openShareWindow("whatsapp")} className="share-chip">WhatsApp</button>
              <button type="button" onClick={() => openShareWindow("facebook")} className="share-chip">Facebook</button>
            </div>
          </div>
        </div>

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

      {showShareCard && (
        <ShareImageCard entry={entry} onClose={() => setShowShareCard(false)} />
      )}
    </>
  );
}

export default PostPage;
