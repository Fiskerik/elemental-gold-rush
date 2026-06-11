import { COMPOUNDS } from "./compounds";
import { LEVELS } from "./levels";
import { getTodayQuestDate } from "./quests";

export const DAILY_FEATURE_REWARD_COINS = 5;

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

export function createDailyChallenge(date = getTodayQuestDate()): DailyChallengeState {
  const eligible = LEVELS.filter((level) => !level.specialStage && !level.powerUpStage && level.id >= 5);
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
  if (current?.date === date) return current;
  return createDailyChallenge(date);
}

export function refreshSecretCompoundState(
  current: SecretCompoundState | undefined,
  date = getTodayQuestDate(),
): SecretCompoundState {
  if (current?.date === date && current.compoundId) return current;
  return createSecretCompound(date);
}