import { ELEMENTS } from "./elements";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredAtomicNumbers: number[];
}

function byCategory(category: string): number[] {
  return ELEMENTS.filter((element) => element.category === category).map(
    (element) => element.atomicNumber,
  );
}

function byPeriod(period: number): number[] {
  return ELEMENTS.filter((element) => element.period === period).map(
    (element) => element.atomicNumber,
  );
}

export const BADGES: BadgeDefinition[] = [
  {
    id: "noble-collector",
    name: "Noble Collector",
    description: "Discover every noble gas.",
    icon: "✨",
    requiredAtomicNumbers: byCategory("noble-gas"),
  },
  {
    id: "alchemist",
    name: "Alchemist",
    description: "Reach Gold.",
    icon: "🏆",
    requiredAtomicNumbers: [79],
  },
  {
    id: "radioactive-pioneer",
    name: "Radioactive Pioneer",
    description: "Discover Uranium.",
    icon: "☢️",
    requiredAtomicNumbers: [92],
  },
  {
    id: "full-period-2",
    name: "Full Period 2",
    description: "Discover every Period 2 element.",
    icon: "🧪",
    requiredAtomicNumbers: byPeriod(2),
  },
  {
    id: "transition-master",
    name: "Transition Master",
    description: "Discover every transition metal.",
    icon: "⚙️",
    requiredAtomicNumbers: byCategory("transition-metal"),
  },
];

export function getEarnedBadgeIds(discoveredElements: number[]): string[] {
  const found = new Set(discoveredElements);
  return BADGES.filter((badge) =>
    badge.requiredAtomicNumbers.every((atomicNumber) => found.has(atomicNumber)),
  ).map((badge) => badge.id);
}
