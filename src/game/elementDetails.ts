import { COMPOUNDS } from "./compounds";
import { type Element } from "./elements";

export interface ElementPhysicalDetails {
  molarMass: string;
  meltingPoint?: string;
  boilingPoint?: string;
  density?: string;
  phase: string;
  uses: string[];
  compounds: string[];
  trivia: string;
  sample: string;
}

const KNOWN_PHYSICAL: Record<
  string,
  Pick<ElementPhysicalDetails, "meltingPoint" | "boilingPoint" | "density" | "phase" | "uses" | "trivia" | "sample">
> = {
  H: {
    meltingPoint: "-259.16 C",
    boilingPoint: "-252.87 C",
    density: "0.0000899 g/cm3",
    phase: "Gas",
    uses: ["Rocket fuel", "Ammonia production", "Fuel cells"],
    trivia: "Hydrogen is the lightest element and the main fuel of stars.",
    sample: "Colorless gas; usually seen in sealed cylinders or plasma tubes.",
  },
  He: {
    meltingPoint: "-272.2 C at pressure",
    boilingPoint: "-268.93 C",
    density: "0.0001785 g/cm3",
    phase: "Gas",
    uses: ["Cryogenics", "Balloons", "Leak detection"],
    trivia: "Liquid helium stays fluid at temperatures where almost everything else freezes.",
    sample: "Colorless gas; often represented by glowing discharge tubes.",
  },
  Li: {
    meltingPoint: "180.54 C",
    boilingPoint: "1342 C",
    density: "0.534 g/cm3",
    phase: "Solid",
    uses: ["Rechargeable batteries", "Light alloys", "Mood-stabilizing medicine"],
    trivia: "Lithium is the least dense metal.",
    sample: "Soft silvery metal that tarnishes quickly in air.",
  },
  Be: {
    meltingPoint: "1287 C",
    boilingPoint: "2469 C",
    density: "1.85 g/cm3",
    phase: "Solid",
    uses: ["Aerospace parts", "X-ray windows", "Precision instruments"],
    trivia: "Beryllium is stiff, light, and toxic as dust.",
    sample: "Hard steel-gray metal.",
  },
  B: {
    meltingPoint: "2076 C",
    boilingPoint: "3927 C",
    density: "2.34 g/cm3",
    phase: "Solid",
    uses: ["Borosilicate glass", "Detergents", "Semiconductors"],
    trivia: "Boron compounds help make heat-resistant glass.",
    sample: "Dark, brittle metalloid powder or crystals.",
  },
  C: {
    meltingPoint: "Sublimes near 3642 C",
    boilingPoint: "4827 C",
    density: "2.26 g/cm3 graphite",
    phase: "Solid",
    uses: ["Steelmaking", "Pencils", "Carbon fiber"],
    trivia: "Diamond and graphite are both pure carbon with different structures.",
    sample: "Black graphite, clear diamond, or carbon fiber weave.",
  },
  N: {
    meltingPoint: "-210.0 C",
    boilingPoint: "-195.8 C",
    density: "0.001251 g/cm3",
    phase: "Gas",
    uses: ["Fertilizers", "Food packaging", "Liquid-nitrogen cooling"],
    trivia: "Nitrogen gas makes up most of Earth's atmosphere.",
    sample: "Colorless gas; liquid nitrogen is pale and boiling-cold.",
  },
  O: {
    meltingPoint: "-218.79 C",
    boilingPoint: "-182.96 C",
    density: "0.001429 g/cm3",
    phase: "Gas",
    uses: ["Breathing gas", "Steelmaking", "Medical oxygen"],
    trivia: "Oxygen supports combustion but is not itself a fuel.",
    sample: "Colorless gas; liquid oxygen is pale blue.",
  },
  F: {
    meltingPoint: "-219.67 C",
    boilingPoint: "-188.11 C",
    density: "0.001696 g/cm3",
    phase: "Gas",
    uses: ["Fluoropolymers", "Toothpaste fluorides", "Uranium processing"],
    trivia: "Fluorine is the most reactive element.",
    sample: "Pale yellow gas handled only with specialized equipment.",
  },
  Ne: {
    meltingPoint: "-248.59 C",
    boilingPoint: "-246.05 C",
    density: "0.000900 g/cm3",
    phase: "Gas",
    uses: ["Neon signs", "Lasers", "High-voltage indicators"],
    trivia: "Neon glows red-orange in discharge tubes.",
    sample: "Colorless gas with a vivid red-orange electric glow.",
  },
  Na: {
    meltingPoint: "97.79 C",
    boilingPoint: "882.9 C",
    density: "0.97 g/cm3",
    phase: "Solid",
    uses: ["Sodium-vapor lamps", "Coolants", "Chemical synthesis"],
    trivia: "Sodium reacts violently with water and is stored under oil.",
    sample: "Soft silvery metal that rapidly tarnishes.",
  },
  Mg: {
    meltingPoint: "650 C",
    boilingPoint: "1091 C",
    density: "1.74 g/cm3",
    phase: "Solid",
    uses: ["Light alloys", "Fireworks", "Die-cast parts"],
    trivia: "Magnesium burns with an intense white flame.",
    sample: "Light silvery metal ribbon or shavings.",
  },
  Al: {
    meltingPoint: "660.32 C",
    boilingPoint: "2519 C",
    density: "2.70 g/cm3",
    phase: "Solid",
    uses: ["Aircraft", "Cans and foil", "Power lines"],
    trivia: "Aluminum is protected by a thin oxide skin.",
    sample: "Bright silvery lightweight metal.",
  },
  Si: {
    meltingPoint: "1414 C",
    boilingPoint: "3265 C",
    density: "2.33 g/cm3",
    phase: "Solid",
    uses: ["Computer chips", "Solar cells", "Glass"],
    trivia: "Silicon is central to modern electronics.",
    sample: "Dark gray crystalline solid with metallic shine.",
  },
  P: {
    meltingPoint: "44.15 C white phosphorus",
    boilingPoint: "280.5 C",
    density: "1.82 g/cm3 white phosphorus",
    phase: "Solid",
    uses: ["Fertilizers", "Matches", "Phosphoric acid"],
    trivia: "Phosphorus has several allotropes with very different behavior.",
    sample: "Waxy white, red powder, or black crystalline forms.",
  },
  S: {
    meltingPoint: "115.21 C",
    boilingPoint: "444.6 C",
    density: "2.07 g/cm3",
    phase: "Solid",
    uses: ["Sulfuric acid", "Rubber vulcanization", "Fungicides"],
    trivia: "Sulfur is famous for bright yellow crystals.",
    sample: "Bright yellow brittle solid.",
  },
  Cl: {
    meltingPoint: "-101.5 C",
    boilingPoint: "-34.04 C",
    density: "0.0032 g/cm3",
    phase: "Gas",
    uses: ["Disinfection", "PVC plastic", "Bleaching chemicals"],
    trivia: "Chlorine is a greenish-yellow gas at room temperature.",
    sample: "Green-yellow gas, safely handled only in controlled systems.",
  },
  Ar: {
    meltingPoint: "-189.34 C",
    boilingPoint: "-185.85 C",
    density: "0.001784 g/cm3",
    phase: "Gas",
    uses: ["Welding gas", "Light bulbs", "Inert atmospheres"],
    trivia: "Argon is the most abundant noble gas in Earth's atmosphere.",
    sample: "Colorless gas with a pale violet discharge glow.",
  },
};

const CATEGORY_USES: Record<Element["category"], string[]> = {
  "alkali-metal": ["Reactive salts", "Batteries", "Chemical synthesis"],
  "alkaline-earth": ["Alloys", "Minerals", "Industrial compounds"],
  "transition-metal": ["Alloys", "Catalysts", "Electronics"],
  "post-transition": ["Alloys", "Coatings", "Electronics"],
  metalloid: ["Semiconductors", "Glass and ceramics", "Electronics"],
  "reactive-nonmetal": ["Biochemistry", "Industrial gases", "Chemical synthesis"],
  "noble-gas": ["Lighting", "Inert atmospheres", "Lasers"],
  lanthanide: ["Magnets", "Lighting", "Alloys"],
  actinide: ["Nuclear fuels", "Research", "Nuclear science"],
  unknown: ["Research chemistry", "Nuclear science", "Laboratory studies"],
};

function inferPhase(element: Element): string {
  if (element.category === "noble-gas") return "Gas";
  if (["H", "N", "O", "F", "Cl"].includes(element.symbol)) return "Gas";
  if (["Br", "Hg"].includes(element.symbol)) return "Liquid";
  if (element.atomicNumber >= 104) return "Synthetic";
  return "Solid";
}

export function getElementCollectionDetails(element: Element): ElementPhysicalDetails {
  const known = KNOWN_PHYSICAL[element.symbol];
  const compounds = COMPOUNDS.filter((compound) => compound.elements[element.symbol] != null)
    .slice(0, 3)
    .map((compound) => `${compound.formula} ${compound.name}`);
  return {
    molarMass: `${element.atomicMass} g/mol`,
    meltingPoint: known?.meltingPoint,
    boilingPoint: known?.boilingPoint,
    density: known?.density,
    phase: known?.phase ?? inferPhase(element),
    uses: CATEGORY_USES[element.category],
    compounds,
    trivia:
      `${element.name} belongs to the ${element.category.replace("-", " ")} family in period ${element.period}.`,
    sample: `A collection sample would typically be shown as a ${element.category.replace("-", " ")} material specimen.`,
  };
}
