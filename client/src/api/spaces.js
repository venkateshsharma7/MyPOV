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

export function deleteSpaceMessage(spaceId, messageId) {
  return apiFetch(`/spaces/${spaceId}/messages/${messageId}`, {
    method: "DELETE",
  });
}
