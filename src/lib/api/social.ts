import { api } from "../api";

export type SocialStats = {
  likes: { liked: boolean; count: number };
  comments: { count: number };
  favorites: { favorited: boolean; count: number };
  shares: { count: number };
  views?: { count: number };
};

export type Comment = {
  _id: string;
  gameId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
};

export type CommentsPage = {
  comments: Comment[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ─── Aggregate ─────────────────────────────────────────────────────────────

export async function fetchSocialStats(gameId: string, userId?: string): Promise<SocialStats> {
  const params = userId ? { userId } : {};
  const { data } = await api.get(`/social/stats/${gameId}`, { params });
  return data;
}

// ─── Likes ─────────────────────────────────────────────────────────────────

export async function toggleLike(gameId: string, userId: string) {
  const { data } = await api.post("/social/likes/toggle", { gameId, userId });
  return data as { liked: boolean; count: number };
}

export async function fetchLikeStatus(gameId: string, userId?: string) {
  const params = userId ? { userId } : {};
  const { data } = await api.get(`/social/likes/${gameId}`, { params });
  return data as { liked: boolean; count: number };
}

// ─── Comments ──────────────────────────────────────────────────────────────

export async function postComment(
  gameId: string,
  userId: string,
  username: string,
  text: string,
) {
  const { data } = await api.post("/social/comments", { gameId, userId, username, text });
  return data as { comment: Comment; count: number };
}

export async function fetchComments(gameId: string, page = 1, limit = 20) {
  const { data } = await api.get(`/social/comments/${gameId}`, { params: { page, limit } });
  return data as CommentsPage;
}

export async function removeComment(commentId: string, userId: string) {
  const { data } = await api.delete(`/social/comments/${commentId}`, { data: { userId } });
  return data as { deleted: boolean };
}

// ─── Favorites ─────────────────────────────────────────────────────────────

export async function toggleFavorite(gameId: string, userId: string) {
  const { data } = await api.post("/social/favorites/toggle", { gameId, userId });
  return data as { favorited: boolean; count: number };
}

export async function fetchFavoriteStatus(gameId: string, userId?: string) {
  const params = userId ? { userId } : {};
  const { data } = await api.get(`/social/favorites/${gameId}`, { params });
  return data as { favorited: boolean; count: number };
}

// ─── Shares ────────────────────────────────────────────────────────────────

export type SharePlatform = "link" | "twitter" | "discord" | "telegram" | "whatsapp" | "embed" | "instagram" | "email";

export async function recordShare(
  gameId: string,
  userId: string,
  platform: SharePlatform = "link",
) {
  const { data } = await api.post("/social/shares", { gameId, userId, platform });
  return data as { shared: boolean; count: number };
}

export async function fetchShareCount(gameId: string) {
  const { data } = await api.get(`/social/shares/${gameId}`);
  return data as { count: number };
}

export type UserActivity = {
  _id: string;
  userId: string;
  gameId: string | null;
  gameTitle: string | null;
  activityType: "like" | "favorite" | "share" | "comment" | "create" | "play";
  details: string;
  timestamp: string;
};

export async function fetchUserActivities(userId: string): Promise<UserActivity[]> {
  const { data } = await api.get(`/social/activity/user/${userId}`);
  return data as UserActivity[];
}

export type UserFavoritesResponse = {
  favorites: Array<{ gameId: string; userId: string; createdAt: string }>;
  count: number;
};

export type UserLikesResponse = {
  likes: Array<{ gameId: string; userId: string; createdAt: string }>;
  count: number;
};

export async function fetchUserFavorites(userId: string): Promise<UserFavoritesResponse> {
  const { data } = await api.get(`/social/favorites/user/${userId}`);
  return data as UserFavoritesResponse;
}

export async function fetchUserLikes(userId: string): Promise<UserLikesResponse> {
  const { data } = await api.get(`/social/likes/user/${userId}`);
  return data as UserLikesResponse;
}


// ─── Views (plays) ───────────────────────────────────────────────────────────

export async function recordView(gameId: string, userId: string) {
  const { data } = await api.post(`/social/views/${encodeURIComponent(gameId)}`, { userId });
  return data as { gameId: string; views: number };
}

// ─── Follows ─────────────────────────────────────────────────────────────────

export type FollowStatus = { creatorId: string; following: boolean; followers: number };

export async function fetchFollowStatus(creatorId: string, userId: string) {
  const { data } = await api.get(`/social/follows/${encodeURIComponent(creatorId)}`, {
    params: { userId },
  });
  return data as FollowStatus;
}

export async function toggleFollowApi(creatorId: string, userId: string) {
  const { data } = await api.post(`/social/follows/toggle`, { creatorId, userId });
  return data as FollowStatus;
}

export type CreatorStats = {
  creatorId: string;
  games: number;
  plays: number;
  likes: number;
  followers: number;
};

export async function fetchCreatorStats(creatorId: string) {
  const { data } = await api.get(`/social/creator-stats/${encodeURIComponent(creatorId)}`);
  return data as CreatorStats;
}
