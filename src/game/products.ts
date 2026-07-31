export const PRODUCT_IDS = {
  proLabPack: "pro_lab_pack_lifetime",
  coins5: "coins_5",
  coins20: "coins_20",
  coins50: "coins_50",
  coins100: "coins_100",
  themeGoldLab: "theme_gold_lab",
  themeNeonPeriodic: "theme_neon_periodic",
  themeQuantumVoid: "theme_quantum_void",
  themeBiohazard: "theme_biohazard",
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

// Keep the complete IAP wiring ready, but leave cosmetic themes free during visual testing.
// Flip this to true when the four theme products are ready in App Store Connect and RevenueCat.
export const COSMETIC_THEME_PURCHASES_ENABLED = false;

export const THEME_BUNDLE_PRODUCT_IDS = [
  PRODUCT_IDS.themeGoldLab,
  PRODUCT_IDS.themeNeonPeriodic,
  PRODUCT_IDS.themeQuantumVoid,
  PRODUCT_IDS.themeBiohazard,
] as const satisfies readonly ProductId[];

export const APP_STORE_PURCHASE_PRODUCT_IDS = [
  PRODUCT_IDS.proLabPack,
  PRODUCT_IDS.coins5,
  PRODUCT_IDS.coins20,
  PRODUCT_IDS.coins50,
  PRODUCT_IDS.coins100,
  ...(COSMETIC_THEME_PURCHASES_ENABLED ? THEME_BUNDLE_PRODUCT_IDS : []),
] as const satisfies readonly ProductId[];

export interface ProductDefinition {
  id: ProductId;
  name: string;
  description: string;
  type: "non_consumable" | "consumable";
  coins?: number;
  benefits: string[];
}

export const PRODUCTS: ProductDefinition[] = [
  {
    id: PRODUCT_IDS.proLabPack,
    name: "Pro Lab Pack - Lifetime",
    description:
      "A one-time premium upgrade that removes forced ads and adds extra launch bonuses.",
    type: "non_consumable",
    benefits: [
      "Remove forced interstitial ads.",
      "Unlock the Pro Lab profile badge.",
      "Instantly boosts every unlocked power-up to Level 1 for free.",
      "Refunds 10 coins for each power-up you already upgraded to Level 1.",
      "Includes 50 starting gold coins in the App Store build.",
      "Daily quest claims pay 10 gold coins instead of 3.",
      "Daily challenges award 5 gold coins each instead of 3.",
      "Support future Atomic Fusion Rush updates.",
    ],
  },
  {
    id: PRODUCT_IDS.coins5,
    name: "5x Gold Coins",
    description: "Adds 5 gold coins to your shop wallet.",
    type: "consumable",
    coins: 5,
    benefits: ["Quick boost for early inventory purchases."],
  },
  {
    id: PRODUCT_IDS.coins20,
    name: "20x Gold Coins",
    description: "Adds 20 gold coins to your shop wallet.",
    type: "consumable",
    coins: 20,
    benefits: ["Build a stronger inventory reserve."],
  },
  {
    id: PRODUCT_IDS.coins50,
    name: "50x Gold Coins",
    description: "Adds 50 gold coins to your shop wallet.",
    type: "consumable",
    coins: 50,
    benefits: ["Load up for multiple challenge runs."],
  },
  {
    id: PRODUCT_IDS.coins100,
    name: "100x Gold Coins",
    description: "Adds 100 gold coins to your shop wallet.",
    type: "consumable",
    coins: 100,
    benefits: ["Maximum reserve for long progression sessions."],
  },
  {
    id: PRODUCT_IDS.themeGoldLab,
    name: "Gold Lab",
    description: "A brass-and-amber laboratory board theme with a matching Marble atom finish.",
    type: "non_consumable",
    benefits: [
      "Warm brass-and-amber board theme.",
      "Bundled Marble finish with translucent veins over every atom's original color.",
      "Purely cosmetic — no gameplay changes.",
    ],
  },
  {
    id: PRODUCT_IDS.themeNeonPeriodic,
    name: "Neon Periodic",
    description:
      "A glowing periodic-table blueprint board theme with a matching Prism atom finish.",
    type: "non_consumable",
    benefits: [
      "Neon periodic-table grid board theme.",
      "Bundled Prism finish with a subtle iridescent scan over every original atom color.",
      "Purely cosmetic — no gameplay changes.",
    ],
  },
  {
    id: PRODUCT_IDS.themeQuantumVoid,
    name: "Quantum Void",
    description: "A deep-space indigo board theme with a matching Glass atom finish.",
    type: "non_consumable",
    benefits: [
      "Starfield indigo board theme.",
      "Bundled Glass finish with color-preserving facets and highlights.",
      "Purely cosmetic — no gameplay changes.",
    ],
  },
  {
    id: PRODUCT_IDS.themeBiohazard,
    name: "Biohazard",
    description: "An acid-green containment-lab board theme with a matching Bubble atom finish.",
    type: "non_consumable",
    benefits: [
      "Acid-green hazard-lab board theme.",
      "Bundled Bubble finish layered over every atom's original color.",
      "Purely cosmetic — no gameplay changes.",
    ],
  },
];

export function getProductById(productId: ProductId): ProductDefinition | undefined {
  return PRODUCTS.find((product) => product.id === productId);
}
