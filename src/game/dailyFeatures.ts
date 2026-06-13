import { COMPOUNDS } from "./compounds";
import { LEVELS } from "./levels";
import { getTodayQuestDate } from "./quests";

export const DAILY_FEATURE_REWARD_COINS = 3;
const DAILY_CHALLENGE_MIN_TARGET_ATOM = 10;
const DAILY_CHALLENGE_MAX_TARGET_ATOM = 60;

export interface DailyChallengeState {
  date: string;
  levelId: number;
  completed: boolean;
  rewardClaimed: boolean;
  bestScore: number;
}

export interface SecretCompoundState {
  date: string;
  compoundId: string;
  revealed: boolean;
  completed: boolean;
  rewardClaimed: boolean;
}

export function hashDailySeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function isEligibleDailyChallengeLevel(level: (typeof LEVELS)[number] | undefined): boolean {
  return Boolean(
    level &&
      !level.specialStage &&
      !level.powerUpStage &&
      level.targetElement >= DAILY_CHALLENGE_MIN_TARGET_ATOM &&
      level.targetElement <= DAILY_CHALLENGE_MAX_TARGET_ATOM,
  );
}

export function createDailyChallenge(date = getTodayQuestDate()): DailyChallengeState {
  const eligible = LEVELS.filter(isEligibleDailyChallengeLevel);
  const levels = eligible.length ? eligible : LEVELS;
  const index = hashDailySeed(`challenge-${date}`) % levels.length;
  return {
    date,
    levelId: levels[index]?.id ?? 1,
    completed: false,
    rewardClaimed: false,
    bestScore: 0,
  };
}

export function createSecretCompound(date = getTodayQuestDate()): SecretCompoundState {
  const compounds = COMPOUNDS.length ? COMPOUNDS : [];
  const index = compounds.length ? hashDailySeed(`secret-compound-${date}`) % compounds.length : 0;
  return {
    date,
    compoundId: compounds[index]?.id ?? "",
    revealed: false,
    completed: false,
    rewardClaimed: false,
  };
}

export function refreshDailyChallengeState(
  current: DailyChallengeState | undefined,
  date = getTodayQuestDate(),
): DailyChallengeState {
  const currentLevel = LEVELS.find((level) => level.id === current?.levelId);
  if (current?.date === date && isEligibleDailyChallengeLevel(currentLevel)) return current;
  return createDailyChallenge(date);
}

export function refreshSecretCompoundState(
  current: SecretCompoundState | undefined,
  date = getTodayQuestDate(),
): SecretCompoundState {
  if (current?.date === date && current.compoundId) return current;
  return createSecretCompound(date);
}
