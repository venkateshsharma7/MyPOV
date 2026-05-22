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

    const reply = await generateGeminiText({
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

    res.json({
      reply,
      provider: "gemini",
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    });
  } catch (err) {
    console.error("Gemini bot failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Gemini bot failed" });
  }
});

export default router;
