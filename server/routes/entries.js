import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { body, param } from "express-validator";
import Entry from "../models/Entry.js";
import Activity from "../models/Activity.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";
import validate from "../middleware/validate.js";
import { actionLimiter } from "../middleware/ratelimit.js";

const router = express.Router();

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getRequestUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id role").lean();
    if (!user) return null;
    return {
      id: user._id.toString(),
      role: user.role || "user",
    };
  } catch {
    return null;
  }
}

function canViewEntry(entry, viewer) {
  if (entry?.isPublic) return true;
  if (!viewer || !entry?.user) return false;
  const entryUserId = String(entry.user?._id || entry.user);
  return viewer.role === "admin" || entryUserId === viewer.id;
}

// ---------------------------
// OMDb client
// ---------------------------
const omdb = axios.create({
  baseURL: "https://www.omdbapi.com/",
  timeout: 10000,
});
const OMDB_KEY = process.env.OMDB_KEY;

// ---------------------------
// TMDB client (for high‑res images)
// ---------------------------
const TMDB_KEY = process.env.TMDB_KEY;
const tmdb = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  timeout: 10000,
});

// Caches
const imageCache = new Map();      // imdbId -> { poster, backdrop, timestamp }
const detailsCache = new Map();    // imdbId -> full OMDb+TMDB data
const castCache = new Map();       // imdbId -> cast array
const videoCache = new Map();      // imdbId -> trailer/clip data
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (since metadata rarely changes)

function tmdbImage(path, size = "w500") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

function normalizeName(name) {
  return name.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").replace(/\.$/, "");
}

function normalizeGenres(genres) {
  if (!Array.isArray(genres)) return [];

  return genres
    .map((genre) => {
      if (typeof genre === "string") return genre.trim();
      if (genre && typeof genre === "object") {
        return String(genre.name || genre.id || "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

function normalizeTmdbVideo(video) {
  if (!video || video.site !== "YouTube" || !video.key) return null;
  return {
    id: video.id,
    key: video.key,
    name: video.name,
    type: video.type,
    site: video.site,
    official: Boolean(video.official),
    publishedAt: video.published_at || null,
    url: `https://www.youtube.com/watch?v=${video.key}`,
    embedUrl: `https://www.youtube.com/embed/${video.key}`,
    thumbnail: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`,
  };
}

function rankTmdbVideo(video) {
  const typeRank = {
    Trailer: 50,
    Teaser: 35,
    Clip: 25,
    Featurette: 20,
    Behind: 15,
  };
  return (typeRank[video.type] || 5) + (video.official ? 10 : 0);
}

async function findTmdbTitle(imdbId, fallbackType = "movie") {
  if (!TMDB_KEY || !imdbId) return null;
  const findResponse = await tmdb.get("/find/" + imdbId, {
    params: { api_key: TMDB_KEY, external_source: "imdb_id" },
  });
  const movie = findResponse.data.movie_results?.[0];
  const tv = findResponse.data.tv_results?.[0];
  if (fallbackType === "tv" && tv) return { id: tv.id, mediaType: "tv" };
  if (movie) return { id: movie.id, mediaType: "movie" };
  if (tv) return { id: tv.id, mediaType: "tv" };
  return null;
}

// Fetch high‑res poster & backdrop from TMDB (cached)
async function enrichWithTmdbImages(imdbId) {
  if (!TMDB_KEY || !imdbId) return { poster: null, backdrop: null };
  const cached = imageCache.get(imdbId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached;
  try {
    const findResponse = await tmdb.get("/find/" + imdbId, {
      params: { api_key: TMDB_KEY, external_source: "imdb_id" },
    });
    const movie = findResponse.data.movie_results?.[0];
    const poster = movie?.poster_path ? tmdbImage(movie.poster_path, "w500") : null;
    const backdrop = movie?.backdrop_path ? tmdbImage(movie.backdrop_path, "w1280") : null;
    const result = { poster, backdrop, timestamp: Date.now() };
    imageCache.set(imdbId, result);
    return result;
  } catch (err) {
    console.warn("[TMDB] Image error:", err.message);
    return { poster: null, backdrop: null };
  }
}

async function fetchTmdbVideos(imdbId, type = "movie") {
  if (!TMDB_KEY || !imdbId) return { trailer: null, videos: [] };
  const cached = videoCache.get(imdbId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

  try {
    const title = await findTmdbTitle(imdbId, type);
    if (!title) return { trailer: null, videos: [] };

    const videosResponse = await tmdb.get(`/${title.mediaType}/${title.id}/videos`, {
      params: { api_key: TMDB_KEY },
    });
    const videos = (videosResponse.data.results || [])
      .map(normalizeTmdbVideo)
      .filter(Boolean)
      .sort((a, b) => {
        const scoreDiff = rankTmdbVideo(b) - rankTmdbVideo(a);
        if (scoreDiff) return scoreDiff;
        return String(b.publishedAt || "").localeCompare(String(a.publishedAt || ""));
      })
      .slice(0, 8);
    const trailer = videos.find(v => v.type === "Trailer") || videos[0] || null;
    const result = { trailer, videos };
    videoCache.set(imdbId, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn("[TMDB] Video error:", err.message);
    return { trailer: null, videos: [] };
  }
}

// Enrich cast with profile images (cached)
async function enrichCastWithImages(omdbCast, imdbId) {
  if (!TMDB_KEY || !imdbId) return omdbCast.map(a => ({ ...a, profile: null }));
  const cached = castCache.get(imdbId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  try {
    const findResponse = await tmdb.get("/find/" + imdbId, {
      params: { api_key: TMDB_KEY, external_source: "imdb_id" },
    });
    const movie = findResponse.data.movie_results?.[0];
    if (!movie) throw new Error("No TMDB movie");
    const creditsResponse = await tmdb.get(`/movie/${movie.id}/credits`, {
      params: { api_key: TMDB_KEY },
    });
    const tmdbCast = creditsResponse.data.cast || [];
    const enriched = omdbCast.map(actor => {
      const match = tmdbCast.find(t =>
        normalizeName(t.name) === normalizeName(actor.name)
      );
      return {
        name: actor.name,
        character: actor.character || "",
        profile: match?.profile_path ? `https://image.tmdb.org/t/p/w185${match.profile_path}` : null,
      };
    });
    castCache.set(imdbId, { data: enriched, timestamp: Date.now() });
    return enriched;
  } catch (err) {
    console.warn("[TMDB] Cast error:", err.message);
    return omdbCast.map(a => ({ ...a, profile: null }));
  }
}

// Fetch all data (OMDb + TMDB images + cast) with parallel requests and caching
async function fetchOmdbDetails({ imdbId, title, type, skipImages = false }) {
  const cacheKey = imdbId || title;
  if (cacheKey && detailsCache.get(cacheKey) && Date.now() - detailsCache.get(cacheKey).timestamp < CACHE_TTL) {
    return detailsCache.get(cacheKey).data;
  }

  try {
    const params = {
      apikey: OMDB_KEY,
      plot: "full",
      type: type === "tv" ? "series" : "movie",
    };
    if (imdbId) params.i = imdbId;
    else if (title) params.t = title;
    else return null;

    const omdbResponse = await omdb.get("/", { params });
    const data = omdbResponse.data;
    if (data.Response === "False") return null;

    // Parallel: fetch TMDB images and cast (unless skipped)
    let tmdbImages = { poster: null, backdrop: null };
    let enrichedCast = [];
    let tmdbVideos = { trailer: null, videos: [] };
    if (!skipImages && data.imdbID) {
      [tmdbImages, enrichedCast, tmdbVideos] = await Promise.all([
        enrichWithTmdbImages(data.imdbID),
        enrichCastWithImages(data.Actors ? data.Actors.split(", ").map(n => ({ name: n, character: "" })) : [], data.imdbID),
        fetchTmdbVideos(data.imdbID, data.Type === "series" ? "tv" : "movie"),
      ]);
    } else {
      enrichedCast = (data.Actors ? data.Actors.split(", ").map(n => ({ name: n, character: "", profile: null })) : []);
      if (data.imdbID) {
        tmdbVideos = await fetchTmdbVideos(data.imdbID, data.Type === "series" ? "tv" : "movie");
      }
    }

    const finalPoster = (tmdbImages.poster && !skipImages) ? tmdbImages.poster : (data.Poster !== "N/A" ? data.Poster : null);
    const finalBackdrop = (tmdbImages.backdrop && !skipImages) ? tmdbImages.backdrop : null;

    const result = {
      imdbId: data.imdbID,
      type: data.Type === "series" ? "tv" : "movie",
      title: data.Title,
      tagline: "",
      overview: data.Plot || "",
      poster: finalPoster,
      backdrop: finalBackdrop,
      releaseDate: data.Released !== "N/A" ? data.Released : data.Year,
      year: data.Year ? data.Year.slice(0,4) : "",
      runtime: data.Runtime !== "N/A" ? parseInt(data.Runtime) : null,
      status: "",
      language: data.Language ? data.Language.split(",")[0] : "",
      country: data.Country ? data.Country.split(", ") : [],
      genres: data.Genre ? data.Genre.split(", ").map(g => ({ id: g, name: g })) : [],
      omdbRating: data.imdbRating !== "N/A" ? parseFloat(data.imdbRating) : null,
      omdbVotes: data.imdbVotes !== "N/A" ? parseInt(data.imdbVotes.replace(/,/g,"")) : 0,
      awards: data.Awards !== "N/A" ? data.Awards : "",
      boxOffice: data.BoxOffice !== "N/A" ? data.BoxOffice : "",
      totalSeasons: data.totalSeasons ? parseInt(data.totalSeasons) : null,
      cast: enrichedCast,
      directors: data.Director ? data.Director.split(", ") : [],
      writers: data.Writer ? data.Writer.split(", ") : [],
      trailer: tmdbVideos.trailer,
      videos: tmdbVideos.videos,
      externalIds: { imdb_id: data.imdbID },
    };
    if (cacheKey) detailsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn("OMDb fetch failed:", err.message);
    return null;
  }
}

/* ───────────────────────────────────────────────────── */
/* CREATE ENTRY – faster with parallel & cache          */
/* ───────────────────────────────────────────────────── */
router.post("/", auth, actionLimiter, [
  body("title").trim().isLength({ min:1, max:150 }),
  body("rating").isFloat({ min:1, max:10 }),
  body("review").optional().isLength({ max:5000 }),
  body("date").notEmpty(),
  body("type").optional().isIn(["movie","tv"]),
  body("genres").optional().isArray(),
  body("language").optional().isString(),
  body("pov").optional().isBoolean(),
  body("isPublic").optional().isBoolean(),
], validate, async (req, res) => {
  try {
    const { title, rating, review, date, type, genres, language, pov, isPublic } = req.body;
    const omdbData = await fetchOmdbDetails({ title, type });
    const submittedGenres = normalizeGenres(genres);
    const fallbackGenres = normalizeGenres(omdbData?.genres);
    const entry = await Entry.create({
      user: req.user.id,
      tmdbId: omdbData?.imdbId || null,
      title: title.trim(),
      poster: omdbData?.poster || null,
      backdrop: omdbData?.backdrop || null,
      rating: Number(rating),
      review: review?.trim() || "",
      date,
      type: type || "movie",
      genres: submittedGenres.length ? submittedGenres : fallbackGenres,
      language: language || (omdbData?.language || null),
      pov: Boolean(pov),
      isPublic: Boolean(isPublic),
      likes: [],
    });
    await Activity.create({
      user: req.user.id,
      type: review?.trim() ? "review" : "log",
      entry: entry._id,
      movieTitle: title,
      rating,
    });
    res.status(201).json(entry);
  } catch (err) {
    console.error("Create entry failed:", err);
    res.status(500).json({ error: "Failed to save entry" });
  }
});

/* ───────────────────────────────────────────────────── */
/* GET USER ENTRIES (unchanged)                         */
/* ───────────────────────────────────────────────────── */
router.get("/", auth, async (req, res) => {
  try {
    const entries = await Entry.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

router.get("/admin/all", auth, admin, async (req, res) => {
  try {
    const entries = await Entry.find({}).populate("user", "username email").sort({ createdAt: -1 }).lean();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin entries" });
  }
});

router.delete("/admin/:id", auth, admin, [param("id").isMongoId()], validate, async (req, res) => {
  try {
    const deleted = await Entry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Entry not found" });
    res.json({ message: "Entry deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

/* ───────────────────────────────────────────────────── */
/* PUBLIC REVIEWS (unchanged)                           */
/* ───────────────────────────────────────────────────── */
router.get("/public", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 12);
    const skip = (page - 1) * limit;
    const query = { isPublic: true };
    const requestedType = String(req.query.type || "").toLowerCase();
    if (requestedType === "movie" || requestedType === "film") query.type = "movie";
    if (requestedType === "tv" || requestedType === "series") query.type = "tv";
    const search = String(req.query.q || "").trim();
    if (search) query.title = { $regex: search, $options: "i" };
    const requestedSort = String(req.query.sort || "recent").toLowerCase();
    let sort = { createdAt: -1 };
    let usePopularitySort = false;
    if (requestedSort === "rating") sort = { rating: -1, createdAt: -1 };
    if (requestedSort === "reviews" || requestedSort === "popular") usePopularitySort = true;
    const total = await Entry.countDocuments(query);
    let posts = [];
    if (usePopularitySort) {
      posts = await Entry.aggregate([
        { $match: query },
        { $addFields: { likeCount: { $size: { $ifNull: ["$likes", []] } } } },
        { $sort: { likeCount: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "user" } },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        { $project: { "user.username": 1, title: 1, tmdbId: 1, poster: 1, backdrop: 1, rating: 1, review: 1, date: 1, type: 1, genres: 1, language: 1, pov: 1, isPublic: 1, likes: 1, createdAt: 1, updatedAt: 1 } },
      ]);
    } else {
      posts = await Entry.find(query).populate("user","username").sort(sort).skip(skip).limit(limit).lean();
    }
    res.json({ posts, pagination: { page, limit, total, pages: Math.ceil(total/limit), hasMore: skip+posts.length < total } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch public posts" });
  }
});

/* ───────────────────────────────────────────────────── */
/* MOVIE DETAIL PAGE – uses cached data, no re-fetch if not needed */
/* ───────────────────────────────────────────────────── */
router.get("/movie/:key", async (req, res) => {
  try {
    const key = String(req.params.key || "");
    const titleParam = String(req.query.title || "").trim();
    let query = { isPublic: true };
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(key);
    const isImdbId = /^tt\d+$/i.test(key);
    
    if (isObjectId) {
      const singleEntry = await Entry.findById(key).lean();
      if (!singleEntry || !singleEntry.isPublic) return res.status(404).json({ error: "Movie not found" });
      if (singleEntry.tmdbId) query.tmdbId = singleEntry.tmdbId;
      else query.title = singleEntry.title;
    } else if (isImdbId) {
      query.tmdbId = key;
    } else if (titleParam) {
      query.title = { $regex: `^${escapeRegex(titleParam)}$`, $options: "i" };
    } else {
      query.title = { $regex: `^${escapeRegex(decodeURIComponent(key))}$`, $options: "i" };
    }
    
    let posts = await Entry.find(query).populate("user","username").sort({ createdAt: -1 }).lean();
    if (!posts.length && (isImdbId || isObjectId)) {
      const anyEntry = await Entry.findOne({ isPublic: true, tmdbId: key }).lean();
      if (anyEntry) posts = await Entry.find({ isPublic: true, title: anyEntry.title }).populate("user","username").sort({ createdAt: -1 }).lean();
    }
    if (!posts.length) {
      const lookupTitle = titleParam || decodeURIComponent(key);
      const externalDetails = await fetchOmdbDetails({
        imdbId: isImdbId ? key : null,
        title: isImdbId ? null : lookupTitle,
        type: "movie",
      });

      if (!externalDetails) return res.status(404).json({ error: "Movie not found" });

      return res.json({
        movie: {
          id: externalDetails.imdbId || key,
          tmdbId: externalDetails.imdbId || null,
          title: externalDetails.title,
          poster: externalDetails.poster,
          backdrop: externalDetails.backdrop,
          type: externalDetails.type || "movie",
          genres: externalDetails.genres.map(g => g.id),
          genreNames: externalDetails.genres,
          avgRating: "N/A",
          reviewCount: 0,
          likeCount: 0,
          latestDate: null,
          details: externalDetails,
        },
        reviews: [],
      });
    }
    
    const totalLikes = posts.reduce((sum, e) => sum + (Array.isArray(e.likes) ? e.likes.length : 0), 0);
    const avgRating = posts.reduce((sum, e) => sum + Number(e.rating || 0), 0) / posts.length;
    const bestPoster = posts.find(e => e.poster)?.poster || null;
    const bestBackdrop = posts.find(e => e.backdrop)?.backdrop || null;
    const genreCounts = {};
    posts.forEach(e => (e.genres || []).forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
    const genres = Object.entries(genreCounts).sort((a,b)=>b[1]-a[1]).map(([g])=>g).filter(Boolean);
    
    // Use cached details if available, otherwise fetch fresh
    let omdbDetails = null;
    const cacheHit = posts[0].tmdbId && detailsCache.get(posts[0].tmdbId) && Date.now() - detailsCache.get(posts[0].tmdbId).timestamp < CACHE_TTL;
    if (cacheHit) {
      omdbDetails = detailsCache.get(posts[0].tmdbId).data;
    } else {
      omdbDetails = await fetchOmdbDetails({ imdbId: posts[0].tmdbId, title: posts[0].title, type: posts[0].type, skipImages: !!posts[0].poster });
    }
    
    const mergedDetails = omdbDetails ? {
      ...omdbDetails,
      poster: omdbDetails.poster || bestPoster,
      backdrop: omdbDetails.backdrop || bestBackdrop,
      genres: omdbDetails.genres.length ? omdbDetails.genres : genres.map(g => ({ id: g, name: g })),
    } : {
      imdbId: posts[0].tmdbId,
      title: posts[0].title,
      poster: bestPoster,
      backdrop: bestBackdrop,
      overview: "",
      genres: genres.map(g => ({ id: g, name: g })),
      cast: [],
      directors: [],
      writers: [],
    };
    
    res.json({
      movie: {
        id: mergedDetails.imdbId || key,
        tmdbId: mergedDetails.imdbId || null,
        title: mergedDetails.title,
        poster: mergedDetails.poster,
        backdrop: mergedDetails.backdrop,
        type: mergedDetails.type || posts[0].type || "movie",
        genres: mergedDetails.genres.map(g => g.id),
        genreNames: mergedDetails.genres,
        avgRating: Number(avgRating.toFixed(1)),
        reviewCount: posts.length,
        likeCount: totalLikes,
        latestDate: posts[0].date || null,
        details: mergedDetails,
      },
      reviews: posts,
    });
  } catch (err) {
    console.error("Movie detail failed:", err);
    res.status(500).json({ error: "Failed to load movie page" });
  }
});

/* ───────────────────────────────────────────────────── */
/* SINGLE ENTRY, DELETE, LIKE (unchanged)               */
/* ───────────────────────────────────────────────────── */
router.get("/:id", [param("id").isMongoId()], validate, async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id).populate("user","username").lean();
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    const viewer = await getRequestUser(req);
    if (!canViewEntry(entry, viewer)) return res.status(404).json({ error: "Entry not found" });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch entry" });
  }
});

router.delete("/:id", auth, [param("id").isMongoId()], validate, async (req, res) => {
  try {
    const deleted = await Entry.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deleted) return res.status(404).json({ error: "Entry not found" });
    res.json({ message: "Entry deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

router.post("/:id/like", auth, actionLimiter, [param("id").isMongoId()], validate, async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    if (entry.user.toString() === req.user.id) return res.status(400).json({ error: "Cannot like your own review" });
    const userId = req.user.id;
    const alreadyLiked = entry.likes.some(id => id.toString() === userId);
    if (alreadyLiked) entry.likes = entry.likes.filter(id => id.toString() !== userId);
    else entry.likes.push(userId);
    await entry.save();
    res.json({ likes: entry.likes.length, liked: !alreadyLiked });
  } catch (err) {
    res.status(500).json({ error: "Like failed" });
  }
});

export default router;
