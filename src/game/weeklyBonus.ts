export interface WeeklyPlayBonusState {
  lastClaimDate: string | null;
  currentStreak: number;
  claimedDates: string[];
}

export interface WeeklyPlayBonusDay {
  index: number;
  label: string;
  rewardLabel: string;
  claimed: boolean;
  isToday: boolean;
}

export interface WeeklyPlayBonusView {
  days: WeeklyPlayBonusDay[];
  currentStreak: number;
  cycleProgress: number;
  todayClaimed: boolean;
  coinsEarnedToday: number;
  nextRewardText: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(fromDateKeyValue: string, toDateKeyValue: string): number {
  const from = fromDateKey(fromDateKeyValue);
  const to = fromDateKey(toDateKeyValue);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

export function createWeeklyPlayBonus(): WeeklyPlayBonusState {
  return {
    lastClaimDate: null,
    currentStreak: 0,
    claimedDates: [],
  };
}

function normalizeWeeklyPlayBonus(
  bonus: Partial<WeeklyPlayBonusState> | undefined,
): WeeklyPlayBonusState {
  return {
    lastClaimDate: bonus?.lastClaimDate ?? null,
    currentStreak: Math.max(0, Math.floor(bonus?.currentStreak ?? 0)),
    claimedDates: Array.from(new Set(bonus?.claimedDates ?? [])).slice(-7),
  };
}

export function claimWeeklyPlayBonus(
  bonus: Partial<WeeklyPlayBonusState> | undefined,
  date = new Date(),
): {
  weeklyPlayBonus: WeeklyPlayBonusState;
  coinsAwarded: number;
  bonusAwarded: number;
} {
  const today = toDateKey(date);
  const normalized = normalizeWeeklyPlayBonus(bonus);
  if (normalized.lastClaimDate === today) {
    return { weeklyPlayBonus: normalized, coinsAwarded: 0, bonusAwarded: 0 };
  }

  const continuedStreak =
    normalized.lastClaimDate != null && daysBetween(normalized.lastClaimDate, today) === 1;
  const currentStreak = continuedStreak ? normalized.currentStreak + 1 : 1;
  const bonusAwarded = currentStreak % 7 === 0 ? 5 : 0;

  return {
    weeklyPlayBonus: {
      lastClaimDate: today,
      currentStreak,
      claimedDates: [...(continuedStreak ? normalized.claimedDates : []), today].slice(-7),
    },
    coinsAwarded: 1 + bonusAwarded,
    bonusAwarded,
  };
}

export function getWeeklyPlayBonusView(
  bonus: Partial<WeeklyPlayBonusState> | undefined,
  date = new Date(),
): WeeklyPlayBonusView {
  const normalized = normalizeWeeklyPlayBonus(bonus);
  const today = toDateKey(date);
  const todayClaimed = normalized.lastClaimDate === today;
  const cycleProgress = normalized.currentStreak === 0 ? 0 : ((normalized.currentStreak - 1) % 7) + 1;
  const nextProgress = todayClaimed ? cycleProgress : Math.min(7, cycleProgress + 1);
  const remainingToBonus = Math.max(0, 7 - cycleProgress);

  return {
    days: Array.from({ length: 7 }, (_, index) => {
      const dayNumber = index + 1;
      const claimed = cycleProgress >= dayNumber;
      return {
        index: dayNumber,
        label: `Day ${dayNumber}`,
        rewardLabel: dayNumber === 7 ? "+1 +5" : "+1",
        claimed,
        isToday: todayClaimed ? cycleProgress === dayNumber : nextProgress === dayNumber,
      };
    }),
    currentStreak: normalized.currentStreak,
    cycleProgress,
    todayClaimed,
    coinsEarnedToday:
      todayClaimed && normalized.currentStreak > 0
        ? 1 + (normalized.currentStreak % 7 === 0 ? 5 : 0)
        : 0,
    nextRewardText:
      remainingToBonus <= 0
        ? "5 bonus coins earned"
        : `${remainingToBonus} day${remainingToBonus === 1 ? "" : "s"} to +5 bonus coins`,
  };
}
