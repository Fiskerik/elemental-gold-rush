// All 118 elements of the periodic table with game data

export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth'
  | 'transition-metal'
  | 'post-transition'
  | 'metalloid'
  | 'reactive-nonmetal'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide'
  | 'unknown';

export interface Element {
  atomicNumber: number;
  symbol: string;
  name: string;
  category: ElementCategory;
  /** Hex color for the element ball */
  color: string;
  /** Glow/shadow color (usually a lighter version) */
  glowColor: string;
  atomicMass: string;
  period: number;
  group: number | null;
  fact: string;
}

// Category → base color mapping
export const CATEGORY_COLORS: Record<ElementCategory, { color: string; glow: string }> = {
  'alkali-metal':      { color: '#FF5252', glow: '#FF8A80' },
  'alkaline-earth':    { color: '#40C4FF', glow: '#82EAFF' },
  'transition-metal':  { color: '#448AFF', glow: '#82B1FF' },
  'post-transition':   { color: '#69F0AE', glow: '#B9F6CA' },
  'metalloid':         { color: '#FFD740', glow: '#FFE57F' },
  'reactive-nonmetal': { color: '#64FFDA', glow: '#A7FFEB' },
  'noble-gas':         { color: '#EA80FC', glow: '#F48FB1' },
  'lanthanide':        { color: '#FFAB40', glow: '#FFD180' },
  'actinide':          { color: '#FF6E40', glow: '#FF9E80' },
  'unknown':           { color: '#90A4AE', glow: '#CFD8DC' },
};

export const ELEMENTS: Element[] = [
  // Period 1
  {
    atomicNumber: 1, symbol: 'H', name: 'Hydrogen', category: 'reactive-nonmetal',
    color: '#64B5F6', glowColor: '#BBDEFB', atomicMass: '1.008', period: 1, group: 1,
    fact: 'The most abundant element in the universe — 75% of all normal matter is hydrogen. It powers the Sun via nuclear fusion.',
  },
  {
    atomicNumber: 2, symbol: 'He', name: 'Helium', category: 'noble-gas',
    color: '#F48FB1', glowColor: '#FCE4EC', atomicMass: '4.003', period: 1, group: 18,
    fact: 'Helium is the only element discovered on the Sun before being found on Earth. It was spotted in the solar spectrum in 1868.',
  },
  // Period 2
  {
    atomicNumber: 3, symbol: 'Li', name: 'Lithium', category: 'alkali-metal',
    color: '#EF5350', glowColor: '#FFCDD2', atomicMass: '6.941', period: 2, group: 1,
    fact: 'Lithium is so light it floats on water — and then reacts with it! It powers your phone\'s battery and is used in mood-stabilizing medication.',
  },
  {
    atomicNumber: 4, symbol: 'Be', name: 'Beryllium', category: 'alkaline-earth',
    color: '#29B6F6', glowColor: '#B3E5FC', atomicMass: '9.012', period: 2, group: 2,
    fact: 'Beryllium is 6× stiffer than steel but 30% lighter. NASA uses it in space telescopes and spacecraft mirrors.',
  },
  {
    atomicNumber: 5, symbol: 'B', name: 'Boron', category: 'metalloid',
    color: '#FFA726', glowColor: '#FFE0B2', atomicMass: '10.811', period: 2, group: 13,
    fact: 'Boron is essential for plant cell walls and found in borax laundry detergent. Some compounds are harder than diamond.',
  },
  {
    atomicNumber: 6, symbol: 'C', name: 'Carbon', category: 'reactive-nonmetal',
    color: '#78909C', glowColor: '#CFD8DC', atomicMass: '12.011', period: 2, group: 14,
    fact: 'Carbon forms more compounds than all other elements combined. Life as we know it is carbon-based, and a 1-carat diamond is pure carbon.',
  },
  {
    atomicNumber: 7, symbol: 'N', name: 'Nitrogen', category: 'reactive-nonmetal',
    color: '#42A5F5', glowColor: '#BBDEFB', atomicMass: '14.007', period: 2, group: 15,
    fact: 'Nitrogen makes up 78% of Earth\'s atmosphere. Liquid nitrogen (−196°C) is used to preserve biological samples and make instant ice cream!',
  },
  {
    atomicNumber: 8, symbol: 'O', name: 'Oxygen', category: 'reactive-nonmetal',
    color: '#EF5350', glowColor: '#FFCDD2', atomicMass: '15.999', period: 2, group: 16,
    fact: 'Oxygen was discovered in 1774 and makes up 21% of air and 65% of the human body by mass. Without it, fires and life would be impossible.',
  },
  {
    atomicNumber: 9, symbol: 'F', name: 'Fluorine', category: 'reactive-nonmetal',
    color: '#FFEE58', glowColor: '#FFF9C4', atomicMass: '18.998', period: 2, group: 17,
    fact: 'Fluorine is the most reactive element — it attacks glass and even noble gases. Your non-stick pan is coated in Teflon, a fluorine compound.',
  },
  {
    atomicNumber: 10, symbol: 'Ne', name: 'Neon', category: 'noble-gas',
    color: '#FF7043', glowColor: '#FFCCBC', atomicMass: '20.180', period: 2, group: 18,
    fact: 'Neon glows bright red-orange in vacuum tubes — "neon signs" were a 20th-century icon. There\'s very little neon: just 0.0018% of Earth\'s atmosphere.',
  },
  // Period 3
  {
    atomicNumber: 11, symbol: 'Na', name: 'Sodium', category: 'alkali-metal',
    color: '#FFCA28', glowColor: '#FFF8E1', atomicMass: '22.990', period: 3, group: 1,
    fact: 'Sodium explodes violently in water. Yet bonded with chlorine, it becomes table salt — essential for life. Your neurons fire using sodium ions.',
  },
  {
    atomicNumber: 12, symbol: 'Mg', name: 'Magnesium', category: 'alkaline-earth',
    color: '#26A69A', glowColor: '#B2DFDB', atomicMass: '24.305', period: 3, group: 2,
    fact: 'Magnesium is the chlorophyll center — every green plant contains it. It burns blindingly bright (used in flares) and is in over 300 enzymes in your body.',
  },
  {
    atomicNumber: 13, symbol: 'Al', name: 'Aluminium', category: 'post-transition',
    color: '#90A4AE', glowColor: '#ECEFF1', atomicMass: '26.982', period: 3, group: 13,
    fact: 'Once rarer than gold, aluminium is now the most-used metal after iron. It\'s infinitely recyclable — recycling it uses only 5% of the energy of smelting.',
  },
  {
    atomicNumber: 14, symbol: 'Si', name: 'Silicon', category: 'metalloid',
    color: '#A1887F', glowColor: '#D7CCC8', atomicMass: '28.086', period: 3, group: 14,
    fact: 'Silicon Valley is named after this element — it\'s the foundation of all modern electronics. Sand is silicon dioxide, and your phone\'s chip is ultra-pure silicon.',
  },
  {
    atomicNumber: 15, symbol: 'P', name: 'Phosphorus', category: 'reactive-nonmetal',
    color: '#FF7043', glowColor: '#FFCCBC', atomicMass: '30.974', period: 3, group: 15,
    fact: 'White phosphorus glows in the dark and was used to make "strike-anywhere" matches. DNA and RNA backbones are built from phosphate groups.',
  },
  {
    atomicNumber: 16, symbol: 'S', name: 'Sulfur', category: 'reactive-nonmetal',
    color: '#FDD835', glowColor: '#FFF9C4', atomicMass: '32.06', period: 3, group: 16,
    fact: 'The foul rotten-egg smell is hydrogen sulfide, a sulfur compound. Yet elemental sulfur has no smell — bright yellow, solid, and it crackles with static electricity.',
  },
  {
    atomicNumber: 17, symbol: 'Cl', name: 'Chlorine', category: 'reactive-nonmetal',
    color: '#9CCC65', glowColor: '#DCEDC8', atomicMass: '35.45', period: 3, group: 17,
    fact: 'Chlorine gas was used as a chemical weapon in WWI. Yet in tiny amounts it disinfects drinking water, saving millions of lives every year.',
  },
  {
    atomicNumber: 18, symbol: 'Ar', name: 'Argon', category: 'noble-gas',
    color: '#CE93D8', glowColor: '#F3E5F5', atomicMass: '39.948', period: 3, group: 18,
    fact: 'Argon makes up nearly 1% of the atmosphere — more than CO₂. Light bulbs are filled with argon to prevent the tungsten filament from burning.',
  },
  // Period 4
  {
    atomicNumber: 19, symbol: 'K', name: 'Potassium', category: 'alkali-metal',
    color: '#EF5350', glowColor: '#FFCDD2', atomicMass: '39.098', period: 4, group: 1,
    fact: 'Potassium\'s symbol K comes from "kalium" (Latin). Bananas are famous for it, but potatoes actually contain more. It\'s critical for your heartbeat.',
  },
  {
    atomicNumber: 20, symbol: 'Ca', name: 'Calcium', category: 'alkaline-earth',
    color: '#26C6DA', glowColor: '#B2EBF2', atomicMass: '40.078', period: 4, group: 2,
    fact: 'Calcium is the most abundant mineral in the human body — 99% is in bones and teeth. Seashells, marble, and chalk are all calcium carbonate.',
  },
  {
    atomicNumber: 21, symbol: 'Sc', name: 'Scandium', category: 'transition-metal',
    color: '#5C6BC0', glowColor: '#C5CAE9', atomicMass: '44.956', period: 4, group: 3,
    fact: 'Scandium is incredibly rare on Earth. Tiny amounts added to aluminium alloys create super-strong materials used in MiG fighter jet frames.',
  },
  {
    atomicNumber: 22, symbol: 'Ti', name: 'Titanium', category: 'transition-metal',
    color: '#42A5F5', glowColor: '#BBDEFB', atomicMass: '47.867', period: 4, group: 4,
    fact: 'Titanium is as strong as steel but 45% lighter, and completely biocompatible. Hip implants, aircraft, and expensive jewelry are all made from it.',
  },
  {
    atomicNumber: 23, symbol: 'V', name: 'Vanadium', category: 'transition-metal',
    color: '#7E57C2', glowColor: '#D1C4E9', atomicMass: '50.942', period: 4, group: 5,
    fact: 'Vanadium steel was used in the first mass-produced cars (Model T Ford). Sea squirts (tiny marine animals) concentrate vanadium in their blood.',
  },
  {
    atomicNumber: 24, symbol: 'Cr', name: 'Chromium', category: 'transition-metal',
    color: '#26C6DA', glowColor: '#B2EBF2', atomicMass: '51.996', period: 4, group: 6,
    fact: 'Chrome bumpers! Chromium is named after "chroma" (color) because its compounds are brilliantly colored. Rubies are red because of chromium impurities.',
  },
  {
    atomicNumber: 25, symbol: 'Mn', name: 'Manganese', category: 'transition-metal',
    color: '#EC407A', glowColor: '#FCE4EC', atomicMass: '54.938', period: 4, group: 7,
    fact: 'Manganese was used to decolorize glass since ancient times. Most steel contains ~1% manganese to improve hardness and strength.',
  },
  {
    atomicNumber: 26, symbol: 'Fe', name: 'Iron', category: 'transition-metal',
    color: '#FF7043', glowColor: '#FFCCBC', atomicMass: '55.845', period: 4, group: 8,
    fact: 'Iron is the most common element on Earth by mass (it makes up the core!) and one of the most used metals. Your blood\'s red color comes from iron in hemoglobin.',
  },
  {
    atomicNumber: 27, symbol: 'Co', name: 'Cobalt', category: 'transition-metal',
    color: '#1E88E5', glowColor: '#BBDEFB', atomicMass: '58.933', period: 4, group: 9,
    fact: 'Cobalt blue has been treasured by artists for centuries. Today, cobalt is crucial for rechargeable batteries (lithium-cobalt-oxide) powering EVs and phones.',
  },
  {
    atomicNumber: 28, symbol: 'Ni', name: 'Nickel', category: 'transition-metal',
    color: '#78909C', glowColor: '#ECEFF1', atomicMass: '58.693', period: 4, group: 10,
    fact: 'The US 5-cent coin is called a "nickel" but is actually 75% copper. Real nickel is in stainless steel and the Earth\'s inner core.',
  },
  {
    atomicNumber: 29, symbol: 'Cu', name: 'Copper', category: 'transition-metal',
    color: '#FF7043', glowColor: '#FFCCBC', atomicMass: '63.546', period: 4, group: 11,
    fact: 'Copper was the first metal worked by humans (~9000 BCE). It\'s an excellent conductor and has natural antimicrobial properties — hospital touch surfaces use copper to fight bacteria.',
  },
  {
    atomicNumber: 30, symbol: 'Zn', name: 'Zinc', category: 'transition-metal',
    color: '#78909C', glowColor: '#ECEFF1', atomicMass: '65.38', period: 4, group: 12,
    fact: 'Zinc protects iron from rust (galvanization). Most pennies since 1982 are 97.5% zinc with a copper coating. You also need zinc to taste and smell.',
  },
  {
    atomicNumber: 31, symbol: 'Ga', name: 'Gallium', category: 'post-transition',
    color: '#66BB6A', glowColor: '#C8E6C9', atomicMass: '69.723', period: 4, group: 13,
    fact: 'Gallium melts at 29.8°C — in your hand! It\'s liquid in a warm room. Gallium arsenide semiconductors are in LED lights and solar cells.',
  },
  {
    atomicNumber: 32, symbol: 'Ge', name: 'Germanium', category: 'metalloid',
    color: '#FFD740', glowColor: '#FFE57F', atomicMass: '72.630', period: 4, group: 14,
    fact: 'Mendeleev predicted germanium\'s existence (calling it "eka-silicon") before it was discovered in 1886. It was critical in the first transistors.',
  },
  {
    atomicNumber: 33, symbol: 'As', name: 'Arsenic', category: 'metalloid',
    color: '#26A69A', glowColor: '#B2DFDB', atomicMass: '74.922', period: 4, group: 15,
    fact: 'Arsenic was the poison of choice for medieval murderers. Yet arsenic compounds are used to treat certain leukemias — medicine\'s ultimate reversal.',
  },
  {
    atomicNumber: 34, symbol: 'Se', name: 'Selenium', category: 'reactive-nonmetal',
    color: '#FF7043', glowColor: '#FFCCBC', atomicMass: '78.971', period: 4, group: 16,
    fact: 'Selenium is light-sensitive — it was used in early photocopiers. Anti-dandruff shampoos contain selenium sulfide.',
  },
  {
    atomicNumber: 35, symbol: 'Br', name: 'Bromine', category: 'reactive-nonmetal',
    color: '#8D6E63', glowColor: '#D7CCC8', atomicMass: '79.904', period: 4, group: 17,
    fact: 'Bromine is one of only two elements that is liquid at room temperature (the other is mercury). Its name means "stench" in Greek.',
  },
  {
    atomicNumber: 36, symbol: 'Kr', name: 'Krypton', category: 'noble-gas',
    color: '#CE93D8', glowColor: '#F3E5F5', atomicMass: '83.798', period: 4, group: 18,
    fact: 'Krypton gas is used in high-performance flashlights and photography strobes. The meter was once defined by a krypton-86 spectral line.',
  },
  // Period 5
  {
    atomicNumber: 37, symbol: 'Rb', name: 'Rubidium', category: 'alkali-metal',
    color: '#EF5350', glowColor: '#FFCDD2', atomicMass: '85.468', period: 5, group: 1,
    fact: 'Rubidium clocks are more accurate than quartz by a factor of 1,000. The element ignites spontaneously in air and explodes in water.',
  },
  {
    atomicNumber: 38, symbol: 'Sr', name: 'Strontium', category: 'alkaline-earth',
    color: '#29B6F6', glowColor: '#B3E5FC', atomicMass: '87.62', period: 5, group: 2,
    fact: 'Strontium compounds burn bright red — they\'re in emergency flares and fireworks. Strontium-90 from nuclear fallout is dangerous because it mimics calcium in bones.',
  },
  {
    atomicNumber: 39, symbol: 'Y', name: 'Yttrium', category: 'transition-metal',
    color: '#5C6BC0', glowColor: '#C5CAE9', atomicMass: '88.906', period: 5, group: 3,
    fact: 'Yttrium gives red color to CRT television screens. It\'s named after Ytterby, a tiny Swedish village that also names three other elements.',
  },
  {
    atomicNumber: 40, symbol: 'Zr', name: 'Zirconium', category: 'transition-metal',
    color: '#42A5F5', glowColor: '#BBDEFB', atomicMass: '91.224', period: 5, group: 4,
    fact: 'Cubic zirconia is a synthetic zirconium compound used as a cheap diamond substitute. Natural zircons are among the oldest minerals on Earth — over 4.4 billion years old.',
  },
  {
    atomicNumber: 41, symbol: 'Nb', name: 'Niobium', category: 'transition-metal',
    color: '#7E57C2', glowColor: '#D1C4E9', atomicMass: '92.906', period: 5, group: 5,
    fact: 'Niobium adds toughness to steel and is in jet engines, nuclear reactors, and MRI machines. Brazil holds 98% of the world\'s known reserves.',
  },
  {
    atomicNumber: 42, symbol: 'Mo', name: 'Molybdenum', category: 'transition-metal',
    color: '#78909C', glowColor: '#ECEFF1', atomicMass: '95.96', period: 5, group: 6,
    fact: 'Molybdenum disulfide is one of the slipperiest solid lubricants known. Nitrogen-fixing bacteria use a molybdenum enzyme to convert N₂ gas into plant-usable form.',
  },
  {
    atomicNumber: 43, symbol: 'Tc', name: 'Technetium', category: 'transition-metal',
    color: '#EC407A', glowColor: '#FCE4EC', atomicMass: '(98)', period: 5, group: 7,
    fact: 'Technetium was the first element to be artificially synthesized (1937). All its isotopes are radioactive. Tc-99m is the most widely used medical imaging agent.',
  },
  {
    atomicNumber: 44, symbol: 'Ru', name: 'Ruthenium', category: 'transition-metal',
    color: '#546E7A', glowColor: '#CFD8DC', atomicMass: '101.07', period: 5, group: 8,
    fact: 'A tiny amount of ruthenium makes platinum and palladium much harder. It\'s used in wear-resistant electrical contacts and can split water for hydrogen fuel.',
  },
  {
    atomicNumber: 45, symbol: 'Rh', name: 'Rhodium', category: 'transition-metal',
    color: '#78909C', glowColor: '#ECEFF1', atomicMass: '102.91', period: 5, group: 9,
    fact: 'Rhodium is the most expensive precious metal — often over $20,000 per troy ounce. It\'s in your car\'s catalytic converter, reducing harmful emissions.',
  },
  {
    atomicNumber: 46, symbol: 'Pd', name: 'Palladium', category: 'transition-metal',
    color: '#90A4AE', glowColor: '#ECEFF1', atomicMass: '106.42', period: 5, group: 10,
    fact: 'Palladium can absorb 900 times its own volume of hydrogen. It\'s named after the asteroid Pallas and is critical in catalytic converters.',
  },
  {
    atomicNumber: 47, symbol: 'Ag', name: 'Silver', category: 'transition-metal',
    color: '#E0E0E0', glowColor: '#F5F5F5', atomicMass: '107.87', period: 5, group: 11,
    fact: 'Silver has the highest electrical and thermal conductivity of all metals. Colloidal silver was used as an antibiotic for centuries before modern medicine.',
  },
  {
    atomicNumber: 48, symbol: 'Cd', name: 'Cadmium', category: 'transition-metal',
    color: '#FFEE58', glowColor: '#FFF9C4', atomicMass: '112.41', period: 5, group: 12,
    fact: 'Cadmium yellow was a beloved pigment by Monet and Van Gogh. It\'s used in nickel-cadmium batteries and some solar cells, but is highly toxic.',
  },
  {
    atomicNumber: 49, symbol: 'In', name: 'Indium', category: 'post-transition',
    color: '#66BB6A', glowColor: '#C8E6C9', atomicMass: '114.82', period: 5, group: 13,
    fact: 'Indium tin oxide is transparent and conducts electricity — it\'s the coating on your touchscreen. Indium "screams" when bent, making a distinctive sound.',
  },
  {
    atomicNumber: 50, symbol: 'Sn', name: 'Tin', category: 'post-transition',
    color: '#90A4AE', glowColor: '#ECEFF1', atomicMass: '118.71', period: 5, group: 14,
    fact: 'The Bronze Age was defined by tin alloyed with copper. In extreme cold, tin crumbles into gray powder ("tin pest") — this may have helped doom Napoleon\'s army in Russia.',
  },
  {
    atomicNumber: 51, symbol: 'Sb', name: 'Antimony', category: 'metalloid',
    color: '#FFD740', glowColor: '#FFE57F', atomicMass: '121.76', period: 5, group: 15,
    fact: 'Antimony eye makeup (kohl) was used in ancient Egypt. Today it\'s a flame retardant in plastics and textiles, and in lead-acid batteries.',
  },
  {
    atomicNumber: 52, symbol: 'Te', name: 'Tellurium', category: 'metalloid',
    color: '#26A69A', glowColor: '#B2DFDB', atomicMass: '127.60', period: 5, group: 16,
    fact: 'Tellurium is rarer on Earth than platinum. Eating tellurium compounds makes your breath smell like garlic for weeks. It\'s used in solar panels and rewritable DVDs.',
  },
  {
    atomicNumber: 53, symbol: 'I', name: 'Iodine', category: 'reactive-nonmetal',
    color: '#7E57C2', glowColor: '#D1C4E9', atomicMass: '126.90', period: 5, group: 17,
    fact: 'Iodine sublimes directly from solid to purple vapor. Your thyroid needs iodine to make hormones — iodized salt was a public health breakthrough that prevented millions of goiters.',
  },
  {
    atomicNumber: 54, symbol: 'Xe', name: 'Xenon', category: 'noble-gas',
    color: '#CE93D8', glowColor: '#F3E5F5', atomicMass: '131.29', period: 5, group: 18,
    fact: 'Xenon is used in high-intensity car headlights, strobe lights, and anesthesia. Ion thrusters in deep space probes (like Dawn and Hayabusa) use xenon as propellant.',
  },
  // Period 6
  {
    atomicNumber: 55, symbol: 'Cs', name: 'Cesium', category: 'alkali-metal',
    color: '#EF5350', glowColor: '#FFCDD2', atomicMass: '132.91', period: 6, group: 1,
    fact: 'Cesium atomic clocks are so precise that one would only lose a second in 300 million years. They define the international standard second.',
  },
  {
    atomicNumber: 56, symbol: 'Ba', name: 'Barium', category: 'alkaline-earth',
    color: '#29B6F6', glowColor: '#B3E5FC', atomicMass: '137.33', period: 6, group: 2,
    fact: 'Barium sulfate is insoluble and harmless — patients swallow it as a "barium meal" for GI X-rays, as it shows up brilliantly white in imaging.',
  },
  // Lanthanides (57-71)
  {
    atomicNumber: 57, symbol: 'La', name: 'Lanthanum', category: 'lanthanide',
    color: '#FFAB40', glowColor: '#FFD180', atomicMass: '138.91', period: 6, group: null,
    fact: 'Lanthanum oxide is used to make high-quality camera and telescope lenses. Lanthanum-nickel alloy can store hydrogen safely for fuel cells.',
  },
  {
    atomicNumber: 58, symbol: 'Ce', name: 'Cerium', category: 'lanthanide',
    color: '#FFA726', glowColor: '#FFE0B2', atomicMass: '140.12', period: 6, group: null,
    fact: 'Cerium is the most abundant rare-earth element. Flints in lighters are "mischmetal" — mostly cerium. The self-cleaning oven uses cerium oxide to break down grease at high temperatures.',
  },
  {
    atomicNumber: 59, symbol: 'Pr', name: 'Praseodymium', category: 'lanthanide',
    color: '#FFAB40', glowColor: '#FFD180', atomicMass: '140.91', period: 6, group: null,
    fact: 'Praseodymium makes the vibrant yellow-green color in some glass and gems. Praseodymium-doped fibers amplify signals in fiber optic cables, enabling the internet.',
  },
  {
    atomicNumber: 60, symbol: 'Nd', name: 'Neodymium', category: 'lanthanide',
    color: '#FFA726', glowColor: '#FFE0B2', atomicMass: '144.24', period: 6, group: null,
    fact: 'Neodymium magnets are the strongest permanent magnets known. A refrigerator-sized neodymium magnet could lift a car. They\'re in every EV motor and wind turbine generator.',
  },
  {
    atomicNumber: 61, symbol: 'Pm', name: 'Promethium', category: 'lanthanide',
    color: '#FFAB40', glowColor: '#FFD180', atomicMass: '(145)', period: 6, group: null,
    fact: 'Promethium has no stable isotopes — it\'s radioactive and virtually absent from Earth\'s crust. It was used in early nuclear-powered pacemakers and luminous watch dials.',
  },
  {
    atomicNumber: 62, symbol: 'Sm', name: 'Samarium', category: 'lanthanide',
    color: '#FFA726', glowColor: '#FFE0B2', atomicMass: '150.36', period: 6, group: null,
    fact: 'Samarium-cobalt magnets work at higher temperatures than neodymium magnets — used in jet engines and military hardware. Named after the mineral samarskite.',
  },
  {
    atomicNumber: 63, symbol: 'Eu', name: 'Europium', category: 'lanthanide',
    color: '#FFAB40', glowColor: '#FFD180', atomicMass: '151.96', period: 6, group: null,
    fact: 'Europium\'s red and blue phosphorescence makes it the anti-counterfeiting glow in euro banknotes. It\'s also in the red pixels of CRT and plasma TVs.',
  },
  {
    atomicNumber: 64, symbol: 'Gd', name: 'Gadolinium', category: 'lanthanide',
    color: '#FFA726', glowColor: '#FFE0B2', atomicMass: '157.25', period: 6, group: null,
    fact: 'Gadolinium contrast agents make soft tissues visible in MRI scans. Gadolinium is also used in nuclear reactor control rods — it absorbs neutrons 49,000× better than steel.',
  },
  {
    atomicNumber: 65, symbol: 'Tb', name: 'Terbium', category: 'lanthanide',
    color: '#FFAB40', glowColor: '#FFD180', atomicMass: '158.93', period: 6, group: null,
    fact: 'Terbium glows bright green under UV light — used in energy-efficient fluorescent lamps and LED phosphors. Terfenol-D (a terbium alloy) changes shape in a magnetic field.',
  },
  {
    atomicNumber: 66, symbol: 'Dy', name: 'Dysprosium', category: 'lanthanide',
    color: '#FFA726', glowColor: '#FFE0B2', atomicMass: '162.50', period: 6, group: null,
    fact: 'Dysprosium\'s name means "hard to get" in Greek. Adding a little dysprosium to neodymium magnets keeps them strong at high temperatures — crucial for EV motors.',
  },
  {
    atomicNumber: 67, symbol: 'Ho', name: 'Holmium', category: 'lanthanide',
    color: '#FFAB40', glowColor: '#FFD180', atomicMass: '164.93', period: 6, group: null,
    fact: 'Holmium has the strongest magnetic moment of any element. Holmium YAG lasers are used in surgery and treating kidney stones — absorbed well by water in tissue.',
  },
  {
    atomicNumber: 68, symbol: 'Er', name: 'Erbium', category: 'lanthanide',
    color: '#FFA726', glowColor: '#FFE0B2', atomicMass: '167.26', period: 6, group: null,
    fact: 'Erbium-doped fiber amplifiers (EDFAs) are the backbone of long-distance internet — they boost optical signals without converting to electricity, enabling transoceanic cables.',
  },
  {
    atomicNumber: 69, symbol: 'Tm', name: 'Thulium', category: 'lanthanide',
    color: '#FFAB40', glowColor: '#FFD180', atomicMass: '168.93', period: 6, group: null,
    fact: 'Thulium is the rarest stable lanthanide. Radiation from thulium-170 is used in portable X-ray devices that need no electricity — great for field use in developing countries.',
  },
  {
    atomicNumber: 70, symbol: 'Yb', name: 'Ytterbium', category: 'lanthanide',
    color: '#FFA726', glowColor: '#FFE0B2', atomicMass: '173.04', period: 6, group: null,
    fact: 'Ytterbium atomic clocks are contenders to replace cesium as the international timekeeping standard — they tick 100,000× faster and are far more precise.',
  },
  {
    atomicNumber: 71, symbol: 'Lu', name: 'Lutetium', category: 'lanthanide',
    color: '#FFAB40', glowColor: '#FFD180', atomicMass: '174.97', period: 6, group: null,
    fact: 'Lutetium is the hardest and densest lanthanide. Lutetium oxyorthosilicate crystals are used in PET scanners, enabling doctors to detect cancer earlier.',
  },
  // Back to Period 6 transition metals
  {
    atomicNumber: 72, symbol: 'Hf', name: 'Hafnium', category: 'transition-metal',
    color: '#42A5F5', glowColor: '#BBDEFB', atomicMass: '178.49', period: 6, group: 4,
    fact: 'Hafnium is almost always found with zirconium and is nearly impossible to separate from it. Nuclear reactor control rods use hafnium because it absorbs neutrons extremely well.',
  },
  {
    atomicNumber: 73, symbol: 'Ta', name: 'Tantalum', category: 'transition-metal',
    color: '#5C6BC0', glowColor: '#C5CAE9', atomicMass: '180.95', period: 6, group: 5,
    fact: 'Tantalum is biologically inert and completely non-corrosive. It\'s in capacitors inside smartphones and laptops, and in surgical implants like skull plates and hip joints.',
  },
  {
    atomicNumber: 74, symbol: 'W', name: 'Tungsten', category: 'transition-metal',
    color: '#78909C', glowColor: '#ECEFF1', atomicMass: '183.84', period: 6, group: 6,
    fact: 'Tungsten has the highest melting point of any metal (3,422°C). Incandescent light bulb filaments are tungsten. Its symbol W comes from the German "Wolfram".',
  },
  {
    atomicNumber: 75, symbol: 'Re', name: 'Rhenium', category: 'transition-metal',
    color: '#546E7A', glowColor: '#CFD8DC', atomicMass: '186.21', period: 6, group: 7,
    fact: 'Rhenium was the last naturally occurring element to be discovered (1925). Rhenium-nickel superalloys are in the hottest parts of jet engines, withstanding temperatures over 2000°C.',
  },
  {
    atomicNumber: 76, symbol: 'Os', name: 'Osmium', category: 'transition-metal',
    color: '#455A64', glowColor: '#CFD8DC', atomicMass: '190.23', period: 6, group: 8,
    fact: 'Osmium is the densest naturally occurring element (22.59 g/cm³) — a golf ball-sized lump would weigh 5 kg! Osmium tetroxide smells like rotten horseradish.',
  },
  {
    atomicNumber: 77, symbol: 'Ir', name: 'Iridium', category: 'transition-metal',
    color: '#546E7A', glowColor: '#CFD8DC', atomicMass: '192.22', period: 6, group: 9,
    fact: 'A layer of iridium in rock around the world marks the asteroid impact that killed the dinosaurs 66 million years ago. Iridium is the most corrosion-resistant metal known.',
  },
  {
    atomicNumber: 78, symbol: 'Pt', name: 'Platinum', category: 'transition-metal',
    color: '#B0BEC5', glowColor: '#ECEFF1', atomicMass: '195.08', period: 6, group: 10,
    fact: 'Platinum catalytic converters in cars have prevented billions of tons of pollution. Platinum is so rare that all the platinum ever mined would barely fill a living room.',
  },
  {
    atomicNumber: 79, symbol: 'Au', name: 'Gold', category: 'transition-metal',
    color: '#FFD600', glowColor: '#FFFF8D', atomicMass: '196.97', period: 6, group: 11,
    fact: 'Gold is so unreactive that Egyptian pharaoh masks still gleam after 3,000 years. Every atom of gold on Earth came from neutron star collisions billions of years ago.',
  },
  {
    atomicNumber: 80, symbol: 'Hg', name: 'Mercury', category: 'transition-metal',
    color: '#90A4AE', glowColor: '#ECEFF1', atomicMass: '200.59', period: 6, group: 12,
    fact: 'Mercury is the only metal liquid at room temperature. Ancient alchemists called it "quicksilver" and believed it could transmute into gold.',
  },
  {
    atomicNumber: 81, symbol: 'Tl', name: 'Thallium', category: 'post-transition',
    color: '#66BB6A', glowColor: '#C8E6C9', atomicMass: '204.38', period: 6, group: 13,
    fact: 'Thallium was a common rat and ant poison — colorless, tasteless, and odorless, making it a notorious murder weapon in the 20th century.',
  },
  {
    atomicNumber: 82, symbol: 'Pb', name: 'Lead', category: 'post-transition',
    color: '#78909C', glowColor: '#ECEFF1', atomicMass: '207.2', period: 6, group: 14,
    fact: 'Romans used lead pipes for plumbing (the word "plumber" comes from "plumbum"). Its density makes it excellent for radiation shielding — X-ray aprons are lined with lead.',
  },
  {
    atomicNumber: 83, symbol: 'Bi', name: 'Bismuth', category: 'post-transition',
    color: '#CE93D8', glowColor: '#F3E5F5', atomicMass: '208.98', period: 6, group: 15,
    fact: 'Bismuth crystals form stunning rainbow-colored geometric "hopper" structures. Pepto-Bismol\'s active ingredient is bismuth subsalicylate — it\'s one of the least toxic heavy metals.',
  },
  {
    atomicNumber: 84, symbol: 'Po', name: 'Polonium', category: 'reactive-nonmetal',
    color: '#FF7043', glowColor: '#FFCCBC', atomicMass: '(209)', period: 6, group: 16,
    fact: 'Named by Marie Curie after her homeland Poland, polonium is intensely radioactive. A speck the size of a grain of sand is lethal. It was used to kill Alexander Litvinenko in 2006.',
  },
  {
    atomicNumber: 85, symbol: 'At', name: 'Astatine', category: 'reactive-nonmetal',
    color: '#9CCC65', glowColor: '#DCEDC8', atomicMass: '(210)', period: 6, group: 17,
    fact: 'Astatine is the rarest naturally occurring element — at any moment, less than 28 grams exist on the entire Earth. Its half-life is only 8 hours.',
  },
  {
    atomicNumber: 86, symbol: 'Rn', name: 'Radon', category: 'noble-gas',
    color: '#CE93D8', glowColor: '#F3E5F5', atomicMass: '(222)', period: 6, group: 18,
    fact: 'Radon seeps from rock into basements and is the second-leading cause of lung cancer after smoking. It\'s colorless and odorless — you need a special detector.',
  },
  // Period 7
  {
    atomicNumber: 87, symbol: 'Fr', name: 'Francium', category: 'alkali-metal',
    color: '#EF5350', glowColor: '#FFCDD2', atomicMass: '(223)', period: 7, group: 1,
    fact: 'Francium is the second-rarest naturally occurring element. Its entire global supply at any moment is less than a few grams. It would explode spectacularly in water.',
  },
  {
    atomicNumber: 88, symbol: 'Ra', name: 'Radium', category: 'alkaline-earth',
    color: '#29B6F6', glowColor: '#B3E5FC', atomicMass: '(226)', period: 7, group: 2,
    fact: 'Marie Curie discovered radium and carried it in her pockets, not knowing it was lethal. Her notebooks are still too radioactive to handle — they\'re stored in lead-lined boxes.',
  },
  // Actinides (89-103)
  {
    atomicNumber: 89, symbol: 'Ac', name: 'Actinium', category: 'actinide',
    color: '#FF6E40', glowColor: '#FF9E80', atomicMass: '(227)', period: 7, group: null,
    fact: 'Actinium glows blue in the dark due to its intense radioactivity ionizing the surrounding air. It\'s so rare and radioactive that scientists work with it in micrograms.',
  },
  {
    atomicNumber: 90, symbol: 'Th', name: 'Thorium', category: 'actinide',
    color: '#FF7043', glowColor: '#FFCCBC', atomicMass: '232.04', period: 7, group: null,
    fact: 'Thorium is 3× more abundant than uranium and could fuel the world\'s energy for thousands of years. Molten salt thorium reactors are seen as a safer future nuclear option.',
  },
  {
    atomicNumber: 91, symbol: 'Pa', name: 'Protactinium', category: 'actinide',
    color: '#FF6E40', glowColor: '#FF9E80', atomicMass: '231.04', period: 7, group: null,
    fact: 'Protactinium is one of the rarest and most expensive naturally occurring elements. The largest sample ever assembled was 125 grams, which required processing 60 tons of residue.',
  },
  {
    atomicNumber: 92, symbol: 'U', name: 'Uranium', category: 'actinide',
    color: '#FF7043', glowColor: '#FFCCBC', atomicMass: '238.03', period: 7, group: null,
    fact: 'The fission of one kilogram of uranium-235 releases as much energy as burning 3,000 tons of coal. Depleted uranium is also used in armor-piercing ammunition and tank armor.',
  },
  {
    atomicNumber: 93, symbol: 'Np', name: 'Neptunium', category: 'actinide',
    color: '#FF6E40', glowColor: '#FF9E80', atomicMass: '(237)', period: 7, group: null,
    fact: 'The first transuranic element ever synthesized (1940). Named after Neptune (beyond Uranus/uranium). Trace amounts form naturally in uranium ores from neutron bombardment.',
  },
  {
    atomicNumber: 94, symbol: 'Pu', name: 'Plutonium', category: 'actinide',
    color: '#FF7043', glowColor: '#FFCCBC', atomicMass: '(244)', period: 7, group: null,
    fact: 'Plutonium fueled the Nagasaki bomb and powers the Voyager and New Horizons spacecraft via radioisotope thermoelectric generators — still running after 40+ years.',
  },
  {
    atomicNumber: 95, symbol: 'Am', name: 'Americium', category: 'actinide',
    color: '#FF6E40', glowColor: '#FF9E80', atomicMass: '(243)', period: 7, group: null,
    fact: 'You likely have americium in your home — smoke detectors use americium-241. The tiny radioactive source ionizes air inside; smoke disrupts this current, triggering the alarm.',
  },
  {
    atomicNumber: 96, symbol: 'Cm', name: 'Curium', category: 'actinide',
    color: '#FF7043', glowColor: '#FFCCBC', atomicMass: '(247)', period: 7, group: null,
    fact: 'Named for Marie and Pierre Curie. The Mars rover Curiosity uses curium-244 in its APXS instrument to analyze Martian rocks by bombarding them with alpha particles.',
  },
  {
    atomicNumber: 97, symbol: 'Bk', name: 'Berkelium', category: 'actinide',
    color: '#FF6E40', glowColor: '#FF9E80', atomicMass: '(247)', period: 7, group: null,
    fact: 'Named after Berkeley, California, where it was created. Only about a gram has ever been produced. Berkelium is essential for making even heavier elements like tennessine.',
  },
  {
    atomicNumber: 98, symbol: 'Cf', name: 'Californium', category: 'actinide',
    color: '#FF7043', glowColor: '#FFCCBC', atomicMass: '(251)', period: 7, group: null,
    fact: 'Californium-252 is a powerful neutron emitter. Hospitals use it to start nuclear reactors for medical isotope production. It\'s also used to detect gold and silver in ores.',
  },
  {
    atomicNumber: 99, symbol: 'Es', name: 'Einsteinium', category: 'actinide',
    color: '#FF6E40', glowColor: '#FF9E80', atomicMass: '(252)', period: 7, group: null,
    fact: 'Einsteinium was discovered in fallout from the first hydrogen bomb test in 1952 and named for Albert Einstein. Only microgram quantities have ever been produced.',
  },
  {
    atomicNumber: 100, symbol: 'Fm', name: 'Fermium', category: 'actinide',
    color: '#FF7043', glowColor: '#FFCCBC', atomicMass: '(257)', period: 7, group: null,
    fact: 'Fermium, named for Enrico Fermi, was also discovered in hydrogen bomb debris. It marks the practical end of the actinides producible in reactors.',
  },
  {
    atomicNumber: 101, symbol: 'Md', name: 'Mendelevium', category: 'actinide',
    color: '#FF6E40', glowColor: '#FF9E80', atomicMass: '(258)', period: 7, group: null,
    fact: 'Named for Dmitri Mendeleev, inventor of the periodic table. Mendelevium was first made one atom at a time. Even today, less than a million atoms have ever been created.',
  },
  {
    atomicNumber: 102, symbol: 'No', name: 'Nobelium', category: 'actinide',
    color: '#FF7043', glowColor: '#FFCCBC', atomicMass: '(259)', period: 7, group: null,
    fact: 'Named for Alfred Nobel, nobelium has a maximum half-life of 58 minutes for its most stable isotope. It exists only in particle accelerators for milliseconds at a time.',
  },
  {
    atomicNumber: 103, symbol: 'Lr', name: 'Lawrencium', category: 'actinide',
    color: '#FF6E40', glowColor: '#FF9E80', atomicMass: '(266)', period: 7, group: null,
    fact: 'Named for Ernest Lawrence, inventor of the cyclotron. Lawrencium was first produced at Berkeley in 1961. It\'s the last actinide, completing the f-block of the periodic table.',
  },
  // Period 7 transition metals (104-118)
  {
    atomicNumber: 104, symbol: 'Rf', name: 'Rutherfordium', category: 'transition-metal',
    color: '#448AFF', glowColor: '#82B1FF', atomicMass: '(267)', period: 7, group: 4,
    fact: 'Named for Ernest Rutherford, who discovered the atomic nucleus. Only a few hundred atoms have ever been made. Half-life: about 1.3 hours.',
  },
  {
    atomicNumber: 105, symbol: 'Db', name: 'Dubnium', category: 'transition-metal',
    color: '#448AFF', glowColor: '#82B1FF', atomicMass: '(268)', period: 7, group: 5,
    fact: 'Named after Dubna, Russia. The US and USSR both claimed to discover it during the Cold War "transfermium wars." Half-life: about 28 hours.',
  },
  {
    atomicNumber: 106, symbol: 'Sg', name: 'Seaborgium', category: 'transition-metal',
    color: '#448AFF', glowColor: '#82B1FF', atomicMass: '(269)', period: 7, group: 6,
    fact: 'Named for Glenn Seaborg, who was still alive when it was named — the first element named for a living person. Seaborg helped discover 10 transuranic elements.',
  },
  {
    atomicNumber: 107, symbol: 'Bh', name: 'Bohrium', category: 'transition-metal',
    color: '#448AFF', glowColor: '#82B1FF', atomicMass: '(270)', period: 7, group: 7,
    fact: 'Named for Niels Bohr. Experiments suggest bohrium behaves like rhenium in its chemistry, following periodic table trends even for super-heavy elements.',
  },
  {
    atomicNumber: 108, symbol: 'Hs', name: 'Hassium', category: 'transition-metal',
    color: '#448AFF', glowColor: '#82B1FF', atomicMass: '(277)', period: 7, group: 8,
    fact: 'Named for the German state Hesse. Hassium\'s chemistry was studied in 2002 — just 7 atoms — confirming it behaves like osmium, below it on the table.',
  },
  {
    atomicNumber: 109, symbol: 'Mt', name: 'Meitnerium', category: 'unknown',
    color: '#90A4AE', glowColor: '#CFD8DC', atomicMass: '(278)', period: 7, group: 9,
    fact: 'Named for Lise Meitner, who co-discovered fission but was denied the Nobel Prize. Meitnerium honors one of history\'s most overlooked scientific contributions.',
  },
  {
    atomicNumber: 110, symbol: 'Ds', name: 'Darmstadtium', category: 'unknown',
    color: '#90A4AE', glowColor: '#CFD8DC', atomicMass: '(281)', period: 7, group: 10,
    fact: 'Made at GSI Darmstadt. Only a handful of atoms have ever been created. At this extreme mass, relativistic effects cause electron orbitals to behave very differently.',
  },
  {
    atomicNumber: 111, symbol: 'Rg', name: 'Roentgenium', category: 'unknown',
    color: '#90A4AE', glowColor: '#CFD8DC', atomicMass: '(282)', period: 7, group: 11,
    fact: 'Named for Wilhelm Röntgen, discoverer of X-rays. Relativistic effects predict roentgenium might be a gas at room temperature — very different from gold above it.',
  },
  {
    atomicNumber: 112, symbol: 'Cn', name: 'Copernicium', category: 'transition-metal',
    color: '#448AFF', glowColor: '#82B1FF', atomicMass: '(285)', period: 7, group: 12,
    fact: 'Named for Nicolaus Copernicus. Copernicium may be a gas at room temperature due to extreme relativistic effects, unlike mercury (its lighter analog) which is liquid.',
  },
  {
    atomicNumber: 113, symbol: 'Nh', name: 'Nihonium', category: 'post-transition',
    color: '#69F0AE', glowColor: '#B9F6CA', atomicMass: '(286)', period: 7, group: 13,
    fact: 'Nihonium ("Japan" in Japanese) is the first element discovered in Asia. Japanese team at RIKEN lab produced it after bombarding bismuth-209 with zinc for 9 years.',
  },
  {
    atomicNumber: 114, symbol: 'Fl', name: 'Flerovium', category: 'post-transition',
    color: '#69F0AE', glowColor: '#B9F6CA', atomicMass: '(289)', period: 7, group: 14,
    fact: 'Named for Flerov Laboratory in Dubna. Flerovium may be a gas near the predicted "island of stability" — a region where superheavy nuclei might have longer half-lives.',
  },
  {
    atomicNumber: 115, symbol: 'Mc', name: 'Moscovium', category: 'post-transition',
    color: '#69F0AE', glowColor: '#B9F6CA', atomicMass: '(290)', period: 7, group: 15,
    fact: 'Named for Moscow Oblast, Russia. First made in 2003 as a joint US-Russian project. Moscovium decays to nihonium in milliseconds.',
  },
  {
    atomicNumber: 116, symbol: 'Lv', name: 'Livermorium', category: 'post-transition',
    color: '#69F0AE', glowColor: '#B9F6CA', atomicMass: '(293)', period: 7, group: 16,
    fact: 'Named for Lawrence Livermore National Laboratory. Created by bombarding curium-248 with calcium-48. Half-life: about 60 milliseconds.',
  },
  {
    atomicNumber: 117, symbol: 'Ts', name: 'Tennessine', category: 'reactive-nonmetal',
    color: '#64FFDA', glowColor: '#A7FFEB', atomicMass: '(294)', period: 7, group: 17,
    fact: 'Named for Tennessee, home of Oak Ridge and Vanderbilt University. Tennessine may challenge predictions about the reactivity of halogen-like elements.',
  },
  {
    atomicNumber: 118, symbol: 'Og', name: 'Oganesson', category: 'noble-gas',
    color: '#EA80FC', glowColor: '#F48FB1', atomicMass: '(294)', period: 7, group: 18,
    fact: 'Named for Yuri Oganessian, the pioneer of superheavy element research. Oganesson likely is a solid at room temperature — the first "noble gas" that isn\'t a gas!',
  },
];

// Fast lookup by atomic number
export const ELEMENT_MAP: Record<number, Element> = Object.fromEntries(
  ELEMENTS.map(el => [el.atomicNumber, el])
);

export function getElement(atomicNumber: number): Element | undefined {
  return ELEMENT_MAP[atomicNumber];
}

export const MAX_ELEMENT = 118;
