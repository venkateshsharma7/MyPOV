import mongoose from "mongoose";

const entrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    // Changed from Number to String (supports IMDb IDs like "tt1234567")
    tmdbId: {
      type: String,
      default: null
    },
    poster: {
      type: String,
      default: null
    },
    backdrop: {
      type: String,
      default: null
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    review: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ""
    },
    date: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["movie", "tv"],
      default: "movie"
    },
    // Changed from [Number] to [String] (OMDb returns genre names)
    genres: {
      type: [String],
      default: []
    },
    language: {
      type: String,
      trim: true,
      default: null
    },
    pov: {
      type: Boolean,
      default: false
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true
  }
);

// Indexes (unchanged, but note tmdbId is now a string)
entrySchema.index({ createdAt: -1 });
entrySchema.index({ user: 1, createdAt: -1 });
entrySchema.index({ isPublic: 1, createdAt: -1 });
entrySchema.index({ pov: 1 });
entrySchema.index({ tmdbId: 1 });

export default mongoose.model("Entry", entrySchema);