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
/* 2. OMDB‑FALLBACK SEARCH (prefer OMDB if key exists)  */
/* ───────────────────────────────────────────────────── */
router.get("/omdb", async (req, res) => {
  const query = req.query.q?.trim();
  if (!query) {
    return res.status(400).json({ error: "Query required" });
  }

  try {
    // If OMDB_KEY is available, use OMDb directly (preferred)
    if (process.env.OMDB_KEY) {
      const response = await axios.get("https://www.omdbapi.com/", {
        params: {
          apikey: process.env.OMDB_KEY,
          s: query
        },
        timeout: 15000
      });
      const data = response.data;
      if (data.Response === "False") {
        return res.json([]);
      }
      return res.json(data.Search || []);
    }

    // Fallback to TMDB (if no OMDB key) -> convert to OMDb‑like format
    if (!process.env.TMDB_KEY) {
      return res.status(500).json({ error: "Neither OMDB nor TMDB key found" });
    }

    const response = await tmdb.get("/search/multi", {
      params: {
        api_key: process.env.TMDB_KEY,
        query
      }
    });

    const results = (response.data.results || []).map(item => ({
      Title: item.title || item.name || "",
      Year: (item.release_date || item.first_air_date || "").slice(0, 4),
      imdbID: item.id ? String(item.id) : null,
      Type: item.media_type || (item.title ? "movie" : "tv"),
      Poster: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : item.backdrop_path
        ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}`
        : "N/A"
    }));

    res.json(results);
  } catch (err) {
    console.error("OMDB/TMDB search failed:", err.response?.data || err.message);
    res.status(500).json({ error: "OMDB search failed" });
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
