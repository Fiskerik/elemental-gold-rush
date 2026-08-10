import type { LeaderboardKind } from "./leaderboard";

export const DAILY_LEADERBOARD_REWARDS = {
  1: 10,
  2: 5,
  3: 3,
} as const;

export type DailyLeaderboardPrizeRank = keyof typeof DAILY_LEADERBOARD_REWARDS;

export function getDailyLeaderboardReward(rank: number): number {
  const normalizedRank = Math.floor(rank) as DailyLeaderboardPrizeRank;
  return DAILY_LEADERBOARD_REWARDS[normalizedRank] ?? 0;
}

export function getDailyLeaderboardRewardKey(
  kind: LeaderboardKind,
  date: string,
): string {
  return `${date}:${kind}`;
}
