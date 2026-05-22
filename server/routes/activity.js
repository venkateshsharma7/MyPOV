import express from "express";
import Activity from "../models/Activity.js";

const router = express.Router();

/* GET ACTIVITY FEED (cursor‑based pagination with populated entry) */
router.get("/", async (req, res) => {
  try {
    const cursor = req.query.cursor;
    const limit = Math.min(50, Number(req.query.limit) || 20);

    let query = {};
    if (cursor) query._id = { $lt: cursor };

    const activities = await Activity.find(query)
      .populate("user", "username")
      .populate("entry", "title poster tmdbId rating review")   // ← includes poster
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = activities.length > limit;
    if (hasMore) activities.pop();

    const nextCursor = hasMore ? activities[activities.length - 1]._id : null;

    const formatted = activities.map(act => ({
      _id: act._id,
      type: act.type,
      user: act.user,
      movieTitle: act.entry?.title,
      poster: act.entry?.poster,            // ← TMDB image URL
      tmdbId: act.entry?.tmdbId,
      rating: act.entry?.rating,
      review: act.entry?.review,
      createdAt: act.createdAt,
      liked: false,
      likeCount: 0,
      targetId: act.entry?._id,
      entryId: act.entry?._id
    }));

    res.json({
      activities: formatted,
      nextCursor,
      hasMore
    });
  } catch (err) {
    console.error("Activity fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

export default router;