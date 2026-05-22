import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { apiFetch } from "../api/client"

function TasteDNA() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadTasteDNA()
  }, [username])

  async function loadTasteDNA() {
    try {
      setLoading(true)
      setError("")

      if (!username) {
        throw new Error("No user selected for Taste DNA")
      }

      const data = await apiFetch(
        `/users/${encodeURIComponent(username)}/taste-dna`
      )

      setProfile(data)
    } catch (err) {
      console.error("Taste DNA error:", err)
      setError(
        err.message || "Failed to load taste profile"
      )
    } finally {
      setLoading(false)
    }
  }

  function generatePersonalityStatement() {
    const safeGenreProfile = Array.isArray(profile?.genreProfile)
      ? profile.genreProfile
      : []
    const safeKeywordProfile = Array.isArray(profile?.keywordProfile)
      ? profile.keywordProfile
      : []

    if (!safeGenreProfile.length && !safeKeywordProfile.length) return ""

    const topGenres = safeGenreProfile.slice(0, 3)
    const descriptors = [
      "You are a connoisseur of",
      "You are drawn to",
      "Your cinematic DNA is",
      "You breathe",
      "You live for",
    ]

    const descriptor =
      descriptors[
        Math.floor(Math.random() * descriptors.length)
      ]

    const genreStr = topGenres.length
      ? topGenres
          .map((g) => `${g.percentage}% ${g.name}`)
          .join(", ")
      : "the themes in your reviews"

    const keyword =
      safeKeywordProfile[0]?.name ||
      "cinema"

    return `${descriptor} ${genreStr}, with an affinity for ${keyword}.`
  }

  const genreProfile = Array.isArray(profile?.genreProfile)
    ? profile.genreProfile
    : []
  const keywordProfile = Array.isArray(profile?.keywordProfile)
    ? profile.keywordProfile
    : []
  const hasTasteData =
    genreProfile.length > 0 || keywordProfile.length > 0

  if (loading) {
    return (
      <div className="px-10 py-10 text-gray-400 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-light mb-4 animate-pulse">
            Analyzing your taste DNA...
          </div>
          <div className="text-sm text-gray-500">
            Reading through {profile?.totalEntries || 0}{" "}
            reviews
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-10 py-10 text-red-400 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="text-yellow-400 hover:text-yellow-300 text-sm uppercase tracking-wider"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (
    !profile ||
    !hasTasteData
  ) {
    return (
      <div className="px-10 py-10 text-gray-400 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">
            No taste profile data available
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Start reviewing movies to build your
            taste DNA
          </p>
          <button
            onClick={() => navigate("/")}
            className="text-yellow-400 hover:text-yellow-300 text-sm uppercase tracking-wider"
          >
            Start Reviewing
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0908] via-[#1a1816] to-[#0a0908]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&display=swap');

        .taste-dna-container {
          backdrop-filter: blur(8px);
        }

        .personality-text {
          font-family: 'Cormorant Garamond', serif;
          background: linear-gradient(135deg, #d4af37 0%, #f0e68c 50%, #d4af37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: textGlow 3s ease-in-out infinite;
        }

        @keyframes textGlow {
          0%, 100% {
            filter: drop-shadow(0 0 2px rgba(212, 175, 55, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.5));
          }
        }

        .genre-bar-container {
          position: relative;
          overflow: hidden;
          background: rgba(212, 175, 55, 0.05);
          border: 1px solid rgba(212, 175, 55, 0.1);
          border-radius: 4px;
        }

        .genre-bar-fill {
          background: linear-gradient(90deg, #d4af37, #f0e68c);
          height: 100%;
          border-radius: 4px;
          transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 16px rgba(212, 175, 55, 0.4);
        }

        .genre-label {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #1a1816;
          font-weight: 600;
          mix-blend-mode: lighten;
        }

        .genre-percentage {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          font-weight: 600;
          color: #e2e0d4;
          mix-blend-mode: multiply;
        }

        .keyword-pill {
          display: inline-block;
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05));
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 20px;
          padding: 8px 14px;
          margin: 6px 6px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #d4af37;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .keyword-pill:hover {
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.15));
          border-color: rgba(212, 175, 55, 0.6);
          box-shadow: 0 0 12px rgba(212, 175, 55, 0.3);
          transform: translateY(-2px);
        }

        .section-title {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #d4af37;
          opacity: 0.7;
        }

        .profile-card {
          background: rgba(7, 6, 10, 0.6);
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: 8px;
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .fade-in {
          animation: fadeInUp 0.8s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .stat-box {
          text-align: center;
          padding: 16px;
          background: rgba(212, 175, 55, 0.05);
          border: 1px solid rgba(212, 175, 55, 0.1);
          border-radius: 6px;
          transition: all 0.3s ease;
        }

        .stat-box:hover {
          background: rgba(212, 175, 55, 0.1);
          border-color: rgba(212, 175, 55, 0.3);
        }
      `}</style>

      <div className="taste-dna-container px-6 md:px-10 py-16">
        {/* HEADER */}
        <div className="mb-16 text-center fade-in">
          <h1 className="text-5xl md:text-6xl font-light mb-6 text-gray-100">
            Taste DNA
          </h1>

          <p className="personality-text text-2xl md:text-3xl font-light leading-relaxed mb-8 max-w-3xl mx-auto">
            {generatePersonalityStatement()}
          </p>

          <div className="flex gap-6 justify-center flex-wrap">
            <div className="stat-box">
              <p className="section-title mb-2">
                Total Reviews
              </p>
              <p className="text-2xl font-semibold text-yellow-400">
                {profile.totalEntries ?? 0}
              </p>
            </div>
            <div className="stat-box">
              <p className="section-title mb-2">
                Average Rating
              </p>
              <p className="text-2xl font-semibold text-yellow-400">
                ⭐ {profile.stats.avgRating}
              </p>
            </div>
          </div>
        </div>

        {/* GENRE PROFILE */}
        <div className="max-w-4xl mx-auto mb-16 fade-in">
          <h2 className="section-title text-xl mb-8">
            Genre Composition
          </h2>

          <div className="space-y-6">
            {genreProfile.length ? genreProfile.map(
              (genre, idx) => (
                <div key={genre.name}>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300 capitalize">
                      {genre.name}
                    </span>
                    <span className="text-yellow-400 font-semibold">
                      {genre.percentage}%
                    </span>
                  </div>

                  <div
                    className="genre-bar-container h-12 relative group"
                    style={{
                      animation: `fadeInUp 0.8s ease-out ${idx * 0.1}s backwards`,
                    }}
                  >
                    <div
                      className="genre-bar-fill"
                      style={{
                        width: `${genre.percentage}%`,
                        animation: `none`,
                      }}
                    />
                    <div className="genre-label">
                      {genre.name}
                    </div>
                    <div className="genre-percentage">
                      {genre.percentage}%
                    </div>
                  </div>
                </div>
              )
            ) : (
              <p className="text-gray-400 text-sm">
                Genre data will appear as you log titles with movie metadata.
              </p>
            )}
          </div>
        </div>

        {/* KEYWORD PROFILE */}
        <div className="max-w-4xl mx-auto fade-in">
          <h2 className="section-title text-xl mb-8">
            Thematic Affinities
          </h2>

          <p className="text-gray-400 text-sm mb-6">
            Words and themes that define your
            cinematic preferences:
          </p>

          <div className="bg-opacity-30 rounded-lg p-8 profile-card">
            <div className="flex flex-wrap justify-center gap-2">
              {keywordProfile.length ? keywordProfile.map(
                (keyword, idx) => (
                  <div
                    key={keyword.name}
                    className="keyword-pill"
                    style={{
                      animation: `fadeInUp 0.6s ease-out ${0.8 + idx * 0.05}s backwards`,
                    }}
                    title={`${keyword.percentage}% of your taste`}
                  >
                    {keyword.name}
                  </div>
                )
              ) : (
                <p className="text-gray-400 text-sm text-center">
                  Review themes will appear once your entries include more written thoughts.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center mt-16 text-gray-500 text-sm">
          <p>
            Your taste DNA is based on all your
            reviews and ratings
          </p>
          <button
            onClick={loadTasteDNA}
            className="mt-6 px-6 py-2 text-yellow-400 border border-yellow-400 rounded hover:bg-yellow-400 hover:text-black transition text-xs uppercase tracking-wider font-semibold"
          >
            Refresh Profile
          </button>
        </div>
      </div>
    </div>
  )
}

export default TasteDNA
