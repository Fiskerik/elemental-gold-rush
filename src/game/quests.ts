import { ELEMENTS } from "./elements";

export type DailyQuestType =
  | "merge_atoms"
  | "discover_elements"
  | "reach_category"
  | "clear_level"
  | "chain_merge"
  | "earn_stars"
  | "purchase_item"
  | "watch_ad"
  | "use_unique_powerups"
  | "destroy_stone"
  | "merge_unstable"
  | "single_game_score"
  | "combo_reactions"
  | "secret_compound";

export interface DailyQuest {
  id: string;
  type: DailyQuestType;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  category?: string;
}

export interface QuestProgressEvent {
  merges?: number;
  discoveries?: number[];
  compoundDiscoveries?: number;
  reachedAtomicNumbers?: number[];
  levelCleared?: boolean;
  maxChainDepth?: number;
  starsEarned?: number;
  itemsPurchased?: number;
  adsWatched?: number;
  uniquePowerUpsUsedInRun?: number;
  stonesDestroyed?: number;
  unstableMergesInRun?: number;
  runScore?: number;
  comboReactionsInRun?: number;
  secretCompoundCleared?: boolean;
}

export function getTodayQuestDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffleForDate<T>(items: T[], dateKey: string): T[] {
  const shuffled = [...items];
  let seed = hashString(dateKey || getTodayQuestDate());
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const DAILY_QUEST_POOL: Array<Omit<DailyQuest, "id" | "progress" | "completed"> & { slug: string }> = [
  {
    slug: "clear-level",
    type: "clear_level",
    title: "Clear 1 stage",
    description: "Complete any campaign level without a game over.",
    target: 1,
  },
  {
    slug: "discover-element",
    type: "discover_elements",
    title: "Discover 1 element or compound",
    description: "Reveal a new periodic-table entry or synthesize a new compound.",
    target: 1,
  },
  {
    slug: "earn-stars",
    type: "earn_stars",
    title: "Earn 3 stars",
    description: "Collect three stars across today's runs.",
    target: 3,
  },
  {
    slug: "chain-merge",
    type: "chain_merge",
    title: "Trigger a 4-step chain",
    description: "Land a shot that causes four cascading merges.",
    target: 4,
  },
  {
    slug: "merge-atoms",
    type: "merge_atoms",
    title: "Merge 50 atoms",
    description: "Create reactions by merging matching atoms.",
    target: 50,
  },
  {
    slug: "purchase-item",
    type: "purchase_item",
    title: "Purchase an item from the shop",
    description: "Spend saved gold on any shop power-up.",
    target: 1,
  },
  {
    slug: "watch-ad",
    type: "watch_ad",
    title: "Watch 1 ad",
    description: "Finish a rewarded ad for a bonus coin.",
    target: 1,
  },
  {
    slug: "use-unique-powerups",
    type: "use_unique_powerups",
    title: "Use 5 different power-ups",
    description: "Use five different power-up types in a single game.",
    target: 5,
  },
  {
    slug: "destroy-stone",
    type: "destroy_stone",
    title: "Destroy a Stone",
    description: "Break one Stone during a run.",
    target: 1,
  },
  {
    slug: "merge-unstable",
    type: "merge_unstable",
    title: "Merge 5 unstable isotopes",
    description: "Stabilize five unstable isotopes in a single game.",
    target: 5,
  },
  {
    slug: "single-game-score",
    type: "single_game_score",
    title: "Score 50,000 in one game",
    description: "Accumulate 50,000 points or more in a single run.",
    target: 50000,
  },
  {
    slug: "combo-reactions",
    type: "combo_reactions",
    title: "Trigger 10 combo reactions",
    description: "Create ten combo reactions in a single game.",
    target: 10,
  },
];

function isRemovedDailyQuest(quest: DailyQuest): boolean {
  const normalizedTitle = quest.title
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim();
  if (
    normalizedTitle === "reqch transition metal" ||
    normalizedTitle === "reach transition metal"
  ) {
    return true;
  }
  const allowedSlugs = DAILY_QUEST_POOL.map((questTemplate) => questTemplate.slug);
  return !allowedSlugs.some((slug) => quest.id.endsWith(`-${slug}`));
}

function removeRetiredDailyQuests(quests: DailyQuest[]): DailyQuest[] {
  return quests.filter((quest) => !isRemovedDailyQuest(quest));
}

export function createDailyQuests(dateKey = getTodayQuestDate()): DailyQuest[] {
  return shuffleForDate(DAILY_QUEST_POOL, dateKey)
    .slice(0, 6)
    .map((quest) => ({
      id: `${dateKey}-${quest.slug}`,
      type: quest.type,
      title: quest.title,
      description: quest.description,
      target: quest.target,
      progress: 0,
      completed: false,
      category: quest.category,
    }));
}

export function refreshDailyQuests(
  dailyQuestDate: string,
  dailyQuests: DailyQuest[],
  claimedDailyReward: boolean,
) {
  const today = getTodayQuestDate();
  if (dailyQuestDate === today && dailyQuests.length > 0) {
    const current = removeRetiredDailyQuests(dailyQuests);
    return {
      dailyQuestDate,
      dailyQuests: current.length === 6 ? current : createDailyQuests(today),
      claimedDailyReward,
    };
  }

  return {
    dailyQuestDate: today,
    dailyQuests: createDailyQuests(today),
    claimedDailyReward: false,
  };
}

export function applyQuestProgress(quests: DailyQuest[], event: QuestProgressEvent): DailyQuest[] {
  return removeRetiredDailyQuests(quests).map((quest) => {
    let progress = quest.progress;

    if (quest.type === "merge_atoms" && event.merges) {
      progress += event.merges;
    }

    if (quest.type === "discover_elements") {
      if (event.discoveries) progress += event.discoveries.length;
      if (event.compoundDiscoveries) progress += event.compoundDiscoveries;
    }

    if (quest.type === "reach_category" && event.reachedAtomicNumbers) {
      if (quest.category?.startsWith("element-")) {
        const targetAtomicNumber = Number(quest.category.replace("element-", ""));
        const highestReached = Math.max(0, ...event.reachedAtomicNumbers);
        progress = Math.max(progress, Math.min(highestReached, targetAtomicNumber));
      } else {
        const reachedCategory = event.reachedAtomicNumbers.some((atomicNumber) => {
          const element = ELEMENTS[atomicNumber - 1];
          return element?.category === quest.category;
        });
        if (reachedCategory) progress = Math.max(progress, 1);
      }
    }

    if (quest.type === "clear_level" && event.levelCleared) progress += 1;
    if (quest.type === "chain_merge" && event.maxChainDepth !== undefined) progress = Math.max(progress, event.maxChainDepth);
    if (quest.type === "earn_stars" && event.starsEarned) progress += event.starsEarned;
    if (quest.type === "purchase_item" && event.itemsPurchased) progress += event.itemsPurchased;
    if (quest.type === "watch_ad" && event.adsWatched) progress += event.adsWatched;
    if (quest.type === "use_unique_powerups" && event.uniquePowerUpsUsedInRun !== undefined) progress = Math.max(progress, event.uniquePowerUpsUsedInRun);
    if (quest.type === "destroy_stone" && event.stonesDestroyed) progress += event.stonesDestroyed;
    if (quest.type === "merge_unstable" && event.unstableMergesInRun !== undefined) progress = Math.max(progress, event.unstableMergesInRun);
    if (quest.type === "single_game_score" && event.runScore !== undefined) progress = Math.max(progress, event.runScore);
    if (quest.type === "combo_reactions" && event.comboReactionsInRun !== undefined) progress = Math.max(progress, event.comboReactionsInRun);
    if (quest.type === "secret_compound" && event.secretCompoundCleared) progress = quest.target;

    const cappedProgress = Math.min(progress, quest.target);
    return {
      ...quest,
      progress: cappedProgress,
      completed: cappedProgress >= quest.target,
    };
  });
}

export const DAILY_QUEST_CLAIM_THRESHOLD = 4;

export function areDailyQuestsComplete(quests: DailyQuest[]): boolean {
  if (quests.length === 0) return false;
  const completed = quests.filter((q) => q.completed).length;
  return completed >= DAILY_QUEST_CLAIM_THRESHOLD;
}