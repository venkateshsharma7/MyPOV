import { apiFetch } from "./client";

export function getSpaces({ scope = "discover", q = "" } = {}) {
  const params = new URLSearchParams({ scope });
  if (q.trim()) params.set("q", q.trim());
  return apiFetch(`/spaces?${params.toString()}`);
}

export function createSpace(payload) {
  return apiFetch("/spaces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getSpace(spaceId) {
  return apiFetch(`/spaces/${spaceId}`);
}

export function joinSpace(spaceId, inviteCode = "") {
  return apiFetch(`/spaces/${spaceId}/join`, {
    method: "POST",
    body: JSON.stringify({ inviteCode }),
  });
}

export function leaveSpace(spaceId) {
  return apiFetch(`/spaces/${spaceId}/leave`, {
    method: "POST",
  });
}

export function getInviteCode(spaceId) {
  return apiFetch(`/spaces/${spaceId}/invite-code`, {
    method: "POST",
  });
}

export function inviteUsers(spaceId, usernames) {
  return apiFetch(`/spaces/${spaceId}/invite-users`, {
    method: "POST",
    body: JSON.stringify({ usernames }),
  });
}

export function getSpaceMessages(spaceId, after = "") {
  const params = new URLSearchParams();
  if (after) params.set("after", after);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/spaces/${spaceId}/messages${suffix}`);
}

export function sendSpaceMessage(spaceId, payload) {
  return apiFetch(`/spaces/${spaceId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function setSpaceTyping(spaceId, typing) {
  return apiFetch(`/spaces/${spaceId}/typing`, {
    method: "POST",
    body: JSON.stringify({ typing }),
  });
}

export function editSpaceMessage(spaceId, messageId, text) {
  return apiFetch(`/spaces/${spaceId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ text }),
  });
}

export function reactToSpaceMessage(spaceId, messageId, emoji) {
  return apiFetch(`/spaces/${spaceId}/messages/${messageId}/react`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
}

export function starSpaceMessage(spaceId, messageId) {
  return apiFetch(`/spaces/${spaceId}/messages/${messageId}/star`, {
    method: "POST",
  });
}

export function deleteSpaceMessage(spaceId, messageId) {
  return apiFetch(`/spaces/${spaceId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

export function joinVoiceRoom(spaceId) {
  return apiFetch(`/spaces/${spaceId}/voice-room/join`, {
    method: "POST",
  });
}

export function leaveVoiceRoom(spaceId) {
  return apiFetch(`/spaces/${spaceId}/voice-room/leave`, {
    method: "POST",
  });
}

export function muteVoiceRoom(spaceId, muted) {
  return apiFetch(`/spaces/${spaceId}/voice-room/mute`, {
    method: "POST",
    body: JSON.stringify({ muted }),
  });
}
