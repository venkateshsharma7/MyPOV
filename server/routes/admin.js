import express from "express";
import User from "../models/User.js";
import Entry from "../models/Entry.js";
import Activity from "../models/Activity.js";
import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";

const router = express.Router();

// All routes require auth + admin role
router.use(auth, admin);

// USERS
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}).select("-password").lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ENTRIES (all)
router.get("/entries/all", async (req, res) => {
  try {
    const entries = await Entry.find({}).populate("user", "username").sort({ createdAt: -1 }).lean();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/entries/:id", async (req, res) => {
  try {
    const { title, rating, review, isPublic } = req.body;
    const entry = await Entry.findByIdAndUpdate(req.params.id, { title, rating, review, isPublic }, { new: true });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/entries/:id", async (req, res) => {
  try {
    await Entry.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MODERATION (pending flagged posts)
router.get("/moderation/pending", async (req, res) => {
  try {
    const pending = await Entry.find({ isPublic: false, isFlagged: true }).populate("user", "username").lean();
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/moderation/:id/approve", async (req, res) => {
  try {
    await Entry.findByIdAndUpdate(req.params.id, { isPublic: true, isFlagged: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/moderation/:id/reject", async (req, res) => {
  try {
    await Entry.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SETTINGS (in‑memory)
let settingsCache = {
  siteName: "MyPOV",
  allowRegistrations: true,
  maintenanceMode: false,
  omdbKey: process.env.OMDB_KEY,
  tmdbKey: process.env.TMDB_KEY
};

router.get("/settings", (req, res) => {
  res.json(settingsCache);
});

router.put("/settings", async (req, res) => {
  try {
    const { siteName, allowRegistrations, maintenanceMode, omdbKey, tmdbKey } = req.body;
    settingsCache = { siteName, allowRegistrations, maintenanceMode, omdbKey, tmdbKey };
    res.json(settingsCache);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACTIVITY LOGS
router.get("/logs", async (req, res) => {
  try {
    const logs = await Activity.find({}).populate("user", "username").sort({ createdAt: -1 }).limit(200).lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SYSTEM INFO
router.get("/system", (req, res) => {
  res.json({
    nodeVersion: process.version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV
  });
});

export default router;