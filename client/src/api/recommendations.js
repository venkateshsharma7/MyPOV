// api/client.js or wherever apiFetch lives – no changes required
import { apiFetch } from "./client";

export async function fetchRecommendations() {
  try {
    const data = await apiFetch("/recommendations");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Recommendation fetch error:", err);
    return [];
  }
}