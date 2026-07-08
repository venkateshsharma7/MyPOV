import mongoose from "mongoose";

const spaceMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const spaceInviteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const spaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    coverUrl: {
      type: String,
      trim: true,
      default: "",
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: {
      type: [spaceMemberSchema],
      default: [],
    },
    invitedUsers: {
      type: [spaceInviteSchema],
      default: [],
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    fandomTags: {
      type: [String],
      default: [],
    },
    teamA: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "Team A",
    },
    teamB: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "Team B",
    },
    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

spaceSchema.index({ name: "text", description: "text", fandomTags: "text" });
spaceSchema.index({ "members.user": 1, updatedAt: -1 });

export default mongoose.model("Space", spaceSchema);
