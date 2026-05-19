export const POWER_UP_UNLOCK_LEVELS = {
  shimmer: 4,
  unstable: 6,
  grab: 7,
  egun: 8,
  gravity: 9,
  emission: 11,
  transmute: 12,
  "fusion-jump": 13,
  catalyst: 14,
  stone: 16,
  gamma: 17,
  molecule: 1,
  blank: 19,
  "queue-shuffle": 21,
} as const;

export const POWER_UPS = [
  {
    icon: "shimmer",
    name: "Shimmer Atom",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS.shimmer}`,
    effect: "A glowing atom gives 2x score and fills the Grab bar twice as fast when it merges.",
    description:
      "A glowing atom that gives 2x score and fills the Grab bar twice as fast when it merges.",
  },
  {
    icon: "unstable",
    name: "Unstable Atom",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS.unstable}`,
    effect: "Rare queue atoms with electron-shell hit counts (2/8/16). Merge them for 2x points before they decay.",
    description:
      "A rare unstable atom (4% spawn chance) shielded like electron shells: row 1 (H/He) takes 2 hits, row 2 (Li–Ne) takes 8, and everything else 16. Merge it before it decays for 2× points.",
  },
  {
    icon: "grab",
    name: "Grab",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS.grab} / merge streak`,
    effect: "Drag one atom to a new position and set up reactions.",
    description:
      "Earned after 8 consecutive merge progress. Drag one atom to reposition it and set up reactions.",
  },
  {
    icon: "egun",
    name: "E-Gun",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS.egun}`,
    effect: "Fires a straight beam that upgrades each atom it touches by 1 tier.",
    description: "A straight beam that upgrades each atom it touches by 1 tier.",
  },
  {
    icon: "gravity",
    name: "Gravity",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS.gravity} / 4x combo`,
    effect: "Pulls atoms upward and immediately resolves any newly touching matches.",
    description: "Pulls atoms upward and lets any newly touching matches merge immediately.",
  },
  {
    icon: "emission",
    name: "Emission",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS.emission} / every 5 minutes`,
    effect: "Raises every atom currently waiting in your queue by 1 tier.",
    description: "Raises every atom currently waiting in your queue by 1 tier.",
  },
  {
    icon: "transmute",
    name: "Transmute Shot",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS.transmute} / every 30 shots`,
    effect: "Rerolls the current queued atom into a higher tier.",
    description:
      "Rerolls the current queued atom into a higher tier. It cannot be canceled after use.",
  },
  {
    icon: "fusion-jump",
    name: "Fusion Jump",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS["fusion-jump"]} / break a Stone`,
    effect: "Arms your next successful merge to skip one extra element tier.",
    description: "Arms your next successful merge to skip one extra element tier.",
  },
  {
    icon: "catalyst",
    name: "Catalyst Aura",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS.catalyst} / 4x combo`,
    effect: "Doubles fusion radius for the next 5 shots.",
    description:
      "Doubles fusion radius for the next 5 shots, shown by a green ring around the loaded atom.",
  },
  {
    icon: "stone",
    name: "Stone",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS.stone} / 3 missed shots`,
    effect: "Loads a heavy obstacle projectile that shoves clusters and can be cracked for bonus points.",
    description:
      "A heavy obstacle projectile that shoves clusters and can be cracked for bonus points.",
  },
  {
    icon: "gamma",
    name: "Gamma Bomb",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS.gamma} / every 40 shots`,
    effect: "Clears every non-stone atom in a wide blast radius.",
    description:
      "Arms a slow heavy projectile that clears every non-stone atom in a wide blast radius.",
  },
  {
    icon: "molecule",
    name: "Compound",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS.molecule}`,
    effect: "Select board atoms to form a known compound, remove them, and earn a big bonus.",
    description:
      "Available from the start of campaign runs. Select board atoms with no more than 3 element types to form a known compound for a big bonus.",
  },
  {
    icon: "blank",
    name: "Blank Atom",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS.blank}`,
    effect: "Copies the atom it hits, or erases a Stone completely.",
    description: "A rare wildcard that copies the atom it hits, or erases a Stone completely.",
  },
  {
    icon: "queue-shuffle",
    name: "Queue Shuffle",
    unlock: `Level ${POWER_UP_UNLOCK_LEVELS["queue-shuffle"]} / every 15th Stone hit`,
    effect: "Rerolls the 3 atoms currently waiting in your queue.",
    description:
      "Recycle your queue: instantly rerolls every atom currently waiting in your queue.",
  },
];
