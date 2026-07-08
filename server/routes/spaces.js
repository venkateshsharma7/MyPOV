import crypto from "crypto";
import express from "express";
import { body, param, query } from "express-validator";
import Space from "../models/Space.js";
import SpaceMessage from "../models/SpaceMessage.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { actionLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => String(tag || "").trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 8);
}

function isMember(space, userId) {
  return Boolean(space?.members?.some((member) => String(member.user?._id || member.user) === userId));
}

function memberRole(space, userId) {
  const member = space?.members?.find((item) => String(item.user?._id || item.user) === userId);
  return member?.role || null;
}

function isInvited(space, userId) {
  return Boolean(space?.invitedUsers?.some((invite) => String(invite.user?._id || invite.user) === userId));
}

function canModerate(space, userId, role = null) {
  const resolvedRole = role || memberRole(space, userId);
  return ["owner", "admin"].includes(resolvedRole);
}

function canViewSpace(space, userId) {
  return space.visibility === "public" || isMember(space, userId) || isInvited(space, userId);
}

function publicSpacePayload(space, userId) {
  const members = Array.isArray(space.members) ? space.members : [];
  const role = memberRole(space, userId);
  const voiceParticipants = Array.isArray(space.voiceRoom?.participants) ? space.voiceRoom.participants : [];
  return {
    _id: space._id,
    name: space.name,
    description: space.description,
    coverUrl: space.coverUrl,
    visibility: space.visibility,
    owner: space.owner,
    members: members.slice(0, 40),
    memberCount: members.length,
    fandomTags: space.fandomTags || [],
    teamA: space.teamA,
    teamB: space.teamB,
    lastMessageAt: space.lastMessageAt,
    voiceRoom: {
      active: Boolean(space.voiceRoom?.active),
      startedBy: space.voiceRoom?.startedBy || null,
      startedAt: space.voiceRoom?.startedAt || null,
      participants: voiceParticipants,
      participantCount: voiceParticipants.length,
      viewerInVoice: voiceParticipants.some((participant) => String(participant.user?._id || participant.user) === userId),
    },
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
    viewer: {
      isMember: Boolean(role),
      role,
      isInvited: isInvited(space, userId),
      canModerate: canModerate(space, userId, role),
    },
  };
}

async function makeInviteCode() {
  for (let i = 0; i < 5; i += 1) {
    const code = crypto.randomBytes(5).toString("base64url");
    const existing = await Space.exists({ inviteCode: code });
    if (!existing) return code;
  }
  return crypto.randomUUID();
}

async function loadSpaceForViewer(spaceId, userId) {
  const space = await Space.findById(spaceId)
    .populate("owner", "username")
    .populate("members.user", "username")
    .populate("invitedUsers.user", "username")
    .populate("voiceRoom.startedBy", "username")
    .populate("voiceRoom.participants.user", "username")
    .lean();

  if (!space || !canViewSpace(space, userId)) return null;
  return space;
}

router.get(
  "/",
  auth,
  [
    query("scope").optional().isIn(["discover", "mine"]),
    query("q").optional().isString().trim().isLength({ max: 80 }),
  ],
  validate,
  async (req, res) => {
    try {
      const scope = req.query.scope || "discover";
      const search = String(req.query.q || "").trim();
      const baseQuery =
        scope === "mine"
          ? { "members.user": req.user.id }
          : {
              $or: [
                { visibility: "public" },
                { "members.user": req.user.id },
                { "invitedUsers.user": req.user.id },
              ],
            };

      if (search) {
        baseQuery.$and = [
          {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
              { fandomTags: { $regex: search, $options: "i" } },
            ],
          },
        ];
      }

      const spaces = await Space.find(baseQuery)
        .populate("owner", "username")
        .populate("members.user", "username")
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .limit(60)
        .lean();

      res.json(spaces.map((space) => publicSpacePayload(space, req.user.id)));
    } catch (err) {
      console.error("Spaces fetch failed:", err);
      res.status(500).json({ error: "Failed to fetch spaces" });
    }
  }
);

router.post(
  "/",
  auth,
  actionLimiter,
  [
    body("name").trim().isLength({ min: 3, max: 80 }),
    body("description").optional().isString().trim().isLength({ max: 500 }),
    body("coverUrl").optional().isString().trim().isLength({ max: 1000 }),
    body("visibility").optional().isIn(["public", "private"]),
    body("fandomTags").optional().isArray(),
    body("teamA").optional().isString().trim().isLength({ max: 40 }),
    body("teamB").optional().isString().trim().isLength({ max: 40 }),
  ],
  validate,
  async (req, res) => {
    try {
      const inviteCode = await makeInviteCode();
      const space = await Space.create({
        name: req.body.name.trim(),
        description: String(req.body.description || "").trim(),
        coverUrl: String(req.body.coverUrl || "").trim(),
        visibility: req.body.visibility || "public",
        owner: req.user.id,
        inviteCode,
        fandomTags: cleanTags(req.body.fandomTags),
        teamA: String(req.body.teamA || "Team A").trim() || "Team A",
        teamB: String(req.body.teamB || "Team B").trim() || "Team B",
        members: [{ user: req.user.id, role: "owner" }],
      });

      const populated = await Space.findById(space._id)
        .populate("owner", "username")
        .populate("members.user", "username")
        .lean();

      res.status(201).json(publicSpacePayload(populated, req.user.id));
    } catch (err) {
      console.error("Space create failed:", err);
      res.status(500).json({ error: "Failed to create space" });
    }
  }
);

router.get("/:id", auth, [param("id").isMongoId()], validate, async (req, res) => {
  try {
    const space = await loadSpaceForViewer(req.params.id, req.user.id);
    if (!space) return res.status(404).json({ error: "Space not found" });
    res.json(publicSpacePayload(space, req.user.id));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch space" });
  }
});

router.post(
  "/:id/join",
  auth,
  actionLimiter,
  [param("id").isMongoId(), body("inviteCode").optional().isString().trim().isLength({ max: 120 })],
  validate,
  async (req, res) => {
    try {
      const space = await Space.findById(req.params.id);
      if (!space) return res.status(404).json({ error: "Space not found" });
      if (isMember(space, req.user.id)) {
        const populated = await loadSpaceForViewer(space._id, req.user.id);
        return res.json(publicSpacePayload(populated, req.user.id));
      }

      const inviteCode = String(req.body.inviteCode || "").trim();
      const canJoin =
        space.visibility === "public" ||
        isInvited(space, req.user.id) ||
        (inviteCode && inviteCode === space.inviteCode);

      if (!canJoin) return res.status(403).json({ error: "Private space requires an invite" });

      space.members.push({ user: req.user.id, role: "member" });
      space.invitedUsers = space.invitedUsers.filter((invite) => String(invite.user) !== req.user.id);
      await space.save();

      const populated = await loadSpaceForViewer(space._id, req.user.id);
      res.json(publicSpacePayload(populated, req.user.id));
    } catch (err) {
      console.error("Space join failed:", err);
      res.status(500).json({ error: "Failed to join space" });
    }
  }
);

router.post("/:id/leave", auth, actionLimiter, [param("id").isMongoId()], validate, async (req, res) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space) return res.status(404).json({ error: "Space not found" });
    if (String(space.owner) === req.user.id) return res.status(400).json({ error: "Owner cannot leave their own space" });

    space.members = space.members.filter((member) => String(member.user) !== req.user.id);
    await space.save();
    res.json({ left: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to leave space" });
  }
});

router.post("/:id/invite-code", auth, actionLimiter, [param("id").isMongoId()], validate, async (req, res) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space || !isMember(space, req.user.id)) return res.status(404).json({ error: "Space not found" });
    if (!space.inviteCode) {
      space.inviteCode = await makeInviteCode();
      await space.save();
    }
    res.json({ inviteCode: space.inviteCode });
  } catch (err) {
    res.status(500).json({ error: "Failed to create invite" });
  }
});

router.post(
  "/:id/invite-users",
  auth,
  actionLimiter,
  [param("id").isMongoId(), body("usernames").isArray({ min: 1, max: 10 })],
  validate,
  async (req, res) => {
    try {
      const space = await Space.findById(req.params.id);
      if (!space || !isMember(space, req.user.id)) return res.status(404).json({ error: "Space not found" });

      const usernames = req.body.usernames.map((name) => String(name || "").trim()).filter(Boolean);
      const users = await User.find({ username: { $in: usernames } }).select("_id username").lean();
      const existingMemberIds = new Set(space.members.map((member) => String(member.user)));
      const existingInviteIds = new Set(space.invitedUsers.map((invite) => String(invite.user)));

      users.forEach((user) => {
        const userId = String(user._id);
        if (!existingMemberIds.has(userId) && !existingInviteIds.has(userId)) {
          space.invitedUsers.push({ user: user._id, invitedBy: req.user.id });
        }
      });

      await space.save();
      res.json({ invited: users.map((user) => user.username) });
    } catch (err) {
      console.error("Space invite failed:", err);
      res.status(500).json({ error: "Failed to invite users" });
    }
  }
);

router.get(
  "/:id/messages",
  auth,
  [param("id").isMongoId(), query("after").optional().isISO8601()],
  validate,
  async (req, res) => {
    try {
      const space = await Space.findById(req.params.id).lean();
      if (!space || !isMember(space, req.user.id)) return res.status(404).json({ error: "Space not found" });

      const queryFilter = { space: space._id };
      if (req.query.after) queryFilter.createdAt = { $gt: new Date(req.query.after) };

      const messages = await SpaceMessage.find(queryFilter)
        .populate("user", "username")
        .populate("replyTo", "text kind mediaUrl user deletedAt")
        .populate("replyTo.user", "username")
        .populate("reactions.user", "username")
        .populate("starredBy", "username")
        .sort({ createdAt: -1 })
        .limit(80)
        .lean();

      res.json(messages.reverse());
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  }
);

router.post(
  "/:id/messages",
  auth,
  actionLimiter,
  [
    param("id").isMongoId(),
    body("text").optional().isString().trim().isLength({ max: 2000 }),
    body("kind").optional().isIn(["text", "image", "gif", "voice"]),
    body("mediaUrl").optional().isString().trim().isLength({ max: 1000 }),
    body("replyTo").optional({ nullable: true, checkFalsy: true }).isMongoId(),
  ],
  validate,
  async (req, res) => {
    try {
      const space = await Space.findById(req.params.id);
      if (!space || !isMember(space, req.user.id)) return res.status(404).json({ error: "Space not found" });

      const text = String(req.body.text || "").trim();
      const kind = req.body.kind || "text";
      const mediaUrl = String(req.body.mediaUrl || "").trim();
      const replyTo = req.body.replyTo || null;
      if (!text && !mediaUrl) return res.status(400).json({ error: "Message cannot be empty" });
      if (kind !== "text" && !mediaUrl) return res.status(400).json({ error: "Media URL is required" });
      if (replyTo) {
        const repliedMessage = await SpaceMessage.exists({ _id: replyTo, space: space._id });
        if (!repliedMessage) return res.status(400).json({ error: "Reply target not found" });
      }

      const message = await SpaceMessage.create({
        space: space._id,
        user: req.user.id,
        text,
        kind,
        mediaUrl,
        replyTo,
      });

      space.lastMessageAt = new Date();
      await space.save();

      const populated = await SpaceMessage.findById(message._id)
        .populate("user", "username")
        .populate("replyTo", "text kind mediaUrl user deletedAt")
        .populate("replyTo.user", "username")
        .populate("reactions.user", "username")
        .populate("starredBy", "username")
        .lean();
      res.status(201).json(populated);
    } catch (err) {
      console.error("Space message failed:", err);
      res.status(500).json({ error: "Failed to send message" });
    }
  }
);

router.patch("/:id/messages/:messageId", auth, actionLimiter, [
  param("id").isMongoId(),
  param("messageId").isMongoId(),
  body("text").isString().trim().isLength({ min: 1, max: 2000 }),
], validate, async (req, res) => {
  try {
    const space = await Space.findById(req.params.id).lean();
    if (!space || !isMember(space, req.user.id)) return res.status(404).json({ error: "Space not found" });

    const message = await SpaceMessage.findOne({
      _id: req.params.messageId,
      space: space._id,
      user: req.user.id,
      deletedAt: null,
    });
    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.kind !== "text") return res.status(400).json({ error: "Only text messages can be edited" });

    message.text = req.body.text.trim();
    message.editedAt = new Date();
    await message.save();

    const populated = await SpaceMessage.findById(message._id)
      .populate("user", "username")
      .populate("replyTo", "text kind mediaUrl user deletedAt")
      .populate("replyTo.user", "username")
      .populate("reactions.user", "username")
      .populate("starredBy", "username")
      .lean();
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: "Failed to edit message" });
  }
});

router.post("/:id/messages/:messageId/react", auth, actionLimiter, [
  param("id").isMongoId(),
  param("messageId").isMongoId(),
  body("emoji").isString().trim().isLength({ min: 1, max: 16 }),
], validate, async (req, res) => {
  try {
    const space = await Space.findById(req.params.id).lean();
    if (!space || !isMember(space, req.user.id)) return res.status(404).json({ error: "Space not found" });

    const message = await SpaceMessage.findOne({ _id: req.params.messageId, space: space._id, deletedAt: null });
    if (!message) return res.status(404).json({ error: "Message not found" });

    const emoji = req.body.emoji.trim();
    const existing = message.reactions.find((reaction) => String(reaction.user) === req.user.id && reaction.emoji === emoji);
    if (existing) {
      message.reactions = message.reactions.filter(
        (reaction) => !(String(reaction.user) === req.user.id && reaction.emoji === emoji)
      );
    } else {
      message.reactions = message.reactions.filter((reaction) => String(reaction.user) !== req.user.id);
      message.reactions.push({ user: req.user.id, emoji });
    }
    await message.save();

    const populated = await SpaceMessage.findById(message._id)
      .populate("user", "username")
      .populate("replyTo", "text kind mediaUrl user deletedAt")
      .populate("replyTo.user", "username")
      .populate("reactions.user", "username")
      .populate("starredBy", "username")
      .lean();
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: "Failed to react to message" });
  }
});

router.post("/:id/messages/:messageId/star", auth, actionLimiter, [
  param("id").isMongoId(),
  param("messageId").isMongoId(),
], validate, async (req, res) => {
  try {
    const space = await Space.findById(req.params.id).lean();
    if (!space || !isMember(space, req.user.id)) return res.status(404).json({ error: "Space not found" });

    const message = await SpaceMessage.findOne({ _id: req.params.messageId, space: space._id, deletedAt: null });
    if (!message) return res.status(404).json({ error: "Message not found" });

    const alreadyStarred = message.starredBy.some((userId) => String(userId) === req.user.id);
    message.starredBy = alreadyStarred
      ? message.starredBy.filter((userId) => String(userId) !== req.user.id)
      : [...message.starredBy, req.user.id];
    await message.save();

    const populated = await SpaceMessage.findById(message._id)
      .populate("user", "username")
      .populate("replyTo", "text kind mediaUrl user deletedAt")
      .populate("replyTo.user", "username")
      .populate("reactions.user", "username")
      .populate("starredBy", "username")
      .lean();
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: "Failed to star message" });
  }
});

router.delete("/:id/messages/:messageId", auth, actionLimiter, [
  param("id").isMongoId(),
  param("messageId").isMongoId(),
], validate, async (req, res) => {
  try {
    const space = await Space.findById(req.params.id).lean();
    if (!space || !isMember(space, req.user.id)) return res.status(404).json({ error: "Space not found" });

    const message = await SpaceMessage.findOne({ _id: req.params.messageId, space: space._id });
    if (!message) return res.status(404).json({ error: "Message not found" });

    const canDelete = String(message.user) === req.user.id || canModerate(space, req.user.id);
    if (!canDelete) return res.status(403).json({ error: "Cannot delete this message" });

    message.text = "";
    message.mediaUrl = "";
    message.deletedAt = new Date();
    message.deletedBy = req.user.id;
    await message.save();
    res.json({ deleted: true, messageId: message._id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete message" });
  }
});

router.post("/:id/voice-room/join", auth, actionLimiter, [param("id").isMongoId()], validate, async (req, res) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space || !isMember(space, req.user.id)) return res.status(404).json({ error: "Space not found" });

    if (!space.voiceRoom.active) {
      space.voiceRoom.active = true;
      space.voiceRoom.startedBy = req.user.id;
      space.voiceRoom.startedAt = new Date();
    }
    const alreadyJoined = space.voiceRoom.participants.some((participant) => String(participant.user) === req.user.id);
    if (!alreadyJoined) space.voiceRoom.participants.push({ user: req.user.id, muted: false });
    await space.save();

    const populated = await loadSpaceForViewer(space._id, req.user.id);
    res.json(publicSpacePayload(populated, req.user.id));
  } catch (err) {
    res.status(500).json({ error: "Failed to join voice room" });
  }
});

router.post("/:id/voice-room/leave", auth, actionLimiter, [param("id").isMongoId()], validate, async (req, res) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space || !isMember(space, req.user.id)) return res.status(404).json({ error: "Space not found" });

    space.voiceRoom.participants = space.voiceRoom.participants.filter(
      (participant) => String(participant.user) !== req.user.id
    );
    if (!space.voiceRoom.participants.length) {
      space.voiceRoom.active = false;
      space.voiceRoom.startedBy = null;
      space.voiceRoom.startedAt = null;
    }
    await space.save();

    const populated = await loadSpaceForViewer(space._id, req.user.id);
    res.json(publicSpacePayload(populated, req.user.id));
  } catch (err) {
    res.status(500).json({ error: "Failed to leave voice room" });
  }
});

router.post("/:id/voice-room/mute", auth, actionLimiter, [
  param("id").isMongoId(),
  body("muted").isBoolean(),
], validate, async (req, res) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space || !isMember(space, req.user.id)) return res.status(404).json({ error: "Space not found" });

    const participant = space.voiceRoom.participants.find((item) => String(item.user) === req.user.id);
    if (!participant) return res.status(400).json({ error: "Join voice room first" });
    participant.muted = Boolean(req.body.muted);
    await space.save();

    const populated = await loadSpaceForViewer(space._id, req.user.id);
    res.json(publicSpacePayload(populated, req.user.id));
  } catch (err) {
    res.status(500).json({ error: "Failed to update voice room" });
  }
});

export default router;
