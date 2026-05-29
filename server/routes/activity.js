import express from "express";
import Activity from "../models/Activity.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const cursor = req.query.cursor;
    const limit = Math.min(50, Number(req.query.limit) || 20);

    const query = {};
    if (cursor) query._id = { $lt: cursor };

    const activities = await Activity.find(query)
      .populate("user", "username")
      .populate("entry", "title poster tmdbId rating review isPublic user")
      .sort({ _id: -1 })
      .limit((limit + 1) * 3)
      .lean();

    const visibleActivities = activities.filter((activity) => {
      if (!activity.user || !activity.entry) return false;
      if (activity.entry.isPublic) return true;
      return (
        req.user.role === "admin" ||
        activity.entry.user?.toString() === req.user.id
      );
    });

    const pageActivities = visibleActivities.slice(0, limit);
    const hasMore =
      visibleActivities.length > limit || activities.length > limit;
    const nextCursor =
      hasMore && pageActivities.length
        ? pageActivities[pageActivities.length - 1]._id
        : null;

    const formatted = pageActivities.map((activity) => ({
      _id: activity._id,
      type: activity.type,
      user: activity.user,
      movieTitle: activity.entry.title,
      poster: activity.entry.poster,
      tmdbId: activity.entry.tmdbId,
      rating: activity.entry.rating,
      review: activity.entry.review,
      createdAt: activity.createdAt,
      liked: false,
      likeCount: 0,
      targetId: activity.entry._id,
      entryId: activity.entry._id,
    }));

    res.json({
      activities: formatted,
      nextCursor,
      hasMore,
    });
  } catch (err) {
    console.error("Activity fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

export default router;
