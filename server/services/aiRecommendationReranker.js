import axios from "axios";
import { generateGeminiJson, hasGeminiKey } from "./geminiService.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_RECO_MODEL || "gpt-5.4-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function compactEntry(entry) {
  return {
    title: entry.title,
    rating: entry.rating,
    genres: entry.genres || [],
    pov: Boolean(entry.pov),
    review: String(entry.review || "").slice(0, 420),
  };
}

function compactCandidate(candidate, index) {
  return {
    index,
    id: String(candidate.id || candidate.title || index),
    title: candidate.title,
    year: candidate.year || "",
    genres: candidate.genres || [],
    overview: String(candidate.overview || "").slice(0, 520),
    localScore: candidate.score,
    confidence: candidate.confidence,
    source: candidate.source,
    reasons: candidate.reasons || [],
    communityRating: candidate.communityRating || candidate.rating || null,
    reviewCount: candidate.reviewCount || 0,
    likes: candidate.likes || 0,
  };
}

function parseJsonOutput(data) {
  if (data?.output_text) return JSON.parse(data.output_text);

  const textPart = data?.output
    ?.flatMap((item) => item.content || [])
    ?.find((content) => content.type === "output_text" || content.text)?.text;

  if (textPart) return JSON.parse(textPart);
  throw new Error("No JSON output returned");
}

function normalizeAiScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(1, score));
}

async function rerankWithGemini({ userEntries, candidates }) {
  const topCandidates = candidates.slice(0, 18);
  const loved = userEntries
    .filter((entry) => Number(entry.rating || 0) >= 8)
    .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
    .slice(0, 12)
    .map(compactEntry);
  const disliked = userEntries
    .filter((entry) => Number(entry.rating || 0) <= 5)
    .slice(0, 8)
    .map(compactEntry);

  const parsed = await generateGeminiJson({
    system:
      "You are Gemini inside MyPOV, a movie taste AI. Rerank only the supplied candidates. Do not invent titles. Reward nuanced matches to the user's loved movies and penalize genres or tones they rated poorly.",
    prompt: JSON.stringify({
      task: "Rerank movie recommendations for this user.",
      rules: [
        "Use only candidate indexes from the candidate list.",
        "aiScore must be 0 to 1.",
        "Return 6 to 18 ranked candidates.",
        "Reasons must be short, specific, and based on user taste.",
      ],
      userTaste: {
        loved,
        disliked,
        allRatingsCount: userEntries.length,
      },
      candidates: topCandidates.map(compactCandidate),
    }),
    responseSchema: {
      type: "OBJECT",
      properties: {
        rankings: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              index: { type: "INTEGER" },
              aiScore: { type: "NUMBER" },
              reasons: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
            },
            required: ["index", "aiScore", "reasons"],
          },
        },
      },
      required: ["rankings"],
    },
  });

  return applyAiRankings({ candidates, topCandidates, rankings: parsed.rankings, provider: "gemini" });
}

function applyAiRankings({ candidates, topCandidates, rankings, provider }) {
  const aiByIndex = new Map();
  for (const item of rankings || []) {
    const index = Number(item.index);
    if (!Number.isInteger(index) || index < 0 || index >= topCandidates.length) continue;
    aiByIndex.set(index, {
      aiScore: normalizeAiScore(item.aiScore),
      aiReasons: Array.isArray(item.reasons) ? item.reasons.filter(Boolean).slice(0, 3) : [],
    });
  }

  const reranked = topCandidates
    .map((candidate, index) => {
      const ai = aiByIndex.get(index);
      if (!ai) return { ...candidate, aiEnhanced: false };
      const blendedScore = candidate.score * 0.58 + ai.aiScore * 0.42;
      return {
        ...candidate,
        score: Number(blendedScore.toFixed(4)),
        confidence: Number(Math.max(candidate.confidence || 0, 0.72 + ai.aiScore * 0.23).toFixed(2)),
        reasons: [...ai.aiReasons, ...(candidate.reasons || [])].slice(0, 3),
        aiScore: ai.aiScore,
        aiEnhanced: true,
        aiProvider: provider,
      };
    })
    .sort((a, b) => b.score - a.score);

  const untouched = candidates.slice(topCandidates.length);
  return [...reranked, ...untouched].slice(0, candidates.length);
}

export async function rerankRecommendationsWithAI({ userEntries, candidates }) {
  if (!Array.isArray(candidates) || candidates.length < 2) {
    return candidates;
  }

  const topCandidates = candidates.slice(0, 18);
  const loved = userEntries
    .filter((entry) => Number(entry.rating || 0) >= 8)
    .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
    .slice(0, 12)
    .map(compactEntry);
  const disliked = userEntries
    .filter((entry) => Number(entry.rating || 0) <= 5)
    .slice(0, 8)
    .map(compactEntry);

  if (hasGeminiKey()) {
    try {
      return await rerankWithGemini({ userEntries, candidates });
    } catch (err) {
      console.warn("Gemini recommendation rerank skipped:", err.response?.data || err.message);
    }
  }

  if (!OPENAI_API_KEY) return candidates;

  const payload = {
    model: OPENAI_MODEL,
    input: [
      {
        role: "system",
        content:
          "You are the AI taste critic inside MyPOV, a movie review app. Rerank only the provided candidates. Do not invent titles. Reward surprising but defensible matches. Penalize generic popularity, watched-similar-but-wrong-tone picks, and genres the user rated poorly.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Rerank movie recommendations for this user.",
          rules: [
            "Use only candidate indexes from the candidate list.",
            "aiScore must be 0 to 1.",
            "Return 6 to 18 ranked candidates.",
            "Reasons must be short, specific, and based on user taste.",
          ],
          userTaste: {
            loved,
            disliked,
            allRatingsCount: userEntries.length,
          },
          candidates: topCandidates.map(compactCandidate),
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "mypov_ai_recommendation_ranking",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["rankings"],
          properties: {
            rankings: {
              type: "array",
              minItems: 1,
              maxItems: 18,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["index", "aiScore", "reasons"],
                properties: {
                  index: { type: "integer", minimum: 0 },
                  aiScore: { type: "number", minimum: 0, maximum: 1 },
                  reasons: {
                    type: "array",
                    minItems: 1,
                    maxItems: 3,
                    items: { type: "string", maxLength: 90 },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  try {
    const response = await axios.post(`${OPENAI_BASE_URL}/responses`, payload, {
      timeout: 20000,
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const parsed = parseJsonOutput(response.data);
    return applyAiRankings({ candidates, topCandidates, rankings: parsed.rankings, provider: "openai" });
  } catch (err) {
    console.warn("AI recommendation rerank skipped:", err.response?.data || err.message);
    return candidates;
  }
}
