export type CompoundRarity = "common" | "uncommon" | "rare";

export interface CompoundDefinition {
  id: string;
  name: string;
  formula: string;
  elements: Record<string, number>;
  totalAtoms: number;
  bonusScore: number;
  rarity: CompoundRarity;
  fact: string;
}

export interface CompoundAtomNode {
  symbol: string;
  x: number;
  y: number;
}

export interface CompoundBond {
  from: number;
  to: number;
  order?: 1 | 2 | 3;
}

export interface CompoundStructure {
  atoms: CompoundAtomNode[];
  bonds: CompoundBond[];
}

function compound(
  id: string,
  name: string,
  formula: string,
  elements: Record<string, number>,
  bonusScore: number,
  rarity: CompoundRarity,
  fact: string,
): CompoundDefinition {
  return {
    id,
    name,
    formula,
    elements,
    totalAtoms: Object.values(elements).reduce((sum, count) => sum + count, 0),
    bonusScore,
    rarity,
    fact,
  };
}

export const COMPOUNDS: CompoundDefinition[] = [
  compound("water", "Water", "H₂O", { H: 2, O: 1 }, 1500, "common", "Water is essential for life and covers about 71% of Earth's surface."),
  compound("carbon-dioxide", "Carbon Dioxide", "CO₂", { C: 1, O: 2 }, 1800, "common", "Carbon dioxide is used by plants in photosynthesis and gives fizzy drinks their bubbles."),
  compound("ammonia", "Ammonia", "NH₃", { N: 1, H: 3 }, 1700, "common", "Ammonia is a key ingredient for fertilizer production."),
  compound("methane", "Methane", "CH₄", { C: 1, H: 4 }, 1800, "common", "Methane is the main component of natural gas."),
  compound("sodium-chloride", "Sodium Chloride", "NaCl", { Na: 1, Cl: 1 }, 1900, "common", "Sodium chloride is ordinary table salt."),
  compound("hydrogen-peroxide", "Hydrogen Peroxide", "H₂O₂", { H: 2, O: 2 }, 2200, "uncommon", "Hydrogen peroxide breaks down into water and oxygen."),
  compound("ozone", "Ozone", "O₃", { O: 3 }, 2000, "uncommon", "Ozone high in the atmosphere helps absorb ultraviolet light."),
  compound("hydrogen-chloride", "Hydrogen Chloride", "HCl", { H: 1, Cl: 1 }, 1700, "common", "Hydrogen chloride forms hydrochloric acid when dissolved in water."),
  compound("hydrogen-cyanide", "Hydrogen Cyanide", "HCN", { H: 1, C: 1, N: 1 }, 2600, "uncommon", "Hydrogen cyanide is a highly toxic molecule with a faint bitter-almond odor."),
  compound("nitrous-oxide", "Nitrous Oxide", "N₂O", { N: 2, O: 1 }, 2200, "uncommon", "Nitrous oxide is also known as laughing gas."),
  compound("calcium-oxide", "Calcium Oxide", "CaO", { Ca: 1, O: 1 }, 2300, "uncommon", "Calcium oxide is quicklime, used in cement and steelmaking."),
  compound("silicon-dioxide", "Silicon Dioxide", "SiO₂", { Si: 1, O: 2 }, 2600, "uncommon", "Silicon dioxide is the main compound in quartz and sand."),
  compound("acetic-acid", "Acetic Acid", "C₂H₄O₂", { C: 2, H: 4, O: 2 }, 3200, "rare", "Acetic acid gives vinegar its sharp smell and taste."),
  compound("carbon-monoxide", "Carbon Monoxide", "CO", { C: 1, O: 1 }, 1600, "common", "Carbon monoxide is dangerous because it binds strongly to hemoglobin."),
  compound("sulfur-dioxide", "Sulfur Dioxide", "SO₂", { S: 1, O: 2 }, 2500, "uncommon", "Sulfur dioxide is released by volcanoes and burning sulfur-rich fuels."),
  compound("nitric-oxide", "Nitric Oxide", "NO", { N: 1, O: 1 }, 1700, "common", "Nitric oxide is a tiny signaling molecule in the human body."),
  compound("nitrogen-dioxide", "Nitrogen Dioxide", "NO₂", { N: 1, O: 2 }, 2100, "uncommon", "Nitrogen dioxide is a reddish-brown air pollutant."),
  compound("magnesium-oxide", "Magnesium Oxide", "MgO", { Mg: 1, O: 1 }, 2200, "uncommon", "Magnesium oxide forms when magnesium burns with a brilliant white flame."),
  compound("iron-oxide", "Iron Oxide", "Fe₂O₃", { Fe: 2, O: 3 }, 3500, "rare", "Iron oxide is the red-brown chemistry behind rust and many earth pigments."),
  compound("calcium-carbonate", "Calcium Carbonate", "CaCO₃", { Ca: 1, C: 1, O: 3 }, 3300, "rare", "Calcium carbonate makes up limestone, chalk, shells, and pearls."),
  compound("sodium-hydroxide", "Sodium Hydroxide", "NaOH", { Na: 1, O: 1, H: 1 }, 2800, "uncommon", "Sodium hydroxide is also called lye and is used to make soap."),
  compound("chloroform", "Chloroform", "CHCl₃", { C: 1, H: 1, Cl: 3 }, 4200, "rare", "Chloroform is a heavy, sweet-smelling liquid once used as an anesthetic."),
  compound("hydrogen-sulfide", "Hydrogen Sulfide", "H₂S", { H: 2, S: 1 }, 2100, "uncommon", "Hydrogen sulfide smells like rotten eggs."),
  compound("sulfuric-acid", "Sulfuric Acid", "H₂SO₄", { H: 2, S: 1, O: 4 }, 3800, "rare", "Sulfuric acid is one of the most produced industrial chemicals."),
  compound("methanol", "Methanol", "CH₄O", { C: 1, H: 4, O: 1 }, 3000, "uncommon", "Methanol is a simple alcohol used in fuels, solvents, and chemical manufacturing."),
  compound("carbonic-acid", "Carbonic Acid", "H₂CO₃", { H: 2, C: 1, O: 3 }, 3200, "rare", "Carbonic acid forms when carbon dioxide dissolves in water."),
  compound("chlorine-gas", "Chlorine Gas", "Cl₂", { Cl: 2 }, 1900, "common", "Chlorine gas is used to make many disinfectants and plastics."),
  compound("oxygen-gas", "Oxygen Gas", "O₂", { O: 2 }, 1400, "common", "Oxygen gas is what your cells use to release energy from food."),
  compound("hydrogen-gas", "Hydrogen Gas", "H₂", { H: 2 }, 1200, "common", "Hydrogen gas is the lightest molecule."),
];

export function compoundKey(elements: Record<string, number>): string {
  return Object.entries(elements)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([symbol, count]) => `${symbol}:${count}`)
    .join("|");
}

export const COMPOUND_BY_KEY = new Map(
  COMPOUNDS.map((compound) => [compoundKey(compound.elements), compound] as const),
);

export function findCompoundByElements(elements: Record<string, number>): CompoundDefinition | null {
  return COMPOUND_BY_KEY.get(compoundKey(elements)) ?? null;
}

export const COMPOUND_HINTS: Record<string, string> = {
  "water": "A clear liquid that covers oceans, clouds, and cells.",
  "carbon-dioxide": "An invisible gas made by breathing, fire, and fizzy drinks.",
  "ammonia": "A sharp-smelling gas used to make fertilizers.",
  "methane": "A simple fuel gas found in natural gas.",
  "sodium-chloride": "A familiar white crystal sprinkled on food.",
  "hydrogen-peroxide": "A bubbling household disinfectant that releases oxygen.",
  "ozone": "A reactive form of oxygen that helps shield Earth high above.",
  "hydrogen-chloride": "A sharp gas that becomes a powerful acid in water.",
  "hydrogen-cyanide": "A small but dangerous molecule historically linked to bitter almonds.",
  "nitrous-oxide": "A gas famous for whipped cream chargers and laughing gas.",
  "calcium-oxide": "A hot-reacting powder known as quicklime.",
  "silicon-dioxide": "The hard mineral chemistry behind quartz and sand.",
  "acetic-acid": "The tangy molecule that gives vinegar its bite.",
  "carbon-monoxide": "A dangerous invisible gas from incomplete burning.",
  "sulfur-dioxide": "A choking volcanic gas linked to smoky pollution.",
  "nitric-oxide": "A tiny signaling gas used by the body.",
  "nitrogen-dioxide": "A reddish-brown gas seen in polluted air.",
  "magnesium-oxide": "A white mineral made when magnesium burns brightly.",
  "iron-oxide": "The red-brown chemistry of rust and earthy pigments.",
  "calcium-carbonate": "A chalky solid found in shells, limestone, and pearls.",
  "sodium-hydroxide": "A slippery, caustic base used in soap making.",
  "chloroform": "A heavy sweet-smelling liquid with three halogen atoms.",
  "hydrogen-sulfide": "A foul-smelling gas associated with rotten eggs.",
  "sulfuric-acid": "A heavy industrial acid used around the world.",
  "methanol": "A small alcohol used as fuel and solvent.",
  "carbonic-acid": "The weak acid that appears when bubbles meet water.",
  "chlorine-gas": "A greenish disinfecting gas with a harsh smell.",
  "oxygen-gas": "The breathable gas cells use to release energy.",
  "hydrogen-gas": "The lightest gas, often used in rockets and fuel cells.",
};

export const COMPOUND_STRUCTURES: Record<string, CompoundStructure> = {
  "water": {
    atoms: [{ symbol: "O", x: 0, y: -0.12 }, { symbol: "H", x: -0.46, y: 0.38 }, { symbol: "H", x: 0.46, y: 0.38 }],
    bonds: [{ from: 0, to: 1 }, { from: 0, to: 2 }],
  },
  "carbon-dioxide": {
    atoms: [{ symbol: "O", x: -0.58, y: 0 }, { symbol: "C", x: 0, y: 0 }, { symbol: "O", x: 0.58, y: 0 }],
    bonds: [{ from: 0, to: 1, order: 2 }, { from: 1, to: 2, order: 2 }],
  },
  "ammonia": {
    atoms: [{ symbol: "N", x: 0, y: 0 }, { symbol: "H", x: -0.5, y: 0.28 }, { symbol: "H", x: 0.5, y: 0.28 }, { symbol: "H", x: 0, y: -0.54 }],
    bonds: [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 }],
  },
  "methane": {
    atoms: [{ symbol: "C", x: 0, y: 0 }, { symbol: "H", x: -0.5, y: -0.42 }, { symbol: "H", x: 0.5, y: -0.42 }, { symbol: "H", x: -0.5, y: 0.42 }, { symbol: "H", x: 0.5, y: 0.42 }],
    bonds: [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 }, { from: 0, to: 4 }],
  },
  "sodium-chloride": {
    atoms: [{ symbol: "Na", x: -0.32, y: 0 }, { symbol: "Cl", x: 0.32, y: 0 }],
    bonds: [{ from: 0, to: 1 }],
  },
  "hydrogen-peroxide": {
    atoms: [{ symbol: "H", x: -0.64, y: 0.28 }, { symbol: "O", x: -0.24, y: 0 }, { symbol: "O", x: 0.24, y: 0 }, { symbol: "H", x: 0.64, y: -0.28 }],
    bonds: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }],
  },
  "ozone": {
    atoms: [{ symbol: "O", x: -0.48, y: 0.22 }, { symbol: "O", x: 0, y: -0.18 }, { symbol: "O", x: 0.48, y: 0.22 }],
    bonds: [{ from: 0, to: 1 }, { from: 1, to: 2, order: 2 }],
  },
  "hydrogen-chloride": {
    atoms: [{ symbol: "H", x: -0.36, y: 0 }, { symbol: "Cl", x: 0.36, y: 0 }],
    bonds: [{ from: 0, to: 1 }],
  },
  "hydrogen-cyanide": {
    atoms: [{ symbol: "H", x: -0.62, y: 0 }, { symbol: "C", x: 0, y: 0 }, { symbol: "N", x: 0.62, y: 0 }],
    bonds: [{ from: 0, to: 1 }, { from: 1, to: 2, order: 3 }],
  },
  "nitrous-oxide": {
    atoms: [{ symbol: "N", x: -0.56, y: 0 }, { symbol: "N", x: 0, y: 0 }, { symbol: "O", x: 0.56, y: 0 }],
    bonds: [{ from: 0, to: 1, order: 2 }, { from: 1, to: 2, order: 2 }],
  },
  "calcium-oxide": {
    atoms: [{ symbol: "Ca", x: -0.34, y: 0 }, { symbol: "O", x: 0.34, y: 0 }],
    bonds: [{ from: 0, to: 1 }],
  },
  "silicon-dioxide": {
    atoms: [{ symbol: "O", x: -0.58, y: 0 }, { symbol: "Si", x: 0, y: 0 }, { symbol: "O", x: 0.58, y: 0 }],
    bonds: [{ from: 0, to: 1, order: 2 }, { from: 1, to: 2, order: 2 }],
  },
  "acetic-acid": {
    atoms: [{ symbol: "C", x: -0.28, y: 0 }, { symbol: "C", x: 0.22, y: 0 }, { symbol: "H", x: -0.62, y: -0.38 }, { symbol: "H", x: -0.68, y: 0.26 }, { symbol: "H", x: -0.24, y: 0.55 }, { symbol: "O", x: 0.56, y: -0.36 }, { symbol: "O", x: 0.62, y: 0.3 }, { symbol: "H", x: 0.3, y: 0.64 }],
    bonds: [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 }, { from: 0, to: 4 }, { from: 1, to: 5, order: 2 }, { from: 1, to: 6 }, { from: 6, to: 7 }],
  },
  "carbon-monoxide": {
    atoms: [{ symbol: "C", x: -0.32, y: 0 }, { symbol: "O", x: 0.32, y: 0 }],
    bonds: [{ from: 0, to: 1, order: 3 }],
  },
  "sulfur-dioxide": {
    atoms: [{ symbol: "O", x: -0.48, y: 0.24 }, { symbol: "S", x: 0, y: -0.08 }, { symbol: "O", x: 0.48, y: 0.24 }],
    bonds: [{ from: 0, to: 1, order: 2 }, { from: 1, to: 2, order: 2 }],
  },
  "nitric-oxide": {
    atoms: [{ symbol: "N", x: -0.32, y: 0 }, { symbol: "O", x: 0.32, y: 0 }],
    bonds: [{ from: 0, to: 1, order: 2 }],
  },
  "nitrogen-dioxide": {
    atoms: [{ symbol: "O", x: -0.48, y: 0.24 }, { symbol: "N", x: 0, y: -0.08 }, { symbol: "O", x: 0.48, y: 0.24 }],
    bonds: [{ from: 0, to: 1 }, { from: 1, to: 2, order: 2 }],
  },
  "magnesium-oxide": {
    atoms: [{ symbol: "Mg", x: -0.34, y: 0 }, { symbol: "O", x: 0.34, y: 0 }],
    bonds: [{ from: 0, to: 1 }],
  },
  "iron-oxide": {
    atoms: [{ symbol: "O", x: -0.52, y: -0.36 }, { symbol: "Fe", x: -0.18, y: 0 }, { symbol: "O", x: 0, y: 0.46 }, { symbol: "Fe", x: 0.18, y: 0 }, { symbol: "O", x: 0.52, y: -0.36 }],
    bonds: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }],
  },
  "calcium-carbonate": {
    atoms: [{ symbol: "Ca", x: -0.62, y: 0 }, { symbol: "C", x: 0, y: 0 }, { symbol: "O", x: 0, y: -0.55 }, { symbol: "O", x: 0.48, y: 0.3 }, { symbol: "O", x: -0.48, y: 0.3 }],
    bonds: [{ from: 0, to: 4 }, { from: 1, to: 2, order: 2 }, { from: 1, to: 3 }, { from: 1, to: 4 }],
  },
  "sodium-hydroxide": {
    atoms: [{ symbol: "Na", x: -0.55, y: 0 }, { symbol: "O", x: 0.05, y: 0 }, { symbol: "H", x: 0.55, y: 0 }],
    bonds: [{ from: 0, to: 1 }, { from: 1, to: 2 }],
  },
  "chloroform": {
    atoms: [{ symbol: "C", x: 0, y: 0 }, { symbol: "H", x: 0, y: -0.58 }, { symbol: "Cl", x: -0.55, y: 0.32 }, { symbol: "Cl", x: 0.55, y: 0.32 }, { symbol: "Cl", x: 0, y: 0.64 }],
    bonds: [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 }, { from: 0, to: 4 }],
  },
  "hydrogen-sulfide": {
    atoms: [{ symbol: "S", x: 0, y: -0.1 }, { symbol: "H", x: -0.48, y: 0.36 }, { symbol: "H", x: 0.48, y: 0.36 }],
    bonds: [{ from: 0, to: 1 }, { from: 0, to: 2 }],
  },
  "sulfuric-acid": {
    atoms: [{ symbol: "S", x: 0, y: 0 }, { symbol: "O", x: -0.42, y: -0.42 }, { symbol: "O", x: 0.42, y: -0.42 }, { symbol: "O", x: -0.42, y: 0.42 }, { symbol: "O", x: 0.42, y: 0.42 }, { symbol: "H", x: -0.72, y: 0.58 }, { symbol: "H", x: 0.72, y: 0.58 }],
    bonds: [{ from: 0, to: 1, order: 2 }, { from: 0, to: 2, order: 2 }, { from: 0, to: 3 }, { from: 0, to: 4 }, { from: 3, to: 5 }, { from: 4, to: 6 }],
  },
  "methanol": {
    atoms: [{ symbol: "C", x: -0.24, y: 0 }, { symbol: "O", x: 0.32, y: 0 }, { symbol: "H", x: -0.62, y: -0.36 }, { symbol: "H", x: -0.66, y: 0.28 }, { symbol: "H", x: -0.22, y: 0.54 }, { symbol: "H", x: 0.7, y: 0 }],
    bonds: [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 }, { from: 0, to: 4 }, { from: 1, to: 5 }],
  },
  "carbonic-acid": {
    atoms: [{ symbol: "C", x: 0, y: 0 }, { symbol: "O", x: 0, y: -0.55 }, { symbol: "O", x: -0.5, y: 0.28 }, { symbol: "O", x: 0.5, y: 0.28 }, { symbol: "H", x: -0.78, y: 0.52 }, { symbol: "H", x: 0.78, y: 0.52 }],
    bonds: [{ from: 0, to: 1, order: 2 }, { from: 0, to: 2 }, { from: 0, to: 3 }, { from: 2, to: 4 }, { from: 3, to: 5 }],
  },
  "chlorine-gas": {
    atoms: [{ symbol: "Cl", x: -0.32, y: 0 }, { symbol: "Cl", x: 0.32, y: 0 }],
    bonds: [{ from: 0, to: 1 }],
  },
  "oxygen-gas": {
    atoms: [{ symbol: "O", x: -0.32, y: 0 }, { symbol: "O", x: 0.32, y: 0 }],
    bonds: [{ from: 0, to: 1, order: 2 }],
  },
  "hydrogen-gas": {
    atoms: [{ symbol: "H", x: -0.28, y: 0 }, { symbol: "H", x: 0.28, y: 0 }],
    bonds: [{ from: 0, to: 1 }],
  },
};

export function getCompoundHint(compound: CompoundDefinition): string {
  return COMPOUND_HINTS[compound.id] ?? "A familiar substance waiting to be discovered.";
}

export function getCompoundStructure(compound: CompoundDefinition): CompoundStructure {
  return COMPOUND_STRUCTURES[compound.id] ?? {
    atoms: Object.entries(compound.elements).flatMap(([symbol, count]) =>
      Array.from({ length: count }, (_, index) => ({ symbol, x: index * 0.2, y: 0 })),
    ),
    bonds: [],
  };
}
