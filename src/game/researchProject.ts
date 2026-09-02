import { COMPOUNDS } from "./compounds";
import { ELEMENTS } from "./elements";
import { LEVELS } from "./levels";

export type ResearchProgressSource = "campaign" | "daily-board" | "daily-compound" | "challenge";

export interface ResearchProjectState {
  projectNumber: number;
  startDate: string | null;
  resetDate: string | null;
  completedDates: string[];
  completed: boolean;
  rewardClaimed: boolean;
}

export interface NextDiscoveryTarget {
  /** Canonical fields used by the retention surfaces. */
  targetElement: number | null;
  targetCampaignLevel: number | null;
  immediatePrerequisite: number | null;
  immediatePrerequisiteName: string | null;
  completionFallback: "compound" | "challenge" | null;
  targetAtomicNumber: number | null;
  targetElementName: string;
  targetLevelId: number | null;
  immediatePrerequisiteLevelId: number | null;
  stagesRemaining: number;
  fallbackKind: "element" | "compound" | "challenge";
  fallbackId: string | null;
}

export function createResearchProject(projectNumber = 1): ResearchProjectState {
  return {
    projectNumber,
    startDate: null,
    resetDate: null,
    completedDates: [],
    completed: false,
    rewardClaimed: false,
  };
}

export function normalizeResearchProject(value: Partial<ResearchProjectState> | undefined): ResearchProjectState {
  const projectNumber = Math.max(1, Math.floor(value?.projectNumber ?? 1));
  const validDate = (date: unknown): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const completedDates = Array.isArray(value?.completedDates)
    ? Array.from(new Set(value!.completedDates.filter(validDate))).sort()
    : [];
  return {
    projectNumber,
    startDate: validDate(value?.startDate) ? value.startDate : null,
    resetDate: validDate(value?.resetDate) ? value.resetDate : null,
    completedDates,
    completed: Boolean(value?.completed),
    rewardClaimed: Boolean(value?.rewardClaimed),
  };
}

function dayNumber(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, (month || 1) - 1, day || 1) / 86400000;
}

export function daysBetween(startDate: string, endDate: string): number {
  return Math.max(0, Math.floor(dayNumber(endDate) - dayNumber(startDate)));
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function recordResearchProjectDay(
  state: ResearchProjectState,
  date: string,
  _source: ResearchProgressSource,
): { state: ResearchProjectState; recorded: boolean; projectCompleted: boolean; coinsAwarded: number } {
  let next = normalizeResearchProject(state);
  if (next.completed && !next.completedDates.includes(date)) {
    next = createResearchProject(next.projectNumber + 1);
  }
  if (next.completedDates.length === 0 && !next.startDate) next = { ...next, startDate: date, resetDate: addDays(date, 7) };
  if (next.startDate && daysBetween(next.startDate, date) >= 7 && !next.completed) {
    next = createResearchProject(next.projectNumber + 1);
    next = { ...next, startDate: date };
  }
  if (next.completedDates.includes(date)) {
    return { state: next, recorded: false, projectCompleted: false, coinsAwarded: 0 };
  }
  const completedDates = [...next.completedDates, date].sort();
  const projectCompleted = completedDates.length >= 5;
  const coinsAwarded = projectCompleted && !next.rewardClaimed ? 15 : 0;
  return {
    state: { ...next, completedDates, completed: projectCompleted, rewardClaimed: next.rewardClaimed || projectCompleted },
    recorded: true,
    projectCompleted,
    coinsAwarded,
  };
}

/** Reusable domain helper; the store action wraps this and applies the coin ledger. */
export function recordResearchProgress(
  state: ResearchProjectState,
  date: string,
  source: ResearchProgressSource,
) {
  return recordResearchProjectDay(state, date, source);
}

export function getNextDiscoveryTarget(progress: {
  unlockedLevel: number;
  discoveredElements: number[];
  discoveredCompounds: string[];
}): NextDiscoveryTarget {
  const discovered = new Set(progress.discoveredElements);
  const startLevel = Math.max(1, Math.floor(progress.unlockedLevel));
  // The campaign map is authoritative for the primary home-card target. A
  // player may have discovered that element through a daily board already,
  // but the current campaign stage still needs to be the thing they can
  // continue toward. Only fall back to a later undiscovered stage when the
  // current map entry has no element target (for example a compound or boss).
  const currentLevel = LEVELS.find((level) => level.id === startLevel);
  const currentCampaignTarget = currentLevel?.targetElement;
  const targetLevel =
    (currentLevel && currentCampaignTarget
      ? currentLevel
      : LEVELS.find((level) => level.id >= startLevel && level.targetElement && !discovered.has(level.targetElement))) ??
    LEVELS.find((level) => level.targetElement && !discovered.has(level.targetElement));
  if (targetLevel?.targetElement) {
    const target = ELEMENTS[targetLevel.targetElement - 1];
    const stagesRemaining = targetLevel.id < startLevel ? 1 : Math.max(1, targetLevel.id - startLevel + 1);
    return {
      targetElement: targetLevel.targetElement,
      targetCampaignLevel: targetLevel.id,
      immediatePrerequisite: Math.min(targetLevel.id, startLevel),
      immediatePrerequisiteName: targetLevel.id > startLevel ? (LEVELS.find((level) => level.id === startLevel)?.name ?? null) : null,
      completionFallback: null,
      targetAtomicNumber: targetLevel.targetElement,
      targetElementName: target?.name ?? `Element ${targetLevel.targetElement}`,
      targetLevelId: targetLevel.id,
      immediatePrerequisiteLevelId: Math.min(targetLevel.id, startLevel),
      stagesRemaining,
      fallbackKind: "element",
      fallbackId: String(targetLevel.targetElement),
    };
  }
  const compound = COMPOUNDS.find((item) => !progress.discoveredCompounds.includes(item.id));
  if (compound) {
    return {
      targetElement: null,
      targetCampaignLevel: null,
      immediatePrerequisite: startLevel <= LEVELS.length ? startLevel : null,
      immediatePrerequisiteName: null,
      completionFallback: "compound",
      targetAtomicNumber: null,
      targetElementName: compound.name,
      targetLevelId: null,
      immediatePrerequisiteLevelId: startLevel <= LEVELS.length ? startLevel : null,
      stagesRemaining: 1,
      fallbackKind: "compound",
      fallbackId: compound.id,
    };
  }
  return {
    targetElement: null,
    targetCampaignLevel: null,
    immediatePrerequisite: startLevel <= LEVELS.length ? startLevel : null,
    immediatePrerequisiteName: null,
    completionFallback: "challenge",
    targetAtomicNumber: null,
    targetElementName: "the complete collection",
    targetLevelId: null,
    immediatePrerequisiteLevelId: startLevel <= LEVELS.length ? startLevel : null,
    stagesRemaining: 1,
    fallbackKind: "challenge",
    fallbackId: null,
  };
}

/** The lowest atomic number not yet present in the player's collection. */
export function getLowestUndiscoveredElement(discoveredElements: number[]): number | null {
  const discovered = new Set(discoveredElements);
  return ELEMENTS.find((element) => !discovered.has(element.atomicNumber))?.atomicNumber ?? null;
}
