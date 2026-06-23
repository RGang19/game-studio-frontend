import { api } from "../api";

export type LeaderboardEntry = {
  rank: number;
  gameId: string;
  userId: string;
  username: string;
  score: number;
  createdAt: string;
  updatedAt?: string;
};

export type Leaderboard = {
  gameId: string;
  entries: LeaderboardEntry[];
};

export async function fetchLeaderboard(gameId: string, limit = 500) {
  const { data } = await api.get(`/leaderboards/${gameId}`, { params: { limit } });
  return data as Leaderboard;
}

export async function submitLeaderboardScore(
  gameId: string,
  userId: string,
  username: string,
  score: number,
) {
  const { data } = await api.post(`/leaderboards/${gameId}/scores`, {
    userId,
    username,
    score,
  });
  return data as Leaderboard;
}
