// Level definitions for Elemental Fusion
// Each level: shoot elements, merge to reach the target element

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
  /** Grid dimensions for this level */
  gridCols: number;
  gridRows: number;
  /** Score multiplier */
  scoreMultiplier: number;
  /** Elements unlocked for the milestone reward screen */
  milestoneFact?: string;
}

export const LEVELS: Level[] = [
  {
    id: 1,
    name: 'First Fusion',
    description: 'Merge two Hydrogen atoms into Helium.',
    lore: 'In the beginning, there was hydrogen. This is the first fusion — the reaction that powers every star in the universe.',
    targetElement: 2,      // Helium
    maxQueueElement: 1,    // Only Hydrogen
    gridCols: 8,
    gridRows: 10,
    scoreMultiplier: 1.0,
    milestoneFact: 'You just recreated the Big Bang\'s first second! Helium was the first new element made after hydrogen.',
  },
  {
    id: 2,
    name: 'Noble Beginnings',
    description: 'Fuse your way to Lithium.',
    lore: 'Lithium — the first metal, the lightest solid element, and the heart of your phone\'s battery.',
    targetElement: 3,      // Lithium
    maxQueueElement: 2,    // H and He
    gridCols: 8,
    gridRows: 10,
    scoreMultiplier: 1.0,
  },
  {
    id: 3,
    name: 'Earth Born',
    description: 'Reach Beryllium.',
    lore: 'Beryllium is rarer than gold in Earth\'s crust. NASA uses it in spacecraft mirrors for its rigidity.',
    targetElement: 4,
    maxQueueElement: 2,
    gridCols: 8,
    gridRows: 10,
    scoreMultiplier: 1.1,
  },
  {
    id: 4,
    name: 'Carbon Star',
    description: 'Reach Carbon — the element of life.',
    lore: 'Every living thing is carbon-based. You are mostly carbon. So are diamonds, graphite, and the ink in this sentence.',
    targetElement: 6,
    maxQueueElement: 3,
    gridCols: 8,
    gridRows: 10,
    scoreMultiplier: 1.2,
    milestoneFact: 'Carbon forms more compounds than all other elements combined. Organic chemistry is literally "carbon chemistry".',
  },
  {
    id: 5,
    name: 'Breathe In',
    description: 'Reach Oxygen — the breath of life.',
    lore: 'Every breath you take is mostly nitrogen, but it\'s oxygen your cells crave. Without oxygen, you have 4 minutes.',
    targetElement: 8,
    maxQueueElement: 4,
    gridCols: 8,
    gridRows: 11,
    scoreMultiplier: 1.3,
  },
  {
    id: 6,
    name: 'Noble Gas Club',
    description: 'Unlock Neon.',
    lore: 'Neon has never bonded with another element. It glows in tubes, illuminates cities, and makes up trace amounts of the air you breathe.',
    targetElement: 10,
    maxQueueElement: 5,
    gridCols: 8,
    gridRows: 11,
    scoreMultiplier: 1.4,
    milestoneFact: 'The noble gases were once called "inert gases" — scientists thought they couldn\'t react. We now know xenon and krypton can form compounds!',
  },
  {
    id: 7,
    name: 'Salt & Flames',
    description: 'Reach Sodium.',
    lore: 'Sodium burns bright yellow and explodes in water. Yet bonded with chlorine, it becomes the salt you season food with.',
    targetElement: 11,
    maxQueueElement: 5,
    gridCols: 8,
    gridRows: 11,
    scoreMultiplier: 1.5,
  },
  {
    id: 8,
    name: 'Vital Minerals',
    description: 'Reach Silicon.',
    lore: 'Silicon transformed the world. From sand to transistors, the "Silicon Age" replaced the Iron and Bronze ages.',
    targetElement: 14,
    maxQueueElement: 7,
    gridCols: 8,
    gridRows: 11,
    scoreMultiplier: 1.6,
    milestoneFact: 'Silicon is the second most abundant element in Earth\'s crust (after oxygen). We\'ve built civilization on silicon.',
  },
  {
    id: 9,
    name: 'Period 3 Complete',
    description: 'Reach Argon to complete Period 3.',
    lore: 'Argon fills your light bulbs, protects welding torches, and makes up nearly 1% of every breath you take.',
    targetElement: 18,
    maxQueueElement: 9,
    gridCols: 8,
    gridRows: 12,
    scoreMultiplier: 1.8,
  },
  {
    id: 10,
    name: 'Iron Will',
    description: 'Smelt your way to Iron.',
    lore: 'The Iron Age began 3000 years ago. Iron cores beat in Earth and every rocky planet. Your blood runs on iron.',
    targetElement: 26,
    maxQueueElement: 13,
    gridCols: 8,
    gridRows: 12,
    scoreMultiplier: 2.0,
    milestoneFact: 'Iron is made in stars: small stars fuse hydrogen into helium into carbon. Massive stars continue to silicon, then iron — and there the fusion stops. Iron is as heavy as stars can make.',
  },
  {
    id: 11,
    name: 'Noble Metal Hunt',
    description: 'Reach Copper, the first coinage metal.',
    lore: 'Copper was humanity\'s first metal tool. The Bronze Age was named for copper+tin. We still use it in every wire.',
    targetElement: 29,
    maxQueueElement: 14,
    gridCols: 8,
    gridRows: 12,
    scoreMultiplier: 2.2,
  },
  {
    id: 12,
    name: 'Krypton Rising',
    description: 'Push through to Krypton and complete Period 4.',
    lore: 'Superman\'s home world. In reality, krypton is an inert noble gas used in strobe lights and once defined the unit of length.',
    targetElement: 36,
    maxQueueElement: 18,
    gridCols: 8,
    gridRows: 12,
    scoreMultiplier: 2.5,
    milestoneFact: 'Period 4 introduces the first full row of transition metals — elements that make most of our technology possible.',
  },
  {
    id: 13,
    name: 'Precious Metals',
    description: 'Chase Silver.',
    lore: 'Silver has the highest electrical conductivity of any element. Before antibiotics, silver was used to fight infection.',
    targetElement: 47,
    maxQueueElement: 23,
    gridCols: 8,
    gridRows: 12,
    scoreMultiplier: 3.0,
  },
  {
    id: 14,
    name: 'Quest for Gold',
    description: 'REACH GOLD — the ultimate prize!',
    lore: 'Every gold atom on Earth was forged in a neutron star collision. Gold was the obsession of alchemists for 2000 years. Today, you make it with atoms.',
    targetElement: 79,
    maxQueueElement: 39,
    gridCols: 9,
    gridRows: 13,
    scoreMultiplier: 5.0,
    milestoneFact: 'GOLD ACHIEVED! Congratulations — you\'ve reached the element that drove human history for millennia. The alchemists dreamed of this. You did it.',
  },
  {
    id: 15,
    name: 'Radioactive Frontier',
    description: 'Cross into the actinides — radioactive territory.',
    lore: 'Beyond lead, most elements are radioactive. But they power nuclear reactors, cancer treatments, and space probes.',
    targetElement: 92,   // Uranium
    maxQueueElement: 46,
    gridCols: 9,
    gridRows: 13,
    scoreMultiplier: 6.0,
    milestoneFact: 'Uranium is where natural elements end. Everything beyond was either very briefly present after the Big Bang, or made by humans.',
  },
  {
    id: 16,
    name: 'Synthetic Elements',
    description: 'Create Americium and beyond.',
    lore: 'These elements don\'t exist in nature — humans made them in particle accelerators and nuclear reactors.',
    targetElement: 95,   // Americium
    maxQueueElement: 47,
    gridCols: 9,
    gridRows: 13,
    scoreMultiplier: 7.0,
  },
  {
    id: 17,
    name: 'Island of Stability',
    description: 'Reach Element 114, Flerovium.',
    lore: 'Physicists predict an "island of stability" around element 114 where superheavy nuclei might survive for minutes or hours.',
    targetElement: 114,
    maxQueueElement: 57,
    gridCols: 9,
    gridRows: 14,
    scoreMultiplier: 10.0,
    milestoneFact: 'You\'ve reached the theorized Island of Stability! Flerovium may have isotopes that last long enough to study their chemistry.',
  },
  {
    id: 18,
    name: 'The Final Frontier',
    description: 'Complete the periodic table — reach Oganesson!',
    lore: 'Element 118. The last element confirmed to exist. Beyond this lies the unknown frontier of nuclear physics.',
    targetElement: 118,  // Oganesson
    maxQueueElement: 59,
    gridCols: 9,
    gridRows: 14,
    scoreMultiplier: 20.0,
    milestoneFact: 'YOU COMPLETED THE PERIODIC TABLE! 118 elements, from hydrogen to oganesson. You are now a master of the elements.',
  },
];

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find(l => l.id === id);
}

export function getNextLevel(currentId: number): Level | undefined {
  return LEVELS.find(l => l.id === currentId + 1);
}

export const MAX_LEVEL = LEVELS.length;
