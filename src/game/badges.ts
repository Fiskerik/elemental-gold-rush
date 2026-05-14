import { ELEMENTS } from "./elements";

export type BadgeGroup = "milestones" | "families" | "periods" | "mastery";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  group: BadgeGroup;
  requiredAtomicNumbers: number[];
}

export const BADGE_GROUPS: { id: BadgeGroup; title: string; description: string }[] = [
  { id: "milestones", title: "Element Milestones", description: "Single landmark discoveries." },
  { id: "families", title: "Chemical Families", description: "Complete periodic-table families." },
  { id: "periods", title: "Full Periods", description: "Discover every element in a row." },
  { id: "mastery", title: "Collection Mastery", description: "Long-term collection goals." },
];

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
    group: "families",
    name: "Noble Collector",
    description: "Discover every noble gas.",
    icon: "✨",
    requiredAtomicNumbers: byCategory("noble-gas"),
  },
  {
    id: "alchemist",
    group: "milestones",
    name: "Alchemist",
    description: "Reach Gold.",
    icon: "🏆",
    requiredAtomicNumbers: [79],
  },
  {
    id: "radioactive-pioneer",
    group: "milestones",
    name: "Radioactive Pioneer",
    description: "Discover Uranium.",
    icon: "☢️",
    requiredAtomicNumbers: [92],
  },
  {
    id: "full-period-2",
    group: "periods",
    name: "Full Period 2",
    description: "Discover every Period 2 element.",
    icon: "🧪",
    requiredAtomicNumbers: byPeriod(2),
  },
  {
    id: "transition-master",
    group: "families",
    name: "Transition Master",
    description: "Discover every transition metal.",
    icon: "⚙️",
    requiredAtomicNumbers: byCategory("transition-metal"),
  },
  {
    id: "halogen-hunter",
    group: "families",
    name: "Halogen Hunter",
    description: "Discover every halogen.",
    icon: "🧂",
    requiredAtomicNumbers: [9, 17, 35, 53, 85, 117],
  },
  {
    id: "alkali-adept",
    group: "families",
    name: "Alkali Adept",
    description: "Discover every alkali metal.",
    icon: "🔥",
    requiredAtomicNumbers: byCategory("alkali-metal"),
  },
  {
    id: "alkaline-earth",
    group: "families",
    name: "Earth Mover",
    description: "Discover every alkaline earth metal.",
    icon: "🪨",
    requiredAtomicNumbers: byCategory("alkaline-earth"),
  },
  {
    id: "metalloid-mind",
    group: "families",
    name: "Metalloid Mind",
    description: "Discover every metalloid.",
    icon: "🔷",
    requiredAtomicNumbers: byCategory("metalloid"),
  },
  {
    id: "lanthanide-lord",
    group: "families",
    name: "Lanthanide Lord",
    description: "Discover every lanthanide.",
    icon: "💎",
    requiredAtomicNumbers: byCategory("lanthanide"),
  },
  {
    id: "actinide-archon",
    group: "families",
    name: "Actinide Archon",
    description: "Discover every actinide.",
    icon: "⚛️",
    requiredAtomicNumbers: byCategory("actinide"),
  },
  {
    id: "full-period-3",
    group: "periods",
    name: "Full Period 3",
    description: "Discover every Period 3 element.",
    icon: "🧫",
    requiredAtomicNumbers: byPeriod(3),
  },
  {
    id: "full-period-4",
    group: "periods",
    name: "Full Period 4",
    description: "Discover every Period 4 element.",
    icon: "🔬",
    requiredAtomicNumbers: byPeriod(4),
  },
  {
    id: "noble-helium",
    group: "milestones",
    name: "First Breath",
    description: "Discover Helium.",
    icon: "🎈",
    requiredAtomicNumbers: [2],
  },
  {
    id: "carbon-life",
    group: "milestones",
    name: "Carbon-Based",
    description: "Discover Carbon.",
    icon: "🌱",
    requiredAtomicNumbers: [6],
  },
  {
    id: "iron-forge",
    group: "milestones",
    name: "Iron Forge",
    description: "Discover Iron.",
    icon: "⚒️",
    requiredAtomicNumbers: [26],
  },
  {
    id: "silver-tongue",
    group: "milestones",
    name: "Silver Tongue",
    description: "Discover Silver.",
    icon: "🥈",
    requiredAtomicNumbers: [47],
  },
  {
    id: "platinum-elite",
    group: "milestones",
    name: "Platinum Elite",
    description: "Discover Platinum.",
    icon: "💍",
    requiredAtomicNumbers: [78],
  },
  {
    id: "century-club",
    group: "mastery",
    name: "Century Club",
    description: "Discover 50 elements.",
    icon: "🏅",
    requiredAtomicNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
  },
];

export function getEarnedBadgeIds(discoveredElements: number[]): string[] {
  const found = new Set(discoveredElements);
  return BADGES.filter((badge) =>
    badge.requiredAtomicNumbers.every((atomicNumber) => found.has(atomicNumber)),
  ).map((badge) => badge.id);
}
