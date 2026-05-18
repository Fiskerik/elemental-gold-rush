import { Level } from "./levels";

export type GameModeId =
  | "campaign"
  | "survival"
  | "unstable-isotopes"
  | "gravity-surge"
  | "pure-hydrogen"
  | "noble-gas-lock"
  | "gold-rush-timer"
  | "isotope-decay";

export interface GameModeConfig {
  id: GameModeId;
  name: string;
  emoji: string;
  kind: "campaign" | "challenge" | "endless";
  description: string;
  unlockedAtLevel: number;
  rules: string[];
  timerSec?: number;
}

export const GAME_MODES: GameModeConfig[] = [
  {
    id: "campaign",
    name: "Campaign",
    emoji: "⚗️",
    kind: "campaign",
    description: "Classic level progression with targets, stars, and discoveries.",
    unlockedAtLevel: 1,
    rules: ["Reach the target element", "Earn stars for clean, fast clears"],
  },
  {
    id: "survival",
    name: "Survival",
    emoji: "🛡️",
    kind: "endless",
    description: "Keep fusing while the red danger bar rises 5% every minute from the bottom.",
    unlockedAtLevel: 1,
    rules: [
      "No fixed target pressure",
      "Danger zone rises 5% every minute",
      "Last as long as possible",
    ],
  },
  {
    id: "unstable-isotopes",
    name: "Unstable Isotopes",
    emoji: "☢️",
    kind: "challenge",
    description: "Some atoms become unstable isotopes with an 8-shot decay ring.",
    unlockedAtLevel: 2,
    rules: [
      "Unstable atoms lose 1 ring segment after each shot",
      "Merging stabilizes the isotope into the new atom",
      "At 0 segments, it decays down by 1 element tier",
    ],
  },
  {
    id: "gravity-surge",
    name: "Gravity Surge",
    emoji: "🌀",
    kind: "challenge",
    description: "Every 5 shots, all atoms shift slightly downward toward danger.",
    unlockedAtLevel: 3,
    rules: ["Every 5 shots pushes the board downward", "Plan space before each surge"],
  },
  {
    id: "pure-hydrogen",
    name: "Pure Hydrogen Run",
    emoji: "H",
    kind: "challenge",
    description: "The queue starts mostly Hydrogen and Helium for long reaction chains.",
    unlockedAtLevel: 4,
    rules: [
      "Queue is biased toward Hydrogen and Helium",
      "Combos matter more than lucky high tiers",
    ],
  },
  {
    id: "noble-gas-lock",
    name: "Noble Gas Lock",
    emoji: "🔒",
    kind: "challenge",
    description: "Noble gases are stable and cannot merge until a power-up activates the board.",
    unlockedAtLevel: 6,
    rules: [
      "Noble gases block normal merges",
      "Use E-gun, Gravity, Emission, or Grab to unlock reactions",
    ],
  },
  {
    id: "gold-rush-timer",
    name: "Gold Rush Timer",
    emoji: "⏱️",
    kind: "challenge",
    description: "Reach the target before the lab clock expires.",
    unlockedAtLevel: 8,
    timerSec: 180,
    rules: ["180-second countdown", "Game over when time runs out"],
  },
  {
    id: "isotope-decay",
    name: "Isotope Decay",
    emoji: "🧪",
    kind: "challenge",
    description: "Every 20 shots, every atom on the board lowers by 1 tier.",
    unlockedAtLevel: 5,
    rules: [
      "Every 20 shots, all non-Hydrogen atoms decay by 1",
      "The shot counter flashes red on the warning shot",
      "Queue atoms are unchanged",
    ],
  },
];

export function getGameMode(id: GameModeId = "campaign"): GameModeConfig {
  return GAME_MODES.find((mode) => mode.id === id) ?? GAME_MODES[0];
}

export function getUnlockedGameModes(unlockedLevel: number): GameModeConfig[] {
  return GAME_MODES.filter((mode) => unlockedLevel >= mode.unlockedAtLevel);
}

export function getModeLevelLabel(mode: GameModeConfig, level: Level): string {
  if (mode.id === "campaign") return `Level ${level.id}`;
  if (mode.id === "survival") return "Endless";
  return `Challenge • Level ${level.id}`;
}
