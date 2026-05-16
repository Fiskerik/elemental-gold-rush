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
