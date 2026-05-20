import { ELEMENTS } from "./elements";
import {
  Atom,
  Award,
  Beaker,
  Crown,
  FlaskConical,
  Hexagon,
  Layers,
  Mountain,
  Sprout,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type BadgeGroup = "milestones" | "families" | "periods" | "mastery";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconLucide?: LucideIcon;
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

function byGroup(group: number): number[] {
  return ELEMENTS.filter((element) => element.group === group).map(
    (element) => element.atomicNumber,
  );
}

function allElements(): number[] {
  return ELEMENTS.map((element) => element.atomicNumber);
}

export const BADGES: BadgeDefinition[] = [
  {
    id: "first-row-complete",
    group: "periods",
    name: "First Row",
    description: "Discover Hydrogen and Helium.",
    icon: "H",
    iconLucide: Atom,
    requiredAtomicNumbers: byPeriod(1),
  },
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
    id: "reactive-nonmetal-set",
    group: "families",
    name: "Reactive Core",
    description: "Discover every reactive nonmetal.",
    icon: "Rx",
    iconLucide: Zap,
    requiredAtomicNumbers: byCategory("reactive-nonmetal"),
  },
  {
    id: "post-transition-set",
    group: "families",
    name: "Soft Metals",
    description: "Discover every post-transition metal.",
    icon: "Sn",
    iconLucide: Layers,
    requiredAtomicNumbers: byCategory("post-transition"),
  },
  {
    id: "coinage-metals",
    group: "families",
    name: "Coinage Metals",
    description: "Discover Copper, Silver, and Gold.",
    icon: "Au",
    iconLucide: Crown,
    requiredAtomicNumbers: [29, 47, 79],
  },
  {
    id: "carbon-family",
    group: "families",
    name: "Carbon Family",
    description: "Discover every Group 14 element.",
    icon: "C",
    iconLucide: Hexagon,
    requiredAtomicNumbers: byGroup(14),
  },
  {
    id: "pnictogen-family",
    group: "families",
    name: "Nitrogen Family",
    description: "Discover every Group 15 element.",
    icon: "N",
    iconLucide: Sprout,
    requiredAtomicNumbers: byGroup(15),
  },
  {
    id: "chalcogen-family",
    group: "families",
    name: "Oxygen Family",
    description: "Discover every Group 16 element.",
    icon: "O",
    iconLucide: Beaker,
    requiredAtomicNumbers: byGroup(16),
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
    id: "full-period-5",
    group: "periods",
    name: "Full Period 5",
    description: "Discover every Period 5 element.",
    icon: "5",
    iconLucide: FlaskConical,
    requiredAtomicNumbers: byPeriod(5),
  },
  {
    id: "full-period-6",
    group: "periods",
    name: "Full Period 6",
    description: "Discover every Period 6 element, including lanthanides.",
    icon: "6",
    iconLucide: FlaskConical,
    requiredAtomicNumbers: byPeriod(6),
  },
  {
    id: "full-period-7",
    group: "periods",
    name: "Full Period 7",
    description: "Discover every Period 7 element, including actinides.",
    icon: "7",
    iconLucide: FlaskConical,
    requiredAtomicNumbers: byPeriod(7),
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
    id: "superheavy-scout",
    group: "milestones",
    name: "Superheavy Scout",
    description: "Discover Hassium.",
    icon: "Hs",
    iconLucide: Mountain,
    requiredAtomicNumbers: [108],
  },
  {
    id: "table-finisher",
    group: "milestones",
    name: "Table Finisher",
    description: "Discover Oganesson.",
    icon: "Og",
    iconLucide: Trophy,
    requiredAtomicNumbers: [118],
  },
  {
    id: "century-club",
    group: "mastery",
    name: "Century Club",
    description: "Discover 50 elements.",
    icon: "🏅",
    requiredAtomicNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
  },
  {
    id: "periodic-master",
    group: "mastery",
    name: "Periodic Master",
    description: "Discover all 118 elements.",
    icon: "118",
    iconLucide: Award,
    requiredAtomicNumbers: allElements(),
  },
];

export function getEarnedBadgeIds(discoveredElements: number[]): string[] {
  const found = new Set(discoveredElements);
  return BADGES.filter((badge) =>
    badge.requiredAtomicNumbers.every((atomicNumber) => found.has(atomicNumber)),
  ).map((badge) => badge.id);
}
