// Level definitions for Elemental Fusion
// Each level: shoot elements, merge to reach the target element

import { ELEMENTS } from "./elements";

export interface Level {
  id: number;
  /** Display name */
  name: string;
  /** Short description shown on level select */
  description: string;
  /** Flavor text for the level */
  lore: string;
  /** Atomic number of target element to unlock level */
  targetElement: number;
  /** Highest atomic number that can appear in the initial queue */
  maxQueueElement: number;
  /**
   * Geometric decay used to weight the queue distribution. Lower values bias
   * very strongly toward Hydrogen / low-tier atoms. Default 0.65.
   * Used in early levels to prevent finishing in 1-2 shots.
   */
  queueDecay?: number;
  /** Grid dimensions for this level */
  gridCols: number;
  gridRows: number;
  /** Score multiplier */
  scoreMultiplier: number;
  /** Suggested number of shots for mastery */
  parShots?: number;
  /** Hard 3-star threshold: clearing the level in fewer than this many shots earns 3 stars. */
  starShotsThree?: number;
  /** Hard 2-star threshold: clearing in fewer than this many shots earns at least 2 stars. */
  starShotsTwo?: number;
  /** Suggested completion time in seconds (used for star rating) */
  parTimeSec?: number;
  /** Score target for mastery */
  scoreGoal?: number;
  /** Best combo target for mastery */
  comboGoal?: number;
  /** Elements unlocked for the milestone reward screen */
  milestoneFact?: string;
  /** Tutorial stage that clears by using a specific power-up correctly. */
  powerUpStage?: PowerUpStageId;
  /** Special one-off stage renderer. */
  specialStage?: "elemental-boss" | "periodic-guardian" | "nucleus-core";
}

type LevelSeed = Pick<Level, "name" | "description" | "lore" | "targetElement" | "milestoneFact">;

export type PowerUpStageId =
  | "shimmer"
  | "unstable"
  | "grab"
  | "egun"
  | "gravity"
  | "stone"
  | "transmute"
  | "fusion-jump"
  | "catalyst"
  | "emission"
  | "gamma"
  | "blank"
  | "queue-shuffle";

const LEVEL_SEEDS: LevelSeed[] = [
  {
    name: "First Fusion",
    description: "Merge two Hydrogen atoms into Helium.",
    lore: "In the beginning, there was hydrogen. This is the first fusion reaction that powers every star in the universe.",
    targetElement: 2,
    milestoneFact:
      "You just recreated the Big Bang's first second. Helium was the first new element made after hydrogen.",
  },
  {
    name: "Noble Beginnings",
    description: "Fuse your way to Lithium.",
    lore: "Lithium is the first metal, the lightest solid element, and the heart of modern batteries.",
    targetElement: 3,
  },
  {
    name: "Earth Born",
    description: "Reach Beryllium.",
    lore: "Beryllium is rarer than gold in Earth's crust. Spacecraft mirrors use it for its stiffness.",
    targetElement: 4,
  },
  {
    name: "Boron Glass",
    description: "Create Boron and open the second period.",
    lore: "Boron strengthens glass, ceramics, magnets, and even the cell walls of plants.",
    targetElement: 5,
  },
  {
    name: "Carbon Star",
    description: "Reach Carbon, the element of life.",
    lore: "Carbon is the backbone of living chemistry, diamonds, graphite, and countless materials.",
    targetElement: 6,
    milestoneFact:
      'Carbon forms more compounds than all other elements combined. Organic chemistry is literally "carbon chemistry".',
  },
  {
    name: "Breathe In",
    description: "Reach Oxygen, the breath of life.",
    lore: "Oxygen feeds cells, rusts iron, and helped transform Earth into a world complex life could use.",
    targetElement: 8,
  },
  {
    name: "Noble Gas Club",
    description: "Unlock Neon.",
    lore: "Neon glows in signs, hides in the air, and rarely reacts with anything at all.",
    targetElement: 10,
    milestoneFact:
      "The noble gases were once called inert gases. We now know even xenon and krypton can form compounds.",
  },
  {
    name: "Salt & Flames",
    description: "Reach Sodium.",
    lore: "Sodium burns bright yellow and reacts violently with water, yet helps make ordinary table salt.",
    targetElement: 11,
  },
  {
    name: "Vital Minerals",
    description: "Reach Silicon.",
    lore: "Silicon turned sand into circuits and helped define the age of computers.",
    targetElement: 14,
    milestoneFact: "Silicon is the second most abundant element in Earth's crust after oxygen.",
  },
  {
    name: "Period 3 Complete",
    description: "Reach Argon to complete Period 3.",
    lore: "Argon fills light bulbs, protects welding torches, and makes up nearly 1% of every breath.",
    targetElement: 18,
  },
  {
    name: "Calcium Shell",
    description: "Reach Calcium.",
    lore: "Calcium builds bones, shells, limestone cliffs, and the signals that make muscles move.",
    targetElement: 20,
  },
  {
    name: "Chrome Spark",
    description: "Reach Chromium.",
    lore: "Chromium brings brilliant pigments, stainless steel, and mirror-bright plated surfaces.",
    targetElement: 24,
  },
  {
    name: "Iron Will",
    description: "Smelt your way to Iron.",
    lore: "The Iron Age began 3000 years ago. Iron cores beat in Earth and every rocky planet.",
    targetElement: 26,
    milestoneFact:
      "Iron is as heavy as normal stellar fusion gets before massive stars need explosive endings.",
  },
  {
    name: "Copper Current",
    description: "Reach Copper, the wiring metal.",
    lore: "Copper was humanity's first tool metal, and it still carries electricity through the modern world.",
    targetElement: 29,
  },
  {
    name: "Zinc Shield",
    description: "Reach Zinc.",
    lore: "Zinc protects steel from rust, strengthens brass, and helps enzymes do their quiet work.",
    targetElement: 30,
  },
  {
    name: "Krypton Rising",
    description: "Push through to Krypton and complete Period 4.",
    lore: "Krypton is a noble gas used in bright lamps, lasers, and strobe flashes.",
    targetElement: 36,
    milestoneFact:
      "Period 4 introduces the first full row of transition metals, elements that make much of our technology possible.",
  },
  {
    name: "Strontium Signal",
    description: "Reach Strontium.",
    lore: "Strontium salts burn red in fireworks and can mark geological histories inside rocks and teeth.",
    targetElement: 38,
  },
  {
    name: "Molybdenum Core",
    description: "Reach Molybdenum.",
    lore: "Molybdenum makes steel tougher and helps living cells handle nitrogen chemistry.",
    targetElement: 42,
  },
  {
    name: "Silver Line",
    description: "Chase Silver.",
    lore: "Silver has the highest electrical conductivity of any element and a long history in medicine.",
    targetElement: 47,
  },
  {
    name: "Tin Foundry",
    description: "Reach Tin.",
    lore: "Tin helped create bronze, protects food cans, and solders circuits together.",
    targetElement: 50,
  },
  {
    name: "Xenon Flash",
    description: "Reach Xenon and finish Period 5.",
    lore: "Xenon powers bright lamps, ion engines, and a surprising family of noble-gas compounds.",
    targetElement: 54,
  },
  {
    name: "Barium Bloom",
    description: "Reach Barium.",
    lore: "Barium compounds make green fireworks and reveal soft tissues in medical imaging.",
    targetElement: 56,
  },
  {
    name: "Rare Earth Gate",
    description: "Open the lanthanide series with Neodymium.",
    lore: "Neodymium magnets pull tiny speakers, wind turbines, and electric motors into the future.",
    targetElement: 60,
  },
  {
    name: "Gadolinium Field",
    description: "Reach Gadolinium.",
    lore: "Gadolinium's magnetic behavior makes it useful in MRI contrast agents.",
    targetElement: 64,
  },
  {
    name: "Ytterbium Glow",
    description: "Reach Ytterbium.",
    lore: "Ytterbium appears in lasers, atomic clocks, and precise measurements of time.",
    targetElement: 70,
  },
  {
    name: "Hafnium Heat",
    description: "Reach Hafnium.",
    lore: "Hafnium withstands heat and controls neutrons inside advanced reactors.",
    targetElement: 72,
  },
  {
    name: "Tungsten Anvil",
    description: "Reach Tungsten.",
    lore: "Tungsten has the highest melting point of all elements and anchors extreme-temperature tools.",
    targetElement: 74,
  },
  {
    name: "Platinum Standard",
    description: "Reach Platinum.",
    lore: "Platinum resists corrosion and catalyzes reactions in cars, labs, and fuel cells.",
    targetElement: 78,
  },
  {
    name: "Quest for Gold",
    description: "Reach Gold, the alchemist's prize.",
    lore: "Every gold atom on Earth was forged in cosmic violence before becoming treasure.",
    targetElement: 79,
    milestoneFact:
      "Gold achieved. You reached the element that drove centuries of exploration, currency, and alchemy.",
  },
  {
    name: "Lead Wall",
    description: "Reach Lead.",
    lore: "Lead is dense, soft, and useful for shielding, but history learned its toxicity the hard way.",
    targetElement: 82,
  },
  {
    name: "Radon Veil",
    description: "Reach Radon and close Period 6.",
    lore: "Radon is a radioactive noble gas that can seep from stone into buildings.",
    targetElement: 86,
  },
  {
    name: "Radium Glow",
    description: "Reach Radium.",
    lore: "Radium once made paint glow, before its danger became impossible to ignore.",
    targetElement: 88,
  },
  {
    name: "Radioactive Frontier",
    description: "Cross into Uranium.",
    lore: "Uranium powers reactors, probes deep time in rocks, and marks the edge of common natural elements.",
    targetElement: 92,
    milestoneFact:
      "Uranium is where natural abundance thins out. Beyond it, most elements are fleeting or human-made.",
  },
  {
    name: "Plutonium Forge",
    description: "Reach Plutonium.",
    lore: "Plutonium is born in reactors and supernova debris, carrying enormous nuclear energy.",
    targetElement: 94,
  },
  {
    name: "Curium Lab",
    description: "Reach Curium.",
    lore: "Curium honors Marie and Pierre Curie and glows with heat from radioactive decay.",
    targetElement: 96,
  },
  {
    name: "Fermium Spark",
    description: "Reach Fermium.",
    lore: "Fermium was discovered in the debris of the first hydrogen bomb test.",
    targetElement: 100,
  },
  {
    name: "Lawrencium Edge",
    description: "Reach Lawrencium and finish the actinides.",
    lore: "Lawrencium ends the actinide row and points toward the superheavy laboratory frontier.",
    targetElement: 103,
  },
  {
    name: "Hassium Weight",
    description: "Reach Hassium.",
    lore: "Hassium exists only atom by atom, made in accelerator collisions and gone in moments.",
    targetElement: 108,
  },
  {
    name: "Island of Stability",
    description: "Reach Flerovium.",
    lore: "Physicists search for longer-lived superheavy nuclei near the predicted island of stability.",
    targetElement: 114,
    milestoneFact:
      "Flerovium sits near the theorized Island of Stability, where superheavy atoms may linger longer.",
  },
  {
    name: "The Final Frontier",
    description: "Complete the periodic table by reaching Oganesson.",
    lore: "Element 118 is the last confirmed element. Beyond it lies the unknown frontier of nuclear physics.",
    targetElement: 118,
    milestoneFact:
      "Periodic table complete. 118 elements, from hydrogen to oganesson, are now in your collection.",
  },
];

export const MOLECULE_CHALLENGE_BY_LEVEL: Record<number, string> = {
  5: "ammonium",
  10: "water",
  15: "carbon-dioxide",
  20: "hydrogen-sulfide",
  25: "ethanol",
  30: "carbonic-acid",
  35: "magnesium-chloride",
  40: "sulfuric-acid",
  45: "calcium-carbonate",
  50: "aluminum-oxide",
  55: "calcium-sulfate",
  60: "urea",
  65: "iron-oxide",
  70: "titanium-dioxide",
  75: "zinc-oxide",
  80: "ammonium-nitrate",
  85: "sodium-chloride",
  90: "nitric-acid",
  95: "methane",
};

export type CompoundChallengeKind = "formation" | "search-find";

export function getCompoundChallengeKind(levelId: number): CompoundChallengeKind | null {
  const challengeIds = Object.keys(MOLECULE_CHALLENGE_BY_LEVEL)
    .map(Number)
    .sort((a, b) => a - b);
  const index = challengeIds.indexOf(levelId);
  if (index < 0) return null;
  return index % 2 === 1 ? "search-find" : "formation";
}

function makeAtomLevel(seed: LevelSeed, id: number, atomStage: number): Level {
  const target = seed.targetElement;
  const difficulty = atomStage - 1;
  const maxQueueElement =
    id <= 2
      ? id
      : Math.max(2, Math.min(target - 1, Math.floor(target * (0.48 + Math.min(0.18, id * 0.003)))));
  const starShotsThree = Math.round(9 + difficulty * 2.15 + target * 0.2);
  const starShotsTwo = Math.round(starShotsThree * 1.32 + 4);
  const parShots = starShotsThree + Math.round(3 + id * 0.35);
  const scoreMultiplier = Number((1 + difficulty * 0.28 + target * 0.035).toFixed(1));

  return {
    id,
    ...seed,
    maxQueueElement,
    queueDecay: Number(Math.min(0.72, 0.3 + difficulty * 0.01).toFixed(2)),
    gridCols: id >= 26 ? 10 : id >= 14 ? 9 : 8,
    gridRows: id >= 32 ? 14 : id >= 20 ? 13 : id >= 7 ? 12 : 10,
    scoreMultiplier,
    parShots,
    starShotsThree,
    starShotsTwo,
    parTimeSec:
      id === 1
        ? 90
        : id <= 5
          ? 180 + (id - 2) * 40
          : Math.min(8 * 60, 6 * 60 + Math.floor(difficulty / 10) * 20),
    scoreGoal: Math.round((520 + target * 290 + difficulty * 420) * scoreMultiplier),
    comboGoal: Math.min(6, 2 + Math.floor(atomStage / 10)),
  };
}

function makePowerUpLevel(
  id: number,
  powerUpStage: PowerUpStageId,
  name: string,
  description: string,
  targetElement: number,
  maxQueueElement: number,
): Level {
  return {
    id,
    powerUpStage,
    name,
    description,
    lore: "A focused training stage: use the highlighted mechanic to clear the board and unlock it for future runs.",
    targetElement,
    maxQueueElement,
    queueDecay: 0.45,
    gridCols: id >= 26 ? 10 : id >= 14 ? 9 : 8,
    gridRows: id >= 32 ? 14 : id >= 20 ? 13 : id >= 7 ? 12 : 10,
    scoreMultiplier: Number((1.2 + id * 0.08).toFixed(1)),
    parShots: 8,
    starShotsThree: 5,
    starShotsTwo: 9,
    parTimeSec: 45,
    scoreGoal: Math.round(900 + id * 220),
    comboGoal: 2,
  };
}

const TOTAL_CAMPAIGN_LEVELS = 100;

const CURATED_ATOM_SEEDS: Record<number, LevelSeed> = {};
for (const seed of LEVEL_SEEDS) {
  if (!(seed.targetElement in CURATED_ATOM_SEEDS)) {
    CURATED_ATOM_SEEDS[seed.targetElement] = seed;
  }
}

function atomSeedFor(atomicNumber: number): LevelSeed {
  const curated = CURATED_ATOM_SEEDS[atomicNumber];
  if (curated) return curated;
  const element = ELEMENTS[atomicNumber - 1];
  return {
    name: `${element?.name ?? "Unknown"} Ascent`,
    description: `Reach ${element?.name ?? "the target element"}.`,
    lore: element?.fact ?? "Climb the periodic table one fusion at a time.",
    targetElement: atomicNumber,
  };
}

const ATOM_TARGET_ORDER: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
  28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 45, 46, 47, 48, 49, 50, 51, 52, 53,
  54, 55, 56, 74, 78, 79, 80, 82, 83, 86, 88, 90, 92, 94,
];

interface PowerUpStageSeed {
  stage: PowerUpStageId;
  name: string;
  description: string;
  target: number;
  maxQueue: number;
}

const POWER_UP_STAGE_BY_LEVEL: Record<number, PowerUpStageSeed> = {
  3: {
    stage: "shimmer",
    name: "Shimmer Practice",
    description: "Merge the shimmering queued atom to clear the stage.",
    target: 3,
    maxQueue: 3,
  },
  6: {
    stage: "unstable",
    name: "Unstable Isotope",
    description: "Merge an unstable atom before its shell depletes.",
    target: 10,
    maxQueue: 10,
  },
  8: {
    stage: "grab",
    name: "Grab Training",
    description: "Use Grab to reposition an atom and create a merge.",
    target: 5,
    maxQueue: 5,
  },
  11: {
    stage: "egun",
    name: "E-Gun Calibration",
    description: "Fire the E-Gun through a molecule to upgrade it.",
    target: 6,
    maxQueue: 6,
  },
  13: {
    stage: "gravity",
    name: "Gravity Well",
    description:
      "Gravity is earned every 30 successful merges. Use it to pull scattered atoms together.",
    target: 7,
    maxQueue: 7,
  },
  17: {
    stage: "stone",
    name: "Stone Impact",
    description: "Miss three opening shots, then place the loaded Stone.",
    target: 10,
    maxQueue: 10,
  },
  19: {
    stage: "transmute",
    name: "Transmute Shot",
    description: "Transmute your queued atom, then merge it into the board.",
    target: 13,
    maxQueue: 13,
  },
  22: {
    stage: "fusion-jump",
    name: "Fusion Jump",
    description: "Arm Fusion Jump and merge Chlorine into Potassium.",
    target: 19,
    maxQueue: 17,
  },
  24: {
    stage: "catalyst",
    name: "Catalyst Chain",
    description: "Activate Catalyst and trigger a chain reaction.",
    target: 24,
    maxQueue: 6,
  },
  27: {
    stage: "emission",
    name: "Emission Burst",
    description: "Use Emission to raise the waiting queue.",
    target: 29,
    maxQueue: 29,
  },
  29: {
    stage: "gamma",
    name: "Gamma Bomb",
    description: "Use Gamma Bomb to clear a dense board.",
    target: 33,
    maxQueue: 6,
  },
  32: {
    stage: "blank",
    name: "Blank Breakthrough",
    description: "Use a Blank Atom to reach Krypton through the stone wall.",
    target: 36,
    maxQueue: 35,
  },
  34: {
    stage: "queue-shuffle",
    name: "Queue Shuffle",
    description: "Shuffle the queue, then fire one of the new atoms.",
    target: 42,
    maxQueue: 42,
  },
};

type BossKind = NonNullable<Level["specialStage"]>;

const BOSS_STAGE_BY_LEVEL: Record<number, BossKind> = {
  31: "elemental-boss",
  61: "periodic-guardian",
  100: "nucleus-core",
};

function makeBossLevel(id: number, kind: BossKind): Level {
  if (kind === "elemental-boss") {
    return {
      id,
      name: "Elemental Boss",
      description:
        "Match the open eyes, charge Blank atoms, and bring the creature down in 100 shots.",
      lore: "A warped elemental beholder crawls out of the lab ceiling. Its orbiting eye-stalks answer only to clean reactions and relentless pressure.",
      targetElement: 10,
      maxQueueElement: 10,
      queueDecay: 0.45,
      gridCols: 10,
      gridRows: 12,
      scoreMultiplier: 4.8,
      parShots: 55,
      starShotsThree: 40,
      starShotsTwo: 70,
      parTimeSec: 240,
      scoreGoal: 60_000,
      comboGoal: 4,
      milestoneFact:
        "Boss atoms never rise above Neon. This fight is about recognition, timing, and setting up the perfect Blank shot.",
      specialStage: "elemental-boss",
    };
  }
  if (kind === "periodic-guardian") {
    return {
      id,
      name: "The Periodic Guardian",
      description:
        "Read the guardian's active element group and strike the core 20 times before your 50 shots run dry.",
      lore: "A living monument of the periodic table rises from the archive. Its shell rotates through the great families, and only the right group can pierce its heart.",
      targetElement: 18,
      maxQueueElement: 18,
      queueDecay: 0.5,
      gridCols: 10,
      gridRows: 12,
      scoreMultiplier: 5.2,
      parShots: 32,
      starShotsThree: 24,
      starShotsTwo: 38,
      parTimeSec: 210,
      scoreGoal: 80_000,
      comboGoal: 5,
      milestoneFact:
        "The guardian only recognizes three elemental families: Metals, Halogens, and Noble Gases. Learn the rhythm and the whole table starts to feel alive.",
      specialStage: "periodic-guardian",
    };
  }
  return {
    id,
    name: "The Nucleus",
    description:
      "The final boss. Bank shots around a black hole, peel away the orbit atoms, and expose the eye before the core overwhelms the field.",
    lore: "A magnetic singularity anchors a living nucleus in the final chamber. Its orbiting atoms shred careless lines, and its hidden eye punishes hesitation. This is the last stand.",
    targetElement: 10,
    maxQueueElement: 10,
    queueDecay: 0.48,
    gridCols: 10,
    gridRows: 12,
    scoreMultiplier: 6.2,
    parShots: 48,
    starShotsThree: 32,
    starShotsTwo: 52,
    parTimeSec: 260,
    scoreGoal: 120_000,
    comboGoal: 6,
    milestoneFact:
      "The Nucleus bends trajectory instead of rules. You win by reading curved lines, not by forcing straight shots. Beat it and the table is yours.",
    specialStage: "nucleus-core",
  };
}

function makeCompoundLevel(id: number, previousAtom: Level): Level {
  const difficulty = id - 1;
  const parShots = 18 + Math.floor(id * 0.8);
  return {
    id,
    name: `Compound Challenge ${id / 5}`,
    description: "Form the target molecule using atoms already on the board.",
    lore: "A lab stage breaks up the climb: select the right atoms, form the compound, and bank the bonus.",
    targetElement: previousAtom.targetElement,
    maxQueueElement: previousAtom.maxQueueElement,
    queueDecay: previousAtom.queueDecay,
    gridCols: previousAtom.gridCols,
    gridRows: previousAtom.gridRows,
    scoreMultiplier: Number((previousAtom.scoreMultiplier + 0.4).toFixed(1)),
    parShots,
    starShotsThree: parShots,
    starShotsTwo: Math.round(parShots * 1.35),
    parTimeSec: parShots * 5,
    scoreGoal: Math.round((900 + difficulty * 380) * previousAtom.scoreMultiplier),
    comboGoal: previousAtom.comboGoal,
  };
}

function buildCampaignLevels(): Level[] {
  const byId = new Map<number, Level>();
  const compoundIds: number[] = [];
  let atomIndex = 0;

  for (let id = 1; id <= TOTAL_CAMPAIGN_LEVELS; id += 1) {
    if (BOSS_STAGE_BY_LEVEL[id]) {
      byId.set(id, makeBossLevel(id, BOSS_STAGE_BY_LEVEL[id]));
      continue;
    }
    if (MOLECULE_CHALLENGE_BY_LEVEL[id]) {
      compoundIds.push(id);
      continue;
    }
    const tutorial = POWER_UP_STAGE_BY_LEVEL[id];
    if (tutorial) {
      byId.set(
        id,
        makePowerUpLevel(
          id,
          tutorial.stage,
          tutorial.name,
          tutorial.description,
          tutorial.target,
          tutorial.maxQueue,
        ),
      );
      continue;
    }
    const target = ATOM_TARGET_ORDER[atomIndex] ?? 118;
    atomIndex += 1;
    byId.set(id, makeAtomLevel(atomSeedFor(target), id, atomIndex));
  }

  for (const id of compoundIds) {
    let previousAtom: Level | undefined;
    for (let j = id - 1; j >= 1; j -= 1) {
      const candidate = byId.get(j);
      if (candidate && !candidate.specialStage && !candidate.powerUpStage) {
        previousAtom = candidate;
        break;
      }
    }
    previousAtom = previousAtom ?? byId.get(1) ?? makeAtomLevel(atomSeedFor(2), 1, 1);
    byId.set(id, makeCompoundLevel(id, previousAtom));
  }

  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}

export const LEVELS: Level[] = buildCampaignLevels();

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function getNextLevel(currentId: number): Level | undefined {
  return LEVELS.find((l) => l.id > currentId);
}

export const MAX_LEVEL = LEVELS[LEVELS.length - 1]?.id ?? 1;
