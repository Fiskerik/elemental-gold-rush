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
  compound("ammonium", "Ammonium", "NH₄", { N: 1, H: 4 }, 1900, "common", "Ammonium is a positively charged nitrogen-hydrogen ion found in many salts and fertilizers."),
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
  compound("nitrogen-gas", "Nitrogen Gas", "N₂", { N: 2 }, 1400, "common", "Nitrogen gas makes up most of Earth's atmosphere."),
  compound("hydrogen-fluoride", "Hydrogen Fluoride", "HF", { H: 1, F: 1 }, 1900, "common", "Hydrogen fluoride dissolves in water to form hydrofluoric acid."),
  compound("lithium-fluoride", "Lithium Fluoride", "LiF", { Li: 1, F: 1 }, 2100, "common", "Lithium fluoride is a very stable salt used in optics and radiation detectors."),
  compound("sodium-oxide", "Sodium Oxide", "Na₂O", { Na: 2, O: 1 }, 2400, "uncommon", "Sodium oxide reacts rapidly with water to form sodium hydroxide."),
  compound("magnesium-chloride", "Magnesium Chloride", "MgCl₂", { Mg: 1, Cl: 2 }, 2500, "uncommon", "Magnesium chloride salts are found in seawater and brines."),
  compound("calcium-chloride", "Calcium Chloride", "CaCl₂", { Ca: 1, Cl: 2 }, 2600, "uncommon", "Calcium chloride is used for de-icing roads and drying gases."),
  compound("iron-sulfide", "Iron Sulfide", "FeS", { Fe: 1, S: 1 }, 2500, "uncommon", "Iron sulfide minerals can form near hydrothermal vents."),
  compound("sodium-sulfide", "Sodium Sulfide", "Na₂S", { Na: 2, S: 1 }, 2700, "uncommon", "Sodium sulfide is used in paper pulping and leather processing."),
  compound("silicon-carbide", "Silicon Carbide", "SiC", { Si: 1, C: 1 }, 2800, "uncommon", "Silicon carbide is an extremely hard ceramic used in abrasives and electronics."),
  compound("carbon-disulfide", "Carbon Disulfide", "CS₂", { C: 1, S: 2 }, 2900, "uncommon", "Carbon disulfide is a volatile liquid used in chemical manufacturing."),
  compound("phosphine", "Phosphine", "PH₃", { P: 1, H: 3 }, 3000, "uncommon", "Phosphine is a reactive gas sometimes discussed as a possible biosignature."),
  compound("phosphorus-trichloride", "Phosphorus Trichloride", "PCl₃", { P: 1, Cl: 3 }, 3400, "rare", "Phosphorus trichloride is a key reagent for making organophosphorus compounds."),
  compound("carbon-tetrachloride", "Carbon Tetrachloride", "CCl₄", { C: 1, Cl: 4 }, 3600, "rare", "Carbon tetrachloride was once used in fire extinguishers and solvents."),
  compound("silicon-tetrachloride", "Silicon Tetrachloride", "SiCl₄", { Si: 1, Cl: 4 }, 3600, "rare", "Silicon tetrachloride is used to make ultra-pure silicon and silica."),
  compound("calcium-hydroxide", "Calcium Hydroxide", "Ca(OH)₂", { Ca: 1, O: 2, H: 2 }, 3300, "rare", "Calcium hydroxide is slaked lime, used in mortar, water treatment, and food processing."),
  compound("nitric-acid", "Nitric Acid", "HNO₃", { H: 1, N: 1, O: 3 }, 3400, "rare", "Nitric acid is a strong oxidizing acid used to make fertilizers and explosives."),
  compound("sodium-carbonate", "Sodium Carbonate", "Na₂CO₃", { Na: 2, C: 1, O: 3 }, 3500, "rare", "Sodium carbonate, or soda ash, is used in glassmaking and cleaning products."),
  compound("ethanol", "Ethanol", "C₂H₆O", { C: 2, H: 6, O: 1 }, 3600, "rare", "Ethanol is the alcohol in beverages and is also used as a fuel and solvent."),
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
  "ammonium": "A nitrogen center surrounded by four hydrogens.",
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
  "nitrogen-gas": "The quiet main ingredient of the air around you.",
  "hydrogen-fluoride": "A tiny hydrogen-halogen molecule that becomes a very aggressive acid in water.",
  "lithium-fluoride": "A tough lithium salt used where clear crystals must resist radiation.",
  "sodium-oxide": "A sodium-rich oxide that reacts eagerly with water.",
  "magnesium-chloride": "A seawater salt with one metal atom and two chlorine atoms.",
  "calcium-chloride": "A water-loving salt often scattered on icy roads.",
  "iron-sulfide": "A dark mineral pairing iron with sulfur.",
  "sodium-sulfide": "A sulfur salt used in tough industrial chemistry.",
  "silicon-carbide": "A very hard ceramic built from silicon and carbon.",
  "carbon-disulfide": "A carbon atom flanked by two sulfur atoms.",
  "phosphine": "A simple phosphorus hydride with a sharp, reactive personality.",
  "phosphorus-trichloride": "A phosphorus atom bonded to three chlorines.",
  "carbon-tetrachloride": "A carbon center surrounded by four chlorine atoms.",
  "silicon-tetrachloride": "A silicon center surrounded by four chlorine atoms.",
  "calcium-hydroxide": "A lime compound with calcium and two hydroxide groups.",
  "nitric-acid": "A strong acid with hydrogen, nitrogen, and three oxygens.",
  "sodium-carbonate": "A soda-ash compound used in glass and cleaning.",
  "ethanol": "A two-carbon alcohol with six hydrogens and one oxygen.",
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
  "ammonium": {
    atoms: [{ symbol: "N", x: 0, y: 0 }, { symbol: "H", x: -0.5, y: -0.34 }, { symbol: "H", x: 0.5, y: -0.34 }, { symbol: "H", x: -0.5, y: 0.36 }, { symbol: "H", x: 0.5, y: 0.36 }],
    bonds: [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 }, { from: 0, to: 4 }],
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
  "ethanol": {
    atoms: [{ symbol: "C", x: -0.42, y: 0 }, { symbol: "C", x: 0.04, y: 0 }, { symbol: "O", x: 0.5, y: 0 }, { symbol: "H", x: -0.78, y: -0.32 }, { symbol: "H", x: -0.78, y: 0.32 }, { symbol: "H", x: -0.42, y: 0.52 }, { symbol: "H", x: 0.04, y: -0.48 }, { symbol: "H", x: 0.04, y: 0.48 }, { symbol: "H", x: 0.84, y: 0 }],
    bonds: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 0, to: 3 }, { from: 0, to: 4 }, { from: 0, to: 5 }, { from: 1, to: 6 }, { from: 1, to: 7 }, { from: 2, to: 8 }],
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
