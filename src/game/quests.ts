import { ELEMENTS } from "./elements";

export type DailyQuestType =
  | "merge_atoms"
  | "discover_elements"
  | "reach_category"
  | "clear_level"
  | "chain_merge";

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
}

export function getTodayQuestDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function createDailyQuests(dateKey = getTodayQuestDate()): DailyQuest[] {
  const seed = dateKey.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const categoryPool = ["noble-gas", "transition-metal", "alkali-metal", "metalloid"];
  const category = categoryPool[seed % categoryPool.length];
  const categoryLabel = category.replace(/-/g, " ");

  return [
    {
      id: `${dateKey}-merge-atoms`,
      type: "merge_atoms",
      title: "Merge 25 atoms",
      description: "Create reactions by merging matching atoms.",
      target: 25,
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
      id: `${dateKey}-reach-category`,
      type: "reach_category",
      title: `Reach a ${categoryLabel}`,
      description: "Fuse your way into today's featured category.",
      target: 1,
      progress: 0,
      completed: false,
      category,
    },
    {
      id: `${dateKey}-clear-level`,
      type: "clear_level",
      title: "Clear 1 level",
      description: "Complete any campaign level without a game over.",
      target: 1,
      progress: 0,
      completed: false,
    },
    {
      id: `${dateKey}-chain-merge`,
      type: "chain_merge",
      title: "Trigger a 3-step chain",
      description: "Land a shot that causes three cascading merges.",
      target: 3,
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
    return { dailyQuestDate, dailyQuests, claimedDailyReward };
  }

  return {
    dailyQuestDate: today,
    dailyQuests: createDailyQuests(today),
    claimedDailyReward: false,
  };
}

export function applyQuestProgress(quests: DailyQuest[], event: QuestProgressEvent): DailyQuest[] {
  return quests.map((quest) => {
    let progress = quest.progress;

    if (quest.type === "merge_atoms" && event.merges) {
      progress += event.merges;
    }

    if (quest.type === "discover_elements" && event.discoveries) {
      progress += event.discoveries.length;
    }

    if (quest.type === "reach_category" && event.reachedAtomicNumbers) {
      const reachedCategory = event.reachedAtomicNumbers.some((atomicNumber) => {
        const element = ELEMENTS[atomicNumber - 1];
        return element?.category === quest.category;
      });
      if (reachedCategory) progress = Math.max(progress, 1);
    }

    if (quest.type === "clear_level" && event.levelCleared) {
      progress += 1;
    }

    if (quest.type === "chain_merge" && event.maxChainDepth !== undefined) {
      progress = Math.max(progress, event.maxChainDepth);
    }

    const cappedProgress = Math.min(progress, quest.target);
    return {
      ...quest,
      progress: cappedProgress,
      completed: cappedProgress >= quest.target,
    };
  });
}

export function areDailyQuestsComplete(quests: DailyQuest[]): boolean {
  return quests.length > 0 && quests.every((quest) => quest.completed);
}
