export const PRODUCT_IDS = {
  proLabPack: "pro_lab_pack_lifetime",
  coins5: "coins_5",
  coins20: "coins_20",
  coins50: "coins_50",
  coins100: "coins_100",
  themeGoldLab: "theme_gummy_pack",
  themeNeonPeriodic: "theme_cloud_pack",
  themeQuantumVoid: "theme_crystal_pack",
  themeVerdantCrystal: "theme_verdant_pack",
  themeBiohazard: "theme_radioactive_pack",
  themeMossHollow: "theme_moss_pack",
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

// The themed bundles are non-consumable products configured in App Store Connect
// and RevenueCat, so purchases and restores are handled by the normal IAP flow.
export const COSMETIC_THEME_PURCHASES_ENABLED = true;

export const THEME_BUNDLE_PRODUCT_IDS = [
  PRODUCT_IDS.themeGoldLab,
  PRODUCT_IDS.themeNeonPeriodic,
  PRODUCT_IDS.themeQuantumVoid,
  PRODUCT_IDS.themeVerdantCrystal,
  PRODUCT_IDS.themeBiohazard,
  PRODUCT_IDS.themeMossHollow,
] as const satisfies readonly ProductId[];

// Base US App Store tiers used for the lifetime Researcher / Developer badge.
// The badge is a thank-you tier, not a receipt or currency balance; update
// these values alongside the App Store pricing tiers if those tiers change.
export const SHOP_SPEND_CENTS: Record<ProductId, number> = {
  [PRODUCT_IDS.proLabPack]: 999,
  [PRODUCT_IDS.coins5]: 99,
  [PRODUCT_IDS.coins20]: 399,
  [PRODUCT_IDS.coins50]: 799,
  [PRODUCT_IDS.coins100]: 1499,
  [PRODUCT_IDS.themeGoldLab]: 199,
  [PRODUCT_IDS.themeNeonPeriodic]: 199,
  [PRODUCT_IDS.themeQuantumVoid]: 199,
  [PRODUCT_IDS.themeVerdantCrystal]: 199,
  [PRODUCT_IDS.themeBiohazard]: 199,
  [PRODUCT_IDS.themeMossHollow]: 199,
};

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
    name: "Gummy Lab",
    description: "A playful candy chemistry laboratory with a matching candy-textured Gummy atom finish.",
    type: "non_consumable",
    benefits: [
      "Illustrated pastel candy-lab board theme.",
      "Bundled Gummy finish with soft candy bubbles, gel highlights, and every atom's original color.",
      "Purely cosmetic — no gameplay changes.",
    ],
  },
  {
    id: PRODUCT_IDS.themeNeonPeriodic,
    name: "Cloud Nine",
    description: "A soothing pastel sky realm with a matching pearlescent Cloud atom finish.",
    type: "non_consumable",
    benefits: [
      "Illustrated clouds-and-rainbow board theme.",
      "Bundled Cloud finish with soft pearlescent light over every original atom color.",
      "Purely cosmetic — no gameplay changes.",
    ],
  },
  {
    id: PRODUCT_IDS.themeQuantumVoid,
    name: "Crystal Cove",
    description: "A luminous crystal cavern plus a sunny beach-cove variant with a matching faceted Mineral atom finish.",
    type: "non_consumable",
    benefits: [
      "Illustrated Crystal Cove board with a Mineral Cove beach-cove style.",
      "Includes glassy Crystal Core and faceted Mineral finishes, each with varied patterns.",
      "Purely cosmetic — no gameplay changes.",
    ],
  },
  {
    id: PRODUCT_IDS.themeVerdantCrystal,
    name: "Verdant Crystal",
    description: "A light green crystal garden board with glassy atoms that hold mineral shards inside.",
    type: "non_consumable",
    benefits: [
      "Light green crystal board with formations around the edges.",
      "Bundled Verdant Glass atoms with translucent spheres and mineral inclusions.",
      "Purely cosmetic — no gameplay changes.",
    ],
  },
  {
    id: PRODUCT_IDS.themeBiohazard,
    name: "Radioactive",
    description: "An abandoned reactor chamber with a matching contaminated atom finish.",
    type: "non_consumable",
    benefits: [
      "Illustrated radioactive-reactor board theme.",
      "Bundled Irradiated finish layered inside every atom's original color.",
      "Purely cosmetic — no gameplay changes.",
    ],
  },
  {
    id: PRODUCT_IDS.themeMossHollow,
    name: "Moss Hollow",
    description: "A bioluminescent moss forest hollow with a soft, velvety Moss atom finish.",
    type: "non_consumable",
    benefits: [
      "Mossy forest board with firefly-like lights and a clear play area.",
      "Bundled Moss finish with velvety texture and dew-like highlights.",
      "Purely cosmetic - no gameplay changes.",
    ],
  },
];

export function getProductById(productId: ProductId): ProductDefinition | undefined {
  return PRODUCTS.find((product) => product.id === productId);
}
