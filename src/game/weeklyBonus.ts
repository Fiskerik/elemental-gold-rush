export type WeeklyPlayMilestoneId = "mon-wed" | "thu-sat" | "full-week";

export interface WeeklyPlayBonusState {
  weekStartDate: string;
  claimedDates: string[];
  awardedMilestones: WeeklyPlayMilestoneId[];
}

export interface WeeklyPlayBonusDay {
  dateKey: string;
  label: string;
  rewardLabel: string;
  claimed: boolean;
  isToday: boolean;
  isPast: boolean;
}

export interface WeeklyPlayBonusView {
  days: WeeklyPlayBonusDay[];
  claimedCount: number;
  weekCoinsEarned: number;
  todayClaimed: boolean;
  nextRewardText: string;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKDAY_REWARD_LABELS = ["1/3", "2/3", "+1", "1/3", "2/3", "+1", "+2"] as const;

const WEEKLY_PLAY_MILESTONES: Array<{
  id: WeeklyPlayMilestoneId;
  dayIndices: number[];
  coins: number;
}> = [
  { id: "mon-wed", dayIndices: [0, 1, 2], coins: 1 },
  { id: "thu-sat", dayIndices: [3, 4, 5], coins: 1 },
  { id: "full-week", dayIndices: [0, 1, 2, 3, 4, 5, 6], coins: 2 },
];

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

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getWeeklyPlayWeekStart(date = new Date()): string {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return toDateKey(start);
}

export function createWeeklyPlayBonus(date = new Date()): WeeklyPlayBonusState {
  return {
    weekStartDate: getWeeklyPlayWeekStart(date),
    claimedDates: [],
    awardedMilestones: [],
  };
}

function getWeekDateKeys(weekStartDate: string): string[] {
  const weekStart = fromDateKey(weekStartDate);
  return WEEKDAY_LABELS.map((_, index) => toDateKey(addDays(weekStart, index)));
}

function normalizeWeeklyPlayBonus(
  bonus: Partial<WeeklyPlayBonusState> | undefined,
  date = new Date(),
): WeeklyPlayBonusState {
  const weekStartDate = getWeeklyPlayWeekStart(date);
  if (bonus?.weekStartDate !== weekStartDate) return createWeeklyPlayBonus(date);

  const weekDates = new Set(getWeekDateKeys(weekStartDate));
  return {
    weekStartDate,
    claimedDates: Array.from(new Set(bonus.claimedDates ?? [])).filter((day) =>
      weekDates.has(day),
    ),
    awardedMilestones: Array.from(new Set(bonus.awardedMilestones ?? [])).filter((id) =>
      WEEKLY_PLAY_MILESTONES.some((milestone) => milestone.id === id),
    ) as WeeklyPlayMilestoneId[],
  };
}

export function claimWeeklyPlayBonus(
  bonus: Partial<WeeklyPlayBonusState> | undefined,
  date = new Date(),
): {
  weeklyPlayBonus: WeeklyPlayBonusState;
  coinsAwarded: number;
  awardedMilestones: WeeklyPlayMilestoneId[];
} {
  const today = toDateKey(date);
  const normalized = normalizeWeeklyPlayBonus(bonus, date);
  const claimedDates = normalized.claimedDates.includes(today)
    ? normalized.claimedDates
    : [...normalized.claimedDates, today];
  const weekDates = getWeekDateKeys(normalized.weekStartDate);
  const claimedSet = new Set(claimedDates);
  const awardedMilestones = [...normalized.awardedMilestones];
  const awardedNow: WeeklyPlayMilestoneId[] = [];
  let coinsAwarded = 0;

  for (const milestone of WEEKLY_PLAY_MILESTONES) {
    if (awardedMilestones.includes(milestone.id)) continue;
    const complete = milestone.dayIndices.every((index) => claimedSet.has(weekDates[index]));
    if (!complete) continue;
    awardedMilestones.push(milestone.id);
    awardedNow.push(milestone.id);
    coinsAwarded += milestone.coins;
  }

  return {
    weeklyPlayBonus: {
      ...normalized,
      claimedDates,
      awardedMilestones,
    },
    coinsAwarded,
    awardedMilestones: awardedNow,
  };
}

export function getWeeklyPlayBonusView(
  bonus: Partial<WeeklyPlayBonusState> | undefined,
  date = new Date(),
): WeeklyPlayBonusView {
  const normalized = normalizeWeeklyPlayBonus(bonus, date);
  const today = toDateKey(date);
  const weekDates = getWeekDateKeys(normalized.weekStartDate);
  const claimedSet = new Set(normalized.claimedDates);
  const todayIndex = weekDates.indexOf(today);
  const weekCoinsEarned = WEEKLY_PLAY_MILESTONES.reduce(
    (sum, milestone) =>
      normalized.awardedMilestones.includes(milestone.id) ? sum + milestone.coins : sum,
    0,
  );
  const nextMilestone = WEEKLY_PLAY_MILESTONES.find(
    (milestone) => !normalized.awardedMilestones.includes(milestone.id),
  );

  return {
    days: weekDates.map((dateKey, index) => ({
      dateKey,
      label: WEEKDAY_LABELS[index],
      rewardLabel: WEEKDAY_REWARD_LABELS[index],
      claimed: claimedSet.has(dateKey),
      isToday: dateKey === today,
      isPast: todayIndex >= 0 && index < todayIndex,
    })),
    claimedCount: normalized.claimedDates.length,
    weekCoinsEarned,
    todayClaimed: claimedSet.has(today),
    nextRewardText: nextMilestone
      ? `${nextMilestone.coins} coin${nextMilestone.coins === 1 ? "" : "s"} at ${WEEKDAY_LABELS[nextMilestone.dayIndices.at(-1) ?? 0]}`
      : "Full week complete",
  };
}
