// src/components/Dashboard.jsx
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    movies: 0,
    tv: 0,
    povs: 0,
    avg: 0
  });
  const [ratings, setRatings] = useState({});
  const [topGenres, setTopGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/entries");
      const entries = Array.isArray(data) ? data : [];

      // Basic stats
      const movies = entries.filter(e => e.type === "movie" || !e.type).length;
      const tv = entries.filter(e => e.type === "tv").length;
      const povs = entries.filter(e => e.pov === true).length;
      const avg = entries.length > 0
        ? (entries.reduce((sum, e) => sum + Number(e.rating || 0), 0) / entries.length).toFixed(1)
        : 0;

      // Rating distribution
      const ratingMap = {};
      entries.forEach(e => {
        const r = Number(e.rating);
        ratingMap[r] = (ratingMap[r] || 0) + 1;
      });

      // Genre analysis – directly use string genre names (no external mapping)
      const genreCount = {};
      entries.forEach(entry => {
        (entry.genres || []).forEach(g => {
          genreCount[g] = (genreCount[g] || 0) + 1;
        });
      });
      const sortedGenres = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([genreName]) => genreName)
        .filter(Boolean);

      setTopGenres(sortedGenres);
      setRatings(ratingMap);
      setStats({ total: entries.length, movies, tv, povs, avg });
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  // Global styles (unchanged – included for completeness)
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Cinzel:wght@400;600&display=swap');

    .dashboard-bg {
      background: #07060a;
      min-height: 100vh;
    }
    .glass-card {
      background: rgba(10,8,3,0.6);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(212,175,55,0.12);
      border-radius: 20px;
      transition: all 0.2s ease;
    }
    .glass-card:hover {
      border-color: rgba(212,175,55,0.4);
      transform: translateY(-2px);
    }
    .stat-number {
      font-family: 'Cormorant Garamond', serif;
      font-weight: 600;
      font-size: 2rem;
      color: #f5f0e8;
      letter-spacing: -0.5px;
    }
    .stat-label {
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: rgba(212,175,55,0.7);
    }
    .rating-bar-bg {
      background: rgba(255,255,255,0.08);
      border-radius: 3px;
      height: 6px;
    }
    .rating-bar-fill {
      background: linear-gradient(90deg, #d4af37, #b8960c);
      border-radius: 3px;
      height: 6px;
    }
    .genre-tag {
      background: rgba(212,175,55,0.15);
      border: 1px solid rgba(212,175,55,0.3);
      color: #d4af37;
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 30px;
      transition: all 0.2s;
    }
    .genre-tag:hover {
      background: rgba(212,175,55,0.25);
      border-color: #d4af37;
    }
    .dashboard-header {
      font-family: 'Cormorant Garamond', serif;
      font-weight: 300;
      letter-spacing: -0.5px;
      color: #f5f0e8;
      border-bottom: 1px solid rgba(212,175,55,0.3);
      display: inline-block;
      padding-bottom: 8px;
    }
    .skeleton {
      background: rgba(255,255,255,0.03);
      border-radius: 20px;
      animation: pulse 1.2s infinite;
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
        <style>{styles}</style>
        <div className="dashboard-bg px-6 md:px-10 py-10">
          <div className="max-w-6xl mx-auto">
            <div className="skeleton h-8 w-48 mb-8"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              {[1,2,3,4].map(i => <div key={i} className="skeleton h-32"></div>)}
            </div>
            <div className="skeleton h-64 mb-10"></div>
            <div className="skeleton h-40"></div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div className="dashboard-bg px-6 md:px-10 py-10">
          <div className="max-w-2xl mx-auto">
            <div className="glass-card p-8 text-center">
              <p className="font-mono text-red-300 text-sm">{error}</p>
              <button
                onClick={load}
                className="mt-4 px-6 py-2 rounded-full border border-[rgba(212,175,55,0.5)] text-[#d4af37] font-mono text-xs hover:bg-[rgba(212,175,55,0.1)] transition"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="dashboard-bg px-6 md:px-10 py-10">
        {/* Ambient gold vignette */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: "radial-gradient(ellipse 60% 60% at 25% 50%, rgba(212,175,55,0.04) 0%, transparent 70%), radial-gradient(ellipse 40% 80% at 80% 20%, rgba(120,80,200,0.06) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto">
          <h1 className="dashboard-header text-4xl md:text-5xl mb-8">
            Your Cinema Taste
          </h1>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            <div className="glass-card p-6">
              <p className="stat-label">Entries Logged</p>
              <p className="stat-number">{stats.total}</p>
            </div>
            <div className="glass-card p-6">
              <p className="stat-label">Movies</p>
              <p className="stat-number">{stats.movies}</p>
            </div>
            <div className="glass-card p-6">
              <p className="stat-label">TV Shows</p>
              <p className="stat-number">{stats.tv}</p>
            </div>
            <div className="glass-card p-6">
              <p className="stat-label">Average Rating</p>
              <p className="stat-number">⭐ {stats.avg}</p>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="glass-card p-6 mb-10">
            <h2 className="font-serif text-2xl font-semibold text-[#f5f0e8] mb-4">
              Rating Distribution
            </h2>
            <div className="space-y-3">
              {Object.keys(ratings)
                .sort((a, b) => b - a)
                .map(rating => {
                  const count = ratings[rating];
                  const maxCount = Math.max(...Object.values(ratings));
                  const percentage = maxCount ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-4">
                      <span className="font-mono text-sm text-[#d4af37] w-10">⭐ {rating}</span>
                      <div className="flex-1 rating-bar-bg">
                        <div
                          className="rating-bar-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-[rgba(212,175,55,0.6)] w-10">
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Top Genres */}
          <div className="glass-card p-6">
            <h2 className="font-serif text-2xl font-semibold text-[#f5f0e8] mb-4">
              Top Genres
            </h2>
            <div className="flex flex-wrap gap-3">
              {topGenres.length === 0 ? (
                <p className="font-mono text-sm text-[rgba(212,175,55,0.5)]">
                  Log a few movies to analyze your favorite genres.
                </p>
              ) : (
                topGenres.map(g => (
                  <span key={g} className="genre-tag">
                    {g}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;