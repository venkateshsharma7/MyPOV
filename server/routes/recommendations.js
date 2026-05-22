import express from "express";
import axios from "axios";
import Entry from "../models/Entry.js";
import { textToVector } from "../services/embeddingService.js";
import { cosineSimilarity } from "../services/similarityService.js";
import { rerankRecommendationsWithAI } from "../services/aiRecommendationReranker.js";
import auth from "../middleware/auth.js";

const router = express.Router();

const OMDB_KEY = process.env.OMDB_KEY;
const TMDB_KEY = process.env.TMDB_KEY || process.env.TMDB_API_KEY || "";
const CACHE_TTL = 60 * 60 * 1000;
const detailsCache = new Map();
const searchCache = new Map();

const tmdb = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  timeout: 10000,
});

function normalizeTitle(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeGenre(genre) {
  return String(genre || "").trim().toLowerCase();
}

function splitGenres(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((g) => g.trim()).filter(Boolean);
  return [];
}

function getCached(cache, key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(cache, key, value) {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL });
}

function getPoster(details, fallback = null) {
  if (fallback) return fallback;
  if (details?.Poster && details.Poster !== "N/A") return details.Poster;
  if (details?.poster_path) return `https://image.tmdb.org/t/p/w500${details.poster_path}`;
  return null;
}

function getYear(details) {
  return details?.Year || String(details?.release_date || "").slice(0, 4) || "";
}

function getRatingValue(entry) {
  return Number(entry?.rating || 0);
}

function confidenceFromHistory(count) {
  if (count >= 30) return 1;
  if (count >= 15) return 0.86;
  if (count >= 8) return 0.72;
  if (count >= 4) return 0.56;
  return 0.38;
}

function addWeighted(map, key, weight) {
  const normalized = normalizeGenre(key);
  if (!normalized) return;
  map.set(normalized, (map.get(normalized) || 0) + weight);
}

function topMapEntries(map, limit = 8) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function buildTasteModel(entries) {
  const genreWeights = new Map();
  const negativeGenres = new Map();
  const likedTitles = [];
  const lovedEntries = [];
  const dislikedTitles = new Set();
  let weightedRating = 0;
  let totalWeight = 0;

  const likedText = [];
  const dislikedText = [];

  for (const entry of entries) {
    const rating = getRatingValue(entry);
    const centered = rating - 5.5;
    const confidence = Math.min(1.6, 0.7 + Math.abs(centered) / 4);
    const povBoost = entry.pov ? 1.25 : 1;
    const weight = centered * confidence * povBoost;
    const genres = splitGenres(entry.genres);

    for (const genre of genres) {
      if (weight >= 0) addWeighted(genreWeights, genre, weight);
      else addWeighted(negativeGenres, genre, Math.abs(weight));
    }

    if (rating >= 7) {
      likedTitles.push(entry.title);
      likedText.push([entry.title, entry.review, genres.join(" ")].filter(Boolean).join(" "));
    }
    if (rating >= 8) lovedEntries.push(entry);
    if (rating <= 5) {
      dislikedTitles.add(normalizeTitle(entry.title));
      dislikedText.push([entry.title, entry.review, genres.join(" ")].filter(Boolean).join(" "));
    }

    weightedRating += rating * Math.max(0.2, Math.abs(weight));
    totalWeight += Math.max(0.2, Math.abs(weight));
  }

  return {
    genreWeights,
    negativeGenres,
    likedTitles,
    lovedEntries,
    dislikedTitles,
    likedVector: textToVector(likedText.join(" ")),
    dislikedVector: textToVector(dislikedText.join(" ")),
    avgRating: totalWeight ? weightedRating / totalWeight : 6,
    confidence: confidenceFromHistory(entries.length),
  };
}

function scoreGenreFit(candidateGenres, model) {
  const genres = splitGenres(candidateGenres);
  if (!genres.length) return { score: 0, matched: [] };

  let positive = 0;
  let negative = 0;
  const matched = [];

  for (const genre of genres) {
    const key = normalizeGenre(genre);
    const pos = model.genreWeights.get(key) || 0;
    const neg = model.negativeGenres.get(key) || 0;
    if (pos > 0) matched.push(genre);
    positive += pos;
    negative += neg;
  }

  const maxPositive = Math.max(1, topMapEntries(model.genreWeights, 5).reduce((sum, [, value]) => sum + value, 0));
  const score = Math.max(0, Math.min(1, positive / maxPositive - negative / maxPositive));
  return { score, matched: [...new Set(matched)].slice(0, 3) };
}

function scoreTextFit(text, model) {
  const vector = textToVector(text);
  const liked = cosineSimilarity(model.likedVector, vector) || 0;
  const disliked = cosineSimilarity(model.dislikedVector, vector) || 0;
  return Math.max(0, Math.min(1, liked - disliked * 0.7));
}

function scoreQuality({ imdbRating, communityRating, reviewCount = 0, likes = 0 }) {
  const imdb = Number(imdbRating || 0) / 10;
  const community = Number(communityRating || 0) / 10;
  const volume = Math.min(1, Math.log10(1 + reviewCount + likes) / 2);
  return Math.max(imdb, community, 0) * 0.75 + volume * 0.25;
}

function scoreNovelty(year) {
  const parsed = parseInt(String(year || "").slice(0, 4), 10);
  if (!parsed) return 0.48;
  const age = Math.max(0, new Date().getFullYear() - parsed);
  if (age <= 3) return 0.82;
  if (age <= 12) return 0.72;
  if (age <= 30) return 0.58;
  return 0.42;
}

async function fetchOmdbDetailsById(imdbId) {
  if (!imdbId) return null;
  const cacheKey = `id:${imdbId}`;
  const cached = getCached(detailsCache, cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get("https://www.omdbapi.com/", {
      params: { apikey: OMDB_KEY, i: imdbId, plot: "full" },
      timeout: 10000,
    });
    const details = response.data?.Response === "True" ? response.data : null;
    if (details) setCached(detailsCache, cacheKey, details);
    return details;
  } catch {
    return null;
  }
}

async function fetchOmdbSearch(query) {
  const search = String(query || "").trim();
  if (!search) return [];
  const cacheKey = `search:${search}`;
  const cached = getCached(searchCache, cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get("https://www.omdbapi.com/", {
      params: { apikey: OMDB_KEY, s: search, type: "movie" },
      timeout: 10000,
    });
    const results = response.data?.Response === "True" ? response.data.Search || [] : [];
    setCached(searchCache, cacheKey, results);
    return results;
  } catch {
    return [];
  }
}

async function fetchTmdbDiscover(genres) {
  if (!TMDB_KEY || !genres.length) return [];
  try {
    const genreResponse = await tmdb.get("/genre/movie/list", {
      params: { api_key: TMDB_KEY },
    });
    const genreMap = new Map(
      (genreResponse.data?.genres || []).map((genre) => [normalizeGenre(genre.name), genre.id])
    );
    const ids = genres.map(([name]) => genreMap.get(normalizeGenre(name))).filter(Boolean).slice(0, 3);
    if (!ids.length) return [];

    const response = await tmdb.get("/discover/movie", {
      params: {
        api_key: TMDB_KEY,
        with_genres: ids.join("|"),
        "vote_count.gte": 350,
        sort_by: "vote_average.desc",
        include_adult: false,
        page: 1,
      },
    });

    return (response.data?.results || []).map((movie) => ({
      id: movie.id,
      title: movie.title,
      poster: getPoster(movie),
      year: getYear(movie),
      overview: movie.overview,
      genres: genres.map(([name]) => name),
      imdbRating: movie.vote_average,
      source: "tmdb-discover",
    }));
  } catch (err) {
    console.warn("TMDB discover failed:", err.message);
    return [];
  }
}

async function mapWithConcurrency(items, mapper, concurrency = 6) {
  const results = new Array(items.length);
  let current = 0;
  async function worker() {
    while (current < items.length) {
      const index = current++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function buildCollaborativeCandidates(allEntries, userEntries, userId) {
  const userRatingsByTitle = new Map(userEntries.map((entry) => [normalizeTitle(entry.title), getRatingValue(entry)]));
  const watchedTitles = new Set(userRatingsByTitle.keys());
  const byUser = new Map();

  for (const entry of allEntries) {
    if (String(entry.user) === String(userId)) continue;
    const uid = String(entry.user?._id || entry.user);
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid).push(entry);
  }

  const candidates = new Map();

  for (const entries of byUser.values()) {
    let overlap = 0;
    let similarity = 0;

    for (const entry of entries) {
      const title = normalizeTitle(entry.title);
      if (!userRatingsByTitle.has(title)) continue;
      overlap += 1;
      similarity += 1 - Math.abs(userRatingsByTitle.get(title) - getRatingValue(entry)) / 10;
    }

    if (!overlap) continue;
    const userSimilarity = (similarity / overlap) * Math.min(1, overlap / 4);
    if (userSimilarity < 0.18) continue;

    for (const entry of entries) {
      const title = normalizeTitle(entry.title);
      const rating = getRatingValue(entry);
      if (watchedTitles.has(title) || rating < 7) continue;
      const key = entry.tmdbId || title;
      const current = candidates.get(key) || {
        entry,
        similarityTotal: 0,
        votes: 0,
      };
      current.similarityTotal += userSimilarity * (rating / 10);
      current.votes += 1;
      candidates.set(key, current);
    }
  }

  return Array.from(candidates.values()).map(({ entry, similarityTotal, votes }) => ({
    id: entry.tmdbId || entry._id,
    title: entry.title,
    poster: entry.poster,
    backdrop: entry.backdrop,
    genres: entry.genres || [],
    year: entry.date ? String(entry.date).slice(0, 4) : "",
    overview: entry.review || "",
    communityRating: entry.rating,
    reviewCount: votes,
    likes: Array.isArray(entry.likes) ? entry.likes.length : 0,
    collaborativeScore: Math.min(1, similarityTotal),
    source: "similar-users",
  }));
}

function buildCommunityCandidates(allEntries, userEntries, userId) {
  const watchedTitles = new Set(userEntries.map((entry) => normalizeTitle(entry.title)));
  const groups = new Map();

  for (const entry of allEntries) {
    if (String(entry.user) === String(userId)) continue;
    if (watchedTitles.has(normalizeTitle(entry.title))) continue;
    const key = entry.tmdbId || normalizeTitle(entry.title);
    if (!key) continue;

    const group = groups.get(key) || {
      id: entry.tmdbId || entry._id,
      title: entry.title,
      poster: entry.poster,
      backdrop: entry.backdrop,
      genres: entry.genres || [],
      overview: "",
      ratingTotal: 0,
      reviewCount: 0,
      likes: 0,
      source: "community",
    };

    group.ratingTotal += getRatingValue(entry);
    group.reviewCount += 1;
    group.likes += Array.isArray(entry.likes) ? entry.likes.length : 0;
    if (!group.overview && entry.review) group.overview = entry.review;
    if ((!group.poster || !group.backdrop) && (entry.poster || entry.backdrop)) {
      group.poster = group.poster || entry.poster;
      group.backdrop = group.backdrop || entry.backdrop;
    }
    groups.set(key, group);
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    communityRating: group.reviewCount ? group.ratingTotal / group.reviewCount : 0,
  }));
}

function scoreCandidate(candidate, model) {
  const genre = scoreGenreFit(candidate.genres, model);
  const text = scoreTextFit([candidate.title, candidate.overview, splitGenres(candidate.genres).join(" ")].join(" "), model);
  const quality = scoreQuality(candidate);
  const novelty = scoreNovelty(candidate.year);
  const collaborative = candidate.collaborativeScore || 0;

  const score =
    collaborative * 0.34 +
    genre.score * 0.28 +
    text * 0.18 +
    quality * 0.15 +
    novelty * 0.05;

  const reasons = [];
  if (collaborative >= 0.25) reasons.push("liked by users with similar taste");
  if (genre.matched.length) reasons.push(`matches ${genre.matched.join(", ")}`);
  if (text >= 0.18) reasons.push("similar themes to reviews you rated highly");
  if (quality >= 0.65) reasons.push("strong community/critic signal");

  return {
    score: Number((score * model.confidence).toFixed(4)),
    confidence: Number(Math.min(0.99, model.confidence * (0.55 + score / 2)).toFixed(2)),
    reasons: reasons.slice(0, 3),
  };
}

function dedupeCandidates(candidates) {
  const map = new Map();
  for (const candidate of candidates) {
    const key = candidate.id || normalizeTitle(candidate.title);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing || (candidate.collaborativeScore || 0) > (existing.collaborativeScore || 0)) {
      map.set(key, candidate);
    }
  }
  return Array.from(map.values());
}

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEntries = await Entry.find({ user: userId }).lean();
    if (!userEntries.length) return res.json([]);

    const model = buildTasteModel(userEntries);
    const watchedTitles = new Set(userEntries.map((entry) => normalizeTitle(entry.title)));
    const watchedIds = new Set(userEntries.map((entry) => entry.tmdbId).filter(Boolean));

    const allPublicEntries = await Entry.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .limit(900)
      .lean();

    const topGenres = topMapEntries(model.genreWeights, 5);
    const lovedTitles = model.lovedEntries.map((entry) => entry.title).slice(0, 5);

    const [tmdbCandidates, omdbSearchResults] = await Promise.all([
      fetchTmdbDiscover(topGenres),
      mapWithConcurrency(lovedTitles, fetchOmdbSearch, 3),
    ]);

    const omdbIds = Array.from(new Set(omdbSearchResults.flat().map((movie) => movie.imdbID).filter(Boolean))).slice(0, 35);
    const omdbDetails = await mapWithConcurrency(omdbIds, fetchOmdbDetailsById, 6);

    const externalCandidates = omdbDetails.filter(Boolean).map((details) => ({
      id: details.imdbID,
      title: details.Title,
      poster: getPoster(details),
      year: getYear(details),
      overview: details.Plot !== "N/A" ? details.Plot : "",
      genres: splitGenres(details.Genre),
      imdbRating: details.imdbRating !== "N/A" ? Number(details.imdbRating) : 0,
      source: "omdb-nearby",
    }));

    const candidates = dedupeCandidates([
      ...buildCollaborativeCandidates(allPublicEntries, userEntries, userId),
      ...buildCommunityCandidates(allPublicEntries, userEntries, userId),
      ...tmdbCandidates,
      ...externalCandidates,
    ]);

    const scored = candidates
      .filter((candidate) => {
        const title = normalizeTitle(candidate.title);
        return title && !watchedTitles.has(title) && !watchedIds.has(candidate.id);
      })
      .map((candidate) => {
        const scoredCandidate = scoreCandidate(candidate, model);
        return {
          ...candidate,
          score: scoredCandidate.score,
          confidence: scoredCandidate.confidence,
          reasons: scoredCandidate.reasons,
          rating: candidate.communityRating
            ? Number(candidate.communityRating.toFixed(1))
            : candidate.imdbRating
            ? Number(candidate.imdbRating)
            : undefined,
        };
      })
      .filter((candidate) => candidate.score > 0.04)
      .sort((a, b) => b.score - a.score)
      .slice(0, 24);

    const aiRanked = await rerankRecommendationsWithAI({
      userEntries,
      candidates: scored,
    });

    res.json(aiRanked);
  } catch (err) {
    console.error("Recommendation error:", err);
    res.status(500).json({ error: "Recommendation engine failed" });
  }
});

export default router;
