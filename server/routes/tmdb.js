import express from "express";
import axios from "axios";
import http from "http";
import https from "https";

const router = express.Router();

// TMDB client with keep‑alive agents
const tmdb = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  timeout: 60000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true })
});

/* CACHE for genres (24 hours) */
let genreCache = null;
let genreCacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24h

/* Generic retry helper */
const fetchWithRetry = async (fetcher, maxRetries = 3) => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetcher();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.warn(
        `TMDB request failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
        error.code || error.message
      );
      await sleep(delay);
    }
  }
};

/* ───────────────────────────────────────────────────── */
/* 1. TMDB SEARCH (multi – movies + TV)                 */
/* ───────────────────────────────────────────────────── */
router.get("/search", async (req, res) => {
  // Validate API key
  if (!process.env.TMDB_KEY) {
    console.error("TMDB_KEY is missing in environment");
    return res.status(500).json({ error: "TMDB API key not configured" });
  }

  const query = req.query.q?.trim();
  if (!query) {
    return res.status(400).json({ error: "Query required" });
  }

  try {
    const response = await fetchWithRetry(() =>
      tmdb.get("/search/multi", {
        params: {
          api_key: process.env.TMDB_KEY,
          query
        }
      })
    );
    res.json(response.data.results || []);
  } catch (err) {
    console.error("TMDB search failed:", err.response?.data || err.message);
    res.status(500).json({ error: "TMDB search failed" });
  }
});

/* ───────────────────────────────────────────────────── */
/* 2. SMART SEARCH — TMDB multi + keyword fallback       */
/* ───────────────────────────────────────────────────── */
router.get("/omdb", async (req, res) => {
  const query = req.query.q?.trim();
  if (!query) return res.status(400).json({ error: "Query required" });
  if (!process.env.TMDB_KEY) return res.status(500).json({ error: "TMDB key not configured" });

  const toCard = (item) => ({
    Title: item.title || item.name || "",
    Year: (item.release_date || item.first_air_date || "").slice(0, 4),
    imdbID: item.id ? String(item.id) : null,
    Type: item.media_type === "tv" ? "series" : "movie",
    Poster: item.poster_path
      ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
      : "N/A",
    Popularity: item.popularity || 0,
    VoteAverage: item.vote_average || 0,
    VoteCount: item.vote_count || 0,
    Overview: item.overview || "",
  });

  try {
    // Run multi-search + keyword search in parallel for richer results
    const [multiRes, keywordRes] = await Promise.allSettled([
      fetchWithRetry(() =>
        tmdb.get("/search/multi", {
          params: { api_key: process.env.TMDB_KEY, query, include_adult: false, page: 1 }
        })
      ),
      fetchWithRetry(() =>
        tmdb.get("/search/keyword", {
          params: { api_key: process.env.TMDB_KEY, query, page: 1 }
        })
      ),
    ]);

    let results = [];

    // Primary: multi search (movies + TV)
    if (multiRes.status === "fulfilled") {
      const raw = (multiRes.value.data.results || [])
        .filter(r => r.media_type === "movie" || r.media_type === "tv")
        .filter(r => r.poster_path) // only results with posters
        .map(toCard);
      results.push(...raw);
    }

    // If query looks like a year (e.g. "2019", "movies 2022"), boost by year match
    const yearMatch = query.match(/(19|20)\d{2}/);

    // Deduplicate by imdbID
    const seen = new Set();
    results = results.filter(r => {
      if (seen.has(r.imdbID)) return false;
      seen.add(r.imdbID);
      return true;
    });

    // Smart ranking: exact title match > popularity > vote count
    const queryLower = query.toLowerCase().replace(/[^a-z0-9 ]/g, "");
    results.sort((a, b) => {
      const aTitle = (a.Title || "").toLowerCase().replace(/[^a-z0-9 ]/g, "");
      const bTitle = (b.Title || "").toLowerCase().replace(/[^a-z0-9 ]/g, "");

      // Exact match gets highest priority
      const aExact = aTitle === queryLower ? 3 : aTitle.startsWith(queryLower) ? 2 : aTitle.includes(queryLower) ? 1 : 0;
      const bExact = bTitle === queryLower ? 3 : bTitle.startsWith(queryLower) ? 2 : bTitle.includes(queryLower) ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      // Year boost if user typed a year
      if (yearMatch) {
        const yr = yearMatch[0];
        const aYr = a.Year === yr ? 1 : 0;
        const bYr = b.Year === yr ? 1 : 0;
        if (aYr !== bYr) return bYr - aYr;
      }

      // Fallback: popularity * vote credibility
      const aScore = a.Popularity * Math.log10(Math.max(a.VoteCount, 1));
      const bScore = b.Popularity * Math.log10(Math.max(b.VoteCount, 1));
      return bScore - aScore;
    });

    // If primary results are thin (< 3), do a second-pass without poster filter
    if (results.length < 3 && multiRes.status === "fulfilled") {
      const extra = (multiRes.value.data.results || [])
        .filter(r => r.media_type === "movie" || r.media_type === "tv")
        .filter(r => !seen.has(String(r.id)))
        .map(toCard);
      results.push(...extra);
    }

    res.json(results.slice(0, 8));
  } catch (err) {
    console.error("Smart search failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Search failed" });
  }
});

/* ───────────────────────────────────────────────────── */
/* 2b. OMDB DETAIL (fetch full info by imdbID)           */
/* ───────────────────────────────────────────────────── */
router.get("/omdb-detail", async (req, res) => {
  const rawId = req.query.id?.trim();
  const mediaType = req.query.type?.trim() || "movie"; // "movie" or "tv"
  if (!rawId) return res.status(400).json({ error: "id required" });

  try {
    // Determine if this is a TMDB numeric ID or a real tt IMDb ID
    const isTmdbId = /^\d+$/.test(rawId);
    let imdbId = isTmdbId ? null : rawId;
    let tmdbDetails = null;

    // Step 1: If it's a TMDB ID, fetch TMDB details + external_ids in parallel
    if (isTmdbId && process.env.TMDB_KEY) {
      const [detailRes, extRes] = await Promise.allSettled([
        fetchWithRetry(() =>
          tmdb.get(`/${mediaType}/${rawId}`, {
            params: { api_key: process.env.TMDB_KEY }
          })
        ),
        fetchWithRetry(() =>
          tmdb.get(`/${mediaType}/${rawId}/external_ids`, {
            params: { api_key: process.env.TMDB_KEY }
          })
        ),
      ]);

      if (detailRes.status === "fulfilled") {
        const d = detailRes.value.data;
        tmdbDetails = {
          Title: d.title || d.name || "",
          Year: (d.release_date || d.first_air_date || "").slice(0, 4),
          Runtime: d.runtime ? `${d.runtime} min` : (d.episode_run_time?.[0] ? `${d.episode_run_time[0]} min` : "N/A"),
          Genre: (d.genres || []).map(g => g.name).join(", ") || "N/A",
          Overview: d.overview || "N/A",
          Poster: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : "N/A",
          VoteAverage: d.vote_average || 0,
          Type: mediaType === "tv" ? "series" : "movie",
          Response: "True",
        };
      }

      if (extRes.status === "fulfilled") {
        imdbId = extRes.value.data.imdb_id || null;
      }
    }

    // Step 2: Fetch OMDB using real imdbId for rich details (plot, director, cast, rating)
    if (imdbId && process.env.OMDB_KEY) {
      try {
        const omdbRes = await axios.get("https://www.omdbapi.com/", {
          params: { apikey: process.env.OMDB_KEY, i: imdbId, plot: "short" },
          timeout: 15000
        });
        const d = omdbRes.data;
        if (d.Response !== "False") {
          // Merge: OMDB wins for plot/director/actors/rating, TMDB fills gaps
          return res.json({
            ...tmdbDetails,
            Title: d.Title || tmdbDetails?.Title || "",
            Year: d.Year || tmdbDetails?.Year || "N/A",
            Runtime: d.Runtime !== "N/A" ? d.Runtime : tmdbDetails?.Runtime || "N/A",
            Genre: d.Genre !== "N/A" ? d.Genre : tmdbDetails?.Genre || "N/A",
            Plot: d.Plot !== "N/A" ? d.Plot : tmdbDetails?.Overview || "N/A",
            Director: d.Director || "N/A",
            Actors: d.Actors || "N/A",
            imdbRating: d.imdbRating || "N/A",
            Poster: d.Poster !== "N/A" ? d.Poster : tmdbDetails?.Poster || "N/A",
            Response: "True",
          });
        }
      } catch (omdbErr) {
        console.warn("OMDB detail fetch failed, falling back to TMDB:", omdbErr.message);
      }
    }

    // Step 3: Fallback — return TMDB details only
    if (tmdbDetails) {
      return res.json({
        ...tmdbDetails,
        Plot: tmdbDetails.Overview,
        Director: "N/A",
        Actors: "N/A",
        imdbRating: tmdbDetails.VoteAverage ? String(tmdbDetails.VoteAverage.toFixed(1)) : "N/A",
      });
    }

    return res.status(404).json({ error: "No details found", Response: "False" });
  } catch (err) {
    console.error("Detail fetch failed:", err.message);
    res.status(500).json({ error: "Detail fetch failed" });
  }
});

/* ───────────────────────────────────────────────────── */
/* 3. GENRES (movie + TV) – cached 24h                  */
/* ───────────────────────────────────────────────────── */
router.get("/genres", async (req, res) => {
  // Validate API key
  if (!process.env.TMDB_KEY) {
    console.error("TMDB_KEY is missing – cannot fetch genres");
    // Return empty object or cached if available
    if (genreCache) return res.json(genreCache);
    return res.status(500).json({ error: "TMDB API key missing" });
  }

  // Serve from cache if fresh
  if (genreCache && Date.now() - genreCacheTime < CACHE_DURATION) {
    return res.json(genreCache);
  }

  try {
    const params = { api_key: process.env.TMDB_KEY };
    const results = await Promise.allSettled([
      fetchWithRetry(() => tmdb.get("/genre/movie/list", { params })),
      fetchWithRetry(() => tmdb.get("/genre/tv/list", { params }))
    ]);

    const movieGenres = results[0].status === "fulfilled"
      ? results[0].value.data.genres || []
      : [];
    const tvGenres = results[1].status === "fulfilled"
      ? results[1].value.data.genres || []
      : [];

    // Log partial failures
    if (results.some(r => r.status === "rejected")) {
      console.warn(
        "Genre fetch partial failure:",
        results.map((r, i) =>
          r.status === "rejected"
            ? (r.reason?.response?.data || r.reason?.message || `request ${i} failed`)
            : null
        ).filter(Boolean)
      );
    }

    // Combine both genre lists (deduplicate by id)
    const combined = [...movieGenres, ...tvGenres];
    const map = {};
    combined.forEach(g => {
      if (!map[g.id]) {
        map[g.id] = g.name;
      }
    });

    // Update cache
    genreCache = map;
    genreCacheTime = Date.now();

    res.json(map);
  } catch (err) {
    console.error("Genre fetch failed:", err.response?.data || err.message);
    // If we have stale cache, return it instead of failing
    if (genreCache) {
      return res.json(genreCache);
    }
    res.json({});
  }
});

/* ───────────────────────────────────────────────────── */
/* 4. FETCH CAST WITH IMAGES (for client‑side fallback)  */
/* ───────────────────────────────────────────────────── */
router.get("/cast", async (req, res) => {
  const { title, imdbId } = req.query;
  if (!title && !imdbId) {
    return res.status(400).json({ error: "Missing title or imdbId" });
  }

  try {
    let tmdbId = null;
    let movieTitle = title;

    // If we have an IMDb ID, find TMDB ID first
    if (imdbId && process.env.TMDB_KEY) {
      const findRes = await tmdb.get("/find/" + imdbId, {
        params: {
          api_key: process.env.TMDB_KEY,
          external_source: "imdb_id"
        }
      });
      const movieResults = findRes.data.movie_results || [];
      if (movieResults.length) {
        tmdbId = movieResults[0].id;
        movieTitle = movieResults[0].title;
      }
    }

    // If still no TMDB ID, search by title
    if (!tmdbId && title && process.env.TMDB_KEY) {
      const searchRes = await tmdb.get("/search/movie", {
        params: {
          api_key: process.env.TMDB_KEY,
          query: title
        }
      });
      const results = searchRes.data.results || [];
      if (results.length) {
        tmdbId = results[0].id;
        movieTitle = results[0].title;
      }
    }

    if (!tmdbId) {
      return res.json({ cast: [] });
    }

    // Fetch credits
    const creditsRes = await tmdb.get(`/movie/${tmdbId}/credits`, {
      params: { api_key: process.env.TMDB_KEY }
    });
    const cast = (creditsRes.data.cast || []).slice(0, 12).map(member => ({
      name: member.name,
      character: member.character,
      profile: member.profile_path
        ? `https://image.tmdb.org/t/p/w185${member.profile_path}`
        : null
    }));

    res.json({ cast, title: movieTitle });
  } catch (err) {
    console.error("Cast fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch cast" });
  }
});


export default router;