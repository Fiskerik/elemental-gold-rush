import type { LabUpgradeId } from "./store";

export const LAB_UPGRADE_META: Record<LabUpgradeId, { name: string; bonuses: string[] }> = {
  molecule: {
    name: "Compound",
    bonuses: [
      "Double compound score",
      "First compound grants +1 charge",
      "Triple compound score",
      "Compound timer -1 minute",
      "Hints cost 50% less",
    ],
  },
  shimmer: {
    name: "Shimmer Atom",
    bonuses: ["Spawn 7%", "Shimmer score 3x", "Grab progress +3", "Spawn 10%", "Chain shimmer persists"],
  },
  unstable: {
    name: "Unstable Atom",
    bonuses: [
      "Stabilize score 3x",
      "+2 decay shields",
      "Spawn +5%",
      "Stabilize adds Grab progress",
      "Shockwave damages Stones",
    ],
  },
  grab: {
    name: "Grab",
    bonuses: [
      "Start with 1 charge",
      "Requirement 7 merges",
      "Grab drop scores 2x",
      "Requirement 6 merges",
      "Larger drop shockwave",
    ],
  },
  egun: {
    name: "E-Gun",
    bonuses: ["Spawn 2%", "Beam width +25%", "Cooldown 7 shots", "Upgraded atoms score 2x", "Overcharge damages Stones"],
  },
  gravity: {
    name: "Gravity",
    bonuses: [
      "Requirement 25 merges",
      "Gravity merges score 1.5x",
      "Start with 1 charge",
      "Requirement 20 merges",
      "Aim Gravity Up, Northwest, Northeast, East, or West",
    ],
  },
  stone: {
    name: "Stone",
    bonuses: ["Destroy bonus +50%", "Hit shockwave +20%", "Grace period 25 shots", "Destroy bonus +100%", "Drops 2 Fusion Jump"],
  },
  transmute: {
    name: "Transmute Shot",
    bonuses: ["Requirement 25 shots", "25% skip tier", "Start with 1 charge", "Requirement 20 shots", "Transmuted atom shimmers"],
  },
  "fusion-jump": {
    name: "Fusion Jump",
    bonuses: ["Start with 1 charge", "Fusion score 2x", "Arming applies Catalyst", "Fusion score 3x", "Skips two tiers"],
  },
  catalyst: {
    name: "Catalyst Aura",
    bonuses: ["Duration 7 shots", "Start with 1 charge", "Radius +20%", "Duration 10 shots", "Unlocks on 3x chain"],
  },
  emission: {
    name: "Emission",
    bonuses: ["Cooldown 4.5 minutes", "Start with 1 charge", "Next 5 shots score 2x", "Cooldown 4 minutes", "Raises queue by two tiers"],
  },
  gamma: {
    name: "Gamma Bomb",
    bonuses: ["Requirement 35 shots", "Radius +15%", "Start with 1 charge", "Requirement 30 shots", "Damages Stones"],
  },
  blank: {
    name: "Blank Atom",
    bonuses: ["Spawn 2%", "Blank merge scores 2x", "Stone hit grants Fusion Jump", "Spawn 3%", "Always shimmers"],
  },
  "queue-shuffle": {
    name: "Queue Shuffle",
    bonuses: ["Requirement 12 stone hits", "Start with 1 charge", "Next shot shimmers", "Requirement 10 stone hits", "Resets no-merge streak"],
  },
};
