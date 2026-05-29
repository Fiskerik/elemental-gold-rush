import { Level } from "./levels";

export type GameModeId =
  | "campaign"
  | "survival"
  | "elemental-boss"
  | "periodic-guardian"
  | "nucleus-core"
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
    unlockedAtLevel: 6,
    rules: [
      "No fixed target pressure",
      "Danger zone rises 5% every minute",
      "Last as long as possible",
    ],
  },
  {
    id: "elemental-boss",
    name: "Elemental Boss",
    emoji: "Eye",
    kind: "challenge",
    description:
      "Face a five-eyed elemental horror. Match its open eyes, charge a Blank atom in the center, and bring it down in 100 shots.",
    unlockedAtLevel: 1,
    rules: [
      "The boss has 20 health and only opens 1-2 eyes at a time",
      "Matching an open eye deals 1 damage, or 2 if your shot is shimmering",
      "Charge the center eye to 10 and earn a Blank atom for a guaranteed hit",
    ],
  },
  {
    id: "periodic-guardian",
    name: "Periodic Guardian",
    emoji: "Guardian",
    kind: "challenge",
    description:
      "An ancient table guardian cycles through elemental phases. Match the active group, survive its e-beam, and break the core in 50 shots.",
    unlockedAtLevel: 1,
    rules: [
      "The weak spot cycles through Metals, Halogens, and Noble Gases every 3 seconds",
      "Land 20 correct group shots before you run out of 50 attempts",
      "Wait 7 seconds and the guardian vaporizes your current queued atom with an e-beam",
    ],
  },
  {
    id: "nucleus-core",
    name: "The Nucleus",
    emoji: "Core",
    kind: "challenge",
    description:
      "A magnetic core bends every shot. Strip away its orbiting atoms, expose the hidden eye, and finish the core before it eats your queue.",
    unlockedAtLevel: 1,
    rules: [
      "A black hole curves your shots and makes bounce angles matter",
      "Every 5 seconds the core fires out an atom and destroys your queued shot if you wait",
      "Merge all orbit atoms away, then hit the exposed eye 3 times to win",
    ],
  },
  {
    id: "unstable-isotopes",
    name: "Unstable Isotopes",
    emoji: "☢️",
    kind: "challenge",
    description: "Some atoms become unstable isotopes with period-based decay shells.",
    unlockedAtLevel: 12,
    rules: [
      "Unstable atoms lose 1 ring segment after each shot",
      "Merging stabilizes the isotope into the new atom for double points",
      "At 0 segments, it decays down by 1 element tier",
    ],
  },
  {
    id: "gravity-surge",
    name: "Gravity Surge",
    emoji: "🌀",
    kind: "challenge",
    description: "Every 5 shots, all atoms shift slightly downward toward danger.",
    unlockedAtLevel: 18,
    rules: ["Every 5 shots pushes the board downward", "Plan space before each surge"],
  },
  {
    id: "pure-hydrogen",
    name: "Pure Hydrogen Run",
    emoji: "H",
    kind: "challenge",
    description: "The queue starts mostly Hydrogen and Helium for long reaction chains.",
    unlockedAtLevel: 24,
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
    unlockedAtLevel: 30,
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
    unlockedAtLevel: 36,
    timerSec: 180,
    rules: ["180-second countdown", "Game over when time runs out"],
  },
  {
    id: "isotope-decay",
    name: "Isotope Decay",
    emoji: "🧪",
    kind: "challenge",
    description: "Every 20 shots, every atom on the board lowers by 1 tier.",
    unlockedAtLevel: 42,
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
  if (mode.id === "elemental-boss" || mode.id === "periodic-guardian" || mode.id === "nucleus-core") {
    return level.id >= 63 ? `Boss • Level ${level.id}` : "Boss Event";
  }
  return `Challenge • Level ${level.id}`;
}
