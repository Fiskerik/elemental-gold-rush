import { ELEMENTS } from "./elements";

export type DailyQuestType =
  | "merge_atoms"
  | "discover_elements"
  | "reach_category"
  | "clear_level"
  | "chain_merge"
  | "earn_stars"
  | "purchase_item"
  | "upgrade_powerup"
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
  powerUpsUpgraded?: number;
  adsWatched?: number;
  uniquePowerUpsUsedInRun?: number;
  stonesDestroyed?: number;
  unstableMergesInRun?: number;
  runScore?: number;
  comboReactionsInRun?: number;
  secretCompoundCleared?: boolean;
}

export interface DailyQuestGenerationContext {
  unlockedLevel?: number;
  goldCoins?: number;
  hasProPack?: boolean;
  isNativeIos?: boolean;
  discoveredElements?: number[];
  affordableUpgrade?: boolean;
}

export const DAILY_RESET_TIME_ZONE = "Europe/Stockholm";

const dailyResetDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DAILY_RESET_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getStockholmDateParts(date: Date): Record<string, number> {
  return dailyResetDateFormatter.formatToParts(date).reduce<Record<string, number>>(
    (parts, part) => {
      if (part.type !== "literal") parts[part.type] = Number(part.value);
      return parts;
    },
    {},
  );
}

function addCalendarDay(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function stockholmOffsetMs(date: Date): number {
  const parts = getStockholmDateParts(date);
  const displayedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return displayedAsUtc - date.getTime();
}

function stockholmMidnight(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const naiveUtcMs = Date.UTC(year, month - 1, day);
  let timestamp = naiveUtcMs;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    timestamp = naiveUtcMs - stockholmOffsetMs(new Date(timestamp));
  }
  return new Date(timestamp);
}

export function getTodayQuestDate(date = new Date()): string {
  const parts = getStockholmDateParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getNextDailyReset(date = new Date()): Date {
  let reset = stockholmMidnight(addCalendarDay(getTodayQuestDate(date)));
  if (reset.getTime() <= date.getTime()) {
    reset = stockholmMidnight(addCalendarDay(addCalendarDay(getTodayQuestDate(date))));
  }
  return reset;
}

export function getTimeUntilDailyResetMs(date = new Date()): number {
  return Math.max(0, getNextDailyReset(date).getTime() - date.getTime());
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
    slug: "secret-compound",
    type: "secret_compound",
    title: "Solve today's Daily Compound",
    description: "Find the hidden molecule in the daily research grid.",
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
    slug: "upgrade-powerup",
    type: "upgrade_powerup",
    title: "Upgrade a power-up",
    description: "Research one permanent Lab power-up upgrade.",
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
    description: "Create ten combo reactions across today's runs.",
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

export function createDailyQuests(
  dateKey = getTodayQuestDate(),
  context: DailyQuestGenerationContext = {},
): DailyQuest[] {
  const level = context.unlockedLevel ?? 1;
  const affordableUpgrade = context.affordableUpgrade ?? Boolean((context.goldCoins ?? 0) >= 10 && level >= 5);
  const eligible = DAILY_QUEST_POOL.filter((quest) => {
    if (quest.type === "watch_ad") return context.isNativeIos ?? false;
    if (quest.type === "purchase_item") return (context.goldCoins ?? 0) >= 6 && level >= 1;
    if (quest.type === "upgrade_powerup") return affordableUpgrade;
    if (quest.type === "use_unique_powerups") return level >= 10;
    if (quest.type === "destroy_stone") return level >= 30;
    if (quest.type === "merge_unstable") return level >= 20;
    if (quest.type === "single_game_score") return level >= 10;
    if (quest.type === "discover_elements") return (context.discoveredElements?.length ?? 0) < ELEMENTS.length;
    return true;
  });
  const core = eligible.length >= 6 ? eligible : DAILY_QUEST_POOL.filter((quest) => ["clear_level", "secret_compound", "discover_elements", "earn_stars", "chain_merge", "merge_atoms", "combo_reactions"].includes(quest.type) && (quest.type !== "discover_elements" || (context.discoveredElements?.length ?? 0) < ELEMENTS.length));
  return shuffleForDate(core, dateKey)
    .slice(0, 6)
    .map((quest) => ({
      id: `${dateKey}-${quest.slug}`,
      type: quest.type,
      title: quest.title,
      description: quest.description,
      target: quest.type === "single_game_score"
        ? Math.max(5_000, Math.min(50_000, Math.max(1, level) * 2_500))
        : quest.target,
      progress: 0,
      completed: false,
      category: quest.category,
    }));
}

export function refreshDailyQuests(
  dailyQuestDate: string,
  dailyQuests: DailyQuest[],
  claimedDailyReward: boolean,
  context: DailyQuestGenerationContext = {},
) {
  const today = getTodayQuestDate();
  if (dailyQuestDate === today && dailyQuests.length > 0) {
    const current = removeRetiredDailyQuests(dailyQuests);
    return {
      dailyQuestDate,
      dailyQuests: current.length === 6 ? current : createDailyQuests(today, context),
      claimedDailyReward,
    };
  }

  return {
    dailyQuestDate: today,
    dailyQuests: createDailyQuests(today, context),
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
    if (quest.type === "upgrade_powerup" && event.powerUpsUpgraded) progress += event.powerUpsUpgraded;
    if (quest.type === "watch_ad" && event.adsWatched) progress += event.adsWatched;
    if (quest.type === "use_unique_powerups" && event.uniquePowerUpsUsedInRun !== undefined) progress = Math.max(progress, event.uniquePowerUpsUsedInRun);
    if (quest.type === "destroy_stone" && event.stonesDestroyed) progress += event.stonesDestroyed;
    if (quest.type === "merge_unstable" && event.unstableMergesInRun !== undefined) progress = Math.max(progress, event.unstableMergesInRun);
    if (quest.type === "single_game_score" && event.runScore !== undefined) progress = Math.max(progress, event.runScore);
    if (quest.type === "combo_reactions" && event.comboReactionsInRun) progress += event.comboReactionsInRun;
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
