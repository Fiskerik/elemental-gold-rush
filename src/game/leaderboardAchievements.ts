export const DAILY_BOARD_LEADERBOARD_ACHIEVEMENT_IDS = [
  "daily-board-gold",
  "daily-board-silver",
  "daily-board-bronze",
  "daily-board-top-5",
  "daily-board-top-10",
  "daily-board-top-20",
] as const;

export type DailyBoardLeaderboardAchievementId =
  (typeof DAILY_BOARD_LEADERBOARD_ACHIEVEMENT_IDS)[number];

export interface DailyBoardLeaderboardAchievement {
  id: DailyBoardLeaderboardAchievementId;
  name: string;
  description: string;
  icon: string;
}

export const DAILY_BOARD_LEADERBOARD_ACHIEVEMENTS: DailyBoardLeaderboardAchievement[] = [
  {
    id: "daily-board-gold",
    name: "Gold",
    description: "Rank #1 on the Global Daily Board.",
    icon: "Au",
  },
  {
    id: "daily-board-silver",
    name: "Silver",
    description: "Rank #2 on the Global Daily Board.",
    icon: "Ag",
  },
  {
    id: "daily-board-bronze",
    name: "Bronze",
    description: "Rank #3 on the Global Daily Board.",
    icon: "Cu",
  },
  {
    id: "daily-board-top-5",
    name: "Top 5%",
    description: "Finish in the top 5% of the Global Daily Board with 50+ players.",
    icon: "5%",
  },
  {
    id: "daily-board-top-10",
    name: "Top 10%",
    description: "Finish in the top 10% of the Global Daily Board with 50+ players.",
    icon: "10%",
  },
  {
    id: "daily-board-top-20",
    name: "Top 20%",
    description: "Finish in the top 20% of the Global Daily Board with 50+ players.",
    icon: "20%",
  },
];

const MIN_PLAYERS_FOR_PERCENTAGE_BADGES = 50;

export type DailyBoardLeaderboardAchievementCounts = Record<
  DailyBoardLeaderboardAchievementId,
  number
>;

export function emptyDailyBoardLeaderboardAchievementCounts(): DailyBoardLeaderboardAchievementCounts {
  return Object.fromEntries(
    DAILY_BOARD_LEADERBOARD_ACHIEVEMENT_IDS.map((id) => [id, 0]),
  ) as DailyBoardLeaderboardAchievementCounts;
}

export function normalizeDailyBoardLeaderboardAchievementCounts(
  counts: Partial<Record<DailyBoardLeaderboardAchievementId, number>> | undefined,
): DailyBoardLeaderboardAchievementCounts {
  const next = emptyDailyBoardLeaderboardAchievementCounts();
  for (const id of DAILY_BOARD_LEADERBOARD_ACHIEVEMENT_IDS) {
    next[id] = Math.max(0, Math.floor(counts?.[id] ?? 0));
  }
  return next;
}

export function getDailyBoardLeaderboardAchievementIds(
  rank: number,
  totalPlayerCount: number,
): DailyBoardLeaderboardAchievementId[] {
  const normalizedRank = Math.max(0, Math.floor(rank));
  const normalizedTotal = Math.max(0, Math.floor(totalPlayerCount));
  if (normalizedRank <= 0 || normalizedTotal <= 0) return [];

  const ids: DailyBoardLeaderboardAchievementId[] = [];
  if (normalizedRank === 1) ids.push("daily-board-gold");
  if (normalizedRank === 2) ids.push("daily-board-silver");
  if (normalizedRank === 3) ids.push("daily-board-bronze");

  if (normalizedTotal >= MIN_PLAYERS_FOR_PERCENTAGE_BADGES) {
    const percentile = normalizedRank / normalizedTotal;
    if (percentile <= 0.05) ids.push("daily-board-top-5");
    if (percentile <= 0.1) ids.push("daily-board-top-10");
    if (percentile <= 0.2) ids.push("daily-board-top-20");
  }

  return ids;
}
