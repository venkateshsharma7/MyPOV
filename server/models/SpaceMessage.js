import mongoose from "mongoose";

const messageReactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    emoji: {
      type: String,
      trim: true,
      maxlength: 16,
      default: "fire",
    },
  },
  { _id: false }
);

const spaceMessageSchema = new mongoose.Schema(
  {
    space: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Space",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    kind: {
      type: String,
      enum: ["text", "image", "gif"],
      default: "text",
    },
    mediaUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    reactions: {
      type: [messageReactionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

spaceMessageSchema.index({ space: 1, createdAt: -1 });

export default mongoose.model("SpaceMessage", spaceMessageSchema);
