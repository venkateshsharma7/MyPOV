import express from "express";
import Entry from "../models/Entry.js";
import auth from "../middleware/auth.js";
import { generateGeminiText, hasGeminiKey } from "../services/geminiService.js";

const router = express.Router();

function summarizeEntry(entry) {
  return {
    title: entry.title,
    rating: entry.rating,
    type: entry.type,
    genres: entry.genres || [],
    pov: Boolean(entry.pov),
    review: String(entry.review || "").slice(0, 360),
  };
}

function topGenresFrom(entries) {
  const counts = new Map();

  for (const entry of entries) {
    const rating = Number(entry.rating || 0);
    const weight = Math.max(1, rating);
    for (const genre of entry.genres || []) {
      const name = typeof genre === "string" ? genre : genre?.name || genre?.id;
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + weight);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);
}

function buildLocalReply({ message, entries, favorites, dislikes, recent }) {
  if (!entries.length) {
    return [
      "I do not have much MyPOV history for you yet, so I cannot make a deeply personal call.",
      "Log a few rated watches with short reviews, then ask me again. Even 5-10 entries will make your recommendations much sharper.",
    ].join("\n\n");
  }

  const lovedTitles = favorites.slice(0, 4).map((entry) => entry.title);
  const dislikedTitles = dislikes.slice(0, 3).map((entry) => entry.title);
  const genres = topGenresFrom(entries);
  const recentTitles = recent.slice(0, 3).map((entry) => entry.title);
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("genre") || lowerMessage.includes("love") || lowerMessage.includes("avoid")) {
    return [
      `Based on your MyPOV history, your strongest signals are: ${genres.join(", ") || "not enough genre data yet"}.`,
      lovedTitles.length
        ? `Your higher ratings around ${lovedTitles.join(", ")} suggest you respond best when those genres have a strong point of view, not just familiar packaging.`
        : "I need a few more high-rated entries before I can name your strongest loves confidently.",
      dislikedTitles.length
        ? `You seem less patient with titles like ${dislikedTitles.join(", ")}, so I would avoid nearby picks unless the tone or premise is clearly different.`
        : "You have not logged many low-rated titles yet, so your avoid-list is still forming.",
    ].join("\n\n");
  }

  if (lowerMessage.includes("roast")) {
    return [
      "Tiny roast, useful version: your taste is trying very hard to be curated, but the ratings are doing the real talking.",
      lovedTitles.length
        ? `You clearly have a lane around ${lovedTitles.join(", ")}, so stop pretending every random popular title deserves equal attention.`
        : "You need more rated entries before I can roast the pattern properly.",
      genres.length
        ? `Lean into ${genres.slice(0, 3).join(", ")} for now, then deliberately watch one clean wildcard outside that zone.`
        : "Log more genres. Right now the bot is squinting at crumbs.",
    ].join("\n\n");
  }

  return [
    "Gemini is rate-limited right now, so I am using your MyPOV history locally instead.",
    lovedTitles.length
      ? `Tonight, start from the mood of your strongest likes: ${lovedTitles.join(", ")}. Look for something in ${genres.slice(0, 3).join(", ") || "a familiar genre"} with a distinct tone rather than a generic crowd-pleaser.`
      : `You have ${entries.length} logged watches. I need a few more 8+/10 ratings to make a sharper pick, but your recent watches (${recentTitles.join(", ")}) are enough to avoid totally random suggestions.`,
    dislikedTitles.length
      ? `I would avoid anything too close to ${dislikedTitles.join(", ")} unless you specifically want to test that lane again.`
      : "Add a couple of low-rated entries too. Knowing what you dislike improves recommendations a lot.",
  ].join("\n\n");
}

router.post("/chat", auth, async (req, res) => {
  try {
    if (!hasGeminiKey()) {
      return res.status(503).json({
        error: "Gemini is not configured. Add GEMINI_API_KEY to server/.env and restart the backend.",
      });
    }

    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ error: "Message required" });
    if (message.length > 800) return res.status(400).json({ error: "Message too long" });

    const entries = await Entry.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(80)
      .lean();

    const favorites = entries
      .filter((entry) => Number(entry.rating || 0) >= 8)
      .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
      .slice(0, 14)
      .map(summarizeEntry);
    const dislikes = entries
      .filter((entry) => Number(entry.rating || 0) <= 5)
      .slice(0, 10)
      .map(summarizeEntry);
    const recent = entries.slice(0, 12).map(summarizeEntry);

    let reply;
    let provider = "gemini";

    try {
      reply = await generateGeminiText({
        system:
          "You are MyPOV Gemini Bot, a sharp but friendly cinema AI inside a movie review app. Use the user's actual watch history when available. Be specific, concise, and opinionated. If recommending movies, explain why in terms of the user's taste. Do not claim certainty.",
        prompt: JSON.stringify({
          userQuestion: message,
          userTaste: {
            totalLogged: entries.length,
            favorites,
            dislikes,
            recent,
          },
          style: "Give a useful answer in 2-5 short paragraphs or bullets. Mention that you are using their MyPOV history when relevant.",
        }),
        temperature: 0.72,
      });
    } catch (err) {
      const status = err.response?.status;
      if (status !== 429) throw err;

      provider = "local-fallback";
      reply = buildLocalReply({
        message,
        entries,
        favorites,
        dislikes,
        recent,
      });
    }

    res.json({
      reply,
      provider,
      model: provider === "gemini" ? process.env.GEMINI_MODEL || "gemini-2.5-flash" : "mypov-local",
    });
  } catch (err) {
    const status = err.response?.status;
    const geminiMessage =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      err.message;

    console.error("Gemini bot failed:", err.response?.data || err.message);

    if (status === 400 || status === 404) {
      return res.status(502).json({
        error: "Gemini model/config is invalid. Check GEMINI_MODEL on Render.",
        detail: geminiMessage,
      });
    }

    if (status === 401 || status === 403) {
      return res.status(502).json({
        error: "Gemini API key was rejected. Check GEMINI_API_KEY on Render.",
        detail: geminiMessage,
      });
    }

    if (status === 429) {
      return res.status(503).json({
        error: "Gemini quota or rate limit reached. Try again later.",
        detail: geminiMessage,
      });
    }

    res.status(502).json({
      error: "Gemini bot failed",
      detail: geminiMessage,
    });
  }
});

export default router;
