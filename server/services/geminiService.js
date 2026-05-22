import axios from "axios";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";

export function hasGeminiKey() {
  return Boolean(GEMINI_API_KEY);
}

function getGeminiText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
}

export async function generateGeminiJson({ system, prompt, responseSchema, temperature = 0.35 }) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const response = await axios.post(
    `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent`,
    {
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
        ...(responseSchema ? { responseSchema } : {}),
      },
    },
    {
      timeout: 20000,
      params: { key: GEMINI_API_KEY },
      headers: { "Content-Type": "application/json" },
    }
  );

  const text = getGeminiText(response.data);
  if (!text) throw new Error("Gemini returned no text");
  return JSON.parse(text);
}

export async function generateGeminiText({ system, prompt, temperature = 0.65 }) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const response = await axios.post(
    `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent`,
    {
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
      },
    },
    {
      timeout: 20000,
      params: { key: GEMINI_API_KEY },
      headers: { "Content-Type": "application/json" },
    }
  );

  const text = getGeminiText(response.data);
  if (!text) throw new Error("Gemini returned no text");
  return text;
}
