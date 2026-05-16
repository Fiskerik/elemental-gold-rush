import { ELEMENTS } from "./elements";

export type DailyQuestType =
  | "merge_atoms"
  | "discover_elements"
  | "reach_category"
  | "clear_level"
  | "chain_merge"
  | "earn_stars"
  | "purchase_item";

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
  reachedAtomicNumbers?: number[];
  levelCleared?: boolean;
  maxChainDepth?: number;
  starsEarned?: number;
  itemsPurchased?: number;
}

export function getTodayQuestDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

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
  // Retire any quests not in the current 6-quest daily set. Quest ids are
  // `${YYYY-MM-DD}-${slug}`; match by suffix since the date itself contains
  // dashes.
  const allowedSlugs = [
    "clear-level",
    "discover-element",
    "earn-stars",
    "chain-merge",
    "merge-atoms",
    "purchase-item",
  ];
  return !allowedSlugs.some((slug) => quest.id.endsWith(`-${slug}`));
}

function removeRetiredDailyQuests(quests: DailyQuest[]): DailyQuest[] {
  return quests.filter((quest) => !isRemovedDailyQuest(quest));
}

export function createDailyQuests(dateKey = getTodayQuestDate()): DailyQuest[] {
  return [
    {
      id: `${dateKey}-clear-level`,
      type: "clear_level",
      title: "Clear 1 stage",
      description: "Complete any campaign level without a game over.",
      target: 1,
      progress: 0,
      completed: false,
    },
    {
      id: `${dateKey}-discover-element`,
      type: "discover_elements",
      title: "Discover 1 element",
      description: "Reveal a new periodic-table entry.",
      target: 1,
      progress: 0,
      completed: false,
    },
    {
      id: `${dateKey}-earn-stars`,
      type: "earn_stars",
      title: "Earn 3 stars",
      description: "Collect three stars across today's runs.",
      target: 3,
      progress: 0,
      completed: false,
    },
    {
      id: `${dateKey}-chain-merge`,
      type: "chain_merge",
      title: "Trigger a 4-step chain",
      description: "Land a shot that causes four cascading merges.",
      target: 4,
      progress: 0,
      completed: false,
    },
    {
      id: `${dateKey}-merge-atoms`,
      type: "merge_atoms",
      title: "Merge 50 atoms",
      description: "Create reactions by merging matching atoms.",
      target: 50,
      progress: 0,
      completed: false,
    },
    {
      id: `${dateKey}-purchase-item`,
      type: "purchase_item",
      title: "Purchase an item from the shop",
      description: "Spend saved score on any shop power-up.",
      target: 1,
      progress: 0,
      completed: false,
    },
  ];
}

export function refreshDailyQuests(
  dailyQuestDate: string,
  dailyQuests: DailyQuest[],
  claimedDailyReward: boolean,
) {
  const today = getTodayQuestDate();
  if (dailyQuestDate === today && dailyQuests.length > 0) {
    return {
      dailyQuestDate,
      dailyQuests: removeRetiredDailyQuests(dailyQuests),
      claimedDailyReward,
    };
  }

  return {
    dailyQuestDate: today,
    dailyQuests: removeRetiredDailyQuests(createDailyQuests(today)),
    claimedDailyReward: false,
  };
}

export function applyQuestProgress(quests: DailyQuest[], event: QuestProgressEvent): DailyQuest[] {
  return removeRetiredDailyQuests(quests).map((quest) => {
    let progress = quest.progress;

    if (quest.type === "merge_atoms" && event.merges) {
      progress += event.merges;
    }

    if (quest.type === "discover_elements" && event.discoveries) {
      progress += event.discoveries.length;
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

    if (quest.type === "clear_level" && event.levelCleared) {
      progress += 1;
    }

    if (quest.type === "chain_merge" && event.maxChainDepth !== undefined) {
      progress = Math.max(progress, event.maxChainDepth);
    }

    if (quest.type === "earn_stars" && event.starsEarned) {
      progress += event.starsEarned;
    }

    if (quest.type === "purchase_item" && event.itemsPurchased) {
      progress += event.itemsPurchased;
    }

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
