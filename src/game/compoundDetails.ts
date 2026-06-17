import { type CompoundDefinition } from "./compounds";
import { ELEMENTS } from "./elements";

export interface CompoundCollectionDetails {
  molarMass: string;
  composition: string;
  atomCount: string;
  elementTypes: string;
  useCase: string;
  chemistryNote: string;
}

const COMPOUND_USE_CASES: Record<string, string> = {
  water: "Drinking, cooling, cleaning, farming, and nearly every biological process.",
  "carbon-dioxide":
    "Carbonated drinks, fire extinguishers, plant growth systems, and dry ice cooling.",
  ammonia: "One of the world's most important starting materials for nitrogen fertilizers.",
  ammonium: "Appears in fertilizer salts, cleaning chemistry, and biological nitrogen cycles.",
  methane: "Major fuel in natural gas and a feedstock for hydrogen and chemical production.",
  "sodium-chloride": "Table salt, food preservation, water softening, and chemical manufacturing.",
  "hydrogen-peroxide": "Mild disinfectant, bleaching agent, and oxygen-releasing cleaner.",
  ozone: "Water treatment, odor control, and atmospheric ultraviolet shielding.",
  "hydrogen-chloride": "Used to make hydrochloric acid for metal cleaning and chemical processing.",
  "hydrogen-cyanide":
    "Used industrially to make plastics and specialty chemicals, but extremely hazardous.",
  "nitrous-oxide": "Medical anesthetic, whipped-cream chargers, and engine performance systems.",
  "calcium-oxide": "Cement, steelmaking, soil treatment, and flue-gas cleanup.",
  "silicon-dioxide": "Glass, ceramics, concrete, optical fibers, and semiconductor manufacturing.",
  "acetic-acid": "Vinegar, food preservation, solvents, and polymer production.",
  "carbon-monoxide":
    "Industrial reducing gas and chemical feedstock, but deadly in enclosed spaces.",
  "sulfur-dioxide":
    "Preservatives, bleaching, sulfuric acid production, and air-pollution monitoring.",
  "nitric-oxide": "Medical vasodilation, signaling research, and nitric acid production chemistry.",
  "nitrogen-dioxide": "Intermediate in nitric acid production and a key air-quality pollutant.",
  "magnesium-oxide": "Refractory bricks, antacids, supplements, and insulation materials.",
  "iron-oxide": "Pigments, polishing compounds, iron ore chemistry, and magnetic materials.",
  "calcium-carbonate": "Cement, chalk, antacids, paper filler, and agricultural lime.",
  "sodium-hydroxide": "Soap making, drain cleaners, paper pulping, and chemical manufacturing.",
  chloroform: "Laboratory solvent and chemical intermediate, now tightly controlled for safety.",
  "hydrogen-sulfide":
    "Industrial warning gas, sulfur chemistry, and geologic/mining safety monitoring.",
  "sulfuric-acid":
    "Fertilizer, batteries, metal processing, oil refining, and chemical production.",
  methanol: "Fuel, solvent, antifreeze component, and feedstock for formaldehyde and plastics.",
  "carbonic-acid": "The weak acid behind fizzy drinks and natural carbonate buffering.",
  "chlorine-gas": "Disinfectant production, PVC manufacturing, and water treatment chemistry.",
  "oxygen-gas": "Medical oxygen, steelmaking, welding, rockets, and life-support systems.",
  "hydrogen-gas": "Fuel cells, rocket fuel, ammonia production, and refinery processing.",
  "nitrogen-gas": "Food packaging, inert atmospheres, tire filling, and liquid-nitrogen cooling.",
  "hydrogen-fluoride": "Fluoropolymer production, metal processing, and glass etching chemistry.",
  "lithium-fluoride": "Optics, radiation detectors, molten-salt chemistry, and ceramics.",
  "sodium-oxide":
    "Specialty glass and ceramic chemistry; reacts with water to make sodium hydroxide.",
  "magnesium-chloride": "De-icing, dust control, magnesium metal production, and brine chemistry.",
  "calcium-chloride": "Road de-icing, drying agents, concrete acceleration, and humidity control.",
  "iron-sulfide": "Mineralogy, sulfur chemistry, and research into hydrothermal vent conditions.",
  "sodium-sulfide": "Paper pulping, leather processing, dyes, and ore flotation chemistry.",
  "silicon-carbide":
    "Abrasives, cutting tools, high-power electronics, and heat-resistant ceramics.",
  "carbon-disulfide": "Chemical manufacturing, rayon production history, and solvent chemistry.",
  phosphine: "Semiconductor doping, fumigation chemistry, and atmospheric research.",
  "phosphorus-trichloride":
    "Manufacturing organophosphorus chemicals, pesticides, and flame retardants.",
  "carbon-tetrachloride": "Historical solvent and fire suppressant; now mostly restricted.",
  "silicon-tetrachloride": "Ultra-pure silicon, optical fibers, and high-purity silica production.",
  "calcium-hydroxide": "Mortar, plaster, water treatment, soil stabilization, and food processing.",
  "nitric-acid": "Fertilizers, explosives, metal etching, and nitrate chemistry.",
  "sodium-carbonate": "Glassmaking, laundry detergents, water softening, and pH control.",
  ethanol: "Beverages, disinfectants, solvents, fuels, and pharmaceutical extraction.",
  "titanium-dioxide": "White pigment in paint, toothpaste, sunscreen, plastics, and paper.",
  "zinc-oxide": "Sunscreen, diaper rash cream, rubber production, and ceramic glazes.",
  "aluminum-oxide": "Abrasives, ceramics, catalyst supports, and sapphire/ruby gemstones.",
  ethylene: "Plastic production, fruit ripening, and large-scale organic chemical manufacturing.",
  acetylene: "Welding fuel, metal cutting, and chemical synthesis.",
  formaldehyde: "Resins, disinfectants, specimen preservation, and building-material chemistry.",
  urea: "Nitrogen fertilizer, animal feed supplements, and dermatology creams.",
  "ammonium-nitrate": "High-nitrogen fertilizer and controlled blasting chemistry.",
  "potassium-chloride": "Salt substitute, fertilizer, medicine, and potassium source.",
  "magnesium-sulfate":
    "Epsom salt baths, medical magnesium, agriculture, and brewing water adjustment.",
  "calcium-sulfate": "Plaster, drywall, gypsum cement, casts, and soil conditioning.",
};

const ATOMIC_MASS_BY_SYMBOL = new Map(
  ELEMENTS.map((element) => [element.symbol, Number.parseFloat(element.atomicMass)] as const),
);

function formatMass(mass: number): string {
  if (!Number.isFinite(mass) || mass <= 0) return "Not listed";
  return `${mass.toFixed(mass >= 100 ? 1 : 2)} g/mol`;
}

function pluralizeAtom(count: number): string {
  return count === 1 ? "1 atom" : `${count} atoms`;
}

export function getCompoundCollectionDetails(
  compound: CompoundDefinition,
): CompoundCollectionDetails {
  const entries = Object.entries(compound.elements).filter(([, count]) => count > 0);
  const molarMass = entries.reduce((sum, [symbol, count]) => {
    return sum + (ATOMIC_MASS_BY_SYMBOL.get(symbol) ?? 0) * count;
  }, 0);
  const composition = entries.map(([symbol, count]) => `${symbol} x${count}`).join(", ");
  const elementTypes = entries
    .map(([symbol]) => ELEMENTS.find((element) => element.symbol === symbol)?.name ?? symbol)
    .join(", ");

  return {
    molarMass: formatMass(molarMass),
    composition,
    atomCount: pluralizeAtom(compound.totalAtoms),
    elementTypes,
    useCase:
      COMPOUND_USE_CASES[compound.id] ??
      "A useful chemistry entry with applications in materials, biology, industry, or research.",
    chemistryNote: `${compound.formula} combines ${elementTypes}. In-game, forming it is worth ${compound.bonusScore.toLocaleString()} bonus points.`,
  };
}
