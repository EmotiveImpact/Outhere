/**
 * API Service — centralized API client for OUT HERE backend.
 *
 * Ported from original OUTHERE (TypeScript/Axios) → JavaScript/fetch.
 * Uses native fetch to avoid an axios dependency.
 *
 * Set EXPO_PUBLIC_BACKEND_URL in your .env file.
 */

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

// ── Helper ──────────────────────────────────────────────────────────────────────

const request = async (path, options = {}) => {
  const url = `${API_URL}/api${path}`;
  const config = {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  };

  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = new Error(`API Error: ${response.status}`);
    error.status = response.status;
    try {
      error.data = await response.json();
    } catch {
      // no json body
    }
    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204) return null;

  return response.json();
};

// ── User API ────────────────────────────────────────────────────────────────────

export const userAPI = {
  create: (data) =>
    request("/users", { method: "POST", body: data }),

  checkUsername: (username) =>
    request(`/users/check-username?username=${encodeURIComponent(username)}`),

  get: (deviceId) =>
    request(`/users/${deviceId}`),

  update: (deviceId, data) =>
    request(`/users/${deviceId}`, { method: "PUT", body: data }),

  updateOutsideStatus: (deviceId, isOutside) =>
    request(`/users/${deviceId}/outside-status`, {
      method: "POST",
      body: { device_id: deviceId, is_outside: isOutside },
    }),

  checkIn: (deviceId) =>
    request(`/users/${deviceId}/checkin`, { method: "POST" }),
};

// ── Steps API ───────────────────────────────────────────────────────────────────

export const stepsAPI = {
  record: (data) =>
    request("/steps", { method: "POST", body: data }),

  getToday: (deviceId) =>
    request(`/steps/${deviceId}/today`),

  getHistory: (deviceId, days = 7) =>
    request(`/steps/${deviceId}/history?days=${days}`),

  getWeeklySummary: (deviceId) =>
    request(`/steps/${deviceId}/weekly-summary`),
};

// ── Leaderboard API ─────────────────────────────────────────────────────────────

export const leaderboardAPI = {
  get: (period = "daily", city, borough) => {
    const params = new URLSearchParams({ period });
    if (city) params.append("city", city);
    if (borough) params.append("borough", borough);
    return request(`/leaderboard?${params.toString()}`);
  },

  getCities: () =>
    request("/leaderboard/cities"),
};

// ── Community API ───────────────────────────────────────────────────────────────

export const communityAPI = {
  getOutsideNow: (city) =>
    request(`/community/outside-now${city ? `?city=${city}` : ""}`),
};

// ── Challenges API ──────────────────────────────────────────────────────────────

export const challengesAPI = {
  getAll: (city) =>
    request(`/challenges${city ? `?city=${city}` : ""}`),

  join: (challengeId, deviceId) =>
    request(`/challenges/${challengeId}/join?device_id=${deviceId}`, { method: "POST" }),
};

// ── Groups API ──────────────────────────────────────────────────────────────────

export const groupsAPI = {
  create: (data) =>
    request("/groups", { method: "POST", body: data }),

  get: (groupId) =>
    request(`/groups/${groupId}`),

  getUserGroups: (deviceId) =>
    request(`/groups/user/${deviceId}`),

  join: (groupId, deviceId) =>
    request(`/groups/${groupId}/join?device_id=${deviceId}`, { method: "POST" }),

  joinByCode: (inviteCode, deviceId) =>
    request(`/groups/join-by-code?invite_code=${inviteCode}&device_id=${deviceId}`, { method: "POST" }),

  leave: (groupId, deviceId) =>
    request(`/groups/${groupId}/leave?device_id=${deviceId}`, { method: "POST" }),

  getMembers: (groupId) =>
    request(`/groups/${groupId}/members`),

  getLeaderboard: (groupId, period = "daily") =>
    request(`/groups/${groupId}/leaderboard?period=${period}`),

  // Chat
  sendMessage: (groupId, data) =>
    request(`/groups/${groupId}/messages`, { method: "POST", body: { group_id: groupId, ...data } }),

  getMessages: (groupId, limit = 50) =>
    request(`/groups/${groupId}/messages?limit=${limit}`),

  // Group Challenges
  createChallenge: (groupId, data) =>
    request(`/groups/${groupId}/challenges`, { method: "POST", body: { group_id: groupId, ...data } }),

  getChallenges: (groupId) =>
    request(`/groups/${groupId}/challenges`),

  getChallengeProgress: (groupId, challengeId) =>
    request(`/groups/${groupId}/challenges/${challengeId}/progress`),
};

// ── Stats API ───────────────────────────────────────────────────────────────────

export const statsAPI = {
  getUserStats: (deviceId) =>
    request(`/stats/${deviceId}`),
};

// ── Missions API ────────────────────────────────────────────────────────────────

export const missionsAPI = {
  create: (data) =>
    request("/missions", { method: "POST", body: data }),

  get: (missionId) =>
    request(`/missions/${missionId}`),

  getProgress: (missionId) =>
    request(`/missions/${missionId}/progress`),

  getForUser: (deviceId, status) =>
    request(`/missions/user/${deviceId}${status ? `?status=${status}` : ""}`),

  accept: (missionId, deviceId) =>
    request(`/missions/${missionId}/accept?device_id=${deviceId}`, { method: "POST" }),

  decline: (missionId, deviceId) =>
    request(`/missions/${missionId}/decline?device_id=${deviceId}`, { method: "POST" }),

  forfeit: (missionId, deviceId) =>
    request(`/missions/${missionId}/forfeit?device_id=${deviceId}`, { method: "POST" }),
};
