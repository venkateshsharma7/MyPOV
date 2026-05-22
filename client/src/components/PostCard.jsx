// src/components/PostCard.jsx
import { useNavigate } from "react-router-dom";
import { CinematicPlaceholder } from "../utils/placeholderImage";
import { getMoviePath } from "../utils/movieLinks";

function PostCard({ entry, onDelete, disableDelete }) {
  const navigate = useNavigate();

  // Get poster URL or professional cinema placeholder
  const getPoster = () => {
    if (entry.poster) return entry.poster;
    if (entry.poster_path) return `https://image.tmdb.org/t/p/w500${entry.poster_path}`;
    // Use a compact version of the placeholder for cards
    return CinematicPlaceholder({
      title: entry.title || "No Poster",
      width: 300,
      height: 450,
    });
  };

  const openPost = () => navigate(`/post/${entry._id || entry.id}`);
  const openMovie = (e) => {
    e.stopPropagation();
    navigate(getMoviePath(entry));
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(entry._id || entry.id);
  };

  return (
    <>
      <style>{`
        .postcard-pov-badge {
          font-family: 'DM Mono', monospace;
          background: #d4af37;
          color: #0a0803;
          font-weight: 600;
          letter-spacing: 2px;
          box-shadow: 0 0 8px rgba(212,175,55,0.4);
        }
        .postcard-delete-btn {
          transition: all 0.2s ease;
          background: rgba(0,0,0,0.7);
          border: 1px solid rgba(212,175,55,0.3);
          color: #d4af37;
        }
        .postcard-delete-btn:hover {
          background: #d4af37;
          color: #0a0803;
          border-color: #d4af37;
          transform: scale(1.05);
        }
        .postcard-rating {
          font-family: 'DM Mono', monospace;
          background: #d4af37;
          color: #0a0803;
          font-weight: bold;
          border-radius: 20px;
          padding: 2px 8px;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        .postcard-title {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600;
          letter-spacing: -0.3px;
        }
        .postcard-date {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.5px;
          color: rgba(212,175,55,0.7);
        }
        .postcard-review {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          line-height: 1.4;
          color: #c0bcb0;
        }
        .postcard-movie-btn {
          border: 1px solid rgba(212,175,55,0.45);
          border-radius: 999px;
          color: #d4af37;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
          padding: 5px 9px;
          text-transform: uppercase;
          transition: all 0.2s ease;
        }
        .postcard-movie-btn:hover {
          background: rgba(212,175,55,0.12);
          border-color: #d4af37;
        }
      `}</style>

      <article
        className={`group relative cursor-pointer overflow-hidden rounded-xl transition-all duration-300 ${
          entry.pov ? "ring-2 ring-[#d4af37] ring-offset-1 ring-offset-[#07060a]" : ""
        }`}
        onClick={openPost}
        style={{ background: "#0a0803" }}
      >
        {/* POV Badge */}
        {entry.pov && (
          <span className="postcard-pov-badge absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] shadow-lg">
            POV
          </span>
        )}

        {/* Delete Button */}
        {!disableDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="postcard-delete-btn absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold opacity-0 shadow-lg transition group-hover:opacity-100"
            aria-label="Delete entry"
          >
            ✕
          </button>
        )}

        {/* Poster Image */}
        <img
          src={getPoster()}
          alt={entry.title || "Movie poster"}
          className="h-[270px] w-full object-cover transition duration-500 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            e.target.src = CinematicPlaceholder({
              title: entry.title || "No Poster",
              width: 300,
              height: 450,
            });
          }}
        />

        {/* Gradient Overlay (cinema dark) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-85" />

        {/* Content (title, rating, review) */}
        <div className="absolute inset-x-0 bottom-0 translate-y-8 p-4 transition duration-300 group-hover:translate-y-0">
          <p className="postcard-title line-clamp-2 text-sm font-semibold text-[#f5f0e8]">
            {entry.title || "Untitled"}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className="postcard-rating">{entry.rating || "0"}/10</span>
            <span className="postcard-date truncate">{entry.date}</span>
          </div>

          <p className="postcard-review mt-3 line-clamp-3 opacity-0 transition group-hover:opacity-100">
            {entry.review || "No review written."}
          </p>
          <button
            type="button"
            onClick={openMovie}
            className="postcard-movie-btn mt-3 opacity-0 transition group-hover:opacity-100"
          >
            Movie Page
          </button>
        </div>
      </article>
    </>
  );
}

export default PostCard;
